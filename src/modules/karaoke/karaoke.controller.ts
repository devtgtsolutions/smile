import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { KaraokeService } from './karaoke.service';
import { CreateSongDto } from './dto/create-song.dto';
import { GameGateway } from '../game/game.gateway';
import { AudioService } from '../audio/audio.service';

// @UseGuards(AuthGuard('jwt-access'))
@Controller('karaoke/songs')
export class KaraokeController {
  constructor(private karaokeService: KaraokeService, private gameGateway: GameGateway, private audioService: AudioService) {}

  @Post()
  create(@Body() dto: CreateSongDto) {
    return this.karaokeService.create(dto);
  }

  @Get()
  findAll() {
    return this.karaokeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.karaokeService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.karaokeService.remove(id);
  }

  // src/modules/karaoke/karaoke.controller.ts — add this

@Post(':tenantId/start/:songId')
async startSession(
  @Param('tenantId') tenantId: string,
  @Param('songId') songId: string,
) {
  const { lyrics, source } = await this.karaokeService.getLyricsForSong(songId);
  const song = await this.karaokeService.findOne(songId);

  const startTimestamp = Date.now();

  this.gameGateway.broadcastToTenant(tenantId, 'karaoke:start', {
    songId,
    title: song.title,
    artist: song.artist,
    lyrics,
    startTimestamp, // the tablet computes "current line" from this, not from the server ticking
    source, // useful for debugging/logging which path was used, not shown to players
  });

  this.audioService.play(`karaoke_${songId}.mp3`); // same MQTT audio trigger pattern as always

  return { started: true, source };
}
@Post(':tenantId/stop')
stop(@Param('tenantId') tenantId: string) {
  this.audioService.pause();
  this.gameGateway.broadcastToTenant(tenantId, 'karaoke:stop', {});
  return { stopped: true };
}
}