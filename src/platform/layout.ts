// Pure layout maths for the page shell: integer scaling of the 160x144 screen
// (in *device* pixels, so every game pixel is the same size even at a
// fractional devicePixelRatio), the bezel around it, and where the touch
// controls go in portrait and landscape. No DOM here, so it is unit-tested.

export const GB_W = 160;
export const GB_H = 144;

/** Touch-control art sizes, in art pixels (scaled up by `unit`). */
export const ART = {
  dpad: 30,           // square
  button: 18,         // A / B, square
  pill: { w: 48, h: 16 }, // START / SELECT (pill + label)
  fs: 9,              // fullscreen toggle, square
} as const;

export interface Insets { top: number; right: number; bottom: number; left: number }
export interface Rect { x: number; y: number; w: number; h: number }

export interface LayoutInput {
  vw: number;           // viewport, CSS px
  vh: number;
  dpr: number;          // devicePixelRatio
  touch: boolean;       // show on-screen controls
  safe?: Insets;        // env(safe-area-inset-*)
}

export interface Layout {
  mode: "desktop" | "portrait" | "landscape";
  /** Device pixels per game pixel (an integer >= 1). */
  scale: number;
  /** Canvas rect in CSS px, snapped to the device-pixel grid. */
  screen: Rect;
  /** Bezel padding around the screen in CSS px (0 = no room for a frame). */
  bezel: number;
  /** CSS px per control-art pixel (main controls) and for START/SELECT. */
  unit: number;
  pillUnit: number;
  dpad?: Rect;
  a?: Rect;
  b?: Rect;
  start?: Rect;
  select?: Rect;
  fullscreen: Rect;
}

const ZERO: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Largest integer device-pixel scale that fits the area (at least 1). */
export function integerScale(availW: number, availH: number, dpr: number): number {
  const s = Math.floor(Math.min((availW * dpr) / GB_W, (availH * dpr) / GB_H) + 1e-6);
  return Math.max(1, s);
}

/** Snap a CSS coordinate to the device-pixel grid. */
export const snap = (v: number, dpr: number) => Math.round(v * dpr) / dpr;

/** Centre a scaled screen inside an area, snapped to device pixels. */
export function placeScreen(area: Rect, scale: number, dpr: number): Rect {
  const w = (GB_W * scale) / dpr;
  const h = (GB_H * scale) / dpr;
  return { x: snap(area.x + (area.w - w) / 2, dpr), y: snap(area.y + (area.h - h) / 2, dpr), w, h };
}

