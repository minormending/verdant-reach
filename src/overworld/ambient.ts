// Ambient particles per `MapDef.ambient`: pollen, leaves, fireflies (night
// only), rain with splashes, mist bands and spores. Particles live in a
// wrapped field anchored to the world, so they scroll with the map instead of
// sticking to the screen. Everything is drawn as whole pixels.

import type { Ambient, TimeOfDay } from "../contracts";
import { SCREEN_H, SCREEN_W } from "../contracts";

/** The ambient that actually shows: fireflies only come out at night. */
export function effectiveAmbient(kind: Ambient | undefined, tod: TimeOfDay): Ambient {
  if (!kind) return "none";
  if (kind === "fireflies" && tod !== "night") return "none";
  return kind;
}

/** Field size the particles wrap in (a little larger than the screen). */
const FW = SCREEN_W + 32;
const FH = SCREEN_H + 32;

const mod = (a: number, n: number) => ((a % n) + n) % n;

interface P {
  x: number; y: number; vx: number; vy: number;
  ph: number;      // phase
  s: number;       // size / variant
  life: number;    // per-kind timer
  per: number;     // blink period (fireflies)
  gy: number;      // rain: screen y where the drop lands
}

interface Splash { x: number; y: number; t: number }

const COUNTS: Record<Ambient, number> = { none: 0, pollen: 16, leaves: 9, fireflies: 16, rain: 46, mist: 5, spores: 15 };

// Leaf flutter frames (3x3): 1 = main colour, 2 = dark edge.
const LEAF_FRAMES: number[][][] = [
  [[0, 1, 1], [1, 1, 2], [0, 2, 0]],
  [[1, 1, 0], [2, 1, 1], [0, 2, 0]],
  [[0, 0, 0], [1, 1, 2], [0, 0, 0]],
  [[0, 1, 0], [1, 1, 0], [0, 2, 0]],
];
const LEAF_COLORS: [string, string][] = [
  ["#e88030", "#b04020"], ["#f8c060", "#e88030"], ["#b04020", "#602010"], ["#e88030", "#602010"],
];

export class AmbientFx {
  kind: Ambient = "none";
  private parts: P[] = [];
  private splashes: Splash[] = [];
  private t = 0;
  private seed = 1;

  private rnd() {
    this.seed = (Math.imul(this.seed, 1103515245) + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  /** Switch kind (no-op if unchanged). */
  set(kind: Ambient) {
    if (kind === this.kind) return;
    this.kind = kind;
    this.parts = [];
    this.splashes = [];
    this.seed = 1 + kind.length * 977;
    for (let i = 0; i < COUNTS[kind]; i++) this.parts.push(this.spawn(true));
  }

  get count() { return this.parts.length; }

  private spawn(initial: boolean): P {
    const r = () => this.rnd();
    const p: P = { x: r() * FW, y: r() * FH, vx: 0, vy: 0, ph: r() * Math.PI * 2, s: 0, life: 0, per: 0, gy: 0 };
    switch (this.kind) {
      case "pollen":
        p.vx = 0.06 + r() * 0.12; p.vy = 0.03 + r() * 0.08; p.s = r() < 0.2 ? 2 : 1; p.life = Math.floor(r() * 120);
        break;
      case "leaves":
        p.vx = 0.1 + r() * 0.2; p.vy = 0.28 + r() * 0.22; p.s = Math.floor(r() * LEAF_COLORS.length);
        if (!initial) p.y = -4;
        break;
      case "fireflies":
        p.vx = (r() - 0.5) * 0.3; p.vy = (r() - 0.5) * 0.2; p.per = 150 + Math.floor(r() * 120); p.life = Math.floor(r() * p.per);
        break;
      case "rain":
        p.vx = -0.9; p.vy = 3.6 + r() * 0.8; p.gy = 20 + r() * (SCREEN_H - 24);
        p.y = initial ? r() * SCREEN_H : -6 - r() * 40;
        p.x = r() * (SCREEN_W + 40);
        break;
      case "mist":
        p.vx = 0.05 + r() * 0.07; p.s = 40 + Math.floor(r() * 40); p.y = r() * FH;
        break;
      case "spores":
        p.vx = (r() - 0.5) * 0.08; p.vy = -(0.05 + r() * 0.1); p.s = r() < 0.25 ? 2 : 1; p.life = Math.floor(r() * 140);
        break;
      default:
    }
    return p;
  }

  update() {
    this.t++;
    const t = this.t;
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i];
      switch (this.kind) {
        case "pollen":
          p.x += p.vx + Math.sin(t / 45 + p.ph) * 0.12;
          p.y += p.vy + Math.sin(t / 70 + p.ph * 2) * 0.05;
          p.life++;
          break;
        case "leaves":
          p.x += p.vx + Math.sin(t / 28 + p.ph) * 0.45;
          p.y += p.vy * (0.75 + 0.25 * Math.cos(t / 28 + p.ph));
          break;
        case "fireflies": {
          p.vx = Math.max(-0.3, Math.min(0.3, p.vx + (this.rnd() - 0.5) * 0.03));
          p.vy = Math.max(-0.2, Math.min(0.2, p.vy + (this.rnd() - 0.5) * 0.03));
          p.x += p.vx;
          p.y += p.vy + Math.sin(t / 50 + p.ph) * 0.06;
          p.life = (p.life + 1) % p.per;
          break;
        }
        case "rain":
          p.x += p.vx;
          p.y += p.vy;
          if (p.y >= p.gy) {
            if (this.rnd() < 0.7) this.splashes.push({ x: p.x, y: p.gy, t: 0 });
            this.parts[i] = this.spawn(false);
          }
          break;
        case "mist":
          p.x += p.vx;
          break;
        case "spores":
          p.x += p.vx + Math.sin(t / 60 + p.ph) * 0.1;
          p.y += p.vy;
          p.life++;
          break;
        default:
      }
    }
    if (this.splashes.length) {
      for (const s of this.splashes) s.t++;
      this.splashes = this.splashes.filter((s) => s.t < 10);
    }
  }

