-- AlterEnum
ALTER TYPE "GameType" ADD VALUE 'CONNECT_DOTS';

-- CreateTable
CREATE TABLE "ConnectDotsSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "difficulty" "GameDifficulty" NOT NULL,
    "dotsCount" INTEGER NOT NULL,
    "timeLimitSeconds" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectDotsSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectDotsGame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "difficulty" "GameDifficulty" NOT NULL,
    "dotsCount" INTEGER NOT NULL,
    "timeLimitSeconds" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL,
    "moves" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "xpEarned" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectDotsGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConnectDotsSession_userId_idx" ON "ConnectDotsSession"("userId");

-- CreateIndex
CREATE INDEX "ConnectDotsSession_createdAt_idx" ON "ConnectDotsSession"("createdAt");

-- CreateIndex
CREATE INDEX "ConnectDotsGame_userId_idx" ON "ConnectDotsGame"("userId");

-- CreateIndex
CREATE INDEX "ConnectDotsGame_xpEarned_idx" ON "ConnectDotsGame"("xpEarned");

-- CreateIndex
CREATE INDEX "ConnectDotsGame_createdAt_idx" ON "ConnectDotsGame"("createdAt");

-- AddForeignKey
ALTER TABLE "ConnectDotsSession" ADD CONSTRAINT "ConnectDotsSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectDotsGame" ADD CONSTRAINT "ConnectDotsGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
