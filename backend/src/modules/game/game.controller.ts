import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';

@UseGuards(AuthGuard('jwt-access'))
@Controller('game')
export class GameController {
  constructor(
    private gameService: GameService,
    private gameGateway: GameGateway,
  ) {}

  @Post('start')
  async start(@Body() dto: { tenantId: string; quizId: string }) {
    const { session } = await this.gameService.startSession(dto.tenantId, dto.quizId);
    await this.gameGateway.startSession(dto.tenantId, session.id);
    return { sessionId: session.id };
  }
}