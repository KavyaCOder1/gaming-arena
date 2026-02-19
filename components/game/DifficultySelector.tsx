"use client";

import { motion } from "framer-motion";

interface DifficultySelectorProps {
    currentDifficulty: "EASY" | "MEDIUM" | "HARD";
    onSelect: (difficulty: "EASY" | "MEDIUM" | "HARD") => void;
    disabled?: boolean;
}

const DIFFS = [
    { id: "EASY",   label: "ROOKIE",  color: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.4)",  glow: "rgba(16,185,129,0.25)"  },
    { id: "MEDIUM", label: "VETERAN", color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.4)",  glow: "rgba(245,158,11,0.25)"  },
    { id: "HARD",   label: "ELITE",   color: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.4)",   glow: "rgba(239,68,68,0.25)"   },
] as const;

export function DifficultySelector({ currentDifficulty, onSelect, disabled }: DifficultySelectorProps) {
    return (
        <div style={{ display: "flex", gap: 8, padding: 6, background: "rgba(15,23,42,0.6)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}>
            {DIFFS.map((d) => {
                const isActive = currentDifficulty === d.id;
                return (
                    <motion.button
                        key={d.id}
                        onClick={() => !disabled && onSelect(d.id)}
                        disabled={disabled}
                        whileHover={!disabled ? { y: -1 } : {}}
                        whileTap={!disabled ? { scale: 0.96 } : {}}
                        style={{
                            flex: 1,
                            padding: "10px 8px",
                            borderRadius: 10,
                            background: isActive ? d.bg : "transparent",
                            border: `1px solid ${isActive ? d.border : "transparent"}`,
                            boxShadow: isActive ? `0 0 14px ${d.glow}` : "none",
                            cursor: disabled ? "not-allowed" : "pointer",
                            opacity: disabled && !isActive ? 0.35 : 1,
                            transition: "all 0.2s",
                            position: "relative",
                            overflow: "hidden",
                        }}
                    >
                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700, color: isActive ? d.color : "#475569", letterSpacing: "0.12em", textTransform: "uppercase", display: "block", transition: "color 0.2s" }}>
                            {d.label}
                        </span>
                        {isActive && (
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: d.color, boxShadow: `0 0 6px ${d.color}` }} />
                        )}
                    </motion.button>
                );
            })}
        </div>
    );
}
