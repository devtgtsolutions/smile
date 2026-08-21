import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GameGateway } from '../game/game.gateway';

@Injectable()
export class HelpRequestService {
  constructor(
    private prisma: PrismaService,
    private gameGateway: GameGateway,
  ) {}

  async create(tenantId: string, reason: string) {
    const request = await this.prisma.helpRequest.create({
      data: { tenantId, reason },
    });

    this.gameGateway.broadcastToRoom(tenantId, 'helpRequest:updated', {
      tenantId,
      request,
    });

    return request;
  }

  async findActiveForTenant(tenantId: string) {
    return this.prisma.helpRequest.findFirst({
      where: { tenantId, status: { not: 'RESOLVED' } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: 'IN_PROGRESS' | 'RESOLVED') {
    const request = await this.prisma.helpRequest.update({
      where: { id },
      data: { status },
    });

    this.gameGateway.broadcastToRoom(request.tenantId, 'helpRequest:updated', {
      tenantId: request.tenantId,
      request: status === 'RESOLVED' ? null : request,
    });

    return request;
  }

  async findOne(id: string) {
    const request = await this.prisma.helpRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Help request not found');
    return request;
  }
}