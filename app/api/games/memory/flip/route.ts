/**
 * POST /api/games/memory/flip
 *
 * The ONLY route that can complete a game and award XP/score.
 * When the last pair is matched here, we immediately:
 *   1. Stamp completedAt (= source of truth for duration)
 *   2. Calculate score + XP server-side
 *   3. Write MemoryGame record + leaderboard + XP in one transaction
 *   4. Mark session savedAt so /finish is just a read
 *
 * /finish cannot award anything — it only reads what we write here.
 */

import { NextResponse }  from "next/server";
import { db }            from "@/lib/db";
import { getSession }    from "@/lib/auth";
import { calcRank, XP_TABLE, MEMORY_PAR_MOVES } from "@/lib/game-utils";
import { z }             from "zod";

// rate: 300 flips/min per user
const _rate = new Map<string, { count: number; ts: number }>();
function rateOk(uid: string) {
  const now = Date.now(), e = _rate.get(uid);
  if (!e || now - e.ts > 60_000) { _rate.set(uid, { count: 1, ts: now }); return true; }
  if (e.count >= 300) return false;
  e.count++; return true;
}

const schema = z.object({
  sessionId: z.string().cuid(),
  cardA:     z.number().int().min(0),
  cardB:     z.number().int().min(0),
});

interface DeckCard { id: number; sym: string; pairId: number; }

function calcScore(
  difficulty: "EASY"|"MEDIUM"|"HARD",
  moves: number,
  duration: number,
): number {
  const base        = { EASY: 500, MEDIUM: 1000, HARD: 2000 }[difficulty];
  const par         = MEMORY_PAR_MOVES[difficulty];
  const parBonus    = Math.max(0, par - moves) * { EASY: 10, MEDIUM: 20, HARD: 40 }[difficulty];
  const timePenalty = Math.min(Math.floor(duration / 5) * 5, Math.floor(base * 0.4));
  return Math.max(100, base + parBonus - timePenalty);
}

function calcXp(
  difficulty: "EASY"|"MEDIUM"|"HARD",
  moves: number,
): number {
  const base  = XP_TABLE.MEMORY.COMPLETE[difficulty];
  const par   = MEMORY_PAR_MOVES[difficulty];
  const bonus = Math.max(0, par - moves) * { EASY: 2, MEDIUM: 3, HARD: 5 }[difficulty];
  return base + bonus;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  if (!rateOk(userId)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  let body: z.infer<typeof schema>;
  try { body = schema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { sessionId, cardA, cardB } = body;

  if (cardA === cardB)
    return NextResponse.json({ error: "Cannot flip same card twice" }, { status: 400 });

  // ── Load session ──────────────────────────────────────────────────────────
  const game = await db.memorySession.findUnique({ where: { id: sessionId } });
  if (!game)                  return NextResponse.json({ error: "Session not found" },   { status: 404 });
  if (game.userId !== userId) return NextResponse.json({ error: "Not your game" },       { status: 403 });
  if (game.finished)          return NextResponse.json({ error: "Game already finished"}, { status: 409 });

  const deck: DeckCard[]       = JSON.parse(game.deckData);
  const matchedPairs: number[] = JSON.parse(game.matchedPairs);

  // ── Validate card IDs ─────────────────────────────────────────────────────
  const cA = deck.find(c => c.id === cardA);
  const cB = deck.find(c => c.id === cardB);
  if (!cA || !cB) return NextResponse.json({ error: "Invalid card ID" }, { status: 400 });

  if (matchedPairs.includes(cA.pairId))
    return NextResponse.json({ error: "Card already matched" }, { status: 400 });

  // ── Check match ───────────────────────────────────────────────────────────
  const isMatch    = cA.pairId === cB.pairId;
  const newMoves   = game.moves + 1;
  const newMatched = isMatch ? [...matchedPairs, cA.pairId] : matchedPairs;
  const completed  = newMatched.length === game.totalPairs;

  // ── Not the last pair — just update session state and return ──────────────
  if (!completed) {
    await db.memorySession.update({
      where: { id: sessionId },
      data:  { moves: newMoves, matchedPairs: JSON.stringify(newMatched) },
    });
    return NextResponse.json({
      success: true, match: isMatch,
      matchedPairs: newMatched.length, completed: false,
      moves: newMoves, symA: cA.sym, symB: cB.sym,
    });
  }

  // ── LAST PAIR MATCHED — do everything here in one transaction ─────────────
  const completedAt = new Date();
  const duration    = Math.round((completedAt.getTime() - new Date(game.startedAt).getTime()) / 1000);
  const trueDuration = Math.min(Math.max(duration, 1), 7200);

  const difficulty = game.difficulty as "EASY"|"MEDIUM"|"HARD";
  const score      = calcScore(difficulty, newMoves, trueDuration);
  const xpEarned   = calcXp(difficulty, newMoves);

  let newXp = 0, newRank = "ROOKIE";

  try {
    await db.$transaction(async (tx) => {
      // 1. Lock session atomically — prevent any duplicate completion
      const locked = await tx.memorySession.updateMany({
        where: { id: sessionId, finished: false, savedAt: null },
        data:  {
          moves:        newMoves,
          matchedPairs: JSON.stringify(newMatched),
          completed:    true,
          finished:     true,
          completedAt,
          savedAt:      completedAt, // mark saved immediately — /finish is just a read
          score,
          xpEarned,
        },
      });
      if (locked.count === 0) throw Object.assign(new Error("dup"), { code: "DUP" });

      // 2. Permanent game record
      await tx.memoryGame.create({
        data: { userId, difficulty, score, xpEarned, moves: newMoves, matched: newMatched.length, duration: trueDuration },
      });

      // 3. Leaderboard — only update if better score
      const lb = await tx.leaderboard.findUnique({
        where: { userId_gameType_difficulty: { userId, gameType: "MEMORY", difficulty } },
      });
      if (!lb || score > lb.highScore) {
        await tx.leaderboard.upsert({
          where:  { userId_gameType_difficulty: { userId, gameType: "MEMORY", difficulty } },
          create: { userId, gameType: "MEMORY", difficulty, highScore: score },
          update: { highScore: score },
        });
      }

      // 4. XP + rank
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
    if (err?.code === "DUP")
      return NextResponse.json({ error: "Already finished" }, { status: 409 });
    console.error("[memory/flip] completion tx failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({
    success: true, match: true,
    matchedPairs: newMatched.length, completed: true,
    moves: newMoves, symA: cA.sym, symB: cB.sym,
    // Return score/XP so frontend can show win screen immediately
    score, xpEarned, newXp, newRank,
  });
}
