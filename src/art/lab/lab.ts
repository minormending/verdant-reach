// The Art Lab (?dev=art): a full-window DOM tool over the game canvas for
// browsing, previewing, swapping and validating art bundles. Everything it
// changes lives in memory (ArtRegistry overrides) until downloaded.
//
// Structure: `Lab` owns the shell (top bar, sidebar, routing, animation
// clock) and hands a `LabEnv` to the per-kind views in ./views.ts.

import type { GameContext } from "../../contracts";
import type { BundleView } from "../catalog";
import type { BundleKind } from "../format";
import type { ArtRegistry } from "../registry";
import { clear, ctx2d, h, nn, pixelCanvas } from "./dom";
import { LAB_CSS } from "./style";
import { VIEWS, drawFit } from "./views";
import { comparePack, packSpecies } from "./anim";

export type LabTab = BundleKind | "packs" | "checks" | "compare";
export const TABS: { id: LabTab; label: string }[] = [
  { id: "species", label: "Species" }, { id: "tilesets", label: "Tilesets" }, { id: "structures", label: "Structures" },
  { id: "characters", label: "Chars" }, { id: "sets", label: "Sets" }, { id: "packs", label: "Packs" }, { id: "checks", label: "Checks" },
  { id: "compare", label: "Compare" },
];

export type LabBg = "checker" | "light" | "white" | "dark" | "black";

export interface LabState {
  tab: LabTab;
  id: string | null;
  /** Secondary selection (a tile key in a tileset). */
  sub: string | null;
  zoom: 1 | 2 | 4;
  sport: boolean;
  bg: LabBg;
  search: string;
}

/** What views get from the shell. */
export interface LabEnv {
  reg: ArtRegistry;
  game: GameContext;
  state: LabState;
  /** Register a per-frame callback for the current view (cleared on re-render). */
  animate(fn: (frame: number) => void): void;
  go(tab: LabTab, id?: string | null, sub?: string | null): void;
  /** Change state and re-render the main view only. */
  set(patch: Partial<LabState>): void;
  toast(msg: string): void;
  /** Background class for previews. */
  bgClass(): string;
}

const PREFS_KEY = "verdant.artLab";

export class Lab {
  readonly root: HTMLDivElement;
  private side: HTMLDivElement;
  private main: HTMLDivElement;
  private top: HTMLDivElement;
  private list: HTMLDivElement;
  private tabsEl: HTMLDivElement;
  private search: HTMLInputElement;
  private animators: ((frame: number) => void)[] = [];
  private raf = 0;
  private t0 = performance.now();
  private toastTimer = 0;
  private unsub: () => void;
  private renderQueued = false;
  state: LabState;

  constructor(private reg: ArtRegistry, private game: GameContext) {
    this.state = { tab: "species", id: null, sub: null, zoom: 2, sport: false, bg: "checker", search: "" };
    try { Object.assign(this.state, JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as Partial<LabState>); } catch { /* none */ }
    this.state.search = "";
    this.readHash();

    if (!document.getElementById("al-css")) document.head.appendChild(h("style", { id: "al-css" }, LAB_CSS));
    this.top = h("div", { class: "al-top" });
    this.tabsEl = h("div", { class: "al-tabs" });
    this.search = h("input", { class: "al-search", type: "search", placeholder: "Filter…  ( / )", spellcheck: false });
    this.search.addEventListener("input", () => { this.state.search = this.search.value; this.renderList(); });
    this.list = h("div", { class: "al-list" });
    this.side = h("div", { class: "al-side" }, this.tabsEl, this.search, this.list);
    this.main = h("div", { class: "al-main" });
    this.root = h("div", { class: "al-root" }, this.top, this.side, this.main);

    // The game listens for keys on window and preventDefaults them; keep ours.
    for (const t of ["keydown", "keyup"]) this.root.addEventListener(t, (e) => e.stopPropagation());
    this.root.addEventListener("keydown", (e) => this.onKey(e as KeyboardEvent));
    // A stray drop outside a target must not navigate away from the page.
    this.root.addEventListener("dragover", (e) => e.preventDefault());
    this.root.addEventListener("drop", (e) => { e.preventDefault(); this.toast("Drop PNGs onto a frame, cell or image."); });
    addEventListener("hashchange", this.onHash);
    this.unsub = reg.onChange(() => this.queueRender());
  }

  mount(parent: HTMLElement = document.body) {
    parent.appendChild(this.root);
    this.renderAll();
    const tick = (now: number) => {
      const frame = Math.floor((now - this.t0) / (1000 / 60));
      for (const f of this.animators) f(frame);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  unmount() {
    cancelAnimationFrame(this.raf);
    removeEventListener("hashchange", this.onHash);
    this.unsub();
    this.root.remove();
  }

  // ---- routing --------------------------------------------------------------

  private readHash() {
    const parts = decodeURIComponent(location.hash.replace(/^#/, "")).split("/").filter(Boolean);
    const tab = TABS.find((t) => t.id === parts[0]);
    if (tab) {
      this.state.tab = tab.id;
      this.state.id = parts[1] ?? null;
      this.state.sub = parts[2] ?? null;
    }
  }
  private onHash = () => {
    const before = `${this.state.tab}/${this.state.id}/${this.state.sub}`;
    this.readHash();
    if (`${this.state.tab}/${this.state.id}/${this.state.sub}` !== before) this.renderAll();
  };
  private writeHash() {
    const s = this.state;
    const hash = "#" + [s.tab, s.id, s.sub].filter(Boolean).map((x) => encodeURIComponent(x!)).join("/");
    if (location.hash !== hash) history.replaceState(null, "", hash);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ zoom: s.zoom, sport: s.sport, bg: s.bg, tab: s.tab }));
    } catch { /* storage unavailable */ }
  }