export function computeLayout(inp: LayoutInput): Layout {
  const { vw, vh, dpr } = inp;
  const safe = inp.safe ?? ZERO;
  const fsSize = 3;
  const fullscreen = (unit: number): Rect => ({
    x: vw - safe.right - 8 - ART.fs * unit,
    y: safe.top + 8,
    w: ART.fs * unit,
    h: ART.fs * unit,
  });

  if (!inp.touch) {
    const margin = 8;
    const area: Rect = { x: margin, y: margin, w: Math.max(1, vw - 2 * margin), h: Math.max(1, vh - 2 * margin) };
    const scale = integerScale(area.w, area.h, dpr);
    const screen = placeScreen({ x: 0, y: 0, w: vw, h: vh }, scale, dpr);
    const slack = Math.floor(Math.min(screen.x, screen.y));
    const bezel = clamp(slack - 6, 0, 22);
    return { mode: "desktop", scale, screen, bezel: bezel >= 6 ? bezel : 0, unit: fsSize, pillUnit: fsSize, fullscreen: fullscreen(fsSize) };
  }

  const portrait = vh >= vw;
  if (portrait) {
    // Controls get the lower part (at least 230px); the screen fits above.
    let unit = clamp(Math.floor(Math.min(vw, vh) / 90), 3, 7);
    const controlsH = clamp(Math.round(vh * 0.38), 230, 460);
    const area: Rect = {
      x: safe.left + 8,
      y: safe.top + 14,
      w: Math.max(1, vw - safe.left - safe.right - 16),
      h: Math.max(1, vh - safe.top - 14 - controlsH),
    };
    const scale = integerScale(area.w, area.h, dpr);
    const s = placeScreen(area, scale, dpr);
    const screen = { ...s, y: area.y }; // top-aligned, slack goes to the controls
    // Region for the controls: everything under the screen (and its bezel).
    const top = screen.y + screen.h + 20;
    const bottom = vh - safe.bottom - 12;
    const regionH = Math.max(0, bottom - top);
    const sideM = Math.max(16, Math.round(vw * 0.06));
    // Shrink the art until the block fits the region and the width.
    let pillUnit = Math.max(2, unit - 2);
    const blockH = (u: number, pu: number) => ART.dpad * u + Math.round(u * 6) + ART.pill.h * pu;
    const blockW = (u: number) => ART.dpad * u + ART.button * u * 2 + u * 2 + sideM * 2 + 24;
    while (unit > 2 && (blockH(unit, pillUnit) > regionH || blockW(unit) > vw)) {
      unit--;
      pillUnit = Math.max(2, unit - 2);
    }
    // Centre the block a little above the middle of the region (thumbs rest high).
    const bh = blockH(unit, pillUnit);
    const by = top + Math.max(0, Math.round((regionH - bh) * 0.4));
    const dpadS = ART.dpad * unit;
    const btn = ART.button * unit;
    const dpad: Rect = { x: safe.left + sideM, y: by, w: dpadS, h: dpadS };
    // A sits up and right, B down and left: the Game Boy diagonal.
    const clusterW = btn * 2 + unit * 2;
    const clusterH = btn + Math.round(btn * 0.55);
    const cx = vw - safe.right - sideM - clusterW;
    const cy = by + Math.round((dpadS - clusterH) / 2);
    const a: Rect = { x: cx + clusterW - btn, y: cy, w: btn, h: btn };
    const b: Rect = { x: cx, y: cy + clusterH - btn, w: btn, h: btn };
    const pw = ART.pill.w * pillUnit;
    const ph = ART.pill.h * pillUnit;
    const py = by + dpadS + Math.round(unit * 6);
    const gap = Math.round(pillUnit * 4);
    const select: Rect = { x: vw / 2 - gap / 2 - pw, y: py, w: pw, h: ph };
    const start: Rect = { x: vw / 2 + gap / 2, y: py, w: pw, h: ph };
    const fsU = Math.max(3, unit - 1);
    const fs = ART.fs * fsU;
    return {
      mode: "portrait", scale, screen, bezel: 0, unit, pillUnit,
      dpad, a, b, start, select,
      fullscreen: { x: vw - safe.right - sideM - fs, y: Math.min(bottom - fs, py + ph + Math.round(unit * 5)), w: fs, h: fs },
    };
  }

  // Landscape: D-pad in the left column, A/B in the right, the screen between.
  // Pick the control size that gives the biggest screen; among ties, the
  // biggest controls (never below thumb size).
  const sideFor = (u: number) => Math.max(ART.dpad * u, ART.button * u * 2 + u * 2, ART.pill.w * Math.max(2, u - 2)) + 24;
  const areaFor = (u: number): Rect => {
    const side = sideFor(u);
    return {
      x: safe.left + side,
      y: safe.top + 8,
      w: Math.max(1, vw - safe.left - safe.right - side * 2),
      h: Math.max(1, vh - safe.top - safe.bottom - 16),
    };
  };
  // Tablets (short side >= 600) keep the controls at least size 4.
  const minUnit = Math.min(vw, vh) >= 600 ? 4 : 3;
  let unit = minUnit;
  let best = -1;
  for (let u = clamp(Math.floor(vh / 80), minUnit, 6); u >= minUnit; u--) {
    const a = areaFor(u);
    const sc = integerScale(a.w, a.h, dpr);
    if (sc > best) { best = sc; unit = u; }
  }
  const pillUnit = Math.max(2, unit - 2);
  const side = sideFor(unit);
  const area = areaFor(unit);
  const scale = integerScale(area.w, area.h, dpr);
  const screen = placeScreen(area, scale, dpr);
  const dpadS = ART.dpad * unit;
  const btn = ART.button * unit;
  const pw = ART.pill.w * pillUnit;
  const ph = ART.pill.h * pillUnit;
  const leftCx = safe.left + side / 2;
  const rightCx = vw - safe.right - side / 2;
  const midY = vh / 2 - ph / 2;
  const dpad: Rect = { x: leftCx - dpadS / 2, y: midY - dpadS / 2, w: dpadS, h: dpadS };
  const clusterW = btn * 2 + unit * 2;
  const clusterH = btn + Math.round(btn * 0.55);
  const a: Rect = { x: rightCx + clusterW / 2 - btn, y: midY - clusterH / 2, w: btn, h: btn };
  const b: Rect = { x: rightCx - clusterW / 2, y: midY + clusterH / 2 - btn, w: btn, h: btn };
  const pillY = vh - safe.bottom - 12 - ph;
  const select: Rect = { x: leftCx - pw / 2, y: pillY, w: pw, h: ph };
  const start: Rect = { x: rightCx - pw / 2, y: pillY, w: pw, h: ph };
  const fsU = Math.max(3, unit - 1);
  return {
    mode: "landscape", scale, screen, bezel: 0, unit, pillUnit,
    dpad, a, b, start, select, fullscreen: fullscreen(fsU),
  };
}

/** Which D-pad direction a point (relative to the pad's centre) means, or null in the dead zone. */
export function dpadDirection(dx: number, dy: number, size: number): "up" | "down" | "left" | "right" | null {
  const dead = size * 0.12;
  if (Math.hypot(dx, dy) < dead) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}

/** True if two rects overlap (used by tests to check the controls never cover the screen). */
export function overlaps(p: Rect, q: Rect): boolean {
  return p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h;
}
