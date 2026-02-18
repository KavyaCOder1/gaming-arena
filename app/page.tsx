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
      <section className="relative pt-32 pb-20 overflow-hidden min-h-[90vh] flex items-center">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 z-0 opacity-40 dark:opacity-60 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] -mr-96 -mt-96 animate-glow-pulse" />
          <div className="absolute left-0 bottom-0 w-[600px] h-[600px] bg-secondary/20 rounded-full blur-[100px] -ml-64 -mb-64 animate-glow-pulse delay-1000" />
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        </div>

        <div className="container relative z-10 mx-auto px-6">
          <motion.div
            style={{ opacity, scale }}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center text-center max-w-5xl mx-auto"
          >
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/10 border border-primary/20 text-sm font-black uppercase tracking-widest text-primary mb-8 animate-float"
            >
              <Zap className="w-4 h-4 fill-primary" />
              <span>Next Gen Web Gaming</span>
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-6xl md:text-9xl font-black mb-8 leading-[1] tracking-tighter">
              BATTLE IN THE <br />
              <span className="text-gradient">ARENA</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-lg md:text-2xl text-muted-foreground/80 mb-12 max-w-3xl leading-relaxed font-medium">
              Join thousands of players in high-stakes web arcade battles.
              Compete for glory, dominate the leaderboards, and win real rewards.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto">
              <Link
                href="/auth/register"
                className="group relative w-full sm:w-auto px-10 py-5 rounded-2xl bg-primary text-white font-black text-xl hover:scale-105 transition-all shadow-[0_0_40px_rgba(168,85,247,0.4)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <span className="relative flex items-center justify-center gap-2">
                  START PLAYING <ChevronRight className="w-6 h-6" />
                </span>
              </Link>
              <Link
                href="#games"
                className="w-full sm:w-auto px-10 py-5 rounded-2xl glass border-white/10 dark:border-white/20 font-black text-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                BROWSE GAMES
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Featured Games */}
      <section id="games" className="py-32 relative bg-background/50 backdrop-blur-3xl border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-primary font-bold mb-4">
                <div className="h-px w-8 bg-primary" />
                <span>TOURNAMENT READY</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter font-mono uppercase">
                FEATURED <span className="text-primary italic">VOIDS</span>
              </h2>
            </div>
            <Link
              href="/games"
              className="px-6 py-3 rounded-xl glass border-primary/20 text-primary font-bold hover:bg-primary/10 transition-all flex items-center gap-2"
            >
              VIEW ALL GAMES <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {games.map((game, i) => (
              <GameCard key={i} {...game} delay={i * 0.15} />
            ))}
          </div>
        </div>
      </section>

      {/* Stats/Benefits Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: Trophy,
                title: "GLOBAL RANKINGS",
                desc: "Every move counts. Climb the global leaderboard and etch your name into the arena's history.",
                highlight: "10K+ Players"
              },
              {
                icon: Star,
                title: "PREMIUM REWARDS",
                desc: "Win matches to earn exclusive achievements and unlock premium cosmetics and arena perks.",
                highlight: "Exclusive Drops"
              },
              {
                icon: Zap,
                title: "ZERO LATENCY",
                desc: "Engineered for speed. Enjoy seamless, high-performance gaming directly in your browser.",
                highlight: "V8 Optimized"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="premium-card p-10 flex flex-col items-center text-center group"
              >
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
                  <feature.icon className="w-10 h-10 text-primary neon-glow" />
                </div>
                <div className="mb-4 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-[10px] font-black tracking-widest uppercase">
                  {feature.highlight}
                </div>
                <h3 className="text-2xl font-black mb-6 tracking-tight">{feature.title}</h3>
                <p className="text-muted-foreground/80 leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Gamepad2 className="h-6 w-6 text-primary" />
              </div>
              <span className="text-2xl font-black tracking-tighter">
                GAMING<span className="text-primary">ARENA</span>
              </span>
            </div>
            <div className="flex items-center gap-8 text-sm font-bold text-muted-foreground">
              <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
              <Link href="#" className="hover:text-primary transition-colors">Discord</Link>
              <Link href="#" className="hover:text-primary transition-colors">Twitter</Link>
            </div>
          </div>
          <div className="mt-20 pt-8 border-t border-white/5 text-center text-muted-foreground/40 text-[10px] font-black tracking-[0.2em] uppercase">
            &copy; 2026 Gaming Arena. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
