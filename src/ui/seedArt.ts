// Nursery seed art: the 16x16 party/follower icon (2 frames) and the 56x56
// summary / sprouting picture, read from uiPath("seed" | "seed__2" | "seed_big").
// Until the art lands, a tidy hand-placed stand-in is drawn in the wood ramp.
// The sprouting scene draws its cracks over either.

import type { Assets } from "../contracts";
import { uiPath } from "../contracts";

type Img = HTMLImageElement | HTMLCanvasElement;
const cache = new Map<string, HTMLCanvasElement>();

const OUT = "#4a2818";
const DARK = "#8a5030";
const MID = "#c88850";
const LIGHT = "#f0c890";
const LEAF = "#58a040";
const LEAF_DARK = "#285828";

function canvas(key: string, w: number, h: number, paint: (px: (x: number, y: number, c: string) => void) => void): HTMLCanvasElement | null {
  const hit = cache.get(key);
  if (hit) return hit;
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  paint((x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); });
  cache.set(key, c);
  return c;
}

/** An egg-shaped seed: outline, body, a top-left highlight, bottom-right shade, a sprout tip. */
function paintSeed(px: (x: number, y: number, c: string) => void, w: number, h: number, cx: number, cy: number, rx: number, ry: number, sprout: number) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // pointed top: narrower above the centre
      const ny = (y - cy) / ry;
      const k = ny < 0 ? rx * (1 + ny * 0.25) : rx;
      const d = ((x - cx) / k) ** 2 + ny ** 2;
      if (d > 1) continue;
      let col = MID;
      if (d > 0.78) col = OUT;
      else if ((x - cx) / k + ny < -0.75 && d < 0.5) col = LIGHT;
      else if ((x - cx) / k + ny > 0.55) col = DARK;
      px(x, y, col);
    }
  }
  // a seam down the middle and a few speckles
  for (let y = Math.round(cy - ry * 0.55); y < Math.round(cy + ry * 0.6); y += 2) px(Math.round(cx + 1), y, DARK);
  // sprout curl at the tip
  const tip = Math.round(cy - ry);
  for (let i = 0; i < sprout; i++) px(Math.round(cx), tip - i, LEAF_DARK);
  if (sprout > 0) {
    px(Math.round(cx) + 1, tip - sprout + 1, LEAF);
    px(Math.round(cx) + 2, tip - sprout, LEAF);
    if (sprout > 2) { px(Math.round(cx) - 1, tip - sprout + 2, LEAF); px(Math.round(cx) - 2, tip - sprout + 1, LEAF); }
  }
}

function fallbackIcon(frame: 0 | 1): HTMLCanvasElement | null {
  // frame 2 squashes down a pixel (the icon "breathes" like a warm egg)
  return canvas(`seed:${frame}`, 16, 16, (px) => paintSeed(px, 16, 16, 7.5, frame ? 10 : 9.5, 4.6, frame ? 5 : 5.5, 2));
}

function fallbackBig(): HTMLCanvasElement | null {
  return canvas("seed_big", 56, 56, (px) => {
    paintSeed(px, 56, 56, 27.5, 32, 16, 20, 5);
    // speckles
    for (const [x, y] of [[20, 26], [24, 38], [33, 30], [30, 44], [36, 39], [18, 34]]) px(x, y, DARK);
  });
}

/** The seed's party/follower icon. `flip` mirrors it (followers walking right). */
export function seedIcon(assets: Assets, frame: 0 | 1): Img | null {
  const path = uiPath(frame ? "seed__2" : "seed");
  return assets.image(path) ?? (frame ? assets.image(uiPath("seed")) : undefined) ?? fallbackIcon(frame);
}

export function drawSeedIcon(g: CanvasRenderingContext2D, assets: Assets, x: number, y: number, frame: 0 | 1) {
  const img = seedIcon(assets, frame);
  if (img) g.drawImage(img, Math.round(x), Math.round(y));
}

export function seedBig(assets: Assets): Img | null {
  return assets.image(uiPath("seed_big")) ?? fallbackBig();
}

/**
 * The 56x56 seed, with `crack` 0..3 stages of cracks spreading from the top and a
 * glint of light in the last stage.
 */
export function drawSeedBig(g: CanvasRenderingContext2D, assets: Assets, x: number, y: number, crack = 0) {
  const img = seedBig(assets);
  x = Math.round(x); y = Math.round(y);
  if (img) g.drawImage(img, x, y);
  if (crack <= 0) return;
  // a zig-zag crack down from the crown, branching as it grows
  const main: [number, number][] = [[28, 14], [27, 17], [29, 20], [26, 23], [28, 26], [25, 29], [27, 32]];
  const left: [number, number][] = [[26, 23], [23, 24], [21, 22], [19, 24]];
  const right: [number, number][] = [[29, 20], [32, 21], [34, 19], [36, 22], [38, 21]];
  const len = crack === 1 ? 3 : crack === 2 ? 5 : main.length;
  const line = (pts: [number, number][], n: number, col: string) => {
    g.fillStyle = col;
    for (let i = 1; i < n; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let s = 0; s <= steps; s++) {
        g.fillRect(x + Math.round(x0 + ((x1 - x0) * s) / steps), y + Math.round(y0 + ((y1 - y0) * s) / steps), 1, 1);
      }
    }
  };
  line(main, len, "#181818");
  if (crack >= 2) line(right, crack === 2 ? 3 : right.length, "#181818");
  if (crack >= 3) {
    line(left, left.length, "#181818");
    // light leaking out of the crack
    g.fillStyle = "#f8f0b0";
    for (const [cx, cy] of [[28, 16], [28, 21], [27, 27], [33, 20]]) g.fillRect(x + cx + 1, y + cy, 1, 1);
  }
}
