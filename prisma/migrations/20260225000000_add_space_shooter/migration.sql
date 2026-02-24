-- AlterEnum
ALTER TYPE "GameType" ADD VALUE 'SPACE_SHOOTER';

-- CreateTable
CREATE TABLE "SpaceShooterSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceShooterSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceShooterGame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "wave" INTEGER NOT NULL,
    "kills" INTEGER NOT NULL,
    "survivalTime" INTEGER NOT NULL,
    "xpEarned" INTEGER NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceShooterGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpaceShooterSession_userId_idx" ON "SpaceShooterSession"("userId");

-- CreateIndex
CREATE INDEX "SpaceShooterGame_userId_idx" ON "SpaceShooterGame"("userId");

-- CreateIndex
CREATE INDEX "SpaceShooterGame_score_idx" ON "SpaceShooterGame"("score" DESC);

-- CreateIndex
CREATE INDEX "SpaceShooterGame_createdAt_idx" ON "SpaceShooterGame"("createdAt");

-- AddForeignKey
ALTER TABLE "SpaceShooterSession" ADD CONSTRAINT "SpaceShooterSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceShooterGame" ADD CONSTRAINT "SpaceShooterGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
