// The art registry: the browser runtime behind `ctx.assets`. It loads
// public/art/index.json and every bundle JSON, resolves logical paths through
// the catalog (packs, sheet cells, palette swaps, legacy fallback), loads the
// underlying PNGs and hands back cut / recoloured canvases, cached.
//
// It is also the API a future art editor builds on: list bundles, switch
// packs, patch bundle JSON in memory, replace any file in memory, read
// pixels, and validate (see the Art Lab in src/art/lab/).

import { DEFAULT_CHARACTER_FRAME, parseCharacterFrame } from "../contracts";
import type { ArtImage, Assets, CharacterKey, SpeciesAnim, SpeciesId } from "../contracts";
import { parseSpeciesAnim } from "./anim";
import { ArtCatalog, LAB_LAYER, type BundleView, type Resolution } from "./catalog";
import {
  BUNDLE_KINDS, bundleJsonUrl, emptyIndex, INDEX_FORMAT, LOCAL_PACKS, rawBundlesOf,
  type ArtIndex, type BundleKind, type IndexPack, type RawBundle,
} from "./format";
import { recolorRgba } from "./palette";
import type { Rgba } from "./png";
import { requiredPaths } from "./required";
import { validateArt, type ValidateResult } from "./validate";

export const PACKS_STORAGE_KEY = "verdant.artPacks";

export interface PackInfo { id: string; name: string; description: string; author: string; local: boolean }

export interface ArtRegistryOptions {
  /** URL prefix of the art tree, relative to the page (default "art/"). */
  artRoot?: string;
  /** Packs after discovered local defaults. `base` disables those defaults.
   * Default: `?art=a,b` from the URL, else localStorage. */
  packs?: readonly string[];
}

interface FileEntry { img?: HTMLImageElement; failed?: boolean; wait?: Promise<void> }

const hasDom = typeof document !== "undefined" && typeof Image !== "undefined";

