import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { SessionOwnershipGuard } from 'src/common/guards/session-ownership.guard';

// @UseGuards(AuthGuard('jwt-access'))
@Controller('game')
export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly gameGateway: GameGateway,
  ) {}

  @Post('start')
  async start(
    @Body()
    dto: {
      tenantId: string;
      quizId: string;
      mode?: 'QUIZ' | 'BLIND_TEST';
    },
  ) {
    const { session } = await this.gameService.startSession(
      dto.tenantId,
      dto.quizId,
      dto.mode || 'QUIZ',
    );

    await this.gameGateway.startSession(dto.tenantId, session.id);

    return { sessionId: session.id };
  }

  @UseGuards(SessionOwnershipGuard)
  @Get('sessions/:sessionId')
  getSession(@Req() req: any, @Param('sessionId') sessionId: string) {

    return req.session;
  }
}