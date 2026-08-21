import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { SystemLogService } from 'src/logging/system-log.service';

@Injectable()
export class RoomService {
  constructor(
    private prisma: PrismaService,
    private systemLog: SystemLogService,
  ) {}

  create(dto: CreateRoomDto) {
    return this.prisma.tenant.create({ data: dto });
  }

  findAll() {
    return this.prisma.tenant.findMany({ include: { roomConfig: true } });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Room not found');
    return tenant;
  }

  update(id: string, dto: Partial<CreateRoomDto>) {
    return this.prisma.tenant.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.tenant.delete({ where: { id } });
  }

  updateStatus(id: string, status: string) {
    return this.prisma.tenant.update({ where: { id }, data: { status: status as any } });
  }
//   async restartRoom(tenantId: string) {
//   // End any in-flight session for this room — a "restart" should mean the
//   // room comes back to a clean, idle state, not keep a stale session running.
//   await this.prisma.gameSession.updateMany({
//     where: { tenantId, status: { in: ['ACTIVE', 'PAUSED', 'WAITING'] } },
//     data: { status: 'FINISHED', endedAt: new Date() },
//   });

//   const tenant = await this.prisma.tenant.update({
//     where: { id: tenantId },
//     data: { status: 'NORMAL' },
//   });
  

//   await this.systemLog.log(tenantId, 'INFO', 'RoomService', 'Room restarted by staff');
//   return tenant;
// }

async findOneDetailed(id: string) {
  const tenant = await this.prisma.tenant.findUnique({ where: { id } });
  if (!tenant) throw new NotFoundException('Room not found');

  const activeSession = await this.prisma.gameSession.findFirst({
    where: { tenantId: id, status: { in: ['ACTIVE', 'WAITING', 'PAUSED'] } },
    include: { quiz: true, players: true },
    orderBy: { startedAt: 'desc' },
  });

  const config = await this.prisma.roomConfiguration.findUnique({ where: { tenantId: id } });

  return {
    ...tenant,
    activity: activeSession?.mode || null,
    activeSessionId: activeSession?.id || null,
    activeQuizTitle: activeSession?.quiz?.title || null,
    consolesActive: activeSession?.players.length || 0,
    consolesTotal: 4,
    equipment: config ? this.deriveEquipmentList() : [],
    musicMood: config?.audioProfile ? 'ACTIVE' : undefined,
    lightingMood: (config?.lightingProfile as any)?.default_ambiance,
  };
}

private deriveEquipmentList(): string[] {
  // Static for now, matching the FSD's example room — worth wiring to real
  // per-room hardware records if that level of detail becomes necessary later.
  return ['70 inch screen', 'Active desks (4x)', 'Microphone server', 'Room lighting'];
}
async startRoomSession(tenantId: string, durationMinutes: number) {
  const bookingEndsAt = new Date(Date.now() + durationMinutes * 60000);
  return this.prisma.tenant.update({
    where: { id: tenantId },
    data: { bookingEndsAt, status: 'NORMAL' },
  });
}
async restartRoom(tenantId: string) {
  await this.prisma.gameSession.updateMany({
    where: { tenantId, status: { in: ['ACTIVE', 'PAUSED', 'WAITING'] } },
    data: { status: 'FINISHED', endedAt: new Date() },
  });

  const tenant = await this.prisma.tenant.update({
    where: { id: tenantId },
    data: { status: 'NORMAL', bookingEndsAt: null }, // clear the booking too — a restart means genuinely fresh
  });

  await this.systemLog.log(tenantId, 'INFO', 'RoomService', 'Room restarted by staff');
  return tenant;
}
}