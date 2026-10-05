// src/art: the art runtime (docs/ART.md). Entry point for other modules.
//
//   createArtAssets()  the registry behind ctx.assets (called by createAssets)
//   activeArt()        the page's registry (the Art Lab, editors)
//   artExists(path)    does the active registry provide a logical path?

export {
  ArtRegistry, activeArt, artExists, requestedPacks, setActiveArt, PACKS_STORAGE_KEY,
  type ArtRegistryOptions, type PackInfo,
} from "./registry";
export { ArtCatalog, LAB_LAYER, type BundleView, type Layer, type Resolution } from "./catalog";
export * from "./format";
export { parseLogical, logicalPath, frontKind, FRONT_KINDS, SPECIES_FRAME_KINDS, SET_DIRS, type FrontFrameKind, type LogicalRef } from "./paths";
export {
  animMaxFrame, animState, checkSpeciesAnim, introRemaining, MAX_FRONT_FRAMES, parseSpeciesAnim, stepAt, stepsLength,
  type AnimPhase, type AnimState,
} from "./anim";
export { requiredPaths, type RequiredPath } from "./required";
export { validateArt, errorsOnly, type Problem, type ValidateResult } from "./validate";
export { recolorRgba, makeRecolor, parseHex, toHex, isPalette, type Recolor } from "./palette";

import { ArtRegistry, setActiveArt, type ArtRegistryOptions } from "./registry";

/** Create the page's art registry, make it the active one, and start loading the index. */
export function createArtAssets(opts: ArtRegistryOptions = {}): ArtRegistry {
  const r = new ArtRegistry(opts);
  setActiveArt(r);
  if (typeof document !== "undefined") void r.ready();
  return r;
}