  private env(): LabEnv {
    return {
      reg: this.reg,
      game: this.game,
      state: this.state,
      animate: (fn) => this.animators.push(fn),
      go: (tab, id = null, sub = null) => {
        this.state.tab = tab;
        this.state.id = id;
        this.state.sub = sub;
        this.renderAll();
      },
      set: (patch) => {
        Object.assign(this.state, patch);
        this.renderTop();
        this.renderMain();
      },
      toast: (msg) => this.toast(msg),
      bgClass: () => `bg-${this.state.bg}`,
    };
  }

  private queueRender() {
    if (this.renderQueued) return;
    this.renderQueued = true;
    // Packs or edits can bring in files not loaded yet: load them first (instant when cached).
    void this.reg.loadAll().then(() => requestAnimationFrame(() => {
      this.renderQueued = false;
      this.renderAll();
    }));
  }

  renderAll() {
    this.renderTop();
    this.renderTabs();
    this.renderList();
    this.renderMain();
  }

  // ---- top bar ----------------------------------------------------------------

  private renderTop() {
    const s = this.state;
    const ov = this.reg.overrides();
    const nOv = ov.files.length + ov.bundles.length;
    const seg = <T,>(label: string, opts: T[], cur: T, name: (o: T) => string, on: (o: T) => void) =>
      h("div", { class: "al-group" }, h("span", { class: "lbl" }, label),
        opts.map((o) => h("button", { class: `al-btn small${o === cur ? " on" : ""}`, onclick: () => on(o) }, name(o))));
    const packs = this.reg.packs();
    const active = this.reg.activePacks();
    clear(this.top);
    this.top.append(...nn([
      h("div", { class: "al-brand" }, "ART LAB", h("small", null, "Verdant Reach")),
      seg("Zoom", [1, 2, 4] as const, s.zoom, (z) => `${z}x`, (z) => this.env().set({ zoom: z })),
      h("div", { class: "al-group" },
        h("button", { class: `al-btn small${s.sport ? " on" : ""}`, title: "Show sport (shiny) palettes", onclick: () => this.env().set({ sport: !s.sport }) }, s.sport ? "★ Sport" : "☆ Sport")),
      seg("BG", ["checker", "light", "white", "dark", "black"] as LabBg[], s.bg, (b) => b[0].toUpperCase() + b.slice(1), (b) => this.env().set({ bg: b })),
      packs.length
        ? h("div", { class: "al-group" }, h("span", { class: "lbl" }, "Packs"),
          packs.map((p) => {
            const on = active.includes(p.id);
            return h("button", {
              class: `al-btn small pack${on ? " on" : ""}`, title: `${p.name}: ${p.description}`,
              onclick: () => {
                const next = on ? active.filter((x) => x !== p.id) : [...active, p.id];
                this.reg.setActivePacks(next, true);
                this.toast(`${on ? "Disabled" : "Enabled"} pack ${p.name} (saved for the game too)`);
              },
            }, p.id, p.local ? h("span", { class: "al-chip pack" }, "LOCAL") : null);
          }))
        : null,
      h("div", { class: "al-spacer" }),
      nOv ? h("button", { class: "al-btn small warn", title: [...ov.bundles, ...ov.files].join("\n"), onclick: () => { this.reg.clearOverrides(); this.toast("Cleared all in-memory edits"); } }, `Revert ${nOv} edit${nOv > 1 ? "s" : ""}`) : null,
      h("a", { class: "al-btn small", href: location.pathname + (this.reg.packSelection().length ? `?art=${this.reg.packSelection().join(",")}` : ""), title: "Back to the game (with the selected packs)" }, "▶ Play"),
    ]));
  }

  // ---- sidebar ------------------------------------------------------------------

  private count(tab: LabTab): number {
    if (tab === "packs") return this.reg.packs().length;
    if (tab === "checks") return 0;
    if (tab === "compare") return packSpecies(this.reg, comparePack(this.env())).length;
    return this.reg.bundles(tab).length;
  }

  private renderTabs() {
    clear(this.tabsEl);
    for (const t of TABS) {
      const n = this.count(t.id);
      this.tabsEl.append(h("div", {
        class: `al-tab${t.id === this.state.tab ? " on" : ""}`,
        onclick: () => this.env().go(t.id, null),
      }, t.label, n ? h("span", { class: "n" }, n) : null));
    }
  }

