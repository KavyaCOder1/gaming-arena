"use client";

import { motion } from "framer-motion";
import { GameHistoryWithUser } from "@/types";
import { formatDate, formatTime } from "@/lib/utils";
import { Trophy, Clock, Calendar, Activity, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameHistoryTableProps {
    history: GameHistoryWithUser[];
}

export function GameHistoryTable({ history }: GameHistoryTableProps) {
    if (!history || history.length === 0) {
        return (
            <div className="text-center py-20 text-muted-foreground glass rounded-[2.5rem] border-white/5 space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-8 h-8 opacity-20" />
                </div>
                <p className="font-black uppercase tracking-widest text-xs">No Combat Data Found</p>
                <p className="text-[10px] opacity-40">Initialize a game session to begin data logging</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-[2rem] border border-white/10 dark:bg-black/20">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Operation</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Performance</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Threat Level</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Time in Field</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Timestamp</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {history.map((game, index) => (
                            <motion.tr
                                key={game.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="group hover:bg-primary/5 transition-all duration-300"
                            >
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 text-primary group-hover:scale-110 transition-transform">
                                            <Zap className="w-4 h-4 neon-glow" />
                                        </div>
                                        <span className="font-black tracking-tight text-foreground/90 uppercase text-sm italic">
                                            {game.gameType.replace("_", " ")}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-2">
                                        <Trophy className="h-4 w-4 text-amber-500 neon-glow" />
                                        <span className="text-lg font-black tabular-nums tracking-tighter">{game.score}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <span className={cn(
                                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                                        game.level === 'EASY' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                            game.level === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                    )}>
                                        {game.level}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-muted-foreground font-bold text-xs">
                                    <div className="flex items-center gap-2 tabular-nums">
                                        <Clock className="h-3.5 w-3.5 opacity-50" />
                                        {formatTime(game.duration)}
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-muted-foreground/60 font-medium text-xs">
                                    <div className="flex items-center gap-2 tabular-nums">
                                        <Calendar className="h-3.5 w-3.5 opacity-30" />
                                        {formatDate(game.createdAt)}
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-6 bg-white/5 border-t border-white/5 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">
                <span>End of Logs</span>
                <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/20 animate-pulse delay-700" />
                </div>
            </div>
        </div>
    );
}
