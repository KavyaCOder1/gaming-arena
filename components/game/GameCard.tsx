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
        <Link href={href} className="block h-full">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay }}
                whileHover={{ y: -5 }}
                className="premium-card group relative h-[450px] overflow-hidden flex flex-col"
            >
                {/* Image Background with Overlay */}
                <div className="absolute inset-0 z-0">
                    <img
                        src={image}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 grayscale-[0.5] group-hover:grayscale-0"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                </div>

                {/* Content */}
                <div className="relative z-10 p-8 mt-auto flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-primary/20 backdrop-blur-md border border-primary/30 group-hover:bg-primary/30 transition-colors">
                            <Icon className="w-6 h-6 text-primary neon-glow" />
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-black text-secondary tracking-widest uppercase">
                            <Trophy className="w-3 h-3" />
                            <span>1.2k Played</span>
                        </div>
                    </div>

                    <h3 className="text-3xl font-black mb-3 tracking-tighter group-hover:text-primary transition-colors uppercase italic">
                        {title}
                    </h3>

                    <p className="text-muted-foreground font-medium text-sm leading-relaxed mb-8 line-clamp-3 group-hover:text-foreground transition-colors">
                        {description}
                    </p>

                    <div className="relative overflow-hidden rounded-xl bg-primary group-hover:bg-primary/90 p-[1px] transition-all">
                        <div className="bg-card group-hover:bg-primary transition-colors rounded-[11px] py-4 flex items-center justify-center gap-2">
                            <span className="text-sm font-black tracking-[0.2em] group-hover:text-white transition-colors">ENTER ARENA</span>
                            <Play className="w-3 h-3 fill-current group-hover:text-white" />
                        </div>
                    </div>
                </div>

                {/* Animated Gradient Border on Hover */}
                <div className="absolute inset-0 border-2 border-primary/0 group-hover:border-primary/50 transition-colors rounded-2xl pointer-events-none" />
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </motion.div>
        </Link>
    );
}
