// Procedural battle effects at GBC resolution: per-type move animations,
// stat sparkles, status puffs, send-out puffs, capture stars and weather.

import type { StatusId, TypeId, Weather } from "../contracts";
import { TYPE_COLORS } from "../screens/kit/draw";

type Shape = "px" | "leaf" | "drop" | "ember" | "petal" | "spore" | "wisp" | "thorn" | "shard" | "flake" | "slash" | "star" | "arrow_up" | "arrow_down" | "z" | "bubble" | "spark" | "jaw";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  ax?: number; ay?: number;
  life: number; max: number;
  delay: number;
  shape: Shape;
  color: string;
  color2?: string;
  /** Orbit around (cx, cy) instead of linear motion. */
  orbit?: { cx: number; cy: number; r: number; a: number; va: number; vr: number };
  /** Move from (x, y) to target over life (linear interp). */
  to?: { x: number; y: number; arc: number; sx: number; sy: number };
  size?: number;
  flip?: boolean;
}

export const ENEMY_CENTER = { x: 124, y: 30 };
export const PLAYER_CENTER = { x: 32, y: 66 };

export class Fx {
  particles: Particle[] = [];
  /** Full-screen flash colour for a frame or two. */
  flash: { color: string; frames: number } | null = null;
  frame = 0;

  clear() {
    this.particles = [];
    this.flash = null;
  }

  get busy() {
    return this.particles.length > 0;
  }

  private add(p: Partial<Particle> & Pick<Particle, "x" | "y" | "shape" | "color" | "max">) {
    this.particles.push({ vx: 0, vy: 0, life: 0, delay: 0, ...p });
  }

  update() {
    this.frame++;
    if (this.flash && --this.flash.frames <= 0) this.flash = null;
    for (const p of this.particles) {
      if (p.delay > 0) { p.delay--; continue; }
      p.life++;
      if (p.orbit) {
        p.orbit.a += p.orbit.va;
        p.orbit.r += p.orbit.vr;
        p.x = p.orbit.cx + Math.cos(p.orbit.a) * p.orbit.r;
        p.y = p.orbit.cy + Math.sin(p.orbit.a) * p.orbit.r * 0.6;
      } else if (p.to) {
        const t = Math.min(1, p.life / p.max);
        p.x = p.to.sx + (p.to.x - p.to.sx) * t;
        p.y = p.to.sy + (p.to.y - p.to.sy) * t - Math.sin(t * Math.PI) * p.to.arc;
      } else {
        p.vx += p.ax ?? 0;
        p.vy += p.ay ?? 0;
        p.x += p.vx;
        p.y += p.vy;
      }
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
  }

  draw(g: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      if (p.delay > 0) continue;
      drawShape(g, p, this.frame);
    }
  }

  drawFlash(g: CanvasRenderingContext2D) {
    if (!this.flash) return;
    g.fillStyle = this.flash.color;
    g.fillRect(0, 0, 160, 144);
  }

  // -------------------------------------------------------------------------
  // Move animations (≈ 36 frames)
  // -------------------------------------------------------------------------

