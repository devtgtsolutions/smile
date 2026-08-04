import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';

@Injectable()
export class QuizService {
  constructor(private prisma: PrismaService) { }

  create(dto: CreateQuizDto, userId: string) {
    return this.prisma.quizCatalog.create({
      data: {
        title: dto.title,
        category: dto.category,
        type: dto.type as any,
        difficulty: dto.difficulty,
        createdBy: userId,
        questions: {
          create: dto.questions.map((q, index) => ({
            text: q.text,
            timeLimit: q.timeLimit,
            points: q.points,
            orderIndex: index,
            answerOptions: {
              create: q.options.map((opt, i) => ({
                text: opt.text,
                isCorrect: opt.isCorrect,
                orderIndex: i,
              })),
            },
          })),
        },
      },
      include: { questions: { include: { answerOptions: true } } },
    });
  }

  findAll(filters: { category?: string; isActive?: boolean }) {
    return this.prisma.quizCatalog.findMany({
      where: {
        category: filters.category,
        isActive: filters.isActive,
      },
    });
  }

  async findOne(id: string) {
    const quiz = await this.prisma.quizCatalog.findUnique({
      where: { id },
      include: { questions: { include: { answerOptions: true }, orderBy: { orderIndex: 'asc' } } },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  remove(id: string) {
    return this.prisma.quizCatalog.delete({ where: { id } });
  }
  
  async update(id: string, dto: Partial<CreateQuizDto>) {
    const quiz = await this.prisma.quizCatalog.findUnique({
      where: { id },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return this.prisma.quizCatalog.update({
      where: { id },
      data: {
        title: dto.title,
        category: dto.category,
        type: dto.type as any,
        difficulty: dto.difficulty,
      },
      include: {
        questions: {
          include: {
            answerOptions: true,
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
      },
    });
  }
}