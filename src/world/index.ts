// WORLD: every map, script and trainer in the slice.

import type { MapDef, MapId, WorldData } from "../contracts";
import type { Scripts } from "./build";
import { TRAINERS } from "./trainers";
import { storyScripts } from "./scripts/story";
import { act1Scripts } from "./scripts/act1";
import { QUESTS, questScripts } from "./scripts/quests";

import * as player_home from "./maps/player_home";
import * as herbarium from "./maps/herbarium";
import * as herbarium_roof from "./maps/herbarium_roof";
import * as fallowfield from "./maps/fallowfield";
import * as route_1 from "./maps/route_1";
import * as hedgerow from "./maps/hedgerow";
import * as fennimore_house from "./maps/fennimore_house";
import * as route_2 from "./maps/route_2";
import * as bramblegate from "./maps/bramblegate";
import * as greenhouse from "./maps/greenhouse";
import * as bramblegate_market from "./maps/bramblegate_market";
import * as bramblegate_conservatory from "./maps/bramblegate_conservatory";
import * as route_3 from "./maps/route_3";
import * as sugarbush from "./maps/sugarbush";
import * as sugarbush_grove from "./maps/sugarbush_grove";
import * as sugarbush_conservatory from "./maps/sugarbush_conservatory";
import { ROUND4_STUBS } from "./maps/round4_stubs";

const maps: Record<MapId, MapDef> = {
  ...ROUND4_STUBS, // ROUND4-STUB: replaced by real maps
  player_home: player_home.player_home,
  herbarium: herbarium.herbarium,
  herbarium_roof: herbarium_roof.herbarium_roof,
  fallowfield: fallowfield.fallowfield,
  route_1: route_1.route_1,
  hedgerow: hedgerow.hedgerow,
  fennimore_house: fennimore_house.fennimore_house,
  route_2: route_2.route_2,
  bramblegate: bramblegate.bramblegate,
  bramblegate_greenhouse: greenhouse.bramblegate_greenhouse,
  bramblegate_market: bramblegate_market.bramblegate_market,
  bramblegate_conservatory: bramblegate_conservatory.bramblegate_conservatory,
  route_3: route_3.route_3,
  sugarbush: sugarbush.sugarbush,
  sugarbush_greenhouse: greenhouse.sugarbush_greenhouse,
  sugarbush_grove: sugarbush_grove.sugarbush_grove,
  sugarbush_conservatory: sugarbush_conservatory.sugarbush_conservatory,
};

const mapScripts: Scripts[] = [
  player_home.scripts, herbarium.scripts, herbarium_roof.scripts, fallowfield.scripts, route_1.scripts,
  hedgerow.scripts, fennimore_house.scripts, route_2.scripts, bramblegate.scripts, greenhouse.scripts,
  bramblegate_market.scripts, bramblegate_conservatory.scripts, route_3.scripts, sugarbush.scripts,
  sugarbush_grove.scripts, sugarbush_conservatory.scripts,
];

function mergeScripts(...all: Scripts[]): Scripts {
  const out: Scripts = {};
  for (const s of all) {
    for (const [id, cmds] of Object.entries(s)) {
      if (out[id]) throw new Error(`duplicate script id ${id}`);
      out[id] = cmds;
    }
  }
  return out;
}

export const WORLD: WorldData = {
  maps,
  scripts: mergeScripts(storyScripts, act1Scripts, questScripts, ...mapScripts),
  trainers: TRAINERS,
  quests: QUESTS,
  // Prologue: the observation deck at night, beside DR. VALE.
  newGame: { map: "herbarium_roof", x: 5, y: 6, facing: "up", script: "prologue" },
};
