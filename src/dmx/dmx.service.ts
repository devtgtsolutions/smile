import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as DMXLib from 'dmx';

@Injectable()
export class DmxService implements OnModuleInit {
  private dmx: any;
  private universeName = 'room-universe';
  private logger = new Logger('DmxService');

  private scenes: Record<string, Record<number, number>> = {
    WARM:  { 1: 255, 2: 140, 3: 60,  4: 0 },  
    COLD:  { 1: 60,  2: 140, 3: 255, 4: 0 },   
    PARTY: { 1: 255, 2: 0,   3: 255, 4: 0 },   
  };

  onModuleInit() {
    this.dmx = new DMXLib();

    const driverType = process.env.DMX_DRIVER || 'null'; 
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

  triggerFlash(durationMs = 300) {
    this.dmx.update(this.universeName, { 1: 255, 2: 255, 3: 255, 4: 255 });
    setTimeout(() => {
      this.dmx.update(this.universeName, this.scenes.WARM); 
    }, durationMs);
  }
}