"use client";

import { motion } from "framer-motion";
import { GameCard } from "@/components/game/GameCard";
import { Hash, LayoutGrid, Ghost, Zap, Trophy, Play, Gamepad2, Activity, Rocket, Waypoints, Boxes, Search, Wallet } from "lucide-react";

const C = { cyan: "#22d3ee", indigo: "#6366f1", text: "#f8fafc", muted: "#64748b" };

const games = [
    { title: "Word Search",      description: "Find hidden words in a grid. Test your vocabulary and speed in this classic puzzle game.",               image: "/wordsearch.webp",    icon: Search,    href: "/games/word-search",    color: "blue"    },
    { title: "Tic Tac Toe",      description: "Challenge the AI or a friend in this timeless strategy game. Can you beat the Hard mode?",              image: "/tictactoe.webp",    icon: Hash,      href: "/games/tic-tac-toe",   color: "purple"  },
    { title: "Memory Game",      description: "Test your memory by matching pairs of cards. Race against the clock to set a high score.",               image: "/memorygame.png",    icon: LayoutGrid, href: "/games/memory",        color: "violet"  },
    { title: "Connect The Dots", description: "Connect all matching color dots without breaking the flow. Easy, Medium, and Hard puzzle grids.",        image: "/connect-dots.webp", icon: Waypoints, href: "/games/connect-dots",  color: "lime",  imagePosition: "center 5%" },
    { title: "Pacman",           description: "Navigate the maze, eat dots, and avoid ghosts in this retro arcade classic.",                            image: "/pacman_img.webp",   icon: Ghost,     href: "/games/pacman",        color: "yellow", imagePosition: "center 20%" },
    { title: "Snake Arena",      description: "Collect energy cores, grow your snake, and survive the grid as long as possible.",                       image: "/snake.webp",        icon: Activity,  href: "/games/snake",         color: "emerald" },
    { title: "Star Siege",       description: "Blast through enemy waves in this space shooter. Auto-fire cannons, missile volleys, survive!",          image: "/starsiege.webp",    icon: Rocket,    href: "/games/space-shooter", color: "orange"  },
    { title: "Block Breaker",    description: "Break all blocks across 10 levels. Classic arcade action with power-ups and customizable extras!",       image: "/block-breaker.webp", icon: Boxes,     href: "/games/block-breaker", color: "red"     },
];

