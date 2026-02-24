"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Trophy, Crown, Medal, Zap, RefreshCw,
  RotateCcw, Grid3X3, Star, Target, Timer, Layers,
  Rocket, Globe, Flame, Snowflake, Cpu, Shield,
  Gem, Radio, Wifi, Database, Lock, Eye,
  Crosshair, Atom, Hexagon, Sparkles, Radar,
  BrainCircuit, CircuitBoard, Fingerprint, ScanLine,
  FlaskConical, Microscope, Diamond, Triangle, Circle, Square,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";

// ─── Types ────────────────────────────────────────────────────────────────────
type Difficulty = "EASY" | "MEDIUM" | "HARD";
type GameStatus = "idle" | "loading" | "playing" | "won";
interface CardState { id: number; sym: string; label: string; flipped: boolean; matched: boolean; }
interface HistRecord { id: string; difficulty: Difficulty; score: number; moves: number; duration: number; date: Date; }
interface LBEntry { user: { username: string }; totalXp: number; matches: number; }

// ─── Config — identical structure to word-search / tic-tac-toe ───────────────
const DIFF_CONFIG = {
  EASY: {
    label: "EASY",
    color: "#10b981", bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.4)", glow: "rgba(16,185,129,0.25)",
    cols: 4, pairs: 8,
    gridDesc: "4×4 grid", xp: 80, par: 20,
  },
  MEDIUM: {
    label: "MEDIUM",
    color: "#f59e0b", bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.4)", glow: "rgba(245,158,11,0.25)",
    cols: 6, pairs: 18,
    gridDesc: "6×6 grid", xp: 200, par: 40,
  },
  HARD: {
    label: "HARD",
    color: "#ef4444", bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.4)", glow: "rgba(239,68,68,0.25)",
    cols: 8, pairs: 32,
    gridDesc: "8×8 grid", xp: 400, par: 80,
  },
} as const;

