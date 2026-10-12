// Everything the page renders from, built once from the game's own modules.

import type { GameData, ItemId, MapId, SpeciesId, WorldData } from "../contracts";
import { DATA } from "../data";
import { WORLD } from "../world";
import type { Section } from "./types";
import {
  allMapFinds, itemSources, speciesSources, wandererSources,
  type ItemSource, type MapFinds, type SpeciesSource,
} from "./indexer";

export interface Guide {
  world: WorldData;
  data: GameData;
  finds: Map<MapId, MapFinds>;
  speciesSrc: Map<SpeciesId, SpeciesSource[]>;
  itemSrc: Map<ItemId, ItemSource[]>;
  /** Maps that have a walkthrough panel (anchor `map-<id>` on the first one). */
  mapPanels: Set<MapId>;
  sections: Section[];
}

export function buildGuide(sections: Section[], world: WorldData = WORLD, data: GameData = DATA): Guide {
  const list = allMapFinds(world, data);
  const mapPanels = new Set<MapId>();
  for (const s of sections) for (const b of s.blocks) if ("map" in b) mapPanels.add(b.map);
  return {
    world, data, sections, mapPanels,
    finds: new Map(list.map((f) => [f.map, f])),
    speciesSrc: speciesSources(list, wandererSources(world)),
    itemSrc: itemSources(list),
  };
}
