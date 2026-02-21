/**
 * POST /api/games/ttt/move
 *
 * Client sends ONLY: { sessionId, playerCell }
 * Server does everything else:
 *   1. Loads its own board from DB
 *   2. Validates the player's move
 *   3. Checks if player won / drew
 *   4. Runs server-side minimax AI
 *   5. Checks if AI won / drew
 *   6. Saves updated board back to DB
 *   7. Returns new board + status + aiCell for animation
 *
 * Nothing the client sends can affect the game outcome.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

type Cell = "X" | "O" | null;
const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWinner(b: Cell[]): "X" | "O" | "DRAW" | null {
  for (const [a,c,d] of WINS) if (b[a] && b[a]===b[c] && b[a]===b[d]) return b[a] as "X"|"O";
  return b.includes(null) ? null : "DRAW";
}

function minimax(b: Cell[], isMax: boolean, depth=0): number {
  const w = checkWinner(b);
  if (w==="O") return 10-depth;
  if (w==="X") return depth-10;
  if (w==="DRAW") return 0;
  const scores: number[] = [];
  b.forEach((c,i) => { if (!c) { const n=[...b] as Cell[]; n[i]=isMax?"O":"X"; scores.push(minimax(n,!isMax,depth+1)); } });
  return isMax ? Math.max(...scores) : Math.min(...scores);
}

const AI_SKILL: Record<string,number> = { EASY:0.1, MEDIUM:0.6, HARD:1.0 };

function aiMove(b: Cell[], diff: string): number {
  const empty = b.map((c,i)=>c===null?i:-1).filter(i=>i>=0);
  if (Math.random() >= AI_SKILL[diff]) return empty[Math.floor(Math.random()*empty.length)];
  let best=-Infinity, move=-1;
  empty.forEach(i => { const n=[...b] as Cell[]; n[i]="O"; const s=minimax(n,false); if(s>best){best=s;move=i;} });
  return move;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let sessionId: string, playerCell: number;
  try {
    const body = await req.json();
    ({ sessionId, playerCell } = z.object({ sessionId: z.string().cuid(), playerCell: z.number().int().min(0).max(8) }).parse(body));
  } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const game = await db.ticTacToeSession.findUnique({ where: { id: sessionId } });
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
  if (game.userId !== session.user.id) return NextResponse.json({ error: "Not your game" }, { status: 403 });
  if (game.finished) return NextResponse.json({ error: "Game already finished" }, { status: 409 });

  const board = JSON.parse(game.board) as Cell[];

  if (board[playerCell] !== null)
    return NextResponse.json({ error: "Cell already occupied" }, { status: 400 });

  // ── Player move ───────────────────────────────────────────────────────────
  board[playerCell] = "X";
  const afterPlayer = checkWinner(board);

  if (afterPlayer === "X" || afterPlayer === "DRAW") {
    const result = afterPlayer === "X" ? "WIN" : "DRAW";
    await db.ticTacToeSession.update({
      where: { id: sessionId },
      data:  { board: JSON.stringify(board), result: result as any, finished: true, finishedAt: new Date() },
    });
    return NextResponse.json({ success: true, board, aiCell: null, status: result === "WIN" ? "win" : "draw" });
  }

  // ── AI move ───────────────────────────────────────────────────────────────
  const ai = aiMove(board, game.difficulty);
  board[ai] = "O";
  const afterAi = checkWinner(board);
  const finished = afterAi !== null;
  const result = afterAi === "O" ? "LOSE" : afterAi === "DRAW" ? "DRAW" : null;

  await db.ticTacToeSession.update({
    where: { id: sessionId },
    data: {
      board:      JSON.stringify(board),
      aiLastCell: ai,
      result:     result as any ?? undefined,
      finished,
      finishedAt: finished ? new Date() : undefined,
    },
  });

  const status = afterAi === "O" ? "lose" : afterAi === "DRAW" ? "draw" : "ongoing";
  return NextResponse.json({ success: true, board, aiCell: ai, status });
}
