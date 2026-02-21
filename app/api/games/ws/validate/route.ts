/**
 * POST /api/games/ws/validate
 *
 * Client sends a word it thinks it found, along with the cell coordinates.
 * Server validates against its authoritative grid + placement data.
 *
 * Request: {
 *   sessionId: string,
 *   word:      string,
 *   cells:     [number, number][]   ← [row, col] pairs in order
 * }
 *
 * Response: {
 *   success: true,
 *   valid:   boolean,
 *   word:    string,
 *   foundCount:  number,   ← total found so far
 *   totalWords:  number,
 *   completed:   boolean,  ← true when all words found
 * }
 *
 * Security:
 *  - Requires valid session cookie
 *  - Server re-validates cell coordinates against its own placement data
 *  - Client cannot claim a word it didn't actually select correctly
 *  - Duplicate finds are silently rejected (valid: false)
 *
 * NOTE: No XP is awarded here. XP is only awarded on /ws/finish when
 *       the game is completed (all words found).
 */

import { NextResponse }       from "next/server";
import { db }                 from "@/lib/db";
import { getSession }         from "@/lib/auth";
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

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { sessionId, word, cells } = body;

  // ── Load session ──────────────────────────────────────────────────────────
  const game = await db.wordSearchSession.findUnique({ where: { id: sessionId } });
  if (!game)                           return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (game.userId !== session.user.id) return NextResponse.json({ error: "Not your game" }, { status: 403 });
  if (game.finished)                   return NextResponse.json({ error: "Game already finished" }, { status: 409 });

  const placed:      PlacedWord[] = JSON.parse(game.placedWords);
  const foundWords:  string[]     = JSON.parse(game.foundWords);
  const alreadyFound = new Set(foundWords);

  // ── Validate the claim ────────────────────────────────────────────────────
  const match = validateWordClaim(word, cells as [number, number][], placed, alreadyFound);

  if (!match) {
    // Invalid find — don't update DB, just tell client
    return NextResponse.json({
      success:    true,
      valid:      false,
      word,
      foundCount: foundWords.length,
      totalWords: game.totalWords,
      completed:  false,
    });
  }

  // ── Valid find — update DB ────────────────────────────────────────────────
  const newFoundWords = [...foundWords, match.word];
  const completed     = newFoundWords.length === game.totalWords;

  await db.wordSearchSession.update({
    where: { id: sessionId },
    data:  {
      foundWords:  JSON.stringify(newFoundWords),
      completed,
      finished:    completed,
      finishedAt:  completed ? new Date() : undefined,
    },
  });

  return NextResponse.json({
    success:    true,
    valid:      true,
    word:       match.word,
    foundCount: newFoundWords.length,
    totalWords: game.totalWords,
    completed,
  });
}
