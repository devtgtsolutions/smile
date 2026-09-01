import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';

import { AmbianceService } from './ambiance.service';
import { AmbianceScenario } from './ambiance.service';
import { GameGateway } from '../game/game.gateway';

@Controller('ambiance')
export class AmbianceController {
  constructor(
    private readonly ambianceService: AmbianceService,
    private readonly gameGateway: GameGateway,
  ) {}

  // ============================================================
  // LIST SCENARIOS
  // ============================================================

  @Get('scenarios')
  async list(): Promise<AmbianceScenario[]> {
    return this.ambianceService.listScenarios();
  }

  // ============================================================
  // START AMBIANCE
  // ============================================================

  @Post(':tenantId/start')
  async start(
    @Param('tenantId') tenantId: string,
    @Body() dto: { scenario: string },
  ): Promise<AmbianceScenario> {
    if (!tenantId) {
      throw new Error('tenantId is required');
    }

    if (!dto?.scenario) {
      throw new Error('scenario is required');
    }

    // Start ambiance in service
    const scenario =
      await this.ambianceService.start(
        tenantId,
        dto.scenario,
      );

    // Notify all connected devices belonging
    // to this tenant.
    this.gameGateway.broadcastToTenant(
      tenantId,
      'room:statusChanged',
      {
        status: 'AMBIANCE',
        tenantId,
        scenario,
      },
    );

    return scenario;
  }

  // ============================================================
  // STOP AMBIANCE
  // ============================================================

  @Post(':tenantId/stop')
  async stop(
    @Param('tenantId') tenantId: string,
  ) {
    if (!tenantId) {
      throw new Error('tenantId is required');
    }

    await this.ambianceService.stop(
      tenantId,
    );

    // Notify all connected devices belonging
    // to this tenant.
    this.gameGateway.broadcastToTenant(
      tenantId,
      'room:statusChanged',
      {
        status: 'NORMAL',
        tenantId,
      },
    );

    return {
      status: 'stopped',
    };
  }
}