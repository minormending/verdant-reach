// Overworld drawing helpers: tiles (with animation and a readable fallback
// when art is missing), structures, character sheets, emotes, tints,
// the map-name sign and battle-intro transitions.

import type { Assets, CharacterKey, Dir, StructureKey, TileKey } from "../contracts";
import { CHAR_ROWS, SCREEN_H, SCREEN_W, STRUCTURES, TILE, UI, characterPath, structurePath, tilePath, uiPath } from "../contracts";
import { drawImagePath, drawMissing, imageMissing } from "../engine/gfx";
import { drawText, drawWindow } from "../ui/kit";
import { drawTiny } from "../screens/kit/draw";
import type { CellArt } from "./autotile";

/** Two 24x14 Victoria-pad frames, drawn beneath the player's feet. */
export function drawLilyRaft(g: CanvasRenderingContext2D, assets: Assets, x: number, y: number, second: boolean) {
  drawImagePath(g, assets, uiPath("raft"), second ? 24 : 0, 0, 24, 14, x - 4, y + TILE - 9);
}

/** Flat colours used only when a tile's art is missing (keeps dev maps readable). */
const FALLBACK: Partial<Record<TileKey, [string, string]>> = {
  grass: ["#88c070", "#78b060"], tall_grass: ["#4a9a48", "#2e7a34"], flowers: ["#88c070", "#f8a8c0"],
  path: ["#e0d098", "#c8b880"], dirt: ["#c8a070", "#b08858"], sand: ["#e8d8a0", "#d8c888"],
  bog: ["#587840", "#3e5e30"], boardwalk: ["#b08858", "#806040"], water: ["#4878c8", "#88b0e8"],
  ledge_down: ["#88c070", "#406838"], tree: ["#2a6a30", "#1a4a20"], maple_tree: ["#b85830", "#6a3a20"],
  tapped_maple: ["#906040", "#504030"], hedge: ["#3a7a38", "#285a28"], bramble_bush: ["#5a4a68", "#3a3048"],
  rock: ["#989888", "#686858"], fence: ["#a08060", "#705040"], sign: ["#b08850", "#705030"],
  mailbox: ["#c04040", "#802020"], floor_wood: ["#c89868", "#b08050"], floor_tile: ["#d8d8c8", "#c0c0b0"],
  floor_greenhouse: ["#a8c8a0", "#90b088"], rug: ["#c05050", "#a03838"], mat_exit: ["#a04040", "#702828"],
  wall: ["#e8e0c8", "#c8c0a0"], window: ["#a0c8e8", "#e8e0c8"], counter: ["#a07850", "#785838"],
  table: ["#b08860", "#806040"], bookshelf: ["#805838", "#c0a060"], plant_pot: ["#b06040", "#4a9a48"],
  planter_bed: ["#6a5030", "#4a9a48"], bed: ["#e0e0f0", "#c05050"], specimen_cabinet: ["#607890", "#405870"],
  stairs_up: ["#a09080", "#706050"], stairs_down: ["#807060", "#504030"], water_channel: ["#5088d0", "#88b0e8"],
  void: ["#000000", "#000000"],
  flowers_red: ["#88c070", "#e05040"], flowers_yellow: ["#88c070", "#f8d040"], stone_path: ["#c8c8b8", "#a0a090"],
  bridge: ["#c89868", "#8a5030"], mushrooms: ["#88c070", "#d86048"], gate_open: ["#88c070", "#a08060"],
  chair: ["#c89868", "#8a5030"], stump: ["#a06830", "#583818"], log: ["#a06830", "#583818"],
  lamp_post: ["#88c070", "#383840"], barrel: ["#a06830", "#583818"], crate: ["#d8a060", "#8a5030"],
  bench: ["#88c070", "#8a5030"], pond_lily: ["#4878c8", "#58a040"], reeds: ["#68a060", "#386030"],
  cliff: ["#a89070", "#685040"], stone_wall: ["#b8b8b0", "#787878"], garden_plot: ["#8a5030", "#58a040"],
  crops: ["#8a5030", "#98d060"], scarecrow: ["#88c070", "#c88850"], haybale: ["#e8c860", "#b89030"],
  fireplace: ["#787878", "#e88030"], stove: ["#585860", "#383840"], potted_tree: ["#c86838", "#58a040"],
  glass_wall: ["#b8e8e0", "#70b8b0"], workbench: ["#c88850", "#8a5030"], microscope: ["#e8e0c8", "#383840"],
};

