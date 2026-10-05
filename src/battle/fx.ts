// Procedural battle effects at GBC resolution: the particle + layer engine
// that move animations (./movefx) are built from, plus stat sparkles, status
// puffs, send-out puffs, capture stars, screen shake / flash / tint and the
// persistent weather overlays.
//
// Rules: integer pixels only, no alpha blending in art (translucency is a
// deliberate 2-colour checker), light from the top-left.

import type { StatusId, Weather } from "../contracts";

export interface Pt { x: number; y: number }

export type Shape =
  | "px" | "px1" | "leaf" | "drop" | "ember" | "petal" | "spore" | "wisp" | "thorn" | "shard" | "flake"
  | "star" | "arrow_up" | "arrow_down" | "z" | "bubble" | "spark" | "seed" | "acorn_s" | "burr"
  | "needle" | "hair" | "splinter" | "flame" | "smoke" | "heart" | "dust" | "tuft" | "samara"
  | "glob" | "streak" | "ring" | "clod" | "twinkle" | "root_tick";

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  ax?: number; ay?: number;
  life: number; max: number;
  delay: number;
  shape: Shape;
  color: string;
  color2?: string;
  color3?: string;
  /** Orbit around (cx, cy) instead of linear motion. */
  orbit?: { cx: number; cy: number; r: number; a: number; va: number; vr: number; squash?: number };
  /** Move from (sx, sy) to (x, y) over life, lifted by `arc` px at the midpoint. */
  to?: { x: number; y: number; arc: number; sx: number; sy: number; ease?: "in" | "out" };
  size?: number;
  flip?: boolean;
  /** Blink during the last third of life (GBC-style fade). */
  blink?: boolean;
  /** Sine sway on x (px amplitude) while moving. */
  sway?: number;
  /** Called once when the particle dies (impact effects). */
  onEnd?: (p: Particle) => void;
}

export type DrawFn = (g: CanvasRenderingContext2D, f: number, t: number) => void;
interface Layer { delay: number; life: number; max: number; back: boolean; draw: DrawFn }

export const ENEMY_CENTER: Pt = { x: 124, y: 30 };
export const PLAYER_CENTER: Pt = { x: 32, y: 66 };
/** Ground line under each side (where feet / roots meet the battle ground). */
export const ENEMY_GROUND: Pt = { x: 124, y: 50 };
export const PLAYER_GROUND: Pt = { x: 32, y: 90 };

export const R = (a: number, b: number) => a + Math.random() * (b - a);
export const RI = (a: number, b: number) => Math.floor(R(a, b + 1));

export class Fx {
  particles: Particle[] = [];
  layers: Layer[] = [];
  /** Full-screen flash colour for a frame or two (drawn over everything). */
  flash: { color: string; frames: number } | null = null;
  /** Background tint (drawn behind the sprites), solid or checker. */
  tint: { color: string; frames: number; dither: boolean } | null = null;
  private shakeState: { frames: number; amp: number; axis: "x" | "y" | "xy" } | null = null;
  frame = 0;

  clear() {
    this.particles = [];
    this.layers = [];
    this.timers = [];
    this.flash = null;
    this.tint = null;
    this.shakeState = null;
  }

  get busy() {
    return this.particles.length > 0 || this.layers.length > 0 || this.timers.length > 0;
  }

  add(p: Partial<Particle> & Pick<Particle, "x" | "y" | "shape" | "color" | "max">) {
    this.particles.push({ vx: 0, vy: 0, life: 0, delay: 0, ...p });
  }

  /** A custom per-frame drawing that lives `max` frames. `f` counts 0..max-1. */
  layer(max: number, draw: DrawFn, opts: { delay?: number; back?: boolean } = {}) {
    this.layers.push({ delay: Math.max(0, Math.floor(opts.delay ?? 0)), life: 0, max: Math.max(1, Math.floor(max)), back: !!opts.back, draw });
  }

  private timers: { left: number; fn: () => void }[] = [];

  /** Run a callback after `delay` frames (impacts, follow-up spawns). Runs in update(). */
  at(delay: number, fn: () => void) {
    this.timers.push({ left: Math.max(0, Math.floor(delay)), fn });
  }

  shake(frames: number, amp = 2, axis: "x" | "y" | "xy" = "x") {
    if (this.shakeState && this.shakeState.frames > frames && this.shakeState.amp >= amp) return;
    this.shakeState = { frames, amp, axis };
  }

  /** Current screen offset from shake (whole pixels, alternating). */
  shakeOffset(): Pt {
    const s = this.shakeState;
    if (!s) return { x: 0, y: 0 };
    const k = Math.floor(this.frame / 2) % 2 === 0 ? 1 : -1;
    const a = Math.max(1, Math.round(s.amp * Math.min(1, s.frames / 6)));
    return { x: s.axis !== "y" ? k * a : 0, y: s.axis !== "x" ? -k * a : 0 };
  }

  flashScreen(color: string, frames = 2) {
    this.flash = { color, frames };
  }

  tintScreen(color: string, frames: number, dither = true) {
    this.tint = { color, frames, dither };
  }

