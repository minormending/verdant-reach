// Drawing for the Tile Lab: whole maps through the guide's renderMap (the
// game's own tile, autotile, structure and character code), thumbnails,
// highlight overlays and small tile canvases.

import type { ArtImage, MapDef, TileKey } from "../contracts";
import { TILE } from "../contracts";
import type { Rgba } from "../art/png";
import { MAP_MARGIN, renderMap } from "../guide/mapRender";
import { buildMap, refreshLegend, tileAt } from "../overworld/map";
import { h } from "../guide/dom";
import type { Lab } from "./app";
import { rgbaToCanvas } from "./install";

export { MAP_MARGIN };

/** Render a map with the art currently shown (lab edits on, or the compare side). */
export async function drawMap(lab: Lab, def: MapDef, flags: Record<string, boolean>, into?: HTMLCanvasElement) {
  return renderMap(lab.viewOf(lab.shown()), def, flags, into);
}

/** A lookup of the tile key at map cell (x, y) in a story state (border beyond the edges). */
export function tileLookup(def: MapDef, flags: Record<string, boolean>): (x: number, y: number) => TileKey {
  const m = buildMap(def);
  refreshLegend(m, flags);
  return (x, y) => tileAt(m, x, y);
}

/** Cells (map coordinates, inside the map) that show `key` in a story state. */
export function cellsWith(def: MapDef, flags: Record<string, boolean>, key: TileKey): { x: number; y: number }[] {
  const at = tileLookup(def, flags);
  const w = Math.max(0, ...def.tiles.map((r) => Array.from(r).length));
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < def.tiles.length; y++) for (let x = 0; x < w; x++) if (at(x, y) === key) out.push({ x, y });
  return out;
}

/** A downscaled copy of a map picture that fits in maxW x maxH, with optional highlighted cells. */
export function thumbnail(full: HTMLCanvasElement, maxW: number, maxH: number, cells: { x: number; y: number }[] = []): HTMLCanvasElement {
  const s = Math.min(maxW / full.width, maxH / full.height, 1);
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(full.width * s));
  c.height = Math.max(1, Math.round(full.height * s));
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = s < 1;
  g.imageSmoothingQuality = "high";
  g.drawImage(full, 0, 0, c.width, c.height);
  if (cells.length) {
    g.fillStyle = "rgba(0, 229, 255, 0.45)";
    const t = TILE * s;
    for (const p of cells) g.fillRect((p.x + MAP_MARGIN) * t, (p.y + MAP_MARGIN) * t, Math.max(1, t), Math.max(1, t));
  }
  return c;
}

/** Draw highlight outlines for cells onto an overlay canvas at a zoom. */
export function drawHighlights(g: CanvasRenderingContext2D, cells: { x: number; y: number }[], zoom: number) {
  const t = TILE * zoom;
  g.save();
  g.fillStyle = "rgba(0, 229, 255, 0.22)";
  g.strokeStyle = "#00e5ff";
  g.lineWidth = Math.max(1, zoom);
  for (const p of cells) {
    const x = (p.x + MAP_MARGIN) * t, y = (p.y + MAP_MARGIN) * t;
    g.fillRect(x, y, t, t);
    g.strokeRect(x + g.lineWidth / 2, y + g.lineWidth / 2, t - g.lineWidth, t - g.lineWidth);
  }
  g.restore();
}

/** A pixelated canvas showing a 16x16 (or any) image at an integer scale. */
export function pixelCanvas(img: ArtImage | Rgba | null | undefined, scale: number, cls = "", w = 16, hh = 16): HTMLCanvasElement {
  const c = h<HTMLCanvasElement>("canvas.px", { class: cls, width: w, height: hh, style: `width:${w * scale}px;height:${hh * scale}px` });
  paint(c, img);
  return c;
}

const isRgba = (x: ArtImage | Rgba): x is Rgba => (x as Rgba).data instanceof Uint8Array;

/** Repaint a pixel canvas (clears it when the image isn't there). */
export function paint(c: HTMLCanvasElement, img: ArtImage | Rgba | null | undefined) {
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, c.width, c.height);
  if (!img) return;
  const src: ArtImage = isRgba(img) ? rgbaToCanvas(img) : img;
  g.drawImage(src, 0, 0, Math.min(c.width, src.width), Math.min(c.height, src.height), 0, 0, Math.min(c.width, src.width), Math.min(c.height, src.height));
}
