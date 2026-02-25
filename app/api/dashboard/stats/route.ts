import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// ─── Score constants (must match game-utils.ts) ───────────────────────────────
const TTT_MAX   = 500;  // Hard WIN
const WS_MAX_XP = 350;  // Hard COMPLETE xp
const MEM_MAX   = 400;  // Hard COMPLETE xp (used as score proxy)
const PAC_MAX   = 5000; // Reasonable high Pacman score benchmark

/**
 * SKILL-BASED Player Rating (0–100)
 */
function calcRating(data: {
  ttt:    { result: string; difficulty: string }[];
  ws:     { completed: boolean; difficulty: string; wordsFound: number; totalWords: number }[];
  mem:    { moves: number; matched: number }[];
  pacman: { score: number }[];
}): number {
  const pillars: number[] = [];

  // ── TTT pillar ──
  if (data.ttt.length > 0) {
    const POINTS: Record<string, Record<string, number>> = {
      WIN:  { HARD: 3, MEDIUM: 2, EASY: 1 },
      DRAW: { HARD: 1, MEDIUM: 0.5, EASY: 0.2 },
      LOSE: { HARD: 0, MEDIUM: 0, EASY: 0 },
    };
    const earned = data.ttt.reduce((sum, g) => sum + (POINTS[g.result]?.[g.difficulty] ?? 0), 0);
    const maxPossible = data.ttt.length * 3;
    pillars.push(Math.min(earned / maxPossible, 1) * 25);
  }

  // ── Word Search pillar ──
  if (data.ws.length > 0) {
    const DIFF_WT: Record<string, number> = { HARD: 1, MEDIUM: 0.6, EASY: 0.3 };
    const earned = data.ws.reduce((sum, g) => {
      const wt = DIFF_WT[g.difficulty] ?? 0.3;
      const completionRatio = g.totalWords > 0 ? g.wordsFound / g.totalWords : 0;
      const credit = g.completed ? 1 : completionRatio * 0.5;
      return sum + credit * wt;
    }, 0);
    const maxPossible = data.ws.length * 1;
    pillars.push(Math.min(earned / maxPossible, 1) * 25);
  }

  // ── Memory pillar ──
  if (data.mem.length > 0) {
    const efficiencies = data.mem.map(g => {
      if (g.moves === 0) return 0;
      const perfect = g.matched * 2;
      const efficiency = Math.min(perfect / g.moves, 1);
      return efficiency;
    });
    const avgEff = efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length;
    pillars.push(avgEff * 25);
  }

  // ── Pac-Man pillar ──
  if (data.pacman.length > 0) {
    const avgScore = data.pacman.reduce((s, g) => s + g.score, 0) / data.pacman.length;
    pillars.push(Math.min(avgScore / PAC_MAX, 1) * 25);
  }

  if (pillars.length === 0) return 0;

  const activePillars = pillars.length;
  const rawSum = pillars.reduce((a, b) => a + b, 0);
  const rating = Math.round((rawSum / (activePillars * 25)) * 100);
  return Math.min(100, Math.max(1, rating));
}

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  try {
    const [
      // ── Recent games (5 each for dashboard cards) ──
      tttGames,
      wsGames,
      memGames,
      pacGames,
      snakeGames,
      ssGames,
      cdGames,

      // ── All games for rating calculation ──
      allTtt,
      allWs,
      allMem,
      allPac,

      // ── Aggregate durations ──
      tttDur,
      wsDur,
      memDur,
      pacDur,
      snakeDur,
      ssDur,
      cdDur,

      // ── Total counts ──
      tttCount,
      wsCount,
      memCount,
      pacCount,
      snakeCount,
      ssCount,
      cdCount,

      // ── Total XP ──
      xpRow,
    ] = await Promise.all([
      // Recent games
      db.ticTacToeGame.findMany({    where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.wordSearchGame.findMany({   where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.memoryGame.findMany({       where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.pacmanGame.findMany({       where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.snakeGame.findMany({        where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.spaceShooterGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.connectDotsGame.findMany({  where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),

      // All games for rating
      db.ticTacToeGame.findMany({  where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { result: true, difficulty: true } }),
      db.wordSearchGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { completed: true, difficulty: true, wordsFound: true, totalWords: true } }),
      db.memoryGame.findMany({     where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { moves: true, matched: true } }),
      db.pacmanGame.findMany({     where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { score: true } }),

      // Durations
      db.ticTacToeGame.aggregate({    where: { userId }, _sum: { duration: true } }),
      db.wordSearchGame.aggregate({   where: { userId }, _sum: { duration: true } }),
      db.memoryGame.aggregate({       where: { userId }, _sum: { duration: true } }),
      db.pacmanGame.aggregate({       where: { userId }, _sum: { duration: true } }),
      db.snakeGame.aggregate({        where: { userId }, _sum: { survivalTime: true } }),
      db.spaceShooterGame.aggregate({ where: { userId }, _sum: { survivalTime: true } }),
      db.connectDotsGame.aggregate({  where: { userId }, _sum: { duration: true } }),

      // Counts
      db.ticTacToeGame.count({    where: { userId } }),
      db.wordSearchGame.count({   where: { userId } }),
      db.memoryGame.count({       where: { userId } }),
      db.pacmanGame.count({       where: { userId } }),
      db.snakeGame.count({        where: { userId } }),
      db.spaceShooterGame.count({ where: { userId } }),
      db.connectDotsGame.count({  where: { userId } }),

      // XP
      db.userLevel.findUnique({ where: { userId }, select: { xp: true } }),
    ]);

    const totalSeconds =
      (tttDur._sum.duration    ?? 0) +
      (wsDur._sum.duration     ?? 0) +
      (memDur._sum.duration    ?? 0) +
      (pacDur._sum.duration    ?? 0) +
      (snakeDur._sum.survivalTime ?? 0) +
      (ssDur._sum.survivalTime    ?? 0) +
      (cdDur._sum.duration     ?? 0);

    const totalGames = tttCount + wsCount + memCount + pacCount + snakeCount + ssCount + cdCount;
    const totalXp    = xpRow?.xp ?? 0;

    const rating = calcRating({
      ttt:    allTtt,
      ws:     allWs,
      mem:    allMem,
      pacman: allPac,
    });

    const totalMinutes  = Math.floor(totalSeconds / 60);
    const hours         = Math.floor(totalMinutes / 60);
    const minutes       = totalMinutes % 60;
    const playTimeLabel = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return NextResponse.json({
      success: true,
      stats: {
        totalGames,
        totalSeconds,
        playTimeLabel,
        rating,
        totalXp,
      },
      recentGames: {
        ticTacToe:   tttGames,
        wordSearch:  wsGames,
        memory:      memGames,
        pacman:      pacGames,
        snake:       snakeGames,
        spaceShooter: ssGames,
        connectDots: cdGames,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
