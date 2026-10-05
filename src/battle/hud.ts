// Crystal-layout battle HUD boxes, backdrops with layered battle grounds,
// trainer pictures, the leader / Rootstock versus banner and the level-up
// stat window.

import type { BattleRequest, GameContext, Quickened, StatusId, Stats, TrainerPortraitKey } from "../contracts";
import { portraitPath, uiPath, UI } from "../contracts";
import { getSpecies, qName, STATUS_ABBR } from "./logic/lookup";
import {
  drawExpBar, drawHpBar, drawImageOpts, drawLeaf, drawLevel, drawPod, drawStatusBadge, drawTextRight, drawTiny, pad,
  silhouette, type SpriteDrawOpts,
} from "../screens/kit/draw";
import { checker, ellipse } from "./fx";

export interface HudView {
  q: Quickened | null;
  visible: boolean;
  hp: number;        // shown HP (animated)
  level: number;     // shown level
  status: StatusId | null;
  exp: number;       // shown exp fraction 0..1
  /** Frames left of the level-up flash. */
  flash: number;
  /** Horizontal slide offset (intro / switch). */
  dx: number;
}

export const newHud = (): HudView => ({ q: null, visible: false, hp: 0, level: 1, status: null, exp: 0, flash: 0, dx: 0 });

/** Enemy box, top-left: name, (leaf if caught), status, level, HP bar, L-frame. */
export function drawEnemyHud(ctx: GameContext, g: CanvasRenderingContext2D, h: HudView, caught: boolean, frame = 0) {
  if (!h.visible || !h.q) return;
  const ox = Math.round(h.dx);
  const name = qName(ctx.data, h.q);
  ctx.ui.drawText(g, name.slice(0, 12), 8 + ox, 0);
  if (caught) drawLeaf(g, 8 + ox, 9);
  if (h.status) drawStatusBadge(g, h.status, STATUS_ABBR[h.status], 18 + ox, 9, frame);
  drawLevel(ctx, g, h.level, 48 + ox, 8);
  drawHpBar(g, 16 + ox, 17, h.hp, h.q.stats.hp, 48);
  // L-shaped frame: left rule and bottom rule with a pointed end
  g.fillStyle = UI.black;
  g.fillRect(8 + ox, 19, 1, 6);
  g.fillRect(8 + ox, 25, 72, 1);
  g.fillRect(80 + ox, 24, 1, 1);
  g.fillRect(81 + ox, 23, 1, 1);
}

/** Player box, bottom-right: name, status, level, HP bar + numbers, frame, EXP bar. */
export function drawPlayerHud(ctx: GameContext, g: CanvasRenderingContext2D, h: HudView, frame = 0) {
  if (!h.visible || !h.q) return;
  const ox = Math.round(h.dx);
  const name = qName(ctx.data, h.q);
  const nx = Math.max(56, Math.min(80, 152 - 8 * name.length)); // keep an 8px right margin for 12-char names
  // a pale outline keeps the name readable where it crosses the foe's battle ground
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.ui.drawText(g, name, nx + ox + dx, 56 + dy, "#f8f8f0");
  ctx.ui.drawText(g, name, nx + ox, 56);
  if (h.status) drawStatusBadge(g, h.status, STATUS_ABBR[h.status], 88 + ox, 65, frame);
  const flashOn = h.flash > 0 && (h.flash >> 2) % 2 === 0;
  if (flashOn) {
    // level-up: the level tag lights up
    g.fillStyle = UI.black;
    g.fillRect(118 + ox, 63, 34, 10);
    drawTiny(g, ":L", 120 + ox, 66, "#f8e070");
    ctx.ui.drawText(g, String(h.level), 128 + ox, 64, "#f8f8f8");
  } else {
    drawLevel(ctx, g, h.level, 120 + ox, 64);
  }
  drawHpBar(g, 88 + ox, 73, h.hp, h.q.stats.hp, 48);
  const hp = Math.max(0, Math.round(h.hp));
  drawTextRight(ctx, g, `${pad(hp, 3)}/${pad(h.q.stats.hp, 3)}`, 152 + ox, 80);
  // frame: right rule + bottom rule ending in an arrowhead at the left
  g.fillStyle = UI.black;
  g.fillRect(153 + ox, 68, 1, 20);
  g.fillRect(76 + ox, 88, 78, 1);
  g.fillRect(75 + ox, 87, 1, 3);
  g.fillRect(74 + ox, 86, 1, 1);
  g.fillRect(74 + ox, 90, 1, 1);
  drawExpBar(g, 88 + ox, 88, h.exp, 64, false);
  if (flashOn) {
    g.fillStyle = "#f8f8f8";
    g.fillRect(102 + ox, 90, 48, 3);
  }
}

