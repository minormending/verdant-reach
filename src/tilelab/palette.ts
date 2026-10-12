// The tile palette: every TileKey grouped by the tileset that owns it, with
// usage counts; and the selected tile's card: base, frame 2, alts, the 16
// autotile masks as a 4x4 grid, the maps that use it, and the single-tile
// swap (drop or pick a PNG, or pick a cell from a sheet), its A/B switch and
// reset.

import type { TileKey } from "../contracts";
import { tileAltPath, tilePath, tileVariantPath } from "../contracts";
import { refCells } from "../art/format";
import type { Rgba } from "../art/png";
import { h } from "../guide/dom";
import { autotiled, type Lab } from "./app";
import { imageToRgba } from "./install";
import { sheetPicker } from "./picker";
import { tileDef } from "./plan";
import { paint, pixelCanvas } from "./render";
import { classifyUpload, cellOf, crop, editFromUpload, gridSize, MASKS, sliceMaskGrid, type TileEdit } from "./tiles";
import { usageLabel } from "./usage";

/** Decode a dropped or picked image file to RGBA. */
export async function fileToRgba(file: File): Promise<Rgba> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`${file.name} is not an image`));
      img.src = url;
    });
    return imageToRgba(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Make `el` accept dropped image files (and give it a file button). */
export function dropZone(el: HTMLElement, onFile: (img: Rgba, file: File) => void, onError: (msg: string) => void, label = "Choose PNG…"): HTMLElement {
  const input = h<HTMLInputElement>("input", { type: "file", accept: "image/png,image/*", hidden: true });
  const take = (file: File | undefined) => {
    if (!file) return;
    fileToRgba(file).then((img) => onFile(img, file)).catch((e: unknown) => onError(e instanceof Error ? e.message : String(e)));
  };
  input.addEventListener("change", () => { take(input.files?.[0]); input.value = ""; });
  const button = h<HTMLButtonElement>("button.tl-btn", { type: "button" }, label);
  button.addEventListener("click", () => input.click());
  el.classList.add("tl-drop");
  el.addEventListener("dragover", (e) => {
    if (!e.dataTransfer?.types.includes("Files")) return;
    e.preventDefault();
    e.stopPropagation();
    el.classList.add("over");
  });
  el.addEventListener("dragleave", () => el.classList.remove("over"));
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.classList.remove("over");
    take(e.dataTransfer?.files?.[0]);
  });
  return h("span", button, input);
}

