/*
  Warnings:

  - You are about to drop the column `finishedAt` on the `WordSearchSession` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WordSearchSession" DROP COLUMN "finishedAt",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "xpEarned" INTEGER;