/** Packs requested by the page: `?art=` wins (even empty), then localStorage. */
export function requestedPacks(): string[] {
  try {
    if (typeof location !== "undefined") {
      const q = new URLSearchParams(location.search);
      if (q.has("art")) return (q.get("art") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    }
  } catch { /* no location */ }
  try {
    const s = typeof localStorage !== "undefined" ? localStorage.getItem(PACKS_STORAGE_KEY) : null;
    const v: unknown = s ? JSON.parse(s) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Reject malformed optional indexes before their file lists reach the catalogue. */
function validIndexPack(pack: unknown): pack is IndexPack {
  if (!pack || typeof pack !== "object") return false;
  const p = pack as IndexPack;
  if (![p.name, p.description, p.author].every((v) => typeof v === "string")) return false;
  return BUNDLE_KINDS.every((kind) => {
    const tree = p[kind];
    return !!tree && typeof tree === "object" && !Array.isArray(tree) &&
      Object.values(tree).every((files) => Array.isArray(files) && files.every((f) => typeof f === "string"));
  });
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

export class ArtRegistry implements Assets {
  readonly artRoot: string;
  /** The loaded index (an empty one if index.json is missing). */
  index: ArtIndex = emptyIndex();
  /** False when index.json could not be loaded: every "assets/" path is then tried as a legacy file. */
  indexLoaded = false;
  raw: RawBundle[] = [];
  catalog: ArtCatalog = new ArtCatalog([], { legacy: null });
  /** Bumps on every change (packs, overrides); caches keyed on it stay valid. */
  version = 0;

  private requested: readonly string[] | undefined;
  private active: string[] = [];
  private local = new Set<string>();
  private initPromise: Promise<void> | null = null;
  private isReady = false;
  private files = new Map<string, FileEntry>();
  private derived = new Map<string, ArtImage>();
  private fileOverrides = new Map<string, ArtImage>();
  private lab = new Map<string, Record<string, unknown>>();
  private listeners = new Set<() => void>();
  private warned = new Set<string>();
  private pixelCache = new Map<string, { v: number; rgba: Rgba }>();
  private anims = new Map<string, SpeciesAnim | undefined>();
  private animsVersion = -1;

  constructor(opts: ArtRegistryOptions = {}) {
    this.artRoot = opts.artRoot ?? "art/";
    this.requested = opts.packs;
  }

  // ---- lifecycle -----------------------------------------------------------

  /** Loads the index and every bundle JSON (once). */
  ready(): Promise<void> {
    this.initPromise ??= this.init();
    return this.initPromise;
  }
  get loaded(): boolean { return this.isReady; }

  private async init() {
    try {
      const res = await fetch(`${this.artRoot}index.json`, { cache: "no-cache" });
      const json: unknown = res.ok ? await res.json() : null;
      if (json && typeof json === "object" && (json as ArtIndex).format === INDEX_FORMAT) {
        this.index = { ...emptyIndex(), ...(json as ArtIndex) };
        this.indexLoaded = true;
      } else console.warn(`[art] ${this.artRoot}index.json missing or invalid; using legacy files only`);
    } catch (e) {
      console.warn(`[art] could not load ${this.artRoot}index.json; using legacy files only`, e);
    }
    // Optional indexes are deliberately silent: public clones have no private art.
    const locals = await Promise.all(LOCAL_PACKS.map(async (id) => {
      try {
        const res = await fetch(`${this.artRoot}packs/${id}/index.json`, { cache: "no-cache" });
        if (!res.ok) return null;
        const json: unknown = await res.json();
        if (!json || typeof json !== "object" || (json as ArtIndex).format !== INDEX_FORMAT) return null;
        const pack = (json as ArtIndex).packs?.[id];
        if (!validIndexPack(pack)) return null;
        return { id, pack };
      } catch { return null; }
    }));
    for (const entry of locals) {
      if (!entry) continue;
      this.index.packs[entry.id] = entry.pack;
      this.local.add(entry.id);
    }
    this.raw = await Promise.all(rawBundlesOf(this.index).map(async (r) => {
      const url = bundleJsonUrl(r.kind, r.id, r.pack, this.artRoot);
      try {
        const res = await fetch(url, { cache: "no-cache" });
        if (!res.ok) return { ...r, error: `HTTP ${res.status}` };
        return { ...r, json: JSON.parse(await res.text()) as unknown };
      } catch (e) {
        console.warn(`[art] bad bundle JSON ${url}`, e);
        return { ...r, error: e instanceof Error ? e.message : String(e) };
      }
    }));
    const want = this.requested ?? requestedPacks();
    const unknown = want.filter((p) => p !== "base" && !this.index.packs[p]);
    if (unknown.length) console.warn(`[art] unknown art pack(s): ${unknown.join(", ")}`);
    const defaults = want.includes("base") ? [] : [...this.local].filter((p) => !want.includes(p));
    this.active = [...new Set([...defaults, ...want.filter((p) => p !== "base" && this.index.packs[p])])];
    this.rebuild();
    this.isReady = true;
    if (this.active.length) console.info(`[art] packs: ${this.active.join(", ")}`);
  }

  private rebuild() {
    this.catalog = new ArtCatalog(this.raw, {
      packs: this.active, artRoot: this.artRoot, legacy: this.indexLoaded ? this.index.legacy : null, lab: this.lab,
    });
    this.derived.clear();
    this.version++;
    for (const f of this.listeners) f();
  }

  /** Subscribe to changes (packs, overrides). Returns an unsubscribe function. */
  onChange(f: () => void): () => void {
    this.listeners.add(f);
    return () => this.listeners.delete(f);
  }

  // ---- Assets contract -------------------------------------------------------

  image(path: string): ArtImage | undefined {
    if (!this.isReady) { void this.ready(); return undefined; }
    const d = this.derived.get(path);
    if (d) return d;
    const res = this.catalog.resolve(path);
    if (!res) return undefined;
    const src = this.fileNow(res.url);
    if (!src) { void this.loadFile(res.url); return undefined; }
    const out = this.derive(src, res);
    this.derived.set(path, out);
    return out;
  }

  imageFrames(path: string): number {
    return this.catalog.resolve(path)?.frames ?? 1;
  }

  imageFrame(path: string, frame: number): ArtImage | undefined {
    const image = this.image(path);
    if (!image) return;
    const res = this.catalog.resolve(path);
    const frames = res?.frames ?? 1;
    if (frames === 1) return image; // Preserve the exact original fallback object.
    const index = Math.max(0, Math.min(frames - 1, Math.floor(frame)));
    const key = `${path}:frame:${index}`;
    const hit = this.derived.get(key);
    if (hit) return hit;
    const [w, h] = res?.frameSize ?? [image.width / frames, image.height];
    const out = this.derive(image, { ...res!, rect: [index * w, 0, w, h] });
    this.derived.set(key, out);
    return out;
  }

  has(path: string): boolean {
    if (!this.isReady) return false;
    const res = this.catalog.resolve(path);
    return !!res && !!this.fileNow(res.url);
  }

  exists(path: string): boolean {
    if (!this.isReady) return false;
    const res = this.catalog.resolve(path);
    return !!res && !this.files.get(res.url)?.failed;
  }

  /** True once the path is known not to resolve, or its file failed to load. */
  isMissing(path: string): boolean {
    if (!this.isReady) return false;
    const res = this.catalog.resolve(path);
    return !res || (!!this.files.get(res.url)?.failed && !this.fileOverrides.has(res.url));
  }

  /** The species bundle's `anim` (packs and lab patches merged shallowly), or undefined. */
  speciesAnim(id: SpeciesId | string): SpeciesAnim | undefined {
    if (!this.isReady) return undefined;
    if (this.animsVersion !== this.version) { this.anims.clear(); this.animsVersion = this.version; }
    if (this.anims.has(id)) return this.anims.get(id);
    const a = parseSpeciesAnim(this.catalog.bundle("species", id)?.merged.anim);
    this.anims.set(id, a);
    return a;
  }

  characterFrame(id: CharacterKey) {
    return parseCharacterFrame(this.catalog.bundle("characters", id)?.merged.frame) ?? DEFAULT_CHARACTER_FRAME;
  }

  /** How many front frames the species bundle lists (0 when no bundle owns it). */
  frontFrameCount(id: SpeciesId | string): number {
    const f = this.catalog.bundle("species", id)?.merged.frames;
    const list = f && typeof f === "object" ? (f as Record<string, unknown>).front : undefined;
    return Array.isArray(list) ? list.length : 0;
  }

  async loadAll(paths?: string[], onProgress?: (done: number, total: number) => void): Promise<void> {
    await this.ready();
    const list = paths ?? this.catalog.provides();
    const urls = new Set<string>();
    for (const p of list) {
      const res = this.catalog.resolve(p);
      if (res && !this.fileNow(res.url) && !this.files.get(res.url)?.failed) urls.add(res.url);
    }
    let done = 0;
    const total = urls.size;
    if (!total) { onProgress?.(1, 1); return; }
    await Promise.all([...urls].map((u) => this.loadFile(u).then(() => onProgress?.(++done, total))));
  }

  // ---- files -----------------------------------------------------------------

  /** The image for a file URL if it is ready (an override wins). */
  fileNow(url: string): ArtImage | undefined {
    return this.fileOverrides.get(url) ?? this.files.get(url)?.img;
  }

  /** Load a file URL (relative to the page). Resolves when loaded or failed. */
  loadFile(url: string): Promise<void> {
    let e = this.files.get(url);
    if (e?.img || e?.failed) return Promise.resolve();
    if (e?.wait) return e.wait;
    if (!hasDom) return Promise.resolve();
    e = {};
    this.files.set(url, e);
    const entry = e;
    entry.wait = new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => { entry.img = img; entry.wait = undefined; resolve(); };
      img.onerror = () => {
        entry.failed = true;
        entry.wait = undefined;
        if (!this.warned.has(url)) { this.warned.add(url); console.warn(`[art] missing file: ${url}`); }
        resolve();
      };
      img.src = url;
    });
    return entry.wait;
  }

  /** Load and return a file's image (or null if it doesn't exist). */
  async file(url: string): Promise<ArtImage | null> {
    await this.loadFile(url);
    return this.fileNow(url) ?? null;
  }

  private derive(src: ArtImage, res: Resolution): ArtImage {
    if (!res.rect && !res.recolor) return src;
    const [x, y, w, h] = res.rect ?? [0, 0, src.width, src.height];
    const c = makeCanvas(w, h);
    const g = c.getContext("2d", { willReadFrequently: !!res.recolor })!;
    g.imageSmoothingEnabled = false;
    g.drawImage(src, x, y, w, h, 0, 0, w, h);
    if (res.recolor) {
      const data = g.getImageData(0, 0, w, h);
      recolorRgba(data.data, res.recolor);
      g.putImageData(data, 0, 0);
    }
    return c;
  }

  // ---- packs -------------------------------------------------------------------

  packs(): PackInfo[] {
    return Object.entries(this.index.packs).map(([id, p]) => ({ id, name: p.name, description: p.description, author: p.author, local: this.local.has(id) }));
  }
  activePacks(): readonly string[] { return this.active; }

  /** URL/storage selection that preserves local packs disabled in the Art Lab. */
  packSelection(): readonly string[] {
    return [...this.local].some((p) => !this.active.includes(p)) ? ["base", ...this.active] : this.active;
  }

  /** Switch packs live (lowest priority first). `persist` saves them for the next boot. */
  setActivePacks(ids: readonly string[], persist = false) {
    this.active = ids.filter((p) => this.index.packs[p]);
    if (persist) {
      try { localStorage.setItem(PACKS_STORAGE_KEY, JSON.stringify(this.packSelection())); } catch { /* storage unavailable */ }
    }
    this.rebuild();
  }

  /**
   * A ready, read-only view of the same art with other packs active and no
   * lab edits (the Art Lab's compare view). It shares this registry's loaded
   * files, so nothing is fetched twice. Call after `ready()`.
   */
  fork(packs: readonly string[]): ArtRegistry {
    const r = new ArtRegistry({ artRoot: this.artRoot, packs });
    r.index = this.index;
    r.indexLoaded = this.indexLoaded;
    r.local = new Set(this.local);
    r.raw = this.raw;
    r.files = this.files;
    r.active = packs.filter((p) => this.index.packs[p]);
    r.initPromise = Promise.resolve();
    r.isReady = true;
    r.rebuild();
    return r;
  }

  // ---- inspection --------------------------------------------------------------

  bundles(kind?: BundleKind): BundleView[] { return this.catalog.list(kind); }
  bundle(kind: BundleKind, id: string): BundleView | undefined { return this.catalog.bundle(kind, id); }
  resolve(path: string): Resolution | null { return this.isReady ? this.catalog.resolve(path) : null; }
  /** Logical paths a bundle provides. */
  pathsOf(v: BundleView): string[] { return this.catalog.pathsOf(v); }

  /** RGBA pixels of a loaded file (or override), or null. */
  pixels(url: string): Rgba | null {
    const src = this.fileNow(url);
    if (!src || !hasDom) return null;
    const hit = this.pixelCache.get(url);
    if (hit && hit.v === this.version) return hit.rgba;
    const c = makeCanvas(src.width, src.height);
    const g = c.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(src, 0, 0);
    const d = g.getImageData(0, 0, src.width, src.height);
    const rgba = { width: d.width, height: d.height, data: new Uint8Array(d.data.buffer) };
    this.pixelCache.set(url, { v: this.version, rgba });
    return rgba;
  }

  // ---- in-memory overrides (the Art Lab; never written to disk) ----------------

  /** Replace a file (by its URL) in memory; null restores it. */
  overrideFile(url: string, img: ArtImage | null) {
    if (img) this.fileOverrides.set(url, img);
    else this.fileOverrides.delete(url);
    this.pixelCache.delete(url);
    this.derived.clear();
    this.version++;
    for (const f of this.listeners) f();
  }

  /** Patch a bundle's JSON in memory (merged over everything); null removes the patch. */
  patchBundle(kind: BundleKind, id: string, patch: Record<string, unknown> | null) {
    const k = `${kind}/${id}`;
    if (patch && Object.keys(patch).length) this.lab.set(k, patch);
    else this.lab.delete(k);
    this.rebuild();
  }
  bundlePatch(kind: BundleKind, id: string): Record<string, unknown> | undefined { return this.lab.get(`${kind}/${id}`); }

  overrides(): { files: string[]; bundles: string[] } {
    return { files: [...this.fileOverrides.keys()], bundles: [...this.lab.keys()] };
  }
  clearOverrides() {
    this.fileOverrides.clear();
    this.lab.clear();
    this.pixelCache.clear();
    this.rebuild();
  }

  // ---- validation ------------------------------------------------------------

  /** Run the ART.md §9 checks in the browser (index-vs-folder sync excepted). */
  async validate(): Promise<ValidateResult> {
    await this.ready();
    const urls = new Set<string>();
    for (const r of this.raw) {
      const dir = r.pack ? `${this.artRoot}packs/${r.pack}/${r.kind}/${r.id}/` : `${this.artRoot}${r.kind}/${r.id}/`;
      for (const f of r.files) if (f.endsWith(".png")) urls.add(dir + f);
    }
    const base = new ArtCatalog(this.raw, { legacy: this.indexLoaded ? this.index.legacy : null, artRoot: this.artRoot });
    for (const req of requiredPaths()) {
      const res = base.resolve(req.path);
      if (res?.legacy) urls.add(res.url);
    }
    await Promise.all([...urls].map((u) => this.loadFile(u)));
    const packs: Record<string, { json?: unknown; error?: string }> = {};
    await Promise.all(Object.keys(this.index.packs).map(async (id) => {
      try {
        const res = await fetch(`${this.artRoot}packs/${id}/pack.json`, { cache: "no-cache" });
        packs[id] = res.ok ? { json: JSON.parse(await res.text()) } : { error: `HTTP ${res.status}` };
      } catch (e) { packs[id] = { error: e instanceof Error ? e.message : String(e) }; }
    }));
    return validateArt({
      // Lab JSON patches count, except a species `palette` edit: that is a live
      // recolour of the frames (validated as the original pixels + palette).
      raw: this.raw.map((r) => {
        const { palette: _recolour, ...patch } = this.lab.get(`${r.kind}/${r.id}`) ?? {};
        return Object.keys(patch).length && r.pack === null && r.json && typeof r.json === "object" ? { ...r, json: { ...(r.json as object), ...patch } } : r;
      }),
      packs,
      legacy: this.indexLoaded ? this.index.legacy : null,
      image: (url) => this.pixels(url),
      artRoot: this.artRoot,
    });
  }
}

export { BUNDLE_KINDS, LAB_LAYER };

// ---- the active registry (one per page) ---------------------------------------

let active: ArtRegistry | null = null;
/** The registry the game booted with (null before createAssets / in tests). */
export function activeArt(): ArtRegistry | null { return active; }
export function setActiveArt(r: ArtRegistry | null) { active = r; }

/** True when the active registry provides a logical path (false before it is ready). */
export function artExists(path: string): boolean {
  return active?.exists(path) ?? false;
}
