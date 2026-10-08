// Bundle validation (docs/ART.md §9). Pure: the caller supplies decoded
// pixels. The Node test (src/art/bundles.test.ts) feeds it files decoded by
// src/art/png.ts; the Art Lab feeds it canvas pixels. Index-vs-folders sync is
// checked separately (Node only), because a browser can't list folders.
//
// Unknown or optional JSON fields are ignored everywhere.

import { CHARACTERS, STRUCTURES, TILES, parseCharacterFrame } from "../contracts";
import { checkSpeciesAnim, MAX_FRONT_FRAMES } from "./anim";
import { ArtCatalog, isRef, type BundleView } from "./catalog";
import { BUNDLE_JSON, PACK_FORMAT, refCells, type RawBundle } from "./format";
import { colorStats, isPalette } from "./palette";
import { SET_DIRS } from "./paths";
import type { Rgba } from "./png";
import { requiredPaths, type RequiredPath } from "./required";

export interface Problem {
  /** What is wrong: a bundle ("species/oak_acorn"), a pack, or a logical path. */
  where: string;
  message: string;
}

export interface ValidateInput {
  raw: readonly RawBundle[];
  /** pack id -> its pack.json (parsed) or a load error. */
  packs: Record<string, { json?: unknown; error?: string }>;
  /** Legacy files (logical paths), or null if unknown. */
  legacy: readonly string[] | null;
  /** Decoded RGBA for a site-root-relative URL, or null when it doesn't exist / can't be read. */
  image(url: string): Rgba | null;
  required?: readonly RequiredPath[];
  artRoot?: string;
}

export interface ValidateResult {
  problems: Problem[];
  /** Required paths that only a legacy public/assets/ file satisfies. */
  legacyOnly: string[];
  /** Required paths that nothing provides. */
  missing: string[];
  counts: { bundles: number; packs: number; images: number; required: number };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isSize = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === "number" && Number.isInteger(n) && n > 0);

