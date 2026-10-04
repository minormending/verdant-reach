// PLACEHOLDER - replaced by the data agent.
import type { GameData } from "../contracts";

export const DATA: GameData = {
  species: {} as GameData["species"],
  moves: {},
  items: {},
  typeChart: {} as GameData["typeChart"],
  herbarium: {} as GameData["herbarium"],
  expForLevel: (_rate, level) => level ** 3,
};
