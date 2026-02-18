"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    color?: "primary" | "secondary" | "accent" | "destructive";
    delay?: number;
}

export function StatsCard({ title, value, icon: Icon, trend, color = "primary", delay = 0 }: StatsCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="premium-card p-6 relative overflow-hidden group h-full flex flex-col justify-between"
        >
            {/* Background Accent glow */}
            <div className={cn(
                "absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-0 blur-3xl transition-all duration-700 group-hover:opacity-20",
                color === "primary" && "bg-primary",
                color === "secondary" && "bg-secondary",
                color === "accent" && "bg-accent",
                color === "destructive" && "bg-destructive",
            )} />

            <div className="relative z-10 flex items-center justify-between mb-8">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black tracking-tighter tabular-nums drop-shadow-sm">{value}</span>
                        {trend && (
                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-lg border border-emerald-400/20">
                                {trend}
                            </span>
                        )}
                    </div>
                </div>

                <div className={cn(
                    "p-4 rounded-2xl bg-opacity-10 backdrop-blur-md border transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 shadow-lg",
                    color === "primary" && "bg-primary text-primary border-primary/20",
                    color === "secondary" && "bg-secondary text-secondary border-secondary/20",
                    color === "accent" && "bg-accent text-accent border-accent/20",
                    color === "destructive" && "bg-destructive text-destructive border-destructive/20",
                )}>
                    <Icon className="h-6 w-6 neon-glow" />
                </div>
            </div>

            <div className="relative z-10 mt-auto">
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "70%" }}
                        transition={{ duration: 1, delay: delay + 0.3 }}
                        className={cn(
                            "h-full rounded-full",
                            color === "primary" && "bg-primary shadow-[0_0_10px_var(--primary)]",
                            color === "secondary" && "bg-secondary shadow-[0_0_10px_var(--secondary)]",
                            color === "accent" && "bg-accent shadow-[0_0_10px_var(--accent)]",
                            color === "destructive" && "bg-destructive shadow-[0_0_10px_var(--destructive)]"
                        )}
                    />
                </div>
            </div>
        </motion.div>
    );
}
