/**
 * POST /api/games/pacman/start
 *
 * Creates a PacmanSession row with an HMAC-signed token.
 * Token is passed to the iframe via ?token=xxx in the src URL.
 * The game JS reads it and embeds it in every pacman_game_over postMessage.
 * /finish validates the token before saving any score.
 */
import { NextResponse } from "next/server";
import { db }          from "@/lib/db";
import { getSession }  from "@/lib/auth";
import { createHmac }  from "crypto";

const SECRET = process.env.PACMAN_TOKEN_SECRET
  ?? process.env.NEXTAUTH_SECRET
  ?? "pacman-fallback-secret-change-me";

/** Build the HMAC token. Format: <sessionId>.<hex-sig> */
export function buildToken(sessionId: string, userId: string, ts: number): string {
  const sig = createHmac("sha256", SECRET)
    .update(`${sessionId}:${userId}:${ts}`)
    .digest("hex");
  return `${sessionId}.${sig}`;
}

// Rate limit: max 10 game starts per user per minute
const _rate = new Map<string, { n: number; ts: number }>();
function rateOk(userId: string): boolean {
  const now = Date.now(), e = _rate.get(userId);
  if (!e || now - e.ts > 60_000) { _rate.set(userId, { n: 1, ts: now }); return true; }
  if (e.n >= 10) return false;
  e.n++;
  return true;
}

export async function POST(_req: Request) {
  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  if (!rateOk(userId))
    return NextResponse.json({ error: "Too many starts" }, { status: 429 });

  const now       = new Date();
  const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2h window

  // Cleanup old expired sessions (housekeeping, non-blocking)
  db.pacmanSession.deleteMany({ where: { expiresAt: { lt: now } } }).catch(() => {});

  // Create the session row first to get the DB-generated id
  const row = await db.pacmanSession.create({
    data: { userId, token: "__pending__", startedAt: now, expiresAt },
  });

  const token = buildToken(row.id, userId, now.getTime());

  await db.pacmanSession.update({ where: { id: row.id }, data: { token } });

  return NextResponse.json({ success: true, sessionId: row.id, token });
}
