import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateLobbyDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  gameType: string;

  @IsInt()
  @Min(2)
  maxPlayers: number;
}

export class JoinLobbyDto {
  @IsString()
  @IsNotEmpty()
  playerName: string;

  @IsOptional()
  @IsString()
  buzzerTabletId?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class ConfigureQuizDto {
  @IsString()
  @IsNotEmpty()
  playerId: string;

  @IsInt()
  @Min(1)
  numQuestions: number;

  @IsString()
  @IsNotEmpty()
  difficulty: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsIn(['QUIZ', 'BLIND_TEST'])
  mode: 'QUIZ' | 'BLIND_TEST';
}

export class StartQuizDto {
  @IsString()
  @IsNotEmpty()
  playerId: string;
}

export class SubmitAnswerDto {
  @IsString()
  @IsNotEmpty()
  playerId: string;

  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsString()
  @IsNotEmpty()
  selectedOptionId: string;
}