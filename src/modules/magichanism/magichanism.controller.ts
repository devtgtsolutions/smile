import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../prisma/prisma.service';
import { MagichanismService } from './magichanism.service';

// @UseGuards(AuthGuard('jwt-access'))
@Controller('rooms/:tenantId/magichanism')
export class MagichanismController {
  constructor(
    private magichanismService: MagichanismService,
    private prisma: PrismaService,
  ) {}

  @Get()
  list(@Param('tenantId') tenantId: string) {
    return this.prisma.magichanismTrigger.findMany({ where: { tenantId } });
  }

  @Post()
  upsert(
    @Param('tenantId') tenantId: string,
    @Body() dto: { actionKey: string; topic: string; payload?: Record<string, any> },
  ) {
    return this.prisma.magichanismTrigger.upsert({
      where: { tenantId_actionKey: { tenantId, actionKey: dto.actionKey } },
      update: { topic: dto.topic, payload: dto.payload || {} },
      create: { tenantId, actionKey: dto.actionKey, topic: dto.topic, payload: dto.payload || {} },
    });
  }

  @Delete(':actionKey')
  remove(@Param('tenantId') tenantId: string, @Param('actionKey') actionKey: string) {
    return this.prisma.magichanismTrigger.delete({
      where: { tenantId_actionKey: { tenantId, actionKey } },
    });
  }

  @Post(':actionKey/test')
  test(@Param('tenantId') tenantId: string, @Param('actionKey') actionKey: string) {
    return this.magichanismService.trigger(tenantId, actionKey, { _test: true });
  }
}