export function drawFallbackTile(g: CanvasRenderingContext2D, t: TileKey, x: number, y: number, frame2: boolean) {
  const [a, b] = FALLBACK[t] ?? ["#f800f8", "#780078"];
  g.fillStyle = a;
  g.fillRect(x, y, TILE, TILE);
  if (t === "void") return;
  g.fillStyle = b;
  switch (t) {
    case "tall_grass":
      for (let i = 0; i < 4; i++) {
        const ox = (i % 2) * 8 + (frame2 ? 1 : 0);
        const oy = Math.floor(i / 2) * 8;
        g.fillRect(x + ox + 1, y + oy + 2, 1, 5); g.fillRect(x + ox + 3, y + oy + 1, 1, 6); g.fillRect(x + ox + 5, y + oy + 3, 1, 4);
      }
      break;
    case "water": case "water_channel":
      g.fillRect(x + (frame2 ? 4 : 2), y + 4, 5, 1); g.fillRect(x + (frame2 ? 8 : 10), y + 11, 4, 1);
      break;
    case "flowers":
      for (const [fx, fy] of [[3, 3], [11, 5], [6, 11], [13, 13]]) g.fillRect(x + fx + (frame2 ? 1 : 0), y + fy, 2, 2);
      break;
    case "ledge_down":
      g.fillRect(x, y + 11, TILE, 3);
      break;
    case "tree": case "maple_tree": case "tapped_maple": case "hedge": case "bramble_bush":
      g.fillRect(x + 2, y + 2, 12, 10);
      g.fillStyle = a;
      g.fillRect(x + 4, y + 3, 5, 3);
      g.fillStyle = "#604020";
      g.fillRect(x + 7, y + 12, 2, 4);
      break;
    case "wall":
      g.fillRect(x, y + 12, TILE, 4);
      break;
    case "path": case "dirt": case "sand": case "grass":
      g.fillRect(x + 3, y + 5, 1, 1); g.fillRect(x + 11, y + 12, 1, 1);
      break;
    default:
      g.fillRect(x + 1, y + 1, TILE - 2, 2);
      g.fillRect(x + 1, y + TILE - 3, TILE - 2, 2);
  }
  // A magenta corner pip marks the tile as placeholder art.
  g.fillStyle = "#f800f8";
  g.fillRect(x, y, 2, 2);
}

/**
 * A pruned bramble (stand-in until the bramble_stump tile lands): a low cut crown
 * of canes with pale cut ends, lit from the top-left, shadow to the bottom-right.
 */
export function drawStumpFallback(g: CanvasRenderingContext2D, x: number, y: number) {
  const P = (dx: number, dy: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(x + dx, y + dy, w, h); };
  P(4, 11, 9, 2, "#58a040");          // shadow cast bottom-right on the grass
  P(3, 10, 9, 2, "#3a3048");          // crown base
  for (const [cx, h] of [[4, 4], [6, 6], [8, 5], [10, 3]] as const) {
    P(cx, 10 - h, 1, h, "#5a4a68");    // cut canes
    P(cx + 1, 10 - h + 1, 1, h - 1, "#3a3048");
    P(cx, 10 - h, 1, 1, "#e0d0b8");    // pale cut end
  }
  P(12, 8, 1, 1, "#5a4a68");           // a stray thorn
  P(2, 9, 1, 1, "#5a4a68");
  P(5, 12, 2, 1, "#98d060");           // leaf litter
  P(11, 12, 1, 1, "#98d060");
}

/** Lower half of a tall-grass cell, drawn over a character standing in it. */
export function drawGrassOverlay(
  g: CanvasRenderingContext2D, assets: Assets, art: CellArt | null, x: number, y: number, second: boolean, sway = 0,
) {
  const paths = art ? [second && art.path2 ? art.path2 : art.path, tilePath("tall_grass")] : [tilePath("tall_grass")];
  for (const p of paths) {
    const img = assets.image(p);
    if (img) {
      g.drawImage(img, 0, 8, TILE, 8, x + sway, y + 8, TILE, 8);
      return;
    }
  }
  g.save();
  g.beginPath();
  g.rect(x, y + 8, TILE, 8);
  g.clip();
  drawFallbackTile(g, "tall_grass", x + sway, y, second);
  g.restore();
}

