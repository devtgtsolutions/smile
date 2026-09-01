import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { SystemLogService } from '../../logging/system-log.service';
import { SessionGateway } from 'src/redis/sessionGateway';

@Injectable()
export class GameService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
        private readonly systemLog: SystemLogService,
        private readonly sessionGateway: SessionGateway,
    ) { }

    // ============================================================
    // REDIS KEYS
    // ============================================================

    private sessionStateKey(
        sessionId: string,
    ) {
        return `session:state:${sessionId}`;
    }

    private playerCounterKey(
        sessionId: string,
    ) {
        return `session:${sessionId}:playerCounter`;
    }

    // ============================================================
    // CREATE LOBBY
    // ============================================================

    async createLobby(
        tenantId: string,
        gameType: string,
        maxPlayers: number,
    ) {
        if (!tenantId) {
            throw new BadRequestException(
                'tenantId must be provided',
            );
        }

        if (!gameType) {
            throw new BadRequestException(
                'gameType must be provided',
            );
        }

        // if (
        //     !maxPlayers ||
        //     maxPlayers < 2
        // ) {
        //     throw new BadRequestException(
        //         'maxPlayers must be at least 2',
        //     );
        // }

        const metadata = {
            gameType,
            maxPlayers,
        };

        // ----------------------------------------------------------
        // Create PostgreSQL session
        // ----------------------------------------------------------

        const session =
            await this.prisma.gameSession.create({
                data: {
                    tenantId,
                    mode: 'QUIZ',
                    status: 'WAITING',
                    scoresCache:
                        metadata as any,
                },
            });

        // ----------------------------------------------------------
        // Create Redis state
        // ----------------------------------------------------------

        await this.redis.setJson(
            this.sessionStateKey(
                session.id,
            ),
            {
                status: 'WAITING',
                gameType,
                maxPlayers,

                players: [],

                config: null,
                questions: [],

                currentQuestionIndex: 0,

                questionStartedAt: null,

                answersThisQuestion: [],

                hasManager: false,
            },
        );

        // ----------------------------------------------------------
        // Reset player counter
        // ----------------------------------------------------------

        await this.redis.set(
            this.playerCounterKey(
                session.id,
            ),
            '0',
        );

        // ----------------------------------------------------------
        // BROADCAST
        //
        // IMPORTANT:
        // This now goes to tenant:${tenantId}
        // and uses the /game namespace.
        // ----------------------------------------------------------

        this.sessionGateway.broadcastLobbyCreated(
            tenantId,
            session.id,
            gameType,
            maxPlayers,
        );

        console.log(
            `🎮 Lobby created: ${session.id}`,
        );

        console.log(
            `📡 lobbyCreated -> tenant:${tenantId}`,
        );

        return {
            sessionId: session.id,
            tenantId,
            gameType,
            maxPlayers,
        };
    }

    // ============================================================
    // JOIN LOBBY
    // ============================================================

    async joinLobby(
        sessionId: string,
        playerName: string,
        buzzerTabletId?: string,
        color: string = '#FFFFFF',
    ) {
        if (!sessionId) {
            throw new BadRequestException(
                'sessionId must be provided',
            );
        }

        if (!playerName) {
            throw new BadRequestException(
                'playerName must be provided',
            );
        }

        const session =
            await this.prisma.gameSession.findUnique({
                where: {
                    id: sessionId,
                },
            });

        if (!session) {
            throw new NotFoundException(
                'Session not found',
            );
        }

        if (
            session.status !== 'WAITING'
        ) {
            throw new BadRequestException(
                'Game already started or configured',
            );
        }

        const metadata =
            (session.scoresCache as any) || {};

        const maxPlayers =
            Number(metadata.maxPlayers) || 6;

        // ----------------------------------------------------------
        // Atomic player number
        // ----------------------------------------------------------

        const playerNumber =
            await this.redis.incr(
                this.playerCounterKey(
                    sessionId,
                ),
            );

        if (
            playerNumber > maxPlayers
        ) {
            throw new BadRequestException(
                'Lobby is full',
            );
        }

        const isManager = playerNumber === 1;

        // ----------------------------------------------------------
        // Create player
        // ----------------------------------------------------------

        const player =
            await this.prisma.player.create({
                data: {
                    name: playerName,
                    gameSessionId: sessionId,
                    buzzerTabletId:
                        buzzerTabletId || null,
                    color,
                    isManager: isManager,
                    isActive: true,
                },
            });

        // ----------------------------------------------------------
        // Get Redis state
        // ----------------------------------------------------------

        const state =
            await this.redis.getJson<any>(
                this.sessionStateKey(
                    sessionId,
                ),
            );

        if (!state) {
            throw new NotFoundException(
                'Session state not found',
            );
        }

        if (!state.players) {
            state.players = [];
        }

        const playerData = {
            id: player.id,
            name: playerName,
            number: playerNumber,
            isManager,
            color,
            buzzerTabletId:
                buzzerTabletId || null,
        };

        state.players.push(
            playerData,
        );

        if (isManager) {
            state.hasManager = true;
        }

        await this.redis.setJson(
            this.sessionStateKey(
                sessionId,
            ),
            state,
        );

        // ----------------------------------------------------------
        // Broadcast player joined
        // ----------------------------------------------------------

        this.sessionGateway.broadcastPlayerJoined(
            sessionId,
            playerData,
        );

        // ----------------------------------------------------------
        // Lobby full
        // ----------------------------------------------------------

        if (
            state.players.length >=
            maxPlayers
        ) {
            this.sessionGateway.broadcastLobbyFull(
                sessionId,
                {
                    maxPlayers,
                    players:
                        state.players,
                },
            );

            this.sessionGateway.broadcastLobbyReady(
                sessionId,
                {
                    maxPlayers,
                    players:
                        state.players,
                },
            );

            console.log(
                `🎉 Lobby READY: ${sessionId}`,
            );
        }

        return {
            playerId: player.id,
            playerNumber,
            isManager,
            sessionId,
            maxPlayers,
            lobbyReady:
                state.players.length >=
                maxPlayers,
        };
    }

    // ============================================================
    // GET SESSION STATE
    // ============================================================

    async getSessionState(
        sessionId: string,
    ) {
        const state =
            await this.redis.getJson<any>(
                this.sessionStateKey(
                    sessionId,
                ),
            );

        if (!state) {
            throw new NotFoundException(
                'Session state not found',
            );
        }

        return state;
    }

    // ============================================================
    // CONFIGURE QUIZ
    // ============================================================

    async configureQuiz(
        sessionId: string,
        config: {
            numQuestions: number;
            difficulty: string;
            category: string;
            mode: 'QUIZ' | 'BLIND_TEST';
        },
        playerId: string,
    ) {
        // ============================================================
        // 1. GET SESSION STATE
        // ============================================================

        const state =
            await this.getSessionState(sessionId);

        if (!state) {
            throw new BadRequestException(
                'Session not found',
            );
        }

        if (state.status !== 'WAITING') {
            throw new BadRequestException(
                'Cannot configure quiz now',
            );
        }

        // ============================================================
        // 2. CHECK MANAGER
        // ============================================================

        const player =
            state.players?.find(
                (p: any) =>
                    p.id === playerId,
            );

        if (
            !player ||
            !player.isManager
        ) {
            throw new BadRequestException(
                'Only the manager can configure the quiz',
            );
        }

        // ============================================================
        // 3. VALIDATE CONFIG
        // ============================================================

        if (
            !config.numQuestions ||
            config.numQuestions < 1
        ) {
            throw new BadRequestException(
                'numQuestions must be at least 1',
            );
        }

        if (!config.difficulty) {
            throw new BadRequestException(
                'difficulty must be provided',
            );
        }

        if (!config.category) {
            throw new BadRequestException(
                'category must be provided',
            );
        }

        // ============================================================
        // 4. FIND CATEGORY
        // ============================================================

        const category =
            await this.prisma.quizCategory.findUnique({
                where: {
                    name: config.category,
                },
            });

        if (!category) {
            throw new BadRequestException(
                `Category "${config.category}" not found`,
            );
        }

        // ============================================================
        // 5. FIND EXISTING QUIZZES
        //
        // IMPORTANT:
        // We DO NOT create a quiz here.
        //
        // We only find existing QuizCatalog records.
        // ============================================================

        const quizzes =
            await this.prisma.quizCatalog.findMany({
                where: {
                    type:
                        config.mode === 'BLIND_TEST'
                            ? 'BLIND_TEST'
                            : 'QUIZ',

                    categoryId:
                        category.id,

                    questions: {
                        some: {
                            difficulty:
                                config.difficulty as any,
                        },
                    },
                },

                include: {
                    questions: {
                        where: {
                            difficulty:
                                config.difficulty as any,
                        },

                        include: {
                            answerOptions: true,
                        },

                        orderBy: {
                            orderIndex: 'asc',
                        },
                    },
                },
            });

        // ============================================================
        // 6. FIND QUIZZES WITH ENOUGH QUESTIONS
        // ============================================================

        const eligibleQuizzes =
            quizzes.filter(
                (quiz) =>
                    quiz.questions.length >=
                    config.numQuestions,
            );

        if (
            eligibleQuizzes.length === 0
        ) {
            throw new BadRequestException(
                `No existing quiz found with category "${config.category}", difficulty "${config.difficulty}", and at least ${config.numQuestions} questions`,
            );
        }

        // ============================================================
        // 7. SELECT AN EXISTING QUIZ RANDOMLY
        // ============================================================

        const quiz =
            eligibleQuizzes[
            Math.floor(
                Math.random() *
                eligibleQuizzes.length,
            )
            ];

        // ============================================================
        // 8. RANDOMLY SELECT QUESTIONS
        // ============================================================

        const shuffledQuestions =
            this.shuffleArray([
                ...quiz.questions,
            ]);

        const selectedQuestions =
            shuffledQuestions.slice(
                0,
                config.numQuestions,
            );

        // ============================================================
        // 9. ATTACH EXISTING QUIZ TO GAME SESSION
        // ============================================================

        await this.prisma.gameSession.update({
            where: {
                id: sessionId,
            },

            data: {
                quizId: quiz.id,
                mode: config.mode,
            },
        });

        // ============================================================
        // 10. UPDATE REDIS GAME STATE
        // ============================================================

        state.config = config;

        state.questions =
            selectedQuestions.map(
                (q) => ({
                    id: q.id,
                    text: q.text,
                    mediaUrl: q.mediaUrl,
                    timeLimit: q.timeLimit,
                    points: q.points,

                    answerOptions:
                        q.answerOptions.map(
                            (o) => ({
                                id: o.id,
                                text: o.text,
                                isCorrect:
                                    o.isCorrect,
                            }),
                        ),
                }),
            );

        state.currentQuestionIndex = 0;

        state.questionStartedAt = null;

        state.answersThisQuestion = [];

        state.status = 'READY';

        await this.redis.setJson(
            this.sessionStateKey(
                sessionId,
            ),
            state,
        );

        // ============================================================
        // 11. BROADCAST TO ALL CLIENTS IN SESSION
        // ============================================================

        this.sessionGateway.broadcastQuizConfigured(
            sessionId,
            {
                quiz: {
                    id: quiz.id,
                    title: quiz.title,
                    type: quiz.type,
                    categoryId: quiz.categoryId,
                    questions: selectedQuestions,
                },
                config,
            },
        );

        // ============================================================
        // 12. RETURN
        // ============================================================

        return {
            success: true,

            quiz: {
                id: quiz.id,
                title: quiz.title,
                type: quiz.type,
                categoryId: quiz.categoryId,
            },

            config,

            questions:
                selectedQuestions,
        };
    }

    // ============================================================
    // START QUIZ
    // ============================================================

    async startQuiz(
        sessionId: string,
        playerId: string,
    ) {
        const state =
            await this.getSessionState(
                sessionId,
            );

        if (
            state.status !== 'READY'
        ) {
            throw new BadRequestException(
                'Quiz is not configured or already started',
            );
        }

        if (
            !state.questions ||
            state.questions.length === 0
        ) {
            throw new BadRequestException(
                'No questions loaded',
            );
        }

        const player =
            state.players?.find(
                (p: any) =>
                    p.id === playerId,
            );

        if (
            !player ||
            !player.isManager
        ) {
            throw new BadRequestException(
                'Only the manager can start the quiz',
            );
        }

        state.status =
            'ACTIVE';

        state.currentQuestionIndex =
            0;

        state.questionStartedAt =
            null;

        state.answersThisQuestion =
            [];

        await this.redis.setJson(
            this.sessionStateKey(
                sessionId,
            ),
            state,
        );

        await this.prisma.gameSession.update(
            {
                where: {
                    id: sessionId,
                },

                data: {
                    status: 'ACTIVE',
                    startedAt:
                        new Date(),
                    currentQuestionIndex:
                        0,
                },
            },
        );

        const question =
            await this.startQuestion(
                sessionId,
                false,
            );

        this.sessionGateway.broadcastQuizStarted(
            sessionId,
            question,
        );

        return question;
    }

    // ============================================================
    // START QUESTION
    // ============================================================

    async startQuestion(
        sessionId: string,
        broadcast = true,
    ) {
        const state =
            await this.getSessionState(
                sessionId,
            );

        if (
            state.status !== 'ACTIVE'
        ) {
            throw new BadRequestException(
                'Session not active',
            );
        }

        const question =
            state.questions?.[
            state.currentQuestionIndex
            ];

        if (!question) {
            await this.endSession(
                sessionId,
            );

            throw new BadRequestException(
                'No more questions - session ended',
            );
        }

        state.questionStartedAt =
            Date.now();

        state.answersThisQuestion =
            [];

        await this.redis.setJson(
            this.sessionStateKey(
                sessionId,
            ),
            state,
        );

        const questionData = {
            id: question.id,

            text: question.text,

            mediaUrl:
                question.mediaUrl ||
                null,

            timeLimit:
                question.timeLimit,

            points:
                question.points,

            options:
                question.answerOptions.map(
                    (o: any) => ({
                        id: o.id,
                        text: o.text,
                    }),
                ),
        };

        if (broadcast) {
            this.sessionGateway.broadcastQuestionStarted(
                sessionId,
                questionData,
            );
        }

        return questionData;
    }

    // ============================================================
    // SUBMIT ANSWER
    // ============================================================

    async submitAnswer(
        sessionId: string,
        playerId: string,
        questionId: string,
        selectedOptionId: string,
    ) {
        const state =
            await this.getSessionState(
                sessionId,
            );

        if (
            state.status !== 'ACTIVE'
        ) {
            throw new BadRequestException(
                'Game not active',
            );
        }

        const question =
            state.questions?.find(
                (q: any) =>
                    q.id === questionId,
            );

        if (!question) {
            throw new BadRequestException(
                'Question not found in this session',
            );
        }

        if (
            !state.questionStartedAt
        ) {
            throw new BadRequestException(
                'Question has not started',
            );
        }

        const elapsedMs =
            Date.now() -
            state.questionStartedAt;

        if (
            elapsedMs >
            question.timeLimit * 1000
        ) {
            throw new BadRequestException(
                'Time is up for this question',
            );
        }

        const playerExists =
            state.players?.some(
                (p: any) =>
                    p.id === playerId,
            );

        if (!playerExists) {
            throw new BadRequestException(
                'Player not in this session',
            );
        }

        const alreadyAnswered =
            state.answersThisQuestion?.find(
                (a: any) =>
                    a.playerId ===
                    playerId,
            );

        if (alreadyAnswered) {
            throw new BadRequestException(
                'Already answered this question',
            );
        }

        const selectedOption =
            question.answerOptions?.find(
                (o: any) =>
                    o.id ===
                    selectedOptionId,
            );

        if (!selectedOption) {
            throw new BadRequestException(
                'Invalid answer option',
            );
        }

        const isCorrect =
            !!selectedOption.isCorrect;

        let scoreEarned = 0;

        if (isCorrect) {
            const alreadyHasCorrect =
                state.answersThisQuestion.some(
                    (a: any) =>
                        a.isCorrect,
                );

            const timeRatio =
                Math.max(
                    0,
                    1 -
                    elapsedMs /
                    (question.timeLimit *
                        1000),
                );

            scoreEarned =
                alreadyHasCorrect
                    ? Math.round(
                        question.points *
                        0.5 *
                        timeRatio,
                    )
                    : Math.round(
                        question.points *
                        (0.5 +
                            0.5 *
                            timeRatio),
                    );
        }

        await this.prisma.playerAnswer.create(
            {
                data: {
                    playerId,

                    questionId,

                    gameSessionId:
                        sessionId,

                    selectedOptionId,

                    isCorrect,

                    responseTimeMs:
                        elapsedMs,

                    scoreEarned,
                },
            },
        );

        state.answersThisQuestion.push(
            {
                playerId,
                isCorrect,
                scoreEarned,
            },
        );

        await this.redis.setJson(
            this.sessionStateKey(
                sessionId,
            ),
            state,
        );

        this.sessionGateway.broadcastAnswerSubmitted(
            sessionId,
            {
                playerId,
                questionId,
                isCorrect,
                scoreEarned,
            },
        );

        const ranking =
            await this.getLiveRanking(
                sessionId,
            );

        this.sessionGateway.broadcastRankingUpdated(
            sessionId,
            ranking,
        );

        return {
            isCorrect,
            scoreEarned,
        };
    }

    // ============================================================
    // NEXT QUESTION
    // ============================================================

    async advanceToNextQuestion(
        sessionId: string,
    ) {
        const state =
            await this.getSessionState(
                sessionId,
            );

        if (
            state.status !== 'ACTIVE'
        ) {
            throw new BadRequestException(
                'Session is not active',
            );
        }

        const nextIndex =
            state.currentQuestionIndex +
            1;

        const nextQuestion =
            state.questions?.[
            nextIndex
            ];

        if (!nextQuestion) {
            const ranking =
                await this.endSession(
                    sessionId,
                );

            return {
                finished: true as const,
                ranking,
            };
        }

        state.currentQuestionIndex =
            nextIndex;

        state.questionStartedAt =
            null;

        state.answersThisQuestion =
            [];

        await this.redis.setJson(
            this.sessionStateKey(
                sessionId,
            ),
            state,
        );

        await this.prisma.gameSession.update(
            {
                where: {
                    id: sessionId,
                },

                data: {
                    currentQuestionIndex:
                        nextIndex,
                },
            },
        );

        const questionData = {
            id: nextQuestion.id,

            text: nextQuestion.text,

            mediaUrl:
                nextQuestion.mediaUrl ||
                null,

            timeLimit:
                nextQuestion.timeLimit,

            points:
                nextQuestion.points,

            options:
                nextQuestion.answerOptions.map(
                    (o: any) => ({
                        id: o.id,
                        text: o.text,
                    }),
                ),
        };

        return {
            finished: false as const,

            currentQuestionIndex:
                nextIndex,

            question:
                questionData,
        };
    }

    // ============================================================
    // END SESSION
    // ============================================================

    async endSession(
        sessionId: string,
    ) {
        const state =
            await this.redis.getJson<any>(
                this.sessionStateKey(
                    sessionId,
                ),
            );

        if (state) {
            const ranking =
                await this.getLiveRanking(
                    sessionId,
                );

            await this.prisma.gameSession.update(
                {
                    where: {
                        id: sessionId,
                    },

                    data: {
                        status: 'FINISHED',

                        endedAt:
                            new Date(),

                        scoresCache:
                            ranking as any,
                    },
                },
            );

            await this.redis.del(
                this.sessionStateKey(
                    sessionId,
                ),
            );

            await this.redis.del(
                this.playerCounterKey(
                    sessionId,
                ),
            );

            this.sessionGateway.broadcastSessionEnded(
                sessionId,
                ranking,
            );

            return ranking;
        }

        const session =
            await this.prisma.gameSession.findUnique(
                {
                    where: {
                        id: sessionId,
                    },
                },
            );

        if (session) {
            await this.prisma.gameSession.update(
                {
                    where: {
                        id: sessionId,
                    },

                    data: {
                        status: 'FINISHED',
                        endedAt:
                            new Date(),
                    },
                },
            );
        }

        this.sessionGateway.broadcastSessionEnded(
            sessionId,
            [],
        );

        return [];
    }

    // ============================================================
    // LIVE RANKING
    // ============================================================

    async getLiveRanking(
        sessionId: string,
    ) {
        const answers =
            await this.prisma.playerAnswer.findMany(
                {
                    where: {
                        gameSessionId:
                            sessionId,
                    },

                    include: {
                        player: true,
                    },
                },
            );

        const totals = new Map<
            string,
            {
                name: string;
                score: number;
            }
        >();

        for (const answer of answers) {
            const current =
                totals.get(
                    answer.playerId,
                ) || {
                    name:
                        answer.player.name,
                    score: 0,
                };

            current.score +=
                answer.scoreEarned;

            totals.set(
                answer.playerId,
                current,
            );
        }

        return Array.from(
            totals.entries(),
        )
            .map(
                ([
                    playerId,
                    data,
                ]) => ({
                    playerId,
                    ...data,
                }),
            )
            .sort(
                (a, b) =>
                    b.score - a.score,
            );
    }

    // ============================================================
    // SHUFFLE
    // ============================================================

    private shuffleArray<T>(
        arr: T[],
    ): T[] {
        const copy = [...arr];

        for (
            let i =
                copy.length - 1;
            i > 0;
            i--
        ) {
            const j =
                Math.floor(
                    Math.random() *
                    (i + 1),
                );

            [
                copy[i],
                copy[j],
            ] = [
                    copy[j],
                    copy[i],
                ];
        }

        return copy;
    }
}