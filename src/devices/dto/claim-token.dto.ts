import { IsString } from 'class-validator';

export class ClaimTokenDto {
  @IsString()
  token: string;

  @IsString()
  tabletId: string; 
}