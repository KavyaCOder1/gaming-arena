import { db } from "@/lib/db";

// ─── User ID generation ────────────────────────────────────────────────────────
export async function generateUserId(): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const id = String(Math.floor(100000 + Math.random() * 9900000)); // 6-7 digits
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) return id;
  }
  throw new Error("Could not generate unique user ID");
}

// ─── Rank System (matches ranks.zip design) ───────────────────────────────────
export type UserRank = "ROOKIE" | "VETERAN" | "ELITE" | "LEGEND";

export const RANKS: Record<UserRank, {
  label: string;
  minXp: number;
  maxXp: number | null;
  color: string;
  glowColor: string;
  icon: string;          // Material Symbol name
  description: string;
  perks: string[];
}> = {
  ROOKIE: {
    label: "ROOKIE",
    minXp: 0,
    maxXp: 1000,
    color: "#94a3b8",
    glowColor: "rgba(148,163,184,0.3)",
    icon: "deployed_code",
    description: "Dim steel-grey badge with simple geometric lines and a subtle core glow.",
    perks: ["Standard Matchmaking", "Starter Pack"],
  },
  VETERAN: {
    label: "VETERAN",
    minXp: 1001,
    maxXp: 5000,
    color: "#13b6ec",
    glowColor: "rgba(19,182,236,0.5)",
    icon: "shield",
    description: "Sharp electric-blue shield with a double-layered glass effect and pulsing core.",
    perks: ["Priority Queuing", "Veteran Badge Icon"],
  },
  ELITE: {
    label: "ELITE",
    minXp: 5001,
    maxXp: 15000,
    color: "#ff00ff",
    glowColor: "rgba(255,0,255,0.5)",
    icon: "pentagon",
    description: "Complex magenta prism icon with digital 'glitch' particles floating around.",
    perks: ["Tournament Access", "Glitch Avatar Frame"],
  },
  LEGEND: {
    label: "LEGEND",
    minXp: 15001,
    maxXp: null,
    color: "#fbbf24",
    glowColor: "rgba(251,191,36,0.6)",
    icon: "crown",
    description: "Golden crown with a white Singularity core and intense light-ray effects.",
    perks: ["Pro Circuit Access", "Legendary Skin Set"],
  },
};

export function calcRank(xp: number): UserRank {
  if (xp >= 15001) return "LEGEND";
  if (xp >= 5001) return "ELITE";
  if (xp >= 1001) return "VETERAN";
  return "ROOKIE";
}

export function xpForNextRank(xp: number): number {
  if (xp >= 15001) return 0;   // maxed out
  if (xp >= 5001) return 15001 - xp;
  if (xp >= 1001) return 5001 - xp;
  return 1001 - xp;
}

export function xpProgressInRank(xp: number): { current: number; total: number; pct: number } {
  if (xp >= 15001) return { current: xp - 15001, total: 0, pct: 100 };
  if (xp >= 5001) return { current: xp - 5001, total: 9999, pct: Math.round(((xp - 5001) / 9999) * 100) };
  if (xp >= 1001) return { current: xp - 1001, total: 3999, pct: Math.round(((xp - 1001) / 3999) * 100) };
  return { current: xp, total: 1000, pct: Math.round((xp / 1000) * 100) };
}

// ─── XP rewards per game ──────────────────────────────────────────────────────
export const XP_TABLE = {
  TIC_TAC_TOE: {
    WIN: { EASY: 20, MEDIUM: 50, HARD: 100 },
    DRAW: { EASY: 0, MEDIUM: 0, HARD: 10 },
    LOSE: { EASY: 0, MEDIUM: 0, HARD: 0 },
  },
  WORD_SEARCH: {
    COMPLETE: { EASY: 50, MEDIUM: 100, HARD: 250 },
  },
  MEMORY: {
    COMPLETE: { EASY: 50, MEDIUM: 150, HARD: 350 },
    // Bonus XP per move under par (calculated server-side)
  },
} as const;

export const MEMORY_PAR_MOVES = { EASY: 20, MEDIUM: 40, HARD: 80 } as const;

// ─── Score table (leaderboard values) ───────────────────────────────────────
export const SCORE_TABLE = {
  TIC_TAC_TOE: {
    WIN: { EASY: 100, MEDIUM: 250, HARD: 500 },
    DRAW: { EASY: 30, MEDIUM: 75, HARD: 150 },
    LOSE: { EASY: 0, MEDIUM: 0, HARD: 0 },
  },
  // Word Search has no per-word score — leaderboard tracks xpEarned directly
} as const;
