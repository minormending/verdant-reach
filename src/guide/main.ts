// The guidebook page (guide.html): the walkthrough written in
// src/guide/walkthrough/, expanded with the game's own data and art, then
// the reference sections. See docs/GUIDE.md.

import "./guide.css";
import { initArt } from "./art";
import { renderAllPending, renderBlock } from "./blocks";
import { buildGuide, type Guide } from "./context";
import { h } from "./dom";
import { contents, cover, howToPlay, partsOf } from "./front";
import { referenceSections, type RefSection } from "./reference";
import { anchor, mapName, sectionHeading } from "./ui";
import type { Section } from "./types";
import { WALKTHROUGH } from "./walkthrough";

const THEME_KEY = "verdant.guide.theme";

function applyTheme(t: string | null) {
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

function themeToggle(): HTMLElement {
  let saved: string | null = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch { /* storage unavailable */ }
  applyTheme(saved);
  const b = h<HTMLButtonElement>("button.icon-btn", { type: "button", "aria-label": "Switch light or dark mode", title: "Light / dark" }, "◐");
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

interface Hit { label: string; kind: string; href: string; key: string }

function searchIndex(g: Guide): Hit[] {
  const hits: Hit[] = [];
  for (const s of Object.values(g.data.species)) hits.push({ label: s.name, kind: "Plant", href: `#${anchor.species(s.id)}`, key: s.name.toLowerCase() });
  for (const i of Object.values(g.data.items)) hits.push({ label: i.name, kind: "Item", href: `#${anchor.item(i.id)}`, key: i.name.toLowerCase() });
  for (const m of Object.values(g.data.moves)) hits.push({ label: m.name, kind: "Move", href: `#${anchor.move(m.id)}`, key: m.name.toLowerCase() });
  for (const id of g.mapPanels) hits.push({ label: mapName(g, id), kind: "Map", href: `#${anchor.map(id)}`, key: mapName(g, id).toLowerCase() });
  for (const s of g.sections) hits.push({ label: s.title, kind: s.part, href: `#${s.id}`, key: s.title.toLowerCase() });
  return hits;
}

function searchBox(g: Guide): HTMLElement {
  const index = searchIndex(g);
  const input = h<HTMLInputElement>("input.search", { type: "search", placeholder: "Search plants, items, moves…", "aria-label": "Search the guide", autocomplete: "off" });
  const list = h("ul.search-results", { role: "listbox", hidden: true });
  const update = () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { list.hidden = true; return; }
    const found = index.filter((x) => x.key.includes(q)).sort((a, b) => Number(!a.key.startsWith(q)) - Number(!b.key.startsWith(q)) || a.key.localeCompare(b.key)).slice(0, 12);
    list.replaceChildren(...(found.length
      ? found.map((x) => h("li", h("a", { href: x.href, role: "option" }, h("span", x.label), h("small", x.kind))))
      : [h("li.muted", "No matches")]));
    list.hidden = false;
  };
  input.addEventListener("input", update);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { const a = list.querySelector("a"); if (a) { location.hash = a.getAttribute("href")!; list.hidden = true; input.blur(); } }
    if (e.key === "Escape") { input.value = ""; list.hidden = true; }
  });
  list.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest("a")) { list.hidden = true; input.value = ""; } });
  document.addEventListener("click", (e) => { if (!(e.target as HTMLElement).closest(".search-wrap")) list.hidden = true; });
  return h("div.search-wrap", input, list);
}

function printButton(): HTMLElement {
  const b = h<HTMLButtonElement>("button.icon-btn", { type: "button", title: "Print the guide (draws every map first)", "aria-label": "Print" });
  // A printer, drawn as a tiny inline SVG (no icon font).
  b.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 6V2h8v4M4 12H2V6h12v6h-2M4 9h8v5H4z"/></svg>';
  b.addEventListener("click", async () => {
    b.disabled = true;
    await renderAllPending();
    b.disabled = false;
    print();
  });
  return b;
}

function topbar(g: Guide, refs: RefSection[]): HTMLElement {
  return h("div.topbar",
    h("a.brand", { href: "#top" }, h("span.leaf", { "aria-hidden": "true" }), h("span", "VERDANT REACH"), h("small", "GUIDE")),
    h("nav.quick", { "aria-label": "Sections" },
      h("a", { href: "#contents" }, "Contents"),
      h("a", { href: "#walkthrough" }, "Walkthrough"),
      refs.map((r) => h("a", { href: `#${r.id}` }, r.title.replace("Field ", ""))),
    ),
    searchBox(g),
    printButton(),
    themeToggle(),
  );
}

function walkthrough(g: Guide): HTMLElement {
  const parts = partsOf(g);
  return h("section.walkthrough", { id: "walkthrough" },
    h("h2.part-title", h("span.kicker", "Part one"), "Walkthrough"),
    parts.length ? null : h("p.muted", "The walkthrough is on its way."),
    parts.map((p) => h("section.part", { id: p.id },
      h("h2.part-head", h("span.kicker", "Walkthrough"), p.part),
      p.sections.map((s) => h("section.wt", { id: s.id },
        sectionHeading(3, `${s.id}-h`, s.title),
        s.blocks.map((b) => renderBlock(g, b)),
      )),
    )),
  );
}

async function sectionsToShow(): Promise<Section[]> {
  if (import.meta.env.DEV && new URLSearchParams(location.search).get("preview") === "atlas") {
    const { atlasSections } = await import("./preview");
    return [...WALKTHROUGH, ...atlasSections()];
  }
  return WALKTHROUGH;
}

async function boot() {
  const root = document.getElementById("guide")!;
  await initArt();
  const g = buildGuide(await sectionsToShow());
  const refs = referenceSections(g);
  root.replaceChildren(
    topbar(g, refs),
    h("main.page",
      cover(g),
      contents(g, refs),
      howToPlay(g),
      walkthrough(g),
      h("div.reference", { id: "reference" }, refs.map((r) => r.el)),
      h("footer.foot",
        h("p", "Every table, picture and number on this page is generated from the game's own data and art, so the guide always matches the build."),
        h("p", h("a", { href: "./" }, "Play Verdant Reach"), " · ", h("a", { href: "#top" }, "Back to top")),
      ),
    ),
  );
  // Printing shows every trainer's moves and every rival variant.
  addEventListener("beforeprint", () => {
    for (const d of Array.from(document.querySelectorAll("details"))) d.open = true;
  });
  // Honour a deep link now that the page exists.
  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
}

boot().catch((e) => {
  console.error(e);
  document.getElementById("guide")!.textContent = "The guide failed to load. Please reload the page.";
});
