// Small world-space effects: running dust, ledge landing puffs, tall-grass
// rustle (a sway on the overlay plus flicked blade bits), and water glints.

import type { Dir } from "../contracts";
import { TILE } from "../contracts";
import { posHash } from "./autotile";

interface Fx {
  kind: "dust" | "bit" | "leaf" | "berry" | "twinkle";
  x: number; y: number;   // world px
  vx: number; vy: number;
  t: number; dur: number;
  c: number;              // colour variant
}

const DUST = ["#e8e0c8", "#d0c8b0"];
const BITS = ["#58a040", "#285828", "#98d060"];
/** Leaf-burst colours: [light, dark] per leaf. */
const LEAVES: [string, string][] = [["#98d060", "#285828"], ["#58a040", "#285828"], ["#e0f0a0", "#58a040"]];
const BERRY: Record<string, [string, string]> = { berry: ["#c03850", "#f8a0b0"], hip: ["#e05020", "#f8c080"] };

export class Effects {
  private list: Fx[] = [];
  /** "x,y" -> frames since the grass on that tile was disturbed. */
  private rustles = new Map<string, number>();
  private foot = 0;

  clear() {
    this.list = [];
    this.rustles.clear();
  }

  /** Two little puffs kicked up behind a runner leaving tile (tx, ty). */
  dust(tx: number, ty: number, dir: Dir) {
    const bx = tx * TILE + 8;
    const by = ty * TILE + 14;
    const back = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[dir];
    this.foot ^= 1;
    for (const side of [this.foot ? -1 : 1]) {
      const sideways = dir === "up" || dir === "down" ? [side * 4, 0] : [0, side];
      this.list.push({
        kind: "dust", x: bx + sideways[0] + back[0] * 3, y: by + sideways[1] + back[1] * 2,
        vx: back[0] * 0.15 + side * 0.12, vy: -0.12, t: 0, dur: 14, c: side < 0 ? 0 : 1,
      });
    }
  }

  /** Landing puff after a ledge hop. */
  land(tx: number, ty: number) {
    const bx = tx * TILE + 8;
    const by = ty * TILE + 14;
    for (const side of [-1, 1]) {
      this.list.push({ kind: "dust", x: bx + side * 6, y: by, vx: side * 0.35, vy: -0.08, t: 0, dur: 16, c: 0 });
    }
  }

  /** Something stepped into tall grass at (tx, ty). */
  rustle(tx: number, ty: number, seed: number) {
    this.rustles.set(`${tx},${ty}`, 0);
    for (let i = 0; i < 3; i++) {
      const h = posHash(tx, ty, seed + i);
      this.list.push({
        kind: "bit", x: tx * TILE + 4 + (h % 9), y: ty * TILE + 7 + ((h >>> 4) % 3),
        vx: ((h >>> 8) % 3 - 1) * 0.35, vy: -0.9 - ((h >>> 12) % 3) * 0.2, t: 0, dur: 16, c: (h >>> 16) % BITS.length,
      });
    }
  }

  /**
   * Picking a bush: a spray of leaves that flutter down, a couple of fruit
   * bits, and a glint. `fruit` picks the fruit colour ("berry" or "hip").
   */
  leafBurst(tx: number, ty: number, seed: number, fruit: "berry" | "hip" = "berry") {
    const cx = tx * TILE + 8;
    const cy = ty * TILE + 6;
    for (let i = 0; i < 9; i++) {
      const h = posHash(tx, ty, seed + i * 7);
      const side = i % 2 ? 1 : -1;
      this.list.push({
        kind: "leaf", x: cx + side * (1 + (h % 5)), y: cy + ((h >>> 3) % 6),
        vx: side * (0.45 + ((h >>> 6) % 5) * 0.14), vy: -1.6 - ((h >>> 10) % 4) * 0.25,
        t: 0, dur: 20 + ((h >>> 13) % 5), c: (h >>> 17) % LEAVES.length,
      });
    }
    for (let i = 0; i < 3; i++) {
      const h = posHash(tx, ty, seed + 101 + i);
      this.list.push({
        kind: "berry", x: cx - 4 + (h % 9), y: cy + 2, vx: ((h >>> 4) % 3 - 1) * 0.3, vy: -1.1 - ((h >>> 8) % 3) * 0.2,
        t: 0, dur: 18, c: fruit === "hip" ? 1 : 0,
      });
    }
    this.list.push({ kind: "twinkle", x: cx + 3, y: cy - 3, vx: 0, vy: 0, t: 0, dur: 16, c: 0 });
  }

  /** Horizontal sway (px) for the grass overlay on a tile. */
  grassSway(tx: number, ty: number): number {
    const t = this.rustles.get(`${tx},${ty}`);
    if (t === undefined || t >= 10) return 0;
    return [1, 1, -1, -1, 1, 1, 0, -1, 0, 0][t];
  }

