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
  async restartRoom(tenantId: string) {
  // End any in-flight session for this room — a "restart" should mean the
  // room comes back to a clean, idle state, not keep a stale session running.
  await this.prisma.gameSession.updateMany({
    where: { tenantId, status: { in: ['ACTIVE', 'PAUSED', 'WAITING'] } },
    data: { status: 'FINISHED', endedAt: new Date() },
  });

  const tenant = await this.prisma.tenant.update({
    where: { id: tenantId },
    data: { status: 'NORMAL' },
  });

  await this.systemLog.log(tenantId, 'INFO', 'RoomService', 'Room restarted by staff');
  return tenant;
}
}