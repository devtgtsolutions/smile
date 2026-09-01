import { Controller, Post, UseGuards, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DmxService } from './dmx.service';

@UseGuards(AuthGuard('jwt-access'))
@Controller('rooms/:tenantId/config/lighting')
export class DmxTestController {
  constructor(private dmxService: DmxService) {}

  @Post('test')
  test() {
    this.dmxService.triggerFlash();
    return { status: 'sent' };
  }
}