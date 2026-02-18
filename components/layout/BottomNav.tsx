"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Gamepad2, Trophy, LayoutDashboard, User, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function BottomNav() {
    const { user } = useAuthStore();
    const pathname = usePathname();

    if (!user) return null;

    const items = [
        { href: "/games", label: "Arena", icon: Gamepad2 },
        { href: "/dashboard/leaderboard", label: "Ranks", icon: Trophy },
        { href: "/dashboard", label: "Home", icon: LayoutDashboard },
        { href: "/dashboard/profile", label: "Profile", icon: User },
    ];

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4">
            <div className="glass rounded-[2rem] border-white/20 dark:border-white/10 shadow-2xl p-2 flex items-center justify-around relative overflow-hidden">
                {/* Visual Accent */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />

                {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center py-2 px-4 transition-all duration-300 group"
                        >
                            <AnimatePresence>
                                {isActive && (
                                    <motion.div
                                        layoutId="bottom-active"
                                        className="absolute inset-0 bg-primary/10 rounded-2xl"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                    />
                                )}
                            </AnimatePresence>

                            <Icon className={cn(
                                "h-6 w-6 transition-all duration-300 relative z-10",
                                isActive ? "text-primary neon-glow" : "text-muted-foreground group-hover:text-foreground"
                            )} />

                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest mt-1 relative z-10 transition-colors",
                                isActive ? "text-primary" : "text-muted-foreground/60"
                            )}>
                                {item.label}
                            </span>

                            {isActive && (
                                <motion.div
                                    layoutId="bottom-indicator"
                                    className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full neon-glow"
                                />
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