/**
 * Party pod rows (shown during intros): player bottom-right, enemy top-left.
 * `t` 0..1 staggers the pods in one by one (1 = all settled).
 */
export function drawPodRow(g: CanvasRenderingContext2D, party: Quickened[], side: 0 | 1, offset = 0, t = 1) {
  const states = Array.from({ length: 6 }, (_, i) => {
    const q = party[i];
    if (!q) return "empty" as const;
    if (q.hp <= 0) return "wilted" as const;
    return q.status ? ("status" as const) : ("ok" as const);
  });
  const podOff = (i: number) => {
    const k = Math.max(0, Math.min(1, t * 1.6 - i * 0.12));
    return Math.round((1 - k) * (1 - k) * 48);
  };
  g.fillStyle = UI.black;
  if (side === 0) {
    const x0 = 88 + offset;
    states.forEach((s, i) => drawPod(g, x0 + i * 10 + podOff(i), 74 - (podOff(i) > 0 && podOff(i) < 8 ? 1 : 0), s));
    g.fillStyle = UI.black;
    g.fillRect(x0 - 4, 86, 66, 1);
    g.fillRect(x0 + 62, 78, 1, 8);
  } else {
    const x0 = 16 + offset;
    states.forEach((s, i) => drawPod(g, x0 + (5 - i) * 10 - podOff(i), 10 - (podOff(i) > 0 && podOff(i) < 8 ? 1 : 0), s));
    g.fillStyle = UI.black;
    g.fillRect(x0 - 4, 22, 66, 1);
    g.fillRect(x0 - 4, 14, 1, 8);
  }
}

// ---------------------------------------------------------------------------
// Backdrops
// ---------------------------------------------------------------------------

export type Backdrop = NonNullable<BattleRequest["backdrop"]>;

interface BackdropDef {
  sky: string[];          // stepped bands, top to bottom
  far: string;            // distant silhouette
  farLight: string;
  ground: string;         // the field the pads sit on
  groundAlt: string;      // checker / stripes on the field
  ramp: [string, string, string, string]; // battle-ground pad, light -> dark
}

const BACKDROPS: Record<Backdrop, BackdropDef> = {
  grass: {
    sky: ["#f0f8f8", "#f8f8f0"], far: "#b8d898", farLight: "#d0e8b0", ground: "#e8f4c8", groundAlt: "#d8ecb0",
    ramp: ["#e0f0a0", "#98d060", "#58a040", "#285828"],
  },
  bog: {
    sky: ["#e0e4d0", "#ecf0e0"], far: "#a8b488", farLight: "#c4cca8", ground: "#d8dcc0", groundAlt: "#c4cca4",
    ramp: ["#c8d098", "#98a868", "#687838", "#2c3818"],
  },
  water: {
    sky: ["#e8f4f8", "#f4f8f8"], far: "#a8d0b8", farLight: "#c8e4d0", ground: "#c8e4f4", groundAlt: "#a8d4f0",
    ramp: ["#c0e890", "#78c058", "#409038", "#1c4c20"],
  },
  indoor: {
    sky: ["#f0e8d8", "#f4ecdc"], far: "#d8c8a8", farLight: "#e4d8bc", ground: "#ecdcc0", groundAlt: "#e0cca8",
    ramp: ["#f0dcb4", "#d8b080", "#a87850", "#5a3820"],
  },
  night: {
    sky: ["#9898c8", "#a8a8d4", "#b8b8dc", "#c4c4e4"], far: "#8890b8", farLight: "#9ca4c8", ground: "#c0c8d8", groundAlt: "#b0b8cc",
    ramp: ["#c8d4e4", "#98a8c4", "#687894", "#384058"],
  },
};

