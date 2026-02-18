"use client";

import { motion } from "framer-motion";
import { GameCard } from "@/components/game/GameCard";
import { Search, Grid, LayoutGrid, Ghost, Zap, Flame, Trophy, Play, Gamepad2 } from "lucide-react";

const C = { cyan: "#22d3ee", indigo: "#6366f1", text: "#f8fafc", muted: "#64748b" };

const games = [
    { title: "Word Search", description: "Find hidden words in a grid. Test your vocabulary and speed in this classic puzzle game.", image: "https://images.unsplash.com/photo-1632516643720-e7f5d7d6ecc9?q=80&w=1000&auto=format&fit=crop", icon: Search, href: "/games/word-search", color: "blue" },
    { title: "Tic Tac Toe", description: "Challenge the AI or a friend in this timeless strategy game. Can you beat the Hard mode?", image: "https://images.unsplash.com/photo-1668901382969-8c73e450a1f5?q=80&w=1000&auto=format&fit=crop", icon: Grid, href: "/games/tic-tac-toe", color: "green" },
    { title: "Memory Game", description: "Test your memory by matching pairs of cards. Race against the clock to set a high score.", image: "https://images.unsplash.com/photo-1611996575749-79a3a250f968?q=80&w=1000&auto=format&fit=crop", icon: LayoutGrid, href: "/games/memory", color: "purple" },
    { title: "Pacman", description: "Navigate the maze, eat dots, and avoid ghosts in this retro arcade classic.", image: "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?q=80&w=1000&auto=format&fit=crop", icon: Ghost, href: "/games/pacman", color: "yellow" },
];

const filterBtns = ["All Zones", "Strategic", "Arcade", "Puzzle"];

export default function GamesPage() {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: "32px 24px 100px" }}>

            {/* ── CINEMATIC HEADER ── */}
            <div style={{ position: "relative", borderRadius: 28, overflow: "hidden", background: "rgba(10,15,35,0.8)", border: "1px solid rgba(34,211,238,0.15)", padding: "48px 40px", marginBottom: 36, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
                {/* top accent */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.6), rgba(99,102,241,0.4), transparent)" }} />
                {/* bg glows */}
                <div style={{ position: "absolute", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: -60, left: -60, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />

                <div style={{ position: "relative", zIndex: 1, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 32 }}>
                    <div style={{ flex: 1, minWidth: 240 }}>
                        {/* live badge */}
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 20, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", marginBottom: 18 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.cyan, boxShadow: `0 0 8px ${C.cyan}`, animation: "pulse 2s infinite", display: "inline-block" }} />
                            <Flame style={{ width: 13, height: 13, color: C.indigo }} />
                            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700, color: C.indigo, letterSpacing: "0.2em", textTransform: "uppercase" }}>Season 1 Live</span>
                        </div>

                        <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(32px, 6vw, 60px)", fontWeight: 900, color: C.text, textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.03em", lineHeight: 0.9, marginBottom: 18 }}>
                            COMBAT<br /><span style={{ color: C.cyan, textShadow: "0 0 30px rgba(34,211,238,0.4)" }}>SECTOR</span>
                        </h1>
                        <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, color: C.muted, fontWeight: 500, letterSpacing: "0.05em", maxWidth: 480, marginBottom: 24 }}>
                            Select your operational zone. Complete missions to climb the global leaderboard and secure territory.
                        </p>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Trophy style={{ width: 18, height: 18, color: "#f59e0b" }} />
                                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>Global Rewards</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 20, borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                                <Zap style={{ width: 18, height: 18, color: C.cyan }} />
                                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>Instant Deploy</span>
                            </div>
                        </div>
                    </div>

                    {/* Rotating icon */}
                    <div style={{ position: "relative", width: 160, height: 160, flexShrink: 0 }} className="hidden md:block">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            style={{ position: "absolute", inset: 0, border: "16px solid rgba(255,255,255,0.04)", borderRadius: "50%" }}
                        />
                        <div style={{ position: "absolute", inset: 12, border: "1px solid rgba(34,211,238,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,15,35,0.7)", backdropFilter: "blur(8px)" }}>
                            <Gamepad2 style={{ width: 64, height: 64, color: C.indigo, filter: "drop-shadow(0 0 20px rgba(99,102,241,0.6))" }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── FILTERS ── */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 28, padding: "0 4px" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {filterBtns.map((label, i) => (
                        <button
                            key={label}
                            style={{
                                padding: "8px 18px", borderRadius: 40,
                                background: i === 0 ? "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(34,211,238,0.2))" : "rgba(15,23,42,0.6)",
                                border: i === 0 ? "1px solid rgba(34,211,238,0.4)" : "1px solid rgba(255,255,255,0.06)",
                                color: i === 0 ? C.cyan : C.muted,
                                fontFamily: "'Orbitron', sans-serif",
                                fontSize: 9, fontWeight: 700,
                                letterSpacing: "0.12em", textTransform: "uppercase",
                                cursor: "pointer", transition: "all 0.2s",
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div style={{ position: "relative" }}>
                    <Search style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: C.muted, pointerEvents: "none" }} />
                    <input
                        type="text"
                        placeholder="SEARCH SECTOR..."
                        style={{ background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 40, padding: "9px 16px 9px 40px", color: C.text, fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", outline: "none", width: 220, backdropFilter: "blur(8px)", transition: "all 0.2s" }}
                        onFocus={(e) => { e.target.style.borderColor = "rgba(34,211,238,0.4)"; e.target.style.boxShadow = "0 0 12px rgba(34,211,238,0.12)"; }}
                        onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
                    />
                </div>
            </div>

            {/* ── GAMES GRID ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
                {games.map((game, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07, type: "spring", damping: 22, stiffness: 180 }}
                        style={{ position: "relative" }}
                        className="group"
                    >
                        <GameCard {...game} delay={i * 0.05} />
                        <div style={{ position: "absolute", top: 14, right: 14, zIndex: 20, opacity: 0, transition: "opacity 0.2s" }} className="group-hover:opacity-100">
                            <div style={{ background: C.indigo, padding: 8, borderRadius: 10, boxShadow: "0 0 16px rgba(99,102,241,0.5)" }}>
                                <Play style={{ width: 14, height: 14, color: "#fff", fill: "#fff" }} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        </motion.div>
    );
}
