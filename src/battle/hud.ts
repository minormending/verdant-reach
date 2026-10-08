import * as skin from "../ui/skin";
import { blinkFrame } from "../ui/portraits";
// Crystal-layout battle HUD boxes, backdrops with layered battle grounds,
// trainer pictures, the leader / Rootstock versus banner and the level-up
// stat window.

import type { BattleRequest, GameContext, Quickened, StatusId, Stats, TrainerPortraitKey } from "../contracts";
import { portraitPath, SCREEN_W, SCREEN_H, TEXTBOX, UI } from "../contracts";
import { getSpecies, qName, STATUS_ABBR } from "./logic/lookup";
import {
  drawExpBar, drawHpBar, drawImageOpts, drawLeaf, drawLevel, drawPod, drawStatusBadge, drawTextRight, drawTiny, pad,
  silhouette, type SpriteDrawOpts,
} from "../screens/kit/draw";
import { ENEMY_GROUND, PLAYER_GROUND, PLAYER_HUD_AREA } from "./layout";
import { HALF } from "../screens/kit/layout";
export { PLAYER_HUD_AREA } from "./layout";
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

/** The graft collar, drawn over a grafted Quickened's front sprite: a dark
 *  leather strap with a brass buckle and rivets, clamped round the lower third
 *  of the 56px front, and a wire splint run up and down through it. Shares the
 *  sprite's scale, drop and clipping; with a silhouette it draws in that colour.
 *  (The name predates the art; scene.ts imports it.) */
export function drawGraftCollarPlaceholder(g: CanvasRenderingContext2D, x: number, y: number, opts: SpriteDrawOpts = {}) {
  const scale = opts.scale ?? 1;
  if (scale <= 0) return;
  const size = Math.max(1, Math.round(56 * scale));
  const dx = Math.round(x + (56 - size) / 2);
  const dy = Math.round(y + 56 - size + (opts.drop ?? 0));
  // 18x13 pixel map at (19, 33): K outline, h/L/D leather lit/mid/shade,
  // s stitching, B/b brass lit/shade, R rivet, W/w splint wire lit/shade.
  const ink: Record<string, string> = {
    K: "#181818", h: "#a07040", L: "#704828", D: "#40281a", s: "#c09060",
    B: "#e0b048", b: "#a07818", R: "#f0d890", W: "#d8d8e0", w: "#888898",
  };
  const rows = [
    "..K...........K...",
    ".KWK.........KWK..",
    ".KWK.........KwK..",
    ".KWK.........KwK..",
    ".KKKKKKKKKKKKKKKK.",
    "KhWhhhKBBBBKhhWhDK",
    "KLWsLsKBKKbKsLWsDK",
    "KLWLRLKBKKbKLRwLDK",
    "KDwDDDKbbbbKDDwDDK",
    ".KKKKKKKKKKKKKKKK.",
    ".KwK.........KwK..",
    ".KwK.........KwK..",
    "..K...........K...",
  ];
  g.save();
  if (opts.clipBottom !== undefined) {
    g.beginPath();
    g.rect(0, 0, SCREEN_W, opts.clipBottom);
    g.clip();
  }
  g.translate(dx, dy);
  g.scale(size / 56, size / 56);
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length;) {
      const c = row[i];
      let n = 1;
      while (row[i + n] === c) n++;
      if (c !== ".") {
        g.fillStyle = opts.silhouette ?? ink[c];
        g.fillRect(19 + i, 33 + j, n, 1);
      }
      i += n;
    }
  });
  g.restore();
}

/** Enemy HUD in the upper-left, clear of the foe's native-size sprite. */
export function drawEnemyHud(ctx: GameContext, g: CanvasRenderingContext2D, h: HudView, caught: boolean, frame = 0) {
  if (!h.visible || !h.q) return;
  const x = 8 + Math.round(h.dx), y = 8;
  skin.panel(g, "plain", { x: x - 4, y: y - 4, w: 122, h: 38 });
  ctx.ui.drawText(g, qName(ctx.data, h.q), x, y);
  if (caught) drawLeaf(g, x, y + 10);
  if (h.status) drawStatusBadge(g, h.status, STATUS_ABBR[h.status], x + 12, y + 10, frame);
  drawLevel(ctx, g, h.level, x + 96, y + 8);
  drawHpBar(g, x + 8, y + 21, h.hp, h.q.stats.hp, 88);
  g.fillStyle = UI.black;
  if (!skin.skinOn()) {
    g.fillRect(x, y + 23, 1, 6);
    g.fillRect(x, y + 29, 112, 1);
    g.fillRect(x + 112, y + 28, 1, 1);
    g.fillRect(x + 113, y + 27, 1, 1);
  }
}

