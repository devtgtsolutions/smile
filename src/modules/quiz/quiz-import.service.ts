import { Injectable, BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { QuizService } from './quiz.service';

@Injectable()
export class QuizImportService {
  constructor(private quizService: QuizService) {}

  async importFromJson(fileBuffer: Buffer) {
    let data: any;
    try {
      data = JSON.parse(fileBuffer.toString('utf-8'));
    } catch {
      throw new BadRequestException('Invalid JSON file');
    }
    return this.quizService.create(data);
  }

  async importFromCsv(fileBuffer: Buffer) {
    let rows: any[];
    try {
      rows = parse(fileBuffer.toString('utf-8'), {
        columns: true,
        skip_empty_lines: true,
      });
    } catch {
      throw new BadRequestException('Invalid CSV file');
    }

    if (rows.length === 0) {
      throw new BadRequestException('CSV file has no rows');
    }

    const first = rows[0];
    const quizPayload = {
      title: first.Title,
      category: first.Category,
      type: 'QUIZ',
      difficulty: Number(first.Difficulty) || 1,
      questions: rows.map((row) => {
        const correctIndex = Number(row.Correct);
        const optionTexts = [row.Option1, row.Option2, row.Option3, row.Option4];
        return {
          text: row.Question,
          timeLimit: 30,
          points: 1,
          options: optionTexts.map((text, i) => ({
            text,
            isCorrect: i === correctIndex,
          })),
        };
      }),
    };

    return this.quizService.create(quizPayload as any);
  }
}