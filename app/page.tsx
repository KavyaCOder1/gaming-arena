"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Gamepad2, Trophy, Users, Zap, Search, Grid, LayoutGrid, Ghost } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { GameCard } from "@/components/game/GameCard";

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggeredChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      <nav className="relative z-50 flex items-center justify-between p-6 container mx-auto">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/20 rounded-xl border border-primary/50">
            <Gamepad2 className="w-8 h-8 text-primary" />
          </div>
          <span className="text-2xl font-bold font-mono tracking-wider">GAMING<span className="text-primary">ARENA</span></span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link href="/auth/login" className="px-6 py-2 rounded-full font-medium hover:bg-white/5 transition-colors">
            Login
          </Link>
          <Link
            href="/auth/register"
            className="px-6 py-2 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 hover:shadow-[0_0_20px_theme(colors.primary.DEFAULT)] transition-all"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main className="relative z-10 container mx-auto px-6 py-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-4xl mx-auto mb-24"
        >
          <motion.div variants={itemVariants} className="inline-block mb-6 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-primary">
            🚀 The Next Gen Web Gaming Platform
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-6xl md:text-8xl font-black mb-8 leading-tight tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 dark:from-white dark:to-white/50">
            COMPETE.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-secondary animate-gradient-x">
              DOMINATE.
            </span><br />
            WIN.
          </motion.h1>

          <motion.p variants={itemVariants} className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Experience competitive gaming like never before. Play classic arcade games, climb the global leaderboards, and prove your skills against the world.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary text-lg font-bold hover:scale-105 transition-transform shadow-[0_0_30px_theme(colors.primary.DEFAULT)] hover:shadow-[0_0_50px_theme(colors.primary.DEFAULT)]"
            >
              Start Playing Now
            </Link>
            <Link
              href="#games"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-card border border-white/10 text-lg font-bold hover:bg-white/5 transition-colors"
            >
              Browse Games
            </Link>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32"
        >
          {[
            { icon: Trophy, title: "Global Leaderboards", desc: "Compete for the top spot across all games and difficulties." },
            { icon: Users, title: "Real-time Stats", desc: "Track your performance with detailed analytics and history." },
            { icon: Zap, title: "Instant Action", desc: "No downloads required. Jump straight into the action in seconds." }
          ].map((feature, i) => (
            <div key={i} className="p-8 rounded-2xl glass-card text-center">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
                <feature.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Games Showcase */}
        <div id="games" className="mb-20">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl font-bold font-mono">FEATURED GAMES</h2>
            <Link href="/auth/register" className="text-primary hover:underline">View All Games &rarr;</Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[500px]">
            {games.map((game, i) => (
              <GameCard key={i} {...game} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 bg-black/20 py-12">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>&copy; 2026 Gaming Arena. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
