import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
    const session = await getSession();

    if (!session) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            include: {
                gameHistory: {
                    orderBy: { createdAt: "desc" },
                    take: 5,
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const totalGames = await db.gameHistory.count({
            where: { userId: user.id },
        });

        const highScore = await db.leaderboard.findFirst({
            where: { userId: user.id },
            orderBy: { highScore: "desc" },
        });

        // Calculate win rate (simplified logic for now, assuming score > 0 is a win or based on future game logic)
        // For now, we'll calculate based on games played vs "sessions" if we tracked that, but let's just use a placeholder calculation
        // Real win rate would depend on Game specific logic (e.g. did they finish the puzzle?)
        // We'll approximate "Win" as score > 0 for now.
        const wins = await db.gameHistory.count({
            where: { userId: user.id, score: { gt: 0 } }
        });

        const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

        // Calculate total play time (sum of duration)
        const totalDuration = await db.gameHistory.aggregate({
            where: { userId: user.id },
            _sum: { duration: true }
        });

        return NextResponse.json({
            success: true,
            stats: {
                totalGames,
                highScore: highScore?.highScore || 0,
                playTime: Math.round((totalDuration._sum.duration || 0) / 60), // in minutes
                winRate,
            },
            history: user.gameHistory.map(game => ({
                ...game,
                user: { username: user.username } // Flatten for UI consistency
            }))
        });
    } catch (error) {
        console.error("Dashboard stats error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
