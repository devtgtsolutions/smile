import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MqttService } from '../../mqtt/mqtt.service';
import { SystemLogService } from '../../logging/system-log.service';

@Injectable()
export class MagichanismService {
  private logger = new Logger('MagichanismService');

  constructor(
    private prisma: PrismaService,
    private mqttService: MqttService,
    private systemLog: SystemLogService,
  ) {}

  async trigger(
    tenantId: string,
    actionKey: string,
    dynamicPayload: Record<string, any> = {},
  ): Promise<{ triggered: boolean; reason?: string; topic?: string }> {
    const config = await this.prisma.magichanismTrigger.findUnique({
      where: { tenantId_actionKey: { tenantId, actionKey } },
    });

    if (!config) {
      this.logger.warn(`No Magichanism trigger configured for "${actionKey}" in room ${tenantId} — skipping`);
      return { triggered: false, reason: 'not_configured' };
    }

    const payload = { ...(config.payload as object), ...dynamicPayload };

    this.mqttService.publish(config.topic, payload);

    await this.systemLog.log(
      tenantId,
      'INFO',
      'MagichanismService',
      `Published "${actionKey}" to ${config.topic}`,
      payload,
    );

    return { triggered: true, topic: config.topic };
  }
}