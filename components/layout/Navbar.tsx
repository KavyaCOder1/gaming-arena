"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { Gamepad2, LogOut, Menu, X, Home, Trophy, User, Swords } from "lucide-react";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { XpBadge } from "@/components/game/XpBadge";

interface NavbarProps {
    onGamesClick?: () => void;
    onLeaderboardClick?: () => void;
}

export function Navbar({ onGamesClick, onLeaderboardClick }: NavbarProps = {}) {
    const { user, logout, openAuthModal } = useAuthStore();
    const pathname = usePathname();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        router.push("/");
        setIsMenuOpen(false);
    };

    /* same order everywhere: Home → Games → Ranks → Profile */
    const navItems = [
        { label: "Home",    mobileLabel: "Home",    href: "/dashboard",             icon: Home     },
        { label: "Games",   mobileLabel: "Games",   href: "/games",                 icon: Swords   },
        { label: "Ranks",   mobileLabel: "Ranks",   href: "/dashboard/leaderboard", icon: Trophy   },
        { label: "Profile", mobileLabel: "Profile", href: "/dashboard/profile",     icon: User     },
    ];

    /* guest nav links (not logged in) */
    const guestLinks = [
        { label: "Games",       href: "/games",                 icon: Swords  },
        { label: "Leaderboard", href: "/dashboard/leaderboard", icon: Trophy  },
    ];

    /* current page title for mobile top bar */
    const currentPage = navItems.find((l) => pathname === l.href);
    const mobileTitle = currentPage?.label ?? (pathname === "/" ? "ARENA" : "ARENA");

    return (
        <>
        <style>{`
            .nav-desktop { display: none; }
            .nav-mobile  { display: flex; }
            .nav-pill    { display: none; }
            .nav-dropdown{ display: block; }
            @media(min-width: 768px)  { .nav-desktop { display: flex; } .nav-mobile { display: none; } .nav-dropdown { display: none; } }
            @media(min-width: 1024px) { .nav-pill { display: flex; } }
        `}</style>
        <nav style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(28px) saturate(1.6)",
            WebkitBackdropFilter: "blur(28px) saturate(1.6)",
            borderBottom: "1px solid rgba(34, 211, 238, 0.12)",
            boxShadow: "0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}>
            {/* top accent line */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.5), rgba(99,102,241,0.4), transparent)" }} />

            {/* ══════════════════════════════════════════
                DESKTOP BAR
            ══════════════════════════════════════════ */}
            <div className="nav-desktop" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", height: 72, alignItems: "center", justifyContent: "space-between", gap: 24 }}>

                {/* Logo */}
                <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", flexShrink: 0 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(99,102,241,0.5)" }}>
                        <Gamepad2 style={{ width: 22, height: 22, color: "#fff" }} />
                    </div>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, fontWeight: 900, color: "#f8fafc", letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
                        GAMING <span style={{ color: "#22d3ee" }}>ARENA</span>
                    </span>
                </Link>

                {/* ── CENTER: pill nav — only when user is logged in (sidebar pages) ── */}
                {user ? (
                    <div className="nav-pill" style={{ alignItems: "center", gap: 4, background: "rgba(10,15,35,0.6)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(34,211,238,0.15)", borderRadius: 28, padding: "5px 6px", boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link key={item.href} href={item.href}
                                    style={{ position: "relative", display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 22, textDecoration: "none", transition: "all 0.25s", background: isActive ? "rgba(34,211,238,0.1)" : "transparent", border: `1px solid ${isActive ? "rgba(34,211,238,0.3)" : "transparent"}` }}
                                >
                                    {isActive && <motion.div layoutId="desktop-pill" style={{ position: "absolute", inset: 0, borderRadius: 22, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.28)" }} transition={{ type: "spring", damping: 22, stiffness: 300 }} />}
                                    <Icon style={{ width: 15, height: 15, color: isActive ? "#22d3ee" : "#475569", filter: isActive ? "drop-shadow(0 0 6px rgba(34,211,238,0.6))" : "none", transition: "all 0.25s", position: "relative", zIndex: 1, flexShrink: 0 }} />
                                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: isActive ? "#f8fafc" : "#475569", transition: "color 0.25s", position: "relative", zIndex: 1, whiteSpace: "nowrap" }}>{item.label}</span>
                                    {isActive && <motion.div layoutId="desktop-dot" style={{ position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)", width: 3, height: 3, borderRadius: "50%", background: "#22d3ee", boxShadow: "0 0 6px #22d3ee" }} />}
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    /* GUEST — simple text links, no pill */
                    <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
                        {guestLinks.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            const isHome = pathname === "/";
                            const clickHandler = isHome
                                ? (e: React.MouseEvent) => { e.preventDefault(); item.label === "Games" ? onGamesClick?.() : onLeaderboardClick?.(); }
                                : undefined;
                            return (
                                <Link key={item.href} href={item.href} onClick={clickHandler}
                                    style={{ position: "relative", display: "flex", alignItems: "center", gap: 7, textDecoration: "none", paddingBottom: 4 }}
                                    onMouseEnter={(e) => { const s = e.currentTarget.querySelector("span") as HTMLElement; if (s && !isActive) s.style.color = "#e2e8f0"; }}
                                    onMouseLeave={(e) => { const s = e.currentTarget.querySelector("span") as HTMLElement; if (s && !isActive) s.style.color = "#64748b"; }}
                                >
                                    <Icon style={{ width: 14, height: 14, color: isActive ? "#22d3ee" : "#64748b", flexShrink: 0 }} />
                                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: isActive ? "#22d3ee" : "#64748b", transition: "color 0.2s" }}>{item.label}</span>
                                    {isActive && <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #22d3ee, #6366f1)", borderRadius: 1, boxShadow: "0 0 8px rgba(34,211,238,0.6)" }} />}
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* Right: auth / user */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    {user ? (
                        <>
                            <Link href="/dashboard/profile" style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px 6px 6px", borderRadius: 40, background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.18)", textDecoration: "none", transition: "all 0.2s" }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34,211,238,0.12)"; e.currentTarget.style.borderColor = "rgba(34,211,238,0.35)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(34,211,238,0.06)"; e.currentTarget.style.borderColor = "rgba(34,211,238,0.18)"; }}
                            >
                                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #22d3ee)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 900, color: "#fff" }}>{user.username[0].toUpperCase()}</span>
                                </div>
                                <div>
                                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, color: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.05em" }}>{user.username}</div>
                                    <XpBadge variant="compact" />
                                </div>
                            </Link>
                            <button onClick={handleLogout}
                                style={{ padding: 8, borderRadius: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", cursor: "pointer", color: "#ef4444", transition: "all 0.2s" }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.14)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.15)"; }}
                            >
                                <LogOut style={{ width: 17, height: 17 }} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => openAuthModal("login")}
                                style={{ padding: "8px 20px", borderRadius: 40, background: "transparent", border: "1px solid rgba(34,211,238,0.3)", color: "#94a3b8", fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s" }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(34,211,238,0.6)"; e.currentTarget.style.color = "#22d3ee"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(34,211,238,0.3)"; e.currentTarget.style.color = "#94a3b8"; }}
                            >LOGIN</button>
                            <button onClick={() => openAuthModal("register")}
                                style={{ padding: "8px 20px", borderRadius: 40, background: "linear-gradient(135deg, #6366f1, #22d3ee)", border: "none", color: "#020617", fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", boxShadow: "0 0 20px rgba(34,211,238,0.35)", transition: "all 0.2s" }}
                                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 30px rgba(34,211,238,0.55)"; e.currentTarget.style.transform = "scale(1.04)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 20px rgba(34,211,238,0.35)"; e.currentTarget.style.transform = "scale(1)"; }}
                            >SIGN UP</button>
                        </>
                    )}
                </div>
            </div>

            {/* ══════════════════════════════════════════
                MOBILE TOP BAR
            ══════════════════════════════════════════ */}
            <div className="nav-mobile" style={{ height: 60, alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>

                {/* Left: icon logo */}
                <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(99,102,241,0.5)" }}>
                        <Gamepad2 style={{ width: 18, height: 18, color: "#fff" }} />
                    </div>
                </Link>

                {/* Center: current page */}
                <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 900, color: "#f8fafc", letterSpacing: "0.18em", textTransform: "uppercase" }}>
                        {mobileTitle}
                    </span>
                    <div style={{ width: 24, height: 2, background: "linear-gradient(90deg, #6366f1, #22d3ee)", borderRadius: 1, boxShadow: "0 0 6px rgba(34,211,238,0.6)" }} />
                </div>

                {/* Right: avatar + hamburger */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    {user && (
                        <Link href="/dashboard/profile" style={{ textDecoration: "none" }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 10px rgba(34,211,238,0.35)" }}>
                                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 900, color: "#fff" }}>{user.username[0].toUpperCase()}</span>
                            </div>
                        </Link>
                    )}
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)}
                        style={{ width: 36, height: 36, borderRadius: 10, background: isMenuOpen ? "rgba(34,211,238,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${isMenuOpen ? "rgba(34,211,238,0.35)" : "rgba(255,255,255,0.08)"}`, cursor: "pointer", color: isMenuOpen ? "#22d3ee" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div key={isMenuOpen ? "close" : "open"} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                                {isMenuOpen ? <X style={{ width: 18, height: 18 }} /> : <Menu style={{ width: 18, height: 18 }} />}
                            </motion.div>
                        </AnimatePresence>
                    </button>
                </div>
            </div>

            {/* ── MOBILE DROPDOWN ── */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div className="nav-dropdown"
                        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        style={{ borderTop: "1px solid rgba(34,211,238,0.1)", background: "rgba(8,12,28,0.97)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
                    >
                        {/* user strip */}
                        {user && (
                            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 14 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg, #6366f1, #22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 16px rgba(34,211,238,0.25)" }}>
                                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, fontWeight: 900, color: "#fff" }}>{user.username[0].toUpperCase()}</span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 700, color: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.05em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.username}</div>
                                    <div style={{ marginTop: 3 }}><XpBadge variant="compact" /></div>
                                </div>
                
                            </div>
                        )}

                        {/* nav rows */}
                        <div style={{ padding: "10px 16px" }}>
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)}
                                        style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14, marginBottom: 6, background: isActive ? "rgba(34,211,238,0.08)" : "transparent", border: `1px solid ${isActive ? "rgba(34,211,238,0.25)" : "transparent"}`, textDecoration: "none", transition: "all 0.2s" }}
                                    >
                                        <div style={{ width: 38, height: 38, borderRadius: 11, background: isActive ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${isActive ? "rgba(34,211,238,0.3)" : "rgba(255,255,255,0.06)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <Icon style={{ width: 17, height: 17, color: isActive ? "#22d3ee" : "#64748b", filter: isActive ? "drop-shadow(0 0 6px rgba(34,211,238,0.5))" : "none" }} />
                                        </div>
                                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, color: isActive ? "#f8fafc" : "#64748b", textTransform: "uppercase", letterSpacing: "0.12em", flex: 1 }}>{item.mobileLabel}</span>
                                        {isActive && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d3ee", boxShadow: "0 0 8px #22d3ee", flexShrink: 0 }} />}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* sign out / auth */}
                        <div style={{ padding: "8px 16px 20px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                            {user ? (
                                <button onClick={handleLogout}
                                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "13px", borderRadius: 14, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.18)", color: "#ef4444", fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer" }}
                                >
                                    <LogOut style={{ width: 15, height: 15 }} /> SIGN OUT
                                </button>
                            ) : (
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                    <button onClick={() => { openAuthModal("login"); setIsMenuOpen(false); }} style={{ padding: "13px", borderRadius: 14, background: "transparent", border: "1px solid rgba(34,211,238,0.3)", color: "#22d3ee", fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}>LOGIN</button>
                                    <button onClick={() => { openAuthModal("register"); setIsMenuOpen(false); }} style={{ padding: "13px", borderRadius: 14, background: "linear-gradient(135deg, #6366f1, #22d3ee)", border: "none", color: "#020617", fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", boxShadow: "0 0 16px rgba(34,211,238,0.3)" }}>JOIN NOW</button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
        </>
    );
}
