"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LucideIcon, Play, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameCardProps {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    image: string;
    delay?: number;
}

export function GameCard({ title, description, href, icon: Icon, image, delay = 0 }: GameCardProps) {
    return (
        <Link href={href} className="block h-full group">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay }}
                className="glass-card relative h-[450px] overflow-hidden flex flex-col border-white/10 hover:border-secondary/50 transition-all duration-500"
            >
                {/* Image Background with Overlay */}
                <div className="absolute inset-0 z-0">
                    <img
                        src={image}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-40 grayscale-[0.8] group-hover:grayscale-0"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/80 to-transparent" />
                </div>

                {/* Content */}
                <div className="relative z-10 p-8 mt-auto flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:border-secondary transition-colors">
                            <Icon className="w-8 h-8 text-secondary neon-glow" />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-primary tracking-widest uppercase">
                            <Users className="w-3 h-3" />
                            <span>1.2k Live</span>
                        </div>
                    </div>

                    <h3 className="font-heading text-4xl font-black mb-3 tracking-tighter group-hover:text-secondary transition-colors uppercase italic leading-none">
                        {title}
                    </h3>

                    <p className="text-muted-foreground font-medium text-[11px] leading-relaxed mb-8 line-clamp-2 uppercase tracking-widest opacity-60">
                        {description}
                    </p>

                    <div className="relative h-14 overflow-hidden rounded-xl border border-white/10 flex items-center justify-center group-hover:bg-secondary transition-all group-hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                        <span className="relative z-10 text-[10px] font-black tracking-[0.3em] uppercase group-hover:text-background transition-colors">ENGAGE MISSION</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-secondary/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    </div>
                </div>

                {/* Scanline Effect */}
                <div className="absolute inset-0 pointer-events-none opacity-10 group-hover:opacity-20 transition-opacity" style={{ backgroundImage: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))", backgroundSize: "100% 2px, 3px 100%" }} />
            </motion.div>
        </Link>
    );
}

import { Users } from "lucide-react";
