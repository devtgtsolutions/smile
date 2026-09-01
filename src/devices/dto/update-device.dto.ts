import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Name must be at most 100 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Type must be at most 50 characters' })
  type?: string;
}