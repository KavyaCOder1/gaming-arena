"use client";

import { motion } from "framer-motion";
import { LeaderboardWithUser } from "@/types";
import { Trophy, Medal, Crown } from "lucide-react";
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
        <div className="glass rounded-xl overflow-hidden border border-white/5">
            <table className="w-full">
                <thead className="bg-white/5 text-xs uppercase text-muted-foreground font-medium">
                    <tr>
                        <th className="px-6 py-4 text-left w-20">Rank</th>
                        <th className="px-6 py-4 text-left">Player</th>
                        {gameType && <th className="px-6 py-4 text-left">Game</th>}
                        <th className="px-6 py-4 text-right">High Score</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
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
                                    "hover:bg-white/5 transition-colors relative group",
                                )}
                            >
                                <td className="px-6 py-4">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                        rank === 1 && "bg-yellow-500/20 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]",
                                        rank === 2 && "bg-slate-300/20 text-slate-300",
                                        rank === 3 && "bg-amber-700/20 text-amber-600",
                                        rank > 3 && "text-muted-foreground"
                                    )}>
                                        {rank === 1 ? <Crown className="w-4 h-4" /> : rank}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-medium flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">
                                        {entry.user.username.substring(0, 2).toUpperCase()}
                                    </div>
                                    {entry.user.username}
                                    {isTop3 && <Medal className={cn(
                                        "w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity",
                                        rank === 1 && "text-yellow-500",
                                        rank === 2 && "text-slate-300",
                                        rank === 3 && "text-amber-600",
                                    )} />}
                                </td>
                                {gameType && (
                                    <td className="px-6 py-4 text-muted-foreground text-sm">
                                        {entry.gameType.replace("_", " ")}
                                    </td>
                                )}
                                <td className="px-6 py-4 text-right font-mono font-bold text-primary text-lg">
                                    {entry.highScore.toLocaleString()}
                                </td>
                            </motion.tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
