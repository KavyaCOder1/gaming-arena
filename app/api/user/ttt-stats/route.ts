import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/user/ttt-stats
 * Returns the authenticated user's all-time Tic-Tac-Toe win / loss / draw counts.
 */
export async function GET() {
  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [wins, losses, draws] = await Promise.all([
      db.ticTacToeGame.count({ where: { userId: session.user.id, result: "WIN"  } }),
      db.ticTacToeGame.count({ where: { userId: session.user.id, result: "LOSE" } }),
      db.ticTacToeGame.count({ where: { userId: session.user.id, result: "DRAW" } }),
    ]);

    return NextResponse.json({ success: true, data: { wins, losses, draws } });
  } catch (error) {
    console.error("ttt-stats error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
