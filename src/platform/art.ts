// Pixel art for the page shell (touch controls, fullscreen icon), drawn at 1x
// onto small canvases and scaled up with `image-rendering: pixelated`.
// Light comes from the top-left, shadows fall bottom-right (STYLE.md §1).

import { drawText } from "../ui/kit";
import { ART } from "./layout";

const OUT = "#181818";
const BODY = "#3a4440";
const LIT = "#5c6a62";
const SHADE = "#262e2a";
const MARK = "#a8b8a8";
const MARK_ON = "#e0f0a0";

const GREEN = "#306850";
const GREEN_LIT = "#58a040";
const GREEN_SHADE = "#1e4434";
const GREEN_DOWN = "#244c3c";

export type Dir4 = "up" | "down" | "left" | "right";

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  return [c, g];
}

/** Draws the D-pad, with `pressed` sunk in. */
export function drawDpad(g: CanvasRenderingContext2D, pressed: Dir4 | null) {
  const S = ART.dpad; // 30
  g.clearRect(0, 0, S, S);
  const a0 = 10, a1 = 20; // arm span
  const px = (x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  // Outline (cross, 1px larger), then body.
  px(a0 - 1, 0, a1 - a0 + 2, S, OUT);
  px(0, a0 - 1, S, a1 - a0 + 2, OUT);
  px(a0, 1, a1 - a0, S - 2, BODY);
  px(1, a0, S - 2, a1 - a0, BODY);
  // Top-left light on the up and left arms, shade on the bottom-right edges.
  px(a0, 1, a1 - a0, 1, LIT);
  px(a0, 1, 1, a0 - 1, LIT);
  px(1, a0, a0 - 1, 1, LIT);
  px(1, a0, 1, a1 - a0, LIT);
  px(a0, S - 2, a1 - a0, 1, SHADE);
  px(a1 - 1, a1, 1, S - a1 - 1, SHADE);
  px(S - 2, a0, 1, a1 - a0, SHADE);
  px(a1, a1 - 1, S - a1 - 1, 1, SHADE);
  // Pressed arm: sunk (dark fill, shade swapped to the top-left).
  const arm: Record<Dir4, [number, number, number, number]> = {
    up: [a0, 1, a1 - a0, a0 - 1],
    down: [a0, a1, a1 - a0, S - a1 - 1],
    left: [1, a0, a0 - 1, a1 - a0],
    right: [a1, a0, S - a1 - 1, a1 - a0],
  };
  if (pressed) {
    const [x, y, w, h] = arm[pressed];
    px(x, y, w, h, SHADE);
    px(x, y, w, 1, OUT);
    px(x, y, 1, h, OUT);
  }
  // Centre dimple.
  px(13, 13, 4, 4, SHADE);
  px(14, 14, 2, 2, BODY);
  // Arrow marks.
  const tri = (cx: number, cy: number, d: Dir4) => {
    g.fillStyle = pressed === d ? MARK_ON : MARK;
    for (let i = 0; i < 3; i++) {
      const len = 1 + i * 2;
      if (d === "up") g.fillRect(cx - i, cy + i, len, 1);
      if (d === "down") g.fillRect(cx - i, cy - i, len, 1);
      if (d === "left") g.fillRect(cx + i, cy - i, 1, len);
      if (d === "right") g.fillRect(cx - i, cy - i, 1, len);
    }
  };
  const sink = (d: Dir4) => (pressed === d ? 1 : 0);
  tri(15 + sink("up") - 1, 4 + sink("up"), "up");
  tri(15 - 1 + sink("down"), 25 + sink("down"), "down");
  tri(4 + sink("left"), 15 - 1 + sink("left"), "left");
  tri(25 + sink("right"), 15 - 1 + sink("right"), "right");
}

/** Round A/B button (18x18) with its letter. */
export function drawRoundButton(g: CanvasRenderingContext2D, label: string, down: boolean) {
  const S = ART.button;
  g.clearRect(0, 0, S, S);
  // A pixel circle: row spans for an 18px disc.
  const spans = [5, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 3, 5];
  const off = down ? 1 : 0;
  // Drop shadow under the button (only when raised).
  if (!down) {
    g.fillStyle = "rgba(0,0,0,0.35)";
    for (let y = 0; y < S; y++) g.fillRect(spans[y] + 1, y + 1, S - spans[y] * 2, 1);
  }
  for (let y = 0; y < S; y++) {
    const x0 = spans[y];
    g.fillStyle = OUT;
    g.fillRect(x0 + off, y + off, S - x0 * 2 - off, 1);
  }
  for (let y = 1; y < S - 1; y++) {
    const x0 = spans[y] + 1;
    const w = S - x0 * 2 - off;
    if (w <= 0) continue;
    g.fillStyle = down ? GREEN_DOWN : GREEN;
    g.fillRect(x0 + off, y + off, w, 1);
  }
  if (!down) {
    // Top-left highlight crescent and bottom-right shade.
    g.fillStyle = GREEN_LIT;
    g.fillRect(5, 2, 6, 1); g.fillRect(3, 3, 3, 1); g.fillRect(2, 4, 2, 2); g.fillRect(2, 6, 1, 4);
    g.fillStyle = GREEN_SHADE;
    g.fillRect(7, 15, 6, 1); g.fillRect(12, 14, 3, 1); g.fillRect(14, 12, 2, 2); g.fillRect(15, 8, 1, 4);
  }
  drawText(g, label, 5 + off, 5 + off, down ? MARK : "#f8f8f8");
}

/** START / SELECT: a slanted rubber pill over its label. */
export function drawPill(g: CanvasRenderingContext2D, label: string, down: boolean) {
  const { w: W, h: H } = ART.pill;
  g.clearRect(0, 0, W, H);
  const pw = 18, ph = 5;
  const x = Math.round((W - pw) / 2);
  const off = down ? 1 : 0;
  g.fillStyle = OUT;
  g.fillRect(x + 1 + off, 0 + off, pw - 2, ph);
  g.fillRect(x + off, 1 + off, pw, ph - 2);
  g.fillStyle = down ? SHADE : BODY;
  g.fillRect(x + 1 + off, 1 + off, pw - 2, ph - 2);
  if (!down) {
    g.fillStyle = LIT;
    g.fillRect(x + 2, 1, pw - 5, 1);
  }
  const tw = label.length * 8;
  drawText(g, label, Math.round((W - tw) / 2), ph + 3, down ? MARK_ON : MARK);
}

/** Fullscreen toggle: four corner brackets (outward when windowed, inward when full). */
export function drawFullscreenIcon(g: CanvasRenderingContext2D, isFull: boolean) {
  const S = ART.fs; // 9
  g.clearRect(0, 0, S, S);
  g.fillStyle = MARK;
  const L = 3;
  const corners: [number, number, number, number][] = [[0, 0, 1, 1], [S - 1, 0, -1, 1], [0, S - 1, 1, -1], [S - 1, S - 1, -1, -1]];
  for (const [cx, cy, sx, sy] of corners) {
    if (!isFull) {
      for (let i = 0; i < L; i++) { g.fillRect(cx + sx * i, cy, 1, 1); g.fillRect(cx, cy + sy * i, 1, 1); }
    } else {
      const ix = cx + sx * (L - 1), iy = cy + sy * (L - 1);
      for (let i = 0; i < L; i++) { g.fillRect(ix - sx * i, iy, 1, 1); g.fillRect(ix, iy - sy * i, 1, 1); }
    }
  }
}

/** A canvas element sized for art and scaled to `unit` CSS px per pixel. */
export function artCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const [c, g] = canvas(w, h);
  c.style.imageRendering = "pixelated";
  c.style.width = "100%";
  c.style.height = "100%";
  c.style.display = "block";
  return [c, g];
}
