// PLACEHOLDER - replaced by the world agent.
import type { WorldData } from "../contracts";

export const WORLD: WorldData = {
  maps: {} as WorldData["maps"],
  scripts: {},
  trainers: {},
  newGame: { map: "herbarium", x: 4, y: 4, facing: "up", script: "prologue" },
};
