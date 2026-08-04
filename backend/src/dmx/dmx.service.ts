import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as DMXLib from 'dmx';

@Injectable()
export class DmxService implements OnModuleInit {
  private dmx: any;
  private universeName = 'room-universe';
  private logger = new Logger('DmxService');

  // Predefined scenes from the spec — channel values are illustrative;
  // real values depend on your actual fixture's channel layout (its
  // manual will list which channel is R/G/B/W/dimmer).
  private scenes: Record<string, Record<number, number>> = {
    WARM:  { 1: 255, 2: 140, 3: 60,  4: 0 },   // warm amber-ish
    COLD:  { 1: 60,  2: 140, 3: 255, 4: 0 },   // cool blue-ish
    PARTY: { 1: 255, 2: 0,   3: 255, 4: 0 },   // magenta, meant to be paired with movement/strobe later
  };

  onModuleInit() {
    this.dmx = new DMXLib();

    const driverType = process.env.DMX_DRIVER || 'null'; // 'null' | 'artnet'
    if (driverType === 'artnet') {
      this.dmx.addUniverse(this.universeName, 'artnet', {
        host: process.env.DMX_ARTNET_HOST || '127.0.0.1',
      });
    } else {
      this.dmx.addUniverse(this.universeName, 'null');
      this.logger.warn('DMX running in NULL driver mode — no real fixtures will receive data');
    }
  }

  triggerScene(sceneName: keyof typeof this.scenes) {
    const values = this.scenes[sceneName];
    if (!values) {
      this.logger.error(`Unknown scene: ${sceneName}`);
      return;
    }
    this.dmx.update(this.universeName, values);
    this.logger.log(`Scene triggered: ${sceneName}`);
  }

  // One-off effect: flash to full white briefly, then return to whatever
  // scene was active. Simplest possible version for now.
  triggerFlash(durationMs = 300) {
    this.dmx.update(this.universeName, { 1: 255, 2: 255, 3: 255, 4: 255 });
    setTimeout(() => {
      this.dmx.update(this.universeName, this.scenes.WARM); // return to a default
    }, durationMs);
  }
}