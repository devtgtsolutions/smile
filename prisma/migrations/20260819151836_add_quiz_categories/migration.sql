/*
  Warnings:

  - You are about to drop the column `category` on the `quiz_catalog` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "quiz_catalog_category_idx";

-- AlterTable
ALTER TABLE "quiz_catalog" DROP COLUMN "category",
ADD COLUMN     "category_id" TEXT;

-- CreateTable
CREATE TABLE "quiz_categories" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quiz_categories_name_key" ON "quiz_categories"("name");

-- AddForeignKey
ALTER TABLE "quiz_catalog" ADD CONSTRAINT "quiz_catalog_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "quiz_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
