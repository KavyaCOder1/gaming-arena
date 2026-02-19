"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    color?: "primary" | "secondary" | "accent" | "destructive";
    delay?: number;
}

const COLOR = {
    primary:     { hex: "#6366f1", glow: "rgba(99,102,241,0.25)",  bar: "rgba(99,102,241,0.8)"  },
    secondary:   { hex: "#22d3ee", glow: "rgba(34,211,238,0.25)",  bar: "rgba(34,211,238,0.8)"  },
    accent:      { hex: "#a78bfa", glow: "rgba(167,139,250,0.25)", bar: "rgba(167,139,250,0.8)" },
    destructive: { hex: "#ef4444", glow: "rgba(239,68,68,0.25)",   bar: "rgba(239,68,68,0.8)"   },
};

export function StatsCard({ title, value, icon: Icon, trend, color = "primary", delay = 0 }: StatsCardProps) {
    const c = COLOR[color];
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            style={{
                position: "relative",
                padding: "24px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                overflow: "hidden",
                borderRadius: 20,
                background: "rgba(15,23,42,0.75)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(34,211,238,0.12)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            }}
        >
            {/* corner glow */}
            <div style={{ position: "absolute", top: -32, right: -32, width: 128, height: 128, borderRadius: "50%", background: `radial-gradient(circle, ${c.glow} 0%, transparent 70%)`, pointerEvents: "none" }} />

            <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
                <div>
                    <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700, color: "#475569", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 6 }}>{title}</p>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(28px,3vw,40px)", fontWeight: 900, color: "#f8fafc", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</span>
                        {trend && (
                            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", padding: "2px 8px", borderRadius: 6 }}>{trend}</span>
                        )}
                    </div>
                </div>
                <motion.div
                    whileHover={{ scale: 1.12, rotate: 12 }}
                    style={{ padding: 14, borderRadius: 16, background: `${c.glow}`, border: `1px solid ${c.hex}28`, boxShadow: `0 0 18px ${c.glow}`, flexShrink: 0 }}
                >
                    <Icon style={{ width: 24, height: 24, color: c.hex, filter: `drop-shadow(0 0 6px ${c.hex}80)` }} />
                </motion.div>
            </div>

            {/* progress bar */}
            <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ height: 4, width: "100%", background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "70%" }}
                        transition={{ duration: 1, delay: delay + 0.3 }}
                        style={{ height: "100%", background: c.bar, borderRadius: 2, boxShadow: `0 0 8px ${c.hex}` }}
                    />
                </div>
            </div>
        </motion.div>
    );
}
