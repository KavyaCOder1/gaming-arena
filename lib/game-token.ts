/**
 * Game Token Security
 * -------------------
 * When a player starts a game, the server issues a signed JWT containing:
 *   userId, gameType, difficulty, sessionId (UUID), issuedAt
 *
 * The token is valid for 2 hours. When saving a result, the client
 * sends the token back. The server:
 *   1. Verifies the signature (cannot be forged)
 *   2. Checks the userId matches the authenticated session (no impersonation)
 *   3. Marks the sessionId as used (no replay — each token saves exactly once)
 *   4. Calculates score/XP server-side from the token data (client sends NO score)
 *
 * This means nobody can call /api/games/save-score to farm XP without having
 * first legitimately started a game through /api/games/start.
 */

import { SignJWT, jwtVerify } from "jose";

const RAW_SECRET =
  process.env.GAME_TOKEN_SECRET ||
  process.env.JWT_SECRET ||
  "change-me-game-token-secret";

const SECRET = new TextEncoder().encode(RAW_SECRET);

export interface GameTokenPayload {
  userId:     string;
  gameType:   "TIC_TAC_TOE" | "WORD_SEARCH";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  sessionId:  string;   // UUID — burned after one use
  issuedAt:   number;   // ms timestamp
}

export async function issueGameToken(
  payload: Omit<GameTokenPayload, "issuedAt">
): Promise<string> {
  return new SignJWT({ ...payload, issuedAt: Date.now() })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("2h")
    .sign(SECRET);
}

export async function verifyGameToken(
  token: string
): Promise<GameTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as GameTokenPayload;
  } catch {
    return null;
  }
}
