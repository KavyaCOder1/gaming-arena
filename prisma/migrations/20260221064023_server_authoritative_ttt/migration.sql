-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('WORD_SEARCH', 'TIC_TAC_TOE', 'MEMORY', 'PACMAN');

-- CreateEnum
CREATE TYPE "GameDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "GameResult" AS ENUM ('WIN', 'LOSE', 'DRAW');

-- CreateEnum
CREATE TYPE "UserRank" AS ENUM ('ROOKIE', 'VETERAN', 'ELITE', 'LEGEND');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLevel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "rank" "UserRank" NOT NULL DEFAULT 'ROOKIE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicTacToeSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "difficulty" "GameDifficulty" NOT NULL,
    "board" TEXT NOT NULL,
    "aiLastCell" INTEGER,
    "result" "GameResult",
    "finished" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "savedAt" TIMESTAMP(3),

    CONSTRAINT "TicTacToeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicTacToeGame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "result" "GameResult" NOT NULL,
    "difficulty" "GameDifficulty" NOT NULL,
    "score" INTEGER NOT NULL,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicTacToeGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordSearchGame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "difficulty" "GameDifficulty" NOT NULL,
    "score" INTEGER NOT NULL,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "wordsFound" INTEGER NOT NULL,
    "totalWords" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordSearchGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leaderboard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameType" "GameType" NOT NULL,
    "difficulty" "GameDifficulty" NOT NULL,
    "highScore" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Leaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "UserLevel_userId_key" ON "UserLevel"("userId");

-- CreateIndex
CREATE INDEX "TicTacToeSession_userId_finished_idx" ON "TicTacToeSession"("userId", "finished");

-- CreateIndex
CREATE INDEX "TicTacToeGame_userId_createdAt_idx" ON "TicTacToeGame"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "WordSearchGame_userId_createdAt_idx" ON "WordSearchGame"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Leaderboard_gameType_difficulty_highScore_idx" ON "Leaderboard"("gameType", "difficulty", "highScore" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Leaderboard_userId_gameType_difficulty_key" ON "Leaderboard"("userId", "gameType", "difficulty");

-- AddForeignKey
ALTER TABLE "UserLevel" ADD CONSTRAINT "UserLevel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicTacToeSession" ADD CONSTRAINT "TicTacToeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicTacToeGame" ADD CONSTRAINT "TicTacToeGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordSearchGame" ADD CONSTRAINT "WordSearchGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leaderboard" ADD CONSTRAINT "Leaderboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
