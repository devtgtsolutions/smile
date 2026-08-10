import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AudioService } from './audio.service';

// @UseGuards(AuthGuard('jwt-access'))
@Controller('audio')
export class AudioController {
  constructor(private audioService: AudioService) {}

  @Post('play')
  play(@Body() dto: { track?: string }) {
    this.audioService.play(dto.track);
    return { status: 'sent' };
  }

  @Post('pause')
  pause() {
    this.audioService.pause();
    return { status: 'sent' };
  }

  @Post('volume')
  volume(@Body() dto: { level: number }) {
    this.audioService.setVolume(dto.level);
    return { status: 'sent' };
  }

  @Post('next')
  next() {
    this.audioService.next();
    return { status: 'sent' };
  }
  @Post('test')
test() {
  this.audioService.playSoundEffect('buzzer'); 
  return { status: 'sent' };
}
}