export function backdropBg(kind: Backdrop): string {
  return BACKDROPS[kind].sky[BACKDROPS[kind].sky.length - 1];
}

const padCache = new Map<string, HTMLCanvasElement>();

/** The battle-ground pad art recoloured to a backdrop's ramp (by luminance rank). */
function padArt(ctx: GameContext, kind: Backdrop): HTMLCanvasElement | null {
  const img = ctx.assets.image(uiPath("battle_ground"));
  if (!img || !img.width) return null;
  const key = `${kind}:${img.width}x${img.height}`;
  const hit = padCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const g = c.getContext("2d")!;
  g.drawImage(img, 0, 0);
  if (kind !== "grass") {
    const data = g.getImageData(0, 0, c.width, c.height);
    const d = data.data;
    const lum = new Map<number, number>();
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
      if (!lum.has(k)) lum.set(k, d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11);
    }
    const sorted = [...lum.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
    const ramp = BACKDROPS[kind].ramp.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
    const map = new Map<number, number[]>();
    sorted.forEach((k, i) => map.set(k, ramp[Math.min(ramp.length - 1, Math.floor((i * ramp.length) / sorted.length))]));
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      const to = map.get((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
      if (to) { d[i] = to[0]; d[i + 1] = to[1]; d[i + 2] = to[2]; }
    }
    g.putImageData(data, 0, 0);
  }
  padCache.set(key, c);
  return c;
}

/** A battle-ground pad centred on (cx, cy): a shadowed under-layer, then the pad. */
function drawPad(ctx: GameContext, g: CanvasRenderingContext2D, kind: Backdrop, cx: number, cy: number, w: number) {
  const p = BACKDROPS[kind];
  const art = padArt(ctx, kind);
  const pw = art ? art.width : w;
  const ph = art ? art.height : 12;
  // under-layer: the pad's dark lip, then a soft checker shadow to the bottom-right
  checker(g, cx - (pw >> 1) + 6, cy + 1, pw - 6, (ph >> 1) + 1, p.ramp[3], 0);
  ellipse(g, cx, cy + 2, (pw >> 1) - 1, (ph >> 1) - 1, p.ramp[3]);
  if (art) {
    g.drawImage(art, Math.round(cx - pw / 2), Math.round(cy - ph / 2));
  } else {
    ellipse(g, cx, cy, (pw >> 1), (ph >> 1), p.ramp[2]);
    ellipse(g, cx, cy - 1, (pw >> 1) - 2, (ph >> 1) - 1, p.ramp[1]);
    ellipse(g, cx - 4, cy - 2, (pw >> 1) - 10, (ph >> 1) - 3, p.ramp[0]);
  }
}

/** Background, distant scenery, field and the layered battle grounds. */
export function drawBackdrop(ctx: GameContext, g: CanvasRenderingContext2D, kind: Backdrop, frame: number) {
  const p = BACKDROPS[kind];
  // sky bands (stepped, no gradients)
  const bandH = Math.ceil(40 / p.sky.length);
  p.sky.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * bandH, 160, bandH); });
  g.fillStyle = p.sky[p.sky.length - 1];
  g.fillRect(0, p.sky.length * bandH, 160, 144);

  const horizon = 42;
  if (kind === "night") {
    const stars: [number, number][] = [[92, 4], [104, 16], [148, 26], [138, 6], [70, 32], [116, 34], [154, 40], [86, 22], [60, 8], [124, 2]];
    stars.forEach(([x, y], i) => {
      const tw = ((frame >> 4) + i) % 6;
      g.fillStyle = "#ffffff";
      g.fillRect(x, y, 1, 1);
      if (tw === 0) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
    });
    ellipse(g, 150, 10, 6, 6, "#f8f0c8");
    ellipse(g, 147, 8, 5, 5, p.sky[0]);
  }

  // distant scenery band
  if (kind === "indoor") {
    // panelled wall with a rail, and a greenhouse window
    g.fillStyle = p.farLight;
    for (let x = 4; x < 160; x += 20) g.fillRect(x, 6, 1, horizon - 6);
    g.fillStyle = p.far;
    g.fillRect(0, horizon - 4, 160, 2);
    g.fillStyle = "#f8f4ec";
    g.fillRect(0, horizon - 2, 160, 1);
    // window panes behind the foe
    g.fillStyle = "#d8ecf0";
    g.fillRect(100, 4, 44, 26);
    checker(g, 100, 4, 44, 26, "#c0dce4", 0);
    g.fillStyle = p.far;
    g.fillRect(99, 3, 46, 1); g.fillRect(99, 30, 46, 1); g.fillRect(99, 3, 1, 28); g.fillRect(144, 3, 1, 28); g.fillRect(121, 3, 1, 28); g.fillRect(99, 16, 46, 1);
  } else if (kind === "water") {
    // far shore with a reed line
    for (let x = 0; x < 160; x++) {
      const h = 3 + Math.round(2 * Math.sin(x / 9) + Math.sin(x / 3.7));
      g.fillStyle = p.far;
      g.fillRect(x, horizon - h, 1, h);
    }
    g.fillStyle = p.farLight;
    g.fillRect(0, horizon - 1, 160, 1);
  } else {
    // tree / reed line: bumpy canopy silhouettes in two tones
    for (let x = 0; x < 160; x++) {
      const bump = kind === "bog"
        ? (x % 7 === 0 ? 10 : x % 7 === 1 ? 7 : 3 + ((x * 13) % 3))
        : Math.round(6 + 3 * Math.abs(Math.sin(x / 7)) + 2 * Math.abs(Math.sin(x / 3.1)));
      g.fillStyle = p.farLight;
      g.fillRect(x, horizon - bump - 2, 1, 2);
      g.fillStyle = p.far;
      g.fillRect(x, horizon - bump, 1, bump);
    }
    if (kind === "bog") {
      // cattail heads on the tall reeds
      g.fillStyle = "#806040";
      for (let x = 0; x < 160; x += 7) g.fillRect(x, horizon - 13, 1, 3);
    }
  }

  // the field
  g.fillStyle = p.ground;
  g.fillRect(0, horizon, 160, 144 - horizon);
  if (kind === "water") {
    const s = (frame >> 4) % 4;
    g.fillStyle = p.groundAlt;
    for (let y = horizon + 3; y < 96; y += 5) for (let x = ((y * 7) % 13) - s * 2; x < 160; x += 18) g.fillRect(x, y, 6, 1);
    g.fillStyle = "#f4fafc";
    for (let y = horizon + 6; y < 96; y += 10) for (let x = ((y * 5) % 17) + s; x < 160; x += 31) g.fillRect(x, y, 3, 1);
  } else if (kind === "bog") {
    g.fillStyle = p.groundAlt;
    for (let y = horizon + 4; y < 96; y += 6) for (let x = (y * 3) % 11; x < 160; x += 14) g.fillRect(x, y, 5, 1);
    // drifting mist
    const m = (frame >> 3) % 160;
    checker(g, (m % 160) - 40, horizon + 2, 60, 4, "#f4f4ec", 0);
    checker(g, ((m + 90) % 200) - 40, horizon + 22, 50, 3, "#f4f4ec", 1);
  } else if (kind === "indoor") {
    g.fillStyle = p.groundAlt;
    for (let y = horizon + 6; y < 96; y += 8) g.fillRect(0, y, 160, 1);
    for (let y = horizon; y < 96; y += 8) for (let x = ((y >> 3) % 2) * 20; x < 160; x += 40) g.fillRect(x, y + 1, 1, 7);
  } else {
    // mown stripes and tufts
    g.fillStyle = p.groundAlt;
    for (let y = horizon + 3; y < 96; y += 7) g.fillRect(0, y, 160, 1);
    g.fillStyle = kind === "night" ? "#9ca8c0" : "#b8dc90";
    for (const [x, y] of [[20, 50], [64, 47], [86, 70], [150, 74], [140, 64], [8, 62], [70, 60]]) {
      g.fillRect(x, y - 2, 1, 2); g.fillRect(x + 2, y - 3, 1, 3); g.fillRect(x + 4, y - 2, 1, 2);
    }
  }

  // battle grounds: enemy (smaller, further) then player
  drawPad(ctx, g, kind, 124, 52, 72);
  drawPad(ctx, g, kind, 32, 92, 80);
}

