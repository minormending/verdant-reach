// Walkthrough blocks: text, tips and lists, plus the data blocks expanded from
// the game's own data (map panels, boss cards, species and item cards).

import type { ItemId, MapId, SpeciesId, TrainerDef } from "../contracts";
import { isRematchTrainer } from "../world/rematches";
import { h, inline, type Child } from "./dom";
import { art, itemIcon, portrait, speciesFront, speciesIcon } from "./art";
import type { Guide } from "./context";
import {
  activeEncounterSet, condLabel, forcedTime, groupMembers, starterVariant, trainerGroup,
  type EncounterSet, type MapFinds, type MapTrainer, type Method, type SpeciesSource,
} from "./indexer";
import { MAP_MARGIN, mapSize, renderMap } from "./mapRender";
import type { Block } from "./types";
import {
  anchor, dexNo, growthText, itemLink, levels, mapLink, memberMoves, money, moveTable, pct,
  speciesLink, starterChoiceLabel, statBars, teamList, trainerTitle, typePills,
} from "./ui";

// ---------------------------------------------------------------------------
// Block dispatch
// ---------------------------------------------------------------------------

/** Element ids already used, so a map shown twice gets `map-x` then `map-x-2`. */
const usedIds = new Map<string, number>();
export function uniqueId(base: string): string {
  const n = (usedIds.get(base) ?? 0) + 1;
  usedIds.set(base, n);
  return n === 1 ? base : `${base}-${n}`;
}

export function renderBlock(g: Guide, b: Block): HTMLElement {
  if ("p" in b) return h("p", inline(b.p));
  if ("tip" in b) return h("aside.tip", h("strong.tip-title", b.title ?? "TIP"), h("div", inline(b.tip)));
  if ("list" in b) return h("ul.list", b.list.map((li) => h("li", inline(li))));
  if ("checklist" in b) {
    return h("aside.checklist", h("strong.tip-title", "BEFORE YOU LEAVE"),
      h("ul", b.checklist.map((li) => h("li", h("span.box", { "aria-hidden": "true" }), h("span", inline(li))))));
  }
  if ("map" in b) return mapPanel(g, b.map, b.flags ?? {}, b.note);
  if ("boss" in b) return bossCard(g, b.boss, b.note);
  if ("species" in b) return speciesCard(g, b.species, b.note);
  if ("item" in b) return itemCard(g, b.item, b.note);
  return h("p.error", "Unknown block");
}

const note = (text?: string) => (text ? h("p.note", inline(text)) : null);

// ---------------------------------------------------------------------------
// Map panel
// ---------------------------------------------------------------------------

const METHOD_LABEL: Record<Method, string> = { grass: "Tall grass", bog: "Bog", water: "Water (by raft)" };

/** Pictures render when scrolled near, then the rest in the background (for printing). */
const pending = new Set<() => Promise<void>>();
let observer: IntersectionObserver | null = null;
function lazy(el: Element, run: () => Promise<void>) {
  let done = false;
  const once = async () => { if (done) return; done = true; pending.delete(once); observer?.unobserve(el); await run(); };
  pending.add(once);
  if (typeof IntersectionObserver === "undefined") { void once(); return; }
  observer ??= new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) (e.target as HTMLElement & { __render?: () => void }).__render?.();
  }, { rootMargin: "800px 0px" });
  (el as HTMLElement & { __render?: () => void }).__render = () => void once();
  observer.observe(el);
}
/** Render every remaining map picture, a few at a time (idle time, and before printing). */
export async function renderAllPending(): Promise<void> {
  for (const run of [...pending]) await run();
}

function marker(kind: "item" | "hidden" | "bush" | "trainer", n: number, x: number, y: number, w: number, hgt: number, label: string): HTMLElement {
  // Pinned to the tile's top-right corner so the sprite underneath stays visible.
  const left = ((x + MAP_MARGIN + 0.9) / (w + MAP_MARGIN * 2)) * 100;
  const top = ((y + MAP_MARGIN + 0.1) / (hgt + MAP_MARGIN * 2)) * 100;
  return h("span.mk", { class: `mk-${kind}`, style: `left:${left}%;top:${top}%`, title: label, "aria-hidden": "true" }, n);
}

const badge = (kind: string, n: Child) => h("span.mk.mk-inline", { class: `mk-${kind}` }, n);

function flagsLabel(g: Guide, flags: Record<string, boolean>): string {
  const cond = Object.entries(flags).map(([flag, is]) => ({ flag, is }));
  return condLabel(cond, { trainers: g.world.trainers });
}

