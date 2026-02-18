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
    ChevronRight
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

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
        <aside className="hidden lg:flex w-64 flex-col border-r border-white/10 bg-background/50 backdrop-blur-xl h-[calc(100vh-4rem)] sticky top-16">
            <div className="flex flex-col flex-1 p-4 gap-2">
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Menu
                </div>

                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname.startsWith(link.href);

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all group relative overflow-hidden",
                                isActive
                                    ? "bg-primary/10 text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]"
                                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                            )}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                            )}
                            <Icon className={cn("h-5 w-5 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                            <span>{link.label}</span>
                            {isActive && (
                                <ChevronRight className="ml-auto h-4 w-4 animate-in fade-in slide-in-from-left-1" />
                            )}
                        </Link>
                    );
                })}
            </div>

            <div className="p-4 border-t border-white/10">
                <button
                    onClick={logout}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-destructive rounded-xl hover:bg-destructive/10 transition-colors"
                >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}
