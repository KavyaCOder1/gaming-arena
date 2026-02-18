"use client";

import { useAuthStore } from "@/store/auth-store";
import dynamic from "next/dynamic";
import { Trophy, Gamepad2, Timer, Flame, Sparkles, User, Zap } from "lucide-react";

const GameHistoryTable = dynamic(() => import("@/components/dashboard/GameHistoryTable").then(mod => ({ default: mod.GameHistoryTable })), { ssr: false });
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { useEffect, useState } from "react";
import { GameHistoryWithUser } from "@/types";

/* ── tokens ── */
const C = { cyan: "#22d3ee", indigo: "#6366f1", dark: "rgba(15,23,42,0.75)", border: "rgba(34,211,238,0.12)", text: "#f8fafc", muted: "#64748b", slate: "#475569" };
const card = { background: C.dark, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: `1px solid ${C.border}`, borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
const fadeUp: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const container: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.2, staggerChildren: 0 } } };

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState({ totalGames: 0, highScore: 0, playTime: 0, winRate: 0 });
    const [history, setHistory] = useState<GameHistoryWithUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/dashboard/stats");
                const data = await res.json();
                if (data.success) { setStats(data.stats); setHistory(data.history); }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        if (user) fetchStats();
    }, [user]);

    const statCards = [
        { label: "Total Games", value: stats.totalGames, icon: Gamepad2, color: C.indigo, sub: "+12.5% vs last week", subColor: "#4ade80" },
        { label: "High Score", value: stats.highScore.toLocaleString(), icon: Trophy, color: C.cyan, sub: "PACMAN CLASSIC / HARD", subColor: C.muted },
        { label: "Win/Loss Ratio", value: (stats.winRate / 100).toFixed(2), icon: Flame, color: "#f43f5e", sub: null, bar: stats.winRate },
    ];

    return (
        <motion.div variants={container} initial="hidden" animate="show" style={{ padding: "clamp(20px, 4vw, 32px) clamp(8px, 3vw, 12px) 100px", width: "100%", overflowX: "hidden" }}>

            {/* ── HEADER ── */}
            <motion.header variants={fadeUp} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: "clamp(12px, 3vw, 16px)", marginBottom: "clamp(24px, 4vw, 36px)" }}>
                <div>
                    <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 900, color: C.text, textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", marginBottom: "clamp(4px, 1vw, 6px)" }}>
                        OPERATIONS HUB
                    </h1>
                    <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "clamp(9px, 2vw, 11px)", fontWeight: 700, color: C.muted, letterSpacing: "0.3em", textTransform: "uppercase" }}>
                        Sector 7-G / User Performance Protocol
                    </p>
                </div>

                <div style={{ ...card, padding: "clamp(8px, 2vw, 10px) clamp(12px, 3vw, 18px)", display: "flex", alignItems: "center", gap: "clamp(8px, 2vw, 10px)", borderColor: "rgba(34,211,238,0.2)" }}>
                    <Sparkles style={{ width: "clamp(14px, 2.5vw, 16px)", height: "clamp(14px, 2.5vw, 16px)", color: "#f59e0b" }} />
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(11px, 2.5vw, 13px)", fontWeight: 900, color: C.text }}>{stats.totalGames * 10} XP</span>
                </div>
            </motion.header>

            {/* ── STATS ROW: profile + 3 stat cards, responsive grid ── */}
            <motion.section variants={fadeUp} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "clamp(12px, 2vw, 20px)", marginBottom: "clamp(24px, 4vw, 32px)" }} className="stats-grid">

                {/* Profile card */}
                <div style={{ ...card, padding: "clamp(14px, 3vw, 20px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative", overflow: "hidden", borderColor: "rgba(34,211,238,0.25)", minHeight: "clamp(160px, 40vw, 200px)" }}>
                    <div style={{ position: "absolute", top: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
                    <div style={{ position: "relative", marginBottom: "clamp(8px, 2vw, 12px)" }}>
                        <div style={{ width: "clamp(48px, 12vw, 64px)", height: "clamp(48px, 12vw, 64px)", borderRadius: "50%", border: "2px solid rgba(34,211,238,0.5)", padding: 3, boxShadow: "0 0 20px rgba(34,211,238,0.25)" }}>
                            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "rgba(15,23,42,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {user?.username
                                    ? <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(18px, 5vw, 26px)", fontWeight: 900, color: C.cyan }}>{user.username[0].toUpperCase()}</span>
                                    : <User style={{ width: "clamp(20px, 5vw, 28px)", height: "clamp(20px, 5vw, 28px)", color: C.slate }} />}
                            </div>
                        </div>
                        <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", background: C.cyan, color: "#020617", padding: "2px 8px", borderRadius: 5, fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(6px, 1.5vw, 8px)", fontWeight: 900, letterSpacing: "0.12em", whiteSpace: "nowrap", boxShadow: "0 0 10px rgba(34,211,238,0.5)" }}>ELITE</div>
                    </div>
                    <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(10px, 2.5vw, 12px)", fontWeight: 900, color: C.text, textTransform: "uppercase", marginBottom: 2, marginTop: 3 }}>{user?.username}</h2>
                    <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "clamp(7px, 1.8vw, 9px)", fontWeight: 700, color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>MEMBER SINCE 2024</p>
                </div>

                {/* 3 stat cards */}
                {statCards.map((s, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ scale: 1.02 }}
                        style={{ ...card, padding: "clamp(14px, 3vw, 20px)", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden", cursor: "default", transition: "border-color 0.25s", minHeight: "clamp(160px, 40vw, 200px)" }}
                    >
                        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle, ${s.color}18 0%, transparent 70%)`, pointerEvents: "none" }} />
                        {/* label + icon */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(6px, 1.8vw, 8px)", fontWeight: 700, color: C.muted, letterSpacing: "0.2em", textTransform: "uppercase" }}>{s.label}</span>
                            <s.icon style={{ width: "clamp(14px, 3vw, 16px)", height: "clamp(14px, 3vw, 16px)", color: s.color, filter: `drop-shadow(0 0 5px ${s.color}80)`, flexShrink: 0 }} />
                        </div>
                        {/* big number */}
                        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(22px, 5vw, 40px)", fontWeight: 900, color: C.text, lineHeight: 1, marginTop: "clamp(10px, 2vw, 14px)" }}>{s.value}</div>
                        {/* sub text */}
                        {s.sub && <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "clamp(8px, 2vw, 10px)", color: s.subColor, fontWeight: 700, marginTop: "clamp(8px, 2vw, 10px)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.sub}</div>}
                        {/* bar */}
                        {s.bar !== undefined && (
                            <div style={{ marginTop: "clamp(10px, 2vw, 14px)", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                                <motion.div initial={{ width: 0 }} animate={{ width: `${s.bar}%` }} transition={{ duration: 1, delay: 0.3 }}
                                    style={{ height: "100%", background: `linear-gradient(90deg, #f43f5e, ${C.indigo})`, borderRadius: 2 }} />
                            </div>
                        )}
                    </motion.div>
                ))}
            </motion.section>

            {/* ── BOTTOM: activity + side widgets ── */}
            <motion.div variants={fadeUp} style={{ display: "grid", gap: 20 }} className="bottom-grid">

                {/* Recent Activity */}
                <div style={{ ...card, overflow: "hidden" }}>
                    <div style={{ padding: "clamp(14px, 3vw, 18px) clamp(18px, 3vw, 24px)", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(11px, 2.5vw, 13px)", fontWeight: 900, color: C.text, display: "flex", alignItems: "center", gap: 10 }}>
                            <Timer style={{ width: "clamp(15px, 3vw, 17px)", height: "clamp(15px, 3vw, 17px)", color: C.indigo }} />
                            RECENT ACTIVITY
                        </h3>
                        <Link href="/dashboard/profile" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(7px, 2vw, 9px)", color: C.cyan, textDecoration: "none", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700 }}>View Full Log</Link>
                    </div>
                    <div style={{ padding: "clamp(6px, 1.5vw, 8px)" }}>
                        <GameHistoryTable history={history} />
                    </div>
                </div>

                {/* Side: skill + badges stacked */}
                <div style={{ display: "flex", flexDirection: "column", gap: "clamp(16px, 3vw, 20px)" }}>

                    {/* Skill Distribution */}
                    <div style={{ ...card, padding: "clamp(18px, 3vw, 24px)" }}>
                        <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(11px, 2.5vw, 13px)", fontWeight: 900, color: C.text, marginBottom: "clamp(14px, 3vw, 20px)", display: "flex", alignItems: "center", gap: 10 }}>
                            <Trophy style={{ width: "clamp(14px, 3vw, 16px)", height: "clamp(14px, 3vw, 16px)", color: C.cyan }} />
                            SKILL DISTRIBUTION
                        </h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(12px, 2vw, 16px)" }}>
                            {[
                                { label: "Word Match", value: 68, color: C.indigo },
                                { label: "Tic Tac Toe", value: 82, color: C.cyan },
                                { label: "Memory", value: 35, color: "#f43f5e" },
                                { label: "Pacman", value: stats.winRate || 74, color: "#f59e0b" },
                            ].map((skill: any, i: any) => (
                                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <div style={{ position: "relative", width: "clamp(64px, 15vw, 76px)", height: "clamp(64px, 15vw, 76px)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "clamp(6px, 1.5vw, 8px)" }}>
                                        <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                                            <circle cx="38" cy="38" r="30" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                                            <motion.circle cx="38" cy="38" r="30" fill="none" stroke={skill.color} strokeWidth="4" strokeLinecap="round"
                                                initial={{ strokeDashoffset: 188 }}
                                                animate={{ strokeDashoffset: 188 - (188 * skill.value) / 100 }}
                                                transition={{ duration: 1.2, delay: i * 0.1 }}
                                                style={{ strokeDasharray: 188, filter: `drop-shadow(0 0 4px ${skill.color}80)` }}
                                            />
                                        </svg>
                                        <span style={{ position: "absolute", fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(10px, 2.5vw, 12px)", fontWeight: 900, color: C.text }}>{skill.value}%</span>
                                    </div>
                                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(7px, 1.8vw, 8px)", fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center" }}>{skill.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Badges */}
                    <div style={{ ...card, padding: "clamp(18px, 3vw, 24px)", display: "flex", flexWrap: "wrap", gap: "clamp(8px, 2vw, 10px)" }}>
                        {[
                            { icon: Trophy, color: "#f59e0b", border: "rgba(245,158,11,0.4)", glow: "rgba(245,158,11,0.2)" },
                            { icon: Zap, color: C.indigo, border: "rgba(99,102,241,0.4)", glow: "rgba(99,102,241,0.2)" },
                            { icon: Timer, color: "#10b981", border: "rgba(16,185,129,0.4)", glow: "rgba(16,185,129,0.2)" },
                        ].map((badge: any, i: any) => {
                            const Icon = badge.icon;
                            return (
                                <motion.div
                                    key={i}
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    style={{
                                        width: "clamp(40px, 8vw, 48px)",
                                        height: "clamp(40px, 8vw, 48px)",
                                        borderRadius: "clamp(10px, 2vw, 13px)",
                                        background: "rgba(15,23,42,0.8)",
                                        border: `1px solid ${badge.border}`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        boxShadow: `0 0 14px ${badge.glow}`,
                                        cursor: "default"
                                    }}
                                >
                                    <Icon style={{ width: "clamp(18px, 4vw, 22px)", height: "clamp(18px, 4vw, 22px)", color: badge.color }} />
                                </motion.div>
                            );
                        })}

                        {[1, 2].map((_, i: any) => (
                            <div
                                key={`locked-${i}`}
                                style={{
                                    width: "clamp(40px, 8vw, 48px)",
                                    height: "clamp(40px, 8vw, 48px)",
                                    borderRadius: "clamp(10px, 2vw, 13px)",
                                    background: "rgba(15,23,42,0.4)",
                                    border: "1px solid rgba(255,255,255,0.06)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: 0.3
                                }}
                            >
                                <Zap style={{ width: "clamp(18px, 4vw, 22px)", height: "clamp(18px, 4vw, 22px)", color: C.muted }} />
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

