import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { GameService } from './game.service';
import { SessionOwnershipGuard } from 'src/common/guards/session-ownership.guard';

import {
  CreateLobbyDto,
  JoinLobbyDto,
  ConfigureQuizDto,
  StartQuizDto,
  SubmitAnswerDto,
} from './dto/game-dto';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  // ============================================================
  // LOBBY
  // ============================================================

  /**
   * Create a new game lobby.
   *
   * POST /game/lobby
   *
   * Body:
   * {
   *   "tenantId": "TENANT_ID",
   *   "gameType": "Quiz",
   *   "maxPlayers": 4
   * }
   */
  @Post('lobby')
  async createLobby(@Body() dto: CreateLobbyDto) {
    console.log('📥 Create lobby DTO:', dto);

    return this.gameService.createLobby(
      dto.tenantId,
      dto.gameType,
      dto.maxPlayers,
    );
  }

  /**
   * Join an existing lobby.
   *
   * POST /game/lobby/:sessionId/join
   */
  @Post('lobby/:sessionId/join')
  async joinLobby(
    @Param('sessionId') sessionId: string,
    @Body() dto: JoinLobbyDto,
  ) {
    console.log('📥 Join lobby:', {
      sessionId,
      dto,
    });

    return this.gameService.joinLobby(
      sessionId,
      dto.playerName,
      dto.buzzerTabletId,
      dto.color,
    );
  }

  // ============================================================
  // SESSION
  // ============================================================

  /**
   * Get live session state from Redis.
   *
   * GET /game/session/:sessionId/state
   */
  @Get('session/:sessionId/state')
  async getSessionState(
    @Param('sessionId') sessionId: string,
  ) {
    return this.gameService.getSessionState(sessionId);
  }

  /**
   * Get session from database.
   *
   * GET /game/sessions/:sessionId
   */
  @UseGuards(SessionOwnershipGuard)
  @Get('sessions/:sessionId')
  async getSession(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    return req.session;
  }

  // ============================================================
  // QUIZ CONFIGURATION
  // ============================================================

  /**
   * Configure quiz.
   *
   * POST /game/session/:sessionId/configure
   *
   * Body:
   * {
   *   "playerId": "...",
   *   "numQuestions": 10,
   *   "difficulty": "EASY",
   *   "category": "General Knowledge",
   *   "mode": "QUIZ"
   * }
   */
  @Post('session/:sessionId/configure')
  async configureQuiz(
    @Param('sessionId') sessionId: string,
    @Body() dto: ConfigureQuizDto,
  ) {
    console.log('📥 Configure quiz:', {
      sessionId,
      dto,
    });

    return this.gameService.configureQuiz(
      sessionId,
      {
        numQuestions: dto.numQuestions,
        difficulty: dto.difficulty,
        category: dto.category,
        mode: dto.mode,
      },
      dto.playerId,
    );
  }

  // ============================================================
  // START QUIZ
  // ============================================================

  /**
   * Start quiz.
   *
   * POST /game/session/:sessionId/start
   *
   * Body:
   * {
   *   "playerId": "manager-player-id"
   * }
   */
  @Post('session/:sessionId/start')
  async startQuiz(
    @Param('sessionId') sessionId: string,
    @Body() dto: StartQuizDto,
  ) {
    console.log('📥 Start quiz:', {
      sessionId,
      playerId: dto.playerId,
    });

    return this.gameService.startQuiz(
      sessionId,
      dto.playerId,
    );
  }

  // ============================================================
  // QUESTION
  // ============================================================

  /**
   * Start/current question.
   *
   * POST /game/session/:sessionId/question/start
   */
  @Post('session/:sessionId/question/start')
  async startQuestion(
    @Param('sessionId') sessionId: string,
  ) {
    return this.gameService.startQuestion(sessionId);
  }

  /**
   * Advance to next question.
   *
   * POST /game/session/:sessionId/question/next
   */
  @Post('session/:sessionId/question/next')
  async advanceToNextQuestion(
    @Param('sessionId') sessionId: string,
  ) {
    return this.gameService.advanceToNextQuestion(sessionId);
  }

  // ============================================================
  // ANSWERS
  // ============================================================

  /**
   * Submit an answer.
   *
   * POST /game/session/:sessionId/answer
   *
   * Body:
   * {
   *   "playerId": "...",
   *   "questionId": "...",
   *   "selectedOptionId": "..."
   * }
   */
  @Post('session/:sessionId/answer')
  async submitAnswer(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    console.log('📥 Submit answer:', {
      sessionId,
      dto,
    });

    return this.gameService.submitAnswer(
      sessionId,
      dto.playerId,
      dto.questionId,
      dto.selectedOptionId,
    );
  }

  // ============================================================
  // RANKING
  // ============================================================

  /**
   * Get current live ranking.
   *
   * GET /game/session/:sessionId/ranking
   */
  @Get('session/:sessionId/ranking')
  async getLiveRanking(
    @Param('sessionId') sessionId: string,
  ) {
    return this.gameService.getLiveRanking(sessionId);
  }

  // ============================================================
  // END SESSION
  // ============================================================

  /**
   * End the game session.
   *
   * POST /game/session/:sessionId/end
   */
  @Post('session/:sessionId/end')
  async endSession(
    @Param('sessionId') sessionId: string,
  ) {
    console.log('📥 End session:', sessionId);

    return this.gameService.endSession(sessionId);
  }
}