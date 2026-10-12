// Put the lab's state into an ArtRegistry, in memory: each touched tileset
// gets a lab-layer patch (its TilesetPlan JSON, pointing at a sheet file that
// only exists as an in-memory override). Used by tilelab.html and by the
// game's ?tilelab=1 boot hook. Nothing is written to disk.

import type { ArtRegistry } from "../art";
import type { Rgba } from "../art/png";
import { pathsToLoad, planAll, type ArtSource, type LabState, type TilesetPlan } from "./plan";

/** File name of the in-memory sheet (resolved inside the tileset's own folder; never fetched). */
export const LAB_SHEET = "tilelab-sheet.png";

export function rgbaToCanvas(img: Rgba): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d")!;
  if (img.width && img.height) g.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
  return c;
}

export function imageToRgba(img: CanvasImageSource & { width: number; height: number }): Rgba {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  return { width: d.width, height: d.height, data: new Uint8Array(d.data.buffer.slice(0)) };
}

/** An ArtSource over a registry (its files must be loaded). */
export function registrySource(reg: ArtRegistry): ArtSource {
  return { catalog: reg.catalog, pixels: (url) => reg.pixels(url) };
}

export interface Installed {
  plans: TilesetPlan[];
  /** The same art without the lab's edits (same packs): the "before" side of A/B. */
  base: ArtRegistry;
}

/** Replace every lab override in `reg` with `state`'s. */
export async function installLab(reg: ArtRegistry, state: LabState): Promise<Installed> {
  await reg.ready();
  reg.clearOverrides();
  const packs = state.packs.filter((p) => reg.index.packs[p]);
  if (packs.join(",") !== reg.activePacks().join(",")) reg.setActivePacks(packs);
  const base = reg.fork(reg.activePacks());
  await base.loadAll(pathsToLoad(base.catalog, state));
  const plans = planAll(registrySource(base), state);
  for (const p of plans) {
    const v = reg.bundle("tilesets", p.id);
    if (!v) continue;
    reg.overrideFile(v.layers[0].dir + LAB_SHEET, rgbaToCanvas(p.sheet));
    reg.patchBundle("tilesets", p.id, { ...p.json, sheet: LAB_SHEET });
  }
  return { plans, base };
}
