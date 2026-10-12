// Shared pieces of the guide page: type pills, links, level ranges, stat
// bars, team lists and move tables.

import type { GrowthTrigger, ItemId, MapId, MoveId, Species, SpeciesId, Stats, TrainerDef, TypeId } from "../contracts";
import { SPECIES_IDS } from "../contracts";
import { movesAtLevel } from "../battle";
import { COUNTER, STARTER_LINES, STARTER_SPECIES } from "../world/trainers";
import { h, type Child } from "./dom";
import { itemIcon, speciesIcon } from "./art";
import type { Guide } from "./context";

export const TYPE_NAMES: Record<TypeId, string> = {
  wood: "WOOD", fire: "FIRE", water: "WATER", bug: "BUG", bloom: "BLOOM", ghost: "GHOST", thorn: "THORN", frost: "FROST", dragon: "DRAGON",
};

export const typePill = (t: TypeId) => h("span.pill", { class: `t-${t}` }, TYPE_NAMES[t]);
export const typePills = (ts: readonly TypeId[]) => h("span.pills", ts.map(typePill));
export const catPill = (c: "physical" | "special" | "status") =>
  h("span.cat", { class: `c-${c}`, title: c }, c === "physical" ? "PHYS" : c === "special" ? "SPEC" : "STAT");

export const dexNo = (id: SpeciesId) => `#${String(SPECIES_IDS.indexOf(id) + 1).padStart(3, "0")}`;

export const levels = (min: number, max: number) => (min === max ? `Lv ${min}` : `Lv ${min}–${max}`);
export const pct = (n: number | null) => (n === null ? "—" : `${Number.isInteger(n) ? n : n.toFixed(1)}%`);
export const money = (n: number) => `₽${n.toLocaleString("en-GB")}`.replace("₽", "$");

export const anchor = {
  species: (id: SpeciesId) => `sp-${id}`,
  item: (id: ItemId) => `item-${id}`,
  move: (id: MoveId) => `move-${id}`,
  map: (id: MapId) => `map-${id}`,
  trainer: (id: string) => `tr-${id}`,
};

export function speciesName(g: Guide, id: SpeciesId): string {
  return g.data.species[id]?.name ?? id;
}

export function speciesLink(g: Guide, id: SpeciesId, icon = true): HTMLElement {
  return h("a.sp-link", { href: `#${anchor.species(id)}` }, icon ? speciesIcon(id, 2) : null, h("span", speciesName(g, id)));
}

export function itemLink(g: Guide, id: ItemId, icon = true): HTMLElement {
  const it = g.data.items[id];
  return h("a.item-link", { href: `#${anchor.item(id)}` }, icon && it ? itemIcon(id, it.pocket, 1) : null, h("span", it?.name ?? id));
}

export function moveLink(g: Guide, id: MoveId): HTMLElement {
  return h("a.move-link", { href: `#${anchor.move(id)}` }, g.data.moves[id]?.name ?? id);
}

export function mapName(g: Guide, id: MapId): string {
  return g.world.maps[id]?.name ?? id;
}

export function mapLink(g: Guide, id: MapId): HTMLElement {
  return g.mapPanels.has(id) ? h("a.map-link", { href: `#${anchor.map(id)}` }, mapName(g, id)) : h("span.map-link", mapName(g, id));
}

export const STAT_LABELS: [keyof Stats, string][] = [["hp", "HP"], ["atk", "ATK"], ["def", "DEF"], ["spa", "SP.ATK"], ["spd", "SP.DEF"], ["spe", "SPEED"]];

export function statBars(s: Stats): HTMLElement {
  const total = STAT_LABELS.reduce((n, [k]) => n + s[k], 0);
  return h("table.stats", h("tbody",
    STAT_LABELS.map(([k, label]) => h("tr",
      h("th", label), h("td.num", s[k]),
      h("td.bar", h("span", { style: `width:${Math.min(100, (s[k] / 160) * 100)}%`, class: s[k] >= 100 ? "hi" : s[k] < 50 ? "lo" : "" })),
    )),
    h("tr.total", h("th", "TOTAL"), h("td.num", total), h("td")),
  ));
}

