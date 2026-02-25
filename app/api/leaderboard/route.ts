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
      const users   = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

      const data = rows
        .filter((r) => userMap[r.userId])
        .map((r) => ({
          user:    userMap[r.userId],
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
      const users   = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

      const data = rows
        .filter((r) => userMap[r.userId])
        .map((r) => ({
          user:    userMap[r.userId],
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
      const users   = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

      const data = rows
        .filter((r) => userMap[r.userId])
        .map((r) => ({
          user:    userMap[r.userId],
          totalXp: r._sum.xpEarned ?? 0,
          matches: r._count.id,
        }));

      return NextResponse.json({ success: true, data });
    }

    if (gameType === "PACMAN") {
      // Best score per user from leaderboard table
      const rows = await db.leaderboard.findMany({
        where:   { gameType: "PACMAN", difficulty: null },
        include: { user: { select: { id: true, username: true } } },
        orderBy: { highScore: "desc" },
        take:    20,
      });

      const data = rows.map(r => ({
        user:      r.user,
        highScore: r.highScore,
        totalXp:   r.highScore,
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
      const users   = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

      const data = rows
        .filter((r) => userMap[r.userId])
        .map((r) => ({
          user:    userMap[r.userId],
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
      const users   = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true },
      });
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

      const data = rows
        .filter((r) => userMap[r.userId])
        .map((r) => ({
          user:    userMap[r.userId],
          totalXp: r._sum.xpEarned ?? 0,
          matches: r._count.id,
        }));

      return NextResponse.json({ success: true, data });
    }

    if (gameType === "SPACE_SHOOTER") {
      // Aggregate per user: pick their highest highScore across any difficulty row,
      // then also pull total matches + total XP from SpaceShooterGame records.
      const lbRows = await db.leaderboard.findMany({
        where:   { gameType: "SPACE_SHOOTER" },
        include: { user: { select: { id: true, username: true } } },
        orderBy: { highScore: "desc" },
      });

      // Deduplicate: keep best row per user
      const bestByUser = new Map<string, typeof lbRows[0]>();
      for (const row of lbRows) {
        const existing = bestByUser.get(row.userId);
        if (!existing || row.highScore > existing.highScore) {
          bestByUser.set(row.userId, row);
        }
      }

      // Pull total XP + match counts from game records
      const gameRows = await db.spaceShooterGame.groupBy({
        by: ["userId"],
        _sum:   { xpEarned: true },
        _count: { id: true },
      });
      const gameMap = new Map(gameRows.map(r => [r.userId, r]));

      const data = Array.from(bestByUser.values())
        .sort((a, b) => b.highScore - a.highScore)
        .slice(0, 20)
        .map(r => ({
          user:      r.user,
          highScore: r.highScore,
          totalXp:   gameMap.get(r.userId)?._sum.xpEarned ?? r.highScore,
          matches:   gameMap.get(r.userId)?._count.id ?? 0,
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
