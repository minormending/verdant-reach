// Shared GBC drawing helpers for battle and menu screens: the tiny HUD font,
// HP/EXP bars, species sprites (with a neat placeholder while art lands),
// sport recolouring, silhouettes, pods and small icons.

import type { GameContext, SpeciesId, SpeciesSpriteKind, StatusId, TypeId } from "../../contracts";
import { speciesPath, UI } from "../../contracts";

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

export const TYPE_COLORS: Record<TypeId, { light: string; mid: string; dark: string }> = {
  wood:   { light: "#a8e070", mid: "#58a040", dark: "#285820" },
  fire:   { light: "#f8c070", mid: "#e85820", dark: "#882010" },
  water:  { light: "#a0d8f8", mid: "#3888e0", dark: "#183888" },
  bug:    { light: "#d8e870", mid: "#90b020", dark: "#486010" },
  bloom:  { light: "#f8c8e0", mid: "#e070a8", dark: "#883060" },
  ghost:  { light: "#d0b8f0", mid: "#7858b8", dark: "#382860" },
  thorn:  { light: "#e0c890", mid: "#a07838", dark: "#584018" },
  frost:  { light: "#e8f8ff", mid: "#88c8e8", dark: "#3878a0" },
  dragon: { light: "#f0a0a0", mid: "#b83838", dark: "#601818" },
};

export const STATUS_COLORS: Record<StatusId, string> = {
  blight: "#8848a8", scorch: "#e05020", frostbite: "#4890d0", dormant: "#707888", rootbound: "#b89020",
};

// ---------------------------------------------------------------------------
// Tiny 3x5 font for HUD labels (HP, :L, EXP, PP, No.)
// ---------------------------------------------------------------------------

const TINY: Record<string, string> = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110",
  E: "111100110100111", F: "111100110100100", G: "011100101101011", H: "101101111101101",
  I: "111010010010111", K: "101101110101101", L: "100100100100111", M: "101111111101101",
  N: "110101101101101", O: "010101101101010", P: "110101110100100", R: "110101110101101",
  S: "011100010001110", T: "111010010010010", U: "101101101101111", V: "101101101101010",
  W: "101101111111101", X: "101101010101101", Y: "101101010010010", Z: "111001010100111",
  "0": "111101101101111", "1": "010110010010111", "2": "110001010100111", "3": "110001010001110",
  "4": "101101111001001", "5": "111100110001110", "6": "011100111101111", "7": "111001010010010",
  "8": "111101111101111", "9": "111101111001110", ":": "000010000010000", "/": "001001010100100",
  ".": "000000000000010", "-": "000000111000000", "+": "000010111010000", " ": "000000000000000",
  "'": "010010000000000", "J": "001001001101010", "Q": "010101101110011", "!": "010010010000010", "?": "110001010000010",
};

/** Draw tiny 3x5 text; each glyph advances 4px. */
export function drawTiny(g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string = UI.black): number {
  g.fillStyle = color;
  let cx = Math.round(x);
  for (const ch of text.toUpperCase()) {
    const bits = TINY[ch] ?? TINY[" "];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
      if (bits[r * 3 + c] === "1") g.fillRect(cx + c, Math.round(y) + r, 1, 1);
    }
    cx += 4;
  }
  return cx - x;
}

/** ":L" level tag in one 8px cell followed by the level digits in the main font. */
export function drawLevel(ctx: GameContext, g: CanvasRenderingContext2D, level: number, x: number, y: number) {
  if (level >= 100) {
    ctx.ui.drawText(g, String(level), x, y);
    return;
  }
  drawTiny(g, ":L", x, y + 2);
  ctx.ui.drawText(g, String(level), x + 8, y);
}

/** "HP" label cell (8px wide). */
export function drawHpLabel(g: CanvasRenderingContext2D, x: number, y: number) {
  g.fillStyle = UI.black;
  // Crystal's HP tile: tiny H P on a dark tab
  g.fillRect(x, y, 8, 7);
  drawTiny(g, "H", x - 0, y + 1, UI.white);
  drawTiny(g, "P", x + 4, y + 1, UI.white);
}

