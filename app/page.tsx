"use client";

import Link from "next/link";
import { motion, useScroll, useTransform, Variants } from "framer-motion";
import { Gamepad2, Trophy, Users, Zap, Search, Grid, LayoutGrid, Ghost, ChevronRight, Play, Star } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { GameCard } from "@/components/game/GameCard";

export default function Home() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const scale = useTransform(scrollY, [0, 300], [1, 0.9]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.3 } }
  };

  const itemVariants: Variants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 100 } }
  };

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
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/30">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden min-h-[95vh] flex items-center grid-bg">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center relative z-10 w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-black tracking-[0.2em] mb-12 uppercase"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            Live Competitive Season 1
          </motion.div>

          <motion.h1
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="text-[12vw] md:text-[8rem] lg:text-[10rem] font-black neon-text mb-8 tracking-tight leading-[0.85] uppercase italic"
          >
            ENTER THE<br />ARENA
          </motion.h1>

          <motion.p
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="max-w-2xl text-lg md:text-xl text-muted-foreground/80 mb-16 font-medium tracking-wide leading-relaxed"
          >
            Join the ultimate gaming ecosystem. Compete in high-stakes mini-games,
            climb the global leaderboards, and prove your dominance.
          </motion.p>

          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row gap-6 mb-32"
          >
            <Link
              href="/auth/register"
              className="px-10 py-5 bg-gradient-to-r from-primary to-secondary rounded-xl font-black text-xl tracking-[0.1em] shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] transition-all hover:-translate-y-1 flex items-center gap-3 text-white"
            >
              PLAY NOW
              <Zap className="w-6 h-6 fill-current" />
            </Link>
            <Link
              href="/dashboard/leaderboard"
              className="px-10 py-5 glass-card rounded-xl font-black text-xl tracking-[0.1em] hover:bg-white/10 transition-all flex items-center gap-3"
            >
              VIEW RANKINGS
              <Trophy className="w-6 h-6" />
            </Link>
          </motion.div>

          <div className="w-full">
            <div className="flex items-center justify-between mb-12">
              <h2 className="font-heading text-2xl md:text-3xl font-black tracking-wider flex items-center gap-4">
                <span className="w-12 h-0.5 bg-secondary"></span>
                FEATURED GAMES
              </h2>
              <Link href="/games" className="text-secondary font-black flex items-center gap-2 hover:gap-4 transition-all group">
                EXPLORE ALL <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {games.map((game, i) => (
                <GameCard key={i} {...game} delay={i * 0.1} />
              ))}
            </div>
          </div>
        </div>

        {/* Background Effects */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 bg-[#0F172A]">
          <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[10%] right-[5%] w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[150px]"></div>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        </div>
      </section>

      {/* Stats Section */}
      <footer className="mt-12 border-t border-white/5 py-24 bg-[#0F172A] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 relative z-10">
          {[
            { value: "50K+", label: "Active Gamers" },
            { value: "1M+", label: "Matches Played" },
            { value: "$10K", label: "Monthly Prizes" },
            { value: "24/7", label: "Global Support" }
          ].map((stat, i) => (
            <div key={i} className="text-center md:text-left space-y-2">
              <div className="text-5xl font-black font-heading text-secondary tracking-tighter">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em]">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-24 mt-24 border-t border-white/5 text-center text-muted-foreground/40 text-sm flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="font-bold tracking-tight">© 2026 Gaming Arena. Created for the elite.</p>
          <div className="flex gap-10 font-black uppercase tracking-widest text-[10px]">
            <Link href="#" className="hover:text-secondary transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-secondary transition-colors">Discord</Link>
            <Link href="#" className="hover:text-secondary transition-colors">Instagram</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
