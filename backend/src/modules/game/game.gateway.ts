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
import { SystemLogService } from 'src/logging/system-log.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('GameGateway');
  private questionTimers = new Map<string, NodeJS.Timeout>(); 

  constructor(
    private gameService: GameService,
    private dmxService: DmxService,
    private audioService: AudioService,
    private systemLog: SystemLogService, 

  ) { }


  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: { tenantId: string }) {
    client.join(payload.tenantId); 
    this.logger.log(`Client ${client.id} joined room ${payload.tenantId}`);
    client.emit('joinedRoom', { tenantId: payload.tenantId });
  }

  // async startSession(tenantId: string, sessionId: string) {
  //   const question = await this.gameService.startQuestion(sessionId);
  //   this.server.to(tenantId).emit('question:show', { sessionId, question });
  //   if (question.mediaUrl) this.audioService.play(question.mediaUrl);
  //   this.startQuestionTimer(tenantId, sessionId, question.timeLimit);

  //   await this.systemLog.log(tenantId, 'INFO', 'GameGateway', `Session ${sessionId} started`);
  // }
  // private startQuestionTimer(tenantId: string, sessionId: string, seconds: number) {
  //   const existing = this.questionTimers.get(sessionId);
  //   if (existing) clearTimeout(existing);

  //   const timer = setTimeout(async () => {
  //     this.server.to(tenantId).emit('question:timeUp', { sessionId });

  //     const ranking = await this.gameService.getLiveRanking(tenantId, sessionId);
  //     this.server.to(tenantId).emit('ranking:update', ranking);

  //     const hasMore = await this.gameService.hasMoreQuestions(sessionId);
  //     if (hasMore) {
  //       await this.gameService.advanceToNextQuestion(sessionId);
  //       const nextQuestion = await this.gameService.startQuestion(sessionId);
  //       this.server.to(tenantId).emit('question:show', { sessionId, question: nextQuestion });
  //       this.startQuestionTimer(tenantId, sessionId, nextQuestion.timeLimit);
  //     } else {
  //       const finalRanking = await this.gameService.finalizeSession(tenantId, sessionId);
  //       this.server.to(tenantId).emit('session:finished', { sessionId, finalRanking });
  //     }
  //   }, seconds * 1000);

  //   this.questionTimers.set(sessionId, timer);
  // }

  // @SubscribeMessage('buzzer:answer')
  // async handleBuzzerAnswer(
  //   @MessageBody() payload: { tenantId: string; sessionId: string; playerId: string; questionId: string; optionId: string },
  // ) {
  //   try {
  //     const result = await this.gameService.submitAnswer(
  //       payload.sessionId,
  //       payload.playerId,
  //       payload.questionId,
  //       payload.optionId,
  //     );

  //     if (result.isCorrect) {
  //       this.dmxService.triggerFlash();
  //       this.audioService.playSoundEffect('correct');
  //     } else {
  //       this.audioService.playSoundEffect('buzzer');
  //     }

  //     const ranking = await this.gameService.getLiveRanking(payload.tenantId, payload.sessionId);
  //     this.server.to(payload.tenantId).emit('ranking:update', ranking);

  //     return result;
  //   } catch (err) {
  //     return { error: err };
  //   }
  // }
  broadcastToRoom(tenantId: string, event: string, data: any) {
    this.server.to(tenantId).emit(event, data);
  }

  async startSession(tenantId: string, sessionId: string) {
  const question = await this.gameService.startQuestion(sessionId);
  this.server.to(tenantId).emit('question:show', { tenantId, sessionId, question }); // added tenantId
  if (question.mediaUrl) this.audioService.play(question.mediaUrl);
  this.startQuestionTimer(tenantId, sessionId, question.timeLimit);
}

private startQuestionTimer(tenantId: string, sessionId: string, seconds: number) {
  const existing = this.questionTimers.get(sessionId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(async () => {
    this.server.to(tenantId).emit('question:timeUp', { tenantId, sessionId }); // added tenantId

    const ranking = await this.gameService.getLiveRanking(tenantId, sessionId);
    this.server.to(tenantId).emit('ranking:update', { tenantId, sessionId, ranking }); // now an object, not a bare array

    const hasMore = await this.gameService.hasMoreQuestions(sessionId);
    if (hasMore) {
      await this.gameService.advanceToNextQuestion(sessionId);
      const nextQuestion = await this.gameService.startQuestion(sessionId);
      this.server.to(tenantId).emit('question:show', { tenantId, sessionId, question: nextQuestion });
      this.startQuestionTimer(tenantId, sessionId, nextQuestion.timeLimit);
    } else {
      const finalRanking = await this.gameService.finalizeSession(tenantId, sessionId);
      this.server.to(tenantId).emit('session:finished', { tenantId, sessionId, finalRanking }); // added tenantId
    }
  }, seconds * 1000);

  this.questionTimers.set(sessionId, timer);
}

@SubscribeMessage('buzzer:answer')
async handleBuzzerAnswer(
  @MessageBody() payload: { tenantId: string; sessionId: string; playerId: string; questionId: string; optionId: string },
) {
  try {
    const result = await this.gameService.submitAnswer(  
        payload.sessionId,
        payload.playerId,
        payload.questionId,
        payload.optionId
      );
    if (result.isCorrect) {
      this.dmxService.triggerFlash();
      this.audioService.playSoundEffect('correct');
    } else {
      this.audioService.playSoundEffect('buzzer');
    }
    const ranking = await this.gameService.getLiveRanking(payload.tenantId, payload.sessionId);
    this.server.to(payload.tenantId).emit('ranking:update', { tenantId: payload.tenantId, sessionId: payload.sessionId, ranking }); // updated shape
    return result;
  } catch (err) {
    return { error: err.message };
  }
}
}