  update() {
    for (const f of this.list) {
      f.t++;
      f.x += f.vx;
      f.y += f.vy;
      if (f.kind === "bit" || f.kind === "berry") f.vy += 0.14;
      else if (f.kind === "leaf") {
        // rise, then flutter down side to side
        f.vy = Math.min(0.7, f.vy + 0.13);
        if (f.vy > 0) f.x += Math.sin((f.t + f.c * 5) / 3) * 0.45;
        f.vx *= 0.94;
      } else f.vx *= 0.9;
    }
    this.list = this.list.filter((f) => f.t < f.dur);
    for (const [k, t] of this.rustles) {
      if (t >= 12) this.rustles.delete(k);
      else this.rustles.set(k, t + 1);
    }
  }

  /** Ground effects (under characters). */
  drawGround(g: CanvasRenderingContext2D, camX: number, camY: number) {
    for (const f of this.list) {
      if (f.kind !== "dust") continue;
      const x = Math.round(f.x - camX);
      const y = Math.round(f.y - camY);
      g.fillStyle = DUST[f.c];
      if (f.t < 4) g.fillRect(x, y, 2, 2);
      else if (f.t < 9) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 1); }
      else { g.fillRect(x - 1, y - 1, 1, 1); g.fillRect(x + 1, y, 1, 1); }
    }
  }

  /** Effects drawn over characters (flicked grass bits, leaf bursts). */
  drawOver(g: CanvasRenderingContext2D, camX: number, camY: number) {
    for (const f of this.list) {
      const x = Math.round(f.x - camX);
      const y = Math.round(f.y - camY);
      if (f.kind === "leaf") {
        if (f.t > f.dur - 6 && f.t % 2) continue; // blink out
        const [light, dark] = LEAVES[f.c];
        // a 2px leaf that tumbles: flat, tilted, upright
        const phase = Math.floor(f.t / 4) % 3;
        g.fillStyle = light;
        if (phase === 0) g.fillRect(x, y, 2, 1);
        else if (phase === 1) { g.fillRect(x, y, 1, 1); g.fillRect(x + 1, y + 1, 1, 1); }
        else g.fillRect(x, y, 1, 2);
        g.fillStyle = dark;
        g.fillRect(phase === 2 ? x : x + 1, phase === 0 ? y + 1 : y + (phase === 2 ? 2 : 0), 1, 1);
        continue;
      }
      if (f.kind === "berry") {
        const [a, hi] = Object.values(BERRY)[f.c];
        g.fillStyle = a;
        g.fillRect(x, y, 2, 2);
        g.fillStyle = hi;
        g.fillRect(x, y, 1, 1);
        continue;
      }
      if (f.kind === "twinkle") {
        g.fillStyle = "#f8f8e8";
        if (f.t < 4 || f.t > 12) g.fillRect(x, y, 1, 1);
        else { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
        continue;
      }
      if (f.kind !== "bit") continue;
      g.fillStyle = BITS[f.c];
      g.fillRect(Math.round(f.x - camX), Math.round(f.y - camY), f.t < 8 ? 2 : 1, 1);
    }
  }
}

/**
 * Hidden-item hint: a faint 4-point twinkle that blooms on the tile about
 * every 4 seconds (each tile on its own phase). Deliberately subtle.
 */
export function drawHiddenSparkle(g: CanvasRenderingContext2D, tx: number, ty: number, sx: number, sy: number, frame: number) {
  const PERIOD = 240;
  const local = (frame + posHash(tx, ty, 7) % PERIOD) % PERIOD;
  if (local >= 22) return;
  const h = posHash(tx, ty, Math.floor((frame + posHash(tx, ty, 7) % PERIOD) / PERIOD));
  const x = sx + 4 + (h % 8);
  const y = sy + 4 + ((h >>> 4) % 7);
  g.save();
  g.globalAlpha = 0.85;
  g.fillStyle = "#f8f8e0";
  if (local < 5 || local > 16) g.fillRect(x, y, 1, 1);
  else if (local < 9 || local > 12) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
  else {
    g.fillRect(x - 2, y, 5, 1); g.fillRect(x, y - 2, 1, 5);
    g.fillStyle = "#f8e890";
    g.fillRect(x, y, 1, 1);
  }
  g.restore();
}

/** Water glint: a sparkle that blooms and fades on a few hashed water tiles. */
export function drawWaterGlint(g: CanvasRenderingContext2D, tx: number, ty: number, sx: number, sy: number, frame: number) {
  const bucket = Math.floor((frame + ((tx * 11 + ty * 5) % 40)) / 40);
  const h = posHash(tx, ty, bucket);
  if (h % 17 !== 0) return;
  const local = (frame + ((tx * 11 + ty * 5) % 40)) % 40;
  if (local > 20) return;
  const x = sx + 3 + ((h >>> 5) % 10);
  const y = sy + 3 + ((h >>> 9) % 9);
  g.fillStyle = "#f0f8f8";
  if (local < 4 || local > 15) g.fillRect(x, y, 1, 1);
  else if (local < 8 || local > 11) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
  else { g.fillRect(x - 2, y, 5, 1); g.fillRect(x, y - 2, 1, 5); g.fillStyle = "#c8e8f8"; g.fillRect(x - 1, y - 1, 1, 1); g.fillRect(x + 1, y + 1, 1, 1); }
}
