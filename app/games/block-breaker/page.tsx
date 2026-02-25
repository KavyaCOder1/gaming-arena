"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Crown, Medal, Zap, Target, Maximize, Minimize, Play, RefreshCw, Grid3X3, Pause } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";

type GameStatus = "idle" | "playing" | "paused" | "gameover" | "victory";

interface GameStats {
  level: number; score: number; lives: number;
  blocksLeft: number; blocksDestroyed: number; timeElapsed: number;
}
interface LBEntry { user: { username: string }; highScore: number; level?: number; matches?: number }
interface HistRecord {
  id: string; level: number; score: number;
  blocksDestroyed: number; duration: number; xpEarned: number; createdAt: string;
}

const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

function rankIcon(i: number) {
  if (i === 0) return <Crown style={{ width: 14, height: 14, color: "#f59e0b" }} />;
  if (i === 1) return <Medal style={{ width: 14, height: 14, color: "#94a3b8" }} />;
  if (i === 2) return <Medal style={{ width: 14, height: 14, color: "#b45309" }} />;
  return <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 700, color: "#475569" }}>{String(i + 1).padStart(2, "0")}</span>;
}

// ── Audio ──────────────────────────────────────────────────────────────────────
let _audioCtx: AudioContext | null = null;
function getAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
  }
  if (_audioCtx.state === "suspended") _audioCtx.resume().catch(() => {});
  return _audioCtx;
}
function tone(freq: number, dur: number, vol = 0.08, type: OscillatorType = "square") {
  const ctx = getAudio(); if (!ctx) return;
  try {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = type; o.frequency.value = freq;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur + 0.01);
  } catch {}
}
function sndPaddle() { tone(520, 0.07, 0.07, "sine"); }
function sndHit() { tone(880, 0.05, 0.06, "square"); }
function sndBreak() {
  tone(1200, 0.08, 0.1, "sawtooth");
  setTimeout(() => tone(800, 0.1, 0.08, "sawtooth"), 60);
  setTimeout(() => tone(400, 0.15, 0.06, "sawtooth"), 130);
}
function sndPowerup() {
  [800, 1000, 1300, 1700].forEach((f, i) => setTimeout(() => tone(f, 0.1, 0.1, "sine"), i * 60));
}
function sndDie() {
  [350, 280, 200, 120].forEach((f, i) => setTimeout(() => tone(f, 0.2, 0.12, "sawtooth"), i * 90));
}
function sndVictory() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.2, 0.1, "sine"), i * 80));
}

// ── Rich color palette — 8 vivid colors assigned per column ─────────────────
// Colors are assigned by COLUMN INDEX so every level is immediately multicolor
const COL_COLORS = [
  "#ef4444", // col 0 – red
  "#f97316", // col 1 – orange
  "#f59e0b", // col 2 – amber
  "#10b981", // col 3 – emerald
  "#22d3ee", // col 4 – cyan
  "#6366f1", // col 5 – indigo
  "#a78bfa", // col 6 – violet
  "#ec4899", // col 7 – pink
];
// hp still tints brightness: lower hp = darker/more transparent tile
const blockColor = (_hp: number, col: number) => COL_COLORS[col % COL_COLORS.length];

// ── 10 hand-crafted level grids ───────────────────────────────────────────────
// 0 = empty, 1-4 = hp (tile exists with that durability)
// All levels use ALL 8 columns so all 8 colors always show
const LEVEL_GRIDS: number[][][] = [
  // Level 1 — "Horizon" — 3 solid rows, all hp-1, clean intro
  [
    [0,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,0],
  ],
  // Level 2 — "Wave" — 4 rows, hp 1-2, gentle wave pattern
  [
    [1,1,2,2,2,2,1,1],
    [1,2,2,1,1,2,2,1],
    [2,2,1,1,1,1,2,2],
    [1,1,1,1,1,1,1,1],
  ],
  // Level 3 — "Arch" — 5 rows, hp 1-2, arch/window opening
  [
    [1,1,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,1],
    [1,2,0,0,0,0,2,1],
    [1,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,1,1],
  ],
  // Level 4 — "Staircase" — 6 rows, hp 1-3, symmetric double staircase
  [
    [1,0,0,0,0,0,0,1],
    [1,2,0,0,0,0,2,1],
    [1,2,3,0,0,3,2,1],
    [1,2,3,0,0,3,2,1],
    [1,2,0,0,0,0,2,1],
    [1,1,1,1,1,1,1,1],
  ],
  // Level 5 — "Diamond" — 6 rows, hp 1-3, full diamond with core
  [
    [0,0,1,2,2,1,0,0],
    [0,1,2,3,3,2,1,0],
    [1,2,3,3,3,3,2,1],
    [1,2,3,3,3,3,2,1],
    [0,1,2,3,3,2,1,0],
    [0,0,1,2,2,1,0,0],
  ],
  // Level 6 — "Fortress" — 7 rows, hp 1-4, castle battlements
  [
    [2,0,2,0,0,2,0,2],
    [2,2,2,1,1,2,2,2],
    [3,3,3,3,3,3,3,3],
    [4,3,2,3,3,2,3,4],
    [4,4,3,3,3,3,4,4],
    [4,4,4,3,3,4,4,4],
    [4,4,4,4,4,4,4,4],
  ],
  // Level 7 — "X-Cross" — 7 rows, hp 1-4, bold X with fill
  [
    [4,1,1,2,2,1,1,4],
    [1,4,1,2,2,1,4,1],
    [1,1,4,3,3,4,1,1],
    [2,2,3,4,4,3,2,2],
    [1,1,4,3,3,4,1,1],
    [1,4,1,2,2,1,4,1],
    [4,1,1,2,2,1,1,4],
  ],
  // Level 8 — "Pyramid" — 8 rows, hp 1-5, full colored pyramid
  [
    [0,0,0,1,1,0,0,0],
    [0,0,2,2,2,2,0,0],
    [0,2,3,2,2,3,2,0],
    [2,3,4,3,3,4,3,2],
    [3,4,4,4,4,4,4,3],
    [3,4,3,4,4,3,4,3],
    [4,4,4,4,4,4,4,4],
    [1,2,3,4,4,3,2,1],
  ],
  // Level 9 — "Labyrinth" — 8 rows, hp 1-5, maze with inner rooms
  [
    [4,4,4,4,4,4,4,4],
    [4,1,1,4,4,1,1,4],
    [4,1,3,3,3,3,1,4],
    [4,4,3,5,5,3,4,4],
    [4,4,3,5,5,3,4,4],
    [4,1,3,3,3,3,1,4],
    [4,1,1,4,4,1,1,4],
    [4,4,4,4,4,4,4,4],
  ],
  // Level 10 — "Armageddon" — 9 rows, hp 1-6, maximum density chaos
  [
    [4,3,5,2,2,5,3,4],
    [3,5,4,5,5,4,5,3],
    [5,4,3,4,4,3,4,5],
    [4,5,4,3,3,4,5,4],
    [3,4,5,4,4,5,4,3],
    [5,3,4,5,5,4,3,5],
    [4,5,3,4,4,3,5,4],
    [3,4,5,3,3,5,4,3],
    [5,5,5,5,5,5,5,5],
  ],
];

function getLevelGrid(lvl: number): number[][] {
  return LEVEL_GRIDS[Math.min(lvl - 1, LEVEL_GRIDS.length - 1)];
}

// ── All blocks use rounded rect — shape stays consistent, DECORATION varies ──
type BlockShape = "rect";
const SHAPE_BY_LEVEL: BlockShape[] = Array(10).fill("rect");

// ── Game engine (pure canvas) ─────────────────────────────────────────────────
interface Block { x: number; y: number; w: number; h: number; hp: number; maxHp: number; phase: number; shape: BlockShape; col: number }
interface Ball { x: number; y: number; vx: number; vy: number }
interface Particle { x: number; y: number; vx: number; vy: number; r: number; life: number; maxLife: number; col: string }
interface Powerup { x: number; y: number; vy: number; type: "expand"|"slow"|"life"|"multi" }
interface Star { x: number; y: number; r: number; bright: number }

