/**
 * POST /api/games/memory/finish
 *
 * READ-ONLY — just confirms the game was completed and returns stored results.
 * ALL score/XP calculation and DB writes happen in /flip when the last pair is matched.
 *
 * This route cannot award anything on its own:
 *  - If savedAt is null  → game was never completed via /flip → 403
 *  - If completed false  → same → 403
 *  - Otherwise           → return score + xpEarned already stored in session
 *
 * So hitting this directly without playing does absolutely nothing.
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

  // ── Load session ──────────────────────────────────────────────────────────
  const game = await db.memorySession.findUnique({ where: { id: sessionId } });
  if (!game)                  return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (game.userId !== userId) return NextResponse.json({ error: "Not your game" },     { status: 403 });

  // ── Must have been completed by /flip — we do not award anything here ─────
  if (!game.completed || !game.savedAt || game.score === null)
    return NextResponse.json({ error: "Game not completed" }, { status: 403 });

  // ── Just return what /flip already calculated and saved ───────────────────
  return NextResponse.json({
    success:   true,
    completed: true,
    score:     game.score,
    xpEarned:  game.xpEarned ?? 0,
    moves:     game.moves,
    matched:   (JSON.parse(game.matchedPairs) as number[]).length,
  });
}
