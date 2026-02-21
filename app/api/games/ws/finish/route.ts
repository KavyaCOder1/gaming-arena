/**
 * POST /api/games/ws/finish
 *
 * Ends a Word Search game and awards XP.
 *
 * XP is awarded ONLY if all words were found (completed = true).
 * There is NO per-word score — it's purely XP on completion.
 *
 * Request:  { sessionId: string, duration: number (seconds) }
 * Response: { success, completed, wordsFound, totalWords, xpEarned, newXp, newRank }
 *
 * Security:
 *  - Result (completed, foundCount) is read from DB — client cannot fake it
 *  - savedAt guard prevents double-save atomically
 */

import { NextResponse } from "next/server";
import { db }           from "@/lib/db";
import { getSession }   from "@/lib/auth";
import { calcRank, XP_TABLE } from "@/lib/game-utils";
import { z }            from "zod";

const _saved = new Set<string>();
setInterval(() => _saved.clear(), 60 * 60 * 1000);

const schema = z.object({
  sessionId: z.string().cuid(),
  duration:  z.number().int().min(1).max(7200),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  let sessionId: string, duration: number;
  try {
    ({ sessionId, duration } = schema.parse(await req.json()));
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (duration < 5) return NextResponse.json({ error: "Duration too short" }, { status: 400 });
  if (_saved.has(sessionId)) return NextResponse.json({ error: "Already saved" }, { status: 409 });

  // ── Load session ──────────────────────────────────────────────────────────
  const game = await db.wordSearchSession.findUnique({ where: { id: sessionId } });
  if (!game)                  return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (game.userId !== userId) return NextResponse.json({ error: "Not your game" }, { status: 403 });
  if (game.savedAt)           return NextResponse.json({ error: "Already saved" }, { status: 409 });

  const difficulty = game.difficulty as "EASY" | "MEDIUM" | "HARD";
  const wordsFound = (JSON.parse(game.foundWords) as string[]).length;
  const totalWords = game.totalWords;
  const completed  = game.completed;

  // ── XP: flat reward ONLY on full completion ───────────────────────────────
  const xpEarned = completed ? XP_TABLE.WORD_SEARCH.COMPLETE[difficulty] : 0;

  // ── Atomic DB write ───────────────────────────────────────────────────────
  let newXp   = 0;
  let newRank = "ROOKIE";

  try {
    await db.$transaction(async (tx) => {
      // Atomic single-save guard — updateMany returns count 0 if already saved
      const upd = await tx.wordSearchSession.updateMany({
        where: { id: sessionId, savedAt: null },
        data:  { savedAt: new Date(), finished: true },
      });
      if (upd.count === 0) throw Object.assign(new Error("dup"), { code: "DUP" });

      // Write permanent game record (score = 0, xpEarned = flat or 0)
      await tx.wordSearchGame.create({
        data: {
          userId,
          difficulty,
          score:      xpEarned,   // store xp as score for DB compatibility
          xpEarned,
          wordsFound,
          totalWords,
          completed,
          duration,
        },
      });

      // Leaderboard — tracks xpEarned as the "high score" for WS
      if (xpEarned > 0) {
        const lb = await tx.leaderboard.findUnique({
          where: { userId_gameType_difficulty: { userId, gameType: "WORD_SEARCH", difficulty } },
        });
        // For WS leaderboard we store total completions via cumulative XP
        // Simply upsert with the flat XP value — players who complete = on board
        if (!lb) {
          await tx.leaderboard.create({
            data: { userId, gameType: "WORD_SEARCH", difficulty, highScore: xpEarned },
          });
        } else {
          // Increment: each completion adds to their leaderboard score
          await tx.leaderboard.update({
            where: { userId_gameType_difficulty: { userId, gameType: "WORD_SEARCH", difficulty } },
            data:  { highScore: lb.highScore + xpEarned },
          });
        }
      }

      // XP + rank update
      const cur = await tx.userLevel.findUnique({ where: { userId } });
      newXp   = (cur?.xp ?? 0) + xpEarned;
      newRank = calcRank(newXp);

      if (xpEarned > 0) {
        await tx.userLevel.upsert({
          where:  { userId },
          create: { userId, xp: newXp, rank: newRank as any },
          update: { xp: newXp, rank: newRank as any },
        });
      }

      await tx.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    });
  } catch (err: any) {
    if (err?.code === "DUP") {
      _saved.add(sessionId);
      return NextResponse.json({ error: "Already saved" }, { status: 409 });
    }
    console.error("[ws/finish]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  _saved.add(sessionId);
  return NextResponse.json({ success: true, completed, wordsFound, totalWords, xpEarned, newXp, newRank });
}