/** A structure image, bottom-aligned on its footprint (art may rise above it). */
export function drawStructure(g: CanvasRenderingContext2D, assets: Assets, key: StructureKey, x: number, y: number) {
  const spec = STRUCTURES[key];
  const w = spec.w * TILE;
  const h = spec.h * TILE;
  const path = structurePath(key);
  const img = assets.image(path);
  if (img) {
    g.drawImage(img, 0, 0, img.width, img.height, Math.round(x + (w - img.width) / 2), y + h - img.height, img.width, img.height);
    return;
  }
  if (!imageMissing(assets, path)) return;
  drawMissing(g, path, x, y, w, h);
  // Keep the door visible so placeholder towns stay navigable.
  g.fillStyle = "#402018";
  if (spec.door) g.fillRect(x + spec.door.x * TILE + 3, y + spec.door.y * TILE + 2, TILE - 6, TILE - 2);
}

/** Top-left (screen px) where a structure's image is drawn, plus the image itself. */
export function structureImage(assets: Assets, key: StructureKey, x: number, y: number) {
  const spec = STRUCTURES[key];
  const img = assets.image(structurePath(key));
  if (!img) return null;
  return { img, x: Math.round(x + (spec.w * TILE - img.width) / 2), y: y + spec.h * TILE - img.height };
}

/** Objects that never turn to face the player and use rows as states. */
const OBJECT_SPRITES: ReadonlySet<CharacterKey> = new Set<CharacterKey>([
  "item_pickup", "potted_plant", "lever", "valve", "hedge_gate", "harvest_bush",
]);

/**
 * Sheet row for a character. Puzzle objects follow the flag convention:
 * an NPC id `lever:<flag>` or `valve:<flag>` shows the UP row while that flag
 * is true (the "on" frame) and the DOWN row otherwise.
 */
export function rowFor(
  id: string, sprite: CharacterKey, facing: Dir, flags: Record<string, boolean>,
  pickedToday: (harvestId: string) => boolean = () => false,
): Dir {
  if (sprite === "lever" || sprite === "valve") {
    const m = /^(?:lever|valve):(.+)$/.exec(id);
    if (m) return flags[m[1]] ? "up" : "down";
  }
  // Harvest bushes `bush:<harvestId>`: DOWN row ripe, UP row picked (until tomorrow).
  const b = /^bush:(.+)$/.exec(id);
  if (b) return pickedToday(b[1]) ? "up" : "down";
  if (sprite === "harvest_bush") return "down";
  return facing;
}

/** Draw one character frame. Sheets narrower than 48px are static objects (16px rows = states). */
export function drawCharacter(
  g: CanvasRenderingContext2D, assets: Assets, sprite: CharacterKey, col: number, facing: Dir, x: number, y: number,
) {
  const path = characterPath(sprite);
  const img = assets.image(path);
  if (img && img.width < 48) {
    const rows = Math.floor(img.height / TILE);
    const row = rows > 1 ? Math.min(rows - 1, CHAR_ROWS[facing]) : 0;
    g.drawImage(img, 0, row * TILE, TILE, TILE, x, y, TILE, TILE);
    return;
  }
  drawImagePath(g, assets, path, col * TILE, CHAR_ROWS[facing] * TILE, TILE, TILE, x, y, TILE, TILE);
}

/** Erase a character frame's silhouette from a layer (used on the light layer). */
export function eraseCharacter(
  g: CanvasRenderingContext2D, assets: Assets, sprite: CharacterKey, col: number, facing: Dir, x: number, y: number,
) {
  g.globalCompositeOperation = "destination-out";
  drawCharacter(g, assets, sprite, col, facing, x, y);
  g.globalCompositeOperation = "source-over";
}

export function isStaticObject(assets: Assets, sprite: CharacterKey): boolean {
  if (OBJECT_SPRITES.has(sprite)) return true;
  const img = assets.image(characterPath(sprite));
  return !!img && img.width < 48;
}

/** Ground shadow under a hopping/flying character; shrinks as it rises. */
export function drawShadow(g: CanvasRenderingContext2D, x: number, y: number, lift = 0) {
  g.fillStyle = "rgba(24,24,40,0.40)";
  const shrink = lift > 6 ? 2 : lift > 2 ? 1 : 0;
  g.fillRect(x + 4 + shrink, y + 13, 8 - shrink * 2, 3);
  g.fillRect(x + 3 + shrink, y + 14, 10 - shrink * 2, 1);
}

