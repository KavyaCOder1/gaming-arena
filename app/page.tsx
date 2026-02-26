"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { Trophy, Zap, Search, Hash, LayoutGrid, Ghost, ChevronRight, Activity, Rocket, Waypoints, Boxes, Coins, ArrowRight, Wallet } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Navbar } from "@/components/layout/Navbar";
import { GameCard } from "@/components/game/GameCard";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
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
    { title: "Tic Tac Toe", description: "Challenge the AI or a friend in this timeless strategy game. Can you beat the Hard mode?", image: "/tictactoe.webp", icon: Hash, href: "/games/tic-tac-toe", color: "purple" },
    { title: "Memory Game", description: "Test your memory by matching pairs of cards. Race against the clock to set a high score.", image: "/memorygame.png", icon: LayoutGrid, href: "/games/memory", color: "violet" },
    { title: "Pacman", description: "Navigate the maze, eat dots, and avoid ghosts in this retro arcade classic.", image: "/pacman_img.webp", icon: Ghost, href: "/games/pacman", color: "yellow", imagePosition: "center 20%" },
    { title: "Snake Arena", description: "Grow your snake by eating XP chips. Survive as long as possible and top the leaderboard.", image: "/snake.webp", icon: Activity, href: "/games/snake", color: "emerald" },
    { title: "Star Siege", description: "Blast through enemy waves in this space shooter. Auto-fire cannons, missile volleys, survive!", image: "/starsiege.webp", icon: Rocket, href: "/games/space-shooter", color: "orange" },
    { title: "Connect The Dots", description: "Connect all the dots with the fewest moves. A strategic puzzle that challenges your planning.", image: "/connect-dots.webp", icon: Waypoints, href: "/games/connect-dots", color: "lime" },
    { title: "Block Breaker", description: "Smash through bricks with your paddle. Survive 10 levels of increasingly brutal layouts.", image: "/block-breaker.webp", icon: Boxes, href: "/games/block-breaker", color: "red" },
  ];

  const gameTypes = [
    { id: "WORD_SEARCH", label: "Word Search", icon: Search },
    { id: "TIC_TAC_TOE", label: "Tic Tac Toe", icon: Hash },
    { id: "MEMORY", label: "Memory", icon: LayoutGrid },
    { id: "PACMAN", label: "Pacman", icon: Ghost },
    { id: "SNAKE", label: "Snake", icon: Activity },
    { id: "SPACE_SHOOTER", label: "Star Siege", icon: Rocket },
    { id: "CONNECT_DOTS", label: "Connect The Dots", icon: Waypoints },
    { id: "BLOCK_BREAKER", label: "Block Breaker", icon: Boxes },
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
        if (json.success) {
          const isScoreBased = activeGame === "PACMAN" || activeGame === "SPACE_SHOOTER";
          const normalised = (json.data as any[]).slice(0, 8).map((r: any) => ({
            user: r.user,
            totalXp: isScoreBased ? (r.highScore ?? 0) : (r.totalXp ?? 0),
            matches: r.matches ?? 0,
            highScore: r.highScore ?? 0,
            level: r.level ?? 1,
            wave: r.wave ?? r.waves ?? r.bestWave ?? null,
            kills: r.kills ?? null,
            blocksDestroyed: r.blocksDestroyed ?? null,
          }));
          setLeaderboardData(normalised);
        }
      } catch (e) { console.error(e); }
      finally { setLbLoading(false); }
    };
    fetchLb();
  }, [activeGame]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-foreground relative selection:bg-primary/30">
      <Navbar onGamesClick={() => scrollTo("featured-games")} onLeaderboardClick={() => scrollTo("leaderboard")} />

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-20 overflow-hidden min-h-[95vh] flex items-center grid-bg">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center relative z-10 w-full">


          <motion.h1 variants={itemVariants} initial="hidden" animate="visible"
            className="text-[12vw] md:text-[8rem] lg:text-[10rem] font-black neon-text mb-8 tracking-tight leading-[0.85] uppercase italic"
          >
            ENTER THE<br />ARENA
          </motion.h1>

          <motion.p variants={itemVariants} initial="hidden" animate="visible"
            className="max-w-2xl text-lg md:text-xl text-muted-foreground/80 mb-16 font-medium tracking-wide leading-relaxed"
          >
            Skill-based Web3 gaming. Compete on-chain, earn XP,
            own your rank — and get rewarded for every win.
          </motion.p>

          {/* ── XP VALUE TEASER PILL ── */}
          <motion.div variants={itemVariants} initial="hidden" animate="visible"
            style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 40, padding: "8px 18px", marginBottom: 28, backdropFilter: "blur(12px)" }}
          >
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#6366f1", boxShadow: "0 0 10px rgba(99,102,241,0.8)", animation: "xpPulse 2s ease-in-out infinite" }} />
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 700, color: "#a5b4fc", letterSpacing: "0.2em", textTransform: "uppercase" }}>Play-to-earn · Multi-chain rewards · Own your XP</span>
          </motion.div>

          <style>{`@keyframes xpPulse { 0%,100%{opacity:1;box-shadow:0 0 10px rgba(99,102,241,0.8)} 50%{opacity:0.6;box-shadow:0 0 18px rgba(99,102,241,1)} }`}</style>

          <motion.div variants={itemVariants} initial="hidden" animate="visible"
            className="flex flex-col sm:flex-row gap-6 mb-32 items-center justify-center w-full"
            style={{ marginTop: 8 }}
          >
            {isAuthenticated ? (
              <motion.button
                onClick={() => scrollTo("featured-games")}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  position: "relative", overflow: "hidden",
                  padding: "18px 44px",
                  background: "linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)",
                  borderRadius: 16, border: "none",
                  fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 900,
                  color: "#fff", letterSpacing: "0.18em", textTransform: "uppercase",
                  cursor: "pointer",
                  boxShadow: "0 0 40px rgba(99,102,241,0.5), 0 0 80px rgba(34,211,238,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
                  display: "flex", alignItems: "center", gap: 12,
                  transition: "box-shadow 0.3s",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 0 60px rgba(99,102,241,0.7), 0 0 100px rgba(34,211,238,0.35), inset 0 1px 0 rgba(255,255,255,0.2)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px rgba(99,102,241,0.5), 0 0 80px rgba(34,211,238,0.2), inset 0 1px 0 rgba(255,255,255,0.2)"}
              >
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)", pointerEvents: "none" }} />
                PLAY NOW
                <Zap style={{ width: 20, height: 20, fill: "white", filter: "drop-shadow(0 0 6px rgba(255,255,255,0.8))" }} />
              </motion.button>
            ) : (
              <motion.button
                onClick={() => openAuthModal("register")}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  position: "relative", overflow: "hidden",
                  padding: "18px 44px",
                  background: "linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)",
                  borderRadius: 16, border: "none",
                  fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 900,
                  color: "#fff", letterSpacing: "0.18em", textTransform: "uppercase",
                  cursor: "pointer",
                  boxShadow: "0 0 40px rgba(99,102,241,0.5), 0 0 80px rgba(34,211,238,0.2), inset 0 1px 0 rgba(255,255,255,0.2)",
                  display: "flex", alignItems: "center", gap: 12,
                  transition: "box-shadow 0.3s",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 0 60px rgba(99,102,241,0.7), 0 0 100px rgba(34,211,238,0.35), inset 0 1px 0 rgba(255,255,255,0.2)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px rgba(99,102,241,0.5), 0 0 80px rgba(34,211,238,0.2), inset 0 1px 0 rgba(255,255,255,0.2)"}
              >
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)", pointerEvents: "none" }} />
                PLAY NOW
                <Zap style={{ width: 20, height: 20, fill: "white", filter: "drop-shadow(0 0 6px rgba(255,255,255,0.8))" }} />
              </motion.button>
            )}
            <motion.button
              onClick={() => scrollTo("leaderboard")}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              style={{
                position: "relative", overflow: "hidden",
                padding: "18px 44px",
                background: "rgba(15,23,42,0.6)",
                borderRadius: 16,
                border: "1px solid rgba(245,158,11,0.45)",
                fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 900,
                color: "#f59e0b", letterSpacing: "0.18em", textTransform: "uppercase",
                cursor: "pointer",
                backdropFilter: "blur(16px)",
                boxShadow: "0 0 24px rgba(245,158,11,0.2), inset 0 1px 0 rgba(245,158,11,0.1)",
                display: "flex", alignItems: "center", gap: 12,
                transition: "box-shadow 0.3s, border-color 0.3s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px rgba(245,158,11,0.4), inset 0 1px 0 rgba(245,158,11,0.15)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(245,158,11,0.7)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(245,158,11,0.2), inset 0 1px 0 rgba(245,158,11,0.1)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(245,158,11,0.45)";
              }}
            >
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(245,158,11,0.08) 0%, transparent 60%)", pointerEvents: "none" }} />
              VIEW RANKINGS
              <Trophy style={{ width: 20, height: 20, filter: "drop-shadow(0 0 6px rgba(245,158,11,0.8))" }} />
            </motion.button>
          </motion.div>

          {/* ── FEATURED GAMES ── */}
          <div className="w-full" id="featured-games">
            <div className="flex items-center justify-between mb-12">
              <h2 className="font-heading text-2xl md:text-3xl font-black tracking-wider flex items-center gap-4">
                <span className="w-12 h-0.5 bg-secondary"></span>
                FEATURED GAMES
              </h2>

            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" style={{ alignItems: "stretch" }}>
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
      <section id="leaderboard" style={{ padding: "80px 24px", background: "rgba(8,12,28,0.9)", borderTop: "1px solid rgba(34,211,238,0.08)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -100, left: "20%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.08) 0%,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -80, right: "10%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle,rgba(34,211,238,0.06) 0%,transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>

          {/* ── header ── */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 32 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 2, background: `linear-gradient(90deg,${C.cyan},${C.indigo})`, borderRadius: 1 }} />
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: C.cyan, letterSpacing: "0.4em", textTransform: "uppercase" }}>Global Rankings</span>
              </div>
              <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(22px,4vw,34px)", fontWeight: 900, color: C.text, textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 14 }}>
                <Trophy style={{ width: 28, height: 28, color: "#f59e0b", filter: "drop-shadow(0 0 10px rgba(245,158,11,0.5))" }} />
                LEADERBOARD
              </h2>
              <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: C.muted, fontWeight: 500, marginTop: 6 }}>
                Ranked by total XP earned across all difficulty modes.
              </p>
            </div>
            <Link href={isAuthenticated ? "/dashboard/leaderboard" : "#"}
              onClick={!isAuthenticated ? (e) => { e.preventDefault(); openAuthModal("login"); } : undefined}
              style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 700, color: C.cyan, textDecoration: "none", letterSpacing: "0.2em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6, border: "1px solid rgba(34,211,238,0.3)", padding: "8px 18px", borderRadius: 20, transition: "all 0.2s" }}
            >
              FULL RANKINGS <ChevronRight style={{ width: 14, height: 14 }} />
            </Link>
          </div>

          {/* ── game tabs ── */}
          <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
            {gameTypes.map((g) => {
              const Icon = g.icon;
              const isActive = activeGame === g.id;
              return (
                <motion.button key={g.id} onClick={() => setActiveGame(g.id)}
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 40, background: isActive ? "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(34,211,238,0.15))" : "rgba(15,23,42,0.6)", border: isActive ? "1px solid rgba(34,211,238,0.4)" : "1px solid rgba(255,255,255,0.06)", color: isActive ? C.cyan : C.muted, fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", boxShadow: isActive ? "0 0 16px rgba(34,211,238,0.15)" : "none", transition: "all 0.2s" }}>
                  <Icon style={{ width: 14, height: 14 }} />{g.label}
                </motion.button>
              );
            })}
          </div>

          {/* ── table card ── */}
          <div style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(34,211,238,0.12)", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.4)", overflow: "hidden" }}>

            {/* card header */}
            <div style={{ padding: "14px 22px", borderBottom: "1px solid rgba(34,211,238,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.cyan, boxShadow: `0 0 8px ${C.cyan}` }} />
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.25em", textTransform: "uppercase" }}>
                  {gameTypes.find(t => t.id === activeGame)?.label}{" "}
                  {activeGame === "BLOCK_BREAKER" ? "· Total Score" : (activeGame === "PACMAN" || activeGame === "SPACE_SHOOTER") ? "· High Score" : "· Total XP"}
                </span>
              </div>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#64748b", letterSpacing: "0.18em" }}>
                {leaderboardData.length} PLAYERS
              </span>
            </div>

            {lbLoading ? (
              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{ height: 52, borderRadius: 12, background: "rgba(255,255,255,0.03)", animation: "lbSkel 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            ) : (
              <div style={{ padding: 8 }}>
                <LeaderboardTable
                  entries={leaderboardData}
                  scoreMode={activeGame === "BLOCK_BREAKER" || activeGame === "PACMAN" || activeGame === "SPACE_SHOOTER"}
                  scoreModeLabel={activeGame === "PACMAN" || activeGame === "SPACE_SHOOTER" ? "High Score" : "Total Score"}
                  hideLevel={activeGame === "PACMAN" || activeGame === "SPACE_SHOOTER"}
                  showWaves={activeGame === "SPACE_SHOOTER"}
                  showBlocks={activeGame === "BLOCK_BREAKER"}
                  matchesLabel="Matches"
                />
              </div>
            )}
          </div>
        </div>
        <style>{`@keyframes lbSkel { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "100px 24px", background: "#0a0f1e", borderTop: "1px solid rgba(99,102,241,0.08)", position: "relative", overflow: "hidden" }}>

        {/* bg glows */}
        <div style={{ position: "absolute", top: -80, left: "15%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.07) 0%,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, right: "10%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle,rgba(34,211,238,0.05) 0%,transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>

          {/* section label */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, justifyContent: "center" }}>
            <div style={{ width: 28, height: 2, background: "linear-gradient(90deg,#6366f1,#22d3ee)", borderRadius: 1 }} />
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#22d3ee", letterSpacing: "0.4em", textTransform: "uppercase" }}>The Arena Economy</span>
            <div style={{ width: 28, height: 2, background: "linear-gradient(90deg,#22d3ee,#6366f1)", borderRadius: 1 }} />
          </div>

          <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(22px,4vw,36px)", fontWeight: 900, color: "#f8fafc", textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", textAlign: "center", marginBottom: 12 }}>
            PLAY. DOMINATE. <span style={{ color: "#22d3ee", textShadow: "0 0 30px rgba(34,211,238,0.4)" }}>GET PAID.</span>
          </h2>
          <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 15, color: "#64748b", fontWeight: 500, textAlign: "center", maxWidth: 520, margin: "0 auto 60px", lineHeight: 1.6 }}>
            Every match you play earns XP. Every point of XP holds real value.
            Skill is the only currency that matters here.
          </p>

          {/* 3-step cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, position: "relative" }} className="hiw-grid">

            {/* connector line (desktop only) */}
            <div className="hiw-connector" style={{ position: "absolute", top: 52, left: "calc(33% + 20px)", right: "calc(33% + 20px)", height: 1, background: "linear-gradient(90deg,rgba(99,102,241,0.4),rgba(34,211,238,0.4))", zIndex: 0, pointerEvents: "none" }} />

            {[
              {
                step: "01",
                icon: <Zap style={{ width: 24, height: 24, color: "#6366f1", fill: "#6366f1", filter: "drop-shadow(0 0 8px rgba(99,102,241,0.8))" }} />,
                color: "#6366f1",
                title: "Compete & Earn XP",
                desc: "Battle across 8 unique game arenas. Every win, every challenge cleared, every leaderboard climb rewards you with XP — your proof of skill.",
              },
              {
                step: "02",
                icon: <Trophy style={{ width: 24, height: 24, color: "#f59e0b", filter: "drop-shadow(0 0 8px rgba(245,158,11,0.8))" }} />,
                color: "#f59e0b",
                title: "Build Your Rank",
                desc: "Stack XP to climb from Rookie to Legend. Your rank reflects your true skill rating — tracked globally, updated in real time.",
              },
              {
                step: "03",
                icon: <Wallet style={{ width: 24, height: 24, color: "#22d3ee", filter: "drop-shadow(0 0 8px rgba(34,211,238,0.8))" }} />,
                color: "#22d3ee",
                title: "Convert XP to Crypto",
                desc: "Soon, the XP you grind today will be convertible to real value across any blockchain network. Stack it now. Claim it later.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, type: "spring", damping: 22, stiffness: 160 }}
                whileHover={{ scale: 1.03, y: -4 }}
                style={{ position: "relative", zIndex: 1, background: "rgba(15,23,42,0.8)", border: `1px solid ${item.color}25`, borderRadius: 20, padding: "32px 28px", backdropFilter: "blur(16px)", boxShadow: `0 4px 30px rgba(0,0,0,0.35), inset 0 1px 0 ${item.color}15`, transition: "box-shadow 0.3s", cursor: "default" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 40px rgba(0,0,0,0.4), 0 0 30px ${item.color}18, inset 0 1px 0 ${item.color}20`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 30px rgba(0,0,0,0.35), inset 0 1px 0 ${item.color}15`; }}
              >
                {/* top glow line */}
                <div style={{ position: "absolute", top: 0, left: 20, right: 20, height: 1, background: `linear-gradient(90deg,transparent,${item.color}50,transparent)`, borderRadius: 1 }} />

                {/* step number */}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${item.color}15`, border: `1px solid ${item.color}40`, borderRadius: 20, padding: "4px 12px", marginBottom: 16 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 800, color: item.color, letterSpacing: "0.3em", textTransform: "uppercase", filter: `drop-shadow(0 0 4px ${item.color}80)` }}>STEP {item.step}</span>
                </div>

                {/* icon */}
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${item.color}12`, border: `1px solid ${item.color}30`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                  {item.icon}
                </div>

                <h3 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10, lineHeight: 1.3 }}>{item.title}</h3>
                <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 14, color: "#64748b", lineHeight: 1.65, fontWeight: 500, margin: 0 }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* bottom note */}
          <div style={{ marginTop: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.15)", borderRadius: 40, padding: "9px 20px" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d3ee", boxShadow: "0 0 8px rgba(34,211,238,0.9)" }} />
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.2em", textTransform: "uppercase" }}>XP earned today stays in your wallet forever</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 40, padding: "9px 20px" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366f1", boxShadow: "0 0 8px rgba(99,102,241,0.9)" }} />
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.2em", textTransform: "uppercase" }}>Multi-chain withdrawal support</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 40, padding: "9px 20px" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 8px rgba(245,158,11,0.9)" }} />
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.2em", textTransform: "uppercase" }}>No entry fees — free to compete</span>
            </div>
          </div>
        </div>

        <style>{`
          .hiw-grid { grid-template-columns: repeat(3,1fr); }
          .hiw-connector { display: block; }
          @media(max-width:768px){
            .hiw-grid { grid-template-columns: 1fr !important; }
            .hiw-connector { display: none !important; }
          }
        `}</style>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-16 bg-[#0F172A] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">

          {/* tagline */}
          <div style={{ textAlign: "center", marginBottom: 48, position: "relative" }}>

            {/* glow orb behind text */}
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 400, height: 120, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(99,102,241,0.08) 0%,transparent 70%)", pointerEvents: "none" }} />

            {/* eyebrow */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 24, height: 1, background: "linear-gradient(90deg,transparent,#6366f1)", borderRadius: 1 }} />
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 800, color: "#6366f1", letterSpacing: "0.45em", textTransform: "uppercase", filter: "drop-shadow(0 0 6px rgba(99,102,241,0.7))" }}>The Arena Is Just Getting Started</span>
              <div style={{ width: 24, height: 1, background: "linear-gradient(90deg,#6366f1,transparent)", borderRadius: 1 }} />
            </div>

            {/* main line */}
            <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(14px,2vw,20px)", fontWeight: 900, color: "#f8fafc", letterSpacing: "0.02em", textTransform: "uppercase", fontStyle: "italic", margin: "0 0 12px", lineHeight: 1.3 }}>
              Compete now.
              <span style={{ color: "#22d3ee", textShadow: "0 0 20px rgba(34,211,238,0.5)", margin: "0 10px" }}>Build your rank.</span>
              Get rewarded.
            </p>

            {/* sub line */}
            <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 14, fontWeight: 500, color: "#475569", maxWidth: 380, margin: "0 auto", lineHeight: 1.6, letterSpacing: "0.03em" }}>
              The XP rewards system is coming — every point you earn today will be ready to claim.
            </p>
          </div>

          <div className="border-t border-white/5 pt-10 text-center text-muted-foreground/40 text-sm flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="font-bold tracking-tight">© 2026 Gaming Arena. Built for those who compete.</p>
            <div className="flex gap-10 font-black uppercase tracking-widest text-[10px]">
              <Link href="#" className="hover:text-secondary transition-colors">Twitter</Link>
              <Link href="#" className="hover:text-secondary transition-colors">Discord</Link>
              <Link href="#" className="hover:text-secondary transition-colors">Instagram</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}