// ---------------------------------------------------------------------------
// Trainer pictures
// ---------------------------------------------------------------------------

const phCache = new Map<string, HTMLCanvasElement>();
const warned = new Set<string>();

/** A tidy stand-in figure while trainer art lands. */
function trainerPlaceholder(key: string, back: boolean): HTMLCanvasElement {
  const size = back ? 48 : 56;
  const id = `${key}:${back}`;
  let c = phCache.get(id);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = size; c.height = size;
  const g = c.getContext("2d")!;
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const coats = ["#507848", "#7a5a3a", "#4a5a88", "#884848", "#606060", "#3a6a6a"];
  const coat = key === "grunt" || key === "shears" ? "#707478" : coats[h % coats.length];
  const cx = size / 2;
  const Rr = (x: number, y: number, w: number, hh: number, col: string) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, hh); };
  const s = size / 56;
  Rr(cx - 13 * s, 30 * s, 26 * s, 26 * s, "#202020");
  Rr(cx - 12 * s, 31 * s, 24 * s, 25 * s, coat);
  Rr(cx - 8 * s, 12 * s, 16 * s, 18 * s, "#202020");
  Rr(cx - 7 * s, 13 * s, 14 * s, 16 * s, back ? "#5a3a20" : "#f0c8a0");
  Rr(cx - 13 * s, 12 * s, 26 * s, 3 * s, "#202020");
  Rr(cx - 12 * s, 12 * s, 24 * s, 2 * s, "#d8c088");
  Rr(cx - 7 * s, 6 * s, 14 * s, 7 * s, "#202020");
  Rr(cx - 6 * s, 7 * s, 12 * s, 6 * s, "#d8c088");
  if (back) {
    for (let i = 0; i < 20 * s; i++) Rr(cx - 10 * s + i, 32 * s + i, 2, 2, "#5a3a20");
  } else {
    Rr(cx - 4 * s, 19 * s, 2, 2, "#202020");
    Rr(cx + 2 * s, 19 * s, 2, 2, "#202020");
  }
  phCache.set(id, c);
  return c;
}

