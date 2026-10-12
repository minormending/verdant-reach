// Whole-tileset swaps: (a) preview installed art packs, (b) replace one of
// the game's tileset sheets with a PNG in the same layout, (c) map ANY 16px
// tileset sheet onto the game's tile keys by clicking cells.

import type { TileKey } from "../contracts";
import { tilePath, tileVariantPath } from "../contracts";
import type { Rgba } from "../art/png";
import { h } from "../guide/dom";
import { autotiled, type Lab } from "./app";
import { imageToRgba, rgbaToCanvas } from "./install";
import {
  assign, assignMaskBlock, cellUses, newMapping, parseMapping, slotCell, unassign, unmappedKeys,
  type SheetMapping, type Slot,
} from "./mapping";
import { dropZone } from "./palette";
import { sheetPicker } from "./picker";
import { baseSheetOf, tilesetKeys } from "./plan";
import { pixelCanvas } from "./render";
import { cellOf, crop, MASKS } from "./tiles";

export function downloadBlob(blob: Blob, name: string) {
  const a = h<HTMLAnchorElement>("a", { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const slotName = (s: Slot) => s.kind === "base" ? `base${s.frame === 2 ? " frame 2" : ""}` : s.kind === "alt" ? `alt ${s.n}` : `mask ${s.mask}${s.frame === 2 ? " frame 2" : ""}`;
const sameSlot = (a: Slot, b: Slot) => JSON.stringify(a) === JSON.stringify(b);

export function createSheets(lab: Lab, toast: (msg: string) => void): HTMLElement {
  const packsBox = h("div.tl-packs");
  const tsBox = h("div.tl-tilesets");
  const mapper = h("div.tl-mapper");
  const root = h("div.tl-sheets",
    h("section", h("h3", "Art packs"), h("p.tl-muted", "Preview installed packs under the lab's edits (later packs win, as in ?art=a,b)."), packsBox),
    h("section", h("h3", "Replace a tileset's sheet"), h("p.tl-muted", "Drop a PNG laid out like the current sheet (same width; the cells line up) to swap a whole tileset at once."), tsBox),
    h("section", h("h3", "Map an external sheet"), h("p.tl-muted", "Load any tileset on a 16px grid, then give game tiles its cells: pick a tile, pick a slot, click a cell. Unmapped tiles keep the current art."), mapper));

  // ---- (a) packs -------------------------------------------------------------------
  function renderPacks() {
    const list = lab.reg.packs();
    if (!list.length) { packsBox.replaceChildren(h("p.tl-muted", "No packs are installed (public/art/packs/).")); return; }
    packsBox.replaceChildren(...list.map((p) => {
      const tree = lab.reg.index.packs[p.id];
      const tilesets = Object.keys(tree?.tilesets ?? {}).length;
      const what = (["species", "tilesets", "structures", "characters", "sets"] as const)
        .map((k) => [k, Object.keys(tree?.[k] ?? {}).length] as const).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(", ");
      const cb = h<HTMLInputElement>("input", { type: "checkbox", checked: lab.state.packs.includes(p.id) });
      cb.addEventListener("change", () => void lab.update((s) => {
        s.packs = cb.checked ? [...s.packs.filter((x) => x !== p.id), p.id] : s.packs.filter((x) => x !== p.id);
      }));
      return h("label.tl-pack", cb, h("span", h("b", p.name), h("code", ` ${p.id}`), h("small.tl-muted", ` ${what || "empty"}${tilesets ? "" : " (no tiles: maps won't change)"}`)));
    }));
  }

  // ---- (b) sheet replacements ---------------------------------------------------------
  function renderTilesets() {
    tsBox.replaceChildren(...lab.tilesets().map((id) => {
      const info = baseSheetOf(lab.base.catalog, id);
      const cur = info ? lab.base.fileNow(info.url) : undefined;
      const swap = lab.state.sheets[id];
      const v = lab.reg.bundle("tilesets", id);
      const name = typeof v?.merged.name === "string" ? v.merged.name : id;
      const thumb = pixelCanvas(swap ? swap.image : cur, 1, "tl-sheetthumb", cur?.width ?? 256, cur?.height ?? 16);
      const row = h("div.tl-tsrow", { "data-tileset": id },
        h("div.tl-tsname", h("b", name), h("code", ` ${id}`), h("small.tl-muted", ` · ${tilesetKeys(lab.base.catalog, id).length} keys · ${cur ? `${cur.width}x${cur.height}` : "…"}`)),
        thumb);
      const actions = h("div.tl-row");
      actions.append(dropZone(row, (img, file) => {
        if (!cur || !info) { toast("That tileset's sheet isn't loaded yet."); return; }
        if (img.width !== cur.width) { toast(`${file.name} is ${img.width}px wide; ${id}'s sheet is ${cur.width}px (${info.columns} columns). The cells must line up.`); return; }
        if (img.height % 16) { toast(`${file.name}: the height must be a multiple of 16.`); return; }
        if (img.height < cur.height) toast(`${file.name} is shorter than the current sheet (${img.height} < ${cur.height}); cells past its end will be empty.`);
        void lab.update((s) => { s.sheets[id] = { name: file.name, image: img }; }).then(() => toast(`${id}: sheet replaced by ${file.name}`));
      }, toast, "Replace sheet…"));
      const dl = h<HTMLButtonElement>("button.tl-btn", { type: "button", title: "Download the current sheet as a template" }, "Download current");
      dl.addEventListener("click", () => {
        if (!cur) return;
        const c = rgbaToCanvas(swap?.image ?? imageToRgba(cur));
        c.toBlob((b) => b && downloadBlob(b, `${id}-sheet.png`), "image/png");
      });
      actions.append(dl);
      if (swap) {
        const reset = h<HTMLButtonElement>("button.tl-btn.warn", { type: "button" }, "Reset");
        reset.addEventListener("click", () => void lab.update((s) => { delete s.sheets[id]; }));
        actions.append(h("span.tl-chip.static.on", `replaced: ${swap.name}`), reset);
      }
      row.append(actions);
      return row;
    }));
  }

  // ---- (c) the external sheet mapper ------------------------------------------------
  let slot: Slot = { kind: "base", frame: 1 };
  let blockNext = false;
  const mapping = () => lab.state.mapping;

  function setMapping(img: Rgba, data: SheetMapping) {
    void lab.update((s) => { s.mapping = { image: img, data }; });
  }
  function change(f: (m: SheetMapping) => SheetMapping) {
    const m = mapping();
    if (!m) return;
    try { setMapping(m.image, f(m.data)); } catch (e) { toast(e instanceof Error ? e.message : String(e)); }
  }

  function renderMapper() {
    const m = mapping();
    const load = h("div.tl-row");
    load.append(dropZone(mapper, (img, file) => {
      if (img.width < 16 || img.height < 16) { toast(`${file.name} is smaller than one 16px tile.`); return; }
      const w = img.width - (img.width % 16), hh = img.height - (img.height % 16);
      if (w !== img.width || hh !== img.height) toast(`${file.name} isn't a multiple of 16; using the top-left ${w}x${hh}.`);
      const trimmed = w === img.width && hh === img.height ? img : crop(img, 0, 0, w, hh);
      const keep = m && m.data.sheet.width === w && m.data.sheet.height === hh ? { ...m.data, sheet: { ...m.data.sheet, name: file.name } } : newMapping(file.name, w, hh);
      setMapping(trimmed, keep);
      toast(keep === m?.data ? "Sheet replaced; the mapping was kept." : `Loaded ${file.name}`);
    }, toast, m ? "Load another sheet…" : "Load a sheet…"));
    const loadJson = h<HTMLInputElement>("input", { type: "file", accept: "application/json,.json", hidden: true });
    loadJson.addEventListener("change", async () => {
      const f = loadJson.files?.[0];
      loadJson.value = "";
      if (!f) return;
      try {
        const res = parseMapping(JSON.parse(await f.text()));
        if (!res.mapping) { toast(`Mapping not loaded: ${res.errors.join("; ")}`); return; }
        const cur = mapping();
        if (!cur || cur.image.width !== res.mapping.sheet.width || cur.image.height !== res.mapping.sheet.height) {
          toast(`Load the sheet first: the mapping is for ${res.mapping.sheet.name} (${res.mapping.sheet.width}x${res.mapping.sheet.height}).`);
          return;
        }
        setMapping(cur.image, res.mapping);
        toast(`Mapping loaded (${Object.keys(res.mapping.tiles).length} tiles)${res.errors.length ? `; skipped: ${res.errors.join("; ")}` : ""}`);
      } catch (e) { toast(`Not a mapping JSON: ${e instanceof Error ? e.message : String(e)}`); }
    });
    const loadBtn = h<HTMLButtonElement>("button.tl-btn", { type: "button" }, "Load mapping JSON…");
    loadBtn.addEventListener("click", () => loadJson.click());
    load.append(loadBtn, loadJson);
    if (!m) { mapper.replaceChildren(load, h("p.tl-muted", "Drop a PNG here or load one. The mapping is saved with the lab and exported with the pack.")); return; }

    const saveBtn = h<HTMLButtonElement>("button.tl-btn", { type: "button" }, "Save mapping JSON");
    saveBtn.addEventListener("click", () => downloadBlob(new Blob([JSON.stringify(m.data, null, 2) + "\n"], { type: "application/json" }), `${m.data.sheet.name.replace(/\.png$/i, "")}.mapping.json`));
    const clearBtn = h<HTMLButtonElement>("button.tl-btn.warn", { type: "button" }, "Remove sheet and mapping");
    clearBtn.addEventListener("click", () => { if (confirm("Remove the external sheet and its mapping?")) void lab.update((s) => { s.mapping = null; }); });
    const fill = h<HTMLInputElement>("input", { type: "checkbox", checked: m.data.fill });
    fill.addEventListener("change", () => change((d) => ({ ...d, fill: fill.checked })));
    load.append(saveBtn, clearBtn);

    const key = lab.selected;
    const target = h("div.tl-target");
    if (!key) target.append(h("p.tl-muted", "Select a tile (Tiles tab, a map cell, or an unmapped tile below) to map it."));
    else {
      const auto = autotiled(key);
      const slots: Slot[] = [{ kind: "base", frame: 1 }, { kind: "base", frame: 2 }, { kind: "alt", n: 1 }, { kind: "alt", n: 2 }, { kind: "alt", n: 3 }];
      if (!auto && slot.kind === "mask") slot = { kind: "base", frame: 1 };
      const slotBtn = (s: Slot, content: HTMLElement | string) => {
        const cell = slotCell(m.data, key, s);
        const b = h<HTMLButtonElement>("button.tl-slot", { type: "button", "aria-pressed": String(sameSlot(s, slot)), title: `${slotName(s)}${cell !== undefined ? ` = cell ${cell} (right-click to clear)` : " (unmapped)"}` }, content);
        if (cell !== undefined) b.classList.add("set");
        b.addEventListener("click", () => { slot = s; blockNext = false; renderMapper(); });
        b.addEventListener("contextmenu", (e) => { e.preventDefault(); change((d) => unassign(d, key, s)); });
        return b;
      };
      const preview = (s: Slot) => {
        const cell = slotCell(m.data, key, s);
        return pixelCanvas(cell !== undefined ? cellOf(m.image, cell, m.data.sheet.columns) : null, 2, "tl-slotimg");
      };
      const row = h("div.tl-slots", ...slots.map((s) => slotBtn(s, h("span", preview(s), h("small", slotName(s))))));
      const maskFrame = slot.kind === "mask" ? slot.frame : 1;
      let grid: HTMLElement | null = null;
      if (auto) {
        grid = h("div.tl-maskgrid.tl-slotgrid");
        for (let mk = 0; mk < MASKS; mk++) grid.append(slotBtn({ kind: "mask", mask: mk, frame: maskFrame }, h("span", preview({ kind: "mask", mask: mk, frame: maskFrame }), h("small", String(mk)))));
      }
      const f2 = h<HTMLInputElement>("input", { type: "checkbox", checked: maskFrame === 2 });
      f2.addEventListener("change", () => { slot = { kind: "mask", mask: slot.kind === "mask" ? slot.mask : 0, frame: f2.checked ? 2 : 1 }; renderMapper(); });
      const block = h<HTMLButtonElement>("button.tl-btn.small", { type: "button", "aria-pressed": String(blockNext) }, "Next click: 4x4 block → masks 0–15");
      block.addEventListener("click", () => { blockNext = !blockNext; renderMapper(); });
      const unmapKey = h<HTMLButtonElement>("button.tl-btn.small.warn", { type: "button", hidden: !m.data.tiles[key] }, `Unmap ${key}`);
      unmapKey.addEventListener("click", () => change((d) => unassign(d, key)));
      const cur = lab.base.image(tilePath(key));
      target.append(...[
        h("div.tl-row", h("b", `Mapping ${key}`), pixelCanvas(cur, 2, "", 16, 16), h("span.tl-muted", "now · slot: "), h("b", slotName(slot)), unmapKey),
        row,
        auto ? h("div", h("div.tl-row", h("span.tl-muted", "Masks (N=1 E=2 S=4 W=8 neighbours alike):"), h("label.tl-check", f2, h("span", "frame 2")), block), grid,
          h("div.tl-maskgrid.tl-maskref", ...Array.from({ length: MASKS }, (_, mk) => pixelCanvas(lab.base.image(tileVariantPath(key, mk)) ?? lab.base.image(tilePath(key)), 2, "", 16, 16))),
          h("small.tl-muted", "Above: the current masks, for reference.")) : null,
      ].filter((x): x is HTMLElement => !!x));
    }

    const labels = () => {
      const map = new Map<number, string[]>();
      for (const [c, l] of cellUses(m.data)) map.set(c, l);
      return map;
    };
    const picker = sheetPicker(m.image, {
      zoom: 2,
      labels,
      chosen: () => {
        if (!key) return [];
        const c = slotCell(m.data, key, slot);
        return c === undefined ? [] : [c];
      },
      hint: key ? `Click a cell for ${key} ${slotName(slot)}.` : "Select a tile to map.",
      onPick(cell) {
        const k = lab.selected;
        if (!k) { toast("Select a tile first."); return; }
        if (blockNext) {
          blockNext = false;
          change((d) => assignMaskBlock(d, k, cell, slot.kind === "mask" ? slot.frame : 1));
          return;
        }
        change((d) => assign(d, k, slot, cell));
        // Walk through the masks in order.
        if (slot.kind === "mask" && slot.mask < MASKS - 1) slot = { ...slot, mask: slot.mask + 1 };
      },
    });

    const all = lab.keys.filter((k) => lab.usage.keys.get(k)?.maps.size);
    const unmapped = unmappedKeys(m.data, all) as TileKey[];
    const mappedN = all.length - unmapped.length;
    const chips = h("div.tl-chips.tl-unmapped", ...unmapped.map((k) => {
      const b = h<HTMLButtonElement>("button.tl-chip", { type: "button", title: `${lab.owner(k)}` }, pixelCanvas(lab.base.image(tilePath(k)), 1), ` ${k}`);
      b.addEventListener("click", () => lab.select(k));
      return b;
    }));
    mapper.replaceChildren(load,
      h("label.tl-check", fill, h("span", "A mapped tile's unmapped alts and masks show its new base (off: they keep the current art)")),
      target, picker.el,
      h("details.tl-unmapped-box", { open: unmapped.length > 0 && unmapped.length < 60 },
        h("summary", `${mappedN} of ${all.length} used tiles mapped · ${unmapped.length} still unmapped (they keep the current art)`), chips));
  }

  lab.on("art", () => { renderPacks(); renderTilesets(); renderMapper(); });
  lab.on("select", renderMapper);
  renderPacks();
  renderTilesets();
  renderMapper();
  return root;
}
