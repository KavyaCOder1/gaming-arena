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

    // Fallback: return empty
    return NextResponse.json({ success: true, data: [] });
  } catch (error) {
    console.error("Leaderboard fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
