"use client";

import { useAuthStore } from "@/store/auth-store";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { GameHistoryTable } from "@/components/dashboard/GameHistoryTable";
import { Trophy, Gamepad2, Timer, Flame, ArrowRight, Sparkles, ChevronRight, Play } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { GameHistoryWithUser } from "@/types";

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
            className="space-y-10"
        >
            {/* Header / Welcome Section */}
            <div className="relative rounded-[2.5rem] overflow-hidden group">
                {/* Mesh Gradient Background */}
                <div className="absolute inset-0 mesh-gradient opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />

                <div className="relative z-10 p-12 flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="space-y-6 max-w-2xl text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-widest text-primary-foreground">
                            <Sparkles className="w-3 h-3 text-primary neon-glow" />
                            <span>Player Command Center</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white">
                            WELCOME BACK, <br />
                            <span className="text-secondary italic">{user?.username || "PLAYER"}</span>
                        </h1>
                        <p className="text-white/70 text-lg font-medium leading-relaxed">
                            The arena is calling. Your current win rate is <span className="text-secondary font-bold">{stats.winRate}%</span>.
                            Ready to push it even higher?
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center md:justify-start">
                            <Link
                                href="/games"
                                className="px-8 py-4 rounded-2xl bg-white text-black font-black hover:scale-105 transition-all shadow-xl flex items-center justify-center gap-2"
                            >
                                <Play className="w-5 h-5 fill-current" />
                                LAUNCH ARENA
                            </Link>
                            <Link
                                href="/dashboard/leaderboard"
                                className="px-8 py-4 rounded-2xl glass border-white/20 text-white font-black hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                            >
                                <Trophy className="w-5 h-5" />
                                RANKINGS
                            </Link>
                        </div>
                    </div>

                    {/* Decorative Element */}
                    <div className="hidden lg:block relative">
                        <div className="w-64 h-64 rounded-[3rem] bg-gradient-to-tr from-primary to-secondary rotate-12 animate-float shadow-[0_0_50px_rgba(var(--primary),0.3)]">
                            <div className="absolute inset-2 rounded-[2.5rem] bg-background flex items-center justify-center">
                                <Gamepad2 className="w-24 h-24 text-primary neon-glow" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatsCard
                    title="TOTAL SESSIONS"
                    value={stats.totalGames}
                    icon={Gamepad2}
                    color="primary"
                    trend="+12%"
                    delay={0.1}
                />
                <StatsCard
                    title="ARENA HIGH SCORE"
                    value={stats.highScore}
                    icon={Trophy}
                    color="accent"
                    delay={0.2}
                />
                <StatsCard
                    title="ACTIVE TIME (MIN)"
                    value={stats.playTime}
                    icon={Timer}
                    color="secondary"
                    trend="+5m"
                    delay={0.3}
                />
                <StatsCard
                    title="SUCCESS RATE"
                    value={`${stats.winRate}%`}
                    icon={Flame}
                    color="destructive"
                    delay={0.4}
                />
            </div>

            {/* Content Split */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                <div className="xl:col-span-2 space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black tracking-tighter uppercase italic">Mission Log</h2>
                            <p className="text-sm text-muted-foreground font-medium">Your recent performance in the field</p>
                        </div>
                        <Link href="/dashboard/profile" className="p-3 rounded-2xl glass border-white/10 hover:bg-white/5 transition-all">
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                    <div className="premium-card p-2">
                        <GameHistoryTable history={history} />
                    </div>
                </div>

                <div className="space-y-8">
                    <h2 className="text-3xl font-black tracking-tighter uppercase italic px-2">Rank Preview</h2>
                    <div className="premium-card p-10 text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative z-10">
                            <div className="w-32 h-32 mx-auto bg-amber-500/10 rounded-full flex items-center justify-center mb-8 border border-amber-500/20 group-hover:scale-110 transition-transform duration-500 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                                <span className="text-5xl font-black text-amber-500 drop-shadow-md">#42</span>
                            </div>
                            <h3 className="font-black text-2xl mb-2 tracking-tight">GLOBAL ELITE</h3>
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-10">TOP 5% IN WORLD</p>

                            <div className="space-y-4">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-muted-foreground">Progress to #41</span>
                                    <span className="text-primary italic">25 PTS NEEDED</span>
                                </div>
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-[1px]">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        whileInView={{ width: "85%" }}
                                        viewport={{ once: true }}
                                        className="h-full bg-gradient-to-r from-primary to-secondary rounded-full shadow-[0_0_10px_var(--primary)]"
                                    />
                                </div>
                            </div>

                            <Link
                                href="/dashboard/leaderboard"
                                className="mt-12 w-full py-4 rounded-2xl glass border-primary/20 text-primary font-black uppercase tracking-widest text-xs hover:bg-primary/10 transition-all flex items-center justify-center gap-2 group-hover:gap-4"
                            >
                                Full Rankings <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
