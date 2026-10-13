// The Trainer Editor page (trainereditor.html): every trainer's team, bag,
// prize and AI from src/data/trainers.json, with where it stands, the wild
// plants there and live validation by the build's own checks. Edits stay in
// IndexedDB; export a trainers.json, save it to the repo (dev server only),
// or play the game with them (index.html?trainerlab=1). See docs/TRAINERS.md.

import "./trainereditor.css";
import type { MapId } from "../contracts";
import { h } from "../guide/dom";
import { initArt, portrait, speciesIcon } from "../guide/art";
import { parseTrainersFile } from "../world/trainerFile";
import { Editor } from "./app";
import { filterCatalog, KIND_LABELS, KINDS, storyParts, type CatalogRow, type TrainerFilter, type TrainerLocation } from "./catalog";
import { WALKTHROUGH } from "../guide/walkthrough";
import { renderDetail, type DetailHooks } from "./detail";
import { diffFile, exportText, namesFrom } from "./edits";

const THEME_KEY = "verdant.trainereditor.theme";
const FILTER_KEY = "verdant.trainereditor.filter";
const SAVED_NOTE = "verdant.trainereditor.saved";
/** The dev server's "Save to repo" endpoint (vite.config.ts, trainerEditorSave). */
const SAVE_URL = "/__trainereditor/save";

function applyTheme(t: string | null) {
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

function themeToggle(): HTMLElement {
  let saved: string | null = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch { /* storage unavailable */ }
  applyTheme(saved);
  const b = h<HTMLButtonElement>("button.te-btn.icon", { type: "button", "aria-label": "Switch light or dark mode", title: "Light / dark" }, "◐");
  b.addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    const next = dark ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* storage unavailable */ }
  });
  return b;
}

