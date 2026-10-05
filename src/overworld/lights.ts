// Night lighting: emissive masks pulled from the art itself (window glass on
// structures, the lamp head on lamp_post tiles), warm halos, and the
// time-of-day tint. Masks are computed once per image and cached.

import type { TimeOfDay } from "../contracts";
import { SCREEN_H, SCREEN_W, TILE } from "../contracts";

type RGBA = [number, number, number, number];

/** Window glass: a clearly blue pixel (roofs are excluded by cluster size). */
export function isGlass([r, g, b, a]: RGBA): boolean {
  return a > 200 && b >= 150 && b > g + 15 && b > r + 60;
}

/** Lamp glass: warm and bright. */
export function isLampLight([r, g, b, a]: RGBA): boolean {
  return a > 200 && r >= 220 && g >= 170 && b <= 170 && r >= b + 70;
}

/** Warm colour for a lit window pixel, by the glass's brightness. */
export function warmFor([r, g, b]: RGBA): string {
  const lum = r * 0.3 + g * 0.5 + b * 0.2;
  if (lum > 200) return "#f8f0b0";
  if (lum > 130) return "#f8d060";
  return "#e09838";
}

export interface Cluster { pixels: number[]; minX: number; minY: number; maxX: number; maxY: number }

/** 4-connected clusters of pixels passing `test` in an RGBA buffer. */
export function clusters(data: Uint8ClampedArray, w: number, h: number, test: (p: RGBA) => boolean): Cluster[] {
  const on = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (test([data[o], data[o + 1], data[o + 2], data[o + 3]])) on[i] = 1;
  }
  const seen = new Uint8Array(w * h);
  const out: Cluster[] = [];
  for (let i = 0; i < w * h; i++) {
    if (!on[i] || seen[i]) continue;
    const c: Cluster = { pixels: [], minX: w, minY: h, maxX: 0, maxY: 0 };
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const j = stack.pop()!;
      c.pixels.push(j);
      const x = j % w;
      const y = (j / w) | 0;
      c.minX = Math.min(c.minX, x); c.maxX = Math.max(c.maxX, x);
      c.minY = Math.min(c.minY, y); c.maxY = Math.max(c.maxY, y);
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const k = ny * w + nx;
        if (on[k] && !seen[k]) { seen[k] = 1; stack.push(k); }
      }
    }
    out.push(c);
  }
  return out;
}

function readPixels(img: CanvasImageSource & { width: number; height: number }): ImageData | null {
  try {
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(img, 0, 0);
    return g.getImageData(0, 0, img.width, img.height);
  } catch {
    return null;
  }
}

const windowCache = new WeakMap<HTMLImageElement, HTMLCanvasElement | null>();

/**
 * The lit-window layer for a structure image: warm glass pixels plus a soft
 * 1px glow ring, transparent elsewhere. Null when the image has no windows.
 */
export function windowGlow(img: HTMLImageElement): HTMLCanvasElement | null {
  if (windowCache.has(img)) return windowCache.get(img)!;
  let result: HTMLCanvasElement | null = null;
  const px = readPixels(img);
  if (px) {
    const { data, width: w, height: h } = px;
    const wins = clusters(data, w, h, isGlass).filter(
      (c) => c.pixels.length >= 2 && c.pixels.length <= 96 && c.maxX - c.minX <= 14 && c.maxY - c.minY <= 14,
    );
    if (wins.length) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d")!;
      for (const win of wins) {
        // glow ring first (behind the glass), then the glass itself
        g.fillStyle = "rgba(248,208,96,0.28)";
        g.fillRect(win.minX - 1, win.minY - 1, win.maxX - win.minX + 3, win.maxY - win.minY + 3);
        g.clearRect(win.minX, win.minY, win.maxX - win.minX + 1, win.maxY - win.minY + 1);
        for (const j of win.pixels) {
          const o = j * 4;
          g.fillStyle = warmFor([data[o], data[o + 1], data[o + 2], data[o + 3]]);
          g.fillRect(j % w, (j / w) | 0, 1, 1);
        }
      }
      result = c;
    }
  }
  windowCache.set(img, result);
  return result;
}

const lampCache = new WeakMap<HTMLImageElement, { mask: HTMLCanvasElement | null; cx: number; cy: number }>();

