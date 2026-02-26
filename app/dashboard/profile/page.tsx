"use client";

import { useAuthStore } from "@/store/auth-store";
import { LogOut, Calendar, Clock, Trophy, Zap, GamepadIcon, Lock, ChevronRight, CheckCircle2, Wallet } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { motion, Variants } from "framer-motion";
import { useEffect, useState } from "react";

const C = { cyan: "#22d3ee", indigo: "#6366f1", text: "#f8fafc", muted: "#64748b", slate: "#475569" };
const card = { background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(34,211,238,0.12)", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
const fadeUp: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", damping: 22, stiffness: 180 } } };
const stagger: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

// ── Rank system (matches ranks.zip design) ────────────────────────────────────
const RANKS = [
  {
    id: "ROOKIE",
    label: "Rookie",
    xpMin: 0,
    xpMax: 1000,
    color: "#94a3b8",
    glow: "rgba(148,163,184,0.3)",
    bg: "rgba(148,163,184,0.06)",
    border: "rgba(148,163,184,0.25)",
    msIcon: "deployed_code",
  },
  {
    id: "VETERAN",
    label: "Veteran",
    xpMin: 1001,
    xpMax: 5000,
    color: "#13b6ec",
    glow: "rgba(19,182,236,0.4)",
    bg: "rgba(19,182,236,0.08)",
    border: "rgba(19,182,236,0.35)",
    msIcon: "shield",
  },
  {
    id: "ELITE",
    label: "Elite",
    xpMin: 5001,
    xpMax: 15000,
    color: "#ff00ff",
    glow: "rgba(255,0,255,0.4)",
    bg: "rgba(255,0,255,0.07)",
    border: "rgba(255,0,255,0.3)",
    msIcon: "pentagon",
  },
  {
    id: "LEGEND",
    label: "Legend",
    xpMin: 15001,
    xpMax: Infinity,
    color: "#fbbf24",
    glow: "rgba(251,191,36,0.5)",
    bg: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.4)",
    msIcon: "crown",
  },
];

function getRankIndex(rank: string) {
  return RANKS.findIndex(r => r.id === rank);
}

