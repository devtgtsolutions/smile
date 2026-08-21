import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AmbianceService } from './ambiance.service';
import { GameGateway } from '../game/game.gateway'; 
import { AmbianceScenario } from './ambiance.service';
import { TenantOwnershipGuard } from 'src/common/guards/tenant-ownership.guard';

// @UseGuards(AuthGuard('jwt-access'), TenantOwnershipGuard)
@Controller('ambiance')
export class AmbianceController {
  constructor(
    private ambianceService: AmbianceService,
    private gameGateway: GameGateway,
  ) {}

  @Get('scenarios')
  list() {
    return this.ambianceService.listScenarios();
  }

  @Post(':tenantId/start')

  async start(@Param('tenantId') tenantId: string, @Body() dto: { scenario: string }): Promise<AmbianceScenario> {
    const scenario = await this.ambianceService.start(tenantId, dto.scenario);
    this.gameGateway.broadcastToRoom(tenantId, 'room:statusChanged', { status: 'AMBIANCE' });
    return scenario;
  }

  @Post(':tenantId/stop')
  async stop(@Param('tenantId') tenantId: string) {
    await this.ambianceService.stop(tenantId);
    this.gameGateway.broadcastToRoom(tenantId, 'room:statusChanged', { status: 'NORMAL' });
    return { status: 'stopped' };
  }
}
