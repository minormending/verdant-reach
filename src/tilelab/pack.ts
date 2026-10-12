// Export: the lab's tileset plans as a ready-to-install art pack (docs/ART.md
// §8), zipped, plus per-tile PNGs named like `art.py explode` writes them so
// the work can also be baked into the base tilesets with `art.py pack`.
// Validated with the same rules as the art bundle test (src/art/validate.ts).
// Pure: no DOM; unit-tested.

import { BUNDLE_JSON, PACK_FORMAT, type RawBundle } from "../art/format";
import { encodePng, type Rgba } from "../art/png";
import { errorsOnly, validateArt, type Problem } from "../art/validate";
import type { SheetMapping } from "./mapping";
import { artStems, type TilesetPlan } from "./plan";
import { zipStore, zlibStore, type ZipEntry } from "./zip";

export interface PackMeta {
  id: string;
  name: string;
  description?: string;
  author?: string;
}

export const PACK_ID_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;

/** Problems with a pack id or name before export (empty when fine). */
export function checkMeta(meta: PackMeta, installed: readonly string[] = []): string[] {
  const out: string[] = [];
  if (!PACK_ID_RE.test(meta.id)) out.push("The pack id must be lower case letters, digits, - or _ (up to 40).");
  if (installed.includes(meta.id)) out.push(`A pack called "${meta.id}" is already installed; installing this would replace it.`);
  if (!meta.name.trim()) out.push("The pack needs a name.");
  return out;
}

export function packJson(meta: PackMeta): Record<string, string> {
  return {
    format: PACK_FORMAT, id: meta.id, name: meta.name,
    description: meta.description ?? "Tile overrides made with the Tile Lab.",
    author: meta.author ?? "Tile Lab",
  };
}

const enc = (s: string) => new TextEncoder().encode(s);
export const png = (img: Rgba) => encodePng(img, zlibStore);
const json = (v: unknown) => enc(JSON.stringify(v, null, 2) + "\n");

/** The pack folder as the repo would hold it: path under public/art/packs/<id>/ -> JSON or image. */
export function packTree(plans: readonly TilesetPlan[], meta: PackMeta): { json: Map<string, unknown>; images: Map<string, Rgba> } {
  const j = new Map<string, unknown>([["pack.json", packJson(meta)]]);
  const images = new Map<string, Rgba>();
  for (const p of plans) {
    j.set(`tilesets/${p.id}/${BUNDLE_JSON.tilesets.file}`, p.json);
    images.set(`tilesets/${p.id}/${p.json.sheet}`, p.sheet);
  }
  return { json: j, images };
}

/**
 * Check the pack with src/art/validate.ts, as `npm test` would once it is
 * installed. `baseRaw` is the base tree's raw bundles (tilesets are enough),
 * `image` reads base files by URL ("art/tilesets/terrain/sheet.png").
 * Returns only the pack's own errors.
 */
export function validatePack(plans: readonly TilesetPlan[], meta: PackMeta, baseRaw: readonly RawBundle[], image: (url: string) => Rgba | null, artRoot = "art/"): Problem[] {
  const tree = packTree(plans, meta);
  const dir = `${artRoot}packs/${meta.id}/`;
  const raw: RawBundle[] = baseRaw.filter((r) => r.pack === null && r.kind === "tilesets");
  for (const p of plans) raw.push({ kind: "tilesets", id: p.id, pack: meta.id, files: [BUNDLE_JSON.tilesets.file, p.json.sheet], json: p.json });
  const res = validateArt({
    raw, packs: { [meta.id]: { json: tree.json.get("pack.json") } }, legacy: [], required: [], artRoot,
    image: (url) => (url.startsWith(dir) ? tree.images.get(url.slice(dir.length)) ?? null : image(url)),
  });
  return errorsOnly(res.problems).filter((p) => p.where === `packs/${meta.id}` || p.where.startsWith(`packs/${meta.id}/`));
}