interface ProfileData {
  xp: number;
  rank: string;
  xpToNextRank: number;
  progressInRank: { current: number; total: number; pct: number };
  totalGames: number;
  playTimeLabel: string;
}

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/user/level").then(r => r.json()),
      fetch("/api/dashboard/stats").then(r => r.json()),
    ])
      .then(([levelJson, statsJson]) => {
        const level = levelJson.success ? levelJson.data : null;
        const stats = statsJson.success ? statsJson.stats : { totalGames: 0, playTimeLabel: "0m" };
        setData({
          xp:             level?.xp ?? 0,
          rank:           level?.rank ?? "ROOKIE",
          xpToNextRank:   level?.xpToNextRank ?? 0,
          progressInRank: level?.progressInRank ?? { current: 0, total: 1000, pct: 0 },
          totalGames:     stats.totalGames,
          playTimeLabel:  stats.playTimeLabel ?? "0m",
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const currentRankIdx = data ? getRankIndex(data.rank) : 0;
  const currentRank    = RANKS[currentRankIdx] ?? RANKS[0];
  const nextRank       = RANKS[currentRankIdx + 1] ?? null;
  const rankColor      = currentRank.color;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ width: "100%", maxWidth: 900 }}>

      {/* ── HERO HEADER ── */}
      <motion.div variants={fadeUp} style={{ ...card, padding: "36px 32px", marginBottom: 24, position: "relative", overflow: "hidden", borderColor: `${rankColor}33` }}>
        <div style={{ position: "absolute", top: -60, left: -60, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${currentRank.glow.replace("0.4", "0.07")} 0%, transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.6), rgba(99,102,241,0.4), transparent)" }} />

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 28, position: "relative", zIndex: 1 }}>
          {/* Avatar */}
          <div style={{ position: "relative" }}>
            <div style={{ width: 110, height: 110, borderRadius: 28, background: `linear-gradient(135deg, ${rankColor}, #22d3ee)`, padding: 2, boxShadow: `0 0 30px ${currentRank.glow}` }}>
              <div style={{ width: "100%", height: "100%", borderRadius: 26, background: "rgba(10,15,35,0.95)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 44, fontWeight: 900, color: rankColor, lineHeight: 1 }}>
                  {user.username[0].toUpperCase()}
                </span>
              </div>
            </div>
            {data && (
              <div style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)", background: rankColor, padding: "3px 12px", borderRadius: 8, fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 900, color: "#020617", letterSpacing: "0.15em", whiteSpace: "nowrap", boxShadow: `0 0 14px ${rankColor}90` }}>
                {currentRank.label.toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(24px, 4vw, 38px)", fontWeight: 900, color: C.text, textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", marginBottom: 14 }}>
              {user.username}
            </h2>

            {/* XP progress bar */}
            {data && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: C.muted, letterSpacing: "0.15em" }}>
                    {data.xp.toLocaleString()} XP
                  </span>
                  {data.xpToNextRank > 0 && nextRank && (
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: rankColor, letterSpacing: "0.1em" }}>
                      {data.xpToNextRank.toLocaleString()} to {nextRank.label}
                    </span>
                  )}
                  {!nextRank && (
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: currentRank.color, letterSpacing: "0.1em" }}>MAX RANK</span>
                  )}
                </div>
                <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${data.progressInRank.pct}%` }}
                    transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                    style={{ height: "100%", background: `linear-gradient(90deg, ${rankColor}, #22d3ee)`, borderRadius: 4, boxShadow: `0 0 10px ${rankColor}70` }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 10, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: C.muted, letterSpacing: "0.15em" }}>ID</span>
                <span style={{ fontFamily: "monospace", fontSize: 12, color: C.cyan, fontWeight: 700 }}>{user.id}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 10, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Calendar style={{ width: 13, height: 13, color: C.muted }} />
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: C.muted, letterSpacing: "0.1em" }}>ENLISTED</span>
                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: C.text, fontWeight: 600 }}>{formatDate(new Date())}</span>
              </div>
            </div>
          </div>

          {/* Logout */}
          <motion.button
            onClick={() => logout()}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 22px", borderRadius: 14, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.14)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}
          >
            <LogOut style={{ width: 15, height: 15 }} />
            SIGN OUT
          </motion.button>
        </div>
      </motion.div>

      {/* ── OVERVIEW STATS: XP · Rank · Total Games · Play Time ── */}
      <motion.div variants={fadeUp} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 28 }}>
        {loading ? [0,1,2,3].map(i => (
          <div key={i} style={{ ...card, height: 90, animation: "profilePulse 1.5s infinite", animationDelay: `${i * 0.12}s` }} />
        )) : [
          { label: "Total XP",     value: `${(data?.xp ?? 0).toLocaleString()}`, icon: Zap,         color: C.indigo,  glow: "rgba(99,102,241,0.22)" },
          { label: "Current Rank", value: currentRank.label,                     icon: Trophy,      color: rankColor, glow: `${currentRank.glow.replace("0.4","0.18")}` },
          { label: "Total Games",  value: `${data?.totalGames ?? 0}`,            icon: GamepadIcon, color: "#22d3ee", glow: "rgba(34,211,238,0.18)" },
          { label: "Play Time",    value: data?.playTimeLabel ?? "0m",           icon: Clock,       color: "#f59e0b", glow: "rgba(245,158,11,0.18)" },
        ].map((s, i) => (
          <motion.div key={i} whileHover={{ scale: 1.03, y: -2 }}
            style={{ ...card, padding: "20px 22px", display: "flex", alignItems: "center", gap: 16, position: "relative", overflow: "hidden", cursor: "default" }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${s.glow} 0%, transparent 70%)` }} />
            <div style={{ padding: 12, borderRadius: 14, background: s.glow, border: `1px solid ${s.color}30`, flexShrink: 0 }}>
              <s.icon style={{ width: 22, height: 22, color: s.color, filter: `drop-shadow(0 0 6px ${s.color}80)` }} />
            </div>
            <div>
              <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, fontWeight: 900, color: C.text }}>{s.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── RANK PROGRESSION ── */}
      <motion.div variants={fadeUp} style={{ marginBottom: 28 }}>
        <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 900, color: C.text, marginBottom: 20, display: "flex", alignItems: "center", gap: 10, letterSpacing: "0.1em" }}>
          <Trophy style={{ width: 16, height: 16, color: rankColor, filter: `drop-shadow(0 0 6px ${rankColor})` }} />
          RANK PROGRESSION
        </h3>

        {/* Rank cards with arrows between them */}
        <div className="rank-progression-grid" style={{ display: "flex", alignItems: "stretch", gap: 0, overflowX: "auto", paddingBottom: 4 }}>
          {RANKS.map((rank, idx) => {
            const isCurrentRank  = data?.rank === rank.id;
            const isUnlocked     = currentRankIdx >= idx;
            const isLocked       = !isUnlocked;
            const isPastRank     = isUnlocked && !isCurrentRank;
            const isLastRank     = idx === RANKS.length - 1;

            return (
              <div key={rank.id} style={{ display: "flex", alignItems: "center", flex: isLastRank ? "1" : "1 1 0", minWidth: 160 }}>

                {/* ── RANK CARD ── */}
                <motion.div
                  whileHover={!isLocked ? { y: -4, scale: 1.02 } : {}}
                  style={{
                    flex: 1,
                    height: "100%",
                    minHeight: 200,
                    ...card,
                    padding: "16px 14px 16px",
                    position: "relative",
                    overflow: "hidden",
                    cursor: "default",
                    // Border: strong for current, subtle-but-visible for locked
                    borderColor: isCurrentRank
                      ? rank.border
                      : isPastRank
                      ? `${rank.color}30`
                      : "rgba(255,255,255,0.10)",
                    background: isCurrentRank
                      ? `linear-gradient(160deg, ${rank.bg} 0%, rgba(15,23,42,0.92) 100%)`
                      : isPastRank
                      ? `linear-gradient(160deg, ${rank.bg.replace("0.08","0.04")} 0%, rgba(15,23,42,0.85) 100%)`
                      : "rgba(15,23,42,0.70)",
                    boxShadow: isCurrentRank
                      ? `0 0 24px ${rank.glow.replace("0.4","0.18")}, 0 4px 16px rgba(0,0,0,0.5)`
                      : "0 2px 16px rgba(0,0,0,0.35)",
                  }}
                >
                  {/* Top accent bar */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2,
                    background: isCurrentRank
                      ? `linear-gradient(90deg, transparent, ${rank.color}, transparent)`
                      : isPastRank
                      ? `linear-gradient(90deg, transparent, ${rank.color}60, transparent)`
                      : "transparent"
                  }} />

                  {/* Glow sweep (current only) */}
                  {isCurrentRank && (
                    <motion.div
                      animate={{ x: ["-100%", "220%"] }}
                      transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 2, ease: "linear" }}
                      style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, transparent, ${rank.color}15, transparent)`, pointerEvents: "none" }}
                    />
                  )}

                  {/* Status badge — top right */}
                  <div style={{ position: "absolute", top: 10, right: 10, zIndex: 3 }}>
                    {isCurrentRank && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 7, background: "rgba(15,23,42,0.9)", border: "1px solid rgba(34,211,238,0.4)" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d3ee", boxShadow: "0 0 6px #22d3ee", flexShrink: 0 }} />
                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7, color: "#22d3ee", letterSpacing: "0.08em", fontWeight: 700, lineHeight: 1 }}>CURRENT</span>
                      </div>
                    )}
                    {isPastRank && (
                      <CheckCircle2 style={{ width: 20, height: 20, color: "#22c55e", filter: "drop-shadow(0 0 6px rgba(34,197,94,0.7))" }} />
                    )}
                    {isLocked && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 7, background: "rgba(15,23,42,0.9)", border: "1px solid rgba(255,255,255,0.12)" }}>
                        <Lock style={{ width: 9, height: 9, color: "#94a3b8" }} />
                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7, color: "#94a3b8", letterSpacing: "0.08em" }}>LOCKED</span>
                      </div>
                    )}
                  </div>

                  {/* Icon circle */}
                  <div style={{ marginBottom: 14, display: "flex", justifyContent: "center", marginTop: 6 }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: "50%",
                      background: isLocked ? "rgba(148,163,184,0.06)" : rank.bg,
                      border: `2px solid ${isLocked ? "rgba(148,163,184,0.22)" : rank.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      filter: isCurrentRank
                        ? `drop-shadow(0 0 20px ${rank.color}90)`
                        : isPastRank
                        ? `drop-shadow(0 0 10px ${rank.color}55)`
                        : "none",
                    }}>
                      <span
                        className="ms-rank"
                        style={{
                          color: isLocked ? `${rank.color}70` : rank.color,
                          fontSize: 30,
                          fontVariationSettings: "'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 48",
                        }}
                      >
                        {rank.msIcon}
                      </span>
                    </div>
                  </div>

                  {/* Rank name */}
                  <div style={{ textAlign: "center", marginBottom: 12 }}>
                    <h4 style={{
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: 13, fontWeight: 900,
                      // Locked: use actual color but dimmed — readable!
                      color: isLocked ? `${rank.color}99` : rank.color,
                      letterSpacing: "0.12em", textTransform: "uppercase",
                      textShadow: isCurrentRank ? `0 0 14px ${rank.color}90` : "none",
                      marginBottom: 5,
                    }}>
                      {rank.label}
                    </h4>
                    <p style={{
                      fontFamily: "'Orbitron', sans-serif", fontSize: 9,
                      color: isLocked ? "#94a3b8" : C.muted,
                      letterSpacing: "0.04em",
                      fontWeight: 600,
                    }}>
                      {rank.xpMax === Infinity
                        ? `${rank.xpMin.toLocaleString()}+ XP`
                        : `${rank.xpMin.toLocaleString()} – ${rank.xpMax.toLocaleString()} XP`}
                    </p>
                  </div>

                  {/* XP progress bar — current rank only */}
                  {isCurrentRank && data && (
                    <div>
                      <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${data.progressInRank.pct}%` }}
                          transition={{ duration: 1.3, delay: 0.5, ease: "easeOut" }}
                          style={{ height: "100%", background: `linear-gradient(90deg, ${rank.color}, #22d3ee)`, borderRadius: 3, boxShadow: `0 0 8px ${rank.color}70` }}
                        />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: C.muted, fontWeight: 700 }}>{data.progressInRank.current.toLocaleString()} XP</span>
                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: rank.color, fontWeight: 900, lineHeight: 1, filter: `drop-shadow(0 0 6px ${rank.color}80)` }}>{data.progressInRank.pct.toFixed(0)}%</span>
                      </div>
                      {nextRank && (
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${rank.color}30`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: "0.05em" }}>NEXT: {nextRank.label.toUpperCase()}</span>
                          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 900, color: nextRank.color, whiteSpace: "nowrap", filter: `drop-shadow(0 0 6px ${nextRank.color}80)` }}>{data.xpToNextRank.toLocaleString()} XP</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Achieved bar fill for past ranks */}
                  {isPastRank && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ height: 4, borderRadius: 3, background: `linear-gradient(90deg, ${rank.color}60, #22c55e60)`, boxShadow: `0 0 6px ${rank.color}40` }} />
                      <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7, color: "#22c55e", textAlign: "center", marginTop: 6, letterSpacing: "0.1em" }}>ACHIEVED</p>
                    </div>
                  )}
                </motion.div>

                {/* ── ARROW BETWEEN CARDS (not after last) ── */}
                {!isLastRank && (
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 6px", gap: 4, opacity: isUnlocked ? 1 : 0.35 }}>
                    {/* Arrow shaft + head */}
                    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                      <div style={{ width: 18, height: 2, background: isUnlocked ? `linear-gradient(90deg, ${rank.color}, ${RANKS[idx+1].color})` : "rgba(255,255,255,0.15)", borderRadius: 1 }} />
                      <div style={{
                        width: 0, height: 0,
                        borderTop: "6px solid transparent",
                        borderBottom: "6px solid transparent",
                        borderLeft: `8px solid ${isUnlocked ? RANKS[idx+1].color : "rgba(255,255,255,0.15)"}`,
                      }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── XP FUTURE VALUE BANNER ── */}
      <motion.div variants={fadeUp}
        style={{ marginBottom: 28, borderRadius: 20, overflow: "hidden", position: "relative",
          background: "linear-gradient(120deg, rgba(99,102,241,0.08) 0%, rgba(34,211,238,0.05) 50%, rgba(251,191,36,0.06) 100%)",
          border: "1px solid rgba(99,102,241,0.2)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(99,102,241,0.15)" }}
      >
        {/* top glow line */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, #6366f1, #22d3ee, #fbbf24, transparent)" }} />
        {/* bg orb */}
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ padding: "24px 28px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 20, position: "relative", zIndex: 1 }}>

          {/* left: icon + text */}
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(34,211,238,0.12))",
              border: "1px solid rgba(99,102,241,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 20px rgba(99,102,241,0.25)" }}>
              <Zap style={{ width: 24, height: 24, color: "#818cf8", fill: "#818cf8", filter: "drop-shadow(0 0 8px rgba(99,102,241,0.9))" }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d3ee", boxShadow: "0 0 8px #22d3ee", animation: "xpBannerPulse 2s ease-in-out infinite" }} />
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 800, color: "#22d3ee", letterSpacing: "0.35em", textTransform: "uppercase" }}>Coming in Phase 2</span>
              </div>
              <h4 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(13px,2vw,16px)", fontWeight: 900, color: "#f8fafc", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                Your XP will convert to real crypto
              </h4>
              <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: "#64748b", fontWeight: 500, lineHeight: 1.55, maxWidth: 480 }}>
                Every XP point you earn now is being tracked. When the rewards system launches,
                you'll be able to withdraw across any blockchain network — zero entry fees, fully yours.
              </p>
            </div>
          </div>

          {/* right: XP pill */}
          {data && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <div style={{ padding: "10px 22px", borderRadius: 14,
                background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(34,211,238,0.1))",
                border: "1px solid rgba(99,102,241,0.35)",
                boxShadow: "0 0 24px rgba(99,102,241,0.2)" }}>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 22, fontWeight: 900, color: "#818cf8", textAlign: "center", filter: "drop-shadow(0 0 8px rgba(99,102,241,0.7))", lineHeight: 1 }}>
                  {data.xp.toLocaleString()}
                </div>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: "#475569", textAlign: "center", letterSpacing: "0.25em", marginTop: 4 }}>XP BANKED</div>
              </div>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 800, color: "#22d3ee", letterSpacing: "0.2em", textTransform: "uppercase", filter: "drop-shadow(0 0 6px rgba(34,211,238,0.7))" }}>KEEP STACKING ↑</span>
            </div>
          )}
        </div>
      </motion.div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,300,0,0');
        @keyframes profilePulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes xpBannerPulse { 0%,100%{opacity:1;box-shadow:0 0 8px #22d3ee} 50%{opacity:0.5;box-shadow:0 0 16px #22d3ee} }
        .ms-rank { font-family: 'Material Symbols Outlined'; font-weight: 300; font-style: normal; font-size: 30px; line-height: 1; letter-spacing: normal; text-transform: none; display: inline-block; white-space: nowrap; word-wrap: normal; direction: ltr; -webkit-font-smoothing: antialiased; font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 48; }
        @media (max-width: 640px) {
          .rank-progression-grid { flex-wrap: wrap !important; overflow-x: visible !important; }
          .rank-progression-grid > div { flex: 1 1 calc(50% - 8px) !important; min-width: 140px !important; }
        }
        @media (max-width: 380px) {
          .rank-progression-grid > div { flex: 1 1 100% !important; }
        }
      `}</style>
    </motion.div>
  );
}
