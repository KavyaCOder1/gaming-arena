"use client";

import { useAuthStore } from "@/store/auth-store";
import { User, Settings, LogOut, Shield, Calendar, Clock, Trophy, Target, Zap, ChevronRight, Mail, Key, Bell, Activity } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { motion, Variants } from "framer-motion";
import { useEffect, useState } from "react";

const C = { cyan: "#22d3ee", indigo: "#6366f1", text: "#f8fafc", muted: "#64748b", slate: "#475569" };
const card = { background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(34,211,238,0.12)", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
const fadeUp: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", damping: 22, stiffness: 180 } } };
const stagger: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

const RANK_COLOR: Record<string, string> = {
  ROOKIE:  "#94a3b8",
  VETERAN: "#13b6ec",
  ELITE:   "#ff00ff",
  LEGEND:  "#fbbf24",
};

interface ProfileData {
  xp: number;
  rank: string;
  xpToNextRank: number;
  progressInRank: { current: number; total: number; pct: number };
  tttWins: number;
  tttLosses: number;
  tttDraws: number;
  totalGames: number;
  winRate: number;
}

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const [data, setData]   = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/user/level").then(r => r.json()),
      fetch("/api/user/ttt-stats").then(r => r.json()),
      fetch("/api/dashboard/stats").then(r => r.json()),
    ])
      .then(([levelJson, tttJson, statsJson]) => {
        const level = levelJson.success ? levelJson.data : null;
        const ttt   = tttJson.success   ? tttJson.data   : { wins: 0, losses: 0, draws: 0 };
        const stats = statsJson.success  ? statsJson.stats : { totalGames: 0, winRate: 0 };
        setData({
          xp:              level?.xp ?? 0,
          rank:            level?.rank ?? "ROOKIE",
          xpToNextRank:    level?.xpToNextRank ?? 0,
          progressInRank:  level?.progressInRank ?? { current: 0, total: 1000, pct: 0 },
          tttWins:         ttt.wins,
          tttLosses:       ttt.losses,
          tttDraws:        ttt.draws,
          totalGames:      stats.totalGames,
          winRate:         stats.winRate,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const rankColor = data ? (RANK_COLOR[data.rank] ?? C.cyan) : C.cyan;

  const statCards = data ? [
    { label: "Operation Rank", value: data.rank,               icon: Trophy,  color: rankColor,   glow: `${rankColor}33` },
    { label: "Total XP",       value: `${data.xp.toLocaleString()} XP`, icon: Zap, color: C.indigo, glow: "rgba(99,102,241,0.2)" },
    { label: "Win Rate",       value: `${data.winRate}%`,      icon: Target,  color: "#10b981",   glow: "rgba(16,185,129,0.2)" },
  ] : [];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ width: "100%", maxWidth: 900 }}>

      {/* ── HERO HEADER ── */}
      <motion.div variants={fadeUp} style={{ ...card, padding: "36px 32px", marginBottom: 24, position: "relative", overflow: "hidden", borderColor: `${rankColor}33` }}>
        <div style={{ position: "absolute", top: -60, left: -60, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.6), rgba(99,102,241,0.4), transparent)" }} />

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 28, position: "relative", zIndex: 1 }}>
          {/* Avatar */}
          <div style={{ position: "relative" }}>
            <div style={{ width: 110, height: 110, borderRadius: 28, background: `linear-gradient(135deg, ${rankColor}, #22d3ee)`, padding: 2, boxShadow: `0 0 30px ${rankColor}50` }}>
              <div style={{ width: "100%", height: "100%", borderRadius: 26, background: "rgba(10,15,35,0.95)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 44, fontWeight: 900, color: rankColor, lineHeight: 1 }}>
                  {user.username[0].toUpperCase()}
                </span>
              </div>
            </div>
            {data && (
              <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", background: rankColor, padding: "3px 12px", borderRadius: 8, fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 900, color: "#020617", letterSpacing: "0.15em", whiteSpace: "nowrap", boxShadow: `0 0 12px ${rankColor}80` }}>
                {data.rank}
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
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                    {data.xp.toLocaleString()} XP
                  </span>
                  {data.xpToNextRank > 0 && (
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: rankColor, letterSpacing: "0.1em" }}>
                      {data.xpToNextRank.toLocaleString()} to next rank
                    </span>
                  )}
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${data.progressInRank.pct}%` }}
                    transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                    style={{ height: "100%", background: `linear-gradient(90deg, ${rankColor}, #22d3ee)`, borderRadius: 3, boxShadow: `0 0 8px ${rankColor}60` }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 10, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>ID No.</span>
                <span style={{ fontFamily: "'Rajdhani', monospace", fontSize: 12, color: C.cyan, fontWeight: 700 }}>{user.id}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 10, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Calendar style={{ width: 13, height: 13, color: C.muted }} />
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Enlisted</span>
                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: C.text, fontWeight: 600 }}>{formatDate(new Date())}</span>
              </div>
            </div>
          </div>

          {/* Logout */}
          <motion.button
            onClick={() => logout()}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 22px", borderRadius: 14, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}
          >
            <LogOut style={{ width: 15, height: 15 }} />
            SIGN OUT
          </motion.button>
        </div>
      </motion.div>

      {/* ── OVERVIEW STATS ── */}
      <motion.div variants={fadeUp} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
        {loading ? [0,1,2,3].map(i => <div key={i} style={{ ...card, height: 90, animation: "profilePulse 1.5s infinite" }} />) : [
          { label: "Operation Rank", value: data?.rank ?? "—",                    icon: Trophy,  color: rankColor,  glow: `${rankColor}33` },
          { label: "Total XP",       value: `${(data?.xp ?? 0).toLocaleString()} XP`, icon: Zap, color: C.indigo, glow: "rgba(99,102,241,0.2)" },
          { label: "Total Games",    value: data?.totalGames ?? 0,                icon: Target,  color: "#22d3ee",  glow: "rgba(34,211,238,0.2)" },
          { label: "Win Rate",       value: `${data?.winRate ?? 0}%`,             icon: Activity,color: "#10b981",  glow: "rgba(16,185,129,0.2)" },
        ].map((s, i) => (
          <motion.div key={i} whileHover={{ scale: 1.03 }}
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

      {/* ── TTT COMBAT RECORD ── */}
      <motion.div variants={fadeUp} style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 900, color: C.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>✕</span> TIC-TAC-TOE COMBAT RECORD
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {([
            { label: "WINS",       value: data?.tttWins ?? 0,                                       color: "#10b981", glow: "rgba(16,185,129,0.25)" },
            { label: "LOSSES",     value: data?.tttLosses ?? 0,                                     color: "#ef4444", glow: "rgba(239,68,68,0.25)"  },
            { label: "DRAWS",      value: data?.tttDraws ?? 0,                                      color: "#f59e0b", glow: "rgba(245,158,11,0.25)" },
            { label: "WIN RATE",   value: data ? `${data.tttWins + data.tttLosses + data.tttDraws > 0 ? Math.round(data.tttWins / (data.tttWins + data.tttLosses + data.tttDraws) * 100) : 0}%` : "0%", color: "#22d3ee", glow: "rgba(34,211,238,0.25)" },
          ] as const).map(s => (
            <motion.div key={s.label} whileHover={{ scale: 1.03 }}
              style={{ ...card, padding: "22px 20px", textAlign: "center", position: "relative", overflow: "hidden", borderColor: `${s.color}20` }}>
              <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 0%, ${s.glow} 0%, transparent 65%)`, pointerEvents: "none" }} />
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 10 }}>{s.label}</div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 36, fontWeight: 900, color: s.color, filter: `drop-shadow(0 0 12px ${s.color}80)`, lineHeight: 1 }}>
                {loading ? "—" : s.value}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── CONTROL PANELS ── */}
      <motion.div variants={fadeUp} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
        {/* Security */}
        <div>
          <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 900, color: C.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <Settings style={{ width: 16, height: 16, color: C.indigo }} />
            SECURITY PROTOCOLS
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { icon: Key,  title: "Access Key Rotation", sub: "Update authentication signature", disabled: false },
              { icon: Mail, title: "Secure Comms",         sub: "E-mail verified & encrypted",    disabled: true, badge: "ACTIVE" },
            ].map((item, i) => (
              <motion.div key={i} whileHover={!item.disabled ? { scale: 1.02, borderColor: "rgba(34,211,238,0.3)" } : {}}
                style={{ ...card, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: item.disabled ? "not-allowed" : "pointer", opacity: item.disabled ? 0.65 : 1, transition: "all 0.2s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <item.icon style={{ width: 18, height: 18, color: C.muted }} />
                  </div>
                  <div>
                    <h4 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{item.title}</h4>
                    <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: C.muted, fontWeight: 500 }}>{item.sub}</p>
                  </div>
                </div>
                {item.badge
                  ? <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", padding: "3px 8px", borderRadius: 6, letterSpacing: "0.1em" }}>{item.badge}</span>
                  : <ChevronRight style={{ width: 16, height: 16, color: C.muted }} />
                }
              </motion.div>
            ))}
          </div>
        </div>

        {/* Uplink */}
        <div>
          <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 900, color: C.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <Bell style={{ width: 16, height: 16, color: C.cyan }} />
            UPLINK CONFIG
          </h3>
          <div style={{ ...card, padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 20, position: "relative", overflow: "hidden", borderColor: "rgba(34,211,238,0.2)" }}>
            <div style={{ position: "absolute", top: -30, right: -30, width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)" }} />
            <motion.div whileHover={{ rotate: 12, scale: 1.05 }}
              style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.25)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 24px rgba(34,211,238,0.12)", transition: "all 0.3s" }}>
              <Activity style={{ width: 36, height: 36, color: C.cyan, filter: "drop-shadow(0 0 8px rgba(34,211,238,0.5))" }} />
            </motion.div>
            <div>
              <h4 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 8 }}>NEURAL NOTIFICATIONS</h4>
              <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, color: C.muted, fontWeight: 500, lineHeight: 1.6, maxWidth: 240 }}>
                Real-time combat alerts and tournament deployment updates.
              </p>
            </div>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ width: "100%", padding: "14px", borderRadius: 12, background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.25)", color: C.cyan, fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(34,211,238,0.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(34,211,238,0.06)"; }}>
              ENABLE UPLINK
            </motion.button>
          </div>
        </div>
      </motion.div>

      <style>{`
        @keyframes profilePulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
      `}</style>
    </motion.div>
  );
}
