"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { ThemeToggle } from "./ThemeToggle";
import { Gamepad2, User, LogOut, LayoutDashboard, Trophy } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils"; // We need to create this util

export function Navbar() {
    const { user, logout } = useAuthStore();
    const pathname = usePathname();

    const navLinks = [
        { href: "/games", label: "Games", icon: Gamepad2 },
        { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy },
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ];

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md">
            <div className="container flex h-16 items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <Gamepad2 className="h-8 w-8 text-primary animate-pulse" />
                    <span className="font-mono text-xl font-bold tracking-wider text-foreground">
                        GAMING<span className="text-primary">ARENA</span>
                    </span>
                </Link>

                <div className="hidden md:flex items-center gap-6">
                    {user && navLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname.startsWith(link.href);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
                                    isActive ? "text-primary shadow-[0_0_10px_theme(colors.primary.DEFAULT)]" : "text-muted-foreground"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {link.label}
                            </Link>
                        );
                    })}
                </div>

                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    {user ? (
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard/profile" className="hidden sm:flex items-center gap-2 text-sm font-medium hover:text-primary">
                                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50">
                                    <User className="h-4 w-4 text-primary" />
                                </div>
                                <span>{user.username}</span>
                            </Link>
                            <button
                                onClick={logout}
                                className="rounded-md bg-destructive/10 p-2 text-destructive hover:bg-destructive/20 transition-colors"
                                title="Logout"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Link href="/auth/login" className="text-sm font-medium hover:text-primary transition-colors">
                                Login
                            </Link>
                            <Link
                                href="/auth/register"
                                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_15px_theme(colors.primary.DEFAULT)] transition-all"
                            >
                                Register
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