// ---------------------------------------------------------------------------
// Bars
// ---------------------------------------------------------------------------

export function hpColor(frac: number): string {
  if (frac > 0.5) return UI.hpGreen;
  if (frac > 0.2) return UI.hpYellow;
  return UI.hpRed;
}

/** HP bar: "HP" tab then a framed bar `w` px wide (fill area). */
export function drawHpBar(g: CanvasRenderingContext2D, x: number, y: number, hp: number, max: number, w = 48) {
  drawHpLabel(g, x, y);
  const bx = x + 8;
  g.fillStyle = UI.black;
  g.fillRect(bx, y, w + 2, 1);
  g.fillRect(bx, y + 6, w + 2, 1);
  g.fillRect(bx + w + 1, y + 1, 1, 5);
  g.fillStyle = UI.white;
  g.fillRect(bx, y + 1, w + 1, 5);
  const frac = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
  let px = Math.round(frac * w);
  if (hp > 0 && px === 0) px = 1;
  g.fillStyle = hpColor(frac);
  g.fillRect(bx + 1, y + 2, px, 3);
}

/** EXP bar, filling right to left as in Crystal. */
export function drawExpBar(g: CanvasRenderingContext2D, x: number, y: number, frac: number, w = 64, top = true) {
  drawTiny(g, "EXP", x, y + 1);
  const bx = x + 13;
  const bw = w - 13;
  g.fillStyle = UI.black;
  if (top) g.fillRect(bx, y, bw, 1);
  g.fillRect(bx, y + 6, bw, 1);
  g.fillRect(bx - 1, y + 1, 1, 5);
  g.fillRect(bx + bw, y + 1, 1, 5);
  g.fillStyle = UI.white;
  g.fillRect(bx, y + 1, bw, 5);
  const px = Math.round(Math.max(0, Math.min(1, frac)) * (bw - 2));
  g.fillStyle = UI.expBlue;
  g.fillRect(bx + bw - 1 - px, y + 2, px, 3);
}

// ---------------------------------------------------------------------------
// Cursors and arrows (drawn with the font's own glyphs)
// ---------------------------------------------------------------------------

/** The cursor's 1px bob (active cursors only): 0 or 1 on a slow beat. */
export function cursorBob(frame: number): number {
  return Math.floor(frame / 20) % 2;
}

export function drawCursor(ctx: GameContext, g: CanvasRenderingContext2D, x: number, y: number, hollow = false, frame?: number) {
  const bob = hollow || frame === undefined ? 0 : cursorBob(frame);
  ctx.ui.drawText(g, hollow ? "▷" : "▶", x + bob, y);
}

export function drawMoreArrow(ctx: GameContext, g: CanvasRenderingContext2D, x: number, y: number, frame: number, dir: "down" | "up" = "down") {
  if (Math.floor(frame / 16) % 2 === 0) ctx.ui.drawText(g, dir === "down" ? "▼" : "▲", x, y);
}

/**
 * Botanist's paper: a warm sheet with sparse fibres and flecks (cached per
 * size and tone). Deterministic, so it never shimmers.
 */
