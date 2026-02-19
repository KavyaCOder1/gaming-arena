"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Crown, Medal, Zap, Ghost, Gamepad2, Timer, Grid3X3, User } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
interface LBEntry { user: { username: string }; highScore: number; }

const C = {
  cyan: "#22d3ee", indigo: "#6366f1", text: "#f8fafc",
  muted: "#64748b", dark: "rgba(15,23,42,0.75)",
  border: "rgba(34,211,238,0.12)",
};

const DIFF_CONFIG = {
  EASY:   { label: "ROOKIE",  desc: "2 Ghosts · Standard Speed", color: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.4)",  glow: "rgba(16,185,129,0.25)",  xp: "200 XP" },
  MEDIUM: { label: "VETERAN", desc: "3 Ghosts · Fast Speed",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.4)",  glow: "rgba(245,158,11,0.25)",  xp: "350 XP" },
  HARD:   { label: "ELITE",   desc: "4 Ghosts · Hyper Speed",    color: "#ef4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.4)",   glow: "rgba(239,68,68,0.25)",   xp: "500 XP" },
};

const card = {
  background: C.dark,
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: `1px solid ${C.border}`,
  borderRadius: 20,
  boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
};

function rankStyle(i: number) {
  if (i === 0) return { color: "#f59e0b", Icon: Crown };
  if (i === 1) return { color: "#94a3b8", Icon: Medal };
  if (i === 2) return { color: "#b45309", Icon: Medal };
  return { color: "#475569", Icon: null };
}