/** Player HUD between the two creatures, above the command rail. */
export function drawPlayerHud(ctx: GameContext, g: CanvasRenderingContext2D, h: HudView, frame = 0) {
  if (!h.visible || !h.q) return;
  const a = PLAYER_HUD_AREA, x = a.x + 8 + Math.round(h.dx), y = a.y;
  const right = x + a.w - 16;
  skin.panel(g, "plain", { x: x - 6, y: y - 3, w: a.w - 4, h: a.h + 3 });
  ctx.ui.drawText(g, qName(ctx.data, h.q), x, y);
  if (h.status) drawStatusBadge(g, h.status, STATUS_ABBR[h.status], x, y + 10, frame);
  const flashOn = h.flash > 0 && (h.flash >> 2) % 2 === 0;
  if (flashOn) {
    g.fillStyle = UI.black; g.fillRect(right - 34, y + 7, 34, 10);
    drawTiny(g, ":L", right - 32, y + 10, "#f8e070");
    ctx.ui.drawText(g, String(h.level), right - 24, y + 8, UI.white);
  } else drawLevel(ctx, g, h.level, right - 32, y + 8);
  drawHpBar(g, x, y + 18, h.hp, h.q.stats.hp, a.w - 34);
  drawTextRight(ctx, g, `${pad(Math.max(0, Math.round(h.hp)), 3)}/${pad(h.q.stats.hp, 3)}`, right, y + 26);
  g.fillStyle = UI.black;
  if (!skin.skinOn()) {
    g.fillRect(right + 1, y + 12, 1, 26);
    g.fillRect(x - 4, y + 38, a.w - 11, 1);
    g.fillRect(x - 5, y + 37, 1, 3);
  }
  drawExpBar(g, x, y + 38, h.exp, a.w - 16, false);
  if (flashOn) { g.fillStyle = UI.white; g.fillRect(x + 14, y + 40, a.w - 32, 3); }
}

/**
 * Party pod rows (shown during intros): player bottom-right, enemy top-left.
 * `t` 0..1 staggers the pods in one by one (1 = all settled).
 */
