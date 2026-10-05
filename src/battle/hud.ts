// Crystal-layout battle HUD boxes, backdrops, trainer pictures and the
// level-up stat window.

import type { BattleRequest, GameContext, Quickened, StatusId, Stats, TrainerPortraitKey } from "../contracts";
import { portraitPath, UI } from "../contracts";
import { getSpecies, qName, STATUS_ABBR } from "./logic/lookup";
import {
  drawExpBar, drawHpBar, drawImageOpts, drawLeaf, drawLevel, drawPod, drawStatusBadge, drawTextRight, pad,
  type SpriteDrawOpts,
} from "../screens/kit/draw";

export interface HudView {
  q: Quickened | null;
  visible: boolean;
  hp: number;        // shown HP (animated)
  level: number;     // shown level
  status: StatusId | null;
  exp: number;       // shown exp fraction 0..1
}

export const newHud = (): HudView => ({ q: null, visible: false, hp: 0, level: 1, status: null, exp: 0 });

/** Enemy box, top-left: name, (leaf if caught), status, level, HP bar, L-frame. */
export function drawEnemyHud(ctx: GameContext, g: CanvasRenderingContext2D, h: HudView, caught: boolean) {
  if (!h.visible || !h.q) return;
  const name = qName(ctx.data, h.q);
  ctx.ui.drawText(g, name.slice(0, 12), 8, 0);
  if (caught) drawLeaf(g, 8, 9);
  if (h.status) drawStatusBadge(g, h.status, STATUS_ABBR[h.status], 18, 9);
  drawLevel(ctx, g, h.level, 48, 8);
  drawHpBar(g, 16, 17, h.hp, h.q.stats.hp, 48);
  // L-shaped frame: left rule and bottom rule with a pointed end
  g.fillStyle = UI.black;
  g.fillRect(8, 19, 1, 6);
  g.fillRect(8, 25, 72, 1);
  g.fillRect(80, 24, 1, 1);
  g.fillRect(81, 23, 1, 1);
}

/** Player box, bottom-right: name, status, level, HP bar + numbers, frame, EXP bar. */
export function drawPlayerHud(ctx: GameContext, g: CanvasRenderingContext2D, h: HudView) {
  if (!h.visible || !h.q) return;
  const name = qName(ctx.data, h.q);
  const nx = Math.max(56, Math.min(80, 152 - 8 * name.length)); // keep an 8px right margin for 12-char names
  ctx.ui.drawText(g, name, nx, 56);
  if (h.status) drawStatusBadge(g, h.status, STATUS_ABBR[h.status], 88, 65);
  drawLevel(ctx, g, h.level, 120, 64);
  drawHpBar(g, 88, 73, h.hp, h.q.stats.hp, 48);
  const hp = Math.max(0, Math.round(h.hp));
  drawTextRight(ctx, g, `${pad(hp, 3)}/${pad(h.q.stats.hp, 3)}`, 152, 80);
  // frame: right rule + bottom rule ending in an arrowhead at the left
  g.fillStyle = UI.black;
  g.fillRect(153, 68, 1, 20);
  g.fillRect(76, 88, 78, 1);
  g.fillRect(75, 87, 1, 3);
  g.fillRect(74, 86, 1, 1);
  g.fillRect(74, 90, 1, 1);
  drawExpBar(g, 88, 88, h.exp, 64, false);
}

/** Party pod rows (shown during intros): player bottom-right, enemy top-left. */
export function drawPodRow(g: CanvasRenderingContext2D, party: Quickened[], side: 0 | 1, offset = 0) {
  const states = Array.from({ length: 6 }, (_, i) => {
    const q = party[i];
    if (!q) return "empty" as const;
    if (q.hp <= 0) return "wilted" as const;
    return q.status ? ("status" as const) : ("ok" as const);
  });
  g.fillStyle = UI.black;
  if (side === 0) {
    const x0 = 88 + offset;
    states.forEach((s, i) => drawPod(g, x0 + i * 10, 74, s));
    g.fillRect(x0 - 4, 86, 66, 1);
    g.fillRect(x0 + 62, 78, 1, 8);
  } else {
    const x0 = 16 + offset;
    states.forEach((s, i) => drawPod(g, x0 + (5 - i) * 10, 10, s));
    g.fillRect(x0 - 4, 22, 66, 1);
    g.fillRect(x0 - 4, 14, 1, 8);
  }
}

// ---------------------------------------------------------------------------
// Backdrops
// ---------------------------------------------------------------------------

type Backdrop = NonNullable<BattleRequest["backdrop"]>;

const BACKDROPS: Record<Backdrop, { bg: string; ground: string; groundDark: string; accent: string }> = {
  grass:  { bg: "#f8f8f0", ground: "#c0e0a0", groundDark: "#78b058", accent: "#4c8c3c" },
  bog:    { bg: "#eef0e0", ground: "#b8c890", groundDark: "#788c58", accent: "#506838" },
  water:  { bg: "#f0f8f8", ground: "#a8d8f0", groundDark: "#5898c8", accent: "#ffffff" },
  indoor: { bg: "#f8f4ec", ground: "#e0d0b8", groundDark: "#b09878", accent: "#c8b498" },
  night:  { bg: "#dcdcf0", ground: "#a8b8c8", groundDark: "#687890", accent: "#485870" },
};

