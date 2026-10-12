// The game's ?tilelab=1 hook: apply the Tile Lab's saved overrides to the
// game's art registry at boot. Only src/main.ts imports this, dynamically and
// only when the URL has `tilelab`; without the param the game never loads it.
// Failures are logged and the game carries on with its normal art.

import { activeArt } from "../art";
import { installLab } from "./install";
import { loadState } from "./store";

export async function applyStoredTileLab(): Promise<void> {
  try {
    const reg = activeArt();
    if (!reg) return;
    const state = await loadState();
    if (!state) { console.info("[tilelab] no saved Tile Lab work; using the normal art"); return; }
    const { plans } = await installLab(reg, state);
    console.info(`[tilelab] applied ${plans.length} tileset override(s)${state.packs.length ? ` over packs ${state.packs.join(", ")}` : ""}`);
  } catch (e) {
    console.warn("[tilelab] could not apply the Tile Lab's overrides", e);
  }
}
