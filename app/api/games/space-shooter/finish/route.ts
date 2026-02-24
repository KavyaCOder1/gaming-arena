/**
 * POST /api/games/space-shooter/finish
 * Finalises a space shooter game. Server-side XP calculation.
 * Anti-cheat: validate session ownership, cap score/kills/time.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { calcRank } from "@/lib/game-utils";
import { z } from "zod";

// ── Anti-cheat hard limits ────────────────────────────────────────────────────
const MAX_SCORE   = 9_999_999;
const MAX_WAVE    = 500;
const MAX_KILLS   = 50_000;
const MAX_TIME    = 7200; // 2 hours
const MAX_XP      = 2000; // per match cap

const schema = z.object({
  sessionId:    z.string().min(1),
  score:        z.number().int().min(0).max(MAX_SCORE),
  wave:         z.number().int().min(1).max(MAX_WAVE),
  kills:        z.number().int().min(0).max(MAX_KILLS),
  survivalTime: z.number().int().min(0).max(MAX_TIME),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  let body: z.infer<typeof schema>;
  try { body = schema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { sessionId, score, wave, kills, survivalTime } = body;

  // Load + verify session ownership
  const shooterSession = await db.spaceShooterSession.findUnique({ where: { id: sessionId } });
  if (!shooterSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (shooterSession.userId !== userId) return NextResponse.json({ error: "Not your session" }, { status: 403 });

  // Session elapsed-time sanity check
  const sessionAge = Math.round((Date.now() - new Date(shooterSession.startedAt).getTime()) / 1000);
  if (survivalTime > sessionAge + 60) {
    return NextResponse.json({ error: "Invalid survival time" }, { status: 400 });
  }

  // Server-side XP: kills * 2 + wave * 5, capped
  // Minimum 30s to prevent instant-exit farming
  const xpBase = survivalTime < 30 ? 0 : Math.floor(kills * 2 + wave * 5);
  const xpEarned = Math.min(xpBase, MAX_XP);

  let newXp = 0;
  let newRank = "ROOKIE";

  try {
    await db.$transaction(async (tx) => {
      // Delete session atomically — duplicate-finish guard
      const deleted = await tx.spaceShooterSession.deleteMany({
        where: { id: sessionId, userId },
      });
      if (deleted.count === 0) throw Object.assign(new Error("dup"), { code: "DUP" });

      // Permanent game record
      await tx.spaceShooterGame.create({
        data: { userId, score, wave, kills, survivalTime, xpEarned, savedAt: new Date() },
      });

      // Leaderboard — update only if new score is higher
      const existing = await tx.leaderboard.findUnique({
        where: { userId_gameType_difficulty: { userId, gameType: "SPACE_SHOOTER", difficulty: "EASY" } },
      });
      if (!existing || score > existing.highScore) {
        await tx.leaderboard.upsert({
          where:  { userId_gameType_difficulty: { userId, gameType: "SPACE_SHOOTER", difficulty: "EASY" } },
          create: { userId, gameType: "SPACE_SHOOTER", difficulty: "EASY", highScore: score },
          update: { highScore: score },
        });
      }

      // XP + rank
      const cur = await tx.userLevel.findUnique({ where: { userId } });
      newXp   = (cur?.xp ?? 0) + xpEarned;
      newRank = calcRank(newXp);

      await tx.userLevel.upsert({
        where:  { userId },
        create: { userId, xp: newXp, rank: newRank as any },
        update: { xp: newXp, rank: newRank as any },
      });

      await tx.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    });
  } catch (err: any) {
    if (err?.code === "DUP") {
      return NextResponse.json({ error: "Game already finished" }, { status: 409 });
    }
    console.error("[space-shooter/finish] transaction failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true, xpEarned, newRank, totalXp: newXp });
}
