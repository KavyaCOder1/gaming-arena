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
 *
 * Measures HOW WELL the player performs, not just how much they play.
 * Four independent skill scores are averaged (weighted by games played).
 *
 * ── Tic-Tac-Toe (0–25 pts)
 *   Win rate on Hard mode rewards true skill. Easy wins count less.
 *   formula: weighted_win_rate × 25
 *     • Hard win   = 3 pts,  Hard draw  = 1 pt
 *     • Medium win = 2 pts,  Medium draw = 0.5 pt
 *     • Easy win   = 1 pt
 *   Normalised against total TTT games played (max 3 pts/game).
 *
 * ── Word Search (0–25 pts)
 *   Completion rate × difficulty multiplier.
 *   Hard complete = full credit, Easy = partial.
 *
 * ── Memory (0–25 pts)
 *   Efficiency = matched pairs / moves used.
 *   Perfect efficiency (pairs == moves/2) = 100%. Penalised per extra move.
 *
 * ── Pac-Man (0–25 pts)
 *   Average score relative to benchmark (5 000 pts = full credit).
 *
 * If a player hasn’t played a game type, that pillar is EXCLUDED from the
 * average so it doesn’t punish new players.
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
    const maxPossible = data.ttt.length * 3; // 3 = Hard WIN
    pillars.push(Math.min(earned / maxPossible, 1) * 25);
  }

  // ── Word Search pillar ──
  if (data.ws.length > 0) {
    const DIFF_WT: Record<string, number> = { HARD: 1, MEDIUM: 0.6, EASY: 0.3 };
    const earned = data.ws.reduce((sum, g) => {
      const wt = DIFF_WT[g.difficulty] ?? 0.3;
      // Partial credit for finding words even if not completed
      const completionRatio = g.totalWords > 0 ? g.wordsFound / g.totalWords : 0;
      const credit = g.completed ? 1 : completionRatio * 0.5;
      return sum + credit * wt;
    }, 0);
    const maxPossible = data.ws.length * 1; // max wt = 1 (Hard complete)
    pillars.push(Math.min(earned / maxPossible, 1) * 25);
  }

  // ── Memory pillar ──
  if (data.mem.length > 0) {
    const efficiencies = data.mem.map(g => {
      if (g.moves === 0) return 0;
      // Perfect = each pair found in exactly 2 flips => moves = matched * 2
      const perfect = g.matched * 2;
      const efficiency = Math.min(perfect / g.moves, 1); // >1 impossible, <1 = wasted moves
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

  // Average only the pillars the player has actually played
  // Then scale back to 0–100
  const activePillars = pillars.length;
  const rawSum = pillars.reduce((a, b) => a + b, 0);
  // Each pillar is out of 25, so max possible = activePillars * 25
  // Scale to 100
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
      // recent games (5 each for dashboard)
      tttGames,
      wsGames,
      memGames,
      pacGames,
      snakeGames,
      ssGames,

      // ALL games needed for accurate rating calculation
      allTtt,
      allWs,
      allMem,
      allPac,

      // aggregate durations
      tttDur,
      wsDur,
      memDur,
      pacDur,
      snakeDur,
      ssDur,

      // total counts
      tttCount,
      wsCount,
      memCount,
      pacCount,
      snakeCount,
      ssCount,

      // total XP
      xpRow,
    ] = await Promise.all([
      // Dashboard recent (5 each)
      db.ticTacToeGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.wordSearchGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.memoryGame.findMany({    where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.pacmanGame.findMany({    where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.snakeGame.findMany({          where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.spaceShooterGame.findMany({    where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),

      // All games for rating (capped at last 50 for perf — recent form matters more)
      db.ticTacToeGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { result: true, difficulty: true } }),
      db.wordSearchGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { completed: true, difficulty: true, wordsFound: true, totalWords: true } }),
      db.memoryGame.findMany({    where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { moves: true, matched: true } }),
      db.pacmanGame.findMany({    where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { score: true } }),

      // Durations
      db.ticTacToeGame.aggregate({ where: { userId }, _sum: { duration: true } }),
      db.wordSearchGame.aggregate({ where: { userId }, _sum: { duration: true } }),
      db.memoryGame.aggregate({    where: { userId }, _sum: { duration: true } }),
      db.pacmanGame.aggregate({    where: { userId }, _sum: { duration: true } }),
      db.snakeGame.aggregate({          where: { userId }, _sum: { survivalTime: true } }),
      db.spaceShooterGame.aggregate({   where: { userId }, _sum: { survivalTime: true } }),

      // Counts
      db.ticTacToeGame.count({ where: { userId } }),
      db.wordSearchGame.count({ where: { userId } }),
      db.memoryGame.count({    where: { userId } }),
      db.pacmanGame.count({    where: { userId } }),
      db.snakeGame.count({         where: { userId } }),
      db.spaceShooterGame.count({  where: { userId } }),

      db.userLevel.findUnique({ where: { userId }, select: { xp: true } }),
    ]);

    const totalSeconds = (tttDur._sum.duration ?? 0)
      + (wsDur._sum.duration ?? 0)
      + (memDur._sum.duration ?? 0)
      + (pacDur._sum.duration ?? 0)
      + (snakeDur._sum.survivalTime ?? 0)
      + (ssDur._sum.survivalTime ?? 0);

    const totalGames = tttCount + wsCount + memCount + pacCount + snakeCount + ssCount;
    const totalXp    = xpRow?.xp ?? 0;

    const rating = calcRating({
      ttt:    allTtt,
      ws:     allWs,
      mem:    allMem,
      pacman: allPac,
    });

    // Format playtime
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
        ticTacToe:  tttGames,
        wordSearch: wsGames,
        memory:     memGames,
        pacman:     pacGames,
        snake:        snakeGames,
        spaceShooter: ssGames,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