export function drawPodRow(g: CanvasRenderingContext2D, party: Quickened[], side: 0 | 1, offset = 0, t = 1) {
  const states = Array.from({ length: 6 }, (_, i) => {
    const q = party[i];
    if (!q || q.seed) return "empty" as const; // a Nursery seed isn't a fighter (as Crystal shows eggs)
    if (q.hp <= 0) return "wilted" as const;
    return q.status ? ("status" as const) : ("ok" as const);
  });
  const podOff = (i: number) => {
    const k = Math.max(0, Math.min(1, t * 1.6 - i * 0.12));
    return Math.round((1 - k) * (1 - k) * 48);
  };
  g.fillStyle = UI.black;
  if (side === 0) {
    const x0 = PLAYER_HUD_AREA.x + 16 + offset;
    states.forEach((s, i) => drawPod(g, x0 + i * 10 + podOff(i), PLAYER_HUD_AREA.y + 18 - (podOff(i) > 0 && podOff(i) < 8 ? 1 : 0), s));
    g.fillStyle = UI.black;
    g.fillRect(x0 - 4, PLAYER_HUD_AREA.y + 30, 66, 1);
    g.fillRect(x0 + 62, PLAYER_HUD_AREA.y + 22, 1, 8);
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
  // Under the dome: pale green-gold glass overhead, palms and big leaves beyond,
  // a mossy floor dappled with leaf shadows and slanting shafts of warm light.
  glasshouse: {
    sky: ["#d8ecc0", "#e4f2c8", "#eef6d4"], far: "#4f8a48", farLight: "#7cb458", ground: "#e2eeb8", groundAlt: "#cddf9c",
    ramp: ["#e8f4a8", "#a8d068", "#5f9a3c", "#2a5422"],
  },
};

export function backdropBg(kind: Backdrop): string {
  return BACKDROPS[kind].sky[BACKDROPS[kind].sky.length - 1];
}

/**
 * A battle-ground pad centred on (cx, cy), rx x ry: dark rim, body, lit top
 * (light from the top-left) and a little texture. It never extends below
 * cy + ry, so the foe's pad stays clear of the player HUD.
 */
function drawPad(g: CanvasRenderingContext2D, kind: Backdrop, cx: number, cy: number, rx: number, ry: number) {
  const p = BACKDROPS[kind];
  ellipse(g, cx, cy, rx, ry, p.ramp[3]);
  ellipse(g, cx, cy - 1, rx - 1, ry - 1, p.ramp[2]);
  ellipse(g, cx - 1, cy - 2, rx - 3, ry - 2, p.ramp[1]);
  ellipse(g, cx - Math.round(rx / 4), cy - ry + 2, Math.round(rx / 2), 1, p.ramp[0]);
  checker(g, cx - Math.round(rx * 0.7), cy - 1, Math.round(rx * 1.2), 2, p.ramp[2], 0);
  // a few tufts / grain marks on the surface
  g.fillStyle = p.ramp[2];
  for (const k of [-0.6, -0.25, 0.15, 0.5]) {
    const x = Math.round(cx + k * rx);
    g.fillRect(x, cy - ry + 3, 1, 2);
    g.fillRect(x + 2, cy - ry + 4, 1, 1);
  }
}

/** Where the foe's native-size sprite meets its battle ground. */
export const FOE_PAD = { x: ENEMY_GROUND.x, y: ENEMY_GROUND.y - 1, rx: 36, ry: 6 } as const;
/** The player HUD block; the backdrop is kept plain behind it, as in Crystal. */


/** Repaint the plain field behind the player HUD (after weather overlays). */
export function drawHudBacking(g: CanvasRenderingContext2D, kind: Backdrop) {
  const a = PLAYER_HUD_AREA;
  g.fillStyle = BACKDROPS[kind].ground;
  g.fillRect(a.x, a.y, a.w, a.h);
}

/** Background, distant scenery, field and the layered battle grounds. */
export function drawBackdrop(ctx: GameContext, g: CanvasRenderingContext2D, kind: Backdrop, frame: number) {
  const p = BACKDROPS[kind];
  // sky bands (stepped, no gradients)
  const bandH = Math.ceil((TEXTBOX.y / 3) / p.sky.length);
  p.sky.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * bandH, SCREEN_W, bandH); });
  g.fillStyle = p.sky[p.sky.length - 1];
  g.fillRect(0, p.sky.length * bandH, SCREEN_W, SCREEN_H - p.sky.length * bandH);

  const horizon = Math.floor(TEXTBOX.y / 3);
  if (kind === "night") {
    const stars: [number, number][] = Array.from({ length: 18 }, (_, i) => [8 + (i * 37) % (SCREEN_W - 16), 2 + (i * 13) % (horizon - 4)]);
    stars.forEach(([x, y], i) => {
      const tw = ((frame >> 4) + i) % 6;
      g.fillStyle = "#ffffff";
      g.fillRect(x, y, 1, 1);
      if (tw === 0) { g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
    });
    ellipse(g, SCREEN_W - 10, 10, 6, 6, "#f8f0c8");
    ellipse(g, SCREEN_W - 13, 8, 5, 5, p.sky[0]);
  }

  // distant scenery band
  if (kind === "glasshouse") {
    drawGlazing(g, horizon, frame);
    drawPalmLine(g, p, horizon);
  } else if (kind === "indoor") {
    // panelled wall with a rail, and a greenhouse window
    g.fillStyle = p.farLight;
    for (let x = 4; x < SCREEN_W; x += 20) g.fillRect(x, 6, 1, horizon - 6);
    g.fillStyle = p.far;
    g.fillRect(0, horizon - 4, SCREEN_W, 2);
    g.fillStyle = "#f8f4ec";
    g.fillRect(0, horizon - 2, SCREEN_W, 1);
    // window panes behind the foe
    g.fillStyle = "#d8ecf0";
    g.fillRect(SCREEN_W - 60, 4, 44, 26);
    checker(g, SCREEN_W - 60, 4, 44, 26, "#c0dce4", 0);
    g.fillStyle = p.far;
    g.fillRect(SCREEN_W - 61, 3, 46, 1); g.fillRect(SCREEN_W - 61, 30, 46, 1); g.fillRect(SCREEN_W - 61, 3, 1, 28); g.fillRect(SCREEN_W - 16, 3, 1, 28); g.fillRect(SCREEN_W - 39, 3, 1, 28); g.fillRect(SCREEN_W - 61, 16, 46, 1);
  } else if (kind === "water") {
    // far shore with a reed line
    for (let x = 0; x < SCREEN_W; x++) {
      const h = 3 + Math.round(2 * Math.sin(x / 9) + Math.sin(x / 3.7));
      g.fillStyle = p.far;
      g.fillRect(x, horizon - h, 1, h);
    }
    g.fillStyle = p.farLight;
    g.fillRect(0, horizon - 1, SCREEN_W, 1);
  } else {
    // tree / reed line: bumpy canopy silhouettes in two tones
    for (let x = 0; x < SCREEN_W; x++) {
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
      for (let x = 0; x < SCREEN_W; x += 7) g.fillRect(x, horizon - 13, 1, 3);
    }
  }

  // the field
  g.fillStyle = p.ground;
  g.fillRect(0, horizon, SCREEN_W, SCREEN_H - horizon);
  if (kind === "water") {
    const s = (frame >> 4) % 4;
    g.fillStyle = p.groundAlt;
    for (let y = horizon + 3; y < TEXTBOX.y; y += 5) for (let x = ((y * 7) % 13) - s * 2; x < SCREEN_W; x += 18) g.fillRect(x, y, 6, 1);
    g.fillStyle = "#f4fafc";
    for (let y = horizon + 6; y < TEXTBOX.y; y += 10) for (let x = ((y * 5) % 17) + s; x < SCREEN_W; x += 31) g.fillRect(x, y, 3, 1);
  } else if (kind === "bog") {
    g.fillStyle = p.groundAlt;
    for (let y = horizon + 4; y < TEXTBOX.y; y += 6) for (let x = (y * 3) % 11; x < SCREEN_W; x += 14) g.fillRect(x, y, 5, 1);
    // drifting mist
    const m = (frame >> 3) % SCREEN_W;
    checker(g, (m % SCREEN_W) - 40, horizon + 2, 60, 4, "#f4f4ec", 0);
    checker(g, ((m + 90) % (SCREEN_W + 40)) - 40, horizon + 22, 50, 3, "#f4f4ec", 1);
  } else if (kind === "glasshouse") {
    drawLeafShadows(g, p, horizon, frame);
    drawLightShafts(g, horizon, frame);
  } else if (kind === "indoor") {
    g.fillStyle = p.groundAlt;
    for (let y = horizon + 6; y < TEXTBOX.y; y += 8) g.fillRect(0, y, SCREEN_W, 1);
    for (let y = horizon; y < TEXTBOX.y; y += 8) for (let x = ((y >> 3) % 2) * 20; x < SCREEN_W; x += 40) g.fillRect(x, y + 1, 1, 7);
  } else {
    // mown stripes and tufts
    g.fillStyle = p.groundAlt;
    for (let y = horizon + 3; y < TEXTBOX.y; y += 7) g.fillRect(0, y, SCREEN_W, 1);
    g.fillStyle = kind === "night" ? "#9ca8c0" : "#b8dc90";
    for (const [x, y] of [[20, 50], [64, 47], [8, 62], [62, 60], [76, 47]]) {
      g.fillRect(x, y - 2, 1, 2); g.fillRect(x + 2, y - 3, 1, 3); g.fillRect(x + 4, y - 2, 1, 2);
    }
  }

  // battle grounds: enemy (smaller, further) then player
  drawPad(g, kind, FOE_PAD.x, FOE_PAD.y, FOE_PAD.rx, FOE_PAD.ry);
  drawPad(g, kind, PLAYER_GROUND.x, PLAYER_GROUND.y + 4, 40, 4);
  void ctx;
}

