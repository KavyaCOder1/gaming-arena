"use client";

import { useAuthStore } from "@/store/auth-store";
import { User, Settings, LogOut, Shield, Calendar, Clock, Trophy, Target, Zap, ChevronRight, Mail, Key, Bell, Activity } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
    const { user, logout } = useAuthStore();

    if (!user) return null;

    const stats = [
        { label: "Operation Rank", value: "Global Elite", icon: Trophy, color: "text-amber-500" },
        { label: "Combat Accuracy", value: "94.2%", icon: Target, color: "text-emerald-500" },
        { label: "Energy Level", value: "850 XP", icon: Zap, color: "text-primary" },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12 max-w-5xl"
        >
            {/* Header Section */}
            <div className="relative">
                <div className="flex flex-col md:flex-row items-center gap-10">
                    {/* Avatar Container */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 group-hover:bg-primary/40 transition-all duration-700" />
                        <div className="relative w-40 h-40 rounded-[3rem] bg-gradient-to-br from-primary via-secondary to-primary p-1.5 shadow-2xl rotate-3 group-hover:rotate-0 transition-all duration-500">
                            <div className="w-full h-full rounded-[2.8rem] bg-background flex items-center justify-center overflow-hidden relative">
                                <span className="text-6xl font-black italic tracking-tighter text-primary/40 leading-none select-none">
                                    {user.username.substring(0, 1).toUpperCase()}
                                </span>
                                <div className="absolute inset-0 flex items-center justify-center font-black text-6xl drop-shadow-2xl">
                                    {user.username.substring(0, 1).toUpperCase()}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-4">
                        <div className="space-y-1">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary mb-2">
                                <Shield className="w-3 h-3" /> Verified Operative
                            </div>
                            <h2 className="text-5xl font-black tracking-tighter uppercase italic">{user.username}</h2>
                        </div>

                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                            <div className="glass px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold border-white/5">
                                <span className="text-muted-foreground uppercase tracking-widest text-[9px]">ID No.</span>
                                <span className="font-mono text-primary">{user.id.substring(0, 12).toUpperCase()}</span>
                            </div>
                            <div className="glass px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold border-white/5">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground uppercase tracking-widest text-[9px]">Enlisted</span>
                                <span>{formatDate(new Date())}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => logout()}
                        className="glass px-8 py-4 rounded-2xl border-destructive/20 text-destructive font-black uppercase tracking-widest text-xs hover:bg-destructive/10 transition-all flex items-center gap-3"
                    >
                        <LogOut className="w-4 h-4" />
                        Terminate Session
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="premium-card p-6 flex items-center gap-6 group">
                        <div className={cn("p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border group-hover:scale-110 transition-transform", stat.color)}>
                            <stat.icon className="w-6 h-6 neon-glow" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{stat.label}</p>
                            <p className="text-2xl font-black tabular-nums tracking-tighter">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Central Control Unit */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Security Protocols */}
                <div className="space-y-6">
                    <h3 className="text-2xl font-black tracking-tighter uppercase italic px-2 flex items-center gap-3">
                        <Settings className="w-6 h-6 text-primary" /> Security Protocols
                    </h3>

                    <div className="space-y-4">
                        <div className="premium-card p-6 group cursor-pointer hover:bg-primary/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border group-hover:text-primary transition-colors">
                                        <Key className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-sm uppercase tracking-tight">Access Key Rotation</h4>
                                        <p className="text-xs text-muted-foreground font-medium">Update authentication signature</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>

                        <div className="premium-card p-6 group cursor-not-allowed opacity-60">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-sm uppercase tracking-tight">Secure Comms</h4>
                                        <p className="text-xs text-muted-foreground font-medium">E-mail verified & encrypted</p>
                                    </div>
                                </div>
                                <div className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">Active</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Uplink Settings */}
                <div className="space-y-6">
                    <h3 className="text-2xl font-black tracking-tighter uppercase italic px-2 flex items-center gap-3">
                        <Bell className="w-6 h-6 text-secondary" /> Uplink Config
                    </h3>

                    <div className="premium-card p-10 flex flex-col items-center text-center space-y-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

                        <div className="w-20 h-20 rounded-2xl bg-secondary/10 flex items-center justify-center border border-secondary/30 group-hover:rotate-12 transition-transform">
                            <Activity className="w-10 h-10 text-secondary neon-glow" />
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-black text-xl tracking-tight">NEURAL NOTIFICATIONS</h4>
                            <p className="text-xs text-muted-foreground font-medium leading-relaxed max-w-[250px]">
                                Real-time combat alerts and tournament deployment updates.
                            </p>
                        </div>

                        <button className="w-full py-4 rounded-xl glass border-secondary/20 text-secondary font-black uppercase tracking-[0.2em] text-[10px] hover:bg-secondary/10 transition-all">
                            Enable Uplink
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
