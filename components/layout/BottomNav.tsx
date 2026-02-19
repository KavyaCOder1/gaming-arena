"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Home, Gamepad2, Trophy, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function BottomNav() {
    const { user } = useAuthStore();
    const pathname = usePathname();

    if (!user) return null;

    const items = [
        { href: "/dashboard",            label: "Home",    icon: Home     },
        { href: "/games",                label: "Games",   icon: Gamepad2 },
        { href: "/dashboard/leaderboard",label: "Ranks",   icon: Trophy   },
        { href: "/dashboard/profile",    label: "Profile", icon: User     },
    ];

    return (
        <div className="lg:hidden" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, padding: "0 12px max(12px, env(safe-area-inset-bottom))" }}>
            <div style={{
                background: "rgba(10, 15, 35, 0.72)",
                backdropFilter: "blur(28px) saturate(1.8)",
                WebkitBackdropFilter: "blur(28px) saturate(1.8)",
                border: "1px solid rgba(34, 211, 238, 0.18)",
                borderRadius: 32,
                boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.08) inset",
                padding: "6px 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-around",
                position: "relative",
                overflow: "hidden",
            }}>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(34,211,238,0.04), transparent)", pointerEvents: "none", borderRadius: 32 }} />

                {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 16px", textDecoration: "none", transition: "all 0.25s", borderRadius: 24, flex: 1 }}
                        >
                            <AnimatePresence>
                                {isActive && (
                                    <motion.div
                                        layoutId="bottom-pill"
                                        style={{
                                            position: "absolute", inset: 0, borderRadius: 24,
                                            background: "rgba(34,211,238,0.1)",
                                            border: "1px solid rgba(34,211,238,0.3)",
                                            boxShadow: "0 0 16px rgba(34,211,238,0.15)",
                                        }}
                                        initial={{ opacity: 0, scale: 0.85 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.85 }}
                                        transition={{ type: "spring", damping: 22, stiffness: 300 }}
                                    />
                                )}
                            </AnimatePresence>

                            <Icon style={{
                                width: 22, height: 22,
                                color: isActive ? "#22d3ee" : "#475569",
                                filter: isActive ? "drop-shadow(0 0 8px rgba(34,211,238,0.6))" : "none",
                                transition: "all 0.25s",
                                position: "relative", zIndex: 1,
                            }} />

                            <span style={{
                                fontFamily: "'Orbitron', sans-serif",
                                fontSize: 8, fontWeight: 700,
                                letterSpacing: "0.12em",
                                textTransform: "uppercase",
                                marginTop: 4,
                                color: isActive ? "#22d3ee" : "#334155",
                                transition: "color 0.25s",
                                position: "relative", zIndex: 1,
                            }}>
                                {item.label}
                            </span>

                            {isActive && (
                                <motion.div
                                    layoutId="bottom-dot"
                                    style={{ position: "absolute", bottom: 2, width: 4, height: 4, borderRadius: "50%", background: "#22d3ee", boxShadow: "0 0 8px #22d3ee" }}
                                />
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
