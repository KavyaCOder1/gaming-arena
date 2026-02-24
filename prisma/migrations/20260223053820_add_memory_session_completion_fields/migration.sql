-- AlterTable
ALTER TABLE "MemorySession" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "score" INTEGER,
ADD COLUMN     "xpEarned" INTEGER;
