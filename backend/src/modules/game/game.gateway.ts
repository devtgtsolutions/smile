import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { GameService } from './game.service';
import { DmxService } from '../../dmx/dmx.service';
import { AudioService } from '../audio/audio.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('GameGateway');
  private questionTimers = new Map<string, NodeJS.Timeout>(); // sessionId -> timer

  constructor(
  private gameService: GameService,
  private dmxService: DmxService,
  private audioService: AudioService,
) {}


  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Every tablet calls this immediately after connecting, e.g.:
  // socket.emit('joinRoom', { tenantId: 'uuid-of-room-01' })
  @SubscribeMessage('joinRoom')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: { tenantId: string }) {
    client.join(payload.tenantId); // Socket.io's built-in room mechanism
    this.logger.log(`Client ${client.id} joined room ${payload.tenantId}`);
    client.emit('joinedRoom', { tenantId: payload.tenantId });
  }

  // Called by the REST controller (Super Admin action) or directly over WS.
  async startSession(tenantId: string, sessionId: string) {
    const question = await this.gameService.startQuestion(sessionId);

    // The key line: .to(tenantId) means ONLY clients in this room's Socket.io
    // room receive this - Room B's tablets never see Room A's questions.
    this.server.to(tenantId).emit('question:show', { sessionId, question });

    this.startQuestionTimer(tenantId, sessionId, question.timeLimit);
  }

// in game.gateway.ts, replace startQuestionTimer with this fuller version

private startQuestionTimer(tenantId: string, sessionId: string, seconds: number) {
  const existing = this.questionTimers.get(sessionId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(async () => {
    this.server.to(tenantId).emit('question:timeUp', { sessionId });

    const ranking = await this.gameService.getLiveRanking(tenantId, sessionId);
    this.server.to(tenantId).emit('ranking:update', ranking);

    const hasMore = await this.gameService.hasMoreQuestions(sessionId);
    if (hasMore) {
      await this.gameService.advanceToNextQuestion(sessionId);
      const nextQuestion = await this.gameService.startQuestion(sessionId);
      this.server.to(tenantId).emit('question:show', { sessionId, question: nextQuestion });
      this.startQuestionTimer(tenantId, sessionId, nextQuestion.timeLimit);
    } else {
      const finalRanking = await this.gameService.finalizeSession(tenantId, sessionId);
      this.server.to(tenantId).emit('session:finished', { sessionId, finalRanking });
    }
  }, seconds * 1000);

  this.questionTimers.set(sessionId, timer);
}
  // add to game.gateway.ts

  @SubscribeMessage('buzzer:answer')
async handleBuzzerAnswer(
  @MessageBody() payload: { tenantId: string; sessionId: string; playerId: string; questionId: string; optionId: string },
) {
  try {
    const result = await this.gameService.submitAnswer(
      payload.sessionId,
      payload.playerId,
      payload.questionId,
      payload.optionId,
    );

    if (result.isCorrect) {
      // This is the actual line the spec's acceptance criterion is about.
      this.dmxService.triggerFlash();
      this.audioService.playSoundEffect('correct');
    } else {
      this.audioService.playSoundEffect('buzzer');
    }

    const ranking = await this.gameService.getLiveRanking(payload.tenantId, payload.sessionId);
    this.server.to(payload.tenantId).emit('ranking:update', ranking);

    return result;
  } catch (err) {
    return { error: err.message };
  }
}
  
}
  
}