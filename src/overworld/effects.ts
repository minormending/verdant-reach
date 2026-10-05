// Small world-space effects: running dust, ledge landing puffs, tall-grass
// rustle (a sway on the overlay plus flicked blade bits), and water glints.

import type { Dir } from "../contracts";
import { TILE } from "../contracts";
import { posHash } from "./autotile";

interface Fx {
  kind: "dust" | "bit";
  x: number; y: number;   // world px
  vx: number; vy: number;
  t: number; dur: number;
  c: number;              // colour variant
}

const DUST = ["#e8e0c8", "#d0c8b0"];
const BITS = ["#58a040", "#285828", "#98d060"];

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
        kind: "bit", x: tx * TILE + 4 + (h % 9), y: ty * TILE + 7 + ((h >> 4) % 3),
        vx: ((h >> 8) % 3 - 1) * 0.35, vy: -0.9 - ((h >> 12) % 3) * 0.2, t: 0, dur: 16, c: (h >> 16) % BITS.length,
      });
    }
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
      if (f.kind === "bit") f.vy += 0.14;
      else f.vx *= 0.9;
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

  /** Effects drawn over characters (flicked grass bits). */
  drawOver(g: CanvasRenderingContext2D, camX: number, camY: number) {
    for (const f of this.list) {
      if (f.kind !== "bit") continue;
      g.fillStyle = BITS[f.c];
      g.fillRect(Math.round(f.x - camX), Math.round(f.y - camY), f.t < 8 ? 2 : 1, 1);
    }
  }
}

/** Water glint: a sparkle that blooms and fades on a few hashed water tiles. */
export function drawWaterGlint(g: CanvasRenderingContext2D, tx: number, ty: number, sx: number, sy: number, frame: number) {
  const bucket = Math.floor((frame + ((tx * 11 + ty * 5) % 40)) / 40);
  const h = posHash(tx, ty, bucket);
  if (h % 17 !== 0) return;
  const local = (frame + ((tx * 11 + ty * 5) % 40)) % 40;
  if (local > 20) return;
  const x = sx + 3 + ((h >> 5) % 10);
  const y = sy + 3 + ((h >> 9) % 9);
  g.fillStyle = "#f0f8f8";
  if (local < 4 || local > 15) g.fillRect(x, y, 1, 1);
  else if (local < 8 || local > 11) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
  else { g.fillRect(x - 2, y, 5, 1); g.fillRect(x, y - 2, 1, 5); g.fillStyle = "#c8e8f8"; g.fillRect(x - 1, y - 1, 1, 1); g.fillRect(x + 1, y + 1, 1, 1); }
}
