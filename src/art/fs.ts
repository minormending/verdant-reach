// Node-side loading of the art tree from disk, for the bundle test and tools.
// Never imported by the game (it uses node: built-ins).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { BUNDLE_JSON, rawBundlesOf, type ArtIndex, type RawBundle } from "./format";
import { decodePng, type Rgba } from "./png";
import type { ValidateInput } from "./validate";

/** Read every bundle JSON the index lists, from `publicDir`. */
export function loadRawFromDisk(publicDir: string, index: ArtIndex): RawBundle[] {
  return rawBundlesOf(index).map((r) => {
    const p = join(publicDir, "art", ...(r.pack ? ["packs", r.pack] : []), r.kind, r.id, BUNDLE_JSON[r.kind].file);
    try {
      return { ...r, json: JSON.parse(readFileSync(p, "utf8")) };
    } catch (e) {
      return { ...r, error: e instanceof Error ? e.message : String(e) };
    }
  });
}

export function loadPacksFromDisk(publicDir: string, index: ArtIndex): ValidateInput["packs"] {
  const out: ValidateInput["packs"] = {};
  for (const id of Object.keys(index.packs)) {
    try { out[id] = { json: JSON.parse(readFileSync(join(publicDir, "art", "packs", id, "pack.json"), "utf8")) }; }
    catch (e) { out[id] = { error: e instanceof Error ? e.message : String(e) }; }
  }
  return out;
}

/** A cached PNG reader over site-root-relative URLs. */
export function diskImages(publicDir: string): (url: string) => Rgba | null {
  const cache = new Map<string, Rgba | null>();
  return (url) => {
    if (cache.has(url)) return cache.get(url)!;
    const p = join(publicDir, ...url.split("/"));
    let out: Rgba | null = null;
    if (existsSync(p)) {
      try { out = decodePng(readFileSync(p), inflateSync); } catch { out = null; }
    }
    cache.set(url, out);
    return out;
  };
}
