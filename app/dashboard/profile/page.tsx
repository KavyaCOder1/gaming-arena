"use client";

import { useAuthStore } from "@/store/auth-store";
import { User, Settings, LogOut, Shield, Calendar, Clock, Trophy, Target, Zap, ChevronRight, Mail, Key, Bell, Activity } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { motion, Variants } from "framer-motion";

const C = { cyan: "#22d3ee", indigo: "#6366f1", text: "#f8fafc", muted: "#64748b", slate: "#475569" };
const card = { background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(34,211,238,0.12)", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
const fadeUp: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", damping: 22, stiffness: 180 } } };
const stagger: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

export default function ProfilePage() {
    const { user, logout } = useAuthStore();
    if (!user) return null;

    const stats = [
        { label: "Operation Rank", value: "Global Elite", icon: Trophy, color: "#f59e0b", glow: "rgba(245,158,11,0.2)" },
        { label: "Combat Accuracy", value: "94.2%", icon: Target, color: "#10b981", glow: "rgba(16,185,129,0.2)" },
        { label: "Energy Level", value: "850 XP", icon: Zap, color: C.indigo, glow: "rgba(99,102,241,0.2)" },
    ];

    return (
        <motion.div variants={stagger} initial="hidden" animate="show" style={{ width: "100%", maxWidth: 900 }}>

            {/* ── HERO HEADER ── */}
            <motion.div variants={fadeUp} style={{ ...card, padding: "36px 32px", marginBottom: 24, position: "relative", overflow: "hidden", borderColor: "rgba(34,211,238,0.2)" }}>
                {/* bg glows */}
                <div style={{ position: "absolute", top: -60, left: -60, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
                {/* top accent */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.6), rgba(99,102,241,0.4), transparent)" }} />

                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 28, position: "relative", zIndex: 1 }}>
                    {/* Avatar */}
                    <div style={{ position: "relative" }}>
                        <div style={{ width: 110, height: 110, borderRadius: 28, background: "linear-gradient(135deg, #6366f1, #22d3ee)", padding: 2, boxShadow: "0 0 30px rgba(34,211,238,0.3)" }}>
                            <div style={{ width: "100%", height: "100%", borderRadius: 26, background: "rgba(10,15,35,0.95)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 44, fontWeight: 900, color: C.cyan, lineHeight: 1 }}>
                                    {user.username[0].toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(90deg, #6366f1, #22d3ee)", padding: "3px 12px", borderRadius: 8, fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 900, color: "#020617", letterSpacing: "0.15em", whiteSpace: "nowrap", boxShadow: "0 0 12px rgba(34,211,238,0.4)" }}>
                            VERIFIED
                        </div>
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

                    {/* Logout */}
                    <motion.button
                        onClick={() => logout()}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 22px", borderRadius: 14, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}
                    >
                        <LogOut style={{ width: 15, height: 15 }} />
                        TERMINATE SESSION
                    </motion.button>
                </div>
            </motion.div>

            {/* ── STATS ── */}
            <motion.div variants={fadeUp} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
                {stats.map((s, i) => (
                    <motion.div
                        key={i}
                        whileHover={{ scale: 1.03 }}
                        style={{ ...card, padding: "20px 22px", display: "flex", alignItems: "center", gap: 16, position: "relative", overflow: "hidden", cursor: "default", transition: "all 0.25s" }}
                    >
                        <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${s.glow} 0%, transparent 70%)` }} />
                        <div style={{ padding: 12, borderRadius: 14, background: `${s.glow}`, border: `1px solid ${s.color}30`, flexShrink: 0 }}>
                            <s.icon style={{ width: 22, height: 22, color: s.color, filter: `drop-shadow(0 0 6px ${s.color}80)` }} />
                        </div>
                        <div>
                            <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</p>
                            <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, fontWeight: 900, color: C.text }}>{s.value}</p>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* ── CONTROL PANELS ── */}
            <motion.div variants={fadeUp} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                {/* Security */}
                <div>
                    <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 900, color: C.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                        <Settings style={{ width: 16, height: 16, color: C.indigo }} />
                        SECURITY PROTOCOLS
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {[
                            { icon: Key, title: "Access Key Rotation", sub: "Update authentication signature", disabled: false },
                            { icon: Mail, title: "Secure Comms", sub: "E-mail verified & encrypted", disabled: true, badge: "ACTIVE" },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                whileHover={!item.disabled ? { scale: 1.02, borderColor: "rgba(34,211,238,0.3)" } : {}}
                                style={{ ...card, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: item.disabled ? "not-allowed" : "pointer", opacity: item.disabled ? 0.65 : 1, transition: "all 0.2s" }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                                    <div style={{ padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                        <item.icon style={{ width: 18, height: 18, color: C.muted }} />
                                    </div>
                                    <div>
                                        <h4 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{item.title}</h4>
                                        <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: C.muted, fontWeight: 500 }}>{item.sub}</p>
                                    </div>
                                </div>
                                {item.badge
                                    ? <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", padding: "3px 8px", borderRadius: 6, letterSpacing: "0.1em" }}>{item.badge}</span>
                                    : <ChevronRight style={{ width: 16, height: 16, color: C.muted }} />
                                }
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Uplink */}
                <div>
                    <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 900, color: C.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                        <Bell style={{ width: 16, height: 16, color: C.cyan }} />
                        UPLINK CONFIG
                    </h3>
                    <div style={{ ...card, padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 20, position: "relative", overflow: "hidden", borderColor: "rgba(34,211,238,0.2)" }}>
                        <div style={{ position: "absolute", top: -30, right: -30, width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)" }} />
                        <motion.div
                            whileHover={{ rotate: 12, scale: 1.05 }}
                            style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.25)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 24px rgba(34,211,238,0.12)", transition: "all 0.3s" }}
                        >
                            <Activity style={{ width: 36, height: 36, color: C.cyan, filter: "drop-shadow(0 0 8px rgba(34,211,238,0.5))" }} />
                        </motion.div>
                        <div>
                            <h4 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 8 }}>NEURAL NOTIFICATIONS</h4>
                            <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, color: C.muted, fontWeight: 500, lineHeight: 1.6, maxWidth: 240 }}>
                                Real-time combat alerts and tournament deployment updates.
                            </p>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            style={{ width: "100%", padding: "14px", borderRadius: 12, background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.25)", color: C.cyan, fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34,211,238,0.12)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(34,211,238,0.06)"; }}
                        >
                            ENABLE UPLINK
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
