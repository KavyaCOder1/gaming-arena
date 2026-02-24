"use client";

import { useAuthStore } from "@/store/auth-store";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, User, Lock, Gamepad2, Grid3X3, Brain, Circle,
    Loader2, AlertCircle, Eye, EyeOff, Shield, Zap,
} from "lucide-react";
import { useState, useEffect } from "react";

/* ─── tiny responsive hook ─────────────────────────────────────────── */
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);
    return isMobile;
}

/* ─── shared design tokens ──────────────────────────────────────────── */
const C = {
    cyan: "#22d3ee",
    indigo: "#6366f1",
    dark: "rgba(10,15,35,0.97)",
    surface: "rgba(15,23,42,0.7)",
    border: "rgba(34,211,238,0.18)",
    text: "#f8fafc",
    muted: "#64748b",
    slate: "#475569",
};

const GAMES = [
    { icon: Grid3X3, label: "Word Search", desc: "Neural pattern recognition modules." },
    { icon: X, label: "Tic Tac Toe", desc: "Strategic logic optimization sequences." },
    { icon: Brain, label: "Memory", desc: "Cognitive retention stress tests." },
    { icon: Circle, label: "Pacman", desc: "Classic velocity navigation simulator." },
];

/* ─── component ─────────────────────────────────────────────────────── */
export function AuthModal() {
    const { isAuthModalOpen, authModalView, closeAuthModal, openAuthModal, login } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [closeHover, setCloseHover] = useState(false);
    const isMobile = useIsMobile();

    /* reset on open / view change */
    useEffect(() => {
        if (isAuthModalOpen) {
            setError(null); setIsLoading(false);
            setUsername(""); setPassword(""); setShowPassword(false);
        }
    }, [isAuthModalOpen, authModalView]);

    /* lock scroll */
    useEffect(() => {
        document.body.style.overflow = isAuthModalOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [isAuthModalOpen]);

    if (!isAuthModalOpen) return null;

    const isRegister = authModalView === "register";
    const pwStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
    const pwColors = ["", "#ef4444", "#eab308", C.cyan];
    const pwLabels = ["", "WEAK", "MEDIUM", "STRONG"];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) { setError("Username is required"); return; }
        if (!password.trim()) { setError("Password is required"); return; }
        if (isRegister && password.length < 6) { setError("Password must be at least 6 characters"); return; }
        setIsLoading(true); setError(null);
        try {
            const res = await fetch(isRegister ? "/api/auth/register" : "/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Authentication failed");
            login(data.user);
            closeAuthModal();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    /* ── layout helpers ── */
    const modalMaxW = isRegister ? (isMobile ? "100%" : 900) : (isMobile ? "100%" : 460);
    const modalMx = isMobile ? 0 : 16;
    const formPad = isMobile ? "20px 18px 18px" : isRegister ? "44px 48px" : "48px 44px";

    return (
        <AnimatePresence>
            {/* ── BACKDROP ── */}
            <motion.div
                key="auth-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={closeAuthModal}
                style={{
                    position: "fixed", inset: 0, zIndex: 200,
                    display: "flex", alignItems: isMobile ? "flex-end" : "center",
                    justifyContent: "center",
                    padding: isMobile ? 0 : 16,
                    backdropFilter: "blur(18px) saturate(0.7) brightness(0.35)",
                    WebkitBackdropFilter: "blur(18px) saturate(0.7) brightness(0.35)",
                    backgroundColor: "rgba(2,6,23,0.72)",
                }}
            >
                {/* ambient orbs */}
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.22, 0.12] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        style={{
                            position: "absolute", top: "15%", left: "10%",
                            width: 380, height: 380, borderRadius: "50%", filter: "blur(50px)",
                            background: "radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)",
                        }}
                    />
                    <motion.div
                        animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.18, 0.08] }}
                        transition={{ duration: 5, repeat: Infinity, delay: 1.2 }}
                        style={{
                            position: "absolute", bottom: "10%", right: "8%",
                            width: 450, height: 450, borderRadius: "50%", filter: "blur(60px)",
                            background: "radial-gradient(circle, rgba(34,211,238,0.25) 0%, transparent 70%)",
                        }}
                    />
                </div>

                {/* ── MODAL CARD ── */}
                <motion.div
                    key={`modal-${authModalView}`}
                    initial={{ opacity: 0, scale: isMobile ? 1 : 0.93, y: isMobile ? 60 : 24 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: isMobile ? 1 : 0.93, y: isMobile ? 60 : 24 }}
                    transition={{ type: "spring", damping: 26, stiffness: 320 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: "relative", zIndex: 10,
                        width: "100%", maxWidth: modalMaxW,
                        margin: `0 ${modalMx}px`,
                    }}
                >
                    {/* glow ring */}
                    <div style={{
                        position: "absolute", inset: -1, zIndex: -1, borderRadius: isMobile ? "24px 24px 0 0" : 28,
                        background: "linear-gradient(135deg,rgba(34,211,238,0.35),rgba(99,102,241,0.3),rgba(34,211,238,0.1))",
                        filter: "blur(1px)",
                    }} />

                    {/* card shell */}
                    <div style={{
                        background: C.dark,
                        backdropFilter: "blur(28px)",
                        WebkitBackdropFilter: "blur(28px)",
                        border: `1px solid ${C.border}`,
                        borderRadius: isMobile ? "24px 24px 0 0" : 28,
                        boxShadow: "0 0 60px rgba(0,0,0,0.85), 0 0 40px rgba(34,211,238,0.07)",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: (!isMobile && isRegister) ? "row" : "column",
                        /* mobile: cap height so it doesn't overflow viewport */
                        maxHeight: isMobile ? "92dvh" : "none",
                        overflowY: isMobile ? "auto" : "visible",
                    }}>
                        {/* top accent line */}
                        <div style={{
                            position: "absolute", top: 0, left: 0, right: 0, height: 1,
                            background: "linear-gradient(90deg,transparent,rgba(34,211,238,0.65),rgba(99,102,241,0.45),transparent)",
                        }} />

                        {/* ══ SIDEBAR (desktop register only) ══ */}
                        {isRegister && !isMobile && (
                            <div style={{
                                width: "40%", minWidth: 280,
                                padding: "44px 36px",
                                background: "linear-gradient(135deg,rgba(15,23,42,0.92) 0%,rgba(30,41,59,0.55) 100%)",
                                borderRight: "1px solid rgba(34,211,238,0.1)",
                                position: "relative", overflow: "hidden",
                                display: "flex", flexDirection: "column",
                            }}>
                                {/* sidebar glows */}
                                <div style={{ position: "absolute", top: -80, left: -80, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle,rgba(34,211,238,0.12) 0%,transparent 70%)" }} />
                                <div style={{ position: "absolute", bottom: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 70%)" }} />

                                {/* logo */}
                                <div style={{ position: "relative", zIndex: 1, marginBottom: 36 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                                        <div style={{ padding: 10, borderRadius: 14, background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.25)", boxShadow: "0 0 20px rgba(34,211,238,0.15)" }}>
                                            <Gamepad2 style={{ color: C.cyan, width: 22, height: 22 }} />
                                        </div>
                                        <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 17, fontWeight: 900, color: C.text, letterSpacing: "-0.02em" }}>
                                            GAMING <span style={{ color: C.cyan }}>ARENA</span>
                                        </span>
                                    </div>
                                    <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(26px,3vw,34px)", fontWeight: 900, color: C.text, lineHeight: 0.9, textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.03em", marginBottom: 14 }}>
                                        SYSTEM<br /><span style={{ color: C.cyan }}>OVERVIEW</span>
                                    </h2>
                                    <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.3em", textTransform: "uppercase" }}>
                                        SINGLE-PLAYER PROTOCOL ACTIVE
                                    </p>
                                </div>

                                {/* game list */}
                                <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                                    {GAMES.map((g, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ x: -18, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: i * 0.07 + 0.15 }}
                                            whileHover={{ borderColor: "rgba(34,211,238,0.4)", background: "rgba(15,23,42,0.9)" }}
                                            style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 12, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(30,41,59,0.8)", cursor: "default", transition: "all 0.2s" }}
                                        >
                                            <g.icon style={{ color: C.indigo, width: 17, height: 17, flexShrink: 0 }} />
                                            <div>
                                                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: "0.1em" }}>{g.label}</div>
                                                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: C.slate, marginTop: 2 }}>{g.desc}</div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* footer */}
                                <div style={{ position: "relative", zIndex: 1, marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(30,41,59,0.8)", display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.cyan, boxShadow: `0 0 10px ${C.cyan}`, display: "inline-block" }} />
                                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: C.muted, letterSpacing: "0.2em", textTransform: "uppercase" }}>System Integrity: 100%</span>
                                </div>
                            </div>
                        )}

                        {/* ══ FORM AREA ══ */}
                        <div style={{ flex: 1, padding: formPad, position: "relative", display: "flex", flexDirection: "column" }}>
                            {/* glow */}
                            <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.07) 0%,transparent 70%)", pointerEvents: "none" }} />

                            {/* ── CLOSE BUTTON ── */}
                            <motion.button
                                onClick={closeAuthModal}
                                onHoverStart={() => setCloseHover(true)}
                                onHoverEnd={() => setCloseHover(false)}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.88 }}
                                style={{
                                    position: "absolute", top: 16, right: 16,
                                    width: 38, height: 38, borderRadius: 11,
                                    background: closeHover ? "rgba(239,68,68,0.14)" : "rgba(255,255,255,0.05)",
                                    border: closeHover ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.08)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: "pointer", transition: "all 0.2s",
                                    boxShadow: closeHover ? "0 0 18px rgba(239,68,68,0.18)" : "none",
                                    zIndex: 10,
                                }}
                            >
                                <motion.div animate={{ rotate: closeHover ? 90 : 0 }} transition={{ duration: 0.18 }}>
                                    <X style={{ width: 17, height: 17, color: closeHover ? "#ef4444" : C.slate, transition: "color 0.2s" }} />
                                </motion.div>
                            </motion.button>

                            {/* ── MOBILE: compact logo + tagline for register ── */}
                            {isRegister && isMobile && (
                                <div style={{ marginBottom: 16, marginTop: 4 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                        <div style={{ padding: 8, borderRadius: 11, background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.22)", boxShadow: "0 0 16px rgba(34,211,238,0.12)" }}>
                                            <Gamepad2 style={{ color: C.cyan, width: 17, height: 17 }} />
                                        </div>
                                        <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 15, fontWeight: 900, color: C.text, letterSpacing: "-0.01em" }}>
                                            GAMING <span style={{ color: C.cyan }}>ARENA</span>
                                        </span>
                                    </div>
                                    <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: C.cyan, letterSpacing: "0.35em", textTransform: "uppercase", marginBottom: 4 }}>Access Portal</p>
                                    <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>Create your operative credentials.</p>
                                </div>
                            )}

                            {/* ── LOGIN: big logo header ── */}
                            {!isRegister && (
                                <motion.div
                                    initial={{ scale: 0.85, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.08 }}
                                    style={{ textAlign: "center", marginBottom: isMobile ? 24 : 32, marginTop: isMobile ? 8 : 0 }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 4 }}>
                                        <div style={{ padding: isMobile ? 11 : 14, borderRadius: isMobile ? 14 : 18, background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.25)", boxShadow: "0 0 28px rgba(34,211,238,0.18)" }}>
                                            <Gamepad2 style={{ color: C.cyan, width: isMobile ? 26 : 32, height: isMobile ? 26 : 32 }} />
                                        </div>
                                        <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: isMobile ? 20 : 26, fontWeight: 900, color: C.text, letterSpacing: "-0.02em" }}>
                                            GAMING <span style={{ color: C.cyan }}>ARENA</span>
                                        </span>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── REGISTER sub-header (desktop only — mobile uses the strip above) ── */}
                            {isRegister && !isMobile && (
                                <div style={{ marginBottom: 28 }}>
                                    <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: C.cyan, letterSpacing: "0.4em", textTransform: "uppercase", marginBottom: 6 }}>Access Portal</p>
                                    <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 15, color: "#94a3b8", fontWeight: 500 }}>Create your operative credentials.</p>
                                </div>
                            )}

                            {/* ── FORM TITLE ── */}
                            <div style={{
                                fontFamily: "'Orbitron',sans-serif",
                                fontSize: isMobile ? 16 : isRegister ? 21 : 23,
                                fontWeight: 900, color: C.text,
                                letterSpacing: isRegister ? "0.05em" : "0.1em",
                                textTransform: "uppercase",
                                textAlign: (isRegister && !isMobile) ? "left" : "center",
                                marginBottom: isMobile ? 14 : 28,
                            }}>
                                {isRegister ? "CREATE ACCOUNT" : "USER LOGIN"}
                            </div>

                            {/* ── ERROR ── */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 12, marginBottom: 18, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 0 18px rgba(239,68,68,0.1)" }}
                                    >
                                        <AlertCircle style={{ color: "#ef4444", width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />
                                        <div>
                                            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#ef4444", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 2 }}>Input Error</div>
                                            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: "#fca5a5", fontWeight: 600 }}>{error}</div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* ── FORM ── */}
                            <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20, flex: 1 }}>

                                {/* Username */}
                                <div>
                                    <label style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: C.slate, letterSpacing: "0.2em", textTransform: "uppercase", display: "block", marginBottom: 7 }}>Username</label>
                                    <div style={{ position: "relative" }}>
                                        <User style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(34,211,238,0.4)", width: 17, height: 17, pointerEvents: "none" }} />
                                        <input
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            type="text"
                                            placeholder="Enter username"
                                            style={{ width: "100%", boxSizing: "border-box", padding: isMobile ? "13px 14px 13px 44px" : "15px 14px 15px 46px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 11, color: C.text, fontFamily: "'Rajdhani',sans-serif", fontSize: 15, fontWeight: 600, outline: "none", transition: "all 0.2s" }}
                                            onFocus={(e) => { e.target.style.borderColor = "rgba(34,211,238,0.6)"; e.target.style.boxShadow = "0 0 14px rgba(34,211,238,0.18)"; }}
                                            onBlur={(e) => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                                        <label style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: C.slate, letterSpacing: "0.2em", textTransform: "uppercase" }}>Password</label>
                                        {!isRegister && (
                                            <button type="button"
                                                style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: C.slate, letterSpacing: "0.15em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", transition: "color 0.2s" }}
                                                onMouseEnter={(e) => (e.currentTarget.style.color = C.cyan)}
                                                onMouseLeave={(e) => (e.currentTarget.style.color = C.slate)}
                                            >Forgot Password?</button>
                                        )}
                                    </div>
                                    <div style={{ position: "relative" }}>
                                        <Lock style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(34,211,238,0.4)", width: 17, height: 17, pointerEvents: "none" }} />
                                        <input
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            style={{ width: "100%", boxSizing: "border-box", padding: isMobile ? "13px 44px 13px 44px" : "15px 46px 15px 46px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 11, color: C.text, fontFamily: "'Rajdhani',sans-serif", fontSize: 15, fontWeight: 600, outline: "none", transition: "all 0.2s", letterSpacing: showPassword ? "normal" : "0.15em" }}
                                            onFocus={(e) => { e.target.style.borderColor = "rgba(34,211,238,0.6)"; e.target.style.boxShadow = "0 0 14px rgba(34,211,238,0.18)"; }}
                                            onBlur={(e) => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                                            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: C.slate, transition: "color 0.2s" }}
                                            onMouseEnter={(e) => (e.currentTarget.style.color = C.cyan)}
                                            onMouseLeave={(e) => (e.currentTarget.style.color = C.slate)}
                                        >
                                            {showPassword ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                                        </button>
                                    </div>

                                    {/* strength meter */}
                                    {isRegister && password.length > 0 && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 9 }}>
                                            <div style={{ display: "flex", gap: 5, marginBottom: 5 }}>
                                                {[1, 2, 3].map((lvl) => (
                                                    <div key={lvl} style={{ flex: 1, height: 3, borderRadius: 2, background: pwStrength >= lvl ? pwColors[pwStrength] : "rgba(30,41,59,0.8)", boxShadow: pwStrength >= lvl ? `0 0 7px ${pwColors[pwStrength]}80` : "none", transition: "all 0.4s" }} />
                                                ))}
                                            </div>
                                            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, letterSpacing: "0.2em", color: pwColors[pwStrength], textTransform: "uppercase" }}>
                                                Strength: {pwLabels[pwStrength]}
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                {/* mobile register: no game chips — keep form clean */}

                                {/* ── SUBMIT ── */}
                                <motion.button
                                    type="submit"
                                    disabled={isLoading}
                                    whileHover={!isLoading ? { scale: 1.02, y: -2 } : {}}
                                    whileTap={!isLoading ? { scale: 0.97 } : {}}
                                    style={{
                                        width: "100%", padding: isMobile ? "15px" : "17px",
                                        background: isLoading ? "rgba(34,211,238,0.45)" : C.cyan,
                                        border: "none", borderRadius: 11,
                                        color: "#020617",
                                        fontFamily: "'Orbitron',sans-serif",
                                        fontSize: isMobile ? 14 : 15, fontWeight: 900,
                                        letterSpacing: "0.15em", textTransform: "uppercase",
                                        cursor: isLoading ? "not-allowed" : "pointer",
                                        boxShadow: isLoading ? "none" : "0 0 28px rgba(34,211,238,0.5),0 0 55px rgba(34,211,238,0.18)",
                                        transition: "all 0.3s",
                                        position: "relative", overflow: "hidden",
                                        marginTop: isMobile ? 4 : 8,
                                    }}
                                >
                                    {!isLoading && (
                                        <motion.div
                                            animate={{ x: ["-100%", "200%"] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                                            style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)", pointerEvents: "none" }}
                                        />
                                    )}
                                    <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
                                        {isLoading
                                            ? <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />
                                            : isRegister
                                                ? <><Shield style={{ width: 17, height: 17 }} /> CREATE ACCOUNT</>
                                                : <><Zap style={{ width: 17, height: 17 }} /> LOG IN</>
                                        }
                                    </span>
                                </motion.button>
                            </form>

                            {/* ── SWITCH VIEW ── */}
                            <div style={{ marginTop: isMobile ? 20 : 26, paddingTop: isMobile ? 18 : 22, borderTop: "1px solid rgba(30,41,59,0.6)", textAlign: "center" }}>
                                {!isRegister ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                                        <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: C.slate, fontWeight: 600 }}>Don't have an account?</span>
                                        <button type="button" onClick={() => openAuthModal("register")}
                                            style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 700, color: C.cyan, letterSpacing: "0.2em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 4, transition: "color 0.2s" }}
                                            onMouseEnter={(e) => (e.currentTarget.style.color = "#67e8f9")}
                                            onMouseLeave={(e) => (e.currentTarget.style.color = C.cyan)}
                                        >REGISTER NEW ACCOUNT</button>
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                                        <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: C.slate, fontWeight: 600 }}>Already have an account?</span>
                                        <button type="button" onClick={() => openAuthModal("login")}
                                            style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 700, color: C.cyan, letterSpacing: "0.2em", textTransform: "uppercase", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 4, transition: "color 0.2s" }}
                                            onMouseEnter={(e) => (e.currentTarget.style.color = "#67e8f9")}
                                            onMouseLeave={(e) => (e.currentTarget.style.color = C.cyan)}
                                        >LOGIN HERE</button>
                                    </div>
                                )}
                            </div>

                            {/* encryption badge */}
                            <div style={{ textAlign: "center", marginTop: isMobile ? 14 : 18, opacity: 0.28 }}>
                                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: C.cyan, letterSpacing: "0.4em", textTransform: "uppercase" }}>
                                    ENCRYPTION LEVEL: AES-256
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            <style>{`
                @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
            `}</style>
        </AnimatePresence>
    );
}