// --- the glasshouse backdrop's layers ---------------------------------------

/** The glass roof: curved iron ribs, glazing bars and a few lit panes (light from the top-left). */
function drawGlazing(g: CanvasRenderingContext2D, horizon: number, frame: number) {
  const bar = "#a4b88c";
  const barDark = "#8ca078";
  // two dome ribs sweeping down to the sides
  for (const off of [2, 18]) {
    for (let x = 0; x < SCREEN_W; x++) {
      const k = (x - HALF) / HALF;
      const y = Math.round(off + k * k * 16);
      g.fillStyle = bar;
      g.fillRect(x, y, 1, 1);
      g.fillStyle = barDark;
      g.fillRect(x, y + 1, 1, 1);
    }
  }
  // glazing bars between the ribs, fanning out from the crown
  for (let i = -4; i <= 4; i++) {
    const xTop = HALF + i * Math.floor(SCREEN_W / 10);
    for (let y = 0; y < horizon - 10; y++) {
      const x = Math.round(xTop + i * y * 0.35);
      if (x < 0 || x >= SCREEN_W) continue;
      g.fillStyle = bar;
      g.fillRect(x, y, 1, 1);
    }
  }
  // glints on a few panes, drifting slowly as the sun moves
  const drift = (frame >> 6) % 3;
  g.fillStyle = "#fafcec";
  for (const [x, y] of [[30, 8], [64, 6], [112, 10], [140, 22], [8, 26]]) {
    g.fillRect(x + drift, y, 3, 1);
    g.fillRect(x + drift, y + 1, 1, 1);
  }
}

