// Menu screens (party, bag, herbarium, summary, cabinet, shop, options).

import type { GameContext, Screens } from "../contracts";
import { bagScreen } from "./bag";
import { cabinetScreen } from "./cabinet";
import { herbariumScreen, showHerbariumEntry } from "./herbarium";
import { applyVolumes, loadVolumes, optionsScreen } from "./options";
import { partyScreen } from "./party";
import { shopScreen } from "./shop";
import { summaryScreen } from "./summary";

export function createScreens(ctx: GameContext): Screens {
  // Restore the player's saved volumes once audio exists.
  queueMicrotask(() => applyVolumes(ctx, loadVolumes()));
  return {
    party: (opts) => partyScreen(ctx, { mode: opts?.mode ?? "view", prompt: opts?.prompt }),
    bag: (opts) => bagScreen(ctx, { inBattle: opts?.inBattle ?? false }),
    herbarium: () => herbariumScreen(ctx),
    summary: async (i) => {
      if (ctx.state.party[i]) await summaryScreen(ctx, ctx.state.party, i);
    },
    cabinet: () => cabinetScreen(ctx),
    shop: (stock) => shopScreen(ctx, stock),
    options: () => optionsScreen(ctx),
  };
}

export { showHerbariumEntry };
