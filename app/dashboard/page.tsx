"use client";

import { useAuthStore } from "@/store/auth-store";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { GameHistoryTable } from "@/components/dashboard/GameHistoryTable";
import { Trophy, Gamepad2, Timer, Flame, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ApiResponse, GameHistoryWithUser } from "@/types";

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState({
        totalGames: 0,
        highScore: 0,
        playTime: 0,
        winRate: 0
    });
    const [history, setHistory] = useState<GameHistoryWithUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/dashboard/stats");
                const data = await res.json();
                if (data.success) {
                    setStats(data.stats);
                    setHistory(data.history);
                }
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchStats();
        }
    }, [user]);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8"
        >
            {/* Welcome Section */}
            <div className="glass-card p-8 relative overflow-hidden bg-gradient-to-r from-primary/20 to-transparent border-l-4 border-l-primary">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">
                        Welcome back, <span className="text-primary">{user?.username || "Player"}</span>!
                    </h1>
                    <p className="text-muted-foreground max-w-xl">
                        Ready to dominate the arena? Your skills are needed in the games. Check out your latest stats below.
                    </p>
                    <div className="mt-6 flex gap-4">
                        <Link
                            href="/games"
                            className="px-6 py-2.5 rounded-lg bg-primary font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_0_15px_theme(colors.primary.DEFAULT)] hover:shadow-[0_0_25px_theme(colors.primary.DEFAULT)] flex items-center gap-2"
                        >
                            <Gamepad2 className="w-4 h-4" />
                            Play Now
                        </Link>
                        <Link
                            href="/dashboard/leaderboard"
                            className="px-6 py-2.5 rounded-lg bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all flex items-center gap-2"
                        >
                            <Trophy className="w-4 h-4" />
                            View Ranks
                        </Link>
                    </div>
                </div>
                <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Total Games"
                    value={stats.totalGames}
                    icon={Gamepad2}
                    color="primary"
                    delay={0.1}
                />
                <StatsCard
                    title="Highest Score"
                    value={stats.highScore}
                    icon={Trophy}
                    color="accent"
                    delay={0.2}
                />
                <StatsCard
                    title="Play Time (min)"
                    value={stats.playTime}
                    icon={Timer}
                    color="secondary"
                    delay={0.3}
                />
                <StatsCard
                    title="Win Rate"
                    value={`${stats.winRate}%`}
                    icon={Flame}
                    color="destructive"
                    delay={0.4}
                />
            </div>

            {/* Recent History */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Gamepad2 className="w-5 h-5 text-primary" />
                            Recent Matches
                        </h2>
                        <Link href="/dashboard/profile" className="text-sm text-primary hover:underline flex items-center gap-1">
                            View All <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <GameHistoryTable history={history} />
                </div>

                {/* Quick Actions / Mini Leaderboard Placeholder */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Your Rank
                    </h2>
                    <div className="glass-card p-6 text-center">
                        <div className="w-20 h-20 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center mb-4 border border-yellow-500/50">
                            <span className="text-3xl font-bold text-yellow-500">#42</span>
                        </div>
                        <h3 className="font-bold text-lg mb-1">Global Leaderboard</h3>
                        <p className="text-sm text-muted-foreground mb-6">Top 5% of players</p>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Next Rank:</span>
                                <span className="font-bold">#41 (25pts away)</span>
                            </div>
                            <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500 w-[85%]" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