  private renderList() {
    clear(this.list);
    const s = this.state;
    const q = s.search.trim().toLowerCase();
    if (s.tab === "packs") {
      const active = this.reg.activePacks();
      for (const p of this.reg.packs()) {
        if (q && !`${p.id} ${p.name}`.toLowerCase().includes(q)) continue;
        this.list.append(h("div", { class: `al-item${s.id === p.id ? " on" : ""}`, onclick: () => this.env().go("packs", p.id) },
          h("div", { class: "name" }, p.name, h("div", { class: "sub" }, p.id, active.includes(p.id) ? " · active" : "")),
          p.local ? h("span", { class: "al-chip pack" }, "LOCAL") : null));
      }
      if (!this.reg.packs().length) this.list.append(h("div", { class: "al-empty" }, "No packs in public/art/packs/."));
      return;
    }
    if (s.tab === "checks") {
      this.list.append(h("div", { class: "al-hint", style: "padding: 4px 8px" },
        "Runs the docs/ART.md §9 checks against the bundles as served (index sync is checked by npm test)."));
      return;
    }
    const compare = s.tab === "compare";
    const cmpPack = compare ? comparePack(this.env()) : null;
    const inPack = new Set(packSpecies(this.reg, cmpPack));
    const views = this.reg.bundles(compare ? "species" : (s.tab as BundleKind)).filter((v) => !q || v.id.includes(q) || this.title(v).toLowerCase().includes(q));
    for (const v of views) {
      const thumb = pixelCanvas(32, 32, 1);
      drawFit(this.reg, ctx2d(thumb), v, 32, 32);
      const fromPack = compare ? inPack.has(v.id) : v.layers.some((l) => l.pack && l.pack !== "@lab");
      const edited = v.layers.some((l) => l.pack === "@lab");
      this.list.append(h("div", {
        class: `al-item${s.id === v.id ? " on" : ""}`,
        onclick: () => { this.env().go(s.tab, v.id, compare ? cmpPack : null); },
      }, h("div", { class: "thumb" }, thumb), h("div", { class: "name" }, v.id, h("div", { class: "sub" }, this.subtitle(v))),
      fromPack ? h("span", { class: "al-chip pack" }, compare ? cmpPack : "pack") : null, edited ? h("span", { class: "al-chip lab" }, "edit") : null));
    }
    if (!views.length) this.list.append(h("div", { class: "al-empty" }, q ? "Nothing matches." : "No bundles."));
    this.list.querySelector(".al-item.on")?.scrollIntoView({ block: "nearest" });
  }

  private title(v: BundleView): string {
    if (v.kind === "species") return this.game.data.species[v.id as keyof GameContext["data"]["species"]]?.name ?? "";
    return typeof v.merged.name === "string" ? v.merged.name : "";
  }
  private subtitle(v: BundleView): string {
    const m = v.merged;
    switch (v.kind) {
      case "species": return this.title(v) || "—";
      case "tilesets": return `${Object.keys((m.tiles as object) ?? {}).length} tiles`;
      case "structures": return Array.isArray(m.size) ? `${m.size.join("×")} tiles` : "";
      case "characters": return "walk sheet";
      case "sets": return `${Object.keys((m.images as object) ?? {}).length} images · ${String(m.logicalDir ?? "")}`;
    }
  }

  // ---- main -----------------------------------------------------------------------

  renderMain() {
    this.animators = [];
    this.writeHash();
    const scroll = this.main.scrollTop;
    const sameView = this.main.dataset.view === `${this.state.tab}/${this.state.id}`;
    clear(this.main);
    this.main.dataset.view = `${this.state.tab}/${this.state.id}`;
    const env = this.env();
    try {
      VIEWS[this.state.tab](env, this.main);
    } catch (e) {
      console.error("[art lab]", e);
      this.main.append(h("div", { class: "al-empty" }, `This view failed: ${e instanceof Error ? e.message : String(e)}`));
    }
    if (sameView) this.main.scrollTop = scroll;
  }

  // ---- misc --------------------------------------------------------------------------

  toast(msg: string) {
    document.querySelector(".al-toast")?.remove();
    const t = h("div", { class: "al-toast" }, msg);
    this.root.append(t);
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => t.remove(), 3200);
  }

  private onKey(e: KeyboardEvent) {
    const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
    if (e.key === "/" && !typing) { e.preventDefault(); this.search.focus(); return; }
    if (typing) { if (e.key === "Escape") (e.target as HTMLElement).blur(); return; }
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "j" || e.key === "k") {
      const items = [...this.list.querySelectorAll<HTMLElement>(".al-item")];
      if (!items.length) return;
      const i = items.findIndex((el) => el.classList.contains("on"));
      const d = e.key === "ArrowDown" || e.key === "j" ? 1 : -1;
      items[Math.max(0, Math.min(items.length - 1, i + d))].click();
      e.preventDefault();
    } else if (e.key === "s") this.env().set({ sport: !this.state.sport });
    else if (e.key === "1" || e.key === "2" || e.key === "4") this.env().set({ zoom: Number(e.key) as 1 | 2 | 4 });
  }
}
