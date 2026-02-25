"use client";

import { motion } from "framer-motion";
import { LeaderboardEntry } from "@/types";
import { Trophy, Crown, Medal, Sparkles } from "lucide-react";

interface Props {
  entries:         LeaderboardEntry[];
  showDifficulty?: boolean; // kept for API compat — no longer used
  matchesLabel?:   string;  // override the "Matches" column header
}

function rankMeta(rank: number) {
  if (rank === 1) return { color: "#f59e0b", Icon: Crown,  bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.22)"  };
  if (rank === 2) return { color: "#94a3b8", Icon: Medal,  bg: "rgba(148,163,184,0.07)", border: "rgba(148,163,184,0.18)" };
  if (rank === 3) return { color: "#b45309", Icon: Medal,  bg: "rgba(180,83,9,0.07)",    border: "rgba(180,83,9,0.18)"    };
  return           { color: "#334155",      Icon: null,   bg: "transparent",             border: "transparent"            };
}

export function LeaderboardTable({ entries, matchesLabel = "Matches" }: Props) {
  if (!entries || entries.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <Trophy style={{ width: 36, height: 36, color: "#1e293b" }} />
        <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.25em", textTransform: "uppercase" }}>No Records Yet</p>
        <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: "#475569", fontWeight: 500 }}>Be the first to claim the throne!</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {["Rank", "Player", "Total XP", matchesLabel].map(h => (
              <th key={h} style={{ padding: "10px 18px", textAlign: h === "Total XP" || h === matchesLabel ? "right" : "left", fontFamily: "'Orbitron', sans-serif", fontSize: 7, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.28em", textTransform: "uppercase", background: "rgba(255,255,255,0.015)", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => {
            const pos  = i + 1;
            const { color, Icon, bg, border } = rankMeta(pos);
            const isTop3 = pos <= 3;
            const xp      = entry.totalXp ?? 0;
            const matches = entry.matches  ?? 0;

            return (
              <motion.tr key={entry.user.username + i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.035 }}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", background: isTop3 ? bg : "transparent", transition: "background 0.15s", cursor: "default" }}
                onMouseEnter={e  => { (e.currentTarget as HTMLElement).style.background = isTop3 ? bg : "rgba(34,211,238,0.025)"; }}
                onMouseLeave={e  => { (e.currentTarget as HTMLElement).style.background = isTop3 ? bg : "transparent"; }}
              >
                {/* Rank badge */}
                <td style={{ padding: "14px 18px", width: 70 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: isTop3 ? `${color}12` : "rgba(255,255,255,0.025)", border: `1px solid ${isTop3 ? border : "rgba(255,255,255,0.05)"}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isTop3 ? `0 0 14px ${color}28` : "none" }}>
                    {Icon
                      ? <Icon style={{ width: 16, height: 16, color, filter: `drop-shadow(0 0 4px ${color}80)` }} />
                      : <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 700, color: "#64748b" }}>{String(pos).padStart(2, "0")}</span>
                    }
                  </div>
                </td>

                {/* Player */}
                <td style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg, #6366f1, #22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isTop3 ? `0 0 10px ${color}35` : "none" }}>
                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 900, color: "#fff" }}>
                          {entry.user.username.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      {isTop3 && (
                        <div style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: "50%", background: color, border: "2px solid rgba(10,15,35,0.98)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Sparkles style={{ width: 7, height: 7, color: "#fff" }} />
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, color: isTop3 ? "#f8fafc" : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {entry.user.username}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Total XP */}
                <td style={{ padding: "14px 18px", textAlign: "right" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, fontWeight: 900, color: isTop3 ? color : "#22d3ee", filter: isTop3 ? `drop-shadow(0 0 8px ${color}60)` : "none", lineHeight: 1 }}>
                      {xp.toLocaleString()}
                    </span>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7, fontWeight: 700, color: "#64748b", letterSpacing: "0.25em", textTransform: "uppercase", marginTop: 2 }}>XP</span>
                  </div>
                </td>

                {/* Matches */}
                <td style={{ padding: "14px 18px", textAlign: "right" }}>
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 700, color: isTop3 ? "#f8fafc" : "#475569" }}>
                    {matches}
                  </span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ padding: "12px 18px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7, fontWeight: 700, color: "#475569", letterSpacing: "0.3em", textTransform: "uppercase" }}>End of Rankings</span>
        <div style={{ display: "flex", gap: 5 }}>
          {["rgba(99,102,241,0.5)", "rgba(34,211,238,0.35)", "rgba(99,102,241,0.2)"].map((bg, i) => (
            <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: bg, animation: `lbDot 1.5s infinite ${i * 0.5}s` }} />
          ))}
        </div>
      </div>
      <style>{`@keyframes lbDot { 0%,100%{opacity:1} 50%{opacity:0.15} }`}</style>
    </div>
  );
}
