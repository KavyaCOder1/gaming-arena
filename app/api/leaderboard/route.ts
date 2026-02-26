import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameType = searchParams.get("gameType"); // e.g. TIC_TAC_TOE | WORD_SEARCH | ALL

  try {
    // Aggregate total XP and matches per user for the given game type
    // We use TicTacToeGame / WordSearchGame tables to sum xpEarned and count matches
    if (gameType === "TIC_TAC_TOE") {
      const rows = await db.ticTacToeGame.groupBy({
        by: ["userId"],
        _sum: { xpEarned: true },
        _count: { id: true },
        orderBy: { _sum: { xpEarned: "desc" } },
        take: 20,
      });

      const userIds = rows.map((r) => r.userId);
      const users = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

      const data = rows
        .filter((r) => userMap[r.userId])
        .map((r) => ({
          user: userMap[r.userId],
          totalXp: r._sum.xpEarned ?? 0,
          matches: r._count.id,
        }));

      return NextResponse.json({ success: true, data });
    }

    if (gameType === "WORD_SEARCH") {
      const rows = await db.wordSearchGame.groupBy({
        by: ["userId"],
        _sum: { xpEarned: true },
        _count: { id: true },
        orderBy: { _sum: { xpEarned: "desc" } },
        take: 20,
      });

      const userIds = rows.map((r) => r.userId);
      const users = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

      const data = rows
        .filter((r) => userMap[r.userId])
        .map((r) => ({
          user: userMap[r.userId],
          totalXp: r._sum.xpEarned ?? 0,
          matches: r._count.id,
        }));

      return NextResponse.json({ success: true, data });
    }

    if (gameType === "MEMORY") {
      const rows = await db.memoryGame.groupBy({
        by: ["userId"],
        _sum: { xpEarned: true },
        _count: { id: true },
        orderBy: { _sum: { xpEarned: "desc" } },
        take: 20,
      });

      const userIds = rows.map((r) => r.userId);
      const users = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

      const data = rows
        .filter((r) => userMap[r.userId])
        .map((r) => ({
          user: userMap[r.userId],
          totalXp: r._sum.xpEarned ?? 0,
          matches: r._count.id,
        }));

      return NextResponse.json({ success: true, data });
    }

    if (gameType === "PACMAN") {
      // Best score per user from leaderboard table
      const rows = await db.leaderboard.findMany({
        where: { gameType: "PACMAN", difficulty: null },
        include: { user: { select: { id: true, username: true } } },
        orderBy: { highScore: "desc" },
        take: 20,
      });

      const data = rows.map(r => ({
        user: r.user,
        highScore: r.highScore,
        totalXp: r.highScore,
      }));

      return NextResponse.json({ success: true, data });
    }

    if (gameType === "SNAKE") {
      // Aggregate total XP earned + match count from SnakeGame records
      // (same pattern as TIC_TAC_TOE / MEMORY / WORD_SEARCH leaderboards)
      const rows = await db.snakeGame.groupBy({
        by: ["userId"],
        _sum: { xpEarned: true },
        _count: { id: true },
        orderBy: { _sum: { xpEarned: "desc" } },
        take: 20,
      });

      const userIds = rows.map((r) => r.userId);
      const users = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

      const data = rows
        .filter((r) => userMap[r.userId])
        .map((r) => ({
          user: userMap[r.userId],
          totalXp: r._sum.xpEarned ?? 0,
          matches: r._count.id,
        }));

      return NextResponse.json({ success: true, data });
    }

    if (gameType === "CONNECT_DOTS") {
      const rows = await db.connectDotsGame.groupBy({
        by: ["userId"],
        _sum: { xpEarned: true },
        _count: { id: true },
        orderBy: { _sum: { xpEarned: "desc" } },
        take: 20,
      });

      const userIds = rows.map((r) => r.userId);
      const users = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

      const data = rows
        .filter((r) => userMap[r.userId])
        .map((r) => ({
          user: userMap[r.userId],
          totalXp: r._sum.xpEarned ?? 0,
          matches: r._count.id,
        }));

      return NextResponse.json({ success: true, data });
    }

    if (gameType === "SPACE_SHOOTER") {
      // Pull best game per user directly from SpaceShooterGame (has wave + kills)
      const allGames = await db.spaceShooterGame.findMany({
        include: { user: { select: { id: true, username: true } } },
        orderBy: { score: "desc" },
      });

      // Keep best score row per user
      const bestByUser = new Map<string, typeof allGames[0]>();
      for (const g of allGames) {
        const existing = bestByUser.get(g.userId);
        if (!existing || g.score > existing.score) {
          bestByUser.set(g.userId, g);
        }
      }

      // Also aggregate total XP + match counts
      const gameRows = await db.spaceShooterGame.groupBy({
        by: ["userId"],
        _sum: { xpEarned: true },
        _count: { id: true },
      });
      const gameMap = new Map(gameRows.map(r => [r.userId, r]));

      const data = Array.from(bestByUser.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .map(r => ({
          user: r.user,
          highScore: r.score,
          wave: r.wave,
          kills: r.kills,
          totalXp: gameMap.get(r.userId)?._sum.xpEarned ?? 0,
          matches: gameMap.get(r.userId)?._count.id ?? 0,
        }));

      return NextResponse.json({ success: true, data });
    }

    if (gameType === "BLOCK_BREAKER") {
      // Pull all games, keep best score per user (same pattern as Space Shooter)
      const allGames = await db.blockBreakerGame.findMany({
        include: { user: { select: { id: true, username: true } } },
        orderBy: { score: "desc" },
      });

      // Keep best score row per user
      const bestByUser = new Map<string, typeof allGames[0]>();
      for (const g of allGames) {
        const existing = bestByUser.get(g.userId);
        if (!existing || g.score > existing.score) {
          bestByUser.set(g.userId, g);
        }
      }

      // Aggregate total matches per user
      const gameRows = await db.blockBreakerGame.groupBy({
        by: ["userId"],
        _count: { id: true },
      });
      const matchMap = new Map(gameRows.map(r => [r.userId, r._count.id]));

      const data = Array.from(bestByUser.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .map(r => ({
          user: r.user,
          highScore: r.score,
          level: r.level,
          blocksDestroyed: r.blocksDestroyed,
          matches: matchMap.get(r.userId) ?? 0,
        }));

      return NextResponse.json({ success: true, data });
    }

    // Fallback: return empty
    return NextResponse.json({ success: true, data: [] });
  } catch (error) {
    console.error("Leaderboard fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}