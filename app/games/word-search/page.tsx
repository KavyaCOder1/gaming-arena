"use client";

import { useState } from "react";
import { DifficultySelector } from "@/components/game/DifficultySelector";
import { ScoreModal } from "@/components/game/ScoreModal";
import { AlertCircle } from "lucide-react";

export default function WordSearchPage() {
    const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("EASY");
    const [isPlaying, setIsPlaying] = useState(false);
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-mono text-primary">WORD SEARCH</h1>
                <div className="w-64">
                    <DifficultySelector
                        currentDifficulty={difficulty}
                        onSelect={setDifficulty}
                        disabled={isPlaying}
                    />
                </div>
            </div>

            <div className="aspect-[16/9] w-full glass rounded-xl flex items-center justify-center border border-white/5 relative overflow-hidden bg-black/40">
                {!isPlaying ? (
                    <div className="text-center space-y-4 p-8">
                        <h2 className="text-3xl font-bold">Ready to Play?</h2>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            Find all the hidden words in the grid. Higher difficulties have larger grids and more words.
                        </p>
                        <button
                            onClick={() => setIsPlaying(true)}
                            className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-lg shadow-[0_0_20px_theme(colors.primary.DEFAULT)] hover:scale-105 transition-transform"
                        >
                            START GAME
                        </button>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-2xl animate-pulse">Game Initializing...</p>
                        <p className="text-sm text-muted-foreground mt-2">Game logic coming in Phase 2</p>
                        <button
                            onClick={() => {
                                setIsPlaying(false);
                                setShowModal(true);
                            }}
                            className="mt-8 px-4 py-2 border border-destructive text-destructive rounded hover:bg-destructive/10"
                        >
                            End Demo
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass p-6 rounded-xl">
                    <h3 className="font-bold mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-primary" />
                        How to Play
                    </h3>
                    <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                        <li>Find words vertically, horizontally, or diagonally</li>
                        <li>Swipe or drag to select words</li>
                        <li>Complete the list before time runs out</li>
                    </ul>
                </div>
            </div>

            <ScoreModal
                isOpen={showModal}
                score={1250}
                gameType="Word Search"
                isWin={true}
                onRestart={() => {
                    setShowModal(false);
                    setIsPlaying(true);
                }}
                onClose={() => setShowModal(false)}
            />
        </div>
    );
}
