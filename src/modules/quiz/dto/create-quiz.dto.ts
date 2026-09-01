import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

import { Type } from "class-transformer";

export enum QuizDifficulty {
  FACILE = "FACILE",
  MOYEN = "MOYEN",
  DIFFICILE = "DIFFICILE",
}

export enum QuizType {
  QUIZ = "QUIZ",
  BLIND_TEST = "BLIND_TEST",
  KARAOKE = "KARAOKE",
}

export class CreateOptionDto {
  @IsString()
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class CreateQuestionDto {
  @IsString()
  text: string;

  @IsEnum(QuizDifficulty)
  difficulty: QuizDifficulty;

  @IsInt()
  @Min(1)
  timeLimit: number;

  @IsInt()
  @Min(1)
  points: number;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options: CreateOptionDto[];
}

export class CreateQuizDto {
  @IsString()
  title: string;

  @IsString()
  categoryId: string;

  @IsEnum(QuizType)
  type: QuizType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}