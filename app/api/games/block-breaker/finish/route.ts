/**
 * POST /api/games/block-breaker/finish
 *
 * Finalizes a Block Breaker game with anti-cheat validation.
 *
 * XP Formula: (score / 50) * levelMultiplier * completionBonus
 *   - levelMultiplier: L1-3 → 1×  |  L4-6 → 1.5×  |  L7-9 → 2×  |  L10 → 2.5×
 *   - completionBonus: +50% when all 10 levels are cleared (level > 10)
 *
 * Anti-cheat:
 *   - Session ownership validation
 *   - Server-side XP calculation (client value ignored)
 *   - Duration check: reported duration ≤ actual session age + 30 s grace
 *   - Score-per-block ceiling: 500 pts × 10 levels = 5 000 (generous but bounded)
 *   - Atomic transaction with leaderboard + XP update
 *   - Duplicate-finish guard via session deletion
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { calcRank } from "@/lib/game-utils";
import { z } from "zod";

// ── Anti-cheat limits ──────────────────────────────────────────────────────────
const MAX_LEVEL  = 10;
const MAX_TIME   = 7200;   // 2 hours
const MAX_SCORE  = 500_000;
const MAX_BLOCKS = 2_000;
const MAX_XP     = 10_000;

// Score formula: 10 * level * maxHp per block.
// Worst case per block: 10 * 10 * 5 = 500 pts.
// Across many levels blocks average much less, but we cap the overall
// score/blocks ratio at 500 * MAX_LEVEL so a full high-level clear is always valid.
const MAX_SCORE_PER_BLOCK = 500 * MAX_LEVEL; // 5 000

const schema = z.object({
  sessionId:       z.string().min(1),
  level:           z.number().int().min(1).max(MAX_LEVEL + 1), // MAX_LEVEL + 1 = completed all
  score:           z.number().int().min(0).max(MAX_SCORE),
  blocksDestroyed: z.number().int().min(0).max(MAX_BLOCKS),
  duration:        z.number().int().min(0).max(MAX_TIME),
});

// ── XP Calculation ─────────────────────────────────────────────────────────────
// Level completion XP: level * 20  (L1=20, L2=40, ... L10=200)
// Total if all levels cleared: sum(1..10)*20 = 1100, but we award only up to
// the level reached, capped so a full clear gives exactly 600.
// Scale factor: 600 / 1100 ≈ 0.5454, so each level gives level * 20 * 0.5454 ≈ level * 10.9
// We simplify: levelXP = level * 11 (L1=11 ... L10=110, total=605 ≈ 600 ✓)
// Per-tile XP: floor(blocksDestroyed * 1.3)
function calculateXP(score: number, level: number, blocksDestroyed: number): number {
  // XP for each level cleared (cumulative up to the level reached)
  // level param = level player was ON when game ended (or MAX_LEVEL+1 if all cleared)
  const levelsCleared = Math.min(level - 1, MAX_LEVEL); // levels fully completed
  let levelXP = 0;
  for (let l = 1; l <= levelsCleared; l++) {
    levelXP += l * 11; // L1=11, L2=22, ... L10=110  →  total full clear = 605
  }

  // Per-tile XP
  const tileXP = Math.floor(blocksDestroyed * 1.3);

  return Math.min(levelXP + tileXP, MAX_XP);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  let body: z.infer<typeof schema>;
  try { body = schema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { sessionId, level, score, blocksDestroyed, duration } = body;

  // ── Load + verify session ──────────────────────────────────────────────────
  const blockSession = await db.blockBreakerSession.findUnique({ where: { id: sessionId } });
  if (!blockSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (blockSession.userId !== userId) return NextResponse.json({ error: "Not your session" }, { status: 403 });

  // ── Anti-cheat: duration cannot exceed real elapsed time ──────────────────
  const sessionAge = Math.round((Date.now() - new Date(blockSession.startedAt).getTime()) / 1000);
  if (duration > sessionAge + 30) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }

  // ── Anti-cheat: score-per-block sanity check ───────────────────────────────
  // Only applies when blocks were actually destroyed to avoid division-by-zero.
  // Score formula is 10 * level * maxHp per block (max 500 at L10/maxHp5).
  // We multiply by MAX_LEVEL to give a generous ceiling across all levels.
  if (blocksDestroyed > 0 && score / blocksDestroyed > MAX_SCORE_PER_BLOCK) {
    return NextResponse.json({ error: "Invalid score/blocks ratio" }, { status: 400 });
  }

  // ── Server-side XP calculation ─────────────────────────────────────────────
  const finalLevel = Math.min(level, MAX_LEVEL + 1);
  const xpEarned   = calculateXP(score, finalLevel, blocksDestroyed);

  let newXp  = 0;
  let newRank = "ROOKIE";

  try {
    await db.$transaction(async (tx) => {
      // 1. Delete session atomically — prevents duplicate finishes
      const deleted = await tx.blockBreakerSession.deleteMany({
        where: { id: sessionId, userId },
      });
      if (deleted.count === 0) throw Object.assign(new Error("dup"), { code: "DUP" });

      // 2. Create permanent game record
      await tx.blockBreakerGame.create({
        data: {
          userId,
          level:           finalLevel,
          score,
          blocksDestroyed,
          duration,
          xpEarned,
          paddleSize: blockSession.paddleSize,
          extraBalls: blockSession.extraBalls,
          hadGun:     blockSession.hasGun,
        },
      });

      // 3. Update leaderboard only when this is a new personal best.
      //    The Leaderboard model uses a @@unique([userId, gameType, difficulty])
      //    index. Because difficulty is nullable, Postgres treats two NULL values
      //    as distinct, so a plain upsert would INSERT a duplicate row every time.
      //    We use createOrUpdate logic via findFirst + explicit create/update to
      //    work correctly with nullable difficulty.
      const existing = await tx.leaderboard.findFirst({
        where: { userId, gameType: "BLOCK_BREAKER", difficulty: null },
      });

      if (!existing) {
        await tx.leaderboard.create({
          data: { userId, gameType: "BLOCK_BREAKER", difficulty: null, highScore: score },
        });
      } else if (score > existing.highScore) {
        await tx.leaderboard.update({
          where: { id: existing.id },
          data:  { highScore: score },
        });
      }

      // 4. Award XP + recalculate rank
      const cur = await tx.userLevel.findUnique({ where: { userId } });
      newXp  = (cur?.xp ?? 0) + xpEarned;
      newRank = calcRank(newXp);

      await tx.userLevel.upsert({
        where:  { userId },
        create: { userId, xp: newXp, rank: newRank as any },
        update: { xp: newXp, rank: newRank as any },
      });

      // 5. Refresh lastLoginAt
      await tx.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    });
  } catch (err: any) {
    if (err?.code === "DUP") {
      return NextResponse.json({ error: "Game already finished" }, { status: 409 });
    }
    console.error("[block-breaker/finish] transaction failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true, xpEarned, newRank, totalXp: newXp });
}
