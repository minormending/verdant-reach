// The map atlas: every map as a thumbnail (rendered lazily as it scrolls into
// view), filterable by name, tileset and "uses the selected tile", and a
// large view with integer zoom, panning, story-state flags, the selected
// tile's cells highlighted and the tile under the cursor named.

import type { MapDef, MapId, TileKey } from "../contracts";
import { h } from "../guide/dom";
import type { Lab } from "./app";
import { cellsWith, drawHighlights, drawMap, MAP_MARGIN, thumbnail, tileLookup } from "./render";
import { usageLabel } from "./usage";

const THUMB_W = 260;
const THUMB_H = 190;

interface Card {
  def: MapDef;
  el: HTMLElement;
  slot: HTMLElement;
  count: HTMLElement;
  /** What the shown thumbnail was drawn for; differs => re-render. */
  drawn: string;
  visible: boolean;
}

export function createAtlas(lab: Lab, openViewer: (id: MapId) => void): { el: HTMLElement; filtered: () => MapId[] } {
  const search = h<HTMLInputElement>("input.tl-input", { type: "search", placeholder: "Search maps by name or id", "aria-label": "Search maps" });
  const tsSelect = h<HTMLSelectElement>("select.tl-input", { "aria-label": "Filter by tileset" });
  const onlyTile = h<HTMLInputElement>("input", { type: "checkbox" });
  const onlyLabel = h("label.tl-check", onlyTile, h("span", "Only maps using the selected tile"));
  const highlight = h<HTMLInputElement>("input", { type: "checkbox", checked: true });
  const hlLabel = h("label.tl-check", highlight, h("span", "Highlight it"));
  const count = h("span.tl-muted");
  const grid = h("div.tl-grid");
  const empty = h("p.tl-empty", { hidden: true }, "No maps match.");
  const el = h("section.tl-atlas", { "aria-label": "Map atlas" },
    h("div.tl-toolbar", search, tsSelect, onlyLabel, hlLabel, count), grid, empty);

  const fillTilesets = () => {
    const cur = tsSelect.value;
    tsSelect.replaceChildren(h("option", { value: "" }, "All tilesets"), ...lab.tilesets().map((id) => h("option", { value: id }, `Tileset: ${id}`)));
    tsSelect.value = cur;
  };
  fillTilesets();

  const cards: Card[] = lab.maps.map((def) => {
    const slot = h("div.tl-thumb", h("span.tl-thumb-wait", "…"));
    const cnt = h("span.tl-count");
    const size = `${Math.max(0, ...def.tiles.map((r) => Array.from(r).length))}x${def.tiles.length}`;
    const card = h("button.tl-card", { type: "button", title: `Open ${def.name} (${def.id})` },
      slot,
      h("span.tl-card-title", def.name),
      h("span.tl-card-meta", h("code", def.id), ` · ${size}`, cnt));
    const c: Card = { def, el: card, slot, count: cnt, drawn: "", visible: false };
    card.addEventListener("click", () => openViewer(def.id));
    (card as unknown as { _card: Card })._card = c;
    return c;
  });
  grid.append(...cards.map((c) => c.el));

  const sig = (c: Card) => {
    const key = lab.selected && highlight.checked ? lab.selected : "";
    return `${lab.compare ? "B" : "A"}${lab.artVersion}|${lab.story}|${key}`;
  };

  // A small render queue: one map at a time, yielding between maps.
  const queue: Card[] = [];
  let running = false;
  const pump = async () => {
    if (running) return;
    running = true;
    while (queue.length) {
      const c = queue.shift()!;
      if (!c.visible || c.el.hidden) continue;
      const s = sig(c);
      if (c.drawn === s) continue;
      try {
        const flags = lab.storyFlags();
        const pic = await drawMap(lab, c.def, flags);
        const cells = lab.selected && highlight.checked ? cellsWith(c.def, flags, lab.selected) : [];
        c.slot.replaceChildren(thumbnail(pic.canvas, THUMB_W, THUMB_H, cells));
        c.drawn = s;
      } catch (e) {
        console.warn(`[tilelab] could not draw ${c.def.id}`, e);
        c.slot.replaceChildren(h("span.tl-thumb-wait", "could not draw"));
        c.drawn = s;
      }
      await new Promise((r) => setTimeout(r, 0));
    }
    running = false;
  };
  const want = (c: Card) => { if (c.visible && !c.el.hidden && c.drawn !== sig(c) && !queue.includes(c)) queue.push(c); };
  const refreshVisible = () => { for (const c of cards) want(c); void pump(); };

  const io = typeof IntersectionObserver !== "undefined"
    ? new IntersectionObserver((entries) => {
      for (const e of entries) {
        const c = (e.target as unknown as { _card: Card })._card;
        c.visible = e.isIntersecting;
        if (c.visible) want(c);
      }
      void pump();
    }, { rootMargin: "300px" })
    : null;
  for (const c of cards) { if (io) io.observe(c.el); else c.visible = true; }

  const matches = (c: Card): boolean => {
    const q = search.value.trim().toLowerCase();
    if (q && !c.def.name.toLowerCase().includes(q) && !c.def.id.includes(q)) return false;
    if (tsSelect.value && !lab.mapTilesets(c.def.id).includes(tsSelect.value)) return false;
    if (onlyTile.checked && lab.selected && !lab.usage.maps.get(c.def.id)?.keys.has(lab.selected)) return false;
    return true;
  };
  const filter = () => {
    let n = 0;
    for (const c of cards) {
      const ok = matches(c);
      c.el.hidden = !ok;
      if (ok) n++;
      const u = lab.selected ? lab.usage.keys.get(lab.selected)?.maps.get(c.def.id) : undefined;
      c.count.textContent = u ? ` · ${u.cells}${u.cond ? `+${u.cond}` : ""}${u.border ? " +border" : ""} ${lab.selected}` : "";
      c.el.classList.toggle("uses", !!u);
    }
    count.textContent = `${n} of ${cards.length} maps`;
    empty.hidden = n > 0;
    onlyLabel.classList.toggle("disabled", !lab.selected);
    onlyTile.disabled = !lab.selected;
    refreshVisible();
  };
  search.addEventListener("input", filter);
  tsSelect.addEventListener("change", filter);
  onlyTile.addEventListener("change", filter);
  highlight.addEventListener("change", refreshVisible);
  lab.on("select", () => {
    // Selecting a tile filters the atlas to the maps that use it.
    onlyTile.checked = !!lab.selected;
    filter();
  });
  lab.on("art", () => { fillTilesets(); refreshVisible(); });
  lab.on("story", refreshVisible);
  lab.on("compare", refreshVisible);
  filter();
  return { el, filtered: () => cards.filter((c) => !c.el.hidden).map((c) => c.def.id) };
}

