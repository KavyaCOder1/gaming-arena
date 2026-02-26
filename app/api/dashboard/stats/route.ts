import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// ─── Score benchmarks ─────────────────────────────────────────────────────────
const PAC_MAX = 5000;   // Pac-Man avg score → full pillar
const SNAKE_MAX = 3000;   // Snake avg score → full pillar
const SS_MAX = 8000;   // Space Shooter avg score → full pillar
const BB_MAX_LEVEL = 10;     // Block Breaker max level
const BB_MAX_SCORE = 50000;  // Block Breaker benchmark score

/**
 * SKILL-BASED Player Rating (0–100)
 * Each game played contributes one pillar (0–100).
 * Final rating = average of all active pillars, rounded to nearest integer.
 */
function calcRating(data: {
  ttt: { result: string; difficulty: string }[];
  ws: { completed: boolean; difficulty: string; wordsFound: number; totalWords: number }[];
  mem: { moves: number; matched: number }[];
  pacman: { score: number }[];
  snake: { score: number; difficulty: string }[];
  ss: { score: number }[];
  cd: { difficulty: string; moves: number; dotsCount: number }[];
  bb: { level: number; score: number; blocksDestroyed: number }[];
}): number {
  const pillars: number[] = [];

  // ── 1. Tic-Tac-Toe ─ win quality by difficulty ──
  if (data.ttt.length > 0) {
    const POINTS: Record<string, Record<string, number>> = {
      WIN: { HARD: 3, MEDIUM: 2, EASY: 1 },
      DRAW: { HARD: 1, MEDIUM: 0.5, EASY: 0.2 },
      LOSE: { HARD: 0, MEDIUM: 0, EASY: 0 },
    };
    const earned = data.ttt.reduce((sum, g) => sum + (POINTS[g.result]?.[g.difficulty] ?? 0), 0);
    pillars.push(Math.min(earned / (data.ttt.length * 3), 1) * 100);
  }

  // ── 2. Word Search ─ completion × difficulty weight ──
  if (data.ws.length > 0) {
    const DIFF_WT: Record<string, number> = { HARD: 1, MEDIUM: 0.6, EASY: 0.3 };
    const earned = data.ws.reduce((sum, g) => {
      const wt = DIFF_WT[g.difficulty] ?? 0.3;
      const ratio = g.totalWords > 0 ? g.wordsFound / g.totalWords : 0;
      return sum + (g.completed ? 1 : ratio * 0.5) * wt;
    }, 0);
    pillars.push(Math.min(earned / data.ws.length, 1) * 100);
  }

  // ── 3. Memory ─ flip efficiency ──
  if (data.mem.length > 0) {
    const avgEff = data.mem.reduce((sum, g) => {
      if (g.moves === 0) return sum;
      return sum + Math.min((g.matched * 2) / g.moves, 1);
    }, 0) / data.mem.length;
    pillars.push(avgEff * 100);
  }

  // ── 4. Pac-Man ─ avg score vs benchmark ──
  if (data.pacman.length > 0) {
    const avg = data.pacman.reduce((s, g) => s + g.score, 0) / data.pacman.length;
    pillars.push(Math.min(avg / PAC_MAX, 1) * 100);
  }

  // ── 5. Snake ─ avg score weighted by difficulty ──
  if (data.snake.length > 0) {
    const DIFF_WT: Record<string, number> = { HARD: 1, MEDIUM: 0.6, EASY: 0.3 };
    const weightedScores = data.snake.map(g => (g.score / SNAKE_MAX) * (DIFF_WT[g.difficulty] ?? 0.5));
    const avg = weightedScores.reduce((a, b) => a + b, 0) / data.snake.length;
    pillars.push(Math.min(avg, 1) * 100);
  }

  // ── 6. Space Shooter ─ avg score vs benchmark ──
  if (data.ss.length > 0) {
    const avg = data.ss.reduce((s, g) => s + g.score, 0) / data.ss.length;
    pillars.push(Math.min(avg / SS_MAX, 1) * 100);
  }

  // ── 7. Connect the Dots ─ move efficiency by difficulty ──
  if (data.cd.length > 0) {
    const DIFF_WT: Record<string, number> = { HARD: 1, MEDIUM: 0.6, EASY: 0.3 };
    const scores = data.cd.map(g => {
      const wt = DIFF_WT[g.difficulty] ?? 0.5;
      const perfect = g.dotsCount; // minimum moves = number of dot pairs
      const eff = g.moves > 0 ? Math.min(perfect / g.moves, 1) : 0;
      return eff * wt;
    });
    const avg = scores.reduce((a, b) => a + b, 0) / data.cd.length;
    pillars.push(Math.min(avg, 1) * 100);
  }

  // ── 8. Block Breaker ─ composite: level reached + score ──
  if (data.bb.length > 0) {
    const scores = data.bb.map(g => {
      const levelScore = g.level / BB_MAX_LEVEL;
      const scoreScore = Math.min(g.score / BB_MAX_SCORE, 1);
      return (levelScore * 0.5) + (scoreScore * 0.5);
    });
    const avg = scores.reduce((a, b) => a + b, 0) / data.bb.length;
    pillars.push(Math.min(avg, 1) * 100);
  }

  if (pillars.length === 0) return 0;
  const rating = Math.round(pillars.reduce((a, b) => a + b, 0) / pillars.length);
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
      bbGames,

      // ── All games for rating calculation ──
      allTtt,
      allWs,
      allMem,
      allPac,
      allSnake,
      allSs,
      allCd,
      allBb,

      // ── Aggregate durations ──
      tttDur,
      wsDur,
      memDur,
      pacDur,
      snakeDur,
      ssDur,
      cdDur,
      bbDur,

      // ── Total counts ──
      tttCount,
      wsCount,
      memCount,
      pacCount,
      snakeCount,
      ssCount,
      cdCount,
      bbCount,

      // ── Total XP ──
      xpRow,
    ] = await Promise.all([
      // Recent games
      db.ticTacToeGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.wordSearchGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.memoryGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.pacmanGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.snakeGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.spaceShooterGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.connectDotsGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
      db.blockBreakerGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, level: true, score: true, blocksDestroyed: true, duration: true, xpEarned: true } }),

      // All games for rating
      db.ticTacToeGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { result: true, difficulty: true } }),
      db.wordSearchGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { completed: true, difficulty: true, wordsFound: true, totalWords: true } }),
      db.memoryGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { moves: true, matched: true } }),
      db.pacmanGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { score: true } }),
      db.snakeGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { score: true, difficulty: true } }),
      db.spaceShooterGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { score: true } }),
      db.connectDotsGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { difficulty: true, moves: true, dotsCount: true } }),
      db.blockBreakerGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { level: true, score: true, blocksDestroyed: true } }),

      // Durations
      db.ticTacToeGame.aggregate({ where: { userId }, _sum: { duration: true } }),
      db.wordSearchGame.aggregate({ where: { userId }, _sum: { duration: true } }),
      db.memoryGame.aggregate({ where: { userId }, _sum: { duration: true } }),
      db.pacmanGame.aggregate({ where: { userId }, _sum: { duration: true } }),
      db.snakeGame.aggregate({ where: { userId }, _sum: { survivalTime: true } }),
      db.spaceShooterGame.aggregate({ where: { userId }, _sum: { survivalTime: true } }),
      db.connectDotsGame.aggregate({ where: { userId }, _sum: { duration: true } }),
      db.blockBreakerGame.aggregate({ where: { userId }, _sum: { duration: true } }),

      // Counts
      db.ticTacToeGame.count({ where: { userId } }),
      db.wordSearchGame.count({ where: { userId } }),
      db.memoryGame.count({ where: { userId } }),
      db.pacmanGame.count({ where: { userId } }),
      db.snakeGame.count({ where: { userId } }),
      db.spaceShooterGame.count({ where: { userId } }),
      db.connectDotsGame.count({ where: { userId } }),
      db.blockBreakerGame.count({ where: { userId } }),

      // XP
      db.userLevel.findUnique({ where: { userId }, select: { xp: true } }),
    ] as const);

    const totalSeconds =
      (tttDur._sum.duration ?? 0) +
      (wsDur._sum.duration ?? 0) +
      (memDur._sum.duration ?? 0) +
      (pacDur._sum.duration ?? 0) +
      (snakeDur._sum.survivalTime ?? 0) +
      (ssDur._sum.survivalTime ?? 0) +
      (cdDur._sum.duration ?? 0) +
      (bbDur._sum.duration ?? 0);

    const totalGames = tttCount + wsCount + memCount + pacCount + snakeCount + ssCount + cdCount + bbCount;
    const totalXp = xpRow?.xp ?? 0;

    const rating = calcRating({
      ttt: allTtt,
      ws: allWs,
      mem: allMem,
      pacman: allPac,
      snake: allSnake,
      ss: allSs,
      cd: allCd,
      bb: allBb,
    });

    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
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
        ticTacToe: tttGames,
        wordSearch: wsGames,
        memory: memGames,
        pacman: pacGames,
        snake: snakeGames,
        spaceShooter: ssGames,
        connectDots: cdGames,
        blockBreaker: bbGames,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}