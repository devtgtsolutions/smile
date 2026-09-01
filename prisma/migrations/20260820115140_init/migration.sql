/*
  Warnings:

  - You are about to drop the column `difficulty` on the `quiz_catalog` table. All the data in the column will be lost.
  - Added the required column `difficulty` to the `questions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuizDifficulty" AS ENUM ('FACILE', 'MOYEN', 'DIFFICILE');

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "difficulty" "QuizDifficulty" NOT NULL;

-- AlterTable
ALTER TABLE "quiz_catalog" DROP COLUMN "difficulty";

-- CreateTable
CREATE TABLE "quiz_modes" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_modes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quiz_modes_name_key" ON "quiz_modes"("name");