  update() {
    this.frame++;
    if (this.timers.length) {
      const due = this.timers.filter((t) => t.left-- <= 0);
      if (due.length) {
        this.timers = this.timers.filter((t) => !due.includes(t));
        for (const t of due) t.fn();
      }
    }
    if (this.flash && --this.flash.frames <= 0) this.flash = null;
    if (this.tint && --this.tint.frames <= 0) this.tint = null;
    if (this.shakeState && --this.shakeState.frames <= 0) this.shakeState = null;
    for (const p of this.particles) {
      if (p.delay > 0) { p.delay--; continue; }
      p.life++;
      if (p.orbit) {
        p.orbit.a += p.orbit.va;
        p.orbit.r = Math.max(0, p.orbit.r + p.orbit.vr);
        p.x = p.orbit.cx + Math.cos(p.orbit.a) * p.orbit.r;
        p.y = p.orbit.cy + Math.sin(p.orbit.a) * p.orbit.r * (p.orbit.squash ?? 0.6);
      } else if (p.to) {
        let t = Math.min(1, p.life / p.max);
        if (p.to.ease === "in") t = t * t;
        else if (p.to.ease === "out") t = 1 - (1 - t) * (1 - t);
        p.x = p.to.sx + (p.to.x - p.to.sx) * t;
        p.y = p.to.sy + (p.to.y - p.to.sy) * t - Math.sin(t * Math.PI) * p.to.arc;
        if (p.sway) p.x += Math.sin(p.life / 5) * p.sway;
      } else {
        p.vx += p.ax ?? 0;
        p.vy += p.ay ?? 0;
        p.x += p.vx + (p.sway ? Math.cos(p.life / 6) * p.sway * 0.2 : 0);
        p.y += p.vy;
      }
    }
    const dead = this.particles.filter((p) => p.life >= p.max);
    if (dead.length) {
      this.particles = this.particles.filter((p) => p.life < p.max);
      for (const p of dead) p.onEnd?.(p);
    }
    for (const l of this.layers) {
      if (l.delay > 0) { l.delay--; continue; }
      l.life++;
    }
    this.layers = this.layers.filter((l) => l.life <= l.max);
  }

  /** Behind the sprites: tint + back layers. */
  drawBack(g: CanvasRenderingContext2D) {
    if (this.tint) {
      if (this.tint.dither) checker(g, 0, 0, 160, 96, this.tint.color, this.frame >> 3);
      else { g.fillStyle = this.tint.color; g.fillRect(0, 0, 160, 96); }
    }
    for (const l of this.layers) if (l.back && l.delay <= 0 && l.life > 0) l.draw(g, l.life - 1, (l.life - 1) / Math.max(1, l.max - 1));
  }

  /** In front of the sprites: particles + front layers. */
  draw(g: CanvasRenderingContext2D) {
    for (const l of this.layers) if (!l.back && l.delay <= 0 && l.life > 0) l.draw(g, l.life - 1, (l.life - 1) / Math.max(1, l.max - 1));
    for (const p of this.particles) {
      if (p.delay > 0) continue;
      if (p.blink && p.life > p.max * 0.66 && (p.life >> 1) % 2 === 0) continue;
      drawShape(g, p, this.frame);
    }
  }

  drawFlash(g: CanvasRenderingContext2D) {
    if (!this.flash) return;
    g.fillStyle = this.flash.color;
    g.fillRect(0, 0, 160, 144);
  }

  // -------------------------------------------------------------------------
  // Shared small effects
  // -------------------------------------------------------------------------

