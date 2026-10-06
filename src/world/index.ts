// WORLD: every map, script and trainer in the slice.

import type { MapDef, MapId, WorldData } from "../contracts";
import type { Scripts } from "./build";
import { TRAINERS } from "./trainers";
import { storyScripts } from "./scripts/story";
import { act1Scripts } from "./scripts/act1";
import { ch5Scripts } from "./scripts/ch5";
import { ch4Scripts } from "./scripts/ch4";
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
import * as route_4 from "./maps/route_4";
import * as glasshouse_city from "./maps/glasshouse_city";
import * as palm_house from "./maps/palm_house";
import * as glasshouse_market from "./maps/glasshouse_market";
import * as glasshouse_nursery from "./maps/glasshouse_nursery";
import * as glasshouse_relay from "./maps/glasshouse_relay";
import * as glasshouse_conservatory from "./maps/glasshouse_conservatory";
import * as glasshouse_house from "./maps/glasshouse_house";
import * as route_5 from "./maps/route_5";

import * as route_6 from "./maps/route_6";
import * as cedarhallow from "./maps/cedarhallow";
import * as cedarhallow_greenhouse from "./maps/cedarhallow_greenhouse";
import * as cedarhallow_market from "./maps/cedarhallow_market";
import * as cedarhallow_house from "./maps/cedarhallow_house";
import * as cedar_hollow from "./maps/cedar_hollow";
import * as burnt_stand from "./maps/burnt_stand";
import * as cedarhallow_conservatory from "./maps/cedarhallow_conservatory";

const maps: Record<MapId, MapDef> = {
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
  route_6: route_6.route_6,
  cedarhallow: cedarhallow.cedarhallow,
  cedarhallow_greenhouse: cedarhallow_greenhouse.cedarhallow_greenhouse,
  cedarhallow_market: cedarhallow_market.cedarhallow_market,
  cedarhallow_house: cedarhallow_house.cedarhallow_house,
  cedar_hollow: cedar_hollow.cedar_hollow,
  burnt_stand: burnt_stand.burnt_stand,
  cedarhallow_conservatory: cedarhallow_conservatory.cedarhallow_conservatory,
  // Chapter 4
  route_4: route_4.route_4,
  glasshouse_city: glasshouse_city.glasshouse_city,
  palm_house: palm_house.palm_house,
  glasshouse_greenhouse: greenhouse.glasshouse_greenhouse,
  glasshouse_market: glasshouse_market.glasshouse_market,
  glasshouse_nursery: glasshouse_nursery.glasshouse_nursery,
  glasshouse_relay: glasshouse_relay.glasshouse_relay,
  glasshouse_conservatory: glasshouse_conservatory.glasshouse_conservatory,
  glasshouse_house: glasshouse_house.glasshouse_house,
  route_5: route_5.route_5,
};

const mapScripts: Scripts[] = [
  route_6.scripts, cedarhallow.scripts, cedarhallow_greenhouse.scripts, cedarhallow_market.scripts, cedarhallow_house.scripts, cedarhallow_conservatory.scripts,
  player_home.scripts, herbarium.scripts, herbarium_roof.scripts, fallowfield.scripts, route_1.scripts,
  hedgerow.scripts, fennimore_house.scripts, route_2.scripts, bramblegate.scripts, greenhouse.scripts,
  bramblegate_market.scripts, bramblegate_conservatory.scripts, route_3.scripts, sugarbush.scripts,
  sugarbush_grove.scripts, sugarbush_conservatory.scripts,
  route_4.scripts, glasshouse_city.scripts, palm_house.scripts, glasshouse_market.scripts, glasshouse_nursery.scripts,
  glasshouse_relay.scripts, glasshouse_conservatory.scripts, glasshouse_house.scripts, route_5.scripts,
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
  scripts: mergeScripts(storyScripts, act1Scripts, ch4Scripts, ch5Scripts, questScripts, ...mapScripts),
  trainers: TRAINERS,
  quests: QUESTS,
  glide: [
    { map: "fallowfield", x: 20, y: 7, facing: "down", name: "FALLOWFIELD" },
    { map: "bramblegate", x: 19, y: 6, facing: "down", name: "BRAMBLEGATE" },
    { map: "sugarbush", x: 24, y: 12, facing: "down", name: "SUGARBUSH" },
    { map: "glasshouse_city", x: 6, y: 13, facing: "down", name: "GLASSHOUSE CITY" },
    { map: "cedarhallow", x: 6, y: 17, facing: "down", name: "CEDARHALLOW" },
  ],
  // Prologue: the observation deck at night, beside DR. VALE.
  newGame: { map: "herbarium_roof", x: 5, y: 6, facing: "up", script: "prologue" },
};