const paperCache = new Map<string, HTMLCanvasElement>();
export function drawPaper(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tone: "cream" | "white" | "kraft" = "cream") {
  const key = `${w}x${h}:${tone}`;
  let c = paperCache.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = w; c.height = h;
    const pg = c.getContext("2d")!;
    const base = tone === "white" ? "#f8f6ee" : tone === "kraft" ? "#e0c898" : "#f4ecd4";
    const fleck = tone === "white" ? "#e8e4d4" : tone === "kraft" ? "#c8ac78" : "#e4d8b4";
    const fibre = tone === "white" ? "#eeeadc" : tone === "kraft" ? "#d4ba88" : "#ece2c4";
    pg.fillStyle = base;
    pg.fillRect(0, 0, w, h);
    let seed = 1234567;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    pg.fillStyle = fibre;
    for (let i = 0; i < (w * h) / 90; i++) {
      const fx = Math.floor(rnd() * w), fy = Math.floor(rnd() * h), len = 2 + Math.floor(rnd() * 4);
      if (rnd() < 0.5) pg.fillRect(fx, fy, len, 1); else pg.fillRect(fx, fy, 1, len);
    }
    pg.fillStyle = fleck;
    for (let i = 0; i < (w * h) / 60; i++) pg.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h), 1, 1);
    paperCache.set(key, c);
  }
  g.drawImage(c, Math.round(x), Math.round(y));
}

/** Bounds of the opaque pixels in an image (cached), e.g. to pin a sprite by its stem. */
const boundsCache = new WeakMap<object, { x0: number; y0: number; x1: number; y1: number; baseX: number }>();
export function opaqueBounds(img: HTMLImageElement | HTMLCanvasElement) {
  const hit = boundsCache.get(img);
  if (hit) return hit;
  const w = img.width, h = img.height;
  const out = { x0: 0, y0: 0, x1: w - 1, y1: h - 1, baseX: w >> 1 };
  try {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const cg = c.getContext("2d")!;
    cg.drawImage(img, 0, 0);
    const d = cg.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] < 128) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 >= 0) {
      // the middle of the bottom-most opaque row: where the stem / base sits
      let a = -1, b = -1;
      for (let x = 0; x < w; x++) if (d[(y1 * w + x) * 4 + 3] >= 128) { if (a < 0) a = x; b = x; }
      Object.assign(out, { x0, y0, x1, y1, baseX: Math.round((a + b) / 2) });
    }
  } catch {
    /* tainted or not loaded: fall back to the full frame */
  }
  if (img.width) boundsCache.set(img, out);
  return out;
}

/** A 16x16 item icon when the art exists; returns false if it doesn't. */
export function drawItemIcon(ctx: GameContext, g: CanvasRenderingContext2D, id: string, x: number, y: number): boolean {
  const img = ctx.assets.image(`assets/items/${id}.png`);
  if (!img) return false;
  g.drawImage(img, Math.round(x), Math.round(y));
  return true;
}

/** Fill the whole screen with the menu background. */
export function clearScreen(g: CanvasRenderingContext2D, color: string = UI.white) {
  g.fillStyle = color;
  g.fillRect(0, 0, 160, 144);
}

/** Right-align text so it ends at `right`. */
export function drawTextRight(ctx: GameContext, g: CanvasRenderingContext2D, text: string, right: number, y: number, color?: string) {
  ctx.ui.drawText(g, text, right - ctx.ui.measure(text), y, color);
}

/** Pad a number to width with leading spaces (Crystal-style "  7/ 21"). */
export const pad = (n: number | string, w: number) => String(n).padStart(w, " ");

// ---------------------------------------------------------------------------
// Offscreen helpers (silhouettes, recolours) with caching
// ---------------------------------------------------------------------------

type Src = HTMLImageElement | HTMLCanvasElement;
const cache = new Map<string, HTMLCanvasElement>();

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function cached(key: string, w: number, h: number, paint: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) {
    c = makeCanvas(w, h);
    const g = c.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    paint(g);
    cache.set(key, c);
  }
  return c;
}

/** Solid-colour silhouette of an image (for growth flashes and pod pulls). */
export function silhouette(key: string, src: Src, color: string): HTMLCanvasElement {
  return cached(`sil:${key}:${color}`, src.width, src.height, (g) => {
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = color;
    g.fillRect(0, 0, src.width, src.height);
  });
}

/**
 * Sport (shiny) recolour: greens drift to a variegated cream/gold, as a real
 * horticultural sport often shows paler, variegated leaves.
 */
