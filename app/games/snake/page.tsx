"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Crown, Medal, RefreshCw,
  Zap, Grid3X3, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, Maximize, Minimize,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type GameStatus = "idle" | "playing" | "paused" | "over";
interface Pt { x: number; y: number }
interface HistRecord { id: string; difficulty: Difficulty; score: number; cores: number; duration: number; date: Date }
interface LBEntry { user: { username: string }; totalXp: number; matches?: number; highScore?: number }

const GRID = 20;

const DIFF_CONFIG = {
  EASY: { label: "EASY", desc: "Relaxed · +5 XP/chip", speed: 180, color: "#10b981", hex: 0x10b981, bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.45)", glow: "rgba(16,185,129,0.3)", xpMult: 1 },
  MEDIUM: { label: "MEDIUM", desc: "Balanced · +8 XP/chip", speed: 130, color: "#f59e0b", hex: 0xf59e0b, bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.45)", glow: "rgba(245,158,11,0.3)", xpMult: 1.5 },
  HARD: { label: "HARD", desc: "Ruthless · +12 XP/chip", speed: 75, color: "#ef4444", hex: 0xef4444, bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.45)", glow: "rgba(239,68,68,0.3)", xpMult: 2 },
} as const;

const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

function rankIcon(i: number) {
  if (i === 0) return <Crown style={{ width: 14, height: 14, color: "#f59e0b" }} />;
  if (i === 1) return <Medal style={{ width: 14, height: 14, color: "#94a3b8" }} />;
  if (i === 2) return <Medal style={{ width: 14, height: 14, color: "#b45309" }} />;
  return <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 700, color: "#475569" }}>{String(i + 1).padStart(2, "0")}</span>;
}

// ─── Audio ────────────────────────────────────────────────────────────────────
function makeAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try { return new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
}
function playEat(ctx: AudioContext | null) {
  if (!ctx) return;
  const t = ctx.currentTime;
  [[0, 660, 1320], [0.06, 880, 1760]].forEach(([delay, f0, f1]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(f0, t + delay);
    o.frequency.exponentialRampToValueAtTime(f1, t + delay + 0.08);
    g.gain.setValueAtTime(0.14, t + delay);
    g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.12);
    o.start(t + delay); o.stop(t + delay + 0.14);
  });
}
function playDie(ctx: AudioContext | null) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = "sawtooth";
  o.frequency.setValueAtTime(280, t);
  o.frequency.exponentialRampToValueAtTime(35, t + 0.55);
  g.gain.setValueAtTime(0.20, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  o.start(t); o.stop(t + 0.55);
}

// ─── Math helpers ─────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function smooth5(t: number) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * c * (c * (c * 6 - 15) + 10);
}

