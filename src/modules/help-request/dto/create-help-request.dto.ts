import { IsString, MinLength } from 'class-validator';

export class CreateHelpRequestDto {
  @IsString()
  @MinLength(3)
  reason: string;
}