export function mapPanel(g: Guide, id: MapId, flags: Record<string, boolean>, text?: string): HTMLElement {
  const def = g.world.maps[id];
  const f = g.finds.get(id);
  if (!def || !f) return h("p.error", `Unknown map ${id}`);
  const { w, h: mh } = mapSize(def);
  const pxW = (w + MAP_MARGIN * 2) * 16;
  const pxH = (mh + MAP_MARGIN * 2) * 16;
  const canvas = h<HTMLCanvasElement>("canvas.map-canvas", { width: pxW, height: pxH, role: "img", "aria-label": `Map of ${def.name}` });
  const frame = h("div.map-frame", { style: `aspect-ratio:${pxW}/${pxH}` }, canvas);
  const wide = pxW > 520;
  const fig = h("figure.map-fig", { class: wide ? "wide" : "", style: `--map-w:${pxW}px` }, frame);
  lazy(frame, async () => {
    frame.classList.add("loading");
    // Integer scale that fits the column (never above 3x); wider maps shrink to fit.
    const grid = fig.parentElement as HTMLElement;
    const gw = grid.clientWidth || pxW;
    const col = wide || !matchMedia("(min-width: 900px)").matches ? gw : Math.min(560, gw - 316);
    const scale = Math.max(1, Math.min(3, Math.floor(col / pxW), Math.floor(1100 / pxH) || 1));
    fig.style.setProperty("--map-scale", String(scale));
    try { await renderMap(art(), def, flags, canvas); } catch (e) { console.warn("[guide] map render failed", id, e); }
    frame.classList.remove("loading");
  });
  for (const it of f.items) {
    const nm = g.data.items[it.item]?.name ?? it.item;
    frame.appendChild(marker(it.kind === "ground" ? "item" : it.kind, it.n, it.x, it.y, w, mh, nm));
  }
  for (const t of f.trainers) {
    const tr = g.world.trainers[t.ids[0]];
    if (t.n !== null && t.x !== undefined && t.y !== undefined) frame.appendChild(marker("trainer", t.n, t.x, t.y, w, mh, tr ? trainerTitle(tr) : t.ids[0]));
  }
  const legend = h("figcaption.map-legend",
    f.items.some((i) => i.kind === "ground") ? h("span", badge("item", "1"), " Item") : null,
    f.items.some((i) => i.kind === "hidden") ? h("span", badge("hidden", "1"), " Hidden item") : null,
    f.items.some((i) => i.kind === "bush") ? h("span", badge("bush", "1"), " Berry bush") : null,
    f.trainers.some((t) => t.n !== null) ? h("span", badge("trainer", "1"), " Trainer") : null,
  );
  fig.appendChild(legend);

  const flagText = flagsLabel(g, flags);
  const tags = [
    def.outdoor ? "Outdoors" : "Indoors",
    def.dark ? "Dark: light the FOXFIRE JAR" : null,
    def.time ? `Always ${def.time}` : null,
    def.healPoint ? "Heals your party" : null,
  ].filter(Boolean) as string[];
  return h("section.map-panel", { id: uniqueId(anchor.map(id)) },
    h("header.map-head",
      h("h4", def.name),
      h("div.tags", tags.map((t) => h("span.tag", t)), flagText ? h("span.tag.state", `Shown: ${flagText}`) : null),
    ),
    note(text),
    h("div.map-grid", fig, mapTables(g, def.id, f, flags)),
  );
}

