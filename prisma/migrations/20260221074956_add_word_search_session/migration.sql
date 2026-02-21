-- CreateTable
CREATE TABLE "WordSearchSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "difficulty" "GameDifficulty" NOT NULL,
    "gridSize" INTEGER NOT NULL,
    "gridData" TEXT NOT NULL,
    "placedWords" TEXT NOT NULL,
    "foundWords" TEXT NOT NULL DEFAULT '[]',
    "totalWords" INTEGER NOT NULL,
    "finished" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "savedAt" TIMESTAMP(3),

    CONSTRAINT "WordSearchSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WordSearchSession_userId_finished_idx" ON "WordSearchSession"("userId", "finished");

-- AddForeignKey
ALTER TABLE "WordSearchSession" ADD CONSTRAINT "WordSearchSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
