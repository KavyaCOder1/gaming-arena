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
            transition={{ duration: 0.4, delay }}
            className="glass-card p-6 relative overflow-hidden group"
        >
            <div className={cn(
                "absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl transition-all group-hover:opacity-20",
                color === "primary" && "bg-primary",
                color === "secondary" && "bg-secondary",
                color === "accent" && "bg-accent",
                color === "destructive" && "bg-destructive",
            )} />

            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                <div className={cn(
                    "p-2 rounded-lg bg-opacity-10",
                    color === "primary" && "bg-primary text-primary",
                    color === "secondary" && "bg-secondary text-secondary-foreground",
                    color === "accent" && "bg-accent text-accent-foreground",
                    color === "destructive" && "bg-destructive text-destructive",
                )}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>

            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight">{value}</span>
                {trend && (
                    <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        {trend}
                    </span>
                )}
            </div>
        </motion.div>
    );
}
