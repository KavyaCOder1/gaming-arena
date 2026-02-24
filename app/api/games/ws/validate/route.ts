/**
 * POST /api/games/ws/validate
 *
 * Client sends a word + cell coordinates. Server validates against its grid.
 * When the LAST word is found (completed = true), this route does everything:
 *   1. Stamps completedAt + savedAt
 *   2. Computes XP
 *   3. Writes WordSearchGame record + leaderboard + UserLevel in one transaction
 *
 * /finish is a pure read after this — it awards nothing on its own.
 */

import { NextResponse }       from "next/server";
import { db }                 from "@/lib/db";
import { getSession }         from "@/lib/auth";
import { calcRank, XP_TABLE } from "@/lib/game-utils";
import { validateWordClaim }  from "@/lib/word-grid";
import type { PlacedWord }    from "@/lib/word-grid";
import { z }                  from "zod";

const schema = z.object({
  sessionId: z.string().cuid(),
  word:      z.string().min(1).max(20).toUpperCase(),
  cells:     z.array(z.tuple([z.number().int().min(0), z.number().int().min(0)])).min(1).max(30),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  let body: z.infer<typeof schema>;
  try { body = schema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { sessionId, word, cells } = body;

  // ── Load session ──────────────────────────────────────────────────────────
  const game = await db.wordSearchSession.findUnique({ where: { id: sessionId } });
  if (!game)                  return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (game.userId !== userId) return NextResponse.json({ error: "Not your game" },     { status: 403 });
  if (game.finished)          return NextResponse.json({ error: "Game already finished" }, { status: 409 });

  const placed:     PlacedWord[] = JSON.parse(game.placedWords);
  const foundWords: string[]     = JSON.parse(game.foundWords);
  const alreadyFound = new Set(foundWords);

  // ── Validate the claim ────────────────────────────────────────────────────
  const match = validateWordClaim(word, cells as [number, number][], placed, alreadyFound);

  if (!match) {
    return NextResponse.json({
      success: true, valid: false, word,
      foundCount: foundWords.length, totalWords: game.totalWords, completed: false,
    });
  }

  // ── Valid find ────────────────────────────────────────────────────────────
  const newFoundWords = [...foundWords, match.word];
  const completed     = newFoundWords.length === game.totalWords;

  // ── Not the last word — just update session state ─────────────────────────
  if (!completed) {
    await db.wordSearchSession.update({
      where: { id: sessionId },
      data:  { foundWords: JSON.stringify(newFoundWords) },
    });
    return NextResponse.json({
      success: true, valid: true, word: match.word,
      foundCount: newFoundWords.length, totalWords: game.totalWords, completed: false,
    });
  }

  // ── LAST WORD FOUND — do everything here in one transaction ──────────────
  const completedAt  = new Date();
  const duration     = Math.round((completedAt.getTime() - new Date(game.startedAt).getTime()) / 1000);
  const trueDuration = Math.min(Math.max(duration, 1), 7200);
  const difficulty   = game.difficulty as "EASY" | "MEDIUM" | "HARD";
  const xpEarned     = XP_TABLE.WORD_SEARCH.COMPLETE[difficulty];

  let newXp = 0, newRank = "ROOKIE";

  try {
    await db.$transaction(async (tx) => {
      // 1. Lock session atomically
      const locked = await tx.wordSearchSession.updateMany({
        where: { id: sessionId, finished: false, savedAt: null },
        data:  {
          foundWords:  JSON.stringify(newFoundWords),
          completed:   true,
          finished:    true,
          completedAt,
          savedAt:     completedAt,
          xpEarned,
        },
      });
      if (locked.count === 0) throw Object.assign(new Error("dup"), { code: "DUP" });

      // 2. Permanent game record
      await tx.wordSearchGame.create({
        data: {
          userId, difficulty,
          score:      xpEarned,
          xpEarned,
          wordsFound: newFoundWords.length,
          totalWords: game.totalWords,
          completed:  true,
          duration:   trueDuration,
        },
      });

      // 3. Leaderboard — increment cumulative completions score
      const lb = await tx.leaderboard.findUnique({
        where: { userId_gameType_difficulty: { userId, gameType: "WORD_SEARCH", difficulty } },
      });
      if (!lb) {
        await tx.leaderboard.create({
          data: { userId, gameType: "WORD_SEARCH", difficulty, highScore: xpEarned },
        });
      } else {
        await tx.leaderboard.update({
          where: { userId_gameType_difficulty: { userId, gameType: "WORD_SEARCH", difficulty } },
          data:  { highScore: lb.highScore + xpEarned },
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
    console.error("[ws/validate] completion tx failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({
    success: true, valid: true, word: match.word,
    foundCount: newFoundWords.length, totalWords: game.totalWords,
    completed:  true,
    // Return everything so frontend shows win screen immediately — no /finish call needed
    xpEarned, newXp, newRank,
  });
}
