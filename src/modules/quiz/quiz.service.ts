import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

import { Prisma } from "../../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

// Import enums and DTOs from the DTO file
import {
  CreateQuizDto,
  CreateQuestionDto,
  QuizDifficulty,
  QuizType,
} from "./dto/create-quiz.dto";

import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

type CsvRow = Record<string, any>;

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // CREATE
  // ============================================================

  async create(dto: CreateQuizDto) {
    return this.prisma.quizCatalog.create({
      data: {
        title: dto.title,
        categoryId: dto.categoryId,
        type: dto.type,
        // createdBy: userId, // uncomment if needed
        questions: {
          create: dto.questions.map((question, index) => ({
            text: question.text,
            difficulty: question.difficulty,
            timeLimit: question.timeLimit,
            points: question.points,
            mediaUrl: question.mediaUrl || null,
            shuffleOptions: question.shuffleOptions ?? true,
            orderIndex: index,
            answerOptions: {
              create: question.options.map((option, optionIndex) => ({
                text: option.text,
                isCorrect: option.isCorrect,
                orderIndex: optionIndex,
              })),
            },
          })),
        },
      },
      include: {
        category: true,
        questions: {
          orderBy: { orderIndex: "asc" },
          include: {
            answerOptions: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    });
  }

  // ============================================================
  // FIND ALL
  // ============================================================

  async findAll(filters: { categoryId?: string; isActive?: boolean }) {
    const where: Prisma.QuizCatalogWhereInput = {};

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.prisma.quizCatalog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        questions: {
          orderBy: { orderIndex: "asc" },
          include: {
            answerOptions: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    });
  }

  // ============================================================
  // FIND ONE
  // ============================================================

  async findOne(id: string) {
    const quiz = await this.prisma.quizCatalog.findUnique({
      where: { id },
      include: {
        category: true,
        questions: {
          orderBy: { orderIndex: "asc" },
          include: {
            answerOptions: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException("Quiz not found");
    }

    return quiz;
  }

  // ============================================================
  // UPDATE
  // ============================================================

 async update(id: string, dto: Partial<CreateQuizDto>) {
  const quiz = await this.prisma.quizCatalog.findUnique({
    where: { id },
  });

  if (!quiz) {
    throw new NotFoundException("Quiz not found");
  }

  // Validate categoryId if provided
  let categoryId: string | null | undefined = dto.categoryId;
  if (categoryId !== undefined) {
    // If it's an empty string, treat as null
    if (categoryId === '') {
      categoryId = null;
    } else {
      // Check if the category exists
      const category = await this.prisma.quizCategory.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        throw new BadRequestException(`Category with ID "${categoryId}" does not exist`);
      }
    }
  }

  return this.prisma.$transaction(async (tx) => {
    // Update quiz metadata
    await tx.quizCatalog.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        // Only set categoryId if it's defined (could be null or a valid ID)
        ...(categoryId !== undefined && { categoryId }),
        ...(dto.type !== undefined && { type: dto.type }),
      },
    });

    // Replace questions if provided (unchanged)
    if (dto.questions !== undefined) {
      await tx.question.deleteMany({ where: { quizId: id } });

      await tx.question.createMany({
        data: dto.questions.map((question, index) => ({
          quizId: id,
          text: question.text,
          difficulty: question.difficulty,
          timeLimit: question.timeLimit,
          points: question.points,
          mediaUrl: question.mediaUrl || null,
          shuffleOptions: question.shuffleOptions ?? true,
          orderIndex: index,
        })),
      });

      const questions = await tx.question.findMany({
        where: { quizId: id },
        orderBy: { orderIndex: "asc" },
      });

      for (const question of questions) {
        const sourceQuestion = dto.questions[question.orderIndex];
        if (!sourceQuestion) continue;

        if (sourceQuestion.options?.length) {
          await tx.answerOption.createMany({
            data: sourceQuestion.options.map((option, optionIndex) => ({
              questionId: question.id,
              text: option.text,
              isCorrect: option.isCorrect,
              orderIndex: optionIndex,
            })),
          });
        }
      }
    }

    return tx.quizCatalog.findUnique({
      where: { id },
      include: {
        category: true,
        questions: {
          orderBy: { orderIndex: "asc" },
          include: {
            answerOptions: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    });
  });
}

  // ============================================================
  // DELETE
  // ============================================================

  async remove(id: string) {
    const quiz = await this.prisma.quizCatalog.findUnique({
      where: { id },
    });

    if (!quiz) {
      throw new NotFoundException("Quiz not found");
    }

    return this.prisma.quizCatalog.delete({ where: { id } });
  }

  // ============================================================
  // EXPORT TO CSV
  // ============================================================

  async exportToCsv(quizId: string): Promise<string> {
    const quiz = await this.findOne(quizId);

    // Determine max answer options
    let maxOptions = 0;
    for (const q of quiz.questions) {
      if (q.answerOptions.length > maxOptions) {
        maxOptions = q.answerOptions.length;
      }
    }

    // Build header
    const baseColumns = [
      'quiz_title',
      'quiz_category',
      'quiz_type',
      'question_text',
      'question_difficulty',
      'question_timeLimit',
      'question_points',
      'question_mediaUrl',
      'question_shuffleOptions',
    ];
    const optionColumns: string[] = [];
    for (let i = 1; i <= maxOptions; i++) {
      optionColumns.push(`option_${i}_text`, `option_${i}_correct`);
    }
    const header = [...baseColumns, ...optionColumns];

    // Build rows
    const rows = quiz.questions.map((q) => {
      const row: Record<string, any> = {
        quiz_title: quiz.title,
        quiz_category: quiz.category?.name ?? '',
        quiz_type: quiz.type,
        question_text: q.text,
        question_difficulty: q.difficulty,
        question_timeLimit: q.timeLimit,
        question_points: q.points,
        question_mediaUrl: q.mediaUrl ?? '',
        question_shuffleOptions: q.shuffleOptions ? 'true' : 'false',
      };

      for (let i = 0; i < maxOptions; i++) {
        const opt = q.answerOptions[i];
        row[`option_${i+1}_text`] = opt?.text ?? '';
        row[`option_${i+1}_correct`] = opt?.isCorrect ? 'true' : 'false';
      }
      return row;
    });

    return stringify(rows, {
      header: true,
      columns: header,
      cast: { boolean: (value) => (value ? 'true' : 'false') },
    });
  }

  // ============================================================
  // IMPORT FROM CSV
  // ============================================================

  async importFromCsv(csvData: string): Promise<any> {
    // Parse CSV; result is an array of objects with string keys
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: (value, context) => {
        const column = context.column;
        // Ensure column is treated as string if it's a column name
        if (typeof column === 'string') {
          if (column.endsWith('_correct')) {
            return value.toLowerCase() === 'true';
          }
          if (column === 'question_timeLimit' || column === 'question_points') {
            return parseInt(value, 10);
          }
        }
        return value;
      },
    }) as CsvRow[];

    if (!records || records.length === 0) {
      throw new BadRequestException('CSV is empty or invalid');
    }

    // Extract quiz-level fields from first row
    const first = records[0];
    const quizTitle = first.quiz_title as string;
    const quizCategoryName = first.quiz_category as string;
    const quizType = 'QUIZ' as string;

    if (!quizTitle || !quizType) {
      throw new BadRequestException('Missing required quiz-level fields: quiz_title, quiz_type');
    }

    if (!Object.values(QuizType).includes(quizType as QuizType)) {
      throw new BadRequestException(`Invalid quiz_type: ${quizType}`);
    }

    // Find category by name if provided
    let categoryId: string | undefined;
    if (quizCategoryName) {
      const category = await this.prisma.quizCategory.findUnique({
        where: { name: quizCategoryName },
      });
      if (!category) {
        throw new BadRequestException(`Category not found: ${quizCategoryName}`);
      }
      categoryId = category.id;
    }

    // Build questions array
    const questions: CreateQuestionDto[] = [];

    // Dynamically identify option columns
    const headerColumns = Object.keys(records[0]);
    const optionIndices = new Set<number>();
    for (const col of headerColumns) {
      const match = col.match(/^option_(\d+)_(text|correct)$/);
      if (match) {
        const idx = parseInt(match[1], 10);
        if (!isNaN(idx)) optionIndices.add(idx);
      }
    }
    const sortedIndices = Array.from(optionIndices).sort((a, b) => a - b);

    // Process each row
    for (const row of records) {
      const questionText = row.question_text as string;
      const difficulty = row.question_difficulty as string;
      if (!questionText || !difficulty) {
        throw new BadRequestException('Each question must have question_text and question_difficulty');
      }
      if (!Object.values(QuizDifficulty).includes(difficulty as QuizDifficulty)) {
        throw new BadRequestException(`Invalid question_difficulty: ${difficulty}`);
      }

      const options: { text: string; isCorrect: boolean }[] = [];
      for (const idx of sortedIndices) {
        const textKey = `option_${idx}_text`;
        const correctKey = `option_${idx}_correct`;
        const optText = row[textKey]?.trim();
        if (optText) {
          options.push({
            text: optText,
            isCorrect: row[correctKey] === true,
          });
        }
      }

      if (options.length === 0) {
        throw new BadRequestException(`Question "${questionText}" has no answer options`);
      }

      let shuffleOptions = true;
      if (row.question_shuffleOptions !== undefined) {
        shuffleOptions = row.question_shuffleOptions === 'true';
      }

      questions.push({
        text: questionText,
        difficulty: difficulty as QuizDifficulty,
        timeLimit: row.question_timeLimit ?? 30,
        points: row.question_points ?? 1,
        mediaUrl: row.question_mediaUrl || undefined,
        shuffleOptions,
        options,
      });
    }

    // Build DTO and create quiz
    const createDto: CreateQuizDto = {
      title: quizTitle,
      categoryId,
      type: quizType as QuizType,
      questions,
    };

    return this.create(createDto);
  }
}