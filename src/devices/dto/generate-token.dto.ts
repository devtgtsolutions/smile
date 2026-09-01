import { IsString, IsEnum, IsInt, Min, Max, IsOptional } from 'class-validator';

export enum DeviceRole {
  MAIN = 'MAIN',
  BUZZER = 'BUZZER',
}

export class GenerateTokenDto {
  @IsString()
  room: string;

  @IsEnum(DeviceRole)
  role: DeviceRole;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  playerNumber?: number; // required if role === BUZZER

  @IsOptional()
  @IsString()
  color?: string; // required if role === BUZZER
}
