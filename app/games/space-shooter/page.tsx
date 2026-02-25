"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Crown, Medal, RefreshCw, Zap, Grid3X3, Rocket, Shield, Target, Maximize, Minimize, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";

type GameStatus = "idle" | "playing" | "paused" | "over";
interface LBEntry { user: { username: string }; highScore: number; totalXp: number }
interface HistRecord { id: string; score: number; wave: number; kills: number; survivalTime: number; date: Date }

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
function playBulletSfx(ctx: AudioContext | null) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = "square";
  o.frequency.setValueAtTime(1200, t);
  o.frequency.exponentialRampToValueAtTime(300, t + 0.06);
  g.gain.setValueAtTime(0.06, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  o.start(t); o.stop(t + 0.08);
}
function playMissileSfx(ctx: AudioContext | null) {
  if (!ctx) return;
  const t = ctx.currentTime;
  [0, 0.05, 0.1].forEach((d, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sawtooth";
    o.frequency.setValueAtTime(140 - i * 25, t + d);
    o.frequency.exponentialRampToValueAtTime(35, t + d + 0.38);
    g.gain.setValueAtTime(0.14, t + d);
    g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.4);
    o.start(t + d); o.stop(t + d + 0.42);
  });
}
function playHitSfx(ctx: AudioContext | null) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = "sawtooth";
  o.frequency.setValueAtTime(260, t);
  o.frequency.exponentialRampToValueAtTime(55, t + 0.11);
  g.gain.setValueAtTime(0.10, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
  o.start(t); o.stop(t + 0.14);
}
function playExplosionSfx(ctx: AudioContext | null) {
  if (!ctx) return;
  const t = ctx.currentTime;
  [80, 130, 210, 360, 520].forEach((freq, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = i % 2 === 0 ? "sawtooth" : "square";
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.08, t + 0.42);
    g.gain.setValueAtTime(0.09 - i * 0.013, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.46);
    o.start(t); o.stop(t + 0.5);
  });
}
function playDieSfx(ctx: AudioContext | null) {
  if (!ctx) return;
  const t = ctx.currentTime;
  [0, 0.09, 0.2, 0.33].forEach((d, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sawtooth";
    o.frequency.setValueAtTime(420 - i * 75, t + d);
    o.frequency.exponentialRampToValueAtTime(28, t + d + 0.52);
    g.gain.setValueAtTime(0.17, t + d);
    g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.56);
    o.start(t + d); o.stop(t + d + 0.6);
  });
}

