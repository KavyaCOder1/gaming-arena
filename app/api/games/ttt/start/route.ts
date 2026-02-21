/**
 * POST /api/games/ttt/start
 * Creates a server-side game session. Returns sessionId only.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const _rateMap = new Map<string, { count: number; ts: number }>();
function rateOk(userId: string) {
  const now = Date.now(), e = _rateMap.get(userId);
  if (!e || now - e.ts > 60_000) { _rateMap.set(userId, { count: 1, ts: now }); return true; }
  if (e.count >= 30) return false;
  e.count++; return true;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateOk(session.user.id)) return NextResponse.json({ error: "Too many starts" }, { status: 429 });

  let difficulty: "EASY" | "MEDIUM" | "HARD";
  try {
    const body = await req.json();
    ({ difficulty } = z.object({ difficulty: z.enum(["EASY","MEDIUM","HARD"]) }).parse(body));
  } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const game = await db.ticTacToeSession.create({
    data: {
      userId:     session.user.id,
      difficulty,
      board:      JSON.stringify(Array(9).fill(null)),
      finished:   false,
    },
  });

  return NextResponse.json({ success: true, sessionId: game.id });
}
