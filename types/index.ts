import { User, GameHistory, Leaderboard } from "@prisma/client";

export interface AuthUser {
    id: string;
    username: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export type GameHistoryWithUser = GameHistory & { user: { username: string } };
export type LeaderboardWithUser = Leaderboard & { user: { username: string } };

export interface GameState {
    score: number;
    isGameOver: boolean;
    isPlaying: boolean;
    level: "EASY" | "MEDIUM" | "HARD";
}
