import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class GameService {
    constructor(
        private prisma: PrismaService,
        private redis: RedisService,
    ) { }

    private quizCacheKey(quizId: string) {
        return `quiz:cache:${quizId}`;
    }

    private sessionStateKey(sessionId: string) {
        return `session:state:${sessionId}`;
    }

    async preloadQuiz(quizId: string) {
        // Cache-aside pattern: check Redis first, only hit Postgres on a miss.
        const cached = await this.redis.getJson(this.quizCacheKey(quizId));
        if (cached) return cached;

        const quiz = await this.prisma.quizCatalog.findUnique({
            where: { id: quizId },
            include: {
                questions: {
                    include: { answerOptions: true },
                    orderBy: { orderIndex: 'asc' },
                },
            },
        });
        if (!quiz) throw new NotFoundException('Quiz not found');

        await this.redis.setJson(this.quizCacheKey(quizId), quiz, 3600); // 1hr TTL
        return quiz;
    }
    // continuing game.service.ts

    async startSession(tenantId: string, quizId: string) {
        const quiz = await this.preloadQuiz(quizId);

        const session = await this.prisma.gameSession.create({
            data: {
                tenantId,
                quizId,
                mode: 'QUIZ',
                status: 'ACTIVE',
                currentQuestionIndex: 0,
            },
        });

        await this.redis.setJson(this.sessionStateKey(session.id), {
            quizId,
            currentQuestionIndex: 0,
            questionStartedAt: null,
            answersThisQuestion: [], // resets each question
        });

        return { session, quiz };
    }

    async getSessionState(sessionId: string) {
        const state = await this.redis.getJson<any>(this.sessionStateKey(sessionId));
        if (!state) throw new NotFoundException('Session state not found (expired or never started)');
        return state;
    }

    async startQuestion(sessionId: string) {
        const state = await this.getSessionState(sessionId);
        const quiz = await this.redis.getJson<any>(this.quizCacheKey(state.quizId));

        const question = quiz.questions[state.currentQuestionIndex];
        if (!question) throw new BadRequestException('No more questions - session should end');

        state.questionStartedAt = Date.now();
        state.answersThisQuestion = [];
        await this.redis.setJson(this.sessionStateKey(sessionId), state);

        // Send only what players should see - never include isCorrect flags here!
        const safeQuestion = {
            id: question.id,
            text: question.text,
            timeLimit: question.timeLimit,
            options: question.answerOptions.map((o: any) => ({ id: o.id, text: o.text })),
        };

        return safeQuestion;
    }

    async advanceToNextQuestion(sessionId: string) {
        const state = await this.getSessionState(sessionId);
        state.currentQuestionIndex += 1;
        await this.redis.setJson(this.sessionStateKey(sessionId), state);

        await this.prisma.gameSession.update({
            where: { id: sessionId },
            data: { currentQuestionIndex: state.currentQuestionIndex },
        });

        return state.currentQuestionIndex;
    }

    async endSession(sessionId: string) {
        await this.prisma.gameSession.update({
            where: { id: sessionId },
            data: { status: 'FINISHED', endedAt: new Date() },
        });
        await this.redis.del(this.sessionStateKey(sessionId));
    }
    // continuing game.service.ts

    async submitAnswer(
        sessionId: string,
        playerId: string,
        questionId: string,
        selectedOptionId: string,
    ) {
        const state = await this.getSessionState(sessionId);
        const quiz = await this.redis.getJson<any>(this.quizCacheKey(state.quizId));
        const question = quiz.questions.find((q: any) => q.id === questionId);
        if (!question) throw new BadRequestException('Question not found in this session');

        // Reject late answers - the server-side timer already fired.
        const elapsedMs = Date.now() - state.questionStartedAt;
        if (elapsedMs > question.timeLimit * 1000) {
            throw new BadRequestException('Time is up for this question');
        }

        // Reject a player answering the same question twice.
        const alreadyAnswered = state.answersThisQuestion.find((a: any) => a.playerId === playerId);
        if (alreadyAnswered) {
            throw new BadRequestException('Already answered this question');
        }

        const selectedOption = question.answerOptions.find((o: any) => o.id === selectedOptionId);
        const isCorrect = !!selectedOption?.isCorrect;

        // Score: full points if correct AND first correct answer, otherwise scaled
        // down by how much time was used. Wrong answer = 0.
        let scoreEarned = 0;
        if (isCorrect) {
            const alreadyHasCorrect = state.answersThisQuestion.some((a: any) => a.isCorrect);
            const timeRatio = 1 - elapsedMs / (question.timeLimit * 1000); // 1 = instant, 0 = last moment
            scoreEarned = alreadyHasCorrect
                ? Math.round(question.points * 0.5 * timeRatio) // correct but not first
                : Math.round(question.points * (0.5 + 0.5 * timeRatio)); // first correct - bigger bonus
        }

        // Persist the permanent record.
        await this.prisma.playerAnswer.create({
            data: {
                playerId: playerId as string,
                questionId,
                gameSessionId: sessionId,
                selectedOptionId,
                isCorrect,
                responseTimeMs: elapsedMs,
                scoreEarned,
            },
        });
        

        // Update the fast in-memory tally used for the live ranking broadcast.
        state.answersThisQuestion.push({ playerId, isCorrect, scoreEarned });
        await this.redis.setJson(this.sessionStateKey(sessionId), state);

        return { isCorrect, scoreEarned };
    }

    async getLiveRanking(tenantId: string, sessionId: string) {
        // Sum scores across ALL questions answered so far in this session.
        const answers = await this.prisma.playerAnswer.findMany({
            where: { player: { gameSessionId: sessionId } },
            include: { player: true },
        });

        const totals = new Map<string, { name: string; score: number }>();
        for (const answer of answers) {
            const current = totals.get(answer.playerId) || { name: answer.player.name, score: 0 };
            current.score += answer.scoreEarned;
            totals.set(answer.playerId, current);
        }

        return Array.from(totals.entries())
            .map(([playerId, data]) => ({ playerId, ...data }))
            .sort((a, b) => b.score - a.score);
    }
    // continuing game.service.ts

async finalizeSession(tenantId: string, sessionId: string) {
  const ranking = await this.getLiveRanking(tenantId, sessionId);

  await this.prisma.gameSession.update({
    where: { id: sessionId },
    data: {
      status: 'FINISHED',
      endedAt: new Date(),
      scoresCache: ranking, // snapshot of final standings, stored permanently
    },
  });

  await this.redis.del(this.sessionStateKey(sessionId));
  return ranking;
}

async hasMoreQuestions(sessionId: string) {
  const state = await this.getSessionState(sessionId);
  const quiz = await this.redis.getJson<any>(this.quizCacheKey(state.quizId));
  return state.currentQuestionIndex + 1 < quiz.questions.length;
}
}