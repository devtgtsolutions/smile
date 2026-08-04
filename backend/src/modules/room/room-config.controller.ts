import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RoomConfigService } from './room-config.service';

@UseGuards(AuthGuard('jwt-access'))
@Controller('rooms/:tenantId/config')
export class RoomConfigController {
  constructor(private configService: RoomConfigService) {}

  @Get()
  get(@Param('tenantId') tenantId: string) {
    return this.configService.getConfig(tenantId);
  }

  @Patch('lighting')
  updateLighting(@Param('tenantId') tenantId: string, @Body() body: Record<string, any>) {
    return this.configService.updateLighting(tenantId, body);
  }

  @Patch('audio')
  updateAudio(@Param('tenantId') tenantId: string, @Body() body: Record<string, any>) {
    return this.configService.updateAudio(tenantId, body);
  }
}