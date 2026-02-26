/**
 * POST /api/games/ws/start
 *
 * Server builds the grid. Client gets grid + word list only.
 * XP is earned ONLY on full completion — no per-word score.
 *
 * ┌──────────┬──────┬───────┬────────────────────────────────────────────┐
 * │ Diff     │ Grid │ Words │ Word lengths                               │
 * ├──────────┼──────┼───────┼────────────────────────────────────────────┤
 * │ EASY     │  5×5 │   4   │ 1×3  · 2×4  · 1×5                         │
 * │ MEDIUM   │  7×7 │   6   │ 2×3  · 1×4  · 2×5  · 1×7                  │
 * │ HARD     │ 10×10│   7   │ 1×3  · 2×4  · 2×5  · 2×(8-9) · 1×10       │
 * └──────────┴──────┴───────┴────────────────────────────────────────────┘
 *
 * XP rewards: EASY → 80 | MEDIUM → 180 | HARD → 350
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { pickWordsBySpec } from "@/lib/word-bank";
import { buildGrid } from "@/lib/word-grid";
import { z } from "zod";

// ── Per-difficulty config ─────────────────────────────────────────────────────
const DIFF_CFG = {
  EASY: {
    gridSize: 5,
    xpReward: 50,
    directions: "EASY",
    wordSpec: [
      { length: 3, count: 1 },
      { length: 4, count: 2 },
      { length: 5, count: 1 },
    ],
  },
  MEDIUM: {
    gridSize: 7,
    xpReward: 100,
    directions: "MEDIUM",
    wordSpec: [
      { length: 3, count: 2 },
      { length: 4, count: 1 },
      { length: 5, count: 2 },
      { length: 7, count: 1 },
    ],
  },
  HARD: {
    gridSize: 10,
    xpReward: 250,
    directions: "HARD",
    wordSpec: [
      { length: 3, count: 1 },
      { length: 4, count: 2 },
      { length: 5, count: 2 },
      { length: 9, altLength: 8, count: 2 },   // 2 words of 8-9 letters
      { length: 10, count: 1 },                  // 1 word of exactly 10 letters
    ],
  },
} as const;

// ── Rate limiter (30 starts/min per user) ─────────────────────────────────────
const _rateMap = new Map<string, { count: number; ts: number }>();
function rateOk(userId: string): boolean {
  const now = Date.now();
  const e = _rateMap.get(userId);
  if (!e || now - e.ts > 60_000) { _rateMap.set(userId, { count: 1, ts: now }); return true; }
  if (e.count >= 30) return false;
  e.count++;
  return true;
}

const schema = z.object({ difficulty: z.enum(["EASY", "MEDIUM", "HARD"]) });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateOk(session.user.id))
    return NextResponse.json({ error: "Too many starts" }, { status: 429 });

  let difficulty: "EASY" | "MEDIUM" | "HARD";
  try { ({ difficulty } = schema.parse(await req.json())); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const cfg = DIFF_CFG[difficulty];

  // ── Pick words + build grid (both server-side) ────────────────────────────
  const words = pickWordsBySpec([...cfg.wordSpec]);
  const { grid, placed } = buildGrid(cfg.directions, cfg.gridSize, words);
  const actualWords = placed.map(pw => pw.word);

  // ── Save session to DB ────────────────────────────────────────────────────
  const gameSession = await db.wordSearchSession.create({
    data: {
      userId: session.user.id,
      difficulty,
      gridSize: cfg.gridSize,
      gridData: JSON.stringify(grid),
      placedWords: JSON.stringify(placed),
      foundWords: JSON.stringify([]),
      totalWords: actualWords.length,
      finished: false,
      completed: false,
    },
  });

  return NextResponse.json({
    success: true,
    sessionId: gameSession.id,
    grid,
    words: actualWords,
    gridSize: cfg.gridSize,
    totalWords: actualWords.length,
    xpReward: cfg.xpReward,
  });
}
