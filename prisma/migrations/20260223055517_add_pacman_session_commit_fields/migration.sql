/*
  Warnings:

  - A unique constraint covering the columns `[receipt]` on the table `PacmanSession` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PacmanSession" ADD COLUMN     "commitAt" TIMESTAMP(3),
ADD COLUMN     "committedScore" INTEGER,
ADD COLUMN     "committedStage" INTEGER,
ADD COLUMN     "receipt" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PacmanSession_receipt_key" ON "PacmanSession"("receipt");