export function validateArt(input: ValidateInput): ValidateResult {
  const problems: Problem[] = [];
  const seen = new Set<string>();
  let images = 0;
  const img = (url: string) => {
    if (!seen.has(url)) { seen.add(url); images++; }
    return input.image(url);
  };
  const add = (where: string, message: string) => problems.push({ where, message });

  // 1. Every JSON parses, has the right format and matches its folder id.
  for (const r of input.raw) {
    const where = `${r.pack ? `packs/${r.pack}/` : ""}${r.kind}/${r.id}`;
    if (r.json === undefined) { add(where, `${BUNDLE_JSON[r.kind].file}: ${r.error ?? "could not be read"}`); continue; }
    if (!isObj(r.json)) { add(where, `${BUNDLE_JSON[r.kind].file} is not a JSON object`); continue; }
    const fmt = r.json.format, id = r.json.id;
    if (r.pack === null || fmt !== undefined) {
      if (fmt !== BUNDLE_JSON[r.kind].format) add(where, `format is ${JSON.stringify(fmt)}, want "${BUNDLE_JSON[r.kind].format}"`);
    }
    if (r.pack === null || id !== undefined) {
      if (id !== r.id) add(where, `id is ${JSON.stringify(id)} but the folder is "${r.id}"`);
    }
  }
  for (const [pack, p] of Object.entries(input.packs)) {
    const where = `packs/${pack}`;
    if (!isObj(p.json)) { add(where, `pack.json: ${p.error ?? "not a JSON object"}`); continue; }
    if (p.json.format !== PACK_FORMAT) add(where, `pack.json format is ${JSON.stringify(p.json.format)}, want "${PACK_FORMAT}"`);
    if (p.json.id !== pack) add(where, `pack.json id is ${JSON.stringify(p.json.id)} but the folder is "${pack}"`);
    if (typeof p.json.name !== "string" || !p.json.name) add(where, "pack.json needs a name");
  }

  // 2. Base bundles, checked as the game sees them with no packs.
  const base = new ArtCatalog(input.raw, { legacy: input.legacy, artRoot: input.artRoot });
  for (const v of base.list()) checkBundle(base, v, add, img, "");

  // 3. Each pack on its own: every bundle it touches must still be valid merged
  //    (an override of an existing bundle, or a complete new one).
  for (const pack of Object.keys(input.packs)) {
    const cat = new ArtCatalog(input.raw, { packs: [pack], legacy: input.legacy, artRoot: input.artRoot });
    for (const r of input.raw) {
      if (r.pack !== pack || !isObj(r.json)) continue;
      const v = cat.bundle(r.kind, r.id);
      if (!v) continue;
      const isNew = !base.bundle(r.kind, r.id);
      checkBundle(cat, v, add, img, `packs/${pack}/`, isNew);
    }
  }

  // 4. Every TileKey is defined by at most one base tileset (and the required
  //    paths below prove at least one, or a legacy file).
  const owners = new Map<string, string[]>();
  for (const r of input.raw) {
    if (r.pack !== null || r.kind !== "tilesets" || !isObj(r.json) || !isObj(r.json.tiles)) continue;
    for (const key of Object.keys(r.json.tiles)) owners.set(key, [...(owners.get(key) ?? []), r.id]);
  }
  for (const [key, ids] of owners) if (ids.length > 1) add(`tile ${key}`, `defined by ${ids.length} tilesets: ${ids.join(", ")}`);

  // 5. Every required logical path resolves (with no packs) at the right size.
  const legacyOnly: string[] = [];
  const missing: string[] = [];
  const required = input.required ?? requiredPaths();
  for (const req of required) {
    const res = base.resolve(req.path);
    if (!res) { missing.push(req.path); add(req.path, `missing (${req.group})`); continue; }
    if (res.legacy) legacyOnly.push(req.path);
    if (!req.size) continue;
    const [w, h] = res.rect ? [res.rect[2], res.rect[3]] : (() => { const i = img(res.url); return i ? [i.width, i.height] : [0, 0]; })();
    if (!res.rect && w === 0) { add(req.path, `file ${res.url} is missing or unreadable`); continue; }
    if (w !== req.size[0] || h !== req.size[1]) add(req.path, `is ${w}x${h}, want ${req.size[0]}x${req.size[1]}`);
  }

  return {
    problems, legacyOnly, missing,
    counts: { bundles: input.raw.length, packs: Object.keys(input.packs).length, images, required: required.length },
  };
}

type Add = (where: string, message: string) => void;
type Img = (url: string) => Rgba | null;