function mapTables(g: Guide, id: MapId, f: MapFinds, flags: Record<string, boolean>): HTMLElement {
  const def = g.world.maps[id];
  const out = h("div.map-tables");
  const active = activeEncounterSet(def, flags);
  for (const set of f.encounters) out.appendChild(encounterBlock(g, def.id, set, set.when === active || (set.when !== null && JSON.stringify(set.when) === JSON.stringify(active))));
  if (f.items.length) out.appendChild(itemsTable(g, f));
  if (f.trainers.length) out.appendChild(trainersTable(g, f.trainers));
  if (f.gifts.length) {
    out.appendChild(h("div.tbl",
      h("h5", "Gifts"),
      h("ul.plain", f.gifts.map((x) => h("li", speciesLink(g, x.species), ` ${levels(x.level, x.level)}`, h("span.muted", ` from ${x.from}`), whenText(x.when)))),
    ));
  }
  if (f.statics.length) {
    out.appendChild(h("div.tbl",
      h("h5", "Special battles"),
      h("ul.plain", f.statics.map((x) => h("li", speciesLink(g, x.species), ` ${levels(x.level, x.level)}`, x.sport ? h("span.badge", "SPORT") : null, h("span.muted", ` · ${x.from}`), whenText(x.when)))),
    ));
  }
  if (f.trades.length) {
    out.appendChild(h("div.tbl",
      h("h5", "Trades"),
      h("ul.plain", f.trades.map((x) => h("li",
        "Give ", x.wants.map((s, i) => [i ? " or " : "", speciesLink(g, s)]), " → get ", speciesLink(g, x.gives.species),
        ` ${levels(x.gives.level, x.gives.level)}`, x.gives.nickname ? ` “${x.gives.nickname}”` : "", h("span.muted", ` · ${x.from}`),
      ))),
    ));
  }
  if (f.shops.length) {
    out.appendChild(h("div.tbl",
      h("h5", "Shop"),
      f.shops.map((s) => h("div.shop",
        h("div.muted", s.from, whenText(s.when)),
        h("table.compact", h("tbody", s.stock.map((it) => h("tr", h("td", itemLink(g, it)), h("td.num", money(g.data.items[it]?.price ?? 0)))))),
      )),
    ));
  }
  if (f.itemGifts.length) {
    out.appendChild(h("div.tbl",
      h("h5", "Given to you"),
      h("ul.plain", f.itemGifts.map((x) => h("li", itemLink(g, x.item), x.qty > 1 ? ` ×${x.qty}` : "", h("span.muted", ` from ${x.from}`), whenText(x.when)))),
    ));
  }
  if (f.quests.length) {
    out.appendChild(h("div.tbl",
      h("h5", "Field notes (side quests)"),
      h("ul.plain", f.quests.map((q) => {
        const def = g.world.quests?.[q];
        return def ? h("li", h("strong", def.title), h("span.muted", ` · ${def.giver}`), h("div.small", `Reward: ${def.reward}`)) : h("li", q);
      })),
    ));
  }
  if (!out.childElementCount) out.appendChild(h("p.muted", "No wild plants, trainers or items here."));
  return out;
}

const whenText = (when: string[]) => (when.length ? h("span.when", ` (${when.join("; ")})`) : null);

function encounterBlock(g: Guide, id: MapId, set: EncounterSet, active: boolean): HTMLElement {
  const forced = forcedTime(g.world.maps[id]);
  const wrap = h("div.tbl.enc", { class: active && set.label ? "active" : "" });
  if (set.label) wrap.appendChild(h("h5", set.when ? `Wild plants: ${set.label}` : "Wild plants"));
  else wrap.appendChild(h("h5", "Wild plants"));
  if (!set.tables.length) wrap.appendChild(h("p.muted", "No wild encounters."));
  for (const t of set.tables) {
    wrap.appendChild(h("table.enc-table",
      h("caption", `${METHOD_LABEL[t.method]} · ${t.rate}% per step`),
      h("thead", h("tr", h("th", "Plant"), h("th", "Levels"),
        forced !== "night" ? h("th.num", { title: "Morning and day" }, "☀ Day") : null,
        forced !== "day" ? h("th.num", "☾ Night") : null)),
      h("tbody", t.rows.map((r) => h("tr",
        h("td", speciesLink(g, r.species)),
        h("td", levels(r.minLevel, r.maxLevel)),
        forced !== "night" ? h("td.num", { class: r.dayPct === null ? "off" : "" }, pct(r.dayPct)) : null,
        forced !== "day" ? h("td.num", { class: r.nightPct === null ? "off" : "" }, pct(r.nightPct)) : null,
      ))),
    ));
  }
  return wrap;
}

function itemsTable(g: Guide, f: MapFinds): HTMLElement {
  return h("div.tbl",
    h("h5", "Items"),
    h("table.items-table",
      h("thead", h("tr", h("th", "#"), h("th", "Item"), h("th.num", "Qty"), h("th", "Where"))),
      h("tbody", f.items.map((i) => h("tr",
        h("td", badge(i.kind === "ground" ? "item" : i.kind, i.n)),
        h("td", itemLink(g, i.item)),
        h("td.num", i.qty),
        h("td.small", i.kind === "hidden" ? "Hidden: press A facing the spot" : i.kind === "bush" ? "Berry bush, picks again each day" : "On the ground",
          i.when ? h("span.when", ` (${i.when})`) : null),
      ))),
    ),
  );
}

