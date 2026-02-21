"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Trophy, Crown, Medal, RefreshCw,
  Zap, Clock, Search, CheckCircle2, Grid3X3,
  Star, Target, Lock, Sparkles
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";

// ── Types ──────────────────────────────────────────────────────────────────────
type Difficulty = "EASY" | "MEDIUM" | "HARD";
type GameStatus = "idle" | "loading" | "playing" | "win";

interface GameRecord {
  id: string;
  difficulty: Difficulty;
  wordsFound: number;
  totalWords: number;
  duration:   number;
  completed:  boolean;
  date:       Date;
}
interface LBEntry { user: { username: string }; totalXp: number; matches: number; }

// ── Client-side display config (grid sizes match server) ──────────────────────
const DIFF_CONFIG = {
  EASY: {
    label: "EASY",
    color: "#10b981", bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.4)", glow: "rgba(16,185,129,0.25)",
    gridSize: 5, totalWords: 4, xpReward: 80,
    gridDesc: "5×5 grid",
    wordDesc: "1×3L · 2×4L · 1×5L",
    dirDesc:  "Horizontal & Vertical",
  },
  MEDIUM: {
    label: "MEDIUM",
    color: "#f59e0b", bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.4)", glow: "rgba(245,158,11,0.25)",
    gridSize: 7, totalWords: 6, xpReward: 180,
    gridDesc: "7×7 grid",
    wordDesc: "2×3L · 1×4L · 2×5L · 1×7L",
    dirDesc:  "All axes + diagonal",
  },
  HARD: {
    label: "HARD",
    color: "#ef4444", bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.4)", glow: "rgba(239,68,68,0.25)",
    gridSize: 10, totalWords: 7, xpReward: 350,
    gridDesc: "10×10 grid",
    wordDesc: "1×3L · 2×4L · 2×5L · 2×8-9L · 1×10L",
    dirDesc:  "All 8 directions",
  },
} as const;

const FOUND_COLORS = [
  "#10b981","#22d3ee","#a78bfa","#f59e0b",
  "#ec4899","#f97316","#84cc16","#06b6d4",
];

function rankStyle(i: number) {
  if (i === 0) return { color: "#f59e0b", Icon: Crown };
  if (i === 1) return { color: "#94a3b8", Icon: Medal };
  if (i === 2) return { color: "#b45309", Icon: Medal };
  return         { color: "#475569",   Icon: null  };
}

const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

