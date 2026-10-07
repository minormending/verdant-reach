// Art Lab views: one renderer per tab. Each draws into `el` from the registry
// and registers animations through `env.animate`.

import type { ArtImage, CharacterKey, SpeciesId } from "../../contracts";
import { AUTOTILE, STRUCTURES, tileAltPath, tilePath, tileVariantPath } from "../../contracts";
import type { StructureKey, TileKey } from "../../contracts";
import type { BundleView, Layer } from "../catalog";
import { LAB_LAYER } from "../catalog";
import { BUNDLE_JSON, refCells, type BundleKind } from "../format";
import { colorStats, isPalette } from "../palette";
import { logicalPath, SPECIES_FRAME_KINDS, speciesFrameSlot, type SpeciesFrameKind } from "../paths";
import type { ArtRegistry } from "../registry";
import { requiredPaths } from "../required";
import type { Problem } from "../validate";
import { clear, ctx2d, nn, downloadJson, downloadPng, dropTarget, h, pixelCanvas, toCanvas } from "./dom";
import type { LabEnv, LabTab } from "./lab";
import { animPlayer, compareView, speciesAnimSection } from "./anim";

type View = (env: LabEnv, el: HTMLElement) => void;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Draw a logical path at (x, y); returns false if it doesn't resolve / isn't loaded. */
function paint(reg: ArtRegistry, g: CanvasRenderingContext2D, path: string, x = 0, y = 0): boolean {
  const img = reg.image(path);
  if (!img) return false;
  g.drawImage(img, x, y);
  return true;
}

/** Make a canvas for a path (redrawn on load if not ready yet). */
function pathCanvas(env: LabEnv, path: string, w: number, h: number, zoom: number = env.state.zoom): HTMLCanvasElement {
  const c = pixelCanvas(w, h, zoom);
  const g = ctx2d(c);
  if (!paint(env.reg, g, path)) void env.reg.loadAll([path]).then(() => { g.clearRect(0, 0, w, h); paint(env.reg, g, path); });
  return c;
}

/** Draw a bundle's representative image scaled to fit (sidebar thumbnails). */
export function drawFit(reg: ArtRegistry, g: CanvasRenderingContext2D, v: BundleView, w: number, h: number) {
  let img: ArtImage | undefined;
  let sx = 0, sy = 0, sw = 0, sh = 0;
  switch (v.kind) {
    case "species": img = reg.image(`assets/species/${v.id}/icon.png`); break;
    case "tilesets": {
      const first = Object.keys((v.merged.tiles as object) ?? {})[0];
      if (first) img = reg.image(tilePath(first as TileKey));
      break;
    }
    case "structures": img = reg.image(`assets/structures/${v.id}.png`); break;
    case "characters": img = reg.image(`assets/characters/${v.id}.png`); sw = 16; sh = 16; break;
    case "sets": {
      const dir = String(v.merged.logicalDir ?? "");
      const first = Object.keys((v.merged.images as object) ?? {})[0];
      if (first) img = reg.image(`${dir}/${first}.png`);
      break;
    }
  }
  if (!img) return;
  sw ||= img.width; sh ||= img.height;
  const s = Math.max(1, Math.floor(Math.min(w / sw, h / sh))) > 1 ? Math.floor(Math.min(w / sw, h / sh)) : Math.min(1, w / sw, h / sh);
  const dw = Math.max(1, Math.round(sw * s)), dh = Math.max(1, Math.round(sh * s));
  g.imageSmoothingEnabled = false;
  g.drawImage(img, sx, sy, sw, sh, Math.floor((w - dw) / 2), Math.floor((h - dh) / 2), dw, dh);
}

function layerChip(l: Layer | undefined) {
  if (!l) return null;
  if (l.pack === LAB_LAYER) return h("span", { class: "al-chip lab" }, "edited in lab");
  if (l.pack) return h("span", { class: "al-chip pack" }, `pack ${l.pack}`);
  return h("span", { class: "al-chip" }, "base");
}

