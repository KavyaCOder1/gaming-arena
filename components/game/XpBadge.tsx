"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth-store";
import { UserLevelData } from "@/types";

// Rank config matches ranks.zip exactly
const RANK_CONFIG = {
  ROOKIE:  {
    color: "#94a3b8",
    glow:  "rgba(148,163,184,0.35)",
    bg:    "#1a2030",
    bar:   "linear-gradient(90deg,#64748b,#94a3b8)",
    icon:  "deployed_code",
    fontVariation: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
  },
  VETERAN: {
    color: "#13b6ec",
    glow:  "rgba(19,182,236,0.55)",
    bg:    "#0a1e2e",
    bar:   "linear-gradient(90deg,#0ea5e9,#13b6ec)",
    icon:  "shield",
    fontVariation: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
  },
  ELITE:   {
    color: "#ff00ff",
    glow:  "rgba(255,0,255,0.55)",
    bg:    "#1a0a2e",
    bar:   "linear-gradient(90deg,#d946ef,#ff00ff)",
    icon:  "pentagon",
    fontVariation: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
  },
  LEGEND:  {
    color: "#fbbf24",
    glow:  "rgba(251,191,36,0.65)",
    bg:    "#1e1500",
    bar:   "linear-gradient(90deg,#f59e0b,#fde68a)",
    icon:  "crown",
    fontVariation: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
  },
} as const;

type Rank = keyof typeof RANK_CONFIG;

interface XpBadgeProps {
  /** compact = pill in navbar, expanded = card in sidebar */
  variant?: "compact" | "expanded";
}

export function XpBadge({ variant = "compact" }: XpBadgeProps) {
  const { user, isAuthenticated } = useAuthStore();
  const [levelData, setLevelData] = useState<UserLevelData | null>(null);
  const [prevXp, setPrevXp]       = useState<number | null>(null);
  const [showPop, setShowPop]     = useState(false);

  const fetchLevel = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res  = await fetch("/api/user/level");
      const json = await res.json();
      if (!json.success) return;
      setLevelData(prev => {
        if (prev && json.data.xp > prev.xp) {
          setPrevXp(prev.xp);
          setShowPop(true);
          setTimeout(() => setShowPop(false), 2500);
        }
        return json.data;
      });
    } catch {}
  }, [isAuthenticated]);

  // Initial fetch + poll every 30 s
  useEffect(() => {
    fetchLevel();
    const id = setInterval(fetchLevel, 30_000);
    return () => clearInterval(id);
  }, [fetchLevel]);

  // Expose so game pages can call window.__refreshXp() after saving
  useEffect(() => {
    (window as any).__refreshXp = fetchLevel;
    return () => { delete (window as any).__refreshXp; };
  }, [fetchLevel]);

  if (!isAuthenticated || !user || !levelData) return null;

  const rank = (levelData.rank ?? "ROOKIE") as Rank;
  const rc   = RANK_CONFIG[rank] ?? RANK_CONFIG.ROOKIE;
  const { xp, progressInRank, xpToNextRank } = levelData;
  const xpGain = prevXp !== null ? xp - prevXp : 0;

  // ── COMPACT pill (navbar) ─────────────────────────────────────────────────
  const pctCompact = progressInRank?.pct ?? 0;
  if (variant === "compact") {
    return (
      <div style={{ position: "relative", display: "inline-flex" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "default", userSelect: "none" }}>

          {/* Icon */}
          <span className="material-symbols-outlined" style={{
            fontSize: 14, color: rc.color,
            filter: `drop-shadow(0 0 5px ${rc.color})`,
            fontVariationSettings: rc.fontVariation,
            lineHeight: 1, userSelect: "none", flexShrink: 0,
          }}>{rc.icon}</span>

          {/* Rank + XP bar stacked */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Row: rank name + xp number */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 900,
                color: rc.color, letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1,
              }}>{rank}</span>
              <span style={{
                fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 600,
                color: "#94a3b8", lineHeight: 1,
              }}>{xp.toLocaleString()} XP</span>
            </div>
            {/* Mini XP progress bar */}
            <div style={{ width: 80, height: 3, borderRadius: 99, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pctCompact}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                style={{ height: "100%", background: rc.bar, borderRadius: 99 }}
              />
            </div>
          </div>
        </div>

        {/* +XP pop notification */}
        <AnimatePresence>
          {showPop && xpGain > 0 && (
            <motion.div
              key="xppop"
              initial={{ opacity: 0, y: 4, scale: 0.8 }}
              animate={{ opacity: 1, y: -32, scale: 1 }}
              exit={{ opacity: 0, y: -46, scale: 0.75 }}
              transition={{ duration: 0.5 }}
              style={{
                position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                background: "rgba(4,24,14,0.96)", border: `1px solid ${rc.color}70`,
                borderRadius: 20, padding: "3px 11px", whiteSpace: "nowrap",
                fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 900,
                color: "#10b981", pointerEvents: "none", zIndex: 300,
                boxShadow: "0 0 12px rgba(16,185,129,0.4)",
              }}>
              +{xpGain.toLocaleString()} XP
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── EXPANDED card (sidebar) ─────────────────────────────────────────────────
  const pct   = progressInRank?.pct     ?? 0;
  const curXp = progressInRank?.current ?? 0;
  const totXp = progressInRank?.total   ?? 0;

  return (
    <div style={{
      borderRadius: 14,
      padding: "14px 16px",
      background: "linear-gradient(135deg, #2d3f55 0%, #1e2f45 100%)",
      border: "1px solid rgba(99,102,241,0.35)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
    }}>

      {/* Icon + rank name + XP on one row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
          background: `${rc.color}15`,
          border: `2px solid ${rc.color}55`,
          boxShadow: `0 0 12px ${rc.glow}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span className="material-symbols-outlined" style={{
            fontSize: 20, color: rc.color,
            filter: `drop-shadow(0 0 5px ${rc.color})`,
            fontVariationSettings: rc.fontVariation,
            lineHeight: 1, userSelect: "none",
          }}>{rc.icon}</span>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900,
            color: rc.color, textTransform: "uppercase", letterSpacing: "0.1em", lineHeight: 1,
            textShadow: `0 0 14px ${rc.color}`,
          }}>{rank}</div>
          <div style={{
            fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700,
            color: "rgba(255,255,255,0.5)", marginTop: 4, letterSpacing: "0.05em",
          }}>
            {xp.toLocaleString()}
            <span style={{ color: rc.color, marginLeft: 3 }}>XP</span>
          </div>
        </div>
      </div>

      {/* Progress bar section */}
      {rank !== "LEGEND" ? (
        <>
          {/* Bar */}
          <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 6 }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ height: "100%", background: rc.bar, borderRadius: 99, boxShadow: `0 0 8px ${rc.glow}` }}
            />
          </div>
          {/* Min / Max / to-next all in one row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 600, color: "#ffffff" }}>
              {curXp.toLocaleString()}
            </span>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: rc.color, fontWeight: 700 }}>
              {xpToNextRank.toLocaleString()}
              <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 500 }}> to next</span>
            </span>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 600, color: "#ffffff" }}>
              {totXp.toLocaleString()}
            </span>
          </div>
        </>
      ) : (
        <motion.div
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          style={{ textAlign: "center", paddingTop: 2 }}
        >
          <span style={{
            fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 900,
            color: "#fbbf24", letterSpacing: "0.2em", textTransform: "uppercase",
            textShadow: "0 0 14px rgba(251,191,36,0.8)",
          }}>✦ MAX RANK ✦</span>
        </motion.div>
      )}
    </div>
  );
}
