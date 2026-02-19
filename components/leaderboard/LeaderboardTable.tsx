"use client";

import { motion } from "framer-motion";
import { LeaderboardWithUser } from "@/types";
import { Trophy, Crown, Medal, Sparkles } from "lucide-react";

interface LeaderboardTableProps {
    entries: LeaderboardWithUser[];
    gameType?: string;
}

const GAME_LABEL: Record<string, string> = {
    WORD_SEARCH: "Word Search",
    TIC_TAC_TOE: "Tic Tac Toe",
    MEMORY:      "Memory",
    PACMAN:      "Pacman",
};

function rankMeta(rank: number) {
    if (rank === 1) return { color: "#f59e0b", Icon: Crown,  bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)", badge: "#f59e0b" };
    if (rank === 2) return { color: "#94a3b8", Icon: Medal,  bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)",  badge: "#94a3b8" };
    if (rank === 3) return { color: "#b45309", Icon: Medal,  bg: "rgba(180,83,9,0.08)",   border: "rgba(180,83,9,0.2)",    badge: "#b45309" };
    return           { color: "#475569",      Icon: null,   bg: "transparent",            border: "transparent",           badge: ""        };
}

export function LeaderboardTable({ entries, gameType }: LeaderboardTableProps) {
    if (!entries || entries.length === 0) {
        return (
            <div style={{ textAlign: "center", padding: "60px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <Trophy style={{ width: 40, height: 40, color: "#334155", marginBottom: 4, opacity: 0.4 }} />
                <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, color: "#334155", letterSpacing: "0.25em", textTransform: "uppercase" }}>No Records Yet</p>
                <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#1e293b", fontWeight: 500 }}>Be the first to claim the throne!</p>
            </div>
        );
    }

    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
                <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        {["Rank", "Operative", ...(gameType ? ["Sector"] : []), "Battle Score"].map(h => (
                            <th key={h} style={{ padding: "12px 20px", textAlign: h === "Battle Score" ? "right" : "left", fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700, color: "#334155", letterSpacing: "0.28em", textTransform: "uppercase", background: "rgba(255,255,255,0.02)", whiteSpace: "nowrap" }}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {entries.map((entry, i) => {
                        const rank = i + 1;
                        const { color, Icon, bg, border } = rankMeta(rank);
                        const isTop3 = rank <= 3;

                        return (
                            <motion.tr
                                key={entry.id}
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04 }}
                                style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", background: isTop3 ? bg : "transparent", transition: "background 0.2s", cursor: "default" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isTop3 ? bg : "rgba(34,211,238,0.03)"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isTop3 ? bg : "transparent"; }}
                            >
                                {/* Rank */}
                                <td style={{ padding: "16px 20px", width: 80 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 12, background: isTop3 ? `${color}14` : "rgba(255,255,255,0.03)", border: `1px solid ${isTop3 ? border : "rgba(255,255,255,0.06)"}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isTop3 ? `0 0 16px ${color}30` : "none", flexShrink: 0 }}>
                                        {Icon
                                            ? <Icon style={{ width: 18, height: 18, color, filter: `drop-shadow(0 0 5px ${color}80)` }} />
                                            : <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, color: "#475569" }}>{String(rank).padStart(2, "0")}</span>
                                        }
                                    </div>
                                </td>

                                {/* Operative */}
                                <td style={{ padding: "16px 20px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                        <div style={{ position: "relative", flexShrink: 0 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isTop3 ? `0 0 12px ${color}40` : "none" }}>
                                                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 900, color: "#fff" }}>
                                                    {entry.user.username.substring(0, 2).toUpperCase()}
                                                </span>
                                            </div>
                                            {isTop3 && (
                                                <div style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: color, border: "2px solid rgba(10,15,35,0.95)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <Sparkles style={{ width: 8, height: 8, color: "#fff" }} />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 700, color: isTop3 ? "#f8fafc" : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
                                                {entry.user.username}
                                            </div>
                                            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, fontWeight: 600, color: "#334155", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                                                Verified Operative
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                {/* Sector (optional) */}
                                {gameType && (
                                    <td style={{ padding: "16px 20px" }}>
                                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700, color: "#475569", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "4px 10px", borderRadius: 7, letterSpacing: "0.12em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                                            {GAME_LABEL[entry.gameType] ?? entry.gameType.replace("_", " ")}
                                        </span>
                                    </td>
                                )}

                                {/* Score */}
                                <td style={{ padding: "16px 20px", textAlign: "right" }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 20, fontWeight: 900, color: isTop3 ? color : "#22d3ee", filter: isTop3 ? `drop-shadow(0 0 8px ${color}60)` : "none", lineHeight: 1 }}>
                                            {entry.highScore.toLocaleString()}
                                        </span>
                                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7, fontWeight: 700, color: "#334155", letterSpacing: "0.25em", textTransform: "uppercase", marginTop: 2 }}>POINTS</span>
                                    </div>
                                </td>
                            </motion.tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Footer */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7, fontWeight: 700, color: "#1e293b", letterSpacing: "0.3em", textTransform: "uppercase" }}>End of Rankings</span>
                <div style={{ display: "flex", gap: 6 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(99,102,241,0.5)", animation: "lbPulse 1.5s infinite" }} />
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(34,211,238,0.35)", animation: "lbPulse 1.5s infinite 0.5s" }} />
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(99,102,241,0.2)", animation: "lbPulse 1.5s infinite 1s" }} />
                </div>
            </div>
            <style>{`@keyframes lbPulse { 0%,100%{opacity:1} 50%{opacity:0.2} }`}</style>
        </div>
    );
}
