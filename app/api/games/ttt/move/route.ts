/**
 * POST /api/games/ttt/move
 *
 * Client sends ONLY: { sessionId, playerCell }
 * Server does everything:
 *   1. Loads its own board from DB
 *   2. Validates the player's move
 *   3. Checks if player won / drew
 *   4. Runs server-side minimax AI
 *   5. Checks if AI won / drew
 *   6. Saves updated board back to DB
 *   7. Returns new board + status + aiCell for animation
 *
 * When the game ends (win / lose / draw), this route ALSO:
 *   - Computes score + XP server-side
 *   - Writes TicTacToeGame record + leaderboard + UserLevel in one transaction
 *   - Stamps savedAt so /finish is just a read — it cannot award anything
 */
import { NextResponse }                    from "next/server";
import { db }                              from "@/lib/db";
import { getSession }                      from "@/lib/auth";
import { calcRank, XP_TABLE, SCORE_TABLE } from "@/lib/game-utils";
import { z }                               from "zod";

type Cell = "X" | "O" | null;
const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWinner(b: Cell[]): "X" | "O" | "DRAW" | null {
  for (const [a,c,d] of WINS) if (b[a] && b[a]===b[c] && b[a]===b[d]) return b[a] as "X"|"O";
  return b.includes(null) ? null : "DRAW";
}

function minimax(b: Cell[], isMax: boolean, depth = 0): number {
  const w = checkWinner(b);
  if (w === "O")    return 10 - depth;
  if (w === "X")    return depth - 10;
  if (w === "DRAW") return 0;
  const scores: number[] = [];
  b.forEach((c, i) => {
    if (!c) { const n = [...b] as Cell[]; n[i] = isMax ? "O" : "X"; scores.push(minimax(n, !isMax, depth + 1)); }
  });
  return isMax ? Math.max(...scores) : Math.min(...scores);
}

const AI_SKILL: Record<string, number> = { EASY: 0.1, MEDIUM: 0.6, HARD: 1.0 };

function aiMove(b: Cell[], diff: string): number {
  const empty = b.map((c, i) => c === null ? i : -1).filter(i => i >= 0);
  if (Math.random() >= AI_SKILL[diff]) return empty[Math.floor(Math.random() * empty.length)];
  let best = -Infinity, move = -1;
  empty.forEach(i => { const n = [...b] as Cell[]; n[i] = "O"; const s = minimax(n, false); if (s > best) { best = s; move = i; } });
  return move;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  let sessionId: string, playerCell: number;
  try {
    ({ sessionId, playerCell } = z.object({
      sessionId:  z.string().cuid(),
      playerCell: z.number().int().min(0).max(8),
    }).parse(await req.json()));
  } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const game = await db.ticTacToeSession.findUnique({ where: { id: sessionId } });
  if (!game)                  return NextResponse.json({ error: "Game not found" },       { status: 404 });
  if (game.userId !== userId) return NextResponse.json({ error: "Not your game" },        { status: 403 });
  if (game.finished)          return NextResponse.json({ error: "Game already finished" }, { status: 409 });

  const board = JSON.parse(game.board) as Cell[];
  if (board[playerCell] !== null)
    return NextResponse.json({ error: "Cell already occupied" }, { status: 400 });

  // ── Player move ───────────────────────────────────────────────────────────
  board[playerCell] = "X";
  const afterPlayer = checkWinner(board);

  if (afterPlayer === "X" || afterPlayer === "DRAW") {
    const result = afterPlayer === "X" ? "WIN" : "DRAW";
    const { score } = await saveGameEnd(userId, sessionId, board, null, result as "WIN"|"DRAW", game);
    return NextResponse.json({ success: true, board, aiCell: null, status: result === "WIN" ? "win" : "draw", score });
  }

  // ── AI move ───────────────────────────────────────────────────────────────
  const ai = aiMove(board, game.difficulty);
  board[ai] = "O";
  const afterAi = checkWinner(board);

  if (afterAi !== null) {
    const result = afterAi === "O" ? "LOSE" : "DRAW";
    const { score } = await saveGameEnd(userId, sessionId, board, ai, result as "LOSE"|"DRAW", game);
    return NextResponse.json({ success: true, board, aiCell: ai, status: result === "LOSE" ? "lose" : "draw", score });
  }

  // ── Game still ongoing — just update board ────────────────────────────────
  await db.ticTacToeSession.update({
    where: { id: sessionId },
    data:  { board: JSON.stringify(board), aiLastCell: ai },
  });
  return NextResponse.json({ success: true, board, aiCell: ai, status: "ongoing" });
}

// ── Save everything when game ends ────────────────────────────────────────────
async function saveGameEnd(
  userId:    string,
  sessionId: string,
  board:     Cell[],
  aiCell:    number | null,
  result:    "WIN" | "LOSE" | "DRAW",
  game:      { startedAt: Date; difficulty: string },
) {
  const finishedAt  = new Date();
  const duration    = Math.max(Math.round((finishedAt.getTime() - new Date(game.startedAt).getTime()) / 1000), 1);
  const difficulty  = game.difficulty as "EASY" | "MEDIUM" | "HARD";
  const score       = SCORE_TABLE.TIC_TAC_TOE[result][difficulty];
  const xpEarned    = XP_TABLE.TIC_TAC_TOE[result][difficulty];

  let newXp = 0, newRank = "ROOKIE";

  try {
    await db.$transaction(async (tx) => {
      // 1. Lock + finalise session atomically
      const locked = await tx.ticTacToeSession.updateMany({
        where: { id: sessionId, finished: false, savedAt: null },
        data:  {
          board:      JSON.stringify(board),
          aiLastCell: aiCell ?? undefined,
          result:     result as any,
          finished:   true,
          finishedAt,
          savedAt:    finishedAt,
          score,
          xpEarned,
        },
      });
      if (locked.count === 0) throw Object.assign(new Error("dup"), { code: "DUP" });

      // 2. Permanent game record
      await tx.ticTacToeGame.create({
        data: { userId, result: result as any, difficulty, score, xpEarned, duration },
      });

      // 3. Leaderboard — update only if new score is higher
      const lb = await tx.leaderboard.findUnique({
        where: { userId_gameType_difficulty: { userId, gameType: "TIC_TAC_TOE", difficulty } },
      });
      if (!lb || score > lb.highScore) {
        await tx.leaderboard.upsert({
          where:  { userId_gameType_difficulty: { userId, gameType: "TIC_TAC_TOE", difficulty } },
          create: { userId, gameType: "TIC_TAC_TOE", difficulty, highScore: score },
          update: { highScore: score },
        });
      }

      // 4. XP + rank
      const cur = await tx.userLevel.findUnique({ where: { userId } });
      newXp   = (cur?.xp ?? 0) + xpEarned;
      newRank = calcRank(newXp);
      await tx.userLevel.upsert({
        where:  { userId },
        create: { userId, xp: newXp, rank: newRank as any },
        update: { xp: newXp, rank: newRank as any },
      });

      // 5. Touch lastLoginAt
      await tx.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    });
  } catch (err: any) {
    if (err?.code !== "DUP") {
      console.error("[ttt/move] saveGameEnd tx failed", err);
      // Don't throw — still return the game result to client, just log the save failure
    }
  }

  return { score, xpEarned, newXp, newRank };
}
