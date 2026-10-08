import type { CharacterKey, MapDef, MapId } from "../../contracts";
import { LEGEND, when } from "../build";

function seat(id: MapId, name: string, npc: string, sprite: CharacterKey, next: MapId, win: string, width = 12, height = 12): MapDef {
  const x = Math.floor(width / 2) - 1;
  const room: MapDef = {
    id, name, outdoor: false, music: "conservatory", border: "void", legend: { ...LEGEND, N: "stairs_up" },
    tiles: Array.from({ length: height }, (_, y) => y === 0 || y === height - 1
      ? "W".repeat(x) + (y === 0 ? "N" : "E") + "W".repeat(width - x - 1)
      : "W" + "i".repeat(width - 2) + "W"),
    legendWhen: [{ when: when({ [win]: false }), legend: { N: "wall" } }],
    structures: [],
    warps: [{ x, y: 0, to: next, toX: next === "keeper_hall" ? 6 : next === "fellowship_hall" ? 4 : 5, toY: next === "keeper_hall" ? 14 : next === "fellowship_hall" ? 6 : 10, facing: "up" }],
    npcs: [{ id: npc, sprite, x, y: 3, facing: "down", script: npc }],
    signs: [], triggers: [], onWhiteout: "ch11_whiteout",
  };
  if (id === "council_1") {
    room.onEnter = "ch11_run_start";
    room.legendWhen!.push({ when: when({ council_run: true }), legend: { E: "wall" } });
    room.warps.push({ x, y: height - 1, to: "council_hall", toX: 7, toY: 1, facing: "down" });
  } else {
    // Arrival mat only: there is no return warp in the middle of a run.
    room.tiles[height - 1] = "W".repeat(width);
  }
  return room;
}
export const council_1 = seat("council_1", "APOTHECARY", "belladonna", "belladonna", "council_2", "beat_council_1");
export const council_2 = seat("council_2", "SLEEPER", "mimi_osa", "mimi_osa", "council_3", "beat_council_2");
export const council_3 = seat("council_3", "ROTTER", "titus_arum", "titus_arum", "council_4", "beat_council_3");
export const council_4 = seat("council_4", "KINDLER", "pyra", "pyra", "keeper_hall", "beat_council_4");
export const keeper_hall = seat("keeper_hall", "KEEPER'S HALL", "rowan", "rowan", "fellowship_hall", "beat_keeper", 14, 16);
export const fellowship_hall: MapDef = {
  id: "fellowship_hall", name: "THE HERBARIUM", outdoor: false, music: "prologue_bloom",
  border: "void", legend: { ...LEGEND, N: "stairs_up" },
  tiles: ["WWOOOOOOWW", "WKiiggiPKW", "WiiiggiPiW", "WiiirriiPW", "WiiirriiPW", "WiiiiiiiiW", "WiiiiiiiiW", "WWWWEWWWWW"],
  structures: [], warps: [{ x: 4, y: 7, to: "council_hall", toX: 7, toY: 1, facing: "down" }],
  npcs: [
    { id: "rowan", sprite: "rowan", x: 4, y: 2, facing: "down", script: "ch11_ending" },
    { id: "imogen", sprite: "vale", x: 6, y: 2, facing: "down", script: "ch11_ending", visibleWhen: when({ game_cleared: true }) },
  ],
  signs: [], triggers: [], onEnter: "ch11_ending",
};