/** Palms and broad tropical leaves along the horizon. */
function drawPalmLine(g: CanvasRenderingContext2D, p: BackdropDef, horizon: number) {
  // the leafy mass: broad, rounded bumps
  for (let x = 0; x < SCREEN_W; x++) {
    const bump = Math.round(5 + 4 * Math.abs(Math.sin(x / 11)) + 2 * Math.abs(Math.sin(x / 4.3)));
    g.fillStyle = p.farLight;
    g.fillRect(x, horizon - bump - 1, 1, 1);
    g.fillStyle = p.far;
    g.fillRect(x, horizon - bump, 1, bump);
  }
  // two palms rising above it: a leaning trunk and drooping fronds
  for (const [tx, h, lean] of [[22, 26, 1], [SCREEN_W - 22, 24, -1]] as const) {
    const top = horizon - h;
    g.fillStyle = "#7a6038";
    for (let y = top; y < horizon - 6; y++) g.fillRect(tx + Math.round(((y - top) / h) * -lean * 3), y, 2, 1);
    g.fillStyle = p.far;
    for (const dir of [-1, 1]) {
      for (const spread of [0.5, 1]) {
        for (let i = 0; i < 12; i++) {
          const x = tx + dir * Math.round(i * spread + i * 0.4);
          const y = top + Math.round((i * i) / 14 * spread) - (spread < 1 ? 2 : 0);
          g.fillRect(x, y, 2, 1);
          if (i % 3 === 1) g.fillRect(x, y + 1, 1, 2); // leaflets hanging from the rib
        }
      }
    }
    g.fillStyle = p.farLight;
    g.fillRect(tx - 1, top - 1, 3, 1);
  }
}

/** Leaf shadows on the floor: soft-edged clusters that sway a pixel now and then. */
function drawLeafShadows(g: CanvasRenderingContext2D, p: BackdropDef, horizon: number, frame: number) {
  const blobs: [number, number, number][] = Array.from({ length: 12 }, (_, i) => [8 + (i * 43) % (SCREEN_W - 16), horizon + 6 + (i * 17) % (TEXTBOX.y - horizon - 12), 5 + i % 3]);
  blobs.forEach(([x, y, r], i) => {
    if (y < horizon + 3) return;
    const sway = Math.round(Math.sin(frame / 90 + i * 1.7));
    ellipse(g, x + sway, y, r, 2, p.groundAlt);
    ellipse(g, x + sway + r - 1, y - 2, Math.max(2, r - 3), 1, p.groundAlt);
    ellipse(g, x + sway - r + 2, y + 2, Math.max(2, r - 3), 1, p.groundAlt);
  });
}

