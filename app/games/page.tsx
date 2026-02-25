"use client";

import { motion } from "framer-motion";
import { GameCard } from "@/components/game/GameCard";
import { Search, Grid, LayoutGrid, Ghost, Zap, Flame, Trophy, Play, Gamepad2, Worm, Rocket, Grid3X3 } from "lucide-react";

const C = { cyan: "#22d3ee", indigo: "#6366f1", text: "#f8fafc", muted: "#64748b" };

const games = [
    { title: "Word Search",      description: "Find hidden words in a grid. Test your vocabulary and speed in this classic puzzle game.",               image: "/wordsearch.webp",    icon: Search,   href: "/games/word-search",    color: "blue"   },
    { title: "Tic Tac Toe",      description: "Challenge the AI or a friend in this timeless strategy game. Can you beat the Hard mode?",              image: "/tictactoe.webp",    icon: Grid,     href: "/games/tic-tac-toe",   color: "green"  },
    { title: "Memory Game",      description: "Test your memory by matching pairs of cards. Race against the clock to set a high score.",               image: "/memorygame.png",    icon: LayoutGrid,href: "/games/memory",        color: "purple" },
    { title: "Connect The Dots", description: "Connect all matching color dots without breaking the flow. Easy, Medium, and Hard puzzle grids.",        image: "/connect-dots.webp", icon: Grid3X3,  href: "/games/connect-dots",  color: "purple", imagePosition: "center 40%" },
    { title: "Pacman",           description: "Navigate the maze, eat dots, and avoid ghosts in this retro arcade classic.",                            image: "/pacman_img.webp",   icon: Ghost,    href: "/games/pacman",        color: "yellow", imagePosition: "center 20%" },
    { title: "Snake Arena",      description: "Collect energy cores, grow your snake, and survive the grid as long as possible.",                       image: "/snake.webp",        icon: Worm,     href: "/games/snake",         color: "green"  },
    { title: "Star Siege",       description: "Blast through enemy waves in this space shooter. Auto-fire cannons, missile volleys, survive!",          image: "/starsiege.webp",    icon: Rocket,   href: "/games/space-shooter", color: "yellow" },
];

const filterBtns = ["All Zones", "Strategic", "Arcade", "Puzzle"];

export default function GamesPage() {
    return (
        <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} style={{ width: "100%", margin: 0, padding: 0 }}>

            {/* ── CINEMATIC HEADER ── */}
            <div style={{ position: "relative", borderRadius: 22, overflow: "hidden", background: "rgba(10,15,35,0.8)", border: "1px solid rgba(34,211,238,0.15)", paddingTop: 16, paddingBottom: 20, paddingLeft: 28, paddingRight: 28, marginTop: 0, marginBottom: 28, backdropFilter: "blur(16px)" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(34,211,238,0.6),rgba(99,102,241,0.4),transparent)" }} />
                <div style={{ position: "absolute", top: -60, right: -80, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 70%)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: -60, left: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,rgba(34,211,238,0.1) 0%,transparent 70%)", pointerEvents: "none" }} />

                <div style={{ position: "relative", zIndex: 1, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      
                        <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(28px,6vw,58px)", fontWeight: 900, color: C.text, textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.03em", lineHeight: 0.92, marginBottom: 16 }}>
                            COMBAT<br /><span style={{ color: C.cyan, textShadow: "0 0 30px rgba(34,211,238,0.4)" }}>SECTOR</span>
                        </h1>
                        <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "clamp(12px,2.5vw,14px)", color: C.muted, fontWeight: 500, letterSpacing: "0.05em", maxWidth: 440, marginBottom: 20 }}>
                            Select your operational zone. Complete missions to climb the global leaderboard.
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Trophy style={{ width: 16, height: 16, color: "#f59e0b" }} />
                                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>Global Rewards</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Zap style={{ width: 16, height: 16, color: C.cyan }} />
                                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>Instant Deploy</span>
                            </div>
                        </div>
                    </div>

                    {/* icon — shown on larger screens */}
                    <div style={{ position: "relative", width: 130, height: 130, flexShrink: 0, display: "none" }} id="games-hero-icon">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            style={{ position: "absolute", inset: 0, border: "12px solid rgba(255,255,255,0.04)", borderRadius: "50%" }} />
                        <div style={{ position: "absolute", inset: 10, border: "1px solid rgba(34,211,238,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(10,15,35,0.7)", backdropFilter: "blur(8px)" }}>
                            <Gamepad2 style={{ width: 52, height: 52, color: C.indigo, filter: "drop-shadow(0 0 20px rgba(99,102,241,0.6))" }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── FILTERS ── */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
                    {filterBtns.map((label, i) => (
                        <button key={label} style={{ padding: "7px 16px", borderRadius: 40, background: i === 0 ? "linear-gradient(135deg,rgba(99,102,241,0.3),rgba(34,211,238,0.2))" : "rgba(15,23,42,0.6)", border: i === 0 ? "1px solid rgba(34,211,238,0.4)" : "1px solid rgba(255,255,255,0.06)", color: i === 0 ? C.cyan : C.muted, fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap" }}>
                            {label}
                        </button>
                    ))}
                </div>
                <div style={{ position: "relative", width: "100%", maxWidth: 220 }}>
                    <Search style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: C.muted, pointerEvents: "none" }} />
                    <input type="text" placeholder="SEARCH..." style={{ background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 40, padding: "9px 16px 9px 38px", color: C.text, fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", outline: "none", width: "100%", backdropFilter: "blur(8px)", boxSizing: "border-box" }} />
                </div>
            </div>

            {/* ── GAMES GRID - RESPONSIVE ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
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
                @keyframes gPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
                @media(min-width:560px){ #games-hero-icon { display: block !important; } }
                @media (max-width: 768px) {
                    [style*="gridTemplateColumns: repeat(2"] {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                }
                @media (min-width: 768px) {
                    [style*="gridTemplateColumns: repeat(2"] {
                        grid-template-columns: repeat(3, 1fr) !important;
                    }
                }
                @media (min-width: 1024px) {
                    [style*="gridTemplateColumns: repeat(2"] {
                        grid-template-columns: repeat(4, 1fr) !important;
                    }
                }
            `}</style>
        </motion.div>
    );
}
