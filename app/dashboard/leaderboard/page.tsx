"use client";

import { useState, useEffect } from "react";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { LeaderboardEntry } from "@/types";
import { Trophy, Crown, Zap, Ghost, Swords, Rocket } from "lucide-react";
import { motion } from "framer-motion";

const C = { cyan: "#22d3ee", indigo: "#6366f1", text: "#f8fafc", muted: "#64748b" };
const card = { background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(34,211,238,0.12)", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };

const GAME_TABS = [
  { id: "TIC_TAC_TOE", label: "Tic-Tac-Toe", icon: Crown  },
  { id: "WORD_SEARCH", label: "Word Search",  icon: Zap    },
  { id: "MEMORY",      label: "Memory",       icon: Trophy },
  { id: "PACMAN",      label: "Pac-Man",      icon: Ghost  },
  { id: "SNAKE",         label: "Snake",        icon: Swords  },
  { id: "SPACE_SHOOTER", label: "Star Siege",   icon: Rocket  },
];

export default function LeaderboardPage() {
  const [activeGame, setActiveGame] = useState("TIC_TAC_TOE");
  const [data,       setData]       = useState<LeaderboardEntry[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);

  useEffect(() => {
    setIsLoading(true);
    (async () => {
      try {
        const res  = await fetch(`/api/leaderboard?gameType=${activeGame}`);
        const json = await res.json();
        if (json.success) {
          // PACMAN and SPACE_SHOOTER return highScore — normalise to totalXp/matches
          const normalised = (json.data as any[]).map((r: any) => ({
            user:    r.user,
            totalXp: r.totalXp ?? r.highScore ?? 0,
            matches: r.matches ?? 0,
          })) as LeaderboardEntry[];
          setData(normalised);
        }
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    })();
  }, [activeGame]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ width: "100%" }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div style={{ width: 32, height: 2, background: `linear-gradient(90deg, ${C.cyan}, ${C.indigo})`, borderRadius: 1 }} />
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700, color: C.cyan, letterSpacing: "0.4em", textTransform: "uppercase" }}>Global Rankings</span>
        </div>
        <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(22px, 4vw, 34px)", fontWeight: 900, color: C.text, textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 14 }}>
          <Trophy style={{ width: 28, height: 28, color: "#f59e0b", filter: "drop-shadow(0 0 10px rgba(245,158,11,0.5))" }} />
          LEADERBOARD
        </h1>
        <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, color: C.muted, fontWeight: 500, marginTop: 6 }}>
          Ranked by total XP earned across all difficulty modes.
        </p>
      </div>

      {/* ── GAME SELECTOR ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
        {GAME_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeGame === tab.id;
          return (
            <motion.button key={tab.id} onClick={() => setActiveGame(tab.id)}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 40, background: isActive ? "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(34,211,238,0.15))" : "rgba(15,23,42,0.6)", border: isActive ? "1px solid rgba(34,211,238,0.4)" : "1px solid rgba(255,255,255,0.06)", color: isActive ? C.cyan : C.muted, fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", boxShadow: isActive ? "0 0 16px rgba(34,211,238,0.15)" : "none", transition: "all 0.2s" }}>
              <Icon style={{ width: 14, height: 14 }} />{tab.label}
            </motion.button>
          );
        })}
      </div>

      {/* ── TABLE ── */}
      <div style={{ ...card }}>
        <div style={{ padding: "14px 22px", borderBottom: "1px solid rgba(34,211,238,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.cyan, boxShadow: `0 0 8px ${C.cyan}` }} />
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700, color: C.muted, letterSpacing: "0.25em", textTransform: "uppercase" }}>
              {GAME_TABS.find(t => t.id === activeGame)?.label} {(activeGame === "PACMAN" || activeGame === "SPACE_SHOOTER") ? "· High Score" : "· All Modes"}
            </span>
          </div>
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: "#334155", letterSpacing: "0.18em" }}>
            {data.length} PLAYERS
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ height: 52, borderRadius: 12, background: "rgba(255,255,255,0.03)", animation: "lbSkel 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        ) : (
          <div style={{ padding: 8 }}>
            <LeaderboardTable entries={data} matchesLabel={activeGame === "PACMAN" ? "High Score" : "Matches"} />
          </div>
        )}
      </div>

      <style>{`@keyframes lbSkel { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
    </motion.div>
  );
}
