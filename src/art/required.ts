// Every logical path the contracts require, with its expected size where the
// contracts fix it. Shared by the bundle test and the Art Lab's checks.

import {
  CHARACTERS, MARKS, REQUIRED_ITEMS, SPECIES_IDS, STILLS, STRUCTURES, TILES, TRAINER_PORTRAITS,
  characterPath, itemIconPath, portraitPath, speciesPath, stillPath, structurePath, tilePath, uiPath,
} from "../contracts";
import type { StructureKey, TileKey } from "../contracts";

export type RequiredGroup = "species" | "tiles" | "structures" | "characters" | "portraits" | "items" | "ui" | "stills";

export interface RequiredPath {
  path: string;
  group: RequiredGroup;
  /** [w, h] when fixed by the contracts. */
  size?: [number, number];
  alternateSizes?: [number, number][];
}

/** Tiles whose second animation frame the game relies on. */
export const ANIMATED_TILES: readonly TileKey[] = ["water", "tall_grass", "flowers"];

/** UI name for a Pressed Mark ("bramble_mark" -> "mark_bramble"). */
export const markUiName = (mark: string) => `mark_${mark.replace(/_mark$/, "")}`;

export function requiredPaths(): RequiredPath[] {
  const out: RequiredPath[] = [];
  for (const id of SPECIES_IDS) {
    out.push({ path: speciesPath(id, "front"), group: "species", size: [64, 64], alternateSizes: [[56, 56]] });
    out.push({ path: speciesPath(id, "back"), group: "species", size: [64, 64], alternateSizes: [[48, 48]] });
    out.push({ path: speciesPath(id, "icon"), group: "species", size: [32, 32], alternateSizes: [[16, 16]] });
  }
  for (const key of Object.keys(TILES) as TileKey[]) {
    // wall_face has a supported procedural base/upper/lower fallback.
    if (key !== "wall_face") out.push({ path: tilePath(key), group: "tiles", size: [16, 16] });
  }
  for (const key of ANIMATED_TILES) out.push({ path: tilePath(key, 2), group: "tiles", size: [16, 16] });
  for (const key of Object.keys(STRUCTURES) as StructureKey[]) {
    const s = STRUCTURES[key];
    out.push({ path: structurePath(key), group: "structures", size: [s.w * 16, s.h * 16] });
  }
  // Character sheet dimensions are validated against each bundle's frame metadata.
  for (const key of CHARACTERS) out.push({ path: characterPath(key), group: "characters" });
  for (const key of TRAINER_PORTRAITS) {
    out.push({ path: portraitPath(key), group: "portraits", size: key === "player_back" ? [48, 48] : [56, 56] });
  }
  for (const id of REQUIRED_ITEMS) out.push({ path: itemIconPath(id), group: "items", size: [16, 16] });
  out.push({ path: uiPath("title"), group: "ui", size: [160, 144] });
  for (const n of ["title_logo", "pod", "pod_open", "battle_ground"] as const) out.push({ path: uiPath(n), group: "ui" });
  for (const m of MARKS) out.push({ path: `assets/ui/${markUiName(m)}.png`, group: "ui" });
  out.push({ path: uiPath("seed"), group: "ui", size: [16, 16] });
  out.push({ path: uiPath("seed__2"), group: "ui", size: [16, 16] });
  out.push({ path: uiPath("seed_big"), group: "ui", size: [56, 56] });
  for (const s of STILLS) out.push({ path: stillPath(s), group: "stills", size: [160, 144] });
  return out;
}
