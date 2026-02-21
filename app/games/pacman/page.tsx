"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Trophy, Crown, Medal, Zap, Ghost,
  Grid3X3, RefreshCw, Maximize2, Minimize2, Clock, Star,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";

type GameStatus = "idle" | "loading" | "playing" | "finished";

interface LBEntry { user: { username: string }; highScore: number; }
interface HistRec { id: string; score: number; stage: number; xpEarned: number; duration: number; createdAt: string; }

// XP formula (mirrors server):
//   base       = floor(log10(score + 1) * 10)
//   stageBonus = max(0, stage - 1) * 15
function calcXp(score: number, stage: number): number {
  if (score <= 0) return 0;
  const base = Math.floor(Math.log10(score + 1) * 10);
  const stageBonus = Math.max(0, stage - 1) * 15;
  return base + stageBonus;
}

const C = { cyan: "#22d3ee", indigo: "#6366f1", text: "#f8fafc", muted: "#64748b" };
const card = { background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(34,211,238,0.12)", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.4)" };
const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

function rankStyle(i: number) {
  if (i === 0) return { color: "#f59e0b", Icon: Crown };
  if (i === 1) return { color: "#94a3b8", Icon: Medal };
  if (i === 2) return { color: "#b45309", Icon: Medal };
  return { color: "#475569", Icon: null };
}

