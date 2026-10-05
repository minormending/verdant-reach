// Characters on the map (player and NPCs): grid position, smooth
// interpolated steps, ledge hops, walk-cycle frames, emotes.

import type { CharacterKey, Dir, NpcDef } from "../contracts";
import { TILE } from "../contracts";
import { DIRS } from "./map";

export type Emote = "!" | "?" | "..." | "♪";

export interface Step {
  fx: number; fy: number;   // from tile
  tx: number; ty: number;   // to tile
  t: number; dur: number;   // frames elapsed / total
  hop: boolean;             // ledge jump (arc + shadow)
  resolve?: () => void;
}

export class Actor {
  x: number;
  y: number;
  facing: Dir;
  step: Step | null = null;
  /** Alternates left/right foot each step. */
  foot = 0;
  /** Walking in place against a wall (frames). */
  bumpAnim = 0;
  emote: { kind: Emote; t: number } | null = null;
  /** Script override of visibility (null = use visibleWhen). */
  forceVisible: boolean | null = null;
  home: { x: number; y: number };
  aiTimer: number;
  /** Set on the frame a ledge hop lands (cleared by the overworld). */
  justLanded = false;
  /** Ambient birds: flown away (invisible, not blocking) until they return. */
  away = false;
  /** Pixel offset + lift while flying off (birds), or null. */
  fly: { t: number; dx: number } | null = null;
  /** Small idle hop in place (frames left). */
  bob = 0;
  /** Sheet row last drawn for flag-driven objects (levers), and a clunk timer when it flips. */
  lastRow: string | null = null;
  clunk = 0;
  /** Steps left in a wander burst (dogs trot a few tiles). */
  burst = 0;

  constructor(public id: string, public sprite: CharacterKey, x: number, y: number, facing: Dir, public def?: NpcDef) {
    this.x = x;
    this.y = y;
    this.facing = facing;
    this.home = { x, y };
    this.aiTimer = 60 + ((x * 31 + y * 17) % 90);
  }

  get moving() { return this.step !== null; }

  /** Pixel position of the sprite's tile cell (top-left), before the -4px lift. */
  pixel(): { px: number; py: number; lift: number } {
    if (!this.step) return { px: this.x * TILE, py: this.y * TILE, lift: 0 };
    const s = this.step;
    const k = s.t / s.dur;
    const px = (s.fx + (s.tx - s.fx) * k) * TILE;
    const py = (s.fy + (s.ty - s.fy) * k) * TILE;
    // Ledge hops rise fast and fall a touch quicker (a little weight), 8px high.
    const lift = s.hop ? Math.round(Math.sin(Math.PI * Math.pow(k, 0.85)) * (s.dur <= 10 ? 4 : 8)) : 0;
    return { px: Math.round(px), py: Math.round(py), lift };
  }

  /** Start a one-tile (or two-tile hop) move. Position updates immediately (reserves the tile). */
  begin(dir: Dir, dur: number, opts: { hop?: boolean; dist?: number } = {}): Promise<void> {
    const { dx, dy } = DIRS[dir];
    const dist = opts.dist ?? (opts.hop ? 2 : 1);
    this.facing = dir;
    return new Promise((resolve) => {
      this.step = {
        fx: this.x, fy: this.y,
        tx: this.x + dx * dist, ty: this.y + dy * dist,
        t: 0, dur, hop: !!opts.hop, resolve,
      };
      this.x += dx * dist;
      this.y += dy * dist;
      this.foot ^= 1;
    });
  }

  /** Advance one frame. Returns true on the frame the step completes. */
  tick(): boolean {
    if (this.emote && ++this.emote.t >= 40) this.emote = null;
    if (!this.step) return false;
    this.step.t++;
    if (this.step.t >= this.step.dur) {
      const r = this.step.resolve;
      if (this.step.hop && this.step.dur > 10) this.justLanded = true;
      this.step = null;
      r?.();
      return true;
    }
    return false;
  }

  /** Was at (x,y) at the start of the current step (still partially occupies it). */
  occupies(x: number, y: number): boolean {
    if (this.x === x && this.y === y) return true;
    return !!this.step && this.step.fx === x && this.step.fy === y;
  }

  /** Sheet column: 0 stand, 1 step A, 2 step B. First half of a step shows a foot. */
  frameColumn(): number {
    if (this.step) {
      const half = this.step.t < this.step.dur / 2;
      return half ? 1 + this.foot : 0;
    }
    if (this.bumpAnim > 0) {
      const phase = Math.floor(this.bumpAnim / 8) % 4;
      return phase === 1 ? 1 : phase === 3 ? 2 : 0;
    }
    return 0;
  }
}

export function dirTo(from: { x: number; y: number }, to: { x: number; y: number }): Dir {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}
