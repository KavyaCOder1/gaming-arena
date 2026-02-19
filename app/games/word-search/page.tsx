"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Trophy, Crown, Medal, RefreshCw, Zap, Clock,
  Search, CheckCircle2, Grid3X3, Star, Target
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";

// ── Types ──────────────────────────────────────────────────────────────────────
type Difficulty   = "EASY" | "MEDIUM" | "HARD";
type Direction    = { dr: number; dc: number };
type PlacedWord   = { word: string; cells: [number, number][] };
type GameStatus   = "idle" | "playing" | "win";
interface GameRecord {
  id: string; difficulty: Difficulty; score: number;
  wordsFound: number; totalWords: number; duration: number; date: Date;
}
interface LBEntry { user: { username: string }; highScore: number; }

// ── Difficulty config ──────────────────────────────────────────────────────────
const DIFF_CONFIG = {
  EASY: {
    label: "ROOKIE",  longDesc: "Horizontal & Vertical",
    color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.4)", glow: "rgba(16,185,129,0.25)",
    gridSize: 6,  wordCount: 5, scorePerWord: 100, bonusMultiplier: 1.0,
    directions: [{ dr:0,dc:1 },{ dr:1,dc:0 }],
  },
  MEDIUM: {
    label: "VETERAN", longDesc: "All axes + diagonal",
    color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.4)", glow: "rgba(245,158,11,0.25)",
    gridSize: 9,  wordCount: 7, scorePerWord: 180, bonusMultiplier: 1.8,
    directions: [{ dr:0,dc:1 },{ dr:1,dc:0 },{ dr:0,dc:-1 },{ dr:-1,dc:0 },{ dr:1,dc:1 }],
  },
  HARD: {
    label: "ELITE",   longDesc: "All 8 directions",
    color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.4)", glow: "rgba(239,68,68,0.25)",
    gridSize: 11, wordCount: 9, scorePerWord: 300, bonusMultiplier: 3.0,
    directions: [
      { dr:0,dc:1 },{ dr:1,dc:0 },{ dr:0,dc:-1 },{ dr:-1,dc:0 },
      { dr:1,dc:1 },{ dr:-1,dc:-1 },{ dr:1,dc:-1 },{ dr:-1,dc:1 },
    ],
  },
};

const WORD_BANK: Record<Difficulty, string[]> = {
  EASY:   ["CAT","DOG","SUN","MAP","CAR","BUS","CUP","PEN","HAT","BOX","ANT","FLY","OWL","NET","GUM","JAM","LOG","MOP","RUN","TIP","ZIP","YAK","ZAP","TAX","WAX","BEE","COW","FOX","HEN","ICE","JET","KEY","NUT","OAK","PIG","RAT","SAP","TUB","VAN","WIG"],
  MEDIUM: ["STORM","FLAME","BRAVE","QUEST","NEXUS","PIXEL","SOLAR","RADAR","SIGMA","CHESS","CRANE","DWARF","FLOCK","GRIND","HOVER","INDEX","KNACK","LASER","MICRO","NERVE","OCEAN","PRISM","REBEL","SCOUT","TIGER","ULTRA","VALOR","WITCH","BLAZE","CRASH"],
  HARD:   ["PHANTOM","QUANTUM","GRAVITY","ECLIPSE","MISSION","STEALTH","CRYSTAL","EMPEROR","INFERNO","KINGDOM","LEGENDS","MISSILE","NETWORK","ORBITAL","PATTERN","REACTOR","SILENCE","THUNDER","VOYAGER","WARRIOR","BASILISK","CYCLONE","FORTRESS","GUARDIAN"],
};

const FILLER       = "EARTSNIOLDMCHGPUFBWYKXQZJV";
const FOUND_COLORS = ["#10b981","#22d3ee","#a78bfa","#f59e0b","#ec4899","#f97316","#84cc16","#06b6d4","#8b5cf6"];

// ── Grid generation ────────────────────────────────────────────────────────────
function generateGrid(difficulty: Difficulty): { grid: string[][]; placed: PlacedWord[] } {
  const { gridSize, wordCount, directions } = DIFF_CONFIG[difficulty];
  const pool  = [...WORD_BANK[difficulty]].sort(() => Math.random() - 0.5);
  const grid  = Array.from({ length: gridSize }, () => Array(gridSize).fill("") as string[]);
  const placed: PlacedWord[] = [];

  for (const word of pool) {
    if (placed.length >= wordCount) break;
    let ok = false;
    for (let a = 0; a < 200 && !ok; a++) {
      const dir  = directions[Math.floor(Math.random() * directions.length)];
      const r    = Math.floor(Math.random() * gridSize);
      const c    = Math.floor(Math.random() * gridSize);
      const cells: [number,number][] = [];
      let valid = true;
      for (let i = 0; i < word.length; i++) {
        const nr = r + dir.dr * i, nc = c + dir.dc * i;
        if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) { valid=false; break; }
        if (grid[nr][nc] !== "" && grid[nr][nc] !== word[i])       { valid=false; break; }
        cells.push([nr,nc]);
      }
      if (valid) {
        cells.forEach(([nr,nc],i) => { grid[nr][nc]=word[i]; });
        placed.push({ word, cells });
        ok = true;
      }
    }
  }
  for (let r=0;r<gridSize;r++)
    for (let c=0;c<gridSize;c++)
      if (grid[r][c]==="") grid[r][c]=FILLER[Math.floor(Math.random()*FILLER.length)];
  return { grid, placed };
}

