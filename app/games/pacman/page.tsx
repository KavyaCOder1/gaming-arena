"use client";

import { useState } from "react";
import { DifficultySelector } from "@/components/game/DifficultySelector";

export default function PacmanPage() {
    const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("EASY");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-mono text-yellow-500">PACMAN</h1>
                <div className="w-64">
                    <DifficultySelector
                        currentDifficulty={difficulty}
                        onSelect={setDifficulty}
                    />
                </div>
            </div>

            <div className="aspect-[16/9] w-full glass rounded-xl flex items-center justify-center border border-white/5 bg-black/40">
                <div className="text-center space-y-4">
                    <h2 className="text-3xl font-bold">Coming Soon</h2>
                    <p className="text-muted-foreground">Waka waka! The retro classic is on its way.</p>
                </div>
            </div>
        </div>
    );
}
