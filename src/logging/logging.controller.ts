import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(AuthGuard('jwt-access'))
@Controller('logs')
export class LoggingController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll(
    @Query('tenantId') tenantId?: string,
    @Query('level') level?: string,
    @Query('limit') limit = '50',
  ) {
    return this.prisma.systemLog.findMany({
      where: { tenantId, level: level as any },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });
  }
}