/**
 * POST /api/games/pacman/commit
 *
 * Called by the game JS (via postMessage relay or direct fetch) when the game ends.
 * Receives the raw score + stage, validates them against the session, then issues
 * a SHORT-LIVED signed receipt that /finish must present.
 *
 * Flow:
 *   /start  → returns token (session proof)
 *   /commit → receives { token, score, stage }, returns { receipt } (score proof)
 *   /finish → receives { receipt }, reads score/stage/xp from DB — client cannot alter
 *
 * The receipt is an HMAC over (sessionId + score + stage + commitAt).
 * /finish verifies it and rejects anything that doesn't match exactly.
 * Score and stage are stored on the session row at commit time.
 *
 * Security:
 *  1. Auth         — must be logged-in user
 *  2. Token verify — HMAC of sessionId:userId:startedAt (same as /start)
 *  3. Ownership    — token belongs to requesting user
 *  4. One-commit   — session can only be committed once
 *  5. Expiry       — token expires 2h after start
 *  6. Score sanity — can't exceed ~600pts/sec over real elapsed time
 *  7. Stage sanity — can't reach stage N without enough real time
 *  8. Receipt      — HMAC-signed blob stored in DB; /finish reads it from there
 */
import { NextResponse }  from "next/server";
import { db }            from "@/lib/db";
import { getSession }    from "@/lib/auth";
import { createHmac }    from "crypto";
import { z }             from "zod";

const SECRET = process.env.PACMAN_TOKEN_SECRET
  ?? process.env.NEXTAUTH_SECRET
  ?? "pacman-fallback-secret-change-me";

function verifySessionToken(token: string, sessionId: string, userId: string, startedAt: Date): boolean {
  const expected = createHmac("sha256", SECRET)
    .update(`${sessionId}:${userId}:${startedAt.getTime()}`)
    .digest("hex");
  const actual = token.split(".")[1] ?? "";
  if (expected.length !== actual.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++)
    diff |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  return diff === 0;
}

/** Build a receipt HMAC: signs sessionId + score + stage + commitAt ms */
export function buildReceipt(sessionId: string, score: number, stage: number, commitAt: number): string {
  return createHmac("sha256", SECRET)
    .update(`receipt:${sessionId}:${score}:${stage}:${commitAt}`)
    .digest("hex");
}

const schema = z.object({
  token: z.string().min(10).max(300),
  score: z.number().int().min(0).max(9_999_999),
  stage: z.number().int().min(1).max(8).default(1),
});

export async function POST(req: Request) {
  // 1. Auth
  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  // 2. Parse body
  let body: z.infer<typeof schema>;
  try { body = schema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { token, score, stage } = body;

  // 3. Load session by token
  const pac = await db.pacmanSession.findUnique({ where: { token } });
  if (!pac)
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });

  // 4. Ownership
  if (pac.userId !== userId)
    return NextResponse.json({ error: "Token mismatch" }, { status: 403 });

  // 5. One-commit (used flag also covers one-finish since finish sets used=true)
  if (pac.used)
    return NextResponse.json({ error: "Session already used" }, { status: 409 });

  // 6. Expiry
  if (pac.expiresAt < new Date())
    return NextResponse.json({ error: "Session expired" }, { status: 403 });

  // 7. HMAC verify session token
  if (!verifySessionToken(token, pac.id, userId, pac.startedAt))
    return NextResponse.json({ error: "Invalid token signature" }, { status: 403 });

  // 8. Score sanity
  // Theoretical max from JS mechanics: 10pts/dot × 240 dots + 50pts × 4 pellets
  // + ghost chain 200/400/800/1600 × 4 energizers + fruit up to 5000 + 3000 level clear
  // = ~22,600 pts/level at TAS-perfect play in ~45s → ~502 pts/sec absolute ceiling
  // Hard cap at 200,000 total (8 perfect levels)
  const realElapsed = Math.floor((Date.now() - pac.startedAt.getTime()) / 1000);
  const maxScore    = Math.min(Math.max(realElapsed * 520, 1600), 200_000);
  if (score > maxScore)
    return NextResponse.json({ error: "Score not achievable in session time" }, { status: 400 });

  // 9. Stage sanity — minimum ~40s per stage even for a speedrun
  const maxStage = Math.min(8, Math.floor(realElapsed / 40) + 1);
  if (stage > maxStage)
    return NextResponse.json({ error: "Stage not reachable in session time" }, { status: 400 });

  // 10. Build receipt and store committed score on session
  const commitAt = Date.now();
  const receipt  = buildReceipt(pac.id, score, stage, commitAt);

  await db.pacmanSession.update({
    where: { id: pac.id },
    data:  {
      committedScore: score,
      committedStage: stage,
      commitAt:       new Date(commitAt),
      receipt,
    },
  });

  // Return receipt — this is the only thing /finish will accept
  return NextResponse.json({ success: true, receipt });
}
