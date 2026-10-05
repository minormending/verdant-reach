// Art Lab: Crystal-style species animation tools.
//  - animPlayer: a front sprite that plays `intro` once (replayable), then
//    loops `idle` (or holds frame 0); the legacy ping-pong with no `anim`.
//  - animTimeline: the steps of `intro` / `idle` as blocks sized by ticks.
//  - compareView (#compare/<species>/<pack>): base art vs a pack side by side
//    at 1x/2x/4x, normal and sport, with intros replayable.
//
// Everything reads through ArtRegistry forks (base-only, base+pack) that share
// the page's loaded files, so it doesn't depend on which packs are toggled on.

import type { SpeciesAnim } from "../../contracts";
import { SPECIES_IDS } from "../../contracts";
import { animState, stepsLength, type AnimState } from "../anim";
import { isPalette } from "../palette";
import { frontKind, logicalPath, type SpeciesFrameKind } from "../paths";
import type { ArtRegistry } from "../registry";
import { ctx2d, h, nn, pixelCanvas } from "./dom";
import type { LabEnv } from "./lab";

const TICK_MS = 1000 / 60;
const sec = (ticks: number) => `${(ticks * TICK_MS / 1000).toFixed(2)} s`;
const spPath = (id: string, kind: SpeciesFrameKind, sport: boolean) => logicalPath({ type: "species", id, kind, sport });

/** Legacy idle order: the first ≤3 front frames ping-ponged. */
function legacyOrder(fronts: number): number[] {
  const n = Math.max(1, Math.min(3, fronts));
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(i);
  for (let i = n - 2; i > 0; i--) out.push(i);
  return out;
}

/** One-line description of how a species' front sprite plays. */
export function animSummary(reg: ArtRegistry, id: string): string {
  const anim = reg.speciesAnim(id);
  const fronts = reg.frontFrameCount(id);
  if (!anim) return `no anim · legacy ping-pong of ${Math.min(3, fronts)} of ${fronts} frame${fronts === 1 ? "" : "s"}`;
  const intro = stepsLength(anim.intro), idle = stepsLength(anim.idle);
  return [
    `${fronts} frame${fronts === 1 ? "" : "s"}`,
    anim.intro ? `intro ${intro}t (${sec(intro)})` : "no intro",
    anim.idle ? `idle loop ${idle}t` : "holds frame 0",
  ].join(" · ");
}

export interface AnimPlayer {
  el: HTMLElement;
  /** Restart the intro (no-op for art with no intro). */
  replay(): void;
}

export interface PlayerOpts {
  reg: ArtRegistry;
  id: string;
  sport?: boolean;
  /** One canvas per zoom, all in sync. */
  zooms: number[];
  /** Play the intro when first shown (default true). */
  intro?: boolean;
  /** Called every frame with the playback state (null for legacy art). */
  onTick?: (s: AnimState | null) => void;
}

/** A front sprite playing its animation, at one or more zooms. */
export function animPlayer(env: LabEnv, o: PlayerOpts): AnimPlayer {
  const { reg, id } = o;
  const sport = !!o.sport;
  const anim = reg.speciesAnim(id);
  const order = legacyOrder(reg.frontFrameCount(id));
  const canvases = o.zooms.map((z) => pixelCanvas(56, 56, z));
  const gs = canvases.map(ctx2d);
  let idleOnly = o.intro === false;
  let start: number | null = null;
  let now = 0;
  let last = "";
  let loading = false;
  env.animate((f) => {
    now = f;
    if (start === null) start = f;
    let frame: number;
    let st: AnimState | null = null;
    if (anim) {
      st = idleOnly ? animState(anim, f) : animState(anim, f - start, { intro: true });
      frame = st.frame;
    } else frame = order[Math.floor(f / 24) % order.length];
    o.onTick?.(st);
    const path = spPath(id, frontKind(frame), sport);
    const img = reg.image(path) ?? reg.image(spPath(id, "front", sport));
    const key = `${path}:${img ? 1 : 0}`;
    if (!img && !loading) {
      loading = true;
      const want = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => spPath(id, frontKind(i), sport)).filter((p) => reg.resolve(p));
      void reg.loadAll(want).then(() => { loading = false; last = ""; });
    }
    if (key === last) return;
    last = key;
    for (const g of gs) {
      g.clearRect(0, 0, 56, 56);
      if (img) g.drawImage(img, 0, 0);
    }
  });
  const el = h("div", { class: "al-row", style: "gap: 10px; align-items: flex-end" },
    canvases.map((c, i) => h("div", { class: `al-stage ${env.bgClass()}`, title: `${o.zooms[i]}x` }, c)));
  return { el, replay: () => { start = now; idleOnly = false; } };
}

