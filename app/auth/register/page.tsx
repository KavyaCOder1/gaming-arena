"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { Loader2, UserPlus, AlertCircle, Eye, EyeOff, Lock, User, ShieldCheck, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const C = { cyan: "#22d3ee", indigo: "#6366f1", dark: "rgba(10,15,35,0.96)", border: "rgba(34,211,238,0.18)", text: "#f8fafc", muted: "#64748b", surface: "rgba(15,23,42,0.7)" };
const pwColors = ["", "#ef4444", "#eab308", C.cyan];
const pwLabels = ["", "WEAK", "MEDIUM", "STRONG"];

export default function RegisterPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuthStore();

    const pwStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (password !== confirmPassword) { setError("Passwords do not match"); return; }
        if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
        setLoading(true);
        try {
            const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Registration failed");
            login(data.user);
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = { width: "100%", boxSizing: "border-box" as const, padding: "14px 14px 14px 44px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontFamily: "'Rajdhani',sans-serif", fontSize: 15, fontWeight: 600, outline: "none", transition: "all 0.2s" };

    return (
        <div style={{ width: "100%", maxWidth: 440, position: "relative" }}>
            {/* glow ring */}
            <div style={{ position: "absolute", inset: -1, zIndex: -1, borderRadius: 28, background: "linear-gradient(135deg,rgba(34,211,238,0.3),rgba(99,102,241,0.25),rgba(34,211,238,0.1))", filter: "blur(1px)" }} />

            <div style={{ background: C.dark, backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", border: `1px solid ${C.border}`, borderRadius: 28, padding: "40px 36px", boxShadow: "0 0 60px rgba(0,0,0,0.8), 0 0 40px rgba(34,211,238,0.06)", position: "relative", overflow: "hidden" }}>
                {/* top accent */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(34,211,238,0.6),rgba(99,102,241,0.4),transparent)" }} />

                {/* shimmer */}
                <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: "linear" }}
                    style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(34,211,238,0.04),transparent)", pointerEvents: "none" }} />

                {/* header */}
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05 }}
                        style={{ display: "inline-flex", padding: 14, borderRadius: 18, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", boxShadow: "0 0 24px rgba(99,102,241,0.2)", marginBottom: 16 }}>
                        <UserPlus style={{ width: 32, height: 32, color: C.indigo, filter: "drop-shadow(0 0 8px rgba(99,102,241,0.7))" }} />
                    </motion.div>
                    <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(22px,5vw,30px)", fontWeight: 900, color: C.text, textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", marginBottom: 8 }}>
                        SIGN <span style={{ color: C.indigo }}>UP</span>
                    </h1>
                    <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.25em", textTransform: "uppercase" }}>Create your operative account</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                                style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
                                <AlertCircle style={{ width: 15, height: 15, color: "#ef4444", flexShrink: 0 }} />
                                <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: "#fca5a5", fontWeight: 600 }}>{error}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* username */}
                    <div>
                        <label style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: "0.25em", textTransform: "uppercase", display: "block", marginBottom: 7 }}>Username</label>
                        <div style={{ position: "relative" }}>
                            <User style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "rgba(34,211,238,0.4)", pointerEvents: "none" }} />
                            <input type="text" required value={username} onChange={e => setUsername(e.target.value)} placeholder="Choose username" style={inputStyle}
                                onFocus={e => { e.target.style.borderColor = "rgba(34,211,238,0.6)"; e.target.style.boxShadow = "0 0 14px rgba(34,211,238,0.15)"; }}
                                onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }} />
                        </div>
                    </div>

                    {/* password */}
                    <div>
                        <label style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: "0.25em", textTransform: "uppercase", display: "block", marginBottom: 7 }}>Password</label>
                        <div style={{ position: "relative" }}>
                            <Lock style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "rgba(34,211,238,0.4)", pointerEvents: "none" }} />
                            <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters"
                                style={{ ...inputStyle, paddingRight: 44, letterSpacing: showPassword ? "normal" : "0.1em" }}
                                onFocus={e => { e.target.style.borderColor = "rgba(34,211,238,0.6)"; e.target.style.boxShadow = "0 0 14px rgba(34,211,238,0.15)"; }}
                                onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4, transition: "color 0.2s" }}
                                onMouseEnter={e => (e.currentTarget.style.color = C.cyan)} onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
                                {showPassword ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                            </button>
                        </div>
                        {password.length > 0 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 8 }}>
                                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                                    {[1,2,3].map(lvl => (
                                        <div key={lvl} style={{ flex: 1, height: 3, borderRadius: 2, background: pwStrength >= lvl ? pwColors[pwStrength] : "rgba(30,41,59,0.8)", boxShadow: pwStrength >= lvl ? `0 0 6px ${pwColors[pwStrength]}80` : "none", transition: "all 0.3s" }} />
                                    ))}
                                </div>
                                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, letterSpacing: "0.2em", color: pwColors[pwStrength], textTransform: "uppercase" }}>Strength: {pwLabels[pwStrength]}</span>
                            </motion.div>
                        )}
                    </div>

                    {/* confirm password */}
                    <div>
                        <label style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: "0.25em", textTransform: "uppercase", display: "block", marginBottom: 7 }}>Confirm Password</label>
                        <div style={{ position: "relative" }}>
                            <ShieldCheck style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "rgba(34,211,238,0.4)", pointerEvents: "none" }} />
                            <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" style={inputStyle}
                                onFocus={e => { e.target.style.borderColor = "rgba(34,211,238,0.6)"; e.target.style.boxShadow = "0 0 14px rgba(34,211,238,0.15)"; }}
                                onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }} />
                        </div>
                    </div>

                    <motion.button type="submit" disabled={loading} whileHover={!loading ? { scale: 1.02, y: -2 } : {}} whileTap={!loading ? { scale: 0.97 } : {}}
                        style={{ width: "100%", padding: "16px", marginTop: 4, borderRadius: 12, background: loading ? "rgba(99,102,241,0.4)" : `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`, border: "none", color: "#020617", fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 0 28px rgba(99,102,241,0.4)", transition: "all 0.3s", position: "relative", overflow: "hidden" }}>
                        {!loading && <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 1, ease: "linear" }} style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)", pointerEvents: "none" }} />}
                        <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            {loading ? <><Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />SIGNING UP...</> : <><Shield style={{ width: 16, height: 16 }} />CREATE ACCOUNT</>}
                        </span>
                    </motion.button>
                </form>

                <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(30,41,59,0.7)", textAlign: "center" }}>
                    <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: C.muted, fontWeight: 600 }}>Already have an account? </span>
                    <Link href="/auth/login" style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: C.cyan, letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "underline", textUnderlineOffset: 4 }}>LOGIN HERE</Link>
                </div>

                <div style={{ textAlign: "center", marginTop: 16, opacity: 0.25 }}>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: C.cyan, letterSpacing: "0.4em", textTransform: "uppercase" }}>ENCRYPTION LEVEL: AES-256</span>
                </div>
            </div>
            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        </div>
    );
}
