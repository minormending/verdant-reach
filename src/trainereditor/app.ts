// The editor's state: the shipped trainers.json, the edits on top (kept in
// IndexedDB), the catalog, and the live validation. Views read from it and
// call `update`; it tells them what changed.

import type { MapId, TrainerDef } from "../contracts";
import { DATA } from "../data";
import { WORLD } from "../world";
import { WALKTHROUGH } from "../guide/walkthrough";
import { buildTrainer, linesKey, type TrainerEntry, type TrainersFile } from "../world/trainerFile";
import { TRAINER_LINES, TRAINERS_FILE } from "../world/trainers";
import { buildCatalog, type CatalogRow } from "./catalog";
import { applyEdits, editsFromFile, pruneEdits, setEdit, validate, type Edits, type Validation } from "./edits";
import { loadEdits, saveEdits } from "./store";

type Event = "change" | "saved" | "select";

export class Editor {
  readonly data = DATA;
  readonly world = WORLD;
  readonly lines = TRAINER_LINES;
  readonly base: TrainersFile = TRAINERS_FILE;
  readonly ctx = { data: DATA, lines: TRAINER_LINES };
  readonly labels = { trainers: WORLD.trainers, items: DATA.items, species: DATA.species };
  readonly rows: CatalogRow[];
  readonly rowById: Map<string, CatalogRow>;
  private readonly shippedById: Map<string, TrainerEntry>;
  edits: Edits = {};
  /** null until the first save attempt; false when IndexedDB isn't available. */
  saved: boolean | null = null;
  selected: string;
  private memo: { file: TrainersFile; validation: Validation } | null = null;
  private listeners = new Map<Event, Set<(id?: string) => void>>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.rows = buildCatalog(WORLD, this.base.trainers, WALKTHROUGH, this.labels);
    this.rowById = new Map(this.rows.map((r) => [r.id, r]));
    this.shippedById = new Map(this.base.trainers.map((e) => [e.id, e]));
    this.selected = this.base.trainers[0].id;
  }

  async boot(): Promise<void> {
    const saved = await loadEdits();
    if (saved) this.edits = pruneEdits(this.base, saved);
  }

  on(e: Event, f: (id?: string) => void): void {
    if (!this.listeners.has(e)) this.listeners.set(e, new Set());
    this.listeners.get(e)!.add(f);
  }
  private emit(e: Event, id?: string) { for (const f of this.listeners.get(e) ?? []) f(id); }

  shipped(id: string): TrainerEntry { return this.shippedById.get(id)!; }
  entry(id: string): TrainerEntry { return this.edits[id] ?? this.shipped(id); }
  isEdited(id: string): boolean { return !!this.edits[id]; }
  get editCount(): number { return Object.keys(this.edits).length; }

  /** The edited file and its validation (the build's own check), recomputed after each change. */
  private get state() {
    if (!this.memo) {
      const file = applyEdits(this.base, this.edits);
      this.memo = { file, validation: validate(file, this.ctx) };
    }
    return this.memo;
  }
  get file(): TrainersFile { return this.state.file; }
  get validation(): Validation { return this.state.validation; }
  errorsFor(id: string): string[] { return this.validation.byTrainer.get(id) ?? []; }

  /** The game's TrainerDef for an entry (with its lines), for previews; null when the entry can't be built. */
  def(id: string, entry: TrainerEntry = this.entry(id)): TrainerDef | null {
    const key = linesKey(id, this.lines);
    if (!key || this.errorsFor(id).length) return null;
    try { return buildTrainer(entry, this.lines[key]); } catch { return null; }
  }

  select(id: string): void {
    if (!this.shippedById.has(id)) return;
    this.selected = id;
    this.emit("select", id);
  }

  update(entry: TrainerEntry): void {
    this.edits = setEdit(this.base, this.edits, entry);
    this.changed(entry.id);
  }
  revert(id: string): void {
    const { [id]: _drop, ...rest } = this.edits;
    this.edits = rest;
    this.changed(id);
  }
  clearAll(): void {
    this.edits = {};
    this.changed();
  }
  /** Replace the edits with the difference between the shipped file and an imported one. */
  importFile(file: TrainersFile): { count: number; unknown: string[]; missing: string[] } {
    const r = editsFromFile(this.base, file);
    this.edits = r.edits;
    this.changed();
    return { count: Object.keys(r.edits).length, unknown: r.unknown, missing: r.missing };
  }

  private changed(id?: string) {
    this.memo = null;
    this.emit("change", id);
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.flush(), 250);
  }

  /** Save now (before opening the game). Resolves false without IndexedDB. */
  async flush(): Promise<boolean> {
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }
    this.saved = await saveEdits(this.edits);
    this.emit("saved");
    return this.saved;
  }

  mapName(id: MapId): string { return this.world.maps[id]?.name ?? id; }
  speciesName(id: string): string { return this.data.species[id as keyof typeof this.data.species]?.name ?? id; }
  label(id: string): string { const e = this.entry(id); return `${e.className} ${e.name}`; }
}
