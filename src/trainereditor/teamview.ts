// The team editor: members (species, level, moves, graft collar) with stats
// and warnings, the bag, the prize and the AI. Every change goes through
// Editor.update, which re-validates and re-renders the detail.

import type { ItemId, MoveId, SpeciesId, TypeId } from "../contracts";
import { STAT_KEYS } from "../battle/logic/stats";
import { h, type Child } from "../guide/dom";
import { itemIcon, speciesFront, speciesIcon } from "../guide/art";
import { defaultPrize, MOVES_MAX, TEAM_MAX, type TeamMember, type TrainerEntry } from "../world/trainerFile";
import type { Editor } from "./app";
import { defaultMoves, lineageMoves, memberStats, memberWarnings, statTotal } from "./team";

export const typePill = (t: TypeId) => h(`span.pill.t-${t}`, t);
export const types = (ts: readonly TypeId[]) => h("span.te-row", ...ts.map(typePill));

export function moveInfo(ed: Editor, id: MoveId, extra?: Child): HTMLElement {
  const m = ed.data.moves[id];
  if (!m) return h("div.info", `unknown move ${id}`);
  return h("div.info", typePill(m.type), h(`span.cat.c-${m.category}`, m.category),
    h("span", `Pow ${m.power || "-"}`), h("span", `Acc ${m.accuracy ?? "-"}`), h("span", `PP ${m.pp}`), extra ?? null);
}

/** Edit a copy of the trainer's entry and hand it to the editor. */
export function editEntry(ed: Editor, id: string, f: (e: TrainerEntry) => void): void {
  const e = structuredClone(ed.entry(id));
  f(e);
  ed.update(e);
}

// Per member: "any move" override shown (UI state only; on when a move is already off-learnset).
const anyMove = new Map<string, boolean>();

function moveSlots(ed: Editor, id: string, i: number, m: TeamMember): HTMLElement {
  const box = h("div.te-moves");
  const custom = !!m.moves;
  const seg = h("div.te-row",
    h("span.te-small.te-muted", "Moves"),
    h<HTMLButtonElement>("button.te-btn.tiny", {
      type: "button", "aria-pressed": String(!custom), "data-key": `mv-default-${i}`,
      title: "The engine's rule: the last four moves learned by this level, keeping two attacks",
      onclick: () => editEntry(ed, id, (e) => { delete e.team[i].moves; }),
    }, "Default"),
    h<HTMLButtonElement>("button.te-btn.tiny", {
      type: "button", "aria-pressed": String(custom), "data-key": `mv-custom-${i}`,
      onclick: () => { if (!custom) editEntry(ed, id, (e) => { e.team[i].moves = defaultMoves(ed.data, m.species, m.level); }); },
    }, "Custom"));
  box.append(seg);
  const lineage = lineageMoves(ed.data, m.species);
  const at = (mv: MoveId) => lineage.filter((l) => l.move === mv).sort((a, b) => a.level - b.level)[0];
  const tag = (mv: MoveId): Child => {
    const l = at(mv);
    if (!l) return h("span.te-chip", { title: "Not in this species' learnset or its earlier stages'" }, "off-learnset");
    const from = l.from !== m.species ? ` as ${ed.speciesName(l.from)}` : "";
    return h(`span.te-chip${l.level > m.level ? ".edited" : ""}`, `Lv ${l.level}${from}`);
  };
  if (!custom) {
    for (const mv of defaultMoves(ed.data, m.species, m.level)) {
      box.append(h("div.te-move", h("div", h("b", ed.data.moves[mv]?.name ?? mv)), moveInfo(ed, mv, tag(mv))));
    }
    return box;
  }
  const key = `${id}:${i}`;
  const moves = m.moves ?? [];
  const showAny = anyMove.get(key) ?? moves.some((mv) => !at(mv));
  const label = (mv: MoveId) => {
    const d = ed.data.moves[mv];
    return d ? `${d.name} (${d.type}, ${d.power || "-"}/${d.accuracy ?? "-"}, ${d.pp}pp)` : mv;
  };
  for (let s = 0; s < MOVES_MAX; s++) {
    const cur = moves[s] ?? "";
    const sel = h<HTMLSelectElement>("select.te-select", { "aria-label": `Move ${s + 1}`, "data-key": `mv-${i}-${s}` });
    sel.append(h("option", { value: "" }, "(empty)"));
    const now = lineage.filter((l) => l.level <= m.level);
    const later = lineage.filter((l) => l.level > m.level);
    const grp = (title: string, opts: { move: MoveId; text: string }[]) => {
      if (!opts.length) return;
      sel.append(h("optgroup", { label: title }, ...opts.map((o) => h("option", { value: o.move, selected: o.move === cur }, o.text))));
    };
    grp(`Learnset to Lv ${m.level}`, now.map((l) => ({ move: l.move, text: `Lv ${l.level} · ${label(l.move)}${l.from !== m.species ? ` (as ${ed.speciesName(l.from)})` : ""}` })));
    grp("Learned later", later.map((l) => ({ move: l.move, text: `Lv ${l.level} · ${label(l.move)}` })));
    if (showAny || (cur && !at(cur))) {
      const others = Object.values(ed.data.moves).filter((d) => !at(d.id) && (showAny || d.id === cur)).sort((a, b) => a.name.localeCompare(b.name));
      grp("Any move (off-learnset)", others.map((d) => ({ move: d.id, text: label(d.id) })));
    }
    sel.addEventListener("change", () => editEntry(ed, id, (e) => {
      const list = [...(e.team[i].moves ?? [])];
      list[s] = sel.value;
      const next = [...new Set(list.filter(Boolean))];
      if (next.length) e.team[i].moves = next;
      else delete e.team[i].moves;
    }));
    box.append(h(`div.te-move${cur && (!at(cur) || at(cur)!.level > m.level) ? ".off" : ""}`, sel, cur ? moveInfo(ed, cur, tag(cur)) : null));
  }
  const any = h<HTMLInputElement>("input", { type: "checkbox", checked: showAny, "data-key": `mv-any-${i}` });
  any.addEventListener("change", () => { anyMove.set(key, any.checked); ed.select(id); });
  box.append(h("label.te-check.te-small", any, "Allow any move (flagged off-learnset)"));
  return box;
}

