// A clickable 16px-grid view of a sheet: integer zoom, grid lines, hover,
// marks on cells that are already used, and an outline on chosen cells.

import type { Rgba } from "../art/png";
import { h } from "../guide/dom";
import { rgbaToCanvas } from "./install";
import { TS } from "./tiles";

export interface PickerOptions {
  zoom?: number;
  /** Cell -> labels (drawn as a corner mark; listed in the tooltip). */
  labels?: () => ReadonlyMap<number, readonly string[]>;
  /** Cells to outline (the current slot's assignment). */
  chosen?: () => readonly number[];
  onPick(cell: number, e: MouseEvent): void;
  /** Told when the zoom changes (so a re-created picker can keep it). */
  onZoom?(zoom: number): void;
  /** Shown under the sheet. */
  hint?: string;
}

export interface Picker {
  el: HTMLElement;
  redraw(): void;
  columns: number;
}

export function sheetPicker(img: Rgba, opts: PickerOptions): Picker {
  const columns = Math.floor(img.width / TS);
  const rows = Math.floor(img.height / TS);
  const src = rgbaToCanvas(img);
  let zoom = opts.zoom ?? 2;
  let hover = -1;
  const c = h<HTMLCanvasElement>("canvas.px.tl-picker-canvas");
  const status = h("div.tl-picker-status", opts.hint ?? "Click a cell.");
  const zooms = h("div.tl-seg", { role: "group", "aria-label": "Sheet zoom" });
  const wrap = h("div.tl-picker-scroll", c);

  const cellAt = (e: MouseEvent) => {
    const r = c.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / (TS * zoom));
    const y = Math.floor((e.clientY - r.top) / (TS * zoom));
    return x >= 0 && y >= 0 && x < columns && y < rows ? y * columns + x : -1;
  };

  function redraw() {
    c.width = columns * TS * zoom;
    c.height = rows * TS * zoom;
    c.style.width = `${c.width}px`;
    c.style.height = `${c.height}px`;
    const g = c.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(src, 0, 0, columns * TS, rows * TS, 0, 0, c.width, c.height);
    const t = TS * zoom;
    g.strokeStyle = "rgba(128,128,128,0.35)";
    g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x <= columns; x++) { g.moveTo(x * t + 0.5, 0); g.lineTo(x * t + 0.5, c.height); }
    for (let y = 0; y <= rows; y++) { g.moveTo(0, y * t + 0.5); g.lineTo(c.width, y * t + 0.5); }
    g.stroke();
    const labels = opts.labels?.();
    if (labels) {
      g.fillStyle = "#2f8fff";
      for (const cell of labels.keys()) {
        const x = (cell % columns) * t, y = Math.floor(cell / columns) * t;
        g.beginPath();
        g.moveTo(x + t, y); g.lineTo(x + t, y + Math.max(5, t / 3)); g.lineTo(x + t - Math.max(5, t / 3), y);
        g.fill();
      }
    }
    const box = (cell: number, colour: string, w: number) => {
      g.strokeStyle = colour;
      g.lineWidth = w;
      g.strokeRect((cell % columns) * t + w / 2, Math.floor(cell / columns) * t + w / 2, t - w, t - w);
    };
    for (const cell of opts.chosen?.() ?? []) box(cell, "#00c8e0", 3);
    if (hover >= 0) box(hover, "#f0b83a", 2);
  }

  c.addEventListener("mousemove", (e) => {
    const cell = cellAt(e);
    if (cell === hover) return;
    hover = cell;
    const used = cell >= 0 ? opts.labels?.().get(cell) : undefined;
    status.textContent = cell < 0 ? (opts.hint ?? "Click a cell.") : `Cell ${cell} (column ${cell % columns}, row ${Math.floor(cell / columns)})${used?.length ? ` · ${used.join(", ")}` : ""}`;
    redraw();
  });
  c.addEventListener("mouseleave", () => { hover = -1; redraw(); });
  c.addEventListener("click", (e) => {
    const cell = cellAt(e);
    if (cell >= 0) opts.onPick(cell, e);
    redraw();
  });
  for (const z of [1, 2, 3, 4]) {
    const b = h<HTMLButtonElement>("button.tl-btn.small", { type: "button", "aria-pressed": String(z === zoom) }, `${z}x`);
    b.addEventListener("click", () => {
      zoom = z;
      opts.onZoom?.(z);
      for (const o of zooms.querySelectorAll("button")) o.setAttribute("aria-pressed", String(o === b));
      redraw();
    });
    zooms.append(b);
  }
  redraw();
  const el = h("div.tl-picker", h("div.tl-row", h("span.tl-muted", `${img.width}x${img.height} · ${columns}x${rows} cells`), zooms), wrap, status);
  return { el, redraw, columns };
}