function rankStyle(i: number) {
  if (i===0) return { color:"#f59e0b", Icon: Crown };
  if (i===1) return { color:"#94a3b8", Icon: Medal };
  if (i===2) return { color:"#b45309", Icon: Medal };
  return       { color:"#475569",   Icon: null  };
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function WordSearchPage() {
  const { user } = useAuthStore();

  const [difficulty,   setDifficulty]   = useState<Difficulty>("MEDIUM");
  const [status,       setStatus]       = useState<GameStatus>("idle");
  const [grid,         setGrid]         = useState<string[][]>([]);
  const [placed,       setPlaced]       = useState<PlacedWord[]>([]);
  const [found,        setFound]        = useState<Set<string>>(new Set());
  const [selecting,    setSelecting]    = useState<[number,number][]>([]);
  const [startCell,    setStartCell]    = useState<[number,number]|null>(null);
  const [score,        setScore]        = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const [totalScore,   setTotalScore]   = useState(0);
  const [gameTime,     setGameTime]     = useState(0);
  const [leaderboard,  setLeaderboard]  = useState<LBEntry[]>([]);
  const [lbLoading,    setLbLoading]    = useState(true);
  const [stats,        setStats]        = useState({ wins:0, totalWords:0, gamesPlayed:0 });
  const [history,      setHistory]      = useState<GameRecord[]>([]);
  const [toast,        setToast]        = useState<{ word:string; pts:number; key:number }|null>(null);

  const timerRef   = useRef<ReturnType<typeof setInterval>|null>(null);
  const startRef   = useRef<number>(0);
  const isDragging = useRef(false);
  const gridRef    = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  // Timer
  useEffect(() => {
    if (status==="playing") {
      startRef.current = Date.now() - gameTime*1000;
      timerRef.current = setInterval(() => setGameTime(Math.floor((Date.now()-startRef.current)/1000)), 1000);
    } else { if (timerRef.current) clearInterval(timerRef.current); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  // Leaderboard
  useEffect(() => {
    (async () => {
      setLbLoading(true);
      try {
        const res=await fetch("/api/leaderboard?gameType=WORD_SEARCH");
        const j=await res.json();
        if (j.success) setLeaderboard(j.data.slice(0,8));
      } catch {}
      setLbLoading(false);
    })();
  }, []);

  const saveScore = useCallback(async (pts:number, dur:number) => {
    if (!user) return;
    try {
      await fetch("/api/games/save-score", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ gameType:"WORD_SEARCH", score:pts, level:difficulty, duration:dur }) });
    } catch {}
  }, [user, difficulty]);

  // Game control
  const startGame = () => {
    const { grid:g, placed:p } = generateGrid(difficulty);
    setGrid(g); setPlaced(p); setFound(new Set());
    setSelecting([]); setStartCell(null);
    setScore(0); setGameTime(0); setToast(null);
    setStatus("playing");
    setStats(s=>({...s, gamesPlayed:s.gamesPlayed+1}));
  };
  const resetGame = () => {
    setStatus("idle"); setGrid([]); setPlaced([]); setFound(new Set());
    setSelecting([]); setStartCell(null); setScore(0); setGameTime(0); setToast(null);
  };

  // Match logic
  const tryMatch = useCallback((sel:[number,number][]) => {
    if (sel.length<2) return;
    const word    = sel.map(([r,c])=>grid[r]?.[c]??"").join("");
    const wordRev = word.split("").reverse().join("");
    for (const pw of placed) {
      if (found.has(pw.word)) continue;
      if (pw.word!==word && pw.word!==wordRev) continue;
      const sk   = sel.map(([r,c])=>`${r},${c}`).join("|");
      const pk   = pw.cells.map(([r,c])=>`${r},${c}`).join("|");
      const pkr  = [...pw.cells].reverse().map(([r,c])=>`${r},${c}`).join("|");
      if (sk!==pk && sk!==pkr) continue;

      const nf = new Set(found); nf.add(pw.word); setFound(nf);
      const pts = DIFF_CONFIG[difficulty].scorePerWord;
      setScore(s=>s+pts); setSessionScore(s=>s+pts); setTotalScore(t=>t+pts);
      setStats(s=>({...s, totalWords:s.totalWords+1}));

      // toast — clear previous, show new, auto-hide after 1.8 s
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({ word:pw.word, pts, key:Date.now() });
      toastTimer.current = setTimeout(()=>setToast(null), 1800);

      if (nf.size===placed.length) {
        const dur = Math.floor((Date.now()-startRef.current)/1000);
        const fin = score+pts;
        setStatus("win");
        setStats(s=>({...s, wins:s.wins+1}));
        saveScore(fin, dur);
        setHistory(prev=>[{ id:crypto.randomUUID(), difficulty, score:fin, wordsFound:nf.size, totalWords:placed.length, duration:dur, date:new Date() }, ...prev].slice(0,20));
      }
      break;
    }
  }, [grid, placed, found, difficulty, score, saveScore]);

  // Selection helpers
  const line = (a:[number,number], b:[number,number]):[number,number][] => {
    const dr=Math.sign(b[0]-a[0]), dc=Math.sign(b[1]-a[1]);
    const len=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));
    if (dr!==0&&dc!==0&&Math.abs(b[0]-a[0])!==Math.abs(b[1]-a[1])) return [a];
    return Array.from({length:len+1},(_,i)=>[a[0]+dr*i,a[1]+dc*i] as [number,number]);
  };

  // Mouse
  const onDown  = (r:number,c:number) => { if (status!=="playing") return; isDragging.current=true; setStartCell([r,c]); setSelecting([[r,c]]); };
  const onEnter = (r:number,c:number) => { if (!isDragging.current||!startCell) return; setSelecting(line(startCell,[r,c])); };
  const onUp    = () => { if (!isDragging.current) return; isDragging.current=false; tryMatch(selecting); setSelecting([]); setStartCell(null); };

  // Touch
  const cellAt = (x:number,y:number):[number,number]|null => {
    for (const el of document.elementsFromPoint(x,y)) {
      const v=(el as HTMLElement).dataset?.cell;
      if (v) { const [r,c]=v.split(",").map(Number); return [r,c]; }
    }
    return null;
  };
  const onTS = (e:React.TouchEvent) => {
    if (status!=="playing") return;
    const t=e.touches[0]; const cell=cellAt(t.clientX,t.clientY);
    if (!cell) return;
    isDragging.current=true; setStartCell(cell); setSelecting([cell]);
  };
  const onTM = (e:React.TouchEvent) => {
    e.preventDefault();
    if (!isDragging.current||!startCell) return;
    const t=e.touches[0]; const cell=cellAt(t.clientX,t.clientY);
    if (cell) setSelecting(line(startCell,cell));
  };
  const onTE = () => { if (!isDragging.current) return; isDragging.current=false; tryMatch(selecting); setSelecting([]); setStartCell(null); };

  const fmt   = (s:number) => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;
  const cfg   = DIFF_CONFIG[difficulty];
  const isSel = (r:number,c:number) => selecting.some(([sr,sc])=>sr===r&&sc===c);
  const fIdx  = (r:number,c:number) => placed.findIndex(pw=>found.has(pw.word)&&pw.cells.some(([pr,pc])=>pr===r&&pc===c));

  return (
    <div style={{ width:"100%", minHeight:"100vh", userSelect:"none", paddingBottom:20, boxSizing:"border-box" }}>

      {/* WIN FLASH */}
      <AnimatePresence>
        {status==="win" && (
          <motion.div key="wf" initial={{opacity:0}} animate={{opacity:[0,0.3,0,0.2,0,0.1]}} exit={{opacity:0}} transition={{duration:1.3,times:[0,0.1,0.3,0.55,0.75,1]}}
            style={{position:"fixed",inset:0,zIndex:10,pointerEvents:"none",background:"radial-gradient(ellipse at center,rgba(16,185,129,0.55) 0%,transparent 65%)"}}/>
        )}
      </AnimatePresence>

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div style={{marginBottom:20}}>
        <Link href="/games" style={{display:"inline-flex",alignItems:"center",gap:6,textDecoration:"none",marginBottom:12,opacity:0.7}}
          onMouseEnter={e=>(e.currentTarget.style.opacity="1")} onMouseLeave={e=>(e.currentTarget.style.opacity="0.7")}>
          <ArrowLeft style={{width:13,height:13,color:"#22d3ee"}}/>
          <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,fontWeight:700,color:"#22d3ee",letterSpacing:"0.3em",textTransform:"uppercase"}}>BACK TO ARCADE</span>
        </Link>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div>
            <h1 style={{fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(22px,5vw,46px)",fontWeight:900,color:"#f8fafc",textTransform:"uppercase",fontStyle:"italic",letterSpacing:"-0.02em",lineHeight:1,margin:0}}>
              WORD <span style={{color:"#22d3ee",textShadow:"0 0 20px rgba(34,211,238,0.5)"}}>SEARCH</span>
            </h1>
            <p style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,fontWeight:600,color:"#334155",letterSpacing:"0.25em",textTransform:"uppercase",marginTop:4}}>LEXICAL ENGINE · v2.0</p>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:7,color:"#334155",letterSpacing:"0.25em",textTransform:"uppercase",marginBottom:2}}>SESSION</div>
            <motion.div key={sessionScore} initial={{scale:1.3,color:"#fff"}} animate={{scale:1,color:"#f59e0b"}}
              style={{fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(18px,4vw,26px)",fontWeight:900,filter:"drop-shadow(0 0 10px rgba(245,158,11,0.4))"}}>
              {sessionScore.toLocaleString()}
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── BODY — single centered column, max 680px ──────────────────────── */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"stretch",gap:14,width:"100%",maxWidth:680,margin:"0 auto"}}>

        {/* STATUS BANNER */}
        <motion.div key={status} initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
          style={{background:status==="win"?"rgba(4,22,14,0.92)":"rgba(15,23,42,0.85)",backdropFilter:"blur(16px)",border:`1px solid ${status==="win"?"rgba(16,185,129,0.5)":"rgba(34,211,238,0.2)"}`,borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,position:"relative",overflow:"hidden"}}>
          {status==="win" && <motion.div animate={{x:["-100%","200%"]}} transition={{duration:1.3,repeat:Infinity,repeatDelay:0.5,ease:"linear"}} style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,rgba(16,185,129,0.2),transparent)",pointerEvents:"none"}}/>}
          <div style={{display:"flex",alignItems:"center",gap:10,position:"relative",zIndex:1}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:status==="win"?"#10b981":"#22d3ee",boxShadow:`0 0 10px ${status==="win"?"#10b981":"#22d3ee"}`,animation:status==="playing"?"wsPulse 1.5s infinite":"none"}}/>
            <div>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:12,fontWeight:900,color:status==="win"?"#10b981":"#22d3ee",letterSpacing:"0.08em"}}>
                {status==="idle"?"READY?":status==="win"?"MISSION COMPLETE!":"SEARCHING..."}
              </div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:"#475569",fontWeight:600}}>
                {status==="idle"?"Choose difficulty & press START":status==="win"?`All words found · +${score} XP`:`${found.size}/${placed.length} words · Drag to select`}
              </div>
            </div>
          </div>
          {status==="playing" && (
            <div style={{display:"flex",alignItems:"center",gap:8,position:"relative",zIndex:1,flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:8,background:"rgba(34,211,238,0.08)",border:"1px solid rgba(34,211,238,0.2)"}}>
                <Clock style={{width:11,height:11,color:"#22d3ee"}}/><span style={{fontFamily:"'Orbitron',sans-serif",fontSize:11,fontWeight:900,color:"#f8fafc"}}>{fmt(gameTime)}</span>
              </div>
              <div style={{padding:"4px 10px",borderRadius:8,background:"rgba(34,211,238,0.1)",border:"1px solid rgba(34,211,238,0.25)"}}>
                <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,fontWeight:900,color:"#22d3ee"}}>+{cfg.scorePerWord}/word</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* STATS ROW */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {([
            {label:"WINS",  value:stats.wins,        color:"#10b981"},
            {label:"WORDS", value:stats.totalWords,   color:"#22d3ee"},
            {label:"GAMES", value:stats.gamesPlayed,  color:"#a78bfa"},
            {label:"SCORE", value:score,              color:"#f59e0b"},
          ] as const).map(s=>(
            <div key={s.label} style={{background:"rgba(15,23,42,0.75)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"9px 8px",display:"flex",flexDirection:"column",gap:2,alignItems:"center"}}>
              <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:6,fontWeight:700,color:"#334155",letterSpacing:"0.2em",textTransform:"uppercase"}}>{s.label}</span>
              <motion.span key={s.value} initial={{scale:1.25}} animate={{scale:1}}
                style={{fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(15px,3.5vw,22px)",fontWeight:900,color:s.color,filter:`drop-shadow(0 0 5px ${s.color}88)`,lineHeight:1}}>
                {s.value}
              </motion.span>
            </div>
          ))}
        </div>

        {/* GRID */}
        {(status==="playing"||status==="win") && grid.length>0 && (
          <div style={{position:"relative"}}>
            <motion.div animate={{background:status==="win"?["rgba(16,185,129,0.15)","rgba(16,185,129,0.4)","rgba(16,185,129,0.15)"]:"rgba(34,211,238,0.1)"}} transition={status==="win"?{duration:0.9,repeat:2}:{duration:0.4}}
              style={{position:"absolute",inset:-5,borderRadius:26,filter:"blur(14px)",zIndex:0}}/>
            <motion.div animate={status==="win"?{scale:[1,1.012,0.99,1.005,1]}:{}} transition={{duration:0.5}}
              style={{position:"relative",zIndex:1,background:"rgba(8,12,28,0.96)",backdropFilter:"blur(20px)",border:"1px solid rgba(34,211,238,0.13)",borderRadius:20,padding:10,boxShadow:"0 8px 40px rgba(0,0,0,0.6)"}}>
              <div ref={gridRef}
                style={{display:"grid",gridTemplateColumns:`repeat(${cfg.gridSize},1fr)`,gap:3,width:"100%",touchAction:"none"}}
                onMouseLeave={()=>{ if (isDragging.current) onUp(); }}
                onMouseUp={onUp}
                onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}>
                {grid.map((row,r)=>row.map((letter,c)=>{
                  const sel=isSel(r,c), fi=fIdx(r,c), isF=fi>=0, fc=isF?FOUND_COLORS[fi%FOUND_COLORS.length]:"#10b981";
                  return (
                    <motion.div key={`${r}-${c}`} data-cell={`${r},${c}`}
                      onMouseDown={()=>onDown(r,c)} onMouseEnter={()=>onEnter(r,c)}
                      animate={isF?{scale:[1,1.12,1]}:{}} transition={{duration:0.22}}
                      style={{
                        aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",
                        borderRadius:6,cursor:status==="playing"?"pointer":"default",
                        background:isF?`${fc}22`:sel?"rgba(34,211,238,0.22)":"rgba(255,255,255,0.025)",
                        border:isF?`1px solid ${fc}55`:sel?"1px solid rgba(34,211,238,0.6)":"1px solid rgba(255,255,255,0.05)",
                        boxShadow:isF?`0 0 8px ${fc}44`:sel?"0 0 10px rgba(34,211,238,0.35)":"none",
                        transition:"background 0.07s,border 0.07s",
                      }}>
                      <span style={{
                        fontFamily:"'Orbitron',sans-serif",
                        fontSize:"clamp(10px,min(3.5vw,3.5vh),20px)",
                        fontWeight:900,lineHeight:1,
                        color:isF?fc:sel?"#22d3ee":"#3d5068",
                        textShadow:isF?`0 0 8px ${fc}bb`:sel?"0 0 10px rgba(34,211,238,0.9)":"none",
                        transition:"color 0.07s",pointerEvents:"none",
                      }}>{letter}</span>
                    </motion.div>
                  );
                }))}
              </div>
            </motion.div>
          </div>
        )}

        {/* IDLE PREVIEW */}
        {status==="idle" && (
          <div style={{position:"relative"}}>
            <div style={{position:"absolute",inset:-5,borderRadius:26,background:"rgba(34,211,238,0.07)",filter:"blur(14px)",zIndex:0}}/>
            <div style={{position:"relative",zIndex:1,background:"rgba(8,12,28,0.96)",backdropFilter:"blur(20px)",border:"1px solid rgba(34,211,238,0.1)",borderRadius:20,padding:"clamp(28px,6vw,48px) 20px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:180,gap:16}}>
              <motion.div animate={{opacity:[0.5,1,0.5],scale:[1,1.06,1]}} transition={{duration:2.5,repeat:Infinity}}>
                <Search style={{width:"clamp(40px,8vw,56px)",height:"clamp(40px,8vw,56px)",color:"#22d3ee",filter:"drop-shadow(0 0 16px rgba(34,211,238,0.6))"}}/>
              </motion.div>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(14px,3vw,18px)",fontWeight:900,color:"#f8fafc",letterSpacing:"0.12em",marginBottom:5}}>LEXICAL GRID</div>
                <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:"#334155",fontWeight:600,letterSpacing:"0.22em"}}>AWAITING INITIALIZATION</div>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
                {["W","O","R","D","S"].map((l,i)=>(
                  <motion.div key={i} animate={{opacity:[0.3,1,0.3],y:[0,-4,0]}} transition={{duration:1.6,repeat:Infinity,delay:i*0.18}}
                    style={{width:"clamp(32px,7vw,42px)",height:"clamp(32px,7vw,42px)",borderRadius:8,background:"rgba(34,211,238,0.08)",border:"1px solid rgba(34,211,238,0.22)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(12px,3vw,16px)",fontWeight:900,color:"#22d3ee"}}>{l}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* WORD LIST — always visible, centered below grid */}
        {(status==="playing"||status==="win") && placed.length>0 && (
          <div style={{background:"rgba(15,23,42,0.8)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:"16px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <Target style={{width:13,height:13,color:"#22d3ee"}}/>
                <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,fontWeight:700,color:"#f8fafc",letterSpacing:"0.2em",textTransform:"uppercase"}}>FIND THESE WORDS</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:10,fontWeight:900,color:"#22d3ee"}}>{found.size}/{placed.length}</span>
                <div style={{width:60,height:4,borderRadius:4,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                  <motion.div animate={{width:`${placed.length?(found.size/placed.length)*100:0}%`}} transition={{duration:0.4}}
                    style={{height:"100%",background:"linear-gradient(90deg,#22d3ee,#10b981)",borderRadius:4}}/>
                </div>
              </div>
            </div>
            {/* responsive chip grid */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))",gap:7}}>
              {placed.map((pw,idx)=>{
                const isF=found.has(pw.word), col=FOUND_COLORS[idx%FOUND_COLORS.length];
                return (
                  <motion.div key={pw.word} animate={isF?{scale:[1,1.07,1]}:{}} transition={{duration:0.28}}
                    style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px",borderRadius:9,background:isF?`${col}18`:"rgba(255,255,255,0.03)",border:`1px solid ${isF?col+"44":"rgba(255,255,255,0.06)"}`,boxShadow:isF?`0 0 10px ${col}25`:"none",transition:"all 0.2s"}}>
                    <CheckCircle2 style={{width:11,height:11,color:isF?col:"#1e293b",flexShrink:0}}/>
                    <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(8px,2vw,10px)",fontWeight:700,color:isF?col:"#475569",textDecoration:isF?"line-through":"none",letterSpacing:"0.04em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pw.word}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* WIN SCORE CARD */}
        <AnimatePresence>
          {status==="win" && (
            <motion.div key="wsc" initial={{opacity:0,scale:0.88,y:16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0}} transition={{type:"spring",damping:14,stiffness:220}}
              style={{background:"rgba(4,22,14,0.9)",backdropFilter:"blur(16px)",border:"1px solid rgba(16,185,129,0.4)",borderRadius:18,padding:"18px 20px",boxShadow:"0 0 40px rgba(16,185,129,0.2)",position:"relative",overflow:"hidden"}}>
              <motion.div animate={{x:["-100%","200%"]}} transition={{duration:1.4,repeat:Infinity,repeatDelay:1,ease:"linear"}} style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,rgba(16,185,129,0.1),transparent)",pointerEvents:"none"}}/>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:14}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <motion.div animate={{rotate:[0,15,-15,0],scale:[1,1.2,1]}} transition={{duration:0.8,delay:0.2}}>
                    <Star style={{width:"clamp(28px,6vw,38px)",height:"clamp(28px,6vw,38px)",color:"#f59e0b",filter:"drop-shadow(0 0 12px rgba(245,158,11,0.65))"}}/>
                  </motion.div>
                  <div>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(14px,3.5vw,20px)",fontWeight:900,color:"#10b981",letterSpacing:"0.05em"}}>ALL WORDS FOUND!</div>
                    <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,color:"#22d3ee",fontWeight:600,letterSpacing:"0.15em",marginTop:2}}>MISSION COMPLETE · {cfg.label}</div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:7,color:"#334155",letterSpacing:"0.2em",textTransform:"uppercase"}}>EARNED</div>
                  <motion.div key={score} initial={{scale:1.3}} animate={{scale:1}}
                    style={{fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(22px,5vw,32px)",fontWeight:900,color:"#f59e0b",filter:"drop-shadow(0 0 12px rgba(245,158,11,0.5))",lineHeight:1}}>
                    +{score.toLocaleString()}
                  </motion.div>
                  <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:"#334155",fontWeight:600,marginTop:2}}>{fmt(gameTime)}</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(80px,1fr))",gap:8,marginTop:14}}>
                {[{label:"WORDS",value:`${placed.length}/${placed.length}`,color:"#10b981"},{label:"MODE",value:cfg.label,color:cfg.color},{label:"XP/WORD",value:`+${cfg.scorePerWord}`,color:"#f59e0b"},{label:"MULT",value:`×${cfg.bonusMultiplier}`,color:"#a78bfa"}].map(item=>(
                  <div key={item.label} style={{padding:"8px 10px",borderRadius:10,background:`${item.color}11`,border:`1px solid ${item.color}33`,textAlign:"center"}}>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:6,color:"#475569",letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:3}}>{item.label}</div>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:13,fontWeight:900,color:item.color}}>{item.value}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* DIFFICULTY SELECTOR */}
        <div>
          <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:7,fontWeight:700,color:"#334155",letterSpacing:"0.3em",textTransform:"uppercase",marginBottom:7,textAlign:"center"}}>SELECT DIFFICULTY</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {(["EASY","MEDIUM","HARD"] as Difficulty[]).map(d=>{
              const dc=DIFF_CONFIG[d], active=difficulty===d;
              return (
                <motion.button key={d} onClick={()=>{ if (status!=="playing") setDifficulty(d); }} disabled={status==="playing"}
                  whileHover={status!=="playing"?{y:-2}:{}} whileTap={status!=="playing"?{scale:0.96}:{}}
                  style={{padding:"12px 6px",borderRadius:13,background:active?dc.bg:"rgba(15,23,42,0.6)",border:`2px solid ${active?dc.border:"rgba(255,255,255,0.05)"}`,cursor:status==="playing"?"not-allowed":"pointer",transition:"all 0.2s",textAlign:"center",boxShadow:active?`0 0 18px ${dc.glow}`:"none",opacity:status==="playing"&&!active?0.28:1,position:"relative",overflow:"hidden"}}>
                  <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(8px,2.5vw,11px)",fontWeight:900,color:active?dc.color:"#334155",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:1}}>{dc.label}</div>
                  <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:9,color:active?dc.color+"aa":"#1e293b",fontWeight:600}}>{d}</div>
                  <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:7,color:active?dc.color:"#1e293b",fontWeight:700,marginTop:2}}>×{dc.bonusMultiplier}</div>
                  {active && <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:dc.color,boxShadow:`0 0 8px ${dc.color}`}}/>}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div>
          {status==="idle" ? (
            <motion.button onClick={startGame} whileHover={{scale:1.03,y:-2}} whileTap={{scale:0.97}}
              style={{width:"100%",padding:"clamp(13px,3vw,17px)",borderRadius:15,background:"linear-gradient(135deg,#22d3ee,#6366f1)",border:"none",cursor:"pointer",fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(12px,3vw,15px)",fontWeight:900,letterSpacing:"0.15em",textTransform:"uppercase",color:"#020617",boxShadow:"0 0 30px rgba(34,211,238,0.4)",display:"flex",alignItems:"center",justifyContent:"center",gap:10,position:"relative",overflow:"hidden"}}>
              <motion.div animate={{x:["-100%","200%"]}} transition={{duration:2,repeat:Infinity,repeatDelay:0.8,ease:"linear"}} style={{position:"absolute",inset:0,background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)",pointerEvents:"none"}}/>
              <Zap style={{width:18,height:18}}/> START GAME
            </motion.button>
          ) : status==="playing" ? (
            <motion.button onClick={resetGame} whileHover={{scale:1.02}} whileTap={{scale:0.97}}
              style={{width:"100%",padding:"13px",borderRadius:15,background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.25)",cursor:"pointer",fontFamily:"'Orbitron',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"#ef4444",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              <RefreshCw style={{width:14,height:14}}/> ABORT & RESET
            </motion.button>
          ) : (
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

        {/* LEADERBOARD */}
        <div style={{marginTop:4}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{width:20,height:2,background:"linear-gradient(90deg,#f59e0b,#ef4444)",borderRadius:1}}/>
            <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,fontWeight:700,color:"#f59e0b",letterSpacing:"0.3em",textTransform:"uppercase"}}>TOP PLAYERS</span>
          </div>
          <div style={{background:"rgba(15,23,42,0.75)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:14}}>
            {lbLoading ? (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:6}}>
                {[...Array(6)].map((_,i)=><div key={i} style={{height:40,borderRadius:9,background:"rgba(255,255,255,0.03)",animation:"wsSkel 1.5s infinite"}}/>)}
              </div>
            ) : leaderboard.length===0 ? (
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <Grid3X3 style={{width:24,height:24,color:"#334155",margin:"0 auto 8px"}}/>
                <p style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:"#475569",letterSpacing:"0.15em"}}>NO RECORDS YET</p>
              </div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:6}}>
                {leaderboard.map((entry,i)=>{
                  const {color,Icon:RI}=rankStyle(i);
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 10px",borderRadius:10,background:i<3?`rgba(${i===0?"245,158,11":i===1?"148,163,184":"180,83,9"},0.06)`:"rgba(255,255,255,0.02)",border:`1px solid ${i<3?`rgba(${i===0?"245,158,11":i===1?"148,163,184":"180,83,9"},0.18)`:"rgba(255,255,255,0.04)"}`}}>
                      <div style={{width:18,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {RI?<RI style={{width:12,height:12,color}}/>:<span style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,fontWeight:700,color:"#475569"}}>{i+1}</span>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,fontWeight:700,color:i<3?"#f8fafc":"#475569",textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{entry.user.username}</div>
                      </div>
                      <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,fontWeight:900,color:i<3?color:"#22d3ee",flexShrink:0}}>{entry.highScore.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
            )}
            {user && (
              <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid rgba(255,255,255,0.04)"}}>
                <div style={{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:10,background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)"}}>
                  <div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#22d3ee)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:10,fontWeight:900,color:"#fff"}}>{user.username[0].toUpperCase()}</span>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:7,color:"#6366f1",letterSpacing:"0.1em",textTransform:"uppercase"}}>YOU</div>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,color:"#f8fafc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.username}</div>
                  </div>
                  <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:10,fontWeight:900,color:"#f59e0b",flexShrink:0}}>{totalScore.toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* GAME HISTORY */}
        <AnimatePresence>
          {history.length>0 && (
            <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:20,height:2,background:"linear-gradient(90deg,#22d3ee,#6366f1)",borderRadius:1}}/>
                <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,fontWeight:700,color:"#22d3ee",letterSpacing:"0.3em",textTransform:"uppercase"}}>GAME HISTORY</span>
              </div>
              <div style={{background:"rgba(15,23,42,0.6)",backdropFilter:"blur(16px)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,overflow:"hidden"}}>
                {/* header — hidden on tiny screens */}
                <div className="ws-hd" style={{display:"grid",gridTemplateColumns:"1fr 80px 70px 60px",gap:8,padding:"8px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                  {["RESULT","SCORE","WORDS","TIME"].map(h=>(
                    <span key={h} style={{fontFamily:"'Orbitron',sans-serif",fontSize:7,fontWeight:700,color:"#475569",letterSpacing:"0.22em",textTransform:"uppercase"}}>{h}</span>
                  ))}
                </div>
                {history.map((rec,i)=>{
                  const dc=DIFF_CONFIG[rec.difficulty], cl=rec.wordsFound===rec.totalWords;
                  return (
                    <motion.div key={rec.id} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}}
                      style={{display:"grid",gridTemplateColumns:"1fr 80px 70px 60px",gap:8,padding:"10px 16px",borderBottom:i<history.length-1?"1px solid rgba(255,255,255,0.03)":"none",alignItems:"center"}}
                      className="ws-hd">
                      <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
                        <div style={{padding:"2px 8px",borderRadius:5,background:cl?"rgba(16,185,129,0.1)":"rgba(245,158,11,0.1)",border:`1px solid ${cl?"rgba(16,185,129,0.35)":"rgba(245,158,11,0.3)"}`,flexShrink:0}}>
                          <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:7,fontWeight:700,color:cl?"#10b981":"#f59e0b"}}>{cl?"CLEARED":"PARTIAL"}</span>
                        </div>
                        <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:7,color:dc.color,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{rec.difficulty}</span>
                      </div>
                      <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:10,fontWeight:900,color:"#f59e0b"}}>+{rec.score}</span>
                      <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:10,fontWeight:700,color:"#22d3ee"}}>{rec.wordsFound}/{rec.totalWords}</span>
                      <span style={{fontFamily:"'Rajdhani',sans-serif",fontSize:11,fontWeight:600,color:"#64748b"}}>{fmt(rec.duration)}</span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>{/* end column */}

      {/* ── TOAST ─────────────────────────────────────────────────────────────
          Desktop: fixed pill floating bottom-center
          Mobile:  slides up from very bottom, full-width strip
      ────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <>
            {/* Desktop pill */}
            <motion.div key={`d-${toast.key}`} className="ws-toast-desktop"
              initial={{opacity:0,y:30,scale:0.88}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:20,scale:0.9}}
              transition={{type:"spring",damping:18,stiffness:280}}
              style={{position:"fixed",bottom:36,left:"50%",transform:"translateX(-50%)",zIndex:200,pointerEvents:"none",padding:"11px 24px",borderRadius:40,background:"rgba(6,30,18,0.96)",border:"1px solid rgba(16,185,129,0.5)",backdropFilter:"blur(20px)",display:"flex",alignItems:"center",gap:9,boxShadow:"0 0 28px rgba(16,185,129,0.3),0 8px 28px rgba(0,0,0,0.5)",whiteSpace:"nowrap"}}>
              <CheckCircle2 style={{width:15,height:15,color:"#10b981",flexShrink:0}}/>
              <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:12,fontWeight:900,color:"#10b981",letterSpacing:"0.1em"}}>FOUND: {toast.word}</span>
              <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:10,color:"rgba(16,185,129,0.65)"}}>+{toast.pts} XP</span>
            </motion.div>
            {/* Mobile strip — slides up from bottom edge, sits above bottom nav */}
            <motion.div key={`m-${toast.key}`} className="ws-toast-mobile"
              initial={{opacity:0,y:"100%"}} animate={{opacity:1,y:0}} exit={{opacity:0,y:"100%"}}
              transition={{type:"spring",damping:22,stiffness:300}}
              style={{position:"fixed",bottom:0,left:0,right:0,zIndex:200,pointerEvents:"none",padding:"14px 20px calc(14px + env(safe-area-inset-bottom))",background:"rgba(6,30,18,0.97)",borderTop:"1px solid rgba(16,185,129,0.45)",backdropFilter:"blur(20px)",display:"none",alignItems:"center",justifyContent:"center",gap:10,boxShadow:"0 -4px 24px rgba(16,185,129,0.2)"}}>
              <CheckCircle2 style={{width:18,height:18,color:"#10b981",flexShrink:0}}/>
              <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:14,fontWeight:900,color:"#10b981",letterSpacing:"0.1em"}}>FOUND: {toast.word}</span>
              <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:12,color:"rgba(16,185,129,0.7)"}}>+{toast.pts} XP</span>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes wsPulse{0%,100%{opacity:1;box-shadow:0 0 10px #22d3ee}50%{opacity:0.3;box-shadow:0 0 4px #22d3ee}}
        @keyframes wsSkel{0%,100%{opacity:1}50%{opacity:0.35}}

        /* toast: pill on desktop, strip on mobile */
        @media(max-width:640px){
          .ws-toast-desktop{ display:none!important; }
          .ws-toast-mobile{ display:flex!important; }
        }

        /* hide history column headers on tiny screens */
        @media(max-width:380px){
          .ws-hd{ grid-template-columns:1fr 70px!important; }
          .ws-hd>*:nth-child(3),.ws-hd>*:nth-child(4){ display:none!important; }
        }
      `}</style>
    </div>
  );
}
