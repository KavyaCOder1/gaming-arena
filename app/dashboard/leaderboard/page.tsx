"use client";

import { useState, useEffect } from "react";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { LeaderboardWithUser } from "@/types";
import { Trophy, Medal, Crown, Timer, Zap } from "lucide-react";
import { motion } from "framer-motion";

const C = { cyan: "#22d3ee", indigo: "#6366f1", text: "#f8fafc", muted: "#64748b" };
const card = { background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(34,211,238,0.12)", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };

const tabs = [
    { id: "ALL", label: "All Games", icon: Trophy },
    { id: "WORD_SEARCH", label: "Word Search", icon: Zap },
    { id: "TIC_TAC_TOE", label: "Tic Tac Toe", icon: Crown },
    { id: "MEMORY", label: "Memory", icon: Timer },
    { id: "PACMAN", label: "Pacman", icon: Medal },
];

export default function LeaderboardPage() {
    const [activeTab, setActiveTab] = useState("ALL");
    const [data, setData] = useState<LeaderboardWithUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setIsLoading(true);
            try {
                const query = activeTab !== "ALL" ? `?gameType=${activeTab}` : "";
                const res = await fetch(`/api/leaderboard${query}`);
                const json = await res.json();
                if (json.success) setData(json.data);
            } catch (e) { console.error(e); }
            finally { setIsLoading(false); }
        };
        fetchLeaderboard();
    }, [activeTab]);

    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ padding: "32px 24px 100px" }}>

            {/* ── HEADER ── */}
            <div style={{ marginBottom: 36 }}>
                {/* accent line */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 32, height: 2, background: `linear-gradient(90deg, ${C.cyan}, ${C.indigo})`, borderRadius: 1 }} />
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700, color: C.cyan, letterSpacing: "0.4em", textTransform: "uppercase" }}>Global Rankings</span>
                </div>
                <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 900, color: C.text, textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 14 }}>
                    <Trophy style={{ width: 32, height: 32, color: "#f59e0b", filter: "drop-shadow(0 0 10px rgba(245,158,11,0.5))" }} />
                    LEADERBOARD
                </h1>
                <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, color: C.muted, fontWeight: 500, marginTop: 8 }}>
                    See who rules the arena. Can you reach the top?
                </p>
            </div>

            {/* ── TABS ── */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <motion.button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            style={{
                                display: "flex", alignItems: "center", gap: 7,
                                padding: "8px 16px", borderRadius: 40,
                                background: isActive ? "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(34,211,238,0.15))" : "rgba(15,23,42,0.6)",
                                border: isActive ? "1px solid rgba(34,211,238,0.4)" : "1px solid rgba(255,255,255,0.06)",
                                color: isActive ? C.cyan : C.muted,
                                fontFamily: "'Orbitron', sans-serif",
                                fontSize: 10, fontWeight: 700,
                                letterSpacing: "0.1em", textTransform: "uppercase",
                                cursor: "pointer",
                                boxShadow: isActive ? "0 0 16px rgba(34,211,238,0.15)" : "none",
                                transition: "all 0.2s",
                            }}
                        >
                            <Icon style={{ width: 14, height: 14 }} />
                            {tab.label}
                        </motion.button>
                    );
                })}
            </div>

            {/* ── TABLE ── */}
            <div style={{ ...card }}>
                {/* table header accent */}
                <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(34,211,238,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.cyan, boxShadow: `0 0 8px ${C.cyan}` }} />
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.25em", textTransform: "uppercase" }}>
                        {tabs.find(t => t.id === activeTab)?.label} Rankings
                    </span>
                </div>

                {isLoading ? (
                    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                        {[...Array(5)].map((_, i) => (
                            <div key={i} style={{ height: 56, borderRadius: 12, background: "rgba(255,255,255,0.03)", animation: "pulse 1.5s ease-in-out infinite" }} />
                        ))}
                    </div>
                ) : (
                    <div style={{ padding: 8 }}>
                        <LeaderboardTable entries={data} gameType={activeTab !== "ALL" ? activeTab : undefined} />
                    </div>
                )}
            </div>

            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </motion.div>
    );
}
