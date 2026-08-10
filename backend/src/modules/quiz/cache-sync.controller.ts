import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CacheSyncService } from './cache-sync.service';
import { PrismaService } from '../../prisma/prisma.service';

// @UseGuards(AuthGuard('jwt-access'))
@Controller('rooms/:tenantId/sync')
export class CacheSyncController {
  constructor(
    private cacheSyncService: CacheSyncService,
    private prisma: PrismaService,
  ) {}

  @Get('status')
  getStatus(@Param('tenantId') tenantId: string) {
    return this.prisma.cacheSyncStatus.findUnique({ where: { tenantId } });
  }

  @Post()
  triggerSync(@Param('tenantId') tenantId: string) {
    return this.cacheSyncService.syncRoom(tenantId);
  }
}