export function sportVersion(key: string, src: Src): HTMLCanvasElement {
  return cached(`sport:${key}`, src.width, src.height, (g) => {
    g.drawImage(src, 0, 0);
    const img = g.getImageData(0, 0, src.width, src.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      const max = Math.max(r, gg, b), min = Math.min(r, gg, b);
      if (max - min < 24) continue; // keep outlines/greys
      // rotate hue: green -> gold, red -> violet, blue -> teal
      d[i] = Math.min(255, Math.round(gg * 0.95 + r * 0.25));
      d[i + 1] = Math.min(255, Math.round(gg * 0.85 + b * 0.25));
      d[i + 2] = Math.min(255, Math.round(r * 0.55 + b * 0.2));
    }
    g.putImageData(img, 0, 0);
  });
}

// ---------------------------------------------------------------------------
// Species sprites
// ---------------------------------------------------------------------------

/** Any species sprite: front … front__8 (animation frames), back, icon, icon__2. */
export type SpriteKind = SpeciesSpriteKind;
const sizeOf = (kind: SpriteKind): number => (kind === "back" ? 48 : kind.startsWith("icon") ? 16 : 56);
const warnedMissing = new Set<string>();

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * A tidy procedural stand-in while the art agent's sprite isn't there yet:
 * a little plant (soil, stem, leaves, a bud) in the species' type colours.
 */
function placeholderSprite(id: string, kind: SpriteKind, types: readonly TypeId[]): HTMLCanvasElement {
  const size = sizeOf(kind);
  return cached(`ph:${id}:${kind}:${types.join(",")}`, size, size, (g) => {
    const h = hash(id);
    const c1 = TYPE_COLORS[types[0] ?? "wood"];
    const c2 = TYPE_COLORS[types[1] ?? types[0] ?? "wood"];
    const s = size / 56;
    const P = (x: number, y: number, w: number, hh: number, col: string) => {
      g.fillStyle = col;
      g.fillRect(Math.round(x * s), Math.round(y * s), Math.max(1, Math.round(w * s)), Math.max(1, Math.round(hh * s)));
    };
    const back = kind === "back";
    // soil mound
    P(12, 48, 32, 4, "#604830");
    P(8, 51, 40, 4, "#403020");
    P(14, 47, 28, 2, "#806040");
    // stem
    const stemH = 18 + (h % 10);
    P(27, 48 - stemH, 3, stemH, c1.dark);
    P(28, 48 - stemH, 1, stemH, c1.mid);
    // leaves
    const pairs = 2 + (h % 2);
    for (let i = 0; i < pairs; i++) {
      const ly = 46 - i * Math.floor(stemH / (pairs + 0.5)) - 6;
      const len = 9 + ((h >> (i + 3)) % 6);
      for (let k = 0; k < len; k++) {
        const dy = Math.round(Math.sin((k / len) * Math.PI) * 3);
        P(26 - k, ly - dy - (k >> 2), 1, 3, k === 0 ? c1.dark : c1.mid);
        P(30 + k, ly - dy - (k >> 2), 1, 3, k === 0 ? c1.dark : c1.mid);
        P(26 - k, ly - dy - (k >> 2), 1, 1, c1.light);
        P(30 + k, ly - dy - (k >> 2), 1, 1, c1.light);
      }
    }
    // bud / bloom
    const top = 48 - stemH;
    const r = 5 + (h % 4);
    for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
      const d = xx * xx + yy * yy;
      if (d > r * r) continue;
      const col = d > (r - 1.5) * (r - 1.5) ? c2.dark : yy < -r / 3 && xx < 0 ? c2.light : c2.mid;
      P(28 + xx, top - r + 2 + yy, 1, 1, back ? (col === c2.light ? c2.mid : col) : col);
    }
  });
}

export function speciesSpritePath(id: SpeciesId, kind: SpriteKind): string {
  return speciesPath(id, kind);
}

