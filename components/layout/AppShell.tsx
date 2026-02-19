"use client";

import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import AuthGuard from "@/components/auth/AuthGuard";

const NAVBAR_HEIGHT = 72; // px — must match Navbar desktop height

export default function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <AuthGuard>
            <div style={{ minHeight: "100vh", background: "#0F172A", position: "relative" }}>

                {/* ── BACKGROUND ── */}
                <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: -1 }}>
                    <div style={{ position: "absolute", inset: 0, background: "#0F172A" }} />
                    <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(to right,rgba(99,102,241,0.05) 1px,transparent 1px),linear-gradient(to bottom,rgba(99,102,241,0.05) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
                    <div style={{ position: "absolute", inset: 0, opacity: 0.2, backgroundImage: "radial-gradient(rgba(148,163,184,0.4) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
                    <div style={{ position: "absolute", top: "10%", left: "5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%)" }} />
                    <div style={{ position: "absolute", bottom: "5%", right: "5%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(34,211,238,0.08) 0%,transparent 70%)" }} />
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 800, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(99,102,241,0.04) 0%,transparent 70%)" }} />
                </div>

                {/* ── NAVBAR ── */}
                <Navbar />

                {/* ── PAGE BODY ── */}
                <div style={{
                    maxWidth: 1280,
                    margin: "0 auto",
                    paddingTop: NAVBAR_HEIGHT + 20,
                    paddingBottom: 100,
                    paddingLeft: 16,
                    paddingRight: 16,
                    display: "flex",
                    gap: 24,
                    alignItems: "flex-start",
                    boxSizing: "border-box",
                    width: "100%",
                }}>
                    <Sidebar />
                    <main style={{ flex: 1, minWidth: 0, width: "100%" }}>
                        {children}
                    </main>
                </div>
            </div>
        </AuthGuard>
    );
}
