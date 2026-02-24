/**
 * POST /api/games/ttt/finish
 *
 * READ-ONLY — returns stored results. Awards nothing.
 * ALL score/XP calculation and DB writes happen in /move when the game ends.
 *
 * If savedAt is null or game not finished → never completed via /move → 403.
 * Hitting this directly without playing does absolutely nothing.
 */
import { NextResponse } from "next/server";
import { db }           from "@/lib/db";
import { getSession }   from "@/lib/auth";
import { z }            from "zod";

const schema = z.object({ sessionId: z.string().cuid() });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  let body: z.infer<typeof schema>;
  try { body = schema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const game = await db.ticTacToeSession.findUnique({ where: { id: body.sessionId } });
  if (!game)                  return NextResponse.json({ error: "Game not found" }, { status: 404 });
  if (game.userId !== userId) return NextResponse.json({ error: "Not your game" },   { status: 403 });

  // Must have been finished by /move — we award nothing here
  if (!game.finished || !game.savedAt || game.score === null)
    return NextResponse.json({ error: "Game not finished" }, { status: 403 });

  return NextResponse.json({
    success:   true,
    result:    game.result,
    score:     game.score,
    xpEarned:  game.xpEarned ?? 0,
  });
}