/** Lamp head pixels and their centre (tile-local), from a lamp_post tile image. */
export function lampInfo(img: HTMLImageElement | undefined): { mask: HTMLCanvasElement | null; cx: number; cy: number } {
  const fallback: { mask: HTMLCanvasElement | null; cx: number; cy: number } = { mask: null, cx: 8, cy: 4 };
  if (!img) return fallback;
  const hit = lampCache.get(img);
  if (hit) return hit;
  let res = fallback;
  const px = readPixels(img);
  if (px) {
    const { data, width: w } = px;
    const heads = clusters(data, w, px.height, isLampLight).filter((c) => c.minY < 10 && c.pixels.length <= 40);
    if (heads.length) {
      const c = document.createElement("canvas");
      c.width = TILE;
      c.height = TILE;
      const g = c.getContext("2d")!;
      g.fillStyle = "#f8f0b0";
      let sx = 0, sy = 0, n = 0;
      for (const h of heads) {
        for (const j of h.pixels) {
          const x = j % w;
          const y = (j / w) | 0;
          g.fillRect(x, y, 1, 1);
          sx += x; sy += y; n++;
        }
      }
      res = { mask: c, cx: Math.round(sx / n), cy: Math.round(sy / n) };
    }
  }
  lampCache.set(img, res);
  return res;
}

/** Filled pixel disc (no anti-aliasing). */
export function pixelDisc(g: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.8));
    g.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

/** Warm stepped halo around a light (three flat rings). */
export function drawHalo(g: CanvasRenderingContext2D, cx: number, cy: number, scale = 1, flicker = 0) {
  g.fillStyle = "#f8c860";
  g.globalAlpha = 0.07;
  pixelDisc(g, cx, cy, Math.round(17 * scale) + flicker);
  g.globalAlpha = 0.09;
  pixelDisc(g, cx, cy, Math.round(11 * scale) + flicker);
  g.globalAlpha = 0.12;
  pixelDisc(g, cx, cy, Math.round(6 * scale));
  g.globalAlpha = 1;
}

/** Outdoor time-of-day tint over the world layer. */
export function drawTint(g: CanvasRenderingContext2D, tod: TimeOfDay) {
  if (tod === "day") return;
  g.save();
  g.globalCompositeOperation = "multiply";
  if (tod === "night") {
    g.fillStyle = "#6070c0";
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    // lift the deepest shadows a touch toward blue so night stays readable
    g.globalCompositeOperation = "screen";
    g.fillStyle = "rgba(16,24,64,0.35)";
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
  } else {
    // morning: warm peach light with a gentle golden lift
    g.fillStyle = "#fbe2c0";
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    g.globalCompositeOperation = "screen";
    g.fillStyle = "rgba(96,56,8,0.10)";
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }
  g.restore();
}

/** An offscreen 160x144 canvas for the occludable emissive layer. */
export function makeScreenCanvas(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = SCREEN_W;
  c.height = SCREEN_H;
  c.getContext("2d")!.imageSmoothingEnabled = false;
  return c;
}

const nightGlassCache = new WeakMap<HTMLImageElement, HTMLCanvasElement | null>();

/** Interior window tiles at night: the glass shows a deep-blue night sky with a star. */
export function nightGlass(img: HTMLImageElement): HTMLCanvasElement | null {
  if (nightGlassCache.has(img)) return nightGlassCache.get(img)!;
  let result: HTMLCanvasElement | null = null;
  const px = readPixels(img);
  if (px) {
    const { data, width: w, height: h } = px;
    const panes = clusters(data, w, h, isGlass);
    if (panes.length) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d")!;
      for (const pane of panes) {
        for (const j of pane.pixels) {
          const o = j * 4;
          const lum = data[o] * 0.3 + data[o + 1] * 0.5 + data[o + 2] * 0.2;
          g.fillStyle = lum > 190 ? "#485898" : lum > 120 ? "#283870" : "#182850";
          g.fillRect(j % w, (j / w) | 0, 1, 1);
        }
      }
      const big = panes.reduce((a, b) => (b.pixels.length > a.pixels.length ? b : a));
      if (big.maxX - big.minX >= 3 && big.maxY - big.minY >= 3) {
        g.fillStyle = "#e8e8c8";
        g.fillRect(big.minX + 1 + ((big.maxX - big.minX) >> 1), big.minY + 1, 1, 1);
      }
      result = c;
    }
  }
  nightGlassCache.set(img, result);
  return result;
}
