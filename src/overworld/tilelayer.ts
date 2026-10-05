// Cached tile layer: the whole map (plus a border margin) is rendered once to
// two offscreen canvases (animation frames 1 and 2) with autotile edges and
// ground variation resolved. The overworld blits the visible part each frame.
// Rebuilt when the map or its active `legendWhen` overrides change, and
// retried while any listed art is still loading.

import type { Assets, TileKey } from "../contracts";
import { SCREEN_H, SCREEN_W, TILE, tilePath } from "../contracts";
import { TileCatalog, autotileMask, type CellArt } from "./autotile";
import { tileAt, type MapRuntime } from "./map";
import { drawFallbackTile, drawStumpFallback } from "./render";

const MARGIN = 7;

const catalogs = new WeakMap<Assets, TileCatalog>();
/** Catalog over what the art registry provides (`assets.exists`), one per asset store. */
export function assetCatalog(assets: Assets): TileCatalog {
  let cat = catalogs.get(assets);
  if (!cat) {
    cat = new TileCatalog({ has: (p) => assets.exists(p) });
    catalogs.set(assets, cat);
  }
  return cat;
}

type Status = "ok" | "pending" | "missing";

function blit(g: CanvasRenderingContext2D, assets: Assets, path: string, x: number, y: number): Status {
  const img = assets.image(path);
  if (img) {
    g.drawImage(img, 0, 0, TILE, TILE, x, y, TILE, TILE);
    return "ok";
  }
  const a = assets as Assets & { isMissing?(p: string): boolean };
  return a.isMissing?.(path) ? "missing" : "pending";
}

/** Draw one resolved cell with the full fallback chain. Returns false if art is still loading. */
export function drawCell(
  g: CanvasRenderingContext2D, assets: Assets, art: CellArt, x: number, y: number, second: boolean,
): boolean {
  const chain = second && art.path2 ? [art.path2, art.path, tilePath(art.key, 2), tilePath(art.key)] : [art.path, tilePath(art.key)];
  let pending = false;
  for (const p of chain) {
    const s = blit(g, assets, p, x, y);
    if (s === "ok") return !pending;
    if (s === "pending") pending = true;
  }
  if (art.key === "bramble_stump") {
    // A pruned bramble before its art lands: the grass it grew in, with cut canes on top.
    const ok = drawCell(g, assets, { key: "grass", mask: -1, alt: 0, path: tilePath("grass"), path2: null }, x, y, false);
    drawStumpFallback(g, x, y);
    return ok && !pending;
  }
  drawFallbackTile(g, art.key, x, y, second);
  return !pending;
}

export class TileLayer {
  private c1: HTMLCanvasElement | null = null;
  private c2: HTMLCanvasElement | null = null;
  private x0 = 0;
  private y0 = 0;
  private w = 0;
  private h = 0;
  private sig = "";
  private incomplete = false;
  private retry = 0;
  /** Lamp posts (for night glows). */
  lamps: { x: number; y: number }[] = [];
  /** True when some tile on this map animates. */
  animated = false;

  constructor(private assets: Assets, private cat: TileCatalog = assetCatalog(assets)) {}

  resolve(m: MapRuntime, x: number, y: number): CellArt {
    return this.cat.resolve(tileAt(m, x, y), autotileMask(m, x, y), x, y);
  }

  /** Make sure the cache matches the map; cheap when nothing changed. */
  ensure(m: MapRuntime) {
    const sig = `${m.def.id}|${m.w}x${m.h}|${m.legendSig ?? ""}`;
    if (sig === this.sig && !(this.incomplete && ++this.retry % 30 === 0)) return;
    this.sig = sig;
    this.build(m);
  }

  private build(m: MapRuntime) {
    if (typeof document === "undefined") return;
    this.x0 = -MARGIN;
    this.y0 = -MARGIN;
    this.w = m.w + MARGIN * 2;
    this.h = m.h + MARGIN * 2;
    const cells: CellArt[] = [];
    this.lamps = [];
    this.animated = false;
    for (let y = this.y0; y < this.y0 + this.h; y++) {
      for (let x = this.x0; x < this.x0 + this.w; x++) {
        const art = this.resolve(m, x, y);
        cells.push(art);
        if (art.path2) this.animated = true;
        if (art.key === "lamp_post" && x >= 0 && y >= 0 && x < m.w && y < m.h) this.lamps.push({ x, y });
      }
    }
    const make = (prev: HTMLCanvasElement | null) => {
      const c = prev ?? document.createElement("canvas");
      c.width = this.w * TILE;
      c.height = this.h * TILE;
      const g = c.getContext("2d")!;
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, c.width, c.height);
      return c;
    };
    this.c1 = make(this.c1);
    this.c2 = this.animated ? make(this.c2) : null;
    const g1 = this.c1.getContext("2d")!;
    const g2 = this.c2?.getContext("2d") ?? null;
    let complete = true;
    for (let i = 0; i < cells.length; i++) {
      const art = cells[i];
      const px = (i % this.w) * TILE;
      const py = Math.floor(i / this.w) * TILE;
      if (!drawCell(g1, this.assets, art, px, py, false)) complete = false;
      if (g2 && !drawCell(g2, this.assets, art, px, py, !!art.path2)) complete = false;
    }
    this.incomplete = !complete;
  }

  /** Blit the visible area. Cells outside the cached rectangle are drawn directly. */
  draw(g: CanvasRenderingContext2D, m: MapRuntime, camX: number, camY: number, second: boolean) {
    const c = (second && this.c2) || this.c1;
    const tx0 = Math.floor(camX / TILE);
    const ty0 = Math.floor(camY / TILE);
    const tx1 = Math.floor((camX + SCREEN_W - 1) / TILE);
    const ty1 = Math.floor((camY + SCREEN_H - 1) / TILE);
    if (c) {
      // Source rectangle clipped to the cache.
      const sx = Math.max(camX, this.x0 * TILE);
      const sy = Math.max(camY, this.y0 * TILE);
      const ex = Math.min(camX + SCREEN_W, (this.x0 + this.w) * TILE);
      const ey = Math.min(camY + SCREEN_H, (this.y0 + this.h) * TILE);
      if (ex > sx && ey > sy) {
        g.drawImage(c, sx - this.x0 * TILE, sy - this.y0 * TILE, ex - sx, ey - sy, sx - camX, sy - camY, ex - sx, ey - sy);
      }
    }
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (c && tx >= this.x0 && ty >= this.y0 && tx < this.x0 + this.w && ty < this.y0 + this.h) continue;
        const art = this.resolve(m, tx, ty);
        drawCell(g, this.assets, art, tx * TILE - camX, ty * TILE - camY, second && !!art.path2);
      }
    }
  }
}

export type { TileKey };
