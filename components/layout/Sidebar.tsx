"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Gamepad2,
    Trophy,
    User,
    Settings,
    LogOut,
    ChevronRight,
    Sparkles
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { motion } from "framer-motion";

export function Sidebar() {
    const pathname = usePathname();
    const { logout } = useAuthStore();

    const links = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/games", label: "Games", icon: Gamepad2 },
        { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy },
        { href: "/dashboard/profile", label: "Profile", icon: User },
    ];

    return (
        <aside className="hidden lg:flex w-72 flex-col h-[calc(100vh-6rem)] sticky top-24">
            <div className="glass flex flex-col flex-1 p-4 gap-2 rounded-3xl border-white/20 dark:border-white/10 shadow-2xl relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <div className="px-4 py-4 flex items-center gap-2 mb-2">
                    <div className="p-1 px-2 rounded-lg bg-primary/20 text-[10px] font-black text-primary uppercase tracking-widest border border-primary/20">
                        Main Command
                    </div>
                </div>

                <div className="flex-1 space-y-1">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3.5 text-sm font-bold rounded-2xl transition-all group relative overflow-hidden",
                                    isActive
                                        ? "text-primary bg-primary/10 shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]"
                                        : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-active"
                                        className="absolute left-0 top-2 bottom-2 w-1.5 bg-primary rounded-r-full shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                                    />
                                )}
                                <Icon className={cn("h-5 w-5 transition-transform duration-300 group-hover:scale-110", isActive ? "text-primary neon-glow" : "text-muted-foreground")} />
                                <span className="flex-1">{link.label}</span>
                                {isActive && (
                                    <ChevronRight className="h-4 w-4 animate-in fade-in slide-in-from-left-2" />
                                )}
                            </Link>
                        );
                    })}
                </div>

                <div className="mt-auto space-y-4 pt-4 border-t border-white/10">
                    <div className="px-4">
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-white/10 relative overflow-hidden group">
                            <div className="relative z-10">
                                <span className="text-[10px] font-black text-primary uppercase tracking-wider mb-1 block">Global Event</span>
                                <p className="text-xs font-bold leading-tight">Arena Season 1 is now LIVE! Join now.</p>
                            </div>
                            <Sparkles className="absolute bottom-[-10px] right-[-10px] w-12 h-12 text-primary/10 group-hover:scale-125 transition-transform duration-700" />
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="flex w-full items-center gap-3 px-4 py-4 text-sm font-bold text-muted-foreground rounded-2xl hover:bg-destructive/10 hover:text-destructive transition-all duration-300 group"
                    >
                        <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
