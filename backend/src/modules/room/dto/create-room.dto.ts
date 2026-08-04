import { IsString, IsOptional, IsIP } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsIP()
  ipAddress?: string;
}