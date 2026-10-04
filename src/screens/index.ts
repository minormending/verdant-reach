// PLACEHOLDER - replaced by the battle agent (party, bag, herbarium, summary, cabinet, shop, options).
import type { GameContext, Screens } from "../contracts";

export function createScreens(_ctx: GameContext): Screens {
  return {
    party: async () => -1,
    bag: async () => null,
    herbarium: async () => {},
    summary: async () => {},
    cabinet: async () => {},
    shop: async () => {},
    options: async () => {},
  };
}
