import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

import { GameService } from './game.service';

import {
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { WsExceptionFilter } from './ws-exception.filter';

import { DeviceService } from 'src/devices/device.service';

interface SessionState {
  status: string;
  gameType: string;
  maxPlayers: number;

  players: Array<{
    id: string;
    name: string;
    number: number;
    isManager: boolean;
    color: string;
    buzzerTabletId?: string | null;
  }>;

  config: any;
  questions: any[];

  currentQuestionIndex: number;

  questionStartedAt: number | null;

  answersThisQuestion: any[];

  hasManager?: boolean;
}

@WebSocketGateway({
  namespace: 'game',
  cors: {
    origin: '*',
  },
})
@UseFilters(new WsExceptionFilter())
export class GameGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly gameService: GameService,
    private readonly deviceService: DeviceService,
  ) {}

  // ============================================================
  // CONNECTION
  // ============================================================

  async handleConnection(client: Socket) {
    try {
      const tenantId =
        client.handshake.query.tenantId as string;

      if (!tenantId) {
        console.log(
          `❌ Socket rejected: missing tenantId`,
        );

        client.disconnect();
        return;
      }

      const deviceId =
        client.handshake.query.deviceId as string;

      if (deviceId) {
        await this.deviceService
          .updateLastSeen(deviceId)
          .catch(() => {});
      }

      client.data.tenantId = tenantId;

      // --------------------------------------------------------
      // Tenant room
      // --------------------------------------------------------

      const tenantRoom =
        this.getTenantRoom(tenantId);

      await client.join(tenantRoom);

      console.log(
        `✅ Game socket connected: ${client.id}`,
      );

      console.log(
        `🏢 Tenant room: ${tenantRoom}`,
      );
        console.log('========================================');
  console.log('🟢 CLIENT CONNECTED');
  console.log('🟢 socket:', client.id);
  console.log('🟢 handshake query:', client.handshake.query);
  console.log('🟢 namespace:', client.nsp.name);
  console.log('========================================');
    } catch (error) {
      console.error(
        '❌ Socket connection error:',
        error,
      );

      client.disconnect();
    }
  }

  // ============================================================
  // DISCONNECT
  // ============================================================

  handleDisconnect(client: Socket) {
    console.log('🔴 CLIENT DISCONNECTED:', client.id);
    console.log(
      `🔌 Game socket disconnected: ${client.id}`,
    );
  }

  // ============================================================
  // ROOM HELPERS
  // ============================================================

  private getTenantRoom(
    tenantId: string,
  ): string {
    return `tenant:${tenantId}`;
  }

  private getSessionRoom(
    sessionId: string,
  ): string {
    return `session:${sessionId}`;
  }

  // ============================================================
  // BROADCAST TO TENANT
  // ============================================================

  /**
   * Sends an event to every socket connected
   * to this tenant.
   *
   * Used by:
   * - AmbianceController
   * - room status changes
   * - other tenant-wide events
   */
  broadcastToTenant(
    tenantId: string,
    event: string,
    data: any,
  ) {
    if (!tenantId) {
      return;
    }

    const room =
      this.getTenantRoom(tenantId);

    console.log(
      `📡 Broadcasting ${event} → ${room}`,
      data,
    );

    this.server
      .to(room)
      .emit(event, data);
  }

  // ============================================================
  // GET LOBBY STATE
  // ============================================================

  @SubscribeMessage('getLobbyState')
  async handleGetLobbyState(
    client: Socket,
    payload: {
      sessionId: string;
    },
  ) {
    try {
      if (!payload?.sessionId) {
        throw new Error(
          'sessionId is required',
        );
      }

      const state =
        (await this.gameService.getSessionState(
          payload.sessionId,
        )) as SessionState;

      const tenantId =
        client.data.tenantId;

      client.data.sessionId =
        payload.sessionId;

      await client.join(
        this.getSessionRoom(
          payload.sessionId,
        ),
      );

      client.emit('lobbyState', {
        sessionId:
          payload.sessionId,
        tenantId,
        status: state.status,
        gameType: state.gameType,
        maxPlayers: state.maxPlayers,
        players:
          state.players || [],
        hasManager:
          state.hasManager || false,
      });

      console.log(
        `📤 lobbyState sent to ${client.id}`,
      );
    } catch (error) {
      client.emit('error', {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to get lobby state',
      });
    }
  }

  // ============================================================
  // JOIN LOBBY
  // ============================================================

  @SubscribeMessage('joinLobby')
  @UsePipes(new ValidationPipe())
  async handleJoinLobby(
    client: Socket,
    payload: {
      sessionId: string;
      playerName: string;
      buzzerTabletId?: string;
      color?: string;
    },
  ) {
    try {
      if (!payload?.sessionId) {
        throw new Error(
          'sessionId is required',
        );
      }

      if (!payload?.playerName) {
        throw new Error(
          'playerName is required',
        );
      }

      const result =
        await this.gameService.joinLobby(
          payload.sessionId,
          payload.playerName,
          payload.buzzerTabletId,
          payload.color ||
            '#FFFFFF',
        );

      client.data.playerId =
        result.playerId;

      client.data.sessionId =
        payload.sessionId;

      await client.join(
        this.getSessionRoom(
          payload.sessionId,
        ),
      );

      const state =
        (await this.gameService.getSessionState(
          payload.sessionId,
        )) as SessionState;

      const sessionRoom =
        this.getSessionRoom(
          payload.sessionId,
        );

      // --------------------------------------------------------
      // Players updated
      // --------------------------------------------------------

      this.server
        .to(sessionRoom)
        .emit('playersUpdated', {
          sessionId:
            payload.sessionId,
          players:
            state.players,
        });

      // --------------------------------------------------------
      // Lobby full
      // --------------------------------------------------------

      if (
        state.players.length >=
        state.maxPlayers
      ) {
        console.log(
          `🎉 Lobby ready: ${payload.sessionId}`,
        );

        this.server
          .to(sessionRoom)
          .emit('lobbyReady', {
            sessionId:
              payload.sessionId,
            maxPlayers:
              state.maxPlayers,
            players:
              state.players,
          });
      }

      // --------------------------------------------------------
      // Confirm join
      // --------------------------------------------------------

      client.emit(
        'joined',
        result,
      );
    } catch (error) {
      client.emit('error', {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to join lobby',
      });
    }
  }

  // ============================================================
  // CONFIGURE QUIZ
  // ============================================================

  @SubscribeMessage('configureQuiz')
  @UsePipes(new ValidationPipe())
  async handleConfigureQuiz(
    client: Socket,
    payload: {
      sessionId: string;
      numQuestions: number;
      difficulty: string;
      category: string;
      mode:
        | 'QUIZ'
        | 'BLIND_TEST';
    },
  ) {
    try {
      await this.gameService.configureQuiz(
        payload.sessionId,
        {
          numQuestions:
            payload.numQuestions,
          difficulty:
            payload.difficulty,
          category:
            payload.category,
          mode:
            payload.mode,
        },
        client.data.playerId,
      );

      this.server
        .to(
          this.getSessionRoom(
            payload.sessionId,
          ),
        )
        .emit(
          'configUpdated',
          {
            sessionId:
              payload.sessionId,
            status: 'READY',
          },
        );

      client.emit(
        'configSuccess',
        {
          sessionId:
            payload.sessionId,
        },
      );
    } catch (error) {
      client.emit('error', {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to configure quiz',
      });
    }
  }

  // ============================================================
  // START QUIZ
  // ============================================================

  @SubscribeMessage('startQuiz')
  async handleStartQuiz(
    client: Socket,
    payload: {
      sessionId: string;
    },
  ) {
    try {
      const firstQuestion =
        await this.gameService.startQuiz(
          payload.sessionId,
          client.data.playerId,
        );

      const state =
        (await this.gameService.getSessionState(
          payload.sessionId,
        )) as SessionState;

      this.server
        .to(
          this.getSessionRoom(
            payload.sessionId,
          ),
        )
        .emit(
          'questionStarted',
          {
            sessionId:
              payload.sessionId,
            question:
              firstQuestion,
            questionNumber: 1,
            totalQuestions:
              state.questions.length,
          },
        );
    } catch (error) {
      client.emit('error', {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to start quiz',
      });
    }
  }

  // ============================================================
  // SUBMIT ANSWER
  // ============================================================

  @SubscribeMessage('submitAnswer')
  @UsePipes(new ValidationPipe())
  async handleSubmitAnswer(
    client: Socket,
    payload: {
      sessionId: string;
      questionId: string;
      selectedOptionId: string;
    },
  ) {
    try {
      const playerId =
        client.data.playerId;

      if (!playerId) {
        throw new Error(
          'Player not identified',
        );
      }

      const result =
        await this.gameService.submitAnswer(
          payload.sessionId,
          playerId,
          payload.questionId,
          payload.selectedOptionId,
        );

      client.emit(
        'answerResult',
        {
          ...result,
          questionId:
            payload.questionId,
        },
      );

      const ranking =
        await this.gameService.getLiveRanking(
          payload.sessionId,
        );

      this.server
        .to(
          this.getSessionRoom(
            payload.sessionId,
          ),
        )
        .emit(
          'rankingUpdated',
          {
            sessionId:
              payload.sessionId,
            ranking,
          },
        );
    } catch (error) {
      client.emit('error', {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to submit answer',
      });
    }
  }

  // ============================================================
  // NEXT QUESTION
  // ============================================================

  @SubscribeMessage('nextQuestion')
  async handleNextQuestion(
    client: Socket,
    payload: {
      sessionId: string;
    },
  ) {
    try {
      const state =
        (await this.gameService.getSessionState(
          payload.sessionId,
        )) as SessionState;

      const player =
        state.players?.find(
          (p) =>
            p.id ===
            client.data.playerId,
        );

      if (
        !player ||
        !player.isManager
      ) {
        throw new Error(
          'Only the manager can advance',
        );
      }

      const result =
        await this.gameService.advanceToNextQuestion(
          payload.sessionId,
        );

      // --------------------------------------------------------
      // Finished
      // --------------------------------------------------------

      if (result.finished) {
        this.server
          .to(
            this.getSessionRoom(
              payload.sessionId,
            ),
          )
          .emit(
            'sessionEnded',
            {
              sessionId:
                payload.sessionId,
              ranking:
                result.ranking,
            },
          );

        return;
      }

      // --------------------------------------------------------
      // Next question
      // --------------------------------------------------------

      const nextQuestion =
        await this.gameService.startQuestion(
          payload.sessionId,
          false,
        );

      const currentQuestionIndex =
        result.currentQuestionIndex;

      this.server
        .to(
          this.getSessionRoom(
            payload.sessionId,
          ),
        )
        .emit(
          'questionStarted',
          {
            sessionId:
              payload.sessionId,
            question:
              nextQuestion,
            questionNumber:
              currentQuestionIndex + 1,
            totalQuestions:
              state.questions.length,
          },
        );
    } catch (error) {
      client.emit('error', {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to advance question',
      });
    }
  }

  // ============================================================
  // END SESSION
  // ============================================================

  @SubscribeMessage('endSession')
  async handleEndSession(
    client: Socket,
    payload: {
      sessionId: string;
    },
  ) {
    try {
      const state =
        (await this.gameService.getSessionState(
          payload.sessionId,
        )) as SessionState;

      const player =
        state.players?.find(
          (p) =>
            p.id ===
            client.data.playerId,
        );

      if (
        !player ||
        !player.isManager
      ) {
        throw new Error(
          'Only the manager can end the session',
        );
      }

      const ranking =
        await this.gameService.endSession(
          payload.sessionId,
        );

      this.server
        .to(
          this.getSessionRoom(
            payload.sessionId,
          ),
        )
        .emit(
          'sessionEnded',
          {
            sessionId:
              payload.sessionId,
            ranking,
          },
        );
    } catch (error) {
      client.emit('error', {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to end session',
      });
    }
  }
}