function statsTable(ed: Editor, m: TeamMember): HTMLElement {
  if (!ed.data.species[m.species]) return h("div");
  const s = memberStats(ed.data, m);
  const heads = ["HP", "Atk", "Def", "SpA", "SpD", "Spe", "Total"];
  return h("table.te-stats", { title: m.grafted ? "Stats from five levels lower (graft collar)" : "Stats at this level (trainer DVs, no EVs)" },
    h("tr", ...heads.map((x) => h("th", x))),
    h("tr", ...STAT_KEYS.map((k) => h("td", s[k])), h("td", statTotal(s))));
}

function memberCard(ed: Editor, id: string, i: number, m: TeamMember, team: TeamMember[], errs: string[]): HTMLElement {
  const sp = ed.data.species[m.species];
  const warns = memberWarnings(ed.data, id, m);
  const myErrs = errs.filter((e) => e.startsWith(`team[${i}]:`)).map((e) => e.replace(/^team\[\d+\]: /, ""));
  const move = (d: number) => editEntry(ed, id, (e) => { const [x] = e.team.splice(i, 1); e.team.splice(i + d, 0, x); });
  const level = h<HTMLInputElement>("input.te-input.num", {
    type: "number", min: 1, max: 100, step: 1, value: m.level, "aria-label": "Level", "data-key": `lv-${i}`,
  });
  level.addEventListener("change", () => {
    const v = Math.round(Number(level.value));
    if (!Number.isFinite(v)) return;
    editEntry(ed, id, (e) => { e.team[i].level = Math.max(1, Math.min(100, v)); });
  });
  const graft = h<HTMLInputElement>("input", { type: "checkbox", checked: !!m.grafted, "data-key": `graft-${i}` });
  graft.addEventListener("change", () => editEntry(ed, id, (e) => { if (graft.checked) e.team[i].grafted = true; else delete e.team[i].grafted; }));
  const spBtn = h<HTMLButtonElement>("button.te-btn.te-sp-btn", { type: "button", "data-key": `sp-${i}`, title: "Choose the species" },
    h("span.name", sp?.name ?? m.species),
    sp ? types(sp.types) : null,
    sp ? h("span.te-small.te-muted", `Stage ${sp.stage} · BST ${statTotal(sp.baseStats)}`) : null);
  spBtn.addEventListener("click", async () => {
    const pick = await pickSpecies(ed, m.species);
    if (pick && pick !== m.species) editEntry(ed, id, (e) => { e.team[i].species = pick; });
  });
  const cls = myErrs.length ? ".bad" : warns.some((w) => w.kind !== "allowed") ? ".warn" : "";
  return h(`div.te-member${cls}`,
    h("header", h("b", `#${i + 1}`),
      h<HTMLButtonElement>("button.te-btn.tiny", { type: "button", title: "Move up", "aria-label": "Move up", disabled: i === 0, onclick: () => move(-1) }, "↑"),
      h<HTMLButtonElement>("button.te-btn.tiny", { type: "button", title: "Move down", "aria-label": "Move down", disabled: i === team.length - 1, onclick: () => move(1) }, "↓"),
      h<HTMLButtonElement>("button.te-btn.tiny.warn", {
        type: "button", title: "Remove", "aria-label": "Remove member", disabled: team.length <= 1,
        onclick: () => editEntry(ed, id, (e) => { e.team.splice(i, 1); }),
      }, "×")),
    h("div.te-sp", speciesFront(m.species, 1, sp?.name ?? m.species), spBtn),
    h("div.te-row", h("label.te-check", "Lv ", level), h("label.te-check", { title: "A GRAFT COLLAR: keeps its level and moves, stats from five levels lower" }, graft, "Grafted")),
    moveSlots(ed, id, i, m),
    statsTable(ed, m),
    ...myErrs.map((e) => h("div.te-err", e)),
    ...warns.map((w) => h(`div.te-warn${w.kind === "allowed" ? ".allowed" : ""}`, w.text)));
}

