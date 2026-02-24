-- CreateTable
CREATE TABLE "PacmanSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PacmanSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryGame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "difficulty" "GameDifficulty" NOT NULL,
    "score" INTEGER NOT NULL,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "moves" INTEGER NOT NULL,
    "matched" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PacmanSession_token_key" ON "PacmanSession"("token");

-- CreateIndex
CREATE INDEX "PacmanSession_userId_used_idx" ON "PacmanSession"("userId", "used");

-- CreateIndex
CREATE INDEX "PacmanSession_expiresAt_idx" ON "PacmanSession"("expiresAt");

-- CreateIndex
CREATE INDEX "MemoryGame_userId_createdAt_idx" ON "MemoryGame"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "PacmanSession" ADD CONSTRAINT "PacmanSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryGame" ADD CONSTRAINT "MemoryGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
