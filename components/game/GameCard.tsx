"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LucideIcon, Play } from "lucide-react";

interface GameCardProps {
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    image: string;
    color: string;
    delay?: number;
}

export function GameCard({ title, description, href, icon: Icon, image, color, delay = 0 }: GameCardProps) {
    return (
        <Link href={href}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay }}
                className="group relative overflow-hidden rounded-2xl bg-card border border-border shadow-lg hover:shadow-2xl hover:shadow-[0_0_30px_rgba(var(--primary),0.3)] transition-all duration-300 h-full"
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />

                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                    style={{ backgroundImage: `url(${image})` }}
                />

                <div className="relative z-20 p-6 flex flex-col justify-end h-full">
                    <div className={`
            w-12 h-12 rounded-xl flex items-center justify-center mb-4
            bg-white/10 backdrop-blur-md border border-white/20
            group-hover:scale-110 transition-transform duration-300
          `}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2 font-mono tracking-wide group-hover:text-primary transition-colors">
                        {title}
                    </h3>

                    <p className="text-gray-300 text-sm mb-6 line-clamp-2 group-hover:text-white transition-colors">
                        {description}
                    </p>

                    <button className="w-full py-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider flex items-center justify-center gap-2 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <Play className="w-4 h-4 fill-current" />
                        Play Now
                    </button>
                </div>
            </motion.div>
        </Link>
    );
}
