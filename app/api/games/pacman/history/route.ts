/**
 * GET /api/games/pacman/history
 * Returns the last 20 pacman games for the authenticated user.
 */
import { NextResponse } from "next/server";
import { db }          from "@/lib/db";
import { getSession }  from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const games = await db.pacmanGame.findMany({
    where:   { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take:    20,
    select:  { id: true, score: true, stage: true, xpEarned: true, duration: true, createdAt: true },
  });

  return NextResponse.json({ success: true, data: games });
}
