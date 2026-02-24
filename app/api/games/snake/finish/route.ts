/**
 * POST /api/games/snake/finish
 *
 * Finalises a snake game. Mirrors the security level of ttt/move + memory/flip:
 *   - Uses getSession() (cookie "session")
 *   - Validates session ownership
 *   - Re-calculates XP server-side WITH difficulty multiplier (client value ignored)
 *   - Anti-cheat bounds on all submitted stats
 *   - Atomic DB transaction: game record + XP update + leaderboard + session delete
 *   - Duplicate-finish guard (idempotency via session delete)
 *   - Rank recalculated from actual new XP (fixes old bug)
 *   - Uses calcRank() from game-utils (consistent with all other games)
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { calcRank } from "@/lib/game-utils";
import { z } from "zod";

// ── Anti-cheat hard limits ────────────────────────────────────────────────────
const MAX_CORES   = 500;   // ~8+ hours of play even on Easy — effectively unreachable legit
const MAX_TIME    = 7200;  // 2 hours
const MAX_LENGTH  = 503;   // 3 start + MAX_CORES
const MAX_XP      = 5000;  // hard ceiling regardless of multiplier

// ── Server-side XP multipliers per difficulty (must match frontend display) ──
const XP_MULT: Record<string, number> = { EASY: 1, MEDIUM: 1.5, HARD: 2 };
const XP_PER_CORE = 5;

const schema = z.object({
  sessionId:      z.string().min(1),
  coresCollected: z.number().int().min(0).max(MAX_CORES),
  survivalTime:   z.number().int().min(0).max(MAX_TIME),
  score:          z.number().int().min(0),
  snakeLength:    z.number().int().min(3).max(MAX_LENGTH),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  let body: z.infer<typeof schema>;
  try { body = schema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { sessionId, coresCollected, survivalTime, score, snakeLength } = body;

  // ── Load + verify session ownership ──────────────────────────────────────
  const snakeSession = await db.snakeSession.findUnique({ where: { id: sessionId } });
  if (!snakeSession)               return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (snakeSession.userId !== userId) return NextResponse.json({ error: "Not your session" }, { status: 403 });

  // ── Anti-cheat: snakeLength can't exceed cores + starting length ─────────
  if (snakeLength > coresCollected + 3) {
    return NextResponse.json({ error: "Invalid game data" }, { status: 400 });
  }

  // ── Server-side XP calculation (difficulty-aware, client value ignored) ──
  const diff       = snakeSession.difficulty as "EASY" | "MEDIUM" | "HARD";
  const mult       = XP_MULT[diff] ?? 1;
  const xpEarned   = Math.min(Math.round(coresCollected * XP_PER_CORE * mult), MAX_XP);

  // ── Session elapsed-time sanity check ────────────────────────────────────
  const sessionAge = Math.round((Date.now() - new Date(snakeSession.gameStartedAt).getTime()) / 1000);
  if (survivalTime > sessionAge + 30) {
    // allow 30s clock drift; reject if client claims more time than wall-clock
    return NextResponse.json({ error: "Invalid survival time" }, { status: 400 });
  }

  let newXp   = 0;
  let newRank = "ROOKIE";

  try {
    await db.$transaction(async (tx) => {
      // 1. Delete session atomically — acts as duplicate-finish guard
      const deleted = await tx.snakeSession.deleteMany({
        where: { id: sessionId, userId },
      });
      if (deleted.count === 0) throw Object.assign(new Error("dup"), { code: "DUP" });

      // 2. Permanent game record
      await tx.snakeGame.create({
        data: {
          userId,
          difficulty: diff,
          coresCollected,
          survivalTime,
          score,
          snakeLength,
          xpEarned,
          savedAt: new Date(),
        },
      });

      // 3. Leaderboard — update only if new score is higher
      const existing = await tx.leaderboard.findUnique({
        where: { userId_gameType_difficulty: { userId, gameType: "SNAKE", difficulty: diff } },
      });
      if (!existing || score > existing.highScore) {
        await tx.leaderboard.upsert({
          where:  { userId_gameType_difficulty: { userId, gameType: "SNAKE", difficulty: diff } },
          create: { userId, gameType: "SNAKE", difficulty: diff, highScore: score },
          update: { highScore: score },
        });
      }

      // 4. XP + rank — read THEN update, calculate rank from NEW xp
      const cur = await tx.userLevel.findUnique({ where: { userId } });
      newXp   = (cur?.xp ?? 0) + xpEarned;
      newRank = calcRank(newXp);

      await tx.userLevel.upsert({
        where:  { userId },
        create: { userId, xp: newXp, rank: newRank as any },
        update: { xp: newXp, rank: newRank as any },
      });

      // 5. Touch lastLoginAt
      await tx.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    });
  } catch (err: any) {
    if (err?.code === "DUP") {
      return NextResponse.json({ error: "Game already finished" }, { status: 409 });
    }
    console.error("[snake/finish] transaction failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({
    success:  true,
    xpEarned,
    newRank,
    totalXp: newXp,
  });
}
