#!/usr/bin/env node
// Generates public/art/index.json: the registry of every art bundle, every art
// pack and (during the Round 4 migration) every legacy file under
// public/assets/. Node, zero dependencies.
//
//   npm run art:index            write public/art/index.json
//   node tools/art/index.mjs --check   exit 1 if index.json is out of date
//
// The runtime (src/art/) reads the index to know which bundles exist and which
// files each bundle folder holds (packs resolve file names in the pack folder
// first, then in the base folder). It never needs the JSON contents here: the
// bundle JSON files are fetched directly, so editing a bundle's JSON or
// redrawing a PNG needs no re-index. Adding, removing or renaming a file or a
// bundle folder does. `src/art/bundles.test.ts` fails when the index is stale.
//
// Format (verdant.artindex/1):
//   {
//     "format": "verdant.artindex/1",
//     "species":    { "<id>": ["front.png", ...] },   // every file in the folder except the bundle JSON
//     "tilesets":   { ... }, "structures": { ... }, "characters": { ... }, "sets": { ... },
//     "packs": { "<pack_id>": { "name", "description", "author", "species": { ... }, ... } },
//     "legacy": ["assets/tiles/grass.png", ...]       // transitional; empty once public/assets/ is gone
//   }

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const INDEX_FORMAT = "verdant.artindex/1";
// Private, gitignored packs. Keep in sync with src/art/format.ts (tested).
export const LOCAL_PACKS = ["limezu"];

/** Bundle kinds: folder name -> the JSON file that marks a bundle folder. */
export const BUNDLE_KINDS = {
  species: "species.json",
  tilesets: "tileset.json",
  structures: "structure.json",
  characters: "character.json",
  sets: "set.json",
};

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DEFAULT_PUBLIC = join(ROOT, "public");

const isDir = (p) => existsSync(p) && statSync(p).isDirectory();
const visible = (name) => !name.startsWith(".") && name !== "Thumbs.db";
const sorted = (xs) => [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

/** Every file (recursively, posix-relative) in a bundle folder except its JSON. */
function bundleFiles(dir, jsonName) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      if (!visible(name)) continue;
      const p = join(d, name);
      if (isDir(p)) walk(p);
      else out.push(relative(dir, p).split(sep).join("/"));
    }
  };
  walk(dir);
  return sorted(out.filter((f) => f !== jsonName));
}

/** The bundles of one tree (the base tree, or one pack's tree). */
function scanTree(treeDir) {
  const out = {};
  for (const [kind, jsonName] of Object.entries(BUNDLE_KINDS)) {
    const kindDir = join(treeDir, kind);
    const bundles = {};
    if (isDir(kindDir)) {
      for (const id of sorted(readdirSync(kindDir))) {
        const d = join(kindDir, id);
        if (!visible(id) || !isDir(d) || !existsSync(join(d, jsonName))) continue;
        bundles[id] = bundleFiles(d, jsonName);
      }
    }
    out[kind] = bundles;
  }
  return out;
}

/** Folders under a kind directory that hold no bundle JSON (probably a mistake). */
export function strayFolders(publicDir = DEFAULT_PUBLIC) {
  const art = join(publicDir, "art");
  const trees = [art];
  const packsDir = join(art, "packs");
  if (isDir(packsDir)) for (const p of readdirSync(packsDir)) if (visible(p) && isDir(join(packsDir, p))) trees.push(join(packsDir, p));
  const out = [];
  for (const tree of trees) {
    for (const [kind, jsonName] of Object.entries(BUNDLE_KINDS)) {
      const kindDir = join(tree, kind);
      if (!isDir(kindDir)) continue;
      for (const id of readdirSync(kindDir)) {
        const d = join(kindDir, id);
        if (visible(id) && isDir(d) && !existsSync(join(d, jsonName))) out.push(relative(publicDir, d).split(sep).join("/"));
      }
    }
  }
  return sorted(out);
}

/** Build the index object for `publicDir` (defaults to the repo's public/). */
export function buildIndex(publicDir = DEFAULT_PUBLIC) {
  const art = join(publicDir, "art");
  const index = { format: INDEX_FORMAT, ...scanTree(art), packs: {}, legacy: [] };
  const packsDir = join(art, "packs");
  if (isDir(packsDir)) {
    for (const id of sorted(readdirSync(packsDir))) {
      const d = join(packsDir, id);
      if (LOCAL_PACKS.includes(id) || !visible(id) || !isDir(d) || !existsSync(join(d, "pack.json"))) continue;
      index.packs[id] = scanPack(d, id);
    }
  }
  const legacyDir = join(publicDir, "assets");
  if (isDir(legacyDir)) {
    const files = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        if (!visible(name)) continue;
        const p = join(dir, name);
        if (isDir(p)) walk(p);
        else if (name.endsWith(".png")) files.push(relative(publicDir, p).split(sep).join("/"));
      }
    };
    walk(legacyDir);
    index.legacy = sorted(files);
  }
  return index;
}

