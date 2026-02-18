"use client";

import { motion } from "framer-motion";
import { LeaderboardWithUser } from "@/types";
import { Trophy, Medal, Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardTableProps {
    entries: LeaderboardWithUser[];
    gameType?: string;
}

export function LeaderboardTable({ entries, gameType }: LeaderboardTableProps) {
    if (!entries || entries.length === 0) {
        return (
            <div className="text-center py-12 glass rounded-xl">
                <Trophy className="mx-auto h-12 w-12 text-muted-foreground/20 mb-4" />
                <p className="text-muted-foreground">No records yet. Be the first to claim the throne!</p>
            </div>
        );
    }

    return (
        <div className="premium-card overflow-hidden border border-border/50">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-black/5 dark:bg-white/5 text-[10px] uppercase text-muted-foreground font-black tracking-widest">
                        <tr>
                            <th className="px-8 py-5 text-left w-24">Rank</th>
                            <th className="px-8 py-5 text-left">Operative</th>
                            {gameType && <th className="px-8 py-5 text-left">Sector</th>}
                            <th className="px-8 py-5 text-right">Battle Score</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {entries.map((entry, index) => {
                            const rank = index + 1;
                            const isTop3 = rank <= 3;
                            return (
                                <motion.tr
                                    key={entry.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={cn(
                                        "hover:bg-primary/5 transition-all duration-300 relative group cursor-default",
                                        rank === 1 && "bg-primary/[0.02]"
                                    )}
                                >
                                    <td className="px-8 py-6">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-transform group-hover:scale-110",
                                            rank === 1 && "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.2)]",
                                            rank === 2 && "bg-slate-300/10 text-slate-400 border border-slate-300/20",
                                            rank === 3 && "bg-amber-700/10 text-amber-600 border border-amber-700/20",
                                            rank > 3 && "text-muted-foreground/60 font-mono"
                                        )}>
                                            {rank === 1 ? <Crown className="w-5 h-5" /> : rank.toString().padStart(2, '0')}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary p-[1px]">
                                                    <div className="w-full h-full rounded-[11px] bg-card flex items-center justify-center text-primary text-xs font-black">
                                                        {entry.user.username.substring(0, 2).toUpperCase()}
                                                    </div>
                                                </div>
                                                {isTop3 && (
                                                    <div className="absolute -top-1 -right-1">
                                                        <div className={cn(
                                                            "w-4 h-4 rounded-full flex items-center justify-center border-2 border-card",
                                                            rank === 1 && "bg-yellow-500",
                                                            rank === 2 && "bg-slate-300",
                                                            rank === 3 && "bg-amber-600",
                                                        )}>
                                                            <Sparkles className="w-2 h-2 text-white" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-black text-sm uppercase tracking-tight group-hover:text-primary transition-colors">
                                                    {entry.user.username}
                                                </span>
                                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                                    Verified Operative
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    {gameType && (
                                        <td className="px-8 py-6">
                                            <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                {entry.gameType.replace("_", " ")}
                                            </span>
                                        </td>
                                    )}
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-black font-mono text-xl text-primary neon-glow">
                                                {entry.highScore.toLocaleString()}
                                            </span>
                                            <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">POINTS</span>
                                        </div>
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
