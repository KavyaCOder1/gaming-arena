"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Joystick, Trophy, Timer, Share2, Maximize2, CheckCircle2, Gamepad2, User } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function PacmanPage() {
    const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");

    const leaderboard = [
        { rank: "01", name: "ShadowMaster", region: "United Kingdom", score: "124,500", color: "text-amber-500", border: "border-amber-500" },
        { rank: "02", name: "PixelPulse", region: "Japan", score: "118,230", color: "text-slate-400", border: "border-slate-400" },
        { rank: "03", name: "VoidRunner", region: "USA", score: "112,900", color: "text-amber-700", border: "border-amber-700" },
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
                                    Pac-Man <span className="text-primary">Retro</span>
                                </h2>
                            </div>
                            <div className="text-right">
                                <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Estimated Reward</span>
                                <p className="text-amber-400 font-heading text-3xl font-black">500 XP</p>
                            </div>
                        </div>

                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-secondary via-primary to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                            <div className="relative glass-card rounded-2xl overflow-hidden border-white/10">
                                <img
                                    alt="Pacman Preview"
                                    className="w-full h-[500px] object-cover opacity-80 group-hover:scale-105 transition-transform duration-[2000ms]"
                                    src="https://images.unsplash.com/photo-1551103782-8ab07afd45c1?q=80&w=1000&auto=format&fit=crop"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

                                <div className="absolute top-8 left-8">
                                    <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-lg border border-secondary/50 flex items-center gap-3">
                                        <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse shadow-[0_0_10px_var(--secondary)]"></span>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Live Session Ready</span>
                                    </div>
                                </div>

                                <div className="absolute bottom-8 left-8 right-8 flex justify-between items-center">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-slate-900/80 rounded-2xl border border-primary/30">
                                            <Joystick className="w-8 h-8 text-primary shadow-glow" />
                                        </div>
                                        <div>
                                            <p className="text-white font-heading font-black tracking-wider">CLASSIC ENGINE</p>
                                            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em] mt-1">Phaser.js v3.60</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                                            <Share2 className="w-5 h-5 text-muted-foreground" />
                                        </button>
                                        <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                                            <Maximize2 className="w-5 h-5 text-muted-foreground" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="font-heading text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Select Combat Intensity</h3>
                            <div className="grid grid-cols-3 gap-6">
                                {[
                                    { id: "EASY", label: "Easy", desc: "2 Ghosts • Standard", color: "emerald" },
                                    { id: "MEDIUM", label: "Medium", desc: "3 Ghosts • Fast", color: "amber" },
                                    { id: "HARD", label: "Hard", desc: "4 Ghosts • Hyper", color: "rose" }
                                ].map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setDifficulty(opt.id as any)}
                                        className={cn(
                                            "relative h-28 overflow-hidden rounded-xl transition-all duration-300",
                                            difficulty === opt.id
                                                ? `bg-${opt.color}-500/20 border-2 border-${opt.color}-500 shadow-[0_0_20px_rgba(var(--${opt.color}-500),0.3)]`
                                                : "bg-slate-800/40 border border-white/5 hover:bg-slate-800/60"
                                        )}
                                        style={{
                                            clipPath: "polygon(10% 0, 100% 0, 90% 100%, 0% 100%)",
                                            borderColor: difficulty === opt.id ? `var(--${opt.id === "EASY" ? "green" : opt.id === "MEDIUM" ? "yellow" : "red"}-500)` : ""
                                        }}
                                    >
                                        <div className="relative flex flex-col items-center justify-center h-full space-y-1">
                                            {difficulty === opt.id && <CheckCircle2 className="w-4 h-4 text-current absolute top-3 right-8" />}
                                            <span className={cn("text-xs font-black uppercase tracking-[0.2em]", difficulty === opt.id ? "text-foreground" : "text-muted-foreground")}>
                                                {opt.label}
                                            </span>
                                            <p className="text-[10px] font-bold text-muted-foreground/60">{opt.desc}</p>
                                        </div>
                                        <div className={cn(
                                            "absolute bottom-0 w-full h-1 transition-all",
                                            difficulty === opt.id ? "h-1.5 opacity-100" : "opacity-0",
                                            opt.id === "EASY" ? "bg-emerald-500" : opt.id === "MEDIUM" ? "bg-amber-500" : "bg-rose-500"
                                        )} />
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
                                    <h3 className="font-heading font-black uppercase tracking-widest text-sm">Global Top 10</h3>
                                </div>
                                <span className="text-[9px] bg-primary/20 text-primary px-2.5 py-1 rounded-lg border border-primary/30 font-black tracking-widest">ALL TIME</span>
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
                                    {[
                                        { rank: "04", name: "Cypher_01", score: "98,400" },
                                        { rank: "05", name: "GhostBuster", score: "95,200" },
                                        { rank: "06", name: "NeoTokyo", score: "92,110" },
                                        { rank: "07", name: "SynthWave", score: "89,000" },
                                        { rank: "08", name: "Vortex", score: "85,550" },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between text-[11px] px-2 py-1.5 border-b border-white/5 group hover:bg-white/5 rounded transition-all">
                                            <span className="text-muted-foreground font-heading group-hover:text-foreground">{item.rank}. {item.name}</span>
                                            <span className="text-primary font-black">{item.score}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-10 pt-6 border-t border-white/5">
                                <div className="flex items-center gap-4 bg-primary/10 p-4 rounded-xl border border-primary/30">
                                    <div className="w-10 h-10 rounded-full border-2 border-secondary bg-slate-800 flex items-center justify-center shrink-0">
                                        <User className="w-5 h-5 text-secondary" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[9px] text-primary font-black uppercase tracking-[0.2em] mb-1">Your Current Rank</p>
                                        <p className="text-sm font-heading font-black text-white italic">#2,142</p>
                                    </div>
                                    <p className="text-[10px] font-black text-muted-foreground tracking-widest">42,000 PTS</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-20 flex flex-col items-center gap-8">
                    <button className="group relative px-24 py-8 bg-secondary rounded-xl text-background font-heading text-3xl font-black uppercase tracking-[0.3em] transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(34,211,238,0.5)]">
                        <span className="relative z-10 flex items-center gap-4">
                            START GAME <Gamepad2 className="w-8 h-8" />
                        </span>
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <div className="flex gap-16 text-muted-foreground/60">
                        <div className="flex items-center gap-3">
                            <span className="text-secondary/50 font-black">↑↓←→</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">WASD / ARROWS</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="px-2 py-0.5 border border-current rounded text-[10px]">SPACE</div>
                            <span className="text-[10px] font-black uppercase tracking-widest">PAUSE GAME</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Timer className="w-4 h-4 text-secondary/50" />
                            <span className="text-[10px] font-black uppercase tracking-widest">AVG ROUND: 4M</span>
                        </div>
                    </div>
                </div>
            </main>

            <div className="fixed bottom-0 left-0 w-full px-12 py-6 pointer-events-none -z-10 opacity-10">
                <div className="flex justify-between items-end">
                    <div className="font-heading text-[120px] leading-none font-black tracking-tighter text-foreground select-none">PACMAN</div>
                    <div className="flex gap-4">
                        <div className="w-1.5 bg-secondary h-20"></div>
                        <div className="w-1.5 bg-primary h-28"></div>
                        <div className="w-1.5 bg-purple-500 h-14"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
