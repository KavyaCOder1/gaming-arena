"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { Loader2, Gamepad2, AlertCircle, Eye, EyeOff, Lock, User, Zap } from "lucide-react";

const C = { cyan: "#22d3ee", dark: "rgba(10,15,35,0.96)", border: "rgba(34,211,238,0.18)", text: "#f8fafc", muted: "#64748b", surface: "rgba(15,23,42,0.7)" };

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const setUser = useAuthStore((s) => s.setUser);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Login failed");
            setUser(data.user);
            router.replace("/dashboard");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const inputBase: React.CSSProperties = {
        width: "100%", boxSizing: "border-box",
        padding: "14px 14px 14px 44px",
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 12, color: C.text,
        fontFamily: "'Rajdhani',sans-serif", fontSize: 15, fontWeight: 600,
        outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
    };

    return (
        <div style={{ width: "100%", maxWidth: 420 }}>
            <div style={{ background: C.dark, backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", border: `1px solid ${C.border}`, borderRadius: 28, padding: "40px 36px", boxShadow: "0 0 60px rgba(0,0,0,0.8)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(34,211,238,0.6),rgba(99,102,241,0.4),transparent)" }} />

                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <div style={{ display: "inline-flex", padding: 14, borderRadius: 18, background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.25)", marginBottom: 16 }}>
                        <Gamepad2 style={{ width: 32, height: 32, color: C.cyan }} />
                    </div>
                    <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 26, fontWeight: 900, color: C.text, textTransform: "uppercase", letterSpacing: "-0.02em", marginBottom: 6 }}>
                        GAMING <span style={{ color: C.cyan }}>ARENA</span>
                    </h1>
                    <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.25em", textTransform: "uppercase" }}>Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    {error && (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
                            <AlertCircle style={{ width: 15, height: 15, color: "#ef4444", flexShrink: 0 }} />
                            <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: "#fca5a5", fontWeight: 600 }}>{error}</span>
                        </div>
                    )}

                    {/* Username */}
                    <div>
                        <label style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: "0.25em", textTransform: "uppercase", display: "block", marginBottom: 7 }}>Username</label>
                        <div style={{ position: "relative" }}>
                            <User style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "rgba(34,211,238,0.4)", pointerEvents: "none" }} />
                            <input type="text" required value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" style={inputBase}
                                onFocus={e => { e.target.style.borderColor = "rgba(34,211,238,0.6)"; e.target.style.boxShadow = "0 0 14px rgba(34,211,238,0.15)"; }}
                                onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }} />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: "0.25em", textTransform: "uppercase", display: "block", marginBottom: 7 }}>Password</label>
                        <div style={{ position: "relative" }}>
                            <Lock style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "rgba(34,211,238,0.4)", pointerEvents: "none" }} />
                            <input type={showPw ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                                style={{ ...inputBase, paddingRight: 44 }}
                                onFocus={e => { e.target.style.borderColor = "rgba(34,211,238,0.6)"; e.target.style.boxShadow = "0 0 14px rgba(34,211,238,0.15)"; }}
                                onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }} />
                            <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
                                {showPw ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <button type="submit" disabled={loading}
                        style={{ width: "100%", padding: "16px", marginTop: 4, borderRadius: 12, background: loading ? "rgba(34,211,238,0.4)" : C.cyan, border: "none", color: "#020617", fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 0 28px rgba(34,211,238,0.5)", transition: "all 0.2s" }}>
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            {loading
                                ? <><Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} /> LOGGING IN...</>
                                : <><Zap style={{ width: 16, height: 16 }} /> LOG IN</>}
                        </span>
                    </button>
                </form>

                <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(30,41,59,0.7)", textAlign: "center" }}>
                    <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: C.muted, fontWeight: 600 }}>No account? </span>
                    <Link href="/auth/register" style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: C.cyan, letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "underline", textUnderlineOffset: 4 }}>REGISTER</Link>
                </div>
            </div>
            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        </div>
    );
}