/** Back sprite and icons (2-frame bob) at a zoom. */
export function backAndIcon(env: LabEnv, reg: ArtRegistry, id: string, sport: boolean, zoom: number): HTMLElement {
  const back = pixelCanvas(48, 48, zoom), icon = pixelCanvas(16, 16, zoom);
  const gb = ctx2d(back), gi = ctx2d(icon);
  const two = !!reg.resolve(spPath(id, "icon__2", false));
  let lastB = "", lastI = "";
  env.animate((f) => {
    const b = reg.image(spPath(id, "back", sport));
    const ik: SpeciesFrameKind = two && Math.floor(f / 16) % 2 ? "icon__2" : "icon";
    const i = reg.image(spPath(id, ik, sport));
    if (!b || !i) void reg.loadAll([spPath(id, "back", sport), spPath(id, "icon", sport), spPath(id, "icon__2", sport)].filter((p) => reg.resolve(p)));
    const kb = b ? "b" : "", ki = i ? ik : "";
    if (kb !== lastB) { lastB = kb; gb.clearRect(0, 0, 48, 48); if (b) gb.drawImage(b, 0, 0); }
    if (ki !== lastI) { lastI = ki; gi.clearRect(0, 0, 16, 16); if (i) gi.drawImage(i, 0, 0); }
  });
  return h("div", { class: "al-row", style: "gap: 10px; align-items: flex-end" },
    h("div", { class: `al-stage ${env.bgClass()}`, title: "back" }, back),
    h("div", { class: `al-stage ${env.bgClass()}`, title: "icon" }, icon));
}

/**
 * The steps of `intro` and `idle` as blocks (width ∝ ticks) with a thumbnail
 * of each frame. `highlight(state)` marks the step that is playing.
 */
export function animTimeline(env: LabEnv, reg: ArtRegistry, id: string, anim: SpeciesAnim, sport = false): { el: HTMLElement; highlight(s: AnimState | null): void } {
  const blocks: Record<"intro" | "idle", HTMLElement[]> = { intro: [], idle: [] };
  const lane = (phase: "intro" | "idle", steps: SpeciesAnim["intro"]) => {
    if (!steps) return h("div", { class: "al-tl-lane" }, h("span", { class: "al-tl-lbl" }, phase),
      h("span", { class: "al-hint" }, phase === "idle" ? "none: holds frame 0" : "none"));
    const row = h("div", { class: "al-tl-steps" });
    steps.forEach(([frame, ticks], i) => {
      const thumb = pixelCanvas(56, 56, 0.5);
      const g = ctx2d(thumb);
      const path = spPath(id, frontKind(frame), sport);
      const paint = () => { const img = reg.image(path); if (img) { g.clearRect(0, 0, 56, 56); g.drawImage(img, 0, 0); return true; } return false; };
      if (!paint()) void reg.loadAll([path]).then(paint);
      const b = h("div", { class: "al-tl-step", style: `width: ${Math.max(34, Math.round(ticks * 2.2))}px`, title: `step ${i}: frame ${frame} (${frame ? `front__${frame + 1}` : "front"}) for ${ticks} ticks = ${sec(ticks)}` },
        thumb, h("div", { class: "t" }, `f${frame}`, h("br"), `${ticks}t`));
      blocks[phase].push(b);
      row.append(b);
    });
    const total = stepsLength(steps);
    return h("div", { class: "al-tl-lane" }, h("span", { class: "al-tl-lbl" }, phase, h("br"), h("small", null, `${total}t · ${sec(total)}`)), row);
  };
  const el = h("div", { class: "al-tl" }, lane("intro", anim.intro), lane("idle", anim.idle));
  let lastOn: HTMLElement | null = null;
  return {
    el,
    highlight(s) {
      const on = s && s.phase !== "hold" ? blocks[s.phase][s.step] ?? null : null;
      if (on === lastOn) return;
      lastOn?.classList.remove("on");
      on?.classList.add("on");
      lastOn = on;
    },
  };
}