function scanPack(dir, id) {
  let meta = {};
  try { meta = JSON.parse(readFileSync(join(dir, "pack.json"), "utf8")) ?? {}; } catch { /* empty metadata */ }
  return {
    name: typeof meta.name === "string" ? meta.name : id,
    description: typeof meta.description === "string" ? meta.description : "",
    author: typeof meta.author === "string" ? meta.author : "",
    ...scanTree(dir),
  };
}

/** Separate indexes with empty base trees and exactly one local pack each. */
export function buildLocalIndexes(publicDir = DEFAULT_PUBLIC) {
  const indexes = {};
  for (const id of LOCAL_PACKS) {
    const dir = join(publicDir, "art", "packs", id);
    if (!isDir(dir) || !existsSync(join(dir, "pack.json"))) continue;
    const emptyTree = Object.fromEntries(Object.keys(BUNDLE_KINDS).map((k) => [k, {}]));
    indexes[id] = { format: INDEX_FORMAT, ...emptyTree, packs: { [id]: scanPack(dir, id) }, legacy: [] };
  }
  return indexes;
}

/** Stable, diff-friendly text: one line per bundle. */
export function formatIndex(index) {
  const lines = ["{", `  "format": ${JSON.stringify(index.format)},`];
  const tree = (obj, indent) => {
    const kinds = Object.keys(BUNDLE_KINDS);
    return kinds.map((kind, ki) => {
      const ids = Object.keys(obj[kind] ?? {});
      const body = ids.map((id, i) => `${indent}  ${JSON.stringify(id)}: ${JSON.stringify(obj[kind][id])}${i < ids.length - 1 ? "," : ""}`);
      return ids.length
        ? [`${indent}${JSON.stringify(kind)}: {`, ...body, `${indent}}${ki < kinds.length - 1 ? "," : ""}`].join("\n")
        : `${indent}${JSON.stringify(kind)}: {}${ki < kinds.length - 1 ? "," : ""}`;
    }).join("\n");
  };
  lines.push(tree(index, "  ") + ",");
  const packIds = Object.keys(index.packs);
  if (!packIds.length) lines.push(`  "packs": {},`);
  else {
    lines.push(`  "packs": {`);
    packIds.forEach((id, i) => {
      const p = index.packs[id];
      lines.push(`    ${JSON.stringify(id)}: {`);
      lines.push(`      "name": ${JSON.stringify(p.name)},`);
      lines.push(`      "description": ${JSON.stringify(p.description)},`);
      lines.push(`      "author": ${JSON.stringify(p.author)},`);
      lines.push(tree(p, "      "));
      lines.push(`    }${i < packIds.length - 1 ? "," : ""}`);
    });
    lines.push(`  },`);
  }
  if (!index.legacy.length) lines.push(`  "legacy": []`);
  else lines.push(`  "legacy": [\n${index.legacy.map((p) => `    ${JSON.stringify(p)}`).join(",\n")}\n  ]`);
  lines.push("}");
  return lines.join("\n") + "\n";
}

export function main(argv, publicDir = DEFAULT_PUBLIC) {
  const out = join(publicDir, "art", "index.json");
  const index = buildIndex(publicDir);
  const text = formatIndex(index);
  const outputs = [
    { path: out, text },
    ...Object.entries(buildLocalIndexes(publicDir)).map(([id, local]) => ({
      path: join(publicDir, "art", "packs", id, "index.json"), text: formatIndex(local),
    })),
  ];
  const stray = strayFolders(publicDir);
  for (const s of stray) console.warn(`warning: ${s}/ has no bundle JSON; it is not indexed`);
  if (argv.includes("--check")) {
    let stale = false;
    for (const output of outputs) {
      const current = existsSync(output.path) ? readFileSync(output.path, "utf8") : "";
      if (current !== output.text) {
        console.error(`${relative(publicDir, output.path)} is out of date: run \`npm run art:index\``);
        stale = true;
      }
    }
    if (stale) return 1;
    console.log("art indexes are up to date");
    return 0;
  }
  if (!isDir(join(publicDir, "art"))) {
    console.error("public/art/ does not exist");
    return 1;
  }
  for (const output of outputs) writeFileSync(output.path, output.text);
  const count = (t) => Object.values(BUNDLE_KINDS).length && Object.keys(BUNDLE_KINDS).map((k) => `${Object.keys(t[k]).length} ${k}`).join(", ");
  console.log(`wrote public/art/index.json: ${count(index)}; ${Object.keys(index.packs).length} pack(s); ${index.legacy.length} legacy file(s)`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = main(process.argv.slice(2));