  /** Spawn a move animation; returns its length in frames. */
  move(type: TypeId, category: "physical" | "special" | "status", from: { x: number; y: number }, to: { x: number; y: number }, selfTarget: boolean): number {
    const c = TYPE_COLORS[type] ?? TYPE_COLORS.wood;
    const at = selfTarget ? from : to;
    const R = (a: number, b: number) => a + Math.random() * (b - a);
    if (selfTarget) {
      // gather/glow around the user
      for (let i = 0; i < 14; i++) {
        this.add({
          x: at.x, y: at.y, shape: i % 2 ? "spark" : "star", color: i % 3 ? c.light : "#ffffff", max: 26, delay: i * 2,
          orbit: { cx: at.x, cy: at.y, r: 26, a: (i / 14) * Math.PI * 2, va: 0.12, vr: -0.8 },
        });
      }
      return 52;
    }
    switch (type) {
      case "wood":
        for (let i = 0; i < 12; i++) this.add({
          x: from.x, y: from.y, shape: "leaf", color: i % 2 ? c.mid : c.light, color2: c.dark, max: 22, delay: i * 2, flip: i % 2 === 0,
          to: { sx: from.x + R(-6, 6), sy: from.y + R(-6, 6), x: to.x + R(-12, 12), y: to.y + R(-12, 12), arc: R(8, 22) },
        });
        return 48;
      case "fire":
        for (let i = 0; i < 22; i++) this.add({
          x: to.x + R(-18, 18), y: to.y + R(4, 20), vx: R(-0.3, 0.3), vy: R(-1.4, -0.6), shape: "ember",
          color: i % 3 === 0 ? "#f8e070" : c.mid, color2: c.dark, max: R(18, 28), delay: Math.floor(i * 1.2),
        });
        if (category === "special") for (let i = 0; i < 6; i++) this.add({
          x: from.x, y: from.y, shape: "ember", color: "#f8e070", color2: c.mid, max: 16, delay: i * 2,
          to: { sx: from.x, sy: from.y, x: to.x + R(-6, 6), y: to.y + R(-6, 6), arc: 6 },
        });
        return 46;
      case "water":
        for (let i = 0; i < 14; i++) this.add({
          x: from.x, y: from.y, shape: "drop", color: c.mid, color2: c.light, max: 18, delay: i * 2,
          to: { sx: from.x + R(-4, 4), sy: from.y - 4, x: to.x + R(-10, 10), y: to.y + R(-8, 8), arc: R(10, 26) },
        });
        for (let i = 0; i < 10; i++) this.add({
          x: to.x + R(-8, 8), y: to.y + 12, vx: R(-1.2, 1.2), vy: R(-1.8, -0.8), ay: 0.12, shape: "px", color: c.light, max: 18, delay: 26,
        });
        return 48;
      case "bug":
        this.add({ x: to.x, y: to.y, shape: "jaw", color: c.dark, color2: c.mid, max: 24, delay: 0 });
        for (let i = 0; i < 10; i++) this.add({
          x: to.x + R(-14, 14), y: to.y + R(-14, 14), vx: R(-1, 1), vy: R(-1, 1), shape: "px", color: c.mid, max: 14, delay: 14 + i,
        });
        return 40;
      case "bloom":
        for (let i = 0; i < 16; i++) this.add({
          x: to.x, y: to.y, shape: i % 3 === 0 ? "spore" : "petal", color: i % 2 ? c.mid : c.light, color2: "#f8f0a0", max: 32, delay: i,
          orbit: { cx: to.x, cy: to.y, r: 30, a: (i / 16) * Math.PI * 2, va: 0.1, vr: -0.75 },
        });
        return 48;
      case "ghost":
        for (let i = 0; i < 8; i++) this.add({
          x: to.x, y: to.y, shape: "wisp", color: c.mid, color2: c.light, max: 36, delay: i * 2,
          orbit: { cx: to.x, cy: to.y, r: 6, a: (i / 8) * Math.PI * 2, va: 0.18, vr: 0.6 },
        });
        return 50;
      case "thorn":
        for (let i = 0; i < 8; i++) this.add({
          x: from.x, y: from.y, shape: "thorn", color: c.dark, color2: c.light, max: 10, delay: i * 3,
          to: { sx: from.x + R(-8, 8), sy: from.y + R(-8, 8), x: to.x + R(-10, 10), y: to.y + R(-10, 10), arc: 0 },
        });
        return 40;
      case "frost":
        for (let i = 0; i < 14; i++) this.add({
          x: from.x, y: from.y, shape: i % 2 ? "shard" : "flake", color: "#ffffff", color2: c.dark, max: 20, delay: i * 2,
          to: { sx: from.x + R(-10, 10), sy: from.y + R(-10, 10), x: to.x + R(-14, 14), y: to.y + R(-14, 14), arc: R(-6, 6) },
        });
        return 48;
      case "dragon":
        for (let i = 0; i < 4; i++) this.add({ x: to.x + (i - 1.5) * 8, y: to.y, shape: "slash", color: c.mid, color2: c.dark, max: 12, delay: i * 4 });
        return 34;
      default:
        return 30;
    }
  }

