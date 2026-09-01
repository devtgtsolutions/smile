import { Injectable, BadRequestException } from '@nestjs/common';
import { DmxService } from '../../dmx/dmx.service';
import { AudioService } from '../audio/audio.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface AmbianceScenario {
  name: string;
  dmxScene: 'WARM' | 'COLD' | 'PARTY';
  audioTrack: string;
}

@Injectable()
export class AmbianceService {
  // Minimum 3 pre-programmed scenarios, per the spec.
  // private scenarios: Record<string, AmbianceScenario> = {
  //   RELAX: { name: 'Relax', dmxScene: 'WARM', audioTrack: '/audio/ambient_lofi.mp3' },
  //   PARTY: { name: 'Party', dmxScene: 'PARTY', audioTrack: '/audio/ambient_upbeat.mp3' },
  //   FOCUS: { name: 'Focus (Cold)', dmxScene: 'COLD', audioTrack: '/audio/ambient_calm.mp3' },
  // };
  private scenarios: Record<string, AmbianceScenario> = {
  NEUTRAL: { name: 'Neutral', dmxScene: 'WARM', audioTrack: '/audio/neutral.mp3' },
  INDIVIDUAL_BUSINESS: { name: 'Individual / Business', dmxScene: 'WARM', audioTrack: '/audio/ambient_lofi.mp3' },
  BIRTHDAY: { name: 'Birthday', dmxScene: 'PARTY', audioTrack: '/audio/birthday_party.mp3' },
};

  constructor(
    private dmx: DmxService,
    private audio: AudioService,
    private prisma: PrismaService,
  ) {}

  private statusForScenario: Record<string, string> = {
  NEUTRAL: 'MAINTENANCE',
  INDIVIDUAL_BUSINESS: 'NORMAL',
  BIRTHDAY: 'AMBIANCE',
};

async start(tenantId: string, scenarioKey: string) {
  const scenario = this.scenarios[scenarioKey];
  if (!scenario) throw new BadRequestException(`Unknown scenario: ${scenarioKey}`);

  this.dmx.triggerScene(scenario.dmxScene);
  this.audio.play(scenario.audioTrack);

  await this.prisma.tenant.update({
    where: { id: tenantId },
    data: { status: this.statusForScenario[scenarioKey] as any },
  });

  return scenario;
}

  async stop(tenantId: string) {
    this.audio.pause();
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'NORMAL' },
    });
  }

  listScenarios() {
    return Object.entries(this.scenarios).map(([key, s]) => ({ key, ...s }));
  }
}