import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const [tttGames, wsGames, tttWins, wsCompleted, tttDur, wsDur, leaderboard] = await Promise.all([
      db.ticTacToeGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }),
      db.wordSearchGame.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }),
      db.ticTacToeGame.count({ where: { userId, result: "WIN" } }),
      db.wordSearchGame.count({ where: { userId, completed: true } }),
      db.ticTacToeGame.aggregate({ where: { userId }, _sum: { duration: true } }),
      db.wordSearchGame.aggregate({ where: { userId }, _sum: { duration: true } }),
      db.leaderboard.findMany({ where: { userId }, orderBy: { highScore: "desc" } }),
    ]);

    const totalGames = (await db.ticTacToeGame.count({ where: { userId } }))
      + (await db.wordSearchGame.count({ where: { userId } }));

    const totalWins = tttWins + wsCompleted;
    const winRate   = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    const totalMinutes = Math.round(((tttDur._sum.duration ?? 0) + (wsDur._sum.duration ?? 0)) / 60);
    const highScore = leaderboard[0]?.highScore ?? 0;

    return NextResponse.json({
      success: true,
      stats: { totalGames, highScore, playTime: totalMinutes, winRate },
      recentGames: { ticTacToe: tttGames, wordSearch: wsGames },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