// ─────────────────────────────────────────────────────────────────────────────
export default function WordSearchPage() {
  const { user } = useAuthStore();

  // game state
  const [difficulty,   setDifficulty]   = useState<Difficulty>("MEDIUM");
  const [status,       setStatus]       = useState<GameStatus>("idle");
  const [grid,         setGrid]         = useState<string[][]>([]);
  const [words,        setWords]        = useState<string[]>([]);
  const [found,        setFound]        = useState<Set<string>>(new Set());
  const [foundCells,   setFoundCells]   = useState<Map<string, number>>(new Map()); // "r,c" → colorIdx
  const [selecting,    setSelecting]    = useState<[number, number][]>([]);
  const [startCell,    setStartCell]    = useState<[number, number] | null>(null);
  const [gameTime,     setGameTime]     = useState(0);
  const [isValidating, setIsValidating] = useState(false);

  // meta
  const [leaderboard, setLeaderboard] = useState<LBEntry[]>([]);
  const [lbLoading,   setLbLoading]   = useState(true);
  const [history,     setHistory]     = useState<GameRecord[]>([]);
  const [stats,       setStats]       = useState({ played: 0, cleared: 0 });
  const [sessionXp,    setSessionXp]    = useState(0);
  const [toast,       setToast]       = useState<{ word: string; isLast: boolean; key: number } | null>(null);

  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef     = useRef<number>(0);
  const isDragging   = useRef(false);
  const toastTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const xpRewardRef  = useRef<number>(DIFF_CONFIG[difficulty].xpReward);

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "playing") {
      startRef.current = Date.now() - gameTime * 1000;
      timerRef.current = setInterval(
        () => setGameTime(Math.floor((Date.now() - startRef.current) / 1000)),
        1000,
      );
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  // ── Leaderboard + history ──────────────────────────────────────────────────
  useEffect(() => {
    setLbLoading(true);
    Promise.all([
      fetch(`/api/leaderboard?gameType=WORD_SEARCH`).then(r => r.json()),
      user ? fetch("/api/games/history?gameType=WORD_SEARCH&limit=20").then(r => r.json()) : null,
    ]).then(([lb, hist]) => {
      if (lb?.success) setLeaderboard(lb.data.slice(0, 8));
      if (hist?.success && hist.data?.length > 0) {
        setHistory(hist.data.map((g: any) => ({
          id: g.id, difficulty: g.difficulty as Difficulty,
          wordsFound: g.wordsFound, totalWords: g.totalWords,
          duration: g.duration, completed: g.completed,
          date: new Date(g.createdAt),
        })));
      }
    }).catch(console.error).finally(() => setLbLoading(false));
  }, [user]);

  // ── Start ──────────────────────────────────────────────────────────────────
  const startGame = async () => {
    if (status === "loading") return;
    setStatus("loading");
    setGrid([]); setWords([]); setFound(new Set()); setFoundCells(new Map());
    setSelecting([]); setStartCell(null); setGameTime(0); setToast(null);
    sessionIdRef.current = null;

    try {
      const res  = await fetch("/api/games/ws/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty }),
      });
      const json = await res.json();
      if (!json.success) { setStatus("idle"); return; }

      sessionIdRef.current = json.sessionId;
      xpRewardRef.current  = json.xpReward;
      setGrid(json.grid);
      setWords(json.words);
      setStats(s => ({ ...s, played: s.played + 1 }));
      setStatus("playing");
    } catch (e) {
      console.error(e);
      setStatus("idle");
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetGame = async () => {
    if (status === "playing" && sessionIdRef.current && user) {
      const dur = Math.max(Math.floor((Date.now() - startRef.current) / 1000), 5);
      fetch("/api/games/ws/finish", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current, duration: dur }),
      }).catch(console.error);
    }
    sessionIdRef.current = null;
    setStatus("idle"); setGrid([]); setWords([]);
    setFound(new Set()); setFoundCells(new Map());
    setSelecting([]); setStartCell(null); setGameTime(0); setToast(null);
  };

  // ── Validate word ──────────────────────────────────────────────────────────
  const handleValidate = useCallback(async (sel: [number, number][]) => {
    if (sel.length < 2 || !sessionIdRef.current || isValidating) return;

    const word = sel.map(([r, c]) => grid[r]?.[c] ?? "").join("");
    if (word.length < 2) return;

    setIsValidating(true);
    try {
      const res = await fetch("/api/games/ws/validate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionIdRef.current, word, cells: sel }),
      });
      if (!res.ok) { setIsValidating(false); return; }

      const json = await res.json();
      if (!json.valid) { setIsValidating(false); return; }

      const matched    = json.word as string;
      const colorIndex = found.size;

      // Paint found cells
      setFoundCells(prev => {
        const next = new Map(prev);
        sel.forEach(([r, c]) => next.set(`${r},${c}`, colorIndex));
        return next;
      });

      const nf = new Set(found); nf.add(matched);
      setFound(nf);

      // Toast
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({ word: matched, isLast: json.completed, key: Date.now() });
      toastTimer.current = setTimeout(() => setToast(null), 2200);

      if (json.completed) {
        const dur = Math.max(Math.floor((Date.now() - startRef.current) / 1000), 5);
        setStatus("win");
        setStats(s => ({ ...s, cleared: s.cleared + 1 }));
        setSessionXp(x => x + xpRewardRef.current);

        if (user && sessionIdRef.current) {
          fetch("/api/games/ws/finish", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: sessionIdRef.current, duration: dur }),
          }).then(r => {
            if (r.ok) {
              sessionIdRef.current = null;
              if (typeof (window as any).__refreshXp === "function") (window as any).__refreshXp();
            }
          }).catch(console.error);
        }

        setHistory(prev => [{
          id: crypto.randomUUID(), difficulty,
          wordsFound: json.foundCount, totalWords: json.totalWords,
          duration: dur, completed: true, date: new Date(),
        }, ...prev].slice(0, 20));
      }
    } catch (e) { console.error(e); }
    setIsValidating(false);
  }, [grid, found, difficulty, user, isValidating]);

  // ── Selection helpers ──────────────────────────────────────────────────────
  const makeLine = (a: [number, number], b: [number, number]): [number, number][] => {
    const dr = Math.sign(b[0] - a[0]), dc = Math.sign(b[1] - a[1]);
    const len = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    if (dr !== 0 && dc !== 0 && Math.abs(b[0] - a[0]) !== Math.abs(b[1] - a[1])) return [a];
    return Array.from({ length: len + 1 }, (_, i) => [a[0] + dr * i, a[1] + dc * i] as [number, number]);
  };

  // Mouse
  const onDown  = (r: number, c: number) => {
    if (status !== "playing" || isValidating) return;
    isDragging.current = true; setStartCell([r, c]); setSelecting([[r, c]]);
  };
  const onEnter = (r: number, c: number) => {
    if (!isDragging.current || !startCell) return;
    setSelecting(makeLine(startCell, [r, c]));
  };
  const onUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    handleValidate(selecting); setSelecting([]); setStartCell(null);
  };

  // Touch
  const cellAt = (x: number, y: number): [number, number] | null => {
    for (const el of document.elementsFromPoint(x, y)) {
      const v = (el as HTMLElement).dataset?.cell;
      if (v) { const [r, c] = v.split(",").map(Number); return [r, c]; }
    }
    return null;
  };
  const onTS = (e: React.TouchEvent) => {
    if (status !== "playing" || isValidating) return;
    const t = e.touches[0]; const cell = cellAt(t.clientX, t.clientY);
    if (!cell) return;
    isDragging.current = true; setStartCell(cell); setSelecting([cell]);
  };
  const onTM = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDragging.current || !startCell) return;
    const cell = cellAt(e.touches[0].clientX, e.touches[0].clientY);
    if (cell) setSelecting(makeLine(startCell, cell));
  };
  const onTE = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    handleValidate(selecting); setSelecting([]); setStartCell(null);
  };

  const cfg   = DIFF_CONFIG[difficulty];
  const isSel = (r: number, c: number) => selecting.some(([sr, sc]) => sr === r && sc === c);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ width: "100%", minHeight: "100vh", userSelect: "none", paddingBottom: 28, boxSizing: "border-box" }}>

      {/* Win flash */}
      <AnimatePresence>
        {status === "win" && (
          <motion.div key="wf" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.32, 0, 0.22, 0, 0.1] }} exit={{ opacity: 0 }}
            transition={{ duration: 1.3 }}
            style={{ position: "fixed", inset: 0, zIndex: 10, pointerEvents: "none", background: "radial-gradient(ellipse at center,rgba(16,185,129,0.55) 0%,transparent 65%)" }} />
        )}
      </AnimatePresence>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/games" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", marginBottom: 12, opacity: 0.7 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}>
          <ArrowLeft style={{ width: 13, height: 13, color: "#22d3ee" }} />
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#22d3ee", letterSpacing: "0.3em", textTransform: "uppercase" }}>BACK TO ARCADE</span>
        </Link>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(22px,5vw,46px)", fontWeight: 900, color: "#f8fafc", textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", lineHeight: 1, margin: 0 }}>
              WORD <span style={{ color: "#22d3ee", textShadow: "0 0 20px rgba(34,211,238,0.5)" }}>SEARCH</span>
            </h1>
            <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 10, fontWeight: 600, color: "#334155", letterSpacing: "0.25em", textTransform: "uppercase", marginTop: 4 }}>
              SERVER-VERIFIED · v3.0
            </p>
          </div>

          {/* Session XP — same design as TTT session score */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#334155", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 3 }}>XP Earned This Session</div>
              <motion.div key={sessionXp} initial={{ scale: 1.3, color: "#fff" }} animate={{ scale: 1, color: "#a78bfa" }}
                style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(20px,4vw,26px)", fontWeight: 900, filter: "drop-shadow(0 0 10px rgba(167,139,250,0.4))" }}>
                {sessionXp.toLocaleString()}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS ROW — PLAYED / CLEARED / TIME / SESSION XP ────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
        {/* PLAYED */}
        <motion.div
          animate={status === "playing" ? { boxShadow: ["0 0 0px rgba(167,139,250,0.25)","0 0 16px rgba(167,139,250,0.25)","0 0 4px rgba(167,139,250,0.25)"] } : {}}
          transition={{ duration: 0.5 }}
          style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, fontWeight: 700, color: "#334155", letterSpacing: "0.2em", textTransform: "uppercase" }}>PLAYED</span>
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(16px,3.5vw,24px)", fontWeight: 900, color: "#a78bfa", filter: "drop-shadow(0 0 6px rgba(167,139,250,0.5))", lineHeight: 1 }}>{stats.played}</span>
        </motion.div>
        {/* CLEARED */}
        <motion.div
          animate={status === "win" ? { scale:[1,1.06,1], boxShadow:["0 0 0px rgba(16,185,129,0.25)","0 0 20px rgba(16,185,129,0.25)","0 0 8px rgba(16,185,129,0.25)"] } : {}}
          transition={{ duration: 0.5 }}
          style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, fontWeight: 700, color: "#334155", letterSpacing: "0.2em", textTransform: "uppercase" }}>CLEARED</span>
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(16px,3.5vw,24px)", fontWeight: 900, color: "#10b981", filter: "drop-shadow(0 0 6px rgba(16,185,129,0.5))", lineHeight: 1 }}>{stats.cleared}</span>
        </motion.div>
        {/* TIME */}
        <div style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, fontWeight: 700, color: "#334155", letterSpacing: "0.2em", textTransform: "uppercase" }}>TIME</span>
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(14px,3vw,20px)", fontWeight: 900, color: "#22d3ee", filter: "drop-shadow(0 0 6px rgba(34,211,238,0.5))", lineHeight: 1 }}>
            {status === "playing" || status === "win" ? fmt(gameTime) : "--:--"}
          </span>
        </div>
        {/* SESSION XP */}
        <motion.div
          animate={status === "win" ? { scale:[1,1.06,1], boxShadow:["0 0 0px rgba(245,158,11,0.25)","0 0 20px rgba(245,158,11,0.25)","0 0 8px rgba(245,158,11,0.25)"] } : {}}
          transition={{ duration: 0.5 }}
          style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, fontWeight: 700, color: "#334155", letterSpacing: "0.2em", textTransform: "uppercase" }}>SESSION XP</span>
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(14px,3vw,20px)", fontWeight: 900, color: "#f59e0b", filter: "drop-shadow(0 0 6px rgba(245,158,11,0.5))", lineHeight: 1 }}>{sessionXp > 0 ? `+${sessionXp}` : "0"}</span>
        </motion.div>
      </div>

      {/* ── MAIN COLUMN ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 680, margin: "0 auto" }}>

        {/* STATUS BANNER */}
        <motion.div key={status} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: status === "win" ? "rgba(4,22,14,0.92)" : "rgba(15,23,42,0.85)",
            backdropFilter: "blur(16px)",
            border: `1px solid ${status === "win" ? "rgba(16,185,129,0.5)" : "rgba(34,211,238,0.2)"}`,
            borderRadius: 14, padding: "12px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 8, position: "relative", overflow: "hidden",
          }}>
          {status === "win" && (
            <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 0.5, ease: "linear" }}
              style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(16,185,129,0.2),transparent)", pointerEvents: "none" }} />
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: status === "win" ? "#10b981" : "#22d3ee", boxShadow: `0 0 10px ${status === "win" ? "#10b981" : "#22d3ee"}`, animation: status === "playing" ? "wsPulse 1.5s infinite" : "none", flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", color: status === "win" ? "#10b981" : "#22d3ee" }}>
                {status === "idle"    && "READY?"}
                {status === "loading" && "GENERATING…"}
                {status === "playing" && (isValidating ? "CHECKING…" : "FIND ALL WORDS")}
                {status === "win"     && "MISSION COMPLETE!"}
              </div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#475569", fontWeight: 600 }}>
                {status === "idle"    && "Choose difficulty & press START"}
                {status === "loading" && "Building your grid on the server…"}
                {status === "playing" && `${found.size} / ${words.length} words found — drag to select`}
                {status === "win"     && `All ${words.length} words found · +${xpRewardRef.current} XP earned!`}
              </div>
            </div>
          </div>
          {status === "playing" && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", flexShrink: 0 }}>
              <Clock style={{ width: 11, height: 11, color: "#22d3ee" }} />
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: "#f8fafc" }}>{fmt(gameTime)}</span>
            </div>
          )}
        </motion.div>

        {/* XP PROGRESS BAR — only while playing */}
        {status === "playing" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ padding: "12px 16px", borderRadius: 13, background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.22)", display: "flex", alignItems: "center", gap: 12 }}>
            <Lock style={{ width: 14, height: 14, color: "#a78bfa", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>
                  Find <span style={{ color: "#f8fafc", fontWeight: 700 }}>all {words.length}</span> to unlock
                </span>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, color: "#a78bfa" }}>+{xpRewardRef.current} XP</span>
              </div>
              {/* progress bar */}
              <div style={{ height: 5, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <motion.div
                  animate={{ width: words.length ? `${(found.size / words.length) * 100}%` : "0%" }}
                  transition={{ duration: 0.35, type: "spring", damping: 20 }}
                  style={{ height: "100%", borderRadius: 4, background: found.size === words.length ? "linear-gradient(90deg,#10b981,#22d3ee)" : "linear-gradient(90deg,#a78bfa,#6366f1)" }}
                />
              </div>
            </div>
            {/* dot per word */}
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              {words.map((w, i) => (
                <motion.div key={w} animate={found.has(w) ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.25 }}
                  style={{ width: 8, height: 8, borderRadius: "50%", background: found.has(w) ? FOUND_COLORS[i % FOUND_COLORS.length] : "rgba(255,255,255,0.08)", border: `1px solid ${found.has(w) ? FOUND_COLORS[i % FOUND_COLORS.length] + "55" : "rgba(255,255,255,0.1)"}`, boxShadow: found.has(w) ? `0 0 6px ${FOUND_COLORS[i % FOUND_COLORS.length]}` : "none", transition: "all 0.2s" }} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── GRID ─────────────────────────────────────────────────────────── */}
        {(status === "playing" || status === "win") && grid.length > 0 && (
          <div style={{ position: "relative" }}>
            <motion.div
              animate={{ background: status === "win" ? ["rgba(16,185,129,0.15)","rgba(16,185,129,0.4)","rgba(16,185,129,0.15)"] : "rgba(34,211,238,0.1)" }}
              transition={status === "win" ? { duration: 0.9, repeat: 2 } : { duration: 0.4 }}
              style={{ position: "absolute", inset: -5, borderRadius: 26, filter: "blur(14px)", zIndex: 0 }} />
            <motion.div
              animate={status === "win" ? { scale: [1, 1.01, 0.99, 1.005, 1] } : {}}
              transition={{ duration: 0.5 }}
              style={{ position: "relative", zIndex: 1, background: "rgba(8,12,28,0.96)", backdropFilter: "blur(20px)", border: "1px solid rgba(34,211,238,0.12)", borderRadius: 20, padding: 10, boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }}>
              <div
                style={{ display: "grid", gridTemplateColumns: `repeat(${cfg.gridSize},1fr)`, gap: 4, width: "100%", touchAction: "none" }}
                onMouseLeave={() => { if (isDragging.current) onUp(); }}
                onMouseUp={onUp}
                onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}>
                {grid.map((row, r) => row.map((letter, c) => {
                  const sel   = isSel(r, c);
                  const fcIdx = foundCells.get(`${r},${c}`);
                  const isF   = fcIdx !== undefined;
                  const fc    = FOUND_COLORS[(fcIdx ?? 0) % FOUND_COLORS.length];
                  return (
                    <motion.div key={`${r}-${c}`} data-cell={`${r},${c}`}
                      onMouseDown={() => onDown(r, c)} onMouseEnter={() => onEnter(r, c)}
                      animate={isF ? { scale: [1, 1.18, 1] } : {}} transition={{ duration: 0.18 }}
                      style={{
                        aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
                        borderRadius: 6,
                        cursor: status === "playing" && !isValidating ? "pointer" : "default",
                        background: isF ? `${fc}22` : sel ? "rgba(34,211,238,0.22)" : "rgba(255,255,255,0.025)",
                        border:     isF ? `1px solid ${fc}55` : sel ? "1px solid rgba(34,211,238,0.6)" : "1px solid rgba(255,255,255,0.05)",
                        boxShadow:  isF ? `0 0 8px ${fc}44` : sel ? "0 0 10px rgba(34,211,238,0.35)" : "none",
                        transition: "background 0.07s, border 0.07s",
                        opacity: isValidating && !isF && !sel ? 0.6 : 1,
                      }}>
                      <span style={{
                        fontFamily: "'Orbitron',sans-serif",
                        fontSize: "clamp(8px,min(3vw,3vh),17px)",
                        fontWeight: 900, lineHeight: 1,
                        color: isF ? fc : sel ? "#22d3ee" : "#3d5068",
                        textShadow: isF ? `0 0 8px ${fc}bb` : sel ? "0 0 10px rgba(34,211,238,0.9)" : "none",
                        pointerEvents: "none", transition: "color 0.07s",
                      }}>{letter}</span>
                    </motion.div>
                  );
                }))}
              </div>
            </motion.div>
          </div>
        )}

        {/* IDLE / LOADING PLACEHOLDER */}
        {(status === "idle" || status === "loading") && (
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: -5, borderRadius: 26, background: "rgba(34,211,238,0.06)", filter: "blur(14px)", zIndex: 0 }} />
            <div style={{ position: "relative", zIndex: 1, background: "rgba(8,12,28,0.96)", backdropFilter: "blur(20px)", border: "1px solid rgba(34,211,238,0.1)", borderRadius: 20, padding: "clamp(28px,6vw,48px) 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 180, gap: 16 }}>
              {status === "loading" ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <Search style={{ width: 46, height: 46, color: "#22d3ee" }} />
                  </motion.div>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, color: "#22d3ee", letterSpacing: "0.15em" }}>BUILDING GRID…</span>
                  <div style={{ width: 140, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <motion.div animate={{ x: ["-100%", "100%"] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                      style={{ height: "100%", width: "50%", background: "linear-gradient(90deg,transparent,#22d3ee,transparent)", borderRadius: 2 }} />
                  </div>
                </>
              ) : (
                <>
                  <motion.div animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.06, 1] }} transition={{ duration: 2.5, repeat: Infinity }}>
                    <Search style={{ width: "clamp(38px,8vw,52px)", height: "clamp(38px,8vw,52px)", color: "#22d3ee", filter: "drop-shadow(0 0 16px rgba(34,211,238,0.55))" }} />
                  </motion.div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(13px,3vw,17px)", fontWeight: 900, color: "#f8fafc", letterSpacing: "0.12em", marginBottom: 4 }}>LEXICAL GRID</div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#334155", fontWeight: 600, letterSpacing: "0.22em" }}>AWAITING INITIALIZATION</div>
                  </div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center" }}>
                    {["W", "O", "R", "D", "S"].map((l, i) => (
                      <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.18 }}
                        style={{ width: "clamp(30px,6vw,40px)", height: "clamp(30px,6vw,40px)", borderRadius: 8, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(11px,2.5vw,15px)", fontWeight: 900, color: "#22d3ee" }}>{l}</span>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── WORD LIST ─────────────────────────────────────────────────────── */}
        {(status === "playing" || status === "win") && words.length > 0 && (
          <div style={{ background: "rgba(15,23,42,0.8)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Target style={{ width: 13, height: 13, color: "#22d3ee" }} />
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#f8fafc", letterSpacing: "0.2em", textTransform: "uppercase" }}>FIND THESE WORDS</span>
              </div>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: found.size === words.length ? "#10b981" : "#22d3ee" }}>
                {found.size}/{words.length}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 7 }}>
              {words.map((word, idx) => {
                const isF = found.has(word);
                const col = FOUND_COLORS[idx % FOUND_COLORS.length];
                return (
                  <motion.div key={word} animate={isF ? { scale: [1, 1.09, 1] } : {}} transition={{ duration: 0.22 }}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderRadius: 9, background: isF ? `${col}18` : "rgba(255,255,255,0.03)", border: `1px solid ${isF ? col + "44" : "rgba(255,255,255,0.06)"}`, boxShadow: isF ? `0 0 10px ${col}25` : "none", transition: "all 0.2s" }}>
                    <CheckCircle2 style={{ width: 11, height: 11, color: isF ? col : "#1e293b", flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(7px,2vw,10px)", fontWeight: 700, color: isF ? col : "#475569", textDecoration: isF ? "line-through" : "none", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                      {word}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── WIN CARD ──────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {status === "win" && (
            <motion.div key="wc" initial={{ opacity: 0, scale: 0.88, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ type: "spring", damping: 14, stiffness: 220 }}
              style={{ background: "rgba(4,22,14,0.9)", backdropFilter: "blur(16px)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 18, padding: 20, boxShadow: "0 0 40px rgba(16,185,129,0.2)", position: "relative", overflow: "hidden" }}>
              <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1, ease: "linear" }}
                style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(16,185,129,0.1),transparent)", pointerEvents: "none" }} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                {/* left */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <motion.div animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.25, 1] }} transition={{ duration: 0.85, delay: 0.15 }}>
                    <Star style={{ width: "clamp(26px,5vw,36px)", height: "clamp(26px,5vw,36px)", color: "#f59e0b", filter: "drop-shadow(0 0 12px rgba(245,158,11,0.6))" }} />
                  </motion.div>
                  <div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(13px,3vw,18px)", fontWeight: 900, color: "#10b981" }}>
                      ALL WORDS FOUND!
                    </div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#22d3ee", fontWeight: 600, letterSpacing: "0.15em", marginTop: 2 }}>
                      MISSION COMPLETE · {cfg.label}
                    </div>
                  </div>
                </div>
                {/* right — giant XP */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: "#334155", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 2 }}>XP EARNED</div>
                  <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 9, stiffness: 180, delay: 0.2 }}
                    style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(30px,7vw,46px)", fontWeight: 900, color: "#a78bfa", filter: "drop-shadow(0 0 18px rgba(167,139,250,0.65))", lineHeight: 1 }}>
                    +{xpRewardRef.current}
                  </motion.div>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, color: "rgba(167,139,250,0.6)", marginTop: 3 }}>XP</div>
                </div>
              </div>

              {/* stat chips */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(78px,1fr))", gap: 8, marginTop: 16 }}>
                {[
                  { label: "WORDS",   value: `${words.length}/${words.length}`, color: "#10b981" },
                  { label: "MODE",    value: cfg.label,                          color: cfg.color  },
                  { label: "TIME",    value: fmt(gameTime),                      color: "#22d3ee"  },
                  { label: "GRID",    value: cfg.gridDesc,                       color: "#f59e0b"  },
                ].map(item => (
                  <div key={item.label} style={{ padding: "8px 10px", borderRadius: 10, background: `${item.color}11`, border: `1px solid ${item.color}33`, textAlign: "center" }}>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, color: "#475569", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── DIFFICULTY SELECTOR ────────────────────────────────────────────── */}
        <div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#334155", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 8, textAlign: "center" }}>
            SELECT DIFFICULTY
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {(["EASY", "MEDIUM", "HARD"] as Difficulty[]).map(d => {
              const dc = DIFF_CONFIG[d], active = difficulty === d;
              const disabled = status === "playing" || status === "loading";
              return (
                <motion.button key={d} onClick={() => { if (!disabled) setDifficulty(d); }}
                  disabled={disabled}
                  whileHover={!disabled ? { y: -2 } : {}} whileTap={!disabled ? { scale: 0.96 } : {}}
                  style={{ padding: "11px 6px", borderRadius: 13, background: active ? dc.bg : "rgba(15,23,42,0.6)", border: `2px solid ${active ? dc.border : "rgba(255,255,255,0.05)"}`, cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.2s", textAlign: "center", boxShadow: active ? `0 0 18px ${dc.glow}` : "none", opacity: disabled && !active ? 0.28 : 1, position: "relative", overflow: "hidden" }}>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(8px,2.5vw,11px)", fontWeight: 900, color: active ? dc.color : "#334155", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>{dc.label}</div>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 9, color: active ? dc.color + "aa" : "#1e293b", fontWeight: 600, marginBottom: 3 }}>{dc.gridDesc}</div>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 900, color: active ? "#a78bfa" : "#334155" }}>+{dc.xpReward} XP</div>
                  {active && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: dc.color, boxShadow: `0 0 8px ${dc.color}` }} />}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── ACTION BUTTONS ────────────────────────────────────────────────── */}
        {status === "idle" && (
          <motion.button onClick={startGame} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
            style={{ width: "100%", padding: "clamp(13px,3vw,17px)", borderRadius: 15, background: "linear-gradient(135deg,#22d3ee,#6366f1)", border: "none", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(12px,3vw,15px)", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: "#020617", boxShadow: "0 0 30px rgba(34,211,238,0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, position: "relative", overflow: "hidden" }}>
            <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.8, ease: "linear" }} style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)", pointerEvents: "none" }} />
            <Zap style={{ width: 18, height: 18 }} /> START GAME
          </motion.button>
        )}
        {status === "playing" && (
          <motion.button onClick={resetGame} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{ width: "100%", padding: 13, borderRadius: 15, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <RefreshCw style={{ width: 14, height: 14 }} /> ABORT & RESET
          </motion.button>
        )}
        {status === "win" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <motion.button onClick={startGame} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
              style={{ padding: 14, borderRadius: 15, background: "linear-gradient(135deg,#22d3ee,#6366f1)", border: "none", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "#020617", boxShadow: "0 0 20px rgba(34,211,238,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <RefreshCw style={{ width: 14, height: 14 }} /> PLAY AGAIN
            </motion.button>
            <motion.button onClick={resetGame} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              style={{ padding: 14, borderRadius: 15, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              MENU
            </motion.button>
          </div>
        )}

      </div>{/* end main column */}

      {/* ── LEADERBOARD — full width ──────────────────────────────────────── */}
      <div style={{ marginTop: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 22, height: 2, background: "linear-gradient(90deg,#f59e0b,#ef4444)", borderRadius: 1 }} />
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.3em", textTransform: "uppercase" }}>TOP PLAYERS</span>
          </div>
          <div style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
            {/* Header row */}
            <div className="ws-lb-head" style={{ display: "grid", gridTemplateColumns: "40px 1fr 90px 70px", gap: 10, padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              {["RANK", "PLAYER", "TOTAL XP", "MATCHES"].map(h => (
                <span key={h} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#475569", letterSpacing: "0.25em", textTransform: "uppercase" }}>{h}</span>
              ))}
            </div>
            {lbLoading ? (
              <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                {[...Array(5)].map((_, i) => <div key={i} style={{ height: 36, borderRadius: 8, background: "rgba(255,255,255,0.03)", animation: "wsSkel 1.5s infinite" }} />)}
              </div>
            ) : leaderboard.length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 0" }}>
                <Grid3X3 style={{ width: 22, height: 22, color: "#334155", margin: "0 auto 8px" }} />
                <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#475569", letterSpacing: "0.15em" }}>NO RECORDS YET</p>
              </div>
            ) : (
              leaderboard.map((entry, i) => {
                const { color, Icon: RI } = rankStyle(i);
                const isTop3 = i < 3;
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="ws-lb-head"
                    style={{ display: "grid", gridTemplateColumns: "40px 1fr 90px 70px", gap: 10, padding: "11px 18px", borderBottom: i < leaderboard.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center", background: isTop3 ? `rgba(${i===0?"245,158,11":i===1?"148,163,184":"180,83,9"},0.04)` : "transparent" }}>
                    {/* rank */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {RI
                        ? <RI style={{ width: 13, height: 13, color }}/>
                        : <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#475569" }}>{i + 1}</span>}
                    </div>
                    {/* player */}
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: isTop3 ? "#f8fafc" : "#475569", textTransform: "uppercase", letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.user.username}</span>
                    {/* xp */}
                    <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                      <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: isTop3 ? color : "#a78bfa" }}>{entry.totalXp.toLocaleString()}</span>
                      <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 8, color: "#334155", fontWeight: 600 }}>XP</span>
                    </div>
                    {/* matches */}
                    <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 600, color: "#64748b" }}>{entry.matches}</span>
                  </motion.div>
                );
              })
            )}
            {user && (
              <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "grid", gridTemplateColumns: "40px 1fr 90px 70px", gap: 10, alignItems: "center", background: "rgba(99,102,241,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#22d3ee)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 900, color: "#fff" }}>{user.username[0].toUpperCase()}</span>
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: "#6366f1", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 1 }}>YOU</div>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.username}</div>
                </div>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: "#334155", letterSpacing: "0.1em" }}>— session</span>
                <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#475569" }}>—</span>
              </div>
            )}
          </div>
        </div>

      {/* ── GAME HISTORY — full width ────────────────────────────────────── */}
      <AnimatePresence>
        {history.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 22, height: 2, background: "linear-gradient(90deg,#22d3ee,#6366f1)", borderRadius: 1 }} />
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#22d3ee", letterSpacing: "0.3em", textTransform: "uppercase" }}>GAME HISTORY</span>
            </div>
            <div style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
              <div className="ws-hist-head" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 70px 70px", gap: 10, padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {["RESULT", "DIFFICULTY", "WORDS", "TIME", "PLAYED"].map(h => (
                  <span key={h} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#475569", letterSpacing: "0.25em", textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>
              {history.map((rec, i) => {
                const dc = DIFF_CONFIG[rec.difficulty];
                return (
                  <motion.div key={rec.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="ws-hist-head ws-hist-row"
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 70px 70px", gap: 10, padding: "11px 18px", borderBottom: i < history.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}>
                    <div style={{ padding: "3px 9px", borderRadius: 6, background: rec.completed ? "rgba(16,185,129,0.1)" : "rgba(100,116,139,0.1)", border: `1px solid ${rec.completed ? "rgba(16,185,129,0.4)" : "rgba(100,116,139,0.25)"}`, display: "inline-flex", width: "fit-content" }}>
                      <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: rec.completed ? "#10b981" : "#475569", letterSpacing: "0.1em" }}>
                        {rec.completed ? "CLEARED" : "PARTIAL"}
                      </span>
                    </div>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: dc.color, letterSpacing: "0.1em", fontWeight: 700 }}>{rec.difficulty}</span>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: "#22d3ee" }}>{rec.wordsFound}/{rec.totalWords}</span>
                    <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 600, color: "#64748b" }}>{fmt(rec.duration)}</span>
                    <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>{rec.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOAST ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <>
            {/* Desktop pill */}
            <motion.div key={`d-${toast.key}`} className="ws-toast-desktop"
              initial={{ opacity: 0, y: 30, scale: 0.88 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 18, stiffness: 280 }}
              style={{ position: "fixed", bottom: 36, left: "50%", transform: "translateX(-50%)", zIndex: 200, pointerEvents: "none", padding: "10px 22px", borderRadius: 40, background: toast.isLast ? "rgba(14,6,30,0.97)" : "rgba(6,20,14,0.96)", border: `1px solid ${toast.isLast ? "rgba(167,139,250,0.55)" : "rgba(16,185,129,0.5)"}`, backdropFilter: "blur(20px)", display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap", boxShadow: `0 0 28px ${toast.isLast ? "rgba(167,139,250,0.3)" : "rgba(16,185,129,0.3)"},0 8px 28px rgba(0,0,0,0.5)` }}>
              {toast.isLast
                ? <Sparkles style={{ width: 15, height: 15, color: "#a78bfa" }} />
                : <CheckCircle2 style={{ width: 15, height: 15, color: "#10b981" }} />}
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, color: toast.isLast ? "#a78bfa" : "#10b981", letterSpacing: "0.1em" }}>
                {toast.isLast ? "ALL FOUND!" : `FOUND: ${toast.word}`}
              </span>
              {toast.isLast && (
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 14, fontWeight: 900, color: "#a78bfa" }}>
                  +{xpRewardRef.current} XP
                </span>
              )}
            </motion.div>

            {/* Mobile strip */}
            <motion.div key={`m-${toast.key}`} className="ws-toast-mobile"
              initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 22, stiffness: 300 }}
              style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, pointerEvents: "none", padding: "14px 20px calc(14px + env(safe-area-inset-bottom))", background: toast.isLast ? "rgba(14,6,30,0.97)" : "rgba(6,20,14,0.97)", borderTop: `1px solid ${toast.isLast ? "rgba(167,139,250,0.45)" : "rgba(16,185,129,0.45)"}`, backdropFilter: "blur(20px)", display: "none", alignItems: "center", justifyContent: "center", gap: 10 }}>
              {toast.isLast
                ? <Sparkles style={{ width: 18, height: 18, color: "#a78bfa" }} />
                : <CheckCircle2 style={{ width: 18, height: 18, color: "#10b981" }} />}
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 14, fontWeight: 900, color: toast.isLast ? "#a78bfa" : "#10b981", letterSpacing: "0.08em" }}>
                {toast.isLast ? `ALL FOUND! +${xpRewardRef.current} XP` : `FOUND: ${toast.word}`}
              </span>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes wsPulse { 0%,100%{opacity:1;box-shadow:0 0 10px #22d3ee} 50%{opacity:0.3;box-shadow:0 0 4px #22d3ee} }
        @keyframes wsSkel  { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @media(max-width:640px){
          .ws-toast-desktop { display:none!important; }
          .ws-toast-mobile  { display:flex!important; }
        }
        @media(max-width:540px){
          .ws-hist-head { grid-template-columns:1fr 1fr 70px!important; }
          .ws-hist-row > *:nth-child(4),
          .ws-hist-row > *:nth-child(5) { display:none!important; }
          .ws-lb-head { grid-template-columns:30px 1fr 80px!important; }
          .ws-lb-head > *:nth-child(4) { display:none!important; }
        }
      `}</style>
    </div>
  );
}
