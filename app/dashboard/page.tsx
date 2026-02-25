"use client";

import React from "react";
import { useAuthStore } from "@/store/auth-store";
import { Gamepad2, Timer, Star, User, Ghost, Brain, Search, Info, X, Zap, Layers } from "lucide-react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { useEffect, useState } from "react";
import { UserLevelData } from "@/types";
import { XpBadge } from "@/components/game/XpBadge";

const C = {
  cyan: "#22d3ee", indigo: "#6366f1", dark: "rgba(15,23,42,0.75)",
  border: "rgba(34,211,238,0.12)", text: "#f8fafc", muted: "#64748b", slate: "#475569",
};
const card = {
  background: C.dark, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
  border: `1px solid ${C.border}`, borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
};
const fadeUp: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", damping: 22, stiffness: 180 } } };
const container: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };

const DIFF_COLOR: Record<string, string> = { EASY: "#10b981", MEDIUM: "#f59e0b", HARD: "#ef4444" };
const RESULT_CONFIG: Record<string, { color: string; label: string }> = {
  WIN:  { color: "#10b981", label: "WIN"  },
  LOSE: { color: "#ef4444", label: "LOSE" },
  DRAW: { color: "#f59e0b", label: "DRAW" },
};

function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

/** Skill level label based on % rating */
function ratingMeta(r: number): { label: string; color: string } {
  if (r >= 85) return { label: "PRO",      color: "#fbbf24" };
  if (r >= 65) return { label: "GREAT",    color: "#a855f7" };
  if (r >= 45) return { label: "GOOD",     color: "#22d3ee" };
  if (r >= 25) return { label: "AVERAGE",  color: "#10b981" };
  if (r >= 1)  return { label: "BEGINNER", color: "#94a3b8" };
  return              { label: "UNRATED",  color: "#475569" };
}