export function growthText(g: Guide, t: GrowthTrigger): string {
  switch (t.kind) {
    case "vigor": return `Lv ${t.level}`;
    case "vigor_day": return `Lv ${t.level}, by day`;
    case "vigor_night": return `Lv ${t.level}, at night`;
    case "tending": return `Tending (friendship ${t.friendship}+)`;
    case "item": return `Use ${(g.data.items[t.item]?.name ?? t.item).toUpperCase()}`;
    case "cross_pollination": return "Cross-pollination (trade)";
  }
}

export const ACTIVITY: Record<Species["activity"], string> = { any: "Any time", day: "Day-active", night: "Night-active" };

/** The moves a trainer's team member battles with (its listed set, or the engine's level moves). */
export function memberMoves(g: Guide, m: TrainerDef["team"][number]): MoveId[] {
  if (m.moves?.length) return m.moves.slice(0, 4);
  const sp = g.data.species[m.species];
  return sp ? movesAtLevel(sp, m.level, (id) => (g.data.moves[id]?.power ?? 0) > 0) : [];
}

export function moveRow(g: Guide, id: MoveId, lead?: Child): HTMLElement {
  const mv = g.data.moves[id];
  if (!mv) return h("tr", h("td", { colspan: 7 }, id));
  return h("tr",
    lead !== undefined ? h("td.num", lead) : null,
    h("td", moveLink(g, id)), h("td", typePill(mv.type)), h("td", catPill(mv.category)),
    h("td.num", mv.power || "—"), accCell(mv.accuracy), h("td.num", mv.pp),
  );
}

/** Accuracy; a move that never misses shows a dash (its tooltip says so). */
export const accCell = (acc: number | null) => (acc === null ? h("td.num", { title: "Never misses" }, "—") : h("td.num", acc));

export function moveTable(g: Guide, ids: MoveId[], leadHeader?: string, leads?: Child[]): HTMLElement {
  return h("div.scroll", h("table.moves",
    h("thead", h("tr", leadHeader ? h("th", leadHeader) : null, h("th", "Move"), h("th", "Type"), h("th", "Cat."), h("th.num", "Pow"), h("th.num", "Acc"), h("th.num", "PP"))),
    h("tbody", ids.map((id, i) => moveRow(g, id, leads ? leads[i] : undefined))),
  ));
}

/** A trainer's team: icon, name, level and types per member, with its moves behind a toggle. */
export function teamList(g: Guide, t: TrainerDef, opts: { open?: boolean } = {}): HTMLElement {
  return h("ol.team", t.team.map((m) => {
    const sp = g.data.species[m.species];
    return h("li",
      h("details", { open: opts.open || undefined },
        h("summary",
          speciesIcon(m.species, 2),
          h("a.sp-name", { href: `#${anchor.species(m.species)}` }, sp?.name ?? m.species),
          h("span.lv", `Lv ${m.level}`),
          sp ? typePills(sp.types) : null,
          m.grafted ? h("span.badge.graft", { title: "Grafted: stats from five levels lower" }, "GRAFT COLLAR") : null,
        ),
        moveTable(g, memberMoves(g, m)),
      ),
    );
  }));
}

export const trainerTitle = (t: TrainerDef) => `${t.className} ${t.name}`;

/** "Fought if you chose OAK ACORN" label for a rival's starter variant. */
export function starterChoiceLabel(g: Guide, line: "oak" | "chili" | "lily"): string {
  // BRAM holds the starter strong against yours: his line is COUNTER[yours].
  const yours = STARTER_LINES.find((l) => COUNTER[l] === line) ?? line;
  return `If you chose ${speciesName(g, STARTER_SPECIES[yours][0]).toUpperCase()}`;
}

export function sectionHeading(level: 2 | 3, id: string, text: string, kicker?: string): HTMLElement {
  return h(`h${level}`, { id }, kicker ? h("span.kicker", kicker) : null, h("span", text), h("a.hash", { href: `#${id}`, "aria-label": "Link to this section" }, "#"));
}