// ─── Phaser Scene ─────────────────────────────────────────────────────────────
function buildScene(cb: {
  onScore: (n: number) => void;
  onKill: () => void;
  onWave: (n: number) => void;
  onTick: (t: number) => void;
  onMissileCd: (ready: boolean, pct: number) => void;
  onHpChange: (hp: number) => void;
  onShieldChange: (s: number) => void;
  onSizeChange: (lvl: number) => void;
  onBossWave: (wave: number) => void;
  getStatus: () => GameStatus;
  triggerDie: () => void;
  playBullet: () => void;
  playMissile: () => void;
  playHit: () => void;
  playExplosion: () => void;
}) {
  const len2 = (v: { x: number; y: number }) => Math.sqrt(v.x * v.x + v.y * v.y);
  const norm2 = (v: { x: number; y: number }) => { const l = len2(v) || 1; return { x: v.x / l, y: v.y / l }; };

  class SpaceScene {
    static key = "SpaceScene";

    playerX = 0; playerY = 0;
    playerHP = 100; playerShield = 0;
    shipLevel = 0; kills = 0;
    KILLS_FOR_LEVEL = [10, 30, 70];

    wave = 1; score = 0; elapsed = 0; timerTick = 0; waveTimer = 0;
    dead = false; _nextSpawn: number | undefined;

    missileCd = false; missileCdTimer = 0;
    MISSILE_COOL = 1500;

    fireCd = 0; FIRE_RATE = 175;

    bullets: any[] = []; missiles: any[] = []; enemies: any[] = [];
    particles: any[] = []; stars: any[] = []; powerups: any[] = [];
    nebulaOrbs: any[] = [];

    bgGfx!: any; shipGfx!: any; bulletGfx!: any;
    enemyGfx!: any; fxGfx!: any;

    pointerX = 0; pointerY = 0;
    touchStartX = 0; touchStartY = 0; touchStartTime = 0;
    lastTapTime = 0;
    shakeMag = 0;
    isTouching = false; // true while finger is down — suppresses mouse follow

    create(this: any) {
      const W = this.scale.width as number;
      const H = this.scale.height as number;

      this.bgGfx = this.add.graphics().setDepth(0);
      this.shipGfx = this.add.graphics().setDepth(3);
      this.bulletGfx = this.add.graphics().setDepth(4);
      this.enemyGfx = this.add.graphics().setDepth(3);
      this.fxGfx = this.add.graphics().setDepth(5);

      this.playerX = W / 2; this.playerY = H * 0.75;
      this.pointerX = W / 2; this.pointerY = H * 0.75;

      this.stars = Array.from({ length: 220 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        speed: 0.25 + Math.random() * 2.2,
        r: 0.4 + Math.random() * 1.8,
        brightness: 0.15 + Math.random() * 0.85,
        col: [0xffffff, 0x22d3ee, 0xa78bfa, 0xfbbf24, 0x93c5fd][Math.floor(Math.random() * 5)],
      }));

      this.nebulaOrbs = Array.from({ length: 7 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.12, vy: 0.2 + Math.random() * 0.4,
        r: 90 + Math.random() * 180,
        a: 0.018 + Math.random() * 0.035,
        col: [0x6366f1, 0x22d3ee, 0xa78bfa, 0x0f172a, 0x1e1b4b, 0x0c4a6e][Math.floor(Math.random() * 6)],
      }));

      this.input.on("pointermove", (p: any) => {
        if (cb.getStatus() !== "playing") return;
        // Ignore synthetic pointer events fired from touch — touch handled separately
        if (this.isTouching) return;
        this.pointerX = p.x; this.pointerY = p.y;
      });
      this.input.on("pointerdown", (p: any) => {
        if (cb.getStatus() !== "playing") return;
        if (p.rightButtonDown()) { this.launchMissile(); cb.playMissile(); }
        else { this.pointerX = p.x; this.pointerY = p.y; }
      });
      this.game.canvas.addEventListener("contextmenu", (e: Event) => e.preventDefault());

      this.game.canvas.addEventListener("touchstart", (e: TouchEvent) => {
        if (cb.getStatus() !== "playing") return;
        this.isTouching = true;
        const t = e.touches[0];
        const now = Date.now();

        // Detect double-tap for missile
        const isDoubleTap = (now - this.lastTapTime) < 320;
        this.lastTapTime = now;

        if (isDoubleTap) {
          // Fire missile — do NOT reset touchStart so swipe delta stays clean
          this.launchMissile(); cb.playMissile();
          // Also reset the reference point to current finger pos
          // so the NEXT touchmove doesn't snap ship to old position
          this.touchStartX = t.clientX;
          this.touchStartY = t.clientY;
        } else {
          // First tap: just set the drag reference, don't move ship yet
          this.touchStartX = t.clientX;
          this.touchStartY = t.clientY;
        }
        this.touchStartTime = now;
        e.preventDefault();
      }, { passive: false });

      this.game.canvas.addEventListener("touchend", () => {
        this.isTouching = false;
      });
      this.game.canvas.addEventListener("touchcancel", () => {
        this.isTouching = false;
      });

      this.game.canvas.addEventListener("touchmove", (e: TouchEvent) => {
        if (cb.getStatus() !== "playing") return;
        const touch = e.touches[0];
        const rect  = this.game.canvas.getBoundingClientRect();
        // Scale raw pixel delta to Phaser world units
        const scaleX = this.scale.width  / rect.width;
        const scaleY = this.scale.height / rect.height;
        const dx = (touch.clientX - this.touchStartX) * scaleX;
        const dy = (touch.clientY - this.touchStartY) * scaleY;
        // Always update reference — pure delta drag, ship never snaps
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        // Guard against a huge first delta caused by double-tap resetting start
        const maxStep = Math.min(this.scale.width, this.scale.height) * 0.25; // 25% of screen max per move
        const clampedDx = Math.max(-maxStep, Math.min(maxStep, dx));
        const clampedDy = Math.max(-maxStep, Math.min(maxStep, dy));
        this.playerX = Math.max(20, Math.min(this.scale.width  - 20, this.playerX + clampedDx));
        this.playerY = Math.max(20, Math.min(this.scale.height - 20, this.playerY + clampedDy));
        this.pointerX = this.playerX;
        this.pointerY = this.playerY;
        e.preventDefault();
      }, { passive: false });

      this.input.setDefaultCursor("crosshair");
    }

    update(this: any, _time: number, delta: number) {
      // ALWAYS read live dimensions from scale manager, never from config
      const W = this.scale.width as number;
      const H = this.scale.height as number;
      const status = cb.getStatus();

      this.bgGfx.clear(); this.shipGfx.clear(); this.bulletGfx.clear();
      this.enemyGfx.clear(); this.fxGfx.clear();

      this.shakeMag *= 0.80;
      const sx = this.shakeMag > 0.5 ? (Math.random() - 0.5) * this.shakeMag * 2 : 0;
      const sy = this.shakeMag > 0.5 ? (Math.random() - 0.5) * this.shakeMag * 2 : 0;

      // Background
      this.bgGfx.fillStyle(0x020817, 1);
      this.bgGfx.fillRect(0, 0, W, H);
      (this.nebulaOrbs as any[]).forEach(o => {
        o.x += o.vx; o.y += o.vy;
        if (o.y > H + o.r) { o.y = -o.r; o.x = Math.random() * W; }
        this.bgGfx.fillStyle(o.col, o.a);
        this.bgGfx.fillCircle(sx + o.x, sy + o.y, o.r);
      });
      (this.stars as any[]).forEach(s => {
        s.y += s.speed;
        if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
        const twinkle = s.brightness * (0.65 + 0.35 * Math.sin(Date.now() / 350 + s.x));
        this.bgGfx.fillStyle(s.col, twinkle);
        this.bgGfx.fillCircle(sx + s.x, sy + s.y, s.r);
      });

      // IDLE animated preview
      if (status === "idle") {
        const t = Date.now() / 1000;
        const cx = W / 2, cy = H / 2, pulse = 1 + 0.06 * Math.sin(t * 2.2);
        [3.2, 2.0, 1.2].forEach((m, i) => {
          this.fxGfx.fillStyle(0x6366f1, 0.07 - i * 0.018);
          this.fxGfx.fillCircle(cx, cy, 65 * m * pulse);
        });
        this.drawShip(this.fxGfx, cx, cy, 1 + 0.08 * Math.sin(t * 1.5), 0, 0x22d3ee, 1);
        for (let i = 0; i < 6; i++) {
          const ang = t * 0.5 + (i / 6) * Math.PI * 2;
          this.drawBasicEnemy(this.fxGfx, cx + Math.cos(ang) * W * 0.3, cy + Math.sin(ang) * H * 0.24, 0x6366f1, 22, t);
        }
        return;
      }

      if (status === "over") {
        this.fxGfx.fillStyle(0x020817, 0.72); this.fxGfx.fillRect(0, 0, W, H);
        this.drawParticles(delta, sx, sy);
        return;
      }

      // Paused — draw frozen frame with dim overlay
      if (status === "paused") {
        this.drawParticles(0, sx, sy); // no advance
        this.fxGfx.fillStyle(0x020817, 0.55); this.fxGfx.fillRect(0, 0, W, H);
        // Draw paused ship
        const shipScale = 1 + this.shipLevel * 0.22;
        this.drawShip(this.shipGfx, this.playerX, this.playerY, shipScale, 0, 0x22d3ee, this.shipLevel);
        return;
      }

      // PLAYING ──────────────────────────────────────────────────────────
      this.timerTick += delta;
      if (this.timerTick >= 1000) { this.timerTick -= 1000; this.elapsed++; cb.onTick(this.elapsed); }

      if (this.missileCd) {
        this.missileCdTimer += delta;
        const pct = Math.min(1, this.missileCdTimer / this.MISSILE_COOL);
        cb.onMissileCd(false, pct);
        if (this.missileCdTimer >= this.MISSILE_COOL) {
          this.missileCd = false; this.missileCdTimer = 0;
          cb.onMissileCd(true, 1);
        }
      }

      const prevLevel = this.shipLevel;
      for (let i = 0; i < this.KILLS_FOR_LEVEL.length; i++) {
        if (this.kills >= this.KILLS_FOR_LEVEL[i]) this.shipLevel = i + 1;
      }
      this.shipLevel = Math.min(this.shipLevel, 3);
      if (this.shipLevel !== prevLevel) cb.onSizeChange(this.shipLevel);

      const dx = this.pointerX - this.playerX;
      const dy = this.pointerY - this.playerY;
      this.playerX += dx * 8 * (delta / 1000);
      this.playerY += dy * 8 * (delta / 1000);
      this.playerX = Math.max(20, Math.min(W - 20, this.playerX));
      this.playerY = Math.max(20, Math.min(H - 20, this.playerY));

      this.fireCd -= delta;
      if (this.fireCd <= 0) { this.fireCd = this.FIRE_RATE; this.shootBullets(); cb.playBullet(); }

      this.waveTimer += delta;
      const waveMs = Math.max(7000, 28000 - this.wave * 800);
      if (this.waveTimer >= waveMs) {
        this.waveTimer = 0; this.wave++;
        cb.onWave(this.wave);
        if (this.wave % 5 === 0) cb.onBossWave(this.wave);
        this.spawnWave(W, H);
      }

      const spawnRate = Math.max(350, 2200 - this.wave * 140);
      if (this._nextSpawn === undefined) this._nextSpawn = spawnRate;
      this._nextSpawn -= delta;
      if (this._nextSpawn <= 0) {
        this._nextSpawn = spawnRate * (0.7 + Math.random() * 0.6);
        this.spawnEnemy(W, H);
      }

      this.bullets = (this.bullets as any[]).filter(b => {
        b.x += b.vx * (delta / 16); b.y += b.vy * (delta / 16);
        return b.y > -30 && b.x > -30 && b.x < W + 30;
      });

      this.missiles = (this.missiles as any[]).filter(m => {
        let nearDist = 1e9, target: any = null;
        (this.enemies as any[]).forEach(e => {
          if (e.type === "enemyBullet") return;
          const d = Math.hypot(e.x - m.x, e.y - m.y);
          if (d < nearDist) { nearDist = d; target = e; }
        });
        if (target) { const dir = norm2({ x: target.x - m.x, y: target.y - m.y }); m.vx += dir.x * 0.9; m.vy += dir.y * 0.9; }
        else { m.vy -= 0.6; }
        const spd2 = len2({ x: m.vx, y: m.vy });
        if (spd2 > 15) { m.vx = m.vx / spd2 * 15; m.vy = m.vy / spd2 * 15; }
        m.x += m.vx * (delta / 16); m.y += m.vy * (delta / 16);
        m.trail.push({ x: m.x, y: m.y });
        if (m.trail.length > 20) m.trail.shift();
        return m.y > -60 && m.x > -60 && m.x < W + 60;
      });

      const t = Date.now() / 1000;
      (this.enemies as any[]).forEach(e => {
        e.t += delta * 0.001;
        switch (e.type) {
          case "basic": e.y += e.speed * (delta / 16); e.x += Math.sin(e.t * 1.8 + e.phase) * 1.3; break;
          case "fast": e.y += e.speed * (delta / 16); e.x += Math.sin(e.t * 5.5 + e.phase) * 3.2; break;
          case "tank": e.y += e.speed * (delta / 16); break;
          case "stealth":
            e.y += e.speed * (delta / 16); e.x += Math.cos(e.t * 1.2 + e.phase) * 2.0;
            e.alpha = 0.3 + 0.7 * Math.abs(Math.sin(e.t * 1.5)); break;
          case "splitter": e.y += e.speed * (delta / 16); e.x += Math.sin(e.t * 2.5 + e.phase) * 1.8; break;
          case "zigzag":
            e.y += e.speed * (delta / 16);
            e.zigTimer = (e.zigTimer ?? 0) + delta;
            if (e.zigTimer > 400 + Math.random() * 300) { e.zigTimer = 0; e.zigDir = -(e.zigDir ?? 1); }
            e.x += (e.zigDir ?? 1) * e.speed * 1.6 * (delta / 16); break;
          case "bomber":
            e.y += e.speed * (delta / 16);
            e.mineTimer = (e.mineTimer ?? 0) + delta;
            if (e.mineTimer > 1800) {
              e.mineTimer = 0;
              this.enemies.push({ x: e.x, y: e.y + 10, type: "mine", hp: 1, maxHp: 1, t: 0, phase: 0, speed: 0.4, alpha: 1 });
            }
            break;
          case "mine": e.y += e.speed * (delta / 16); break;
          case "boss":
            e.y = Math.min(e.y + e.speed * (delta / 16), H * 0.2);
            e.x += Math.sin(e.t * 1.1) * 2.5;
            e.shotTimer = (e.shotTimer ?? 0) + delta;
            const bsr = Math.max(500, 2200 - this.wave * 90);
            if (e.shotTimer >= bsr) {
              e.shotTimer = 0;
              for (let k = -1; k <= 1; k++) {
                const ang = Math.atan2(this.playerY - e.y, this.playerX - e.x) + k * 0.3;
                this.enemies.push({ x: e.x, y: e.y + 24, type: "enemyBullet", vx: Math.cos(ang) * 5.5, vy: Math.sin(ang) * 5.5, hp: 1, maxHp: 1, t: 0, phase: 0, speed: 0, alpha: 1 });
              }
            }
            break;
          case "enemyBullet": e.x += e.vx * (delta / 16); e.y += e.vy * (delta / 16); break;
        }
        e.x = Math.max(-70, Math.min(W + 70, e.x));
      });

      // Bullet → enemy collision
      const deadEnemies = new Set<number>(); const deadBullets = new Set<number>();
      (this.bullets as any[]).forEach((b, bi) => {
        (this.enemies as any[]).forEach((e, ei) => {
          if (e.type === "enemyBullet") return;
          if (deadEnemies.has(ei)) return;
          const hitR = e.type === "boss" ? 52 : e.type === "tank" ? 36 : e.type === "mine" ? 20 : 26;
          if (Math.hypot(b.x - e.x, b.y - e.y) < hitR) {
            e.hp -= b.dmg; deadBullets.add(bi);
            this.spawnHitFX(b.x, b.y, 0x22d3ee, 5); cb.playHit();
            if (e.hp <= 0) { deadEnemies.add(ei); this.killEnemy(e, W, H); }
          }
        });
      });

      // Missile → enemy AoE
      this.missiles = (this.missiles as any[]).filter(m => {
        let hit = false;
        (this.enemies as any[]).forEach((e, ei) => {
          if (e.type === "enemyBullet") return;
          if (Math.hypot(m.x - e.x, m.y - e.y) < 60) { hit = true; e.hp -= 90; if (e.hp <= 0) deadEnemies.add(ei); }
        });
        if (!hit) return true;
        (this.enemies as any[]).forEach((e, ei) => {
          if (e.type === "enemyBullet") return;
          if (Math.hypot(m.x - e.x, m.y - e.y) < 90) { e.hp -= 45; if (e.hp <= 0) deadEnemies.add(ei); }
        });
        this.spawnExplosion(m.x, m.y, 90); this.shakeMag = 20; cb.playExplosion();
        return false;
      });

      Array.from(deadEnemies).sort((a, b) => b - a).forEach(i => this.enemies.splice(i, 1));
      Array.from(deadBullets).sort((a, b) => b - a).forEach(i => this.bullets.splice(i, 1));

      // Enemy → player
      this.enemies = (this.enemies as any[]).filter(e => {
        if (e.y > H + 80) return false;
        if (e.x < -70 || e.x > W + 70) return false;
        const hitR = e.type === "boss" ? 46 : e.type === "enemyBullet" ? 5 : e.type === "mine" ? 22 : 22;
        const shipR = 12 + this.shipLevel * 4;
        if (Math.hypot(e.x - this.playerX, e.y - this.playerY) < hitR + shipR) {
          const dmg = e.type === "boss" ? 28 : e.type === "tank" ? 22 : e.type === "enemyBullet" ? 11 : e.type === "mine" ? 25 : e.type === "bomber" ? 18 : 14;
          this.takeDamage(dmg);
          if (e.type === "enemyBullet") return false;
          if (e.type === "mine") { this.spawnExplosion(e.x, e.y, 50); this.shakeMag = 12; cb.playExplosion(); return false; }
          this.killEnemy(e, W, H); return false;
        }
        return true;
      });

      this.powerups = (this.powerups as any[]).filter(p => {
        p.y += 1.3 * (delta / 16); p.rot = (p.rot ?? 0) + 0.04;
        if (Math.hypot(p.x - this.playerX, p.y - this.playerY) < 26) {
          if (p.type === "hp") { this.playerHP = Math.min(100, this.playerHP + 28); cb.onHpChange(this.playerHP); }
          if (p.type === "shield") { this.playerShield = Math.min(60, this.playerShield + 35); cb.onShieldChange(this.playerShield); }
          if (p.type === "rapid") { this.FIRE_RATE = Math.max(70, this.FIRE_RATE - 30); setTimeout(() => { this.FIRE_RATE = 175; }, 6000); }
          this.spawnHitFX(p.x, p.y, p.type === "hp" ? 0x10b981 : p.type === "rapid" ? 0xf59e0b : 0x22d3ee, 16);
          return false;
        }
        return p.y < H + 40;
      });

      // Render
      this.drawParticles(delta, sx, sy);

      (this.powerups as any[]).forEach(p => {
        const col = p.type === "hp" ? 0x10b981 : p.type === "rapid" ? 0xf59e0b : 0x22d3ee;
        this.fxGfx.fillStyle(col, 0.12 + 0.06 * Math.sin(t * 3 + p.x));
        this.fxGfx.fillCircle(sx + p.x, sy + p.y, 24);
        this.fxGfx.lineStyle(2, col, 0.85); this.fxGfx.strokeCircle(sx + p.x, sy + p.y, 16);
        this.fxGfx.fillStyle(col, 1);
        if (p.type === "hp") { this.fxGfx.fillRect(sx + p.x - 5, sy + p.y - 2, 10, 4); this.fxGfx.fillRect(sx + p.x - 2, sy + p.y - 5, 4, 10); }
        else if (p.type === "rapid") { for (let i = 0; i < 3; i++) this.fxGfx.fillRect(sx + p.x - 4 + i * 4, sy + p.y - 6, 2, 12); }
        else { this.fxGfx.fillCircle(sx + p.x, sy + p.y, 5); this.fxGfx.fillStyle(0xffffff, 0.85); this.fxGfx.fillCircle(sx + p.x, sy + p.y, 2.5); }
      });

      (this.enemies as any[]).filter(e => e.type === "enemyBullet").forEach(e => {
        this.enemyGfx.fillStyle(0xf97316, 0.9); this.enemyGfx.fillCircle(sx + e.x, sy + e.y, 5.5);
        this.enemyGfx.fillStyle(0xfef3c7, 0.6); this.enemyGfx.fillCircle(sx + e.x, sy + e.y, 2.5);
      });

      (this.enemies as any[]).filter(e => e.type === "mine").forEach(e => {
        const pulse = 1 + 0.15 * Math.sin(e.t * 8);
        this.enemyGfx.fillStyle(0xef4444, 0.15 * pulse); this.enemyGfx.fillCircle(sx + e.x, sy + e.y, 20 * pulse);
        this.enemyGfx.fillStyle(0xef4444, 0.8); this.enemyGfx.fillCircle(sx + e.x, sy + e.y, 8);
        this.enemyGfx.lineStyle(1.5, 0xef4444, 0.7); this.enemyGfx.strokeCircle(sx + e.x, sy + e.y, 14);
        for (let i = 0; i < 4; i++) {
          const ang = (i / 4) * Math.PI * 2 + e.t * 2;
          this.enemyGfx.fillStyle(0xfbbf24, 0.9);
          this.enemyGfx.fillCircle(sx + e.x + Math.cos(ang) * 14, sy + e.y + Math.sin(ang) * 14, 3);
        }
      });

      (this.enemies as any[]).filter(e => !["enemyBullet", "mine"].includes(e.type)).forEach(e => {
        const alpha = (e.alpha ?? 1);
        switch (e.type) {
          case "basic": this.drawBasicEnemy(this.enemyGfx, sx + e.x, sy + e.y, 0x6366f1, 24, t, e.hp / e.maxHp, alpha); break;
          case "fast": this.drawFastEnemy(this.enemyGfx, sx + e.x, sy + e.y, t, e.hp / e.maxHp); break;
          case "tank": this.drawTankEnemy(this.enemyGfx, sx + e.x, sy + e.y, t, e.hp / e.maxHp); break;
          case "stealth": this.drawStealthEnemy(this.enemyGfx, sx + e.x, sy + e.y, t, e.hp / e.maxHp, alpha); break;
          case "splitter": this.drawSplitterEnemy(this.enemyGfx, sx + e.x, sy + e.y, t, e.hp / e.maxHp); break;
          case "zigzag": this.drawZigzagEnemy(this.enemyGfx, sx + e.x, sy + e.y, t, e.hp / e.maxHp); break;
          case "bomber": this.drawBomberEnemy(this.enemyGfx, sx + e.x, sy + e.y, t, e.hp / e.maxHp); break;
          case "boss": this.drawBossEnemy(this.enemyGfx, sx + e.x, sy + e.y, t, e.hp / e.maxHp); break;
        }
      });

      (this.missiles as any[]).forEach(m => {
        for (let i = 0; i < m.trail.length - 1; i++) {
          const ta = (i / m.trail.length) * 0.65;
          this.bulletGfx.lineStyle(2.5, 0xf97316, ta);
          this.bulletGfx.beginPath(); this.bulletGfx.moveTo(sx + m.trail[i].x, sy + m.trail[i].y);
          this.bulletGfx.lineTo(sx + m.trail[i + 1].x, sy + m.trail[i + 1].y); this.bulletGfx.strokePath();
        }
        this.bulletGfx.fillStyle(0xf97316, 0.45); this.bulletGfx.fillCircle(sx + m.x, sy + m.y, 15);
        this.bulletGfx.fillStyle(0xf97316, 1); this.bulletGfx.fillCircle(sx + m.x, sy + m.y, 6.5);
        this.bulletGfx.fillStyle(0xfef3c7, 0.95); this.bulletGfx.fillCircle(sx + m.x, sy + m.y, 3);
      });

      (this.bullets as any[]).forEach(b => {
        const ang = Math.atan2(b.vy, b.vx);
        const len = 24, hw = 4.5;
        const ex = b.x + Math.cos(ang) * len, ey = b.y + Math.sin(ang) * len;
        const px = -Math.sin(ang) * hw, py = Math.cos(ang) * hw;
        this.bulletGfx.fillStyle(b.col ?? 0x22d3ee, 0.22);
        this.bulletGfx.fillTriangle(b.x + px * 2.2, b.y + py * 2.2, b.x - px * 2.2, b.y - py * 2.2, ex, ey);
        this.bulletGfx.fillStyle(b.col ?? 0x22d3ee, 0.92);
        this.bulletGfx.fillTriangle(b.x + px, b.y + py, b.x - px, b.y - py, ex, ey);
        this.bulletGfx.fillStyle(0xffffff, 0.75);
        this.bulletGfx.fillTriangle(b.x + px * 0.4, b.y + py * 0.4, b.x - px * 0.4, b.y - py * 0.4, ex, ey);
        this.bulletGfx.fillStyle(0xffffff, 0.9); this.bulletGfx.fillCircle(ex, ey, 3.5);
        this.bulletGfx.fillStyle(b.col ?? 0x22d3ee, 0.4);
        this.bulletGfx.fillCircle((b.x + ex) / 2, (b.y + ey) / 2, 8);
      });

      const shipScale = 1 + this.shipLevel * 0.22;
      const ef = 0.55 + 0.45 * Math.sin(t * 28);
      this.drawShip(this.shipGfx, sx + this.playerX, sy + this.playerY, shipScale, ef, 0x22d3ee, this.shipLevel);

      if (this.playerShield > 0) {
        const sa = (this.playerShield / 60) * 0.65;
        const sr = 32 + this.shipLevel * 8;
        this.shipGfx.lineStyle(2, 0x22d3ee, sa);
        this.shipGfx.strokeCircle(sx + this.playerX, sy + this.playerY, sr + 4 * Math.sin(t * 5));
        this.shipGfx.fillStyle(0x22d3ee, sa * 0.12);
        this.shipGfx.fillCircle(sx + this.playerX, sy + this.playerY, sr);
      }

      if (this.playerHP <= 0 && !this.dead) {
        this.dead = true;
        this.spawnExplosion(this.playerX, this.playerY, 110); this.shakeMag = 45;
        cb.triggerDie();
      }
    }

    shootBullets(this: any) {
      const spd = 16;
      const patterns: { angle: number; col: number }[][] = [
        [{ angle: -Math.PI / 2, col: 0x22d3ee }],
        [{ angle: -Math.PI / 2 - 0.2, col: 0x22d3ee }, { angle: -Math.PI / 2 + 0.2, col: 0x22d3ee }],
        [{ angle: -Math.PI / 2 - 0.28, col: 0x22d3ee }, { angle: -Math.PI / 2, col: 0xffffff }, { angle: -Math.PI / 2 + 0.28, col: 0x22d3ee }],
        [{ angle: -Math.PI / 2 - 0.45, col: 0xa78bfa }, { angle: -Math.PI / 2 - 0.22, col: 0x22d3ee }, { angle: -Math.PI / 2, col: 0xffffff }, { angle: -Math.PI / 2 + 0.22, col: 0x22d3ee }, { angle: -Math.PI / 2 + 0.45, col: 0xa78bfa }],
      ];
      const pat = patterns[Math.min(this.shipLevel, 3)];
      const dmg = 10 + this.shipLevel * 3;
      pat.forEach(({ angle, col }) => {
        this.bullets.push({ x: this.playerX, y: this.playerY - 14, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, dmg, col });
      });
    }

    launchMissile(this: any) {
      if (this.missileCd) return;
      this.missileCd = true; this.missileCdTimer = 0;
      this.missiles.push({ x: this.playerX, y: this.playerY - 22, vx: 0, vy: -9, trail: [] });
      cb.onMissileCd(false, 0);
    }

    spawnEnemy(this: any, W: number, H: number) {
      const wave = this.wave;
      let pool: string[];
      if (wave >= 12) pool = ["basic", "basic", "fast", "fast", "tank", "tank", "stealth", "splitter", "zigzag", "bomber", "boss"];
      else if (wave >= 8) pool = ["basic", "basic", "fast", "fast", "tank", "stealth", "splitter", "zigzag", "bomber"];
      else if (wave >= 5) pool = ["basic", "basic", "basic", "fast", "fast", "tank", "zigzag", "splitter"];
      else if (wave >= 3) pool = ["basic", "basic", "basic", "fast", "fast", "zigzag"];
      else pool = ["basic", "basic", "basic", "fast"];

      // Force boss wave on multiples of 5
      if (wave % 5 === 0) pool = ["boss", "boss", "tank", "tank", "fast"];

      let type = pool[Math.floor(Math.random() * pool.length)];
      if (type === "boss" && (this.enemies as any[]).filter(e => e.type === "boss").length >= 2) type = "tank";

      const hpMap: Record<string, number> = {
        basic: 25 + wave * 6, fast: 18 + wave * 4, tank: 80 + wave * 18,
        stealth: 22 + wave * 5, splitter: 35 + wave * 7, zigzag: 20 + wave * 5,
        bomber: 45 + wave * 10, boss: 280 + wave * 55,
      };
      const spdMap: Record<string, number> = {
        basic: 1.5 + wave * 0.13, fast: 3.2 + wave * 0.22, tank: 0.85 + wave * 0.07,
        stealth: 1.8 + wave * 0.14, splitter: 1.9 + wave * 0.15, zigzag: 2.1 + wave * 0.17,
        bomber: 1.0 + wave * 0.08, boss: 0.55,
      };
      const hp = hpMap[type] ?? 25;
      this.enemies.push({
        x: 30 + Math.random() * (W - 60), y: type === "boss" ? -60 : -32,
        type, hp, maxHp: hp, speed: spdMap[type] ?? 1.5,
        phase: Math.random() * Math.PI * 2, t: 0, alpha: 1,
        zigDir: Math.random() > 0.5 ? 1 : -1,
      });
    }

    spawnWave(this: any, W: number, H: number) {
      const count = 4 + Math.min(this.wave * 2, 14);
      for (let i = 0; i < count; i++) setTimeout(() => this.spawnEnemy(W, H), i * 180);
      const puType = Math.random() < 0.45 ? "hp" : Math.random() < 0.5 ? "shield" : "rapid";
      this.powerups.push({ x: 50 + Math.random() * (W - 100), y: -24, type: puType, rot: 0 });
    }

    killEnemy(this: any, e: any, W: number, H: number) {
      const pts = e.type === "boss" ? 600 : e.type === "tank" ? 180 : e.type === "bomber" ? 140 : e.type === "splitter" ? 120 : e.type === "stealth" ? 100 : e.type === "zigzag" ? 80 : e.type === "fast" ? 60 : 40;
      this.score += pts; this.kills++;
      cb.onScore(pts); cb.onKill();
      this.spawnExplosion(e.x, e.y, e.type === "boss" ? 90 : e.type === "tank" ? 55 : 32);
      if (e.type === "boss") this.shakeMag = 30;
      else if (e.type === "tank") this.shakeMag = 14;
      cb.playExplosion();
      if (e.type === "splitter") {
        for (let k = -1; k <= 1; k += 2) {
          this.enemies.push({ x: e.x + k * 18, y: e.y, type: "fast", hp: 12, maxHp: 12, speed: 3.5 + this.wave * 0.18, phase: Math.random() * Math.PI * 2, t: 0, alpha: 1, zigDir: k });
        }
      }
      const dropChance = e.type === "boss" ? 0.9 : e.type === "tank" ? 0.4 : e.type === "bomber" ? 0.3 : 0.1;
      if (Math.random() < dropChance) {
        const puType = Math.random() < 0.5 ? "hp" : Math.random() < 0.5 ? "shield" : "rapid";
        this.powerups.push({ x: e.x, y: e.y, type: puType, rot: 0 });
      }
    }

    takeDamage(this: any, dmg: number) {
      if (this.playerShield > 0) {
        const absorbed = Math.min(this.playerShield, dmg);
        this.playerShield = Math.max(0, this.playerShield - absorbed);
        dmg -= absorbed; cb.onShieldChange(this.playerShield);
      }
      if (dmg > 0) {
        this.playerHP = Math.max(0, this.playerHP - dmg);
        cb.onHpChange(this.playerHP); this.shakeMag = 14; cb.playHit();
        this.spawnHitFX(this.playerX, this.playerY, 0xef4444, 12);
      }
    }

    spawnExplosion(this: any, x: number, y: number, r: number) {
      const cols = [0xf97316, 0xfbbf24, 0xef4444, 0xffffff, 0x22d3ee, 0xa78bfa];
      const count = r > 60 ? 55 : r > 35 ? 35 : 20;
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + Math.random() * 0.6, spd = 2 + Math.random() * (r / 9);
        this.particles.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 1.8, r: 2.5 + Math.random() * 4.5, life: 450 + Math.random() * 350, maxLife: 800, col: cols[Math.floor(Math.random() * cols.length)], grav: 0.11 });
      }
    }
    spawnHitFX(this: any, x: number, y: number, col: number, count: number) {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2, spd = 1.5 + Math.random() * 3.5;
        this.particles.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: 1.5 + Math.random() * 3, life: 200 + Math.random() * 170, maxLife: 370, col, grav: 0.06 });
      }
    }
    drawParticles(this: any, delta: number, sx: number, sy: number) {
      this.particles = (this.particles as any[]).filter(p => {
        p.x += p.vx; p.y += p.vy; p.vy += p.grav; p.life -= delta;
        if (p.life <= 0) return false;
        const a = Math.max(0, p.life / p.maxLife) * 0.92;
        this.fxGfx.fillStyle(p.col, a);
        this.fxGfx.fillCircle(sx + p.x, sy + p.y, p.r * (p.life / p.maxLife));
        return true;
      });
    }

    drawShip(this: any, g: any, x: number, y: number, scale: number, ef: number, col: number, level: number) {
      const s = 22 * scale;
      const engines = level >= 3 ? [-s * 0.55, 0, s * 0.55] : level >= 2 ? [-s * 0.38, s * 0.38] : [0];
      engines.forEach(offX => {
        g.fillStyle(col, 0.12 * ef); g.fillEllipse(x + offX, y + s * 0.7, s * 0.6, s * 0.45);
        g.fillStyle(0xf97316, 0.4 * ef); g.fillEllipse(x + offX, y + s * 0.55, s * 0.28, s * 0.28);
        g.fillStyle(0xfef3c7, 0.7 * ef); g.fillEllipse(x + offX, y + s * 0.45, s * 0.14, s * 0.16);
      });
      const ww = 0.85 + level * 0.12;
      g.fillStyle(col, 0.72);
      g.fillTriangle(x, y + s * 0.22, x - s * ww, y + s * 0.58, x - s * 0.28, y - s * 0.08);
      g.fillTriangle(x, y + s * 0.22, x + s * ww, y + s * 0.58, x + s * 0.28, y - s * 0.08);
      g.fillStyle(col, 0.92);
      g.fillTriangle(x, y - s, x - s * 0.3, y + s * 0.48, x + s * 0.3, y + s * 0.48);
      g.fillStyle(0x0f172a, 0.92); g.fillEllipse(x, y - s * 0.2, s * 0.22, s * 0.38);
      g.fillStyle(col, 0.42); g.fillEllipse(x, y - s * 0.26, s * 0.11, s * 0.21);
      g.fillStyle(col, 0.65);
      if (level >= 1) { g.fillRect(x - s * 0.7 - 2.5, y - 2, 5, s * 0.45); g.fillRect(x + s * 0.7 - 2.5, y - 2, 5, s * 0.45); }
      if (level >= 3) { g.fillRect(x - s * 0.92 - 2, y + 4, 4, s * 0.35); g.fillRect(x + s * 0.88 - 2, y + 4, 4, s * 0.35); }
      if (level > 0) {
        const auraCol = level === 3 ? 0xfbbf24 : level === 2 ? 0xa78bfa : 0x22d3ee;
        g.lineStyle(1.5, auraCol, 0.45 + 0.25 * Math.sin(Date.now() / 200));
        g.strokeCircle(x, y, s * 1.4);
      }
      g.lineStyle(1.5, col, 0.5);
      g.beginPath();
      g.moveTo(x, y - s); g.lineTo(x - s * 0.3, y + s * 0.48); g.lineTo(x - s * ww, y + s * 0.58);
      g.lineTo(x, y + s * 0.22); g.lineTo(x + s * ww, y + s * 0.58); g.lineTo(x + s * 0.3, y + s * 0.48);
      g.closePath(); g.strokePath();
    }

    drawBasicEnemy(this: any, g: any, x: number, y: number, col: number, size: number, t: number, hpRatio = 1, alpha = 1) {
      const pulse = 1 + 0.06 * Math.sin(t * 3);
      g.fillStyle(col, 0.14 * pulse * alpha); g.fillCircle(x, y, size * 1.5 * pulse);
      g.fillStyle(col, hpRatio * 0.85 * alpha); g.fillEllipse(x, y, size * 2.2, size);
      g.fillStyle(0x1e1b4b, 0.9 * alpha); g.fillEllipse(x, y - size * 0.2, size * 0.9, size * 0.65);
      g.lineStyle(1.5, col, 0.7 * alpha); g.strokeEllipse(x, y, size * 2.2, size);
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + t;
        const blink = 0.5 + 0.5 * Math.sin(t * 4 + i);
        g.fillStyle(0xfbbf24, blink * 0.9 * alpha);
        g.fillCircle(x + Math.cos(ang) * size * 0.85, y + Math.sin(ang) * size * 0.32, 2.5);
      }
    }
    drawFastEnemy(this: any, g: any, x: number, y: number, t: number, hpRatio = 1) {
      const col = 0xef4444;
      g.fillStyle(col, 0.11); g.fillCircle(x, y, 30);
      g.fillStyle(col, hpRatio * 0.9);
      g.fillTriangle(x, y + 30, x - 17, y - 20, x + 17, y - 20);
      g.fillTriangle(x, y - 22, x - 27, y + 14, x + 27, y + 14);
      g.fillStyle(0x7f1d1d, 0.8); g.fillEllipse(x, y, 12, 20);
      g.lineStyle(1.5, col, 0.75); g.strokeCircle(x, y, 22);
      const ef = 0.5 + 0.5 * Math.sin(t * 22);
      g.fillStyle(0xfbbf24, ef * 0.85); g.fillEllipse(x, y + 26, 14, 9);
    }
    drawTankEnemy(this: any, g: any, x: number, y: number, t: number, hpRatio = 1) {
      const col = 0xa78bfa, pulse = 1 + 0.04 * Math.sin(t * 1.5);
      g.fillStyle(col, 0.12 * pulse); g.fillRect(x - 42, y - 36, 84, 72);
      g.fillStyle(col, hpRatio * 0.8); g.fillRect(x - 30, y - 26, 60, 52);
      g.fillStyle(0x4c1d95, 0.88); g.fillRect(x - 22, y - 18, 44, 36);
      g.fillStyle(0x1e293b, 0.8); g.fillRect(x - 22, y - 32, 44, 6);
      g.fillStyle(hpRatio > 0.5 ? 0x22d3ee : 0xef4444, 0.9); g.fillRect(x - 22, y - 32, 44 * hpRatio, 6);
      g.fillStyle(col, 0.7); g.fillRect(x - 36, y - 4, 13, 10); g.fillRect(x + 22, y - 4, 13, 10);
      g.lineStyle(2, col, 0.6); g.strokeRect(x - 30, y - 26, 60, 52);
      for (let i = 0; i < 4; i++) { const blink = 0.4 + 0.6 * Math.sin(t * 5 + i * 1.6); g.fillStyle(0xfbbf24, blink * 0.9); g.fillCircle(x - 15 + i * 10, y + 29, 3.5); }
    }
    drawStealthEnemy(this: any, g: any, x: number, y: number, t: number, hpRatio = 1, alpha = 1) {
      const col = 0x06b6d4;
      g.fillStyle(col, 0.08 * alpha); g.fillCircle(x, y, 36);
      g.fillStyle(col, hpRatio * 0.65 * alpha);
      g.fillTriangle(x, y - 27, x - 21, y + 18, x + 21, y + 18);
      g.fillStyle(0x0e7490, 0.6 * alpha); g.fillEllipse(x, y, 15, 24);
      g.lineStyle(1.5, col, 0.5 * alpha); g.strokeCircle(x, y, 24);
      const shimmer = 0.3 + 0.7 * Math.sin(t * 6 + x);
      g.fillStyle(0xffffff, shimmer * 0.4 * alpha); g.fillEllipse(x - 6, y - 9, 6, 12);
    }
    drawSplitterEnemy(this: any, g: any, x: number, y: number, t: number, hpRatio = 1) {
      const col = 0xf59e0b, pulse = 1 + 0.08 * Math.sin(t * 4);
      g.fillStyle(col, 0.13 * pulse); g.fillCircle(x, y, 33 * pulse);
      g.fillStyle(col, hpRatio * 0.85);
      g.fillTriangle(x, y - 27, x - 21, y, x + 21, y);
      g.fillTriangle(x - 21, y, x + 21, y, x, y + 27);
      g.fillStyle(0x78350f, 0.8); g.fillCircle(x, y, 10);
      g.lineStyle(1.5, col, 0.6); g.beginPath(); g.moveTo(x - 15, y); g.lineTo(x + 15, y); g.strokePath();
      g.lineStyle(2, col, 0.55); g.strokeCircle(x, y, 24);
    }
    drawZigzagEnemy(this: any, g: any, x: number, y: number, t: number, hpRatio = 1) {
      const col = 0x10b981;
      g.fillStyle(col, 0.12); g.fillCircle(x, y, 32);
      g.fillStyle(col, hpRatio * 0.88);
      g.fillTriangle(x, y - 24, x - 18, y + 15, x + 18, y + 15);
      g.fillTriangle(x - 18, y - 3, x - 33, y + 15, x - 12, y + 15);
      g.fillTriangle(x + 18, y - 3, x + 33, y + 15, x + 12, y + 15);
      g.fillStyle(0x064e3b, 0.8); g.fillEllipse(x, y + 3, 12, 18);
      const ef = 0.4 + 0.6 * Math.sin(t * 18);
      g.fillStyle(col, ef * 0.8); g.fillEllipse(x, y + 20, 10, 8);
    }
    drawBomberEnemy(this: any, g: any, x: number, y: number, t: number, hpRatio = 1) {
      const col = 0xf97316, pulse = 1 + 0.05 * Math.sin(t * 2);
      g.fillStyle(col, 0.12 * pulse); g.fillEllipse(x, y, 80, 48);
      g.fillStyle(col, hpRatio * 0.78); g.fillEllipse(x, y, 68, 40);
      g.fillStyle(0x7c2d12, 0.85); g.fillEllipse(x, y, 36, 26);
      g.fillStyle(0x1e293b, 0.9); g.fillCircle(x - 18, y + 20, 8); g.fillCircle(x + 18, y + 20, 8);
      g.fillStyle(col, 0.7); g.fillCircle(x - 18, y + 20, 5); g.fillCircle(x + 18, y + 20, 5);
      g.lineStyle(2, col, 0.6); g.strokeEllipse(x, y, 68, 40);
      g.fillStyle(0x1e293b, 0.8); g.fillRect(x - 24, y - 30, 48, 6);
      g.fillStyle(hpRatio > 0.5 ? col : 0xef4444, 0.9); g.fillRect(x - 24, y - 30, 48 * hpRatio, 6);
    }
    drawBossEnemy(this: any, g: any, x: number, y: number, t: number, hpRatio = 1) {
      const col = 0xf97316, pulse = 1 + 0.07 * Math.sin(t * 2);
      [3.8, 2.6, 1.8].forEach((m, i) => { g.fillStyle(col, (0.05 - i * 0.012) * pulse); g.fillCircle(x, y, 58 * m * pulse); });
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2 + t * 1.6, blink = 0.5 + 0.5 * Math.sin(t * 5 + i);
        g.fillStyle(col, blink * 0.9); g.fillCircle(x + Math.cos(ang) * 68, y + Math.sin(ang) * 68, 6.5);
      }
      this.drawHex(g, x, y, 56, t * 0.28, col, hpRatio * 0.72);
      this.drawHex(g, x, y, 37, -t * 0.52, 0x7c3aed, 0.88);
      for (let i = 0; i < 3; i++) {
        const ang = t * 2.2 + (i / 3) * Math.PI * 2;
        g.lineStyle(3.5, col, 0.55);
        g.beginPath(); g.moveTo(x + Math.cos(ang) * 32, y + Math.sin(ang) * 32);
        g.lineTo(x + Math.cos(ang) * 58, y + Math.sin(ang) * 58); g.strokePath();
      }
      g.fillStyle(col, 0.92); g.fillCircle(x, y, 16);
      g.fillStyle(0xfef3c7, 0.95); g.fillCircle(x, y, 8);
      g.fillStyle(0x1e293b, 0.88); g.fillRect(x - 58, y + 68, 116, 10);
      g.fillStyle(hpRatio > 0.5 ? col : 0xef4444, 0.9); g.fillRect(x - 58, y + 68, 116 * hpRatio, 10);
      g.lineStyle(1.5, col, 0.4); g.strokeRect(x - 58, y + 68, 116, 10);
    }
    drawHex(this: any, g: any, cx: number, cy: number, r: number, rot: number, col: number, alpha: number) {
      const pts: number[][] = [];
      for (let i = 0; i < 6; i++) { const a = rot + (i / 6) * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
      g.fillStyle(col, alpha); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < 6; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath(); g.fillPath();
    }

    firePlayerMissile(this: any) { this.launchMissile(); }
    resetGame(this: any) {
      const W = this.scale.width as number;
      const H = this.scale.height as number;
      this.playerHP = 100; this.playerShield = 0; this.shipLevel = 0; this.kills = 0;
      this.wave = 1; this.score = 0; this.elapsed = 0; this.timerTick = 0; this.waveTimer = 0;
      this.fireCd = 0; this.FIRE_RATE = 175;
      this.missileCd = false; this.missileCdTimer = 0;
      this.dead = false; this._nextSpawn = undefined;
      this.bullets = []; this.missiles = []; this.enemies = []; this.particles = []; this.powerups = [];
      this.playerX = W / 2; this.playerY = H * 0.75;
      this.pointerX = W / 2; this.pointerY = H * 0.75;
    }
  }
  return SpaceScene;
}

