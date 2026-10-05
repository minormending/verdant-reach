// Cutscene camera and screen flash. Pure state machines (unit-tested): the
// overworld feeds the follow target each frame and reads back the position.

import { TILE } from "../contracts";

/** Ease in and out (sine). */
export function easeInOut(k: number): number {
  const c = Math.max(0, Math.min(1, k));
  return (1 - Math.cos(Math.PI * c)) / 2;
}

/** Camera top-left that centres a tile the way the player is centred. */
export function camForTile(x: number, y: number): { x: number; y: number } {
  return { x: x * TILE - 64, y: y * TILE - 64 };
}

/** Default pan length: about 1.6 px per frame, clamped to a pleasant range. */
export function panFrames(dx: number, dy: number): number {
  const dist = Math.hypot(dx, dy);
  return Math.max(20, Math.min(120, Math.round(dist / 1.6)));
}

type Mode = "follow" | "pan" | "hold" | "return";

export class CameraRig {
  mode: Mode = "follow";
  x = 0;
  y = 0;
  private from = { x: 0, y: 0 };
  private to = { x: 0, y: 0 };
  private t = 0;
  private dur = 1;
  private resolve: (() => void) | null = null;

  get following() { return this.mode === "follow"; }

  /** Pan to a camera position (top-left px). Resolves when it arrives; the camera then holds. */
  pan(to: { x: number; y: number }, frames?: number): Promise<void> {
    this.finish();
    this.from = { x: this.x, y: this.y };
    this.to = { ...to };
    this.dur = Math.max(1, Math.round(frames ?? panFrames(to.x - this.x, to.y - this.y)));
    this.t = 0;
    this.mode = "pan";
    return new Promise((r) => (this.resolve = r));
  }

  /** Pan back to the follow target, then follow again. */
  reset(frames?: number, target?: { x: number; y: number }): Promise<void> {
    if (this.mode === "follow") return Promise.resolve();
    this.finish();
    this.from = { x: this.x, y: this.y };
    const tgt = target ?? this.to;
    this.dur = Math.max(1, Math.round(frames ?? panFrames(tgt.x - this.x, tgt.y - this.y)));
    this.t = 0;
    this.mode = "return";
    return new Promise((r) => (this.resolve = r));
  }

  /** Jump straight back to following (map loads). */
  snap() {
    this.finish();
    this.mode = "follow";
  }

  private finish() {
    const r = this.resolve;
    this.resolve = null;
    r?.();
  }

  /** Advance one frame toward the current follow target (the player's camera position). */
  update(follow: { x: number; y: number }) {
    switch (this.mode) {
      case "follow":
        this.x = follow.x;
        this.y = follow.y;
        return;
      case "hold":
        this.x = this.to.x;
        this.y = this.to.y;
        return;
      case "pan":
      case "return": {
        this.t++;
        const target = this.mode === "return" ? follow : this.to;
        const k = easeInOut(this.t / this.dur);
        this.x = Math.round(this.from.x + (target.x - this.from.x) * k);
        this.y = Math.round(this.from.y + (target.y - this.from.y) * k);
        if (this.t >= this.dur) {
          this.mode = this.mode === "return" ? "follow" : "hold";
          this.x = target.x;
          this.y = target.y;
          this.finish();
        }
      }
    }
  }
}

/** Full-screen flash: solid for a beat, then fades out in GBC palette steps. */
export class Flash {
  color: "white" | "gold" = "white";
  t = 0;
  dur = 0;
  private resolve: (() => void) | null = null;

  run(color: "white" | "gold", frames = 28): Promise<void> {
    this.resolve?.();
    this.color = color;
    this.t = 0;
    this.dur = frames;
    return new Promise((r) => (this.resolve = r));
  }

  get active() { return this.t < this.dur; }

  /** 0..1 opacity, quantised to quarters after a solid hold of 4 frames. */
  level(): number {
    if (!this.active) return 0;
    if (this.t < 4) return 1;
    const k = 1 - (this.t - 4) / Math.max(1, this.dur - 4);
    return Math.ceil(k * 4) / 4;
  }

  tick() {
    if (!this.active) return;
    if (++this.t >= this.dur) {
      const r = this.resolve;
      this.resolve = null;
      r?.();
    }
  }

  draw(g: CanvasRenderingContext2D, w: number, h: number) {
    const a = this.level();
    if (a <= 0) return;
    g.globalAlpha = a;
    g.fillStyle = this.color === "gold" ? "#f8d860" : "#f8f8f8";
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 1;
  }
}