/** The image (or a placeholder) for a species sprite. */
export function speciesImage(ctx: GameContext, id: SpeciesId, kind: SpriteKind, opts: { sport?: boolean } = {}): Src {
  const path = speciesPath(id, kind);
  // Sports use the bundle's exact `sport` palette (`?sport`); the old hue shift
  // below is only a fallback for art without one.
  const sportPath = opts.sport ? speciesPath(id, kind, { sport: true }) : null;
  const exact = sportPath !== null && ctx.assets.exists(sportPath);
  let img: Src | undefined = ctx.assets.image(exact ? sportPath : path);
  if (!img && kind === "icon__2") return speciesImage(ctx, id, "icon", opts);
  if (!img && kind.startsWith("front__")) return speciesImage(ctx, id, "front", opts); // extra frames fall back to the rest pose
  if (!img) {
    if (!warnedMissing.has(path)) {
      warnedMissing.add(path);
      console.warn(`[art] missing ${path}; drawing a placeholder`);
    }
    const types = (ctx.data.species[id]?.types ?? ["wood"]) as readonly TypeId[];
    img = placeholderSprite(id, kind, types);
  }
  if (opts.sport && !exact) img = sportVersion(path, img);
  return img;
}

export interface SpriteDrawOpts {
  sport?: boolean;
  /** Draw as a solid silhouette of this colour. */
  silhouette?: string;
  /** Uniform scale about the bottom-centre (0..1). */
  scale?: number;
  /** Pixels hidden from the bottom (wilt slide). The sprite moves down by this much and is clipped at `clipBottom`. */
  drop?: number;
  clipBottom?: number;
  alpha?: number;
  flipX?: boolean;
}

export function drawSpecies(
  ctx: GameContext, g: CanvasRenderingContext2D, id: SpeciesId, kind: SpriteKind, x: number, y: number, opts: SpriteDrawOpts = {},
) {
  const size = sizeOf(kind);
  let img: Src = speciesImage(ctx, id, kind, { sport: opts.sport });
  if (opts.silhouette) img = silhouette(`${id}:${kind}:${opts.sport ? "s" : ""}`, img, opts.silhouette);
  drawImageOpts(g, img, x, y, size, size, opts);
}

/** Draw any image with scale / drop / clip / alpha options. */
export function drawImageOpts(g: CanvasRenderingContext2D, img: Src, x: number, y: number, w: number, h: number, opts: SpriteDrawOpts = {}) {
  const scale = opts.scale ?? 1;
  if (scale <= 0) return;
  g.save();
  if (opts.alpha !== undefined) g.globalAlpha = opts.alpha;
  if (opts.clipBottom !== undefined) {
    g.beginPath();
    g.rect(0, 0, 160, opts.clipBottom);
    g.clip();
  }
  const dw = Math.max(1, Math.round(w * scale));
  const dh = Math.max(1, Math.round(h * scale));
  const dx = Math.round(x + (w - dw) / 2);
  const dy = Math.round(y + (h - dh) + (opts.drop ?? 0));
  if (opts.flipX) {
    g.translate(dx + dw, dy);
    g.scale(-1, 1);
    g.drawImage(img, 0, 0, img.width, img.height, 0, 0, dw, dh);
  } else {
    g.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
  }
  g.restore();
}

/** Species icon (party menu) with its two-frame bob. */
export function drawIcon(ctx: GameContext, g: CanvasRenderingContext2D, id: SpeciesId, x: number, y: number, frame: number, sport = false) {
  const two = ctx.assets.has(speciesPath(id, "icon__2"));
  const kind: SpriteKind = frame % 2 === 1 ? "icon__2" : "icon";
  if (two || frame % 2 === 0) {
    drawSpecies(ctx, g, id, kind, x, y, { sport });
  } else {
    // No second frame: bob the first one by a pixel.
    drawSpecies(ctx, g, id, "icon", x, y - 1, { sport });
  }
}

// ---------------------------------------------------------------------------
// Pods, leaves and small glyph-icons
// ---------------------------------------------------------------------------

