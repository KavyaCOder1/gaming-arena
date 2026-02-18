"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { ThemeToggle } from "./ThemeToggle";
import { Gamepad2, User, LogOut, LayoutDashboard, Trophy, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function Navbar() {
    const { user, logout } = useAuthStore();
    const pathname = usePathname();

    const navLinks = [
        { href: "/games", label: "Games", icon: Gamepad2 },
        { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy },
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-[100] border-b border-white/5 bg-[#0F172A]/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)] group-hover:scale-110 transition-transform duration-500">
                        <Gamepad2 className="h-6 w-6 text-white" />
                    </div>
                    <span className="font-heading text-xl font-bold tracking-tighter uppercase whitespace-nowrap">
                        GAMING <span className="text-secondary">ARENA</span>
                    </span>
                </Link>

                <div className="hidden md:flex items-center gap-10">
                    <Link href="/games" className="text-sm font-bold tracking-[0.2em] uppercase transition-all hover:text-secondary relative group">
                        GAMES
                        <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-secondary transition-all duration-300 group-hover:w-full" />
                    </Link>
                    <Link href="/dashboard/leaderboard" className="text-sm font-bold tracking-[0.2em] uppercase transition-all hover:text-secondary relative group">
                        LEADERBOARD
                        <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-secondary transition-all duration-300 group-hover:w-full" />
                    </Link>
                    {user ? (
                        <Link href="/dashboard" className="text-sm font-bold tracking-[0.2em] uppercase transition-all hover:text-secondary relative group">
                            DASHBOARD
                            <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-secondary transition-all duration-300 group-hover:w-full" />
                        </Link>
                    ) : (
                        <Link href="/auth/login" className="px-8 py-2.5 rounded-full border border-primary/50 hover:bg-primary/10 transition-all font-black uppercase text-xs tracking-[0.2em]">
                            LOGIN
                        </Link>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    {user ? (
                        <div className="flex items-center gap-4 border-l border-white/10 pl-4">
                            <Link href="/dashboard/profile" className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-white/5 transition-all">
                                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-secondary p-[1px]">
                                    <div className="h-full w-full rounded-[10px] bg-[#1E293B] flex items-center justify-center">
                                        <User className="h-4 w-4 text-primary" />
                                    </div>
                                </div>
                                <div className="hidden sm:flex flex-col">
                                    <span className="text-xs font-black uppercase tracking-tight">{user.username}</span>
                                    <span className="text-[9px] text-secondary font-bold uppercase tracking-widest">LVL 42 PRO</span>
                                </div>
                            </Link>
                            <button
                                onClick={logout}
                                className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    ) : (
                        <Link
                            href="/auth/register"
                            className="hidden sm:flex rounded-xl bg-primary px-6 py-2.5 text-xs font-black uppercase tracking-[0.2em] text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] hover:scale-105 transition-all"
                        >
                            ENLIST
                        </Link>
                    )}
                    <button className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors h-10 w-10 flex items-center justify-center rounded-xl hover:bg-white/5">
                        <Menu className="h-6 w-6" />
                    </button>
                </div>
            </div>
        </nav>
    );
}

// Add framer motion import at the top if needed but I'll stick to CSS for simplicity where I can.
// Actually I noticed I used motion.div, I should import it.
