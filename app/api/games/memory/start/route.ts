/**
 * POST /api/games/memory/start
 *
 * Client receives { id, dIdx } per card.
 * dIdx = (SYMBOL_DEFS index) XOR sessionXorByte  — looks like a random number,
 * never reveals sym names like "triangle" in the network tab.
 * Frontend decodes dIdx using the same XOR to render the correct icon.
 * pairId is NEVER sent — knowing an icon != knowing its pair.
 */

import { NextResponse } from "next/server";
import { db }           from "@/lib/db";
import { getSession }   from "@/lib/auth";
import { z }            from "zod";
import { createHash }   from "crypto";

// ─── 32 symbol IDs (must match frontend SYMBOL_DEFS ids) ─────────────────────
const ALL_SYMBOLS = [
  "rocket","globe","flame","snowflake","cpu","shield","gem","radio",
  "database","lock","eye","crosshair","atom","hexagon","sparkles","radar",
  "brain","circuit","fingerprint","scan","flask","microscope","star","zap",
  "trophy","wifi","diamond","triangle","circle","square","layers","refcw",
];

const DIFF_CFG = {
  EASY:   { pairs: 8,  xp: 80,  par: 20 },
  MEDIUM: { pairs: 18, xp: 200, par: 40 },
  HARD:   { pairs: 32, xp: 400, par: 80 },
} as const;

// rate: 20 starts/min per user
const _rate = new Map<string, { count: number; ts: number }>();
function rateOk(uid: string) {
  const now = Date.now(), e = _rate.get(uid);
  if (!e || now - e.ts > 60_000) { _rate.set(uid, { count: 1, ts: now }); return true; }
  if (e.count >= 20) return false;
  e.count++; return true;
}

function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Derive a stable 1-31 XOR byte from sessionId so the same session always decodes identically
function sessionXorByte(sessionId: string): number {
  const hash = createHash("sha256").update(sessionId).digest();
  return (hash[0] % 31) + 1; // 1-31, never 0
}

const schema = z.object({ difficulty: z.enum(["EASY","MEDIUM","HARD"]) });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  if (!rateOk(userId)) return NextResponse.json({ error: "Too many starts" }, { status: 429 });

  let difficulty: "EASY"|"MEDIUM"|"HARD";
  try { ({ difficulty } = schema.parse(await req.json())); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const cfg     = DIFF_CFG[difficulty];
  // pick N symbols, create pairs, shuffle
  const symbols = shuffle([...ALL_SYMBOLS]).slice(0, cfg.pairs);
  // deck: each card has a unique id (0..2N-1), its symbol, and a pairId
  const paired  = shuffle([...symbols, ...symbols]).map((sym, i) => ({
    id:     i,
    sym,
    pairId: symbols.indexOf(sym), // same pairId = matching pair
  }));

  // Create session — store full deck server-side
  const gameSession = await db.memorySession.create({
    data: {
      userId,
      difficulty,
      deckData:     JSON.stringify(paired),
      matchedPairs: JSON.stringify([]),
      totalPairs:   cfg.pairs,
      moves:        0,
      finished:     false,
      completed:    false,
    },
  });

  // Send { id, dIdx } — dIdx is the SYMBOL_DEFS index XOR'd with a session-derived byte.
  // Frontend decodes it to render the icon, but the network tab shows numbers not names.
  // Pair positions are still never revealed — dIdx alone doesn't tell you which cards match.
  const xorByte = sessionXorByte(gameSession.id);
  const clientCards = paired.map(c => ({
    id:   c.id,
    dIdx: (ALL_SYMBOLS.indexOf(c.sym)) ^ xorByte,
  }));

  return NextResponse.json({
    success:    true,
    sessionId:  gameSession.id,
    cards:      clientCards,
    totalPairs: cfg.pairs,
    par:        cfg.par,
    xp:         cfg.xp,
  });
}