function sourceChip(src: unknown) {
  if (!isObj(src)) return null;
  const kind = String(src.kind ?? "?");
  const extra = typeof src.tool === "string" ? src.tool : typeof src.from === "string" ? src.from : "";
  return h("span", { class: "al-chip", title: extra }, `${kind}${extra ? `: ${extra.replace(/^tools\/art\//, "")}` : ""}`);
}

function header(env: LabEnv, v: BundleView, title: string, sub?: string | null) {
  const m = v.merged;
  return [
    h("h1", null, title, sub ? h("span", { style: "color: var(--dim); font-weight: 400; margin-left: 10px; font-size: 15px" }, sub) : null),
    h("div", { class: "al-meta" },
      h("code", null, `public/art/${v.kind}/${v.id}/`),
      v.layers.map((l) => layerChip(l)),
      sourceChip(m.source),
      env.reg.bundlePatch(v.kind, v.id) ? h("button", { class: "al-btn small warn", onclick: () => env.reg.patchBundle(v.kind, v.id, null) }, "Revert JSON edits") : null),
    typeof m.credits === "string" ? h("div", { class: "al-hint", style: "margin-top: 6px; max-width: 900px" }, m.credits) : null,
    typeof m.notes === "string" ? h("div", { class: "al-hint", style: "margin-top: 4px" }, `Notes: ${m.notes}`) : null,
  ];
}

/** The JSON a bundle folder should hold after the lab's edits (base layer + lab patch). */
function editedJson(v: BundleView): Record<string, unknown> {
  const real = v.layers.filter((l) => l.pack !== LAB_LAYER);
  const lab = v.layers.find((l) => l.pack === LAB_LAYER)?.json ?? {};
  const top = real[real.length - 1]?.json ?? {};
  const out: Record<string, unknown> = { ...top, ...lab };
  for (const deep of ["tiles", "images"]) if (isObj(top[deep]) && isObj(lab[deep])) out[deep] = { ...top[deep], ...lab[deep] };
  return out;
}

function jsonPanel(env: LabEnv, v: BundleView) {
  const file = BUNDLE_JSON[v.kind].file;
  const top = v.layers.filter((l) => l.pack !== LAB_LAYER).pop();
  return [
    h("h2", null, "JSON"),
    h("div", { class: "al-row", style: "margin-bottom: 8px" },
      h("button", { class: "al-btn small", onclick: () => downloadJson(editedJson(v), file) }, `↓ ${file}`),
      h("span", { class: "al-hint" }, top?.pack ? `Download = pack ${top.pack}'s ${file} with your edits.` : `Download = this bundle's ${file} with your edits.`)),
    h("pre", { class: "al-json mono" }, JSON.stringify(v.merged, null, 2)),
  ];
}

/** Replace a file in memory from a dropped image (with a size check). */
function swapFile(env: LabEnv, url: string, img: HTMLCanvasElement, want: [number, number] | null, what: string) {
  if (want && (img.width !== want[0] || img.height !== want[1])) {
    env.toast(`${what} must be ${want[0]}x${want[1]} (dropped ${img.width}x${img.height})`);
    return;
  }
  env.reg.overrideFile(url, img);
  env.toast(`Swapped ${what} in memory. Download it to keep it.`);
}

const fileName = (url: string) => url.slice(url.lastIndexOf("/") + 1);

// ---------------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------------

const FRAME_SIZE = (kind: SpeciesFrameKind): number => (kind.startsWith("front") ? 56 : kind === "back" ? 48 : 16);

const speciesView: View = (env, el) => {
  const { reg, state } = env;
  const v = state.id ? reg.bundle("species", state.id) : undefined;
  if (!v) { el.append(listIntro(env, "species")); return; }
  const id = v.id;
  const data = env.game.data.species[id as SpeciesId];
  const m = v.merged;
  const sp = (kind: SpeciesFrameKind, sport = state.sport) => logicalPath({ type: "species", id, kind, sport });
  const kinds = SPECIES_FRAME_KINDS.filter((k) => reg.resolve(sp(k, false)));
  const fronts = kinds.filter((k) => k.startsWith("front"));
  const z = state.zoom;
  el.append(...nn(header(env, v, id, data ? `${data.name} · ${data.types.join(" / ").toUpperCase()}` : null)));

  // Palettes
  el.append(h("h2", null, "Palette"));
  const palRow = (label: string, field: "palette" | "sport") => {
    const pal = m[field];
    const row = h("div", { class: "al-swatches" }, h("span", { class: "al-hint", style: "width: 56px" }, label));
    if (!isPalette(pal)) { row.append(h("span", { class: "al-chip bad" }, `no ${field}`)); return row; }
    pal.forEach((c, i) => {
      const input = h("input", { type: "color", value: c.toLowerCase(), title: `${field}[${i}] ${c} — click to edit (in memory)` });
      input.addEventListener("change", () => {
        const next = [...pal];
        next[i] = input.value;
        reg.patchBundle("species", id, { ...(reg.bundlePatch("species", id) ?? {}), [field]: next });
        env.toast(`${field}[${i}] → ${input.value} (in memory)`);
      });
      row.append(h("label", { class: "al-swatch" }, h("div", { class: "c", style: `background: ${c}` }), h("div", { class: "t" }, c.toLowerCase()), h("span", { class: "i" }, i), input));
    });
    return row;
  };
  el.append(h("div", { style: "display: grid; gap: 8px" }, palRow("palette", "palette"), palRow("sport", "sport")),
    h("div", { class: "al-hint", style: "margin-top: 6px" }, "Sport = exact swap palette[i] → sport[i]. Editing a colour recolours every frame live; download the JSON to keep it."));

  // Animated previews
  el.append(h("h2", null, "Preview"));
  const row = h("div", { class: "al-row" });
  for (const sport of [false, true]) {
    if (sport && !reg.resolve(sp("front", true))) continue;
    const idle = animPlayer(env, { reg, id, sport, zooms: [z], intro: false });
    const back = pathCanvas(env, sp("back", sport), 48, 48);
    const icon = pixelCanvas(16, 16, z);
    const gc = ctx2d(icon);
    const iconKinds = kinds.filter((k) => k.startsWith("icon"));
    let lastIcon = -1;
    env.animate((f) => {
      const ic = iconKinds.length > 1 ? Math.floor(f / 16) % 2 : 0;
      if (ic !== lastIcon) { lastIcon = ic; gc.clearRect(0, 0, 16, 16); paint(reg, gc, sp(iconKinds[ic] ?? "icon", sport)); }
    });
    const card = (c: HTMLElement, cap: string) => h("div", { class: "al-card" }, c instanceof HTMLCanvasElement ? h("div", { class: `al-stage ${env.bgClass()}` }, c) : c, h("div", { class: "cap" }, h("b", null, cap)));
    row.append(card(idle.el, `${sport ? "SPORT " : ""}idle · ${fronts.length} frame${fronts.length > 1 ? "s" : ""}`), card(back, `${sport ? "SPORT " : ""}back`), card(icon, `${sport ? "SPORT " : ""}icon`));
  }
  el.append(row, ...speciesAnimSection(env, id));

  // Frames (drop targets)
  el.append(h("h2", null, `Frames${state.sport ? " (sport)" : ""}`),
    h("div", { class: "al-hint", style: "margin-bottom: 8px" }, "Drop a PNG on a frame to swap it live (in memory). Empty slots accept a new optional frame."));
  const frames = h("div", { class: "al-row" });
  const lists = isObj(m.frames) ? m.frames : {};
  for (const kind of SPECIES_FRAME_KINDS) {
    const size = FRAME_SIZE(kind);
    const res = reg.resolve(sp(kind, false));
    const slot = kind.startsWith("front") ? "front" : kind.startsWith("icon") ? "icon" : "back";
    if (!res) {
      if (kind === "back") continue;
      const list = Array.isArray(lists[slot]) ? (lists[slot] as string[]) : [];
      const want = speciesFrameSlot(kind).index;
      if (list.length !== want) continue; // only the next free slot
      const ph = pixelCanvas(size, size, z);
      const card = h("div", { class: "al-card", title: `Add ${kind}.png` }, h("div", { class: `al-stage bg-checker`, style: "opacity: .5" }, ph),
        h("div", { class: "cap" }, h("b", null, kind), h("span", { class: "al-chip" }, "empty — drop to add")));
      dropTarget(card, (img) => {
        if (img.width !== size || img.height !== size) { env.toast(`${kind} must be ${size}x${size}`); return; }
        const name = `${kind}.png`;
        const nextFrames = { ...(lists as object), [slot]: [...list, name] };
        reg.patchBundle("species", id, { ...(reg.bundlePatch("species", id) ?? {}), frames: nextFrames });
        const url = reg.catalog.findFile(reg.bundle("species", id)!, name).url;
        reg.overrideFile(url, img);
        env.toast(`Added ${kind} (in memory). Download ${name} and the JSON to keep it.`);
      }, env.toast);
      frames.append(card);
      continue;
    }
    const c = pathCanvas(env, sp(kind), size, size);
    const px = reg.pixels(res.url);
    let check: HTMLElement | null = null;
    if (px) {
      const layerIdx = v.layers.findIndex((l) => l.pack === res.layer);
      const pal = reg.catalog.paletteAt(v, Math.max(0, layerIdx));
      const { colors, partialAlpha } = colorStats(px.data);
      const allowed = new Set((pal ?? []).map((x) => x.toLowerCase()));
      const stray = [...colors].filter((x) => !allowed.has(x));
      check = stray.length || partialAlpha
        ? h("span", { class: "al-chip bad", title: stray.join(" ") }, `${stray.length} stray colour${stray.length === 1 ? "" : "s"}${partialAlpha ? ", partial alpha" : ""}`)
        : h("span", { class: "al-chip ok" }, "4-colour ✓");
      if (px.width !== size || px.height !== size) check = h("span", { class: "al-chip bad" }, `${px.width}x${px.height}`);
    }
    const overridden = reg.overrides().files.includes(res.url);
    const card = h("div", { class: "al-card" },
      h("div", { class: `al-stage ${env.bgClass()}` }, c),
      h("div", { class: "cap" }, h("b", null, kind), h("code", null, fileName(res.url)), layerChip(v.layers.find((l) => l.pack === res.layer)),
        overridden ? h("span", { class: "al-chip lab" }, "swapped") : null, check),
      h("div", { class: "cap" },
        h("button", {
          class: "al-btn small", title: "The frame as the game draws it (with any palette edit applied)",
          onclick: () => { const img = reg.image(sp(kind, false)) ?? reg.fileNow(res.url); if (img) downloadPng(img, fileName(res.url)); },
        }, "↓ PNG"),
        overridden ? h("button", { class: "al-btn small", onclick: () => reg.overrideFile(res.url, null) }, "Revert") : null));
    dropTarget(card, (img) => swapFile(env, res.url, img, [size, size], `${id} ${kind}`), env.toast);
    frames.append(card);
  }
  el.append(frames, ...jsonPanel(env, v));
};

// ---------------------------------------------------------------------------
// Tilesets
// ---------------------------------------------------------------------------

interface CellUse { key: string; what: string }

const SANDBOX = [
  "..........",
  "..XXXX....",
  ".XXXXXX.X.",
  ".XX..XXXX.",
  ".XXXXXX.X.",
  "...XX...X.",
  "..........",
];

const tilesetView: View = (env, el) => {
  const { reg, state } = env;
  const v = state.id ? reg.bundle("tilesets", state.id) : undefined;
  if (!v) { el.append(listIntro(env, "tilesets")); return; }
  const m = v.merged;
  const tiles = isObj(m.tiles) ? (m.tiles as Record<string, Record<string, unknown>>) : {};
  const keys = Object.keys(tiles).sort();
  const z = state.zoom;
  el.append(...nn(header(env, v, typeof m.name === "string" ? m.name : v.id, `${keys.length} tiles · ${String(m.columns)} columns`)));

  // Which sheet(s) the tiles read from, and which tile uses each cell.
  const sheets = new Map<string, { url: string; columns: number; uses: Map<number, CellUse[]> }>();
  for (const key of keys) {
    const sh = reg.catalog.tileSheet(v, key);
    if (!sh) continue;
    let s = sheets.get(sh.url);
    if (!s) sheets.set(sh.url, (s = { url: sh.url, columns: sh.columns, uses: new Map() }));
    const use = (r: unknown, what: string) => {
      if (r === undefined) return;
      refCells(r as number | number[]).forEach((cell, i) => {
        const list = s!.uses.get(cell) ?? [];
        list.push({ key, what: `${what}${i ? " frame 2" : ""}` });
        s!.uses.set(cell, list);
      });
    };
    const t = tiles[key];
    use(t.base, key);
    if (Array.isArray(t.alts)) t.alts.forEach((a, i) => use(a, `${key}~${i + 1}`));
    if (isObj(t.masks)) for (const [mk, r] of Object.entries(t.masks)) use(r, `${key}@${mk}`);
  }
  const sel = state.sub && tiles[state.sub] ? state.sub : keys[0];

  // Sheet(s)
  for (const s of sheets.values()) {
    el.append(h("h2", null, `Sheet · ${s.url.replace(/^art\//, "")}`));
    const img = reg.fileNow(s.url);
    if (!img) { void reg.loadFile(s.url).then(() => env.set({})); el.append(h("div", { class: "al-hint" }, "Loading…")); continue; }
    const W = img.width, H = img.height;
    const c = document.createElement("canvas");
    c.width = W * z; c.height = H * z;
    c.className = "px";
    const g = ctx2d(c);
    g.drawImage(img, 0, 0, W, H, 0, 0, W * z, H * z);
    g.fillStyle = "rgba(255,255,255,0.10)";
    for (let x = 0; x <= W; x += 16) g.fillRect(x * z, 0, 1, H * z);
    for (let y = 0; y <= H; y += 16) g.fillRect(0, y * z, W * z, 1);
    const wrap = h("div", { class: "al-sheetwrap" }, h("div", { class: env.bgClass(), style: "display: inline-block" }, c));
    const hover = h("div", { class: "hover", style: `width: ${16 * z}px; height: ${16 * z}px; display: none` });
    wrap.append(hover);
    // Outline the selected tile's cells.
    const selCells = [...s.uses.entries()].filter(([, us]) => us.some((u) => u.key === sel)).map(([cell]) => cell);
    for (const cell of selCells) {
      wrap.append(h("div", { class: "sel", style: `left: ${(cell % s.columns) * 16 * z}px; top: ${Math.floor(cell / s.columns) * 16 * z}px; width: ${16 * z}px; height: ${16 * z}px` }));
    }
    const tip = h("div", { class: "al-tip" }, "Hover a cell to see which tile uses it; click to select that tile. Drop a 16x16 PNG on a cell, or a full-size sheet anywhere.");
    const cellAt = (e: MouseEvent) => {
      const r = c.getBoundingClientRect();
      const cx = Math.floor((e.clientX - r.left) / (16 * z)), cy = Math.floor((e.clientY - r.top) / (16 * z));
      if (cx < 0 || cy < 0 || cx >= W / 16 || cy >= H / 16) return null;
      return { cx, cy, cell: cy * s.columns + cx };
    };
    c.addEventListener("mousemove", (e) => {
      const at = cellAt(e);
      if (!at) { hover.style.display = "none"; return; }
      hover.style.display = "block";
      hover.style.left = `${at.cx * 16 * z}px`;
      hover.style.top = `${at.cy * 16 * z}px`;
      const us = s.uses.get(at.cell);
      tip.textContent = `cell ${at.cell} (col ${at.cx}, row ${at.cy})` + (us ? ` · ${us.map((u) => u.what).join(", ")}` : " · unused");
    });
    c.addEventListener("mouseleave", () => { hover.style.display = "none"; });
    c.addEventListener("click", (e) => {
      const at = cellAt(e);
      const us = at && s.uses.get(at.cell);
      if (us?.length) env.go("tilesets", v.id, us[0].key);
    });
    let dropAt: { cx: number; cy: number } | null = null;
    c.addEventListener("dragover", (e) => { dropAt = cellAt(e); });
    dropTarget(wrap, (dropped) => {
      const base = reg.fileNow(s.url);
      if (!base) return;
      if (dropped.width === base.width && dropped.height === base.height) {
        swapFile(env, s.url, dropped, null, `sheet ${fileName(s.url)}`);
        return;
      }
      if (!dropAt || dropped.width % 16 || dropped.height % 16) { env.toast("Drop a 16x16 (or 16-multiple) PNG onto a cell, or a full-size sheet."); return; }
      const next = toCanvas(base);
      const ng = ctx2d(next);
      ng.clearRect(dropAt.cx * 16, dropAt.cy * 16, dropped.width, dropped.height);
      ng.drawImage(dropped, dropAt.cx * 16, dropAt.cy * 16);
      reg.overrideFile(s.url, next);
      env.toast(`Pasted into cell ${dropAt.cy * s.columns + dropAt.cx} (in memory). Download the sheet to keep it.`);
    }, env.toast);
    const overridden = reg.overrides().files.includes(s.url);
    el.append(wrap, tip, h("div", { class: "al-row", style: "margin-top: 6px" },
      h("button", { class: "al-btn small", onclick: () => downloadPng(reg.fileNow(s.url)!, fileName(s.url)) }, `↓ ${fileName(s.url)}`),
      overridden ? h("button", { class: "al-btn small", onclick: () => reg.overrideFile(s.url, null) }, "Revert sheet") : null,
      h("span", { class: "al-hint" }, `${W}x${H} · ${(W / 16) * (H / 16)} cells`)));
  }

  // Selected tile
  if (sel) el.append(...nn(tileDetail(env, v, sel, tiles[sel])));

  // Tile table
  el.append(h("h2", null, "Tiles"));
  const table = h("table", { class: "al-table" }, h("tr", null, ["", "key", "base", "alts", "masks", "group"].map((t) => h("th", null, t))));
  for (const key of keys) {
    const t = tiles[key];
    const thumb = pathCanvas(env, tilePath(key as TileKey), 16, 16, 2);
    const masks = isObj(t.masks) ? Object.keys(t.masks).length : 0;
    table.append(h("tr", { class: `click${key === sel ? " on" : ""}`, onclick: () => env.go("tilesets", v.id, key) },
      h("td", null, thumb), h("td", null, h("code", null, key)), h("td", null, h("code", null, JSON.stringify(t.base))),
      h("td", null, Array.isArray(t.alts) ? h("code", null, JSON.stringify(t.alts)) : ""),
      h("td", null, masks ? `${masks}/16` : ""), h("td", null, AUTOTILE[key as TileKey] ?? "")));
  }
  el.append(table, ...jsonPanel(env, v));
};

function tileDetail(env: LabEnv, v: BundleView, key: string, t: Record<string, unknown>) {
  const { reg, state } = env;
  const z = state.zoom * 2;
  const k = key as TileKey;
  const out: (HTMLElement | null)[] = [h("h2", null, `Tile · ${key}`)];
  const animated = !!reg.resolve(tilePath(k, 2));
  const frameOf = (p1: string, p2: string | null) => (f: number) => (p2 && Math.floor(f / 32) % 2 ? p2 : p1);
  const tileCanvas = (p1: string, p2: string | null, zoom = z) => {
    const c = pixelCanvas(16, 16, zoom);
    const g = ctx2d(c);
    let last = "";
    const pick = frameOf(p1, p2);
    env.animate((f) => {
      const p = pick(f);
      if (p === last) return;
      last = p;
      g.clearRect(0, 0, 16, 16);
      paint(reg, g, p);
    });
    return c;
  };
  const info = h("div", { class: "al-meta" },
    h("span", null, "base ", h("b", null, JSON.stringify(t.base))),
    animated ? h("span", { class: "al-chip ok" }, "animated (2 frames)") : h("span", { class: "al-chip" }, "static"),
    AUTOTILE[k] ? h("span", { class: "al-chip" }, `autotile group: ${AUTOTILE[k]}`) : h("span", { class: "al-chip" }, "no autotile group"));
  out.push(info);

  const row = h("div", { class: "al-row", style: "margin-top: 10px" });
  row.append(h("div", { class: "al-card" }, h("div", { class: `al-stage ${env.bgClass()}` }, tileCanvas(tilePath(k), animated ? tilePath(k, 2) : null)), h("div", { class: "cap" }, h("b", null, "base"))));
  const alts = Array.isArray(t.alts) ? t.alts.length : 0;
  for (let i = 1; i <= alts; i++) {
    const p = tileAltPath(k, i as 1 | 2 | 3);
    row.append(h("div", { class: "al-card" }, h("div", { class: `al-stage ${env.bgClass()}` }, tileCanvas(p, null)), h("div", { class: "cap" }, h("b", null, `alt ~${i}`))));
  }
  // Ground-variation field: 6x4 of base + alts, as the engine scatters them.
  if (alts) {
    const field = pixelCanvas(96, 64, state.zoom);
    const g = ctx2d(field);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) {
      const r = (((x * 374761393) ^ (y * 668265263)) >>> 0) % (alts + 2);
      paint(reg, g, r < 2 ? tilePath(k) : tileAltPath(k, (r - 1) as 1 | 2 | 3), x * 16, y * 16);
    }
    row.append(h("div", { class: "al-card" }, h("div", { class: `al-stage ${env.bgClass()}` }, field), h("div", { class: "cap" }, h("b", null, "field"), "base + alts")));
  }
  out.push(row);

  // 4x4 autotile masks
  const masks = isObj(t.masks) ? t.masks : {};
  if (Object.keys(masks).length || AUTOTILE[k]) {
    out.push(h("h2", null, `Autotile masks · ${Object.keys(masks).length}/16`),
      h("div", { class: "al-hint", style: "margin-bottom: 8px" }, "Bit N=1 E=2 S=4 W=8 is set when that neighbour is in the same group. Faded = no mask art (the engine draws the base tile)."));
    const grid = h("div", { class: "al-masks" });
    for (let mask = 0; mask < 16; mask++) {
      const has = !!reg.resolve(tileVariantPath(k, mask));
      const p1 = has ? tileVariantPath(k, mask) : tilePath(k);
      const p2 = animated ? (has ? (reg.resolve(tileVariantPath(k, mask, 2)) ? tileVariantPath(k, mask, 2) : p1) : tilePath(k, 2)) : null;
      const bits = (["N", "E", "S", "W"] as const).map((b, i) => h("i", { class: mask & (1 << i) ? "on" : "" }, b));
      grid.append(h("div", { class: `al-mask${has ? "" : " fallback"}`, title: has ? `${key}@${mask}: cell ${JSON.stringify(masks[String(mask)])}` : `${key}@${mask}: missing, falls back to base` },
        h("div", { class: env.bgClass() }, tileCanvas(p1, p2)), h("div", { class: "lbl" }, `${mask} `, bits)));
    }
    // In context: a little island of this tile on grass.
    const around = (key === "grass" ? "path" : "grass") as TileKey;
    const sw = SANDBOX[0].length, shh = SANDBOX.length;
    const sand = pixelCanvas(sw * 16, shh * 16, state.zoom);
    const sg = ctx2d(sand);
    const isX = (x: number, y: number) => SANDBOX[y]?.[x] === "X";
    let lastF = -1;
    env.animate((f) => {
      const fr = animated ? Math.floor(f / 32) % 2 : 0;
      if (fr === lastF) return;
      lastF = fr;
      sg.clearRect(0, 0, sand.width, sand.height);
      for (let y = 0; y < shh; y++) for (let x = 0; x < sw; x++) {
        paint(reg, sg, tilePath(around), x * 16, y * 16);
        if (!isX(x, y)) continue;
        const mask = (isX(x, y - 1) ? 1 : 0) | (isX(x + 1, y) ? 2 : 0) | (isX(x, y + 1) ? 4 : 0) | (isX(x - 1, y) ? 8 : 0);
        const vp = tileVariantPath(k, mask, fr ? 2 : 1);
        const p = reg.resolve(vp) ? vp : reg.resolve(tileVariantPath(k, mask)) ? tileVariantPath(k, mask) : tilePath(k, fr && animated ? 2 : 1);
        paint(reg, sg, p, x * 16, y * 16);
      }
    });
    out.push(h("div", { class: "al-row" }, grid, h("div", { class: "al-card" }, h("div", null, sand), h("div", { class: "cap" }, h("b", null, "in context"), `on ${around}`))));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Structures, characters, sets
// ---------------------------------------------------------------------------

const structureView: View = (env, el) => {
  const { reg, state } = env;
  const v = state.id ? reg.bundle("structures", state.id) : undefined;
  if (!v) { el.append(listIntro(env, "structures")); return; }
  const spec = STRUCTURES[v.id as StructureKey];
  const path = `assets/structures/${v.id}.png`;
  const res = reg.resolve(path);
  el.append(...nn(header(env, v, v.id, spec ? `${spec.w}×${spec.h} tiles${spec.door ? ` · door at ${spec.door.x},${spec.door.y}` : " · scenery"}` : "not a StructureKey")));
  el.append(h("h2", null, "Image"));
  const img = reg.image(path);
  if (!img || !res) { el.append(h("div", { class: "al-empty" }, "Image missing.")); return; }
  const z = state.zoom * 2;
  const c = document.createElement("canvas");
  c.width = img.width * z; c.height = img.height * z; c.className = "px";
  const g = ctx2d(c);
  g.drawImage(img, 0, 0, img.width, img.height, 0, 0, c.width, c.height);
  g.fillStyle = "rgba(255,255,255,0.18)";
  for (let x = 0; x <= img.width; x += 16) g.fillRect(x * z, 0, 1, c.height);
  for (let y = 0; y <= img.height; y += 16) g.fillRect(0, y * z, c.width, 1);
  if (spec?.door) {
    g.strokeStyle = "#f8b800";
    g.lineWidth = 2;
    g.strokeRect(spec.door.x * 16 * z + 1, spec.door.y * 16 * z + 1, 16 * z - 2, 16 * z - 2);
  }
  const want: [number, number] | null = spec ? [spec.w * 16, spec.h * 16] : null;
  const card = h("div", { class: "al-card", style: "display: inline-block" }, h("div", { class: `al-stage ${env.bgClass()}` }, c),
    h("div", { class: "cap" }, h("b", null, `${img.width}x${img.height}`), h("code", null, fileName(res.url)), layerChip(v.layers.find((l) => l.pack === res.layer)),
      want && (img.width !== want[0] || img.height !== want[1]) ? h("span", { class: "al-chip bad" }, `want ${want.join("x")}`) : h("span", { class: "al-chip ok" }, "size ✓"),
      h("span", { class: "al-hint" }, "grid = 16px tiles, gold = door")),
    h("div", { class: "cap" },
      h("button", { class: "al-btn small", onclick: () => downloadPng(reg.fileNow(res.url)!, fileName(res.url)) }, "↓ PNG"),
      reg.overrides().files.includes(res.url) ? h("button", { class: "al-btn small", onclick: () => reg.overrideFile(res.url, null) }, "Revert") : null));
  dropTarget(card, (d) => swapFile(env, res.url, d, want, `structure ${v.id}`), env.toast);
  el.append(card);
  // Day/night look: the engine finds lit windows automatically; show it at 1x on a scene-ish backdrop.
  el.append(h("h2", null, "At game scale"), h("div", { class: "al-row" },
    h("div", { class: "al-card" }, h("div", { class: "al-stage bg-light", style: "padding: 8px" }, pathCanvas(env, path, img.width, img.height, 1)), h("div", { class: "cap" }, "1x")),
    h("div", { class: "al-card" }, h("div", { class: "al-stage bg-light", style: "padding: 8px" }, pathCanvas(env, path, img.width, img.height, 2)), h("div", { class: "cap" }, "2x"))));
  el.append(...jsonPanel(env, v));
};

const characterView: View = (env, el) => {
  const { reg, state } = env;
  const v = state.id ? reg.bundle("characters", state.id) : undefined;
  if (!v) { el.append(listIntro(env, "characters")); return; }
  const path = `assets/characters/${v.id}.png`;
  const res = reg.resolve(path);
  const img = reg.image(path);
  el.append(...nn(header(env, v, v.id, "overworld sheet · 4 rows × 3 frames")));
  if (!img || !res) { el.append(h("div", { class: "al-empty" }, "Sheet missing.")); return; }
  const z = state.zoom * 2;
  const [fw, fh] = reg.characterFrame(v.id as CharacterKey);
  const sheetW = fw * 3, sheetH = fh * 4;
  el.append(h("h2", null, "Walk cycle"));
  const rows = ["down", "up", "left", "right"];
  const walk = h("div", { class: "al-row" });
  rows.forEach((r, ri) => {
    const c = pixelCanvas(fw, fh, z);
    const g = ctx2d(c);
    let last = -1;
    env.animate((f) => {
      const col = [0, 1, 0, 2][Math.floor(f / 10) % 4];
      if (col === last) return;
      last = col;
      g.clearRect(0, 0, fw, fh);
      const im = reg.image(path);
      if (im) g.drawImage(im, col * fw, ri * fh, fw, fh, 0, 0, fw, fh);
    });
    walk.append(h("div", { class: "al-card" }, h("div", { class: `al-stage ${env.bgClass()}` }, c), h("div", { class: "cap" }, h("b", null, r))));
  });
  el.append(walk, h("h2", null, "Sheet"));
  const c = document.createElement("canvas");
  c.width = sheetW * z; c.height = sheetH * z; c.className = "px";
  const g = ctx2d(c);
  g.drawImage(img, 0, 0, img.width, img.height, 0, 0, img.width * z, img.height * z);
  g.fillStyle = "rgba(255,255,255,0.15)";
  for (let x = 0; x <= sheetW; x += fw) g.fillRect(x * z, 0, 1, c.height);
  for (let y = 0; y <= sheetH; y += fh) g.fillRect(0, y * z, c.width, 1);
  const labels = h("div", { style: `display: grid; grid-template-rows: repeat(4, ${fh * z}px); align-items: center; color: var(--dim); font-size: 11px; margin-right: 6px` }, rows.map((r) => h("div", null, r)));
  const card = h("div", { class: "al-card", style: "display: inline-block" },
    h("div", { style: "display: flex" }, labels, h("div", null,
      h("div", { style: `display: grid; grid-template-columns: repeat(3, ${fw * z}px); color: var(--dim); font-size: 11px; text-align: center` }, ["stand", "stepA", "stepB"].map((x) => h("div", null, x))),
      h("div", { class: `al-stage ${env.bgClass()}` }, c))),
    h("div", { class: "cap" }, h("b", null, `${img.width}x${img.height}`), h("code", null, fileName(res.url)), layerChip(v.layers.find((l) => l.pack === res.layer)),
      img.width === sheetW && img.height === sheetH ? h("span", { class: "al-chip ok" }, "size ✓") : h("span", { class: "al-chip bad" }, `want ${sheetW}x${sheetH}`)),
    h("div", { class: "cap" },
      h("button", { class: "al-btn small", onclick: () => downloadPng(reg.fileNow(res.url)!, fileName(res.url)) }, "↓ PNG"),
      reg.overrides().files.includes(res.url) ? h("button", { class: "al-btn small", onclick: () => reg.overrideFile(res.url, null) }, "Revert") : null));
  dropTarget(card, (d) => swapFile(env, res.url, d, [sheetW, sheetH], `character ${v.id}`), env.toast);
  el.append(card, ...jsonPanel(env, v));
};

const setView: View = (env, el) => {
  const { reg, state } = env;
  const v = state.id ? reg.bundle("sets", state.id) : undefined;
  if (!v) { el.append(listIntro(env, "sets")); return; }
  const m = v.merged;
  const dir = String(m.logicalDir ?? "");
  const images = isObj(m.images) ? (m.images as Record<string, Record<string, unknown>>) : {};
  el.append(...nn(header(env, v, v.id, `${Object.keys(images).length} images · ${dir}`)));
  const z = state.zoom;
  // Required entries this set's directory still lacks (any set may add them).
  const lacking = requiredPaths().filter((r) => r.path.startsWith(`${dir}/`) && !reg.resolve(r.path));
  if (lacking.length) {
    el.append(h("h2", null, `Missing required · ${lacking.length}`),
      h("div", { class: "al-hint", style: "margin-bottom: 8px" }, "Drop a PNG on a slot to add it to this set (in memory), then download the PNG and set.json."));
    const row = h("div", { class: "al-row" });
    for (const r of lacking) {
      const key = r.path.slice(dir.length + 1, -4);
      const [w, hh] = r.size ?? [32, 32];
      const card = h("div", { class: "al-card" }, h("div", { class: "al-stage bg-checker", style: `width: ${Math.min(w, 160) * z}px; height: ${Math.min(hh, 144) * z}px; max-width: 480px` }),
        h("div", { class: "cap" }, h("b", null, key), r.size ? `${w}x${hh}` : "any size"));
      dropTarget(card, (img) => {
        if (r.size && (img.width !== w || img.height !== hh)) { env.toast(`${key} must be ${w}x${hh}`); return; }
        reg.patchBundle("sets", v.id, { ...(reg.bundlePatch("sets", v.id) ?? {}), images: { ...(isObj(reg.bundlePatch("sets", v.id)?.images) ? reg.bundlePatch("sets", v.id)!.images as object : {}), [key]: { file: `${key}.png`, size: [img.width, img.height], source: { kind: "edited" } } } });
        const url = reg.catalog.findFile(reg.bundle("sets", v.id)!, `${key}.png`).url;
        reg.overrideFile(url, img);
        env.toast(`Added ${key} (in memory).`);
      }, env.toast);
      row.append(card);
    }
    el.append(row);
  }
  el.append(h("h2", null, "Images"));
  const row = h("div", { class: "al-row" });
  for (const key of Object.keys(images).sort()) {
    const e = images[key];
    const path = `${dir}/${key}.png`;
    const res = reg.resolve(path);
    const img = reg.image(path);
    const size = Array.isArray(e.size) ? (e.size as [number, number]) : null;
    const c = img ? pathCanvas(env, path, img.width, img.height, img.width > 100 ? Math.min(z, 2) : z) : pixelCanvas(16, 16, z);
    const bad = img && size && (img.width !== size[0] || img.height !== size[1]);
    const card = h("div", { class: "al-card" }, h("div", { class: `al-stage ${env.bgClass()}` }, c),
      h("div", { class: "cap" }, h("b", null, key), img ? `${img.width}x${img.height}` : h("span", { class: "al-chip bad" }, "missing"),
        bad ? h("span", { class: "al-chip bad" }, `json says ${size!.join("x")}`) : null, res ? layerChip(v.layers.find((l) => l.pack === res.layer)) : null,
        res && reg.overrides().files.includes(res.url) ? h("span", { class: "al-chip lab" }, "swapped") : null),
      res ? h("div", { class: "cap" },
        h("button", { class: "al-btn small", onclick: () => { const f = reg.fileNow(res.url); if (f) downloadPng(f, fileName(res.url)); } }, "↓ PNG"),
        reg.overrides().files.includes(res.url) ? h("button", { class: "al-btn small", onclick: () => reg.overrideFile(res.url, null) }, "Revert") : null) : null);
    if (res) dropTarget(card, (d) => swapFile(env, res.url, d, size, `${key}`), env.toast);
    row.append(card);
  }
  el.append(row, ...jsonPanel(env, v));
};

// ---------------------------------------------------------------------------
// Packs and checks
// ---------------------------------------------------------------------------

const packsView: View = (env, el) => {
  const { reg, state } = env;
  const packs = reg.packs();
  const p = packs.find((x) => x.id === state.id);
  const active = reg.activePacks();
  if (!p) {
    el.append(h("h1", null, "Art packs"),
      h("p", { class: "al-hint", style: "max-width: 720px" },
        "A pack mirrors public/art/ under packs/<id>/ and overrides any bundle with the same id: JSON merges over the base, files resolve in the pack first. ",
        "Toggle packs in the top bar (saved to localStorage[\"verdant.artPacks\"] for the game), or play with ?art=a,b. Later packs win."));
    if (!packs.length) el.append(h("div", { class: "al-empty" }, "No packs yet."));
    for (const x of packs) el.append(h("div", { class: "al-card", style: "margin-bottom: 8px; cursor: pointer", onclick: () => env.go("packs", x.id) },
      h("b", null, x.name), " ", h("code", null, x.id), active.includes(x.id) ? h("span", { class: "al-chip pack", style: "margin-left: 8px" }, "active") : null,
      h("div", { class: "al-hint" }, x.description)));
    return;
  }
  const tree = reg.index.packs[p.id];
  const on = active.includes(p.id);
  el.append(h("h1", null, p.name), h("div", { class: "al-meta" }, h("code", null, `public/art/packs/${p.id}/`), p.author ? `by ${p.author}` : null,
    h("button", { class: `al-btn small pack${on ? " on" : ""}`, onclick: () => reg.setActivePacks(on ? active.filter((x) => x !== p.id) : [...active, p.id], true) }, on ? "Active — click to disable" : "Enable")),
  h("p", null, p.description));
  for (const kind of ["species", "tilesets", "structures", "characters", "sets"] as BundleKind[]) {
    const ids = Object.keys(tree?.[kind] ?? {});
    if (!ids.length) continue;
    el.append(h("h2", null, `${kind} · ${ids.length}`));
    const row = h("div", { class: "al-row" });
    for (const id of ids) {
      const files = tree[kind][id];
      const base = reg.index[kind][id];
      const thumb = pixelCanvas(32, 32, 1);
      const view = reg.bundle(kind, id);
      if (view) drawFit(reg, ctx2d(thumb), view, 32, 32);
      row.append(h("div", { class: "al-card", style: "cursor: pointer; min-width: 180px", onclick: () => env.go(kind, id) },
        h("div", { style: "display: flex; gap: 8px; align-items: center" }, thumb, h("div", null, h("b", null, id),
          h("div", { class: "al-hint" }, base ? (files.length ? `${files.length} file(s) + JSON` : "JSON only (recolour)") : "new bundle")))));
    }
    el.append(row);
  }
  if (!on) el.append(h("p", { class: "al-hint" }, "Enable the pack to see its art in the other tabs."));
};

const checksView: View = (env, el) => {
  const { reg } = env;
  el.append(h("h1", null, "Checks"), h("p", { class: "al-hint", style: "max-width: 760px" },
    "The docs/ART.md §9 checks, run on the bundles as served, including your in-memory edits to JSON. ",
    "Swapped PNGs are checked too. The index-vs-folder check runs in npm test."));
  const out = h("div", null, h("div", { class: "al-empty" }, "Running…"));
  const run = h("button", { class: "al-btn", onclick: () => go() }, "Run again");
  el.append(h("div", { class: "al-row", style: "margin-bottom: 14px" }, run), out);
  const go = async () => {
    clear(out);
    out.append(h("div", { class: "al-empty" }, "Running…"));
    const t0 = performance.now();
    const r = await reg.validate();
    const errors = r.problems.filter((p) => !p.message.startsWith("info:"));
    clear(out);
    const stat = (n: number | string, label: string, cls = "") => h("div", { class: "al-card", style: "min-width: 140px" }, h("div", { class: `al-stat ${cls}`, style: cls === "bad" ? "color: var(--bad)" : cls === "ok" ? "color: var(--ok)" : "" }, n), h("div", { class: "al-hint" }, label));
    out.append(h("div", { class: "al-row" },
      stat(errors.length, "problems", errors.length ? "bad" : "ok"),
      stat(r.missing.length, "required paths missing", r.missing.length ? "bad" : "ok"),
      stat(r.legacyOnly.length, "legacy-only paths"),
      stat(r.counts.bundles, "bundle JSONs"),
      stat(r.counts.images, "images checked"),
      stat(`${Math.round(performance.now() - t0)}ms`, "time")));
    if (!errors.length) { out.append(h("p", { style: "color: var(--ok)" }, "All checks pass.")); return; }
    const groups = new Map<string, Problem[]>();
    for (const p of errors) {
      const g = p.where.startsWith("assets/") ? "Missing or wrong-size required art" : p.where.startsWith("packs/") ? "Packs" : p.where.startsWith("tile ") ? "Tile ownership" : "Bundles";
      groups.set(g, [...(groups.get(g) ?? []), p]);
    }
    for (const [g, ps] of groups) {
      out.append(h("h2", null, `${g} · ${ps.length}`));
      const ul = h("ul", { class: "al-problems" });
      for (const p of ps) {
        const m = /^(?:packs\/[^/]+\/)?(species|tilesets|structures|characters|sets)\/([a-z0-9_]+)/.exec(p.where);
        const tileKey = /tile ([a-z0-9_]+)/.exec(p.where)?.[1];
        ul.append(h("li", null, h("span", { class: "w", onclick: m ? () => env.go(m[1] as LabTab, m[2], tileKey ?? null) : undefined }, p.where), h("span", null, p.message)));
      }
      out.append(ul);
    }
  };
  void go();
};

function listIntro(env: LabEnv, kind: BundleKind): HTMLElement {
  const n = env.reg.bundles(kind).length;
  const first = env.reg.bundles(kind)[0];
  if (first) queueMicrotask(() => env.go(kind, first.id));
  return h("div", { class: "al-empty" }, n ? "Pick a bundle." : `No ${kind} bundles yet.`);
}

export const VIEWS: Record<LabTab, View> = {
  species: speciesView,
  tilesets: tilesetView,
  structures: structureView,
  characters: characterView,
  sets: setView,
  packs: packsView,
  checks: checksView,
  compare: compareView,
};