  /** Impact: a 4-point star flash plus a few chips. */
  impact(at: Pt, color = "#f8f8f8", color2 = "#f8d040", big = false) {
    const n = big ? 3 : 2;
    this.layer(big ? 8 : 6, (g, f) => {
      const r = big ? [3, 6, 8, 9, 9, 8, 6, 4][f] ?? 3 : [2, 5, 6, 6, 5, 3][f] ?? 2;
      starBurst(g, Math.round(at.x), Math.round(at.y), r, color, color2);
    });
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2 + R(-0.3, 0.3);
      this.add({ x: at.x, y: at.y, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.2, ay: 0.08, shape: "px", color: color2, max: 10, delay: 2 });
    }
  }

  /** Ground dust kicked up at a point. */
  dust(at: Pt, n = 6, color = "#c8b890", color2 = "#a09070") {
    for (let i = 0; i < n; i++) {
      const s = i % 2 ? 1 : -1;
      this.add({ x: at.x + s * R(2, 10), y: at.y, vx: s * R(0.4, 1.2), vy: R(-0.9, -0.3), ay: 0.05, shape: "dust", color, color2, max: RI(12, 18) });
    }
  }

  /** Stat stage change sparkle (arrows rising or falling). */
  stat(at: Pt, up: boolean): number {
    const col = up ? "#f8c040" : "#5878d0";
    const col2 = up ? "#c07818" : "#283890";
    for (let i = 0; i < 10; i++) {
      this.add({
        x: at.x + (i % 5) * 9 - 18, y: at.y + (up ? 16 : -18), vy: up ? -1.1 : 1.1,
        shape: up ? "arrow_up" : "arrow_down", color: col, color2: col2, max: 22, delay: Math.floor(i / 5) * 8 + (i % 2) * 3,
      });
    }
    for (let i = 0; i < 6; i++) this.add({
      x: at.x + R(-18, 18), y: at.y + R(-15, 15), shape: "star", color: "#ffffff", color2: col, max: 10, delay: i * 4,
    });
    // a quick column of light on the Quickened
    this.layer(16, (g, f) => {
      const h = up ? 40 - f * 2 : 8 + f * 2;
      if (f % 4 < 2) checker(g, at.x - 14, at.y + 22 - h, 28, 2, col, 0);
    });
    return 38;
  }

  /** Residual status puff over a Quickened. */
  status(at: Pt, kind: StatusId | "root_tap" | "frost", drainTo?: Pt): number {
    switch (kind) {
      case "blight":
        for (let i = 0; i < 12; i++) this.add({
          x: at.x + R(-14, 14), y: at.y + R(4, 18), vy: R(-0.8, -0.4), sway: 2, shape: "bubble",
          color: "#8848a8", color2: "#d8a8f0", max: RI(18, 26), delay: i * 2, blink: true,
        });
        this.tintScreen("#a070c0", 20);
        return 40;
      case "scorch":
        for (let i = 0; i < 12; i++) this.add({
          x: at.x + R(-16, 16), y: at.y + R(8, 18), vy: R(-1.2, -0.6), shape: "flame",
          color: "#f8a030", color2: "#c83810", color3: "#f8e878", max: RI(14, 20), delay: i, blink: true,
        });
        return 34;
      case "frostbite":
      case "frost":
        for (let i = 0; i < 10; i++) this.add({
          x: at.x + R(-18, 18), y: at.y - 22 + R(-4, 4), vy: R(0.5, 1), vx: R(-0.3, 0.3), sway: 1, shape: "flake",
          color: "#ffffff", color2: "#5898c8", max: 30, delay: i * 2, blink: true,
        });
        for (let i = 0; i < 5; i++) this.add({ x: at.x + R(-16, 16), y: at.y + R(-12, 12), shape: "twinkle", color: "#ffffff", color2: "#88c8e8", max: 12, delay: 6 + i * 4 });
        return 38;
      case "dormant":
        for (let i = 0; i < 3; i++) this.add({ x: at.x + 8 + i * 5, y: at.y - 6, vx: 0.35, vy: -0.45, sway: 2, shape: "z", color: "#405878", max: 30, delay: i * 9, size: i });
        return 46;
      case "rootbound":
        this.roots(at, 18, "#6a4020", "#a07040");
        for (let i = 0; i < 8; i++) this.add({ x: at.x + R(-16, 16), y: at.y + R(-12, 12), shape: "spark", color: "#f0d040", color2: "#906010", max: 8, delay: 8 + i * 3 });
        return 38;
      case "root_tap":
        this.roots(at, 14, "#6a4020", "#78c050");
        if (drainTo) for (let i = 0; i < 8; i++) this.add({
          x: at.x, y: at.y, shape: "spore", color: "#78c050", color2: "#c8f0a0", max: 24, delay: 8 + i * 3,
          to: { sx: at.x + R(-8, 8), sy: at.y + R(-8, 8), x: drainTo.x + R(-6, 6), y: drainTo.y + R(-6, 6), arc: 14 },
        });
        return 50;
      default:
        return 20;
    }
  }

  /** Little roots curling up around a Quickened (rootbound, root tap). */
  roots(at: Pt, frames: number, dark: string, light: string) {
    const base = at.y + 22;
    for (let k = 0; k < 4; k++) {
      const x0 = at.x - 18 + k * 12;
      const lean = k < 2 ? 1 : -1;
      this.layer(frames + 10, (g, f) => {
        const h = Math.min(14, Math.floor(f * 1.5));
        for (let i = 0; i < h; i++) {
          const x = x0 + Math.round(Math.sin(i / 3 + k) * 2) + Math.floor((i * lean) / 5);
          px(g, x, base - i, dark);
          if (i % 4 === 1) px(g, x + lean, base - i, light);
        }
      }, { delay: k * 2 });
    }
  }

  /** A small idle reminder that a status is active (no text). */
  statusIdle(at: Pt, kind: StatusId) {
    switch (kind) {
      case "blight":
        for (let i = 0; i < 3; i++) this.add({ x: at.x + R(-12, 12), y: at.y + R(6, 16), vy: -0.4, sway: 2, shape: "bubble", color: "#8848a8", color2: "#d8a8f0", max: 26, delay: i * 8, blink: true });
        break;
      case "scorch":
        for (let i = 0; i < 3; i++) this.add({ x: at.x + R(-12, 12), y: at.y + R(8, 16), vy: -0.6, shape: "ember", color: "#f8a030", color2: "#c83810", max: 20, delay: i * 6, blink: true });
        break;
      case "frostbite":
        for (let i = 0; i < 3; i++) this.add({ x: at.x + R(-16, 16), y: at.y + R(-14, 14), shape: "twinkle", color: "#ffffff", color2: "#88c8e8", max: 14, delay: i * 7 });
        break;
      case "dormant":
        this.add({ x: at.x + 10, y: at.y - 8, vx: 0.3, vy: -0.4, sway: 2, shape: "z", color: "#405878", max: 34, size: 0 });
        this.add({ x: at.x + 10, y: at.y - 8, vx: 0.3, vy: -0.4, sway: 2, shape: "z", color: "#405878", max: 34, size: 1, delay: 14 });
        break;
      case "rootbound":
        for (let i = 0; i < 3; i++) this.add({ x: at.x + R(-14, 14), y: at.y + R(-10, 10), shape: "spark", color: "#f0d040", color2: "#906010", max: 8, delay: i * 5 });
        break;
    }
  }

  /** Drain motes flowing from the hit target back to the user. */
  drain(from: Pt, to: Pt, color = "#88d060", color2 = "#e0f8c0"): number {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      this.add({
        x: from.x, y: from.y, shape: "spore", color, color2, max: 24, delay: Math.floor(i * 1.5),
        to: { sx: from.x + Math.cos(a) * 14, sy: from.y + Math.sin(a) * 10, x: to.x + R(-4, 4), y: to.y + R(-4, 4), arc: 10 + (i % 3) * 6, ease: "in" },
      });
    }
    this.at(26, () => this.sparkle(to, color2, 4));
    return 44;
  }

  /** Send-out puff (pod opening). */
  puff(at: Pt): number {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.add({ x: at.x, y: at.y, vx: Math.cos(a) * 1.4, vy: Math.sin(a) * 1.0, shape: "star", color: "#ffffff", color2: "#a8d0e0", max: 14 });
    }
    this.layer(8, (g, f) => ring(g, at.x, at.y, 3 + f * 2, Math.round((3 + f * 2) * 0.7), f % 2 ? "#ffffff" : "#a8d0e0"));
    return 14;
  }

  /** Capture click: a burst of stars from the pod. */
  stars(at: Pt): number {
    for (let i = 0; i < 3; i++) {
      this.add({ x: at.x, y: at.y - 4, vx: (i - 1) * 1.0, vy: -1.7, ay: 0.08, shape: "star", color: "#f8e060", color2: "#c08020", max: 32 });
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.add({ x: at.x, y: at.y, vx: Math.cos(a) * 1.5, vy: Math.sin(a) * 1.1, shape: "twinkle", color: "#ffffff", color2: "#f8d040", max: 16, delay: 2 });
    }
    this.layer(10, (g, f) => ring(g, at.x, at.y, 2 + f * 2, 2 + f * 2, f % 2 ? "#f8e060" : "#ffffff"));
    return 32;
  }

  /** Sport (shiny) sparkle on send-out; also a generic sparkle burst. */
  sparkle(at: Pt, color2 = "#f8d040", n = 8): number {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.add({ x: at.x, y: at.y, shape: "star", color: "#ffffff", color2, max: 20, delay: i * 2, orbit: { cx: at.x, cy: at.y, r: 4, a, va: 0.15, vr: 1.2 } });
    }
    return 36;
  }
}

