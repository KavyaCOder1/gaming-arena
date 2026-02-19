"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface GameCardProps {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    image: string;
    color?: string;
    delay?: number;
}

const COLOR_MAP: Record<string, { accent: string; glow: string; border: string }> = {
    blue:   { accent: "#22d3ee", glow: "rgba(34,211,238,0.35)",  border: "rgba(34,211,238,0.4)"  },
    green:  { accent: "#10b981", glow: "rgba(16,185,129,0.35)",  border: "rgba(16,185,129,0.4)"  },
    purple: { accent: "#a78bfa", glow: "rgba(167,139,250,0.35)", border: "rgba(167,139,250,0.4)" },
    yellow: { accent: "#f59e0b", glow: "rgba(245,158,11,0.35)",  border: "rgba(245,158,11,0.4)"  },
};

export function GameCard({ title, description, href, icon: Icon, image, color = "blue", delay = 0 }: GameCardProps) {
    const c = COLOR_MAP[color] ?? COLOR_MAP.blue;

    return (
        <Link href={href} style={{ display: "block", height: "100%", textDecoration: "none" }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay }}
                whileHover={{ y: -4 }}
                style={{
                    position: "relative",
                    height: 420,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 20,
                    background: "rgba(10,15,35,0.75)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                    cursor: "pointer",
                }}
            >
                {/* Image */}
                <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
                    <img
                        src={image}
                        alt={title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.35, filter: "grayscale(60%)" }}
                    />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,12,28,0.98) 0%, rgba(8,12,28,0.7) 50%, transparent 100%)" }} />
                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.08, backgroundImage: "linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06))", backgroundSize: "100% 2px, 3px 100%" }} />
                </div>

                {/* Top accent line */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${c.accent}60, transparent)`, zIndex: 2 }} />

                {/* Content */}
                <div style={{ position: "relative", zIndex: 10, padding: "28px 24px 24px", marginTop: "auto", display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                        <div style={{ padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.05)", border: `1px solid ${c.border}`, boxShadow: `0 0 16px ${c.glow}` }}>
                            <Icon style={{ width: 28, height: 28, color: c.accent, filter: `drop-shadow(0 0 6px ${c.accent})` }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.accent, boxShadow: `0 0 6px ${c.accent}`, display: "inline-block", animation: "gcPulse 2s infinite" }} />
                            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700, color: c.accent, letterSpacing: "0.15em", textTransform: "uppercase" }}>1.2k Live</span>
                        </div>
                    </div>

                    <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(22px, 3.5vw, 32px)", fontWeight: 900, color: "#f8fafc", textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 10 }}>
                        {title}
                    </h3>

                    <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 500, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.55, marginBottom: 20, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                        {description}
                    </p>

                    <div style={{ height: 48, overflow: "hidden", borderRadius: 12, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", background: `${c.accent}08` }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = c.accent;
                            (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${c.glow}`;
                            const span = (e.currentTarget as HTMLElement).querySelector("span") as HTMLElement;
                            if (span) span.style.color = "#020617";
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = `${c.accent}08`;
                            (e.currentTarget as HTMLElement).style.boxShadow = "none";
                            const span = (e.currentTarget as HTMLElement).querySelector("span") as HTMLElement;
                            if (span) span.style.color = c.accent;
                        }}
                    >
                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, color: c.accent, letterSpacing: "0.3em", textTransform: "uppercase", transition: "color 0.3s" }}>ENGAGE MISSION</span>
                    </div>
                </div>

                <style>{`@keyframes gcPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
            </motion.div>
        </Link>
    );
}
