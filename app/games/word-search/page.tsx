"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Joystick, Trophy, Timer, Share2, Maximize2, CheckCircle2, Gamepad2, User, Search, AlertCircle, Play } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ScoreModal } from "@/components/game/ScoreModal";

export default function WordSearchPage() {
    const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
    const [isPlaying, setIsPlaying] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const leaderboard = [
        { rank: "01", name: "LinguistX", region: "UK", score: "8,200", color: "text-amber-500", border: "border-amber-500" },
        { rank: "02", name: "WordSmith", region: "India", score: "7,850", color: "text-slate-400", border: "border-slate-400" },
        { rank: "03", name: "LexiCon", region: "Canada", score: "7,400", color: "text-amber-700", border: "border-amber-700" },
    ];

    return (
        <div className="min-h-screen grid-bg pb-20">
            <main className="container mx-auto px-6 py-8">
                <div className="flex flex-col lg:flex-row gap-10">
                    {/* Left Column: Game Preview & Controls */}
                    <div className="flex-1 space-y-10">
                        <div className="flex items-end justify-between border-b border-white/5 pb-6">
                            <div className="space-y-4">
                                <Link href="/games" className="flex items-center gap-2 text-secondary hover:translate-x-[-4px] transition-transform">
                                    <ArrowLeft className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Back to Arcade</span>
                                </Link>
                                <h2 className="text-5xl md:text-6xl font-heading font-black uppercase italic tracking-tighter text-foreground">
                                    Word <span className="text-primary">Search</span>
                                </h2>
                            </div>
                            <div className="text-right">
                                <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Vocabulary Exp.</span>
                                <p className="text-amber-400 font-heading text-3xl font-black">300 XP</p>
                            </div>
                        </div>

                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-secondary via-primary to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                            <div className="relative glass-card rounded-2xl overflow-hidden border-white/10 h-[500px]">
                                {!isPlaying ? (
                                    <>
                                        <img
                                            alt="Word Search Preview"
                                            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[2000ms]"
                                            src="https://images.unsplash.com/photo-1632516643720-e7f5d7d6ecc9?q=80&w=1000&auto=format&fit=crop"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center space-y-6">
                                            <h3 className="font-heading text-4xl font-black text-white dropshadow-glow">READY TO DEPLOY?</h3>
                                            <p className="text-muted-foreground max-w-md font-bold text-sm uppercase tracking-wider">
                                                Find all hidden tactical markers within the grid. Higher intensity sectors contain encrypted patterns.
                                            </p>
                                            <button
                                                onClick={() => setIsPlaying(true)}
                                                className="px-12 py-4 bg-primary text-white font-heading font-black rounded-xl shadow-[0_0_30px_rgba(var(--primary),0.5)] hover:scale-110 active:scale-95 transition-all flex items-center gap-3"
                                            >
                                                INITIALIZE <Play className="w-5 h-5 fill-current" />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/90 relative">
                                        <div className="absolute top-8 left-8 flex items-center gap-2">
                                            <Timer className="w-5 h-5 text-secondary animate-pulse" />
                                            <span className="font-heading text-2xl font-black text-white italic">05:00</span>
                                        </div>
                                        <div className="text-center space-y-4">
                                            <p className="text-3xl font-heading font-black text-primary animate-pulse italic">SECTOR LOADING...</p>
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.4em] max-w-xs">Establishing neural link with lexical database</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setIsPlaying(false);
                                                setShowModal(true);
                                            }}
                                            className="absolute bottom-8 px-6 py-2 border border-rose-500/50 text-rose-500 rounded-xl hover:bg-rose-500/10 font-black text-[10px] tracking-widest transition-all"
                                        >
                                            ABORT MISSION
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="font-heading text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Select Lexical Load</h3>
                            <div className="grid grid-cols-3 gap-6">
                                {[
                                    { id: "EASY", label: "Cadet", desc: "10x10 • 8 Words", color: "emerald" },
                                    { id: "MEDIUM", label: "Operative", desc: "15x15 • 12 Words", color: "amber" },
                                    { id: "HARD", label: "Agent", desc: "20x20 • 16 Words", color: "rose" }
                                ].map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setDifficulty(opt.id as any)}
                                        disabled={isPlaying}
                                        className={cn(
                                            "relative h-28 overflow-hidden rounded-xl transition-all duration-300",
                                            difficulty === opt.id
                                                ? `bg-${opt.color}-500/20 border-2 border-${opt.color}-500 shadow-[0_0_20px_rgba(var(--${opt.color}-500),0.3)]`
                                                : "bg-slate-800/40 border border-white/5 hover:bg-slate-800/60 opacity-60",
                                            isPlaying && "cursor-not-allowed opacity-30"
                                        )}
                                        style={{
                                            clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0% 100%)",
                                            borderColor: !isPlaying && difficulty === opt.id ? `var(--${opt.id === "EASY" ? "green" : opt.id === "MEDIUM" ? "yellow" : "red"}-500)` : ""
                                        }}
                                    >
                                        <div className="relative flex flex-col items-center justify-center h-full space-y-1">
                                            {difficulty === opt.id && <CheckCircle2 className="w-4 h-4 text-current absolute top-3 right-8" />}
                                            <span className={cn("text-xs font-black uppercase tracking-[0.2em]", difficulty === opt.id ? "text-foreground" : "text-muted-foreground")}>
                                                {opt.label}
                                            </span>
                                            <p className="text-[10px] font-bold text-muted-foreground/60">{opt.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Mini Leaderboard */}
                    <div className="w-full lg:w-[400px]">
                        <div className="glass-card rounded-2xl border-white/10 p-8 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-10">
                                <div className="flex items-center gap-3">
                                    <Trophy className="w-5 h-5 text-amber-500" />
                                    <h3 className="font-heading font-black uppercase tracking-widest text-sm">Top Linguists</h3>
                                </div>
                                <span className="text-[9px] bg-primary/20 text-primary px-2.5 py-1 rounded-lg border border-primary/30 font-black tracking-widest">WEEKLY</span>
                            </div>

                            <div className="flex-1 space-y-4">
                                {leaderboard.map((item, i) => (
                                    <div key={i} className={cn("flex items-center gap-4 bg-white/5 p-4 rounded-xl border-l-4 transition-all hover:translate-x-2", item.border)}>
                                        <span className={cn("font-heading text-2xl font-black italic w-10 text-center", item.color)}>{item.rank}</span>
                                        <div className="flex-1">
                                            <p className="text-xs font-black text-white uppercase tracking-tight">{item.name}</p>
                                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">{item.region}</p>
                                        </div>
                                        <p className="font-heading text-sm font-black text-secondary">{item.score}</p>
                                    </div>
                                ))}

                                <div className="space-y-4 mt-8 pt-8 border-t border-white/5">
                                    <h4 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] mb-2 px-2">Mission Parameters</h4>
                                    <div className="glass-card p-4 space-y-3 bg-white/5 border-white/10">
                                        <div className="flex items-center gap-3">
                                            <AlertCircle className="w-4 h-4 text-primary" />
                                            <span className="text-[10px] font-black text-foreground uppercase tracking-wider">Find Linear Sequences</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <AlertCircle className="w-4 h-4 text-primary" />
                                            <span className="text-[10px] font-black text-foreground uppercase tracking-wider">Horizontal / Vertical / Diagonal</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <AlertCircle className="w-4 h-4 text-primary" />
                                            <span className="text-[10px] font-black text-foreground uppercase tracking-wider">Swipe to confirm pattern</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <div className="fixed bottom-0 left-0 w-full px-12 py-6 pointer-events-none -z-10 opacity-10">
                <div className="flex justify-between items-end">
                    <div className="font-heading text-[120px] leading-none font-black tracking-tighter text-foreground select-none uppercase">SearcH</div>
                    <div className="flex gap-4">
                        <div className="w-1.5 bg-secondary h-20"></div>
                        <div className="w-1.5 bg-primary h-28"></div>
                        <div className="w-1.5 bg-purple-500 h-14"></div>
                    </div>
                </div>
            </div>

            <ScoreModal
                isOpen={showModal}
                score={3250}
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
