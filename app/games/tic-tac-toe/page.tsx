"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Crown, Medal, RefreshCw, Zap, Cpu, Clock, User, Grid3X3 } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";

type Cell       = "X" | "O" | null;
type Difficulty = "EASY" | "MEDIUM" | "HARD";
type GameStatus = "idle" | "playing" | "win" | "lose" | "draw";

const SCORE_DISPLAY = { WIN: { EASY: 100, MEDIUM: 250, HARD: 500 }, DRAW: { EASY: 30, MEDIUM: 75, HARD: 150 }, LOSE: { EASY: 0, MEDIUM: 0, HARD: 0 } };
const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function findWinLine(board: Cell[]): number[] | null {
  for (const [a,b,c] of WINS) if (board[a] && board[a]===board[b] && board[a]===board[c]) return [a,b,c];
  return null;
}

interface GameRecord { id: string; result: "WIN"|"LOSE"|"DRAW"; difficulty: Difficulty; score: number; duration: number; date: Date; }
interface LBEntry { user: { username: string }; totalXp: number; matches: number; }

const DIFF_CONFIG = {
  EASY:   { label:"EASY",   desc:"AI plays randomly · WIN=50XP",    color:"#10b981", bg:"rgba(16,185,129,0.12)",  border:"rgba(16,185,129,0.4)",  glow:"rgba(16,185,129,0.25)" },
  MEDIUM: { label:"MEDIUM", desc:"AI plays smart 60% · WIN=120XP",  color:"#f59e0b", bg:"rgba(245,158,11,0.12)",  border:"rgba(245,158,11,0.4)",  glow:"rgba(245,158,11,0.25)" },
  HARD:   { label:"HARD",   desc:"Unbeatable AI · WIN=250XP",       color:"#ef4444", bg:"rgba(239,68,68,0.12)",   border:"rgba(239,68,68,0.4)",   glow:"rgba(239,68,68,0.25)"  },
};

const AI_THINK_DELAY = { EASY: 600, MEDIUM: 1000, HARD: 1400 };

