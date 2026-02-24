/**
 * POST /api/games/space-shooter/start
 * Creates a server-side space shooter session. Returns sessionId only.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// ── In-memory rate limiter ────────────────────────────────────────────────────
const _rateMap = new Map<string, { count: number; ts: number }>();
function rateOk(userId: string) {
  const now = Date.now(), e = _rateMap.get(userId);
  if (!e || now - e.ts > 60_000) { _rateMap.set(userId, { count: 1, ts: now }); return true; }
  if (e.count >= 30) return false;
  e.count++; return true;
}

export async function POST(_req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id as string;
  if (!rateOk(userId)) return NextResponse.json({ error: "Too many starts" }, { status: 429 });

  // Clean up orphaned sessions older than 2 hours
  await db.spaceShooterSession.deleteMany({
    where: { userId, startedAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
  }).catch(() => {});

  const shooterSession = await db.spaceShooterSession.create({
    data: { userId },
  });

  return NextResponse.json({ success: true, sessionId: shooterSession.id });
}
