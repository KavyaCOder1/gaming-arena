/**
 * POST /api/games/ws/finish
 *
 * READ-ONLY — returns stored results. Awards nothing.
 * ALL XP calculation and DB writes happen in /validate when the last word is found.
 *
 * If savedAt is null or completed is false → game was never finished via /validate → 403.
 * Hitting this directly without playing does absolutely nothing.
 */

import { NextResponse } from "next/server";
import { db }           from "@/lib/db";
import { getSession }   from "@/lib/auth";
import { z }            from "zod";

const schema = z.object({
  sessionId: z.string().cuid(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  let body: z.infer<typeof schema>;
  try { body = schema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { sessionId } = body;

  const game = await db.wordSearchSession.findUnique({ where: { id: sessionId } });
  if (!game)                  return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (game.userId !== userId) return NextResponse.json({ error: "Not your game" },     { status: 403 });

  // Must have been completed by /validate — we award nothing here
  if (!game.completed || !game.savedAt || game.xpEarned === null)
    return NextResponse.json({ error: "Game not completed" }, { status: 403 });

  return NextResponse.json({
    success:    true,
    completed:  true,
    wordsFound: (JSON.parse(game.foundWords) as string[]).length,
    totalWords: game.totalWords,
    xpEarned:   game.xpEarned,
  });
}
