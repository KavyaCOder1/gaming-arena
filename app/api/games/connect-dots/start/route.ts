/**
 * POST /api/games/connect-dots/start
 * No time limit — server just records the session for anti-cheat.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const _rateMap = new Map<string, { count: number; ts: number }>();
function rateOk(userId: string) {
  const now = Date.now();
  const e = _rateMap.get(userId);
  if (!e || now - e.ts > 60_000) { _rateMap.set(userId, { count: 1, ts: now }); return true; }
  if (e.count >= 30) return false;
  e.count++; return true;
}

const bodySchema = z.object({ difficulty: z.enum(["EASY", "MEDIUM", "HARD"]) });

const DIFF_CFG = {
  EASY:   { gridSize: 5, pairMin: 4, pairMax: 5  },
  MEDIUM: { gridSize: 7, pairMin: 5, pairMax: 7  },
  HARD:   { gridSize: 9, pairMin: 7, pairMax: 9  },
} as const;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id as string;
  if (!rateOk(userId)) return NextResponse.json({ error: "Too many starts" }, { status: 429 });

  let payload: z.infer<typeof bodySchema>;
  try { payload = bodySchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const { difficulty } = payload;
  const cfg = DIFF_CFG[difficulty];
  const dotsCount = cfg.pairMin + Math.floor(Math.random() * (cfg.pairMax - cfg.pairMin + 1));

  // Cleanup old sessions
  await db.connectDotsSession.deleteMany({
    where: { userId, createdAt: { lt: new Date(Date.now() - 4 * 60 * 60 * 1000) } },
  }).catch(() => {});

  const sessionRow = await db.connectDotsSession.create({
    data: {
      userId,
      difficulty,
      dotsCount,
      timeLimitSeconds: 7200, // stored but not enforced — just a DB field ceiling
    },
  });

  return NextResponse.json({
    success: true,
    sessionId: sessionRow.id,
  });
}