// ---- the large view -----------------------------------------------------------

export function createViewer(lab: Lab, list: () => MapId[]): { el: HTMLElement; open(id: MapId): void; close(): void } {
  let def: MapDef | null = null;
  let zoom = 2;
  let local: Record<string, boolean> = {};
  let token = 0;
  const title = h("h2.tl-viewer-title");
  const meta = h("div.tl-muted");
  const flagsBox = h("div.tl-flags");
  const zoomSeg = h("div.tl-seg", { role: "group", "aria-label": "Zoom" });
  const hl = h<HTMLInputElement>("input", { type: "checkbox", checked: true });
  const status = h("div.tl-viewer-status", "Hover a cell to name its tile; click to select that tile.");
  const map = h<HTMLCanvasElement>("canvas.px.tl-map");
  const overlay = h<HTMLCanvasElement>("canvas.tl-overlay");
  const stage = h("div.tl-stage", map, overlay);
  const scroll = h("div.tl-scroll", { tabindex: 0, "aria-label": "Map (drag to pan)" }, stage);
  const prev = h<HTMLButtonElement>("button.tl-btn", { type: "button", title: "Previous map ([)" }, "‹");
  const next = h<HTMLButtonElement>("button.tl-btn", { type: "button", title: "Next map (])" }, "›");
  const close = h<HTMLButtonElement>("button.tl-btn", { type: "button", title: "Close (Esc)", "aria-label": "Close" }, "✕");
  const walk = h<HTMLButtonElement>("button.tl-btn", { type: "button", title: "Dev server only: open the game on this map with the lab's tiles", hidden: !import.meta.env.DEV }, "Walk here ▶");
  const el = h("section.tl-viewer", { hidden: true, "aria-label": "Map view" },
    h("div.tl-viewer-head",
      h("div.tl-viewer-name", title, meta),
      h("div.tl-row", prev, next, zoomSeg, h("label.tl-check", hl, h("span", "Highlight selected tile")), walk, close)),
    flagsBox, scroll, status);

  for (const z of [1, 2, 3, 4]) {
    const b = h<HTMLButtonElement>("button.tl-btn.small", { type: "button" }, `${z}x`);
    b.addEventListener("click", () => setZoom(z));
    zoomSeg.append(b);
  }
  const syncZoom = () => zoomSeg.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-pressed", String(i + 1 === zoom)));

  const flags = () => ({ ...lab.storyFlags(), ...local });

  async function draw() {
    if (!def) return;
    const my = ++token;
    const pic = await drawMap(lab, def, flags());
    if (my !== token) return;
    map.width = pic.canvas.width;
    map.height = pic.canvas.height;
    map.getContext("2d")!.drawImage(pic.canvas, 0, 0);
    layout();
  }
  function layout() {
    map.style.width = `${map.width * zoom}px`;
    map.style.height = `${map.height * zoom}px`;
    overlay.width = map.width * zoom;
    overlay.height = map.height * zoom;
    overlay.style.width = `${overlay.width}px`;
    overlay.style.height = `${overlay.height}px`;
    drawOverlay();
  }
  let hover: { x: number; y: number } | null = null;
  function drawOverlay() {
    const g = overlay.getContext("2d")!;
    g.clearRect(0, 0, overlay.width, overlay.height);
    if (!def) return;
    if (lab.selected && hl.checked) drawHighlights(g, cellsWith(def, flags(), lab.selected), zoom);
    if (hover) {
      const t = 16 * zoom;
      g.strokeStyle = "#f0b83a";
      g.lineWidth = 2;
      g.strokeRect((hover.x + MAP_MARGIN) * t + 1, (hover.y + MAP_MARGIN) * t + 1, t - 2, t - 2);
    }
  }
  function setZoom(z: number) {
    const cx = (scroll.scrollLeft + scroll.clientWidth / 2) / zoom;
    const cy = (scroll.scrollTop + scroll.clientHeight / 2) / zoom;
    zoom = z;
    syncZoom();
    layout();
    scroll.scrollLeft = cx * zoom - scroll.clientWidth / 2;
    scroll.scrollTop = cy * zoom - scroll.clientHeight / 2;
  }
  function fillFlags() {
    flagsBox.replaceChildren();
    if (!def) return;
    const names = lab.usage.maps.get(def.id)?.flags ?? [];
    if (!names.length) { flagsBox.hidden = true; return; }
    flagsBox.hidden = false;
    flagsBox.append(h("span.tl-muted", "Story flags that change this map:"));
    for (const f of names) {
      const cb = h<HTMLInputElement>("input", { type: "checkbox", checked: !!flags()[f] });
      cb.addEventListener("change", () => { local[f] = cb.checked; void draw(); });
      flagsBox.append(h("label.tl-check", cb, h("code", f)));
    }
  }

  // Drag to pan; a click without a drag selects the tile under the cursor.
  let drag: { x: number; y: number; sl: number; st: number; moved: boolean } | null = null;
  scroll.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, sl: scroll.scrollLeft, st: scroll.scrollTop, moved: false };
    scroll.setPointerCapture(e.pointerId);
  });
  scroll.addEventListener("pointermove", (e) => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      if (drag.moved) { scroll.scrollLeft = drag.sl - dx; scroll.scrollTop = drag.st - dy; scroll.classList.add("panning"); }
    }
    const cell = cellAt(e);
    if (cell?.x !== hover?.x || cell?.y !== hover?.y) {
      hover = cell;
      drawOverlay();
      if (cell && def) {
        const key = tileLookup(def, flags())(cell.x, cell.y);
        status.textContent = `(${cell.x}, ${cell.y}) · ${key} · tileset ${lab.owner(key) ?? "?"} · ${usageLabel(lab.usage.keys.get(key))}`;
      }
    }
  });
  scroll.addEventListener("pointerup", (e) => {
    const d = drag;
    drag = null;
    scroll.classList.remove("panning");
    if (d && !d.moved && def) {
      const cell = cellAt(e);
      if (cell) lab.select(tileLookup(def, flags())(cell.x, cell.y));
    }
  });
  scroll.addEventListener("pointerleave", () => { hover = null; drawOverlay(); });
  function cellAt(e: PointerEvent): { x: number; y: number } | null {
    const r = overlay.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / (16 * zoom)) - MAP_MARGIN;
    const y = Math.floor((e.clientY - r.top) / (16 * zoom)) - MAP_MARGIN;
    if (!def || x < -MAP_MARGIN || y < -MAP_MARGIN) return null;
    const w = map.width / 16 - MAP_MARGIN * 2, hh = map.height / 16 - MAP_MARGIN * 2;
    return x <= w && y <= hh ? { x, y } : null;
  }

  const step = (d: number) => {
    if (!def) return;
    const ids = list();
    const i = ids.indexOf(def.id);
    const nextId = ids[(i + d + ids.length) % ids.length];
    if (nextId) open(nextId);
  };
  prev.addEventListener("click", () => step(-1));
  next.addEventListener("click", () => step(1));
  close.addEventListener("click", () => hide());
  hl.addEventListener("change", drawOverlay);
  walk.addEventListener("click", async () => {
    if (!def) return;
    await lab.flush();
    const f = Object.entries(flags()).filter(([, v]) => v).map(([k]) => k);
    const q = new URLSearchParams({ tilelab: "1", dev: "world", play: "1", map: def.id });
    if (f.length) q.set("flags", f.join(","));
    window.open(new URL(`index.html?${q}`, location.href).href, "_blank", "noopener");
  });
  document.addEventListener("keydown", (e) => {
    if (el.hidden || (e.target as HTMLElement).closest("input, select, textarea")) return;
    if (e.key === "Escape") hide();
    else if (e.key === "[") step(-1);
    else if (e.key === "]") step(1);
    else if (/^[1-4]$/.test(e.key)) setZoom(Number(e.key));
  });

  function open(id: MapId) {
    const d = lab.maps.find((m) => m.id === id);
    if (!d) return;
    const first = el.hidden || def?.id !== id;
    def = d;
    if (first) local = {};
    title.textContent = d.name;
    const w = Math.max(0, ...d.tiles.map((r) => Array.from(r).length));
    meta.replaceChildren(h("code", d.id), ` · ${w}x${d.tiles.length} tiles · border ${d.border} · tilesets: ${lab.mapTilesets(d.id).join(", ")}`);
    fillFlags();
    syncZoom();
    el.hidden = false;
    document.body.classList.add("viewing");
    if (location.hash !== `#map/${id}`) history.replaceState(null, "", `#map/${id}`);
    void draw().then(() => { if (first) { scroll.scrollLeft = 0; scroll.scrollTop = 0; } });
  }
  function hide() {
    el.hidden = true;
    def = null;
    document.body.classList.remove("viewing");
    if (location.hash.startsWith("#map/")) history.replaceState(null, "", location.pathname + location.search);
  }
  lab.on("art", () => void draw());
  lab.on("compare", () => void draw());
  lab.on("story", () => { fillFlags(); void draw(); });
  lab.on("select", drawOverlay);
  return { el, open, close: hide };
}

export type { TileKey };
