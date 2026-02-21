export interface AuthUser {
  id: string;         // 6-7 digit numeric string
  username: string;
}

export type GameType       = "TIC_TAC_TOE" | "WORD_SEARCH" | "MEMORY" | "PACMAN";
export type GameDifficulty = "EASY" | "MEDIUM" | "HARD";
export type GameResult     = "WIN" | "LOSE" | "DRAW";
export type UserRank       = "ROOKIE" | "VETERAN" | "ELITE" | "LEGEND";

// ─── Rank / XP ────────────────────────────────────────────────────────────────
export interface RankInfo {
  label:       string;
  minXp:       number;
  maxXp:       number | null;
  color:       string;
  glowColor:   string;
  icon:        string;
  description: string;
  perks:       string[];
}

export interface UserLevelData {
  xp:            number;
  rank:          UserRank;
  rankInfo:      RankInfo;
  xpToNextRank:  number;
  progressInRank: { current: number; total: number; pct: number };
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  user:     { id: string; username: string };
  totalXp:  number;
  matches:  number;
}

// Legacy alias used in existing components
export type LeaderboardWithUser = LeaderboardEntry;

// ─── Game records ─────────────────────────────────────────────────────────────
export interface TicTacToeRecord {
  id:         string;
  userId:     string;
  result:     GameResult;
  difficulty: GameDifficulty;
  score:      number;
  xpEarned:   number;
  duration:   number;
  createdAt:  string;
}

export interface WordSearchRecord {
  id:         string;
  userId:     string;
  difficulty: GameDifficulty;
  score:      number;
  xpEarned:   number;
  wordsFound: number;
  totalWords: number;
  completed:  boolean;
  duration:   number;
  createdAt:  string;
}

// Generic game history item for the old GameHistoryTable component
export interface GameHistoryWithUser {
  id:         string;
  userId:     string;
  gameType?:  GameType;
  difficulty: GameDifficulty;
  score:      number;
  duration:   number;
  createdAt:  string;
  user:       { username: string };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?:   T;
  error?:  string;
}
