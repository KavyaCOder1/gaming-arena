"use client";

import { useAuthStore } from "@/store/auth-store";
import { User, Settings, LogOut, Shield, Calendar, Clock, Trophy, Target, Zap, ChevronRight, Mail, Key, Bell, Activity } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { motion, Variants } from "framer-motion";

const C = { cyan: "#22d3ee", indigo: "#6366f1", text: "#f8fafc", muted: "#64748b", slate: "#475569" };
const card = { background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(34,211,238,0.12)", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
const fadeUp: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const stagger: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.2, staggerChildren: 0 } } };

export default function ProfilePage() {
    const { user } = useAuthStore();
    if (!user) return null;

    const stats = [
        { label: "Operation Rank", value: "Global Elite", icon: Trophy, color: "#f59e0b", glow: "rgba(245,158,11,0.2)" },
        { label: "Combat Accuracy", value: "94.2%", icon: Target, color: "#10b981", glow: "rgba(16,185,129,0.2)" },
        { label: "Energy Level", value: "850 XP", icon: Zap, color: C.indigo, glow: "rgba(99,102,241,0.2)" },
    ];

    return (
        <motion.div initial="hidden" animate="show" variants={stagger} style={{ padding: "32px 24px 80px", maxWidth: 1200, margin: "0 auto" }}>
            {/* ── PROFILE HEADER ── */}
            <motion.div variants={fadeUp} style={{ ...card, padding: "32px", marginBottom: 32, position: "relative", overflow: "hidden", display: "flex", gap: 24, alignItems: "flex-start" }}>
                <div style={{ position: "absolute", top: -80, left: -80, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)" }} />

                {/* Avatar */}
                <div style={{ position: "relative", zIndex: 2 }}>
                    <div style={{ width: 96, height: 96, borderRadius: "50%", border: "3px solid rgba(34,211,238,0.4)", padding: 3, boxShadow: "0 0 24px rgba(34,211,238,0.3)" }}>
                        <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "rgba(15,23,42,0.95)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 40, fontWeight: 900, color: C.cyan }}>{user.username[0].toUpperCase()}</span>
                        </div>
                    </div>
                    <div style={{ position: "absolute", bottom: -4, right: -4, background: "linear-gradient(135deg, #22d3ee, #6366f1)", padding: "6px 14px", borderRadius: 10, fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 900, color: "#020617", letterSpacing: "0.1em", whiteSpace: "nowrap", boxShadow: "0 0 12px rgba(34,211,238,0.4)" }}>VERIFIED</div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", marginBottom: 10 }}>
                        <Shield style={{ width: 11, height: 11, color: C.indigo }} />
                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700, color: C.indigo, letterSpacing: "0.2em", textTransform: "uppercase" }}>Verified Operative</span>
                    </div>
                    <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 900, color: C.text, textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", marginBottom: 14 }}>
                        {user.username}
                    </h2>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 10, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>ID No.</span>
                            <span style={{ fontFamily: "'Rajdhani', monospace", fontSize: 12, color: C.cyan, fontWeight: 700 }}>{user.id.substring(0, 12).toUpperCase()}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 10, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <Calendar style={{ width: 13, height: 13, color: C.muted }} />
                            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Enlisted</span>
                            <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: C.text, fontWeight: 600 }}>{formatDate(new Date())}</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── STATS & UPLINK ── */}
            <motion.div variants={fadeUp} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 32, marginBottom: 24 }}>
                {stats.map((s, i: any) => (
                    <motion.div
                        key={i}
                        whileHover={{ scale: 1.03 }}
                        style={{ ...card, padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 24, minHeight: 380, position: "relative", overflow: "hidden", cursor: "default", transition: "all 0.25s" }}
                    >
                        <div style={{ position: "absolute", top: 0, right: 0, width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${s.glow} 0%, transparent 70%)` }} />
                        <div style={{ padding: 16, borderRadius: 16, background: s.glow, border: `1px solid ${s.color}30`, flexShrink: 0, marginBottom: 24 }}>
                            <s.icon style={{ width: 32, height: 32, color: s.color, filter: `drop-shadow(0 0 8px ${s.color}80)` }} />
                        </div>
                        <div>
                            <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>{s.label}</p>
                            <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 24, fontWeight: 900, color: C.text }}>{s.value}</p>
                        </div>
                    </motion.div>
                ))}
                {/* Uplink Config Card */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    style={{ ...card, padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 24, minHeight: 380, position: "relative", overflow: "hidden", borderColor: "rgba(34,211,238,0.2)" }}
                >
                    <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 0, display: "flex", alignItems: "center", gap: 10, alignSelf: "flex-start" }}>
                        <Bell style={{ width: 18, height: 18, color: C.cyan }} />
                        <span style={{ color: C.cyan }}>UPLINK CONFIG</span>
                    </h3>
                    <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)" }} />
                    <motion.div
                        whileHover={{ rotate: 12, scale: 1.05 }}
                        style={{ width: 80, height: 80, borderRadius: 24, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.25)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 24px rgba(34,211,238,0.12)", transition: "all 0.3s", marginBottom: 12 }}
                    >
                        <Activity style={{ width: 40, height: 40, color: C.cyan, filter: "drop-shadow(0 0 10px rgba(34,211,238,0.5))" }} />
                    </motion.div>
                    <div>
                        <h4 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 8, letterSpacing: "0.05em" }}>NEURAL NOTIFICATIONS</h4>
                        <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, color: C.muted, fontWeight: 500, lineHeight: 1.6, maxWidth: 260 }}>
                            Real-time combat alerts and tournament deployment updates.
                        </p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.98 }}
                        style={{ width: "100%", padding: "16px", borderRadius: 14, background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.25)", color: C.cyan, fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s" }}
                        onMouseEnter={(e: any) => { e.currentTarget.style.background = "rgba(34,211,238,0.12)"; }}
                        onMouseLeave={(e: any) => { e.currentTarget.style.background = "rgba(34,211,238,0.06)"; }}
                    >
                        ENABLE UPLINK
                    </motion.button>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}