function bag(ed: Editor, id: string, e: TrainerEntry): HTMLElement {
  const items = e.items ?? [];
  const box = h("div.te-bag", h("h4", "Bag"));
  if (!items.length) box.append(h("div.te-muted.te-small", "No items."));
  items.forEach((it, j) => {
    const def = ed.data.items[it.item];
    const qty = h<HTMLInputElement>("input.te-input.num", { type: "number", min: 1, max: 99, value: it.qty, "aria-label": `${def?.name ?? it.item} quantity`, "data-key": `qty-${j}` });
    qty.addEventListener("change", () => {
      const v = Math.round(Number(qty.value));
      if (Number.isFinite(v)) editEntry(ed, id, (x) => { x.items![j].qty = Math.max(1, v); });
    });
    box.append(h("div.line", def ? itemIcon(it.item, def.pocket, 2) : null, h("span", def?.name ?? it.item), h("span.te-muted", "×"), qty,
      h<HTMLButtonElement>("button.te-btn.tiny.warn", {
        type: "button", "aria-label": "Remove item",
        onclick: () => editEntry(ed, id, (x) => { x.items!.splice(j, 1); if (!x.items!.length) delete x.items; }),
      }, "×")));
  });
  const pick = h<HTMLSelectElement>("select.te-select", { "aria-label": "Item to add", "data-key": "bag-pick" });
  const all = Object.values(ed.data.items).filter((d) => !items.some((x) => x.item === d.id));
  const usable = all.filter((d) => d.usableInBattle);
  const other = all.filter((d) => !d.usableInBattle);
  pick.append(h("optgroup", { label: "Usable in battle" }, ...usable.map((d) => h("option", { value: d.id }, d.name))),
    h("optgroup", { label: "Other items" }, ...other.map((d) => h("option", { value: d.id }, d.name))));
  const add = h<HTMLButtonElement>("button.te-btn.small", { type: "button", "data-key": "bag-add" }, "Add item");
  add.addEventListener("click", () => {
    if (!pick.value) return;
    const item = pick.value as ItemId;
    editEntry(ed, id, (x) => { x.items = [...(x.items ?? []), { item, qty: 1 }]; });
  });
  box.append(h("div.line", pick, add));
  return box;
}

function prizeAndAi(ed: Editor, id: string, e: TrainerEntry): HTMLElement {
  const rule = defaultPrize(e.team);
  const auto = h<HTMLInputElement>("input", { type: "checkbox", checked: e.prize === undefined, "data-key": "prize-auto" });
  auto.addEventListener("change", () => editEntry(ed, id, (x) => { if (auto.checked) delete x.prize; else x.prize = rule; }));
  const prize = h<HTMLInputElement>("input.te-input", { type: "number", min: 0, step: 10, value: e.prize ?? rule, disabled: e.prize === undefined, "aria-label": "Prize", "data-key": "prize", style: "width:96px" });
  prize.addEventListener("change", () => {
    const v = Math.round(Number(prize.value));
    if (Number.isFinite(v)) editEntry(ed, id, (x) => { x.prize = Math.max(0, v); });
  });
  const ai = h<HTMLSelectElement>("select.te-select", { "aria-label": "AI", "data-key": "ai" },
    h("option", { value: "basic", selected: e.ai === "basic" }, "basic (random moves)"),
    h("option", { value: "smart", selected: e.ai === "smart" }, "smart (picks good moves, uses items)"));
  ai.addEventListener("change", () => editEntry(ed, id, (x) => { x.ai = ai.value as TrainerEntry["ai"]; }));
  return h("div",
    h("h4", "Prize"), h("div.te-row", h("span.te-muted", "$"), prize, h("label.te-check", auto, `Default rule (top level × 20 = ${rule})`)),
    h("h4", "AI"), ai,
    h("h4", "Music"), h("div.te-small", h("code", e.music), e.mark ? h("span.te-muted", " · awards ", h("code", e.mark)) : null));
}

