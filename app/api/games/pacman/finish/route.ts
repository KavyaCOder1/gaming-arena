/**
 * POST /api/games/pacman/finish
 *
 * Security layers (in order):
 *  1. Auth        — must be a logged-in user
 *  2. Token       — must supply token returned by /start
 *  3. Ownership   — token must belong to the requesting user
 *  4. Expiry      — token expires 2h after /start
 *  5. One-use     — token is marked used on first success, rejected after
 *  6. HMAC sig    — token signature verified server-side (can't forge)
 *  7. Time sanity — reported duration must match real elapsed time (±60s)
 *  8. Score sanity— score can't exceed what's physically achievable in the time
 *  9. Stage sanity— can't be on stage N if not enough time has passed
 *
 * Receives: { token, score, stage, duration }
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

function verifyToken(token: string, sessionId: string, userId: string, startedAt: Date): boolean {
  const expected = createHmac("sha256", SECRET)
    .update(`${sessionId}:${userId}:${startedAt.getTime()}`)
    .digest("hex");
  const actual = token.split(".")[1] ?? "";
  if (expected.length !== actual.length) return false;
  // Constant-time comparison
  let diff = 0;
  for (let i = 0; i < expected.length; i++)
    diff |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  return diff === 0;
}

function calcXp(score: number, stage: number): number {
  if (score <= 0) return 0;
  const base       = Math.floor(Math.log10(score + 1) * 10);
  const stageBonus = Math.max(0, stage - 1) * 15;
  return base + stageBonus;
}

const schema = z.object({
  token:    z.string().min(10).max(300),
  score:    z.number().int().min(0).max(9_999_999),
  stage:    z.number().int().min(1).max(8).default(1),
  duration: z.number().int().min(1).max(7200),
});

export async function POST(req: Request) {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // ── 2. Parse body ─────────────────────────────────────────────────────────
  let body: z.infer<typeof schema>;
  try { body = schema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { token, score, stage, duration } = body;

  // ── 3. Look up session by token ───────────────────────────────────────────
  const pacSession = await db.pacmanSession.findUnique({ where: { token } });
  if (!pacSession)
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });

  // ── 4. Ownership ──────────────────────────────────────────────────────────
  if (pacSession.userId !== userId)
    return NextResponse.json({ error: "Token mismatch" }, { status: 403 });

  // ── 5. One-use ────────────────────────────────────────────────────────────
  if (pacSession.used)
    return NextResponse.json({ error: "Token already used" }, { status: 409 });

  // ── 6. Expiry ─────────────────────────────────────────────────────────────
  if (pacSession.expiresAt < new Date())
    return NextResponse.json({ error: "Session expired" }, { status: 403 });

  // ── 7. HMAC verification ──────────────────────────────────────────────────
  if (!verifyToken(token, pacSession.id, userId, pacSession.startedAt))
    return NextResponse.json({ error: "Invalid token signature" }, { status: 403 });

  // ── 8. Time sanity ────────────────────────────────────────────────────────
  // Real elapsed = now - when /start was called. Allow 60s buffer for lag/tab-switch.
  const realElapsed = Math.floor((Date.now() - pacSession.startedAt.getTime()) / 1000);
  if (duration > realElapsed + 60)
    return NextResponse.json({ error: "Duration exceeds session time" }, { status: 400 });

  // ── 9. Score sanity ───────────────────────────────────────────────────────
  // PAC-MAN max burst: 4 ghosts back-to-back = 1600 pts. Sustained ~500 pts/sec max.
  const maxScore = Math.max(realElapsed * 600, 1600);
  if (score > maxScore)
    return NextResponse.json({ error: "Score not achievable in session time" }, { status: 400 });

  // ── 10. Stage sanity ──────────────────────────────────────────────────────
  // Each neighbourhood takes at minimum ~60s to clear
  const maxStage = Math.min(8, Math.floor(realElapsed / 60) + 1);
  if (stage > maxStage)
    return NextResponse.json({ error: "Stage not reachable in session time" }, { status: 400 });

  // ── All checks passed ─────────────────────────────────────────────────────
  const xpEarned = calcXp(score, stage);
  let newXp = 0, newRank = "ROOKIE";

  try {
    await db.$transaction(async (tx) => {
      // Mark token as used immediately (prevents race-condition double submits)
      await tx.pacmanSession.update({
        where: { id: pacSession.id },
        data:  { used: true },
      });

      // Save game history
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
  } catch (err) {
    console.error("[pacman/finish]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  return NextResponse.json({ success: true, score, stage, xpEarned, newXp, newRank });
}
