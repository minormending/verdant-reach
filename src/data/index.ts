// Static game data entry point. Other modules import only `DATA`.

import type { GameData } from "../contracts";
import { SPECIES } from "./species";
import { MOVES } from "./moves";
import { ITEMS } from "./items";
import { TYPE_CHART } from "./typeChart";
import { HERBARIUM } from "./herbarium";
import { expForLevel } from "./growth";

export const DATA: GameData = {
  species: SPECIES,
  moves: MOVES,
  items: ITEMS,
  typeChart: TYPE_CHART,
  herbarium: HERBARIUM,
  expForLevel,
};
