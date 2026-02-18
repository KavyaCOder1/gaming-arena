"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Gamepad2, Trophy, User, LogOut, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { motion, AnimatePresence } from "framer-motion";

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { logout } = useAuthStore();

    const handleLogout = async () => {
        await logout();
        router.push("/");
    };

    const links = [
        { href: "/dashboard",             label: "Home",    icon: Home     },
        { href: "/games",                 label: "Games",   icon: Gamepad2 },
        { href: "/dashboard/leaderboard", label: "Ranks",   icon: Trophy   },
        { href: "/dashboard/profile",     label: "Profile", icon: User     },
    ];

    return (
        <aside className="hidden lg:flex w-64 flex-col h-[calc(100vh-6rem)] sticky top-24">
            <div style={{
                background: "rgba(10, 15, 35, 0.72)",
                backdropFilter: "blur(28px) saturate(1.8)",
                WebkitBackdropFilter: "blur(28px) saturate(1.8)",
                border: "1px solid rgba(34, 211, 238, 0.18)",
                borderRadius: 28,
                boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
                padding: "20px 12px",
                display: "flex",
                flexDirection: "column",
                flex: 1,
                position: "relative",
                overflow: "hidden",
            }}>
                {/* top accent line */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.4), rgba(99,102,241,0.3), transparent)", borderRadius: "28px 28px 0 0" }} />
                {/* subtle gradient overlay */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(34,211,238,0.03), transparent)", pointerEvents: "none", borderRadius: 28 }} />

                {/* label */}
                <div style={{ padding: "4px 12px 16px", position: "relative", zIndex: 1 }}>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700, color: "#334155", letterSpacing: "0.35em", textTransform: "uppercase" }}>MAIN COMMAND</span>
                </div>

                {/* nav links — same pill style as bottom nav */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, position: "relative", zIndex: 1 }}>
                    {links.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                style={{
                                    position: "relative",
                                    display: "flex", alignItems: "center", gap: 12,
                                    padding: "12px 16px",
                                    borderRadius: 20,
                                    textDecoration: "none",
                                    transition: "all 0.25s",
                                    background: isActive ? "rgba(34,211,238,0.1)" : "transparent",
                                    border: `1px solid ${isActive ? "rgba(34,211,238,0.3)" : "transparent"}`,
                                    boxShadow: isActive ? "0 0 16px rgba(34,211,238,0.12)" : "none",
                                }}
                            >
                                {/* animated pill bg */}
                                <AnimatePresence>
                                    {isActive && (
                                        <motion.div
                                            layoutId="sidebar-pill"
                                            style={{ position: "absolute", inset: 0, borderRadius: 20, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.28)" }}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ type: "spring", damping: 22, stiffness: 300 }}
                                        />
                                    )}
                                </AnimatePresence>

                                {/* icon box */}
                                <div style={{
                                    width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                                    background: isActive ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.04)",
                                    border: `1px solid ${isActive ? "rgba(34,211,238,0.35)" : "rgba(255,255,255,0.06)"}`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    transition: "all 0.25s", position: "relative", zIndex: 1,
                                }}>
                                    <Icon style={{
                                        width: 17, height: 17,
                                        color: isActive ? "#22d3ee" : "#475569",
                                        filter: isActive ? "drop-shadow(0 0 6px rgba(34,211,238,0.6))" : "none",
                                        transition: "all 0.25s",
                                    }} />
                                </div>

                                {/* label */}
                                <span style={{
                                    fontFamily: "'Orbitron', sans-serif",
                                    fontSize: 11, fontWeight: 700,
                                    letterSpacing: "0.12em",
                                    textTransform: "uppercase",
                                    color: isActive ? "#f8fafc" : "#475569",
                                    transition: "color 0.25s",
                                    position: "relative", zIndex: 1,
                                    flex: 1,
                                }}>
                                    {item.label}
                                </span>

                                {/* active dot */}
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-dot"
                                        style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d3ee", boxShadow: "0 0 8px #22d3ee", flexShrink: 0, position: "relative", zIndex: 1 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* bottom: sign out */}
                <div style={{ position: "relative", zIndex: 1, marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    {/* sign out */}
                    <button
                        onClick={handleLogout}
                        style={{
                            width: "100%", display: "flex", alignItems: "center", gap: 12,
                            padding: "12px 16px", borderRadius: 16,
                            background: "transparent", border: "1px solid transparent",
                            color: "#475569", cursor: "pointer", transition: "all 0.2s",
                            fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700,
                            letterSpacing: "0.12em", textTransform: "uppercase",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; e.currentTarget.style.color = "#ef4444"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.color = "#475569"; }}
                    >
                        <div style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <LogOut style={{ width: 16, height: 16 }} />
                        </div>
                        Sign Out
                    </button>
                </div>
            </div>
        </aside>
    );
}
