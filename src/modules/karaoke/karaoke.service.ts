import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSongDto } from './dto/create-song.dto';

@Injectable()
export class KaraokeService {
  private logger = new Logger('KaraokeService');

  constructor(private prisma: PrismaService) {}

  create(dto: CreateSongDto) {
    return this.prisma.karaokeSong.create({
      data: {
        quizId: dto.quizId,
        title: dto.title,
        artist: dto.artist,
        externalApiId: dto.externalApiId,
        lyricsJson: [], // filled in later, either from the external API or manually
      },
    });
  }

  findAll() {
    return this.prisma.karaokeSong.findMany();
  }

  async findOne(id: string) {
    const song = await this.prisma.karaokeSong.findUnique({ where: { id } });
    if (!song) throw new NotFoundException('Song not found');
    return song;
  }

  remove(id: string) {
    return this.prisma.karaokeSong.delete({ where: { id } });
  }

  // karaoke.service.ts — add this method

async fetchExternalLyrics(externalApiId: string): Promise<{ timeMs: number; line: string }[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000); // hard 3-second budget

  try {
    const response = await fetch(
      `${process.env.LYRICS_API_BASE_URL}/lyrics/${externalApiId}`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!response.ok) {
      this.logger.warn(`External lyrics API returned ${response.status} for ${externalApiId}`);
      return null;
    }

    const data = await response.json();
    // Adapt this mapping to whatever shape the real chosen API actually returns.
    return data.lines.map((l: any) => ({ timeMs: l.time_ms, line: l.text }));
  } catch (err) {
    clearTimeout(timeout);
    this.logger.warn(`External lyrics API unreachable or timed out: ${err}`);
    return null; // signal "unavailable" — caller decides what to do next
  }
}

// karaoke.service.ts — add this method

async getLyricsForSong(songId: string) {
  const song = await this.findOne(songId);

  // If we already have local lyrics saved (the offline cache), and no
  // external ID to try, just use what we have — no network call needed at all.
  if (!song.externalApiId) {
    return { lyrics: song.lyricsJson, source: 'local' };
  }

  const externalLyrics = await this.fetchExternalLyrics(song.externalApiId);
  if (externalLyrics) {
    // Optional: refresh the local cache with what we just fetched, so next
    // time even fewer external calls are needed and the "offline copy" stays fresh.
    await this.prisma.karaokeSong.update({
      where: { id: songId },
      data: { lyricsJson: externalLyrics },
    });
    return { lyrics: externalLyrics, source: 'external' };
  }

  // External failed or timed out — fall back to whatever's already saved locally.
  this.logger.warn(`Falling back to local cached lyrics for song ${songId} (degraded mode)`);
  return { lyrics: song.lyricsJson, source: 'local-fallback' };
}

}