  /** Screen position of a world-anchored particle. */
  private at(p: P, camX: number, camY: number, pad = 16) {
    return { sx: Math.round(mod(p.x - camX, FW) - pad), sy: Math.round(mod(p.y - camY, FH) - pad) };
  }

  /** Particles that sit under the time-of-day tint (all but fireflies). */
  draw(g: CanvasRenderingContext2D, camX: number, camY: number) {
    const t = this.t;
    switch (this.kind) {
      case "pollen":
        for (const p of this.parts) {
          const { sx, sy } = this.at(p, camX, camY);
          const twinkle = (p.life % 120) < 96;
          g.fillStyle = twinkle ? "#f8e888" : "#e8c050";
          g.fillRect(sx, sy, p.s, p.s);
          if (p.s === 2 && twinkle && (p.life % 120) > 40 && (p.life % 120) < 56) {
            g.fillStyle = "#fff8d0";
            g.fillRect(sx, sy, 1, 1);
          }
        }
        break;
      case "leaves":
        for (const p of this.parts) {
          const { sx, sy } = this.at(p, camX, camY);
          const f = LEAF_FRAMES[Math.floor((t / 10 + p.ph * 3) % LEAF_FRAMES.length)];
          const [main, edge] = LEAF_COLORS[p.s];
          for (let yy = 0; yy < 3; yy++) {
            for (let xx = 0; xx < 3; xx++) {
              const v = f[yy][xx];
              if (!v) continue;
              g.fillStyle = v === 1 ? main : edge;
              g.fillRect(sx + xx, sy + yy, 1, 1);
            }
          }
        }
        break;
      case "rain": {
        g.fillStyle = "rgba(24,40,72,0.12)";
        g.fillRect(0, 0, SCREEN_W, SCREEN_H);
        g.fillStyle = "#c8dcf0";
        g.globalAlpha = 0.75;
        for (const p of this.parts) {
          // Rain is screen-space (it falls far faster than the camera moves).
          const x = Math.round(p.x) - 20;
          const y = Math.round(p.y);
          g.fillRect(x, y, 1, 2);
          g.fillRect(x - 1, y + 2, 1, 2);
        }
        g.globalAlpha = 1;
        for (const s of this.splashes) {
          const x = Math.round(s.x) - 20;
          const y = Math.round(s.y);
          g.fillStyle = "#e0ecf8";
          if (s.t < 3) g.fillRect(x, y, 1, 1);
          else if (s.t < 6) { g.fillRect(x - 1, y - 1, 1, 1); g.fillRect(x + 1, y - 1, 1, 1); }
          else { g.globalAlpha = 0.6; g.fillRect(x - 2, y, 1, 1); g.fillRect(x + 2, y, 1, 1); g.globalAlpha = 1; }
        }
        break;
      }
      case "mist":
        g.fillStyle = "#e8f0f0";
        for (const p of this.parts) {
          const { sx, sy } = this.at(p, camX, camY, 40);
          const len = p.s * 2;
          g.globalAlpha = 0.16;
          // A lens of 2px rows: full length in the middle, shorter above and below.
          for (let k = -3; k <= 3; k++) {
            const w = Math.round(len * (1 - (k * k) / 14));
            const x0 = sx + Math.round((len - w) / 2);
            // Wrap horizontally so a band leaving one edge re-enters the other.
            for (const off of [0, -FW]) g.fillRect(x0 + off, sy + k * 2, w, 2);
          }
          g.globalAlpha = 1;
        }
        break;
      case "spores":
        for (const p of this.parts) {
          const { sx, sy } = this.at(p, camX, camY);
          const lit = (p.life % 140) < 110;
          g.fillStyle = p.s === 2 ? (lit ? "#e0d0f8" : "#a898c8") : lit ? "#d8f0a8" : "#98b870";
          g.fillRect(sx, sy, p.s, p.s);
        }
        break;
      default:
    }
  }

  /** Particles that glow above the tint (fireflies). */
  drawGlow(g: CanvasRenderingContext2D, camX: number, camY: number) {
    if (this.kind !== "fireflies") return;
    for (const p of this.parts) {
      const { sx, sy } = this.at(p, camX, camY);
      const b = fireflyBrightness(p.life, p.per);
      if (b === 0) continue;
      if (b >= 2) {
        g.fillStyle = "rgba(200,248,112,0.28)";
        g.fillRect(sx - 1, sy - 1, 3, 3);
      }
      if (b === 3) {
        g.fillStyle = "rgba(216,248,136,0.55)";
        g.fillRect(sx - 1, sy, 3, 1);
        g.fillRect(sx, sy - 1, 1, 3);
      }
      g.fillStyle = b === 1 ? "#88a848" : "#f8f8b0";
      g.fillRect(sx, sy, 1, 1);
    }
  }
}

/** Firefly blink: 0 off, 1 dim, 2 lit, 3 peak. A soft ramp up and down each period. */
export function fireflyBrightness(life: number, per: number): 0 | 1 | 2 | 3 {
  const on = Math.min(84, Math.floor(per * 0.45));
  if (life >= on) return 0;
  if (life < 4 || life >= on - 4) return 1;
  if (life < 10 || life >= on - 10) return 2;
  return 3;
}
