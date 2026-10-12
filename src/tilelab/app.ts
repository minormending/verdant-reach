// The Tile Lab's shared state: the art registry with the lab's overrides
// installed, the same art without them (the "before" of A/B), the usage
// index, the selected tile and the story state. Views subscribe to events.

import type { MapDef, MapId, TileKey } from "../contracts";
import { AUTOTILE, TILES } from "../contracts";
import { createArtAssets, type ArtRegistry } from "../art";
import { WORLD } from "../world";
import { installLab, type Installed } from "./install";
import { effectiveEdits, emptyState, type LabState, type TilesetPlan } from "./plan";
import { clearState, loadState, saveState } from "./store";
import { usageIndex, type UsageIndex } from "./usage";

export type LabEvent = "art" | "select" | "story" | "compare" | "busy";

export const STORY_PRESETS: { id: string; label: string; flags: Record<string, boolean> }[] = [
  { id: "new", label: "New game", flags: {} },
  { id: "cleared", label: "Game cleared", flags: { game_cleared: true } },
];

export class Lab {
  reg!: ArtRegistry;
  base!: ArtRegistry;
  state: LabState = emptyState();
  plans: TilesetPlan[] = [];
  readonly maps: MapDef[] = Object.values(WORLD.maps).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  readonly usage: UsageIndex = usageIndex(this.maps);
  readonly keys = Object.keys(TILES) as TileKey[];
  selected: TileKey | null = null;
  story = "new";
  /** Show the art without the lab's edits (hold to compare). */
  compare = false;
  /** True when IndexedDB took the last save. */
  saved: boolean | null = null;
  /** Bumps on every install; render caches key on it. */
  artVersion = 0;
  private listeners = new Map<LabEvent, Set<() => void>>();
  private chain: Promise<void> = Promise.resolve();
  private saveTimer = 0;
  private views = new WeakMap<ArtRegistry, { v: number; view: ArtRegistry }>();

  async boot(): Promise<void> {
    this.reg = createArtAssets();
    await this.reg.ready();
    const saved = await loadState();
    this.state = saved ?? { ...emptyState(), packs: [...this.reg.activePacks()] };
    await this.install();
  }

  on(ev: LabEvent, f: () => void): () => void {
    let s = this.listeners.get(ev);
    if (!s) { s = new Set(); this.listeners.set(ev, s); }
    s.add(f);
    return () => s!.delete(f);
  }
  emit(ev: LabEvent) { for (const f of this.listeners.get(ev) ?? []) f(); }

  /** Re-apply the whole state to the registry (serialised; the latest call wins). */
  private install(): Promise<void> {
    this.chain = this.chain.then(async () => {
      this.emit("busy");
      const res: Installed = await installLab(this.reg, this.state);
      this.base = res.base;
      this.plans = res.plans;
      this.artVersion++;
      this.emit("art");
    }).catch((e: unknown) => { console.error("[tilelab] install failed", e); this.emit("art"); });
    return this.chain;
  }

  /** Change the state, save it and re-install the art. */
  async update(f: (s: LabState) => void): Promise<void> {
    f(this.state);
    this.scheduleSave();
    await this.install();
  }

  private scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => void this.flush(), 250);
  }
  async flush(): Promise<boolean> {
    clearTimeout(this.saveTimer);
    this.saved = await saveState(this.state);
    return this.saved;
  }

  async clearAll(): Promise<void> {
    this.state = emptyState();
    await clearState();
    await this.install();
  }

  select(key: TileKey | null) {
    if (this.selected === key) return;
    this.selected = key;
    this.emit("select");
  }
  setStory(id: string) {
    this.story = id;
    this.emit("story");
  }
  setCompare(on: boolean) {
    if (this.compare === on) return;
    this.compare = on;
    this.emit("compare");
  }

  storyFlags(): Record<string, boolean> {
    return { ...(STORY_PRESETS.find((p) => p.id === this.story)?.flags ?? {}) };
  }

  /** The registry the views draw from right now (with or without the lab's edits). */
  shown(): ArtRegistry { return this.compare ? this.base : this.reg; }

  /**
   * A per-version view of a registry for src/guide/mapRender.ts. The overworld
   * memoises which alts exist per asset object (assetCatalog), so a fresh
   * object per art version keeps added or dropped alts honest. It shares all
   * of the registry's state through the prototype chain.
   */
  viewOf(reg: ArtRegistry): ArtRegistry {
    const hit = this.views.get(reg);
    if (hit && hit.v === reg.version) return hit.view;
    const view = Object.create(reg) as ArtRegistry;
    this.views.set(reg, { v: reg.version, view });
    return view;
  }

  /** The tileset that owns a key in the current art. */
  owner(key: string): string | undefined { return this.reg.catalog.tileOwner(key)?.id; }

  tilesets(): string[] { return this.reg.bundles("tilesets").map((v) => v.id); }

  edited(key: string): boolean { return effectiveEdits(this.state).has(key) || !!this.state.edits[key]; }

  mapsUsing(key: string): MapId[] { return [...(this.usage.keys.get(key as TileKey)?.maps.keys() ?? [])]; }

  /** Tilesets a map draws from (any story state). */
  mapTilesets(id: MapId): string[] {
    const set = new Set<string>();
    for (const k of this.usage.maps.get(id)?.keys ?? []) { const o = this.owner(k); if (o) set.add(o); }
    return [...set].sort();
  }

}

/** Keys in an AUTOTILE group (they have 16 masks). */
export const autotiled = (key: string) => key in AUTOTILE;
