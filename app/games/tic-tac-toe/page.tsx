"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Trophy, Crown, Medal, RefreshCw, Zap, Cpu, Clock, User, Grid3X3
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";

type Cell = "X" | "O" | null;
type Board = Cell[];
type Difficulty = "EASY" | "MEDIUM" | "HARD";
type GameStatus = "idle" | "playing" | "win" | "lose" | "draw";

const AI_SKILL = { EASY: 0.1, MEDIUM: 0.6, HARD: 1.0 };
const SCORE_MAP = { win: { EASY: 100, MEDIUM: 200, HARD: 400 }, draw: { EASY: 30, MEDIUM: 50, HARD: 80 } };
const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWinner(board: Board): { winner: Cell; line: number[] | null } {
  for (const [a, b, c] of WINS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return { winner: board[a], line: [a, b, c] };
  }
  return { winner: null, line: null };
}

function minimax(board: Board, isMax: boolean, depth = 0): number {
  const { winner } = checkWinner(board);
  if (winner === "O") return 10 - depth;
  if (winner === "X") return depth - 10;
  if (!board.includes(null)) return 0;
  const scores: number[] = [];
  board.forEach((cell, i) => {
    if (!cell) {
      const nb = [...board]; nb[i] = isMax ? "O" : "X";
      scores.push(minimax(nb, !isMax, depth + 1));
    }
  });
  return isMax ? Math.max(...scores) : Math.min(...scores);
}

function bestAIMove(board: Board, difficulty: Difficulty): number {
  const empty = board.map((c, i) => c === null ? i : -1).filter(i => i >= 0);
  const random = () => empty[Math.floor(Math.random() * empty.length)];
  const optimal = () => {
    let best = -Infinity, move = -1;
    empty.forEach(i => {
      const nb = [...board]; nb[i] = "O";
      const score = minimax(nb, false);
      if (score > best) { best = score; move = i; }
    });
    return move;
  };
  return Math.random() < AI_SKILL[difficulty] ? optimal() : random();
}

interface GameRecord {
  id: string; result: "WIN" | "LOSE" | "DRAW"; difficulty: Difficulty;
  score: number; duration: number; date: Date;
}
interface LBEntry { user: { username: string }; highScore: number; }

const DIFF_CONFIG = {
  EASY:   { label: "ROOKIE",  desc: "AI plays randomly",  color: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.4)",  glow: "rgba(16,185,129,0.25)" },
  MEDIUM: { label: "VETERAN", desc: "AI plays smart 60%", color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.4)",  glow: "rgba(245,158,11,0.25)" },
  HARD:   { label: "ELITE",   desc: "Unbeatable AI",      color: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.4)",   glow: "rgba(239,68,68,0.25)"  },
};

