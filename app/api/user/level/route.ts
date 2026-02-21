import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { calcRank, RANKS, xpForNextRank, xpProgressInRank } from "@/lib/game-utils";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const levelData = await db.userLevel.findUnique({
      where: { userId: session.user.id },
    });

    const xp      = levelData?.xp ?? 0;
    const rank    = calcRank(xp);
    const rankInfo = RANKS[rank];
    const progress = xpProgressInRank(xp);

    return NextResponse.json({
      success: true,
      data: {
        xp,
        rank,
        rankInfo,
        xpToNextRank:   xpForNextRank(xp),
        progressInRank: progress,
      },
    });
  } catch (error) {
    console.error("Level fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