/**
 * Terrarium pod: a clear glass acorn with a wooden cap, 8x10. `state` greys
 * it out (wilted), tints it (status) or draws an empty outline.
 */
export function drawPod(g: CanvasRenderingContext2D, x: number, y: number, state: "ok" | "status" | "wilted" | "empty" = "ok", open = 0) {
  x = Math.round(x); y = Math.round(y);
  const cap = state === "wilted" ? "#808080" : "#8a5a30";
  const capHi = state === "wilted" ? "#b0b0b0" : "#c08850";
  const glass = state === "wilted" ? "#c8c8c8" : state === "status" ? "#f0c080" : "#b8e8f0";
  const edge = state === "wilted" ? "#606060" : "#306878";
  if (state === "empty") {
    g.fillStyle = "#a0a0a0";
    g.fillRect(x + 1, y + 3, 6, 1); g.fillRect(x + 1, y + 8, 6, 1);
    g.fillRect(x, y + 4, 1, 4); g.fillRect(x + 7, y + 4, 1, 4);
    return;
  }
  const oy = -open; // cap lifts when opening
  // stalk + cap
  g.fillStyle = cap;
  g.fillRect(x + 3, y + oy, 2, 1);
  g.fillRect(x + 1, y + 1 + oy, 6, 2);
  g.fillRect(x, y + 2 + oy, 8, 1);
  g.fillStyle = capHi;
  g.fillRect(x + 2, y + 1 + oy, 2, 1);
  // glass body
  g.fillStyle = edge;
  g.fillRect(x, y + 3, 1, 4); g.fillRect(x + 7, y + 3, 1, 4);
  g.fillRect(x + 1, y + 7, 1, 1); g.fillRect(x + 6, y + 7, 1, 1);
  g.fillRect(x + 2, y + 8, 4, 1);
  g.fillStyle = glass;
  g.fillRect(x + 1, y + 3, 6, 4);
  g.fillRect(x + 2, y + 7, 4, 1);
  g.fillStyle = "#ffffff";
  g.fillRect(x + 2, y + 4, 1, 2);
  // a sprout inside
  if (state !== "wilted") {
    g.fillStyle = "#48a040";
    g.fillRect(x + 4, y + 5, 1, 2);
    g.fillRect(x + 5, y + 4, 1, 1);
  }
}

/** Little leaf (herbarium "caught" marker), 7x7. */
export function drawLeaf(g: CanvasRenderingContext2D, x: number, y: number, color = "#48a040") {
  const rows = ["0000011", "0001110", "0011110", "0111100", "0111000", "0100000", "1000000"];
  g.fillStyle = color;
  rows.forEach((r, yy) => {
    for (let xx = 0; xx < 7; xx++) if (r[xx] === "1") g.fillRect(x + xx, y + yy, 1, 1);
  });
  g.fillStyle = "#286020";
  for (let i = 1; i < 6; i++) g.fillRect(x + i, y + 6 - i, 1, 1);
}