function toaster(): { el: HTMLElement; toast(msg: string): void } {
  const el = h("div.te-toasts", { role: "status", "aria-live": "polite" });
  return {
    el,
    toast(msg: string) {
      const t = h("div.te-toast", msg);
      el.append(t);
      setTimeout(() => t.remove(), 6000);
    },
  };
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = h<HTMLAnchorElement>("a", { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Keep focus (and the caret) on the same control across a re-render. */
function keepFocus(root: HTMLElement, render: () => void) {
  const active = document.activeElement as HTMLElement | null;
  const key = active && root.contains(active) ? active.dataset.key : undefined;
  const scroll = root.scrollTop;
  render();
  root.scrollTop = scroll;
  if (key) root.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
}

async function main() {
  const root = document.getElementById("trainereditor")!;
  const [reg] = await Promise.all([initArt()]);
  const ed = new Editor();
  await ed.boot();
  if (import.meta.env.DEV) (window as unknown as { __trainereditor: Editor }).__trainereditor = ed;
  const { el: toasts, toast } = toaster();
  const names = namesFrom(ed.data);

  // ---- filters and list ----------------------------------------------------------------
  let filter: TrainerFilter = {};
  try { filter = JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? "{}") as TrainerFilter; } catch { /* storage unavailable */ }
  const saveFilter = () => { try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(filter)); } catch { /* storage unavailable */ } };
  const select = (label: string, key: keyof TrainerFilter, opts: [string, string][]) => {
    const s = h<HTMLSelectElement>("select.te-select", { "aria-label": label },
      h("option", { value: "" }, label), ...opts.map(([v, t]) => h("option", { value: v, selected: filter[key] === v }, t)));
    s.addEventListener("change", () => { (filter as Record<string, unknown>)[key] = s.value; saveFilter(); renderList(); });
    return s;
  };
  const mapsWithTrainers = [...new Set(ed.rows.flatMap((r) => r.maps))];
  const search = h<HTMLInputElement>("input.te-input", { type: "search", placeholder: "Search name, class, plant or map", "aria-label": "Search trainers", value: filter.text ?? "" });
  search.addEventListener("input", () => { filter.text = search.value; saveFilter(); renderList(); });
  const lvl = (key: "minLevel" | "maxLevel", label: string) => {
    const i = h<HTMLInputElement>("input.te-input", { type: "number", min: 1, max: 100, placeholder: label, "aria-label": label, value: filter[key] ?? "" });
    i.addEventListener("input", () => { filter[key] = i.value ? Number(i.value) : null; saveFilter(); renderList(); });
    return i;
  };
  const editedOnly = h<HTMLInputElement>("input", { type: "checkbox", checked: !!filter.edited });
  editedOnly.addEventListener("change", () => { filter.edited = editedOnly.checked; saveFilter(); renderList(); });
  const count = h("div.te-count");
  const filters = h("div.te-filters", search,
    h("div.grid",
      select("All maps", "map", mapsWithTrainers.map((m) => [m, ed.mapName(m)])),
      select("All parts", "part", storyParts(WALKTHROUGH).map((p) => [p, p])),
      select("All classes", "className", [...new Set(ed.base.trainers.map((t) => t.className))].sort().map((c) => [c, c])),
      select("All kinds", "kind", [...KINDS.map((k) => [k, KIND_LABELS[k]] as [string, string]), ["rematch", "Rematch-eligible"]]),
      lvl("minLevel", "Min level"), lvl("maxLevel", "Max level")),
    h("div.te-row", h("label.te-check", editedOnly, "Edited only"), count));
  const list = h("ul.te-list", { "aria-label": "Trainers" });
  let shown: CatalogRow[] = [];
  const fctx = {
    entry: (id: string) => ed.entry(id), speciesName: (id: string) => ed.speciesName(id), mapName: (id: MapId) => ed.mapName(id),
    edited: (id: string) => ed.isEdited(id),
  };
  const rowEl = (r: CatalogRow) => {
    const e = ed.entry(r.id);
    const bad = ed.errorsFor(r.id).length > 0;
    const b = h<HTMLButtonElement>("button.te-item", { type: "button", "data-id": r.id, "aria-current": String(r.id === ed.selected && view === "trainer") },
      portrait(e.portrait, 1, ""),
      h("span",
        h("span.who", `${e.className} ${e.name}`, ed.isEdited(r.id) ? h("span.dot.edited", { title: "Edited" }) : null, bad ? h("span.dot.bad", { title: "Has errors" }) : null),
        h("div.meta", r.maps.map((m) => ed.mapName(m)).join(", "), r.story ? ` · ${r.story.part}` : "", r.variant ? ` · BRAM's ${r.variant} line` : ""),
        h("div.team", ...e.team.map((m) => h("span.te-mini", speciesIcon(m.species, 2, ed.speciesName(m.species)), m.level)))));
    b.addEventListener("click", () => go(`#t/${r.id}`));
    return h("li", b);
  };
  function renderList() {
    shown = filterCatalog(ed.rows, filter, fctx);
    count.textContent = `${shown.length} of ${ed.rows.length} trainers`;
    list.replaceChildren(...shown.map(rowEl));
  }
  const refreshRow = (id: string) => {
    const old = list.querySelector(`[data-id="${CSS.escape(id)}"]`)?.parentElement;
    const r = ed.rowById.get(id);
    if (old && r) old.replaceWith(rowEl(r));
  };

  // ---- header --------------------------------------------------------------------------
  const status = h("span.te-status", { "aria-live": "polite" });
  const changesBtn = h<HTMLButtonElement>("button.te-btn", { type: "button", title: "What changed vs. the shipped trainers.json" }, "Changes");
  changesBtn.addEventListener("click", () => go(view === "changes" ? `#t/${ed.selected}` : "#changes"));
  const exportBtn = h<HTMLButtonElement>("button.te-btn", { type: "button", title: "Download a complete trainers.json for src/data/" }, "Export");
  exportBtn.addEventListener("click", () => {
    if (ed.validation.errors.length && !confirm(`The edited file has ${ed.validation.errors.length} error(s); the game won't load it. Export anyway?`)) return;
    download("trainers.json", exportText(ed.base, ed.edits));
    toast(`Exported trainers.json (${ed.editCount} edited trainer${ed.editCount === 1 ? "" : "s"}). Drop it into src/data/ and run npm test.`);
  });
  const file = h<HTMLInputElement>("input", { type: "file", accept: ".json,application/json", hidden: true });
  const loadBtn = h<HTMLButtonElement>("button.te-btn", { type: "button", title: "Load a trainers.json as edits" }, "Load…");
  loadBtn.addEventListener("click", () => file.click());
  file.addEventListener("change", async () => {
    const f = file.files?.[0];
    file.value = "";
    if (!f) return;
    const { file: parsed, error } = parseTrainersFile(await f.text());
    if (!parsed) { toast(error ?? "Could not read the file."); return; }
    if (ed.editCount && !confirm("Replace your current edits with this file?")) return;
    const r = ed.importFile(parsed);
    toast(`Loaded ${f.name}: ${r.count} trainer(s) differ from the shipped file.${r.unknown.length ? ` Ignored unknown ids: ${r.unknown.join(", ")}.` : ""}${r.missing.length ? ` ${r.missing.length} shipped trainer(s) missing kept as shipped.` : ""}`);
  });
  const saveRepo = import.meta.env.DEV ? h<HTMLButtonElement>("button.te-btn", { type: "button", title: "Dev server only: write src/data/trainers.json (validated on the server)" }, "Save to repo") : null;
  saveRepo?.addEventListener("click", async () => {
    if (!ed.editCount) { toast("Nothing to save: no edits."); return; }
    if (ed.validation.errors.length) { toast("Fix the errors first: the dev server refuses an invalid file."); go("#changes"); return; }
    if (!confirm(`Write ${ed.editCount} edited trainer(s) to src/data/trainers.json?`)) return;
    try {
      const res = await fetch(SAVE_URL, { method: "POST", headers: { "content-type": "application/json", "x-trainer-editor": "1" }, body: JSON.stringify(ed.file) });
      const body = await res.json().catch(() => ({})) as { ok?: boolean; errors?: string[] };
      if (!res.ok || !body.ok) { toast(`Not saved: ${(body.errors ?? [res.statusText]).slice(0, 3).join(" · ")}`); return; }
      try { sessionStorage.setItem(SAVED_NOTE, String(ed.editCount)); } catch { /* storage unavailable */ }
      toast("Saved src/data/trainers.json. The page reloads with it as the shipped data; run npm test.");
    } catch (e) {
      toast(`Not saved: ${e instanceof Error ? e.message : String(e)}`);
    }
  });
  const play = h<HTMLButtonElement>("button.te-btn.primary", { type: "button", title: "Open the game with these trainers (index.html?trainerlab=1)" }, "Play with these trainers ▶");
  const openGame = async (query: string) => {
    if (ed.validation.errors.length) { toast("The edits have errors, so the game would ignore them. Fix them first."); return; }
    const ok = await ed.flush();
    if (!ok) toast("IndexedDB isn't available, so the game can't read the edits.");
    window.open(new URL(`index.html?${query}`, location.href).href, "_blank", "noopener");
  };
  play.addEventListener("click", () => void openGame("trainerlab=1"));
  const bar = h("header.te-bar",
    h("a.te-brand", { href: "./guide.html", title: "The guidebook" }, h("b", "VERDANT REACH"), h("span", "Trainer Editor")),
    h("div.te-row.te-bar-tools", status, changesBtn, loadBtn, exportBtn, saveRepo, play, themeToggle(), file));
  const renderStatus = () => {
    const n = ed.editCount;
    const errs = ed.validation.errors.length;
    status.replaceChildren(`${n} edited`, errs ? h("span.bad", ` · ${errs} error${errs === 1 ? "" : "s"}`) : " · valid",
      ed.saved === false ? " · not saved (no IndexedDB)" : n ? " · kept in this browser" : "");
    changesBtn.textContent = n ? `Changes (${n})` : "Changes";
    changesBtn.setAttribute("aria-pressed", String(view === "changes"));
  };

  // ---- main views ----------------------------------------------------------------------
  const main = h("main.te-main");
  let view: "trainer" | "changes" = "trainer";
  const hooks = (): DetailHooks => {
    const i = shown.findIndex((r) => r.id === ed.selected);
    return {
      prev: i > 0 ? () => go(`#t/${shown[i - 1].id}`) : null,
      next: i >= 0 && i < shown.length - 1 ? () => go(`#t/${shown[i + 1].id}`) : null,
      playHere: import.meta.env.DEV ? (loc: TrainerLocation) => {
        const flags = (loc.visibleWhen ?? []).filter((c) => c.is).map((c) => c.flag);
        void openGame(`trainerlab=1&dev=world&play=1&map=${loc.map}${flags.length ? `&flags=${flags.join(",")}` : ""}`);
      } : null,
      openChanges: () => go("#changes"),
    };
  };
  const changesView = () => {
    const diffs = diffFile(ed.base, ed.edits, names);
    const v = ed.validation;
    return h("div",
      h("h2", "Changes"),
      h("p.te-muted", "What the export (and Save to repo) changes in src/data/trainers.json, against the shipped file."),
      v.errors.length
        ? h("section.te-card", h("h3", `${v.errors.length} error${v.errors.length === 1 ? "" : "s"}`), h("div.te-checks", ...v.errors.map((e) => h("div.te-err", e))))
        : h("div.te-ok", "✓ The edited file passes trainersFileErrors."),
      diffs.length ? h("div.te-diff", ...diffs.map((d) => h("div.t",
        h("div.te-row", h("b", d.label), h("code", d.id),
          h<HTMLButtonElement>("button.te-btn.tiny", { type: "button", onclick: () => go(`#t/${d.id}`) }, "Open"),
          h<HTMLButtonElement>("button.te-btn.tiny.warn", { type: "button", onclick: () => ed.revert(d.id) }, "Revert")),
        h("ul", ...d.changes.map((c) => h("li", c))))))
        : h("p", "No edits yet: pick a trainer and change its team."),
      h("div.te-row", { style: "margin-top:12px" },
        h<HTMLButtonElement>("button.te-btn.warn", { type: "button", disabled: !ed.editCount, onclick: () => { if (confirm("Discard every edit?")) ed.clearAll(); } }, "Discard all edits")));
  };
  const renderMain = () => keepFocus(main, () => {
    if (view === "changes") { main.replaceChildren(changesView()); return; }
    const row = ed.rowById.get(ed.selected)!;
    main.replaceChildren(renderDetail(reg, ed, row, hooks()));
  });

  function go(hash: string) {
    if (location.hash !== hash) history.replaceState(null, "", hash);
    route();
  }
  function route() {
    const t = /^#t\/(\w+)$/.exec(location.hash);
    const prev = view;
    if (location.hash === "#changes") view = "changes";
    else {
      view = "trainer";
      if (t && ed.rowById.has(t[1])) ed.selected = t[1];
    }
    const scrollTop = prev !== view || !t || t[1] !== ed.selected;
    renderMain();
    if (scrollTop) main.scrollTop = 0;
    for (const b of list.querySelectorAll<HTMLElement>(".te-item")) b.setAttribute("aria-current", String(view === "trainer" && b.dataset.id === ed.selected));
    renderStatus();
  }

  ed.on("change", (id) => {
    if (id) refreshRow(id);
    else renderList();
    renderMain();
    renderStatus();
  });
  ed.on("saved", renderStatus);
  ed.on("select", (id) => { if (id) go(`#t/${id}`); });
  addEventListener("hashchange", route);

  root.replaceChildren(bar, h("div.te-layout", h("aside.te-side", filters, list), main), toasts);
  renderList();
  route();
  list.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest" });
  let note: string | null = null;
  try { note = sessionStorage.getItem(SAVED_NOTE); sessionStorage.removeItem(SAVED_NOTE); } catch { /* storage unavailable */ }
  if (note) toast(`Saved ${note} edited trainer(s) to src/data/trainers.json; they are the shipped data now.`);
  else if (ed.editCount) toast(`Restored ${ed.editCount} edited trainer(s) from your last visit.`);
}

void main().catch((e: unknown) => {
  console.error(e);
  document.getElementById("trainereditor")!.replaceChildren(h("p.boot", `The Trainer Editor could not start: ${e instanceof Error ? e.message : String(e)}`));
});
