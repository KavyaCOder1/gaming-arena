-- DropIndex
DROP INDEX "Leaderboard_gameType_difficulty_highScore_idx";

-- AlterTable
ALTER TABLE "Leaderboard" ALTER COLUMN "difficulty" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PacmanGame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 1,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PacmanGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PacmanGame_userId_createdAt_idx" ON "PacmanGame"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PacmanGame_score_idx" ON "PacmanGame"("score" DESC);

-- CreateIndex
CREATE INDEX "Leaderboard_gameType_highScore_idx" ON "Leaderboard"("gameType", "highScore" DESC);

-- AddForeignKey
ALTER TABLE "PacmanGame" ADD CONSTRAINT "PacmanGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
