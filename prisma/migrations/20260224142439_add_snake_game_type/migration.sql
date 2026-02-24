-- AlterEnum
ALTER TYPE "GameType" ADD VALUE 'SNAKE';

-- CreateTable
CREATE TABLE "SnakeSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "coresCollected" INTEGER NOT NULL DEFAULT 0,
    "survivalTime" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "snakeLength" INTEGER NOT NULL DEFAULT 3,
    "gameStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SnakeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnakeGame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "coresCollected" INTEGER NOT NULL,
    "survivalTime" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "snakeLength" INTEGER NOT NULL,
    "xpEarned" INTEGER NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SnakeGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SnakeSession_userId_idx" ON "SnakeSession"("userId");

-- CreateIndex
CREATE INDEX "SnakeSession_createdAt_idx" ON "SnakeSession"("createdAt");

-- CreateIndex
CREATE INDEX "SnakeGame_userId_idx" ON "SnakeGame"("userId");

-- CreateIndex
CREATE INDEX "SnakeGame_xpEarned_idx" ON "SnakeGame"("xpEarned");

-- CreateIndex
CREATE INDEX "SnakeGame_createdAt_idx" ON "SnakeGame"("createdAt");

-- AddForeignKey
ALTER TABLE "SnakeSession" ADD CONSTRAINT "SnakeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnakeGame" ADD CONSTRAINT "SnakeGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