/** The Animation section of the species tab. */
export function speciesAnimSection(env: LabEnv, id: string): HTMLElement[] {
  const { reg, state } = env;
  const anim = reg.speciesAnim(id);
  const tl = anim ? animTimeline(env, reg, id, anim, state.sport) : null;
  const player = animPlayer(env, { reg, id, sport: state.sport, zooms: [state.zoom], onTick: (s) => tl?.highlight(s) });
  return nn([
    h("h2", null, "Animation"),
    h("div", { class: "al-row", style: "align-items: center; margin-bottom: 8px" },
      h("button", { class: "al-btn", disabled: !anim?.intro, title: anim?.intro ? "Play the intro again" : "This species has no intro", onclick: () => player.replay() }, "▶ Intro"),
      h("span", { class: "al-hint" }, animSummary(reg, id)),
      reg.packs().length ? h("button", { class: "al-btn small", onclick: () => env.go("compare", id, comparePack(env)) }, "Compare with pack →") : null),
    h("div", { class: "al-row", style: "align-items: flex-start" }, h("div", { class: "al-card" }, player.el), tl ? tl.el : null),
    anim ? null : h("div", { class: "al-hint", style: "margin-top: 6px" },
      "No `anim` in species.json: the game ping-pongs the first ≤3 front frames. Add `anim.intro` / `anim.idle` (docs/ART.md §3) for a Crystal-style entrance."),
  ]);
}

// ---------------------------------------------------------------------------
// Compare view
// ---------------------------------------------------------------------------

const forks = new Map<string, { v: number; r: ArtRegistry }>();
function forkOf(reg: ArtRegistry, packs: string[]): ArtRegistry {
  const k = packs.join(",");
  const hit = forks.get(k);
  if (hit && hit.v === reg.version) return hit.r;
  const r = reg.fork(packs);
  forks.set(k, { v: reg.version, r });
  return r;
}

/** The pack the compare view shows: the route's, else `classic` (the pre-Crystal art), else the first pack. */
export function comparePack(env: LabEnv): string | null {
  const ids = env.reg.packs().map((p) => p.id);
  const want = env.state.tab === "compare" ? env.state.sub : null;
  if (want && ids.includes(want)) return want;
  return ids.includes("classic") ? "classic" : ids[0] ?? null;
}

/** Species ids a pack overrides (or adds), in dex order (so evolution lines read in order). */
export function packSpecies(reg: ArtRegistry, pack: string | null): string[] {
  const order = (id: string) => { const i = (SPECIES_IDS as readonly string[]).indexOf(id); return i < 0 ? 1e9 : i; };
  return pack ? Object.keys(reg.index.packs[pack]?.species ?? {}).sort((a, b) => order(a) - order(b) || (a < b ? -1 : 1)) : [];
}

function swatches(pal: unknown): HTMLElement {
  if (!isPalette(pal)) return h("span", { class: "al-chip bad" }, "no palette");
  return h("div", { class: "al-swatches" }, pal.map((c) => h("div", { class: "al-swatch", style: "cursor: default", title: c },
    h("div", { class: "c", style: `background: ${c}` }), h("div", { class: "t" }, c.toLowerCase()))));
}

