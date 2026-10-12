// What the lab has changed, and the export: the overrides as an art pack
// (.zip), validated with the art bundle test's rules first.

import type { TileKey } from "../contracts";
import { tilePath } from "../contracts";
import { h } from "../guide/dom";
import type { Lab } from "./app";
import { checkMeta, exportZip, validatePack, type PackMeta } from "./pack";
import { effectiveEdits } from "./plan";
import { pixelCanvas } from "./render";
import { downloadBlob } from "./sheets";

const META_KEY = "verdant.tilelab.packMeta";

function loadMeta(): PackMeta {
  try {
    const v = JSON.parse(localStorage.getItem(META_KEY) ?? "null") as Partial<PackMeta> | null;
    if (v && typeof v.id === "string" && typeof v.name === "string") return { id: v.id, name: v.name };
  } catch { /* storage unavailable */ }
  return { id: "tilelab", name: "TILE LAB" };
}

export function createChanges(lab: Lab, toast: (msg: string) => void): HTMLElement {
  const list = h("div.tl-changes");
  const meta = loadMeta();
  const id = h<HTMLInputElement>("input.tl-input", { value: meta.id, "aria-label": "Pack id", spellcheck: "false" });
  const name = h<HTMLInputElement>("input.tl-input", { value: meta.name, "aria-label": "Pack name" });
  const out = h("div.tl-validation");
  const exportBtn = h<HTMLButtonElement>("button.tl-btn.primary", { type: "button" }, "Download pack (.zip)");
  const root = h("div.tl-changeview",
    h("section", h("h3", "Changes"), list),
    h("section.tl-export",
      h("h3", "Export as an art pack"),
      h("p.tl-muted", "A pack.json plus, for every touched tileset, a tileset.json and a sheet with only the overridden tiles (docs/ART.md §8). The zip also holds per-tile PNGs for art.py and a README on installing it."),
      h("label.tl-field", h("span", "Pack id"), id),
      h("label.tl-field", h("span", "Name"), name),
      exportBtn, out));

  function render() {
    const s = lab.state;
    const edits = effectiveEdits(s);
    const rows: HTMLElement[] = [];
    if (s.packs.length) rows.push(h("p", "Packs previewed: ", h("b", s.packs.join(", "))));
    for (const [tsId, swap] of Object.entries(s.sheets)) {
      const reset = h<HTMLButtonElement>("button.tl-btn.small.warn", { type: "button" }, "Reset");
      reset.addEventListener("click", () => void lab.update((st) => { delete st.sheets[tsId]; }));
      rows.push(h("div.tl-change", h("span", "Sheet of ", h("b", tsId), " → ", swap.name), reset));
    }
    if (s.mapping) rows.push(h("div.tl-change", h("span", "External sheet ", h("b", s.mapping.data.sheet.name), `: ${Object.keys(s.mapping.data.tiles).length} tiles mapped`)));
    for (const [key, e] of Object.entries(s.edits).sort(([a], [b]) => a.localeCompare(b))) {
      const on = h<HTMLInputElement>("input", { type: "checkbox", checked: e.enabled, title: "A/B: show this swap" });
      on.addEventListener("change", () => void lab.update((st) => { st.edits[key] = { ...e, enabled: on.checked }; }));
      const reset = h<HTMLButtonElement>("button.tl-btn.small.warn", { type: "button" }, "Reset");
      reset.addEventListener("click", () => void lab.update((st) => { delete st.edits[key]; }));
      const sel = h<HTMLButtonElement>("button.tl-linkbtn", { type: "button" }, key);
      sel.addEventListener("click", () => lab.select(key as TileKey));
      rows.push(h("div.tl-change", pixelCanvas(lab.reg.image(tilePath(key as TileKey)), 2), h("span", sel, h("small.tl-muted", ` ${lab.owner(key) ?? ""} · ${e.source}${e.fill ? " · everywhere" : ""}`)), h("label.tl-check", on, h("span", "on")), reset));
    }
    if (!rows.length) rows.push(h("p.tl-muted", "Nothing yet. Swap a tile (Tiles tab) or a sheet (Tilesets tab)."));
    rows.push(h("p.tl-muted", `${edits.size} tile key${edits.size === 1 ? "" : "s"} overridden in ${lab.plans.length} tileset${lab.plans.length === 1 ? "" : "s"}${lab.plans.length ? `: ${lab.plans.map((p) => p.id).join(", ")}` : ""}.`));
    list.replaceChildren(...rows);
    exportBtn.disabled = !lab.plans.length;
  }

  exportBtn.addEventListener("click", async () => {
    const m: PackMeta = { id: id.value.trim(), name: name.value.trim() };
    try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch { /* storage unavailable */ }
    const bad = checkMeta(m, lab.reg.packs().map((p) => p.id));
    if (bad.length) { out.replaceChildren(h("ul.tl-problems", ...bad.map((b) => h("li", b)))); return; }
    // The validator reads the base sheets' pixels: make sure they're loaded.
    await lab.base.loadAll(lab.base.catalog.provides().filter((p) => p.startsWith("assets/tiles/")));
    const problems = validatePack(lab.plans, m, lab.base.raw, (url) => lab.base.pixels(url), lab.base.artRoot);
    if (problems.length) {
      out.replaceChildren(h("p", h("b", "Not exported: the pack has problems")), h("ul.tl-problems", ...problems.map((p) => h("li", `${p.where}: ${p.message}`))));
      return;
    }
    const zip = exportZip(lab.plans, m, { basePacks: lab.state.packs, mapping: lab.state.mapping?.data ?? null });
    downloadBlob(new Blob([zip as BlobPart], { type: "application/zip" }), `${m.id}.zip`);
    out.replaceChildren(h("p.tl-ok", `Valid (same rules as the art bundle test). Downloaded ${m.id}.zip: unzip it, copy ${m.id}/ to public/art/packs/, run npm run art:index and open ?art=${[...lab.state.packs, m.id].join(",")}.`));
    toast(`Exported ${m.id}.zip`);
  });

  lab.on("art", render);
  render();
  return root;
}
