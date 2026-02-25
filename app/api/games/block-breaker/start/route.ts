/**
 * POST /api/games/block-breaker/start
 * 
 * Creates a Block Breaker game session with player-selected extras.
 * Security pattern matching Snake/Memory/TicTacToe:
 *   - Uses getSession() for authentication
 *   - Rate limiting (30 starts per minute)
 *   - Validates extras configuration
 *   - Cleans up old sessions (>2h)
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

// ── Rate limiter ───────────────────────────────────────────────────────────────
const _rateMap = new Map<string, { count: number; ts: number }>();
function rateOk(userId: string) {
  const now = Date.now(), e = _rateMap.get(userId);
  if (!e || now - e.ts > 60_000) { _rateMap.set(userId, { count: 1, ts: now }); return true; }
  if (e.count >= 30) return false;
  e.count++; return true;
}

const schema = z.object({
  paddleSize: z.enum(["NORMAL", "LARGE", "XL"]),
  extraBalls: z.number().int().min(0).max(5),
  hasGun: z.boolean(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id as string;
  if (!rateOk(userId)) return NextResponse.json({ error: "Too many starts" }, { status: 429 });

  let config: z.infer<typeof schema>;
  try {
    config = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Clean up sessions older than 2 hours
  await db.blockBreakerSession.deleteMany({
    where: {
      userId,
      createdAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    },
  }).catch(() => {/* silent cleanup */});

  const blockSession = await db.blockBreakerSession.create({
    data: {
      userId,
      paddleSize: config.paddleSize,
      extraBalls: config.extraBalls,
      hasGun: config.hasGun,
      level: 1,
      score: 0,
      lives: 3 + config.extraBalls, // base 3 lives + extras
      blocksDestroyed: 0,
      startedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, sessionId: blockSession.id });
}
