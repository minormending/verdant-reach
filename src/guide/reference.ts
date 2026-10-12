// The reference sections after the walkthrough: the Herbarium (every species),
// moves, items, the type chart and trainers by map.

import type { Item, Move, TypeId } from "../contracts";
import { SPECIES_IDS, TYPES } from "../contracts";
import { typeEffectiveness } from "../battle/logic/damage";
import { h } from "./dom";
import { itemIcon, portrait, speciesFront, speciesIcon } from "./art";
import type { Guide } from "./context";
import { itemWhere, whereFound } from "./blocks";
import { learnedBy, starterVariant, trainersByMap } from "./indexer";
import {
  ACTIVITY, TYPE_NAMES, accCell, anchor, catPill, dexNo, growthText, mapLink, money, moveTable, sectionHeading, speciesLink,
  starterChoiceLabel, statBars, typePill, typePills,
} from "./ui";

export interface RefSection { id: string; title: string; el: HTMLElement }

export function referenceSections(g: Guide): RefSection[] {
  return [
    { id: "herbarium", title: "Field Herbarium", el: herbarium(g) },
    { id: "moves", title: "Moves", el: movesRef(g) },
    { id: "items", title: "Items", el: itemsRef(g) },
    { id: "types", title: "Type chart", el: typeChart(g) },
    { id: "trainers", title: "Trainers by map", el: trainersRef(g) },
  ];
}

// ---------------------------------------------------------------------------
// Herbarium
// ---------------------------------------------------------------------------

function herbarium(g: Guide): HTMLElement {
  const filter = h<HTMLInputElement>("input.filter", { type: "search", placeholder: "Filter by name or type…", "aria-label": "Filter the Herbarium" });
  const grid = h("div.herb-grid", SPECIES_IDS.filter((id) => g.data.species[id]).map((id) => herbEntry(g, id)));
  filter.addEventListener("input", () => {
    const q = filter.value.trim().toLowerCase();
    for (const el of Array.from(grid.children) as HTMLElement[]) el.hidden = !!q && !(el.dataset.search ?? "").includes(q);
  });
  return h("section.ref", { id: "herbarium" },
    sectionHeading(2, "herbarium-h", "Field Herbarium", "Reference"),
    h("p.lead", `All ${SPECIES_IDS.length} Quickened in Herbarium order: base stats, growth, learnset, the Herbarium page and every place to find them.`),
    h("div.toolbar", filter),
    grid,
  );
}

