import { NextResponse } from "next/server";
import { db } from "@/lib/db";
// import { GameType } from "@prisma/client"; // Use any for now if type gen is pending

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const gameType = searchParams.get("gameType");

    try {
        const whereClause = gameType && gameType !== "ALL"
            ? { gameType: gameType as any }
            : {};

        const leaderboard = await db.leaderboard.findMany({
            where: whereClause,
            include: {
                user: {
                    select: { username: true },
                },
            },
            orderBy: {
                highScore: "desc",
            },
            take: 100, // Top 100
        });

        const response = NextResponse.json({
            success: true,
            data: leaderboard,
        });
        response.headers.set("Cache-Control", "public, max-age=600");
        return response;
    } catch (error) {
        console.error("Leaderboard fetch error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