export function drawEmote(g: CanvasRenderingContext2D, kind: string, x: number, y: number, t: number) {
  // Pops in over 4 frames with a 1px overshoot.
  const by = y - (t < 4 ? t * 4 : t < 6 ? 17 : 16);
  g.fillStyle = UI.black;
  g.fillRect(x + 1, by, 14, 14);
  g.fillRect(x, by + 1, 16, 12);
  g.fillStyle = UI.white;
  g.fillRect(x + 2, by + 1, 12, 12);
  g.fillRect(x + 1, by + 2, 14, 10);
  // tail
  g.fillStyle = UI.black;
  g.fillRect(x + 5, by + 14, 4, 1);
  g.fillRect(x + 6, by + 15, 2, 1);
  g.fillStyle = UI.white;
  g.fillRect(x + 6, by + 13, 2, 1);
  const glyph = kind === "..." ? "…" : kind;
  const color = kind === "!" ? "#e83018" : kind === "♪" ? "#3870e8" : UI.black;
  drawText(g, glyph, x + 4, by + 3, color);
}

/** 7x7 pressed-leaf motif for the location sign, lit from the top-left. */
function drawLeaf(g: CanvasRenderingContext2D, x: number, y: number) {
  for (let yy = 0; yy < 7; yy++) {
    for (let xx = 0; xx < 7; xx++) {
      const along = xx - yy;          // along the midrib (bottom-left -> top-right)
      const across = xx + yy - 6;     // <0 lit side, 0 midrib, >0 shade side
      const a = Math.abs(along);
      const w = a <= 1 ? 2 : a <= 3 ? 1 : a <= 4 ? 0 : -1;
      let c: string | null = null;
      if (Math.abs(across) <= w) c = across < 0 ? "#98d060" : across === 0 ? "#3c7830" : "#58a040";
      if (xx === 0 && yy === 6) c = "#285828"; // stem
      if (!c) continue;
      g.fillStyle = c;
      g.fillRect(x + xx, y + yy, 1, 1);
    }
  }
}

/**
 * Location sign that slides down from the top-left (ease-out), holds, and
 * slides back up (ease-in). A pressed leaf sits before the name.
 */
export function drawMapName(g: CanvasRenderingContext2D, name: string, t: number) {
  const IN = 14;
  const HOLD = 130;
  const OUT = 12;
  if (t > IN + HOLD + OUT) return;
  const h = 26;
  let off: number;
  if (t < IN) {
    const k = 1 - t / IN;
    off = Math.round(k * k * (h + 2));
  } else if (t > IN + HOLD) {
    const k = (t - IN - HOLD) / OUT;
    off = Math.round(k * k * (h + 2));
  } else off = 0;
  const w = Math.max(88, Array.from(name).length * 8 + 30);
  const y = 2 - off;
  drawWindow(g, 2, y, w, h, { shadow: true });
  drawLeaf(g, 9, y + 9);
  drawText(g, name, 20, y + 9);
}

// ---------------------------------------------------------------------------
// Toasts ("NEW NOTE" / "NOTE COMPLETE")
// ---------------------------------------------------------------------------

export const TOAST_MS = { in: 220, hold: 2400, out: 200 };

/** A 9x10 field notebook: kraft cover, green band, page edges; ticked when complete. */
function drawNotebook(g: CanvasRenderingContext2D, x: number, y: number, done: boolean) {
  g.fillStyle = "#4a2818";
  g.fillRect(x, y, 9, 10);
  g.fillStyle = "#c88850";
  g.fillRect(x + 1, y + 1, 7, 8);
  g.fillStyle = "#f0c890";
  g.fillRect(x + 1, y + 1, 7, 1);
  g.fillStyle = "#4a7a40";
  g.fillRect(x + 1, y + 6, 7, 2);
  g.fillStyle = "#f8f8f0";
  g.fillRect(x + 8, y + 2, 1, 7); // page edges
  if (done) {
    g.fillStyle = "#f8f8f0";
    g.fillRect(x + 2, y + 3, 1, 1); g.fillRect(x + 3, y + 4, 1, 1); g.fillRect(x + 4, y + 3, 1, 1); g.fillRect(x + 5, y + 2, 1, 1);
  }
}

/** Notice that drops in from the top centre, holds, and lifts away (`ms` since it started). */
export function drawToast(g: CanvasRenderingContext2D, kind: "new_note" | "note_done", title: string, ms: number) {
  const { in: IN, hold: HOLD, out: OUT } = TOAST_MS;
  if (ms > IN + HOLD + OUT || ms < 0) return;
  const h = 26;
  let off = 0;
  if (ms < IN) { const k = 1 - ms / IN; off = Math.round(k * k * (h + 2)); }
  else if (ms > IN + HOLD) { const k = (ms - IN - HOLD) / OUT; off = Math.round(k * k * (h + 2)); }
  const label = kind === "new_note" ? "NEW NOTE" : "NOTE COMPLETE";
  const text = Array.from(title).slice(0, 15).join("");
  const w = Math.max(96, Math.max(Array.from(text).length * 8, label.length * 4 + 12) + 30);
  const x = Math.round((SCREEN_W - w) / 2);
  const y = 2 - off;
  drawWindow(g, x, y, w, h, { shadow: true });
  drawNotebook(g, x + 8, y + 8, kind === "note_done");
  drawTiny(g, label, x + 21, y + 6, kind === "note_done" ? "#3870e8" : UI.dark);
  drawText(g, text, x + 21, y + 13);
}

