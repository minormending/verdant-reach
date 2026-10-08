// SEED GLIDE rules and compatibility with saves made before visit flags.
// Pure: callers persist the inferred visits when the overworld loads a map.
import type { GameState, GlideDestination, MapDef, MapId, WorldData } from "../contracts";

const TOWNS = ["fallowfield", "bramblegate", "sugarbush", "glasshouse_city", "cedarhallow", "saltmarsh_harbour", "driftseed_isle"] as const;
type TravelState = Pick<GameState, "flags" | "marks" | "position" | "heal" | "bag">;

export const visitedTownFlag = (map: MapId): string => `visited_${map}`;

/** The chapter route is linear: reaching a later town proves earlier visits.
 * Interiors, the last healing point, marks and completed scenes are evidence;
 * merely unlocking the next road is never evidence of visiting its far end. */
export function visitedGlideMaps(state: TravelState): MapId[] {
  let furthest = 0; // Fallowfield is home, including the prologue on its roof.
  const fromMap = (map: MapId): number => {
    if (map === "driftseed_isle" || map.startsWith("driftseed_")) return 6;
    if (map === "saltmarsh_harbour" || map.startsWith("saltmarsh_") || map === "route_8") return 5;
    if (map === "route_7") return 4; // crossing the ford proves Chapter 5, not harbour arrival
    if (map === "cedarhallow" || map.startsWith("cedarhallow_") || map === "cedar_hollow" || map === "burnt_stand") return 4;
    if (map === "glasshouse_city" || map.startsWith("glasshouse_") || map === "palm_house") return 3;
    // route_6 is Sugarbush's north road: being on it proves Sugarbush, not Cedarhallow.
    if (map === "sugarbush" || map.startsWith("sugarbush_") || map === "route_4" || map === "route_6") return 2;
    if (map === "bramblegate" || map.startsWith("bramblegate_") || map === "route_3") return 1;
    return 0;
  };
  furthest = Math.max(furthest, fromMap(state.position.map), fromMap(state.heal.map));
  const evidence = [
    [],
    ["saw_grunt_bg", "beat_hollis"],
    ["sb_arrival_seen", "grove_cleared", "rival_2_done", "ch4_started", "beat_shears", "beat_nell"],
    ["gc_arrival_seen", "relay_listened", "nursery_met", "rival_3_done", "got_shears", "ch4_grunt_seen", "ch4_done", "beat_flora"],
    ["ch5_arrived", "burnt_vision_seen", "got_lantern", "rival_4_done", "beat_morrow", "ch5_done"],
    ["ch6_arrived", "ch6_doctor_met", "got_raft"],
    ["got_saxifrage", "beat_saguaro", "got_sap", "lantern_healed", "beat_reyes", "ch6_done"],
  ];
  TOWNS.forEach((map, i) => {
    if (state.flags[visitedTownFlag(map)] || evidence[i].some((flag) => state.flags[flag])) furthest = Math.max(furthest, i);
  });
  for (const [i, mark] of ["bramble_mark", "sundew_mark", "rose_mark", "pipe_mark"].entries()) {
    if (state.marks.some((m) => m === mark)) furthest = Math.max(furthest, i + 1);
  }
  if (state.marks.includes("mangrove_mark")) furthest = Math.max(furthest, 6);
  if (state.marks.includes("cactus_mark")) furthest = Math.max(furthest, 6);
  if ((state.bag.pruning_shears ?? 0) > 0) furthest = Math.max(furthest, 3); // shears prove Glasshouse, never cap later towns
  return TOWNS.slice(0, furthest + 1);
}

export function canGlide(state: Pick<GameState, "bag">, map: Pick<MapDef, "outdoor"> | undefined, scriptRunning: boolean): boolean {
  return (state.bag.glider_seed ?? 0) > 0 && map?.outdoor === true && !scriptRunning;
}

export function availableGlideDestinations(world: Pick<WorldData, "glide">, state: TravelState): GlideDestination[] {
  const visited = new Set(visitedGlideMaps(state));
  return (world.glide ?? []).filter((d) => d.map !== state.position.map && visited.has(d.map));
}

/** Unknown, unvisited and current destinations have no selectable landing. */
export function glideLanding(world: Pick<WorldData, "glide">, state: TravelState, map: MapId): GlideDestination | undefined {
  return availableGlideDestinations(world, state).find((d) => d.map === map);
}
