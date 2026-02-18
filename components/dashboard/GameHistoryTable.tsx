"use client";

import { motion } from "framer-motion";
import { GameHistoryWithUser } from "@/types";
import { formatDate, formatTime } from "@/lib/utils";
import { Trophy, Clock, Calendar } from "lucide-react";

interface GameHistoryTableProps {
    history: GameHistoryWithUser[];
}

export function GameHistoryTable({ history }: GameHistoryTableProps) {
    if (!history || history.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground glass rounded-xl">
                No games played yet. Start playing to see your history!
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-border glass">
            <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground font-medium uppercase text-xs">
                    <tr>
                        <th className="px-6 py-4">Game</th>
                        <th className="px-6 py-4">Score</th>
                        <th className="px-6 py-4">Difficulty</th>
                        <th className="px-6 py-4">Duration</th>
                        <th className="px-6 py-4">Date</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                    {history.map((game, index) => (
                        <motion.tr
                            key={game.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="hover:bg-muted/30 transition-colors"
                        >
                            <td className="px-6 py-4 font-semibold text-primary">
                                {game.gameType.replace("_", " ")}
                            </td>
                            <td className="px-6 py-4">
                                <span className="flex items-center gap-2">
                                    <Trophy className="h-4 w-4 text-yellow-500" />
                                    {game.score}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`
                  px-2 py-1 rounded-full text-xs font-medium
                  ${game.level === 'EASY' ? 'bg-green-500/10 text-green-500' :
                                        game.level === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-500' :
                                            'bg-red-500/10 text-red-500'}
                `}>
                                    {game.level}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                {formatTime(game.duration)}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                                <span className="flex items-center gap-2">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(game.createdAt)}
                                </span>
                            </td>
                        </motion.tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
