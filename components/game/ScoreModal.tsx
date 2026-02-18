"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trophy, RefreshCcw, Home, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
// import Lottie from "lottie-react"; // Lottie disabled for now until installed correctly
// import animationData from "@/public/lottie/trophy.json"; 

interface ScoreModalProps {
    isOpen: boolean;
    score: number;
    gameType: string;
    onRestart: () => void;
    onClose: () => void;
    isWin: boolean;
}

export function ScoreModal({ isOpen, score, gameType, onRestart, onClose, isWin }: ScoreModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-md p-6 overflow-hidden rounded-2xl glass border-2 border-primary/20 shadow-[0_0_50px_rgba(var(--primary),0.2)]"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>

                    <div className="flex flex-col items-center text-center">
                        {/* Lottie animation placeholder */}
                        <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-2xl ${isWin ? 'bg-yellow-500/20' : 'bg-red-500/20'}`}>
                            <Trophy className={`w-16 h-16 ${isWin ? 'text-yellow-400' : 'text-red-400'} drop-shadow-lg`} />
                        </div>

                        <h2 className="text-3xl font-bold font-mono tracking-wider mb-2 text-glow">
                            {isWin ? "GAME OVER!" : "TRY AGAIN!"}
                        </h2>

                        <p className="text-muted-foreground mb-8">
                            You scored <span className="text-primary font-bold text-xl">{score}</span> points in {gameType}
                        </p>

                        <div className="flex gap-4 w-full">
                            <button
                                onClick={onRestart}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold transition-all hover:scale-105"
                            >
                                <RefreshCcw className="w-4 h-4" />
                                Play Again
                            </button>

                            <Link
                                href="/dashboard"
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold transition-all hover:scale-105"
                            >
                                <Home className="w-4 h-4" />
                                Dashboard
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
