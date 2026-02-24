/**
 * POST /api/games/snake/start
 * Creates a server-side snake session. Returns sessionId only.
 * Mirrors the TTT/Memory/WordSearch security pattern:
 *   - Uses getSession() (cookie "session") instead of raw JWT "auth" cookie
 *   - Validates difficulty as enum via zod
 *   - Rate-limits: 30 starts per user per minute
 *   - Cleans up stuck sessions older than 2h (prevent session flooding)
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

// ── In-memory rate limiter (same pattern as ttt/start) ────────────────────────
const _rateMap = new Map<string, { count: number; ts: number }>();
function rateOk(userId: string) {
  const now = Date.now(), e = _rateMap.get(userId);
  if (!e || now - e.ts > 60_000) { _rateMap.set(userId, { count: 1, ts: now }); return true; }
  if (e.count >= 30) return false;
  e.count++; return true;
}

const schema = z.object({
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id as string;
  if (!rateOk(userId)) return NextResponse.json({ error: "Too many starts" }, { status: 429 });

  let difficulty: "EASY" | "MEDIUM" | "HARD";
  try {
    ({ difficulty } = schema.parse(await req.json()));
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Clean up orphaned sessions older than 2 hours for this user
  await db.snakeSession.deleteMany({
    where: {
      userId,
      createdAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    },
  }).catch(() => {/* silent – cleanup is best-effort */});

  const snakeSession = await db.snakeSession.create({
    data: {
      userId,
      difficulty,            // now stored as EASY/MEDIUM/HARD (enum-like string)
      coresCollected: 0,
      survivalTime: 0,
      score: 0,
      snakeLength: 3,
      gameStartedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, sessionId: snakeSession.id });
}