export default function TicTacToePage() {
  const { user } = useAuthStore();

  const [board, setBoard]             = useState<Board>(Array(9).fill(null));
  const [isXTurn, setIsXTurn]         = useState(true);
  const [difficulty, setDifficulty]   = useState<Difficulty>("MEDIUM");
  const [status, setStatus]           = useState<GameStatus>("idle");
  const [winLine, setWinLine]         = useState<number[] | null>(null);
  const [score, setScore]             = useState(0);
  const [totalScore, setTotalScore]   = useState(0);
  const [history, setHistory]         = useState<GameRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<LBEntry[]>([]);
  const [lbLoading, setLbLoading]     = useState(true);
  const [aiThinking, setAiThinking]   = useState(false);
  const [stats, setStats]             = useState({ wins: 0, losses: 0, draws: 0 });
  const [gameTime, setGameTime]       = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (status === "playing") {
      startRef.current = Date.now() - gameTime * 1000;
      timerRef.current = setInterval(() => setGameTime(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  useEffect(() => {
    const fetchLb = async () => {
      setLbLoading(true);
      try {
        const res = await fetch("/api/leaderboard?gameType=TIC_TAC_TOE");
        const json = await res.json();
        if (json.success) setLeaderboard(json.data.slice(0, 8));
      } catch (e) { console.error(e); }
      finally { setLbLoading(false); }
    };
    fetchLb();
  }, []);

  const saveScore = useCallback(async (earned: number, result: "WIN" | "LOSE" | "DRAW", dur: number) => {
    if (!user) return;
    try {
      await fetch("/api/games/save-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameType: "TIC_TAC_TOE", score: earned, level: difficulty, duration: dur }),
      });
    } catch (e) { console.error(e); }
    setHistory(prev => [{ id: crypto.randomUUID(), result, difficulty, score: earned, duration: dur, date: new Date() }, ...prev].slice(0, 20));
  }, [user, difficulty]);

  const startGame = () => {
    setBoard(Array(9).fill(null)); setIsXTurn(true);
    setStatus("playing"); setWinLine(null); setScore(0); setGameTime(0);
  };
  const resetGame = () => {
    setBoard(Array(9).fill(null)); setIsXTurn(true);
    setStatus("idle"); setWinLine(null); setScore(0); setGameTime(0);
  };

  const handleClick = useCallback((idx: number) => {
    if (status !== "playing" || !isXTurn || board[idx] || aiThinking) return;
    const nb = [...board]; nb[idx] = "X";
    setBoard(nb); setIsXTurn(false);
    const { winner, line } = checkWinner(nb);
    if (winner === "X") {
      const dur = Math.floor((Date.now() - startRef.current) / 1000);
      const pts = SCORE_MAP.win[difficulty];
      setWinLine(line); setStatus("win"); setScore(pts);
      setSessionScore(s => s + pts); setTotalScore(t => t + pts);
      setStats(s => ({ ...s, wins: s.wins + 1 }));
      saveScore(pts, "WIN", dur); return;
    }
    if (!nb.includes(null)) {
      const dur = Math.floor((Date.now() - startRef.current) / 1000);
      const pts = SCORE_MAP.draw[difficulty];
      setStatus("draw"); setScore(pts);
      setSessionScore(s => s + pts); setTotalScore(t => t + pts);
      setStats(s => ({ ...s, draws: s.draws + 1 }));
      saveScore(pts, "DRAW", dur);
    }
  }, [board, status, isXTurn, aiThinking, difficulty, saveScore]);

  useEffect(() => {
    if (status !== "playing" || isXTurn) return;
    setAiThinking(true);
    const t = setTimeout(() => {
      const move = bestAIMove(board, difficulty);
      const nb = [...board]; nb[move] = "O";
      setBoard(nb); setIsXTurn(true); setAiThinking(false);
      const { winner, line } = checkWinner(nb);
      if (winner === "O") {
        const dur = Math.floor((Date.now() - startRef.current) / 1000);
        setWinLine(line); setStatus("lose"); setScore(0);
        setStats(s => ({ ...s, losses: s.losses + 1 }));
        saveScore(0, "LOSE", dur); return;
      }
      if (!nb.includes(null)) {
        const dur = Math.floor((Date.now() - startRef.current) / 1000);
        const pts = SCORE_MAP.draw[difficulty];
        setStatus("draw"); setScore(pts);
        setSessionScore(s => s + pts); setTotalScore(t => t + pts);
        setStats(s => ({ ...s, draws: s.draws + 1 }));
        saveScore(pts, "DRAW", dur);
      }
    }, 300 + Math.random() * 400);
    return () => clearTimeout(t);
  }, [isXTurn, status, board, difficulty, saveScore]);

  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;

  // Status banner config
  const msgConfig = {
    idle:    { title: "READY?",        sub: "Choose difficulty & press START", color: "#22d3ee" },
    win:     { title: "VICTORY!",      sub: `+${score} XP earned`,             color: "#10b981" },
    lose:    { title: "DEFEATED",      sub: "AI won this round",               color: "#ef4444" },
    draw:    { title: "IT'S A DRAW!",  sub: `+${score} XP — well played`,      color: "#f59e0b" },
    playing: isXTurn && !aiThinking
      ? { title: "YOUR TURN",     sub: "Click a cell to play",    color: "#22d3ee" }
      : { title: "AI THINKING…",  sub: "Processing strategy…",    color: "#a78bfa" },
  };
  const msg = msgConfig[status] ?? msgConfig.idle;

  // Board cell styles based on game state
  const getCellStyle = (i: number, cell: Cell) => {
    const isWin  = winLine?.includes(i) && status === "win";
    const isLose = winLine?.includes(i) && status === "lose";
    const isDraw = status === "draw";
    if (isWin)  return { bg: "rgba(16,185,129,0.18)",  border: "2px solid #10b981", shadow: "0 0 22px rgba(16,185,129,0.35)" };
    if (isLose) return { bg: "rgba(239,68,68,0.18)",   border: "2px solid #ef4444", shadow: "0 0 22px rgba(239,68,68,0.35)" };
    if (isDraw) return { bg: "rgba(245,158,11,0.14)",  border: "2px solid rgba(245,158,11,0.6)", shadow: "0 0 16px rgba(245,158,11,0.25)" };
    if (cell === "X") return { bg: "rgba(34,211,238,0.05)",   border: "1px solid rgba(34,211,238,0.25)",   shadow: "none" };
    if (cell === "O") return { bg: "rgba(167,139,250,0.05)",  border: "1px solid rgba(167,139,250,0.25)",  shadow: "none" };
    return { bg: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", shadow: "none" };
  };

  const rankStyle = (i: number) => {
    if (i === 0) return { color: "#f59e0b", Icon: Crown };
    if (i === 1) return { color: "#94a3b8", Icon: Medal };
    if (i === 2) return { color: "#b45309", Icon: Medal };
    return { color: "#475569", Icon: null };
  };

  const cfg = DIFF_CONFIG[difficulty];

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 20, width: "100%", boxSizing: "border-box" }}>

      {/* ── RESULT FLASH OVERLAYS ─────────────────────────────────────────── */}
      <AnimatePresence>
        {status === "win" && (
          <motion.div key="win-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.28, 0, 0.22, 0, 0.12] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, times: [0, 0.1, 0.3, 0.55, 0.75, 1] }}
            style={{ position: "fixed", inset: 0, zIndex: 10, pointerEvents: "none",
              background: "radial-gradient(ellipse at center, rgba(16,185,129,0.55) 0%, transparent 65%)" }}
          />
        )}
        {status === "lose" && (
          <motion.div key="lose-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.32, 0, 0.25, 0, 0.1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0, times: [0, 0.1, 0.3, 0.5, 0.75, 1] }}
            style={{ position: "fixed", inset: 0, zIndex: 10, pointerEvents: "none",
              background: "radial-gradient(ellipse at center, rgba(239,68,68,0.55) 0%, transparent 65%)" }}
          />
        )}
        {status === "draw" && (
          <motion.div key="draw-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.18, 0, 0.18, 0, 0.12] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, times: [0, 0.15, 0.3, 0.5, 0.7, 1] }}
            style={{ position: "fixed", inset: 0, zIndex: 10, pointerEvents: "none",
              background: "radial-gradient(ellipse at center, rgba(245,158,11,0.35) 0%, transparent 70%)" }}
          />
        )}
      </AnimatePresence>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/games"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", marginBottom: 14, opacity: 0.7 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
        >
          <ArrowLeft style={{ width: 13, height: 13, color: "#22d3ee" }} />
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700, color: "#22d3ee", letterSpacing: "0.3em", textTransform: "uppercase" }}>BACK TO ARCADE</span>
        </Link>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(26px,5vw,50px)", fontWeight: 900, color: "#f8fafc", textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", lineHeight: 1, margin: 0 }}>
              TIC-TAC <span style={{ color: "#22d3ee", textShadow: "0 0 20px rgba(34,211,238,0.5)" }}>TOE</span>
            </h1>
            <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, color: "#334155", letterSpacing: "0.25em", textTransform: "uppercase", marginTop: 5 }}>STRATEGY ENGINE · v2.0 NEURAL AI</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: "#334155", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 3 }}>Session Score</div>
            <motion.div
              key={sessionScore}
              initial={{ scale: 1.3, color: "#fff" }}
              animate={{ scale: 1, color: "#f59e0b" }}
              style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 26, fontWeight: 900, filter: "drop-shadow(0 0 10px rgba(245,158,11,0.4))" }}
            >
              {sessionScore.toLocaleString()}
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── MAIN 3-COLUMN LAYOUT ──────────────────────────────────────────── */}
      <div className="ttt-layout" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

        {/* ═══ LEFT PANEL — stats only (no difficulty) ════════════════════ */}
        <div className="ttt-left" style={{ display: "flex", flexDirection: "column", gap: 10, width: 168, flexShrink: 0 }}>

          {/* W / L / D cards */}
          {([
            { label: "WINS",   value: stats.wins,   color: "#10b981", glow: "rgba(16,185,129,0.25)" },
            { label: "LOSSES", value: stats.losses, color: "#ef4444", glow: "rgba(239,68,68,0.25)"  },
            { label: "DRAWS",  value: stats.draws,  color: "#f59e0b", glow: "rgba(245,158,11,0.25)" },
          ] as const).map((s) => (
            <motion.div key={s.label}
              animate={
                (s.label === "WINS"   && status === "win")  ||
                (s.label === "LOSSES" && status === "lose") ||
                (s.label === "DRAWS"  && status === "draw")
                  ? { scale: [1, 1.06, 1], boxShadow: [`0 0 0px ${s.glow}`, `0 0 20px ${s.glow}`, `0 0 8px ${s.glow}`] }
                  : {}
              }
              transition={{ duration: 0.5 }}
              style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
            >
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700, color: "#334155", letterSpacing: "0.2em", textTransform: "uppercase" }}>{s.label}</span>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 24, fontWeight: 900, color: s.color, filter: `drop-shadow(0 0 6px ${s.color}80)` }}>{s.value}</span>
            </motion.div>
          ))}

          {/* Timer */}
          <div style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", border: "1px solid rgba(34,211,238,0.1)", borderRadius: 14, padding: "13px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <Clock style={{ width: 15, height: 15, color: "#22d3ee", flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: "#334155", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 2 }}>TIME</div>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 17, fontWeight: 900, color: "#f8fafc" }}>{fmt(gameTime)}</div>
            </div>
          </div>

          {/* Current mode badge */}
          <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 14, padding: "13px 16px", boxShadow: `0 0 14px ${cfg.glow}` }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7, color: "#475569", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>CURRENT MODE</div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, fontWeight: 900, color: cfg.color }}>{cfg.label}</div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 10, color: cfg.color + "99", marginTop: 2 }}>{cfg.desc}</div>
          </div>
        </div>

        {/* ═══ CENTER — game board ══════════════════════════════════════════ */}
        <div className="ttt-center" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>

          {/* STATUS BANNER */}
          <motion.div
            key={`${status}-${String(isXTurn)}`}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{
              width: "100%", maxWidth: 460,
              background: status === "win" ? "rgba(4,22,14,0.92)" : status === "lose" ? "rgba(22,4,4,0.92)" : status === "draw" ? "rgba(30,20,5,0.92)" : "rgba(15,23,42,0.85)",
              backdropFilter: "blur(16px)",
              border: `1px solid ${msg.color}50`,
              borderRadius: 14,
              padding: "13px 18px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              boxShadow: `0 0 24px ${msg.color}18`,
              position: "relative", overflow: "hidden",
            }}
          >
            {/* result banner shimmer */}
            {(status === "win" || status === "lose" || status === "draw") && (
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: status === "win" ? 1.2 : status === "lose" ? 1.0 : 1.5, repeat: Infinity, repeatDelay: status === "win" ? 0.4 : status === "lose" ? 0.3 : 0.8, ease: "linear" }}
                style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, transparent, ${ status === "win" ? "rgba(16,185,129,0.2)" : status === "lose" ? "rgba(239,68,68,0.18)" : "rgba(245,158,11,0.15)"}, transparent)`, pointerEvents: "none" }}
              />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
              <motion.div
                animate={
                  status === "win"  ? { scale: [1, 1.6, 0.8, 1.4, 1], backgroundColor: ["#10b981", "#34d399", "#10b981"] } :
                  status === "lose" ? { scale: [1, 1.6, 0.8, 1.4, 1], backgroundColor: ["#ef4444", "#f87171", "#ef4444"] } :
                  status === "draw" ? { scale: [1, 1.4, 1, 1.4, 1], backgroundColor: ["#f59e0b", "#fbbf24", "#f59e0b"] } :
                  {}
                }
                transition={{ duration: 0.7 }}
                style={{ width: 8, height: 8, borderRadius: "50%", background: msg.color, boxShadow: `0 0 10px ${msg.color}`, flexShrink: 0,
                  animation: status === "playing" ? "statusPulse 1.5s infinite" : "none" }}
              />
              <div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 900, color: msg.color, letterSpacing: "0.1em", textTransform: "uppercase" }}>{msg.title}</div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#475569", fontWeight: 600 }}>{msg.sub}</div>
              </div>
            </div>
            {status === "playing" && (
              <div style={{ padding: "4px 10px", borderRadius: 8, background: isXTurn ? "rgba(34,211,238,0.12)" : "rgba(167,139,250,0.12)", border: `1px solid ${isXTurn ? "rgba(34,211,238,0.3)" : "rgba(167,139,250,0.3)"}`, position: "relative", zIndex: 1 }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 900, color: isXTurn ? "#22d3ee" : "#a78bfa" }}>{isXTurn ? "YOU" : "AI"}</span>
              </div>
            )}
          </motion.div>

          {/* BOARD */}
          <div style={{ position: "relative" }}>
            {/* glow ring — changes color on draw */}
            <motion.div
              animate={{
                background:
                  status === "win"  ? ["rgba(16,185,129,0.2)",  "rgba(16,185,129,0.6)",  "rgba(16,185,129,0.3)",  "rgba(16,185,129,0.15)"] :
                  status === "lose" ? ["rgba(239,68,68,0.2)",   "rgba(239,68,68,0.65)",  "rgba(239,68,68,0.3)",   "rgba(239,68,68,0.15)"]  :
                  status === "draw" ? ["rgba(245,158,11,0.25)", "rgba(245,158,11,0.55)", "rgba(245,158,11,0.2)"] :
                  "rgba(34,211,238,0.15)",
              }}
              transition={
                status === "win"  ? { duration: 0.9, times: [0, 0.2, 0.6, 1], repeat: 1 } :
                status === "lose" ? { duration: 0.9, times: [0, 0.15, 0.55, 1], repeat: 1 } :
                status === "draw" ? { duration: 0.8, times: [0, 0.4, 1], repeat: 2 } :
                { duration: 0.4 }
              }
              style={{ position: "absolute", inset: -3, borderRadius: 26, filter: "blur(10px)", zIndex: 0 }}
            />

            <motion.div
              animate={
                status === "lose" ? { x: [0, -10, 10, -8, 8, -5, 5, 0] } :
                status === "win"  ? { scale: [1, 1.03, 0.98, 1.01, 1] } :
                status === "draw" ? { borderColor: ["rgba(255,255,255,0.1)", "rgba(245,158,11,0.5)", "rgba(245,158,11,0.2)"] } :
                {}
              }
              transition={
                status === "lose" ? { duration: 0.5, times: [0,0.1,0.25,0.4,0.55,0.7,0.85,1] } :
                status === "win"  ? { duration: 0.5, times: [0,0.2,0.5,0.8,1] } :
                { duration: 0.8, repeat: 2 }
              }
              style={{ position: "relative", zIndex: 1, background: "rgba(8,12,28,0.96)", backdropFilter: "blur(20px)", border: "1px solid rgba(34,211,238,0.15)", borderRadius: 22, padding: 16, boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }}
            >
              <div className="ttt-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {board.map((cell, i) => {
                  const cs = getCellStyle(i, cell);
                  const isPlayable = status === "playing" && isXTurn && !cell && !aiThinking;
                  return (
                    <motion.button
                      key={i}
                      onClick={() => handleClick(i)}
                      whileHover={isPlayable ? { scale: 1.06, y: -1 } : {}}
                      whileTap={isPlayable ? { scale: 0.93 } : {}}
                      animate={
                        status === "win" && winLine?.includes(i)
                          ? { scale: [1, 1.18, 0.92, 1.08, 1], boxShadow: [cs.shadow, "0 0 30px rgba(16,185,129,0.7)", "0 0 14px rgba(16,185,129,0.4)"] }
                          : status === "lose" && winLine?.includes(i)
                          ? { scale: [1, 0.88, 1.06, 0.95, 1], boxShadow: [cs.shadow, "0 0 30px rgba(239,68,68,0.7)", "0 0 14px rgba(239,68,68,0.4)"] }
                          : status === "draw"
                          ? { boxShadow: [cs.shadow, "0 0 20px rgba(245,158,11,0.45)", cs.shadow], borderColor: ["rgba(245,158,11,0.3)", "rgba(245,158,11,0.85)", "rgba(245,158,11,0.5)"] }
                          : {}
                      }
                      transition={
                        status === "win" && winLine?.includes(i)
                          ? { duration: 0.55, delay: i * 0.06, times: [0,0.25,0.5,0.75,1] } :
                        status === "lose" && winLine?.includes(i)
                          ? { duration: 0.5, delay: i * 0.05, times: [0,0.2,0.5,0.75,1] } :
                        status === "draw"
                          ? { duration: 0.7, delay: i * 0.04, repeat: 2 } :
                        {}
                      }
                      style={{
                        aspectRatio: "1",
                        width: "clamp(72px, 18vw, 110px)",
                        borderRadius: 12,
                        background: cs.bg,
                        border: cs.border,
                        cursor: isPlayable ? "pointer" : "default",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background 0.15s, border 0.15s",
                        boxShadow: cs.shadow,
                        position: "relative", overflow: "hidden",
                      }}
                    >
                      {/* hover ghost X */}
                      {isPlayable && !cell && (
                        <span className="cell-ghost" style={{ position: "absolute", fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(22px,5vw,40px)", fontWeight: 900, color: "rgba(34,211,238,0.18)", opacity: 0, transition: "opacity 0.12s", userSelect: "none" }}>X</span>
                      )}

                      <AnimatePresence>
                        {cell && (
                          <motion.span
                            initial={{ scale: 0, rotate: -15, opacity: 0 }}
                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                            transition={{ type: "spring", damping: 13, stiffness: 320 }}
                            style={{
                              fontFamily: "'Orbitron', sans-serif",
                              fontSize: "clamp(22px,5vw,40px)",
                              fontWeight: 900,
                              lineHeight: 1,
                              color: cell === "X" ? "#22d3ee" : "#a78bfa",
                              textShadow: cell === "X"
                                ? "0 0 14px rgba(34,211,238,0.8), 0 0 28px rgba(34,211,238,0.3)"
                                : "0 0 14px rgba(167,139,250,0.8), 0 0 28px rgba(167,139,250,0.3)",
                            }}
                          >
                            {cell}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {/* AI thinking shimmer */}
                      {aiThinking && !cell && (
                        <motion.div
                          animate={{ opacity: [0.04, 0.14, 0.04] }}
                          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.08 }}
                          style={{ position: "absolute", inset: 0, background: "rgba(167,139,250,0.12)", borderRadius: 12 }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* result overlay glow */}
              <AnimatePresence>
                {(status === "win" || status === "lose" || status === "draw") && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{
                      position: "absolute", inset: 0, borderRadius: 22, pointerEvents: "none",
                      background:
                        status === "win"  ? "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)" :
                        status === "lose" ? "radial-gradient(circle, rgba(239,68,68,0.1) 0%, transparent 70%)" :
                                            "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)",
                    }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* PLAYER LABELS */}
          <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 460 }}>
            {[
              { label: "YOU · X", sublabel: user?.username ?? "Player", color: "#22d3ee", Icon: User,  active: isXTurn  && status === "playing" },
              { label: "AI  · O", sublabel: cfg.label,                  color: "#a78bfa", Icon: Cpu,   active: !isXTurn && status === "playing" },
            ].map((p, pi) => (
              <div key={pi} style={{ flex: 1, padding: "10px 14px", borderRadius: 12, background: `rgba(${pi === 0 ? "34,211,238" : "167,139,250"},0.05)`, border: `1px solid ${p.active ? p.color + "60" : p.color + "18"}`, display: "flex", alignItems: "center", gap: 9, transition: "all 0.2s", boxShadow: p.active ? `0 0 12px ${p.color}18` : "none" }}>
                <p.Icon style={{ width: 15, height: 15, color: p.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: p.color, letterSpacing: "0.2em", textTransform: "uppercase" }}>{p.label}</div>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#475569", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.sublabel}</div>
                </div>
                {p.active && <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, boxShadow: `0 0 8px ${p.color}`, flexShrink: 0 }} />}
              </div>
            ))}
          </div>

          {/* DIFFICULTY SELECTOR */}
          <div style={{ width: "100%", maxWidth: 460 }}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700, color: "#334155", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 8, textAlign: "center" }}>SELECT AI INTENSITY</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {(["EASY", "MEDIUM", "HARD"] as Difficulty[]).map((d) => {
                const dc = DIFF_CONFIG[d];
                const active = difficulty === d;
                return (
                  <motion.button key={d}
                    onClick={() => { if (status !== "playing") setDifficulty(d); }}
                    disabled={status === "playing"}
                    whileHover={status !== "playing" ? { y: -2 } : {}}
                    whileTap={status !== "playing" ? { scale: 0.96 } : {}}
                    style={{ padding: "13px 8px", borderRadius: 13, background: active ? dc.bg : "rgba(15,23,42,0.6)", border: `2px solid ${active ? dc.border : "rgba(255,255,255,0.05)"}`, cursor: status === "playing" ? "not-allowed" : "pointer", transition: "all 0.2s", textAlign: "center", boxShadow: active ? `0 0 16px ${dc.glow}` : "none", opacity: status === "playing" && !active ? 0.3 : 1, position: "relative", overflow: "hidden" }}
                  >
                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 900, color: active ? dc.color : "#334155", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{dc.label}</div>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 9, color: active ? dc.color + "aa" : "#1e293b", fontWeight: 600 }}>{d}</div>
                    {active && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: dc.color, boxShadow: `0 0 8px ${dc.color}` }} />}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* START / ACTION BUTTON */}
          <div style={{ width: "100%", maxWidth: 460 }}>
            {status === "idle" ? (
              <motion.button onClick={startGame}
                whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                style={{ width: "100%", padding: "17px", borderRadius: 15, background: "linear-gradient(135deg, #22d3ee, #6366f1)", border: "none", cursor: "pointer", fontFamily: "'Orbitron', sans-serif", fontSize: 15, fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: "#020617", boxShadow: "0 0 30px rgba(34,211,238,0.4), 0 0 60px rgba(34,211,238,0.12)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, position: "relative", overflow: "hidden" }}
              >
                <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.8, ease: "linear" }}
                  style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)", pointerEvents: "none" }} />
                <Zap style={{ width: 18, height: 18 }} />
                START GAME
              </motion.button>
            ) : status === "playing" ? (
              <motion.button onClick={resetGame}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                style={{ width: "100%", padding: "14px", borderRadius: 15, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer", fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <RefreshCw style={{ width: 14, height: 14 }} /> FORFEIT & RESET
              </motion.button>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <motion.button onClick={startGame}
                  whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                  style={{ padding: "15px", borderRadius: 15, background: "linear-gradient(135deg, #22d3ee, #6366f1)", border: "none", cursor: "pointer", fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "#020617", boxShadow: "0 0 20px rgba(34,211,238,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <RefreshCw style={{ width: 14, height: 14 }} /> PLAY AGAIN
                </motion.button>
                <motion.button onClick={resetGame}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  style={{ padding: "15px", borderRadius: 15, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  MENU
                </motion.button>
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT PANEL — leaderboard ═══════════════════════════════════ */}
        <div className="ttt-right" style={{ width: 210, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "16px", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Trophy style={{ width: 14, height: 14, color: "#f59e0b" }} />
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700, color: "#f8fafc", letterSpacing: "0.2em", textTransform: "uppercase" }}>TOP PLAYERS</span>
            </div>

            {lbLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {[...Array(5)].map((_, i) => <div key={i} style={{ height: 34, borderRadius: 8, background: "rgba(255,255,255,0.03)", animation: "skeletonPulse 1.5s infinite" }} />)}
              </div>
            ) : leaderboard.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <Grid3X3 style={{ width: 22, height: 22, color: "#334155", margin: "0 auto 8px" }} />
                <p style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: "#475569", letterSpacing: "0.15em" }}>NO RECORDS YET</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {leaderboard.map((entry, i) => {
                  const { color, Icon: RankIcon } = rankStyle(i);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 9px", borderRadius: 9, background: i < 3 ? `rgba(${i===0?"245,158,11":i===1?"148,163,184":"180,83,9"},0.05)` : "rgba(255,255,255,0.02)", border: `1px solid ${i < 3 ? `rgba(${i===0?"245,158,11":i===1?"148,163,184":"180,83,9"},0.15)` : "rgba(255,255,255,0.03)"}` }}>
                      <div style={{ width: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {RankIcon ? <RankIcon style={{ width: 11, height: 11, color }} /> : <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700, color: "#475569" }}>{i+1}</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700, color: i < 3 ? "#f8fafc" : "#475569", textTransform: "uppercase", letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.user.username}</div>
                      </div>
                      <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 900, color: i < 3 ? color : "#22d3ee", flexShrink: 0 }}>{entry.highScore.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {user && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 9px", borderRadius: 9, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: 900, color: "#fff" }}>{user.username[0].toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7, color: "#6366f1", letterSpacing: "0.1em", textTransform: "uppercase" }}>YOU</div>
                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.username}</div>
                  </div>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 900, color: "#f59e0b", flexShrink: 0 }}>{totalScore.toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── GAME HISTORY ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {history.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 36 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 22, height: 2, background: "linear-gradient(90deg, #22d3ee, #6366f1)", borderRadius: 1 }} />
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, fontWeight: 700, color: "#22d3ee", letterSpacing: "0.3em", textTransform: "uppercase" }}>GAME HISTORY</span>
            </div>
            <div style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
              {/* table header — hidden on very small screens via class */}
              <div className="ttt-history-head" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 70px 70px", gap: 10, padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {["RESULT","DIFFICULTY","SCORE","TIME","PLAYED"].map(h => (
                <span key={h} style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 7, fontWeight: 700, color: "#475569", letterSpacing: "0.25em", textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>
              {history.map((rec, i) => {
                const rc = {
                  WIN:  { color: "#10b981", bg: "rgba(16,185,129,0.1)",  label: "VICTORY" },
                  LOSE: { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   label: "DEFEAT"  },
                  DRAW: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  label: "DRAW"    },
                }[rec.result];
                return (
                  <motion.div key={rec.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="ttt-history-row"
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 70px 70px", gap: 10, padding: "11px 18px", borderBottom: i < history.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}
                  >
                    <div style={{ padding: "3px 9px", borderRadius: 6, background: rc.bg, border: `1px solid ${rc.color}40`, display: "inline-flex", width: "fit-content" }}>
                      <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, fontWeight: 700, color: rc.color, letterSpacing: "0.1em" }}>{rc.label}</span>
                    </div>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 8, color: DIFF_CONFIG[rec.difficulty].color, letterSpacing: "0.1em", fontWeight: 700 }}>{rec.difficulty}</span>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 900, color: rec.score > 0 ? "#f59e0b" : "#475569" }}>{rec.score > 0 ? `+${rec.score} XP` : "—"}</span>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 600, color: "#64748b" }}>{fmt(rec.duration)}</span>
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#475569" }}>{rec.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes statusPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes skeletonPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }

        /* hover ghost X */
        .ttt-grid button:hover .cell-ghost { opacity: 1 !important; }

        /* ── RESPONSIVE ──────────────────────────────────────────────────── */

        /* ── MOBILE: single centered column ────────────────────────────── */
        @media (max-width: 860px) {
          .ttt-left  { display: none !important; }
          .ttt-right { display: none !important; }

          .ttt-layout {
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            width: 100% !important;
          }

          .ttt-center {
            flex: unset !important;
            width: 100% !important;
            max-width: 460px !important;
            min-width: 0 !important;
            align-items: center !important;
            margin: 0 auto !important;
          }

          /* every direct child of center stretches to full column width */
          .ttt-center > * {
            width: 100% !important;
            max-width: 460px !important;
            box-sizing: border-box !important;
          }

          /* board wrapper — center it */
          .ttt-center > div:has(.ttt-grid) {
            display: flex !important;
            justify-content: center !important;
          }
        }

        /* very small phones */
        @media (max-width: 420px) {
          .ttt-center { max-width: 100% !important; padding: 0 4px !important; }
          .ttt-history-head { display: none !important; }
          .ttt-history-row  { grid-template-columns: 1fr 1fr 1fr !important; }
          .ttt-history-row > *:nth-child(4),
          .ttt-history-row > *:nth-child(5) { display: none !important; }
        }
      `}</style>
    </div>
  );
}
