import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  Prisma,
  QuizDifficulty,
  QuizType,
} from "../../../generated/prisma/client";

import { PrismaService } from "../../prisma/prisma.service";

import {
  CreateQuizDto,
  CreateQuestionDto,
} from "./dto/create-quiz.dto";

@Injectable()
export class QuizService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // CREATE
  // ============================================================

  async create(
    dto: CreateQuizDto,
    userId: string,
  ) {
    return this.prisma.quizCatalog.create({
      data: {
        title: dto.title,

        categoryId: dto.categoryId,

        type: dto.type as QuizType,

        createdBy: userId,

        questions: {
          create: dto.questions.map(
            (
              question,
              index,
            ) => ({
              text: question.text,

              difficulty:
                question.difficulty as QuizDifficulty,

              timeLimit:
                question.timeLimit,

              points:
                question.points,

              mediaUrl:
                question.mediaUrl || null,

              shuffleOptions:
                question.shuffleOptions ??
                true,

              orderIndex: index,

              answerOptions: {
                create:
                  question.options.map(
                    (
                      option,
                      optionIndex,
                    ) => ({
                      text:
                        option.text,

                      isCorrect:
                        option.isCorrect,

                      orderIndex:
                        optionIndex,
                    }),
                  ),
              },
            }),
          ),
        },
      },

      include: {
        category: true,

        questions: {
          orderBy: {
            orderIndex: "asc",
          },

          include: {
            answerOptions: {
              orderBy: {
                orderIndex: "asc",
              },
            },
          },
        },
      },
    });
  }

  // ============================================================
  // FIND ALL
  // ============================================================

  async findAll(
    filters: {
      categoryId?: string;
      isActive?: boolean;
    },
  ) {
    const where: Prisma.QuizCatalogWhereInput = {};

    if (
      filters.categoryId
    ) {
      where.categoryId =
        filters.categoryId;
    }

    if (
      filters.isActive !== undefined
    ) {
      where.isActive =
        filters.isActive;
    }

    return this.prisma.quizCatalog.findMany({
      where,

      orderBy: {
        createdAt: "desc",
      },

      include: {
        category: true,

        questions: {
          orderBy: {
            orderIndex: "asc",
          },

          include: {
            answerOptions: {
              orderBy: {
                orderIndex: "asc",
              },
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
    const quiz =
      await this.prisma.quizCatalog.findUnique({
        where: {
          id,
        },

        include: {
          category: true,

          questions: {
            orderBy: {
              orderIndex: "asc",
            },

            include: {
              answerOptions: {
                orderBy: {
                  orderIndex: "asc",
                },
              },
            },
          },
        },
      });

    if (!quiz) {
      throw new NotFoundException(
        "Quiz not found",
      );
    }

    return quiz;
  }

  // ============================================================
  // UPDATE
  // ============================================================

  async update(
    id: string,
    dto: Partial<CreateQuizDto>,
  ) {
    const quiz =
      await this.prisma.quizCatalog.findUnique({
        where: {
          id,
        },
      });

    if (!quiz) {
      throw new NotFoundException(
        "Quiz not found",
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        // ------------------------------------------------------
        // Update quiz information
        // ------------------------------------------------------

        await tx.quizCatalog.update({
          where: {
            id,
          },

          data: {
            ...(dto.title !== undefined && {
              title: dto.title,
            }),

            ...(dto.categoryId !== undefined && {
              categoryId:
                dto.categoryId,
            }),

            ...(dto.type !== undefined && {
              type:
                dto.type as QuizType,
            }),
          },
        });

        // ------------------------------------------------------
        // Replace questions if provided
        // ------------------------------------------------------

        if (
          dto.questions !== undefined
        ) {
          await tx.question.deleteMany({
            where: {
              quizId: id,
            },
          });

          await tx.question.createMany({
            data: dto.questions.map(
              (
                question,
                index,
              ) => ({
                quizId: id,

                text: question.text,

                difficulty:
                  question.difficulty as QuizDifficulty,

                timeLimit:
                  question.timeLimit,

                points:
                  question.points,

                mediaUrl:
                  question.mediaUrl ||
                  null,

                shuffleOptions:
                  question.shuffleOptions ??
                  true,

                orderIndex: index,
              }),
            ),
          });

          // ----------------------------------------------------
          // Create answer options
          //
          // createMany above doesn't return IDs, therefore
          // reload the questions and create their options.
          // ----------------------------------------------------

          const questions =
            await tx.question.findMany({
              where: {
                quizId: id,
              },

              orderBy: {
                orderIndex: "asc",
              },
            });

          for (
            const question of questions
          ) {
            const sourceQuestion =
              dto.questions[
                question.orderIndex
              ];

            if (
              !sourceQuestion
            ) {
              continue;
            }

            if (
              sourceQuestion.options
                ?.length
            ) {
              await tx.answerOption.createMany({
                data:
                  sourceQuestion.options.map(
                    (
                      option,
                      optionIndex,
                    ) => ({
                      questionId:
                        question.id,

                      text:
                        option.text,

                      isCorrect:
                        option.isCorrect,

                      orderIndex:
                        optionIndex,
                    }),
                  ),
              });
            }
          }
        }

        // ------------------------------------------------------
        // Return complete quiz
        // ------------------------------------------------------

        return tx.quizCatalog.findUnique({
          where: {
            id,
          },

          include: {
            category: true,

            questions: {
              orderBy: {
                orderIndex: "asc",
              },

              include: {
                answerOptions: {
                  orderBy: {
                    orderIndex: "asc",
                  },
                },
              },
            },
          },
        });
      },
    );
  }

  // ============================================================
  // DELETE
  // ============================================================

  async remove(id: string) {
    const quiz =
      await this.prisma.quizCatalog.findUnique({
        where: {
          id,
        },
      });

    if (!quiz) {
      throw new NotFoundException(
        "Quiz not found",
      );
    }

    return this.prisma.quizCatalog.delete({
      where: {
        id,
      },
    });
  }
}