// ─── React Page ───────────────────────────────────────────────────────────────
export default function SpaceShooterPage() {
  const { user } = useAuthStore();

  const [status, setStatus] = useState<GameStatus>("idle");
  const [score, setScore] = useState(0);
  const [kills, setKills] = useState(0);
  const [wave, setWave] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [hp, setHp] = useState(100);
  const [shield, setShield] = useState(0);
  const [shipLevel, setShipLevel] = useState(0);
  const [missileReady, setMissileReady] = useState(true);
  const [missilePct, setMissilePct] = useState(1);
  const [finalXP, setFinalXP] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [finalKills, setFinalKills] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [muted, setMuted] = useState(false);
  const [lb, setLb] = useState<LBEntry[]>([]);
  const [lbLoad, setLbLoad] = useState(true);
  const [hist, setHist] = useState<HistRecord[]>([]);
  const [bossWave, setBossWave] = useState<number | null>(null);
  const [waveAnnounce, setWaveAnnounce] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const gameWrapperRef = useRef<HTMLDivElement>(null);
  const gameOverRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);
  const statusRef = useRef<GameStatus>("idle");
  const scoreRef = useRef(0);
  const killsRef = useRef(0);
  const waveRef = useRef(1);
  const elapsedRef = useRef(0);
  const userRef = useRef(user);
  const endGameRef = useRef<(() => void) | null>(null);

  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { statusRef.current = status; }, [status]);

  // Gently nudge scroll so result card is visible when game ends
  useEffect(() => {
    if (status === "over" && gameOverRef.current) {
      const t = setTimeout(() => {
        gameOverRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 500);
      return () => clearTimeout(t);
    }
  }, [status]);

  const fetchLbAndHist = useCallback(() => {
    setLbLoad(true);
    Promise.all([
      fetch("/api/leaderboard?gameType=SPACE_SHOOTER").then(r => r.json()),
      user ? fetch("/api/games/history?gameType=SPACE_SHOOTER&limit=20").then(r => r.json()) : Promise.resolve(null),
    ]).then(([lbR, hR]) => {
      if (lbR?.success) setLb(lbR.data.slice(0, 8));
      if (hR?.success && hR.data?.length) {
        setHist(hR.data.map((g: any) => ({ id: g.id, score: g.score, wave: g.wave, kills: g.kills, survivalTime: g.survivalTime, date: new Date(g.createdAt) })));
      }
    }).catch(console.error).finally(() => setLbLoad(false));
  }, [user]);

  useEffect(() => { fetchLbAndHist(); }, [fetchLbAndHist]);

  // ── Proper Fullscreen using native API on the game wrapper ──────────────────
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        const el = gameWrapperRef.current ?? document.documentElement;
        const req = (el as any).requestFullscreen
          ?? (el as any).webkitRequestFullscreen
          ?? (el as any).mozRequestFullScreen;
        if (req) await req.call(el, { navigationUI: "hide" });
      } else {
        const exit = (document as any).exitFullscreen
          ?? (document as any).webkitExitFullscreen
          ?? (document as any).mozCancelFullScreen;
        if (exit) await exit.call(document);
      }
    } catch (err) {
      console.warn("Fullscreen error:", err);
    }
  }, []);

  // Resize Phaser — only called after fullscreen transition or container resize
  const resizePhaser = useCallback(() => {
    const game = gameRef.current;
    const container = containerRef.current;
    if (!game || !container) return;

    const doResize = () => {
      try {
        const isFull = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
        let w: number, h: number;
        if (isFull) {
          // In fullscreen, use the actual screen size
          w = window.innerWidth  || window.screen.width  || 400;
          h = window.innerHeight || window.screen.height || 600;
          w = Math.max(w, window.screen.width  || 0);
          h = Math.max(h, window.screen.height || 0);
        } else {
          const rect = container.getBoundingClientRect();
          w = Math.round(rect.width)  || container.offsetWidth  || 400;
          h = Math.round(rect.height) || container.offsetHeight || w;
        }
        if (w < 10 || h < 10) return;
        game.scale.resize(w, h);
        const canvas = game.canvas as HTMLCanvasElement | null;
        if (canvas) {
          canvas.style.cssText = "position:absolute!important;top:0!important;left:0!important;width:100%!important;height:100%!important;display:block!important;";
        }
      } catch { }
    };

    // Run immediately AND after next paint (fullscreen CSS transition takes 1 frame)
    doResize();
    requestAnimationFrame(doResize);
  }, []);

  useEffect(() => {
    const onChange = () => {
      const isFull = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFull);
      // Staggered retries: mobile browser chrome takes 300-600ms to fully collapse
      resizePhaser();
      [50, 150, 300, 500, 800, 1200].forEach(ms => setTimeout(resizePhaser, ms));
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    window.addEventListener("resize", resizePhaser);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
      window.removeEventListener("resize", resizePhaser);
    };
  }, [resizePhaser]);

  // XP calculation
  const endGame = useCallback(async () => {
    if (!mutedRef.current) playDieSfx(audioRef.current);
    const sc = scoreRef.current, kl = killsRef.current, wv = waveRef.current, el = elapsedRef.current;
    const xp = Math.min(Math.floor(el / 3) + kl * 2, 2000);
    setStatus("over"); statusRef.current = "over";
    // Auto-exit fullscreen on game over
    if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch { } }
    setFinalXP(xp); setFinalScore(sc); setFinalKills(kl);
    setSessionScore(s => s + xp);
    const currentUser = userRef.current;
    const currentSessionId = sessionIdRef.current;
    if (currentUser && currentSessionId) {
      setSaving(true);
      try {
        const res = await fetch("/api/games/space-shooter/finish", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: currentSessionId, score: sc, wave: wv, kills: kl, survivalTime: el }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.xpEarned !== undefined) { setFinalXP(data.xpEarned); setSessionScore(s => s - xp + data.xpEarned); }
          fetchLbAndHist();
        }
        setHist(prev => [{ id: crypto.randomUUID(), score: sc, wave: wv, kills: kl, survivalTime: el, date: new Date() }, ...prev].slice(0, 20));
      } catch (e) { console.error("[space-shooter] endGame failed:", e); }
      finally { setSaving(false); }
    }
  }, [fetchLbAndHist]);

  useEffect(() => { endGameRef.current = endGame; }, [endGame]);

  // Build Phaser once
  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    const el = containerRef.current;
    const SceneClass = buildScene({
      onScore: n => { scoreRef.current += n; setScore(scoreRef.current); },
      onKill: () => { killsRef.current++; setKills(killsRef.current); },
      onWave: n => {
        waveRef.current = n; setWave(n);
        setWaveAnnounce(n);
        setTimeout(() => setWaveAnnounce(null), 2800);
      },
      onTick: t => { elapsedRef.current = t; setElapsed(t); },
      onMissileCd: (r, p) => { setMissileReady(r); setMissilePct(p); },
      onHpChange: h => setHp(h),
      onShieldChange: s => setShield(s),
      onSizeChange: l => setShipLevel(l),
      onBossWave: w => {
        setBossWave(w);
        setTimeout(() => setBossWave(null), 4000);
      },
      getStatus: () => statusRef.current,
      triggerDie: () => endGameRef.current?.(),
      playBullet: () => { if (!mutedRef.current) playBulletSfx(audioRef.current); },
      playMissile: () => { if (!mutedRef.current) playMissileSfx(audioRef.current); },
      playHit: () => { if (!mutedRef.current) playHitSfx(audioRef.current); },
      playExplosion: () => { if (!mutedRef.current) playExplosionSfx(audioRef.current); },
    });
    import("phaser").then(({ default: Phaser }) => {
      if (gameRef.current) { gameRef.current.destroy(true); gameRef.current = null; }
      const rect = el.getBoundingClientRect();
      const initW = Math.round(rect.width)  || el.offsetWidth  || 400;
      const initH = Math.round(rect.height) || el.offsetHeight || initW;
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: initW,
        height: initH,
        backgroundColor: "#020817",
        parent: el,
        scene: SceneClass,
        // NONE = we call game.scale.resize() ourselves; no Phaser auto-scaling fighting us
        scale: { mode: Phaser.Scale.NONE },
        render: { antialias: true, pixelArt: false },
        input: { mouse: { preventDefaultDown: false } },
      } as any);
      gameRef.current = game;
      game.events.once("ready", () => {
        sceneRef.current = game.scene.getScene("SpaceScene") ?? game.scene.scenes[0];
        // Pin the canvas to fill its container at all times
        const c = game.canvas as HTMLCanvasElement;
        if (c) {
          c.style.cssText = "position:absolute!important;top:0!important;left:0!important;width:100%!important;height:100%!important;display:block!important;";
        }
        // Sync immediately in case container grew since init
        resizePhaser();
      });
    }).catch(console.error);
    return () => { if (gameRef.current) { gameRef.current.destroy(true); gameRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ro = new ResizeObserver(() => resizePhaser());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [resizePhaser]);

  const startGame = useCallback(async () => {
    if (!audioRef.current) audioRef.current = makeAudio();
    scoreRef.current = 0; killsRef.current = 0; waveRef.current = 1; elapsedRef.current = 0;
    sessionIdRef.current = null;
    setScore(0); setKills(0); setWave(1); setElapsed(0);
    setHp(100); setShield(0); setShipLevel(0); setMissileReady(true); setMissilePct(1);
    setFinalXP(0); setFinalScore(0); setFinalKills(0); setBossWave(null); setWaveAnnounce(null);
    sceneRef.current?.resetGame?.();
    if (userRef.current) {
      try {
        const r = await fetch("/api/games/space-shooter/start", { method: "POST", headers: { "Content-Type": "application/json" } });
        if (r.ok) { const d = await r.json(); sessionIdRef.current = d.sessionId; }
      } catch { }
    }
    setStatus("playing"); statusRef.current = "playing";
  }, []);

  const togglePause = useCallback(() => {
    setStatus(prev => {
      const next = prev === "playing" ? "paused" : "playing";
      statusRef.current = next;
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    sceneRef.current?.resetGame?.();
    setStatus("idle"); statusRef.current = "idle";
    setScore(0); setKills(0); setWave(1); setElapsed(0);
    setHp(100); setShield(0); setShipLevel(0); setMissileReady(true); setMissilePct(1); setFinalXP(0);
    setBossWave(null); setWaveAnnounce(null);
    scoreRef.current = 0; killsRef.current = 0; waveRef.current = 1; elapsedRef.current = 0;
  }, []);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
      }
      if (e.code === "KeyP" || e.code === "Pause") {
        if (statusRef.current === "playing" || statusRef.current === "paused") { e.preventDefault(); togglePause(); }
        return;
      }
      if (e.code === "KeyF") { e.preventDefault(); toggleFullscreen(); return; }
      if ((e.code === "Space" || e.code === "KeyX") && statusRef.current === "playing") {
        e.preventDefault();
        sceneRef.current?.firePlayerMissile?.();
        if (!mutedRef.current) playMissileSfx(audioRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePause, toggleFullscreen]);

  const fireMissileBtn = () => {
    if (statusRef.current === "playing") {
      sceneRef.current?.firePlayerMissile?.();
      if (!mutedRef.current) playMissileSfx(audioRef.current);
    }
  };

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth <= 680 || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
      setIsMobile(mobile);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const isPlaying = status === "playing";
  const isPaused = status === "paused";
  const isOver = status === "over";
  const isIdle = status === "idle";

  // ── MOBILE FULLSCREEN LAYOUT ──────────────────────────────────────────────
  // NOTE: We always render the Phaser container div via containerRef in the desktop layout.
  // On mobile we overlay a fullscreen UI shell on top of it using position:fixed.
  if (false && isMobile) { // disabled — using overlay approach below instead
    const hcM = hp > 60 ? "#22d3ee" : hp > 30 ? "#f59e0b" : "#ef4444";
    const slColorM = ["#94a3b8", "#22d3ee", "#a78bfa", "#fbbf24"][shipLevel] ?? "#94a3b8";
    return (
      <div style={{ position: "fixed", inset: 0, background: "#020817", zIndex: 9999, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* Death flash */}
        <AnimatePresence>
          {isOver && (
            <motion.div key="df-m" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.6, 0, 0.3, 0] }} exit={{ opacity: 0 }} transition={{ duration: 1.1 }}
              style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none", background: "radial-gradient(ellipse at center,rgba(239,68,68,0.65) 0%,transparent 70%)" }} />
          )}
        </AnimatePresence>

        {/* Boss wave overlay */}
        <AnimatePresence>
          {bossWave && (
            <motion.div key="boss-m" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.2 }} transition={{ type: "spring", damping: 10, stiffness: 200 }}
              style={{ position: "absolute", inset: 0, zIndex: 50, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center", padding: "20px 32px", borderRadius: 16, background: "rgba(4,4,20,0.94)", border: "2px solid rgba(249,115,22,0.8)", boxShadow: "0 0 60px rgba(249,115,22,0.4)" }}>
                <div style={{ fontSize: 42, lineHeight: 1, marginBottom: 6 }}>👹</div>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 22, fontWeight: 900, color: "#f97316" }}>BOSS WAVE</div>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 32, fontWeight: 900, color: "#fff" }}>WAVE {bossWave}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wave announce */}
        <AnimatePresence>
          {waveAnnounce && !bossWave && (
            <motion.div key={`wm${waveAnnounce}`} initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ type: "spring", damping: 14 }}
              style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 40, pointerEvents: "none", padding: "8px 24px", borderRadius: 10, background: "rgba(4,8,24,0.92)", border: "1px solid rgba(34,211,238,0.5)" }}>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, color: "#22d3ee", letterSpacing: "0.2em" }}>WAVE {waveAnnounce}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Canvas fills entire screen — containerRef is shared; actual canvas element is teleported here via CSS */}

        {/* TOP HUD — stats bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, padding: "10px 12px 6px", background: "linear-gradient(to bottom,rgba(2,8,23,0.92) 0%,transparent 100%)", pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
            {/* Left: HP bar */}
            <div style={{ flex: 1, background: "rgba(2,8,23,0.7)", border: `1px solid ${hcM}40`, borderRadius: 8, padding: "4px 8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: "#334155", letterSpacing: "0.1em" }}>HULL</span>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 900, color: hcM }}>{hp}%</span>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${hp}%`, background: `linear-gradient(90deg,${hcM},${hcM}cc)`, borderRadius: 2, transition: "width 0.3s" }} />
              </div>
            </div>
            {/* Center: score/wave/kills */}
            <div style={{ display: "flex", gap: 6 }}>
              {[{l:"SCR",v:score.toLocaleString(),c:"#22d3ee"},{l:"W",v:wave,c:"#a78bfa"},{l:"K",v:kills,c:"#f97316"}].map(s=>(
                <div key={s.l} style={{ textAlign: "center", minWidth: 36 }}>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, color: "#334155", letterSpacing: "0.1em" }}>{s.l}</div>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.v}</div>
                </div>
              ))}
            </div>
            {/* Right: time + mute */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, color: "#334155" }}>TIME</div>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: "#f59e0b" }}>{fmt(elapsed)}</div>
              </div>
              <button onClick={() => setMuted(m => !m)} style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 6px", color: muted ? "#475569" : "#22d3ee", fontSize: 14, cursor: "pointer", pointerEvents: "auto" }}>
                {muted ? "🔇" : "🔊"}
              </button>
            </div>
          </div>
        </div>

        {/* IDLE overlay */}
        <AnimatePresence>
          {isIdle && (
            <motion.div key="idle-m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, zIndex: 15, padding: 24 }}>
              <motion.div animate={{ scale: [1, 1.1, 1], filter: ["drop-shadow(0 0 8px #22d3ee)", "drop-shadow(0 0 28px #22d3ee)", "drop-shadow(0 0 8px #22d3ee)"] }} transition={{ duration: 2.5, repeat: Infinity }} style={{ fontSize: 52 }}>🚀</motion.div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 28, fontWeight: 900, color: "#f8fafc", letterSpacing: "0.08em", textShadow: "0 0 20px rgba(34,211,238,0.6)" }}>STAR SIEGE</div>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#475569", letterSpacing: "0.2em", fontWeight: 600, marginTop: 4 }}>SURVIVE · GROW · DESTROY</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%", maxWidth: 320 }}>
                {[["SWIPE", "MOVE", "#22d3ee"],["DOUBLE TAP", "MISSILE", "#f97316"],["PAUSE BTN", "PAUSE", "#f59e0b"],["KILL ENEMIES", "LEVEL UP", "#a78bfa"]].map(([k,v,c])=>(
                  <div key={k} style={{ padding: "8px 10px", borderRadius: 8, background: `${c}12`, border: `1px solid ${c}35` }}>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: c, letterSpacing: "0.1em", marginBottom: 2 }}>{k}</div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 10, color: "#64748b" }}>{v}</div>
                  </div>
                ))}
              </div>
              <motion.button onClick={startGame} whileTap={{ scale: 0.96 }}
                style={{ width: "100%", maxWidth: 320, padding: "18px 0", borderRadius: 16, background: "linear-gradient(135deg,rgba(34,211,238,0.85),rgba(99,102,241,0.7))", border: "none", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 16, fontWeight: 900, letterSpacing: "0.15em", color: "#020617", boxShadow: "0 0 32px rgba(34,211,238,0.35)" }}>
                🚀 LAUNCH MISSION
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PAUSED overlay */}
        <AnimatePresence>
          {isPaused && (
            <motion.div key="pause-m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, zIndex: 15 }}>
              <div style={{ fontSize: 56, filter: "drop-shadow(0 0 20px rgba(245,158,11,0.7))" }}>⏸</div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 28, fontWeight: 900, color: "#f59e0b" }}>PAUSED</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GAME OVER overlay */}
        <AnimatePresence>
          {isOver && (
            <motion.div key="over-m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, zIndex: 15, padding: 24 }}>
              <motion.div initial={{ scale: 0.3 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 8 }} style={{ fontSize: 52, filter: "drop-shadow(0 0 20px rgba(239,68,68,0.8))" }}>💥</motion.div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 22, fontWeight: 900, color: "#ef4444" }}>SHIP DESTROYED</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, width: "100%", maxWidth: 320 }}>
                {[["SCORE",finalScore.toLocaleString(),"#22d3ee"],["KILLS",finalKills,"#f97316"],["XP",`+${finalXP}`,"#f59e0b"]].map(([l,v,c])=>(
                  <div key={String(l)} style={{ textAlign: "center", padding: "10px 6px", borderRadius: 10, background: `${c}11`, border: `1px solid ${c}33` }}>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: "#475569", marginBottom: 4 }}>{l}</div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 18, fontWeight: 900, color: String(c) }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", maxWidth: 320 }}>
                <motion.button onClick={startGame} whileTap={{ scale: 0.96 }}
                  style={{ padding: "16px 0", borderRadius: 14, background: "linear-gradient(135deg,rgba(34,211,238,0.85),rgba(99,102,241,0.7))", border: "none", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, color: "#020617" }}>
                  🔄 RETRY
                </motion.button>
                <motion.button onClick={reset} whileTap={{ scale: 0.96 }}
                  style={{ padding: "16px 0", borderRadius: 14, background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700, color: "#475569" }}>
                  MENU
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOTTOM HUD — missile + pause buttons */}
        {(isPlaying || isPaused) && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20, padding: "8px 12px 14px", background: "linear-gradient(to top,rgba(2,8,23,0.92) 0%,transparent 100%)", display: "flex", gap: 10, alignItems: "center" }}>
            {/* Shield indicator */}
            <div style={{ flex: "0 0 56px", background: "rgba(2,8,23,0.8)", border: "1px solid rgba(34,211,238,0.3)", borderRadius: 10, padding: "6px 0", textAlign: "center" }}>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, color: "#334155", marginBottom: 2 }}>SHIELD</div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 14, fontWeight: 900, color: "#22d3ee" }}>{shield}</div>
            </div>
            {/* Missile button */}
            <motion.button onClick={fireMissileBtn} whileTap={{ scale: 0.93 }}
              disabled={!isPlaying || !missileReady}
              style={{ flex: 1, padding: "14px 0", borderRadius: 14, background: missileReady && isPlaying ? "linear-gradient(135deg,rgba(249,115,22,0.35),rgba(249,115,22,0.12))" : "rgba(15,23,42,0.5)", border: `2px solid ${missileReady && isPlaying ? "rgba(249,115,22,0.8)" : "rgba(255,255,255,0.06)"}`, cursor: isPlaying && missileReady ? "pointer" : "not-allowed", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, boxShadow: missileReady && isPlaying ? "0 0 24px rgba(249,115,22,0.3)" : "none", position: "relative", overflow: "hidden" }}>
              {!missileReady && isPlaying && (
                <div style={{ position: "absolute", bottom: 0, left: 0, width: `${missilePct * 100}%`, height: 3, background: "#f97316", boxShadow: "0 0 8px #f97316", transition: "width 0.1s linear" }} />
              )}
              <span style={{ fontSize: 24 }}>🚀</span>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 900, color: missileReady && isPlaying ? "#f97316" : "#334155" }}>
                {missileReady ? "MISSILE" : "RELOADING"}
              </span>
              <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 8, color: "#475569" }}>DOUBLE-TAP</span>
            </motion.button>
            {/* Pause button */}
            <motion.button onClick={togglePause} whileTap={{ scale: 0.93 }}
              style={{ flex: "0 0 64px", padding: "14px 0", borderRadius: 14, background: isPaused ? "rgba(245,158,11,0.2)" : "rgba(15,23,42,0.7)", border: `2px solid ${isPaused ? "rgba(245,158,11,0.7)" : "rgba(255,255,255,0.1)"}`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 22 }}>{isPaused ? "▶️" : "⏸️"}</span>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: isPaused ? "#f59e0b" : "#334155" }}>{isPaused ? "RESUME" : "PAUSE"}</span>
            </motion.button>
          </div>
        )}

        <style>{`
          .ss-canvas-container { position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; aspect-ratio: unset !important; }
          .ss-canvas-container canvas { display: block !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; }
          @keyframes ssPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        `}</style>
      </div>
    );
  }
  // ── END MOBILE LAYOUT (disabled conditional above) ─────────────────────────────

  const hpColor = hp > 60 ? "#22d3ee" : hp > 30 ? "#f59e0b" : "#ef4444";
  const hcM = hpColor; // alias for mobile HUD
  const shipLevelLabel = ["SCOUT", "FIGHTER", "CRUISER", "DREADNOUGHT"][shipLevel] ?? "SCOUT";
  const shipLevelColor = ["#94a3b8", "#22d3ee", "#a78bfa", "#fbbf24"][shipLevel] ?? "#94a3b8";
  return (
    <div style={{ width: "100%", minHeight: "100vh", paddingBottom: 48, boxSizing: "border-box", padding: "0 0 48px 0" }}>

      {/* Death flash */}
      <AnimatePresence>
        {isOver && (
          <motion.div key="df" initial={{ opacity: 0 }} animate={{ opacity: [0, 0.6, 0, 0.3, 0] }} exit={{ opacity: 0 }} transition={{ duration: 1.1 }}
            style={{ position: "fixed", inset: 0, zIndex: 10, pointerEvents: "none", background: "radial-gradient(ellipse at center,rgba(239,68,68,0.65) 0%,transparent 70%)" }} />
        )}
      </AnimatePresence>

      {/* Boss wave overlay */}
      <AnimatePresence>
        {bossWave && (
          <motion.div key="boss" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.2, y: -30 }} transition={{ type: "spring", damping: 10, stiffness: 200 }}
            style={{ position: "fixed", inset: 0, zIndex: 50, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", padding: "24px 40px", borderRadius: 20, background: "rgba(4,4,20,0.92)", border: "2px solid rgba(249,115,22,0.8)", boxShadow: "0 0 60px rgba(249,115,22,0.4), inset 0 0 30px rgba(249,115,22,0.08)" }}>
              <motion.div animate={{ scale: [1, 1.12, 1], filter: ["drop-shadow(0 0 10px #f97316)", "drop-shadow(0 0 30px #f97316)", "drop-shadow(0 0 10px #f97316)"] }} transition={{ duration: 0.8, repeat: Infinity }}
                style={{ fontSize: 52, lineHeight: 1, marginBottom: 8 }}>👹</motion.div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(18px,5vw,30px)", fontWeight: 900, color: "#f97316", letterSpacing: "0.1em", textShadow: "0 0 20px rgba(249,115,22,0.8)" }}>BOSS WAVE</div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(24px,6vw,40px)", fontWeight: 900, color: "#fff", marginTop: 4 }}>WAVE {bossWave}</div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 14, color: "#f59e0b", marginTop: 8, fontWeight: 600, letterSpacing: "0.2em" }}>⚠ BOSS INCOMING — BRACE YOURSELF ⚠</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wave announce banner */}
      <AnimatePresence>
        {waveAnnounce && !bossWave && (
          <motion.div key={`w${waveAnnounce}`} initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ type: "spring", damping: 14 }}
            style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 40, pointerEvents: "none", padding: "10px 28px", borderRadius: 12, background: "rgba(4,8,24,0.92)", border: "1px solid rgba(34,211,238,0.5)", boxShadow: "0 0 24px rgba(34,211,238,0.2)" }}>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: "#22d3ee", letterSpacing: "0.2em" }}>WAVE {waveAnnounce}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/games" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", marginBottom: 12, opacity: 0.7 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "1")} onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}>
          <ArrowLeft style={{ width: 13, height: 13, color: "#22d3ee" }} />
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#22d3ee", letterSpacing: "0.3em", textTransform: "uppercase" }}>BACK TO ARCADE</span>
        </Link>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(22px,5vw,46px)", fontWeight: 900, color: "#f8fafc", textTransform: "uppercase", fontStyle: "italic", letterSpacing: "-0.02em", lineHeight: 1, margin: 0 }}>
              STAR <span style={{ color: "#22d3ee", textShadow: "0 0 20px rgba(34,211,238,0.5)" }}>SIEGE</span>
            </h1>
            <p style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 10, fontWeight: 600, color: "#334155", letterSpacing: "0.25em", textTransform: "uppercase", marginTop: 4 }}>SURVIVE · GROW · DESTROY</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setMuted(m => !m)}
              style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(15,23,42,0.7)", border: "1px solid rgba(255,255,255,0.08)", color: muted ? "#475569" : "#22d3ee", fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
              {muted ? "🔇" : "🔊"}
            </button>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#334155", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 3 }}>SESSION XP</div>
              <motion.div key={sessionScore} initial={{ scale: 1.3, color: "#fff" }} animate={{ scale: 1, color: "#22d3ee" }}
                style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(20px,4vw,26px)", fontWeight: 900, filter: "drop-shadow(0 0 10px rgba(34,211,238,0.4))" }}>
                {sessionScore.toLocaleString()}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS BAR */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 10 }}>
        {[
          { label: "SCORE", val: score.toLocaleString(), col: "#22d3ee" },
          { label: "KILLS", val: kills, col: "#f97316" },
          { label: "WAVE", val: wave, col: "#a78bfa" },
          { label: "TIME", val: (isPlaying || isPaused || isOver) ? fmt(elapsed) : "--:--", col: "#f59e0b" },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "10px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, fontWeight: 700, color: "#334155", letterSpacing: "0.2em", textTransform: "uppercase" }}>{s.label}</span>
            <motion.span key={String(s.val)} initial={{ scale: 1.2, y: -3 }} animate={{ scale: 1, y: 0 }}
              style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(12px,3.2vw,20px)", fontWeight: 900, color: s.col, filter: `drop-shadow(0 0 5px ${s.col}80)`, lineHeight: 1 }}>
              {s.val}
            </motion.span>
          </div>
        ))}
      </div>

      {/* HP + SHIELD + SHIP LEVEL BARS */}
      <AnimatePresence>
        {(isPlaying || isPaused || isOver) && (
          <motion.div key="bars" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ marginBottom: 10, maxWidth: 680, margin: "0 auto 10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "8px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Rocket style={{ width: 10, height: 10, color: hpColor }} />
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#334155", letterSpacing: "0.2em" }}>HULL</span>
                  </div>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 900, color: hpColor }}>{hp}%</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                  <motion.div animate={{ width: `${hp}%` }} transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    style={{ height: "100%", background: `linear-gradient(90deg,${hpColor},${hpColor}cc)`, borderRadius: 3, boxShadow: `0 0 8px ${hpColor}80` }} />
                </div>
              </div>
              <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "8px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Shield style={{ width: 10, height: 10, color: "#22d3ee" }} />
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#334155", letterSpacing: "0.2em" }}>SHIELD</span>
                  </div>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 900, color: "#22d3ee" }}>{shield}</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                  <motion.div animate={{ width: `${(shield / 60) * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    style={{ height: "100%", background: "linear-gradient(90deg,#22d3ee,#6366f1)", borderRadius: 3, boxShadow: "0 0 8px rgba(34,211,238,0.5)" }} />
                </div>
              </div>
            </div>
            <div style={{ background: "rgba(15,23,42,0.8)", border: `1px solid ${shipLevelColor}30`, borderRadius: 10, padding: "8px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12 }}>🚀</span>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#334155", letterSpacing: "0.2em" }}>SHIP CLASS</span>
                </div>
                <motion.span key={shipLevelLabel} initial={{ scale: 1.3 }} animate={{ scale: 1 }}
                  style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 900, color: shipLevelColor, textShadow: `0 0 8px ${shipLevelColor}` }}>
                  {shipLevelLabel}
                </motion.span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i <= shipLevel ? shipLevelColor : "rgba(255,255,255,0.06)", boxShadow: i <= shipLevel ? `0 0 6px ${shipLevelColor}80` : "none", transition: "all 0.4s" }} />
                ))}
              </div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 9, color: "#475569", marginTop: 4 }}>
                {shipLevel < 3 ? `${kills} / ${[10, 30, 70][shipLevel]} kills to next class` : "MAX LEVEL REACHED"}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN */}
      <div className="ss-main-col" style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 680, margin: "0 auto" }}>

        {/* MOBILE STATUS STRIP — shown only on mobile instead of full banner */}
        <div className="ss-mobile-status" style={{ display: "none" }}>
          <motion.div key={status} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", borderRadius: 10, background: isOver ? "rgba(239,68,68,0.12)" : isPaused ? "rgba(245,158,11,0.12)" : isPlaying ? "rgba(34,211,238,0.08)" : "rgba(15,23,42,0.6)", border: `1px solid ${isOver ? "rgba(239,68,68,0.4)" : isPaused ? "rgba(245,158,11,0.4)" : isPlaying ? "rgba(34,211,238,0.2)" : "rgba(255,255,255,0.06)"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: isOver ? "#ef4444" : isPaused ? "#f59e0b" : isPlaying ? "#22d3ee" : "#475569", boxShadow: `0 0 6px ${isOver ? "#ef4444" : isPaused ? "#f59e0b" : isPlaying ? "#22d3ee" : "#475569"}`, flexShrink: 0 }} />
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 900, color: isOver ? "#ef4444" : isPaused ? "#f59e0b" : isPlaying ? "#22d3ee" : "#94a3b8" }}>
                {isOver ? "SHIP DESTROYED" : isPaused ? "PAUSED" : isPlaying ? `WAVE ${wave} · ${shipLevelLabel}` : "READY FOR LAUNCH"}
              </span>
            </div>
            {(isPlaying || isPaused) && (
              <button onClick={togglePause} style={{ padding: "4px 10px", borderRadius: 6, background: isPaused ? "rgba(245,158,11,0.2)" : "rgba(34,211,238,0.1)", border: `1px solid ${isPaused ? "rgba(245,158,11,0.5)" : "rgba(34,211,238,0.3)"}`, color: isPaused ? "#f59e0b" : "#22d3ee", fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                {isPaused ? "▶ RESUME" : "⏸ PAUSE"}
              </button>
            )}
          </motion.div>
        </div>

        {/* STATUS BANNER */}
        <motion.div key={status} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="ss-status-banner"
          style={{ background: isOver ? "rgba(4,8,36,0.95)" : isPaused ? "rgba(4,12,36,0.95)" : "rgba(15,23,42,0.85)", backdropFilter: "blur(16px)", border: `1px solid ${isOver ? "rgba(239,68,68,0.5)" : isPaused ? "rgba(245,158,11,0.5)" : isPlaying ? "rgba(34,211,238,0.2)" : "rgba(34,211,238,0.15)"}`, borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, position: "relative", overflow: "hidden" }}>
          {isOver && <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.5, ease: "linear" }} style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(239,68,68,0.12),transparent)", pointerEvents: "none" }} />}
          {isPaused && <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(245,158,11,0.07),transparent)", pointerEvents: "none" }} />}
          <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: isOver ? "#ef4444" : isPaused ? "#f59e0b" : isPlaying ? "#22d3ee" : "#475569", boxShadow: `0 0 8px ${isOver ? "#ef4444" : isPaused ? "#f59e0b" : isPlaying ? "#22d3ee" : "#475569"}`, animation: isPlaying ? "ssPulse 1.5s infinite" : "none" }} />
          <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, color: isOver ? "#ef4444" : isPaused ? "#f59e0b" : isPlaying ? "#22d3ee" : "#94a3b8" }}>
              {isOver ? "SHIP DESTROYED" : isPaused ? "⏸ MISSION PAUSED" : isPlaying ? `WAVE ${wave} · ${shipLevelLabel}` : "READY FOR LAUNCH"}
            </div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, color: "#475569", fontWeight: 600, marginTop: 1 }}>
              {isOver
                ? `Score: ${finalScore.toLocaleString()} · +${finalXP} XP · ${fmt(elapsed)} survived${saving ? " · saving…" : ""}`
                : isPaused ? "Press P or tap Resume to continue · F = Fullscreen"
                  : isPlaying
                    ? `${kills} kills · ${fmt(elapsed)} · P = pause · right-click / SPACE = missile`
                    : "Mouse to move · Right-click / SPACE / Double-tap = missile · P = pause"}
            </div>
          </div>
          {/* Pause / Resume button in status bar */}
          {(isPlaying || isPaused) && (
            <button onClick={togglePause}
              style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 8, background: isPaused ? "rgba(245,158,11,0.2)" : "rgba(34,211,238,0.1)", border: `1px solid ${isPaused ? "rgba(245,158,11,0.6)" : "rgba(34,211,238,0.3)"}`, color: isPaused ? "#f59e0b" : "#22d3ee", fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              {isPaused ? <><Play style={{ width: 10, height: 10 }} /> RESUME</> : <><Pause style={{ width: 10, height: 10 }} /> PAUSE</>}
            </button>
          )}
        </motion.div>

        {/* ── GAME CANVAS WRAPPER ── */}
        {/* This div is what gets fullscreened */}
        <div
          ref={gameWrapperRef}
          className="ss-game-wrapper"
          style={{
            background: "#020817",
            borderRadius: 18,
            overflow: "hidden",
            position: "relative",
            boxShadow: isPlaying ? "0 0 0 2px rgba(34,211,238,0.25),0 0 40px rgba(34,211,238,0.12)" : isOver ? "0 0 0 2px rgba(239,68,68,0.25),0 0 28px rgba(239,68,68,0.18)" : "0 0 0 1px rgba(34,211,238,0.08),0 6px 32px rgba(0,0,0,0.8)",
            transition: "box-shadow 0.4s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Fullscreen border corners */}
          {isFullscreen && (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 15 }}>
              <div style={{ position: "absolute", inset: 0, border: "2px solid rgba(34,211,238,0.45)", borderRadius: 0 }} />
              {[["top:12px;left:12px;border-top:3px solid #22d3ee;border-left:3px solid #22d3ee", "0s"],
                ["top:12px;right:12px;border-top:3px solid #22d3ee;border-right:3px solid #22d3ee", "0.5s"],
                ["bottom:12px;left:12px;border-bottom:3px solid #22d3ee;border-left:3px solid #22d3ee", "1s"],
                ["bottom:12px;right:12px;border-bottom:3px solid #22d3ee;border-right:3px solid #22d3ee", "1.5s"]].map(([s, delay], i) => (
                <div key={i} style={{ position: "absolute", width: 30, height: 30, ...Object.fromEntries(s.split(";").map(p => { const [k, v] = p.split(":"); return [k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v.trim()]; })), animation: `ssCornerPulse 2s infinite ${delay}` } as any} />
              ))}
              <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "rgba(34,211,238,0.7)", letterSpacing: "0.3em", background: "rgba(2,8,23,0.7)", padding: "3px 12px", borderRadius: 4, border: "1px solid rgba(34,211,238,0.2)" }}>STAR SIEGE</div>
            </div>
          )}

          {/* Fullscreen / exit button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (Esc / F)" : "Fullscreen (F)"}
            style={{ position: "absolute", top: 12, right: 12, zIndex: 20, background: "rgba(15,23,42,0.85)", border: "1px solid rgba(34,211,238,0.35)", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "#22d3ee", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)", transition: "background 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(34,211,238,0.15)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(15,23,42,0.85)")}>
            {isFullscreen ? <Minimize style={{ width: 14, height: 14 }} /> : <Maximize style={{ width: 14, height: 14 }} />}
          </button>

          {/* Pause button inside canvas on mobile */}
          {(isPlaying || isPaused) && (
            <button
              onClick={togglePause}
              style={{ position: "absolute", top: 12, left: 12, zIndex: 20, background: isPaused ? "rgba(245,158,11,0.2)" : "rgba(15,23,42,0.85)", border: `1px solid ${isPaused ? "rgba(245,158,11,0.6)" : "rgba(34,211,238,0.3)"}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: isPaused ? "#f59e0b" : "#22d3ee", display: "flex", alignItems: "center", gap: 4, backdropFilter: "blur(8px)" }}>
              {isPaused ? <Play style={{ width: 12, height: 12 }} /> : <Pause style={{ width: 12, height: 12 }} />}
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700 }}>{isPaused ? "RESUME" : "PAUSE"}</span>
            </button>
          )}

          {/* The actual Phaser canvas container — ALWAYS square in normal mode, ALWAYS fills screen in fullscreen */}
          <div
            ref={containerRef}
            className="ss-canvas-container"
          />

          {/* Sci-fi border frame */}
          {(() => {
            const fc = isOver ? "#ef4444" : isPaused ? "#f59e0b" : isPlaying ? "#22d3ee" : "#334155";
            const fa = isOver ? 0.9 : isPlaying || isPaused ? 1 : 0.5;
            const cL = 38, cT = 3, edgeO = 0.22;
            const hex = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
            return (
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 12 }}>
                <div style={{ position: "absolute", top: 0, left: cL, right: cL, height: cT, background: `linear-gradient(90deg,transparent,${fc}${hex(edgeO)},${fc}${hex(edgeO)},transparent)` }} />
                <div style={{ position: "absolute", bottom: 0, left: cL, right: cL, height: cT, background: `linear-gradient(90deg,transparent,${fc}${hex(edgeO)},${fc}${hex(edgeO)},transparent)` }} />
                <div style={{ position: "absolute", left: 0, top: cL, bottom: cL, width: cT, background: `linear-gradient(180deg,transparent,${fc}${hex(edgeO)},${fc}${hex(edgeO)},transparent)` }} />
                <div style={{ position: "absolute", right: 0, top: cL, bottom: cL, width: cT, background: `linear-gradient(180deg,transparent,${fc}${hex(edgeO)},${fc}${hex(edgeO)},transparent)` }} />
                {/* Corner brackets */}
                {[
                  { top: 0, left: 0, borderTop: `${cT}px solid ${fc}`, borderLeft: `${cT}px solid ${fc}` },
                  { top: 0, right: 0, borderTop: `${cT}px solid ${fc}`, borderRight: `${cT}px solid ${fc}` },
                  { bottom: 0, left: 0, borderBottom: `${cT}px solid ${fc}`, borderLeft: `${cT}px solid ${fc}` },
                  { bottom: 0, right: 0, borderBottom: `${cT}px solid ${fc}`, borderRight: `${cT}px solid ${fc}` },
                ].map((s, i) => (
                  <div key={i} style={{ position: "absolute", width: cL, height: cL, opacity: fa, ...s }} />
                ))}
                {/* Mid ticks */}
                {[-0.25, 0, 0.25].map(offset => (
                  <div key={`t${offset}`}>
                    <div style={{ position: "absolute", top: 0, left: `calc(50% + ${offset * 100}% - 1px)`, width: 2, height: offset === 0 ? 10 : 6, background: fc, opacity: fa * (offset === 0 ? 0.9 : 0.5) }} />
                    <div style={{ position: "absolute", bottom: 0, left: `calc(50% + ${offset * 100}% - 1px)`, width: 2, height: offset === 0 ? 10 : 6, background: fc, opacity: fa * (offset === 0 ? 0.9 : 0.5) }} />
                    <div style={{ position: "absolute", left: 0, top: `calc(50% + ${offset * 100}% - 1px)`, height: 2, width: offset === 0 ? 10 : 6, background: fc, opacity: fa * (offset === 0 ? 0.9 : 0.5) }} />
                    <div style={{ position: "absolute", right: 0, top: `calc(50% + ${offset * 100}% - 1px)`, height: 2, width: offset === 0 ? 10 : 6, background: fc, opacity: fa * (offset === 0 ? 0.9 : 0.5) }} />
                  </div>
                ))}
                {/* Scan line while playing */}
                {isPlaying && (
                  <motion.div animate={{ top: ["2%", "98%", "2%"] }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                    style={{ position: "absolute", left: cT, right: cT, height: 2, background: `linear-gradient(90deg,transparent,${fc}44,${fc}99,${fc}44,transparent)`, boxShadow: `0 0 12px ${fc}66`, pointerEvents: "none" }} />
                )}
                <div style={{ position: "absolute", top: 6, left: cL + 8, fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: "0.22em", color: fc, opacity: fa * 0.85, textTransform: "uppercase", textShadow: `0 0 8px ${fc}` }}>
                  {isOver ? "DESTROYED" : isPaused ? "PAUSED" : isPlaying ? "ACTIVE" : "STANDBY"}
                </div>
                <div style={{ position: "absolute", bottom: 6, right: cL + 8, fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: "0.18em", color: fc, opacity: fa * 0.65, textAlign: "right" }}>
                  {isPlaying || isPaused ? `W${String(wave).padStart(2, "0")} · K${String(kills).padStart(3, "0")}` : "SYS::READY"}
                </div>
              </div>
            );
          })()}

          {/* IDLE overlay */}
          <AnimatePresence>
            {isIdle && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, pointerEvents: isMobile ? "auto" : "none", zIndex: 5 }}>
                <motion.div animate={{ scale: [1, 1.1, 1], filter: ["drop-shadow(0 0 8px #22d3ee)", "drop-shadow(0 0 28px #22d3ee)", "drop-shadow(0 0 8px #22d3ee)"] }} transition={{ duration: 2.5, repeat: Infinity }} style={{ fontSize: "clamp(24px,6vw,44px)" }}>🚀</motion.div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(14px,4vw,20px)", fontWeight: 900, color: "#f8fafc", letterSpacing: "0.1em", textShadow: "0 0 20px rgba(34,211,238,0.6)" }}>STAR SIEGE</p>
                  <p style={{ margin: "4px 0 0", fontFamily: "'Rajdhani',sans-serif", fontSize: "clamp(9px,2.5vw,11px)", color: "#475569", letterSpacing: "0.2em", fontWeight: 600 }}>SURVIVE · GROW YOUR SHIP · DESTROY THE SWARM</p>
                </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  {[["MOUSE / SWIPE", "MOVE SHIP", "#22d3ee"], ["RIGHT-CLICK / SPACE", "MISSILE STRIKE", "#f97316"], ["DOUBLE TAP", "MISSILE (MOBILE)", "#f97316"], ["P KEY", "PAUSE / RESUME", "#f59e0b"], ["F KEY", "FULLSCREEN", "#a78bfa"]].map(([k, v, c]) => (
                    <div key={k} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <div style={{ padding: "1px 6px", borderRadius: 4, background: `${c}12`, border: `1px solid ${c}35`, fontFamily: "'Orbitron',sans-serif", fontSize: 6, color: c }}>{k}</div>
                      <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 8, color: "#475569" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PAUSED overlay */}
          <AnimatePresence>
            {isPaused && (
              <motion.div key="paused" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, pointerEvents: "none", zIndex: 5 }}>
                <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }} transition={{ duration: 1.6, repeat: Infinity }}
                  style={{ fontSize: "clamp(36px,12vw,64px)", filter: "drop-shadow(0 0 20px rgba(245,158,11,0.7))" }}>⏸</motion.div>
                <p style={{ margin: 0, fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(16px,5vw,26px)", fontWeight: 900, color: "#f59e0b", textShadow: "0 0 20px rgba(245,158,11,0.6)" }}>PAUSED</p>
                <p style={{ margin: 0, fontFamily: "'Rajdhani',sans-serif", fontSize: "clamp(10px,3vw,13px)", color: "#64748b", letterSpacing: "0.15em" }}>PRESS P · TAP RESUME TO CONTINUE</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* GAME OVER overlay */}
          <AnimatePresence>
            {isOver && (
              <motion.div key="over" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, pointerEvents: "none", zIndex: 5 }}>
                <motion.div initial={{ scale: 0.3, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 8, stiffness: 180 }}
                  style={{ fontSize: "clamp(28px,9vw,52px)", filter: "drop-shadow(0 0 20px rgba(239,68,68,0.8))" }}>💥</motion.div>
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  style={{ margin: 0, fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(13px,4vw,22px)", fontWeight: 900, color: "#ef4444" }}>SHIP DESTROYED</motion.p>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ display: "flex", gap: 14 }}>
                  {[["SCORE", finalScore.toLocaleString(), "#22d3ee"], ["KILLS", finalKills, "#f97316"], ["XP", `+${finalXP}`, "#f59e0b"]].map(([l, v, c]) => (
                    <div key={String(l)} style={{ textAlign: "center" }}>
                      <p style={{ margin: 0, fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: "#475569", fontWeight: 700, letterSpacing: "0.2em" }}>{l}</p>
                      <p style={{ margin: "3px 0 0", fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(14px,4vw,20px)", fontWeight: 900, color: String(c), textShadow: `0 0 10px ${c}` }}>{v}</p>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* IN-GAME HUD */}
          <AnimatePresence>
            {isPlaying && (
              <motion.div key="hud" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="ss-hud-bar"
                style={{ position: "absolute", bottom: 10, left: 10, right: 10, zIndex: 10, pointerEvents: "none", display: "flex", gap: 6 }}>
                <div style={{ flex: 1, background: "rgba(2,8,23,0.82)", border: `1px solid ${hp > 60 ? "rgba(34,211,238,0.45)" : hp > 30 ? "rgba(245,158,11,0.45)" : "rgba(239,68,68,0.6)"}`, borderRadius: 8, padding: "5px 8px", backdropFilter: "blur(8px)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(5px,1.8vw,8px)", fontWeight: 700, color: "#334155", letterSpacing: "0.12em" }}>HULL</span>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(6px,2vw,9px)", fontWeight: 900, color: hp > 60 ? "#22d3ee" : hp > 30 ? "#f59e0b" : "#ef4444" }}>{hp}%</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${hp}%`, background: hp > 60 ? "linear-gradient(90deg,#22d3ee,#6366f1)" : hp > 30 ? "linear-gradient(90deg,#f59e0b,#ef4444)" : "linear-gradient(90deg,#ef4444,#dc2626)", borderRadius: 2, boxShadow: `0 0 6px ${hp > 60 ? "#22d3ee" : hp > 30 ? "#f59e0b" : "#ef4444"}80`, transition: "width 0.3s ease" }} />
                  </div>
                </div>
                <div style={{ width: 54, background: "rgba(2,8,23,0.82)", border: "1px solid rgba(34,211,238,0.3)", borderRadius: 8, padding: "5px 7px", backdropFilter: "blur(8px)", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(4px,1.4vw,7px)", color: "#334155", letterSpacing: "0.08em", marginBottom: 2 }}>SHIELD</div>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(7px,2.2vw,11px)", fontWeight: 900, color: "#22d3ee" }}>{shield}</div>
                </div>
                <div style={{ width: 52, background: "rgba(2,8,23,0.82)", border: "1px solid rgba(249,115,22,0.35)", borderRadius: 8, padding: "5px 7px", backdropFilter: "blur(8px)", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(4px,1.4vw,7px)", color: "#334155", letterSpacing: "0.08em", marginBottom: 2 }}>KILLS</div>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(7px,2.2vw,11px)", fontWeight: 900, color: "#f97316" }}>{kills}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* MISSILE BUTTON */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center" }}>
          <motion.button onClick={fireMissileBtn} whileHover={isPlaying ? { scale: 1.05 } : {}} whileTap={isPlaying ? { scale: 0.93 } : {}}
            disabled={!isPlaying || !missileReady}
            style={{ flex: 1, maxWidth: 260, padding: "14px 0", borderRadius: 14, background: missileReady && isPlaying ? "linear-gradient(135deg,rgba(249,115,22,0.28),rgba(249,115,22,0.1))" : "rgba(15,23,42,0.35)", border: `2px solid ${missileReady && isPlaying ? "rgba(249,115,22,0.75)" : "rgba(255,255,255,0.05)"}`, cursor: isPlaying && missileReady ? "pointer" : "not-allowed", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, boxShadow: missileReady && isPlaying ? "0 0 22px rgba(249,115,22,0.28)" : "none", transition: "all 0.3s", position: "relative", overflow: "hidden" }}>
            {!missileReady && isPlaying && (
              <motion.div animate={{ width: `${missilePct * 100}%` }} style={{ position: "absolute", bottom: 0, left: 0, height: 3, background: "#f97316", boxShadow: "0 0 8px #f97316", transition: "width 0.1s linear" }} />
            )}
            <span style={{ fontSize: 22 }}>🚀</span>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 900, color: missileReady && isPlaying ? "#f97316" : "#334155", letterSpacing: "0.15em" }}>
              {missileReady ? "MISSILE" : "RELOADING"}
            </span>
            <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 8, color: "#475569" }}>RIGHT-CLICK · SPACE · DOUBLE-TAP</span>
          </motion.button>

          {/* Pause button on mobile (extra large tap target) */}
          <motion.button onClick={togglePause} whileTap={{ scale: 0.93 }}
            disabled={!isPlaying && !isPaused}
            style={{ width: 72, padding: "14px 0", borderRadius: 14, background: isPaused ? "rgba(245,158,11,0.18)" : "rgba(15,23,42,0.5)", border: `2px solid ${isPaused ? "rgba(245,158,11,0.7)" : "rgba(255,255,255,0.08)"}`, cursor: isPlaying || isPaused ? "pointer" : "not-allowed", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all 0.3s" }}>
            <span style={{ fontSize: 20 }}>{isPaused ? "▶️" : "⏸️"}</span>
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: isPaused ? "#f59e0b" : "#334155", letterSpacing: "0.1em" }}>{isPaused ? "RESUME" : "PAUSE"}</span>
          </motion.button>

          <div className="ss-auto-ind" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <Target style={{ width: 14, height: 14, color: "#334155" }} />
            <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: "#1e293b", letterSpacing: "0.1em" }}>AUTO</span>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: isPlaying ? "#22d3ee" : "#1e293b", boxShadow: isPlaying ? "0 0 8px #22d3ee" : "none", animation: isPlaying ? "ssPulse 0.8s infinite" : "none" }} />
          </div>
        </div>

        {/* XP Result card */}
        <AnimatePresence>
          {isOver && (
            <motion.div key="xp" ref={gameOverRef} initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", damping: 14, stiffness: 220 }}
              style={{ background: "rgba(4,8,24,0.96)", backdropFilter: "blur(16px)", border: "2px solid rgba(249,115,22,0.4)", borderRadius: 18, padding: "18px 16px", boxShadow: "0 0 36px rgba(249,115,22,0.12)", position: "relative", overflow: "hidden" }}>
              <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1, ease: "linear" }}
                style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(249,115,22,0.07),transparent)", pointerEvents: "none" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Zap style={{ width: 28, height: 28, color: "#f59e0b", filter: "drop-shadow(0 0 10px rgba(245,158,11,0.6))", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(11px,3vw,15px)", fontWeight: 900, color: "#f97316" }}>MISSION COMPLETE</div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 10, color: "#22d3ee", fontWeight: 600, marginTop: 1 }}>WAVE {wave} · {finalKills} KILLS · {fmt(elapsed)} SURVIVED</div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 9, color: "#475569", marginTop: 2 }}>XP = {Math.floor(elapsed / 3)} survival + {finalKills * 2} kill bonus</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, color: "#334155", letterSpacing: "0.2em", marginBottom: 2 }}>TOTAL XP</div>
                  <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 9, delay: 0.2 }}
                    style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(26px,7vw,42px)", fontWeight: 900, color: "#f59e0b", filter: "drop-shadow(0 0 16px rgba(245,158,11,0.65))", lineHeight: 1 }}>
                    +{finalXP}
                  </motion.div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7, marginTop: 14 }}>
                {[["SCORE", finalScore.toLocaleString(), "#22d3ee"], ["KILLS", finalKills, "#f97316"], ["WAVE", wave, "#a78bfa"], ["TIME", fmt(elapsed), "#f59e0b"]].map(([l, v, c]) => (
                  <div key={String(l)} style={{ padding: "8px 6px", borderRadius: 9, background: `${c}11`, border: `1px solid ${c}33`, textAlign: "center" }}>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, color: "#475569", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2 }}>{l}</div>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900, color: String(c) }}>{v}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ACTION BUTTONS */}
        {isIdle && (
          <motion.button onClick={startGame} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
            style={{ width: "100%", padding: "clamp(13px,3vw,17px)", borderRadius: 15, background: "linear-gradient(135deg,rgba(34,211,238,0.85),rgba(99,102,241,0.7))", border: "none", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(12px,3vw,15px)", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase", color: "#020617", boxShadow: "0 0 28px rgba(34,211,238,0.28)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, position: "relative", overflow: "hidden" }}>
            <motion.div animate={{ x: ["-100%", "200%"] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.8, ease: "linear" }}
              style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)", pointerEvents: "none" }} />
            <Rocket style={{ width: 18, height: 18 }} /> LAUNCH MISSION
          </motion.button>
        )}
        {isOver && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <motion.button onClick={startGame} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
              style={{ padding: 14, borderRadius: 15, background: "linear-gradient(135deg,rgba(34,211,238,0.85),rgba(99,102,241,0.7))", border: "none", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", color: "#020617", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <RefreshCw style={{ width: 13, height: 13 }} /> RETRY
            </motion.button>
            <motion.button onClick={reset} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              style={{ padding: 14, borderRadius: 15, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              MAIN MENU
            </motion.button>
          </div>
        )}
      </div>

      {/* LEADERBOARD */}
      <div className="ss-section" style={{ marginTop: 28, maxWidth: 680, margin: "28px auto 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 22, height: 2, background: "linear-gradient(90deg,#f59e0b,#ef4444)", borderRadius: 1 }} />
          <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.3em", textTransform: "uppercase" }}>TOP PILOTS</span>
        </div>
        <div style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
          <div className="ss-lb-head" style={{ display: "grid", gridTemplateColumns: "44px 1fr 100px 68px", gap: 10, padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            {["RANK", "PILOT", "HIGH SCORE", "XP"].map(h => <span key={h} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#475569", letterSpacing: "0.25em", textTransform: "uppercase" }}>{h}</span>)}
          </div>
          {lbLoad ? (
            <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              {[...Array(5)].map((_, i) => <div key={i} style={{ height: 36, borderRadius: 8, background: "rgba(255,255,255,0.03)", animation: "ssSkel 1.5s infinite", animationDelay: `${i * 0.1}s` }} />)}
            </div>
          ) : lb.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <Grid3X3 style={{ width: 22, height: 22, color: "#334155", margin: "0 auto 8px" }} />
              <p style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, color: "#475569", letterSpacing: "0.15em" }}>NO PILOTS YET — BE FIRST!</p>
            </div>
          ) : lb.map((e, i) => {
            const top3 = i < 3, rankColor = i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : "#b45309";
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.035 }}
                className="ss-lb-head"
                style={{ display: "grid", gridTemplateColumns: "44px 1fr 100px 68px", gap: 10, padding: "11px 18px", borderBottom: i < lb.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center", background: top3 ? `rgba(${i === 0 ? "245,158,11" : i === 1 ? "148,163,184" : "180,83,9"},0.04)` : "transparent" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>{rankIcon(i)}</div>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: top3 ? "#f8fafc" : "#475569", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.user.username}</span>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13, fontWeight: 900, color: top3 ? rankColor : "#f97316" }}>{(e.highScore ?? 0).toLocaleString()}</span>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 700, color: "#22d3ee" }}>{(e.totalXp ?? 0).toLocaleString()}</span>
              </motion.div>
            );
          })}
          {user && (
            <div className="ss-lb-head" style={{ display: "grid", gridTemplateColumns: "44px 1fr 100px 68px", gap: 10, padding: "10px 18px", borderTop: "1px solid rgba(255,255,255,0.04)", alignItems: "center", background: "rgba(99,102,241,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#22d3ee)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 900, color: "#fff" }}>{user.username[0].toUpperCase()}</span>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 6, color: "#6366f1", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 1 }}>YOU</div>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#f8fafc" }}>{user.username}</div>
              </div>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 700, color: "#f97316" }}>{finalScore > 0 ? finalScore.toLocaleString() : "—"}</span>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, fontWeight: 700, color: "#22d3ee" }}>{sessionScore > 0 ? sessionScore.toLocaleString() : "—"}</span>
            </div>
          )}
        </div>
      </div>

      {/* MISSION LOG */}
      <AnimatePresence>
        {hist.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="ss-section" style={{ marginTop: 28, maxWidth: 680, margin: "28px auto 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 22, height: 2, background: "linear-gradient(90deg,#22d3ee,#6366f1)", borderRadius: 1 }} />
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, color: "#22d3ee", letterSpacing: "0.3em", textTransform: "uppercase" }}>MISSION LOG</span>
            </div>
            <div style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, overflow: "hidden" }}>
              <div className="ss-hist-head" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 70px 70px 70px", gap: 10, padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {["SCORE", "KILLS", "WAVE", "TIME", "WHEN"].map(h => <span key={h} style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, color: "#475569", letterSpacing: "0.25em", textTransform: "uppercase" }}>{h}</span>)}
              </div>
              {hist.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="ss-hist-head ss-hist-row"
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr 70px 70px 70px", gap: 10, padding: "11px 18px", borderBottom: i < hist.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", alignItems: "center" }}>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: "#22d3ee" }}>{r.score.toLocaleString()}</span>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: "#f97316" }}>{r.kills}</span>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 900, color: "#a78bfa" }}>{r.wave}</span>
                  <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 600, color: "#64748b" }}>{fmt(r.survivalTime)}</span>
                  <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>{r.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes ssPulse       { 0%,100%{opacity:1;box-shadow:0 0 8px #22d3ee} 50%{opacity:0.3;box-shadow:0 0 3px #22d3ee} }
        @keyframes ssSkel        { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes ssCornerPulse { 0%,100%{opacity:1;filter:drop-shadow(0 0 6px #22d3ee)} 50%{opacity:0.65;filter:drop-shadow(0 0 2px #22d3ee)} }

        /* ── Canvas container: fills its wrapper, Phaser canvas fills the container ── */
        .ss-canvas-container {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;   /* desktop default: square */
          min-height: 200px;
          overflow: hidden;
          cursor: crosshair;
          outline: none;
        }
        .ss-canvas-container canvas {
          display: block !important;
          position: absolute !important;
          top: 0 !important; left: 0 !important;
          width: 100% !important; height: 100% !important;
        }

        /* Mobile: portrait canvas ratio */
        @media (max-width: 680px) {
          .ss-canvas-container { aspect-ratio: 3 / 4 !important; min-height: unset !important; }
        }

        /* ── FULLSCREEN: wrapper + container both fill every pixel of the screen ── */
        .ss-game-wrapper:fullscreen,
        .ss-game-wrapper:-webkit-full-screen,
        .ss-game-wrapper:-moz-full-screen {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important; height: 100vh !important;
          max-width: 100vw !important; max-height: 100vh !important;
          margin: 0 !important; padding: 0 !important;
          border-radius: 0 !important;
          background: #020817 !important;
          overflow: hidden !important;
          display: block !important;
        }
        /* Inside fullscreen: canvas container must fill the full wrapper, no aspect-ratio */
        .ss-game-wrapper:fullscreen .ss-canvas-container,
        .ss-game-wrapper:-webkit-full-screen .ss-canvas-container,
        .ss-game-wrapper:-moz-full-screen .ss-canvas-container {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important; height: 100% !important;
          aspect-ratio: unset !important;    /* KILL the aspect-ratio — fill the screen */
          min-height: unset !important;
        }

        /* ── MOBILE: natural scrollable page layout ── */
        @media (max-width: 680px) {
          /* Show mobile strip, hide desktop banner */
          .ss-mobile-status { display: block !important; }
          .ss-status-banner { display: none !important; }
          /* Game wrapper: stays in natural flow */
          .ss-game-wrapper { border-radius: 12px !important; }
          /* Leaderboard: drop XP column */
          .ss-lb-head { grid-template-columns: 36px 1fr 90px !important; gap: 6px !important; padding: 9px 12px !important; }
          .ss-lb-head > *:nth-child(4) { display: none !important; }
          /* History: score + kills + wave only */
          .ss-hist-head { grid-template-columns: 1fr 60px 50px !important; gap: 6px !important; padding: 9px 12px !important; }
          .ss-hist-row > *:nth-child(4), .ss-hist-row > *:nth-child(5) { display: none !important; }
          /* In-canvas HUD bar */
          .ss-hud-bar { bottom: 6px !important; left: 6px !important; right: 6px !important; gap: 4px !important; }
          /* Auto-fire indicator: hide */
          .ss-auto-ind { display: none !important; }
          /* Back link: tighter */
          .ss-back-link { margin-bottom: 8px !important; }
          /* Main col gap */
          .ss-main-col { gap: 8px !important; }
          /* Section margins */
          .ss-section { margin-top: 20px !important; }
        }
      `}</style>
    </div>
  );
}