export default function PacmanPage() {
  const { user } = useAuthStore();

  const [status, setStatus] = useState<GameStatus>("idle");
  const [fullscreen, setFullscreen] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [lastStage, setLastStage] = useState(1);
  const [lastXp, setLastXp] = useState(0);
  const [liveScore, setLiveScore] = useState(0);
  const [liveStage, setLiveStage] = useState(1);
  const [gameTime, setGameTime] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LBEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [history, setHistory] = useState<HistRec[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [stats, setStats] = useState({ played: 0, bestScore: 0, bestStage: 0 });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const savedRef = useRef(false);
  const tokenRef = useRef<string>("");   // session token from /start
  const iframeSrc = useRef<string>("/pacman/index.html");

  // ── Leaderboard ─────────────────────────────────────────────────────────
  const fetchLb = useCallback(() => {
    setLbLoading(true);
    fetch("/api/leaderboard?gameType=PACMAN")
      .then(r => r.json())
      .then(j => { if (j.success) setLeaderboard(j.data.slice(0, 8)); })
      .catch(console.error)
      .finally(() => setLbLoading(false));
  }, []);

  useEffect(() => { fetchLb(); }, [fetchLb]);

  // ── History (load from DB on mount + after each game) ───────────────────
  const fetchHistory = useCallback(() => {
    if (!user) return;
    setHistLoading(true);
    fetch("/api/games/pacman/history")
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setHistory(j.data);
          if (j.data.length > 0) {
            const best = j.data.reduce((a: HistRec, b: HistRec) => b.score > a.score ? b : a);
            setStats(s => ({
              played: j.data.length,
              bestScore: best.score,
              bestStage: Math.max(s.bestStage, best.stage),
            }));
          }
        }
      })
      .catch(console.error)
      .finally(() => setHistLoading(false));
  }, [user]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // ── Timer ────────────────────────────────────────────────────────────────
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
  }, [status]); // eslint-disable-line

  // ── Save score ───────────────────────────────────────────────────────────
  const saveScore = useCallback(async (score: number, stage: number) => {
    if (savedRef.current) return;
    savedRef.current = true;

    const dur = Math.max(Math.floor((Date.now() - startRef.current) / 1000), 5);
    const xp = calcXp(score, stage);

    setLastScore(score);
    setLastStage(stage);
    setLastXp(xp);
    setStatus("finished");
    setStats(s => ({
      played: s.played + 1,
      bestScore: Math.max(s.bestScore, score),
      bestStage: Math.max(s.bestStage, stage),
    }));

    if (user && score > 0) {
      try {
        const res = await fetch("/api/games/pacman/finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenRef.current, score, stage, duration: dur }),
        });
        const json = await res.json();
        if (json.success) {
          setSessionXp(s => s + (json.xpEarned ?? xp));
          if (typeof (window as any).__refreshXp === "function") (window as any).__refreshXp();
          fetchLb();
          fetchHistory();
        }
      } catch (e) { console.error(e); }
    }
  }, [user, fetchLb, fetchHistory]);

  // ── postMessage listener ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data) return;
      if (e.data.type === "pacman_score_update") {
        setLiveScore(e.data.score ?? 0);
        if (e.data.stage) setLiveStage(e.data.stage);
      }
      if (e.data.type === "pacman_game_over" && status === "playing") {
        const score = e.data.score ?? liveScore;
        const stage = e.data.stage ?? e.data.level ?? liveStage;
        // If the game embedded its token, use it (extra integrity check)
        if (e.data.token && !tokenRef.current) tokenRef.current = e.data.token;
        saveScore(score, stage);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [status, liveScore, liveStage, saveScore]);

  // ── Start game ───────────────────────────────────────────────────────────
  const startGame = async () => {
    savedRef.current = false;
    tokenRef.current = "";
    iframeSrc.current = "/pacman/index.html";
    setStatus("loading");
    setIframeReady(false);
    setGameTime(0);
    setLiveScore(0);
    setLiveStage(1);
    setLastScore(0);
    setLastStage(1);
    setLastXp(0);

    if (user) {
      try {
        const res = await fetch("/api/games/pacman/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
        const json = await res.json();
        if (json.success && json.token) {
          tokenRef.current = json.token;
          iframeSrc.current = `/pacman/index.html?token=${encodeURIComponent(json.token)}`;
        }
      } catch { /* non-fatal */ }
    }
    setStatus("playing");
  };

  // ── Iframe onLoad ─────────────────────────────────────────────────────────
  const handleIframeLoad = useCallback(() => {
    setIframeReady(true);
    startRef.current = Date.now();
    try {
      const iwin = iframeRef.current?.contentWindow as any;
      if (iwin) {
        iwin.__pacmanUsername = (user?.username ?? "PLAYER").toUpperCase();
        // Reset bridge for fresh game
        if (typeof iwin.__resetBridge === "function") iwin.__resetBridge();
      }
    } catch { /* cross-origin guard */ }
  }, [user]);

  // ── Quit & Save ───────────────────────────────────────────────────────────
  const handleQuit = useCallback(() => {
    if (status !== "playing") return;
    try {
      const iwin = iframeRef.current?.contentWindow as any;
      if (iwin?.__pacmanRequestScore) {
        iwin.__pacmanRequestScore();
        return;
      }
    } catch { /* fallback */ }
    saveScore(liveScore, liveStage);
  }, [status, liveScore, liveStage, saveScore]);

  const previewXp = calcXp(Math.max(liveScore, 100), liveStage);

  return (
    <div style={{ width: "100%", minHeight: "100vh", paddingBottom: 32, boxSizing: "border-box" }}>

      {/* HEADER */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/games"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", marginBottom: 14, opacity: 0.7 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
        >
          <ArrowLeft style={{ width: 13, height: 13, color: C.cyan }} />
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: C.cyan, letterSpacing: "0.3em", textTransform: "uppercase" }}>BACK TO ARCADE</span>
        </Link>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(22px,5vw,50px)", fontWeight: 900, color: C.text, textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", lineHeight: 1, margin: 0 }}>
              PAC-MAN <span style={{ color: C.cyan, textShadow: "0 0 20px rgba(34,211,238,0.5)" }}>ARENA</span>
            </h1>
            <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, fontWeight: 600, color: "#334155", letterSpacing: "0.25em", textTransform: "uppercase", marginTop: 5 }}>
              HALLOWEEN 2025 EDITION · Google Doodle
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#334155", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 3 }}>SESSION XP</div>
            <motion.div key={sessionXp} initial={{ scale: 1.3, color: "#fff" }} animate={{ scale: 1, color: "#f59e0b" }}
              style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(20px,4vw,26px)", fontWeight: 900, filter: "drop-shadow(0 0 10px rgba(245,158,11,0.4))" }}>
              {sessionXp.toLocaleString()}
            </motion.div>
          </div>
        </div>
      </div>

      {/* STATS ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { label: "PLAYED", value: stats.played, color: "#a78bfa", raw: false },
          { label: "HIGH SCORE", value: stats.bestScore, color: "#f59e0b", raw: false },
          { label: "BEST STAGE", value: `LVL ${stats.bestStage || 1}`, color: "#10b981", raw: true },
          { label: "SESSION XP", value: sessionXp, color: "#22d3ee", raw: false },
          { label: "TIME", value: status === "playing" ? fmt(gameTime) : "--:--", color: C.cyan, raw: true },
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, fontWeight: 700, color: "#334155", letterSpacing: "0.2em", textTransform: "uppercase" }}>{s.label}</span>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(11px,2.5vw,20px)", fontWeight: 900, color: s.color, filter: `drop-shadow(0 0 6px ${s.color}80)`, lineHeight: 1 }}>
              {s.raw ? s.value : (s.value as number).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* MAIN LAYOUT */}
      <div className="pac-layout" style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>

        {/* LEFT: Game */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Status banner */}
          <motion.div key={status} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: "rgba(15,23,42,0.85)", backdropFilter: "blur(16px)", border: `1px solid ${status === "playing" ? "rgba(34,211,238,0.3)" : status === "finished" ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: status === "playing" ? C.cyan : status === "finished" ? "#10b981" : "#334155", boxShadow: status === "playing" ? `0 0 10px ${C.cyan}` : "none", flexShrink: 0, animation: status === "playing" ? "pacPulse 1.5s infinite" : "none" }} />
              <div>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, color: status === "playing" ? C.cyan : status === "finished" ? "#10b981" : "#475569", letterSpacing: "0.08em" }}>
                  {status === "idle" && "READY TO PLAY"}
                  {status === "loading" && "LOADING GAME…"}
                  {status === "playing" && (iframeReady ? `STAGE ${liveStage} · SCORE ${liveScore.toLocaleString()}` : "STARTING ENGINE…")}
                  {status === "finished" && `GAME OVER · ${lastScore.toLocaleString()} PTS · STAGE ${lastStage}`}
                </div>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#475569", fontWeight: 600 }}>
                  {status === "idle" && "Press START to play"}
                  {status === "loading" && "Initialising PAC-MAN engine…"}
                  {status === "playing" && `${fmt(gameTime)} · ~${previewXp} XP`}
                  {status === "finished" && (lastXp > 0 ? `+${lastXp} XP earned (score base + stage bonus)` : "Score 0 — no XP this round")}
                </div>
              </div>
            </div>
            {status === "playing" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 8, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", flexShrink: 0 }}>
                <Clock style={{ width: 11, height: 11, color: C.cyan }} />
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: C.text }}>{fmt(gameTime)}</span>
              </div>
            )}
          </motion.div>

          {/* IFRAME WRAPPER */}
          <div style={{
            position: "relative", borderRadius: 20, overflow: "hidden",
            border: "1px solid rgba(34,211,238,0.18)",
            boxShadow: "0 0 40px rgba(34,211,238,0.06), 0 8px 40px rgba(0,0,0,0.5)",
            ...(fullscreen ? { position: "fixed", inset: 0, zIndex: 9999, borderRadius: 0, border: "none" } as any : {}),
          }}>
            {/* Loading overlay */}
            <AnimatePresence>
              {(status === "loading" || (status === "playing" && !iframeReady)) && (
                <motion.div key="loader" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }}
                  style={{ position: "absolute", inset: 0, background: "rgba(8,12,28,0.97)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, zIndex: 10 }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <Ghost style={{ width: 52, height: 52, color: C.cyan, filter: `drop-shadow(0 0 16px ${C.cyan})` }} />
                  </motion.div>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: C.cyan, letterSpacing: "0.2em" }}>LOADING PAC-MAN…</span>
                  <div style={{ width: 180, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <motion.div animate={{ x: ["-100%", "100%"] }} transition={{ duration: 0.85, repeat: Infinity, ease: "easeInOut" }}
                      style={{ height: "100%", width: "50%", background: `linear-gradient(90deg,transparent,${C.cyan},transparent)`, borderRadius: 2 }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* IDLE placeholder */}
            {status === "idle" && (
              <div style={{ width: "100%", height: "clamp(420px,54vw,620px)", background: "rgba(8,12,28,0.96)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
                <motion.div animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.06, 1] }} transition={{ duration: 2.5, repeat: Infinity }}>
                  <Ghost style={{ width: 72, height: 72, color: C.cyan, filter: `drop-shadow(0 0 20px ${C.cyan})` }} />
                </motion.div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(16px,3vw,24px)", fontWeight: 900, color: C.text, letterSpacing: "0.08em", marginBottom: 6 }}>PAC-MAN HALLOWEEN 2025</div>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, color: "#334155", fontWeight: 600, letterSpacing: "0.25em" }}>
                    {user ? `PLAYING AS: ${user.username.toUpperCase()}` : "PRESS START TO PLAY"}
                  </div>
                </div>
                <div style={{ padding: "10px 18px", borderRadius: 12, background: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.15)", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#334155", letterSpacing: "0.2em", marginBottom: 4 }}>XP FORMULA</div>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, color: C.cyan, fontWeight: 700 }}>floor(log₁₀(score+1)×10) + stages×15</div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {["P", "A", "C", "M", "A", "N"].map((l, i) => (
                    <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3], y: [0, -5, 0] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
                      style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: C.cyan }}>
                      {l}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* FINISHED screen */}
            {status === "finished" && (
              <div style={{ width: "100%", height: "clamp(420px,54vw,620px)", background: "rgba(4,14,8,0.97)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12, stiffness: 200 }}>
                  <Trophy style={{ width: 72, height: 72, color: "#f59e0b", filter: "drop-shadow(0 0 20px rgba(245,158,11,0.6))" }} />
                </motion.div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(28px,5vw,48px)", fontWeight: 900, color: "#f59e0b", filter: "drop-shadow(0 0 16px rgba(245,158,11,0.5))" }}>
                    {lastScore.toLocaleString()}
                  </div>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: "#334155", letterSpacing: "0.3em", marginTop: 4 }}>FINAL SCORE</div>
                  <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
                    {[
                      { label: "STAGE", value: `${lastStage} / 8`, color: C.cyan },
                      { label: "XP", value: `+${lastXp}`, color: "#10b981" },
                      { label: "TIME", value: fmt(gameTime), color: "#a78bfa" },
                    ].map((s, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                        style={{ padding: "8px 16px", borderRadius: 10, background: "rgba(15,23,42,0.8)", border: `1px solid ${s.color}30`, textAlign: "center" }}>
                        <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: "#334155", letterSpacing: "0.2em", marginBottom: 3 }}>{s.label}</div>
                        <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 16, fontWeight: 900, color: s.color }}>{s.value}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Actual iframe */}
            {(status === "playing" || status === "loading") && (
              <iframe
                ref={iframeRef}
                src={iframeSrc.current}
                onLoad={handleIframeLoad}
                style={{ width: "100%", height: fullscreen ? "100vh" : "clamp(420px,54vw,620px)", border: "none", display: "block", background: "#000" }}
                allow="autoplay"
                title="PAC-MAN Halloween 2025"
              />
            )}

            {/* Live score overlay */}
            {status === "playing" && iframeReady && (
              <div style={{ position: "absolute", bottom: 12, left: 12, display: "flex", gap: 8, zIndex: 20, pointerEvents: "none" }}>
                <div style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", border: "1px solid rgba(34,211,238,0.3)" }}>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: C.cyan, fontWeight: 900 }}>STAGE {liveStage}</span>
                </div>
                <div style={{ padding: "4px 10px", borderRadius: 8, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", border: "1px solid rgba(245,158,11,0.3)" }}>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: "#f59e0b", fontWeight: 900 }}>{liveScore.toLocaleString()} PTS</span>
                </div>
              </div>
            )}

            {/* Fullscreen toggle */}
            {status === "playing" && (
              <button onClick={() => setFullscreen(f => !f)}
                style={{ position: "absolute", top: 12, right: 12, padding: "5px 12px", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", border: "1px solid rgba(34,211,238,0.35)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, zIndex: 20 }}>
                {fullscreen ? <Minimize2 style={{ width: 13, height: 13, color: C.cyan }} /> : <Maximize2 style={{ width: 13, height: 13, color: C.cyan }} />}
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: C.cyan, letterSpacing: "0.15em" }}>
                  {fullscreen ? "EXIT" : "FULLSCREEN"}
                </span>
              </button>
            )}
          </div>

          {/* Controls */}
          <div style={{ ...card, padding: "14px 20px" }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: "#334155", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 10 }}>CONTROLS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              {[
                { key: "↑ ↓ ← →", action: "Move Pac-Man" },
                { key: "WASD", action: "Alternative" },
                { key: "SPACE", action: "Pause" },
                { key: "↗", action: "Fullscreen" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ padding: "3px 10px", borderRadius: 7, background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.2)", fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 900, color: C.cyan, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>{item.key}</div>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: C.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>{item.action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          {status === "idle" && (
            <motion.button onClick={startGame} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
              style={{ width: "100%", padding: "clamp(14px,3vw,18px)", borderRadius: 16, background: "linear-gradient(135deg,#22d3ee,#6366f1)", border: "none", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(13px,3vw,16px)", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: "#020617", boxShadow: "0 0 30px rgba(34,211,238,0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, position: "relative", overflow: "hidden" }}>
              <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.8, ease: "linear" }}
                style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)", pointerEvents: "none" }} />
              <Zap style={{ width: 20, height: 20 }} /> START GAME
            </motion.button>
          )}

          {status === "playing" && (
            <motion.button onClick={handleQuit} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              style={{ width: "100%", padding: 14, borderRadius: 15, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <RefreshCw style={{ width: 14, height: 14 }} /> QUIT & SAVE SCORE
            </motion.button>
          )}

          {status === "finished" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <motion.button onClick={startGame} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                style={{ padding: 14, borderRadius: 15, background: "linear-gradient(135deg,#22d3ee,#6366f1)", border: "none", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "#020617", boxShadow: "0 0 20px rgba(34,211,238,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <RefreshCw style={{ width: 14, height: 14 }} /> PLAY AGAIN
              </motion.button>
              <motion.button onClick={() => setStatus("idle")} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                style={{ padding: 14, borderRadius: 15, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                MENU
              </motion.button>
            </div>
          )}
        </div>

        {/* RIGHT: Info + Leaderboard */}
        <div className="pac-right" style={{ width: 270, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* XP Info card */}
          <div style={{ ...card, padding: "16px 18px" }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: C.muted, letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 8 }}>XP SYSTEM</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "Score XP", value: "floor(log₁₀(score+1)×10)", color: C.cyan },
                { label: "Per Stage", value: "+15 XP each", color: "#10b981" },
                { label: "Total", value: "Score XP + Stage XP", color: "#f59e0b" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#475569", fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 900, color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, background: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.12)", textAlign: "center" }}>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#334155" }}>EXAMPLE: 10,000 pts + 3 stages = </span>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: C.cyan, fontWeight: 900 }}>{calcXp(10000, 3)} XP</span>
            </div>
          </div>

          {/* Leaderboard */}
          <div style={{ ...card, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Trophy style={{ width: 13, height: 13, color: "#f59e0b" }} />
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: C.text, letterSpacing: "0.2em", textTransform: "uppercase" }}>TOP SCORES</span>
              <div style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: 6, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 900, color: C.indigo, letterSpacing: "0.12em" }}>ALL TIME</div>
            </div>
            {lbLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {[...Array(5)].map((_, i) => <div key={i} style={{ height: 36, borderRadius: 9, background: "rgba(255,255,255,0.03)", animation: "pacSkel 1.5s infinite", animationDelay: `${i * 0.1}s` }} />)}
              </div>
            ) : leaderboard.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <Grid3X3 style={{ width: 22, height: 22, color: "#334155", margin: "0 auto 8px" }} />
                <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#475569", letterSpacing: "0.15em" }}>NO RECORDS YET</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {leaderboard.map((entry, i) => {
                  const { color, Icon: RankIcon } = rankStyle(i);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: i < 3 ? `rgba(${i === 0 ? "245,158,11" : i === 1 ? "148,163,184" : "180,83,9"},0.06)` : "rgba(255,255,255,0.02)", border: `1px solid ${i < 3 ? `rgba(${i === 0 ? "245,158,11" : i === 1 ? "148,163,184" : "180,83,9"},0.18)` : "rgba(255,255,255,0.04)"}` }}>
                      <div style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {RankIcon ? <RankIcon style={{ width: 12, height: 12, color }} /> : <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: "#475569" }}>{i + 1}</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: i < 3 ? C.text : "#475569", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.user.username}</div>
                      </div>
                      <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 900, color: i < 3 ? color : C.cyan, flexShrink: 0 }}>
                        {entry.highScore.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {user && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: "#fff" }}>{user.username[0].toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: C.indigo, letterSpacing: "0.1em" }}>YOU</div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.username}</div>
                  </div>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 900, color: "#f59e0b" }}>
                    {stats.bestScore > 0 ? stats.bestScore.toLocaleString() : "—"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stat pills */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "Max Stages", value: "8 LVL", color: C.cyan },
              { label: "Max Stage+", value: "+105 XP", color: "#f59e0b" },
            ].map((s, i) => (
              <div key={i} style={{ ...card, padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: C.muted, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FULL-WIDTH LEADERBOARD */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 22, height: 2, background: "linear-gradient(90deg,#f59e0b,#ef4444)", borderRadius: 1 }} />
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.3em", textTransform: "uppercase" }}>TOP PLAYERS</span>
        </div>
        <div style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 140px", gap: 10, padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            {["RANK", "PLAYER", "HIGH SCORE"].map(h => (
              <span key={h} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#475569", letterSpacing: "0.25em", textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>
          {lbLoading
            ? <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>{[...Array(5)].map((_, i) => <div key={i} style={{ height: 36, borderRadius: 8, background: "rgba(255,255,255,0.03)", animation: "pacSkel 1.5s infinite" }} />)}</div>
            : leaderboard.length === 0
              ? <div style={{ textAlign: "center", padding: "32px 0" }}><Ghost style={{ width: 22, height: 22, color: "#334155", margin: "0 auto 8px" }} /><p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#475569", letterSpacing: "0.15em" }}>NO RECORDS YET</p></div>
              : leaderboard.map((entry, i) => {
                const { color, Icon: RI } = rankStyle(i);
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.035 }}
                    style={{ display: "grid", gridTemplateColumns: "44px 1fr 140px", gap: 10, padding: "11px 18px", borderBottom: i < leaderboard.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center", background: i < 3 ? `rgba(${i === 0 ? "245,158,11" : i === 1 ? "148,163,184" : "180,83,9"},0.04)` : "transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {RI ? <RI style={{ width: 14, height: 14, color }} /> : <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#334155" }}>{String(i + 1).padStart(2, "0")}</span>}
                    </div>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: i < 3 ? "#f8fafc" : "#475569", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.user.username}</span>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                      <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: i < 3 ? color : C.cyan }}>{entry.highScore.toLocaleString()}</span>
                      <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 8, color: "#334155" }}>PTS</span>
                    </div>
                  </motion.div>
                );
              })
          }
        </div>
      </div>

      {/* GAME HISTORY */}
      <AnimatePresence>
        {(history.length > 0 || histLoading) && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 22, height: 2, background: "linear-gradient(90deg,#22d3ee,#6366f1)", borderRadius: 1 }} />
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: C.cyan, letterSpacing: "0.3em", textTransform: "uppercase" }}>GAME HISTORY</span>
              <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 10, color: "#334155" }}>Last {history.length} games</span>
            </div>
            <div style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 60px 70px 60px", gap: 8, padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {["SCORE", "STAGE", "XP", "TIME", "PLAYED"].map(h => (
                  <span key={h} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#475569", letterSpacing: "0.25em", textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>
              {histLoading
                ? [...Array(3)].map((_, i) => <div key={i} style={{ height: 44, margin: "6px 18px", borderRadius: 8, background: "rgba(255,255,255,0.03)", animation: "pacSkel 1.5s infinite" }} />)
                : history.map((rec, i) => (
                  <motion.div key={rec.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    style={{ display: "grid", gridTemplateColumns: "1fr 80px 60px 70px 60px", gap: 8, padding: "11px 18px", borderBottom: i < history.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: "#f59e0b" }}>{rec.score.toLocaleString()}</span>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: C.cyan, fontWeight: 700 }}>{rec.stage}/8</span>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: "#10b981", fontWeight: 700 }}>+{rec.xpEarned}</span>
                    <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 600, color: "#64748b" }}>{fmt(rec.duration)}</span>
                    <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>{new Date(rec.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </motion.div>
                ))
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Watermark */}
      <div style={{ position: "fixed", bottom: 0, left: 0, width: "100%", padding: "0 48px 24px", pointerEvents: "none", zIndex: -1, opacity: 0.04 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(60px,12vw,120px)", lineHeight: 1, fontWeight: 900, color: C.text, userSelect: "none", fontStyle: "italic" }}>PACMAN</div>
        </div>
      </div>

      <style>{`
        @keyframes pacPulse { 0%,100%{opacity:1;box-shadow:0 0 10px #22d3ee} 50%{opacity:0.3;box-shadow:0 0 4px #22d3ee} }
        @keyframes pacSkel  { 0%,100%{opacity:1} 50%{opacity:0.35} }
        .pac-layout { flex-direction: row; }
        @media(max-width:900px){
          .pac-layout { flex-direction: column !important; }
          .pac-right  { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}