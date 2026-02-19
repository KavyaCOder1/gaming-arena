"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trophy, RefreshCcw, Home, X, Zap } from "lucide-react";
import Link from "next/link";

interface ScoreModalProps {
    isOpen: boolean;
    score: number;
    gameType: string;
    onRestart: () => void;
    onClose: () => void;
    isWin: boolean;
}

export function ScoreModal({ isOpen, score, gameType, onRestart, onClose, isWin }: ScoreModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.88, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.88, y: 24 }}
                        transition={{ type: "spring", damping: 18, stiffness: 220 }}
                        style={{
                            position: "relative",
                            width: "100%",
                            maxWidth: 420,
                            padding: "36px 28px 28px",
                            borderRadius: 24,
                            background: "rgba(10,15,35,0.96)",
                            backdropFilter: "blur(24px)",
                            WebkitBackdropFilter: "blur(24px)",
                            border: `1px solid ${isWin ? "rgba(245,158,11,0.35)" : "rgba(239,68,68,0.3)"}`,
                            boxShadow: `0 0 60px ${isWin ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.12)"}, 0 24px 60px rgba(0,0,0,0.6)`,
                            overflow: "hidden",
                        }}
                    >
                        {/* top accent */}
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${isWin ? "rgba(245,158,11,0.8)" : "rgba(239,68,68,0.7)"}, transparent)` }} />

                        {/* shimmer */}
                        <motion.div
                            animate={{ x: ["-100%", "200%"] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1, ease: "linear" }}
                            style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, transparent, ${isWin ? "rgba(245,158,11,0.06)" : "rgba(239,68,68,0.05)"}, transparent)`, pointerEvents: "none" }}
                        />

                        {/* close */}
                        <button
                            onClick={onClose}
                            style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", transition: "all 0.2s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "#f8fafc"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = "#475569"; }}
                        >
                            <X style={{ width: 16, height: 16 }} />
                        </button>

                        {/* content */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                            {/* icon circle */}
                            <motion.div
                                animate={{ scale: [1, 1.12, 0.96, 1.05, 1] }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                                style={{ width: 100, height: 100, borderRadius: "50%", background: isWin ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.1)", border: `2px solid ${isWin ? "rgba(245,158,11,0.4)" : "rgba(239,68,68,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: `0 0 30px ${isWin ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.15)"}` }}
                            >
                                <Trophy style={{ width: 48, height: 48, color: isWin ? "#f59e0b" : "#ef4444", filter: `drop-shadow(0 0 12px ${isWin ? "rgba(245,158,11,0.6)" : "rgba(239,68,68,0.5)"})` }} />
                            </motion.div>

                            {/* title */}
                            <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 900, color: isWin ? "#f59e0b" : "#ef4444", textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", marginBottom: 10, filter: `drop-shadow(0 0 12px ${isWin ? "rgba(245,158,11,0.5)" : "rgba(239,68,68,0.4)"})` }}>
                                {isWin ? "VICTORY!" : "DEFEATED"}
                            </h2>

                            <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, color: "#64748b", fontWeight: 500, marginBottom: 28, letterSpacing: "0.04em" }}>
                                You scored{" "}
                                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, fontWeight: 900, color: "#f8fafc" }}>{score}</span>
                                {" "}pts in{" "}
                                <span style={{ color: "#22d3ee", fontWeight: 700 }}>{gameType.replace("_", " ")}</span>
                            </p>

                            {/* score badge */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", borderRadius: 40, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", marginBottom: 28 }}>
                                <Zap style={{ width: 16, height: 16, color: "#f59e0b" }} />
                                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, fontWeight: 900, color: "#f59e0b" }}>+{score} XP</span>
                            </div>

                            {/* buttons */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%" }}>
                                <motion.button
                                    onClick={onRestart}
                                    whileHover={{ scale: 1.03, y: -2 }}
                                    whileTap={{ scale: 0.97 }}
                                    style={{ padding: "14px", borderRadius: 14, background: "linear-gradient(135deg, #22d3ee, #6366f1)", border: "none", cursor: "pointer", fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "#020617", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 0 20px rgba(34,211,238,0.3)" }}
                                >
                                    <RefreshCcw style={{ width: 14, height: 14 }} />
                                    PLAY AGAIN
                                </motion.button>

                                <Link href="/dashboard" style={{ textDecoration: "none" }}>
                                    <motion.div
                                        whileHover={{ scale: 1.03, y: -2 }}
                                        whileTap={{ scale: 0.97 }}
                                        style={{ padding: "14px", borderRadius: 14, background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                                    >
                                        <Home style={{ width: 14, height: 14 }} />
                                        DASHBOARD
                                    </motion.div>
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
