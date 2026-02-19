"use client";

import { Navbar } from "@/components/layout/Navbar";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", background: "#0F172A" }}>
            <Navbar />

            {/* same background as dashboard/games */}
            <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
                <div style={{ position: "absolute", inset: 0, background: "#0F172A" }} />
                <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(to right,rgba(99,102,241,0.05) 1px,transparent 1px),linear-gradient(to bottom,rgba(99,102,241,0.05) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
                <div style={{ position: "absolute", inset: 0, opacity: 0.2, backgroundImage: "radial-gradient(rgba(148,163,184,0.4) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
                <div style={{ position: "absolute", top: "10%", left: "5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%)" }} />
                <div style={{ position: "absolute", bottom: "5%", right: "5%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(34,211,238,0.08) 0%,transparent 70%)" }} />
            </div>

            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", paddingTop: "calc(72px + 40px)", paddingBottom: 40, position: "relative", zIndex: 1 }}>
                {children}
            </div>

            <div style={{ textAlign: "center", padding: "16px 24px", fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700, color: "#1e293b", letterSpacing: "0.35em", textTransform: "uppercase", position: "relative", zIndex: 1 }}>
                © 2026 GAMING ARENA SECURITY PROTOCOL
            </div>
        </div>
    );
}
