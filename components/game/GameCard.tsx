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
    imagePosition?: string;
}

const COLOR_MAP: Record<string, { accent: string; glow: string; border: string; bg: string }> = {
    blue:   { accent: "#22d3ee", glow: "rgba(34,211,238,0.35)",  border: "rgba(34,211,238,0.4)",  bg: "rgba(34,211,238,0.08)"  },
    green:  { accent: "#10b981", glow: "rgba(16,185,129,0.35)",  border: "rgba(16,185,129,0.4)",  bg: "rgba(16,185,129,0.08)"  },
    purple: { accent: "#a78bfa", glow: "rgba(167,139,250,0.35)", border: "rgba(167,139,250,0.4)", bg: "rgba(167,139,250,0.08)" },
    yellow: { accent: "#f59e0b", glow: "rgba(245,158,11,0.35)",  border: "rgba(245,158,11,0.4)",  bg: "rgba(245,158,11,0.08)"  },
};

export function GameCard({ title, description, href, icon: Icon, image, color = "blue", delay = 0, imagePosition }: GameCardProps) {
    const c = COLOR_MAP[color] ?? COLOR_MAP.blue;

    return (
        <Link href={href} style={{ display: "flex", flexDirection: "column", textDecoration: "none", height: "100%" }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay }}
                whileHover={{ y: -4, boxShadow: `0 12px 40px ${c.glow}` }}
                style={{
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    borderRadius: 18,
                    background: "rgba(10,15,35,0.9)",
                    backdropFilter: "blur(16px)",
                    border: `1px solid ${c.border}`,
                    boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 0 0 ${c.glow}`,
                    cursor: "pointer",
                    transition: "box-shadow 0.3s",
                }}
            >
                {/* Top accent line */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${c.accent}, transparent)`, zIndex: 2 }} />

                {/* ── POSTER IMAGE — fixed ratio crop showing top of image ── */}
                <div style={{ width: "100%", position: "relative", overflow: "hidden", borderRadius: "18px 18px 0 0", aspectRatio: "4/3" }}>
                    <img
                        src={image}
                        alt={title}
                        style={{
                            position: "absolute",
                            top: 0, left: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: imagePosition ?? "top center",
                        }}
                    />
                    {/* Bottom fade to blend into content area */}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "35%", background: "linear-gradient(to bottom, transparent, rgba(10,15,35,0.95))" }} />
                    {/* Active badge */}
                    <div style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: "rgba(10,15,35,0.75)", border: `1px solid ${c.border}`, backdropFilter: "blur(8px)" }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.accent, boxShadow: `0 0 6px ${c.accent}`, display: "inline-block", animation: "gcPulse 2s infinite" }} />
                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7, fontWeight: 700, color: c.accent, letterSpacing: "0.15em", textTransform: "uppercase" }}>ACTIVE</span>
                    </div>
                </div>

                {/* ── CONTENT AREA ── */}
                <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>

                    {/* Title row with icon */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ padding: 9, borderRadius: 11, background: c.bg, border: `1px solid ${c.border}`, boxShadow: `0 0 14px ${c.glow}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Icon style={{ width: 20, height: 20, color: c.accent, filter: `drop-shadow(0 0 5px ${c.accent})` }} />
                        </div>
                        <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(14px,3.5vw,20px)", fontWeight: 900, color: "#f8fafc", textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.01em", lineHeight: 1.1, margin: 0 }}>
                            {title}
                        </h3>
                    </div>

                    {/* Description */}
                    <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "clamp(10px,2.5vw,12px)", fontWeight: 500, color: "#94a3b8", letterSpacing: "0.05em", lineHeight: 1.5, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {description}
                    </p>

                    {/* Play Now button */}
                    <div
                        style={{ height: 44, borderRadius: 11, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", background: c.bg, cursor: "pointer", transition: "all 0.25s", marginTop: "auto", position: "relative", overflow: "hidden" }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = c.glow.replace("0.35", "0.18");
                            (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${c.glow}`;
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = c.bg;
                            (e.currentTarget as HTMLElement).style.boxShadow = "none";
                        }}
                    >
                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, color: c.accent, letterSpacing: "0.3em", textTransform: "uppercase" }}>PLAY NOW</span>
                    </div>
                </div>

                <style>{`@keyframes gcPulse { 0%,100%{opacity:1;box-shadow:0 0 6px currentColor} 50%{opacity:0.35;box-shadow:none} }`}</style>
            </motion.div>
        </Link>
    );
}