export default function TicTacToePage() {
  const { user } = useAuthStore();

  const [board, setBoard]             = useState<Cell[]>(Array(9).fill(null));
  const [difficulty, setDifficulty]   = useState<Difficulty>("MEDIUM");
  const [status, setStatus]           = useState<GameStatus>("idle");
  const [winLine, setWinLine]         = useState<number[] | null>(null);
  const [score, setScore]             = useState(0);
  const [totalScore, setTotalScore]   = useState(0);
  const [history, setHistory]         = useState<GameRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<LBEntry[]>([]);
  const [lbLoading, setLbLoading]     = useState(true);
  const [aiThinking, setAiThinking]   = useState(false);
  const [isMyTurn, setIsMyTurn]       = useState(true);
  const [stats, setStats]             = useState({ wins: 0, losses: 0, draws: 0, played: 0 });
  const [dbStatsLoaded, setDbStatsLoaded] = useState(false);
  const [gameTime, setGameTime]       = useState(0);
  const [sessionScore, setSessionScore] = useState(0);


  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef     = useRef<number>(0);
  const sessionIdRef = useRef<string | null>(null);

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
    if (!user || dbStatsLoaded) return;
    fetch("/api/user/ttt-stats").then(r => r.json()).then(j => {
      if (j.success) { setStats({ wins: j.data.wins, losses: j.data.losses, draws: j.data.draws, played: (j.data.wins ?? 0) + (j.data.losses ?? 0) + (j.data.draws ?? 0) }); setDbStatsLoaded(true); }
    }).catch(console.error);
  }, [user, dbStatsLoaded]);

  useEffect(() => {
    setLbLoading(true);
    Promise.all([
      fetch("/api/leaderboard?gameType=TIC_TAC_TOE").then(r => r.json()),
      user ? fetch("/api/games/history?gameType=TIC_TAC_TOE&limit=20").then(r => r.json()) : Promise.resolve(null),
    ]).then(([lb, hist]) => {
      if (lb?.success) setLeaderboard(lb.data.slice(0, 8));
      if (hist?.success && hist.data.length > 0) {
        setHistory(hist.data.map((g: any) => ({ id: g.id, result: g.result, difficulty: g.difficulty, score: g.score, duration: g.duration, date: new Date(g.createdAt) })));
      }
    }).catch(console.error).finally(() => setLbLoading(false));
  }, [user]);

  // score/xpEarned come from /move response — /finish awards nothing and is not called
  const handleGameEnd = useCallback((finalBoard: Cell[], outcome: "win" | "lose" | "draw", pts: number) => {
    const dur    = Math.floor((Date.now() - startRef.current) / 1000);
    const result = outcome === "win" ? "WIN" : outcome === "lose" ? "LOSE" : "DRAW";

    setWinLine(findWinLine(finalBoard));
    setStatus(outcome);
    setScore(pts);
    if (outcome !== "lose") { setSessionScore(s => s + pts); setTotalScore(t => t + pts); }
    setStats(s => ({
      wins:   s.wins   + (outcome === "win"  ? 1 : 0),
      losses: s.losses + (outcome === "lose" ? 1 : 0),
      draws:  s.draws  + (outcome === "draw" ? 1 : 0),
      played: s.played + 1,
    }));
    setHistory(prev => [{ id: crypto.randomUUID(), result, difficulty, score: pts, duration: dur, date: new Date() }, ...prev].slice(0, 20));

    sessionIdRef.current = null;
    if (user && typeof (window as any).__refreshXp === "function") (window as any).__refreshXp();
    if (user) fetch("/api/leaderboard?gameType=TIC_TAC_TOE").then(r => r.json()).then(lb => {
      if (lb?.success) setLeaderboard(lb.data.slice(0, 8));
    }).catch(console.error);
  }, [user, difficulty]);

  const handleClick = useCallback(async (idx: number) => {
    if (status !== "playing" || !isMyTurn || board[idx] || aiThinking) return;
    if (!sessionIdRef.current) return;

    setAiThinking(true);
    setIsMyTurn(false);

    const optimisticBoard = [...board] as Cell[];
    optimisticBoard[idx] = "X";
    setBoard(optimisticBoard);

    try {
      const [res] = await Promise.all([
        fetch("/api/games/ttt/move", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current, playerCell: idx }),
        }),
        new Promise(resolve => setTimeout(resolve, AI_THINK_DELAY[difficulty])),
      ]);

      if (!res.ok) { setBoard(board); setAiThinking(false); setIsMyTurn(true); return; }

      const { board: newBoard, status: gameStatus, score: moveScore } = await res.json();
      setBoard(newBoard);

      // Use score from /move response (server-computed). Fallback to client display table if missing.
      const pts = moveScore ?? SCORE_DISPLAY[gameStatus === "win" ? "WIN" : gameStatus === "draw" ? "DRAW" : "LOSE"]?.[difficulty] ?? 0;

      if (gameStatus === "win" || gameStatus === "draw") { setAiThinking(false); handleGameEnd(newBoard, gameStatus, pts); return; }
      if (gameStatus === "lose") { setTimeout(() => { setAiThinking(false); handleGameEnd(newBoard, "lose", pts); }, 400); return; }

      setAiThinking(false);
      setIsMyTurn(true);
    } catch (e) { console.error(e); setBoard(board); setAiThinking(false); setIsMyTurn(true); }
  }, [status, isMyTurn, board, aiThinking, difficulty, handleGameEnd]);

  const startGame = async () => {
    setBoard(Array(9).fill(null));
    setStatus("playing"); setWinLine(null); setScore(0); setGameTime(0);
    setIsMyTurn(true); setAiThinking(false);
    sessionIdRef.current = null;
    if (user) {
      try {
        const res  = await fetch("/api/games/ttt/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ difficulty }) });
        const json = await res.json();
        if (json.success) sessionIdRef.current = json.sessionId;
      } catch (e) { console.error(e); }
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setStatus("idle"); setWinLine(null); setScore(0); setGameTime(0);
    setIsMyTurn(true); setAiThinking(false);
    sessionIdRef.current = null;
  };

  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;

  const msgConfig = {
    idle:    { title:"READY?",       sub:"Choose difficulty & press START", color:"#22d3ee" },
    win:     { title:"VICTORY!",     sub:`+${score} pts earned`,            color:"#10b981" },
    lose:    { title:"DEFEATED",     sub:"AI won this round",               color:"#ef4444" },
    draw:    { title:"IT'S A DRAW!", sub:`+${score} pts — well played`,     color:"#f59e0b" },
    playing: isMyTurn && !aiThinking
      ? { title:"YOUR TURN",    sub:"Click a cell to play",  color:"#22d3ee" }
      : { title:"AI THINKING…", sub:"Processing strategy…",  color:"#a78bfa" },
  };
  const msg = msgConfig[status] ?? msgConfig.idle;

  const getCellStyle = (i: number, cell: Cell) => {
    const isWin  = winLine?.includes(i) && status === "win";
    const isLose = winLine?.includes(i) && status === "lose";
    const isDraw = status === "draw";
    if (isWin)  return { bg:"rgba(16,185,129,0.18)",  border:"2px solid #10b981",              shadow:"0 0 22px rgba(16,185,129,0.35)" };
    if (isLose) return { bg:"rgba(239,68,68,0.18)",   border:"2px solid #ef4444",              shadow:"0 0 22px rgba(239,68,68,0.35)"  };
    if (isDraw) return { bg:"rgba(245,158,11,0.14)",  border:"2px solid rgba(245,158,11,0.6)", shadow:"0 0 16px rgba(245,158,11,0.25)" };
    if (cell==="X") return { bg:"rgba(34,211,238,0.05)",  border:"1px solid rgba(34,211,238,0.25)",  shadow:"none" };
    if (cell==="O") return { bg:"rgba(167,139,250,0.05)", border:"1px solid rgba(167,139,250,0.25)", shadow:"none" };
    return { bg:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", shadow:"none" };
  };

  const rankStyle = (i: number) => {
    if (i===0) return { color:"#f59e0b", Icon: Crown };
    if (i===1) return { color:"#94a3b8", Icon: Medal };
    if (i===2) return { color:"#b45309", Icon: Medal };
    return { color:"#475569", Icon: null };
  };

  const cfg = DIFF_CONFIG[difficulty];

  // ── Leaderboard panel — table style matching game history ─────────────────
  const LeaderboardPanel = () => (
    <>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
        <div style={{width:22,height:2,background:"linear-gradient(90deg,#f59e0b,#ef4444)",borderRadius:1}}/>
        <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,fontWeight:700,color:"#f59e0b",letterSpacing:"0.3em",textTransform:"uppercase"}}>TOP PLAYERS</span>
      </div>
      <div style={{background:"rgba(15,23,42,0.6)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,overflow:"hidden"}}>
        {/* Header row */}
        <div className="ttt-lb-head" style={{display:"grid",gridTemplateColumns:"44px 1fr 88px 68px",gap:10,padding:"9px 18px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
          {["RANK","PLAYER","TOTAL XP","MATCHES"].map(h =>
            <span key={h} style={{fontFamily:"'Orbitron',sans-serif",fontSize:7,fontWeight:700,color:"#475569",letterSpacing:"0.25em",textTransform:"uppercase"}}>{h}</span>
          )}
        </div>
        {/* Body */}
        {lbLoading ? (
          <div style={{padding:"12px 18px",display:"flex",flexDirection:"column",gap:8}}>
            {[...Array(5)].map((_,i) => <div key={i} style={{height:36,borderRadius:8,background:"rgba(255,255,255,0.03)",animation:"skeletonPulse 1.5s infinite",animationDelay:`${i*0.1}s`}}/>)}
          </div>
        ) : leaderboard.length === 0 ? (
          <div style={{textAlign:"center",padding:"32px 0"}}>
            <Grid3X3 style={{width:22,height:22,color:"#334155",margin:"0 auto 8px"}}/>
            <p style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:"#475569",letterSpacing:"0.15em"}}>NO RECORDS YET</p>
          </div>
        ) : (
          leaderboard.map((entry, i) => {
            const { color, Icon: RI } = rankStyle(i);
            const isTop3 = i < 3;
            return (
              <motion.div key={i}
                initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.035}}
                className="ttt-lb-head"
                style={{display:"grid",gridTemplateColumns:"44px 1fr 88px 68px",gap:10,padding:"11px 18px",borderBottom:i<leaderboard.length-1?"1px solid rgba(255,255,255,0.03)":"none",alignItems:"center",background:isTop3?`rgba(${i===0?"245,158,11":i===1?"148,163,184":"180,83,9"},0.04)`:"transparent"}}>
                {/* rank */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {RI
                    ? <RI style={{width:14,height:14,color}}/>
                    : <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,fontWeight:700,color:"#334155"}}>{String(i+1).padStart(2,"0")}</span>
                  }
                </div>
                {/* player */}
                <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,fontWeight:700,color:isTop3?"#f8fafc":"#475569",textTransform:"uppercase",letterSpacing:"0.05em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{entry.user.username}</span>
                {/* xp */}
                <div style={{display:"flex",alignItems:"baseline",gap:3}}>
                  <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:13,fontWeight:900,color:isTop3?color:"#a78bfa"}}>{entry.totalXp.toLocaleString()}</span>
                  <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:8,color:"#334155",fontWeight:600}}>XP</span>
                </div>
                {/* matches */}
                <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:12,fontWeight:600,color:"#64748b"}}>{entry.matches}</span>
              </motion.div>
            );
          })
        )}
        {/* YOU row */}
        {user && (
          <div className="ttt-lb-head" style={{display:"grid",gridTemplateColumns:"44px 1fr 88px 68px",gap:10,padding:"10px 18px",borderTop:"1px solid rgba(255,255,255,0.04)",alignItems:"center",background:"rgba(99,102,241,0.06)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#22d3ee)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,fontWeight:900,color:"#fff"}}>{user.username[0].toUpperCase()}</span>
              </div>
            </div>
            <div style={{minWidth:0}}>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:6,color:"#6366f1",letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:1}}>YOU</div>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,fontWeight:700,color:"#f8fafc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.username}</div>
            </div>
            <div style={{display:"flex",alignItems:"baseline",gap:3}}>
              <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:13,fontWeight:900,color:"#f59e0b"}}>{totalScore.toLocaleString()}</span>
              <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:8,color:"#334155",fontWeight:600}}>XP</span>
            </div>
            <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:"#475569"}}>—</span>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div style={{minHeight:"100vh",paddingBottom:20,width:"100%",boxSizing:"border-box"}}>

      {/* Flash overlays */}
      <AnimatePresence>
        {status==="win"  && <motion.div key="wf" initial={{opacity:0}} animate={{opacity:[0,0.28,0,0.22,0,0.12]}} exit={{opacity:0}} transition={{duration:1.1}} style={{position:"fixed",inset:0,zIndex:10,pointerEvents:"none",background:"radial-gradient(ellipse at center,rgba(16,185,129,0.55) 0%,transparent 65%)"}}/>}
        {status==="lose" && <motion.div key="lf" initial={{opacity:0}} animate={{opacity:[0,0.32,0,0.25,0,0.1]}}  exit={{opacity:0}} transition={{duration:1.0}} style={{position:"fixed",inset:0,zIndex:10,pointerEvents:"none",background:"radial-gradient(ellipse at center,rgba(239,68,68,0.55) 0%,transparent 65%)"}}/>}
        {status==="draw" && <motion.div key="df" initial={{opacity:0}} animate={{opacity:[0,0.18,0,0.18,0,0.12]}} exit={{opacity:0}} transition={{duration:1.2}} style={{position:"fixed",inset:0,zIndex:10,pointerEvents:"none",background:"radial-gradient(ellipse at center,rgba(245,158,11,0.35) 0%,transparent 70%)"}}/>}
      </AnimatePresence>

      {/* Header */}
      <div style={{marginBottom:20}}>
        <Link href="/games" style={{display:"inline-flex",alignItems:"center",gap:6,textDecoration:"none",marginBottom:14,opacity:0.7}} onMouseEnter={e=>(e.currentTarget.style.opacity="1")} onMouseLeave={e=>(e.currentTarget.style.opacity="0.7")}>
          <ArrowLeft style={{width:13,height:13,color:"#22d3ee"}}/>
          <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,fontWeight:700,color:"#22d3ee",letterSpacing:"0.3em",textTransform:"uppercase"}}>BACK TO ARCADE</span>
        </Link>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div>
            <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(22px,5vw,50px)",fontWeight:900,color:"#f8fafc",textTransform:"uppercase",fontStyle:"italic",letterSpacing:"-0.02em",lineHeight:1,margin:0}}>
              TIC-TAC <span style={{color:"#22d3ee",textShadow:"0 0 20px rgba(34,211,238,0.5)"}}>TOE</span>
            </h1>
            <p style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,fontWeight:600,color:"#334155",letterSpacing:"0.25em",textTransform:"uppercase",marginTop:5}}>SERVER-VERIFIED AI · v3.0</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:"#334155",letterSpacing:"0.25em",textTransform:"uppercase",marginBottom:3}}>XP Earned This Session</div>
              <motion.div key={sessionScore} initial={{scale:1.3,color:"#fff"}} animate={{scale:1,color:"#f59e0b"}} style={{fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(20px,4vw,26px)",fontWeight:900,filter:"drop-shadow(0 0 10px rgba(245,158,11,0.4))"}}>
                {sessionScore.toLocaleString()}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* ── HORIZONTAL STATS ROW */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
        {([
          {label:"WINS",   value:stats.wins,   color:"#10b981",glow:"rgba(16,185,129,0.25)"},
          {label:"LOSSES", value:stats.losses, color:"#ef4444",glow:"rgba(239,68,68,0.25)"},
          {label:"DRAWS",  value:stats.draws,  color:"#f59e0b",glow:"rgba(245,158,11,0.25)"},
          {label:"PLAYED", value:stats.played, color:"#a78bfa",glow:"rgba(167,139,250,0.25)"},
        ] as const).map(s => (
          <motion.div key={s.label}
            animate={(s.label==="WINS"&&status==="win")||(s.label==="LOSSES"&&status==="lose")||(s.label==="DRAWS"&&status==="draw")
              ? {scale:[1,1.06,1],boxShadow:[`0 0 0px ${s.glow}`,`0 0 20px ${s.glow}`,`0 0 8px ${s.glow}`]} : {}}
            transition={{duration:0.5}}
            style={{background:"rgba(15,23,42,0.75)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"12px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:6,fontWeight:700,color:"#334155",letterSpacing:"0.2em",textTransform:"uppercase"}}>{s.label}</span>
            <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(16px,3.5vw,24px)",fontWeight:900,color:s.color,filter:`drop-shadow(0 0 6px ${s.color}80)`,lineHeight:1}}>{s.value}</span>
          </motion.div>
        ))}
        {/* TIME card */}
        <div style={{background:"rgba(15,23,42,0.75)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"12px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
          <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:6,fontWeight:700,color:"#334155",letterSpacing:"0.2em",textTransform:"uppercase"}}>TIME</span>
          <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(13px,2.8vw,20px)",fontWeight:900,color:"#22d3ee",filter:"drop-shadow(0 0 6px rgba(34,211,238,0.5))",lineHeight:1}}>
            {status==="playing" ? fmt(gameTime) : "--:--"}
          </span>
        </div>
      </div>

      {/* Layout */}
      <div className="ttt-layout" style={{display:"flex",gap:16,alignItems:"flex-start"}}>

        {/* Center — full width now, no left sidebar */}
        <div className="ttt-center" style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>

          {/* Status banner */}
          <motion.div key={`${status}-${String(isMyTurn)}`} initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
            style={{width:"100%",maxWidth:460,background:status==="win"?"rgba(4,22,14,0.92)":status==="lose"?"rgba(22,4,4,0.92)":status==="draw"?"rgba(30,20,5,0.92)":"rgba(15,23,42,0.85)",backdropFilter:"blur(16px)",border:`1px solid ${msg.color}50`,borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:`0 0 24px ${msg.color}18`,position:"relative",overflow:"hidden"}}>
            {(status==="win"||status==="lose"||status==="draw")&&(
              <motion.div animate={{x:["-100%","200%"]}} transition={{duration:1.2,repeat:Infinity,repeatDelay:0.5,ease:"linear"}} style={{position:"absolute",inset:0,background:`linear-gradient(90deg,transparent,${status==="win"?"rgba(16,185,129,0.2)":status==="lose"?"rgba(239,68,68,0.18)":"rgba(245,158,11,0.15)"},transparent)`,pointerEvents:"none"}}/>
            )}
            <div style={{display:"flex",alignItems:"center",gap:10,position:"relative",zIndex:1}}>
              <motion.div animate={status==="win"?{scale:[1,1.6,0.8,1.4,1],backgroundColor:["#10b981","#34d399","#10b981"]}:status==="lose"?{scale:[1,1.6,0.8,1.4,1],backgroundColor:["#ef4444","#f87171","#ef4444"]}:status==="draw"?{scale:[1,1.4,1,1.4,1],backgroundColor:["#f59e0b","#fbbf24","#f59e0b"]}:{}} transition={{duration:0.7}}
                style={{width:8,height:8,borderRadius:"50%",background:msg.color,boxShadow:`0 0 10px ${msg.color}`,flexShrink:0,animation:status==="playing"?"statusPulse 1.5s infinite":"none"}}/>
              <div>
                <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:12,fontWeight:900,color:msg.color,letterSpacing:"0.1em",textTransform:"uppercase"}}>{msg.title}</div>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:"#475569",fontWeight:600}}>{msg.sub}</div>
              </div>
            </div>
            {status==="playing"&&(
              <div style={{padding:"4px 10px",borderRadius:8,background:isMyTurn?"rgba(34,211,238,0.12)":"rgba(167,139,250,0.12)",border:`1px solid ${isMyTurn?"rgba(34,211,238,0.3)":"rgba(167,139,250,0.3)"}`,position:"relative",zIndex:1,flexShrink:0}}>
                <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:10,fontWeight:900,color:isMyTurn?"#22d3ee":"#a78bfa"}}>{isMyTurn?"YOU":"AI"}</span>
              </div>
            )}
          </motion.div>

          {/* AI thinking bar */}
          <AnimatePresence>
            {aiThinking && (
              <motion.div initial={{opacity:0,scaleX:0}} animate={{opacity:1,scaleX:1}} exit={{opacity:0}} style={{width:"100%",maxWidth:460,height:3,borderRadius:2,background:"rgba(167,139,250,0.15)",overflow:"hidden"}}>
                <motion.div animate={{x:["-100%","100%"]}} transition={{duration:0.9,repeat:Infinity,ease:"easeInOut"}} style={{height:"100%",width:"50%",background:"linear-gradient(90deg,transparent,#a78bfa,transparent)",borderRadius:2}}/>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Board */}
          <div style={{position:"relative",width:"100%",maxWidth:460}}>
            <motion.div animate={{background:status==="win"?["rgba(16,185,129,0.2)","rgba(16,185,129,0.6)","rgba(16,185,129,0.15)"]:status==="lose"?["rgba(239,68,68,0.2)","rgba(239,68,68,0.65)","rgba(239,68,68,0.15)"]:status==="draw"?["rgba(245,158,11,0.25)","rgba(245,158,11,0.55)","rgba(245,158,11,0.2)"]:"rgba(34,211,238,0.15)"}}
              style={{position:"absolute",inset:-3,borderRadius:26,filter:"blur(10px)",zIndex:0}}/>
            <motion.div
              animate={status==="lose"?{x:[0,-10,10,-8,8,-5,5,0]}:status==="win"?{scale:[1,1.03,0.98,1.01,1]}:{}}
              transition={status==="lose"?{duration:0.5}:status==="win"?{duration:0.5}:{}}
              style={{position:"relative",zIndex:1,background:"rgba(8,12,28,0.96)",backdropFilter:"blur(20px)",border:"1px solid rgba(34,211,238,0.15)",borderRadius:22,padding:14,boxShadow:"0 8px 40px rgba(0,0,0,0.6)",width:"100%",boxSizing:"border-box"}}>
              <div className="ttt-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,width:"100%"}}>
                {board.map((cell,i) => {
                  const cs = getCellStyle(i,cell);
                  const playable = status==="playing" && isMyTurn && !cell && !aiThinking;
                  return (
                    <motion.button key={i} onClick={()=>handleClick(i)}
                      whileHover={playable?{scale:1.06,y:-1}:{}} whileTap={playable?{scale:0.93}:{}}
                      animate={status==="win"&&winLine?.includes(i)?{scale:[1,1.18,0.92,1.08,1]}:status==="lose"&&winLine?.includes(i)?{scale:[1,0.88,1.06,0.95,1]}:{}}
                      style={{aspectRatio:"1",width:"100%",borderRadius:12,background:cs.bg,border:cs.border,cursor:playable?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:cs.shadow,position:"relative",overflow:"hidden",transition:"background 0.15s"}}>
                      {playable&&!cell&&<span className="cell-ghost" style={{position:"absolute",fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(20px,6vw,40px)",fontWeight:900,color:"rgba(34,211,238,0.18)",opacity:0,transition:"opacity 0.12s",userSelect:"none"}}>X</span>}
                      <AnimatePresence>
                        {cell&&<motion.span initial={{scale:0,rotate:-15,opacity:0}} animate={{scale:1,rotate:0,opacity:1}} transition={{type:"spring",damping:13,stiffness:320}}
                          style={{fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(20px,6vw,40px)",fontWeight:900,lineHeight:1,color:cell==="X"?"#22d3ee":"#a78bfa",textShadow:cell==="X"?"0 0 14px rgba(34,211,238,0.8)":"0 0 14px rgba(167,139,250,0.8)"}}>
                          {cell}
                        </motion.span>}
                      </AnimatePresence>
                      {aiThinking&&!cell&&<motion.div animate={{opacity:[0.04,0.14,0.04]}} transition={{duration:1.1,repeat:Infinity,delay:i*0.08}} style={{position:"absolute",inset:0,background:"rgba(167,139,250,0.12)",borderRadius:12}}/>}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Player labels */}
          <div style={{display:"flex",gap:8,width:"100%",maxWidth:460}}>
            {[
              {label:"YOU · X",sublabel:user?.username??"Player",color:"#22d3ee",Icon:User, active:isMyTurn&&status==="playing"},
              {label:"AI  · O",sublabel:cfg.label,               color:"#a78bfa",Icon:Cpu,  active:!isMyTurn&&status==="playing"},
            ].map((p,pi)=>(
              <div key={pi} style={{flex:1,padding:"9px 12px",borderRadius:12,background:`rgba(${pi===0?"34,211,238":"167,139,250"},0.05)`,border:`1px solid ${p.active?p.color+"60":p.color+"18"}`,display:"flex",alignItems:"center",gap:8,transition:"all 0.2s",minWidth:0}}>
                <p.Icon style={{width:14,height:14,color:p.color,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:7,color:p.color,letterSpacing:"0.2em",textTransform:"uppercase"}}>{p.label}</div>
                  <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:"#475569",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.sublabel}</div>
                </div>
                {p.active&&<motion.div animate={{opacity:[1,0.3,1]}} transition={{duration:1,repeat:Infinity}} style={{width:6,height:6,borderRadius:"50%",background:p.color,boxShadow:`0 0 8px ${p.color}`,flexShrink:0}}/>}
              </div>
            ))}
          </div>

          {/* Difficulty selector */}
          <div style={{width:"100%",maxWidth:460}}>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,fontWeight:700,color:"#334155",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:8,textAlign:"center"}}>SELECT AI INTENSITY</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {(["EASY","MEDIUM","HARD"] as Difficulty[]).map(d => {
                const dc=DIFF_CONFIG[d], active=difficulty===d;
                return (
                  <motion.button key={d} onClick={()=>{if(status!=="playing")setDifficulty(d);}} disabled={status==="playing"}
                    whileHover={status!=="playing"?{y:-2}:{}} whileTap={status!=="playing"?{scale:0.96}:{}}
                    style={{padding:"12px 6px",borderRadius:12,background:active?dc.bg:"rgba(15,23,42,0.6)",border:`2px solid ${active?dc.border:"rgba(255,255,255,0.05)"}`,cursor:status==="playing"?"not-allowed":"pointer",transition:"all 0.2s",textAlign:"center",boxShadow:active?`0 0 16px ${dc.glow}`:"none",opacity:status==="playing"&&!active?0.3:1,position:"relative",overflow:"hidden"}}>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:10,fontWeight:900,color:active?dc.color:"#334155",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:3}}>{dc.label}</div>
                    {active&&<div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:dc.color,boxShadow:`0 0 8px ${dc.color}`}}/>}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Mobile timer */}
          <div className="mobile-timer" style={{display:"none",width:"100%",maxWidth:460,background:"rgba(15,23,42,0.75)",backdropFilter:"blur(16px)",border:"1px solid rgba(34,211,238,0.1)",borderRadius:12,padding:"10px 16px",alignItems:"center",gap:10}}>
            <Clock style={{width:14,height:14,color:"#22d3ee",flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:7,color:"#334155",letterSpacing:"0.2em",textTransform:"uppercase"}}>TIME</div>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:15,fontWeight:900,color:"#f8fafc"}}>{fmt(gameTime)}</div>
            </div>
            <div style={{background:cfg.bg,border:`1px solid ${cfg.border}`,borderRadius:8,padding:"4px 10px"}}>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:10,fontWeight:900,color:cfg.color}}>{cfg.label}</div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{width:"100%",maxWidth:460}}>
            {status==="idle"?(
              <motion.button onClick={startGame} whileHover={{scale:1.03,y:-2}} whileTap={{scale:0.97}}
                style={{width:"100%",padding:"16px",borderRadius:15,background:"linear-gradient(135deg,#22d3ee,#6366f1)",border:"none",cursor:"pointer",fontFamily:"'Orbitron',sans-serif",fontSize:14,fontWeight:900,letterSpacing:"0.15em",textTransform:"uppercase",color:"#020617",boxShadow:"0 0 30px rgba(34,211,238,0.4)",display:"flex",alignItems:"center",justifyContent:"center",gap:10,position:"relative",overflow:"hidden"}}>
                <motion.div animate={{x:["-100%","200%"]}} transition={{duration:2,repeat:Infinity,repeatDelay:0.8,ease:"linear"}} style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)",pointerEvents:"none"}}/>
                <Zap style={{width:17,height:17}}/> START GAME
              </motion.button>
            ):status==="playing"?(
              <motion.button onClick={resetGame} whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                style={{width:"100%",padding:"13px",borderRadius:15,background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.25)",cursor:"pointer",fontFamily:"'Orbitron',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"#ef4444",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                <RefreshCw style={{width:14,height:14}}/> FORFEIT & RESET
              </motion.button>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <motion.button onClick={startGame} whileHover={{scale:1.03,y:-2}} whileTap={{scale:0.97}}
                  style={{padding:"14px",borderRadius:15,background:"linear-gradient(135deg,#22d3ee,#6366f1)",border:"none",cursor:"pointer",fontFamily:"'Orbitron',sans-serif",fontSize:11,fontWeight:900,letterSpacing:"0.12em",textTransform:"uppercase",color:"#020617",boxShadow:"0 0 20px rgba(34,211,238,0.3)",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  <RefreshCw style={{width:14,height:14}}/> PLAY AGAIN
                </motion.button>
                <motion.button onClick={resetGame} whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                  style={{padding:"14px",borderRadius:15,background:"rgba(15,23,42,0.6)",border:"1px solid rgba(255,255,255,0.08)",cursor:"pointer",fontFamily:"'Orbitron',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"#475569",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  MENU
                </motion.button>
              </div>
            )}
          </div>

        </div>{/* end center */}
      </div>{/* end layout */}

      {/* ── TOP PLAYERS — full width */}
      <div style={{marginTop:32}}>
        <LeaderboardPanel />
      </div>

      {/* ── GAME HISTORY ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {history.length > 0 && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} style={{marginTop:32}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{width:22,height:2,background:"linear-gradient(90deg,#22d3ee,#6366f1)",borderRadius:1}}/>
              <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,fontWeight:700,color:"#22d3ee",letterSpacing:"0.3em",textTransform:"uppercase"}}>GAME HISTORY</span>
            </div>
            <div style={{background:"rgba(15,23,42,0.6)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,overflow:"hidden"}}>
              {/* header */}
              <div className="ttt-history-head" style={{display:"grid",gridTemplateColumns:"1fr 1fr 80px 70px 70px",gap:10,padding:"9px 18px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                {["RESULT","DIFFICULTY","SCORE","TIME","PLAYED"].map(h =>
                  <span key={h} style={{fontFamily:"'Orbitron',sans-serif",fontSize:7,fontWeight:700,color:"#475569",letterSpacing:"0.25em",textTransform:"uppercase"}}>{h}</span>
                )}
              </div>
              {/* rows */}
              {history.map((rec,i) => {
                const rc = {WIN:{color:"#10b981",bg:"rgba(16,185,129,0.1)",label:"VICTORY"},LOSE:{color:"#ef4444",bg:"rgba(239,68,68,0.1)",label:"DEFEAT"},DRAW:{color:"#f59e0b",bg:"rgba(245,158,11,0.1)",label:"DRAW"}}[rec.result];
                return (
                  <motion.div key={rec.id} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}}
                    className="ttt-history-head ttt-history-row"
                    style={{display:"grid",gridTemplateColumns:"1fr 1fr 80px 70px 70px",gap:10,padding:"11px 18px",borderBottom:i<history.length-1?"1px solid rgba(255,255,255,0.03)":"none",alignItems:"center"}}>
                    <div style={{padding:"3px 9px",borderRadius:6,background:rc.bg,border:`1px solid ${rc.color}40`,display:"inline-flex",width:"fit-content"}}>
                      <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,fontWeight:700,color:rc.color,letterSpacing:"0.1em"}}>{rc.label}</span>
                    </div>
                    <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:DIFF_CONFIG[rec.difficulty].color,letterSpacing:"0.1em",fontWeight:700}}>{rec.difficulty}</span>
                    <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:11,fontWeight:900,color:rec.score>0?"#f59e0b":"#475569"}}>{rec.score>0?`+${rec.score}`:"—"}</span>
                    <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:12,fontWeight:600,color:"#64748b"}}>{fmt(rec.duration)}</span>
                    <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:12,fontWeight:600,color:"#94a3b8"}}>{rec.date.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes statusPulse  { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes skeletonPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        .ttt-grid button:hover .cell-ghost { opacity:1!important; }
        .mobile-timer { display:none!important; }

        @media(max-width:860px){
          .mobile-timer { display:flex!important; }
          .ttt-center { align-items:stretch!important; }
          .ttt-center > * { width:100%!important; max-width:100%!important; box-sizing:border-box!important; }
          .ttt-grid button { min-height:80px; }
        }
        @media(max-width:540px){
          .ttt-lb-head { grid-template-columns:36px 1fr 80px!important; }
          .ttt-lb-head > *:nth-child(4) { display:none!important; }
        }
        @media(max-width:480px){
          .ttt-history-head { display:none!important; }
          .ttt-history-row { grid-template-columns:1fr 1fr 1fr!important; gap:6px!important; padding:10px 12px!important; }
          .ttt-history-row > *:nth-child(4),
          .ttt-history-row > *:nth-child(5) { display:none!important; }
        }
      `}</style>
    </div>
  );
}