  /** Stat stage change sparkle (arrows rising or falling). */
  stat(at: { x: number; y: number }, up: boolean): number {
    for (let i = 0; i < 10; i++) {
      this.add({
        x: at.x + (i % 5) * 9 - 18, y: at.y + (up ? 14 : -18), vy: up ? -1.1 : 1.1,
        shape: up ? "arrow_up" : "arrow_down", color: up ? "#f8c040" : "#5878d0", max: 22, delay: Math.floor(i / 5) * 8 + (i % 2) * 3,
      });
    }
    for (let i = 0; i < 6; i++) this.add({
      x: at.x + (Math.random() - 0.5) * 36, y: at.y + (Math.random() - 0.5) * 30, shape: "star", color: "#ffffff", color2: up ? "#f8c040" : "#5878d0", max: 10, delay: i * 4,
    });
    return 38;
  }

  /** Residual status puff over a Quickened. */
  status(at: { x: number; y: number }, kind: StatusId | "root_tap" | "frost", drainTo?: { x: number; y: number }): number {
    const R = (a: number, b: number) => a + Math.random() * (b - a);
    switch (kind) {
      case "blight":
        for (let i = 0; i < 10; i++) this.add({ x: at.x + R(-14, 14), y: at.y + R(0, 14), vy: -0.6, shape: "bubble", color: "#9050b0", color2: "#d0a0e8", max: 22, delay: i * 2 });
        return 36;
      case "scorch":
        for (let i = 0; i < 12; i++) this.add({ x: at.x + R(-16, 16), y: at.y + R(6, 16), vy: R(-1.2, -0.6), shape: "ember", color: "#f87828", color2: "#a02810", max: 18, delay: i });
        return 32;
      case "frostbite":
      case "frost":
        for (let i = 0; i < 10; i++) this.add({ x: at.x + R(-18, 18), y: at.y - 20 + R(-4, 4), vy: R(0.5, 1), vx: R(-0.3, 0.3), shape: "flake", color: "#ffffff", color2: "#5898c8", max: 30, delay: i * 2 });
        return 36;
      case "dormant":
        for (let i = 0; i < 3; i++) this.add({ x: at.x + 8 + i * 4, y: at.y - 6, vx: 0.3, vy: -0.5, shape: "z", color: "#405060", max: 26, delay: i * 8 });
        return 40;
      case "rootbound":
        for (let i = 0; i < 8; i++) this.add({ x: at.x + R(-16, 16), y: at.y + R(-12, 12), shape: "spark", color: "#f0d040", color2: "#906010", max: 8, delay: i * 3 });
        return 32;
      case "root_tap":
        if (drainTo) for (let i = 0; i < 8; i++) this.add({
          x: at.x, y: at.y, shape: "spore", color: "#78c050", color2: "#c8f0a0", max: 24, delay: i * 3,
          to: { sx: at.x + R(-8, 8), sy: at.y + R(-8, 8), x: drainTo.x + R(-6, 6), y: drainTo.y + R(-6, 6), arc: 14 },
        });
        return 46;
      default:
        return 20;
    }
  }

  /** Drain motes flowing from the hit target back to the user. */
  drain(from: { x: number; y: number }, to: { x: number; y: number }): number {
    for (let i = 0; i < 8; i++) this.add({
      x: from.x, y: from.y, shape: "spore", color: "#88d060", color2: "#e0f8c0", max: 22, delay: i * 2,
      to: { sx: from.x + (Math.random() - 0.5) * 16, sy: from.y + (Math.random() - 0.5) * 16, x: to.x, y: to.y, arc: 12 },
    });
    return 38;
  }