function trainersTable(g: Guide, list: MapTrainer[]): HTMLElement {
  return h("div.tbl",
    h("h5", "Trainers"),
    h("div.trainer-list", list.map((t) => {
      const variants = t.ids.map((id) => g.world.trainers[id]).filter(Boolean) as TrainerDef[];
      const first = variants[0];
      if (!first) return null;
      const range = variantRange(variants.map((v) => v.prize));
      return h("details.trainer", { id: uniqueId(anchor.trainer(trainerGroup(first.id, g.world.trainers))) },
        h("summary",
          t.n !== null ? badge("trainer", t.n) : badge("event", "!"),
          portrait(first.portrait, 1, ""),
          h("span.tname", h("span.tclass", first.className), " ", h("strong", first.name)),
          h("span.tteam", first.team.map((m) => h("span.mini", speciesIconMini(m.species), h("small", m.level)))),
          h("span.prize", range),
          isRematchTrainer(g.world, first.id)
            ? h("span.tag.rematch", { title: "Talk to them again after a win: +1 level per rematch won, EXP only, no prize money" }, "Rematch +1 per win")
            : null,
        ),
        variants.length > 1
          ? variants.map((v) => h("div.variant", h("h6", variantLabel(g, v)), teamList(g, v), v.prize !== first.prize ? h("p.small", `Prize ${money(v.prize)}`) : null))
          : teamList(g, first),
        t.when.length ? h("p.small.when", t.when.join("; ")) : null,
      );
    })),
  );
}

const speciesIconMini = (id: SpeciesId) => speciesIcon(id, 1);

function variantRange(ns: number[]): string {
  const lo = Math.min(...ns);
  const hi = Math.max(...ns);
  return lo === hi ? money(lo) : `${money(lo)}–${money(hi)}`;
}

function variantLabel(g: Guide, t: TrainerDef): string {
  const rematch = /_rematch$/.test(t.id);
  const line = starterVariant(t.id);
  const base = line ? starterChoiceLabel(g, line) : "First battle";
  return rematch ? `Rematch (post-game)${line ? ` · ${base}` : ""}` : base;
}

// ---------------------------------------------------------------------------
// Boss card
// ---------------------------------------------------------------------------

export function bossCard(g: Guide, id: string, text?: string): HTMLElement {
  const trainers = g.world.trainers;
  const group = trainers[id] ? trainerGroup(id, trainers) : id;
  const ids = groupMembers(group, trainers);
  const variants = (ids.length ? ids : [id]).map((x) => trainers[x]).filter(Boolean) as TrainerDef[];
  if (!variants.length) return h("p.error", `Unknown trainer ${id}`);
  const first = variants[0];
  const where = [...g.finds.values()].filter((f) => f.trainers.some((t) => t.ids.some((x) => variants.some((v) => v.id === x)))).map((f) => f.map);
  const card = h("article.boss-card", { id: uniqueId(`boss-${group}`) },
    h("header.boss-head",
      portrait(first.portrait, 2, `${trainerTitle(first)}`),
      h("div",
        h("div.boss-class", first.className),
        h("h4", first.name),
        h("div.boss-meta",
          h("span", `Prize ${variantRange(variants.filter((v) => !/_rematch$/.test(v.id)).map((v) => v.prize))}`),
          first.ai === "smart" ? h("span", "Smart AI") : null,
          first.mark ? h("span.mark", "Awards the ", markName(first.mark)) : null,
          where.length ? h("span", "at ", where.map((m, i) => [i ? ", " : "", mapLink(g, m)])) : null,
        ),
        first.items?.length ? h("div.boss-items", "Bag: ", first.items.map((it, i) => [i ? ", " : "", itemLink(g, it.item), ` ×${it.qty}`])) : null,
      ),
    ),
    note(text),
  );
  if (variants.length === 1) card.appendChild(bossTeam(g, first));
  else {
    const tabs = h("div.tabs", { role: "tablist" });
    const panels = variants.map((v, i) => h("div.tab-panel", { role: "tabpanel", "data-label": variantLabel(g, v), hidden: i ? true : undefined },
      h("h6.print-only", variantLabel(g, v)), bossTeam(g, v), v.prize !== first.prize ? h("p.small", `Prize ${money(v.prize)}`) : null));
    variants.forEach((v, i) => {
      const b = h<HTMLButtonElement>("button.tab", { role: "tab", type: "button", "aria-selected": i === 0 ? "true" : "false" }, variantLabel(g, v));
      b.addEventListener("click", () => {
        panels.forEach((p, j) => { p.hidden = j !== i; });
        tabs.querySelectorAll("button").forEach((x, j) => x.setAttribute("aria-selected", j === i ? "true" : "false"));
      });
      tabs.appendChild(b);
    });
    card.append(tabs, ...panels);
  }
  return card;
}

function markName(mark: string): HTMLElement {
  return h("strong", mark.replace(/_/g, " ").toUpperCase());
}