function herbEntry(g: Guide, id: (typeof SPECIES_IDS)[number]): HTMLElement {
  const sp = g.data.species[id];
  const herb = g.data.herbarium[id];
  const line = Object.values(g.data.species).filter((s) => s.line === sp.line).sort((a, b) => a.stage - b.stage);
  return h("article.herb", { id: anchor.species(id), "data-search": `${sp.name} ${sp.types.join(" ")} ${herb?.scientificName ?? ""} ${dexNo(id)}`.toLowerCase() },
    h("header.herb-head",
      h("div.herb-art", speciesFront(id, 2, sp.name)),
      h("div",
        h("div.sc-no", dexNo(id), herb ? ` · ${herb.category}` : ""),
        h("h3", sp.name),
        herb ? h("div.sci", herb.scientificName) : null,
        typePills(sp.types),
        h("dl.facts",
          h("dt", "Stage"), h("dd", `${sp.stage} of ${line.length}`),
          herb ? [h("dt", "Size"), h("dd", `${herb.heightM} m · ${herb.weightKg} kg`)] : null,
          h("dt", "Catch rate"), h("dd", String(sp.catchRate)),
          h("dt", "Active"), h("dd", ACTIVITY[sp.activity]),
          h("dt", "Growth"), h("dd", sp.growthRate),
          h("dt", "Pollination"), h("dd", sp.pollination?.length ? sp.pollination.join(", ") : "cannot set seed"),
        ),
      ),
    ),
    herb ? h("blockquote.entry", herb.entry) : null,
    h("div.herb-cols",
      h("div",
        h("h5", "Base stats"),
        statBars(sp.baseStats),
        h("h5", "Growth"),
        h("ol.line", line.map((s, i) => h("li",
          s.id === id ? h("strong.sp-link", speciesIcon(s.id, 2), h("span", s.name)) : speciesLink(g, s.id),
          line[i - 1]?.growsInto ? h("small.muted", ` ${growthText(g, line[i - 1].growsInto!.trigger)}`) : null,
        ))),
        h("h5", "Where to find it"),
        whereFound(g, id),
      ),
      h("div",
        h("h5", "Learnset"),
        moveTable(g, sp.learnset.map((e) => e.move), "Lv", sp.learnset.map((e) => e.level)),
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Moves
// ---------------------------------------------------------------------------

type MoveKey = "name" | "type" | "category" | "power" | "accuracy" | "pp" | "priority";

function movesRef(g: Guide): HTMLElement {
  const learners = learnedBy(g.data);
  const all = Object.values(g.data.moves);
  let key: MoveKey | null = null;
  let dir = 1;
  const q = h<HTMLInputElement>("input.filter", { type: "search", placeholder: "Filter moves…", "aria-label": "Filter moves" });
  const typeSel = h<HTMLSelectElement>("select", { "aria-label": "Type" }, h("option", { value: "" }, "All types"), TYPES.map((t) => h("option", { value: t }, TYPE_NAMES[t])));
  const catSel = h<HTMLSelectElement>("select", { "aria-label": "Category" },
    h("option", { value: "" }, "All categories"), h("option", { value: "physical" }, "Physical"), h("option", { value: "special" }, "Special"), h("option", { value: "status" }, "Status"));
  const tbody = h("tbody");
  const rows = new Map<string, HTMLElement>(all.map((m) => [m.id, moveRow(g, m, learners.get(m.id)?.length ?? 0)]));
  const cols: [MoveKey | null, string, string][] = [["name", "Move", ""], ["type", "Type", ""], ["category", "Cat.", ""], ["power", "Pow", "num"], ["accuracy", "Acc", "num"], ["pp", "PP", "num"], ["priority", "Pri", "num"], [null, "Effect", ""]];
  const head = h("tr", cols.map(([k, label, cls]) => {
    if (!k) return h("th", label);
    const b = h<HTMLButtonElement>("button.sort", { type: "button" }, label);
    b.addEventListener("click", () => { dir = key === k ? -dir : 1; key = k; draw(); });
    return h("th", { class: cls, "aria-sort": "none" }, b);
  }));
  const val = (m: Move, k: MoveKey): string | number => (k === "accuracy" ? (m.accuracy ?? 101) : (m[k] as string | number));
  const draw = () => {
    const text = q.value.trim().toLowerCase();
    let list = all.filter((m) => (!typeSel.value || m.type === typeSel.value) && (!catSel.value || m.category === catSel.value)
      && (!text || `${m.name} ${m.description}`.toLowerCase().includes(text)));
    if (key) {
      const k = key;
      list = [...list].sort((a, b) => {
        const x = val(a, k);
        const y = val(b, k);
        return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * dir;
      });
    }
    tbody.replaceChildren(...list.map((m) => rows.get(m.id)!));
    head.querySelectorAll("th").forEach((th, i) => th.setAttribute("aria-sort", cols[i][0] && cols[i][0] === key ? (dir > 0 ? "ascending" : "descending") : "none"));
    count.textContent = `${list.length} of ${all.length} moves`;
  };
  const count = h("span.muted.small");
  q.addEventListener("input", draw);
  typeSel.addEventListener("change", draw);
  catSel.addEventListener("change", draw);
  draw();
  return h("section.ref", { id: "moves" },
    sectionHeading(2, "moves-h", "Moves", "Reference"),
    h("p.lead", "Every move. Physical moves use ATK against DEF; special moves use SP.ATK against SP.DEF, whatever their type. Click a heading to sort."),
    h("div.toolbar", q, typeSel, catSel, count),
    h("div.scroll", h("table.moves.full", h("thead", head), tbody)),
  );
}

function moveRow(g: Guide, m: Move, learners: number): HTMLElement {
  return h("tr", { id: anchor.move(m.id) },
    h("td", h("strong", m.name)), h("td", typePill(m.type)), h("td", catPill(m.category)),
    h("td.num", m.power || "—"), accCell(m.accuracy), h("td.num", m.pp), h("td.num", m.priority || ""),
    h("td.small", m.description, learners ? h("span.muted", ` · ${learners} learn${learners === 1 ? "s" : ""} it`) : null),
  );
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

const POCKETS: [Item["pocket"], string][] = [["items", "Items"], ["pods", "Pods"], ["key", "Key items"]];

function itemsRef(g: Guide): HTMLElement {
  const items = Object.values(g.data.items);
  return h("section.ref", { id: "items" },
    sectionHeading(2, "items-h", "Items", "Reference"),
    h("p.lead", "Every item by bag pocket, with its price at a market and every place it turns up: on the ground, hidden (press A facing the sparkle), from berry bushes, for sale or given."),
    POCKETS.map(([pocket, label]) => h("div.pocket",
      h("h3", label),
      h("div.scroll", h("table.items-ref",
        h("thead", h("tr", h("th", ""), h("th", "Item"), h("th.num", "Price"), h("th", "Description"), h("th", "Where found"))),
        h("tbody", items.filter((i) => i.pocket === pocket).map((i) => h("tr", { id: anchor.item(i.id) },
          h("td", itemIcon(i.id, i.pocket, 2)),
          h("td", h("strong", i.name)),
          h("td.num", i.price ? money(i.price) : "—"),
          h("td.small", i.description),
          h("td.small", itemWhere(g, i.id)),
        ))),
      )),
    )),
  );
}

// ---------------------------------------------------------------------------
// Type chart
// ---------------------------------------------------------------------------

function typeChart(g: Guide): HTMLElement {
  const cell = (atk: TypeId, def: TypeId) => {
    const m = typeEffectiveness(g.data.typeChart, atk, [def]);
    const cls = m > 1 ? "se" : m < 1 ? "nve" : "";
    return h("td", { class: cls, title: `${TYPE_NAMES[atk]} → ${TYPE_NAMES[def]}: ×${m}` }, m === 1 ? "" : m > 1 ? `×${m}` : `×${m}`.replace("0.5", "½"));
  };
  return h("section.ref", { id: "types" },
    sectionHeading(2, "types-h", "Type chart", "Reference"),
    h("p.lead", "Attacking type down the side, defending type along the top. Green cells hit for double, red for half; blank is normal. No type is immune to another: every plant is made of living cells. Against two types, the multipliers multiply."),
    h("div.scroll", h("table.type-chart",
      h("thead", h("tr", h("th.corner", h("span", "ATK ↓ / DEF →")), TYPES.map((t) => h("th", h("span.vert", typePill(t)))))),
      h("tbody", TYPES.map((atk) => h("tr", h("th", typePill(atk)), TYPES.map((def) => cell(atk, def))))),
    )),
  );
}

// ---------------------------------------------------------------------------
// Trainers by map
// ---------------------------------------------------------------------------

function trainersRef(g: Guide): HTMLElement {
  const list = trainersByMap([...g.finds.values()]);
  return h("section.ref", { id: "trainers" },
    sectionHeading(2, "trainers-h", "Trainers by map", "Reference"),
    h("p.lead", "Every trainer, map by map in story order, with their team and prize money. Numbers match the trainer markers on each map. BRAM fields a different starter depending on yours."),
    list.map(({ map, trainers }) => h("div.tr-map",
      h("h3", mapLink(g, map)),
      h("div.scroll", h("table.tr-table", h("tbody", trainers.flatMap((t) => t.ids.map((id, i) => {
        const tr = g.world.trainers[id];
        if (!tr) return null;
        return h("tr",
          h("td.num.shrink", i === 0 && t.n !== null ? h("span.mk.mk-inline.mk-trainer", t.n) : ""),
          h("td.shrink", portrait(tr.portrait, 1, "")),
          h("td", h("div.tclass", tr.className), h("strong", tr.name), t.ids.length > 1 ? h("div.small.muted", variantNote(g, id)) : null),
          h("td", h("span.team-inline", tr.team.map((m) => h("a.mini", { href: `#${anchor.species(m.species)}`, title: g.data.species[m.species]?.name ?? m.species }, speciesIcon(m.species, 2), h("small", `Lv ${m.level}`))))),
          h("td.num.shrink", money(tr.prize)),
        );
      }))))),
    )),
    h("p.small.muted", `${Object.keys(g.world.trainers).length} trainer battles in all (counting BRAM's variants and rematches), across ${list.length} maps.`),
  );
}

function variantNote(g: Guide, id: string): string {
  if (/_rematch$/.test(id)) return "Post-game rematch";
  const line = starterVariant(id);
  return line ? starterChoiceLabel(g, line) : "";
}
