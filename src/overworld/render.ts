// Overworld drawing helpers: tiles (with animation and a readable fallback
// when art is missing), structures, character sheets, emotes, tints,
// the map-name sign and battle-intro transitions.

import type { Assets, CharacterKey, StructureKey, TileKey, TimeOfDay } from "../contracts";
import { CHAR_ROWS, SCREEN_H, SCREEN_W, STRUCTURES, TILE, UI, characterPath, structurePath, tilePath } from "../contracts";
import { drawImagePath, drawMissing, imageMissing } from "../engine/gfx";
import { drawText, drawWindow } from "../ui/kit";
import type { Actor } from "./actor";

export const ANIMATED: ReadonlySet<TileKey> = new Set<TileKey>(["water", "tall_grass", "flowers"]);

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
};

function drawFallbackTile(g: CanvasRenderingContext2D, t: TileKey, x: number, y: number, frame2: boolean) {
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

const loggedFallback = new Set<string>();

export function drawTile(g: CanvasRenderingContext2D, assets: Assets, t: TileKey, x: number, y: number, frame: number) {
  const second = ANIMATED.has(t) && Math.floor(frame / 32) % 2 === 1;
  if (second && drawImagePath(g, assets, tilePath(t, 2), 0, 0, TILE, TILE, x, y, TILE, TILE, { placeholder: false })) return;
  const path = tilePath(t);
  const img = assets.image(path);
  if (img) {
    g.drawImage(img, 0, 0, TILE, TILE, x, y, TILE, TILE);
    return;
  }
  if (imageMissing(assets, path) && !loggedFallback.has(path)) {
    loggedFallback.add(path);
    console.warn(`[art] missing tile ${path}; drawing fallback colours`);
  }
  drawFallbackTile(g, t, x, y, second);
}

/** Lower part of a tall-grass tile, drawn over a character standing in it. */
export function drawGrassOverlay(g: CanvasRenderingContext2D, assets: Assets, x: number, y: number, frame: number) {
  const second = Math.floor(frame / 32) % 2 === 1;
  const p2 = tilePath("tall_grass", 2);
  const p1 = tilePath("tall_grass");
  const img = (second && assets.image(p2)) || assets.image(p1);
  if (img) {
    g.drawImage(img, 0, 8, TILE, 8, x, y + 8, TILE, 8);
    return;
  }
  g.save();
  g.beginPath();
  g.rect(x, y + 8, TILE, 8);
  g.clip();
  drawFallbackTile(g, "tall_grass", x, y, second);
  g.restore();
}

export function drawStructure(g: CanvasRenderingContext2D, assets: Assets, key: StructureKey, x: number, y: number) {
  const spec = STRUCTURES[key];
  const w = spec.w * TILE;
  const h = spec.h * TILE;
  const path = structurePath(key);
  const img = assets.image(path);
  if (img) {
    g.drawImage(img, 0, 0, img.width, img.height, x, y + h - img.height, img.width, img.height);
    return;
  }
  if (!imageMissing(assets, path)) return;
  drawMissing(g, path, x, y, w, h);
  // Keep the door visible so placeholder towns stay navigable.
  g.fillStyle = "#402018";
  g.fillRect(x + spec.door.x * TILE + 3, y + spec.door.y * TILE + 2, TILE - 6, TILE - 2);
}

/** Draw one character frame. Sheets narrower than 48px are static objects. */
export function drawCharacter(
  g: CanvasRenderingContext2D, assets: Assets, sprite: CharacterKey, col: number, facing: Actor["facing"], x: number, y: number,
) {
  const path = characterPath(sprite);
  const img = assets.image(path);
  if (img && img.width < 48) {
    g.drawImage(img, 0, 0, TILE, TILE, x, y, TILE, TILE);
    return;
  }
  drawImagePath(g, assets, path, col * TILE, CHAR_ROWS[facing] * TILE, TILE, TILE, x, y, TILE, TILE);
}

export function isStaticObject(assets: Assets, sprite: CharacterKey): boolean {
  if (sprite === "item_pickup" || sprite === "potted_plant") return true;
  const img = assets.image(characterPath(sprite));
  return !!img && img.width < 48;
}

export function drawShadow(g: CanvasRenderingContext2D, x: number, y: number) {
  g.fillStyle = "rgba(24,24,24,0.45)";
  g.fillRect(x + 3, y + 13, 10, 2);
  g.fillRect(x + 5, y + 12, 6, 4);
}

export function drawEmote(g: CanvasRenderingContext2D, kind: string, x: number, y: number, t: number) {
  // Pops in over 4 frames.
  const by = y - (t < 4 ? t * 4 : 16);
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
  drawText(g, glyph, x + (glyph === "!" ? 4 : 4), by + 3, color);
}

/** Outdoor time-of-day tint over the world layer. */
export function drawTint(g: CanvasRenderingContext2D, tod: TimeOfDay) {
  if (tod === "day") return;
  g.save();
  g.globalCompositeOperation = "multiply";
  g.fillStyle = tod === "night" ? "#6878d0" : "#ffe6c4";
  g.fillRect(0, 0, SCREEN_W, SCREEN_H);
  if (tod === "morning") {
    g.globalCompositeOperation = "screen";
    g.fillStyle = "rgba(80,40,0,0.10)";
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }
  g.restore();
}

/** Location sign that slides in at the top-left. `t` counts frames since entry. */
export function drawMapName(g: CanvasRenderingContext2D, name: string, t: number) {
  const HOLD = 120;
  const SLIDE = 8;
  if (t > HOLD + SLIDE * 2) return;
  let off = 0;
  if (t < SLIDE) off = (SLIDE - t) * 3;
  else if (t > HOLD + SLIDE) off = (t - HOLD - SLIDE) * 3;
  const w = Math.max(80, Array.from(name).length * 8 + 16);
  drawWindow(g, 0, -off, w, 24);
  drawText(g, name, 8, 8 - off);
}

// ---------------------------------------------------------------------------
// Battle intro transitions
// ---------------------------------------------------------------------------

const SPIRAL: { x: number; y: number }[] = (() => {
  const cols = SCREEN_W / 8;
  const rows = SCREEN_H / 8;
  const out: { x: number; y: number }[] = [];
  let top = 0, left = 0, bottom = rows - 1, right = cols - 1;
  while (top <= bottom && left <= right) {
    for (let x = left; x <= right; x++) out.push({ x, y: top });
    top++;
    for (let y = top; y <= bottom; y++) out.push({ x: right, y });
    right--;
    if (top <= bottom) { for (let x = right; x >= left; x--) out.push({ x, y: bottom }); bottom--; }
    if (left <= right) { for (let y = bottom; y >= top; y--) out.push({ x: left, y }); left++; }
  }
  return out;
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
  get total() { return this.kind === "trainer" ? 76 : 68; }
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
    if (t < 24) {
      // three flashes (inverted palette feel)
      const phase = Math.floor(t / 4) % 2;
      if (phase === 0) {
        g.fillStyle = "rgba(248,248,248,0.85)";
        g.fillRect(0, 0, SCREEN_W, SCREEN_H);
      } else {
        g.fillStyle = "rgba(24,24,24,0.35)";
        g.fillRect(0, 0, SCREEN_W, SCREEN_H);
      }
      return;
    }
    g.fillStyle = "#000";
    const k = (t - 24) / (this.total - 24);
    if (this.kind === "trainer") {
      const n = Math.floor(k * SPIRAL.length * 1.02);
      for (let i = 0; i < Math.min(n, SPIRAL.length); i++) g.fillRect(SPIRAL[i].x * 8, SPIRAL[i].y * 8, 8, 8);
    } else {
      // Blinds closing from alternate sides, staggered by row.
      const rows = SCREEN_H / 8;
      for (let r = 0; r < rows; r++) {
        const local = Math.max(0, Math.min(1, k * 1.6 - (r / rows) * 0.6));
        const w = Math.round(local * SCREEN_W);
        g.fillRect(r % 2 ? SCREEN_W - w : 0, r * 8, w, 8);
      }
    }
  }
}
