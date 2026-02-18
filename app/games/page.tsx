"use client";

import { motion } from "framer-motion";
import { GameCard } from "@/components/game/GameCard";
import { Search, Grid, LayoutGrid, Ghost } from "lucide-react";

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
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold font-mono">GAME ARENA</h1>
                <p className="text-muted-foreground">Select a game to start playing and earning points.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {games.map((game, i) => (
                    <GameCard key={i} {...game} delay={i * 0.05} />
                ))}
            </div>
        </div>
    );
}