/** 7x7 status icons, two frames each (a = main, b = dark, c = light). */
const STATUS_ICONS: Record<StatusId, { pal: Record<string, string>; frames: [string[], string[]] }> = {
  blight: {
    pal: { a: "#9850b8", b: "#482060", c: "#e0b8f8" },
    frames: [
      ["....bb.", "...bcab", "....bb.", ".bbb...", "bcaab..", "baaab..", ".bbb..."],
      ["...bb..", "..bcab.", "...bb..", "..bbb..", ".bcaab.", ".baaab.", "..bbb.."],
    ],
  },
  scorch: {
    pal: { a: "#f89028", b: "#c03010", c: "#f8e070" },
    frames: [
      ["...b...", "..bab..", "..bab.b", ".baab.b", "bacaabb", "bacccab", ".bbbbb."],
      ["..b....", "..bab..", "b.bab..", "b.baab.", "bbacaab", "bacccab", ".bbbbb."],
    ],
  },
  frostbite: {
    pal: { a: "#88c8e8", b: "#3878a0", c: "#ffffff" },
    frames: [
      ["...b...", ".b.a.b.", "..aca..", "bacccab", "..aca..", ".b.a.b.", "...b..."],
      ["...a...", ".a.b.a.", "..bcb..", "abcccba", "..bcb..", ".a.b.a.", "...a..."],
    ],
  },
  dormant: {
    pal: { a: "#5868a0", b: "#283868", c: "#c8d0f0" },
    frames: [
      ["....bbb", "......b", ".....b.", "bbbbbbb", "...b...", "..b....", ".bbbb.."],
      ["...bbb.", ".....b.", "....b..", "bbbbbb.", "...b...", "..b....", ".bbbb.."],
    ],
  },
  rootbound: {
    pal: { a: "#a87040", b: "#4a2818", c: "#f0d040" },
    frames: [
      ["b.....b", ".b...b.", "..bab..", "..aca..", "..bab..", ".b...b.", "b.....b"],
      ["b..c..b", ".b...b.", "..bab..", "c.aca.c", "..bab..", ".b...b.", "b..c..b"],
    ],
  },
};

/** An animated 7x7 status icon. */
export function drawStatusIcon(g: CanvasRenderingContext2D, status: StatusId, x: number, y: number, frame = 0) {
  const ic = STATUS_ICONS[status];
  if (!ic) return;
  const rows = ic.frames[Math.floor(frame / 24) % 2];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
    const ch = rows[r][c];
    if (ch === ".") continue;
    g.fillStyle = ic.pal[ch];
    g.fillRect(x + c, y + r, 1, 1);
  }
}

/** A status badge in the tiny font on a coloured tab, 15x7, then its icon (23 wide in all). */
export function drawStatusBadge(g: CanvasRenderingContext2D, status: StatusId, abbr: string, x: number, y: number, frame = 0) {
  g.fillStyle = STATUS_COLORS[status];
  g.fillRect(x, y, 15, 7);
  g.fillRect(x + 1, y - 1, 13, 9);
  drawTiny(g, abbr, x + 2, y + 1, UI.white);
  drawStatusIcon(g, status, x + 17, y, frame);
}

/** The grey "wilted" tab used in place of a status badge. */
export function drawWiltBadge(g: CanvasRenderingContext2D, x: number, y: number) {
  g.fillStyle = "#808080";
  g.fillRect(x, y, 15, 7);
  g.fillRect(x + 1, y - 1, 13, 9);
  drawTiny(g, "WLT", x + 2, y + 1, UI.white);
}

/** A type label as a tinted tab with the type name in the main font. */
export function drawTypeTag(ctx: GameContext, g: CanvasRenderingContext2D, type: TypeId, name: string, x: number, y: number) {
  const c = TYPE_COLORS[type];
  const w = ctx.ui.measure(name) + 4;
  g.fillStyle = c.mid;
  g.fillRect(x, y - 1, w, 10);
  ctx.ui.drawText(g, name, x + 2, y, UI.white);
}

/** A horizontal rule. */
export function hline(g: CanvasRenderingContext2D, x: number, y: number, w: number, color: string = UI.black) {
  g.fillStyle = color;
  g.fillRect(x, y, w, 1);
}
export function vline(g: CanvasRenderingContext2D, x: number, y: number, h: number, color: string = UI.black) {
  g.fillStyle = color;
  g.fillRect(x, y, 1, h);
}

// ---------------------------------------------------------------------------
// Preloading: only paths the art registry provides (the engine preloads the
// whole registry at boot anyway); avoids 404 noise for optional files like icon__2.
// ---------------------------------------------------------------------------

export function preload(ctx: GameContext, paths: string[]): Promise<void> {
  const want = paths.filter((p) => ctx.assets.exists(p) && !ctx.assets.has(p));
  return want.length ? ctx.assets.loadAll(want) : Promise.resolve();
}
