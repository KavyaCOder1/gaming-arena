"use client";

import { useAuthStore } from "@/store/auth-store";
import { Trophy, Gamepad2, Timer, Flame, User } from "lucide-react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { useEffect, useState } from "react";
import { UserLevelData, TicTacToeRecord, WordSearchRecord } from "@/types";
import { XpBadge } from "@/components/game/XpBadge";

const C = { cyan: "#22d3ee", indigo: "#6366f1", dark: "rgba(15,23,42,0.75)", border: "rgba(34,211,238,0.12)", text: "#f8fafc", muted: "#64748b", slate: "#475569" };
const card = { background: C.dark, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: `1px solid ${C.border}`, borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
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

interface Stats { totalGames: number; highScore: number; playTime: number; winRate: number }

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats,   setStats]   = useState<Stats>({ totalGames: 0, highScore: 0, playTime: 0, winRate: 0 });
  const [tttHist, setTttHist] = useState<TicTacToeRecord[]>([]);
  const [wsHist,  setWsHist]  = useState<WordSearchRecord[]>([]);
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
          setTttHist(statsJson.recentGames?.ticTacToe ?? []);
          setWsHist(statsJson.recentGames?.wordSearch ?? []);
        }
        if (levelJson.success) setLevel(levelJson.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const rankColor = level ? {
    ROOKIE:  "#94a3b8",
    VETERAN: "#13b6ec",
    ELITE:   "#ff00ff",
    LEGEND:  "#fbbf24",
  }[level.rank] ?? "#94a3b8" : C.cyan;

  const statCards = [
    { label: "Total Games", value: stats.totalGames,     icon: Gamepad2, color: C.indigo,  bar: null },
    { label: "Play Time",   value: `${stats.playTime}m`, icon: Timer,    color: "#10b981", bar: null },
    { label: "Win Rate",    value: `${stats.winRate}%`,  icon: Flame,    color: "#f43f5e", bar: stats.winRate },
  ];

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

      {/* ── STATS GRID ── */}
      <motion.section variants={fadeUp} className="dash-stats" style={{ display: "grid", gap: 14, marginBottom: 20 }}>

        {/* Profile card with real rank */}
        <div style={{ ...card, padding: 22, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative", overflow: "hidden", borderColor: `${rankColor}30`, minHeight: 160 }}>
          <div style={{ position: "absolute", top: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: `radial-gradient(circle,${rankColor}15 0%,transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ position: "relative", marginBottom: 12 }}>
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
          <h2 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, color: C.text, textTransform: "uppercase", marginBottom: 2, marginTop: 4 }}>{user?.username}</h2>
          {level && (
            <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: rankColor, letterSpacing: "0.1em" }}>
              {level.xp.toLocaleString()} XP
            </p>
          )}
        </div>

        {/* stat cards */}
        {statCards.map((s, i) => (
          <motion.div key={i} whileHover={{ scale: 1.02 }}
            style={{ ...card, padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden", minHeight: 140 }}>
            <div style={{ position: "absolute", top: -30, right: -30, width: 110, height: 110, borderRadius: "50%", background: `radial-gradient(circle,${s.color}18 0%,transparent 70%)`, pointerEvents: "none" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: "0.22em", textTransform: "uppercase" }}>{s.label}</span>
              <s.icon style={{ width: 16, height: 16, color: s.color, filter: `drop-shadow(0 0 5px ${s.color}80)`, flexShrink: 0 }} />
            </div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(22px,3vw,36px)", fontWeight: 900, color: C.text, lineHeight: 1, marginTop: 10 }}>
              {loading ? <span style={{ color: "#1e293b" }}>—</span> : s.value}
            </div>
            {s.bar !== null && (
              <div style={{ marginTop: 10, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${s.bar}%` }} transition={{ duration: 1, delay: 0.3 }}
                  style={{ height: "100%", background: `linear-gradient(90deg,#f43f5e,${C.indigo})`, borderRadius: 2 }} />
              </div>
            )}
          </motion.div>
        ))}
      </motion.section>

      {/* ── RECENT GAMES ── */}
      <motion.div variants={fadeUp} className="dash-bottom" style={{ display: "grid", gap: 18 }}>

        {/* Tic-Tac-Toe history */}
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <h3 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>✕</span> TIC-TAC-TOE · RECENT
            </h3>
            <Link href="/games/tic-tac-toe" style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: C.cyan, textDecoration: "none", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700 }}>Play →</Link>
          </div>
          {loading ? (
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {[...Array(3)].map((_, i) => <div key={i} style={{ height: 40, borderRadius: 8, background: "rgba(255,255,255,0.03)", animation: "dashPulse 1.5s infinite" }} />)}
            </div>
          ) : tttHist.length === 0 ? (
            <div style={{ padding: "28px 20px", textAlign: "center", fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: "#334155", letterSpacing: "0.2em" }}>NO GAMES PLAYED YET</div>
          ) : (
            <div>
              {/* header row */}
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 70px 70px 60px", gap: 8, padding: "8px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {["RESULT","DIFFICULTY","SCORE","XP","TIME"].map(h => (
                  <span key={h} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#334155", letterSpacing: "0.22em", textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>
              {tttHist.slice(0, 5).map((g, i) => {
                const rc = RESULT_CONFIG[g.result] ?? RESULT_CONFIG.LOSE;
                return (
                  <div key={g.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr 70px 70px 60px", gap: 8, padding: "10px 20px", borderBottom: i < tttHist.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}>
                    <div style={{ padding: "2px 8px", borderRadius: 5, background: `${rc.color}15`, border: `1px solid ${rc.color}40`, display: "inline-flex", width: "fit-content" }}>
                      <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: rc.color, letterSpacing: "0.1em" }}>{rc.label}</span>
                    </div>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: DIFF_COLOR[g.difficulty] ?? C.muted, fontWeight: 700, letterSpacing: "0.1em" }}>{g.difficulty}</span>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 900, color: g.score > 0 ? "#f59e0b" : "#475569" }}>{g.score > 0 ? `+${g.score}` : "—"}</span>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: "#10b981", fontWeight: 700 }}>+{g.xpEarned}</span>
                    <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#64748b" }}>{fmt(g.duration)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Word Search history */}
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <h3 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>⌕</span> WORD SEARCH · RECENT
            </h3>
            <Link href="/games/word-search" style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: C.cyan, textDecoration: "none", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700 }}>Play →</Link>
          </div>
          {loading ? (
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {[...Array(3)].map((_, i) => <div key={i} style={{ height: 40, borderRadius: 8, background: "rgba(255,255,255,0.03)", animation: "dashPulse 1.5s infinite" }} />)}
            </div>
          ) : wsHist.length === 0 ? (
            <div style={{ padding: "28px 20px", textAlign: "center", fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: "#334155", letterSpacing: "0.2em" }}>NO GAMES PLAYED YET</div>
          ) : (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 60px 60px 70px 60px", gap: 8, padding: "8px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {["STATUS","DIFFICULTY","SCORE","XP","WORDS","TIME"].map(h => (
                  <span key={h} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#334155", letterSpacing: "0.22em", textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>
              {wsHist.slice(0, 5).map((g, i) => (
                <div key={g.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr 60px 60px 70px 60px", gap: 8, padding: "10px 20px", borderBottom: i < wsHist.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}>
                  <div style={{ padding: "2px 8px", borderRadius: 5, background: g.completed ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.12)", border: `1px solid ${g.completed ? "rgba(16,185,129,0.4)" : "rgba(245,158,11,0.3)"}`, display: "inline-flex", width: "fit-content" }}>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: g.completed ? "#10b981" : "#f59e0b", letterSpacing: "0.1em" }}>{g.completed ? "CLEARED" : "PARTIAL"}</span>
                  </div>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: DIFF_COLOR[g.difficulty] ?? C.muted, fontWeight: 700 }}>{g.difficulty}</span>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 900, color: "#f59e0b" }}>+{g.score}</span>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: "#10b981", fontWeight: 700 }}>+{g.xpEarned}</span>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: C.cyan, fontWeight: 700 }}>{g.wordsFound}/{g.totalWords}</span>
                  <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#64748b" }}>{fmt(g.duration)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <style>{`
        .dash-stats { grid-template-columns: repeat(4,1fr); }
        @media(max-width:1100px){ .dash-stats { grid-template-columns: repeat(3,1fr); } }
        @media(max-width:700px) { .dash-stats { grid-template-columns: repeat(2,1fr); } }
        @media(max-width:440px) { .dash-stats { grid-template-columns: 1fr; } }
        .dash-bottom { grid-template-columns: 1fr 1fr; }
        @media(max-width:900px){ .dash-bottom { grid-template-columns: 1fr; } }
        @keyframes dashPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
      `}</style>
    </motion.div>
  );
}
