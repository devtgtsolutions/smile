import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SessionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // ============================================================
  // CONNECTION / DISCONNECTION
  // ============================================================

  handleConnection(client: Socket) {
    console.log('========================================');
    console.log('🟢 SOCKET CONNECTED');
    console.log('🟢 socketId:', client.id);
    console.log('🟢 namespace:', client.nsp.name);
    console.log('🟢 query:', client.handshake.query);
    console.log('========================================');
  }

  handleDisconnect(client: Socket) {
    console.log('🔴 SOCKET DISCONNECTED:', client.id);
  }

  // ============================================================
  // BROADCAST METHODS (with logs)
  // ============================================================

  broadcastLobbyCreated(
    tenantId: string,
    sessionId: string,
    gameType: string,
    maxPlayers: number,
  ) {
    console.log('📤 broadcastLobbyCreated', { tenantId, sessionId, gameType, maxPlayers });
    this.server.emit('lobbyCreated', {
      sessionId,
      tenantId,
      gameType,
      maxPlayers,
    });
  }

  broadcastPlayerJoined(
    sessionId: string,
    player: {
      id: string;
      name: string;
      number: number;
      isManager: boolean;
      color: string;
      buzzerTabletId?: string | null;
    },
  ) {
    console.log('📤 broadcastPlayerJoined', { sessionId, player });
    this.server.emit('playerJoined', {
      sessionId,
      player,
    });
  }

  broadcastLobbyFull(
    sessionId: string,
    data: {
      maxPlayers: number;
      players: any[];
    },
  ) {
    console.log('📤 broadcastLobbyFull', { sessionId, ...data });
    this.server.emit('lobby:full', {
      sessionId,
      ...data,
    });
  }

  broadcastLobbyReady(
    sessionId: string,
    data: {
      maxPlayers: number;
      players: any[];
    },
  ) {
    console.log('📤 broadcastLobbyReady', { sessionId, ...data });
    this.server.emit('lobbyReady', {
      sessionId,
      maxPlayers: data.maxPlayers,
      players: data.players,
    });
  }

  broadcastPlayersUpdated(
    sessionId: string,
    players: any[],
  ) {
    console.log('📤 broadcastPlayersUpdated', { sessionId, playersCount: players.length });
    this.server.emit('playersUpdated', {
      sessionId,
      players,
    });
  }

  broadcastQuizConfigured(
    sessionId: string,
    data: {
      quiz: any;
      config: any;
    },
  
  ) {
    console.log('📤 broadcastQuizConfigured', { sessionId, quizId: data.quiz?.id });
    this.server.emit('quizConfigured', {
      sessionId,
      ...data,
    });
  }

  broadcastQuizStarted(
    sessionId: string,
    question: any,
  ) {
    console.log('📤 broadcastQuizStarted', { sessionId, questionId: question?.id });
    this.server.emit('quizStarted', {
      sessionId,
      question,
    });
  }

  broadcastQuestionStarted(
    sessionId: string,
    question: any,
  ) {
    console.log('📤 broadcastQuestionStarted', { sessionId, questionId: question?.id });
    this.server.emit('questionStarted', {
      sessionId,
      question,
    });
  }

  broadcastNextQuestion(
    sessionId: string,
    currentQuestionIndex: number,
    question: any,
  ) {
    console.log('📤 broadcastNextQuestion', { sessionId, currentQuestionIndex, questionId: question?.id });
    this.server.emit('nextQuestion', {
      sessionId,
      currentQuestionIndex,
      question,
    });
  }

  broadcastAnswerSubmitted(
    sessionId: string,
    data: {
      playerId: string;
      questionId: string;
      isCorrect: boolean;
      scoreEarned: number;
    },
  ) {
    console.log('📤 broadcastAnswerSubmitted', { sessionId, ...data });
    this.server.emit('answerSubmitted', {
      sessionId,
      ...data,
    });
  }

  broadcastRankingUpdated(
    sessionId: string,
    ranking: any[],
  ) {
    console.log('📤 broadcastRankingUpdated', { sessionId, rankingCount: ranking.length });
    this.server.emit('rankingUpdated', {
      sessionId,
      ranking,
    });
  }

  broadcastSessionEnded(
    sessionId: string,
    ranking: any[],
  ) {
    console.log('📤 broadcastSessionEnded', { sessionId, rankingCount: ranking.length });
    this.server.emit('sessionEnded', {
      sessionId,
      ranking,
    });
  }

  // ============================================================
  // INCOMING EVENTS (with logs)
  // ============================================================

  @SubscribeMessage('skipTutorial')
  handleSkipTutorial(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    console.log('========================================');
    console.log('📥 EVENT: skipTutorial');
    console.log('📥 from socket:', client.id);
    console.log('📥 payload:', data);
    console.log('========================================');
    this.server.emit('skipTutorial', {
      ...data,
      skippedBy: client.id,
    });
    return { success: true };
  }

  @SubscribeMessage('startTutorial')
  handleStartTutorial(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    console.log('========================================');
    console.log('📥 EVENT: startTutorial');
    console.log('📥 from socket:', client.id);
    console.log('📥 payload:', data);
    console.log('========================================');
    this.server.emit('startTutorial', {
      ...data,
      startedBy: client.id,
    });
    return { success: true };
  }

  @SubscribeMessage('startGame')
  handleStartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    console.log('========================================');
    console.log('📥 EVENT: startGame');
    console.log('📥 from socket:', client.id);
    console.log('📥 payload:', data);
    console.log('========================================');
    this.server.emit('startGame', {
      ...data,
      startedBy: client.id,
    });
    return { success: true };
  }

  // ---------- NEW EVENTS ----------

  @SubscribeMessage('buzz')
  handleBuzz(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { playerId: string; playerName?: string; sessionId?: string },
  ) {
    console.log('========================================');
    console.log('📥 EVENT: buzz');
    console.log('📥 from socket:', client.id);
    console.log('📥 payload:', data);
    console.log('========================================');

    const { playerId, playerName, sessionId } = data;
    this.server.emit('buzzerPressed', {
      playerId,
      playerName: playerName || 'Player',
      sessionId: sessionId || null,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  @SubscribeMessage('submitAnswer')
  handleSubmitAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      playerId: string;
      answer: string;
      isCorrect: boolean;
      points?: number;
      sessionId?: string;
    },
  ) {
    console.log('========================================');
    console.log('📥 EVENT: submitAnswer');
    console.log('📥 from socket:', client.id);
    console.log('📥 payload:', data);
    console.log('========================================');

    const { playerId, answer, isCorrect, points, sessionId } = data;

    if (isCorrect) {
      this.server.emit('answerCorrect', {
        playerId,
        points: points || 1,
        sessionId: sessionId || null,
        timestamp: new Date().toISOString(),
      });
    } else {
      this.server.emit('answerWrong', {
        playerId,
        sessionId: sessionId || null,
        timestamp: new Date().toISOString(),
      });
    }

    return { success: true };
  }

  // ============================================================
  // OPTIONAL: Manual broadcast helpers (with logs)
  // ============================================================
  @SubscribeMessage('newQuestion')
  broadcastNewQuestion(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: {
          sessionId: string; 
          question: string;
          options: Array<{ text: string; isCorrect?: boolean }>;},
      ) {
        console.log('========================================');
        console.log('📥 EVENT: newQuestion');
        console.log('📥 from socket:', client.id);
        console.log('📥 payload:', data);
        console.log('========================================');

        const { sessionId, question, options } = data;
        this.server.emit('newQuestion', {
          sessionId,
          question,
          options,
          timestamp: new Date().toISOString(),
        });
        return { success: true };
      }


  @SubscribeMessage('gameOver')
  broadcastGameOver(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: {
          playerId: string; 
          finalScore: string;
          sessionId: string;},
      ) {
        console.log('========================================');
        console.log('📥 EVENT: gameOver');
        console.log('📥 from socket:', client.id);
        console.log('📥 payload:', data);
        console.log('========================================');

        const { sessionId, finalScore } = data;
        this.server.emit('gameOver', {
          sessionId,
          finalScore,
          timestamp: new Date().toISOString(),
        });
        return { success: true };
      }


  broadcastBuzzerPressed(
    sessionId: string,
    playerId: string,
    playerName: string,
  ) {
    console.log('📤 broadcastBuzzerPressed', { sessionId, playerId, playerName });
    this.server.emit('buzzerPressed', {
      sessionId,
      playerId,
      playerName,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastAnswerCorrect(
    sessionId: string,
    playerId: string,
    points: number,
  ) {
    console.log('📤 broadcastAnswerCorrect', { sessionId, playerId, points });
    this.server.emit('answerCorrect', {
      sessionId,
      playerId,
      points,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastAnswerWrong(
    sessionId: string,
    playerId: string,
  ) {
    console.log('📤 broadcastAnswerWrong', { sessionId, playerId });
    this.server.emit('answerWrong', {
      sessionId,
      playerId,
      timestamp: new Date().toISOString(),
    });
  }
}