function checkBundle(cat: ArtCatalog, v: BundleView, add: Add, img: Img, prefix: string, isNew = false) {
  const where = `${prefix}${v.kind}/${v.id}`;
  const m = v.merged;
  const file = (name: string) => cat.findFile(v, name);
  const need = (name: string, ctx: string): Rgba | null => {
    const f = file(name);
    const i = img(f.url);
    if (!i) add(where, `${ctx}: file ${name} not found${f.listed ? "" : " (not in the folder, or index.json is stale)"}`);
    return i;
  };
  if (isNew && prefix) add(where, "info: new bundle (no base bundle with this id)");

  switch (v.kind) {
    case "species": {
      if (!isPalette(m.palette, 4)) { add(where, "palette must be 4 #rrggbb colours"); return; }
      if (m.sport === undefined) add(where, "sport palette is missing (shipped species must define one)");
      else if (!isPalette(m.sport, (m.palette as string[]).length)) add(where, "sport must be #rrggbb colours, the same count as palette");
      const frames = m.frames;
      if (!isObj(frames)) { add(where, "frames must be an object"); return; }
      const spec = { front: [1, MAX_FRONT_FRAMES, 56], back: [1, 1, 48], icon: [1, 2, 16] } as const;
      for (const [list, [min, max, size]] of Object.entries(spec)) {
        const names = frames[list];
        if (!Array.isArray(names) || names.length < min || names.length > max || !names.every((n) => typeof n === "string")) {
          add(where, `frames.${list} must list ${min === max ? min : `${min}–${max}`} file name(s)`);
          continue;
        }
        for (const name of names as string[]) {
          const f = file(name);
          const i = need(name, `frames.${list}`);
          if (!i) continue;
          if (i.width !== size || i.height !== size) add(where, `${name} is ${i.width}x${i.height}, want ${size}x${size}`);
          const pal = cat.paletteAt(v, f.layer);
          const { colors, partialAlpha } = colorStats(i.data);
          if (partialAlpha) add(where, `${name}: ${partialAlpha} pixel(s) with partial alpha (must be 0 or 255)`);
          if (pal) {
            const allowed = new Set(pal.map((c) => c.toLowerCase()));
            const stray = [...colors].filter((c) => !allowed.has(c));
            if (stray.length) add(where, `${name}: ${stray.length} colour(s) not in the palette: ${stray.slice(0, 4).join(" ")}${stray.length > 4 ? " …" : ""}`);
          }
        }
      }
      // Crystal-style animation (optional): frames exist, intro ends on 0, ticks are positive.
      const front = Array.isArray(frames.front) ? frames.front.length : 0;
      for (const msg of checkSpeciesAnim(m.anim, front)) add(where, msg);
      return;
    }
    case "tilesets": {
      if (m.tileSize !== 16) add(where, `tileSize must be 16 (got ${JSON.stringify(m.tileSize)})`);
      if (!(typeof m.columns === "number" && Number.isInteger(m.columns) && m.columns > 0)) { add(where, "columns must be a positive integer"); return; }
      if (typeof m.sheet !== "string") { add(where, "sheet must name a PNG"); return; }
      if (!isObj(m.tiles)) { add(where, "tiles must be an object"); return; }
      const sheets = new Map<string, Rgba | null>();
      for (const [key, def] of Object.entries(m.tiles)) {
        const tw = `${where} tile ${key}`;
        if (!(key in TILES)) add(tw, "is not a TileKey in src/contracts/ids.ts");
        if (!isObj(def)) { add(tw, "must be an object"); continue; }
        const sheet = cat.tileSheet(v, key);
        if (!sheet) { add(tw, "has no usable sheet"); continue; }
        if (!sheets.has(sheet.url)) {
          const i = img(sheet.url);
          sheets.set(sheet.url, i);
          if (!i) add(where, `sheet ${sheet.url} not found`);
          else {
            if (i.width !== sheet.columns * 16) add(where, `sheet ${sheet.url} is ${i.width}px wide, want columns×16 = ${sheet.columns * 16}`);
            if (i.height % 16 !== 0 || i.height === 0) add(where, `sheet ${sheet.url} height ${i.height} is not a multiple of 16`);
          }
        }
        const si = sheets.get(sheet.url);
        const cells = si ? sheet.columns * Math.floor(si.height / 16) : Infinity;
        const checkRef = (r: unknown, what: string, frames?: number) => {
          if (!isRef(r)) { add(tw, `${what} must be a cell number or 1–2 cell numbers`); return; }
          const list = refCells(r);
          for (const c of list) if (c >= cells) add(tw, `${what} cell ${c} is outside the sheet (${cells} cells)`);
          if (frames !== undefined && list.length !== frames) add(tw, `${what} has ${list.length} frame(s); base has ${frames}`);
        };
        if (def.base === undefined) { add(tw, "base is required"); continue; }
        checkRef(def.base, "base");
        const baseFrames = isRef(def.base) ? refCells(def.base).length : 1;
        if (def.alts !== undefined) {
          if (!Array.isArray(def.alts) || def.alts.length > 5) add(tw, "alts must be a list of up to 5 refs");
          else def.alts.forEach((a, i) => {
            if (typeof a !== "number") add(tw, `alts[${i}] must be a static cell number`);
            else checkRef(a, `alts[${i}]`);
          });
        }
        if (def.masks !== undefined) {
          if (!isObj(def.masks)) add(tw, "masks must be an object keyed \"0\"–\"15\"");
          else for (const [mk, r] of Object.entries(def.masks)) {
            if (!/^(\d|1[0-5])$/.test(mk)) { add(tw, `mask key "${mk}" must be "0"–"15"`); continue; }
            checkRef(r, `masks.${mk}`, baseFrames > 1 ? baseFrames : undefined);
          }
        }
      }
      return;
    }
    case "structures": {
      const spec = (STRUCTURES as Record<string, { w: number; h: number }>)[v.id];
      if (!spec) add(where, "is not a StructureKey in src/contracts/ids.ts");
      if (!isSize(m.size)) add(where, "size must be [w, h] in tiles");
      else if (spec && (m.size[0] !== spec.w || m.size[1] !== spec.h)) add(where, `size is ${m.size.join("x")}, STRUCTURES says ${spec.w}x${spec.h}`);
      if (typeof m.image !== "string") { add(where, "image must name a PNG"); return; }
      const i = need(m.image, "image");
      const want = spec ? [spec.w * 16, spec.h * 16] : isSize(m.size) ? [m.size[0] * 16, m.size[1] * 16] : null;
      if (i && want && (i.width !== want[0] || i.height !== want[1])) add(where, `${m.image} is ${i.width}x${i.height}, want ${want[0]}x${want[1]}`);
      return;
    }
    case "characters": {
      if (!(CHARACTERS as readonly string[]).includes(v.id)) add(where, "is not a CharacterKey in src/contracts/ids.ts");
      const frame = parseCharacterFrame(m.frame);
      if (!frame) add(where, "frame must be [16, 16] or [16, 32]");
      if (JSON.stringify(m.rows) !== JSON.stringify(["down", "up", "left", "right"])) add(where, 'rows must be ["down", "up", "left", "right"]');
      if (JSON.stringify(m.columns) !== JSON.stringify(["stand", "stepA", "stepB"])) add(where, 'columns must be ["stand", "stepA", "stepB"]');
      if (typeof m.sheet !== "string") { add(where, "sheet must name a PNG"); return; }
      const i = need(m.sheet, "sheet");
      if (i && frame && (i.width !== frame[0] * 3 || i.height !== frame[1] * 4)) add(where, `${m.sheet} is ${i.width}x${i.height}, want ${frame[0] * 3}x${frame[1] * 4}`);
      return;
    }
    case "sets": {
      if (!(SET_DIRS as readonly string[]).includes(m.logicalDir as string)) add(where, `logicalDir must be one of ${SET_DIRS.join(", ")}`);
      if (!isObj(m.images)) { add(where, "images must be an object"); return; }
      for (const [key, e] of Object.entries(m.images)) {
        if (!/^[A-Za-z0-9_]+$/.test(key)) add(where, `image key "${key}" must be [A-Za-z0-9_]`);
        if (!isObj(e) || typeof e.file !== "string") { add(where, `images.${key} needs a file`); continue; }
        const i = need(e.file, `images.${key}`);
        const frames = e.frames === undefined ? 1 : e.frames;
        if (typeof frames !== "number" || !Number.isInteger(frames) || frames < 1) add(where, `images.${key}.frames must be a positive integer`);
        if (e.frames !== undefined && e.size === undefined) add(where, `images.${key}.frames needs a frame size`);
        if (e.size !== undefined) {
          if (!isSize(e.size)) add(where, `images.${key}.size must be [w, h]`);
          else if (i && (i.width !== e.size[0] * (typeof frames === "number" ? frames : 1) || i.height !== e.size[1])) add(where, `${e.file} is ${i.width}x${i.height}, set.json says ${e.size[0]}x${e.size[1]} per frame (${frames} frames)`);
        }
      }
      return;
    }
  }
}

/** Problems that aren't just informational. */
export function errorsOnly(problems: readonly Problem[]): Problem[] {
  return problems.filter((p) => !p.message.startsWith("info:"));
}
