"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Crown, Medal, RotateCcw, Zap, CheckCircle, Star, Trophy, Timer, Hash, Layers } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

// ─── Types ────────────────────────────────────────────────────────────────────
type Difficulty = "EASY" | "MEDIUM" | "HARD";
type GameStatus = "idle" | "playing" | "over";
type Cell = { x: number; y: number };
type ColorPath = { id: number; color: string; cells: Cell[] };
type Dot = { id: number; color: string; x: number; y: number };

interface LBEntry { user: { username: string }; totalXp: number; matches: number }
interface HistGame { id: string; difficulty: Difficulty; dotsCount: number; moves: number; duration: number; xpEarned: number; createdAt: string }

// ─── Constants ────────────────────────────────────────────────────────────────
const DIFF = {
  EASY: { label: "EASY", grid: 5, pairMin: 4, pairMax: 5, color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.45)", glow: "rgba(16,185,129,0.3)", desc: "5×5 grid · 4-5 pairs" },
  MEDIUM: { label: "MEDIUM", grid: 7, pairMin: 5, pairMax: 7, color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.45)", glow: "rgba(245,158,11,0.3)", desc: "7×7 grid · 5-7 pairs" },
  HARD: { label: "HARD", grid: 9, pairMin: 7, pairMax: 9, color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.45)", glow: "rgba(239,68,68,0.3)", desc: "9×9 grid · 7-9 pairs" },
} as const;

const PALETTE = ["#ef4444", "#10b981", "#3b82f6", "#f59e0b", "#a855f7", "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#e879f9"];

const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
const key = (c: Cell) => `${c.x},${c.y}`;

// ─── Audio ────────────────────────────────────────────────────────────────────
function makeAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try { return new ((window as any).AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
}
function playConnect(ctx: AudioContext | null) {
  if (!ctx) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination); o.type = "sine";
  o.frequency.setValueAtTime(660, t); o.frequency.linearRampToValueAtTime(1100, t + 0.15);
  g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  o.start(t); o.stop(t + 0.22);
}
function playWin(ctx: AudioContext | null) {
  if (!ctx) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    const t = ctx.currentTime + i * 0.1, o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = "triangle";
    o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.start(t); o.stop(t + 0.28);
  });
}

// ─── Level Generator (guaranteed full-coverage solvable puzzles) ──────────────
function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

function neighbors(c: Cell, size: number): Cell[] {
  return ([[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][])
    .map(([dx, dy]) => ({ x: c.x + dx, y: c.y + dy }))
    .filter(n => n.x >= 0 && n.y >= 0 && n.x < size && n.y < size);
}

// Generates a set of paths that together cover EVERY cell of the grid.
// Uses a region-growing approach: repeatedly extend one of the active paths
// into an unoccupied neighbour until all cells are consumed.
function generateLevel(difficulty: Difficulty): { dots: Dot[]; gridSize: number } {
  const { grid: size, pairMin, pairMax } = DIFF[difficulty];
  const pairCount = pairMin + Math.floor(Math.random() * (pairMax - pairMin + 1));
  const totalCells = size * size;

  let attempt = 0;
  while (attempt++ < 200) {
    // Step 1: place pair-count random starting cells (endpoints A)
    const allCells: Cell[] = [];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) allCells.push({ x, y });
    const starts = shuffle(allCells).slice(0, pairCount);

    // occupied map: key -> pairId (1-based)
    const owner = new Map<string, number>();
    // paths: pairId -> ordered list of cells
    const paths = new Map<number, Cell[]>();

    for (let i = 0; i < pairCount; i++) {
      const s = starts[i];
      owner.set(key(s), i + 1);
      paths.set(i + 1, [s]);
    }

    // Step 2: grow paths until all cells claimed
    let stuck = false;
    for (let iter = 0; iter < totalCells * 20 && owner.size < totalCells; iter++) {
      // pick a random path whose last cell has free neighbours
      const ids = shuffle([...paths.keys()]);
      let grew = false;
      for (const id of ids) {
        const path = paths.get(id)!;
        const tail = path[path.length - 1];
        const free = neighbors(tail, size).filter(n => !owner.has(key(n)));
        if (free.length > 0) {
          const chosen = free[Math.floor(Math.random() * free.length)];
          owner.set(key(chosen), id);
          path.push(chosen);
          grew = true;
          break;
        }
      }
      if (!grew) { stuck = true; break; }
    }

    if (stuck || owner.size < totalCells) continue;

    // Step 3: pick second endpoint (the last cell of each path)
    const palette = shuffle(PALETTE).slice(0, pairCount);
    const dots: Dot[] = [];

    let valid = true;
    for (let i = 0; i < pairCount; i++) {
      const id = i + 1;
      const path = paths.get(id)!;
      if (path.length < 2) { valid = false; break; }
      const a = path[0], b = path[path.length - 1];
      // Make sure endpoints aren't adjacent (trivially easy)
      if (path.length < 3 && size > 4) { valid = false; break; }
      const color = palette[i];
      dots.push({ id, color, x: a.x, y: a.y });
      dots.push({ id, color, x: b.x, y: b.y });
    }
    if (!valid) continue;

    return { dots, gridSize: size };
  }

  // Fallback: simple snake layout (always works)
  return snakeFallback(size, pairCount);
}