// ---------------------------------------------------------------------------
// Pixel primitives
// ---------------------------------------------------------------------------

export function px(g: CanvasRenderingContext2D, x: number, y: number, col: string) {
  g.fillStyle = col;
  g.fillRect(Math.round(x), Math.round(y), 1, 1);
}

export function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) {
  if (w <= 0 || h <= 0) return;
  g.fillStyle = col;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

const patterns = new Map<string, CanvasPattern>();
/** Fill a rectangle with a 2-colour checker (colour on alternate pixels). */
export function checker(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string, phase = 0) {
  const key = `${col}:${phase & 1}`;
  let pat = patterns.get(key);
  if (!pat) {
    const c = document.createElement("canvas");
    c.width = 2; c.height = 2;
    const cg = c.getContext("2d")!;
    cg.fillStyle = col;
    if (phase & 1) { cg.fillRect(1, 0, 1, 1); cg.fillRect(0, 1, 1, 1); }
    else { cg.fillRect(0, 0, 1, 1); cg.fillRect(1, 1, 1, 1); }
    pat = g.createPattern(c, "repeat")!;
    patterns.set(key, pat);
  }
  g.save();
  g.fillStyle = pat;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  g.restore();
}

/** Bresenham line, `w` px thick (square brush). */
export function line(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, col: string, w = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  g.fillStyle = col;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let n = 0; n < 400; n++) {
    g.fillRect(x0, y0, w, w);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

/** Filled ellipse (scanlines). */
export function ellipse(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, col: string) {
  if (rx <= 0 || ry <= 0) return;
  g.fillStyle = col;
  cx = Math.round(cx); cy = Math.round(cy);
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}

/** 1px ellipse outline. */
export function ring(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, col: string) {
  if (rx <= 0 || ry <= 0) return;
  g.fillStyle = col;
  cx = Math.round(cx); cy = Math.round(cy);
  const n = Math.max(12, Math.round((rx + ry) * 3));
  let lx = NaN, ly = NaN;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = cx + Math.round(Math.cos(a) * rx);
    const y = cy + Math.round(Math.sin(a) * ry);
    if (x === lx && y === ly) continue;
    g.fillRect(x, y, 1, 1);
    lx = x; ly = y;
  }
}

/** 4-point star flash of radius r. */
export function starBurst(g: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, col2: string) {
  g.fillStyle = col2;
  g.fillRect(x - r, y, r * 2 + 1, 1);
  g.fillRect(x, y - r, 1, r * 2 + 1);
  const d = Math.floor(r * 0.5);
  for (let i = 1; i <= d; i++) { g.fillRect(x - i, y - i, 1, 1); g.fillRect(x + i, y - i, 1, 1); g.fillRect(x - i, y + i, 1, 1); g.fillRect(x + i, y + i, 1, 1); }
  g.fillStyle = col;
  g.fillRect(x - Math.floor(r / 2), y, Math.floor(r / 2) * 2 + 1, 1);
  g.fillRect(x, y - Math.floor(r / 2), 1, Math.floor(r / 2) * 2 + 1);
  g.fillRect(x - 1, y - 1, 3, 3);
}

/**
 * Draw a small bitmap: rows of chars, '.' transparent, other chars index the
 * palette. Centred on (x, y); `flip` mirrors horizontally.
 */
export function blit(g: CanvasRenderingContext2D, rows: readonly string[], x: number, y: number, pal: Record<string, string>, flip = false) {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const ox = Math.round(x) - (w >> 1);
  const oy = Math.round(y) - (h >> 1);
  for (let r = 0; r < h; r++) {
    const row = rows[r];
    for (let c = 0; c < w; c++) {
      const ch = row[flip ? w - 1 - c : c];
      if (ch === "." || ch === undefined) continue;
      const col = pal[ch];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(ox + c, oy + r, 1, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Small sprites (a = main, b = dark, c = light, w = white, o = outline)
// ---------------------------------------------------------------------------

export const SPR = {
  seed: ["..bb..", ".baab.", "bacaab", "baaaab", "baaaab", ".baab.", "..bb.."],
  acorn_s: [".bb.", "bbbb", "acaa", "aaab", ".ab."],
  burr: ["...b.b...", ".b.bbb.b.", "..bccab..", "bbcaaaabb", ".baaaaab.", "bbaaaaabb", "..baaab..", ".b.bbb.b.", "...b.b..."],
  burr2: ["....b....", "b..bbb..b", ".bbccabb.", "..caaaa..", "bbaaaaabb", "..aaaaa..", ".bbaaabb.", "b..bbb..b", "....b...."],
  flameA: ["...b...", "...bb..", "..bab..", "..baab.", ".baaab.", ".bacab.", "bacccab", "bacccab", ".bacab.", "..bbb.."],
  flameB: ["...b...", "..bb...", "..bab..", ".baab..", ".baaab.", ".bacab.", "bacccab", "bacccab", ".bacab.", "..bbb.."],
  thorn: ["ooo........", "oaaooo.....", "oaaaaabbcw.", "oaaooo.....", "ooo........"],
  needle: ["oooooo....", "aaaaaaaacw", "oooooo...."],
  hair: ["ooo....", "abbaacw", "ooo...."],
  splinterA: [".oooo...", "oaaabbo.", ".ocaaaao", "..oooo.."],
  splinterB: ["..o.", ".oao", "oaco", "oaao", "obao", ".oo."],
  heart: [".bb.bb.", "baccaab", "bacaaab", ".baaab.", "..bab..", "...b..."],
  tuft: [".o.o.o.", "ocowoco", ".owwwo.", "..oco..", "...b...", "...b...", "...b..."],
  glob: [".bb.", "bcab", "baab", ".bb."],
  globBig: ["..bbb..", ".bcaab.", "bccaaab", "baaaaab", "baaaaab", ".baaab.", "..bbb.."],
  z0: ["aaa", "..a", ".a.", "a..", "aaa"],
  z1: ["aaaa", "...a", "..a.", ".a..", "aaaa"],
  acorn: [
    ".....oo.....", "....obbo....", "..oobcbboo..", ".obcbcbcbbo.", "obcbcbcbcbbo", "oooooooooooo", ".oawwaaaaao.",
    ".oawaaaaaao.", ".oaaaaaaado.", "..oaaaaaddo.", "..oaaaaado..", "...oaaado...", "....oddo....", ".....oo.....",
  ],
  gourd: [
    "......oo......", ".....obbo.....", "....oobbo.....", "..oooaaoooo...", ".oaawaaaaaaoo.", "oawwaaaaaaaado",
    "oawaaaaaaaaado", "oaaaaaaaaaaddo", "oaaaaaaaaaaddo", "oaaaaaaaaaddo.", ".oaaaaaaadddo.", "..oodddddoo...", "....ooooo.....",
  ],
  log: [
    ".oooooooooooooooooooooo.", "oaaaaaaaaaaaaaaaaaaaaobo", "occccaaaaaaccaaaaaaaobwb", "oaaaaaaccaaaaaaaaaaaobbb",
    "oaaaaaaaaaaaaaaccaaaaobo", ".oooooooooooooooooooooo.",
  ],
  fossil: [
    "bbbbbbbbbbbbbb", "bcccccccccccab", "bcaaaaabaaaaab", "bcaabaabaabaab", "bcaaabbbbbaaab", "bcabaabbaabaab",
    "bcaaabbbbbaaab", "bcaabaabaabaab", "bcaaaabbbaaaab", "bcaaaaabaaaaab", "baaaaaabaaaaab", "bbbbbbbbbbbbbb",
  ],
  pad: [
    ".....oooooo.....", "...ooaaaaaaoo...", "..oaacccaaaaao..", ".oacccaaaaaaaao.", "oaccaaaaaaoaaaao", "oaaaaaaaaoooaado",
    ".oaaaaaaao.oaddo", "..ooaaaaao.oddo.", "....oooooo.ooo..",
  ],
} as const;

function drawShape(g: CanvasRenderingContext2D, p: Particle, frame: number) {
  const x = Math.round(p.x);
  const y = Math.round(p.y);
  const t = p.life / p.max;
  const c2 = p.color2 ?? p.color;
  const pal = { a: p.color, b: c2, c: p.color3 ?? "#f8f8f8", w: "#f8f8f8", o: "#181818" };
  switch (p.shape) {
    case "px":
      rect(g, x, y, 2, 2, p.color);
      break;
    case "px1":
      px(g, x, y, p.color);
      break;
    case "leaf": {
      const f = Math.floor((p.life + (p.flip ? 3 : 0)) / 4) % 3;
      if (f === 0) blit(g, ["..bbb.", ".bcaab", "bcaab.", "bbb..."], x, y, pal, !!p.flip);
      else if (f === 1) blit(g, [".bb.", "bcab", "bcab", "baab", ".bb."], x, y, pal, !!p.flip);
      else blit(g, ["bbb...", "bcaab.", ".baaab", "..bbb."], x, y, pal, !!p.flip);
      break;
    }
    case "drop":
      blit(g, [".a.", ".a.", "aca", "aab", ".b."], x, y, { a: p.color, b: p.color3 ?? p.color, c: c2 });
      break;
    case "ember": {
      const s = t < 0.5 ? 2 : 1;
      rect(g, x, y, s, s + 1, frame % 4 < 2 ? p.color : c2);
      if (s === 2) px(g, x, y - 1, "#f8f0a0");
      break;
    }
    case "petal":
      if ((p.life >> 2) % 2) blit(g, [".aa.", "acaa", "aaab", ".ab."], x, y, pal);
      else blit(g, ["aa..", "acab", ".aab"], x, y, pal);
      break;
    case "spore":
      rect(g, x - 1, y - 1, 3, 3, c2); px(g, x, y, p.color);
      break;
    case "wisp": {
      rect(g, x - 1, y - 2, 3, 4, p.color); px(g, x, y - 2, c2); px(g, x - 1, y - 2, c2);
      const tail = (frame >> 2) % 2;
      px(g, x - 1 + tail * 2, y + 2, p.color); px(g, x + tail, y + 3, p.color);
      break;
    }
    case "thorn":
      blit(g, SPR.thorn, x, y, { ...pal, o: c2 }, !!p.flip);
      break;
    case "needle":
      blit(g, SPR.needle, x, y, { ...pal, o: c2 }, !!p.flip);
      break;
    case "hair":
      blit(g, SPR.hair, x, y, { ...pal, o: c2 }, !!p.flip);
      break;
    case "splinter":
      blit(g, (p.life >> 2) % 2 ? SPR.splinterA : SPR.splinterB, x, y, { ...pal, o: c2 }, !!p.flip);
      break;
    case "shard":
      rect(g, x, y - 2, 1, 5, p.color); rect(g, x - 1, y - 1, 3, 3, c2); px(g, x, y, p.color);
      break;
    case "flake":
      px(g, x, y, c2); px(g, x - 1, y, p.color); px(g, x + 1, y, p.color); px(g, x, y - 1, p.color); px(g, x, y + 1, p.color);
      px(g, x - 2, y - 2, c2); px(g, x + 2, y + 2, c2); px(g, x + 2, y - 2, c2); px(g, x - 2, y + 2, c2);
      break;
    case "star": {
      const big = t < 0.6;
      px(g, x, y, "#ffffff");
      px(g, x - 1, y, c2); px(g, x + 1, y, c2); px(g, x, y - 1, c2); px(g, x, y + 1, c2);
      if (big) { px(g, x - 2, y, p.color); px(g, x + 2, y, p.color); px(g, x, y - 2, p.color); px(g, x, y + 2, p.color); }
      break;
    }
    case "twinkle": {
      const k = t < 0.3 ? 1 : t < 0.7 ? 2 : 1;
      px(g, x, y, p.color);
      for (let i = 1; i <= k; i++) { px(g, x - i, y, c2); px(g, x + i, y, c2); px(g, x, y - i, c2); px(g, x, y + i, c2); }
      break;
    }
    case "spark":
      if (frame % 4 < 2) { px(g, x, y, p.color); px(g, x + 1, y + 1, p.color); px(g, x - 1, y + 1, c2); px(g, x + 1, y - 1, c2); }
      break;
    case "arrow_up":
      px(g, x, y, p.color); rect(g, x - 1, y + 1, 3, 1, p.color); rect(g, x - 2, y + 2, 5, 1, p.color); rect(g, x, y + 3, 1, 3, p.color);
      px(g, x - 2, y + 3, c2); px(g, x + 2, y + 3, c2); px(g, x + 1, y + 3, c2); rect(g, x + 1, y + 4, 1, 2, c2);
      break;
    case "arrow_down":
      rect(g, x, y - 3, 1, 3, p.color); rect(g, x - 2, y, 5, 1, p.color); rect(g, x - 1, y + 1, 3, 1, p.color); px(g, x, y + 2, p.color);
      rect(g, x + 1, y - 3, 1, 3, c2); px(g, x + 1, y + 1, c2);
      break;
    case "z":
      blit(g, p.size ? SPR.z1 : SPR.z0, x, y, pal);
      break;
    case "bubble": {
      const big = (p.life >> 3) % 2 === 0 || t < 0.3;
      if (big) {
        px(g, x, y - 2, p.color); px(g, x - 1, y - 2, p.color);
        rect(g, x - 2, y - 1, 1, 2, p.color); rect(g, x + 1, y - 1, 1, 2, p.color);
        px(g, x, y + 1, p.color); px(g, x - 1, y + 1, p.color);
        px(g, x - 1, y - 1, c2);
      } else {
        px(g, x, y - 1, p.color); px(g, x - 1, y, p.color); px(g, x + 1, y, p.color); px(g, x, y + 1, p.color); px(g, x, y, c2);
      }
      break;
    }
    case "seed":
      blit(g, SPR.seed, x, y, pal);
      break;
    case "acorn_s":
      blit(g, SPR.acorn_s, x, y, pal);
      break;
    case "burr":
      blit(g, (p.life >> 2) % 2 ? SPR.burr : SPR.burr2, x, y, pal);
      break;
    case "flame":
      blit(g, ((p.life + (p.flip ? 2 : 0)) >> 2) % 2 ? SPR.flameA : SPR.flameB, x, y, pal);
      break;
    case "smoke": {
      const r = 2 + Math.floor(t * 4);
      ellipse(g, x, y, r, r, p.color);
      checker(g, x - r, y - r, r * 2 + 1, r, c2, 0);
      break;
    }
    case "heart":
      blit(g, SPR.heart, x, y, pal);
      break;
    case "dust": {
      const s = t < 0.5 ? 2 : 1;
      rect(g, x, y, s + 1, s, p.color); px(g, x + s, y + s - 1, c2);
      break;
    }
    case "tuft":
      blit(g, SPR.tuft, x, y, { ...pal, o: p.color3 ?? "#90a0b0", c: "#e0e8f0" });
      break;
    case "samara": {
      // a seed with one long wing, rotating
      const a = p.life * 0.55 + (p.flip ? Math.PI : 0);
      const ex = Math.cos(a) * 8, ey = Math.sin(a) * 4;
      line(g, x, y, x + ex, y + ey, p.color, 2);
      line(g, x + ex * 0.4, y + ey * 0.4, x + ex, y + ey, p.color3 ?? "#f8f0c8", 1);
      rect(g, x - 1, y - 1, 3, 3, c2);
      break;
    }
    case "glob":
      blit(g, (p.size ?? 0) > 0 ? SPR.globBig : SPR.glob, x, y, pal);
      break;
    case "streak":
      line(g, x, y, x - 2, y + 5, p.color);
      px(g, x - 2, y + 6, c2);
      break;
    case "ring":
      ring(g, x, y, Math.round(2 + t * (p.size ?? 10)), Math.round((2 + t * (p.size ?? 10)) * 0.7), (p.life >> 1) % 2 ? p.color : c2);
      break;
    case "clod":
      rect(g, x, y, 2, 2, p.color); px(g, x + 1, y + 1, c2);
      break;
    case "root_tick":
      px(g, x, y, p.color); px(g, x + 1, y - 1, c2);
      break;
  }
}

// ---------------------------------------------------------------------------
// Weather overlays (persist while active)
// ---------------------------------------------------------------------------

/** Weather overlay drawn behind the HUD. */
export function drawWeather(g: CanvasRenderingContext2D, weather: Weather | null, frame: number) {
  if (!weather) return;
  if (weather === "sun") {
    // a warm checker wash on the sky and slow diagonal shafts of light
    checker(g, 0, 0, 160, 96, "#f8e8a0", 0);
    for (let i = 0; i < 4; i++) {
      const drift = Math.floor(frame / 6) % 48;
      const x0 = 20 + i * 44 - drift + (i % 2) * 6;
      for (let y = 0; y < 96; y += 1) {
        const x = x0 + Math.floor(y / 2);
        if (x < -8 || x > 168) continue;
        const w = 3 + (i % 2) * 2;
        if ((x + y) % 2 === 0) { g.fillStyle = "#f8f0b8"; g.fillRect(x, y, w, 1); }
      }
    }
    // sun disc peeking from the top-right
    const pulse = (frame >> 4) % 2;
    ellipse(g, 156, 2, 9 + pulse, 9 + pulse, "#f8d860");
    ellipse(g, 156, 2, 6, 6, "#f8f0a8");
  } else if (weather === "rain") {
    checker(g, 0, 0, 160, 96, "#98a8c8", 0);
    for (let i = 0; i < 34; i++) {
      const x = (i * 37 + frame * 2) % 176 - 8;
      const y = (i * 23 + frame * 6) % 104 - 6;
      g.fillStyle = i % 3 === 0 ? "#f8f8f8" : "#5070b0";
      g.fillRect(x, y, 1, 3);
      g.fillRect(x - 1, y + 3, 1, 2);
    }
    // splashes on the battle grounds
    for (let i = 0; i < 6; i++) {
      const k = (frame + i * 11) % 24;
      if (k > 6) continue;
      const sx = i < 3 ? 100 + i * 18 : 10 + (i - 3) * 18;
      const sy = i < 3 ? 50 : 88;
      g.fillStyle = "#f8f8f8";
      g.fillRect(sx - (k >> 1), sy - 1, 1, 1);
      g.fillRect(sx + (k >> 1), sy - 1, 1, 1);
    }
  } else if (weather === "frost") {
    checker(g, 0, 0, 160, 96, "#d8f0f8", 0);
    // frost creeping in from the corners
    const corner = (cx: number, cy: number, sx: number, sy: number) => {
      for (let i = 0; i < 9; i++) {
        const len = 12 - i;
        g.fillStyle = i % 2 ? "#a8d8f0" : "#f8f8f8";
        g.fillRect(sx > 0 ? cx : cx - len, cy + sy * i, len, 1);
      }
    };
    corner(0, 0, 1, 1);
    corner(160, 0, -1, 1);
    // drifting flakes and twinkles
    for (let i = 0; i < 18; i++) {
      const x = (i * 41 + Math.floor(frame / 3) + Math.round(Math.sin((frame + i * 10) / 14) * 3)) % 162;
      const y = (i * 29 + Math.floor(frame / 2)) % 96;
      g.fillStyle = "#ffffff";
      g.fillRect(x, y, 1, 1);
      if (i % 3 === 0) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
    }
    for (let i = 0; i < 4; i++) {
      const k = (frame + i * 17) % 40;
      if (k > 8) continue;
      const x = [104, 140, 20, 48][i], y = [12, 36, 60, 76][i];
      g.fillStyle = "#ffffff";
      g.fillRect(x - (k < 4 ? 1 : 2), y, k < 4 ? 3 : 5, 1);
      g.fillRect(x, y - (k < 4 ? 1 : 2), 1, k < 4 ? 3 : 5);
    }
  }
}

// ---------------------------------------------------------------------------
// Sprite effects requested by animations (the scene applies them when it
// draws each side's Quickened).
// ---------------------------------------------------------------------------

export type SpriteFxKind = "shine" | "tint" | "hide" | "jitter" | "sink" | "pulse" | "squash" | "blink";
export interface SpriteFx { side: 0 | 1; kind: SpriteFxKind; color?: string; frames: number; max: number; delay: number }
export interface SpriteMods { dx: number; dy: number; scale: number; hidden: boolean; tint: string | null; shine: number | null }

export class SpriteFxHost {
  list: SpriteFx[] = [];
  add(side: 0 | 1, kind: SpriteFxKind, frames: number, opts: { color?: string; delay?: number } = {}) {
    this.list.push({ side, kind, frames, max: frames, color: opts.color, delay: opts.delay ?? 0 });
  }
  update() {
    for (const s of this.list) { if (s.delay > 0) s.delay--; else s.frames--; }
    this.list = this.list.filter((s) => s.frames > 0);
  }
  clear() { this.list = []; }
  mods(side: 0 | 1, frame: number): SpriteMods {
    const m: SpriteMods = { dx: 0, dy: 0, scale: 1, hidden: false, tint: null, shine: null };
    for (const s of this.list) {
      if (s.side !== side || s.delay > 0) continue;
      const i = s.max - s.frames; // 0..max-1
      const t = i / Math.max(1, s.max - 1);
      switch (s.kind) {
        case "shine": m.shine = t; break;
        case "tint": if ((i >> 2) % 2 === 0 || s.max - i < 2) m.tint = s.color ?? "#f8f8f8"; break;
        case "hide": m.hidden = true; break;
        case "blink": if ((i >> 2) % 2 === 0) m.hidden = true; break;
        case "jitter": m.dx += (i >> 1) % 2 ? 1 : -1; break;
        case "sink": m.dy += Math.round(Math.sin(t * Math.PI) * 6); break;
        case "pulse": m.dy -= Math.round(Math.abs(Math.sin(t * Math.PI * 3)) * 2); void frame; break;
        case "squash": m.dy += i < 3 ? 2 : i < 6 ? 1 : 0; break;
      }
    }
    return m;
  }
}