class BlockBreakerEngine {
  W = 0; H = 0;
  px = 0; pw = 110; readonly ph = 12;
  balls: Ball[] = [];
  launched = false;
  lives = 3; score = 0; level = 1;
  blocksDestroyed = 0; elapsed = 0;
  blocks: Block[] = [];
  particles: Particle[] = [];
  powerups: Powerup[] = [];
  stars: Star[] = [];
  expandTimer = 0; slowTimer = 0;
  shakeMag = 0;
  transitioning = false; transTimer = 0;
  dead = false;
  baseSpeed = 380;
  onStats: (s: Partial<GameStats>) => void = () => {};
  onGameOver: () => void = () => {};
  onVictory: () => void = () => {};
  private _timerAcc = 0;
  private _prevTime = 0;
  private _rafId = 0;
  private _getStatus: () => GameStatus = () => "idle";
  private _getMuted: () => boolean = () => false;

  init(W: number, H: number, getStatus: () => GameStatus, getMuted: () => boolean) {
    this.W = W; this.H = H;
    this._getStatus = getStatus;
    this._getMuted = getMuted;
    this.stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: 0.4 + Math.random() * 1.6, bright: 0.12 + Math.random() * 0.88,
    }));
    this.px = W / 2;
    this.loadLevel(1);
  }

  loadLevel(lvl: number) {
    this.level = lvl;
    const shape: BlockShape = SHAPE_BY_LEVEL[Math.min(lvl - 1, SHAPE_BY_LEVEL.length - 1)];
    const pat = getLevelGrid(lvl);
    const COLS = 8;
    const gapX = 5, gapY = 5;
    const bw = Math.floor((this.W - gapX * (COLS + 1)) / COLS);
    const bh = Math.max(14, Math.floor(bw * 0.3));
    const startX = gapX;
    const startY = Math.max(44, this.H * 0.08);
    this.blocks = [];
    pat.forEach((row, ri) => {
      row.forEach((hp, ci) => {
        if (hp > 0) {
          this.blocks.push({
            x: startX + ci * (bw + gapX),
            y: startY + ri * (bh + gapY),
            w: bw, h: bh,
            hp, maxHp: hp,
            phase: Math.random() * Math.PI * 2,
            shape,
            col: ci, // column index drives color
          });
        }
      });
    });
    this.transitioning = false;
    // Speed: gentle ramp — 360 (L1) up to 600 (L10)
    this.baseSpeed = Math.min(600, 360 + (lvl - 1) * 26);
    this._emit();
  }

  resetBall() {
    const paddleY = this.H - (this.W < 500 ? 50 : 60);
    this.balls = [{ x: this.px, y: paddleY - this.ph / 2 - 8, vx: 0, vy: 0 }];
    this.launched = false;
    this.expandTimer = 0; this.slowTimer = 0;
    this.pw = 110;
  }

  resetGame() {
    this.lives = 3; this.score = 0; this.level = 1;
    this.blocksDestroyed = 0; this.elapsed = 0; this._timerAcc = 0;
    this.particles = []; this.powerups = [];
    this.dead = false; this.transitioning = false;
    this.baseSpeed = 380;
    this.px = this.W / 2;
    this.loadLevel(1);
    this.resetBall();
  }

  launch() {
    if (this.launched) return;
    const spd = this.slowTimer > 0 ? this.baseSpeed * 0.6 : this.baseSpeed;
    const angle = (Math.random() - 0.5) * 0.8;
    this.balls[0].vx = Math.sin(angle) * spd;
    this.balls[0].vy = -Math.cos(angle) * spd;
    this.launched = true;
  }

  movePaddle(x: number) {
    const halfW = this.pw / 2;
    this.px = Math.max(halfW, Math.min(this.W - halfW, x));
    if (!this.launched && this.balls[0]) this.balls[0].x = this.px;
  }

  tick(now: number) {
    const dt = Math.min((now - this._prevTime) / 1000, 0.05);
    this._prevTime = now;
    const st = this._getStatus();
    if (st !== "playing") return;
    if (this.dead || this.transitioning) return;

    this._timerAcc += dt;
    if (this._timerAcc >= 1) { this._timerAcc -= 1; this.elapsed++; }

    this.shakeMag *= 0.8;
    if (this.expandTimer > 0) { this.expandTimer -= dt; if (this.expandTimer <= 0) this.pw = 110; }
    if (this.slowTimer > 0) this.slowTimer -= dt;

    const paddleY = this.H - (this.W < 500 ? 50 : 60);
    const paddleTop = paddleY - this.ph / 2;
    const ballR = Math.max(5, this.W * 0.012);
    const speed = this.slowTimer > 0 ? this.baseSpeed * 0.6 : this.baseSpeed;

    this.balls = this.balls.filter((ball) => {
      if (!this.launched) return true;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      const curSpd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      if (curSpd > 0 && Math.abs(curSpd - speed) > 5) {
        ball.vx = (ball.vx / curSpd) * speed;
        ball.vy = (ball.vy / curSpd) * speed;
      }

      if (ball.x - ballR < 0) { ball.x = ballR; ball.vx = Math.abs(ball.vx); }
      if (ball.x + ballR > this.W) { ball.x = this.W - ballR; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - ballR < 0) { ball.y = ballR; ball.vy = Math.abs(ball.vy); }

      if (ball.vy > 0 && ball.y + ballR >= paddleTop && ball.y - ballR <= paddleTop + this.ph &&
          ball.x >= this.px - this.pw / 2 - ballR && ball.x <= this.px + this.pw / 2 + ballR) {
        const rel = (ball.x - this.px) / (this.pw / 2);
        const angle = rel * 1.15;
        const spd2 = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
        ball.vx = Math.sin(angle) * spd2;
        ball.vy = -Math.abs(Math.cos(angle) * spd2);
        ball.y = paddleTop - ballR - 1;
        this.shake(4);
        if (!this._getMuted()) sndPaddle();
      }

      this._collideBall(ball, ballR);
      if (ball.y > this.H + 50) return false;
      return true;
    });

    if (this.launched && this.balls.length === 0) {
      this.lives--;
      this.shake(20);
      if (!this._getMuted()) sndDie();
      if (this.lives <= 0) {
        this.dead = true;
        this.onGameOver();
      } else {
        this.resetBall();
        this.px = this.W / 2;
        this._emit();
      }
      this._emit();
      return;
    }

    if (!this.launched && this.balls[0]) {
      const paddleY2 = this.H - (this.W < 500 ? 50 : 60);
      this.balls[0].x = this.px;
      this.balls[0].y = paddleY2 - this.ph / 2 - 8;
    }

    this.powerups = this.powerups.filter(p => {
      p.y += 140 * dt;
      if (Math.abs(p.x - this.px) < this.pw / 2 + 12 &&
          p.y >= paddleTop && p.y <= paddleTop + this.ph + 16) {
        this._collectPowerup(p);
        return false;
      }
      return p.y < this.H + 20;
    });

    this.particles = this.particles.filter(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life -= 16;
      return p.life > 0;
    });

    if (this.blocks.length === 0 && this.launched && !this.transitioning) {
      this.transitioning = true;
      this.shake(12);
      if (!this._getMuted()) sndVictory();
      this._emit();
      setTimeout(() => {
        if (this.level >= 10) {
          this.onVictory();
        } else {
          this.level++;
          this.loadLevel(this.level);
          this.resetBall();
          this.px = this.W / 2;
          this._emit();
        }
      }, 1200);
    }

    this._emit();
  }

  private _collideBall(ball: Ball, ballR: number) {
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const b = this.blocks[i];
      const nearX = Math.max(b.x, Math.min(b.x + b.w, ball.x));
      const nearY = Math.max(b.y, Math.min(b.y + b.h, ball.y));
      const dx = ball.x - nearX, dy = ball.y - nearY;
      if (dx * dx + dy * dy > (ballR + 1) ** 2) continue;

      const overL = (ball.x + ballR) - b.x;
      const overR = (b.x + b.w) - (ball.x - ballR);
      const overT = (ball.y + ballR) - b.y;
      const overB = (b.y + b.h) - (ball.y - ballR);
      const minH = Math.min(overL, overR);
      const minV = Math.min(overT, overB);
      if (minH < minV) {
        ball.vx = overL < overR ? -Math.abs(ball.vx) : Math.abs(ball.vx);
        ball.x += overL < overR ? -(overL - ballR) * 0.5 : (overR - ballR) * 0.5;
      } else {
        ball.vy = overT < overB ? -Math.abs(ball.vy) : Math.abs(ball.vy);
        ball.y += overT < overB ? -(overT - ballR) * 0.5 : (overB - ballR) * 0.5;
      }

      b.hp--;
      this.shake(3);
      if (b.hp <= 0) {
        this.score += 10 * this.level * b.maxHp;
        this.blocksDestroyed++;
        this._explode(b.x + b.w / 2, b.y + b.h / 2, blockColor(b.maxHp, b.col), 22);
        this.shake(7);
        if (!this._getMuted()) sndBreak();
        if (Math.random() < 0.18) this._spawnPowerup(b.x + b.w / 2, b.y + b.h / 2);
        this.blocks.splice(i, 1);
      } else {
        this._explode(b.x + b.w / 2, b.y + b.h / 2, blockColor(b.hp, b.col), 6);
        if (!this._getMuted()) sndHit();
      }
      break;
    }
  }

  private _spawnPowerup(x: number, y: number) {
    const types: Array<"expand"|"slow"|"life"|"multi"> = ["expand","slow","life","multi"];
    this.powerups.push({ x, y, vy: 0, type: types[Math.floor(Math.random() * types.length)] });
  }

  private _collectPowerup(p: Powerup) {
    if (!this._getMuted()) sndPowerup();
    if (p.type === "expand") { this.pw = Math.min(190, this.pw * 1.45); this.expandTimer = 8; }
    else if (p.type === "slow") { this.slowTimer = 7; }
    else if (p.type === "life") { this.lives = Math.min(5, this.lives + 1); }
    else if (p.type === "multi") {
      const ref = this.balls[0];
      if (ref) {
        const spd = Math.sqrt(ref.vx ** 2 + ref.vy ** 2) || this.baseSpeed;
        for (let i = 0; i < 2; i++) {
          const a = Math.random() * Math.PI * 2;
          this.balls.push({ x: ref.x, y: ref.y, vx: Math.cos(a) * spd, vy: -Math.abs(Math.sin(a) * spd) });
        }
      }
    }
    this._emit();
  }

  private _explode(x: number, y: number, col: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const spd = 1.5 + Math.random() * 5;
      this.particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 2 + Math.random() * 4, life: 400 + Math.random() * 400, maxLife: 800, col });
    }
  }

  shake(mag: number) { this.shakeMag = Math.max(this.shakeMag, mag); }

  private _emit() {
    this.onStats({
      level: this.level, score: this.score, lives: this.lives,
      blocksLeft: this.blocks.length, blocksDestroyed: this.blocksDestroyed,
      timeElapsed: this.elapsed,
    });
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  draw(ctx: CanvasRenderingContext2D, status: GameStatus, now: number) {
    const W = this.W, H = this.H;
    const t = now / 1000;
    const sx = this.shakeMag > 0.3 ? (Math.random() - 0.5) * this.shakeMag * 2 : 0;
    const sy = this.shakeMag > 0.3 ? (Math.random() - 0.5) * this.shakeMag * 2 : 0;

    ctx.save();
    ctx.translate(sx, sy);

    // Background
    ctx.fillStyle = "#020817";
    ctx.fillRect(-4, -4, W + 8, H + 8);

    // Grid lines
    ctx.strokeStyle = "rgba(34,211,238,0.035)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Ambient blobs
    const blob1 = ctx.createRadialGradient(W * 0.2, H * 0.25, 0, W * 0.2, H * 0.25, 180);
    blob1.addColorStop(0, `rgba(99,102,241,${0.07 + 0.03 * Math.sin(t * 0.7)})`);
    blob1.addColorStop(1, "transparent");
    ctx.fillStyle = blob1; ctx.fillRect(0, 0, W, H);

    const blob2 = ctx.createRadialGradient(W * 0.78, H * 0.6, 0, W * 0.78, H * 0.6, 160);
    blob2.addColorStop(0, `rgba(34,211,238,${0.05 + 0.03 * Math.sin(t * 0.5 + 1)})`);
    blob2.addColorStop(1, "transparent");
    ctx.fillStyle = blob2; ctx.fillRect(0, 0, W, H);

    const blob3 = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, 130);
    blob3.addColorStop(0, `rgba(245,158,11,${0.03 + 0.02 * Math.sin(t * 1.1)})`);
    blob3.addColorStop(1, "transparent");
    ctx.fillStyle = blob3; ctx.fillRect(0, 0, W, H);

    // Stars
    this.stars.forEach(s => {
      const a = s.bright * (0.5 + 0.5 * Math.sin(t * 2 + s.x));
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    });

    if (status === "idle") {
      this._drawIdle(ctx, t, W, H);
      ctx.restore();
      return;
    }

    // Particles
    this.particles.forEach(p => {
      const a = Math.max(0, p.life / p.maxLife) * 0.85;
      const r2 = p.r * (p.life / p.maxLife);
      ctx.fillStyle = p.col + Math.round(a * 255).toString(16).padStart(2, "0");
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, r2), 0, Math.PI * 2); ctx.fill();
    });

    // Powerups
    const puCols: Record<string, string> = { expand: "#10b981", slow: "#a78bfa", life: "#ef4444", multi: "#f59e0b" };
    this.powerups.forEach(p => {
      const col = puCols[p.type] ?? "#22d3ee";
      const pulse = 1 + 0.18 * Math.sin(t * 6);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 20 * pulse);
      g.addColorStop(0, col + "60"); g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 20 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
    });

    // Blocks
    if (status !== "gameover" && status !== "victory") {
      this._drawBlocks(ctx, t);
    }

    // Paddle + balls
    if (status === "playing" || status === "paused") {
      this._drawPaddle(ctx, t);
      this._drawBalls(ctx, t);
    }

    // Dim overlay
    if (status === "paused" || status === "gameover" || status === "victory") {
      ctx.fillStyle = "rgba(2,8,23,0.55)";
      ctx.fillRect(-4, -4, W + 8, H + 8);
    }

    ctx.restore();
  }

  private _drawIdle(ctx: CanvasRenderingContext2D, t: number, W: number, H: number) {
    const cols = 8, rows = 4;
    const bw = Math.floor((W - 5 * (cols + 1)) / cols);
    const bh = Math.max(12, Math.floor(bw * 0.28));
    const startX = 5, startY = H * 0.16;
    for (let r = 0; r < rows; r++) {
      const col = BLOCK_PALETTE[r % BLOCK_PALETTE.length];
      for (let c = 0; c < cols; c++) {
        const bx = startX + c * (bw + 5), by = startY + r * (bh + 5);
        const glow = 0.4 + 0.4 * Math.sin(t * 1.4 + r * 0.8 + c * 0.35);
        ctx.globalAlpha = glow;
        ctx.fillStyle = col + "22";
        ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
        ctx.fillStyle = col;
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.fillRect(bx, by, bw, 3);
        ctx.globalAlpha = 1;
      }
    }
    const py = H * 0.8;
    const pw = 110 + 20 * Math.sin(t * 1.2);
    const idleGrad = ctx.createLinearGradient(W / 2 - pw / 2, 0, W / 2 + pw / 2, 0);
    idleGrad.addColorStop(0, "#0e7490"); idleGrad.addColorStop(0.5, "#22d3ee"); idleGrad.addColorStop(1, "#0e7490");
    ctx.fillStyle = idleGrad;
    ctx.fillRect(W / 2 - pw / 2, py, pw, 11);
    const bx = W / 2 + Math.sin(t * 1.8) * 80;
    const by = H * 0.54 + Math.sin(t * 2.8 + 1) * 55;
    ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 14;
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  private _drawBlocks(ctx: CanvasRenderingContext2D, t: number) {
    this.blocks.forEach(b => {
      const col = blockColor(b.hp);
      const hpRatio = b.hp / b.maxHp;
      const glow = 0.05 + 0.04 * Math.sin(t * 2.5 + b.phase);

      ctx.save();

      // Outer glow
      ctx.fillStyle = col + Math.round(glow * 255).toString(16).padStart(2, "0");
      ctx.fillRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6);

      if (b.shape === "rounded") {
        // Rounded rectangle with corner radius
        const rr = Math.min(5, b.h * 0.35);
        ctx.beginPath();
        ctx.moveTo(b.x + rr, b.y);
        ctx.arcTo(b.x + b.w, b.y, b.x + b.w, b.y + b.h, rr);
        ctx.arcTo(b.x + b.w, b.y + b.h, b.x, b.y + b.h, rr);
        ctx.arcTo(b.x, b.y + b.h, b.x, b.y, rr);
        ctx.arcTo(b.x, b.y, b.x + b.w, b.y, rr);
        ctx.closePath();
        const bgrad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
        bgrad.addColorStop(0, col + Math.round(hpRatio * 0.92 * 255).toString(16).padStart(2, "0"));
        bgrad.addColorStop(1, col + Math.round(hpRatio * 0.55 * 255).toString(16).padStart(2, "0"));
        ctx.fillStyle = bgrad; ctx.fill();
        // Top shine
        ctx.fillStyle = "rgba(255,255,255,0.28)";
        ctx.beginPath();
        ctx.moveTo(b.x + rr, b.y);
        ctx.arcTo(b.x + b.w, b.y, b.x + b.w, b.y + b.h * 0.4, rr);
        ctx.lineTo(b.x + b.w, b.y + b.h * 0.4);
        ctx.lineTo(b.x, b.y + b.h * 0.4);
        ctx.arcTo(b.x, b.y, b.x + b.w, b.y, rr);
        ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.75; ctx.stroke(); ctx.globalAlpha = 1;
      } else if (b.shape === "pill") {
        const r = b.h / 2;
        ctx.beginPath();
        ctx.moveTo(b.x + r, b.y);
        ctx.arcTo(b.x + b.w, b.y, b.x + b.w, b.y + b.h, r);
        ctx.arcTo(b.x + b.w, b.y + b.h, b.x, b.y + b.h, r);
        ctx.arcTo(b.x, b.y + b.h, b.x, b.y, r);
        ctx.arcTo(b.x, b.y, b.x + b.w, b.y, r);
        ctx.closePath();
        const bgrad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
        bgrad.addColorStop(0, col + Math.round(hpRatio * 0.9 * 255).toString(16).padStart(2, "0"));
        bgrad.addColorStop(1, col + Math.round(hpRatio * 0.55 * 255).toString(16).padStart(2, "0"));
        ctx.fillStyle = bgrad;
        ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.75;
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (b.shape === "hex") {
        const cx2 = b.x + b.w / 2, cy2 = b.y + b.h / 2;
        const rx = b.w / 2 - 1, ry = b.h / 2 - 1;
        ctx.beginPath();
        for (let s = 0; s < 6; s++) {
          const a = (Math.PI / 3) * s - Math.PI / 6;
          const px2 = cx2 + rx * Math.cos(a), py2 = cy2 + ry * Math.sin(a);
          s === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
        }
        ctx.closePath();
        const bgrad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
        bgrad.addColorStop(0, col + Math.round(hpRatio * 0.9 * 255).toString(16).padStart(2, "0"));
        bgrad.addColorStop(1, col + Math.round(hpRatio * 0.5 * 255).toString(16).padStart(2, "0"));
        ctx.fillStyle = bgrad;
        ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.75;
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (b.shape === "diamond") {
        const cx2 = b.x + b.w / 2, cy2 = b.y + b.h / 2;
        ctx.beginPath();
        ctx.moveTo(cx2, b.y);
        ctx.lineTo(b.x + b.w, cy2);
        ctx.lineTo(cx2, b.y + b.h);
        ctx.lineTo(b.x, cy2);
        ctx.closePath();
        const bgrad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
        bgrad.addColorStop(0, col + Math.round(hpRatio * 0.9 * 255).toString(16).padStart(2, "0"));
        bgrad.addColorStop(1, col + Math.round(hpRatio * 0.5 * 255).toString(16).padStart(2, "0"));
        ctx.fillStyle = bgrad;
        ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.75;
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        // Default rect
        const bgrad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
        bgrad.addColorStop(0, col + Math.round(hpRatio * 0.88 * 255).toString(16).padStart(2, "0"));
        bgrad.addColorStop(1, col + Math.round(hpRatio * 0.60 * 255).toString(16).padStart(2, "0"));
        ctx.fillStyle = bgrad;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.fillRect(b.x, b.y, b.w, Math.max(2, b.h * 0.2));
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.72;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.globalAlpha = 1;
      }

      // HP dots for multi-hp blocks
      if (b.maxHp >= 2) {
        const dotR = 2.5, spacing = 7;
        const totalW = b.maxHp * dotR * 2 + (b.maxHp - 1) * (spacing - dotR * 2);
        const dotStartX = b.x + b.w / 2 - totalW / 2 + dotR;
        const dotY = b.y + b.h / 2;
        for (let i = 0; i < b.maxHp; i++) {
          ctx.fillStyle = i < b.hp ? col : "rgba(255,255,255,0.12)";
          ctx.beginPath();
          ctx.arc(dotStartX + i * spacing, dotY, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    });
  }

  private _drawPaddle(ctx: CanvasRenderingContext2D, t: number) {
    const py = this.H - (this.W < 500 ? 50 : 60);
    const px = this.px, pw = this.pw, ph = this.ph;
    ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 14 + 4 * Math.sin(t * 3);
    const pgrad = ctx.createLinearGradient(px - pw / 2, 0, px + pw / 2, 0);
    pgrad.addColorStop(0, "#0e7490"); pgrad.addColorStop(0.5, "#22d3ee"); pgrad.addColorStop(1, "#0e7490");
    ctx.fillStyle = pgrad;
    ctx.fillRect(px - pw / 2, py - ph / 2, pw, ph);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(px - pw / 2, py - ph / 2, pw, Math.max(2, ph * 0.3));
    ctx.strokeStyle = "#67e8f9"; ctx.lineWidth = 1.5;
    ctx.strokeRect(px - pw / 2, py - ph / 2, pw, ph);
    if (this.expandTimer > 0) {
      const pct = Math.min(1, this.expandTimer / 8);
      ctx.fillStyle = "#10b981";
      ctx.fillRect(px - pw / 2, py + ph / 2 + 3, pw * pct, 3);
    }
    if (this.slowTimer > 0) {
      const pct = Math.min(1, this.slowTimer / 7);
      ctx.fillStyle = "#a78bfa";
      ctx.fillRect(px - pw / 2, py + ph / 2 + 7, pw * pct, 3);
    }
  }

  private _drawBalls(ctx: CanvasRenderingContext2D, t: number) {
    const ballR = Math.max(5, this.W * 0.012);
    this.balls.forEach((ball, idx) => {
      const col = idx === 0 ? (this.slowTimer > 0 ? "#a78bfa" : "#fbbf24") : "#f97316";
      const pulse = 1 + 0.08 * Math.sin(t * 18 + idx);
      ctx.shadowColor = col; ctx.shadowBlur = 16 * pulse;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ballR * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath(); ctx.arc(ball.x - ballR * 0.3, ball.y - ballR * 0.3, ballR * 0.32, 0, Math.PI * 2); ctx.fill();
      if (!this.launched && idx === 0) {
        const bounce = 4 * Math.sin(t * 5);
        ctx.strokeStyle = col + "88"; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y - ballR - 4 + bounce);
        ctx.lineTo(ball.x - 5, ball.y - ballR - 11 + bounce);
        ctx.moveTo(ball.x, ball.y - ballR - 4 + bounce);
        ctx.lineTo(ball.x + 5, ball.y - ballR - 11 + bounce);
        ctx.stroke();
      }
    });
  }
}

// ── React Page ────────────────────────────────────────────────────────────────
export default function BlockBreakerPage() {
  const { user } = useAuthStore();

  const [status, setStatus] = useState<GameStatus>("idle");
  const [stats, setStats] = useState<GameStats>({ level: 1, score: 0, lives: 3, blocksLeft: 0, blocksDestroyed: 0, timeElapsed: 0 });
  const [finalStats, setFinalStats] = useState<{ score: number; level: number; xpEarned: number; blocksDestroyed: number } | null>(null);
  const [lb, setLb] = useState<LBEntry[]>([]);
  const [lbLoad, setLbLoad] = useState(true);
  const [hist, setHist] = useState<HistRecord[]>([]);
  const [histLoad, setHistLoad] = useState(true);
  const [muted, setMuted] = useState(false);
  const [sessionScore, setSessionScore] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [levelAnnounce, setLevelAnnounce] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BlockBreakerEngine | null>(null);
  const statusRef = useRef<GameStatus>("idle");
  const mutedRef = useRef(false);
  const statsRef = useRef(stats);
  const sessionIdRef = useRef<string | null>(null);
  const endGameRef = useRef<((v: boolean) => void) | null>(null);
  const rafRef = useRef(0);
  const prevLevelRef = useRef(1);
  const kLeftRef = useRef(false);
  const kRightRef = useRef(false);

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { statsRef.current = stats; }, [stats]);

  // Level announcements
  useEffect(() => {
    if (stats.level !== prevLevelRef.current && stats.level > 1 && status === "playing") {
      prevLevelRef.current = stats.level;
      setLevelAnnounce(stats.level);
      setTimeout(() => setLevelAnnounce(null), 2500);
    }
  }, [stats.level, status]);

  // Data fetching
  const fetchData = useCallback(() => {
    setLbLoad(true); setHistLoad(true);
    fetch("/api/leaderboard?gameType=BLOCK_BREAKER").then(r => r.json()).then(d => {
      if (d.success) setLb(d.data.slice(0, 8));
    }).catch(console.error).finally(() => setLbLoad(false));
    if (user) {
      fetch("/api/games/block-breaker/history").then(r => r.json()).then(d => {
        if (d.success) setHist(d.data);
      }).catch(console.error).finally(() => setHistLoad(false));
    } else setHistLoad(false);
  }, [user]);
  useEffect(() => { fetchData(); }, [fetchData]);

  // Resize canvas
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current, wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const isFull = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
    const W = isFull ? window.innerWidth : wrapper.clientWidth;
    const H = isFull ? window.innerHeight : wrapper.clientHeight;
    if (W < 10 || H < 10) return;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W; canvas.height = H;
    }
    const eng = engineRef.current;
    if (eng) {
      eng.W = W; eng.H = H;
      eng.stars = Array.from({ length: 120 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: 0.4 + Math.random() * 1.6, bright: 0.12 + Math.random() * 0.88,
      }));
    }
  }, []);

  // Init engine + draw loop
  useEffect(() => {
    const canvas = canvasRef.current, wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const eng = new BlockBreakerEngine();
    engineRef.current = eng;

    const W = wrapper.clientWidth || 400;
    const H = wrapper.clientHeight || 300;
    canvas.width = W; canvas.height = H;

    eng.onStats = s => setStats(prev => ({ ...prev, ...s }));
    eng.onGameOver = () => endGameRef.current?.(false);
    eng.onVictory = () => endGameRef.current?.(true);

    eng.init(W, H, () => statusRef.current, () => mutedRef.current);

    const loop = (now: number) => {
      eng.tick(now);
      if (kLeftRef.current && statusRef.current === "playing") eng.movePaddle(eng.px - 520 * 0.016);
      if (kRightRef.current && statusRef.current === "playing") eng.movePaddle(eng.px + 520 * 0.016);
      const ctx = canvas.getContext("2d");
      if (ctx) eng.draw(ctx, statusRef.current, now);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      eng.movePaddle((touch.clientX - rect.left) * scaleX);
    };
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      eng.movePaddle((touch.clientX - rect.left) * scaleX);
      if (statusRef.current === "playing" && !eng.launched) eng.launch();
    };
    const onMouseMove = (e: MouseEvent) => {
      if (statusRef.current !== "playing") return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      eng.movePaddle((e.clientX - rect.left) * scaleX);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (statusRef.current !== "playing") return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      eng.movePaddle((e.clientX - rect.left) * scaleX);
      if (!eng.launched) eng.launch();
    };
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
    };
  }, []);

  useEffect(() => {
    const ro = new ResizeObserver(resizeCanvas);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [resizeCanvas]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        const el = wrapperRef.current ?? document.documentElement;
        await (el.requestFullscreen ?? (el as any).webkitRequestFullscreen)?.call(el, { navigationUI: "hide" });
      } else {
        await document.exitFullscreen?.();
      }
    } catch {}
  }, []);

  useEffect(() => {
    const onChange = () => {
      const full = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(full);
      setTimeout(resizeCanvas, 50);
      setTimeout(resizeCanvas, 200);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    window.addEventListener("resize", resizeCanvas);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [resizeCanvas]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === "Escape" && document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
      if (e.code === "KeyF") { e.preventDefault(); toggleFullscreen(); return; }
      if (e.code === "KeyP" && (statusRef.current === "playing" || statusRef.current === "paused")) {
        e.preventDefault(); togglePause(); return;
      }
      if (e.code === "ArrowLeft" || e.code === "KeyA") kLeftRef.current = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") kRightRef.current = true;
      if (e.code === "Space" && statusRef.current === "playing") {
        e.preventDefault();
        if (!engineRef.current?.launched) engineRef.current?.launch();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") kLeftRef.current = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") kRightRef.current = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, [toggleFullscreen]);

  // End game
  const endGame = useCallback(async (victory: boolean) => {
    const s = statsRef.current;
    const xp = Math.min(Math.floor(s.timeElapsed / 4) + s.blocksDestroyed * 3 + (victory ? 200 : 0), 2500);
    const newStatus = victory ? "victory" : "gameover";
    setStatus(newStatus); statusRef.current = newStatus;
    if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch {} }
    setFinalStats({ score: s.score, level: s.level, xpEarned: xp, blocksDestroyed: s.blocksDestroyed });
    setSessionScore(prev => prev + xp);
    if (user && sessionIdRef.current) {
      setSaving(true);
      try {
        const res = await fetch("/api/games/block-breaker/finish", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current, level: s.level, score: s.score, blocksDestroyed: s.blocksDestroyed, duration: s.timeElapsed }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.xpEarned !== undefined) {
            setFinalStats(prev => prev ? { ...prev, xpEarned: data.xpEarned } : prev);
            setSessionScore(prev => prev - xp + data.xpEarned);
          }
          fetchData();
        }
      } catch (e) { console.error(e); }
      finally { setSaving(false); }
    }
  }, [user, fetchData]);
  useEffect(() => { endGameRef.current = endGame; }, [endGame]);

  const startGame = useCallback(async () => {
    getAudio();
    prevLevelRef.current = 1;
    setStats({ level: 1, score: 0, lives: 3, blocksLeft: 0, blocksDestroyed: 0, timeElapsed: 0 });
    setFinalStats(null); setLevelAnnounce(null);
    const eng = engineRef.current;
    if (eng) { eng.resetGame(); eng.px = eng.W / 2; }
    sessionIdRef.current = null;
    if (user) {
      try {
        const r = await fetch("/api/games/block-breaker/start", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paddleSize: "NORMAL", extraBalls: 0, hasGun: false }),
        });
        if (r.ok) { const d = await r.json(); sessionIdRef.current = d.sessionId; }
      } catch {}
    }
    setStatus("playing"); statusRef.current = "playing";
  }, [user]);

  const togglePause = useCallback(() => {
    setStatus(prev => {
      const next = prev === "playing" ? "paused" : "playing";
      statusRef.current = next;
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    engineRef.current?.resetGame();
    setStatus("idle"); statusRef.current = "idle";
    setStats({ level: 1, score: 0, lives: 3, blocksLeft: 0, blocksDestroyed: 0, timeElapsed: 0 });
    setFinalStats(null); prevLevelRef.current = 1;
  }, []);

  const isIdle = status === "idle";
  const isPlaying = status === "playing";
  const isPaused = status === "paused";
  const isOver = status === "gameover";
  const isVictory = status === "victory";
  const isDone = isOver || isVictory;
  const hpColor = stats.lives >= 3 ? "#22d3ee" : stats.lives === 2 ? "#f59e0b" : "#ef4444";
  const lvlColor = ["#94a3b8","#22d3ee","#10b981","#f59e0b","#ef4444","#a78bfa","#f97316","#f97316","#ef4444","#fbbf24"][Math.min(stats.level - 1, 9)];
  const fc = isOver ? "#ef4444" : isVictory ? "#10b981" : isPaused ? "#f59e0b" : isPlaying ? "#22d3ee" : "#334155";

  const puInfo = [
    { col: "#10b981", label: "WIDE", desc: "Bigger paddle" },
    { col: "#a78bfa", label: "SLOW", desc: "Ball slows" },
    { col: "#ef4444", label: "LIFE", desc: "+1 life" },
    { col: "#f59e0b", label: "MULTI", desc: "3 balls" },
  ];

  return (
    <div style={{ width: "100%", minHeight: "100vh", paddingBottom: 60 }}>

      {/* Flash overlay */}
      <AnimatePresence>
        {isDone && (
          <motion.div key="flash" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.45, 0, 0.18, 0] }} exit={{ opacity: 0 }}
            transition={{ duration: 1, times: [0, 0.2, 0.5, 0.8, 1] }}
            style={{ position: "fixed", inset: 0, zIndex: 10, pointerEvents: "none", background: `radial-gradient(ellipse at center,${isVictory ? "rgba(16,185,129,0.55)" : "rgba(239,68,68,0.55)"} 0%,transparent 70%)` }} />
        )}
      </AnimatePresence>

      {/* Level announce */}
      <AnimatePresence>
        {levelAnnounce && (
          <motion.div key={`lv${levelAnnounce}`}
            initial={{ opacity: 0, y: -40, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ position: "fixed", top: 18, left: "50%", transform: "translateX(-50%)", zIndex: 50, pointerEvents: "none", padding: "10px 28px", borderRadius: 12, background: "rgba(4,8,24,0.95)", border: `1px solid ${levelAnnounce === 10 ? "#f59e0b" : "#22d3ee"}88`, boxShadow: `0 0 24px ${levelAnnounce === 10 ? "#f59e0b" : "#22d3ee"}33` }}>
            {levelAnnounce === 10 && <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.3em", textAlign: "center", marginBottom: 3 }}>FINAL STAGE</div>}
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 14, fontWeight: 900, color: levelAnnounce === 10 ? "#f59e0b" : "#22d3ee", letterSpacing: "0.2em", textAlign: "center" }}>LEVEL {levelAnnounce}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <Link href="/games" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", marginBottom: 10, opacity: 0.65 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")} onMouseLeave={e => (e.currentTarget.style.opacity = "0.65")}>
          <ArrowLeft style={{ width: 12, height: 12, color: "#22d3ee" }} />
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: "#22d3ee", letterSpacing: "0.3em" }}>BACK TO ARCADE</span>
        </Link>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(22px,5vw,44px)", fontWeight: 900, color: "#f8fafc", textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", lineHeight: 1, margin: 0 }}>
              BLOCK <span style={{ color: "#22d3ee", textShadow: "0 0 20px rgba(34,211,238,0.5)" }}>BREAKER</span>
            </h1>
            <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 9, fontWeight: 600, color: "#334155", letterSpacing: "0.25em", textTransform: "uppercase", marginTop: 4 }}>BREAK · SURVIVE · 10 LEVELS</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setMuted(m => !m)} style={{ padding: "5px 11px", borderRadius: 7, background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.08)", color: muted ? "#475569" : "#22d3ee", cursor: "pointer", fontSize: 13 }}>
              {muted ? "🔇" : "🔊"}
            </button>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: "#334155", letterSpacing: "0.2em", marginBottom: 2 }}>SESSION XP</div>
              <motion.div key={sessionScore} initial={{ scale: 1.25 }} animate={{ scale: 1 }}
                style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(18px,4vw,26px)", fontWeight: 900, color: "#22d3ee", filter: "drop-shadow(0 0 8px rgba(34,211,238,0.4))" }}>
                {sessionScore.toLocaleString()}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 8 }}>
        {[
          { label: "SCORE", val: stats.score.toLocaleString(), col: "#22d3ee" },
          { label: "LEVEL", val: `${stats.level}/10`, col: lvlColor },
          { label: "BREAKS", val: stats.blocksDestroyed, col: "#f97316" },
          { label: "TIME", val: (isPlaying || isPaused || isDone) ? fmt(stats.timeElapsed) : "--:--", col: "#f59e0b" },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "8px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, fontWeight: 700, color: "#334155", letterSpacing: "0.2em" }}>{s.label}</span>
            <motion.span key={String(s.val)} initial={{ scale: 1.18, y: -2 }} animate={{ scale: 1, y: 0 }}
              style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(11px,3vw,19px)", fontWeight: 900, color: s.col, filter: `drop-shadow(0 0 5px ${s.col}80)`, lineHeight: 1 }}>
              {s.val}
            </motion.span>
          </div>
        ))}
      </div>

      {/* Lives + progress */}
      <AnimatePresence>
        {(isPlaying || isPaused || isDone) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ marginBottom: 8, maxWidth: 680, margin: "0 auto 8px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 9, padding: "7px 10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, fontWeight: 700, color: "#334155", letterSpacing: "0.2em" }}>LIVES</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: i < stats.lives ? hpColor : "rgba(255,255,255,0.06)", boxShadow: i < stats.lives ? `0 0 6px ${hpColor}` : "none", transition: "all 0.3s" }} />
                    ))}
                  </div>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                  <motion.div animate={{ width: `${(stats.lives / 3) * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    style={{ height: "100%", background: hpColor, borderRadius: 2, boxShadow: `0 0 8px ${hpColor}80` }} />
                </div>
              </div>
              <div style={{ background: "rgba(15,23,42,0.8)", border: `1px solid ${lvlColor}28`, borderRadius: 9, padding: "7px 10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, fontWeight: 700, color: "#334155", letterSpacing: "0.2em" }}>PROGRESS</span>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 900, color: lvlColor }}>{stats.blocksLeft} left</span>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < stats.level - 1 ? "#22d3ee" : i === stats.level - 1 ? lvlColor : "rgba(255,255,255,0.06)", boxShadow: i === stats.level - 1 ? `0 0 5px ${lvlColor}` : "none", transition: "all 0.4s" }} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game + side panels */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 680, margin: "0 auto" }}>

        {/* Status banner */}
        <motion.div key={status} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: isDone ? (isVictory ? "rgba(4,24,8,0.95)" : "rgba(20,4,4,0.95)") : "rgba(15,23,42,0.85)", backdropFilter: "blur(16px)", border: `1px solid ${isOver ? "rgba(239,68,68,0.4)" : isVictory ? "rgba(16,185,129,0.4)" : isPaused ? "rgba(245,158,11,0.4)" : isPlaying ? "rgba(34,211,238,0.18)" : "rgba(34,211,238,0.1)"}`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: fc, boxShadow: `0 0 8px ${fc}`, animation: isPlaying ? "bbPulse 1.5s infinite" : "none" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: fc }}>
              {isOver ? "GAME OVER" : isVictory ? "🏆 ALL 10 LEVELS CLEARED!" : isPaused ? "⏸ PAUSED" : isPlaying ? `LEVEL ${stats.level} — ${stats.blocksLeft} BLOCKS LEFT` : "READY TO PLAY"}
            </div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 10, color: "#475569", fontWeight: 600, marginTop: 1 }}>
              {isOver ? `Score ${finalStats?.score?.toLocaleString() ?? 0} · Level ${finalStats?.level ?? stats.level}${saving ? " · saving…" : ""}` :
                isVictory ? `Score ${finalStats?.score?.toLocaleString() ?? 0} · +${finalStats?.xpEarned ?? 0} XP earned` :
                  isPaused ? "P = resume · F = fullscreen · click to resume" :
                    isPlaying ? "Mouse/touch to move · Click/Space to launch · P = pause" :
                      "Click LAUNCH · mouse/touch moves paddle · SPACE launches ball"}
            </div>
          </div>
          {(isPlaying || isPaused) && (
            <button onClick={togglePause} style={{ flexShrink: 0, padding: "5px 12px", borderRadius: 7, background: isPaused ? "rgba(245,158,11,0.15)" : "rgba(34,211,238,0.08)", border: `1px solid ${isPaused ? "rgba(245,158,11,0.5)" : "rgba(34,211,238,0.25)"}`, color: isPaused ? "#f59e0b" : "#22d3ee", fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              {isPaused ? <><Play style={{ width: 9, height: 9 }} /> RESUME</> : <><Pause style={{ width: 9, height: 9 }} /> PAUSE</>}
            </button>
          )}
        </motion.div>

        {/* Canvas wrapper */}
        <div ref={wrapperRef} data-canvas-wrapper="1" style={{
          position: "relative", borderRadius: 16, overflow: "hidden", background: "#020817",
          aspectRatio: "4/3",
          boxShadow: isPlaying ? `0 0 0 2px ${fc}44,0 0 40px ${fc}18` : `0 0 0 1px rgba(34,211,238,0.08),0 6px 32px rgba(0,0,0,0.8)`,
          transition: "box-shadow 0.4s",
        }}>
          <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%", cursor: "crosshair" }} />

          {/* Corner frame */}
          {(() => {
            const cL = 32, cT = 3;
            return (
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }}>
                {([
                  { top: 0, left: 0, borderTop: `${cT}px solid ${fc}`, borderLeft: `${cT}px solid ${fc}` },
                  { top: 0, right: 0, borderTop: `${cT}px solid ${fc}`, borderRight: `${cT}px solid ${fc}` },
                  { bottom: 0, left: 0, borderBottom: `${cT}px solid ${fc}`, borderLeft: `${cT}px solid ${fc}` },
                  { bottom: 0, right: 0, borderBottom: `${cT}px solid ${fc}`, borderRight: `${cT}px solid ${fc}` },
                ] as any[]).map((s, i) => (
                  <div key={i} style={{ position: "absolute", width: cL, height: cL, opacity: 0.8, ...s }} />
                ))}
                <div style={{ position: "absolute", top: 5, left: cL + 6, fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: "0.2em", color: fc, opacity: 0.8 }}>
                  {isOver ? "GAME OVER" : isVictory ? "VICTORY" : isPaused ? "PAUSED" : isPlaying ? "ACTIVE" : "STANDBY"}
                </div>
                <div style={{ position: "absolute", bottom: 5, right: cL + 6, fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: "0.15em", color: fc, opacity: 0.6, textAlign: "right" }}>
                  {isPlaying || isPaused ? `LV${String(stats.level).padStart(2, "0")} · ${stats.blocksDestroyed} BRK` : "SYS::READY"}
                </div>
                {isPlaying && (
                  <motion.div
                    animate={{ top: ["2%", "98%", "2%"] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                    style={{ position: "absolute", left: cT, right: cT, height: 2, background: `linear-gradient(90deg,transparent,${fc}55,${fc}aa,${fc}55,transparent)`, boxShadow: `0 0 10px ${fc}66`, pointerEvents: "none" }}
                  />
                )}
              </div>
            );
          })()}

          {/* Fullscreen + Pause buttons */}
          <button onClick={toggleFullscreen} style={{ position: "absolute", top: 10, right: 10, zIndex: 20, background: "rgba(15,23,42,0.85)", border: "1px solid rgba(34,211,238,0.3)", borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: "#22d3ee", backdropFilter: "blur(8px)" }}>
            {isFullscreen ? <Minimize style={{ width: 13, height: 13 }} /> : <Maximize style={{ width: 13, height: 13 }} />}
          </button>
          {(isPlaying || isPaused) && (
            <button onClick={togglePause} style={{ position: "absolute", top: 10, left: 10, zIndex: 20, background: isPaused ? "rgba(245,158,11,0.2)" : "rgba(15,23,42,0.85)", border: `1px solid ${isPaused ? "rgba(245,158,11,0.5)" : "rgba(34,211,238,0.25)"}`, borderRadius: 7, padding: "5px 9px", cursor: "pointer", color: isPaused ? "#f59e0b" : "#22d3ee", display: "flex", alignItems: "center", gap: 3, backdropFilter: "blur(8px)" }}>
              {isPaused ? <Play style={{ width: 11, height: 11 }} /> : <Pause style={{ width: 11, height: 11 }} />}
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, fontWeight: 700 }}>{isPaused ? "RESUME" : "PAUSE"}</span>
            </button>
          )}

          {/* ── Idle overlay ── */}
          <AnimatePresence>
            {isIdle && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, zIndex: 5 }}>
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} style={{ fontSize: "clamp(28px,7vw,46px)" }}>🧱</motion.div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(14px,4vw,20px)", fontWeight: 900, color: "#f8fafc", textShadow: "0 0 20px rgba(34,211,238,0.6)" }}>BLOCK BREAKER</p>
                  <p style={{ margin: "4px 0 0", fontFamily: "'Rajdhani',sans-serif", fontSize: "clamp(9px,2.2vw,11px)", color: "#475569", letterSpacing: "0.18em" }}>10 LEVELS · 4 POWER-UPS · SURVIVE ALL</p>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 5 }}>
                  {[["MOUSE/TOUCH","MOVE","#22d3ee"],["CLICK/SPACE","LAUNCH","#f97316"],["P","PAUSE","#f59e0b"],["F","FULLSCREEN","#a78bfa"]].map(([k, v, c]) => (
                    <div key={k} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <div style={{ padding: "2px 6px", borderRadius: 4, background: `${c}12`, border: `1px solid ${c}30`, fontFamily: "'Orbitron',sans-serif", fontSize: 6, color: c }}>{k}</div>
                      <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 9, color: "#475569" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Paused overlay ── */}
          <AnimatePresence>
            {isPaused && (
              <motion.div key="paused" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, pointerEvents: "none", zIndex: 5 }}>
                <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} style={{ fontSize: "clamp(34px,10vw,60px)" }}>⏸</motion.div>
                <p style={{ margin: 0, fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(15px,4.5vw,24px)", fontWeight: 900, color: "#f59e0b" }}>PAUSED</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Game Over overlay ── */}
          <AnimatePresence>
            {isOver && (
              <motion.div key="over" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, pointerEvents: "none", zIndex: 5 }}>
                <motion.div
                  initial={{ scale: 0.3, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 8 }}
                  style={{ fontSize: "clamp(26px,8vw,48px)" }}>💥</motion.div>
                <p style={{ margin: 0, fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(13px,4vw,20px)", fontWeight: 900, color: "#ef4444" }}>GAME OVER</p>
                {finalStats && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} style={{ display: "flex", gap: 18 }}>
                    {[["SCORE", finalStats.score.toLocaleString(), "#22d3ee"], ["LVL", finalStats.level, "#a78bfa"], ["XP", `+${finalStats.xpEarned}`, "#f59e0b"]].map(([l, v, c]) => (
                      <div key={String(l)} style={{ textAlign: "center" }}>
                        <p style={{ margin: 0, fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: "#475569" }}>{l}</p>
                        <p style={{ margin: "3px 0 0", fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(13px,3.5vw,18px)", fontWeight: 900, color: String(c) }}>{v}</p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Victory overlay ── */}
          <AnimatePresence>
            {isVictory && (
              <motion.div key="win" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, pointerEvents: "none", zIndex: 5 }}>
                <motion.div
                  initial={{ scale: 0.3 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 8 }}
                  style={{ fontSize: "clamp(26px,8vw,48px)" }}>🏆</motion.div>
                <p style={{ margin: 0, fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(13px,4vw,20px)", fontWeight: 900, color: "#10b981" }}>VICTORY!</p>
                {finalStats && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} style={{ display: "flex", gap: 18 }}>
                    {[["SCORE", finalStats.score.toLocaleString(), "#22d3ee"], ["BREAKS", finalStats.blocksDestroyed, "#f97316"], ["XP", `+${finalStats.xpEarned}`, "#f59e0b"]].map(([l, v, c]) => (
                      <div key={String(l)} style={{ textAlign: "center" }}>
                        <p style={{ margin: 0, fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: "#475569" }}>{l}</p>
                        <p style={{ margin: "3px 0 0", fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(13px,3.5vw,18px)", fontWeight: 900, color: String(c) }}>{v}</p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* XP Card */}
        <AnimatePresence>
          {isDone && finalStats && (
            <motion.div key="xp" initial={{ opacity: 0, scale: 0.9, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", damping: 14 }}
              style={{ background: "rgba(4,8,24,0.96)", backdropFilter: "blur(16px)", border: `2px solid ${isVictory ? "rgba(16,185,129,0.35)" : "rgba(249,115,22,0.35)"}`, borderRadius: 16, padding: "16px 14px", boxShadow: `0 0 32px ${isVictory ? "rgba(16,185,129,0.1)" : "rgba(249,115,22,0.1)"}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Zap style={{ width: 26, height: 26, color: "#f59e0b", filter: "drop-shadow(0 0 8px rgba(245,158,11,0.6))", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(10px,2.8vw,14px)", fontWeight: 900, color: isVictory ? "#10b981" : "#f97316" }}>{isVictory ? "ALL LEVELS CLEARED!" : "MISSION ENDED"}</div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 10, color: "#22d3ee", fontWeight: 600, marginTop: 1 }}>Level {finalStats.level} · {finalStats.blocksDestroyed} blocks · {fmt(stats.timeElapsed)}</div>
                  </div>
                </div>
                <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 9, delay: 0.2 }} style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: "#334155", letterSpacing: "0.2em", marginBottom: 2 }}>TOTAL XP</div>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(24px,6vw,40px)", fontWeight: 900, color: "#f59e0b", filter: "drop-shadow(0 0 14px rgba(245,158,11,0.6))", lineHeight: 1 }}>+{finalStats.xpEarned}</div>
                </motion.div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 12 }}>
                {[["SCORE", finalStats.score.toLocaleString(), "#22d3ee"], ["LEVEL", finalStats.level, "#a78bfa"], ["BREAKS", finalStats.blocksDestroyed, "#f97316"], ["TIME", fmt(stats.timeElapsed), "#f59e0b"]].map(([l, v, c]) => (
                  <div key={String(l)} style={{ padding: "7px 5px", borderRadius: 8, background: `${c}10`, border: `1px solid ${c}28`, textAlign: "center" }}>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, color: "#475569", letterSpacing: "0.12em", marginBottom: 2 }}>{l}</div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: String(c) }}>{v}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        {isIdle && (
          <motion.button onClick={startGame} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
            style={{ width: "100%", padding: "clamp(12px,2.8vw,16px)", borderRadius: 13, background: "linear-gradient(135deg,rgba(34,211,238,0.85),rgba(99,102,241,0.7))", border: "none", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(11px,2.8vw,14px)", fontWeight: 900, letterSpacing: "0.15em", color: "#020617", boxShadow: "0 0 28px rgba(34,211,238,0.28)", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, position: "relative", overflow: "hidden" }}>
            <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 0.8, ease: "linear" }}
              style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)", pointerEvents: "none" }} />
            <Target style={{ width: 16, height: 16 }} /> LAUNCH GAME
          </motion.button>
        )}
        {isDone && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            <motion.button onClick={startGame} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
              style={{ padding: 13, borderRadius: 13, background: "linear-gradient(135deg,rgba(34,211,238,0.85),rgba(99,102,241,0.7))", border: "none", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: "#020617", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <RefreshCw style={{ width: 12, height: 12 }} /> RETRY
            </motion.button>
            <motion.button onClick={reset} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              style={{ padding: 13, borderRadius: 13, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center" }}>
              MAIN MENU
            </motion.button>
          </div>
        )}

        {/* Power-up legend */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5 }}>
          {puInfo.map(p => (
            <div key={p.label} style={{ padding: "7px 5px", borderRadius: 9, background: `${p.col}0f`, border: `1px solid ${p.col}28`, textAlign: "center" }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: p.col, margin: "0 auto 4px", boxShadow: `0 0 7px ${p.col}` }} />
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 900, color: p.col, letterSpacing: "0.08em" }}>{p.label}</div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 8, color: "#475569", marginTop: 1 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── LEADERBOARD — full width ── */}
      <div style={{ marginTop: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 22, height: 2, background: "linear-gradient(90deg,#f59e0b,#ef4444)", borderRadius: 1 }} />
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.3em", textTransform: "uppercase" }}>TOP BREAKERS</span>
        </div>
        <div style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          {/* Header */}
          <div className="bb-lb-head" style={{ display: "grid", gridTemplateColumns: "44px 1fr 110px 80px", gap: 10, padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            {["RANK", "PLAYER", "BEST SCORE", "LEVEL"].map(h => (
              <span key={h} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#475569", letterSpacing: "0.25em" }}>{h}</span>
            ))}
          </div>
          {lbLoad ? (
            <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              {[...Array(5)].map((_, i) => <div key={i} style={{ height: 36, borderRadius: 8, background: "rgba(255,255,255,0.03)", animation: "bbSkel 1.5s infinite", animationDelay: `${i * 0.1}s` }} />)}
            </div>
          ) : lb.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 0" }}>
              <Grid3X3 style={{ width: 22, height: 22, color: "#334155", margin: "0 auto 10px" }} />
              <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#475569", letterSpacing: "0.15em" }}>NO BREAKERS YET — BE FIRST!</p>
            </div>
          ) : lb.map((e, i) => {
            const top3 = i < 3;
            const rankColor = i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "#475569";
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.035 }}
                className="bb-lb-head"
                style={{ display: "grid", gridTemplateColumns: "44px 1fr 110px 80px", gap: 10, padding: "11px 18px", borderBottom: i < lb.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center", background: top3 ? `rgba(${i === 0 ? "245,158,11" : i === 1 ? "148,163,184" : "180,83,9"},0.04)` : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>{rankIcon(i)}</div>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: top3 ? "#f8fafc" : "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.user.username}</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: top3 ? rankColor : "#22d3ee" }}>{(e.highScore ?? 0).toLocaleString()}</span>
                </div>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, color: "#a78bfa" }}>{e.level ?? "—"}</span>
              </motion.div>
            );
          })}
          {/* Current user row */}
          {user && (
            <div className="bb-lb-head" style={{ display: "grid", gridTemplateColumns: "44px 1fr 110px 80px", gap: 10, padding: "10px 18px", borderTop: "1px solid rgba(255,255,255,0.04)", alignItems: "center", background: "rgba(99,102,241,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#22d3ee)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 900, color: "#fff" }}>{user.username[0].toUpperCase()}</span>
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, color: "#6366f1", letterSpacing: "0.15em", marginBottom: 1 }}>YOU</div>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.username}</div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: "#f59e0b" }}>{finalStats ? finalStats.score.toLocaleString() : "—"}</span>
              </div>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, color: "#a78bfa" }}>{finalStats ? finalStats.level : "—"}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── GAME HISTORY — full width ── */}
      <AnimatePresence>
        {hist.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 36 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 22, height: 2, background: "linear-gradient(90deg,#22d3ee,#6366f1)", borderRadius: 1 }} />
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#22d3ee", letterSpacing: "0.3em", textTransform: "uppercase" }}>GAME HISTORY</span>
            </div>
            <div style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
              <div className="bb-hist-head" style={{ display: "grid", gridTemplateColumns: "1fr 70px 80px 70px 70px", gap: 10, padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {["SCORE", "LEVEL", "BREAKS", "TIME", "XP"].map(h => (
                  <span key={h} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#475569", letterSpacing: "0.25em" }}>{h}</span>
                ))}
              </div>
              {hist.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="bb-hist-head bb-hist-row"
                  style={{ display: "grid", gridTemplateColumns: "1fr 70px 80px 70px 70px", gap: 10, padding: "11px 18px", borderBottom: i < hist.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: "#22d3ee" }}>{r.score.toLocaleString()}</span>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: "#a78bfa" }}>{r.level}</span>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: "#f97316" }}>{r.blocksDestroyed}</span>
                  <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 600, color: "#64748b" }}>{fmt(r.duration)}</span>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 700, color: "#f59e0b" }}>+{r.xpEarned}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes bbPulse { 0%,100%{opacity:1;box-shadow:0 0 8px #22d3ee} 50%{opacity:0.3;box-shadow:0 0 2px #22d3ee} }
        @keyframes bbSkel  { 0%,100%{opacity:1} 50%{opacity:0.3} }

        @media (max-width:520px) {
          [data-canvas-wrapper='1'] { aspect-ratio: 3/4 !important; }
          .bb-lb-head   { grid-template-columns: 36px 1fr 100px !important; }
          .bb-lb-head > *:nth-child(4) { display: none !important; }
          .bb-hist-head { grid-template-columns: 1fr 60px 70px !important; }
          .bb-hist-row > *:nth-child(4),
          .bb-hist-row > *:nth-child(5) { display: none !important; }
        }
      `}</style>
    </div>
  );
}
