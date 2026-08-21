import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RoomConfigService {
  constructor(private prisma: PrismaService) {}

  async getConfig(tenantId: string) {
    const config = await this.prisma.roomConfiguration.findUnique({ where: { tenantId } });
    if (!config) throw new NotFoundException('Room configuration not found');
    return config;
  }

  async updateLighting(tenantId: string, lightingProfile: Record<string, any>) {
    return this.prisma.roomConfiguration.upsert({
      where: { tenantId },
      update: { lightingProfile },
      create: { tenantId, lightingProfile },
    });
  }

  async updateAudio(tenantId: string, audioProfile: Record<string, any>) {
    return this.prisma.roomConfiguration.upsert({
      where: { tenantId },
      update: { audioProfile },
      create: { tenantId, audioProfile },
    });
  }
  async updateBuzzerConfig(tenantId: string, buzzerConfig: Record<string, any>) {
  return this.prisma.roomConfiguration.upsert({
    where: { tenantId },
    update: { buzzerConfig },
    create: { tenantId, buzzerConfig },
  });
}
}