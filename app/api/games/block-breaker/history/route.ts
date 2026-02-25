/**
 * GET /api/games/block-breaker/history
 * 
 * Returns user's Block Breaker game history
 * Matches pattern from Snake/Pacman
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

  try {
    const games = await db.blockBreakerGame.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        level: true,
        score: true,
        blocksDestroyed: true,
        duration: true,
        xpEarned: true,
        paddleSize: true,
        extraBalls: true,
        hadGun: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: games,
    });
  } catch (error) {
    console.error("[block-breaker/history] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