// ─── Phaser Scene Factory ─────────────────────────────────────────────────────
function buildScene(cb: {
  onScore: (n: number) => void;
  onCores: () => void;
  onLength: (n: number) => void;
  onEat: () => void;
  onTick: (t: number) => void;
  getDiff: () => Difficulty;
  getStatus: () => GameStatus;
  triggerDie: () => void;
  getIsFullscreen: () => boolean;
}) {
  function drawHex(g: any, cx: number, cy: number, r: number, rot = 0) {
    const pts: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const a = rot + (i / 6) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < 6; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath(); g.fillPath();
  }
  function strokeHex(g: any, cx: number, cy: number, r: number, rot = 0) {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = rot + (i / 6) * Math.PI * 2;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.closePath(); g.strokePath();
  }

  class SnakeScene {
    static key = "SnakeScene";
    snake: Pt[] = [];
    prevSnake: Pt[] = [];
    food: Pt = { x: 15, y: 10 };
    dir: Pt = { x: 1, y: 0 };
    nextDir: Pt = { x: 1, y: 0 };
    moveTimer = 0; lerpT = 0; timerTick = 0; elapsed = 0; coresEaten = 0;
    trailBuf: { cx: number; cy: number }[][] = [];
    readonly TRAIL_LEN = 5;
    eatFlash = 0; foodRot = 0; foodPulse = 0; deathFade = 0; dead = false;
    bgGfx!: any; snkGfx!: any; foodGfx!: any; fxGfx!: any;
    scoreTexts: { obj: any; y: number; alpha: number }[] = [];
    particles: { x: number; y: number; vx: number; vy: number; r: number; life: number; maxLife: number; col: number; grav: number }[] = [];
    glowOrbs: { x: number; y: number; vx: number; vy: number; r: number; a: number; col: number }[] = [];
    gridLines: { pos: number; horiz: boolean; phase: number; spd: number; col: number }[] = [];
    cs = 0;

    create(this: any) {
      const W: number = this.sys.game.scale.gameSize?.width || this.sys.game.config.width;
      const H: number = this.sys.game.scale.gameSize?.height || this.sys.game.config.height;
      this.cs = W / GRID;
      this.bgGfx = this.add.graphics().setDepth(0);
      this.snkGfx = this.add.graphics().setDepth(2);
      this.foodGfx = this.add.graphics().setDepth(3);
      this.fxGfx = this.add.graphics().setDepth(4);
      const oc = [0x22d3ee, 0x6366f1, 0xa78bfa, 0x10b981, 0xf59e0b];
      this.glowOrbs = Array.from({ length: 8 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.45, vy: (Math.random() - 0.5) * 0.45,
        r: 40 + Math.random() * 70, a: 0.03 + Math.random() * 0.06,
        col: oc[Math.floor(Math.random() * oc.length)],
      }));
      for (let i = 0; i < 14; i++) {
        this.gridLines.push({ pos: Math.floor(Math.random() * GRID), horiz: Math.random() > 0.5, phase: Math.random() * Math.PI * 2, spd: 0.012 + Math.random() * 0.022, col: oc[Math.floor(Math.random() * oc.length)] });
      }
      this.resetSnake();
    }

    update(this: any, _time: number, delta: number) {
      // Use Phaser's scale manager for logical dimensions (not canvas.width which is physical pixels)
      const W = (this.sys.game.scale.gameSize?.width as number) || (this.sys.game.config.width as number);
      const H = (this.sys.game.scale.gameSize?.height as number) || (this.sys.game.config.height as number);
      // Always recalculate cs from live logical size
      if (W > 0) this.cs = W / GRID;

      const cs = this.cs as number;
      const status = cb.getStatus();
      const dcfg = DIFF_CONFIG[cb.getDiff()];
      const col = dcfg.hex;

      this.bgGfx.clear(); this.snkGfx.clear(); this.foodGfx.clear(); this.fxGfx.clear();

      // Guard: if cs is 0 the canvas isn't sized yet — skip frame
      if (!cs || cs <= 0) return;

      // ── Background ──
      // Deep space gradient base
      this.bgGfx.fillStyle(0x020c1e, 1); this.bgGfx.fillRect(0, 0, W, H);
      // Subtle radial vignette — lighter centre, darker edges
      const cx_ = W / 2, cy_ = H / 2;
      const steps = 6;
      for (let s = steps; s >= 0; s--) {
        const r_ = (W * 0.72) * (s / steps);
        const a_ = 0.06 * (1 - s / steps);
        this.bgGfx.fillStyle(0x0d1f3c, a_);
        this.bgGfx.fillCircle(cx_, cy_, r_);
      }
      // Animated glow orbs
      (this.glowOrbs as any[]).forEach(o => {
        o.x += o.vx; o.y += o.vy;
        if (o.x < -o.r) o.x = W + o.r; if (o.x > W + o.r) o.x = -o.r;
        if (o.y < -o.r) o.y = H + o.r; if (o.y > H + o.r) o.y = -o.r;
        this.bgGfx.fillStyle(o.col, o.a * 1.6); this.bgGfx.fillCircle(o.x, o.y, o.r);
      });
      // Full grid lines — visible but subtle
      for (let i = 0; i <= GRID; i++) {
        const px = i * cs, py = i * cs;
        const edgeAlpha = (i === 0 || i === GRID) ? 0 : 0.07;
        this.bgGfx.lineStyle(0.5, 0x1e40af, edgeAlpha);
        this.bgGfx.beginPath(); this.bgGfx.moveTo(px, 0); this.bgGfx.lineTo(px, H); this.bgGfx.strokePath();
        this.bgGfx.beginPath(); this.bgGfx.moveTo(0, py); this.bgGfx.lineTo(W, py); this.bgGfx.strokePath();
      }
      // Animated accent lines
      (this.gridLines as any[]).forEach(l => {
        l.phase += l.spd;
        const a = 0.04 + 0.06 * Math.abs(Math.sin(l.phase));
        const p = l.pos * cs;
        this.bgGfx.lineStyle(0.8, l.col, a); this.bgGfx.beginPath();
        if (l.horiz) { this.bgGfx.moveTo(0, p); this.bgGfx.lineTo(W, p); }
        else { this.bgGfx.moveTo(p, 0); this.bgGfx.lineTo(p, H); }
        this.bgGfx.strokePath();
      });
      // Grid intersection dots
      for (let gx = 0; gx < GRID; gx++) for (let gy = 0; gy < GRID; gy++) {
        this.bgGfx.fillStyle(0x1e3a5f, 0.9); this.bgGfx.fillCircle(gx * cs + cs / 2, gy * cs + cs / 2, 0.9);
      }
      // Border: drawn by Phaser only in fullscreen (CSS border handles normal mode)
      const tnow_ = Date.now() / 1000;
      const mk = cs * 1.2;
      const cornerAlpha = 0.7 + 0.2 * Math.sin(tnow_ * 1.8);
      const corners = [[0,0],[W,0],[0,H],[W,H]] as [number,number][];
      if (cb.getIsFullscreen()) {
        // Full glowing border
        const borderAlpha = 0.55 + 0.2 * Math.sin(tnow_ * 1.8);
        this.bgGfx.lineStyle(2.5, col, borderAlpha);
        this.bgGfx.strokeRect(2, 2, W - 4, H - 4);
      }
      // Corner accent marks only in fullscreen (CSS border handles normal mode)
      if (cb.getIsFullscreen()) {
        corners.forEach(([cx2, cy2]) => {
          const sx = cx2 === 0 ? 1 : -1, sy = cy2 === 0 ? 1 : -1;
          this.bgGfx.lineStyle(3, col, cornerAlpha);
          this.bgGfx.beginPath(); this.bgGfx.moveTo(cx2 + sx * 1, cy2 + sy * mk); this.bgGfx.lineTo(cx2 + sx * 1, cy2 + sy * 1); this.bgGfx.lineTo(cx2 + sx * mk, cy2 + sy * 1); this.bgGfx.strokePath();
        });
      }

      if (status === "idle") {
        const t = Date.now() / 1000, p = 1 + 0.07 * Math.sin(t * 2);
        [0.52, 0.36, 0.20].forEach((f, i) => { this.bgGfx.fillStyle(col, 0.07 - i * 0.02); drawHex(this.bgGfx, W / 2, H / 2, W * f * p, t * 0.25); });
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 + t * 0.18;
          const ex = W / 2 + Math.cos(ang) * W * 0.28, ey = H / 2 + Math.sin(ang) * W * 0.28;
          this.bgGfx.lineStyle(0.8, col, 0.28 + 0.18 * Math.sin(t * 2 + i));
          this.bgGfx.beginPath(); this.bgGfx.moveTo(W / 2, H / 2); this.bgGfx.lineTo(ex, ey); this.bgGfx.strokePath();
          this.bgGfx.fillStyle(col, 0.7); this.bgGfx.fillCircle(ex, ey, 2.5);
        }
        return;
      }

      if (status === "playing") {
        const speed = DIFF_CONFIG[cb.getDiff()].speed;
        this.timerTick += delta;
        if (this.timerTick >= 1000) { this.timerTick -= 1000; this.elapsed++; cb.onTick(this.elapsed); }
        this.moveTimer += delta;
        while (this.moveTimer >= speed) {
          this.moveTimer -= speed;
          this.prevSnake = this.snake.map((s: Pt) => ({ ...s }));
          this.stepGame(W, H, cs, cb.getDiff());
        }
        this.lerpT = this.moveTimer / speed;
      }

      const T = smooth5(this.lerpT);
      const ipos = (i: number) => {
        const cur = this.snake[i] ?? this.snake[this.snake.length - 1];
        const prev = this.prevSnake[i] ?? this.prevSnake[this.prevSnake.length - 1] ?? cur;
        return { cx: lerp(prev.x, cur.x, T) * cs + cs / 2, cy: lerp(prev.y, cur.y, T) * cs + cs / 2 };
      };

      if (status === "playing") {
        while (this.trailBuf.length < this.snake.length) this.trailBuf.push([]);
        for (let i = 0; i < this.snake.length; i++) {
          const p = ipos(i); this.trailBuf[i].push(p);
          if (this.trailBuf[i].length > this.TRAIL_LEN) this.trailBuf[i].shift();
        }
      }

      if (status === "playing" || status === "paused") {
        const maxSeg = Math.min(this.snake.length, this.trailBuf.length);
        for (let i = 0; i < maxSeg; i++) {
          const buf = this.trailBuf[i] as { cx: number; cy: number }[];
          const baseR = cs * (i === 0 ? 0.38 : Math.max(0.30 - (i / Math.max(this.snake.length - 1, 1)) * 0.14, 0.10));
          const segFade = 1 - (i / Math.max(this.snake.length - 1, 1)) * 0.75;
          for (let g = 0; g < buf.length - 1; g++) {
            const age = (g + 1) / buf.length, alpha = age * 0.22 * segFade;
            if (alpha < 0.008) continue;
            this.snkGfx.fillStyle(col, alpha); this.snkGfx.fillCircle(buf[g].cx, buf[g].cy, baseR * (0.4 + age * 0.6));
          }
        }
      }

      // ── Food ──
      // Food (status is always non-idle here; idle case returned early above)
      this.foodRot += 0.025; this.foodPulse += 0.06;
      const pulse = 1 + 0.1 * Math.sin(this.foodPulse);
      const fx = this.food.x * cs + cs / 2, fy = this.food.y * cs + cs / 2;
      const chipR = cs * 0.36 * pulse, fg = this.foodGfx;
      [2.4, 1.7, 1.1].forEach((m, i) => { fg.fillStyle(0x22d3ee, (0.035 - i * 0.008) * pulse); fg.fillCircle(fx, fy, chipR * m); });
      for (let arm = 0; arm < 4; arm++) {
        const ang = this.foodRot + (arm / 4) * Math.PI * 2;
        const armLen = chipR * 1.55, sx = fx + Math.cos(ang) * chipR, sy = fy + Math.sin(ang) * chipR;
        const ex = fx + Math.cos(ang) * armLen, ey = fy + Math.sin(ang) * armLen;
        fg.lineStyle(1.3, 0x22d3ee, 0.65); fg.beginPath(); fg.moveTo(sx, sy); fg.lineTo(ex, ey); fg.strokePath();
        const mx = (sx + ex) / 2, my = (sy + ey) / 2, pa = ang + Math.PI / 2;
        fg.beginPath(); fg.moveTo(mx, my); fg.lineTo(mx + Math.cos(pa) * chipR * 0.4, my + Math.sin(pa) * chipR * 0.4); fg.strokePath();
        fg.fillStyle(0xfbbf24, 1); fg.fillCircle(ex, ey, 2.4);
      }
      for (let p = 0; p < 8; p++) {
        const pa = this.foodRot * 0.45 + (p / 8) * Math.PI * 2;
        const blink = 0.4 + 0.6 * Math.sin(Date.now() / 250 + p * 0.8);
        fg.fillStyle(0x22d3ee, blink * 0.9);
        fg.fillRect(fx + Math.cos(pa) * chipR * 1.3 - 1.4, fy + Math.sin(pa) * chipR * 1.3 - 1.4, 2.8, 2.8);
      }
      const hs = chipR * 0.8;
      fg.fillStyle(0x000000, 0.5); fg.fillRect(fx - hs + 2, fy - hs + 2, hs * 2, hs * 2);
      fg.fillStyle(0x040e1f, 1); fg.fillRect(fx - hs, fy - hs, hs * 2, hs * 2);
      fg.lineStyle(2, 0x22d3ee, 0.95); fg.strokeRect(fx - hs, fy - hs, hs * 2, hs * 2);
      fg.lineStyle(0.8, 0x22d3ee, 0.30); fg.strokeRect(fx - hs * 0.68, fy - hs * 0.68, hs * 1.36, hs * 1.36);
      const step = (hs * 1.36) / 4;
      fg.lineStyle(0.5, 0x22d3ee, 0.2);
      for (let r = 1; r <= 3; r++) {
        const off = -hs * 0.68 + step * r;
        fg.beginPath(); fg.moveTo(fx - hs * 0.68, fy + off); fg.lineTo(fx + hs * 0.68, fy + off); fg.strokePath();
        fg.beginPath(); fg.moveTo(fx + off, fy - hs * 0.68); fg.lineTo(fx + off, fy + hs * 0.68); fg.strokePath();
      }
      fg.fillStyle(0x22d3ee, 0.9); fg.fillCircle(fx, fy, chipR * 0.22);
      fg.fillStyle(0xffffff, 0.95); fg.fillCircle(fx, fy, chipR * 0.1);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { fg.fillStyle(0x22d3ee, 0.7); fg.fillCircle(fx + sx * hs * 0.52, fy + sy * hs * 0.52, 2.2); });
      fg.lineStyle(0.8, 0xfbbf24, 0.38); strokeHex(fg, fx, fy, chipR * 1.72, this.foodRot * 1.4);


      // ── Snake ──
      const sg = this.snkGfx, len = this.snake.length, isDead = status === "over", tnow = Date.now() / 1000;
      for (let i = 0; i < len - 1; i++) {
        const { cx: ax, cy: ay } = ipos(i), { cx: bx, cy: by } = ipos(i + 1);
        const t_ = i / Math.max(len - 1, 1), alpha = isDead ? 0.1 : 0.6 - t_ * 0.35;
        const hw = cs * (0.26 - t_ * 0.08), dx = bx - ax, dy = by - ay, d = Math.sqrt(dx * dx + dy * dy) || 1;
        const px = -dy / d * hw, py = dx / d * hw;
        sg.fillStyle(col, alpha * 0.5);
        sg.fillTriangle(ax + px, ay + py, ax - px, ay - py, bx + px, by + py);
        sg.fillTriangle(ax - px, ay - py, bx - px, by - py, bx + px, by + py);
        sg.lineStyle(0.7, col, alpha * 0.4); sg.beginPath(); sg.moveTo(ax, ay); sg.lineTo(bx, by); sg.strokePath();
      }
      for (let i = len - 1; i >= 0; i--) {
        const { cx, cy } = ipos(i);
        const t_ = i / Math.max(len - 1, 1), alpha = isDead ? 0.18 : 1 - t_ * 0.58;
        const baseR = cs * 0.43, segR = i === 0 ? baseR : Math.max(baseR * (0.88 - t_ * 0.2), 4);
        const rot = Math.PI / 6 + (i % 2 === 0 ? 0 : Math.PI / 12);
        if (i === 0) {
          sg.lineStyle(0.9, col, alpha * 0.3); sg.strokeCircle(cx, cy, segR * 1.42 + 2.2 * Math.sin(tnow * 3));
          sg.fillStyle(col, alpha * 0.13); sg.fillCircle(cx, cy, segR + cs * 0.16);
          sg.fillStyle(col, alpha * 0.22); drawHex(sg, cx, cy, segR * 1.18, Math.PI / 6);
          sg.fillStyle(col, alpha); drawHex(sg, cx, cy, segR, Math.PI / 6);
          sg.fillStyle(0x020817, alpha * 0.92); drawHex(sg, cx, cy, segR * 0.55, Math.PI / 6);
          sg.fillStyle(col, alpha * 0.55); sg.fillCircle(cx, cy, segR * 0.3);
          sg.fillStyle(0xffffff, alpha * 0.75); sg.fillCircle(cx, cy, segR * 0.12);
          const dir = len > 1 ? { x: this.snake[0].x - this.snake[1].x, y: this.snake[0].y - this.snake[1].y } : { x: 1, y: 0 };
          const perp = { x: -dir.y, y: dir.x };
          for (const s of [1, -1]) {
            const ex = cx + dir.x * segR * 0.22 + perp.x * segR * 0.38 * s, ey = cy + dir.y * segR * 0.22 + perp.y * segR * 0.38 * s;
            sg.fillStyle(col, alpha * 0.55); sg.fillCircle(ex, ey, segR * 0.17);
            sg.fillStyle(0xffffff, alpha); sg.fillCircle(ex, ey, segR * 0.08);
          }
          sg.lineStyle(1.4, col, alpha * 0.9); strokeHex(sg, cx, cy, segR, Math.PI / 6);
          const tx = cx - dir.x * segR * 0.85, ty = cy - dir.y * segR * 0.85;
          sg.fillStyle(col, alpha * 0.45); sg.fillCircle(tx, ty, segR * 0.14);
        } else if (i === len - 1 && len > 2) {
          sg.fillStyle(col, alpha * 0.45); sg.fillCircle(cx, cy, segR * 0.52);
        } else {
          sg.fillStyle(col, alpha * 0.1); sg.fillCircle(cx, cy, segR + 2.5);
          sg.fillStyle(col, alpha * 0.85); drawHex(sg, cx, cy, segR, rot);
          sg.fillStyle(0x020817, alpha * 0.7); drawHex(sg, cx, cy, segR * 0.6, rot);
          sg.fillStyle(col, alpha * 0.5); sg.fillCircle(cx, cy, segR * 0.14);
          for (let k = 0; k < 3; k++) {
            const ka = rot + (k / 3) * Math.PI * 2;
            sg.fillStyle(col, alpha * 0.28); sg.fillCircle(cx + Math.cos(ka) * segR * 0.37, cy + Math.sin(ka) * segR * 0.37, segR * 0.065);
          }
          sg.lineStyle(0.9, col, alpha * 0.65); strokeHex(sg, cx, cy, segR, rot);
          if (i % 3 === 1 && i < len - 1) {
            const ndir = { x: this.snake[i].x - this.snake[i + 1].x, y: this.snake[i].y - this.snake[i + 1].y };
            const np = { x: -ndir.y, y: ndir.x };
            for (const s of [1, -1]) { sg.fillStyle(col, alpha * 0.55); sg.fillCircle(cx + np.x * segR * 0.85 * s, cy + np.y * segR * 0.85 * s, segR * 0.11); }
          }
        }
      }

      // ── Particles ──
      this.particles = (this.particles as any[]).map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + p.grav, life: p.life - delta })).filter(p => p.life > 0);
      (this.particles as any[]).forEach(p => {
        const a = Math.max(0, p.life / p.maxLife) * 0.92;
        this.fxGfx.fillStyle(p.col, a); this.fxGfx.fillCircle(p.x, p.y, p.r * (p.life / p.maxLife));
      });
      this.scoreTexts = (this.scoreTexts as any[]).filter((st: any) => {
        st.y -= 1.4; st.alpha -= 0.018;
        if (st.alpha <= 0) { try { st.obj.destroy(); } catch { } return false; }
        st.obj.setY(st.y); st.obj.setAlpha(st.alpha); return true;
      });
      if (this.eatFlash > 0) {
        this.fxGfx.fillStyle(col, this.eatFlash * 0.09); this.fxGfx.fillRect(0, 0, W, H);
        this.eatFlash = Math.max(0, this.eatFlash - 0.1);
      }
      if (status === "over") { this.deathFade = Math.min(0.82, this.deathFade + 0.022); this.fxGfx.fillStyle(0x0a0015, this.deathFade); this.fxGfx.fillRect(0, 0, W, H); }
      if (status === "paused") { this.fxGfx.fillStyle(0x020817, 0.62); this.fxGfx.fillRect(0, 0, W, H); }
    }

    stepGame(this: any, _W: number, _H: number, cs: number, diff: Difficulty) {
      const cand = this.nextDir, cur = this.dir;
      if (!(cand.x === -cur.x && cand.y === -cur.y)) this.dir = { ...cand };
      const head = this.snake[0], nh = { x: head.x + this.dir.x, y: head.y + this.dir.y };
      if (nh.x < 0 || nh.x >= GRID || nh.y < 0 || nh.y >= GRID) { this.dodie(cs); return; }
      if (this.snake.some((s: Pt) => s.x === nh.x && s.y === nh.y)) { this.dodie(cs); return; }
      const ate = nh.x === this.food.x && nh.y === this.food.y;
      this.snake = ate ? [nh, ...this.snake] : [nh, ...this.snake.slice(0, -1)];
      cb.onLength(this.snake.length);
      if (ate) {
        this.coresEaten++;
        const pts = 10 + this.coresEaten * 2;
        this.eatFlash = 1;
        this.spawnEatFX(this.food, cs, diff);
        this.spawnPopup(this.food, cs, pts);
        cb.onEat(); cb.onCores(); cb.onScore(pts);
        this.food = this.randFood();
      }
    }
    dodie(this: any, cs: number) { this.dead = true; this.deathFade = 0; this.spawnDeathFX(this.snake[0], cs); cb.triggerDie(); }
    spawnEatFX(this: any, food: Pt, cs: number, diff: Difficulty) {
      const cx = food.x * cs + cs / 2, cy = food.y * cs + cs / 2;
      const cols = [0x22d3ee, 0xfbbf24, 0xa78bfa, 0xffffff, DIFF_CONFIG[diff].hex];
      for (let i = 0; i < 26; i++) {
        const ang = (i / 26) * Math.PI * 2, spd = 2.2 + Math.random() * 5;
        this.particles.push({ x: cx, y: cy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 1.2, r: 2 + Math.random() * 3.5, grav: 0.13, life: 300 + Math.random() * 220, maxLife: 520, col: cols[Math.floor(Math.random() * cols.length)] });
      }
    }
    spawnDeathFX(this: any, head: Pt, cs: number) {
      const cx = head.x * cs + cs / 2, cy = head.y * cs + cs / 2;
      const cols = [0xef4444, 0xf97316, 0xfbbf24, 0xffffff];
      for (let i = 0; i < 34; i++) {
        const ang = (i / 34) * Math.PI * 2, spd = 2.8 + Math.random() * 6;
        this.particles.push({ x: cx, y: cy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 2.5, r: 3 + Math.random() * 5, grav: 0.18, life: 480 + Math.random() * 320, maxLife: 800, col: cols[Math.floor(Math.random() * cols.length)] });
      }
    }
    spawnPopup(this: any, food: Pt, cs: number, pts: number) {
      const cx = food.x * cs + cs / 2, cy = food.y * cs + cs / 2;
      try {
        const obj = (this as any).add.text(cx, cy, `+${pts}`, { fontFamily: "'Orbitron',monospace", fontSize: `${Math.floor(cs * 0.62)}px`, color: "#22d3ee", stroke: "#020817", strokeThickness: 2 }).setOrigin(0.5, 0.5).setDepth(20);
        this.scoreTexts.push({ obj, y: cy, alpha: 1 });
      } catch { }
    }
    randFood(this: any): Pt {
      let pt: Pt;
      do { pt = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }; }
      while ((this.snake as Pt[]).some(s => s.x === pt.x && s.y === pt.y));
      return pt;
    }
    resetSnake(this: any) {
      this.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      this.prevSnake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      this.food = { x: 15, y: 10 };
      this.dir = { x: 1, y: 0 }; this.nextDir = { x: 1, y: 0 };
      this.moveTimer = 0; this.lerpT = 0; this.timerTick = 0; this.elapsed = 0;
      this.coresEaten = 0; this.eatFlash = 0; this.foodRot = 0; this.foodPulse = 0;
      this.dead = false; this.deathFade = 0; this.particles = []; this.trailBuf = [];
      (this.scoreTexts as any[]).forEach(st => { try { st.obj.destroy(); } catch { } });
      this.scoreTexts = [];
    }
    setDir(this: any, dx: number, dy: number) { this.nextDir = { x: dx, y: dy }; }
  }
  return SnakeScene;
}