export function teamEditor(ed: Editor, id: string): HTMLElement {
  const e = ed.entry(id);
  const errs = ed.errorsFor(id);
  const add = h<HTMLButtonElement>("button.te-btn.small", { type: "button", disabled: e.team.length >= TEAM_MAX, "data-key": "add-member" }, `+ Add member (${e.team.length}/${TEAM_MAX})`);
  add.addEventListener("click", async () => {
    const pick = await pickSpecies(ed, e.team.at(-1)?.species ?? null);
    if (pick) editEntry(ed, id, (x) => { x.team.push({ species: pick, level: Math.max(...x.team.map((m) => m.level)) }); });
  });
  return h("section.te-card",
    h("h3", "Team", h("small", "species, levels, moves; stats use the battle's formula")),
    h("div.te-members", ...e.team.map((m, i) => memberCard(ed, id, i, m, e.team, errs))),
    h("div.te-row", { style: "margin-top:8px" }, add),
    h("div.te-props", bag(ed, id, e), prizeAndAi(ed, id, e)));
}

// ---------------------------------------------------------------------------
// Species picker
// ---------------------------------------------------------------------------

let dialog: HTMLDialogElement | null = null;
let resolvePick: ((id: SpeciesId | null) => void) | null = null;

function buildDialog(ed: Editor): HTMLDialogElement {
  const d = h<HTMLDialogElement>("dialog.te-dialog", { "aria-label": "Choose a species" });
  const q = h<HTMLInputElement>("input.te-input", { type: "search", placeholder: "Search species, type or id", "aria-label": "Search species" });
  const type = h<HTMLSelectElement>("select.te-select", { "aria-label": "Type" }, h("option", { value: "" }, "Any type"),
    ...[...new Set(Object.values(ed.data.species).flatMap((s) => s.types))].map((t) => h("option", { value: t }, t)));
  const stage = h<HTMLSelectElement>("select.te-select", { "aria-label": "Stage" }, h("option", { value: "" }, "Any stage"),
    ...[1, 2, 3].map((s) => h("option", { value: s }, `Stage ${s}`)));
  const close = h<HTMLButtonElement>("button.te-btn", { type: "button" }, "Cancel");
  const list = h("div.te-splist");
  const buttons: { el: HTMLElement; id: SpeciesId; hay: string; types: string[]; stage: number }[] = [];
  for (const s of Object.values(ed.data.species)) {
    const b = s.baseStats;
    const el = h<HTMLButtonElement>("button.te-btn.te-spopt", { type: "button", "data-species": s.id },
      speciesIcon(s.id, 2, ""),
      h("span", h("b", s.name), " ", types(s.types),
        h("div.bs", `St ${s.stage} · ${b.hp}/${b.atk}/${b.def}/${b.spa}/${b.spd}/${b.spe} = ${statTotal(b)}`)));
    el.addEventListener("click", () => { resolvePick?.(s.id); resolvePick = null; d.close(); });
    list.append(el);
    buttons.push({ el, id: s.id, hay: `${s.id} ${s.name} ${s.types.join(" ")}`.toLowerCase(), types: s.types, stage: s.stage });
  }
  const filter = () => {
    const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    for (const b of buttons) {
      b.el.hidden = !words.every((w) => b.hay.includes(w)) || (!!type.value && !b.types.includes(type.value)) || (!!stage.value && b.stage !== Number(stage.value));
    }
  };
  q.addEventListener("input", filter);
  type.addEventListener("change", filter);
  stage.addEventListener("change", filter);
  close.addEventListener("click", () => d.close());
  d.addEventListener("close", () => { resolvePick?.(null); resolvePick = null; });
  d.append(h("div.head", q, type, stage, close), list);
  (d as unknown as { _reset: (cur: SpeciesId | null) => void })._reset = (cur) => {
    q.value = ""; type.value = ""; stage.value = "";
    filter();
    for (const b of buttons) b.el.setAttribute("aria-current", String(b.id === cur));
    setTimeout(() => { q.focus(); buttons.find((b) => b.id === cur)?.el.scrollIntoView({ block: "center" }); }, 0);
  };
  document.body.append(d);
  return d;
}

/** Open the species picker; resolves the chosen id, or null when cancelled. */
export function pickSpecies(ed: Editor, current: SpeciesId | null): Promise<SpeciesId | null> {
  dialog ??= buildDialog(ed);
  resolvePick?.(null);
  (dialog as unknown as { _reset: (cur: SpeciesId | null) => void })._reset(current);
  dialog.showModal();
  return new Promise((resolve) => { resolvePick = resolve; });
}
