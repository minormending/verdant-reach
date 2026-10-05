import { describe, expect, it } from "vitest";
import {
  CHARACTERS, REQUIRED_ITEMS, SPECIES_IDS, STRUCTURES, TILES, TRAINER_PORTRAITS,
} from "../contracts/ids";
import type { TileKey } from "../contracts/ids";
import {
  characterPath, itemIconPath, portraitPath, speciesPath, structurePath, tilePath, uiPath,
} from "../contracts/constants";
import { ASSET_PATHS } from "./manifest";

// The manifest is generated from the files on disk (tools/art/build_manifest.py,
// which also checks sizes), so listing a path means the file exists.

/** Every asset path the contracts promise. */
function requiredPaths(): string[] {
  const out: string[] = [];
  for (const id of SPECIES_IDS) {
    for (const kind of ["front", "back", "icon", "icon__2"] as const) out.push(speciesPath(id, kind));
  }
  for (const key of Object.keys(TILES) as TileKey[]) out.push(tilePath(key));
  for (const key of ["water", "tall_grass", "flowers"] as const) out.push(tilePath(key, 2));
  for (const key of Object.keys(STRUCTURES) as (keyof typeof STRUCTURES)[]) out.push(structurePath(key));
  for (const key of CHARACTERS) out.push(characterPath(key));
  for (const key of TRAINER_PORTRAITS) out.push(portraitPath(key));
  for (const id of REQUIRED_ITEMS) out.push(itemIconPath(id));
  for (const n of ["title", "title_logo", "pod", "pod_open", "mark_bramble", "mark_sundew", "battle_ground"] as const) {
    out.push(uiPath(n));
  }
  return out;
}

describe("asset manifest", () => {
  it("lists every asset the contracts require", () => {
    const listed = new Set(ASSET_PATHS);
    const missing = requiredPaths().filter((p) => !listed.has(p));
    expect(missing).toEqual([]);
  });

  it("uses site-root-relative paths with no duplicates", () => {
    for (const p of ASSET_PATHS) expect(p.startsWith("assets/")).toBe(true);
    expect(new Set(ASSET_PATHS).size).toBe(ASSET_PATHS.length);
  });
});
