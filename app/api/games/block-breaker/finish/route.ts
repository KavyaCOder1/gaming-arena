/**
 * POST /api/games/block-breaker/finish
 *
 * Finalizes a Block Breaker game with anti-cheat validation.
 * XP Formula: base_xp * level_reached * completion_bonus
 * - base_xp = score / 100 (1 XP per 100 points)
 * - level multiplier increases with progress
 * - completion bonus if all 10 levels cleared
 * 
 * Security matching Snake/Memory pattern:
 *   - Session ownership validation
 *   - Server-side XP calculation (client value ignored)
 *   - Anti-cheat bounds on all stats
 *   - Atomic transaction with leaderboard + XP update
 *   - Duplicate-finish guard via session deletion
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { calcRank } from "@/lib/game-utils";
import { z } from "zod";

// ── Anti-cheat limits ──────────────────────────────────────────────────────────
const MAX_LEVEL  = 10;     // 10 levels total
const MAX_TIME   = 7200;   // 2 hours maximum
const MAX_SCORE  = 500000; // theoretical maximum score
const MAX_BLOCKS = 2000;   // max blocks across all levels
const MAX_XP     = 10000;  // hard ceiling

const schema = z.object({
  sessionId:       z.string().min(1),
  level:           z.number().int().min(1).max(MAX_LEVEL + 1), // can be MAX_LEVEL+1 if completed all
  score:           z.number().int().min(0).max(MAX_SCORE),
  blocksDestroyed: z.number().int().min(0).max(MAX_BLOCKS),
  duration:        z.number().int().min(0).max(MAX_TIME),
});

// ── XP Calculation ─────────────────────────────────────────────────────────────
// Formula: (score / 100) * levelMultiplier * completionBonus
// Level multipliers: 1-3 → 1x, 4-6 → 1.5x, 7-9 → 2x, 10 → 2.5x
// Completion bonus: +50% if all 10 levels completed
function calculateXP(score: number, level: number): number {
  const baseXP = Math.floor(score / 100);
  
  // Level multiplier
  let levelMult = 1.0;
  if (level >= 10) levelMult = 2.5;
  else if (level >= 7) levelMult = 2.0;
  else if (level >= 4) levelMult = 1.5;
  
  // Completion bonus (reached level 11 means all 10 levels completed)
  const completionBonus = level > MAX_LEVEL ? 1.5 : 1.0;
  
  const xp = Math.floor(baseXP * levelMult * completionBonus);
  return Math.min(xp, MAX_XP);
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

  // ── Anti-cheat: time validation ────────────────────────────────────────────
  const sessionAge = Math.round((Date.now() - new Date(blockSession.startedAt).getTime()) / 1000);
  if (duration > sessionAge + 30) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }

  // ── Anti-cheat: score vs blocks ratio check ────────────────────────────────
  // Each block gives ~50-500 points depending on position
  // Max reasonable ratio: 500 points per block
  if (blocksDestroyed > 0 && score / blocksDestroyed > 500) {
    return NextResponse.json({ error: "Invalid score/blocks ratio" }, { status: 400 });
  }

  // ── Server-side XP calculation ─────────────────────────────────────────────
  const finalLevel = Math.min(level, MAX_LEVEL + 1); // cap at 11 (completed all 10)
  const xpEarned = calculateXP(score, finalLevel);

  let newXp = 0;
  let newRank = "ROOKIE";

  try {
    await db.$transaction(async (tx) => {
      // 1. Delete session (duplicate-finish guard)
      const deleted = await tx.blockBreakerSession.deleteMany({
        where: { id: sessionId, userId },
      });
      if (deleted.count === 0) throw Object.assign(new Error("dup"), { code: "DUP" });

      // 2. Create permanent game record
      await tx.blockBreakerGame.create({
        data: {
          userId,
          level: finalLevel,
          score,
          blocksDestroyed,
          duration,
          xpEarned,
          paddleSize: blockSession.paddleSize,
          extraBalls: blockSession.extraBalls,
          hadGun: blockSession.hasGun,
        },
      });

      // 3. Update leaderboard (no difficulty, just high score)
      const existing = await tx.leaderboard.findFirst({
        where: { userId, gameType: "BLOCK_BREAKER", difficulty: null },
      });
      
      if (!existing || score > existing.highScore) {
        await tx.leaderboard.upsert({
          where: { 
            userId_gameType_difficulty: { 
              userId, 
              gameType: "BLOCK_BREAKER", 
              difficulty: null 
            } 
          },
          create: { userId, gameType: "BLOCK_BREAKER", difficulty: null, highScore: score },
          update: { highScore: score },
        });
      }

      // 4. Update user XP + rank
      const cur = await tx.userLevel.findUnique({ where: { userId } });
      newXp = (cur?.xp ?? 0) + xpEarned;
      newRank = calcRank(newXp);

      await tx.userLevel.upsert({
        where: { userId },
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
    console.error("[block-breaker/finish] transaction failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    xpEarned,
    newRank,
    totalXp: newXp,
  });
}