// ─── 32 Lucide icon cards — gaming/tech themed ───────────────────────────────
const SYMBOL_DEFS: { id: string; Icon: LucideIcon; label: string; color: string; bg: string }[] = [
  { id: "rocket",      Icon: Rocket,       label: "ROCKET",   color: "#22d3ee", bg: "rgba(34,211,238,0.12)"  },
  { id: "globe",       Icon: Globe,        label: "GLOBE",    color: "#10b981", bg: "rgba(16,185,129,0.12)"  },
  { id: "flame",       Icon: Flame,        label: "FLAME",    color: "#f97316", bg: "rgba(249,115,22,0.12)"  },
  { id: "snowflake",   Icon: Snowflake,    label: "FROST",    color: "#7dd3fc", bg: "rgba(125,211,252,0.12)" },
  { id: "cpu",         Icon: Cpu,          label: "CPU",      color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  { id: "shield",      Icon: Shield,       label: "SHIELD",   color: "#6366f1", bg: "rgba(99,102,241,0.12)"  },
  { id: "gem",         Icon: Gem,          label: "GEM",      color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
  { id: "radio",       Icon: Radio,        label: "SIGNAL",   color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
  { id: "database",    Icon: Database,     label: "DATA",     color: "#60a5fa", bg: "rgba(96,165,250,0.12)"  },
  { id: "lock",        Icon: Lock,         label: "LOCK",     color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
  { id: "eye",         Icon: Eye,          label: "EYE",      color: "#c084fc", bg: "rgba(192,132,252,0.12)" },
  { id: "crosshair",   Icon: Crosshair,    label: "TARGET",   color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
  { id: "atom",        Icon: Atom,         label: "ATOM",     color: "#22d3ee", bg: "rgba(34,211,238,0.12)"  },
  { id: "hexagon",     Icon: Hexagon,      label: "HEX",      color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  { id: "sparkles",    Icon: Sparkles,     label: "SPARK",    color: "#fde047", bg: "rgba(253,224,71,0.12)"  },
  { id: "radar",       Icon: Radar,        label: "RADAR",    color: "#10b981", bg: "rgba(16,185,129,0.12)"  },
  { id: "brain",       Icon: BrainCircuit, label: "NEURAL",   color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  { id: "circuit",     Icon: CircuitBoard, label: "CIRCUIT",  color: "#22d3ee", bg: "rgba(34,211,238,0.12)"  },
  { id: "fingerprint", Icon: Fingerprint,  label: "ID",       color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
  { id: "scan",        Icon: ScanLine,     label: "SCAN",     color: "#6366f1", bg: "rgba(99,102,241,0.12)"  },
  { id: "flask",       Icon: FlaskConical, label: "LAB",      color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
  { id: "microscope",  Icon: Microscope,   label: "SCOPE",    color: "#60a5fa", bg: "rgba(96,165,250,0.12)"  },
  { id: "star",        Icon: Star,         label: "STAR",     color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
  { id: "zap",         Icon: Zap,          label: "BOLT",     color: "#f97316", bg: "rgba(249,115,22,0.12)"  },
  { id: "trophy",      Icon: Trophy,       label: "TROPHY",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)"  },
  { id: "wifi",        Icon: Wifi,         label: "LINK",     color: "#22d3ee", bg: "rgba(34,211,238,0.12)"  },
  { id: "diamond",     Icon: Diamond,      label: "DIAMOND",  color: "#c084fc", bg: "rgba(192,132,252,0.12)" },
  { id: "triangle",    Icon: Triangle,     label: "DELTA",    color: "#fde047", bg: "rgba(253,224,71,0.12)"  },
  { id: "circle",      Icon: Circle,       label: "ORION",    color: "#7dd3fc", bg: "rgba(125,211,252,0.12)" },
  { id: "square",      Icon: Square,       label: "CORE",     color: "#10b981", bg: "rgba(16,185,129,0.12)"  },
  { id: "layers",      Icon: Layers,       label: "MATRIX",   color: "#6366f1", bg: "rgba(99,102,241,0.12)"  },
  { id: "refcw",       Icon: RefreshCw,    label: "CYCLE",    color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
];
// Stable sym key = id string
const SYMBOLS = SYMBOL_DEFS.map(d => ({ sym: d.id, label: d.label, color: d.color }));

// Mirrors sessionXorByte() on the server — same SHA-256 first-byte logic
async function deriveXorByte(sessionId: string): Promise<number> {
  const encoded = new TextEncoder().encode(sessionId);
  const hashBuf = await crypto.subtle.digest("SHA-256", encoded);
  const byte    = new Uint8Array(hashBuf)[0];
  return (byte % 31) + 1; // 1-31, never 0
}

function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildDeck(pairs: number): CardState[] {
  const pool = shuffle(SYMBOLS).slice(0, pairs);
  return shuffle([...pool, ...pool]).map((s, i) => ({
    id: i, sym: s.sym, label: s.label, flipped: false, matched: false,
  }));
}

const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

function rankIcon(i: number) {
  if (i === 0) return <Crown style={{ width: 13, height: 13, color: "#f59e0b" }} />;
  if (i === 1) return <Medal style={{ width: 13, height: 13, color: "#94a3b8" }} />;
  if (i === 2) return <Medal style={{ width: 13, height: 13, color: "#b45309" }} />;
  return <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#475569" }}>{String(i + 1).padStart(2, "0")}</span>;
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function MemCard({
  card, onFlip, color, shake, size,
}: {
  card: CardState; onFlip: (id: number) => void;
  color: string; shake: boolean; size: number;
}) {
  const visible = card.flipped || card.matched;
  const symDef  = SYMBOL_DEFS.find(s => s.id === card.sym);
  const symColor = symDef?.color  ?? "#22d3ee";
  const symBg    = symDef?.bg     ?? "rgba(34,211,238,0.10)";
  const IconComp = symDef?.Icon   ?? Circle;
  const containerSz = Math.max(Math.floor(size * 0.52), 20);
  const iconSz      = Math.max(Math.floor(containerSz * 0.62), 12);

  return (
    <div
      onClick={() => !card.matched && onFlip(card.id)}
      style={{
        width: "100%", aspectRatio: "1",
        cursor: card.matched ? "default" : "pointer",
        perspective: "600px",
        position: "relative",
      }}
    >
      {/* matched glow halo */}
      <AnimatePresence>
        {card.matched && (
          <motion.div
            key="halo"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.7, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute", inset: -3, borderRadius: 13,
              boxShadow: `0 0 20px ${color}88, 0 0 40px ${color}33`,
              border: `1.5px solid ${color}66`,
              pointerEvents: "none", zIndex: 2,
            }}
          />
        )}
      </AnimatePresence>

      {/* flip container */}
      <motion.div
        animate={{ rotateY: visible ? 180 : 0 }}
        transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
        animate-extra={shake ? "shake" : ""}
        style={{
          width: "100%", height: "100%",
          transformStyle: "preserve-3d",
          position: "relative",
          animation: shake ? "memShake 0.5s ease-in-out" : "none",
        }}
      >
        {/* ── BACK ── */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 10,
          backfaceVisibility: "hidden",
          background: "linear-gradient(135deg,rgba(30,41,59,0.98),rgba(15,23,42,0.99))",
          border: "1.5px solid rgba(99,102,241,0.18)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
          transition: "border-color 0.18s, box-shadow 0.18s",
        }}
          className="card-back"
        >
          {/* subtle dot grid */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.15) 1px, transparent 1px)",
            backgroundSize: "12px 12px",
          }} />
          {/* center mark */}
          <div style={{
            position: "relative", zIndex: 1,
            width: "38%", height: "38%",
            border: "1.5px solid rgba(34,211,238,0.2)",
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: "45%", height: "45%",
              background: "rgba(34,211,238,0.12)",
              borderRadius: "50%",
              boxShadow: "0 0 10px rgba(34,211,238,0.2)",
            }} />
          </div>
          {/* corner brackets */}
          {(["tl","tr","bl","br"] as const).map(c => (
            <div key={c} style={{
              position: "absolute",
              top:    c[0]==="t" ? 4 : "auto", bottom: c[0]==="b" ? 4 : "auto",
              left:   c[1]==="l" ? 4 : "auto", right:  c[1]==="r" ? 4 : "auto",
              width: 7, height: 7,
              borderTop:    c[0]==="t" ? "1.5px solid rgba(34,211,238,0.35)" : undefined,
              borderBottom: c[0]==="b" ? "1.5px solid rgba(34,211,238,0.35)" : undefined,
              borderLeft:   c[1]==="l" ? "1.5px solid rgba(34,211,238,0.35)" : undefined,
              borderRight:  c[1]==="r" ? "1.5px solid rgba(34,211,238,0.35)" : undefined,
            }} />
          ))}
        </div>

        {/* ── FRONT ── */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 10,
          backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          background: card.matched
            ? `linear-gradient(135deg,${color}1a 0%,${color}08 100%)`
            : "linear-gradient(135deg,rgba(16,24,40,0.99),rgba(10,15,28,0.99))",
          border: `1.5px solid ${card.matched ? color + "55" : "rgba(34,211,238,0.18)"}`,
          boxShadow: card.matched ? `0 0 18px ${color}33` : "0 2px 12px rgba(0,0,0,0.5)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: size >= 80 ? 3 : 1,
          overflow: "hidden",
        }}>
          {/* faint grid on matched */}
          {card.matched && (
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `radial-gradient(circle, ${color}18 1px, transparent 1px)`,
              backgroundSize: "10px 10px",
            }} />
          )}

          {/* lucide icon */}
          <motion.div
            animate={card.matched ? { scale: [1, 1.4, 0.85, 1.1, 1], rotate: [0, -12, 12, -4, 0] } : {}}
            transition={{ duration: 0.55 }}
            style={{
              position: "relative", zIndex: 1,
              width: containerSz, height: containerSz,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: "50%",
              background: card.matched ? symBg : `${symColor}0d`,
              boxShadow: card.matched
                ? `0 0 22px ${symColor}77, 0 0 10px ${symColor}44`
                : `0 0 10px ${symColor}22`,
              transition: "background 0.3s, box-shadow 0.3s",
            }}
          >
            <IconComp style={{
              width: iconSz, height: iconSz,
              color: symColor,
              filter: card.matched
                ? `drop-shadow(0 0 8px ${symColor}) drop-shadow(0 0 4px ${symColor}99)`
                : `drop-shadow(0 0 4px ${symColor}88)`,
              strokeWidth: 1.5,
              flexShrink: 0,
            }} />
          </motion.div>

          {/* label — only on bigger cards */}
          {size >= 55 && (
            <span style={{
              fontFamily: "'Orbitron',sans-serif",
              fontSize: size >= 90 ? 7 : size >= 70 ? 6 : 5,
              fontWeight: 700, letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: card.matched ? color + "cc" : "rgba(34,211,238,0.28)",
              position: "relative", zIndex: 1,
              whiteSpace: "nowrap",
            }}>
              {card.label}
            </span>
          )}

          {/* match burst */}
          {card.matched && (
            <motion.div
              initial={{ scale: 0, opacity: 0.6 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 0.55 }}
              style={{
                position: "absolute", inset: 0,
                background: `radial-gradient(circle at center, ${color}44 0%, transparent 70%)`,
                borderRadius: 10, pointerEvents: "none",
              }}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MemoryPage() {
  const { user } = useAuthStore();

  const [diff,       setDiff]       = useState<Difficulty>("EASY");
  const [status,     setStatus]     = useState<GameStatus>("idle");
  const [cards,      setCards]      = useState<CardState[]>([]);
  const [flipped,    setFlipped]    = useState<number[]>([]);
  const [moves,      setMoves]      = useState(0);
  const [matched,    setMatched]    = useState(0);
  const [time,       setTime]       = useState(0);
  const [lock,       setLock]       = useState(false);
  const [shakeIds,   setShakeIds]   = useState<number[]>([]);
  const [score,      setScore]      = useState(0);
  const [xp,         setXp]         = useState(0);
  const [sessionXp,  setSessionXp]  = useState(0);
  const [won,        setWon]        = useState(false);
  const [lb,         setLb]         = useState<LBEntry[]>([]);
  const [lbLoad,     setLbLoad]     = useState(true);
  const [hist,       setHist]       = useState<HistRecord[]>([]);
  const [cardSize,   setCardSize]   = useState(80);

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef    = useRef(0);
  const savedRef    = useRef(false);
  const boardRef    = useRef<HTMLDivElement>(null);
  const sessionRef  = useRef<string | null>(null);   // server session ID
  const flippingRef = useRef(false);                 // flip request in flight

  const cfg = DIFF_CONFIG[diff];

  // responsive card size
  useEffect(() => {
    const calc = () => {
      if (!boardRef.current) return;
      const w = boardRef.current.clientWidth - 24;
      const gap = 6;
      const size = Math.floor((w - gap * (cfg.cols - 1)) / cfg.cols);
      setCardSize(size);
    };
    calc();
    const ro = new ResizeObserver(calc);
    if (boardRef.current) ro.observe(boardRef.current);
    return () => ro.disconnect();
  }, [diff, status]);

  // leaderboard
  useEffect(() => {
    setLbLoad(true);
    Promise.all([
      fetch("/api/leaderboard?gameType=MEMORY").then(r => r.json()),
      user ? fetch("/api/games/history?gameType=MEMORY&limit=20").then(r => r.json()) : Promise.resolve(null),
    ]).then(([lbR, hR]) => {
      if (lbR?.success) setLb(lbR.data.slice(0, 8));
      if (hR?.success && hR.data?.length) {
        setHist(hR.data.map((g: any) => ({
          id: g.id, difficulty: g.difficulty,
          score: g.score, moves: g.moves ?? 0,
          duration: g.duration, date: new Date(g.createdAt),
        })));
      }
    }).catch(console.error).finally(() => setLbLoad(false));
  }, [user]);

  // timer
  useEffect(() => {
    if (status === "playing") {
      startRef.current = Date.now() - time * 1000;
      timerRef.current = setInterval(() => setTime(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  // win check for guest mode only (session mode win triggered by /flip response)
  useEffect(() => {
    if (status !== "playing" || !cards.length || sessionRef.current) return;
    if (cards.length === cfg.pairs * 2 && cards.every(c => c.matched)) handleWin(moves, 0, 0, 0);
  }, [cards]);

  // score/xpEarned/finalMoves come directly from the /flip response when completed=true
  // /finish is only used as a fallback read (e.g. page refresh recovery) — it awards nothing
  const handleWin = useCallback((finalMoves: number, winScore: number, winXp: number, winNewXp: number) => {
    if (savedRef.current) return;
    savedRef.current = true;
    setStatus("won"); setWon(true);
    if (!user) return;
    setScore(winScore);
    setXp(winXp);
    setMoves(finalMoves);
    setSessionXp(s => s + winXp);
    setHist(prev => [{ id: crypto.randomUUID(), difficulty: diff, score: winScore, moves: finalMoves, duration: time, date: new Date() }, ...prev].slice(0, 20));
    if (typeof (window as any).__refreshXp === "function") (window as any).__refreshXp();
    fetch("/api/leaderboard?gameType=MEMORY").then(r => r.json()).then(l => { if (l?.success) setLb(l.data.slice(0, 8)); });
  }, [user, diff, time]);

  const startGame = async () => {
    if (status === "loading") return;
    savedRef.current  = false;
    sessionRef.current = null;
    setStatus("loading");
    setCards([]); setFlipped([]); setMoves(0); setMatched(0);
    setTime(0); setScore(0); setXp(0); setLock(false); setShakeIds([]); setWon(false);

    if (!user) {
      // Guest mode — client-side only, no session
      const deck = buildDeck(cfg.pairs);
      setCards(deck);
      setStatus("playing");
      setTimeout(() => {
        if (!boardRef.current) return;
        const w = boardRef.current.clientWidth - 24;
        setCardSize(Math.floor((w - 6 * (cfg.cols - 1)) / cfg.cols));
      }, 50);
      return;
    }

    try {
      const res  = await fetch("/api/games/memory/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty: diff }),
      });
      const json = await res.json();
      if (!json.success) { setStatus("idle"); return; }

      sessionRef.current = json.sessionId;

      // Decode dIdx: server XOR'd the SYMBOL_DEFS index with a byte derived from sessionId.
      // We recompute the same XOR byte client-side using a simple hash of the sessionId.
      // Network tab shows numbers like 17, 4, 23 — never "triangle", "gem", etc.
      // Pair positions are still unknown — dIdx tells you the icon, not which card matches.
      const xorByte = await deriveXorByte(json.sessionId);
      const serverCards: CardState[] = json.cards.map((c: { id: number; dIdx: number }) => {
        const symIndex = c.dIdx ^ xorByte;
        const sym      = SYMBOL_DEFS[symIndex]?.id ?? "";
        return {
          id:      c.id,
          sym,
          label:   SYMBOL_DEFS[symIndex]?.label ?? "",
          flipped: false,
          matched: false,
        };
      });
      setCards(serverCards);
      setStatus("playing");
      setTimeout(() => {
        if (!boardRef.current) return;
        const w = boardRef.current.clientWidth - 24;
        setCardSize(Math.floor((w - 6 * (cfg.cols - 1)) / cfg.cols));
      }, 50);
    } catch (e) {
      console.error(e);
      setStatus("idle");
    }
  };

  const handleFlip = useCallback(async (id: number) => {
    if (lock || status !== "playing" || flippingRef.current) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched || flipped.includes(id)) return;

    // Flip this card visually immediately
    setCards(prev => prev.map(c => c.id === id ? { ...c, flipped: true } : c));
    const next = [...flipped, id];
    setFlipped(next);

    if (next.length < 2) return; // wait for second card

    setLock(true);
    setMoves(m => m + 1);
    const [idA, idB] = next;

    // ── Session mode: server validates the pair ───────────────────────────
    if (sessionRef.current && user) {
      flippingRef.current = true;
      try {
        const res  = await fetch("/api/games/memory/flip", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionRef.current, cardA: idA, cardB: idB }),
        });
        const json = await res.json();

        // Reveal sym from server — store permanently so card stays visible after flip
        const revealA = { sym: json.symA, label: SYMBOL_DEFS.find(s => s.id === json.symA)?.label ?? json.symA };
        const revealB = { sym: json.symB, label: SYMBOL_DEFS.find(s => s.id === json.symB)?.label ?? json.symB };
        setCards(prev => prev.map(c =>
          c.id === idA ? { ...c, ...revealA } :
          c.id === idB ? { ...c, ...revealB } : c
        ));

        if (json.match) {
          setTimeout(() => {
            setCards(prev => prev.map(c =>
              next.includes(c.id) ? { ...c, matched: true, flipped: false } : c
            ));
            setMatched(json.matchedPairs);
            setFlipped([]); setLock(false);
            if (json.completed) handleWin(json.moves, json.score, json.xpEarned, json.newXp);
          }, 420);
        } else {
          setShakeIds(next);
          setTimeout(() => {
            // Flip back face-down but KEEP the sym — player already saw it, that's fair
            setCards(prev => prev.map(c =>
              next.includes(c.id) ? { ...c, flipped: false } : c
            ));
            setFlipped([]); setShakeIds([]); setLock(false);
          }, 820);
        }
      } catch {
        // network error — flip back both
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            next.includes(c.id) ? { ...c, flipped: false } : c
          ));
          setFlipped([]); setLock(false);
        }, 400);
      } finally {
        flippingRef.current = false;
      }
      return;
    }

    // ── Guest mode: client-side validation ───────────────────────────────
    const [a, b] = next.map(fid => cards.find(c => c.id === fid)!);
    if (a.sym === b.sym) {
      setTimeout(() => {
        setCards(prev => prev.map(c => next.includes(c.id) ? { ...c, matched: true, flipped: false } : c));
        setMatched(m => m + 1);
        setFlipped([]); setLock(false);
      }, 420);
    } else {
      setShakeIds(next);
      setTimeout(() => {
        setCards(prev => prev.map(c => next.includes(c.id) ? { ...c, flipped: false } : c));
        setFlipped([]); setShakeIds([]); setLock(false);
      }, 820);
    }
  }, [cards, flipped, lock, status, user]);

  const reset = () => {
    savedRef.current   = false;
    sessionRef.current = null;
    flippingRef.current = false;
    setCards([]); setFlipped([]); setMoves(0); setMatched(0);
    setTime(0); setScore(0); setXp(0);
    setLock(false); setShakeIds([]); setWon(false); setStatus("idle");
  };

  const progress = cfg.pairs > 0 ? (matched / cfg.pairs) * 100 : 0;
  const underPar = moves > 0 && moves <= cfg.par;

  return (
    <div style={{ width: "100%", minHeight: "100vh", paddingBottom: 32, boxSizing: "border-box" }}>

      {/* win flash */}
      <AnimatePresence>
        {won && (
          <motion.div key="wf"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.35, 0, 0.22, 0, 0.1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4 }}
            style={{ position: "fixed", inset: 0, zIndex: 10, pointerEvents: "none", background: "radial-gradient(ellipse at center,rgba(99,102,241,0.6) 0%,transparent 65%)" }}
          />
        )}
      </AnimatePresence>

      {/* win particles */}
      <AnimatePresence>
        {won && [...Array(18)].map((_, i) => (
          <motion.div key={`wp${i}`}
            initial={{ opacity: 1, x: "50vw", y: "45vh", scale: 0 }}
            animate={{
              opacity: [1, 1, 0],
              x: `calc(50vw + ${Math.cos(i / 18 * Math.PI * 2) * (160 + Math.random() * 80)}px)`,
              y: `calc(45vh + ${Math.sin(i / 18 * Math.PI * 2) * (140 + Math.random() * 60)}px)`,
              scale: [0, 1.6, 0],
            }}
            transition={{ duration: 1.3, delay: i * 0.045, ease: "easeOut" }}
            style={{
              position: "fixed", zIndex: 20, pointerEvents: "none",
              width: 7, height: 7, borderRadius: "50%",
              background: ["#22d3ee","#6366f1","#f59e0b","#10b981","#ef4444","#a78bfa","#f472b6"][i % 7],
              filter: "blur(0.5px)",
            }}
          />
        ))}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/games"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", marginBottom: 12, opacity: 0.7 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
        >
          <ArrowLeft style={{ width: 13, height: 13, color: "#22d3ee" }} />
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#22d3ee", letterSpacing: "0.3em", textTransform: "uppercase" }}>BACK TO ARCADE</span>
        </Link>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(22px,5vw,46px)", fontWeight: 900, color: "#f8fafc", textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", lineHeight: 1, margin: 0 }}>
              COSMIC <span style={{ color: "#22d3ee", textShadow: "0 0 20px rgba(34,211,238,0.5)" }}>MATCH</span>
            </h1>
            <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 10, fontWeight: 600, color: "#334155", letterSpacing: "0.25em", textTransform: "uppercase", marginTop: 4 }}>
              MEMORY MATRIX · v4.2
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#334155", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 3 }}>XP Earned This Session</div>
            <motion.div key={sessionXp} initial={{ scale: 1.3, color: "#fff" }} animate={{ scale: 1, color: "#a78bfa" }}
              style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(20px,4vw,26px)", fontWeight: 900, filter: "drop-shadow(0 0 10px rgba(167,139,250,0.4))" }}>
              {sessionXp.toLocaleString()}
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { label: "PAIRS",  val: `${matched}/${cfg.pairs}`, col: "#22d3ee",  glow: "rgba(34,211,238,0.25)"   },
          { label: "MOVES",  val: moves,                      col: "#a78bfa",  glow: "rgba(167,139,250,0.25)"  },
          { label: "PAR",    val: cfg.par,                    col: "#10b981",  glow: "rgba(16,185,129,0.25)"   },
          { label: "TIME",   val: status === "playing" || status === "won" ? fmt(time) : "--:--", col: "#f59e0b", glow: "rgba(245,158,11,0.25)" },
        ].map(s => (
          <motion.div
            key={s.label}
            animate={s.label === "PAIRS" && matched > 0 ? { scale: [1, 1.06, 1], boxShadow: [`0 0 0px ${s.glow}`, `0 0 16px ${s.glow}`, `0 0 0px ${s.glow}`] } : {}}
            transition={{ duration: 0.4 }}
            style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
          >
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, fontWeight: 700, color: "#334155", letterSpacing: "0.2em", textTransform: "uppercase" }}>{s.label}</span>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(14px,3.5vw,22px)", fontWeight: 900, color: s.col, filter: `drop-shadow(0 0 6px ${s.col}80)`, lineHeight: 1 }}>{s.val}</span>
          </motion.div>
        ))}
      </div>

      {/* ── MAIN — single centered column like word-search ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 860, margin: "0 auto" }}>

        {/* STATUS BANNER */}
        <motion.div key={`${status}-${won}`} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: won ? "rgba(4,8,36,0.95)" : "rgba(15,23,42,0.85)",
            backdropFilter: "blur(16px)",
            border: `1px solid ${won ? "rgba(99,102,241,0.45)" : "rgba(34,211,238,0.2)"}`,
            borderRadius: 14, padding: "12px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 8, position: "relative", overflow: "hidden",
          }}
        >
          {won && (
            <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.5, ease: "linear" }}
              style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(99,102,241,0.18),transparent)", pointerEvents: "none" }} />
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
              background: won ? "#f59e0b" : status === "playing" ? "#22d3ee" : "#475569",
              boxShadow: `0 0 10px ${won ? "#f59e0b" : status === "playing" ? "#22d3ee" : "#475569"}`,
              animation: status === "playing" ? "memPulse 1.5s infinite" : "none",
            }} />
            <div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", color: won ? "#f59e0b" : status === "playing" ? "#22d3ee" : "#94a3b8" }}>
                {won ? "MISSION COMPLETE!" : status === "playing" ? `FLIP & MATCH · ${cfg.pairs - matched} PAIRS LEFT` : "READY TO LAUNCH"}
              </div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#475569", fontWeight: 600 }}>
                {won ? `Score: ${score.toLocaleString()} · +${xp} XP earned` : status === "playing" ? `${moves} moves · par is ${cfg.par}` : "Choose difficulty & press START"}
              </div>
            </div>
          </div>
          {status === "playing" && (
            <div style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", flexShrink: 0, position: "relative", zIndex: 1 }}>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: "#f8fafc" }}>{fmt(time)}</span>
            </div>
          )}
        </motion.div>

        {/* PROGRESS BAR */}
        {(status === "playing" || status === "won") && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ padding: "11px 16px", borderRadius: 13, background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", gap: 12 }}>
            <Target style={{ width: 14, height: 14, color: "#a78bfa", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>
                  Match <span style={{ color: "#f8fafc", fontWeight: 700 }}>all {cfg.pairs}</span> pairs to complete
                </span>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, color: "#a78bfa" }}>+{cfg.xp} XP</span>
              </div>
              <div style={{ height: 5, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.35, type: "spring", damping: 20 }}
                  style={{ height: "100%", borderRadius: 4, background: won ? "linear-gradient(90deg,#10b981,#22d3ee)" : `linear-gradient(90deg,${cfg.color},${cfg.color}aa)`, position: "relative", overflow: "hidden" }}
                >
                  {status === "playing" && (
                    <motion.div animate={{ x: ["-100%","200%"] }} transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                      style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)" }} />
                  )}
                </motion.div>
              </div>
            </div>
            {/* pair dots */}
            <div style={{ display: "flex", gap: 3, flexShrink: 0, flexWrap: "wrap", maxWidth: 100 }}>
              {Array.from({ length: Math.min(cfg.pairs, 18) }).map((_, i) => (
                <motion.div key={i}
                  animate={i < matched ? { scale: [1, 1.5, 1] } : {}} transition={{ duration: 0.22 }}
                  style={{ width: 7, height: 7, borderRadius: "50%", background: i < matched ? cfg.color : "rgba(255,255,255,0.06)", border: `1px solid ${i < matched ? cfg.color + "55" : "rgba(255,255,255,0.08)"}`, boxShadow: i < matched ? `0 0 6px ${cfg.color}88` : "none", transition: "all 0.2s" }}
                />
              ))}
              {cfg.pairs > 18 && (
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: "#334155", alignSelf: "center" }}>+{cfg.pairs - 18}</span>
              )}
            </div>
          </motion.div>
        )}

        {/* ── CARD GRID ── */}
        <div
          ref={boardRef}
          style={{
            background: "rgba(8,12,28,0.97)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(34,211,238,0.1)",
            borderRadius: 20, padding: 12,
            boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.02)",
            minHeight: 200,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {/* loading */}
          {status === "loading" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "48px 20px" }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <Cpu style={{ width: 46, height: 46, color: "#22d3ee" }} />
              </motion.div>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, color: "#22d3ee", letterSpacing: "0.15em" }}>GENERATING DECK…</span>
              <div style={{ width: 140, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <motion.div animate={{ x: ["-100%","100%"] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                  style={{ height: "100%", width: "50%", background: "linear-gradient(90deg,transparent,#22d3ee,transparent)", borderRadius: 2 }} />
              </div>
            </div>
          )}

          {/* idle placeholder */}
          {status === "idle" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "clamp(24px,5vw,48px) 20px", textAlign: "center" }}>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.08, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                style={{ fontSize: 52, filter: "drop-shadow(0 0 20px rgba(99,102,241,0.5))" }}
              >
                🌌
              </motion.div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(14px,3vw,18px)", fontWeight: 900, color: "#f8fafc", letterSpacing: "0.1em" }}>NEURAL SYNC READY</div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, color: "#475569" }}>{cfg.pairs * 2} cards · {cfg.pairs} pairs · par {cfg.par} moves</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                {SYMBOL_DEFS.slice(0, 8).map((s, i) => (
                  <motion.div key={i}
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -5, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.2 }}
                    style={{ width: 36, height: 36, borderRadius: 9, background: s.bg, border: `1px solid ${s.color}33`, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <s.Icon style={{ width: 18, height: 18, color: s.color, filter: `drop-shadow(0 0 4px ${s.color}88)`, strokeWidth: 1.5 }} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* actual grid */}
          {(status === "playing" || status === "won") && (
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cfg.cols}, 1fr)`,
              gap: 6,
              width: "100%",
            }}>
              {cards.map(card => (
                <MemCard
                  key={card.id}
                  card={{ ...card, flipped: card.flipped || shakeIds.includes(card.id) }}
                  onFlip={handleFlip}
                  color={cfg.color}
                  shake={shakeIds.includes(card.id)}
                  size={cardSize}
                />
              ))}
            </div>
          )}
        </div>

        {/* WIN CARD */}
        <AnimatePresence>
          {won && (
            <motion.div key="wc"
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", damping: 14, stiffness: 220 }}
              style={{
                background: "rgba(4,8,24,0.96)", backdropFilter: "blur(16px)",
                border: "1px solid rgba(99,102,241,0.4)", borderRadius: 18,
                padding: 20, boxShadow: "0 0 40px rgba(99,102,241,0.18)",
                position: "relative", overflow: "hidden",
              }}
            >
              <motion.div animate={{ x: ["-100%","200%"] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1, ease: "linear" }}
                style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(99,102,241,0.08),transparent)", pointerEvents: "none" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <motion.div animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.3, 1] }} transition={{ duration: 0.8, delay: 0.1 }}>
                    <Star style={{ width: "clamp(24px,5vw,36px)", height: "clamp(24px,5vw,36px)", color: "#f59e0b", filter: "drop-shadow(0 0 12px rgba(245,158,11,0.6))" }} />
                  </motion.div>
                  <div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(12px,3vw,17px)", fontWeight: 900, color: "#a78bfa" }}>ALL PAIRS MATCHED!</div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#22d3ee", fontWeight: 600, letterSpacing: "0.15em", marginTop: 2 }}>
                      MISSION COMPLETE · {cfg.label}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: "#334155", letterSpacing: "0.2em", marginBottom: 2 }}>XP EARNED</div>
                  <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 9, delay: 0.2 }}
                    style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(28px,6vw,44px)", fontWeight: 900, color: "#a78bfa", filter: "drop-shadow(0 0 18px rgba(167,139,250,0.65))", lineHeight: 1 }}>
                    +{xp}
                  </motion.div>
                </div>
              </div>
              {/* stat chips */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 8, marginTop: 16 }}>
                {[
                  { label: "SCORE",  value: score.toLocaleString(), color: "#22d3ee"  },
                  { label: "MOVES",  value: moves,                   color: underPar ? "#10b981" : "#a78bfa" },
                  { label: "PAR",    value: cfg.par,                 color: "#10b981"  },
                  { label: "TIME",   value: fmt(time),               color: "#f59e0b"  },
                ].map(item => (
                  <div key={item.label} style={{ padding: "8px 10px", borderRadius: 10, background: `${item.color}11`, border: `1px solid ${item.color}33`, textAlign: "center" }}>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, color: "#475569", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>
              {underPar && (
                <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
                  <Zap style={{ width: 11, height: 11, color: "#10b981" }} />
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: "#10b981", letterSpacing: "0.08em" }}>UNDER PAR — BONUS XP EARNED!</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── DIFFICULTY SELECTOR — exact same as word-search / tic-tac-toe ── */}
        <div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#334155", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 8, textAlign: "center" }}>
            SELECT DIFFICULTY
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {(["EASY","MEDIUM","HARD"] as Difficulty[]).map(d => {
              const dc = DIFF_CONFIG[d];
              const active = diff === d;
              const disabled = status === "playing";
              return (
                <motion.button key={d}
                  onClick={() => { if (!disabled) setDiff(d); }}
                  disabled={disabled}
                  whileHover={!disabled ? { y: -2 } : {}}
                  whileTap={!disabled ? { scale: 0.96 } : {}}
                  style={{
                    padding: "11px 6px", borderRadius: 13,
                    background: active ? dc.bg : "rgba(15,23,42,0.6)",
                    border: `2px solid ${active ? dc.border : "rgba(255,255,255,0.05)"}`,
                    cursor: disabled ? "not-allowed" : "pointer",
                    transition: "all 0.2s", textAlign: "center",
                    boxShadow: active ? `0 0 18px ${dc.glow}` : "none",
                    opacity: disabled && !active ? 0.28 : 1,
                    position: "relative", overflow: "hidden",
                  }}
                >
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(8px,2.5vw,11px)", fontWeight: 900, color: active ? dc.color : "#334155", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>{dc.label}</div>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 9, color: active ? dc.color + "aa" : "#1e293b", fontWeight: 600, marginBottom: 3 }}>{dc.gridDesc}</div>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 900, color: active ? "#a78bfa" : "#334155" }}>+{dc.xp} XP</div>
                  {active && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: dc.color, boxShadow: `0 0 8px ${dc.color}` }} />}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── ACTION BUTTONS — exact same pattern as word-search ── */}
        {(status === "idle" || status === "loading") && (
          <motion.button onClick={startGame} disabled={status === "loading"} whileHover={status !== "loading" ? { scale: 1.03, y: -2 } : {}} whileTap={{ scale: 0.97 }}
            style={{ width: "100%", padding: "clamp(13px,3vw,17px)", borderRadius: 15, background: "linear-gradient(135deg,#22d3ee,#6366f1)", border: "none", cursor: status === "loading" ? "not-allowed" : "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(12px,3vw,15px)", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: "#020617", boxShadow: "0 0 30px rgba(34,211,238,0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, position: "relative", overflow: "hidden", opacity: status === "loading" ? 0.7 : 1 }}>
            <motion.div animate={{ x: ["-100%","200%"] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.8, ease: "linear" }} style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)", pointerEvents: "none" }} />
            <Zap style={{ width: 18, height: 18 }} /> {status === "loading" ? "GENERATING…" : "START GAME"}
          </motion.button>
        )}
        {status === "playing" && (
          <motion.button onClick={reset} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{ width: "100%", padding: 13, borderRadius: 15, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <RefreshCw style={{ width: 14, height: 14 }} /> ABORT & RESET
          </motion.button>
        )}
        {status === "won" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <motion.button onClick={startGame} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
              style={{ padding: 14, borderRadius: 15, background: "linear-gradient(135deg,#22d3ee,#6366f1)", border: "none", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "#020617", boxShadow: "0 0 20px rgba(34,211,238,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <RefreshCw style={{ width: 14, height: 14 }} /> PLAY AGAIN
            </motion.button>
            <motion.button onClick={reset} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              style={{ padding: 14, borderRadius: 15, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              MENU
            </motion.button>
          </div>
        )}

      </div>{/* end center column */}

      {/* ── TOP PLAYERS — full width, identical to word-search ── */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 22, height: 2, background: "linear-gradient(90deg,#f59e0b,#ef4444)", borderRadius: 1 }} />
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.3em", textTransform: "uppercase" }}>TOP PLAYERS</span>
        </div>
        <div style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          {/* header */}
          <div className="mem-lb-head" style={{ display: "grid", gridTemplateColumns: "44px 1fr 88px 68px", gap: 10, padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            {["RANK","PLAYER","TOTAL XP","MATCHES"].map(h => (
              <span key={h} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#475569", letterSpacing: "0.25em", textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>
          {lbLoad ? (
            <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              {[...Array(5)].map((_, i) => <div key={i} style={{ height: 36, borderRadius: 8, background: "rgba(255,255,255,0.03)", animation: "memSkel 1.5s infinite", animationDelay: `${i * 0.1}s` }} />)}
            </div>
          ) : lb.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <Grid3X3 style={{ width: 22, height: 22, color: "#334155", margin: "0 auto 8px" }} />
              <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#475569", letterSpacing: "0.15em" }}>NO RECORDS YET</p>
            </div>
          ) : lb.map((e, i) => {
            const top3 = i < 3;
            const rankColor = i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "#475569";
            return (
              <motion.div key={i}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.035 }}
                className="mem-lb-head"
                style={{ display: "grid", gridTemplateColumns: "44px 1fr 88px 68px", gap: 10, padding: "11px 18px", borderBottom: i < lb.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center", background: top3 ? `rgba(${i===0?"245,158,11":i===1?"148,163,184":"180,83,9"},0.04)` : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {rankIcon(i)}
                </div>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: top3 ? "#f8fafc" : "#475569", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.user.username}</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: top3 ? rankColor : "#a78bfa" }}>{e.totalXp.toLocaleString()}</span>
                  <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 8, color: "#334155", fontWeight: 600 }}>XP</span>
                </div>
                <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 600, color: "#64748b" }}>{e.matches}</span>
              </motion.div>
            );
          })}
          {user && (
            <div className="mem-lb-head" style={{ display: "grid", gridTemplateColumns: "44px 1fr 88px 68px", gap: 10, padding: "10px 18px", borderTop: "1px solid rgba(255,255,255,0.04)", alignItems: "center", background: "rgba(99,102,241,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#22d3ee)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 900, color: "#fff" }}>{user.username[0].toUpperCase()}</span>
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, color: "#6366f1", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 1 }}>YOU</div>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.username}</div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: "#f59e0b" }}>{sessionXp > 0 ? sessionXp.toLocaleString() : "—"}</span>
                {sessionXp > 0 && <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 8, color: "#334155", fontWeight: 600 }}>XP</span>}
              </div>
              <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#475569" }}>—</span>
            </div>
          )}
        </div>
      </div>

      {/* ── GAME HISTORY — identical to word-search ── */}
      <AnimatePresence>
        {hist.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 22, height: 2, background: "linear-gradient(90deg,#22d3ee,#6366f1)", borderRadius: 1 }} />
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#22d3ee", letterSpacing: "0.3em", textTransform: "uppercase" }}>GAME HISTORY</span>
            </div>
            <div style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
              <div className="mem-hist-head" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 70px 70px", gap: 10, padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {["RESULT","DIFFICULTY","SCORE","TIME","PLAYED"].map(h => (
                  <span key={h} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#475569", letterSpacing: "0.25em", textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>
              {hist.map((r, i) => {
                const dc = DIFF_CONFIG[r.difficulty];
                return (
                  <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="mem-hist-head mem-hist-row"
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 70px 70px", gap: 10, padding: "11px 18px", borderBottom: i < hist.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}>
                    <div style={{ padding: "3px 9px", borderRadius: 6, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.4)", display: "inline-flex", width: "fit-content" }}>
                      <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: "#10b981", letterSpacing: "0.1em" }}>CLEARED</span>
                    </div>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: dc.color, letterSpacing: "0.1em", fontWeight: 700 }}>{r.difficulty}</span>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: r.score > 0 ? "#f59e0b" : "#475569" }}>{r.score > 0 ? r.score.toLocaleString() : "—"}</span>
                    <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 600, color: "#64748b" }}>{fmt(r.duration)}</span>
                    <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>{r.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes memPulse { 0%,100%{opacity:1;box-shadow:0 0 10px #22d3ee} 50%{opacity:0.3;box-shadow:0 0 4px #22d3ee} }
        @keyframes memSkel  { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes memShake {
          0%,100% { transform: rotateY(180deg) translateX(0); }
          20%     { transform: rotateY(180deg) translateX(-6px); }
          40%     { transform: rotateY(180deg) translateX(6px); }
          60%     { transform: rotateY(180deg) translateX(-4px); }
          80%     { transform: rotateY(180deg) translateX(4px); }
        }
        .card-back:hover {
          border-color: rgba(34,211,238,0.35) !important;
          box-shadow: 0 0 16px rgba(34,211,238,0.15), 0 2px 12px rgba(0,0,0,0.5) !important;
        }
        @media(max-width:540px){
          .mem-lb-head  { grid-template-columns:36px 1fr 90px !important; }
          .mem-lb-head > *:nth-child(4) { display:none !important; }
          .mem-hist-head { grid-template-columns:1fr 1fr 70px !important; }
          .mem-hist-row > *:nth-child(4),
          .mem-hist-row > *:nth-child(5) { display:none !important; }
        }
      `}</style>
    </div>
  );
}
