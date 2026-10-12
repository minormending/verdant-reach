// The Tile Lab page (tilelab.html): every map under the current tiles, and
// in-memory tileset swaps (one tile, a whole sheet, an installed pack or an
// external sheet mapped by hand), kept in IndexedDB, exported as an art pack
// and playable in the game with ?tilelab=1. See docs/ART.md § Tile Lab.

import "./tilelab.css";
import type { MapId } from "../contracts";
import { h } from "../guide/dom";
import { Lab, STORY_PRESETS } from "./app";
import { createAtlas, createViewer } from "./atlas";
import { createChanges } from "./changes";
import { createPalette } from "./palette";
import { createSheets } from "./sheets";
import { isEmptyState } from "./plan";

const THEME_KEY = "verdant.tilelab.theme";
const TAB_KEY = "verdant.tilelab.tab";

function applyTheme(t: string | null) {
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

function themeToggle(): HTMLElement {
  let saved: string | null = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch { /* storage unavailable */ }
  applyTheme(saved);
  const b = h<HTMLButtonElement>("button.tl-btn.icon", { type: "button", "aria-label": "Switch light or dark mode", title: "Light / dark" }, "◐");
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
  const el = h("div.tl-toasts", { role: "status", "aria-live": "polite" });
  return {
    el,
    toast(msg: string) {
      const t = h("div.tl-toast", msg);
      el.append(t);
      setTimeout(() => t.remove(), 5000);
    },
  };
}

async function main() {
  const root = document.getElementById("tilelab")!;
  const lab = new Lab();
  await lab.boot();
  if (import.meta.env.DEV) (window as unknown as { __tilelab: Lab }).__tilelab = lab;
  const { el: toasts, toast } = toaster();

  // ---- header ----------------------------------------------------------------------
  const story = h<HTMLSelectElement>("select.tl-input", { "aria-label": "Story state", title: "Story state the maps are drawn in" },
    ...STORY_PRESETS.map((p) => h("option", { value: p.id }, p.label)));
  story.addEventListener("change", () => lab.setStory(story.value));
  const compare = h<HTMLButtonElement>("button.tl-btn", { type: "button", title: "Hold (or hold C) to see the art without the lab's changes" }, "Hold to compare");
  const hold = (on: boolean) => { lab.setCompare(on); compare.classList.toggle("on", on); document.body.classList.toggle("comparing", on); };
  compare.addEventListener("pointerdown", (e) => { compare.setPointerCapture(e.pointerId); hold(true); });
  compare.addEventListener("pointerup", () => hold(false));
  compare.addEventListener("pointercancel", () => hold(false));
  compare.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); hold(true); } });
  compare.addEventListener("keyup", () => hold(false));
  document.addEventListener("keydown", (e) => {
    if ((e.key === "c" || e.key === "C") && !e.repeat && !(e.target as HTMLElement).closest("input, select, textarea")) hold(true);
  });
  document.addEventListener("keyup", (e) => { if (e.key === "c" || e.key === "C") hold(false); });
  const walk = h<HTMLButtonElement>("button.tl-btn.primary", { type: "button", title: "Open the game with the lab's tiles (index.html?tilelab=1)" }, "Walk around ▶");
  walk.addEventListener("click", async () => {
    const ok = await lab.flush();
    if (!ok) toast("IndexedDB isn't available, so the game can't read the lab's tiles.");
    window.open(new URL("index.html?tilelab=1", location.href).href, "_blank", "noopener");
  });
  const clearAll = h<HTMLButtonElement>("button.tl-btn.warn", { type: "button" }, "Clear all");
  clearAll.addEventListener("click", async () => {
    if (isEmptyState(lab.state) || confirm("Remove every swap, sheet, mapping and pack preview?")) { await lab.clearAll(); toast("Cleared."); }
  });
  const busy = h("span.tl-status", { "aria-live": "polite" });
  lab.on("busy", () => { busy.textContent = "Applying…"; });
  lab.on("art", () => { busy.textContent = lab.saved === false ? "Not saved (no IndexedDB)" : ""; });
  const bar = h("header.tl-bar",
    h("a.tl-brand", { href: "./guide.html", title: "The guidebook" }, h("b", "VERDANT REACH"), h("span", "Tile Lab")),
    h("div.tl-row.tl-bar-tools", story, compare, walk, clearAll, busy, themeToggle()));

  // ---- sidebar tabs ------------------------------------------------------------------
  let viewer: ReturnType<typeof createViewer> | null = null;
  const openMap = (id: string) => viewer?.open(id as MapId);
  const tabs = [
    { id: "tiles", label: "Tiles", el: createPalette(lab, toast, openMap) },
    { id: "tilesets", label: "Tilesets", el: createSheets(lab, toast) },
    { id: "changes", label: "Changes & export", el: createChanges(lab, toast) },
  ];
  const tabBar = h("div.tl-tabs", { role: "tablist" });
  const panels = h("div.tl-panels");
  const showTab = (id: string) => {
    for (const t of tabs) {
      t.el.hidden = t.id !== id;
      tabBar.querySelector(`[data-tab="${t.id}"]`)?.setAttribute("aria-selected", String(t.id === id));
    }
    try { localStorage.setItem(TAB_KEY, id); } catch { /* storage unavailable */ }
  };
  for (const t of tabs) {
    const b = h<HTMLButtonElement>("button.tl-tab", { type: "button", role: "tab", "data-tab": t.id }, t.label);
    b.addEventListener("click", () => showTab(t.id));
    tabBar.append(b);
    t.el.setAttribute("role", "tabpanel");
    panels.append(t.el);
  }
  let tab = "tiles";
  try { tab = localStorage.getItem(TAB_KEY) ?? "tiles"; } catch { /* storage unavailable */ }
  showTab(tabs.some((t) => t.id === tab) ? tab : "tiles");
  const side = h("aside.tl-side", tabBar, panels);

  // ---- atlas and viewer ---------------------------------------------------------------
  const atlas = createAtlas(lab, (id) => viewer?.open(id));
  viewer = createViewer(lab, atlas.filtered);
  const main = h("main.tl-main", atlas.el, viewer.el);

  root.replaceChildren(bar, h("div.tl-layout", side, main), toasts);
  addEventListener("dragover", (e) => e.preventDefault());
  addEventListener("drop", (e) => { e.preventDefault(); toast("Drop PNGs onto a tile card, a tileset row or the mapper."); });
  const hash = /^#map\/(\w+)$/.exec(location.hash);
  if (hash) viewer.open(hash[1] as MapId);
  if (!isEmptyState(lab.state)) toast("Restored your Tile Lab work from the last visit.");
}

void main().catch((e: unknown) => {
  console.error(e);
  document.getElementById("tilelab")!.replaceChildren(h("p.boot", `The Tile Lab could not start: ${e instanceof Error ? e.message : String(e)}`));
});