export function trainerImage(ctx: GameContext, key: TrainerPortraitKey): HTMLImageElement | HTMLCanvasElement {
  const back = key === "player_back";
  const path = portraitPath(key);
  const img: HTMLImageElement | HTMLCanvasElement | undefined = ctx.assets.image(path);
  if (img) return img;
  if (!warned.has(path)) { warned.add(path); console.warn(`[art] missing ${path}; drawing a placeholder`); }
  return trainerPlaceholder(key, back);
}

export function drawTrainer(ctx: GameContext, g: CanvasRenderingContext2D, key: TrainerPortraitKey, x: number, y: number, opts: SpriteDrawOpts = {}) {
  const back = key === "player_back";
  let img = trainerImage(ctx, key);
  if (opts.silhouette) img = silhouette(`trainer:${key}`, img, opts.silhouette);
  const size = back ? 48 : 56;
  drawImageOpts(g, img, x, y, size, size, opts);
}

// ---------------------------------------------------------------------------
// Leader / Rootstock versus banner
// ---------------------------------------------------------------------------

export type BannerKind = "leader" | "rootstock";

/**
 * A letterboxed band across the screen: speed lines stream past, the trainer's
 * picture slides in on the left and the name card on the right.
 * `f` is the frame within the banner's run, `len` its length.
 */
