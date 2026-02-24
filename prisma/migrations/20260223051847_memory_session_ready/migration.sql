-- CreateTable
CREATE TABLE "MemorySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "difficulty" "GameDifficulty" NOT NULL,
    "deckData" TEXT NOT NULL,
    "matchedPairs" TEXT NOT NULL DEFAULT '[]',
    "totalPairs" INTEGER NOT NULL,
    "moves" INTEGER NOT NULL DEFAULT 0,
    "finished" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "savedAt" TIMESTAMP(3),

    CONSTRAINT "MemorySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemorySession_userId_finished_idx" ON "MemorySession"("userId", "finished");

-- AddForeignKey
ALTER TABLE "MemorySession" ADD CONSTRAINT "MemorySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