function snakeFallback(size: number, pairCount: number): { dots: Dot[]; gridSize: number } {
  const snake: Cell[] = [];
  for (let y = 0; y < size; y++) {
    if (y % 2 === 0) for (let x = 0; x < size; x++) snake.push({ x, y });
    else for (let x = size - 1; x >= 0; x--) snake.push({ x, y });
  }
  const seg = Math.floor(snake.length / pairCount);
  const palette = shuffle(PALETTE).slice(0, pairCount);
  const dots: Dot[] = [];
  for (let i = 0; i < pairCount; i++) {
    const a = snake[i * seg], b = snake[Math.min((i + 1) * seg - 1, snake.length - 1)];
    dots.push({ id: i + 1, color: palette[i], x: a.x, y: a.y });
    dots.push({ id: i + 1, color: palette[i], x: b.x, y: b.y });
  }
  return { dots, gridSize: size };
}

// ─── Canvas Renderer ──────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

class FlowGame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  dots: Dot[] = [];
  gridSize = 5;
  cellSize = 80;
  offsetX = 0; offsetY = 0;
  canvasSize = 400; // css px

  // State
  paths = new Map<number, Cell[]>();      // completed paths per pairId
  cellOwner = new Map<string, number>();  // key -> pairId
  dotPos = new Map<string, number>();     // key -> pairId (endpoint registry)
  colorMap = new Map<number, string>();   // pairId -> hex color

  activePairId = 0;
  activeColor = "";
  activePath: Cell[] = [];

  completedPairs = 0;
  totalPairs = 0;
  moves = 0;

  pulseT = 0;
  animId = 0;

  // Callbacks
  onProgress?: (completed: number, total: number, covered: number) => void;
  onMove?: () => void;
  onComplete?: (moves: number) => void;
  onConnect?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.bindInput();
    this.loop();
  }

  destroy() { cancelAnimationFrame(this.animId); }

  load(dots: Dot[], gridSize: number) {
    this.dots = dots;
    this.gridSize = gridSize;
    this.totalPairs = dots.length / 2;
    this.paths.clear();
    this.cellOwner.clear();
    this.dotPos.clear();
    this.colorMap.clear();
    this.activePairId = 0;
    this.activeColor = "";
    this.activePath = [];
    this.completedPairs = 0;
    this.moves = 0;
    for (const d of dots) {
      this.dotPos.set(key(d), d.id);
      this.colorMap.set(d.id, d.color);
    }
    this.layout();
    this.notify();
  }

  reset() {
    this.paths.clear();
    this.cellOwner.clear();
    this.activePairId = 0;
    this.activeColor = "";
    this.activePath = [];
    this.completedPairs = 0;
    this.moves = 0;
    this.notify();
  }

  layout() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.max(1, this.canvas.clientWidth || this.canvas.offsetWidth);
    const cssH = Math.max(1, this.canvas.clientHeight || this.canvas.offsetHeight);
    this.canvasSize = Math.max(1, Math.min(cssW, cssH));
    if (this.canvas.width !== Math.round(cssW * dpr) || this.canvas.height !== Math.round(cssH * dpr)) {
      this.canvas.width = Math.round(cssW * dpr);
      this.canvas.height = Math.round(cssH * dpr);
    }
    const pad = 10;
    const avail = Math.max(1, this.canvasSize - pad * 2);
    this.cellSize = Math.max(1, avail / Math.max(1, this.gridSize));
    this.offsetX = (cssW - avail) / 2;
    this.offsetY = (cssH - avail) / 2;
  }

  notify() {
    const total = this.gridSize * this.gridSize;
    const covered = this.cellOwner.size;
    this.onProgress?.(this.completedPairs, this.totalPairs, Math.round(covered / total * 100));
  }

  loop() {
    this.pulseT += 0.035;
    this.draw();
    this.animId = requestAnimationFrame(() => this.loop());
  }

  cellToScreen(c: Cell): { cx: number; cy: number } {
    return {
      cx: this.offsetX + c.x * this.cellSize + this.cellSize / 2,
      cy: this.offsetY + c.y * this.cellSize + this.cellSize / 2,
    };
  }

  safeArc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, a0: number, a1: number) {
    if (r <= 0 || !isFinite(r) || !isFinite(cx) || !isFinite(cy)) return;
    ctx.arc(cx, cy, r, a0, a1);
  }

  screenToCell(px: number, py: number): Cell | null {
    const gx = Math.floor((px - this.offsetX) / this.cellSize);
    const gy = Math.floor((py - this.offsetY) / this.cellSize);
    if (gx < 0 || gy < 0 || gx >= this.gridSize || gy >= this.gridSize) return null;
    return { x: gx, y: gy };
  }

  draw() {
    const { ctx, canvas } = this;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || canvas.offsetWidth;
    const cssH = canvas.clientHeight || canvas.offsetHeight;
    this.layout();

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);

    // ─ BG ─
    ctx.fillStyle = "#020a18";
    ctx.fillRect(0, 0, cssW, cssH);

    // ─ Grid board ─
    const pad = 10;
    const avail = this.canvasSize - pad * 2;
    const ox = this.offsetX, oy = this.offsetY;
    const cs = this.cellSize;

    // Board shadow
    ctx.shadowColor = "rgba(34,211,238,0.15)";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "#040e1e";
    this.rRect(ctx, ox - 2, oy - 2, avail + 4, avail + 4, 14);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Cell fills (color coverage)
    this.cellOwner.forEach((pid, k) => {
      const [x, y] = k.split(",").map(Number);
      const color = this.colorMap.get(pid) ?? "#fff";
      const [r, g, b] = hexToRgb(color);
      ctx.fillStyle = `rgba(${r},${g},${b},0.13)`;
      ctx.fillRect(ox + x * cs + 1, oy + y * cs + 1, cs - 2, cs - 2);
    });
    // Active path cells
    if (this.activePath.length) {
      const [r, g, b] = hexToRgb(this.activeColor);
      for (const c of this.activePath) {
        ctx.fillStyle = `rgba(${r},${g},${b},0.1)`;
        ctx.fillRect(ox + c.x * cs + 1, oy + c.y * cs + 1, cs - 2, cs - 2);
      }
    }

    // Grid lines
    ctx.strokeStyle = "#0d1f38";
    ctx.lineWidth = 1;
    for (let i = 0; i <= this.gridSize; i++) {
      ctx.beginPath(); ctx.moveTo(ox + i * cs, oy); ctx.lineTo(ox + i * cs, oy + avail); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox, oy + i * cs); ctx.lineTo(ox + avail, oy + i * cs); ctx.stroke();
    }

    // Board border glow
    ctx.strokeStyle = "rgba(34,211,238,0.2)";
    ctx.lineWidth = 2;
    this.rRect(ctx, ox, oy, avail, avail, 12);
    ctx.stroke();

    // Coverage % text in corner
    const total = this.gridSize * this.gridSize;
    const pct = Math.round(this.cellOwner.size / total * 100);
    ctx.fillStyle = "rgba(34,211,238,0.55)";
    ctx.font = `bold ${Math.max(9, cs * 0.18)}px 'Orbitron', monospace`;
    ctx.textAlign = "right"; ctx.textBaseline = "top";
    ctx.fillText(`${pct}%`, ox + avail - 5, oy + 4);
    ctx.textAlign = "left";

    // ─ Completed paths ─
    this.paths.forEach((pts, pid) => {
      if (pts.length < 2) return;
      this.drawLine(ctx, pts, this.colorMap.get(pid) ?? "#fff", false);
    });

    // ─ Active path ─
    if (this.activePath.length >= 2) {
      this.drawLine(ctx, this.activePath, this.activeColor, true);
    }

    // ─ Dots (on top of everything) ─
    for (const dot of this.dots) {
      const { cx, cy } = this.cellToScreen(dot);
      const r = cs * 0.3;
      const isConnected = this.paths.has(dot.id);
      const [dr, dg, db] = hexToRgb(dot.color);
      const pulse = 0.6 + 0.4 * Math.sin(this.pulseT * 1.8 + dot.id * 1.3);

      if (r <= 0) continue; // skip if cellSize too small
      if (isConnected) {
        // Glowing connected dot
        ctx.shadowColor = dot.color;
        ctx.shadowBlur = 14 * pulse;
        ctx.fillStyle = dot.color;
        ctx.beginPath(); this.safeArc(ctx, cx, cy, r * 1.08, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        // Inner check ring
        ctx.strokeStyle = "rgba(255,255,255,0.65)"; ctx.lineWidth = 2;
        ctx.beginPath(); this.safeArc(ctx, cx, cy, r * 0.5, 0, Math.PI * 2); ctx.stroke();
      } else {
        // Outer soft glow halo
        const gradR1 = Math.max(0.01, r * 0.3);
        const gradR2 = Math.max(0.02, r * 1.8);
        const grad = ctx.createRadialGradient(cx, cy, gradR1, cx, cy, gradR2);
        grad.addColorStop(0, `rgba(${dr},${dg},${db},${0.25 * pulse})`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath(); this.safeArc(ctx, cx, cy, r * 1.8, 0, Math.PI * 2); ctx.fill();

        // Main circle
        ctx.shadowColor = dot.color; ctx.shadowBlur = 10;
        ctx.fillStyle = dot.color;
        ctx.beginPath(); this.safeArc(ctx, cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Dark center hole
        ctx.fillStyle = "rgba(0,0,0,0.42)";
        ctx.beginPath(); this.safeArc(ctx, cx, cy, r * 0.42, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.restore();
  }

  drawLine(ctx: CanvasRenderingContext2D, pts: Cell[], color: string, isActive: boolean) {
    const cs = this.cellSize;
    // Outer glow
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = cs * 0.38;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.globalAlpha = isActive ? 0.7 : 0.85;
    ctx.shadowColor = color;
    ctx.shadowBlur = isActive ? 8 : 18;
    ctx.beginPath();
    const s = this.cellToScreen(pts[0]);
    ctx.moveTo(s.cx, s.cy);
    for (let i = 1; i < pts.length; i++) { const p = this.cellToScreen(pts[i]); ctx.lineTo(p.cx, p.cy); }
    ctx.stroke();
    // Bright core
    ctx.shadowBlur = 0; ctx.globalAlpha = isActive ? 0.5 : 0.7;
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = cs * 0.12;
    ctx.beginPath();
    const s2 = this.cellToScreen(pts[0]);
    ctx.moveTo(s2.cx, s2.cy);
    for (let i = 1; i < pts.length; i++) { const p = this.cellToScreen(pts[i]); ctx.lineTo(p.cx, p.cy); }
    ctx.stroke();
    ctx.restore();
  }

  rRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ─── Input ─────────────────────────────────────────────────────────────────
  bindInput() {
    const el = this.canvas;
    const getPos = (e: MouseEvent | Touch) => {
      const rect = el.getBoundingClientRect();
      return { px: e.clientX - rect.left, py: e.clientY - rect.top };
    };
    el.addEventListener("mousedown", e => { const { px, py } = getPos(e); this.down(px, py); });
    el.addEventListener("mousemove", e => { const { px, py } = getPos(e); this.move(px, py); });
    el.addEventListener("mouseup", e => { const { px, py } = getPos(e); this.up(px, py); });
    el.addEventListener("touchstart", e => { e.preventDefault(); const { px, py } = getPos(e.touches[0]); this.down(px, py); }, { passive: false });
    el.addEventListener("touchmove", e => { e.preventDefault(); const { px, py } = getPos(e.touches[0]); this.move(px, py); }, { passive: false });
    el.addEventListener("touchend", e => { e.preventDefault(); const { px, py } = getPos(e.changedTouches[0]); this.up(px, py); }, { passive: false });
  }

  down(px: number, py: number) {
    const cell = this.screenToCell(px, py);
    if (!cell) return;
    const pid = this.dotPos.get(key(cell));
    if (!pid) return;

    // Clear existing path for this color
    if (this.paths.has(pid)) {
      const old = this.paths.get(pid)!;
      for (const c of old) this.cellOwner.delete(key(c));
      this.paths.delete(pid);
      this.completedPairs--;
      this.notify();
    }
    this.activePairId = pid;
    this.activeColor = this.colorMap.get(pid) ?? "#fff";
    this.activePath = [{ x: cell.x, y: cell.y }];
  }

  move(px: number, py: number) {
    if (!this.activePairId) return;
    const cell = this.screenToCell(px, py);
    if (!cell) return;

    const pts = this.activePath;
    const last = pts[pts.length - 1];
    if (last.x === cell.x && last.y === cell.y) return;

    // Backtrack if moving to previous cell
    if (pts.length >= 2) {
      const prev = pts[pts.length - 2];
      if (prev.x === cell.x && prev.y === cell.y) {
        const rem = pts.pop()!;
        this.cellOwner.delete(key(rem));
        return;
      }
    }

    // Must be orthogonally adjacent
    if (Math.abs(cell.x - last.x) + Math.abs(cell.y - last.y) !== 1) return;

    const k = key(cell);

    // Can't enter another color's dot
    const dotPid = this.dotPos.get(k);
    if (dotPid !== undefined && dotPid !== this.activePairId) return;

    // Can't cross another color's path
    const ownerPid = this.cellOwner.get(k);
    if (ownerPid !== undefined && ownerPid !== this.activePairId) return;

    // Already in our own active path? Only allow if it IS the starting endpoint
    const inActive = pts.findIndex(p => p.x === cell.x && p.y === cell.y);
    if (inActive >= 0) return;

    pts.push({ x: cell.x, y: cell.y });
  }

  up(px: number, py: number) {
    if (!this.activePairId) return;

    const cell = this.screenToCell(px, py);
    const pid = this.activePairId;
    const pts = this.activePath;
    const start = pts[0];

    // Valid end: must land on the OTHER endpoint of same color
    const dotPid = cell ? this.dotPos.get(key(cell)) : undefined;
    const isValidEnd = dotPid === pid && cell && !(cell.x === start.x && cell.y === start.y);

    if (!isValidEnd || pts.length < 2) {
      this.activePairId = 0;
      this.activePath = [];
      return;
    }

    // Commit
    this.moves++;
    for (const c of pts) this.cellOwner.set(key(c), pid);
    this.paths.set(pid, [...pts]);
    this.completedPairs = this.paths.size;
    this.activePairId = 0;
    this.activePath = [];
    this.onMove?.();
    this.onConnect?.();
    this.notify();

    // Win check: all pairs connected + all cells covered
    const total = this.gridSize * this.gridSize;
    if (this.completedPairs === this.totalPairs && this.cellOwner.size === total) {
      this.onComplete?.(this.moves);
    }
  }
}

// ─── React Page ────────────────────────────────────────────────────────────────
export default function ConnectDotsPage() {
  const { user } = useAuthStore();

  const [difficulty, setDifficulty] = useState<Difficulty>("EASY");
  const [status, setStatus] = useState<GameStatus>("idle");
  const [connectedPairs, setConnectedPairs] = useState(0);
  const [totalPairs, setTotalPairs] = useState(0);
  const [coverPct, setCoverPct] = useState(0);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [roundXp, setRoundXp] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [finalMoves, setFinalMoves] = useState(0);
  const [finalElapsed, setFinalElapsed] = useState(0);

  const [leaderboard, setLeaderboard] = useState<LBEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [history, setHistory] = useState<HistGame[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<FlowGame | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const statusRef = useRef<GameStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTsRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // ─── Data fetch ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(() => {
    setLbLoading(true);
    Promise.all([
      fetch("/api/leaderboard?gameType=CONNECT_DOTS").then(r => r.json()),
      fetch("/api/games/history?gameType=CONNECT_DOTS&limit=20").then(r => r.json()),
    ]).then(([lb, hist]) => {
      if (lb?.success) setLeaderboard(lb.data ?? []);
      if (hist?.success) setHistory(hist.data ?? []);
    }).catch(console.error).finally(() => setLbLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Canvas cursor: pointer on dots, default elsewhere ────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleMouseMove = (e: MouseEvent) => {
      const game = gameRef.current;
      if (!game) return;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const cell = game.screenToCell(px, py);
      const onDot = cell ? game.dotPos.has(`${cell.x},${cell.y}`) : false;
      canvas.style.cursor = onDot ? "pointer" : "default";
    };
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", () => { canvas.style.cursor = "default"; });
    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // ─── Init canvas engine ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new FlowGame(canvas);
    gameRef.current = game;

    game.onProgress = (completed, total, pct) => {
      setConnectedPairs(completed); setTotalPairs(total); setCoverPct(pct);
    };
    game.onMove = () => setMoves(m => m + 1);
    game.onConnect = () => { if (!mutedRef.current) playConnect(audioRef.current); };
    game.onComplete = (mv) => {
      // Stop timer
      if (timerRef.current) clearInterval(timerRef.current);
      const dur = Math.floor((Date.now() - startTsRef.current) / 1000);
      setFinalMoves(mv); setFinalElapsed(dur); setCoverPct(100);
      setStatus("over"); statusRef.current = "over";
      if (!mutedRef.current) playWin(audioRef.current);
      void finishGame(mv, dur);
    };

    return () => { game.destroy(); gameRef.current = null; };
  }, []);

  // ─── Finish game ─────────────────────────────────────────────────────────────
  const finishGame = useCallback(async (mv: number, dur: number) => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      const res = await fetch("/api/games/connect-dots/finish", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, completed: true, moves: mv, duration: dur }),
      });
      const json = await res.json();
      if (json.success) {
        setRoundXp(json.xpEarned ?? 0);
        setSessionXp(s => s + (json.xpEarned ?? 0));
        fetchData();
        if (typeof (window as any).__refreshXp === "function") (window as any).__refreshXp();
      }
    } catch (e) { console.error(e); }
  }, [fetchData]);

  // ─── Start game ──────────────────────────────────────────────────────────────
  const startGame = useCallback(async () => {
    if (!audioRef.current) audioRef.current = makeAudio();

    // Generate puzzle
    const { dots, gridSize } = generateLevel(difficulty);

    // Reset state
    setStatus("playing"); statusRef.current = "playing";
    setConnectedPairs(0); setTotalPairs(dots.length / 2);
    setMoves(0); setCoverPct(0); setRoundXp(0); setFinalMoves(0); setFinalElapsed(0);
    setElapsed(0);

    // Load into game engine
    gameRef.current?.load(dots, gridSize);

    // Start elapsed timer (no limit, just count up)
    if (timerRef.current) clearInterval(timerRef.current);
    startTsRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTsRef.current) / 1000));
    }, 1000);

    // Create server session
    try {
      const res = await fetch("/api/games/connect-dots/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty }),
      });
      const json = await res.json();
      if (json.success) sessionIdRef.current = json.sessionId;
    } catch (e) { console.error(e); }
  }, [difficulty]);

  // ─── Reset / Quit ─────────────────────────────────────────────────────────────
  const resetPaths = useCallback(() => {
    gameRef.current?.reset();
    setConnectedPairs(0); setMoves(0); setCoverPct(0);
  }, []);

  const quitGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus("idle"); statusRef.current = "idle";
    sessionIdRef.current = null;
    gameRef.current?.reset();
    setConnectedPairs(0); setMoves(0); setElapsed(0); setCoverPct(0); setRoundXp(0);
  }, []);

  // ─── Derived ─────────────────────────────────────────────────────────────────
  const isIdle = status === "idle";
  const isPlaying = status === "playing";
  const isOver = status === "over";
  const cfg = DIFF[difficulty];

  const statItems = [
    { label: "PAIRS", val: `${connectedPairs}/${totalPairs || "?"}`, color: "#22d3ee", icon: <Layers style={{ width: 12, height: 12 }} /> },
    { label: "MOVES", val: moves, color: "#a78bfa", icon: <Hash style={{ width: 12, height: 12 }} /> },
    { label: "COVER", val: `${coverPct}%`, color: "#10b981", icon: <CheckCircle style={{ width: 12, height: 12 }} /> },
    { label: "TIME", val: isIdle ? "--:--" : fmt(isOver ? finalElapsed : elapsed), color: "#f59e0b", icon: <Timer style={{ width: 12, height: 12 }} /> },
  ];

  function rankIcon(i: number) {
    if (i === 0) return <Crown style={{ width: 14, height: 14, color: "#f59e0b" }} />;
    if (i === 1) return <Medal style={{ width: 14, height: 14, color: "#94a3b8" }} />;
    if (i === 2) return <Medal style={{ width: 14, height: 14, color: "#b45309" }} />;
    return <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#94a3b8" }}>{String(i + 1).padStart(2, "0")}</span>;
  }

  return (
    <div style={{ width: "100%", minHeight: "100vh", paddingBottom: 48, boxSizing: "border-box" }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/games"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", marginBottom: 10, opacity: 0.65 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "0.65")}>
          <ArrowLeft style={{ width: 13, height: 13, color: "#22d3ee" }} />
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#22d3ee", letterSpacing: "0.3em", textTransform: "uppercase" }}>BACK TO ARCADE</span>
        </Link>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(22px,5vw,46px)", fontWeight: 900, color: "#f8fafc", textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", lineHeight: 1, margin: 0 }}>
              CONNECT{" "}
              <span style={{ color: "#22d3ee", textShadow: "0 0 20px rgba(34,211,238,0.6)" }}>THE DOTS</span>
            </h1>
            <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 10, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.25em", textTransform: "uppercase", marginTop: 4 }}>
              CONNECT ALL PAIRS · FILL EVERY CELL TO WIN
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setMuted(m => !m)}
              style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.08)", color: muted ? "#475569" : "#22d3ee", fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
              {muted ? "🔇" : "🔊"}
            </button>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#94a3b8", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 3 }}>XP EARNED THIS SESSION</div>
              <motion.div key={sessionXp} initial={{ scale: 1.3, color: "#fff" }} animate={{ scale: 1, color: "#22d3ee" }}
                style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(18px,3.5vw,24px)", fontWeight: 900, filter: "drop-shadow(0 0 10px rgba(34,211,238,0.4))" }}>
                {sessionXp.toLocaleString()}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ──────────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
        {statItems.map(s => (
          <div key={s.label} style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "10px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: s.color }}>
              {s.icon}
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.2em", textTransform: "uppercase" }}>{s.label}</span>
            </div>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(13px,3vw,20px)", fontWeight: 900, color: s.color, filter: `drop-shadow(0 0 8px ${s.color})`, lineHeight: 1, textShadow: `0 0 12px ${s.color}` }}>{s.val}</span>
          </div>
        ))}
      </div>

      {/* ── COVERAGE BAR ────────────────────────────────────────────────────────── */}
      {!isIdle && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.2em", textTransform: "uppercase" }}>GRID COVERAGE</span>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, color: "#34d399" }}>{coverPct}%</span>
          </div>
          <div style={{ height: 5, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
            <motion.div animate={{ width: `${coverPct}%` }} transition={{ duration: 0.3, ease: "easeOut" }}
              style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#22d3ee,#10b981)", boxShadow: "0 0 8px rgba(34,211,238,0.4)" }} />
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT: Game + Sidebar ────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "center" }}>

        {/* ─── LEFT COLUMN: canvas + controls ─────────────────────────────────── */}
        <div style={{ flex: "0 1 580px", minWidth: 260, maxWidth: 580, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Status banner */}
          <AnimatePresence mode="wait">
            <motion.div key={status} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ background: isOver ? "rgba(4,26,10,0.97)" : "rgba(15,23,42,0.85)", backdropFilter: "blur(16px)", border: `1px solid ${isOver ? "rgba(16,185,129,0.4)" : "rgba(34,211,238,0.18)"}`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <motion.div
                  animate={{ scale: isPlaying ? [1, 1.4, 1] : 1, opacity: isPlaying ? [1, 0.4, 1] : 1 }}
                  transition={{ duration: 1.4, repeat: isPlaying ? Infinity : 0 }}
                  style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: isPlaying ? "#22d3ee" : isOver ? "#10b981" : "#94a3b8", boxShadow: `0 0 8px ${isPlaying ? "#22d3ee" : isOver ? "#10b981" : "#94a3b8"}` }} />
                <div>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, letterSpacing: "0.06em", color: isOver ? "#10b981" : isPlaying ? "#22d3ee" : "#94a3b8", display: "flex", alignItems: "center", gap: 7 }}>
                    {isOver ? <><CheckCircle style={{ width: 14, height: 14 }} /> PUZZLE SOLVED!</> : isPlaying ? `FLOWING · ${connectedPairs}/${totalPairs} PAIRS` : "SELECT DIFFICULTY · HIT PLAY"}
                  </div>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 1 }}>
                    {isOver ? `+${roundXp} XP · ${finalMoves} moves · ${fmt(finalElapsed)}` : isPlaying ? `${moves} moves · ${fmt(elapsed)} · ${coverPct}% covered` : "Connect matching dots and fill every cell"}
                  </div>
                </div>
              </div>
              {isOver && (
                <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 8 }}>
                  <Star style={{ width: 26, height: 26, color: "#f59e0b", filter: "drop-shadow(0 0 10px rgba(245,158,11,0.9))" }} />
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Game Canvas */}
          <div className="cd-canvas-wrap" style={{
            background: "#020a18", borderRadius: 16, padding: 4,
            border: `2px solid ${isPlaying ? "rgba(34,211,238,0.3)" : isOver ? "rgba(16,185,129,0.45)" : "rgba(255,255,255,0.05)"}`,
            boxShadow: isPlaying ? "0 0 32px rgba(34,211,238,0.1)" : isOver ? "0 0 32px rgba(16,185,129,0.15)" : "0 8px 32px rgba(0,0,0,0.7)",
            transition: "border-color 0.4s, box-shadow 0.4s",
            position: "relative",
          }}>
            <canvas ref={canvasRef}
              style={{ display: "block", width: "100%", aspectRatio: "1/1", borderRadius: 12, cursor: "default", touchAction: "none" }} />

            {/* IDLE overlay */}
            <AnimatePresence>
              {isIdle && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ position: "absolute", inset: 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, background: "radial-gradient(circle at 50% 45%,rgba(5,12,28,0.92),rgba(2,6,20,0.98))", borderRadius: 12, pointerEvents: "none" }}>
                  <motion.div animate={{ scale: [1, 1.1, 1], filter: ["drop-shadow(0 0 12px rgba(34,211,238,0.6))", "drop-shadow(0 0 30px rgba(34,211,238,1))", "drop-shadow(0 0 12px rgba(34,211,238,0.6))"] }} transition={{ duration: 2.8, repeat: Infinity }}>
                    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                      <circle cx="14" cy="14" r="9" fill="#ef4444" opacity="0.9" />
                      <circle cx="58" cy="14" r="9" fill="#10b981" opacity="0.9" />
                      <circle cx="14" cy="58" r="9" fill="#3b82f6" opacity="0.9" />
                      <circle cx="58" cy="58" r="9" fill="#f59e0b" opacity="0.9" />
                      <path d="M14 14 C14 36 58 36 58 58" stroke="#10b981" strokeWidth="4.5" strokeLinecap="round" fill="none" opacity="0.7" />
                      <path d="M58 14 C58 36 14 36 14 58" stroke="#3b82f6" strokeWidth="4.5" strokeLinecap="round" fill="none" opacity="0.7" />
                    </svg>
                  </motion.div>
                  <div style={{ textAlign: "center", padding: "0 20px" }}>
                    <p style={{ margin: 0, fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(14px,4vw,20px)", fontWeight: 900, color: "#f8fafc", letterSpacing: "0.06em" }}>CONNECT THE DOTS</p>
                    <p style={{ margin: "8px 0 0", fontFamily: "'Rajdhani',sans-serif", fontSize: 12, color: "#94a3b8", letterSpacing: "0.15em", fontWeight: 600, lineHeight: 1.7 }}>
                      DRAW LINES BETWEEN MATCHING DOTS<br />FILL EVERY CELL — NO TIME LIMIT
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* WIN overlay */}
            <AnimatePresence>
              {isOver && (
                <motion.div key="win" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  style={{ position: "absolute", inset: 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, background: "rgba(2,16,8,0.88)", borderRadius: 12, backdropFilter: "blur(10px)", pointerEvents: "none" }}>
                  <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.08, damping: 10 }}>
                    <CheckCircle style={{ width: 68, height: 68, color: "#10b981", filter: "drop-shadow(0 0 24px rgba(16,185,129,0.9))" }} />
                  </motion.div>
                  <motion.p initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
                    style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(18px,5vw,30px)", fontWeight: 900, color: "#10b981", margin: 0, letterSpacing: "0.04em", textShadow: "0 0 24px rgba(16,185,129,0.6)" }}>
                    SOLVED!
                  </motion.p>
                  <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(16px,4vw,24px)", fontWeight: 900, color: "#f59e0b", margin: 0, filter: "drop-shadow(0 0 8px rgba(245,158,11,0.7))" }}>
                      +{roundXp} XP
                    </p>
                    <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, color: "#94a3b8", margin: 0, fontWeight: 600 }}>
                      {finalMoves} moves · {fmt(finalElapsed)}
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── DIFFICULTY ── */}
          <div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 8, textAlign: "center" }}>SELECT DIFFICULTY</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {(["EASY", "MEDIUM", "HARD"] as Difficulty[]).map(d => {
                const c = DIFF[d]; const active = difficulty === d; const disabled = isPlaying;
                return (
                  <motion.button key={d} onClick={() => { if (!disabled) setDifficulty(d); }} disabled={disabled}
                    whileHover={!disabled ? { y: -2 } : {}} whileTap={!disabled ? { scale: 0.97 } : {}}
                    style={{ padding: "11px 6px", borderRadius: 12, background: active ? c.bg : "rgba(15,23,42,0.6)", border: `2px solid ${active ? c.border : "rgba(255,255,255,0.05)"}`, cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.2s", textAlign: "center", opacity: disabled && !active ? 0.3 : 1, boxShadow: active ? `0 0 18px ${c.glow}` : "none" }}>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(8px,2.3vw,11px)", fontWeight: 900, color: active ? c.color : "#cbd5e1", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>{d}</div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 10, color: active ? c.color + "cc" : "#94a3b8", fontWeight: 600 }}>{c.desc}</div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* ── ACTION BUTTONS ── */}
          {isIdle && (
            <motion.button onClick={startGame} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
              style={{ width: "100%", padding: "clamp(13px,3vw,16px)", borderRadius: 14, background: "linear-gradient(135deg,#22d3ee,#6366f1)", border: "none", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(12px,3vw,15px)", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: "#020617", boxShadow: "0 0 28px rgba(34,211,238,0.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, position: "relative", overflow: "hidden" }}>
              <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 1, ease: "linear" }}
                style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)", pointerEvents: "none" }} />
              <Zap style={{ width: 18, height: 18 }} /> START GAME
            </motion.button>
          )}

          {isPlaying && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <motion.button onClick={resetPaths} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                style={{ padding: 12, borderRadius: 12, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#818cf8", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                <RotateCcw style={{ width: 14, height: 14 }} /> CLEAR
              </motion.button>
              <motion.button onClick={quitGame} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                style={{ padding: 12, borderRadius: 12, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                QUIT
              </motion.button>
            </div>
          )}

          {isOver && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <motion.button onClick={startGame} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                style={{ padding: 14, borderRadius: 14, background: "linear-gradient(135deg,#22d3ee,#6366f1)", border: "none", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "#020617", boxShadow: "0 0 20px rgba(34,211,238,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Zap style={{ width: 14, height: 14 }} /> NEXT PUZZLE
              </motion.button>
              <motion.button onClick={quitGame} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                style={{ padding: 14, borderRadius: 14, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                MENU
              </motion.button>
            </div>
          )}

          {/* HOW TO PLAY */}
          <AnimatePresence>
            {isIdle && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 16px" }}>
                <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 9px" }}>HOW TO PLAY</p>
                {[
                  "Drag from a dot to its matching color pair",
                  "Paths cannot cross each other",
                  "Fill EVERY cell — empty cells mean you haven't won yet",
                  "Redraw a path by starting from either endpoint",
                  "Faster solve = more XP bonus!",
                ].map((tip, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                    <span style={{ color: "#22d3ee", fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                    <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 14, color: "#94a3b8", fontWeight: 600, lineHeight: 1.45 }}>{tip}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>{/* end main flex */}

      {/* ── TOP PLAYERS — full width, matches Snake / TTT exactly ── */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 22, height: 2, background: "linear-gradient(90deg,#f59e0b,#ef4444)", borderRadius: 1 }} />
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.3em", textTransform: "uppercase" }}>TOP PLAYERS</span>
        </div>
        <div style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          {/* header */}
          <div className="cd-lb-head" style={{ display: "grid", gridTemplateColumns: "44px 1fr 88px 68px", gap: 10, padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            {["RANK", "PLAYER", "TOTAL XP", "RUNS"].map(h => (
              <span key={h} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.25em", textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>
          {/* body */}
          {lbLoading ? (
            <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              {[...Array(5)].map((_, i) => <div key={i} style={{ height: 36, borderRadius: 8, background: "rgba(255,255,255,0.03)", animation: "cdSkel 1.5s infinite", animationDelay: `${i * 0.1}s` }} />)}
            </div>
          ) : leaderboard.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <Trophy style={{ width: 22, height: 22, color: "#94a3b8", margin: "0 auto 8px" }} />
              <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#94a3b8", letterSpacing: "0.15em" }}>NO PLAYERS YET — BE FIRST!</p>
            </div>
          ) : leaderboard.map((e, i) => {
            const top3 = i < 3;
            const rankColor = i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "#94a3b8";
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.035 }}
                className="cd-lb-head"
                style={{ display: "grid", gridTemplateColumns: "44px 1fr 88px 68px", gap: 10, padding: "11px 18px", borderBottom: i < leaderboard.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center", background: top3 ? `rgba(${i === 0 ? "245,158,11" : i === 1 ? "148,163,184" : "180,83,9"},0.04)` : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>{rankIcon(i)}</div>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: top3 ? "#f8fafc" : "#94a3b8", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.user.username}</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: top3 ? rankColor : "#22d3ee" }}>{e.totalXp.toLocaleString()}</span>
                  <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 8, color: "#94a3b8", fontWeight: 600 }}>XP</span>
                </div>
                <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>{e.matches ?? "—"}</span>
              </motion.div>
            );
          })}
          {/* YOU row */}
          {user && (
            <div className="cd-lb-head" style={{ display: "grid", gridTemplateColumns: "44px 1fr 88px 68px", gap: 10, padding: "10px 18px", borderTop: "1px solid rgba(255,255,255,0.04)", alignItems: "center", background: "rgba(99,102,241,0.06)" }}>
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
                {sessionXp > 0 && <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 8, color: "#94a3b8", fontWeight: 600 }}>XP</span>}
              </div>
              <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#94a3b8" }}>—</span>
            </div>
          )}
        </div>
      </div>

      {/* ── GAME HISTORY — full width, matches Snake / TTT exactly ── */}
      <AnimatePresence>
        {history.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 22, height: 2, background: "linear-gradient(90deg,#22d3ee,#6366f1)", borderRadius: 1 }} />
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#22d3ee", letterSpacing: "0.3em", textTransform: "uppercase" }}>GAME HISTORY</span>
            </div>
            <div style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
              {/* header */}
              <div className="cd-hist-head" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 70px 70px", gap: 10, padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {["DIFFICULTY", "PAIRS", "MOVES", "TIME", "XP"].map(h => (
                  <span key={h} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.25em", textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>
              {/* rows */}
              {history.map((g, i) => {
                const dc = DIFF[g.difficulty];
                return (
                  <motion.div key={g.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="cd-hist-head cd-hist-row"
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 70px 70px", gap: 10, padding: "11px 18px", borderBottom: i < history.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: dc.color, letterSpacing: "0.1em", fontWeight: 700 }}>{g.difficulty}</span>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: "#22d3ee" }}>{g.dotsCount} pairs</span>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: "#a78bfa" }}>{g.moves}</span>
                    <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>{fmt(g.duration)}</span>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: g.xpEarned > 0 ? "#f59e0b" : "#94a3b8" }}>{g.xpEarned > 0 ? `+${g.xpEarned}` : "—"}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes cdSkel { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .cd-canvas-wrap canvas { cursor: default; }
        .cd-canvas-wrap canvas.on-dot { cursor: pointer !important; }
        button { cursor: pointer; }
        a { cursor: pointer; }
        @media(max-width:540px){
          .cd-lb-head   { grid-template-columns: 36px 1fr 90px !important; }
          .cd-lb-head > *:nth-child(4) { display: none !important; }
          .cd-hist-head { grid-template-columns: 1fr 1fr 70px !important; }
          .cd-hist-row > *:nth-child(4),
          .cd-hist-row > *:nth-child(5) { display: none !important; }
        }
      `}</style>
    </div>
  );
}