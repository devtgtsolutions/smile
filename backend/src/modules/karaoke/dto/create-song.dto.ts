import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateSongDto {
  @IsUUID()
  quizId: string; // karaoke_songs still hangs off a quiz_catalog row (type: KARAOKE), per the schema

  @IsString()
  title: string;

  @IsString()
  artist: string;

  @IsOptional()
  @IsString()
  externalApiId?: string;
}