  /** Send-out puff (pod opening). */
  puff(at: { x: number; y: number }): number {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.add({ x: at.x, y: at.y, vx: Math.cos(a) * 1.4, vy: Math.sin(a) * 1.0, shape: "star", color: "#ffffff", color2: "#a8d0e0", max: 14 });
    }
    return 14;
  }

  /** Capture click stars. */
  stars(at: { x: number; y: number }): number {
    for (let i = 0; i < 3; i++) {
      this.add({ x: at.x, y: at.y - 4, vx: (i - 1) * 0.9, vy: -1.6, ay: 0.08, shape: "star", color: "#f8e060", color2: "#c08020", max: 30 });
    }
    return 30;
  }

  /** Sport (shiny) sparkle on send-out. */
  sparkle(at: { x: number; y: number }): number {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.add({ x: at.x, y: at.y, shape: "star", color: "#ffffff", color2: "#f8d040", max: 20, delay: i * 2, orbit: { cx: at.x, cy: at.y, r: 4, a, va: 0.15, vr: 1.2 } });
    }
    return 36;
  }
}

function drawShape(g: CanvasRenderingContext2D, p: Particle, frame: number) {
  const x = Math.round(p.x);
  const y = Math.round(p.y);
  const t = p.life / p.max;
  const px = (dx: number, dy: number, col: string) => { g.fillStyle = col; g.fillRect(x + dx, y + dy, 1, 1); };
  const rect = (dx: number, dy: number, w: number, h: number, col: string) => { g.fillStyle = col; g.fillRect(x + dx, y + dy, w, h); };
  switch (p.shape) {
    case "px":
      rect(0, 0, 2, 2, p.color);
      break;
    case "leaf": {
      const f = Math.floor((p.life + (p.flip ? 3 : 0)) / 4) % 2 === 0;
      if (f) { rect(-2, 0, 4, 2, p.color); px(-3, 1, p.color2!); px(2, -1, p.color2!); px(-1, 0, "#ffffff"); }
      else { rect(0, -2, 2, 4, p.color); px(1, -3, p.color2!); px(-1, 2, p.color2!); px(0, -1, "#ffffff"); }
      break;
    }
    case "drop":
      rect(-1, -1, 3, 3, p.color); px(0, -2, p.color); px(-1, -1, p.color2!);
      break;
    case "ember": {
      const s = t < 0.5 ? 2 : 1;
      rect(0, 0, s, s + 1, frame % 4 < 2 ? p.color : p.color2!);
      if (s === 2) px(0, -1, "#f8f0a0");
      break;
    }
    case "petal":
      rect(-1, 0, 3, 2, p.color); px(0, -1, p.color); px(0, 0, p.color2!);
      break;
    case "spore":
      rect(-1, -1, 3, 3, p.color2!); px(0, 0, p.color);
      break;
    case "wisp": {
      rect(-1, -2, 3, 4, p.color); px(0, -2, p.color2!);
      if (frame % 6 < 3) px(0, 2, p.color);
      break;
    }
    case "thorn": {
      g.fillStyle = p.color;
      for (let i = 0; i < 5; i++) g.fillRect(x - i, y + Math.floor(i / 2), 1, 1);
      px(0, 0, p.color2!);
      break;
    }
    case "shard":
      rect(0, -2, 1, 5, p.color); rect(-1, -1, 3, 3, p.color2!); px(0, 0, p.color);
      break;
    case "flake":
      px(0, 0, p.color2!); px(-1, 0, p.color); px(1, 0, p.color); px(0, -1, p.color); px(0, 1, p.color);
      px(-2, -2, p.color2!); px(2, 2, p.color2!); px(2, -2, p.color2!); px(-2, 2, p.color2!);
      break;
    case "slash": {
      const len = Math.floor(Math.min(1, t * 2) * 20);
      g.fillStyle = p.color;
      for (let i = 0; i < len; i++) g.fillRect(x + 10 - i, y - 10 + i, 2, 1);
      g.fillStyle = p.color2!;
      for (let i = 0; i < len; i += 3) g.fillRect(x + 11 - i, y - 10 + i, 1, 1);
      break;
    }
    case "star": {
      const big = t < 0.6;
      px(0, 0, "#ffffff");
      const col = p.color2 ?? p.color;
      px(-1, 0, col); px(1, 0, col); px(0, -1, col); px(0, 1, col);
      if (big) { px(-2, 0, p.color); px(2, 0, p.color); px(0, -2, p.color); px(0, 2, p.color); }
      break;
    }
    case "spark":
      if (frame % 4 < 2) { px(0, 0, p.color); px(1, 1, p.color); px(-1, 1, p.color2 ?? p.color); px(1, -1, p.color2 ?? p.color); }
      break;
    case "arrow_up":
      px(0, 0, p.color); rect(-1, 1, 3, 1, p.color); rect(-2, 2, 5, 1, p.color); rect(0, 3, 1, 3, p.color);
      break;
    case "arrow_down":
      rect(0, -3, 1, 3, p.color); rect(-2, 0, 5, 1, p.color); rect(-1, 1, 3, 1, p.color); px(0, 2, p.color);
      break;
    case "z":
      rect(0, 0, 4, 1, p.color); px(2, 1, p.color); px(1, 2, p.color); rect(0, 3, 4, 1, p.color);
      break;
    case "bubble":
      px(0, -1, p.color); px(-1, 0, p.color); px(1, 0, p.color); px(0, 1, p.color); px(0, 0, p.color2!);
      break;
    case "jaw": {
      // two toothed halves closing on the target
      const close = Math.min(1, t * 1.6);
      const gap = Math.round((1 - close) * 18);
      for (let i = -14; i <= 14; i += 2) {
        const tooth = (i / 2) % 2 === 0 ? 3 : 1;
        g.fillStyle = p.color;
        g.fillRect(x + i, y - 4 - gap - tooth, 2, tooth + 2);
        g.fillRect(x + i, y + 2 + gap, 2, tooth + 2);
        g.fillStyle = p.color2!;
        g.fillRect(x + i, y - 6 - gap, 2, 1);
        g.fillRect(x + i, y + 4 + gap + tooth, 2, 1);
      }
      break;
    }
  }
}

