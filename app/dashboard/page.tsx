"use client";

import { useAuthStore } from "@/store/auth-store";
import { GameHistoryTable } from "@/components/dashboard/GameHistoryTable";
import { Trophy, Gamepad2, Timer, Flame, Sparkles, User, Zap } from "lucide-react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { useEffect, useState } from "react";
import { GameHistoryWithUser } from "@/types";

const C = { cyan: "#22d3ee", indigo: "#6366f1", dark: "rgba(15,23,42,0.75)", border: "rgba(34,211,238,0.12)", text: "#f8fafc", muted: "#64748b", slate: "#475569" };
const card = { background: C.dark, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: `1px solid ${C.border}`, borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
const fadeUp: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", damping: 22, stiffness: 180 } } };
const container: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };

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
        { label: "Total Games",    value: stats.totalGames,                     icon: Gamepad2, color: C.indigo,  sub: "+12.5% vs last week",   subColor: "#4ade80" },
        { label: "High Score",     value: stats.highScore.toLocaleString(),      icon: Trophy,   color: C.cyan,    sub: "PACMAN CLASSIC / HARD",  subColor: C.muted   },
        { label: "Win/Loss Ratio", value: (stats.winRate / 100).toFixed(2),      icon: Flame,    color: "#f43f5e", sub: null, bar: stats.winRate },
    ];

    return (
        <motion.div variants={container} initial="hidden" animate="show" style={{ width: "100%" }}>

            {/* ── HEADER ── */}
            <motion.header variants={fadeUp} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(18px,4vw,30px)", fontWeight: 900, color: C.text, textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", marginBottom: 6 }}>
                        OPERATIONS HUB
                    </h1>
                    <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.3em", textTransform: "uppercase" }}>
                        Sector 7-G · User Performance Protocol
                    </p>
                </div>
                <div style={{ ...card, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10, borderColor: "rgba(34,211,238,0.2)" }}>
                    <Sparkles style={{ width: 16, height: 16, color: "#f59e0b" }} />
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: C.text }}>{stats.totalGames * 10} XP</span>
                </div>
            </motion.header>

            {/* ── STATS GRID ── */}
            <motion.section variants={fadeUp} className="dash-stats" style={{ display: "grid", gap: 14, marginBottom: 20 }}>

                {/* Profile card */}
                <div style={{ ...card, padding: 22, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative", overflow: "hidden", borderColor: "rgba(34,211,238,0.25)", minHeight: 160 }}>
                    <div style={{ position: "absolute", top: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle,rgba(34,211,238,0.1) 0%,transparent 70%)", pointerEvents: "none" }} />
                    <div style={{ position: "relative", marginBottom: 12 }}>
                        <div style={{ width: 64, height: 64, borderRadius: "50%", border: "2px solid rgba(34,211,238,0.5)", padding: 3, boxShadow: "0 0 20px rgba(34,211,238,0.25)" }}>
                            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "rgba(15,23,42,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {user?.username
                                    ? <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 22, fontWeight: 900, color: C.cyan }}>{user.username[0].toUpperCase()}</span>
                                    : <User style={{ width: 24, height: 24, color: C.slate }} />}
                            </div>
                        </div>
                        <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", background: C.cyan, color: "#020617", padding: "2px 7px", borderRadius: 5, fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 900, letterSpacing: "0.12em", whiteSpace: "nowrap", boxShadow: "0 0 10px rgba(34,211,238,0.5)" }}>ELITE</div>
                    </div>
                    <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, color: C.text, textTransform: "uppercase", marginBottom: 2, marginTop: 4 }}>{user?.username}</h2>
                    <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.18em", textTransform: "uppercase" }}>MEMBER SINCE 2024</p>
                </div>

                {/* 3 stat cards */}
                {statCards.map((s, i) => (
                    <motion.div key={i} whileHover={{ scale: 1.02 }}
                        style={{ ...card, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden", minHeight: 160 }}>
                        <div style={{ position: "absolute", top: -30, right: -30, width: 110, height: 110, borderRadius: "50%", background: `radial-gradient(circle,${s.color}18 0%,transparent 70%)`, pointerEvents: "none" }} />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: "0.22em", textTransform: "uppercase" }}>{s.label}</span>
                            <s.icon style={{ width: 16, height: 16, color: s.color, filter: `drop-shadow(0 0 5px ${s.color}80)`, flexShrink: 0 }} />
                        </div>
                        <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(26px,3vw,40px)", fontWeight: 900, color: C.text, lineHeight: 1, marginTop: 10 }}>{s.value}</div>
                        {s.sub && <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 10, color: s.subColor, fontWeight: 700, marginTop: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.sub}</div>}
                        {s.bar !== undefined && (
                            <div style={{ marginTop: 10, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                                <motion.div initial={{ width: 0 }} animate={{ width: `${s.bar}%` }} transition={{ duration: 1, delay: 0.3 }}
                                    style={{ height: "100%", background: `linear-gradient(90deg,#f43f5e,${C.indigo})`, borderRadius: 2 }} />
                            </div>
                        )}
                    </motion.div>
                ))}
            </motion.section>

            {/* ── BOTTOM SECTION ── */}
            <motion.div variants={fadeUp} className="dash-bottom" style={{ display: "grid", gap: 18 }}>

                {/* Recent Activity */}
                <div style={{ ...card, overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <h3 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
                            <Timer style={{ width: 15, height: 15, color: C.indigo }} /> RECENT ACTIVITY
                        </h3>
                        <Link href="/dashboard/profile" style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: C.cyan, textDecoration: "none", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700 }}>View Log</Link>
                    </div>
                    <div style={{ padding: 8, overflowX: "auto" }}>
                        <GameHistoryTable history={history} />
                    </div>
                </div>

                {/* Side widgets */}
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    {/* Skill Distribution */}
                    <div style={{ ...card, padding: 22 }}>
                        <h3 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, color: C.text, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                            <Trophy style={{ width: 15, height: 15, color: C.cyan }} /> SKILL DISTRIBUTION
                        </h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                            {[
                                { label: "Word Match",  value: 68,                   color: C.indigo  },
                                { label: "Tic Tac Toe", value: 82,                   color: C.cyan    },
                                { label: "Memory",      value: 35,                   color: "#f43f5e" },
                                { label: "Pacman",      value: stats.winRate || 74,  color: "#f59e0b" },
                            ].map((skill, i) => (
                                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <div style={{ position: "relative", width: 70, height: 70, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                                        <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                                            <circle cx="35" cy="35" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                                            <motion.circle cx="35" cy="35" r="28" fill="none" stroke={skill.color} strokeWidth="4" strokeLinecap="round"
                                                initial={{ strokeDashoffset: 176 }}
                                                animate={{ strokeDashoffset: 176 - (176 * skill.value) / 100 }}
                                                transition={{ duration: 1.2, delay: i * 0.1 }}
                                                style={{ strokeDasharray: 176, filter: `drop-shadow(0 0 4px ${skill.color}80)` }}
                                            />
                                        </svg>
                                        <span style={{ position: "absolute", fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: C.text }}>{skill.value}%</span>
                                    </div>
                                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center" }}>{skill.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Badges */}
                    <div style={{ ...card, padding: 22 }}>
                        <h3 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, color: C.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                            <Sparkles style={{ width: 15, height: 15, color: "#f59e0b" }} /> MASTERED BADGES
                        </h3>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                            {[
                                { icon: Trophy, color: "#f59e0b", border: "rgba(245,158,11,0.4)",  glow: "rgba(245,158,11,0.2)" },
                                { icon: Zap,    color: C.indigo,  border: "rgba(99,102,241,0.4)",  glow: "rgba(99,102,241,0.2)" },
                                { icon: Timer,  color: "#10b981", border: "rgba(16,185,129,0.4)",  glow: "rgba(16,185,129,0.2)" },
                            ].map((badge, i) => (
                                <motion.div key={i} whileHover={{ scale: 1.1, rotate: 5 }}
                                    style={{ width: 46, height: 46, borderRadius: 12, background: "rgba(15,23,42,0.8)", border: `1px solid ${badge.border}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 14px ${badge.glow}`, cursor: "default" }}>
                                    <badge.icon style={{ width: 20, height: 20, color: badge.color }} />
                                </motion.div>
                            ))}
                            {[1, 2].map((_, i) => (
                                <div key={i} style={{ width: 46, height: 46, borderRadius: 12, background: "rgba(15,23,42,0.4)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.3 }}>
                                    <Zap style={{ width: 20, height: 20, color: C.muted }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>

            <style>{`
                /* stats: 4-col → 2-col → 1-col */
                .dash-stats { grid-template-columns: repeat(4,1fr); }
                @media(max-width:960px){ .dash-stats { grid-template-columns: repeat(2,1fr); } }
                @media(max-width:500px){ .dash-stats { grid-template-columns: 1fr; } }

                /* bottom: side-by-side → stacked */
                .dash-bottom { grid-template-columns: 1fr 300px; }
                @media(max-width:900px){ .dash-bottom { grid-template-columns: 1fr; } }
            `}</style>
        </motion.div>
    );
}