export default function PacmanPage() {
  const { user } = useAuthStore();
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [leaderboard, setLeaderboard] = useState<LBEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLbLoading(true);
      try {
        const res = await fetch("/api/leaderboard?gameType=PACMAN");
        const json = await res.json();
        if (json.success) setLeaderboard(json.data.slice(0, 8));
      } catch {}
      setLbLoading(false);
    })();
  }, []);

  const cfg = DIFF_CONFIG[difficulty];

  return (
    <div style={{ width: "100%", minHeight: "100vh", paddingBottom: 40, boxSizing: "border-box" }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/games"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", marginBottom: 14, opacity: 0.7 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
        >
          <ArrowLeft style={{ width: 13, height: 13, color: C.cyan }} />
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: C.cyan, letterSpacing: "0.3em", textTransform: "uppercase" }}>BACK TO ARCADE</span>
        </Link>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(26px,5vw,50px)", fontWeight: 900, color: C.text, textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", lineHeight: 1, margin: 0 }}>
              PAC-MAN <span style={{ color: C.cyan, textShadow: "0 0 20px rgba(34,211,238,0.5)" }}>RETRO</span>
            </h1>
            <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, fontWeight: 600, color: "#334155", letterSpacing: "0.25em", textTransform: "uppercase", marginTop: 5 }}>
              CLASSIC ENGINE · Phaser.js v3.60
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#334155", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 3 }}>Estimated Reward</div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 26, fontWeight: 900, color: "#f59e0b", filter: "drop-shadow(0 0 10px rgba(245,158,11,0.4))" }}>
              {cfg.xp}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="pacman-layout" style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>

        {/* ═══ LEFT/CENTER: Preview + Controls ═══ */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Game Preview Card */}
          <div style={{ position: "relative", borderRadius: 22, overflow: "hidden", border: "1px solid rgba(34,211,238,0.15)", boxShadow: "0 0 0 1px rgba(99,102,241,0.08), 0 8px 40px rgba(0,0,0,0.5)" }}>
            {/* Glow */}
            <div style={{ position: "absolute", inset: -2, borderRadius: 24, background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(34,211,238,0.1))", filter: "blur(8px)", zIndex: 0 }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <img
                alt="Pacman Preview"
                src="https://images.unsplash.com/photo-1551103782-8ab07afd45c1?q=80&w=1000&auto=format&fit=crop"
                style={{ width: "100%", height: "clamp(260px,40vw,420px)", objectFit: "cover", opacity: 0.82, display: "block" }}
              />
              {/* overlay gradient */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,15,35,0.95) 0%, transparent 55%)" }} />
              {/* top badge */}
              <div style={{ position: "absolute", top: 20, left: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)", padding: "7px 14px", borderRadius: 10, border: "1px solid rgba(34,211,238,0.4)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.cyan, boxShadow: `0 0 10px ${C.cyan}`, display: "inline-block", animation: "pacLive 2s infinite" }} />
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#fff", letterSpacing: "0.2em", textTransform: "uppercase" }}>Live Session Ready</span>
                </div>
              </div>
              {/* bottom info bar */}
              <div style={{ position: "absolute", bottom: 20, left: 20, right: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ padding: 14, background: "rgba(15,23,42,0.85)", borderRadius: 16, border: "1px solid rgba(99,102,241,0.3)" }}>
                    <Ghost style={{ width: 28, height: 28, color: C.indigo, filter: "drop-shadow(0 0 10px rgba(99,102,241,0.7))" }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, color: "#fff", letterSpacing: "0.08em" }}>CLASSIC ENGINE</div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.25em", marginTop: 2 }}>PHASER.JS v3.60</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[Ghost, Gamepad2].map((Icon, i) => (
                    <div key={i} style={{ padding: 9, borderRadius: 11, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>
                      <Icon style={{ width: 18, height: 18, color: C.muted }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Difficulty Selector */}
          <div style={{ ...card, padding: "20px" }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: "#334155", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 14 }}>Select Combat Intensity</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {(["EASY", "MEDIUM", "HARD"] as Difficulty[]).map((d) => {
                const dc = DIFF_CONFIG[d], active = difficulty === d;
                return (
                  <motion.button key={d} onClick={() => setDifficulty(d)}
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }}
                    style={{ padding: "16px 8px", borderRadius: 14, background: active ? dc.bg : "rgba(15,23,42,0.6)", border: `2px solid ${active ? dc.border : "rgba(255,255,255,0.05)"}`, cursor: "pointer", transition: "all 0.2s", textAlign: "center", boxShadow: active ? `0 0 18px ${dc.glow}` : "none", position: "relative", overflow: "hidden" }}>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(9px,2vw,11px)", fontWeight: 900, color: active ? dc.color : "#334155", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{dc.label}</div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 10, color: active ? dc.color + "aa" : "#1e293b", fontWeight: 600, lineHeight: 1.3 }}>{dc.desc}</div>
                    {active && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: dc.color, boxShadow: `0 0 8px ${dc.color}` }} />}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Controls Reference */}
          <div style={{ ...card, padding: "16px 20px" }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: "#334155", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 12 }}>Game Controls</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              {[
                { key: "↑↓←→ / WASD", action: "Move Pacman" },
                { key: "SPACE", action: "Pause Game" },
                { key: "~4 MIN", action: "Avg Round" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ padding: "3px 10px", borderRadius: 7, background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.2)", fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 900, color: C.cyan, letterSpacing: "0.1em" }}>{item.key}</div>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>{item.action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
            style={{ width: "100%", padding: "clamp(14px,3vw,18px)", borderRadius: 16, background: "linear-gradient(135deg, #22d3ee, #6366f1)", border: "none", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(13px,3vw,16px)", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: "#020617", boxShadow: "0 0 30px rgba(34,211,238,0.4), 0 0 60px rgba(34,211,238,0.12)", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, position: "relative", overflow: "hidden" }}
          >
            <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.8, ease: "linear" }}
              style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)", pointerEvents: "none" }} />
            <Zap style={{ width: 20, height: 20 }} />
            START GAME
          </motion.button>
        </div>

        {/* ═══ RIGHT PANEL: Leaderboard ═══ */}
        <div className="pacman-right" style={{ width: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Mode info badge */}
          <div style={{ ...card, padding: "16px 18px", borderColor: cfg.border.replace("0.4)", "0.25)"), boxShadow: `0 0 18px ${cfg.glow}` }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: C.muted, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 6 }}>SELECTED MODE</div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 20, fontWeight: 900, color: cfg.color, marginBottom: 3 }}>{cfg.label}</div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: cfg.color + "99", fontWeight: 600 }}>{cfg.desc}</div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>Est. Reward</span>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 14, fontWeight: 900, color: "#f59e0b" }}>{cfg.xp}</span>
            </div>
          </div>

          {/* Leaderboard */}
          <div style={{ ...card, padding: 18, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Trophy style={{ width: 14, height: 14, color: "#f59e0b" }} />
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: C.text, letterSpacing: "0.2em", textTransform: "uppercase" }}>GLOBAL TOP 10</span>
              <div style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: 6, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 900, color: C.indigo, letterSpacing: "0.12em" }}>ALL TIME</div>
            </div>

            {lbLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {[...Array(5)].map((_, i) => <div key={i} style={{ height: 36, borderRadius: 9, background: "rgba(255,255,255,0.03)", animation: "pacSkel 1.5s infinite" }} />)}
              </div>
            ) : leaderboard.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <Grid3X3 style={{ width: 22, height: 22, color: "#334155", margin: "0 auto 8px" }} />
                <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#475569", letterSpacing: "0.15em" }}>NO RECORDS YET</p>
                <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 10, color: "#334155", marginTop: 4 }}>Be the first to play!</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {leaderboard.map((entry, i) => {
                  const { color, Icon: RankIcon } = rankStyle(i);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: i < 3 ? `rgba(${i === 0 ? "245,158,11" : i === 1 ? "148,163,184" : "180,83,9"},0.06)` : "rgba(255,255,255,0.02)", border: `1px solid ${i < 3 ? `rgba(${i === 0 ? "245,158,11" : i === 1 ? "148,163,184" : "180,83,9"},0.16)` : "rgba(255,255,255,0.04)"}` }}>
                      <div style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {RankIcon ? <RankIcon style={{ width: 12, height: 12, color }} /> : <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: "#475569" }}>{i + 1}</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: i < 3 ? C.text : "#475569", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.user.username}</div>
                      </div>
                      <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 900, color: i < 3 ? color : C.cyan, flexShrink: 0 }}>{entry.highScore.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* User row */}
            {user && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: "#fff" }}>{user.username[0].toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: C.indigo, letterSpacing: "0.1em", textTransform: "uppercase" }}>YOU</div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.username}</div>
                  </div>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 900, color: "#f59e0b" }}>RANK —</div>
                </div>
              </div>
            )}
          </div>

          {/* Stats pills */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "Avg Round", value: "~4 MIN", color: C.cyan },
              { label: "Max XP",    value: "500 XP", color: "#f59e0b" },
            ].map((s, i) => (
              <div key={i} style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: C.muted, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── WATERMARK ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, width: "100%", padding: "0 48px 24px", pointerEvents: "none", zIndex: -1, opacity: 0.04 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(60px,12vw,120px)", lineHeight: 1, fontWeight: 900, color: C.text, userSelect: "none", fontStyle: "italic" }}>PACMAN</div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
            <div style={{ width: 6, height: 80, background: C.cyan, borderRadius: 3 }} />
            <div style={{ width: 6, height: 110, background: C.indigo, borderRadius: 3 }} />
            <div style={{ width: 6, height: 56, background: "#a855f7", borderRadius: 3 }} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pacLive { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes pacSkel { 0%,100%{opacity:1} 50%{opacity:0.35} }

        /* Responsive: stack on smaller screens */
        .pacman-layout { flex-direction: row; }
        @media(max-width:900px) {
          .pacman-layout { flex-direction: column !important; }
          .pacman-right { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
