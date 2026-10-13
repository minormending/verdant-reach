// The detail view for one trainer: header, live checks and the level strip,
// the team editor, type coverage, rematch previews, every place it stands
// (drawn with the guide's renderMap) and the wild plants there and one warp
// away.

import type { MapId } from "../contracts";
import { TILE } from "../contracts";
import type { ArtRegistry } from "../art";
import { h, type Child } from "../guide/dom";
import { portrait, speciesIcon } from "../guide/art";
import { renderMap, MAP_MARGIN, type MapPicture } from "../guide/mapRender";
import { encounterSets, type EncounterSet } from "../guide/indexer";
import type { TrainerDef } from "../contracts";
import type { Editor } from "./app";
import { KIND_LABELS, type CatalogRow, type TrainerLocation } from "./catalog";
import { adjacentMaps, levelContext, nearestHeal, nearestWild, nextLeader, wildRange, type LevelContext } from "./context";
import { balanceHint, councilRematch, coverage, memberWarnings, routeRematch } from "./team";
import { teamEditor, typePill } from "./teamview";

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const;

export interface DetailHooks {
  prev: (() => void) | null;
  next: (() => void) | null;
  playHere: ((loc: TrainerLocation) => void) | null;
  openChanges: () => void;
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function header(ed: Editor, row: CatalogRow, hooks: DetailHooks): HTMLElement {
  const e = ed.entry(row.id);
  const errs = ed.errorsFor(row.id);
  const chips: Child[] = [h("span.te-chip", KIND_LABELS[row.kind])];
  if (row.rematchEligible) chips.push(h("span.te-chip.good", { title: "Talk to them after a win to fight again, one level higher per rematch won" }, "route rematches"));
  if (row.councilSeat) chips.push(h("span.te-chip.good", "Council seat: +8 rematch"));
  if (ed.isEdited(row.id)) chips.push(h("span.te-chip.edited", "edited"));
  if (errs.length) chips.push(h("span.te-chip.bad", `${errs.length} error${errs.length === 1 ? "" : "s"}`));
  const story = row.story
    ? h("div.place.te-small", h("a", { href: `./guide.html#${row.story.sectionId}`, target: "_blank", rel: "noopener", title: "Open this section of the guidebook" },
      `${row.story.part} › ${row.story.title}`))
    : null;
  const variants = row.variant
    ? h("div.te-row.te-small", h("span.te-muted", "BRAM's starter variants:"),
      ...["oak", "chili", "lily"].map((l) => {
        const id = `${row.group}_${l}`;
        return ed.rowById.has(id)
          ? h<HTMLButtonElement>("button.te-btn.tiny", { type: "button", "aria-pressed": String(id === row.id), onclick: () => ed.select(id) }, l)
          : null;
      }))
    : null;
  const nav = h("div.nav.te-row",
    h<HTMLButtonElement>("button.te-btn.small", { type: "button", disabled: !hooks.prev, onclick: () => hooks.prev?.(), title: "Previous in the list" }, "← Prev"),
    h<HTMLButtonElement>("button.te-btn.small", { type: "button", disabled: !hooks.next, onclick: () => hooks.next?.(), title: "Next in the list" }, "Next →"),
    h<HTMLButtonElement>("button.te-btn.small.warn", { type: "button", disabled: !ed.isEdited(row.id), onclick: () => ed.revert(row.id), "data-key": "revert" }, "Revert"));
  return h("section.te-head",
    portrait(e.portrait, 2, `${e.className} ${e.name}`),
    h("div",
      h("h2", `${e.className} ${e.name}`),
      h("div.te-row", h("code", row.id), ...chips),
      story, variants,
      e.note ? h("p.te-note", e.note) : null),
    nav);
}

// ---------------------------------------------------------------------------
// Checks and the level strip
// ---------------------------------------------------------------------------

function strip(ctx: LevelContext, ed: Editor): HTMLElement {
  const { min, max } = ctx.scale;
  const pos = (lv: number) => `${((lv - min) / Math.max(1, max - min)) * 100}%`;
  const bar = (cls: string, r: { min: number; max: number } | null) => {
    const track = h("div.track");
    if (!r) { track.append(h("span.te-small.te-muted", { style: "padding-left:8px;line-height:18px" }, "none")); return track; }
    track.append(h(`div.bar.${cls}`, { style: `left:${pos(r.min)};width:calc(${pos(r.max)} - ${pos(r.min)})` }),
      h("span.lv.lo", { style: `left:${pos(r.min)}` }, r.min));
    if (r.max !== r.min) track.append(h("span.lv.hi", { style: `left:max(${pos(r.max)}, calc(${pos(r.min)} + 12px))` }, r.max));
    return track;
  };
  return h("div.te-strip",
    h("span", h("b", "This trainer")), bar("trainer", ctx.trainer),
    h("span", "Wild", ctx.wildMap ? ` (${ed.mapName(ctx.wildMap)})` : ""), bar("wild", ctx.wild),
    h("span", ctx.leader ? `Next leader (${ctx.leader.label})` : "Next leader"), bar("leader", ctx.leader?.range ?? null),
    h("span"), h("div.axis", h("span", `Lv ${min}`), h("span", `Lv ${max}`)));
}

function checks(ed: Editor, row: CatalogRow, hooks: DetailHooks): HTMLElement {
  const e = ed.entry(row.id);
  const errs = ed.errorsFor(row.id);
  const warns = e.team.flatMap((m, i) => memberWarnings(ed.data, row.id, m).filter((w) => w.kind !== "allowed").map((w) => `#${i + 1}: ${w.text}`));
  const all = ed.validation;
  const others = all.errors.length - errs.length;
  const lead = nextLeader(ed.rows, row);
  const wild = nearestWild(ed.world, row.maps, ed.labels);
  const ctx = levelContext(e, wildRange(wild.sets), wild.map,
    lead ? { id: lead.id, label: ed.label(lead.id), team: ed.entry(lead.id).team } : null);
  const hint = ed.isEdited(row.id) ? balanceHint(ed.data, e, ed.shipped(row.id)) : null;
  return h("section.te-card",
    h("h3", "Checks", h("small", "the build's own trainersFileErrors, live")),
    h("div.te-checks",
      errs.length ? errs.map((x) => h("div.te-err", x)) : h("div.te-ok", "✓ This trainer passes the loader's checks."),
      others > 0 ? h("div.te-err", `${others} error${others === 1 ? "" : "s"} in other trainers or the file. `,
        h<HTMLButtonElement>("button.te-btn.tiny", { type: "button", onclick: hooks.openChanges }, "Show")) : null,
      ...warns.map((w) => h("div.te-warn", w)),
      hint ? h("div.te-warn.allowed", `Balance hint: ${hint.text}${row.kind === "leader" || e.ai === "smart" ? " This fight may be a balance milestone: run npm test (balance.test.ts)." : ""}`) : null,
      ...ctx.hints.map((x) => h("div.te-warn", x))),
    h("h4", "Level context"), strip(ctx, ed));
}

// ---------------------------------------------------------------------------
// Coverage and rematches
// ---------------------------------------------------------------------------

function coverageCard(ed: Editor, row: CatalogRow): HTMLElement {
  const team = ed.entry(row.id).team.filter((m) => ed.data.species[m.species]);
  const cov = coverage(ed.data, team);
  const cell = (x: number) => h(`td.${x >= 4 ? "x4" : x > 1 ? "x2" : x === 0 ? "x0" : x < 1 ? "x05" : "x1"}`, x === 1 ? "" : x === 0.5 ? "½" : x === 0.25 ? "¼" : `${x}×`);
  const list = (title: string, ts: readonly string[]) => h("div.te-row.te-small", h("b", title), ts.length ? ts.map((t) => typePill(t as never)) : h("span.te-muted", "none"));
  return h("section.te-card",
    h("h3", "Type coverage", h("small", "attacking type against each member, from the game's type chart")),
    h("div.te-cov-wrap", h("table.te-cov",
      h("tr", h("th", "Attack"), ...team.map((m) => h("th", speciesIcon(m.species, 1, ed.speciesName(m.species)))), h("th", "Weak"), h("th", "Resist"), h("th", "Immune")),
      ...cov.defence.map((r) => h("tr", h("td", typePill(r.type)), ...r.each.map(cell), h("td.sum", r.weak || ""), h("td.sum", r.resist || ""), h("td.sum", r.immune || ""))))),
    h("div.te-checks", { style: "margin-top:8px" },
      list("Threats (more weak than resist):", cov.threats),
      list("Damaging move types:", cov.moveTypes),
      list("Hits super-effectively:", cov.hitsSuper),
      list("No neutral hit on:", cov.walledBy)));
}

const rematchWins = new Map<string, number>();

function teamLine(ed: Editor, t: TrainerDef): HTMLElement {
  return h("div.te-teamline", ...t.team.map((m) => h("span.m", speciesIcon(m.species, 2, ""), `${ed.speciesName(m.species)} Lv ${m.level}`,
    m.moves ? h("span.te-muted", ` (${m.moves.map((x) => ed.data.moves[x]?.name ?? x).join(", ")})`) : null)));
}

function rematchCard(ed: Editor, row: CatalogRow): HTMLElement | null {
  const def = ed.def(row.id);
  const body: Child[] = [];
  if (!def) body.push(h("div.te-muted.te-small", "Fix the errors above to preview rematches."));
  else if (row.rematchEligible) {
    const wins = rematchWins.get(row.id) ?? 0;
    const slider = h<HTMLInputElement>("input", { type: "range", min: 0, max: 20, value: wins, "aria-label": "Rematches already won", "data-key": "rm-wins" });
    const out = h("div");
    const show = () => {
      const n = Number(slider.value);
      rematchWins.set(row.id, n);
      const r = routeRematch(ed.data, def, n);
      out.replaceChildren(h("div.te-small", `Rematch ${n + 1} (after ${n} rematch${n === 1 ? "" : "es"} won): every member +${n + 1}, grown where it reaches its growth level; no prize.`), teamLine(ed, r));
    };
    slider.addEventListener("input", show);
    show();
    body.push(h("label.te-check.te-small", "Rematches won ", slider), out);
  }
  if (def && row.councilSeat) {
    const r = councilRematch(def);
    body.push(h("div.te-small", h("b", `${r.id}`), ` — the post-game seat, built from this team at +8 (prize $${r.prize}${row.id === "rowan" ? ", ROWAN's set at $5000" : ""}).`), teamLine(ed, r));
  }
  if (!row.rematchEligible && !row.councilSeat) {
    body.push(h("div.te-small.te-muted", row.kind === "trainer"
      ? "No route rematches: only outdoor trainers fought through the NPC flow can be rematched (Conservatory juniors and the Palm House are indoors)."
      : "No rematches: rivals, Rootstock and leaders are story fights."));
  }
  return h("section.te-card", h("h3", "Rematch preview", h("small", "the game's own builders (rematches.ts)")), ...body);
}

// ---------------------------------------------------------------------------
// Places and wild plants
// ---------------------------------------------------------------------------

const pictures = new Map<string, Promise<MapPicture>>();

function picture(reg: ArtRegistry, ed: Editor, map: MapId, flags: Record<string, boolean>): Promise<MapPicture> {
  const key = `${map}|${JSON.stringify(flags)}`;
  let p = pictures.get(key);
  if (!p) { p = renderMap(reg, ed.world.maps[map], flags); pictures.set(key, p); }
  return p;
}

function mapBox(reg: ArtRegistry, ed: Editor, loc: TrainerLocation): HTMLElement {
  const box = h("div.te-mapbox", h("p.boot", "Drawing the map…"));
  const flags: Record<string, boolean> = {};
  for (const c of loc.visibleWhen ?? []) flags[c.flag] = c.is;
  void picture(reg, ed, loc.map, flags).then((pic) => {
    const c = h<HTMLCanvasElement>("canvas.px", { width: pic.canvas.width, height: pic.canvas.height, role: "img", "aria-label": `${loc.mapName} with the trainer marked` });
    const g = c.getContext("2d")!;
    g.imageSmoothingEnabled = false;
    g.drawImage(pic.canvas, 0, 0);
    const scale = pic.canvas.width <= 440 ? 2 : 1;
    c.style.width = `${pic.canvas.width * scale}px`;
    c.style.height = `${pic.canvas.height * scale}px`;
    if (loc.x !== undefined && loc.y !== undefined) {
      const px = (x: number) => (x + MAP_MARGIN) * TILE;
      if (loc.facing && loc.sight && loc.how !== "script") {
        const [dx, dy] = DIRS[loc.facing];
        g.fillStyle = "rgba(240, 184, 58, 0.45)";
        for (let k = 1; k <= loc.sight; k++) {
          const x = loc.x + dx * k;
          const y = loc.y + dy * k;
          if (x < 0 || y < 0 || x >= pic.w || y >= pic.h) break;
          g.fillRect(px(x), px(y), TILE, TILE);
        }
      }
      g.lineWidth = 2;
      g.strokeStyle = "#181818";
      g.strokeRect(px(loc.x) - 2, px(loc.y) - 2, TILE + 4, TILE + 4);
      g.strokeStyle = "#f06a4c";
      g.strokeRect(px(loc.x), px(loc.y), TILE, TILE);
    }
    box.replaceChildren(c);
    if (loc.x !== undefined && loc.y !== undefined) {
      requestAnimationFrame(() => {
        box.scrollLeft = (loc.x! + MAP_MARGIN + 0.5) * TILE * scale - box.clientWidth / 2;
        box.scrollTop = (loc.y! + MAP_MARGIN + 0.5) * TILE * scale - box.clientHeight / 2;
      });
    }
  }).catch((err: unknown) => box.replaceChildren(h("p.boot", `Could not draw the map: ${String(err)}`)));
  return box;
}

const HOW = { sight: "Sight battle (spots you; you can also talk to them)", talk: "Talk battle (sight 0)", script: "Script battle (a story fight)" };

function placeCard(reg: ArtRegistry, ed: Editor, row: CatalogRow, hooks: DetailHooks): HTMLElement {
  const cards: Child[] = [];
  for (const loc of row.locations) {
    const heal = nearestHeal(ed.world, loc.map);
    const facts = h("dl.te-facts",
      h("dt", "Map"), h("dd", h("b", loc.mapName), " ", h("code", loc.map), loc.outdoor ? " · outdoor" : " · indoor"),
      h("dt", "Battle"), h("dd", HOW[loc.how]),
      loc.npcId ? [h("dt", "NPC"), h("dd", h("code", loc.npcId))] : null,
      loc.x !== undefined ? [h("dt", "Tile"), h("dd", `x ${loc.x}, y ${loc.y}${loc.facing ? `, facing ${loc.facing}` : ""}`)] : [h("dt", "Tile"), h("dd", "no fixed spot (runs on arrival)")],
      loc.how !== "script" ? [h("dt", "Sight"), h("dd", `${loc.sight} tile${loc.sight === 1 ? "" : "s"} (shaded)`)] : null,
      loc.scriptId ? [h("dt", "Script"), h("dd", h("code", loc.scriptId), loc.source ? ` (${loc.source})` : "")] : null,
      h("dt", "When"), h("dd", loc.when.length ? loc.when.join("; ") : "always"),
      loc.visibleWhen ? [h("dt", "visibleWhen"), h("dd", h("code", loc.visibleWhen.map((c) => `${c.flag}=${c.is}`).join(", ")))] : null,
      h("dt", "Route rematches"), h("dd", row.rematchEligible ? "yes" : "no"),
      heal ? [h("dt", "Nearest heal"), h("dd", heal.warps === 0 ? `${heal.name} (here)` : `${heal.name} (${heal.warps} warp${heal.warps === 1 ? "" : "s"} away)`)] : null,
      hooks.playHere ? h("dd", { style: "margin-top:8px" }, h<HTMLButtonElement>("button.te-btn.small.primary", { type: "button", onclick: () => hooks.playHere!(loc) }, "Play here ▶")) : null);
    cards.push(h("div.te-place", mapBox(reg, ed, loc), facts));
  }
  return h("section.te-card", h("h3", "Where", h("small", `${row.locations.length} place${row.locations.length === 1 ? "" : "s"}`)), ...cards);
}

function wildTables(ed: Editor, sets: EncounterSet[]): Child {
  if (!sets.some((s) => s.tables.length)) return h("div.te-muted.te-small", "No wild plants.");
  const out: Child[] = [];
  for (const s of sets) {
    if (s.label) out.push(h("div.te-variant", s.when ? `Variant: ${s.label}` : s.label));
    for (const t of s.tables) {
      out.push(h("table.te-wild",
        h("tr", h("th", `${t.method} · ${t.rate}% per step`), h("th", "Level"), h("th", "Day"), h("th", "Night")),
        ...t.rows.map((r) => h("tr",
          h("td.sp", speciesIcon(r.species, 2, ""), ed.speciesName(r.species), r.time !== "any" ? h("span.te-chip", `${r.time} only`) : null),
          h("td", r.minLevel === r.maxLevel ? `${r.minLevel}` : `${r.minLevel}–${r.maxLevel}`),
          h("td", r.dayPct === null ? "—" : `${r.dayPct}%`), h("td", r.nightPct === null ? "—" : `${r.nightPct}%`)))));
    }
  }
  return out;
}

function wildCard(ed: Editor, row: CatalogRow): HTMLElement {
  const out: Child[] = [];
  const shown = new Set<MapId>();
  for (const m of row.maps) {
    shown.add(m);
    out.push(h("h4", ed.mapName(m)), wildTables(ed, encounterSets(ed.world.maps[m], ed.labels)));
  }
  const adj = [...new Set(row.maps.flatMap((m) => adjacentMaps(ed.world, m)))].filter((m) => !shown.has(m));
  if (adj.length) out.push(h("h4", "One warp away"));
  for (const m of adj) {
    const sets = encounterSets(ed.world.maps[m], ed.labels);
    const r = wildRange(sets);
    const d = h<HTMLDetailsElement>("details.te-adj", h("summary", ed.mapName(m), " ", h("span.te-muted.te-small", r ? `Lv ${r.min}–${r.max}` : "no wild plants")));
    let filled = false;
    d.addEventListener("toggle", () => { if (d.open && !filled) { filled = true; d.append(h("div", wildTables(ed, sets))); } });
    out.push(d);
  }
  return h("section.te-card", h("h3", "Available plants", h("small", "wild encounters on the trainer's map, then maps one warp away")), ...out);
}

export function renderDetail(reg: ArtRegistry, ed: Editor, row: CatalogRow, hooks: DetailHooks): HTMLElement {
  return h("div",
    header(ed, row, hooks),
    checks(ed, row, hooks),
    teamEditor(ed, row.id),
    coverageCard(ed, row),
    rematchCard(ed, row),
    placeCard(reg, ed, row, hooks),
    wildCard(ed, row));
}
