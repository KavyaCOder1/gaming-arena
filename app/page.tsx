"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { Trophy, Zap, Search, Grid, LayoutGrid, Ghost, ChevronRight, Crown, Medal, Swords, Rocket, Layers, Target } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Navbar } from "@/components/layout/Navbar";
import { GameCard } from "@/components/game/GameCard";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const C = { cyan: "#22d3ee", indigo: "#6366f1", text: "#f8fafc", muted: "#64748b" };

export default function Home() {
  const { openAuthModal, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const itemVariants: Variants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 100 } }
  };

  const games = [
    { title: "Word Search", description: "Find hidden words in a grid. Test your vocabulary and speed in this classic puzzle game.", image: "/wordsearch.webp", icon: Search, href: "/games/word-search", color: "blue" },
    { title: "Tic Tac Toe", description: "Challenge the AI or a friend in this timeless strategy game. Can you beat the Hard mode?", image: "/tictactoe.webp", icon: Grid, href: "/games/tic-tac-toe", color: "green" },
    { title: "Memory Game", description: "Test your memory by matching pairs of cards. Race against the clock to set a high score.", image: "/memorygame.png", icon: LayoutGrid, href: "/games/memory", color: "purple" },
    { title: "Pacman", description: "Navigate the maze, eat dots, and avoid ghosts in this retro arcade classic.", image: "/pacman_img.webp", icon: Ghost, href: "/games/pacman", color: "yellow" },
    { title: "Snake Arena", description: "Grow your snake by eating XP chips. Survive as long as possible and top the leaderboard.", image: "/snake.webp", icon: Swords, href: "/games/snake", color: "green" },
    { title: "Star Siege", description: "Blast through enemy waves in this space shooter. Auto-fire cannons, missile volleys, survive!", image: "/starsiege.webp", icon: Rocket, href: "/games/space-shooter", color: "yellow" },
  ];

  const gameTypes = [
    { id: "WORD_SEARCH", label: "Word Search", icon: Search },
    { id: "TIC_TAC_TOE", label: "Tic Tac Toe", icon: Grid },
    { id: "MEMORY", label: "Memory", icon: LayoutGrid },
    { id: "PACMAN", label: "Pacman", icon: Ghost },
    { id: "SNAKE", label: "Snake", icon: Swords },
    { id: "SPACE_SHOOTER", label: "Star Siege", icon: Rocket },
    { id: "CONNECT_DOTS", label: "Connect The Dots", icon: Layers },
    { id: "BLOCK_BREAKER", label: "Block Breaker", icon: Target },
  ];

  const [activeGame, setActiveGame] = useState("WORD_SEARCH");
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [lbLoading, setLbLoading] = useState(true);

  useEffect(() => {
    const fetchLb = async () => {
      setLbLoading(true);
      try {
        const res = await fetch(`/api/leaderboard?gameType=${activeGame}`);
        const json = await res.json();
        if (json.success) setLeaderboardData(json.data.slice(0, 8));
      } catch (e) { console.error(e); }
      finally { setLbLoading(false); }
    };
    fetchLb();
  }, [activeGame]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const rankStyle = (i: number) => {
    if (i === 0) return { color: "#f59e0b", icon: Crown };
    if (i === 1) return { color: "#94a3b8", icon: Medal };
    if (i === 2) return { color: "#b45309", icon: Medal };
    return { color: C.muted, icon: null };
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-foreground relative selection:bg-primary/30">
      <Navbar onGamesClick={() => scrollTo("featured-games")} onLeaderboardClick={() => scrollTo("leaderboard")} />

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-20 overflow-hidden min-h-[95vh] flex items-center grid-bg">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center relative z-10 w-full">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-black tracking-[0.2em] mb-12 uppercase"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
            Live Competitive Season 1
          </motion.div>

          <motion.h1 variants={itemVariants} initial="hidden" animate="visible"
            className="text-[12vw] md:text-[8rem] lg:text-[10rem] font-black neon-text mb-8 tracking-tight leading-[0.85] uppercase italic"
          >
            ENTER THE<br />ARENA
          </motion.h1>

          <motion.p variants={itemVariants} initial="hidden" animate="visible"
            className="max-w-2xl text-lg md:text-xl text-muted-foreground/80 mb-16 font-medium tracking-wide leading-relaxed"
          >
            Join the ultimate gaming ecosystem. Compete in high-stakes mini-games,
            climb the global leaderboards, and prove your dominance.
          </motion.p>

          <motion.div variants={itemVariants} initial="hidden" animate="visible"
            className="flex flex-col sm:flex-row gap-6 mb-32 items-center justify-center w-full"
          >
            {isAuthenticated ? (
              <button onClick={() => scrollTo("featured-games")}
                className="px-10 py-5 bg-gradient-to-r from-primary to-secondary rounded-xl font-black text-xl tracking-[0.1em] shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] transition-all hover:-translate-y-1 flex items-center gap-3 text-white"
              >PLAY NOW <Zap className="w-6 h-6 fill-current" /></button>
            ) : (
              <button onClick={() => openAuthModal("register")}
                className="px-10 py-5 bg-gradient-to-r from-primary to-secondary rounded-xl font-black text-xl tracking-[0.1em] shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] transition-all hover:-translate-y-1 flex items-center gap-3 text-white"
              >PLAY NOW <Zap className="w-6 h-6 fill-current" /></button>
            )}
            <button onClick={() => scrollTo("leaderboard")}
              className="px-10 py-5 glass-card rounded-xl font-black text-xl tracking-[0.1em] hover:bg-white/10 transition-all flex items-center gap-3"
            >VIEW RANKINGS <Trophy className="w-6 h-6" /></button>
          </motion.div>

          {/* ── FEATURED GAMES ── */}
          <div className="w-full" id="featured-games">
            <div className="flex items-center justify-between mb-12">
              <h2 className="font-heading text-2xl md:text-3xl font-black tracking-wider flex items-center gap-4">
                <span className="w-12 h-0.5 bg-secondary"></span>
                FEATURED GAMES
              </h2>
              <Link href="/games" className="text-secondary font-black flex items-center gap-2 hover:gap-4 transition-all group">
                EXPLORE ALL <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8" style={{ alignItems: "stretch" }}>
              {games.map((game, i) => <GameCard key={i} {...game} delay={i * 0.1} />)}
            </div>
          </div>
        </div>

        {/* bg */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 bg-[#0F172A]">
          <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[10%] right-[5%] w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[150px]"></div>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        </div>
      </section>

      {/* ── LEADERBOARD SECTION ── */}
      <section id="leaderboard" style={{ padding: "80px 24px 80px", background: "rgba(8,12,28,0.9)", borderTop: "1px solid rgba(34,211,238,0.08)", position: "relative", overflow: "hidden" }}>
        {/* bg glows */}
        <div style={{ position: "absolute", top: -100, left: "20%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, right: "10%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>

          {/* header */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 40 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 2, background: `linear-gradient(90deg, ${C.cyan}, ${C.indigo})`, borderRadius: 1 }} />
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700, color: C.cyan, letterSpacing: "0.4em", textTransform: "uppercase" }}>Global Rankings</span>
              </div>
              <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, color: C.text, textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 14 }}>
                <Trophy style={{ width: 32, height: 32, color: "#f59e0b", filter: "drop-shadow(0 0 10px rgba(245,158,11,0.5))" }} />
                LEADERBOARD
              </h2>
            </div>
            <Link href={isAuthenticated ? "/dashboard/leaderboard" : "#"}
              onClick={!isAuthenticated ? (e) => { e.preventDefault(); openAuthModal("login"); } : undefined}
              style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, color: C.cyan, textDecoration: "none", letterSpacing: "0.2em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6, border: "1px solid rgba(34,211,238,0.3)", padding: "8px 18px", borderRadius: 20, transition: "all 0.2s" }}
            >
              FULL RANKINGS <ChevronRight style={{ width: 14, height: 14 }} />
            </Link>
          </div>

          {/* game tabs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
            {gameTypes.map((g) => {
              const Icon = g.icon;
              const isActive = activeGame === g.id;
              return (
                <button key={g.id} onClick={() => setActiveGame(g.id)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: 40, background: isActive ? "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(34,211,238,0.15))" : "rgba(15,23,42,0.6)", border: `1px solid ${isActive ? "rgba(34,211,238,0.4)" : "rgba(255,255,255,0.06)"}`, color: isActive ? C.cyan : C.muted, fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s", boxShadow: isActive ? "0 0 16px rgba(34,211,238,0.15)" : "none" }}>
                  <Icon style={{ width: 13, height: 13 }} />
                  {g.label}
                </button>
              );
            })}
          </div>

          {/* leaderboard list */}
          <div style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(34,211,238,0.12)", borderRadius: 24, overflow: "hidden", boxShadow: "0 4px 32px rgba(0,0,0,0.4)" }}>
            {/* table head */}
            <div style={{ padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "grid", gridTemplateColumns: "60px 1fr 140px 100px", gap: 12 }}>
              {["RANK", "PLAYER", "TOTAL XP", "MATCHES"].map((h) => (
                <span key={h} style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: "0.3em", textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>

            {lbLoading ? (
              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
                {[...Array(5)].map((_, i) => (
                  <div key={`skeleton-${i}`} style={{ height: 52, borderRadius: 12, background: "rgba(255,255,255,0.03)", animation: "pulse 1.5s ease-in-out infinite" }} />
                ))}
              </div>
            ) : leaderboardData.length === 0 ? (
              <div style={{ padding: "60px 24px", textAlign: "center" }}>
                <Trophy style={{ width: 40, height: 40, color: C.muted, margin: "0 auto 16px", opacity: 0.4 }} />
                <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.2em", textTransform: "uppercase" }}>No records yet. Be the first!</p>
              </div>
            ) : (
              leaderboardData.map((entry, i) => {
                const { color, icon: RankIcon } = rankStyle(i);
                const isTop3 = i < 3;
                return (
                  <motion.div key={entry.id ?? `lb-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    style={{ padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.03)", display: "grid", gridTemplateColumns: "60px 1fr 140px 100px", gap: 12, alignItems: "center", background: isTop3 ? `rgba(${i === 0 ? "245,158,11" : i === 1 ? "148,163,184" : "180,83,9"},0.04)` : "transparent", transition: "background 0.2s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34,211,238,0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isTop3 ? `rgba(${i === 0 ? "245,158,11" : i === 1 ? "148,163,184" : "180,83,9"},0.04)` : "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {RankIcon ? <RankIcon style={{ width: 16, height: 16, color }} /> : null}
                      <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: isTop3 ? 16 : 13, fontWeight: 900, color, fontStyle: isTop3 ? "italic" : "normal" }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: isTop3 ? `0 0 10px ${color}40` : "none" }}>
                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 900, color: "#fff" }}>{entry.user?.username?.[0]?.toUpperCase() ?? "?"}</span>
                      </div>
                      <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 700, color: isTop3 ? C.text : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{entry.user?.username ?? "Unknown"}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 15, fontWeight: 900, color: isTop3 ? color : "#f59e0b", filter: isTop3 ? `drop-shadow(0 0 6px ${color}60)` : "none" }}>
                        {(activeGame === "PACMAN" || activeGame === "SPACE_SHOOTER")
                          ? (entry.highScore?.toLocaleString() ?? "0")
                          : (entry.totalXp?.toLocaleString() ?? "0")}
                      </span>
                      <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7, color: C.muted, letterSpacing: "0.2em" }}>
                        {(activeGame === "PACMAN" || activeGame === "SPACE_SHOOTER") ? "SCORE" : "XP"}
                      </span>
                    </div>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, color: "#64748b" }}>
                      {entry.matches ?? "—"}
                    </span>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </section>

      {/* ── FOOTER STATS ── */}
      <footer className="border-t border-white/5 py-24 bg-[#0F172A] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 relative z-10">
          {[{ value: "50K+", label: "Active Gamers" }, { value: "1M+", label: "Matches Played" }, { value: "$10K", label: "Monthly Prizes" }, { value: "24/7", label: "Global Support" }].map((stat, i) => (
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
