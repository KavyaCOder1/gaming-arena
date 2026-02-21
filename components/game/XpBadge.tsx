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
    bar:   "linear-gradient(90deg,#64748b,#94a3b8)",
    icon:  "deployed_code",          // Material Symbols name
    fontVariation: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
  },
  VETERAN: {
    color: "#13b6ec",
    glow:  "rgba(19,182,236,0.55)",
    bar:   "linear-gradient(90deg,#0ea5e9,#13b6ec)",
    icon:  "shield",
    fontVariation: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
  },
  ELITE:   {
    color: "#ff00ff",
    glow:  "rgba(255,0,255,0.55)",
    bar:   "linear-gradient(90deg,#d946ef,#ff00ff)",
    icon:  "pentagon",
    fontVariation: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
  },
  LEGEND:  {
    color: "#fbbf24",
    glow:  "rgba(251,191,36,0.65)",
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
  if (variant === "compact") {
    return (
      <div style={{ position: "relative", display: "inline-flex" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 10px 4px 6px", borderRadius: 40,
          background: "rgba(15,23,42,0.9)",
          border: `1px solid ${rc.color}45`,
          boxShadow: `0 0 10px ${rc.glow}`,
          cursor: "default", userSelect: "none",
        }}>
          {/* Material Symbol rank icon */}
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 17,
              color: rc.color,
              filter: `drop-shadow(0 0 5px ${rc.glow})`,
              fontVariationSettings: rc.fontVariation,
              lineHeight: 1,
              userSelect: "none",
            }}
          >{rc.icon}</span>
          <span style={{
            fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 900,
            color: rc.color, letterSpacing: "0.14em", textTransform: "uppercase",
          }}>{rank}</span>
          <span style={{
            fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700,
            color: "rgba(255,255,255,0.28)", letterSpacing: "0.06em",
          }}>{xp.toLocaleString()} XP</span>
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

  // ── EXPANDED card (sidebar) ───────────────────────────────────────────────
  return (
    <div style={{
      background: "rgba(12,20,40,0.92)", backdropFilter: "blur(16px)",
      border: `1px solid ${rc.color}30`, borderRadius: 16,
      padding: "16px 18px",
      boxShadow: `0 0 22px ${rc.glow}`,
    }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 50, height: 50, borderRadius: "50%",
          background: `${rc.color}12`, border: `2px solid ${rc.color}55`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 20px ${rc.glow}`, flexShrink: 0,
        }}>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 28, color: rc.color,
              filter: `drop-shadow(0 0 8px ${rc.glow})`,
              fontVariationSettings: rc.fontVariation,
              lineHeight: 1, userSelect: "none",
            }}
          >{rc.icon}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Orbitron',sans-serif", fontSize: 15, fontWeight: 900,
            color: rc.color, textTransform: "uppercase", letterSpacing: "0.1em",
            ...(rank === "ELITE"  ? { textShadow: "2px 0 #ff00ff, -2px 0 #13b6ec" }           : {}),
            ...(rank === "LEGEND" ? { textShadow: "0 0 16px rgba(251,191,36,0.9)" }            : {}),
          }}>{rank}</div>
          <div style={{
            fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 700,
            color: "rgba(255,255,255,0.7)", marginTop: 3,
            letterSpacing: "0.06em",
          }}>{xp.toLocaleString()} <span style={{ color: rc.color, opacity: 0.9 }}>XP</span></div>
        </div>
      </div>

      {/* Progress bar */}
      {rank !== "LEGEND" ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{
              fontFamily: "'Orbitron',sans-serif", fontSize: 8,
              color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600,
            }}>XP PROGRESS</span>
            <span style={{
              fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: rc.color, fontWeight: 700,
            }}>{xpToNextRank.toLocaleString()} to next</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressInRank?.pct ?? 0}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              style={{
                height: "100%", background: rc.bar, borderRadius: 3,
                boxShadow: `0 0 8px ${rc.glow}`,
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>
              {progressInRank?.current?.toLocaleString() ?? 0}
            </span>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>
              {progressInRank?.total?.toLocaleString() ?? 0}
            </span>
          </div>
        </>
      ) : (
        <motion.div
          animate={{ opacity: [0.65, 1, 0.65] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ textAlign: "center", paddingTop: 4 }}
        >
          <span style={{
            fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 900,
            color: "#fbbf24", letterSpacing: "0.22em", textTransform: "uppercase",
            textShadow: "0 0 14px rgba(251,191,36,0.9)",
          }}>✦ MAX RANK ACHIEVED ✦</span>
        </motion.div>
      )}
    </div>
  );
}
