/**
 * POST /api/games/pacman/finish
 *
 * READ score/stage FROM DB — client cannot send or alter them.
 * Client only sends: { receipt } — the HMAC receipt issued by /commit.
 *
 * Flow:
 *   /start  → token (session proof)
 *   /commit → receipt (score proof, score stored in DB)
 *   /finish → verifies receipt, reads score/stage from DB, awards XP
 *
 * Security:
 *  1. Auth         — must be logged-in user
 *  2. Receipt sig  — HMAC verified against DB-stored receipt (constant-time)
 *  3. Ownership    — session belongs to requesting user
 *  4. One-use      — marks session used atomically, rejects duplicates
 *  5. Expiry       — receipt expires with session (2h from start)
 *  6. Score/stage  — read exclusively from DB (written by /commit) — client cannot alter
 *
 * Hitting this directly without /commit → no receipt → 400.
 * Replaying the receipt → already-used session → 409.
 * Forging a receipt → HMAC mismatch → 403.
 */
import { NextResponse } from "next/server";
import { db }           from "@/lib/db";
import { getSession }   from "@/lib/auth";
import { calcRank }     from "@/lib/game-utils";
import { createHmac }   from "crypto";
import { z }            from "zod";

const SECRET = process.env.PACMAN_TOKEN_SECRET
  ?? process.env.NEXTAUTH_SECRET
  ?? "pacman-fallback-secret-change-me";

function verifyReceipt(
  receipt:   string,
  sessionId: string,
  score:     number,
  stage:     number,
  commitAt:  Date,
): boolean {
  const expected = createHmac("sha256", SECRET)
    .update(`receipt:${sessionId}:${score}:${stage}:${commitAt.getTime()}`)
    .digest("hex");
  if (expected.length !== receipt.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++)
    diff |= expected.charCodeAt(i) ^ receipt.charCodeAt(i);
  return diff === 0;
}

function calcXp(score: number, stage: number): number {
  if (score <= 0) return 0;
  const base       = Math.floor(Math.log10(score + 1) * 10);
  const stageBonus = Math.max(0, stage - 1) * 15;
  return base + stageBonus;
}

const schema = z.object({
  receipt: z.string().min(10).max(300),
});

export async function POST(req: Request) {
  // 1. Auth
  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  // 2. Parse body — only receipt, no score/stage/duration from client
  let body: z.infer<typeof schema>;
  try { body = schema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { receipt } = body;

  // 3. Find session by receipt
  const pac = await db.pacmanSession.findFirst({ where: { receipt } });
  if (!pac || pac.committedScore === null || pac.committedStage === null || !pac.commitAt)
    return NextResponse.json({ error: "Invalid or missing receipt" }, { status: 400 });

  // 4. Ownership
  if (pac.userId !== userId)
    return NextResponse.json({ error: "Receipt mismatch" }, { status: 403 });

  // 5. One-use
  if (pac.used)
    return NextResponse.json({ error: "Already saved" }, { status: 409 });

  // 6. Expiry
  if (pac.expiresAt < new Date())
    return NextResponse.json({ error: "Session expired" }, { status: 403 });

  // 7. Verify receipt HMAC — score/stage cannot have been altered
  if (!verifyReceipt(receipt, pac.id, pac.committedScore, pac.committedStage, pac.commitAt))
    return NextResponse.json({ error: "Receipt verification failed" }, { status: 403 });

  // 8. All checks passed — read score/stage from DB (never from client)
  const score    = pac.committedScore;
  const stage    = pac.committedStage;
  const duration = Math.max(Math.floor((Date.now() - pac.startedAt.getTime()) / 1000), 1);
  const xpEarned = calcXp(score, stage);

  let newXp = 0, newRank = "ROOKIE";

  try {
    await db.$transaction(async (tx) => {
      // Mark used atomically — prevents race-condition double-submits
      const upd = await tx.pacmanSession.updateMany({
        where: { id: pac.id, used: false },
        data:  { used: true },
      });
      if (upd.count === 0) throw Object.assign(new Error("dup"), { code: "DUP" });

      // Save game record
      await tx.pacmanGame.create({
        data: { userId, score, stage, xpEarned, duration },
      });

      // Leaderboard — keep only user's highest score
      const existing = await tx.leaderboard.findFirst({
        where: { userId, gameType: "PACMAN", difficulty: null },
      });
      if (!existing || score > existing.highScore) {
        existing
          ? await tx.leaderboard.update({ where: { id: existing.id }, data: { highScore: score } })
          : await tx.leaderboard.create({ data: { userId, gameType: "PACMAN", difficulty: null, highScore: score } });
      }

      // XP + rank
      if (xpEarned > 0) {
        const cur = await tx.userLevel.findUnique({ where: { userId } });
        newXp   = (cur?.xp ?? 0) + xpEarned;
        newRank = calcRank(newXp);
        await tx.userLevel.upsert({
          where:  { userId },
          create: { userId, xp: newXp, rank: newRank as any },
          update: { xp: newXp, rank: newRank as any },
        });
      }

      await tx.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    });
  } catch (err: any) {
    if (err?.code === "DUP")
      return NextResponse.json({ error: "Already saved" }, { status: 409 });
    console.error("[pacman/finish]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true, score, stage, xpEarned, newXp, newRank });
}