export function backdropBg(kind: Backdrop): string {
  return BACKDROPS[kind].bg;
}

function ellipse(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string) {
  g.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
    g.fillRect(cx - w, cy + y, w * 2, 1);
  }
}

/** Background + ground patches under each Quickened. */
export function drawBackdrop(g: CanvasRenderingContext2D, kind: Backdrop, frame: number) {
  const p = BACKDROPS[kind];
  g.fillStyle = p.bg;
  g.fillRect(0, 0, 160, 144);
  if (kind === "night") {
    // a sliver of moon and a few stars behind the foe
    g.fillStyle = "#ffffff";
    const stars = [[90, 6], [100, 18], [150, 4], [140, 22], [70, 34], [110, 36], [154, 40], [86, 44]];
    stars.forEach(([x, y], i) => { if ((frame >> 5) % 4 !== i % 4) g.fillRect(x, y, 1, 1); });
    ellipse(g, 154, 10, 5, 5, "#f8f0c8");
    ellipse(g, 151, 9, 4, 4, p.bg);
  }
  if (kind === "indoor") {
    g.fillStyle = "#ece4d4";
    for (let y = 40; y < 96; y += 8) g.fillRect(0, y, 160, 1);
  }
  // enemy ground
  ellipse(g, 124, 52, 34, 6, p.groundDark);
  ellipse(g, 124, 51, 32, 5, p.ground);
  // player ground
  ellipse(g, 32, 92, 40, 6, p.groundDark);
  ellipse(g, 32, 91, 38, 5, p.ground);
  // decoration
  g.fillStyle = p.accent;
  if (kind === "grass" || kind === "night") {
    for (const [x, y] of [[96, 50], [104, 53], [146, 49], [152, 52], [6, 90], [12, 93], [52, 89], [62, 92]]) {
      g.fillRect(x, y - 2, 1, 2); g.fillRect(x + 2, y - 3, 1, 3); g.fillRect(x + 4, y - 2, 1, 2);
    }
  } else if (kind === "bog") {
    for (const [x, y] of [[94, 50], [150, 50], [4, 90], [60, 90]]) {
      g.fillRect(x, y - 8, 1, 8); g.fillRect(x + 3, y - 6, 1, 6);
      g.fillStyle = "#806040"; g.fillRect(x, y - 10, 1, 3); g.fillStyle = p.accent;
    }
  } else if (kind === "water") {
    const s = Math.floor(frame / 20) % 2;
    for (const [x, y] of [[100, 50], [140, 53], [10, 90], [48, 93]]) g.fillRect(x + s, y, 6, 1);
  }
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
  const R = (x: number, y: number, w: number, hh: number, col: string) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, hh); };
  const s = size / 56;
  // body
  R(cx - 13 * s, 30 * s, 26 * s, 26 * s, "#202020");
  R(cx - 12 * s, 31 * s, 24 * s, 25 * s, coat);
  // head
  R(cx - 8 * s, 12 * s, 16 * s, 18 * s, "#202020");
  R(cx - 7 * s, 13 * s, 14 * s, 16 * s, back ? "#5a3a20" : "#f0c8a0");
  // hat brim (botanist sun hat)
  R(cx - 13 * s, 12 * s, 26 * s, 3 * s, "#202020");
  R(cx - 12 * s, 12 * s, 24 * s, 2 * s, "#d8c088");
  R(cx - 7 * s, 6 * s, 14 * s, 7 * s, "#202020");
  R(cx - 6 * s, 7 * s, 12 * s, 6 * s, "#d8c088");
  if (back) {
    // satchel strap
    for (let i = 0; i < 20 * s; i++) R(cx - 10 * s + i, 32 * s + i, 2, 2, "#5a3a20");
  } else {
    R(cx - 4 * s, 19 * s, 2, 2, "#202020");
    R(cx + 2 * s, 19 * s, 2, 2, "#202020");
  }
  phCache.set(id, c);
  return c;
}

export function drawTrainer(ctx: GameContext, g: CanvasRenderingContext2D, key: TrainerPortraitKey, x: number, y: number, opts: SpriteDrawOpts = {}) {
  const back = key === "player_back";
  const path = portraitPath(key);
  let img: HTMLImageElement | HTMLCanvasElement | undefined = ctx.assets.image(path);
  if (!img) {
    if (!warned.has(path)) { warned.add(path); console.warn(`[art] missing ${path}; drawing a placeholder`); }
    img = trainerPlaceholder(key, back);
  }
  const size = back ? 48 : 56;
  drawImageOpts(g, img, x, y, size, size, opts);
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
    if (gains) ctx.ui.drawText(g, `+${gains[k]}`, 88, y + 8);
    drawTextRight(ctx, g, String(stats[k]), 152, y + 8);
  });
}

export function speciesTypes(ctx: GameContext, q: Quickened) {
  return getSpecies(ctx.data, q.species).types;
}
