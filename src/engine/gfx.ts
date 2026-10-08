// Small drawing helpers shared by the engine's scenes: images with a
// missing-art fallback, fades, shake, and frame-based waiting.

import { DEFAULT_CHARACTER_FRAME, SCREEN_H, SCREEN_W, UI } from "../contracts";
import type { ArtImage, Assets, CharacterKey } from "../contracts";

/** Frame metadata, with the original GBC size for legacy asset stores. */
export function characterFrame(assets: Assets, sprite: CharacterKey) {
  return assets.characterFrame?.(sprite) ?? DEFAULT_CHARACTER_FRAME;
}

const loggedMissing = new Set<string>();

function isMissing(assets: Assets, path: string): boolean {
  const a = assets as Assets & { isMissing?: (p: string) => boolean };
  return a.isMissing ? a.isMissing(path) : !assets.has(path);
}

/** Magenta "missing art" box (logs the path once). */
export function drawMissing(g: CanvasRenderingContext2D, path: string, x: number, y: number, w: number, h: number) {
  if (!loggedMissing.has(path)) {
    loggedMissing.add(path);
    console.warn(`[art] drawing placeholder for missing ${path}`);
  }
  g.fillStyle = "#f800f8";
  g.fillRect(x, y, w, h);
  g.fillStyle = "#780078";
  for (let yy = 0; yy < h; yy += 4) for (let xx = (yy / 4) % 2 ? 2 : 0; xx < w; xx += 4) g.fillRect(x + xx, y + yy, 2, 2);
}

/**
 * Draw (part of) an image by path. Returns false when it isn't available:
 * missing files draw the magenta box, files still loading draw nothing.
 */
export function drawImagePath(
  g: CanvasRenderingContext2D, assets: Assets, path: string,
  sx: number, sy: number, sw: number, sh: number,
  dx: number, dy: number, dw = sw, dh = sh,
  opts: { placeholder?: boolean } = {},
): boolean {
  const img = assets.image(path);
  if (img) {
    g.drawImage(img, sx, sy, sw, sh, Math.round(dx), Math.round(dy), dw, dh);
    return true;
  }
  if (opts.placeholder !== false && isMissing(assets, path)) drawMissing(g, path, Math.round(dx), Math.round(dy), dw, dh);
  return false;
}

/** Frame legacy story art at its native size, with no resampling or stretching. */
export function drawCenteredStill(g: CanvasRenderingContext2D, image: ArtImage) {
  g.fillStyle = UI.black;
  g.fillRect(0, 0, SCREEN_W, SCREEN_H);
  g.drawImage(image, Math.floor((SCREEN_W - image.width) / 2), Math.floor((SCREEN_H - image.height) / 2));
}

/** Image available right now? (Kicks off a lazy load if it isn't.) */
export function hasImage(assets: Assets, path: string): boolean {
  return assets.image(path) !== undefined;
}

/** True once the asset store knows the file doesn't exist. */
export function imageMissing(assets: Assets, path: string): boolean {
  return isMissing(assets, path);
}

// ---------------------------------------------------------------------------
// Frame timers: promises that resolve after N calls to tick().
// ---------------------------------------------------------------------------

export class Timers {
  private list: { left: number; resolve: () => void }[] = [];
  frames(n: number): Promise<void> {
    return new Promise((resolve) => {
      if (n <= 0) return resolve();
      this.list.push({ left: Math.round(n), resolve });
    });
  }
  tick() {
    for (const t of [...this.list]) {
      if (--t.left <= 0) {
        this.list.splice(this.list.indexOf(t), 1);
        t.resolve();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Fader: full-screen colour overlay with stepped (GBC palette-like) levels.
// ---------------------------------------------------------------------------

export type FadeColor = "black" | "white";

export class Fader {
  color: FadeColor = "black";
  level = 0; // 0 clear .. 1 solid
  private target = 0;
  private speed = 0;
  private resolve: (() => void) | null = null;

  /** Animate to a solid colour (or clear) over `frames`. */
  to(target: FadeColor | "clear", frames = 16): Promise<void> {
    if (target !== "clear") {
      if (this.level > 0 && this.color !== target) this.level = 0;
      this.color = target;
    }
    this.target = target === "clear" ? 0 : 1;
    this.resolve?.();
    if (frames <= 0 || this.level === this.target) {
      this.level = this.target;
      this.resolve = null;
      return Promise.resolve();
    }
    this.speed = 1 / frames;
    return new Promise((r) => (this.resolve = r));
  }

  set(color: FadeColor | "clear") {
    if (color === "clear") this.level = 0;
    else { this.color = color; this.level = 1; }
    this.target = this.level;
  }

  get solid() { return this.level >= 1; }

  tick() {
    if (this.level === this.target) return;
    const d = this.target - this.level;
    this.level = Math.abs(d) <= this.speed ? this.target : this.level + Math.sign(d) * this.speed;
    if (this.level === this.target && this.resolve) {
      const r = this.resolve;
      this.resolve = null;
      r();
    }
  }

  draw(g: CanvasRenderingContext2D, w: number, h: number) {
    if (this.level <= 0) return;
    // Quantise into 4 steps like a GBC palette fade.
    const steps = Math.ceil(this.level * 4) / 4;
    g.globalAlpha = steps;
    g.fillStyle = this.color === "black" ? "#000000" : "#f8f8f8";
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 1;
  }
}

/** Screen shake offsets. */
export class Shaker {
  private left = 0;
  private resolve: (() => void) | null = null;
  start(frames: number): Promise<void> {
    this.resolve?.();
    this.left = frames;
    return new Promise((r) => (this.resolve = r));
  }
  tick() {
    if (this.left > 0 && --this.left === 0) {
      const r = this.resolve;
      this.resolve = null;
      r?.();
    }
  }
  offset(frame: number): { x: number; y: number } {
    if (this.left <= 0) return { x: 0, y: 0 };
    const phase = Math.floor(frame / 2) % 4;
    return { x: phase === 1 ? 1 : phase === 3 ? -1 : 0, y: phase % 2 === 0 ? 2 : -2 };
  }
}
