"use client";

import { motion } from "framer-motion";
import { GameCard } from "@/components/game/GameCard";
import { Search, Grid, LayoutGrid, Ghost, Zap, Flame, Trophy, Play, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function GamesPage() {
    const games = [
        {
            title: "Word Search",
            description: "Find hidden words in a grid. Test your vocabulary and speed in this classic puzzle game.",
            image: "https://images.unsplash.com/photo-1632516643720-e7f5d7d6ecc9?q=80&w=1000&auto=format&fit=crop",
            icon: Search,
            href: "/games/word-search",
            color: "blue"
        },
        {
            title: "Tic Tac Toe",
            description: "Challenge the AI or a friend in this timeless strategy game. Can you beat the Hard mode?",
            image: "https://images.unsplash.com/photo-1668901382969-8c73e450a1f5?q=80&w=1000&auto=format&fit=crop",
            icon: Grid,
            href: "/games/tic-tac-toe",
            color: "green"
        },
        {
            title: "Memory Game",
            description: "Test your memory by matching pairs of cards. Race against the clock to set a high score.",
            image: "https://images.unsplash.com/photo-1611996575749-79a3a250f968?q=80&w=1000&auto=format&fit=crop",
            icon: LayoutGrid,
            href: "/games/memory",
            color: "purple"
        },
        {
            title: "Pacman",
            description: "Navigate the maze, eat dots, and avoid ghosts in this retro arcade classic.",
            image: "https://images.unsplash.com/photo-1551103782-8ab07afd45c1?q=80&w=1000&auto=format&fit=crop",
            icon: Ghost,
            href: "/games/pacman",
            color: "yellow"
        }
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
        >
            {/* Cinematic Header */}
            <div className="relative rounded-[2.5rem] overflow-hidden bg-black/20 border border-white/10 p-12 group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-secondary/10 rounded-full blur-[80px] animate-pulse delay-1000" />

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-1 space-y-6 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-xs font-black uppercase tracking-widest text-primary">
                            <Flame className="w-4 h-4" /> Season 1 Live
                        </div>
                        <h1 className="text-6xl font-black tracking-tighter uppercase italic leading-[0.9]">
                            Combat <span className="text-primary italic">Sector</span>
                        </h1>
                        <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm max-w-lg">
                            Select your operational zone. Complete missions to climb the global leaderboard and secure territory.
                        </p>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 pt-4">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                <span className="text-xs font-black uppercase tracking-widest">Global Rewards</span>
                            </div>
                            <div className="flex items-center gap-2 border-l border-white/10 pl-6">
                                <Zap className="w-5 h-5 text-secondary" />
                                <span className="text-xs font-black uppercase tracking-widest">Instant Deploy</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative w-full md:w-auto h-48 md:h-64 aspect-square hidden md:block">
                        <div className="absolute inset-0 border-[20px] border-white/5 rounded-[4rem] animate-spin-slow" />
                        <div className="absolute inset-4 border-[1px] border-primary/40 rounded-[3rem] p-8 flex items-center justify-center bg-background/50 backdrop-blur-xl">
                            <Gamepad2 className="w-24 h-24 text-primary neon-glow" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Filters / Search Bar (Visual) */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
                <div className="flex items-center gap-4">
                    <button className="px-6 py-2 rounded-xl bg-primary text-white font-black uppercase tracking-widest text-[10px]">All Zones</button>
                    <button className="px-6 py-2 rounded-xl glass border-white/10 hover:bg-white/5 transition-all font-black uppercase tracking-widest text-[10px]">Strategic</button>
                    <button className="px-6 py-2 rounded-xl glass border-white/10 hover:bg-white/5 transition-all font-black uppercase tracking-widest text-[10px]">Arcade</button>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="SEARCH SECTOR..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>
            </div>

            {/* Games Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {games.map((game, i) => (
                    <div key={i} className="group relative">
                        <GameCard {...game} delay={i * 0.05} />
                        <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="bg-primary p-2 rounded-lg shadow-xl">
                                <Play className="w-4 h-4 text-white fill-current" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
