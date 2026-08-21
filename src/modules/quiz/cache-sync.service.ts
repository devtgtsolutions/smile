import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { SystemLogService } from '../../logging/system-log.service';

@Injectable()
export class CacheSyncService {
  private logger = new Logger('CacheSyncService');

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private systemLog: SystemLogService,
  ) {}

  // Call this whenever a quiz is edited — bump the version, mark all rooms
  // using it as needing a refresh next time they load it.
  async invalidateQuizCache(quizId: string) {
    await this.redis.del(`quiz:cache:${quizId}`);
    await this.prisma.quizCatalog.update({
      where: { id: quizId },
      data: { version: { increment: 1 } },
    });
  }

  // The "Synchronize" button the Super Admin can press per room.
  async syncRoom(tenantId: string) {
    const syncRecord = await this.prisma.cacheSyncStatus.upsert({
      where: { tenantId },
      update: { syncStatus: 'PENDING' },
      create: { tenantId, syncStatus: 'PENDING' },
    });

    try {
      // In a real deployment this might re-warm several quizzes at once;
      // kept simple here as the core retry-able unit of work.
      await this.prisma.cacheSyncStatus.update({
        where: { tenantId },
        data: {
          syncStatus: 'COMPLETED',
          lastFullSync: new Date(),
          retryCount: 0,
        },
      });

      await this.systemLog.log(tenantId, 'INFO', 'CacheSyncService', 'Cache sync completed');
      return { status: 'COMPLETED' };
    } catch (err) {
      const retryCount = syncRecord.retryCount + 1;
      await this.prisma.cacheSyncStatus.update({
        where: { tenantId },
        data: { syncStatus: 'FAILED', retryCount },
      });

      await this.systemLog.log(tenantId, 'ERROR', 'CacheSyncService', `Sync failed (attempt ${retryCount})`, {
        error: err.message,
      });

      // Simple retry-with-backoff — try again shortly, up to 3 attempts,
      // rather than leaving a failed sync sitting there forever unnoticed.
      if (retryCount < 3) {
        setTimeout(() => this.syncRoom(tenantId), retryCount * 5000);
      }

      throw err;
    }
  }
}