export function drawVersusBanner(
  ctx: GameContext, g: CanvasRenderingContext2D, kind: BannerKind, key: TrainerPortraitKey, title: string, name: string, f: number, len: number,
) {
  const leader = kind === "leader";
  const bg = leader ? "#204828" : "#381818";
  const stripe = leader ? "#48904c" : "#a02828";
  const accent = leader ? "#f8d850" : "#f86848";
  // bars open from the middle, then close at the end
  const open = Math.min(1, f / 8) * Math.min(1, (len - f) / 8);
  const half = Math.round(36 * open);
  if (half <= 0) return;
  const mid = 72;
  const top = mid - half;
  g.fillStyle = UI.black;
  g.fillRect(0, 0, 160, top);
  g.fillRect(0, mid + half, 160, 144);
  g.fillStyle = bg;
  g.fillRect(0, top, 160, half * 2);
  // speed lines
  for (let i = 0; i < 14; i++) {
    const y = top + 2 + ((i * 11) % Math.max(1, half * 2 - 4));
    const w = 10 + ((i * 7) % 18);
    const x = 160 - ((f * (6 + (i % 4) * 2) + i * 37) % 200);
    g.fillStyle = i % 3 === 0 ? accent : stripe;
    g.fillRect(x, y, w, 1);
  }
  // edge trims
  g.fillStyle = accent;
  g.fillRect(0, top, 160, 1);
  g.fillRect(0, mid + half - 1, 160, 1);
  if (half < 30) return;
  // the trainer slides in from the left as a silhouette, then lights up
  const slide = Math.min(1, Math.max(0, (f - 8) / 12));
  const px = Math.round(-56 + slide * 64);
  const lit = f > 24;
  g.save();
  g.beginPath();
  g.rect(0, top + 1, 160, half * 2 - 2);
  g.clip();
  drawTrainer(ctx, g, key, px, mid - 26, lit ? {} : { silhouette: leader ? "#102414" : "#200c0c" });
  g.restore();
  // name card slides in from the right
  const card = Math.min(1, Math.max(0, (f - 14) / 10));
  const cx = Math.round(168 - card * 92);
  ctx.ui.drawText(g, title, cx, mid - 14, accent);
  ctx.ui.drawText(g, name, cx, mid - 2, UI.white);
  drawTiny(g, leader ? "CONSERVATORY" : "ROOTSTOCK", cx, mid + 10, leader ? "#90c890" : "#e07070");
  if (f >= 24 && f < 27) { g.fillStyle = "#f8f8f8"; g.fillRect(0, top, 160, half * 2); }
}

// ---------------------------------------------------------------------------
// Level-up stat window
// ---------------------------------------------------------------------------

export function drawStatWindow(ctx: GameContext, g: CanvasRenderingContext2D, stats: Stats, gains?: Stats) {
  ctx.ui.drawWindow(g, 72, 0, 88, 96);
  const rows: [string, keyof Stats][] = [["ATTACK", "atk"], ["DEFENCE", "def"], ["SPCL.ATK", "spa"], ["SPCL.DEF", "spd"], ["SPEED", "spe"]];
  rows.forEach(([label, k], i) => {
    const y = 8 + i * 16;
    ctx.ui.drawText(g, label, 80, y);
    if (gains) ctx.ui.drawText(g, `+${gains[k]}`, 88, y + 8, "#306850");
    drawTextRight(ctx, g, String(stats[k]), 152, y + 8);
  });
}

export function speciesTypes(ctx: GameContext, q: Quickened) {
  return getSpecies(ctx.data, q.species).types;
}
