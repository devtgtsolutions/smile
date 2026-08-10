import { Injectable } from '@nestjs/common';
import { MqttService } from '../../mqtt/mqtt.service';

@Injectable()
export class AudioService {
  constructor(private mqtt: MqttService) {}

  play(track?: string) {
    this.mqtt.publish('audio/play', { track });
  }

  pause() {
    this.mqtt.publish('audio/pause', {});
  }

  setVolume(level: number) {
    // Clamp so a bad request can never blast a bar's speakers to 999.
    const clamped = Math.max(0, Math.min(100, level));
    this.mqtt.publish('audio/volume', { level: clamped });
  }

  next() {
    this.mqtt.publish('audio/next', {});
  }

  playSoundEffect(effect: 'buzzer' | 'correct' | 'gameOver') {
    this.mqtt.publish('audio/play', { track: `sfx_${effect}.mp3`, isEffect: true });
  }
}