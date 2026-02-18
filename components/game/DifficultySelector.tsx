"use client";

import { motion } from "framer-motion";

interface DifficultySelectorProps {
    currentDifficulty: "EASY" | "MEDIUM" | "HARD";
    onSelect: (difficulty: "EASY" | "MEDIUM" | "HARD") => void;
    disabled?: boolean;
}

const difficulties = [
    { id: "EASY", label: "Easy", color: "bg-green-500", text: "text-green-500" },
    { id: "MEDIUM", label: "Medium", color: "bg-yellow-500", text: "text-yellow-500" },
    { id: "HARD", label: "Hard", color: "bg-red-500", text: "text-red-500" },
];

export function DifficultySelector({ currentDifficulty, onSelect, disabled }: DifficultySelectorProps) {
    return (
        <div className="flex p-1 space-x-1 bg-muted/50 rounded-xl backdrop-blur-sm border border-white/5">
            {difficulties.map((diff) => {
                const isSelected = currentDifficulty === diff.id;
                return (
                    <button
                        key={diff.id}
                        onClick={() => onSelect(diff.id as any)}
                        disabled={disabled}
                        className={`
              relative flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all
              ${isSelected ? "text-white shadow-sm" : "text-muted-foreground hover:text-white hover:bg-white/5"}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
                    >
                        {isSelected && (
                            <motion.div
                                layoutId="activeDifficulty"
                                className={`absolute inset-0 rounded-lg ${diff.color}`}
                                initial={false}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10">{diff.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