/** Weather overlay drawn behind the HUD. */
export function drawWeather(g: CanvasRenderingContext2D, weather: Weather | null, frame: number) {
  if (!weather) return;
  if (weather === "sun") {
    g.fillStyle = "rgba(248, 216, 96, 0.12)";
    g.fillRect(0, 0, 160, 96);
    // sun rays from the top-right corner
    g.fillStyle = "rgba(248, 224, 120, 0.5)";
    for (let i = 0; i < 5; i++) {
      const a = 0.3 + i * 0.28 + Math.sin(frame / 30 + i) * 0.03;
      for (let r = 6; r < 30; r += 3) g.fillRect(Math.round(158 - Math.cos(a) * r), Math.round(Math.sin(a) * r), 1, 1);
    }
  } else if (weather === "rain") {
    g.fillStyle = "rgba(48, 88, 160, 0.10)";
    g.fillRect(0, 0, 160, 96);
    g.fillStyle = "#5880c0";
    for (let i = 0; i < 26; i++) {
      const x = (i * 37 + frame * 3) % 172 - 6;
      const y = (i * 23 + frame * 5) % 100 - 4;
      g.fillRect(x, y, 1, 3);
      g.fillRect(x - 1, y + 3, 1, 1);
    }
  } else if (weather === "frost") {
    g.fillStyle = "rgba(200, 232, 248, 0.18)";
    g.fillRect(0, 0, 160, 96);
    g.fillStyle = "#ffffff";
    for (let i = 0; i < 20; i++) {
      const x = (i * 41 + Math.floor(frame / 2) + Math.round(Math.sin((frame + i * 10) / 12) * 3)) % 162;
      const y = (i * 29 + Math.floor(frame / 2)) % 96;
      g.fillRect(x, y, 1, 1);
      g.fillRect(x + 1, y + 1, 1, 1);
    }
  }
}