export interface ExportInfo {
  /** Packs that were active under the edits (the export is meant to sit above them). */
  basePacks: readonly string[];
  mapping?: SheetMapping | null;
  date?: Date;
}

export function readme(plans: readonly TilesetPlan[], meta: PackMeta, info: ExportInfo): string {
  const packs = [...info.basePacks, meta.id].join(",");
  const date = (info.date ?? new Date()).toISOString().slice(0, 10);
  const lines = [
    `# ${meta.name} (art pack \`${meta.id}\`)`,
    "",
    `Made with the Verdant Reach Tile Lab (tilelab.html) on ${date}.`,
    "",
    "| Tileset | What changed |",
    "|---|---|",
    ...plans.map((p) => `| ${p.id} | ${p.full ? "whole sheet replaced" : ""}${p.full && p.edited.length ? "; " : ""}${p.edited.length ? `tiles: ${p.edited.join(", ")}` : ""} |`),
    "",
    "## Try it as a pack",
    "",
    `1. Copy the \`${meta.id}/\` folder to \`public/art/packs/${meta.id}/\`.`,
    "2. Run `npm run art:index` (required after adding files under public/art/).",
    `3. Run \`npm run dev\` and open http://localhost:5173/?art=${packs}`,
    `   (the guide and the Tile Lab take \`?art=${packs}\` too).`,
    "4. Run `npm test`: the art bundle test validates the pack (docs/ART.md §9).",
    ...(info.basePacks.length ? ["", `The lab had these packs active under the edits: ${info.basePacks.join(", ")}. List them before \`${meta.id}\` in \`?art=\`.`] : []),
    "",
    "## Or bake it into the base tilesets",
    "",
    "`tiles/<tileset>/` holds every image of every key this pack redefines, named as",
    "`tools/art/art.py explode` names them (`grass.png`, `grass__2.png`, `grass~1.png`, `water@5.png`, `water@5__2.png`).",
    "With the art venv (`PY=.venv/bin/python`):",
    "",
    "```bash",
    ...plans.flatMap((p) => [
      `$PY tools/art/art.py explode ${p.id} /tmp/${p.id}`,
      ...(p.dropped.length ? [`rm -f ${p.dropped.map((s) => `/tmp/${p.id}/${s}.png`).join(" ")}`] : []),
      `cp tiles/${p.id}/*.png /tmp/${p.id}/`,
      `$PY tools/art/art.py pack /tmp/${p.id} ${p.id}`,
    ]),
    "npm run art:index && npm test",
    "```",
    "",
    "`art.py pack` re-lays the sheet out canonically and marks the tileset `source: edited`, so",
    "generators no longer overwrite it.",
    ...(info.mapping ? ["", "`tilelab-mapping.json` is the external-sheet mapping; load it in the Tile Lab (Tilesets → Map an external sheet) with the same sheet."] : []),
    "",
  ];
  return lines.join("\n");
}

/** Every file of the export, as zip entries under `<id>/`, `tiles/` and the root. */
export function exportEntries(plans: readonly TilesetPlan[], meta: PackMeta, info: ExportInfo): ZipEntry[] {
  const tree = packTree(plans, meta);
  const out: ZipEntry[] = [{ name: "README.md", data: enc(readme(plans, meta, info)) }];
  for (const [path, v] of tree.json) out.push({ name: `${meta.id}/${path}`, data: json(v) });
  for (const [path, img] of tree.images) out.push({ name: `${meta.id}/${path}`, data: png(img) });
  for (const p of plans) {
    const stems = new Map<string, Rgba>();
    for (const [key, a] of p.art) for (const [s, im] of artStems(key, a)) stems.set(s, im);
    for (const [s, im] of [...stems].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) out.push({ name: `tiles/${p.id}/${s}.png`, data: png(im) });
  }
  if (info.mapping) out.push({ name: "tilelab-mapping.json", data: json(info.mapping) });
  return out;
}

export function exportZip(plans: readonly TilesetPlan[], meta: PackMeta, info: ExportInfo): Uint8Array {
  return zipStore(exportEntries(plans, meta, info), info.date);
}
