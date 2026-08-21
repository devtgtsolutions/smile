import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as os from 'os';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

@Injectable()
export class SystemLogService {
  constructor(private prisma: PrismaService) {}

  async log(tenantId: string, level: LogLevel, source: string, message: string, metadata: Record<string, any> = {}) {
    // Never let a logging failure crash the actual request that triggered it —
    // logging is a side-effect, not something that should ever block gameplay.
    try {
      await this.prisma.systemLog.create({
        data: { tenantId, level, source, message, metadata },
      });
    } catch (err) {
      console.error('Failed to write system log (non-fatal):', err.message);
    }
  }

  // Snapshot of the mini-PC's own resource usage — cheap to compute, useful
  // for spotting a room's mini-PC quietly running out of headroom over time.
  getSystemMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return {
      cpuLoad1min: os.loadavg()[0],
      memoryUsedPercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
      uptimeSeconds: os.uptime(),
    };
  }

  async logWithMetrics(tenantId: string, level: LogLevel, source: string, message: string) {
    await this.log(tenantId, level, source, message, this.getSystemMetrics());
  }
}