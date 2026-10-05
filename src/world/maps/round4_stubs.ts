import type { MapDef, MapId } from "../../contracts";

// ROUND4-STUB: placeholder rooms so the contracts typecheck while the Round 4
// map owner builds the real Chapter 4 maps. Delete this file when every id
// below has a real map module. Each stub is an unreachable 10x9 room.
const STUB_IDS = [
  "route_4", "glasshouse_city", "palm_house", "glasshouse_greenhouse", "glasshouse_market",
  "glasshouse_nursery", "glasshouse_relay", "glasshouse_conservatory", "glasshouse_house", "route_5",
] as const satisfies readonly MapId[];

const stub = (id: MapId): MapDef => ({
  id, name: id.toUpperCase().replace(/_/g, " "), outdoor: false, music: "herbarium",
  tiles: ["WWWWWWWWWW", ...Array.from({ length: 7 }, () => "W........W"), "WWWWWWWWWW"],
  legend: { W: "wall", ".": "floor_wood" },
  border: "void", structures: [], warps: [], npcs: [], signs: [], triggers: [],
});

export const ROUND4_STUBS = Object.fromEntries(STUB_IDS.map((id) => [id, stub(id)])) as Record<(typeof STUB_IDS)[number], MapDef>;
