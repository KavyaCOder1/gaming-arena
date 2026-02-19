"use client";

import { motion } from "framer-motion";
import { GameHistoryWithUser } from "@/types";
import { formatDate, formatTime } from "@/lib/utils";
import { Trophy, Clock, Calendar, Activity, Zap } from "lucide-react";

interface GameHistoryTableProps {
    history: GameHistoryWithUser[];
}

const LEVEL_STYLE: Record<string, { color: string; bg: string; border: string }> = {
    EASY:   { color: "#10b981", bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.28)" },
    MEDIUM: { color: "#f59e0b", bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.28)" },
    HARD:   { color: "#ef4444", bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.28)"  },
};

const GAME_LABEL: Record<string, string> = {
    WORD_SEARCH: "Word Search",
    TIC_TAC_TOE: "Tic Tac Toe",
    MEMORY:      "Memory",
    PACMAN:      "Pacman",
};

export function GameHistoryTable({ history }: GameHistoryTableProps) {
    if (!history || history.length === 0) {
        return (
            <div style={{ textAlign: "center", padding: "60px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                    <Activity style={{ width: 24, height: 24, color: "#334155" }} />
                </div>
                <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, color: "#334155", letterSpacing: "0.25em", textTransform: "uppercase" }}>No Combat Data Found</p>
                <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#1e293b", fontWeight: 500, letterSpacing: "0.1em" }}>Initialize a game session to begin data logging</p>
            </div>
        );
    }

    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        {["Operation", "Performance", "Threat Level", "Time in Field", "Timestamp"].map(h => (
                            <th key={h} style={{ padding: "10px 18px", textAlign: "left", fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700, color: "#334155", letterSpacing: "0.25em", textTransform: "uppercase", background: "rgba(255,255,255,0.02)", whiteSpace: "nowrap" }}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {history.map((game, i) => {
                        const lvl = LEVEL_STYLE[game.level] ?? LEVEL_STYLE.MEDIUM;
                        return (
                            <motion.tr
                                key={game.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.2s" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(34,211,238,0.03)"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                            >
                                {/* Operation */}
                                <td style={{ padding: "13px 18px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <Zap style={{ width: 14, height: 14, color: "#6366f1", filter: "drop-shadow(0 0 4px rgba(99,102,241,0.6))" }} />
                                        </div>
                                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", fontStyle: "italic", letterSpacing: "0.04em" }}>
                                            {GAME_LABEL[game.gameType] ?? game.gameType.replace("_", " ")}
                                        </span>
                                    </div>
                                </td>

                                {/* Performance */}
                                <td style={{ padding: "13px 18px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <Trophy style={{ width: 14, height: 14, color: "#f59e0b", filter: "drop-shadow(0 0 4px rgba(245,158,11,0.5))" }} />
                                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 900, color: "#f8fafc" }}>{game.score}</span>
                                    </div>
                                </td>

                                {/* Threat Level */}
                                <td style={{ padding: "13px 18px" }}>
                                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700, color: lvl.color, background: lvl.bg, border: `1px solid ${lvl.border}`, padding: "4px 10px", borderRadius: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                                        {game.level}
                                    </span>
                                </td>

                                {/* Time in Field */}
                                <td style={{ padding: "13px 18px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <Clock style={{ width: 12, height: 12, color: "#334155" }} />
                                        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 600, color: "#475569" }}>{formatTime(game.duration)}</span>
                                    </div>
                                </td>

                                {/* Timestamp */}
                                <td style={{ padding: "13px 18px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <Calendar style={{ width: 12, height: 12, color: "#1e293b" }} />
                                        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 500, color: "#334155" }}>{formatDate(game.createdAt)}</span>
                                    </div>
                                </td>
                            </motion.tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Footer */}
            <div style={{ padding: "14px 18px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7, fontWeight: 700, color: "#1e293b", letterSpacing: "0.3em", textTransform: "uppercase" }}>End of Logs</span>
                <div style={{ display: "flex", gap: 6 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(99,102,241,0.4)", animation: "ghtPulse 1.5s infinite" }} />
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(99,102,241,0.2)", animation: "ghtPulse 1.5s infinite 0.7s" }} />
                </div>
            </div>
            <style>{`@keyframes ghtPulse { 0%,100%{opacity:1} 50%{opacity:0.2} }`}</style>
        </div>
    );
}