function bossTeam(g: Guide, t: TrainerDef): HTMLElement {
  return h("div.boss-team", t.team.map((m) => {
    const sp = g.data.species[m.species];
    return h("div.member",
      h("div.member-head",
        h("a", { href: `#${anchor.species(m.species)}` }, speciesFront(m.species, 1, sp?.name ?? m.species)),
        h("div",
          h("div.member-name", h("a", { href: `#${anchor.species(m.species)}` }, sp?.name ?? m.species), h("span.lv", ` Lv ${m.level}`)),
          sp ? typePills(sp.types) : null,
          m.grafted ? h("div", h("span.badge.graft", { title: "Its stats come from five levels lower" }, "GRAFT COLLAR")) : null,
        ),
      ),
      moveTable(g, memberMoves(g, m)),
    );
  }));
}

// ---------------------------------------------------------------------------
// Species and item cards
// ---------------------------------------------------------------------------

const SOURCE_LABEL: Record<SpeciesSource["kind"], string> = {
  grass: "tall grass", bog: "bog", water: "water (raft)", gift: "gift", trade: "trade", static: "special battle", roaming: "roaming Wanderer",
};

/** "ROUTE 1: tall grass, Lv 3–4, night, 20%" lines for a species, plus growth and breeding notes. */
export function whereFound(g: Guide, id: SpeciesId): HTMLElement {
  const list = g.speciesSrc.get(id) ?? [];
  const items: Child[] = list.map((s) => h("li",
    mapLink(g, s.map), ": ", SOURCE_LABEL[s.kind], `, ${levels(s.minLevel, s.maxLevel)}`,
    s.time && s.time !== "any" ? (s.time === "day" ? ", by day" : ", at night") : "",
    s.pct !== undefined ? `, ${pct(s.pct)}` : "",
    s.when ? h("span.when", ` (${s.when})`) : null,
  ));
  const sp = g.data.species[id];
  const from = Object.values(g.data.species).find((x) => x.growsInto?.species === id);
  if (from?.growsInto) items.push(h("li", "Grows from ", speciesLink(g, from.id, false), ` (${growthText(g, from.growsInto.trigger)})`));
  if (sp && sp.stage === 1 && (sp.pollination?.length ?? 0) > 0 && !list.length) {
    items.push(h("li", "Sow a seed from the NURSERY GARDEN: board any plant of its line"));
  }
  if (!items.length) items.push(h("li.muted", "Not found in the wild."));
  return h("ul.where", items);
}

export function speciesCard(g: Guide, id: SpeciesId, text?: string): HTMLElement {
  const sp = g.data.species[id];
  if (!sp) return h("p.error", `Unknown species ${id}`);
  const herb = g.data.herbarium[id];
  return h("article.species-card",
    h("div.sc-art", speciesFront(id, 2, sp.name)),
    h("div.sc-body",
      h("div.sc-no", dexNo(id), herb ? h("span.muted", ` · ${herb.category}`) : null),
      h("h4", h("a", { href: `#${anchor.species(id)}` }, sp.name)),
      typePills(sp.types),
      note(text),
      statBars(sp.baseStats),
      sp.growsInto ? h("p.small", "Grows into ", speciesLink(g, sp.growsInto.species, false), ` · ${growthText(g, sp.growsInto.trigger)}`) : null,
      h("h5", "Where to find it"),
      whereFound(g, id),
    ),
  );
}

const ITEM_SOURCE: Record<string, string> = { ground: "on the ground", hidden: "hidden", bush: "berry bush", shop: "for sale", gift: "given" };

export function itemWhere(g: Guide, id: ItemId): HTMLElement {
  const list = g.itemSrc.get(id) ?? [];
  if (!list.length) return h("p.muted.small", "Not found lying around.");
  return h("ul.where", list.map((s) => h("li", mapLink(g, s.map), ": ", ITEM_SOURCE[s.kind],
    s.kind === "shop" ? ` ${money(g.data.items[id]?.price ?? 0)}` : s.qty > 1 ? ` ×${s.qty}` : "")));
}

export function itemCard(g: Guide, id: ItemId, text?: string): HTMLElement {
  const it = g.data.items[id];
  if (!it) return h("p.error", `Unknown item ${id}`);
  return h("article.item-card",
    h("div.ic-art", itemIcon(id, it.pocket, 3)),
    h("div",
      h("div.sc-no", it.pocket === "key" ? "KEY ITEM" : it.pocket === "pods" ? "POD" : "ITEM"),
      h("h4", h("a", { href: `#${anchor.item(id)}` }, it.name)),
      h("p", it.description),
      note(text),
      h("h5", "Where to find it"),
      itemWhere(g, id),
    ),
  );
}
