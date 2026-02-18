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
        <nav className="fixed top-0 left-0 right-0 z-[100] transition-all duration-300">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
                <div className="glass relative flex h-16 items-center justify-between px-6 rounded-2xl border-white/20 dark:border-white/10 shadow-lg">
                    {/* Glow effect for navbar */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>

                    <Link href="/" className="relative flex items-center gap-2 group">
                        <div className="p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Gamepad2 className="h-6 w-6 text-primary neon-glow" />
                        </div>
                        <span className="text-xl font-black tracking-tight font-mono hidden sm:block">
                            GAMING<span className="text-primary italic">ARENA</span>
                        </span>
                    </Link>

                    <div className="hidden lg:flex items-center gap-1">
                        {user && navLinks.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname.startsWith(link.href);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 relative",
                                        isActive
                                            ? "text-primary bg-primary/10"
                                            : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                                    )}
                                >
                                    <Icon className={cn("h-4 w-4", isActive && "neon-glow")} />
                                    {link.label}
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-nav"
                                            className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full neon-glow"
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 relative">
                        <ThemeToggle />
                        {user ? (
                            <div className="flex items-center gap-2 border-l border-border pl-2 md:pl-4">
                                <Link href="/dashboard/profile" className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-secondary p-[1px]">
                                        <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
                                            <User className="h-4 w-4 text-primary" />
                                        </div>
                                    </div>
                                    <span className="hidden sm:block text-sm font-bold truncate max-w-[100px]">{user.username}</span>
                                </Link>
                                <button
                                    onClick={logout}
                                    className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                    title="Logout"
                                >
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link href="/auth/login" className="px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mr-2">
                                    Login
                                </Link>
                                <Link
                                    href="/auth/register"
                                    className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] hover:scale-105 transition-all"
                                >
                                    Start
                                </Link>
                            </div>
                        )}
                        <button className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors h-10 w-10 flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5">
                            <Menu className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}

// Add framer motion import at the top if needed but I'll stick to CSS for simplicity where I can.
// Actually I noticed I used motion.div, I should import it.
