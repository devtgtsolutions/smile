import { IsIn } from 'class-validator';

export class UpdateHelpRequestDto {
  @IsIn(['IN_PROGRESS', 'RESOLVED'])
  status: 'IN_PROGRESS' | 'RESOLVED';
}