// ---------------------------------------------------------------------------
// Battle intro transitions
// ---------------------------------------------------------------------------

const COLS = SCREEN_W / 8;
const ROWS = SCREEN_H / 8;

/** Rank (0..1) of each 8x8 block in a clockwise spiral from the outside in. */
const SPIRAL_RANK: number[] = (() => {
  const order: number[] = [];
  let top = 0, left = 0, bottom = ROWS - 1, right = COLS - 1;
  while (top <= bottom && left <= right) {
    for (let x = left; x <= right; x++) order.push(top * COLS + x);
    top++;
    for (let y = top; y <= bottom; y++) order.push(y * COLS + right);
    right--;
    if (top <= bottom) { for (let x = right; x >= left; x--) order.push(bottom * COLS + x); bottom--; }
    if (left <= right) { for (let y = bottom; y >= top; y--) order.push(y * COLS + left); left++; }
  }
  const rank = new Array<number>(COLS * ROWS).fill(1);
  order.forEach((b, i) => (rank[b] = i / (order.length - 1)));
  return rank;
})();

/** Rank of each block in a two-armed pinwheel sweeping clockwise from 12 o'clock. */
const PINWHEEL_RANK: number[] = (() => {
  const rank: number[] = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const dx = x + 0.5 - COLS / 2;
      const dy = y + 0.5 - ROWS / 2;
      let a = Math.atan2(dx, -dy); // 0 at the top, clockwise
      if (a < 0) a += Math.PI * 2;
      rank.push((a % Math.PI) / Math.PI);
    }
  }
  return rank;
})();

export class BattleTransition {
  kind: "wild" | "trainer" | null = null;
  t = 0;
  private resolve: (() => void) | null = null;
  /** Holds solid black after finishing until `clear()`. */
  done = false;

  run(kind: "wild" | "trainer"): Promise<void> {
    this.kind = kind;
    this.t = 0;
    this.done = false;
    return new Promise((r) => (this.resolve = r));
  }
  get total() { return this.kind === "trainer" ? 78 : 70; }
  clear() { this.kind = null; this.done = false; }

  tick() {
    if (!this.kind || this.done) return;
    if (++this.t >= this.total) {
      this.done = true;
      const r = this.resolve;
      this.resolve = null;
      r?.();
    }
  }

  draw(g: CanvasRenderingContext2D) {
    if (!this.kind) return;
    if (this.done) {
      g.fillStyle = "#000";
      g.fillRect(0, 0, SCREEN_W, SCREEN_H);
      return;
    }
    const t = this.t;
    const FLASH = 26;
    if (t < FLASH) {
      // Palette flashes: inverted, normal, inverted, normal, then a dim beat.
      const phase = Math.floor(t / 4);
      g.save();
      if (phase === 0 || phase === 2) {
        g.globalCompositeOperation = "difference";
        g.fillStyle = "#f8f8f8";
        g.fillRect(0, 0, SCREEN_W, SCREEN_H);
      } else if (phase === 4 || phase === 5) {
        g.fillStyle = phase === 4 ? "rgba(24,24,32,0.35)" : "rgba(24,24,32,0.6)";
        g.fillRect(0, 0, SCREEN_W, SCREEN_H);
      }
      g.restore();
      return;
    }
    g.fillStyle = "rgba(24,24,32,0.6)";
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const k = (t - FLASH) / (this.total - FLASH - 4);
    const ranks = this.kind === "trainer" ? SPIRAL_RANK : PINWHEEL_RANK;
    const edge = 0.06;
    for (let i = 0; i < ranks.length; i++) {
      const r = ranks[i];
      if (r > k) continue;
      // The leading edge is a dark slate before going black: a softer sweep.
      g.fillStyle = r > k - edge ? "#283040" : "#000";
      g.fillRect((i % COLS) * 8, Math.floor(i / COLS) * 8, 8, 8);
    }
  }
}
