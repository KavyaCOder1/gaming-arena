/**
 * POST /api/games/connect-dots/finish
 * No time limit — XP is based on speed, difficulty, and pair count.
 * Only awards XP on full solve (completed = true, all cells filled).
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { calcRank } from "@/lib/game-utils";
import { z } from "zod";

const MAX_MOVES    = 2000;
const MAX_DURATION = 7200; // 2 hour hard cap (no time limit but need a ceiling)
const MAX_XP       = 3000;

const bodySchema = z.object({
  sessionId: z.string().min(1),
  completed: z.boolean(),
  moves:     z.number().int().min(0).max(MAX_MOVES),
  duration:  z.number().int().min(0).max(MAX_DURATION),
});

// Base XP per pair by difficulty
const BASE_XP: Record<string, number> = { EASY: 15, MEDIUM: 30, HARD: 55 };

// Speed thresholds (seconds) for each difficulty → bonus tiers
// Under FAST = big bonus, under MED = small bonus, else no bonus
const SPEED_TIERS: Record<string, { fast: number; med: number; fastBonus: number; medBonus: number }> = {
  EASY:   { fast: 60,  med: 120, fastBonus: 60,  medBonus: 25  },
  MEDIUM: { fast: 120, med: 240, fastBonus: 120, medBonus: 50  },
  HARD:   { fast: 200, med: 400, fastBonus: 240, medBonus: 100 },
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;

  let body: z.infer<typeof bodySchema>;
  try { body = bodySchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { sessionId, completed, moves, duration } = body;

  const live = await db.connectDotsSession.findUnique({ where: { id: sessionId } });
  if (!live) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (live.userId !== userId) return NextResponse.json({ error: "Not your session" }, { status: 403 });

  // Sanity: duration can't exceed wall-clock time by more than 30s
  const sessionAge = Math.round((Date.now() - new Date(live.startedAt).getTime()) / 1000);
  if (duration > sessionAge + 30) return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  if (duration > MAX_DURATION) return NextResponse.json({ error: "Duration too long" }, { status: 400 });

  const diff = live.difficulty as "EASY" | "MEDIUM" | "HARD";
  const dotsCount = live.dotsCount;

  let xpEarned = 0;
  if (completed && duration >= 1) {
    // Base XP: pairs × difficulty multiplier
    const base = (BASE_XP[diff] ?? 15) * dotsCount;

    // Speed bonus
    const tier = SPEED_TIERS[diff];
    let speedBonus = 0;
    if (duration <= tier.fast) speedBonus = tier.fastBonus;
    else if (duration <= tier.med) speedBonus = tier.medBonus;

    // Efficiency bonus: low moves relative to pair count
    const movesPerPair = moves / Math.max(dotsCount, 1);
    const efficiencyBonus = movesPerPair <= dotsCount ? Math.floor(base * 0.3) : 0;

    xpEarned = Math.min(base + speedBonus + efficiencyBonus, MAX_XP);
  }

  let newXp = 0; let newRank = "ROOKIE";

  try {
    await db.$transaction(async (tx) => {
      const deleted = await tx.connectDotsSession.deleteMany({ where: { id: sessionId, userId } });
      if (deleted.count === 0) throw Object.assign(new Error("dup"), { code: "DUP" });

      await tx.connectDotsGame.create({
        data: {
          userId, difficulty: diff, dotsCount,
          timeLimitSeconds: live.timeLimitSeconds,
          completed, moves, duration, xpEarned,
        },
      });

      if (xpEarned > 0) {
        const existing = await tx.leaderboard.findUnique({
          where: { userId_gameType_difficulty: { userId, gameType: "CONNECT_DOTS", difficulty: diff } },
        });
        if (!existing || xpEarned > existing.highScore) {
          await tx.leaderboard.upsert({
            where: { userId_gameType_difficulty: { userId, gameType: "CONNECT_DOTS", difficulty: diff } },
            create: { userId, gameType: "CONNECT_DOTS", difficulty: diff, highScore: xpEarned },
            update: { highScore: xpEarned },
          });
        }
      }

      const cur = await tx.userLevel.findUnique({ where: { userId } });
      newXp = (cur?.xp ?? 0) + xpEarned;
      newRank = calcRank(newXp);
      await tx.userLevel.upsert({
        where: { userId },
        create: { userId, xp: newXp, rank: newRank as any },
        update: { xp: newXp, rank: newRank as any },
      });
      await tx.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    });
  } catch (err: any) {
    if (err?.code === "DUP") return NextResponse.json({ error: "Already finished" }, { status: 409 });
    console.error("[connect-dots/finish]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true, xpEarned, newRank, totalXp: newXp });
}
