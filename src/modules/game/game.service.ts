import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { LoggingModule } from 'src/logging/logging.module';
import { SystemLogService } from 'src/logging/system-log.service';

@Injectable()
export class GameService {
    constructor(
        private prisma: PrismaService,
        private redis: RedisService,
        private systemLog: SystemLogService,
    ) { }

    private quizCacheKey(quizId: string) {
        return `quiz:cache:${quizId}`;
    }

    private sessionStateKey(sessionId: string) {
        return `session:state:${sessionId}`;
    }

    async preloadQuiz(quizId: string, shuffle = false) {
        const cached = await this.redis.getJson(this.quizCacheKey(quizId));
        if (cached && !shuffle) return cached; 

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

        if (shuffle) {
            quiz.questions = this.shuffleArray(quiz.questions);
        }

        await this.redis.setJson(this.quizCacheKey(quizId), quiz, 3600);
        return quiz;
    }

    private shuffleArray<T>(arr: T[]): T[] {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    async startSession(tenantId: string, quizId: string, mode: 'QUIZ' | 'BLIND_TEST' = 'QUIZ') {
        const quiz = await this.preloadQuiz(quizId, mode === 'BLIND_TEST');

        const session = await this.prisma.gameSession.create({
            data: { tenantId, quizId, mode, status: 'ACTIVE', currentQuestionIndex: 0 },
        });

        await this.redis.setJson(this.sessionStateKey(session.id), {
            quizId,
            mode,
            currentQuestionIndex: 0,
            questionStartedAt: null,
            answersThisQuestion: [],
        });

        return { session, quiz };
    }

    async getSessionState(sessionId: string) {
        const { value: state, degraded } = await this.redis.safeGetJson<any>(this.sessionStateKey(sessionId));

        if (degraded) {
        
            const session = await this.prisma.gameSession.findUnique({ where: { id: sessionId } });
            if (!session) throw new NotFoundException('Session not found');

            await this.systemLog.log(
            session.tenantId,
            'WARN',
            'GameService',
            'Redis unreachable — using degraded Postgres fallback for session state',
            );

            return {
            quizId: session.quizId,
            currentQuestionIndex: session.currentQuestionIndex,
            questionStartedAt: null, 
            answersThisQuestion: [], 
            };
        }

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

        const safeQuestion = {
            id: question.id,
            text: question.text,
            mediaUrl: question.mediaUrl || null, 
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

        const elapsedMs = Date.now() - state.questionStartedAt;
        if (elapsedMs > question.timeLimit * 1000) {
            throw new BadRequestException('Time is up for this question');
        }

        const alreadyAnswered = state.answersThisQuestion.find((a: any) => a.playerId === playerId);
        if (alreadyAnswered) {
            throw new BadRequestException('Already answered this question');
        }

        const selectedOption = question.answerOptions.find((o: any) => o.id === selectedOptionId);
        const isCorrect = !!selectedOption?.isCorrect;

        let scoreEarned = 0;
        if (isCorrect) {
            const alreadyHasCorrect = state.answersThisQuestion.some((a: any) => a.isCorrect);
            const timeRatio = 1 - elapsedMs / (question.timeLimit * 1000); 
            scoreEarned = alreadyHasCorrect
                ? Math.round(question.points * 0.5 * timeRatio) 
                : Math.round(question.points * (0.5 + 0.5 * timeRatio)); 
        }

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


        state.answersThisQuestion.push({ playerId, isCorrect, scoreEarned });
        await this.redis.setJson(this.sessionStateKey(sessionId), state);

        return { isCorrect, scoreEarned };
    }

    async getLiveRanking(tenantId: string, sessionId: string) {
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

    async finalizeSession(tenantId: string, sessionId: string) {
        const ranking = await this.getLiveRanking(tenantId, sessionId);

        await this.prisma.gameSession.update({
            where: { id: sessionId },
            data: {
                status: 'FINISHED',
                endedAt: new Date(),
                scoresCache: ranking, 
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