/** Slanting shafts of warm light (a deliberate 2-colour dither), falling from the top-left. */
function drawLightShafts(g: CanvasRenderingContext2D, horizon: number, frame: number) {
  const breathe = (frame >> 5) % 8 === 0 ? 1 : 0;
  for (const [x0, w] of Array.from({ length: Math.ceil(SCREEN_W / 52) }, (_, i) => [18 + i * 52, 5 + i % 3] as const)) {
    for (let y = horizon - 30; y < TEXTBOX.y; y += 1) {
      const x = Math.round(x0 + (y - horizon) * 0.55);
      checker(g, x, y, w + breathe, 1, "#f8f0c0", 0);
    }
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

export function drawTrainer(ctx: GameContext, g: CanvasRenderingContext2D, key: TrainerPortraitKey, x: number, y: number, opts: SpriteDrawOpts = {}, tick = 0) {
  const back = key === "player_back";
  const path = portraitPath(key);
  const frame = blinkFrame(tick, ctx.assets.imageFrames?.(path) ?? 1);
  let img = ctx.assets.imageFrame?.(path, frame) ?? trainerImage(ctx, key);
  if (opts.silhouette) img = silhouette(`trainer:${key}:${frame}`, img, opts.silhouette);
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
  ctx: GameContext, g: CanvasRenderingContext2D, kind: BannerKind, key: TrainerPortraitKey, title: string, name: string, f: number, len: number, tick = f,
) {
  const leader = kind === "leader";
  const bg = leader ? "#204828" : "#381818";
  const stripe = leader ? "#48904c" : "#a02828";
  const accent = leader ? "#f8d850" : "#f86848";
  // bars open from the middle, then close at the end
  const open = Math.min(1, f / 8) * Math.min(1, (len - f) / 8);
  const half = Math.round(36 * open);
  if (half <= 0) return;
  const mid = Math.floor(SCREEN_H / 2);
  const top = mid - half;
  g.fillStyle = UI.black;
  g.fillRect(0, 0, SCREEN_W, top);
  g.fillRect(0, mid + half, SCREEN_W, SCREEN_H - mid - half);
  g.fillStyle = bg;
  g.fillRect(0, top, SCREEN_W, half * 2);
  // speed lines
  for (let i = 0; i < 14; i++) {
    const y = top + 2 + ((i * 11) % Math.max(1, half * 2 - 4));
    const w = 10 + ((i * 7) % 18);
    const x = SCREEN_W - ((f * (6 + (i % 4) * 2) + i * 37) % (SCREEN_W + 40));
    g.fillStyle = i % 3 === 0 ? accent : stripe;
    g.fillRect(x, y, w, 1);
  }
  // edge trims
  g.fillStyle = accent;
  g.fillRect(0, top, SCREEN_W, 1);
  g.fillRect(0, mid + half - 1, SCREEN_W, 1);
  if (half < 30) return;
  // the trainer slides in from the left as a silhouette, then lights up
  const slide = Math.min(1, Math.max(0, (f - 8) / 12));
  const px = Math.round(-56 + slide * (HALF / 2 + 28));
  const lit = f > 24;
  g.save();
  g.beginPath();
  g.rect(0, top + 1, SCREEN_W, half * 2 - 2);
  g.clip();
  drawTrainer(ctx, g, key, px, mid - 26, lit ? {} : { silhouette: leader ? "#102414" : "#200c0c" }, tick);
  g.restore();
  // name card slides in from the right
  const card = Math.min(1, Math.max(0, (f - 14) / 10));
  const cx = Math.round(SCREEN_W + 8 - card * (HALF + 24));
  ctx.ui.drawText(g, title, cx, mid - 14, accent);
  ctx.ui.drawText(g, name, cx, mid - 2, UI.white);
  drawTiny(g, leader ? "CONSERVATORY" : "ROOTSTOCK", cx, mid + 10, leader ? "#90c890" : "#e07070");
  if (f >= 24 && f < 27) { g.fillStyle = "#f8f8f8"; g.fillRect(0, top, SCREEN_W, half * 2); }
}

// ---------------------------------------------------------------------------
// Level-up stat window
// ---------------------------------------------------------------------------

export function drawStatWindow(ctx: GameContext, g: CanvasRenderingContext2D, stats: Stats, gains?: Stats) {
  const x = SCREEN_W - 136;
  ctx.ui.drawWindow(g, x, 8, 136, TEXTBOX.y - 8);
  const rows: [string, keyof Stats][] = [["ATTACK", "atk"], ["DEFENCE", "def"], ["SPCL.ATK", "spa"], ["SPCL.DEF", "spd"], ["SPEED", "spe"]];
  rows.forEach(([label, k], i) => {
    const y = 16 + i * 20;
    ctx.ui.drawText(g, label, x + 8, y);
    if (gains) ctx.ui.drawText(g, `+${gains[k]}`, x + 16, y + 8, "#306850");
    drawTextRight(ctx, g, String(stats[k]), SCREEN_W - 8, y + 8);
  });
}

export function speciesTypes(ctx: GameContext, q: Quickened) {
  return getSpecies(ctx.data, q.species).types;
}
