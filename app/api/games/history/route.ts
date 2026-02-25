import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const gameType = searchParams.get("gameType");
  const limit    = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const userId   = session.user.id;

  try {
    if (gameType === "TIC_TAC_TOE") {
      const games = await db.ticTacToeGame.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return NextResponse.json({ success: true, data: games });
    }

    if (gameType === "WORD_SEARCH") {
      const games = await db.wordSearchGame.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return NextResponse.json({ success: true, data: games });
    }

    if (gameType === "SPACE_SHOOTER") {
      const games = await db.spaceShooterGame.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return NextResponse.json({ success: true, data: games });
    }

    if (gameType === "SNAKE") {
      const games = await db.snakeGame.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return NextResponse.json({ success: true, data: games });
    }

    if (gameType === "CONNECT_DOTS") {
      const games = await db.connectDotsGame.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return NextResponse.json({ success: true, data: games });
    }

    if (gameType === "MEMORY") {
      const games = await db.memoryGame.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return NextResponse.json({ success: true, data: games });
    }

    // No gameType — return both
    const [ttt, ws] = await Promise.all([
      db.ticTacToeGame.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      db.wordSearchGame.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);

    return NextResponse.json({ success: true, data: { ticTacToe: ttt, wordSearch: ws } });
  } catch (error) {
    console.error("Game history error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
