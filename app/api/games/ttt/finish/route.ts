/**
 * POST /api/games/ttt/finish
 *
 * Client sends: { sessionId, duration }
 * Server reads the result entirely from TicTacToeSession in DB.
 * savedAt is set atomically so this can only succeed once per game.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { calcRank, XP_TABLE, SCORE_TABLE } from "@/lib/game-utils";
import { z } from "zod";

const _saved = new Set<string>();
setInterval(() => _saved.clear(), 60 * 60 * 1000);

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let sessionId: string, duration: number;
  try {
    const body = await req.json();
    ({ sessionId, duration } = z.object({ sessionId: z.string().cuid(), duration: z.number().int().min(1).max(7200) }).parse(body));
  } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  if (_saved.has(sessionId)) return NextResponse.json({ error: "Already saved" }, { status: 409 });

  const game = await db.ticTacToeSession.findUnique({ where: { id: sessionId } });
  if (!game)                         return NextResponse.json({ error: "Game not found" }, { status: 404 });
  if (game.userId !== session.user.id) return NextResponse.json({ error: "Not your game" }, { status: 403 });
  if (!game.finished || !game.result) return NextResponse.json({ error: "Game not finished" }, { status: 400 });
  if (game.savedAt)                  return NextResponse.json({ error: "Already saved" }, { status: 409 });
  if (duration < 3)                  return NextResponse.json({ error: "Duration too short" }, { status: 400 });

  const result     = game.result as "WIN" | "LOSE" | "DRAW";
  const difficulty = game.difficulty;
  const score      = SCORE_TABLE.TIC_TAC_TOE[result][difficulty];
  const xpEarned   = XP_TABLE.TIC_TAC_TOE[result][difficulty];
  let newXp = 0, newRank = "ROOKIE";

  try {
    await db.$transaction(async (tx) => {
      // Atomic single-save guard: only update if savedAt is still null
      const upd = await tx.ticTacToeSession.updateMany({
        where: { id: sessionId, savedAt: null },
        data:  { savedAt: new Date() },
      });
      if (upd.count === 0) throw Object.assign(new Error("dup"), { code: "DUP" });

      await tx.ticTacToeGame.create({
        data: { userId: session.user.id, result, difficulty, score, xpEarned, duration },
      });

      // Leaderboard — only update if new score is higher
      const lb = await tx.leaderboard.findUnique({
        where: { userId_gameType_difficulty: { userId: session.user.id, gameType: "TIC_TAC_TOE", difficulty } },
      });
      if (!lb || score > lb.highScore) {
        await tx.leaderboard.upsert({
          where:  { userId_gameType_difficulty: { userId: session.user.id, gameType: "TIC_TAC_TOE", difficulty } },
          create: { userId: session.user.id, gameType: "TIC_TAC_TOE", difficulty, highScore: score },
          update: { highScore: score },
        });
      }

      // XP + rank
      const cur = await tx.userLevel.findUnique({ where: { userId: session.user.id } });
      newXp  = (cur?.xp ?? 0) + xpEarned;
      newRank = calcRank(newXp);
      await tx.userLevel.upsert({
        where:  { userId: session.user.id },
        create: { userId: session.user.id, xp: newXp, rank: newRank as any },
        update: { xp: newXp, rank: newRank as any },
      });
    });
  } catch (err: any) {
    if (err?.code === "DUP") { _saved.add(sessionId); return NextResponse.json({ error: "Already saved" }, { status: 409 }); }
    console.error("[ttt/finish]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  _saved.add(sessionId);
  return NextResponse.json({ success: true, result, score, xpEarned, newXp, newRank });
}
