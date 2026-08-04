import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomService {
  constructor(private prisma: PrismaService) {}

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
}