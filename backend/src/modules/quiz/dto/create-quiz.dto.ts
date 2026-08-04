import { IsString, IsIn, IsInt, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CreateOptionDto {
  @IsString() text: string;
  isCorrect: boolean;
}

class CreateQuestionDto {
  @IsString() text: string;
  @IsInt() timeLimit: number;
  @IsInt() points: number;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options: CreateOptionDto[];
}

export class CreateQuizDto {
  @IsString() title: string;
  @IsString() category: string;
  @IsIn(['QUIZ', 'BLIND_TEST', 'KARAOKE']) type: string;
  @IsInt() @Min(1) @Max(5) difficulty: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}