export function compareView(env: LabEnv, el: HTMLElement) {
  const { reg } = env;
  const pack = comparePack(env);
  const packs = reg.packs();
  if (!pack) { el.append(h("h1", null, "Compare"), h("div", { class: "al-empty" }, "No art packs to compare against.")); return; }
  const base = forkOf(reg, []);
  const withPack = forkOf(reg, [pack]);
  const packName = packs.find((p) => p.id === pack)?.name ?? pack;
  const players: AnimPlayer[] = [];
  const select = h("select", { class: "al-btn small", onchange: () => env.go("compare", env.state.id, select.value) },
    packs.map((p) => h("option", { value: p.id, selected: p.id === pack }, `${p.id} — ${p.name}`)));
  const replayAll = h("button", { class: "al-btn", onclick: () => players.forEach((p) => p.replay()) }, "▶ Replay intros");
  const id = env.state.id;

  if (!id || !reg.bundle("species", id)) {
    // Overview: every species the pack touches, base vs pack at 2x.
    const ids = packSpecies(reg, pack);
    el.append(h("h1", null, "Compare", h("span", { style: "color: var(--dim); font-weight: 400; margin-left: 10px; font-size: 15px" }, `base vs ${packName}`)),
      h("div", { class: "al-row", style: "align-items: center; margin: 8px 0 4px" }, h("span", { class: "al-hint" }, "Pack"), select, replayAll),
      h("div", { class: "al-hint" }, "Click a row for 1x/2x/4x, sport palettes, backs, icons and the timeline. This view ignores the pack toggles in the top bar."));
    if (!ids.length) { el.append(h("div", { class: "al-empty" }, `Pack ${pack} has no species yet.`)); return; }
    const grid = h("div", { class: "al-cmp-grid" }, h("div", { class: "al-hint" }), h("div", { class: "al-cmp-h" }, "BASE"), h("div", { class: "al-cmp-h" }, packName));
    for (const sid of ids) {
      const a = animPlayer(env, { reg: base, id: sid, zooms: [2] });
      const b = animPlayer(env, { reg: withPack, id: sid, zooms: [2] });
      players.push(a, b);
      grid.append(
        h("div", { class: "al-cmp-name", onclick: () => env.go("compare", sid, pack) }, h("b", null, sid), h("div", { class: "al-hint" }, env.game.data.species[sid as keyof typeof env.game.data.species]?.name ?? "")),
        h("div", { class: "al-card al-cmp-cell", onclick: () => a.replay() }, a.el, h("div", { class: "cap" }, animSummary(base, sid))),
        h("div", { class: "al-card al-cmp-cell", onclick: () => b.replay() }, b.el, h("div", { class: "cap" }, animSummary(withPack, sid))));
    }
    el.append(grid);
    return;
  }

  const inPack = packSpecies(reg, pack).includes(id);
  const all = packSpecies(reg, pack);
  const at = all.indexOf(id);
  const nav = (d: number) => all.length ? env.go("compare", all[(Math.max(0, at) + d + all.length) % all.length], pack) : undefined;
  el.append(...nn([
    h("h1", null, id, h("span", { style: "color: var(--dim); font-weight: 400; margin-left: 10px; font-size: 15px" }, `base vs ${packName}`)),
    h("div", { class: "al-row", style: "align-items: center; margin: 8px 0 4px" },
      h("span", { class: "al-hint" }, "Pack"), select, replayAll,
      h("button", { class: "al-btn small", onclick: () => nav(-1), disabled: !all.length }, "◀"),
      h("button", { class: "al-btn small", onclick: () => nav(1), disabled: !all.length }, "▶"),
      h("button", { class: "al-btn small", onclick: () => env.go("compare", null, pack) }, "All"),
      h("button", { class: "al-btn small", onclick: () => env.go("species", id) }, "Species tab")),
    inPack ? null : h("div", { class: "al-chip", style: "margin: 6px 0" }, `pack ${pack} doesn't override ${id}: both sides are the base art`),
  ]));

  const side = (r: ArtRegistry, label: string) => {
    const v = r.bundle("species", id)!;
    const anim = r.speciesAnim(id);
    const tl = anim ? animTimeline(env, r, id, anim) : null;
    const col = h("div", { class: "al-cmp-col" }, h("div", { class: "al-cmp-h" }, label));
    for (const sport of [false, true]) {
      if (sport && !r.resolve(spPath(id, "front", true))) continue;
      const p = animPlayer(env, { reg: r, id, sport, zooms: [1, 2, 4], onTick: sport ? undefined : (s) => tl?.highlight(s) });
      players.push(p);
      col.append(h("div", { class: "al-card", style: "margin-bottom: 10px; cursor: pointer", title: "Click to replay the intro", onclick: () => p.replay() },
        p.el,
        h("div", { class: "cap" }, h("b", null, sport ? "SPORT" : "NORMAL"), swatches(v.merged[sport ? "sport" : "palette"])),
        h("div", { style: "margin-top: 8px" }, backAndIcon(env, r, id, sport, 2))));
    }
    col.append(h("div", { class: "al-hint", style: "margin: 2px 0 8px" }, animSummary(r, id)));
    if (tl) col.append(tl.el);
    if (typeof v.merged.notes === "string" && v.layers.some((l) => l.pack === pack && "notes" in l.json)) {
      col.append(h("div", { class: "al-card", style: "margin-top: 10px" }, h("b", null, "Notes"), h("div", { class: "al-hint", style: "white-space: pre-wrap" }, v.merged.notes)));
    }
    return col;
  };
  el.append(h("div", { class: "al-cmp" }, side(base, "BASE"), side(withPack, packName)));
}
