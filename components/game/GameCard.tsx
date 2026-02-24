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
    blue: { accent: "#22d3ee", glow: "rgba(34,211,238,0.35)", border: "rgba(34,211,238,0.4)" },
    green: { accent: "#10b981", glow: "rgba(16,185,129,0.35)", border: "rgba(16,185,129,0.4)" },
    purple: { accent: "#a78bfa", glow: "rgba(167,139,250,0.35)", border: "rgba(167,139,250,0.4)" },
    yellow: { accent: "#f59e0b", glow: "rgba(245,158,11,0.35)", border: "rgba(245,158,11,0.4)" },
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
                    height: "clamp(280px, 90vw, 420px)",
                    aspectRatio: "auto",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: "clamp(12px, 4vw, 20px)",
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
                        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", opacity: 1 }}
                    />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(12,18,35,0.95) 0%, rgba(12,18,35,0.80) 30%, rgba(12,18,35,0.30) 65%, transparent 100%)" }} />
                </div>

                {/* Top accent line */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${c.accent}60, transparent)`, zIndex: 2 }} />

                {/* Content */}
                <div style={{ position: "relative", zIndex: 10, padding: "clamp(16px, 4vw, 28px) clamp(16px, 4vw, 24px)", marginTop: "auto", display: "flex", flexDirection: "column", gap: "clamp(10px, 2vw, 16px)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "clamp(8px, 2vw, 12px)" }}>
                        <div style={{ padding: "clamp(8px, 2vw, 12px)", borderRadius: "clamp(10px, 2vw, 14px)", background: "rgba(255,255,255,0.05)", border: `1px solid ${c.border}`, boxShadow: `0 0 16px ${c.glow}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Icon style={{ width: "clamp(20px, 5vw, 28px)", height: "clamp(20px, 5vw, 28px)", color: c.accent, filter: `drop-shadow(0 0 6px ${c.accent})` }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "clamp(4px, 1vw, 5px)", padding: "clamp(4px, 1vw, 4px) clamp(8px, 2vw, 10px)", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <span style={{ width: "clamp(4px, 1vw, 5px)", height: "clamp(4px, 1vw, 5px)", borderRadius: "50%", background: c.accent, boxShadow: `0 0 6px ${c.accent}`, display: "inline-block", animation: "gcPulse 2s infinite" }} />
                            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(6px, 2vw, 8px)", fontWeight: 700, color: c.accent, letterSpacing: "0.15em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Active</span>
                        </div>
                    </div>

                    <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(16px, 4vw, 28px)", fontWeight: 900, color: "#f8fafc", textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", lineHeight: 1, margin: 0 }}>
                        {title}
                    </h3>

                    <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "clamp(9px, 2.5vw, 11px)", fontWeight: 500, color: "#cbd5e1", letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.4, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                        {description}
                    </p>

                    <div style={{ height: "clamp(40px, 10vw, 48px)", borderRadius: "clamp(8px, 2vw, 12px)", border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(20,28,48,0.9)", cursor: "pointer", transition: "all 0.3s ease" }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = "rgba(12,18,35,0.95)";
                            (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${c.glow}`;
                            const span = (e.currentTarget as HTMLElement).querySelector("span") as HTMLElement;
                            if (span) span.style.color = c.accent;
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = "rgba(20,28,48,0.9)";
                            (e.currentTarget as HTMLElement).style.boxShadow = "none";
                            const span = (e.currentTarget as HTMLElement).querySelector("span") as HTMLElement;
                            if (span) span.style.color = c.accent;
                        }}
                    >
                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(8px, 2.5vw, 10px)", fontWeight: 700, color: c.accent, letterSpacing: "0.3em", textTransform: "uppercase", transition: "color 0.3s" }}>PLAY NOW</span>
                    </div>
                </div>

                <style>{`@keyframes gcPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
            </motion.div>
        </Link>
    );
}