interface Stats {
  totalGames:    number;
  totalSeconds:  number;
  playTimeLabel: string;
  rating:        number;
  totalXp:       number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const [stats,   setStats]   = useState<Stats>({ totalGames: 0, totalSeconds: 0, playTimeLabel: "0m", rating: 0, totalXp: 0 });
  const [tttHist,   setTttHist]   = useState<any[]>([]);
  const [wsHist,    setWsHist]    = useState<any[]>([]);
  const [memHist,   setMemHist]   = useState<any[]>([]);
  const [pacHist,   setPacHist]   = useState<any[]>([]);
  const [snakeHist, setSnakeHist] = useState<any[]>([]);
  const [ssHist,    setSsHist]    = useState<any[]>([]);
  const [cdHist,    setCdHist]    = useState<any[]>([]);
  const [level,   setLevel]   = useState<UserLevelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [statsRes, levelRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/user/level"),
        ]);
        const statsJson = await statsRes.json();
        const levelJson = await levelRes.json();
        if (statsJson.success) {
          setStats(statsJson.stats);
          setTttHist(  statsJson.recentGames?.ticTacToe  ?? []);
          setWsHist(   statsJson.recentGames?.wordSearch  ?? []);
          setMemHist(  statsJson.recentGames?.memory      ?? []);
          setPacHist(  statsJson.recentGames?.pacman      ?? []);
          setSnakeHist(statsJson.recentGames?.snake        ?? []);
          setSsHist(   statsJson.recentGames?.spaceShooter  ?? []);
          setCdHist(   statsJson.recentGames?.connectDots   ?? []);
        }
        if (levelJson.success) setLevel(levelJson.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const rankColor = level ? ({
    ROOKIE:  "#94a3b8",
    VETERAN: "#13b6ec",
    ELITE:   "#ff00ff",
    LEGEND:  "#fbbf24",
  } as Record<string, string>)[level.rank] ?? C.cyan : C.cyan;

  const { label: ratingLabel, color: ratingColor } = ratingMeta(stats.rating);
  const [showRatingInfo, setShowRatingInfo] = useState(false);

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ width: "100%" }}>

      {/* ── HEADER ── */}
      <motion.header variants={fadeUp} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(18px,4vw,30px)", fontWeight: 900, color: C.text, textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", marginBottom: 6 }}>
            OPERATIONS HUB
          </h1>
          <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.3em", textTransform: "uppercase" }}>
            Sector 7-G · User Performance Protocol
          </p>
        </div>
        <XpBadge variant="compact" />
      </motion.header>

      {/* ── RATING INFO MODAL ── */}
      {showRatingInfo && (
        <div onClick={() => setShowRatingInfo(false)} style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0f172a", border: "1px solid rgba(34,211,238,0.2)", borderRadius: 20, padding: 28, maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", position: "relative" }}>
            {/* Close */}
            <button onClick={() => setShowRatingInfo(false)} style={{ position: "absolute", top: 14, right: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}>
              <X style={{ width: 14, height: 14 }} />
            </button>

            {/* Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Star style={{ width: 16, height: 16, color: "#22d3ee" }} />
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: "#f8fafc", letterSpacing: "0.05em" }}>HOW RATING WORKS</span>
            </div>
            <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: "#64748b", marginBottom: 20, lineHeight: 1.5 }}>
              Your rating (0–100%) measures <strong style={{ color: "#94a3b8" }}>skill</strong>, not time played. Each game you play contributes one pillar score. Only games you've actually played count.
            </p>

            {/* Pillars */}
            {[
              { game: "Tic-Tac-Toe", color: "#22d3ee", icon: "✕", desc: "Win quality matters. Hard wins score 3×, Medium 2×, Easy 1×. Draws give partial credit. Losses give 0." },
              { game: "Word Search", color: "#a78bfa", icon: "⌕", desc: "Completion × difficulty. Hard complete = full credit. Medium = 60%, Easy = 30%. Partial words count half." },
              { game: "Memory",      color: "#ec4899", icon: "◈", desc: "Flip efficiency. Perfect game = every pair found in exactly 2 flips. Every extra wasted flip reduces your score." },
              { game: "Pac-Man",     color: "#f59e0b", icon: "◉", desc: "Average score vs benchmark. Consistently scoring 5,000+ = full credit for this pillar." },
            ].map(p => (
              <div key={p.game} style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 10, background: `${p.color}08`, border: `1px solid ${p.color}20` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <span style={{ color: p.color, fontSize: 13, fontWeight: 900 }}>{p.icon}</span>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 700, color: p.color, letterSpacing: "0.08em" }}>{p.game}</span>
                  <span style={{ marginLeft: "auto", fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#475569" }}>0 – 25 PTS</span>
                </div>
                <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.5 }}>{p.desc}</p>
              </div>
            ))}

            {/* Skill levels */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16, marginTop: 4 }}>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: "#334155", letterSpacing: "0.2em" }}>SKILL LEVELS</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
                {[
                  { label: "BEGINNER", range: "1–24%",  color: "#94a3b8" },
                  { label: "AVERAGE",  range: "25–44%", color: "#10b981" },
                  { label: "GOOD",     range: "45–64%", color: "#22d3ee" },
                  { label: "GREAT",    range: "65–84%", color: "#a855f7" },
                  { label: "PRO",      range: "85–100%",color: "#fbbf24" },
                  { label: "UNRATED",  range: "0%",     color: "#475569" },
                ].map(l => (
                  <div key={l.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: l.color }}>{l.label}</span>
                    <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#334155" }}>{l.range}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STATS GRID ── */}
      <motion.section variants={fadeUp} className="dash-stats" style={{ display: "grid", gap: 14, marginBottom: 20 }}>

        {/* Profile card */}
        <div className="profile-card" style={{ ...card, padding: 22, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative", overflow: "hidden", borderColor: `${rankColor}30`, minHeight: 160 }}>
          <div style={{ position: "absolute", top: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: `radial-gradient(circle,${rankColor}15 0%,transparent 70%)`, pointerEvents: "none" }} />
          <div className="profile-avatar" style={{ position: "relative", marginBottom: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", border: `2px solid ${rankColor}60`, padding: 3, boxShadow: `0 0 20px ${rankColor}30` }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "rgba(15,23,42,0.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {user?.username
                  ? <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 22, fontWeight: 900, color: rankColor }}>{user.username[0].toUpperCase()}</span>
                  : <User style={{ width: 24, height: 24, color: C.slate }} />}
              </div>
            </div>
            {level && (
              <div style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", background: rankColor, color: "#020617", padding: "2px 7px", borderRadius: 5, fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 900, letterSpacing: "0.12em", whiteSpace: "nowrap", boxShadow: `0 0 10px ${rankColor}80` }}>
                {level.rank}
              </div>
            )}
          </div>
          <div className="profile-info" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, color: C.text, textTransform: "uppercase", marginBottom: 2, marginTop: 4 }}>{user?.username}</h2>
            {level && (
              <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: rankColor, letterSpacing: "0.1em", margin: 0 }}>
                {level.xp.toLocaleString()} XP
              </p>
            )}
          </div>
        </div>

        {/* ── Total Games card ── */}
        <motion.div whileHover={{ scale: 1.02 }} style={{ ...card, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden", minHeight: 140 }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 110, height: 110, borderRadius: "50%", background: `radial-gradient(circle,${C.indigo}18 0%,transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.12em", textTransform: "uppercase" }}>Total Games</span>
            <Gamepad2 style={{ width: 18, height: 18, color: C.indigo, filter: `drop-shadow(0 0 6px ${C.indigo}90)`, flexShrink: 0 }} />
          </div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(22px,3vw,36px)", fontWeight: 900, color: C.text, lineHeight: 1, marginTop: 10 }}>
            {loading ? <span style={{ color: "#1e293b" }}>—</span> : stats.totalGames}
          </div>
        </motion.div>

        {/* ── Play Time card ── */}
        <motion.div whileHover={{ scale: 1.02 }} style={{ ...card, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden", minHeight: 140 }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 110, height: 110, borderRadius: "50%", background: "radial-gradient(circle,#10b98118 0%,transparent 70%)", pointerEvents: "none" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.12em", textTransform: "uppercase" }}>Play Time</span>
            <Timer style={{ width: 18, height: 18, color: "#10b981", filter: "drop-shadow(0 0 6px #10b98190)", flexShrink: 0 }} />
          </div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(22px,3vw,36px)", fontWeight: 900, color: C.text, lineHeight: 1, marginTop: 10 }}>
            {loading ? <span style={{ color: "#1e293b" }}>—</span> : stats.playTimeLabel}
          </div>
        </motion.div>

        {/* ── Player Rating card (custom — has ℹ button) ── */}
        <motion.div whileHover={{ scale: 1.02 }} style={{ ...card, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden", minHeight: 140 }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 110, height: 110, borderRadius: "50%", background: `radial-gradient(circle,${ratingColor}18 0%,transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.12em", textTransform: "uppercase" }}>Player Rating</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* ℹ button */}
              <button
                onClick={() => setShowRatingInfo(true)}
                title="How is rating calculated?"
                style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(34,211,238,0.18)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(34,211,238,0.08)"; }}
              >
                <Info style={{ width: 11, height: 11, color: C.cyan }} />
              </button>
              <Star style={{ width: 16, height: 16, color: ratingColor, filter: `drop-shadow(0 0 5px ${ratingColor}80)`, flexShrink: 0 }} />
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(22px,3vw,36px)", fontWeight: 900, color: C.text, lineHeight: 1, marginTop: 10 }}>
              {loading ? <span style={{ color: "#1e293b" }}>—</span> : `${stats.rating}%`}
            </div>
            {!loading && stats.rating > 0 && (
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: ratingColor, letterSpacing: "0.15em", marginTop: 4, filter: `drop-shadow(0 0 6px ${ratingColor}60)` }}>
                {ratingLabel}
              </div>
            )}
          </div>
          <div style={{ marginTop: 10, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${stats.rating}%` }} transition={{ duration: 1, delay: 0.3 }}
              style={{ height: "100%", background: `linear-gradient(90deg,${ratingColor},${C.indigo})`, borderRadius: 2 }} />
          </div>
        </motion.div>
      </motion.section>

      {/* ── RECENT GAMES 2×2 GRID ── */}
      <motion.div variants={fadeUp} className="dash-bottom" style={{ display: "grid", gap: 20 }}>

        {/* ── TIC-TAC-TOE ── */}
        <div style={{ ...card, overflow: "hidden" }}>
          <GameCardHeader title="TIC-TAC-TOE" icon={<span style={{ color: C.cyan, fontSize: 15 }}>✕</span>} href="/games/tic-tac-toe" />
          {loading ? <SkeletonRows /> : tttHist.length === 0 ? <EmptyState /> : (
            <div>
              <GridHeader cols="90px 1fr 70px 65px 65px" labels={["RESULT","DIFF","SCORE","XP","TIME"]} />
              {tttHist.map((g, i) => {
                const rc = RESULT_CONFIG[g.result] ?? RESULT_CONFIG.LOSE;
                const last = i === tttHist.length - 1;
                return (
                  <React.Fragment key={g.id}>
                    <GameRow last={last} cols="90px 1fr 70px 65px 65px">
                      <Badge color={rc.color} label={rc.label} />
                      <DiffTag diff={g.difficulty} />
                      <ValueCell color={g.score > 0 ? "#f59e0b" : "#475569"}>{g.score > 0 ? `+${g.score}` : "—"}</ValueCell>
                      <ValueCell color="#10b981">+{g.xpEarned}</ValueCell>
                      <TimeCell>{fmt(g.duration)}</TimeCell>
                    </GameRow>
                    <MobileGameRow last={last} cells={[
                      { label: "Result", value: <Badge color={rc.color} label={rc.label} /> },
                      { label: "Diff",   value: <DiffTag diff={g.difficulty} /> },
                      { label: "Score",  value: <ValueCell color={g.score > 0 ? "#f59e0b" : "#475569"}>{g.score > 0 ? `+${g.score}` : "—"}</ValueCell> },
                      { label: "XP",     value: <ValueCell color="#10b981">+{g.xpEarned}</ValueCell> },
                    ]} />
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* ── WORD SEARCH ── */}
        <div style={{ ...card, overflow: "hidden" }}>
          <GameCardHeader title="WORD SEARCH" icon={<Search style={{ width: 15, height: 15, color: "#a78bfa" }} />} href="/games/word-search" />
          {loading ? <SkeletonRows /> : wsHist.length === 0 ? <EmptyState /> : (
            <div>
              <GridHeader cols="90px 1fr 65px 70px 65px" labels={["STATUS","DIFF","XP","WORDS","TIME"]} />
              {wsHist.map((g, i) => {
                const last = i === wsHist.length - 1;
                return (
                  <React.Fragment key={g.id}>
                    <GameRow last={last} cols="90px 1fr 65px 70px 65px">
                      <Badge color={g.completed ? "#10b981" : "#f59e0b"} label={g.completed ? "CLEAR" : "PART"} />
                      <DiffTag diff={g.difficulty} />
                      <ValueCell color="#10b981">+{g.xpEarned}</ValueCell>
                      <ValueCell color={C.cyan}>{g.wordsFound}/{g.totalWords}</ValueCell>
                      <TimeCell>{fmt(g.duration)}</TimeCell>
                    </GameRow>
                    <MobileGameRow last={last} cells={[
                      { label: "Status", value: <Badge color={g.completed ? "#10b981" : "#f59e0b"} label={g.completed ? "CLEAR" : "PART"} /> },
                      { label: "Diff",   value: <DiffTag diff={g.difficulty} /> },
                      { label: "XP",     value: <ValueCell color="#10b981">+{g.xpEarned}</ValueCell> },
                      { label: "Words",  value: <ValueCell color={C.cyan}>{g.wordsFound}/{g.totalWords}</ValueCell> },
                    ]} />
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* ── MEMORY ── */}
        <div style={{ ...card, overflow: "hidden" }}>
          <GameCardHeader title="MEMORY" icon={<Brain style={{ width: 15, height: 15, color: "#a78bfa" }} />} href="/games/memory" />
          {loading ? <SkeletonRows /> : memHist.length === 0 ? <EmptyState /> : (
            <div>
              <GridHeader cols="1fr 70px 65px 60px 65px" labels={["DIFF","SCORE","XP","MOVES","TIME"]} />
              {memHist.map((g, i) => {
                const last = i === memHist.length - 1;
                return (
                  <React.Fragment key={g.id}>
                    <GameRow last={last} cols="1fr 70px 65px 60px 65px">
                      <DiffTag diff={g.difficulty} />
                      <ValueCell color={g.score > 0 ? "#f59e0b" : "#475569"}>{g.score > 0 ? g.score.toLocaleString() : "—"}</ValueCell>
                      <ValueCell color="#10b981">+{g.xpEarned}</ValueCell>
                      <ValueCell color="#a78bfa">{g.moves}</ValueCell>
                      <TimeCell>{fmt(g.duration)}</TimeCell>
                    </GameRow>
                    <MobileGameRow last={last} cells={[
                      { label: "Diff",  value: <DiffTag diff={g.difficulty} /> },
                      { label: "Score", value: <ValueCell color={g.score > 0 ? "#f59e0b" : "#475569"}>{g.score > 0 ? g.score.toLocaleString() : "—"}</ValueCell> },
                      { label: "XP",    value: <ValueCell color="#10b981">+{g.xpEarned}</ValueCell> },
                      { label: "Moves", value: <ValueCell color="#a78bfa">{g.moves}</ValueCell> },
                    ]} />
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* ── PAC-MAN ── */}
        <div style={{ ...card, overflow: "hidden" }}>
          <GameCardHeader title="PAC-MAN" icon={<Ghost style={{ width: 15, height: 15, color: "#f59e0b" }} />} href="/games/pacman" />
          {loading ? <SkeletonRows /> : pacHist.length === 0 ? <EmptyState /> : (
            <div>
              <GridHeader cols="1fr 75px 65px 65px" labels={["SCORE","XP","STAGE","TIME"]} />
              {pacHist.map((g, i) => {
                const last = i === pacHist.length - 1;
                return (
                  <React.Fragment key={g.id}>
                    <GameRow last={last} cols="1fr 75px 65px 65px">
                      <ValueCell color="#f59e0b" size={13}>{g.score.toLocaleString()}</ValueCell>
                      <ValueCell color="#10b981">+{g.xpEarned}</ValueCell>
                      <ValueCell color={C.cyan}>LV {g.stage}</ValueCell>
                      <TimeCell>{fmt(g.duration)}</TimeCell>
                    </GameRow>
                    <MobileGameRow last={last} cells={[
                      { label: "Score", value: <ValueCell color="#f59e0b" size={13}>{g.score.toLocaleString()}</ValueCell> },
                      { label: "XP",    value: <ValueCell color="#10b981">+{g.xpEarned}</ValueCell> },
                      { label: "Stage", value: <ValueCell color={C.cyan}>LV {g.stage}</ValueCell> },
                      { label: "Time",  value: <TimeCell>{fmt(g.duration)}</TimeCell> },
                    ]} />
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* ── SPACE SHOOTER ── */}
        <div style={{ ...card, overflow: "hidden" }}>
          <GameCardHeader title="STAR SIEGE" icon={<span style={{ fontSize: 15 }}>🚀</span>} href="/games/space-shooter" />
          {loading ? <SkeletonRows /> : ssHist.length === 0 ? <EmptyState /> : (
            <div>
              <GridHeader cols="1fr 60px 70px 65px 65px" labels={["SCORE","WAVE","KILLS","XP","TIME"]} />
              {ssHist.map((g, i) => {
                const last = i === ssHist.length - 1;
                return (
                  <React.Fragment key={g.id}>
                    <GameRow last={last} cols="1fr 60px 70px 65px 65px">
                      <ValueCell color="#f59e0b" size={13}>{(g.score ?? 0).toLocaleString()}</ValueCell>
                      <ValueCell color="#22d3ee">{g.wave ?? 1}</ValueCell>
                      <ValueCell color="#ef4444">{g.kills ?? 0}</ValueCell>
                      <ValueCell color="#10b981">+{g.xpEarned ?? 0}</ValueCell>
                      <TimeCell>{fmt(g.survivalTime ?? 0)}</TimeCell>
                    </GameRow>
                    <MobileGameRow last={last} cells={[
                      { label: "Score", value: <ValueCell color="#f59e0b" size={13}>{(g.score ?? 0).toLocaleString()}</ValueCell> },
                      { label: "Wave",  value: <ValueCell color="#22d3ee">{g.wave ?? 1}</ValueCell> },
                      { label: "Kills", value: <ValueCell color="#ef4444">{g.kills ?? 0}</ValueCell> },
                      { label: "XP",    value: <ValueCell color="#10b981">+{g.xpEarned ?? 0}</ValueCell> },
                    ]} />
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* ── CONNECT THE DOTS ── */}
        <div style={{ ...card, overflow: "hidden" }}>
          <GameCardHeader title="CONNECT THE DOTS" icon={<Layers style={{ width: 15, height: 15, color: "#22d3ee" }} />} href="/games/connect-dots" />
          {loading ? <SkeletonRows /> : cdHist.length === 0 ? <EmptyState /> : (
            <div>
              <GridHeader cols="1fr 65px 65px 65px 65px" labels={["DIFF","PAIRS","MOVES","XP","TIME"]} />
              {cdHist.map((g, i) => {
                const last = i === cdHist.length - 1;
                return (
                  <React.Fragment key={g.id}>
                    <GameRow last={last} cols="1fr 65px 65px 65px 65px">
                      <DiffTag diff={g.difficulty} />
                      <ValueCell color="#22d3ee">{g.dotsCount ?? "—"}</ValueCell>
                      <ValueCell color="#a78bfa">{g.moves}</ValueCell>
                      <ValueCell color="#10b981">+{g.xpEarned}</ValueCell>
                      <TimeCell>{fmt(g.duration)}</TimeCell>
                    </GameRow>
                    <MobileGameRow last={last} cells={[
                      { label: "Diff",  value: <DiffTag diff={g.difficulty} /> },
                      { label: "Pairs", value: <ValueCell color="#22d3ee">{g.dotsCount ?? "—"}</ValueCell> },
                      { label: "Moves", value: <ValueCell color="#a78bfa">{g.moves}</ValueCell> },
                      { label: "XP",    value: <ValueCell color="#10b981">+{g.xpEarned}</ValueCell> },
                    ]} />
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* ── SNAKE ── */}
        <div style={{ ...card, overflow: "hidden" }}>
          <GameCardHeader title="SNAKE" icon={<span style={{ fontSize: 15 }}>🐍</span>} href="/games/snake" />
          {loading ? <SkeletonRows /> : snakeHist.length === 0 ? <EmptyState /> : (
            <div>
              <GridHeader cols="1fr 60px 70px 65px 65px" labels={["DIFF","CHIPS","SCORE","XP","TIME"]} />
              {snakeHist.map((g, i) => {
                const last = i === snakeHist.length - 1;
                return (
                  <React.Fragment key={g.id}>
                    <GameRow last={last} cols="1fr 60px 70px 65px 65px">
                      <DiffTag diff={g.difficulty} />
                      <ValueCell color="#22d3ee">{g.coresCollected ?? 0}</ValueCell>
                      <ValueCell color="#f59e0b" size={13}>{g.score.toLocaleString()}</ValueCell>
                      <ValueCell color="#10b981">+{g.xpEarned}</ValueCell>
                      <TimeCell>{fmt(g.survivalTime ?? 0)}</TimeCell>
                    </GameRow>
                    <MobileGameRow last={last} cells={[
                      { label: "Diff",  value: <DiffTag diff={g.difficulty} /> },
                      { label: "Chips", value: <ValueCell color="#22d3ee">{g.coresCollected ?? 0}</ValueCell> },
                      { label: "Score", value: <ValueCell color="#f59e0b" size={13}>{g.score.toLocaleString()}</ValueCell> },
                      { label: "XP",    value: <ValueCell color="#10b981">+{g.xpEarned}</ValueCell> },
                    ]} />
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

      </motion.div>

      <style>{`
        .dash-stats { grid-template-columns: repeat(4,1fr); }
        @media(max-width:1100px){ .dash-stats { grid-template-columns: repeat(3,1fr); } }
        @media(max-width:700px) { .dash-stats { grid-template-columns: repeat(2,1fr); } }
        @media(max-width:440px) {
          .dash-stats { grid-template-columns: repeat(2,1fr); }
          .profile-card { grid-column: 1 / -1; flex-direction: row !important; gap: 16px; padding: 16px 20px !important; min-height: unset !important; text-align: left !important; justify-content: flex-start !important; }
          .profile-card .profile-avatar { margin-bottom: 0 !important; }
          .profile-card .profile-info { align-items: flex-start !important; }
        }
        .dash-bottom { grid-template-columns: 1fr 1fr; }
        @media(max-width:900px){ .dash-bottom { grid-template-columns: 1fr; } }
        @keyframes dashPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }

        /* ── Desktop: normal table rows ── */
        .game-row-desktop { display: grid; align-items: center; }
        .game-row-mobile  { display: none; }
        .grid-header      { display: grid; }

        /* ── Mobile: card layout ── */
        @media(max-width:600px){
          .game-row-desktop { display: none !important; }
          .grid-header      { display: none !important; }
          .game-row-mobile  { display: grid !important; }
        }
      `}</style>
    </motion.div>
  );
}

/* ── Helper components ── */

function GameCardHeader({ title, icon, href }: { title: string; icon: React.ReactNode; href: string }) {
  return (
    <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h3 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, color: "#f8fafc", display: "flex", alignItems: "center", gap: 9, margin: 0 }}>
        {icon} {title}
      </h3>
      <Link href={href} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: "#22d3ee", textDecoration: "none", letterSpacing: "0.18em", fontWeight: 700, padding: "5px 12px", border: "1px solid rgba(34,211,238,0.25)", borderRadius: 20, transition: "all 0.2s" }}>PLAY →</Link>
    </div>
  );
}

function GameRow({ children, last, cols }: { children: React.ReactNode; last: boolean; cols: string }) {
  return (
    <div className="game-row-desktop" style={{ gridTemplateColumns: cols, gap: 8, padding: "13px 22px", borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "rgba(34,211,238,0.03)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}>
      {children}
    </div>
  );
}

/** Mobile-only card: renders each game row as a 2-column grid of labeled stat pills */
function MobileGameRow({ last, cells }: {
  last: boolean;
  cells: { label: string; value: React.ReactNode }[];
}) {
  return (
    <div className="game-row-mobile" style={{
    gridTemplateColumns: "1fr 1fr",
    gap: "8px 14px",
    padding: "13px 16px",
    borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.05)",
    background: "transparent",
    }}>
    {cells.map((c, i) => (
    <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 800, color: "#475569", letterSpacing: "0.18em", textTransform: "uppercase" }}>
    {c.label}
    </span>
    <div style={{ fontSize: 13 }}>{c.value}</div>
    </div>
    ))}
    </div>
  );
}

function DiffTag({ diff }: { diff: string }) {
  const color = DIFF_COLOR[diff] ?? "#64748b";
  return (
    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, color, fontWeight: 800, letterSpacing: "0.06em", filter: `drop-shadow(0 0 4px ${color}60)` }}>{diff}</span>
  );
}

function ValueCell({ children, color, size = 13 }: { children: React.ReactNode; color: string; size?: number }) {
  return (
    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: size, fontWeight: 900, color, filter: `drop-shadow(0 0 4px ${color}50)` }}>{children}</span>
  );
}

function TimeCell({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 14, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em" }}>{children}</span>
  );
}

function SkeletonRows() {
  return (
    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 9 }}>
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{ height: 42, borderRadius: 8, background: "rgba(255,255,255,0.03)", animation: "dashPulse 1.5s infinite", animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: "32px 20px", textAlign: "center", fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: "#334155", letterSpacing: "0.2em" }}>
      NO GAMES PLAYED YET
    </div>
  );
}

function GridHeader({ cols, labels }: { cols: string; labels: string[] }) {
  return (
    <div className="grid-header" style={{ display: "grid", gridTemplateColumns: cols, gap: 8, padding: "10px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}>
      {labels.map(h => (
        <span key={h} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 800, color: "#64748b", letterSpacing: "0.2em", textTransform: "uppercase" }}>{h}</span>
      ))}
    </div>
  );
}

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ padding: "4px 11px", borderRadius: 6, background: `${color}20`, border: `1px solid ${color}55`, display: "inline-flex", width: "fit-content", boxShadow: `0 0 8px ${color}20` }}>
      <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 800, color, letterSpacing: "0.08em", filter: `drop-shadow(0 0 3px ${color}60)` }}>{label}</span>
    </div>
  );
}
