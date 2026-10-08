// The sole Modern UI drawing layer. Missing bundle/image => caller's original
// GBC primitive; the public base set deliberately contains no licensed crops.
import type { ArtImage } from "../contracts";
import { activeArt } from "../art/registry";
import type { ImageSetEntry } from "../art/format";

export interface Rect { x: number; y: number; w: number; h: number }
export type PanelKind = "window" | "inset" | "plain" | "slot" | "button_round";
const path = (key: string) => `assets/ui/${key}.png`;
const panels = new WeakMap<CanvasRenderingContext2D, (Rect & { ink: string })[]>();
export function beginSkinFrame(g: CanvasRenderingContext2D) { panels.delete(g); }
function element(key: string): { image: ArtImage; spec: ImageSetEntry } | undefined {
  const art = activeArt();
  const spec = (art?.bundle("sets", "ui_limezu")?.merged.images as Record<string, ImageSetEntry> | undefined)?.[key];
  if (!spec) return;
  const image = art?.image(path(key));
  return image ? { image, spec } : undefined;
}
export function skinOn() { return !!element("panel_window"); }

/** Integer nearest-neighbour nine/three slices; corners never grow with a panel.
 * Tiny existing labels compress border thickness only when necessary to fit.
 */
export function slice(g: CanvasRenderingContext2D, image: ArtImage, insets: readonly number[], rect: Rect, center = true, caps = insets) {
  const [l, t, r, b] = insets;
  const w = image.width, h = image.height;
  const fit = (a: number, z: number, n: number) => a + z <= n ? [a, z] : [Math.floor(n * a / (a + z)), n - Math.floor(n * a / (a + z))];
  const [dl, dr] = fit(caps[0], caps[2], rect.w), [dt, db] = fit(caps[1], caps[3], rect.h);
  const sx = [0, l, w - r, w], sy = [0, t, h - b, h];
  const dx = [rect.x, rect.x + dl, rect.x + rect.w - dr, rect.x + rect.w];
  const dy = [rect.y, rect.y + dt, rect.y + rect.h - db, rect.y + rect.h];
  const smoothing = g.imageSmoothingEnabled;
  g.imageSmoothingEnabled = false;
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    if (!center && row === 1 && col === 1) continue;
    const sw = sx[col + 1] - sx[col], sh = sy[row + 1] - sy[row];
    const dw = dx[col + 1] - dx[col], dh = dy[row + 1] - dy[row];
    if (sw > 0 && sh > 0 && dw > 0 && dh > 0) g.drawImage(image, sx[col], sy[row], sw, sh, dx[col], dy[row], dw, dh);
  }
  g.imageSmoothingEnabled = smoothing;
}
function sliced(g: CanvasRenderingContext2D, key: string, rect: Rect, center = true, cap?: number) {
  const e = element(key);
  if (!e?.spec.insets) return false;
  slice(g, e.image, e.spec.insets, { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.w), h: Math.round(rect.h) }, center, cap === undefined ? e.spec.insets : e.spec.insets.map(n => Math.min(n, cap)));
  return true;
}
export function panel(g: CanvasRenderingContext2D, kind: PanelKind, rect: Rect): boolean {
  const key = kind === "slot" || kind === "button_round" ? kind : `panel_${kind}`;
  if (!sliced(g, key, rect, true, rect.h <= 14 ? 1 : rect.h <= 24 ? 2 : 6)) return false;
  const ink = element(key)?.spec.ink ?? element("panel_inset")?.spec.ink ?? "#3a2a1e";
  const list = panels.get(g) ?? [];
  list.push({ ...rect, ink }); panels.set(g, list);
  return true;
}
/** The selected-row frame surrounds parchment: retain its authored edges but
 * leave the dark centre transparent so the unchanged font stays dark/readable.
 */
export function highlight(g: CanvasRenderingContext2D, rect: Rect) { return sliced(g, "highlight", rect, false, rect.h <= 12 ? 1 : 2); }
export function focus(g: CanvasRenderingContext2D, rect: Rect) {
  const e = element("focus_corners");
  if (!e) return false;
  slice(g, e.image, [Math.floor(e.image.width / 2), Math.floor(e.image.height / 2), Math.floor(e.image.width / 2), Math.floor(e.image.height / 2)], rect, false);
  return true;
}
/** Font cells stay 8x8; glyph-sized cursors preserve the R1 layout. */
export function cursor(g: CanvasRenderingContext2D, kind: "arrow" | "hand" | "down" | "up" | "left", x: number, y: number) {
  const e = element(kind === "hand" ? "cursor_hand" : "cursor_arrow");
  if (!e) return false;
  g.save(); g.imageSmoothingEnabled = false;
  g.translate(Math.round(x) + 4, Math.round(y) + 4);
  g.rotate(kind === "down" ? Math.PI / 2 : kind === "up" ? -Math.PI / 2 : kind === "left" ? Math.PI : 0);
  g.drawImage(e.image, 0, 0, e.image.width, e.image.height, -4, -4, 8, 8);
  g.restore(); return true;
}
export function icon(g: CanvasRenderingContext2D, key: "coin" | "check_on" | "heart", x: number, y: number, size = 8) {
  const e = element(key); if (!e) return false;
  g.save(); g.imageSmoothingEnabled = false; g.drawImage(e.image, x, y, size, size); g.restore(); return true;
}
export function toggle(g: CanvasRenderingContext2D, on: boolean, x: number, y: number) {
  const e = element(on ? "toggle_on" : "toggle_off"); if (!e) return false;
  g.drawImage(e.image, Math.round(x), Math.round(y)); return true;
}
export function bar(g: CanvasRenderingContext2D, kind: "hp" | "exp", rect: Rect, fraction: number) {
  const frac = Math.max(0, Math.min(1, fraction));
  const key = kind === "exp" ? "bar_blue" : frac > .5 ? "bar_green" : frac > .2 ? "bar_yellow" : "bar_red";
  // Both bar assets contain a frame. Clip only the inner track of the full
  // fill, preserving the single frame and a fixed cap at all fractions.
  const fill = element(key), frame = element("bar_frame");
  if (!fill?.spec.insets || !frame?.spec.insets) return false;
  slice(g, frame.image, frame.spec.insets, rect);
  const [l, , r] = frame.spec.insets;
  const track = Math.max(0, rect.w - l - r);
  const n = frac > 0 ? Math.max(1, Math.round(track * frac)) : 0;
  if (n) {
    g.save(); g.beginPath(); g.rect(rect.x + l, rect.y + 1, n, Math.max(0, rect.h - 2)); g.clip();
    slice(g, fill.image, fill.spec.insets, rect); g.restore();
  }
  return true;
}
/** Only ink on a skin panel changes; coloured art/badges retain their colours. */
export function textColor(g: CanvasRenderingContext2D, x: number, y: number, color: string): string {
  const list = panels.get(g) ?? [];
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    if (x >= p.x && y >= p.y && x < p.x + p.w && y < p.y + p.h) return p.ink;
  }
  return color;
}

/** Replace a custom rectangular UI surface, preserving its current fillStyle
 * and exact fillRect call in the GBC fallback. */
export function surface(g: CanvasRenderingContext2D, kind: PanelKind | "selection", x: number, y: number, w: number, h: number) {
  const rect = { x, y, w, h };
  if (kind === "selection") {
    if (panel(g, "plain", rect)) { highlight(g, rect); return; }
  } else if (panel(g, kind, rect)) return;
  g.fillRect(x, y, w, h);
}
