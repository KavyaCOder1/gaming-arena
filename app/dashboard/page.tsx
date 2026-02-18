"use client";

import { useAuthStore } from "@/store/auth-store";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { GameHistoryTable } from "@/components/dashboard/GameHistoryTable";
import { Trophy, Gamepad2, Timer, Flame, ArrowRight, Sparkles, ChevronRight, Play, User, Zap } from "lucide-react";
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
            className="p-8"
        >
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <div>
                    <h1 className="font-heading text-4xl font-black italic tracking-wider text-foreground">OPERATIONS HUB</h1>
                    <p className="text-muted-foreground tracking-[0.3em] text-[10px] uppercase font-bold mt-1">Sector 7-G / User Performance Protocol</p>
                </div>
                <div className="flex gap-4">
                    <div className="glass-card px-6 py-2.5 flex items-center gap-3 border-secondary/20">
                        <Sparkles className="w-4 h-4 text-amber-500 neon-glow" />
                        <span className="font-heading font-black text-sm tracking-widest">{stats.totalGames * 10} XP</span>
                    </div>
                    <button className="glass-card p-2.5 hover:bg-white/10 transition-colors">
                        <Timer className="w-5 h-5 text-secondary" />
                    </button>
                </div>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                <div className="md:col-span-1 glass-card p-8 border-secondary/30 relative overflow-hidden flex flex-col items-center justify-center text-center group">
                    <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-transparent animate-shimmer opacity-20 pointer-events-none" />
                    <div className="relative mb-6">
                        <div className="w-28 h-28 rounded-full border-[3px] border-secondary p-1 group-hover:scale-105 transition-transform duration-500">
                            <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">
                                {user?.username ? (
                                    <span className="text-4xl font-black text-secondary">{user.username[0].toUpperCase()}</span>
                                ) : (
                                    <User className="w-12 h-12 text-slate-500" />
                                )}
                            </div>
                        </div>
                        <div className="absolute -bottom-2 translate-x-1/2 right-1/2 bg-secondary text-background px-4 py-1 rounded-lg text-[10px] font-black font-heading tracking-widest shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                            ELITE
                        </div>
                    </div>
                    <h2 className="font-heading text-2xl font-black text-foreground drop-shadow-sm uppercase">{user?.username}</h2>
                    <p className="text-muted-foreground text-[10px] font-black tracking-[0.2em] mt-2 uppercase">MEMBER SINCE 2024</p>
                </div>

                <div className="glass-card p-8 flex flex-col justify-between relative overflow-hidden group">
                    <div className="flex justify-between items-start">
                        <span className="text-muted-foreground uppercase text-[10px] font-black tracking-[0.3em]">Total Games</span>
                        <Gamepad2 className="w-5 h-5 text-primary neon-glow" />
                    </div>
                    <div className="mt-4">
                        <div className="text-5xl font-heading font-black text-foreground group-hover:text-primary transition-colors">{stats.totalGames}</div>
                        <div className="flex items-center gap-1 text-green-400 text-[10px] font-black mt-2 uppercase tracking-widest">
                            <ArrowRight className="w-3 h-3 -rotate-45" />
                            <span>+12.5% VS LAST WEEK</span>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-8 flex flex-col justify-between relative overflow-hidden group">
                    <div className="flex justify-between items-start">
                        <span className="text-muted-foreground uppercase text-[10px] font-black tracking-[0.3em]">High Score</span>
                        <Trophy className="w-5 h-5 text-secondary neon-glow" />
                    </div>
                    <div className="mt-4">
                        <div className="text-5xl font-heading font-black text-foreground group-hover:text-secondary transition-colors">{stats.highScore.toLocaleString()}</div>
                        <div className="text-muted-foreground/60 text-[10px] font-black mt-2 uppercase tracking-[0.2em]">PACMAN CLASSIC / HARD</div>
                    </div>
                </div>

                <div className="glass-card p-8 flex flex-col justify-between relative overflow-hidden group">
                    <div className="flex justify-between items-start">
                        <span className="text-muted-foreground uppercase text-[10px] font-black tracking-[0.3em]">Win/Loss Ratio</span>
                        <Flame className="w-5 h-5 text-rose-500 neon-glow" />
                    </div>
                    <div className="mt-4">
                        <div className="text-5xl font-heading font-black text-foreground group-hover:text-rose-500 transition-colors">{(stats.winRate / 100).toFixed(2)}</div>
                        <div className="w-full bg-white/5 h-2 rounded-full mt-4 overflow-hidden p-[1px]">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${stats.winRate}%` }}
                                className="h-full bg-gradient-to-r from-rose-500 to-primary rounded-full"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                <div className="xl:col-span-2 glass-card overflow-hidden">
                    <div className="p-8 border-b border-white/5 flex justify-between items-center">
                        <h3 className="font-heading text-xl font-black text-foreground flex items-center gap-4">
                            <Timer className="w-6 h-6 text-primary" />
                            RECENT ACTIVITY
                        </h3>
                        <Link href="/dashboard/profile" className="text-[10px] text-secondary hover:underline uppercase font-black tracking-[0.3em]">
                            View Full Log
                        </Link>
                    </div>
                    <div className="p-2">
                        <GameHistoryTable history={history} />
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="glass-card p-8">
                        <h3 className="font-heading text-lg font-black text-foreground mb-8 flex items-center gap-4">
                            <Trophy className="w-5 h-5 text-secondary" />
                            SKILL DISTRIBUTION
                        </h3>
                        <div className="grid grid-cols-2 gap-8">
                            {[
                                { label: "Word Match", value: 68, color: "text-primary" },
                                { label: "Tic Tac Toe", value: 82, color: "text-secondary" },
                                { label: "Memory Matrix", value: 35, color: "text-rose-500" },
                                { label: "Pacman", value: stats.winRate, color: "text-amber-500" }
                            ].map((skill, i) => (
                                <div key={i} className="flex flex-col items-center">
                                    <div className="relative w-24 h-24 flex items-center justify-center mb-4">
                                        <svg className="w-full h-full -rotate-90">
                                            <circle cx="48" cy="48" r="40" className="fill-none stroke-white/5 stroke-[4]" />
                                            <circle
                                                cx="48" cy="48" r="40"
                                                className={`fill-none stroke-current stroke-[4] ${skill.color}`}
                                                style={{ strokeDasharray: "251.2", strokeDashoffset: 251.2 - (251.2 * skill.value) / 100 }}
                                            />
                                        </svg>
                                        <span className="absolute font-heading text-lg font-black">{skill.value}%</span>
                                    </div>
                                    <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground text-center">{skill.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card p-8">
                        <h3 className="font-heading text-lg font-black text-foreground mb-6 flex items-center gap-4">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            MASTERED BADGES
                        </h3>
                        <div className="flex flex-wrap gap-4">
                            {[
                                { icon: Trophy, color: "text-amber-500", border: "border-amber-500/50" },
                                { icon: Zap, color: "text-primary", border: "border-primary/50" },
                                { icon: Timer, color: "text-emerald-500", border: "border-emerald-500/50" }
                            ].map((badge, i) => (
                                <div key={i} className={`w-14 h-14 glass-card flex items-center justify-center border ${badge.border} ${badge.color}`}>
                                    <badge.icon className="w-7 h-7" />
                                </div>
                            ))}
                            {[1, 2].map((_, i) => (
                                <div key={i} className="w-14 h-14 glass-card flex items-center justify-center border-white/10 opacity-20 grayscale">
                                    <Zap className="w-7 h-7" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