export default function GamesPage() {
    return (
        <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} style={{ width: "100%", margin: 0, padding: 0 }}>

            {/* ── HEADER ── */}
            <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", marginBottom: 20, background: "linear-gradient(120deg, rgba(10,15,35,0.95) 60%, rgba(99,102,241,0.08) 100%)", border: "1px solid rgba(34,211,238,0.12)", backdropFilter: "blur(20px)" }}>

                {/* top glow line */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent 0%,#22d3ee 40%,#6366f1 70%,transparent 100%)" }} />
                {/* bottom glow line */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(99,102,241,0.3),transparent)" }} />
                {/* bg orbs */}
                <div style={{ position: "absolute", top: -40, right: 60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.14) 0%,transparent 70%)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: -30, left: 20, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle,rgba(34,211,238,0.08) 0%,transparent 70%)", pointerEvents: "none" }} />

                <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "22px 28px" }}>

                    {/* LEFT: text */}
                    <div style={{ flex: 1, minWidth: 0 }}>

                        {/* eyebrow badge */}
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", borderRadius: 20, padding: "4px 12px", marginBottom: 12 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d3ee", boxShadow: "0 0 6px #22d3ee", animation: "hdrPulse 2s ease-in-out infinite" }} />
                            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: "#22d3ee", letterSpacing: "0.3em", textTransform: "uppercase" }}>8 Games Available</span>
                        </div>

                        {/* title */}
                        <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, color: C.text, textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", lineHeight: 1, margin: "0 0 10px", fontSize: "clamp(22px,3.5vw,38px)" }}>
                            COMBAT{" "}
                            <span style={{ color: "#22d3ee", textShadow: "0 0 24px rgba(34,211,238,0.5), 0 0 60px rgba(34,211,238,0.2)" }}>SECTOR</span>
                        </h1>

                        {/* subtitle */}
                        <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "clamp(12px,1.5vw,14px)", color: "#94a3b8", fontWeight: 500, letterSpacing: "0.04em", lineHeight: 1.5, margin: "0 0 16px", maxWidth: 480 }}>
                            Choose your mission zone. Compete across 8 unique arenas,
                            earn XP, and rise through the global ranks.
                        </p>

                        {/* stat pills */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                            {[
                                { icon: <Trophy style={{ width: 13, height: 13, color: "#f59e0b" }} />, label: "Global Leaderboards", color: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)" },
                                { icon: <Zap style={{ width: 13, height: 13, color: "#22d3ee" }} />, label: "Instant Play", color: "rgba(34,211,238,0.08)", border: "rgba(34,211,238,0.2)" },
                                { icon: <Rocket style={{ width: 13, height: 13, color: "#a78bfa" }} />, label: "Earn XP & Rank Up", color: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)" },
                                { icon: <Wallet style={{ width: 13, height: 13, color: "#818cf8" }} />, label: "XP → Crypto · Phase 2", color: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.25)" },
                            ].map((s, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: s.color, border: `1px solid ${s.border}`, borderRadius: 20, padding: "5px 12px" }}>
                                    {s.icon}
                                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: "#cbd5e1", letterSpacing: "0.15em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{s.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT: icon */}
                    <div id="games-hero-icon" style={{ display: "none", flexShrink: 0, position: "relative", width: 100, height: 100 }}>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                            style={{ position: "absolute", inset: 0, border: "1px dashed rgba(34,211,238,0.25)", borderRadius: "50%" }} />
                        <motion.div animate={{ rotate: -360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                            style={{ position: "absolute", inset: 10, border: "1px dashed rgba(99,102,241,0.2)", borderRadius: "50%" }} />
                        <div style={{ position: "absolute", inset: 18, borderRadius: "50%", background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(34,211,238,0.1))", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
                            <Gamepad2 style={{ width: 30, height: 30, color: "#818cf8", filter: "drop-shadow(0 0 12px rgba(99,102,241,0.8))" }} />
                        </div>
                    </div>
                </div>
                <style>{`@keyframes hdrPulse { 0%,100%{opacity:1;box-shadow:0 0 6px #22d3ee} 50%{opacity:0.5;box-shadow:0 0 12px #22d3ee} }`}</style>
            </div>



            {/* ── XP REWARDS BANNER ── */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, type: "spring", damping: 22 }}
                style={{ marginBottom: 16, borderRadius: 16, overflow: "hidden", position: "relative",
                    background: "linear-gradient(120deg, rgba(99,102,241,0.07) 0%, rgba(34,211,238,0.04) 60%, rgba(251,191,36,0.05) 100%)",
                    border: "1px solid rgba(99,102,241,0.18)" }}
            >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,#6366f1,#22d3ee,transparent)" }} />
                <div style={{ padding: "14px 20px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                            background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(34,211,238,0.1))",
                            border: "1px solid rgba(99,102,241,0.3)",
                            display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Wallet style={{ width: 16, height: 16, color: "#818cf8", filter: "drop-shadow(0 0 6px rgba(99,102,241,0.8))" }} />
                        </div>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22d3ee", boxShadow: "0 0 6px #22d3ee", animation: "gamesBannerPulse 2s ease-in-out infinite" }} />
                                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 800, color: "#22d3ee", letterSpacing: "0.35em", textTransform: "uppercase" }}>Phase 2 · Coming Soon</span>
                            </div>
                            <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, fontWeight: 600, color: "#94a3b8", margin: 0, letterSpacing: "0.02em" }}>
                                Every game you play banks XP. <span style={{ color: "#818cf8", fontWeight: 700 }}>Soon you'll convert it to real crypto</span> — across any blockchain, zero fees.
                            </p>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                        {["Earn XP", "Build Rank", "Get Paid"].map((label, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5,
                                padding: "5px 12px", borderRadius: 20,
                                background: i === 2 ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
                                border: i === 2 ? "1px solid rgba(99,102,241,0.35)" : "1px solid rgba(255,255,255,0.06)" }}>
                                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 800,
                                    color: i === 2 ? "#818cf8" : "#475569",
                                    letterSpacing: "0.15em", textTransform: "uppercase",
                                    filter: i === 2 ? "drop-shadow(0 0 4px rgba(99,102,241,0.6))" : "none" }}>{label}</span>
                                {i < 2 && <span style={{ color: "#334155", fontSize: 10 }}>→</span>}
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
            <style>{`@keyframes gamesBannerPulse { 0%,100%{opacity:1;box-shadow:0 0 6px #22d3ee} 50%{opacity:0.5;box-shadow:0 0 12px #22d3ee} }`}</style>

            {/* ── GAMES GRID - RESPONSIVE ── */}
            <div className="games-grid" style={{ display: "grid", gap: 14 }}>
                {games.map((game, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07, type: "spring", damping: 22, stiffness: 180 }}
                        style={{ position: "relative", height: "100%" }}
                        onMouseEnter={e => { const btn = e.currentTarget.querySelector(".play-btn") as HTMLElement; if (btn) btn.style.opacity = "1"; }}
                        onMouseLeave={e => { const btn = e.currentTarget.querySelector(".play-btn") as HTMLElement; if (btn) btn.style.opacity = "0"; }}
                    >
                        <GameCard {...game} delay={i * 0.05} />
                        <div className="play-btn" style={{ position: "absolute", top: 14, right: 14, zIndex: 20, opacity: 0, transition: "opacity 0.2s", pointerEvents: "none" }}>
                            <div style={{ background: C.indigo, padding: 8, borderRadius: 10, boxShadow: "0 0 16px rgba(99,102,241,0.5)" }}>
                                <Play style={{ width: 14, height: 14, color: "#fff", fill: "#fff" }} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <style>{`
                /* Games grid breakpoints */
                .games-grid { grid-template-columns: repeat(2, 1fr); }
                @media (min-width: 768px)  { .games-grid { grid-template-columns: repeat(2, 1fr); } }
                @media (min-width: 1024px) { .games-grid { grid-template-columns: repeat(3, 1fr); } }
                @media (min-width: 1400px) { .games-grid { grid-template-columns: repeat(4, 1fr); } }
                @media (min-width: 1024px) { #games-hero-icon { display: block !important; } }

                /* Shrink header on desktop */
                @media (min-width: 1024px) {
                    .games-header-wrap { padding: 14px 22px 16px !important; margin-bottom: 18px !important; }
                }
            `}</style>
        </motion.div>
    );
}