// ─── React Page ───────────────────────────────────────────────────────────────
export default function SnakePage() {
  const { user } = useAuthStore();

  const [diff, setDiff] = useState<Difficulty>("MEDIUM");
  const [status, setStatus] = useState<GameStatus>("idle");
  const [score, setScore] = useState(0);
  const [cores, setCores] = useState(0);
  const [snakeLen, setSnakeLen] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [finalXP, setFinalXP] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [finalCores, setFinalCores] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [muted, setMuted] = useState(false);
  const [lb, setLb] = useState<LBEntry[]>([]);
  const [lbLoad, setLbLoad] = useState(true);
  const [hist, setHist] = useState<HistRecord[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [hasTouchScreen, setHasTouchScreen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const gameWrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);
  const diffRef = useRef<Difficulty>("MEDIUM");
  const statusRef = useRef<GameStatus>("idle");
  const scoreRef = useRef(0);
  const coresRef = useRef(0);
  const elapsedRef = useRef(0);
  const userRef = useRef(user);
  const endGameRef = useRef<(() => void) | null>(null);

  useEffect(() => { diffRef.current = diff; }, [diff]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { userRef.current = user; }, [user]);

  // Fullscreen helpers
  const toggleFullscreen = useCallback(() => {
    const el = gameWrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => { });
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  const isFullscreenRef = useRef(false);
  useEffect(() => {
    const onChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      isFullscreenRef.current = fs;
      // When fullscreen, resize Phaser canvas to fill the square area
      if (fs && gameRef.current) {
        const size = Math.min(window.screen.width, window.screen.height);
        setTimeout(() => {
          [0, 100, 300, 600].forEach(delay => setTimeout(() => {
            if (!gameRef.current) return;
            const iw = window.innerWidth, ih = window.innerHeight;
            const sq = Math.min(iw, ih);
            try { gameRef.current.scale.resize(sq, sq); } catch {}
          }, delay));
        }, 0);
      } else if (!fs && gameRef.current && containerRef.current) {
        // Restore normal size
        const w = containerRef.current.getBoundingClientRect().width;
        if (w > 0) try { gameRef.current.scale.resize(w, w); } catch {}
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640 || "ontouchstart" in window);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    // Only show touch controls on actual touchscreen hardware (coarse pointer).
    // Deliberately exclude "ontouchstart" check — desktop Chrome can have that
    // even without a real touchscreen, which was causing the d-pad to appear.
    setHasTouchScreen(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const fetchLbAndHist = useCallback(() => {
    setLbLoad(true);
    Promise.all([
      fetch("/api/leaderboard?gameType=SNAKE").then(r => r.json()),
      user ? fetch("/api/games/history?gameType=SNAKE&limit=20").then(r => r.json()) : Promise.resolve(null),
    ]).then(([lbR, hR]) => {
      if (lbR?.success) setLb(lbR.data.slice(0, 8));
      if (hR?.success && hR.data?.length) {
        setHist(hR.data.map((g: any) => ({
          id: g.id, difficulty: g.difficulty as Difficulty,
          score: g.score, cores: g.coresCollected ?? 0,
          duration: g.survivalTime ?? 0, date: new Date(g.createdAt),
        })));
      }
    }).catch(console.error).finally(() => setLbLoad(false));
  }, [user]);

  useEffect(() => { fetchLbAndHist(); }, [fetchLbAndHist]);

  const endGame = useCallback(async () => {
    if (!mutedRef.current) playDie(audioRef.current);
    // Auto-exit fullscreen when game ends
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else if ((document as any).webkitFullscreenElement) {
      (document as any).webkitExitFullscreen?.();
    }
    const sc = scoreRef.current, co = coresRef.current, el = elapsedRef.current;
    const ln = sceneRef.current?.snake?.length ?? 3;
    const xp = Math.round(co * 5 * DIFF_CONFIG[diffRef.current].xpMult);
    setStatus("over"); statusRef.current = "over";
    setFinalXP(xp); setFinalScore(sc); setFinalCores(co);
    setSessionScore(s => s + xp);
    const currentUser = userRef.current;
    const currentSessionId = sessionIdRef.current;
    if (currentUser && currentSessionId) {
      setSaving(true);
      try {
        const res = await fetch("/api/games/snake/finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: currentSessionId, coresCollected: co, survivalTime: el, score: sc, snakeLength: ln }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.xpEarned !== undefined) {
            setFinalXP(data.xpEarned);
            setSessionScore(s => s - xp + data.xpEarned);
          }
          fetchLbAndHist();
        } else {
          const errText = await res.text();
          console.error("[snake/finish] API error:", res.status, errText);
        }
        setHist(prev => [{ id: crypto.randomUUID(), difficulty: diffRef.current, score: sc, cores: co, duration: el, date: new Date() }, ...prev].slice(0, 20));
      } catch (e) { console.error("[snake] endGame fetch failed:", e); }
      finally { setSaving(false); }
    }
  }, [fetchLbAndHist]);

  useEffect(() => { endGameRef.current = endGame; }, [endGame]);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    const el = containerRef.current;
    const SceneClass = buildScene({
      onScore: n => { scoreRef.current += n; setScore(scoreRef.current); },
      onCores: () => { coresRef.current++; setCores(coresRef.current); },
      onLength: n => setSnakeLen(n),
      onEat: () => { if (!mutedRef.current) playEat(audioRef.current); },
      onTick: t => { elapsedRef.current = t; setElapsed(t); },
      getDiff: () => diffRef.current,
      getStatus: () => statusRef.current,
      triggerDie: () => endGameRef.current?.(),
      getIsFullscreen: () => isFullscreenRef.current,
    });
    // Use rAF so getBoundingClientRect is reliable after first paint
    const rafId = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const sz = Math.round(rect.width) || 500;
      import("phaser").then(({ default: Phaser }) => {
        if (gameRef.current) { gameRef.current.destroy(true); gameRef.current = null; }
        const game = new Phaser.Game({
          type: Phaser.AUTO, width: sz, height: sz,
          backgroundColor: "#020817",
          parent: el, scene: SceneClass,
          scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
          render: { antialias: true, pixelArt: false, roundPixels: false },
        } as any);
        gameRef.current = game;
        game.events.once("ready", () => {
          sceneRef.current = game.scene.getScene("SnakeScene") ?? game.scene.scenes[0];
          // Resize to actual container width after Phaser boots
          requestAnimationFrame(() => {
            if (containerRef.current && gameRef.current) {
              const w = containerRef.current.getBoundingClientRect().width;
              if (w > 0) { try { gameRef.current.scale.resize(w, w); } catch {} }
            }
          });
        });
      }).catch(console.error);
    });
    return () => {
      cancelAnimationFrame(rafId);
      if (gameRef.current) { gameRef.current.destroy(true); gameRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (!gameRef.current || !containerRef.current) return;
      const w = Math.round(containerRef.current.getBoundingClientRect().width);
      if (w > 0) try { gameRef.current.scale.resize(w, w); } catch { }
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const startGame = useCallback(async () => {
    if (!audioRef.current) audioRef.current = makeAudio();
    scoreRef.current = 0; coresRef.current = 0; elapsedRef.current = 0;
    sessionIdRef.current = null;
    setScore(0); setCores(0); setElapsed(0); setFinalXP(0); setFinalScore(0); setFinalCores(0); setSnakeLen(3);
    sceneRef.current?.resetSnake?.();
    const currentUser = userRef.current;
    if (currentUser) {
      try {
        const r = await fetch("/api/games/snake/start", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ difficulty: diffRef.current }),
        });
        if (r.ok) {
          const data = await r.json();
          sessionIdRef.current = data.sessionId;
        }
      } catch (e) { console.warn("[snake] start failed", e); }
    }
    // 5-second countdown before game starts
    setStatus("idle"); statusRef.current = "idle";
    setCountdown(5);
    let count = 5;
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        setCountdown(null);
        setStatus("playing"); statusRef.current = "playing";
      } else {
        setCountdown(count);
      }
    }, 1000);
  }, []);

  const togglePause = useCallback(() => {
    setStatus(prev => { const n = prev === "playing" ? "paused" : "playing"; statusRef.current = n; return n; });
  }, []);

  const reset = useCallback(() => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setCountdown(null);
    scoreRef.current = 0; coresRef.current = 0; elapsedRef.current = 0;
    sceneRef.current?.resetSnake?.();
    setStatus("idle"); statusRef.current = "idle";
    setScore(0); setCores(0); setElapsed(0); setSnakeLen(3); setFinalXP(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const sc = sceneRef.current;
      switch (e.key) {
        case "ArrowUp": case "w": case "W": sc?.setDir?.(0, -1); e.preventDefault(); break;
        case "ArrowDown": case "s": case "S": sc?.setDir?.(0, 1); e.preventDefault(); break;
        case "ArrowLeft": case "a": case "A": sc?.setDir?.(-1, 0); e.preventDefault(); break;
        case "ArrowRight": case "d": case "D": sc?.setDir?.(1, 0); e.preventDefault(); break;
        case " ": e.preventDefault(); if (statusRef.current === "playing" || statusRef.current === "paused") togglePause(); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePause]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || statusRef.current !== "playing") return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      sceneRef.current?.setDir?.(dx > 0 ? 1 : -1, 0);
    } else {
      sceneRef.current?.setDir?.(0, dy > 0 ? 1 : -1);
    }
  }, []);

  const mobileDir = (dx: number, dy: number) => {
    if (statusRef.current === "playing") sceneRef.current?.setDir?.(dx, dy);
  };

  const cfg = DIFF_CONFIG[diff];
  const isPlaying = status === "playing";
  const isPaused = status === "paused";
  const isOver = status === "over";
  const isIdle = status === "idle" && countdown === null;

  return (
    // ── Full-width container matching memory/tic-tac-toe layout ──
    <div style={{ width: "100%", minHeight: "100vh", paddingBottom: 48, boxSizing: "border-box" }}>

      {/* death flash */}
      <AnimatePresence>
        {isOver && (
          <motion.div key="df" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.5, 0, 0.25, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }}
            style={{ position: "fixed", inset: 0, zIndex: 10, pointerEvents: "none", background: "radial-gradient(ellipse at center,rgba(239,68,68,0.5) 0%,transparent 70%)" }} />
        )}
      </AnimatePresence>

      {/* ── HEADER — matches memory/ttt pattern exactly ── */}
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
            {/* ── TITLE — color is ALWAYS white, never changes with difficulty ── */}
            <h1 style={{
              fontFamily: "'Orbitron',sans-serif",
              fontSize: "clamp(22px,5vw,46px)",
              fontWeight: 900,
              color: "#f8fafc",           // ← always white — never cfg.color
              textTransform: "uppercase",
              fontStyle: "italic",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              margin: 0,
            }}>
              SNAKE <span style={{ color: "#22d3ee", textShadow: "0 0 20px rgba(34,211,238,0.5)" }}>ARENA</span>
            </h1>
            <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 10, fontWeight: 600, color: "#334155", letterSpacing: "0.25em", textTransform: "uppercase", marginTop: 4 }}>
              COLLECT XP CHIPS · AVOID WALLS
            </p>
          </div>

          {/* Session XP + mute — top-right like memory */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setMuted(m => !m)}
              style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.08)", color: muted ? "#475569" : "#22d3ee", fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, cursor: "pointer", letterSpacing: "0.1em" }}>
              {muted ? "🔇" : "🔊"}
            </button>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#334155", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 3 }}>XP EARNED THIS SESSION</div>
              <motion.div key={sessionScore} initial={{ scale: 1.3, color: "#fff" }} animate={{ scale: 1, color: "#22d3ee" }}
                style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(20px,4vw,26px)", fontWeight: 900, filter: "drop-shadow(0 0 10px rgba(34,211,238,0.4))" }}>
                {sessionScore.toLocaleString()}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS BAR — 4 cards, full width ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { label: "SCORE", val: score, col: "#22d3ee", glow: "rgba(34,211,238,0.25)" },
          { label: "CHIPS", val: cores, col: cfg.color, glow: cfg.glow },
          { label: "LENGTH", val: snakeLen, col: "#a78bfa", glow: "rgba(167,139,250,0.25)" },
          { label: "TIME", val: (isPlaying || isOver || isPaused) ? fmt(elapsed) : "--:--", col: "#f59e0b", glow: "rgba(245,158,11,0.25)" },
        ].map(s => (
          <motion.div key={s.label}
            animate={s.label === "CHIPS" && cores > 0 ? { scale: [1, 1.06, 1], boxShadow: [`0 0 0px ${s.glow}`, `0 0 16px ${s.glow}`, `0 0 0px ${s.glow}`] } : {}}
            transition={{ duration: 0.35 }}
            style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, fontWeight: 700, color: "#334155", letterSpacing: "0.2em", textTransform: "uppercase" }}>{s.label}</span>
            <motion.span key={String(s.val)} initial={{ scale: 1.25, y: -4 }} animate={{ scale: 1, y: 0 }}
              style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(14px,3.5vw,22px)", fontWeight: 900, color: s.col, filter: `drop-shadow(0 0 6px ${s.col}80)`, lineHeight: 1 }}>
              {s.val}
            </motion.span>
          </motion.div>
        ))}
      </div>

      {/* ── MAIN CONTENT — centered game column ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 560, margin: "0 auto" }}>

        {/* STATUS BANNER */}
        <motion.div key={status} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          style={{
            background: isOver ? "rgba(4,8,36,0.95)" : "rgba(15,23,42,0.85)",
            backdropFilter: "blur(16px)",
            border: `1px solid ${isOver ? "rgba(239,68,68,0.5)" : isPaused ? "rgba(245,158,11,0.35)" : "rgba(34,211,238,0.2)"}`,
            borderRadius: 14, padding: "12px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 8, position: "relative", overflow: "hidden",
          }}>
          {isOver && (
            <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.5, ease: "linear" }}
              style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(239,68,68,0.12),transparent)", pointerEvents: "none" }} />
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
              background: isOver ? "#ef4444" : isPaused ? "#f59e0b" : isPlaying ? "#22d3ee" : "#475569",
              boxShadow: `0 0 8px ${isOver ? "#ef4444" : isPaused ? "#f59e0b" : isPlaying ? "#22d3ee" : "#475569"}`,
              animation: isPlaying ? "snkPulse 1.5s infinite" : "none",
            }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, letterSpacing: "0.06em", color: isOver ? "#ef4444" : isPaused ? "#f59e0b" : isPlaying ? "#22d3ee" : "#94a3b8" }}>
                {isOver ? "SNAKE DESTROYED" : isPaused ? "SYSTEM PAUSED" : isPlaying ? `ONLINE · ${cores} CHIPS` : "READY TO PLAY"}
              </div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#475569", fontWeight: 600, marginTop: 1 }}>
                {isOver ? `Score: ${finalScore.toLocaleString()} · +${finalXP} XP${saving ? " · saving…" : ""}` : isPlaying ? `Segments: ${snakeLen} · ${fmt(elapsed)}` : "Select difficulty & start"}
              </div>
            </div>
          </div>
          {isPlaying && (
            <button onClick={togglePause}
              style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, cursor: "pointer", flexShrink: 0, position: "relative", zIndex: 1 }}>
              PAUSE
            </button>
          )}
          {isPaused && (
            <button onClick={togglePause}
              style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)", color: "#22d3ee", fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, cursor: "pointer", flexShrink: 0, position: "relative", zIndex: 1 }}>
              RESUME
            </button>
          )}
        </motion.div>

        {/* ── PHASER CANVAS BORDER BOX — difficulty color only on border/glow, NOT title ── */}
        <div ref={gameWrapperRef} className="snk-game-wrapper" style={{
          background: "rgba(2,8,23,0.98)",
          border: isFullscreen ? "none" : `2px solid ${isPlaying ? cfg.color : isOver ? "#ef4444" : isPaused ? "#f59e0b" : "rgba(34,211,238,0.2)"}`,
          borderRadius: isFullscreen ? 0 : 16,
          padding: isFullscreen ? 0 : 4,
          boxShadow: isFullscreen ? "none" : isPlaying
            ? `0 0 28px ${cfg.glow}, inset 0 0 20px rgba(0,0,0,0.6)`
            : isOver
              ? `0 0 20px rgba(239,68,68,0.25)`
              : `0 6px 32px rgba(0,0,0,0.8)`,
          transition: "border-color 0.4s, box-shadow 0.4s",
          position: "relative",
        }}>
          {/* Fullscreen toggle button */}
          <button onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            style={{ position: "absolute", top: 14, right: 14, zIndex: 20, background: "rgba(15,23,42,0.85)", border: `1px solid ${cfg.border}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: cfg.color, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", transition: "background 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.background = cfg.bg)}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(15,23,42,0.85)")}>
            {isFullscreen ? <Minimize style={{ width: 14, height: 14 }} /> : <Maximize style={{ width: 14, height: 14 }} />}
          </button>
          {/* Corner markers removed — Phaser draws them directly on canvas */}

          {/* canvas mount */}
          <div
            ref={containerRef}
            className="snk-canvas-container"
            style={{ position: "relative", cursor: "crosshair", aspectRatio: "1 / 1", width: "100%" }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* COUNTDOWN overlay */}
            <AnimatePresence>
              {countdown !== null && (
                <motion.div key="countdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, pointerEvents: "none", zIndex: 6, background: "rgba(2,8,23,0.35)" }}>
                  <p style={{ margin: 0, fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(7px,2vw,9px)", fontWeight: 700, color: cfg.color, letterSpacing: "0.35em", textTransform: "uppercase", opacity: 0.75 }}>GET READY</p>
                  <motion.div
                    key={countdown}
                    initial={{ scale: 1.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.92 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    transition={{ type: "spring", damping: 12, stiffness: 220 }}
                    style={{
                      fontFamily: "'Orbitron',sans-serif",
                      fontSize: "clamp(36px,10vw,64px)",
                      fontWeight: 900,
                      color: cfg.color,
                      lineHeight: 1,
                      filter: `drop-shadow(0 0 12px ${cfg.color})`,
                      opacity: 0.88,
                    }}>
                    {countdown}
                  </motion.div>
                  <motion.div animate={{ scaleX: [1, 0] }} transition={{ duration: 1, ease: "linear" }}
                    style={{ width: "clamp(48px,10vw,72px)", height: 2, borderRadius: 2, background: cfg.color, transformOrigin: "left", opacity: 0.55 }} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* IDLE overlay */}
            <AnimatePresence>
              {isIdle && countdown === null && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, pointerEvents: "none", zIndex: 5 }}>
                  <motion.div animate={{ scale: [1, 1.1, 1], filter: ["drop-shadow(0 0 8px #22d3ee)", "drop-shadow(0 0 28px #22d3ee)", "drop-shadow(0 0 8px #22d3ee)"] }} transition={{ duration: 2.5, repeat: Infinity }} style={{ fontSize: "clamp(32px,10vw,60px)" }}>🐍</motion.div>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ margin: 0, fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(14px,4vw,20px)", fontWeight: 900, color: "#f8fafc", letterSpacing: "0.1em", textShadow: "0 0 20px rgba(34,211,238,0.6)" }}>SNAKE ARENA</p>
                    <p style={{ margin: "4px 0 0", fontFamily: "'Rajdhani',sans-serif", fontSize: "clamp(9px,2.5vw,11px)", color: "#475569", letterSpacing: "0.2em", fontWeight: 600 }}>COLLECT XP CHIPS · AVOID WALLS</p>
                  </div>
                  {!isMobile && (
                    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      {["W", "A", "S", "D"].map((k, i) => (
                        <motion.div key={k} animate={{ y: [0, -3, 0] }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.12 }}
                          style={{ width: 24, height: 24, borderRadius: 5, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 900, color: "#22d3ee" }}>
                          {k}
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {isMobile && <p style={{ margin: 0, fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#334155", letterSpacing: "0.15em" }}>SWIPE TO CONTROL</p>}
                </motion.div>
              )}
            </AnimatePresence>

            {/* PAUSED overlay */}
            <AnimatePresence>
              {isPaused && (
                <motion.div key="paused" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, pointerEvents: "none", zIndex: 5 }}>
                  <motion.p animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                    style={{ margin: 0, fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(16px,5vw,28px)", fontWeight: 900, color: "#f59e0b", letterSpacing: "0.12em", textShadow: "0 0 24px rgba(245,158,11,0.6)" }}>
                    ⏸ PAUSED
                  </motion.p>
                  <p style={{ margin: 0, fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#475569", fontWeight: 600, letterSpacing: "0.15em" }}>{isMobile ? "TAP RESUME" : "SPACE TO RESUME"}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* GAME OVER overlay */}
            <AnimatePresence>
              {isOver && (
                <motion.div key="over" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, pointerEvents: "none", zIndex: 5 }}>
                  <motion.div initial={{ scale: 0.3, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 8, stiffness: 180 }} style={{ fontSize: "clamp(28px,9vw,52px)", filter: "drop-shadow(0 0 20px rgba(239,68,68,0.8))" }}>💥</motion.div>
                  <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    style={{ margin: 0, fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(13px,4vw,22px)", fontWeight: 900, color: "#ef4444", letterSpacing: "0.1em" }}>SNAKE DESTROYED</motion.p>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ display: "flex", gap: 14 }}>
                    {[["SCORE", finalScore, "#22d3ee"], ["CHIPS", finalCores, cfg.color], ["XP", `+${finalXP}`, "#f59e0b"]].map(([l, v, c]) => (
                      <div key={String(l)} style={{ textAlign: "center" }}>
                        <p style={{ margin: 0, fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: "#475569", fontWeight: 700, letterSpacing: "0.2em" }}>{l}</p>
                        <p style={{ margin: "3px 0 0", fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(14px,4vw,20px)", fontWeight: 900, color: String(c), textShadow: `0 0 10px ${c}` }}>{v}</p>
                      </div>
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* ── FULLSCREEN D-PAD — overlays the canvas at bottom-center ── */}
          {isFullscreen && (isMobile || hasTouchScreen) && (
            <div className="snk-dpad-overlay">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,60px)", gridTemplateRows: "repeat(3,60px)", gap: 6 }}>
                <div />
                <button onClick={() => mobileDir(0, -1)} className="snk-dpad-btn" style={{ border: `2px solid ${cfg.border}`, color: cfg.color, boxShadow: `0 0 14px ${cfg.glow}` }}><ChevronUp style={{ width: 28, height: 28 }} /></button>
                <div />
                <button onClick={() => mobileDir(-1, 0)} className="snk-dpad-btn" style={{ border: `2px solid ${cfg.border}`, color: cfg.color, boxShadow: `0 0 14px ${cfg.glow}` }}><ChevronLeft style={{ width: 28, height: 28 }} /></button>
                <button onClick={(isPlaying || isPaused) ? togglePause : undefined} className="snk-dpad-btn" style={{ border: isPaused ? `2px solid rgba(34,211,238,0.6)` : `2px solid ${cfg.border}`, color: isPaused ? "#22d3ee" : cfg.color, background: isPaused ? "rgba(34,211,238,0.2)" : "rgba(2,8,23,0.9)" }}>
                  {isPaused ? "▶" : "⏸"}
                </button>
                <button onClick={() => mobileDir(1, 0)} className="snk-dpad-btn" style={{ border: `2px solid ${cfg.border}`, color: cfg.color, boxShadow: `0 0 14px ${cfg.glow}` }}><ChevronRight style={{ width: 28, height: 28 }} /></button>
                <div />
                <button onClick={() => mobileDir(0, 1)} className="snk-dpad-btn" style={{ border: `2px solid ${cfg.border}`, color: cfg.color, boxShadow: `0 0 14px ${cfg.glow}` }}><ChevronDown style={{ width: 28, height: 28 }} /></button>
                <div />
              </div>
            </div>
          )}
        </div>{/* end canvas border box */}

        {/* ── CONTROLS — outside the border box ── */}
        {isMobile ? (
          <div style={{ marginTop: 8 }}>
            <p style={{ textAlign: "center", fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: "#334155", letterSpacing: "0.12em", marginBottom: 10 }}>SWIPE ON GAME OR USE D-PAD</p>
            <div style={{ display: "grid", gridTemplateColumns: "64px 64px 64px", gridTemplateRows: "64px 64px 64px", gap: 8, width: 208, margin: "0 auto" }}>
              <div />
              <button onClick={() => mobileDir(0, -1)} style={{ borderRadius: 14, background: cfg.bg, border: `2px solid ${cfg.border}`, color: cfg.color, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation", boxShadow: `0 0 12px ${cfg.glow}` }}>
                <ChevronUp style={{ width: 28, height: 28 }} />
              </button>
              <div />
              <button onClick={() => mobileDir(-1, 0)} style={{ borderRadius: 14, background: cfg.bg, border: `2px solid ${cfg.border}`, color: cfg.color, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation", boxShadow: `0 0 12px ${cfg.glow}` }}>
                <ChevronLeft style={{ width: 28, height: 28 }} />
              </button>
              <button onClick={(isPlaying || isPaused) ? togglePause : undefined} style={{ borderRadius: 14, background: isPaused ? "rgba(34,211,238,0.15)" : "rgba(15,23,42,0.7)", border: isPaused ? `2px solid rgba(34,211,238,0.5)` : `1px solid ${cfg.border}`, color: isPaused ? "#22d3ee" : cfg.color, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, touchAction: "manipulation" }}>
                {isPaused ? "▶" : "⏸"}
              </button>
              <button onClick={() => mobileDir(1, 0)} style={{ borderRadius: 14, background: cfg.bg, border: `2px solid ${cfg.border}`, color: cfg.color, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation", boxShadow: `0 0 12px ${cfg.glow}` }}>
                <ChevronRight style={{ width: 28, height: 28 }} />
              </button>
              <div />
              <button onClick={() => mobileDir(0, 1)} style={{ borderRadius: 14, background: cfg.bg, border: `2px solid ${cfg.border}`, color: cfg.color, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation", boxShadow: `0 0 12px ${cfg.glow}` }}>
                <ChevronDown style={{ width: 28, height: 28 }} />
              </button>
              <div />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {[["↑", "W"], ["↓", "S"], ["←", "A"], ["→", "D"]].map(([arrow, k]) => (
                <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ width: 28, height: 26, borderRadius: 5, background: "rgba(15,23,42,0.8)", border: `1px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 900, color: cfg.color }}>{arrow}</div>
                  <div style={{ width: 28, height: 20, borderRadius: 4, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: "#475569" }}>{k}</div>
                </div>
              ))}
              <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.06)", margin: "0 4px" }} />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ width: 50, height: 26, borderRadius: 5, background: "rgba(15,23,42,0.8)", border: "1px solid rgba(245,158,11,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 900, color: "#f59e0b" }}>SPACE</div>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 8, color: "#334155", fontWeight: 600 }}>PAUSE</div>
              </div>
            </div>
          </div>
        )}

        {/* ── XP result card ── */}
        <AnimatePresence>
          {isOver && finalXP > 0 && (
            <motion.div key="xp" initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ type: "spring", damping: 14, stiffness: 220 }}
              style={{ background: "rgba(4,8,24,0.96)", backdropFilter: "blur(16px)", border: `2px solid ${cfg.border}`, borderRadius: 18, padding: "18px 16px", boxShadow: `0 0 36px ${cfg.glow}`, position: "relative", overflow: "hidden" }}>
              <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1, ease: "linear" }}
                style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg,transparent,${cfg.color}10,transparent)`, pointerEvents: "none" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Zap style={{ width: 28, height: 28, color: "#f59e0b", filter: "drop-shadow(0 0 10px rgba(245,158,11,0.6))", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(11px,3vw,15px)", fontWeight: 900, color: cfg.color }}>GAME COMPLETE</div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 10, color: "#22d3ee", fontWeight: 600, letterSpacing: "0.1em", marginTop: 1 }}>{diff} · {finalCores} CHIPS · {snakeLen} SEGS</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: "#334155", letterSpacing: "0.2em", marginBottom: 2 }}>XP EARNED</div>
                  <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 9, delay: 0.2 }}
                    style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(26px,7vw,42px)", fontWeight: 900, color: "#f59e0b", filter: "drop-shadow(0 0 16px rgba(245,158,11,0.65))", lineHeight: 1 }}>
                    +{finalXP}
                  </motion.div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7, marginTop: 14 }}>
                {[["SCORE", finalScore.toLocaleString(), "#22d3ee"], ["CHIPS", finalCores, cfg.color], ["LENGTH", snakeLen, "#a78bfa"], ["TIME", fmt(elapsed), "#f59e0b"]].map(([l, v, c]) => (
                  <div key={String(l)} style={{ padding: "8px 6px", borderRadius: 9, background: `${c}11`, border: `1px solid ${c}33`, textAlign: "center" }}>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, color: "#475569", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2 }}>{l}</div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, color: String(c) }}>{v}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── DIFFICULTY SELECTOR ── */}
        <div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#334155", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 8, textAlign: "center" }}>SELECT DIFFICULTY</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {(["EASY", "MEDIUM", "HARD"] as Difficulty[]).map(d => {
              const dc = DIFF_CONFIG[d], active = diff === d, disabled = isPlaying || isPaused;
              return (
                <motion.button key={d} onClick={() => { if (!disabled) setDiff(d); }} disabled={disabled}
                  whileHover={!disabled ? { y: -2 } : {}} whileTap={!disabled ? { scale: 0.95 } : {}}
                  style={{ padding: "11px 6px", borderRadius: 13, background: active ? dc.bg : "rgba(15,23,42,0.6)", border: `2px solid ${active ? dc.border : "rgba(255,255,255,0.05)"}`, cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.2s", textAlign: "center", boxShadow: active ? `0 0 18px ${dc.glow}` : "none", opacity: disabled && !active ? 0.25 : 1, position: "relative", overflow: "hidden" }}>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(8px,2.5vw,11px)", fontWeight: 900, color: active ? dc.color : "#334155", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>{dc.label}</div>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 9, color: active ? dc.color + "aa" : "#1e293b", fontWeight: 600, marginBottom: 3 }}>{dc.desc}</div>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 900, color: active ? "#a78bfa" : "#334155" }}>{dc.speed}ms</div>
                  {active && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: dc.color, boxShadow: `0 0 8px ${dc.color}` }} />}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── ACTION BUTTONS ── */}
        {isIdle && (
          <motion.button onClick={startGame} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
            style={{ width: "100%", padding: "clamp(13px,3vw,17px)", borderRadius: 15, background: `linear-gradient(135deg,${cfg.color},${cfg.color}bb)`, border: "none", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(12px,3vw,15px)", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: "#020617", boxShadow: `0 0 28px ${cfg.glow}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, position: "relative", overflow: "hidden" }}>
            <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.8, ease: "linear" }}
              style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)", pointerEvents: "none" }} />
            <Zap style={{ width: 18, height: 18 }} /> START GAME
          </motion.button>
        )}
        {(isPlaying || isPaused) && (
          <motion.button onClick={reset} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{ width: "100%", padding: 13, borderRadius: 15, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <RefreshCw style={{ width: 14, height: 14 }} /> ABORT GAME
          </motion.button>
        )}
        {isOver && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <motion.button onClick={startGame} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
              style={{ padding: 14, borderRadius: 15, background: `linear-gradient(135deg,${cfg.color},${cfg.color}bb)`, border: "none", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "#020617", boxShadow: `0 0 20px ${cfg.glow}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <RefreshCw style={{ width: 13, height: 13 }} /> PLAY AGAIN
            </motion.button>
            <motion.button onClick={reset} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              style={{ padding: 14, borderRadius: 15, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              MAIN MENU
            </motion.button>
          </div>
        )}

      </div>{/* end game column */}

      {/* ── TOP PLAYERS — full width, outside game column, matches memory/ttt ── */}
      <div style={{ marginTop: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 22, height: 2, background: "linear-gradient(90deg,#f59e0b,#ef4444)", borderRadius: 1 }} />
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.3em", textTransform: "uppercase" }}>TOP PLAYERS</span>
        </div>
        <div style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          {/* header */}
          <div className="snk-lb-head" style={{ display: "grid", gridTemplateColumns: "44px 1fr 88px 68px", gap: 10, padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            {["RANK", "PLAYER", "TOTAL XP", "RUNS"].map(h => (
              <span key={h} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#475569", letterSpacing: "0.25em", textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>
          {lbLoad ? (
            <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              {[...Array(5)].map((_, i) => <div key={i} style={{ height: 36, borderRadius: 8, background: "rgba(255,255,255,0.03)", animation: "snkSkel 1.5s infinite", animationDelay: `${i * 0.1}s` }} />)}
            </div>
          ) : lb.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <Grid3X3 style={{ width: 22, height: 22, color: "#334155", margin: "0 auto 8px" }} />
              <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#475569", letterSpacing: "0.15em" }}>NO PLAYERS YET — BE FIRST!</p>
            </div>
          ) : lb.map((e, i) => {
            const top3 = i < 3;
            const rankColor = i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "#475569";
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.035 }}
                className="snk-lb-head"
                style={{ display: "grid", gridTemplateColumns: "44px 1fr 88px 68px", gap: 10, padding: "11px 18px", borderBottom: i < lb.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center", background: top3 ? `rgba(${i === 0 ? "245,158,11" : i === 1 ? "148,163,184" : "180,83,9"},0.04)` : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>{rankIcon(i)}</div>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: top3 ? "#f8fafc" : "#475569", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.user.username}</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: top3 ? rankColor : "#22d3ee" }}>{(e.totalXp ?? e.highScore ?? 0).toLocaleString()}</span>
                  <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 8, color: "#334155", fontWeight: 600 }}>XP</span>
                </div>
                <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 600, color: "#64748b" }}>{e.matches ?? "—"}</span>
              </motion.div>
            );
          })}
          {/* current user row */}
          {user && (
            <div className="snk-lb-head" style={{ display: "grid", gridTemplateColumns: "44px 1fr 88px 68px", gap: 10, padding: "10px 18px", borderTop: "1px solid rgba(255,255,255,0.04)", alignItems: "center", background: "rgba(99,102,241,0.06)" }}>
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
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: "#f59e0b" }}>{sessionScore > 0 ? sessionScore.toLocaleString() : "—"}</span>
                {sessionScore > 0 && <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 8, color: "#334155", fontWeight: 600 }}>XP</span>}
              </div>
              <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#475569" }}>—</span>
            </div>
          )}
        </div>
      </div>

      {/* ── GAME HISTORY — full width, outside game column, matches memory/ttt ── */}
      <AnimatePresence>
        {hist.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 22, height: 2, background: "linear-gradient(90deg,#22d3ee,#6366f1)", borderRadius: 1 }} />
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#22d3ee", letterSpacing: "0.3em", textTransform: "uppercase" }}>GAME HISTORY</span>
            </div>
            <div style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
              <div className="snk-hist-head" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 70px 70px", gap: 10, padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {["DIFFICULTY", "CHIPS", "SCORE", "TIME", "PLAYED"].map(h => (
                  <span key={h} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#475569", letterSpacing: "0.25em", textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>
              {hist.map((r, i) => {
                const dc = DIFF_CONFIG[r.difficulty];
                return (
                  <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="snk-hist-head snk-hist-row"
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 70px 70px", gap: 10, padding: "11px 18px", borderBottom: i < hist.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: dc.color, letterSpacing: "0.1em", fontWeight: 700 }}>{r.difficulty}</span>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: "#22d3ee" }}>{r.cores}</span>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: "#f59e0b" }}>{r.score.toLocaleString()}</span>
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
        @keyframes snkPulse { 0%,100%{opacity:1;box-shadow:0 0 8px #22d3ee} 50%{opacity:0.3;box-shadow:0 0 3px #22d3ee} }
        @keyframes snkSkel  { 0%,100%{opacity:1} 50%{opacity:0.3} }

        /* ── FULLSCREEN: wrapper fills entire screen ── */
        .snk-game-wrapper:fullscreen,
        .snk-game-wrapper:-webkit-full-screen {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          background: #020817 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          border: none !important;
          border-radius: 0 !important;
          overflow: hidden !important;
        }
        /* Canvas container: square, centered, leaves room for D-pad */
        .snk-game-wrapper:fullscreen .snk-canvas-container,
        .snk-game-wrapper:-webkit-full-screen .snk-canvas-container {
          width: min(100vw, calc(100vh - 220px)) !important;
          max-width: min(100vw, calc(100vh - 220px)) !important;
          aspect-ratio: 1 / 1 !important;
          flex-shrink: 0 !important;
        }
        /* Phaser canvas always fills its container */
        .snk-canvas-container canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
        }
        /* D-pad positioned below canvas in fullscreen */
        .snk-dpad-overlay {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 30;
          pointer-events: auto;
        }
        .snk-dpad-btn {
          border-radius: 14px;
          background: rgba(2,8,23,0.88);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          touch-action: manipulation;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: background 0.15s;
        }
        .snk-dpad-btn:active { background: rgba(34,211,238,0.15) !important; }

        /* ── Mobile table tweaks ── */
        @media(max-width:540px){
          .snk-lb-head   { grid-template-columns: 36px 1fr 90px !important; }
          .snk-lb-head > *:nth-child(4) { display: none !important; }
          .snk-hist-head { grid-template-columns: 1fr 1fr 70px !important; }
          .snk-hist-row > *:nth-child(4),
          .snk-hist-row > *:nth-child(5) { display: none !important; }
        }
      `}</style>
    </div>
  );
}