export function createPalette(lab: Lab, toast: (msg: string) => void, openMap: (id: string) => void): HTMLElement {
  const filter = h<HTMLInputElement>("input.tl-input", { type: "search", placeholder: "Filter tiles", "aria-label": "Filter tiles" });
  const editedOnly = h<HTMLInputElement>("input", { type: "checkbox" });
  const card = h("div.tl-tilecard", h("p.tl-muted", "Select a tile below, or click a cell on a map."));
  const groups = h("div.tl-groups");
  const root = h("div.tl-palette", card, h("div.tl-toolbar", filter, h("label.tl-check", editedOnly, h("span", "Edited only"))), groups);

  const buttons = new Map<TileKey, { el: HTMLButtonElement; c: HTMLCanvasElement }>();

  function buildGroups() {
    const byOwner = new Map<string, TileKey[]>();
    for (const k of lab.keys) {
      const o = lab.owner(k) ?? "(no tileset)";
      byOwner.set(o, [...(byOwner.get(o) ?? []), k]);
    }
    groups.replaceChildren();
    buttons.clear();
    for (const [owner, keys] of [...byOwner].sort(([a], [b]) => a.localeCompare(b))) {
      const grid = h("div.tl-tiles");
      for (const k of keys) {
        const c = pixelCanvas(null, 2);
        const u = lab.usage.keys.get(k);
        const b = h<HTMLButtonElement>("button.tl-tile", { type: "button", title: `${k} · ${usageLabel(u)}`, "data-key": k }, c, h("span.tl-tile-name", k));
        if (!u?.maps.size) b.classList.add("unused");
        b.addEventListener("click", () => lab.select(lab.selected === k ? null : k));
        buttons.set(k, { el: b, c });
        grid.append(b);
      }
      const v = lab.reg.bundle("tilesets", owner);
      const name = typeof v?.merged.name === "string" ? v.merged.name : owner;
      groups.append(h("details.tl-group", { open: true, "data-owner": owner },
        h("summary", h("b", name), h("span.tl-muted", ` ${owner} · ${keys.length} keys`)), grid));
    }
  }

  function paintButtons() {
    const reg = lab.shown();
    for (const [k, { el, c }] of buttons) {
      paint(c, reg.image(tilePath(k)));
      el.classList.toggle("edited", lab.edited(k));
      el.classList.toggle("selected", lab.selected === k);
    }
  }

  function applyFilter() {
    const q = filter.value.trim().toLowerCase();
    for (const [k, { el }] of buttons) el.hidden = (!!q && !k.includes(q)) || (editedOnly.checked && !lab.edited(k));
    for (const d of groups.querySelectorAll<HTMLDetailsElement>("details")) {
      d.hidden = ![...d.querySelectorAll<HTMLElement>(".tl-tile")].some((b) => !b.hidden);
    }
  }
  filter.addEventListener("input", applyFilter);
  editedOnly.addEventListener("change", applyFilter);

  // ---- the selected tile's card --------------------------------------------------

  let pickSheet: { img: Rgba; name: string } | null = null;
  let pickerZoom = 2;

  function setEdit(key: TileKey, e: TileEdit | null) {
    void lab.update((s) => {
      if (e) s.edits[key] = e;
      else delete s.edits[key];
    });
  }

  function renderCard() {
    const key = lab.selected;
    if (!key) { card.replaceChildren(h("p.tl-muted", "Select a tile below, or click a cell on a map, to see its art, where it's used and swap it.")); return; }
    const reg = lab.shown();
    const def = tileDef(reg.catalog, key);
    const auto = autotiled(key);
    const u = lab.usage.keys.get(key);
    const frames = def ? refCells(def.base).length : 1;
    const alts = def?.alts?.length ?? 0;
    const masksDefined = new Set(Object.keys(def?.masks ?? {}).map(Number));
    const img = (p: string) => reg.image(p);

    const art = h("div.tl-art");
    const fig = (label: string, c: HTMLElement) => h("figure", c, h("figcaption", label));
    art.append(fig("base", pixelCanvas(img(tilePath(key)), 3)));
    if (frames > 1) art.append(fig("frame 2", pixelCanvas(img(tilePath(key, 2)), 3)));
    for (let i = 1; i <= alts; i++) art.append(fig(`alt ${i}`, pixelCanvas(img(tileAltPath(key, i as 1 | 2 | 3)), 3)));

    let masks: HTMLElement | null = null;
    if (auto) {
      const grid = h("div.tl-maskgrid", { "aria-label": "Autotile masks 0–15" });
      for (let m = 0; m < MASKS; m++) {
        const has = masksDefined.has(m);
        const c = pixelCanvas(img(has ? tileVariantPath(key, m) : tilePath(key)), 2);
        grid.append(h("div.tl-mask", { class: has ? "" : "fallback", title: `mask ${m}${has ? "" : " (not drawn: falls back to the base)"} · N${m & 1 ? "+" : "-"} E${m & 2 ? "+" : "-"} S${m & 4 ? "+" : "-"} W${m & 8 ? "+" : "-"}` }, c, h("span", String(m))));
      }
      masks = h("div", h("h4", `Autotile masks (${masksDefined.size} of 16 drawn)`), grid);
      if (frames > 1) {
        const grid2 = h("div.tl-maskgrid");
        for (let m = 0; m < MASKS; m++) {
          const has = masksDefined.has(m);
          grid2.append(h("div.tl-mask", { class: has ? "" : "fallback" }, pixelCanvas(img(has ? tileVariantPath(key, m, 2) : tilePath(key, 2)), 2), h("span", String(m))));
        }
        masks.append(h("h4", "Masks, frame 2"), grid2);
      }
    }

    const maps = lab.mapsUsing(key).map((id) => {
      const m = lab.maps.find((d) => d.id === id)!;
      const mu = u!.maps.get(id)!;
      const b = h<HTMLButtonElement>("button.tl-chip", { type: "button", title: `${mu.cells} cells${mu.cond ? ` (+${mu.cond} in some story states)` : ""}${mu.border ? "; the map's border" : ""}` }, m.name, h("small", ` ${mu.cells}${mu.cond ? `+${mu.cond}` : ""}`));
      b.addEventListener("click", () => openMap(id));
      return b;
    });

    // Swap controls.
    const edit = lab.state.edits[key];
    const mapped = lab.state.mapping?.data.tiles[key];
    const fill = h<HTMLInputElement>("input", { type: "checkbox", checked: edit?.fill ?? false });
    const drop = h("div.tl-dropbox",
      h("p", h("b", "Drop a PNG here"), " to swap this tile on every map:"),
      h("ul.tl-hints",
        h("li", "16x16: the base"),
        h("li", "32x16: two animation frames"),
        auto ? h("li", "64x64: the 16 masks as a 4x4 grid (mask 0 top-left, row by row; mask 15 also becomes the base); 128x64: two such grids, frames 1 and 2") : null,
        h("li", "anything bigger on a 16px grid: pick a cell from it")));
    const onUpload = (im: Rgba, file: File) => {
      const shape = classifyUpload(im.width, im.height, auto);
      if (shape.kind === "bad") { toast(`${file.name}: ${shape.why}`); return; }
      if (shape.kind === "sheet") { pickSheet = { img: im, name: file.name }; renderCard(); return; }
      const e = editFromUpload(im, auto, fill.checked, file.name);
      if (e) { setEdit(key, e); toast(`${key}: swapped in ${file.name}`); }
    };
    drop.append(h("div.tl-row", dropZone(drop, onUpload, toast),
      h("label.tl-check", fill, h("span", "Also use it for every alt and mask"))));
    fill.addEventListener("change", () => { if (edit) setEdit(key, { ...edit, fill: fill.checked }); });

    let picker: HTMLElement | null = null;
    if (pickSheet) {
      const ps = pickSheet;
      const { columns } = gridSize(ps.img);
      let block = false;
      const blockBtn = h<HTMLButtonElement>("button.tl-btn.small", { type: "button", "aria-pressed": "false", hidden: !auto }, "Next click: 4x4 mask block");
      blockBtn.addEventListener("click", () => { block = !block; blockBtn.setAttribute("aria-pressed", String(block)); });
      const p = sheetPicker(ps.img, {
        zoom: pickerZoom,
        onZoom: (z) => { pickerZoom = z; },
        hint: auto ? "Click: base · shift-click: frame 2 · or use a 4x4 block for the masks" : "Click: base · shift-click: frame 2",
        onPick(cell, ev) {
          const cur = lab.state.edits[key];
          if (block) {
            const x0 = cell % columns, y0 = Math.floor(cell / columns);
            if (x0 + 4 > columns || y0 + 4 > Math.floor(ps.img.height / 16)) { toast("A 4x4 block from there runs off the sheet."); return; }
            const grid = sliceMaskGrid(crop(ps.img, x0 * 16, y0 * 16, 64, 64));
            const masks = Object.fromEntries(grid.map((g, m) => [m, [g]]));
            setEdit(key, { enabled: true, base: [grid[15]], masks, fill: false, source: `${ps.name} block at cell ${cell}` });
            block = false;
            blockBtn.setAttribute("aria-pressed", "false");
            return;
          }
          const tile = cellOf(ps.img, cell, columns);
          if (ev.shiftKey && cur?.base?.length) setEdit(key, { ...cur, base: [cur.base[0], tile], source: `${cur.source} + frame 2 from cell ${cell}` });
          else setEdit(key, { enabled: true, base: [tile], fill: fill.checked, source: `${ps.name} cell ${cell}` });
        },
      });
      const closeBtn = h<HTMLButtonElement>("button.tl-btn.small", { type: "button" }, "Close sheet");
      closeBtn.addEventListener("click", () => { pickSheet = null; renderCard(); });
      picker = h("div.tl-pickbox", h("div.tl-row", h("b", `Pick from ${ps.name}`), blockBtn, closeBtn), p.el);
    }

    let status: HTMLElement | null = null;
    if (edit) {
      const on = h<HTMLInputElement>("input", { type: "checkbox", checked: edit.enabled });
      on.addEventListener("change", () => setEdit(key, { ...edit, enabled: on.checked }));
      const reset = h<HTMLButtonElement>("button.tl-btn.warn", { type: "button" }, "Reset tile");
      reset.addEventListener("click", () => setEdit(key, null));
      status = h("div.tl-editstate",
        h("span", "Swapped: ", h("b", edit.source)),
        h("label.tl-check", { title: "A/B: switch this tile's swap off and on" }, on, h("span", "Show the swap")),
        reset);
    } else if (mapped) {
      status = h("div.tl-editstate", h("span", "Mapped from ", h("b", lab.state.mapping!.data.sheet.name), " (Tilesets tab)."));
    }

    card.replaceChildren(...[
      h("div.tl-cardhead", h("h3", key), h("span.tl-chip.static", lab.owner(key) ?? "no tileset"),
        auto ? h("span.tl-chip.static", "autotile") : null, frames > 1 ? h("span.tl-chip.static", "animated") : null,
        alts ? h("span.tl-chip.static", `${alts} alt${alts > 1 ? "s" : ""}`) : null),
      h("p.tl-muted", usageLabel(u)),
      art, masks, status, drop, picker,
      maps.length ? h("details.tl-maps", { open: maps.length <= 12 }, h("summary", `Maps using it (${maps.length})`), h("div.tl-chips", maps)) : null,
    ].filter((x): x is HTMLElement => !!x));
  }

  lab.on("select", () => { pickSheet = null; renderCard(); paintButtons(); scrollToSelected(); });
  lab.on("art", () => { renderCard(); paintButtons(); applyFilter(); });
  lab.on("compare", () => { renderCard(); paintButtons(); });
  function scrollToSelected() {
    const b = lab.selected ? buttons.get(lab.selected)?.el : null;
    if (b && !b.hidden) b.scrollIntoView({ block: "nearest" });
  }

  buildGroups();
  void lab.reg.loadAll(lab.reg.catalog.provides().filter((p) => p.startsWith("assets/tiles/"))).then(() => { paintButtons(); renderCard(); });
  paintButtons();
  return root;
}
