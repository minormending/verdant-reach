import type { Ambient, CharacterKey, MapDef, MapId, TileKey } from "../../contracts";
import { LEGEND, when } from "../build";

/**
 * One seat room's interior: its rows and the legend entries it adds. Every
 * room keeps the run's frame (ch11-environment.test.ts): the north stair `N`
 * at (x, 0), the seat holder at (x, 3), the arrival cell (x, h - 2) and a
 * solid bottom row (council_1's `E` door closes for the run), where x is
 * floor(w / 2) - 1.
 */
interface Room { tiles: string[]; legend: Record<string, TileKey>; ambient?: Ambient }

function seat(id: MapId, name: string, npc: string, sprite: CharacterKey, next: MapId, win: string, room: Room): MapDef {
  const width = room.tiles[0].length, height = room.tiles.length;
  const x = Math.floor(width / 2) - 1;
  const map: MapDef = {
    id, name, outdoor: false, music: "conservatory", border: "void", legend: { ...LEGEND, N: "stairs_up", ...room.legend },
    tiles: room.tiles,
    legendWhen: [{ when: when({ [win]: false }), legend: { N: "wall" } }],
    structures: [],
    warps: [{ x, y: 0, to: next, toX: next === "keeper_hall" ? 6 : next === "fellowship_hall" ? 4 : 5, toY: next === "keeper_hall" ? 14 : next === "fellowship_hall" ? 6 : 10, facing: "up" }],
    npcs: [{ id: npc, sprite, x, y: 3, facing: "down", script: npc }],
    signs: [], triggers: [], onWhiteout: "ch11_whiteout",
  };
  if (room.ambient) map.ambient = room.ambient;
  if (id === "council_1") {
    map.onEnter = "ch11_run_start";
    map.legendWhen!.push({ when: when({ council_run: true }), legend: { E: "wall" } });
    map.warps.push({ x, y: height - 1, to: "council_hall", toX: 7, toY: 1, facing: "down" });
  }
  // Arrival mat only in the others: there is no return warp in the middle of a run.
  return map;
}

// APOTHECARY (BELLADONNA): a poison-garden apothecary in violet-grey basalt.
// Jar shelves line the walls either side of the stair; raised beds of
// foxglove and nightshade, behind low iron rails, flank the aisle.
const APOTHECARY: Room = {
  legend: { ".": "basalt_floor", j: "jar_shelf", R: "poison_bed" },
  tiles: [
    "WjjjjNjjjjjW",
    "Wj........jW",
    "W..........W",
    "W.RR....RR.W",
    "W.RR....RR.W",
    "W..........W",
    "WRRR....RRRW",
    "WRRR....RRRW",
    "W..........W",
    "Wj........jW",
    "Wj........jW",
    "WWWWWEWWWWWW",
  ],
};

// SLEEPER (MIMI OSA): a moonlit sleep garden. Night-blue star slabs, a pale
// slate walk to the seat, crescent-moon lanterns in moss cushions of folded
// sensitive-plant leaves.
const SLEEPER: Room = {
  legend: { ".": "star_floor", s: "night_floor", L: "moon_lantern", O: "night_window" },
  tiles: [
    "WOOOWNWOOOOW",
    "W...sss....W",
    "W.L.sss..L.W",
    "W...sss....W",
    "W....s.....W",
    "WL...s....LW",
    "W....s.....W",
    "W..L.s..L..W",
    "W....s.....W",
    "WL...s....LW",
    "W....s.....W",
    "WWWWWWWWWWWW",
  ],
};

// ROTTER (TITUS ARUM): a humid rot house. Maroon loam, a duckboard walk,
// steaming bog pools and compost bins, spores in the air.
const ROTTER: Room = {
  legend: { ".": "loam_floor", "=": "boardwalk", "~": "rot_pool", P: "planter_bed" },
  ambient: "spores",
  tiles: [
    "WPPPWNWPPPPW",
    "W..........W",
    "W~~~.....PPW",
    "W~~~.......W",
    "W~~~.=.....W",
    "W....=..~~~W",
    "WPP..=..~~~W",
    "W....=..~~~W",
    "W~~..=.....W",
    "W~~..=...PPW",
    "W....=.....W",
    "WWWWWWWWWWWW",
  ],
};

// KINDLER (PYRA): a hearth hall of resin-grouted brick. Kilns burn in the
// north wall, braziers line the hall, and fireweed grows in raised planters.
const KINDLER: Room = {
  legend: { ".": "resin_floor", F: "fireplace", B: "brazier", P: "planter_bed" },
  tiles: [
    "WFPFWNWFPFPW",
    "W..........W",
    "W.B......B.W",
    "W..........W",
    "WPP......PPW",
    "W..B....B..W",
    "W..........W",
    "WPP......PPW",
    "W..B....B..W",
    "W..........W",
    "W..........W",
    "WWWWWWWWWWWW",
  ],
};

// KEEPER'S HALL (ROWAN): a long marble hall between colonnades of pale
// aspen-wood pillars, gilded and crested; a living root runs down the middle
// from the door to the Keeper and on to the stair.
const KEEPER: Room = {
  legend: { ".": "floor_marble", I: "aspen_pillar", ":": "root_vein", ";": "grove_floor" },
  tiles: [
    "WOOOOWNWOOOOWW",
    "W....;:;....PW",
    "W..I.;:;.I...W",
    "W..I.;:;.I...W",
    "W....;:;.....W",
    "W....;:;....PW",
    "W..I.;:;.I...W",
    "W..I.;:;.I...W",
    "W....;:;.....W",
    "W....;:;....PW",
    "W..I.;:;.I...W",
    "W..I.;:;.I...W",
    "W....;:;.....W",
    "WP...;:;....PW",
    "W....;:;.....W",
    "WWWWWWWWWWWWWW",
  ],
};

export const council_1 = seat("council_1", "APOTHECARY", "belladonna", "florist", "council_2", "beat_council_1", APOTHECARY);
export const council_2 = seat("council_2", "SLEEPER", "mimi_osa", "researcher", "council_3", "beat_council_2", SLEEPER);
export const council_3 = seat("council_3", "ROTTER", "titus_arum", "gentleman", "council_4", "beat_council_3", ROTTER);
export const council_4 = seat("council_4", "KINDLER", "pyra", "florist", "keeper_hall", "beat_council_4", KINDLER);
export const keeper_hall = seat("keeper_hall", "KEEPER'S HALL", "rowan", "vale", "fellowship_hall", "beat_keeper", KEEPER);
export const fellowship_hall: MapDef = {
  id: "fellowship_hall", name: "THE HERBARIUM", outdoor: false, music: "prologue_bloom",
  border: "void", legend: { ...LEGEND, N: "stairs_up" },
  tiles: ["WWOOOOOOWW", "WKiiggiPKW", "WiiiggiPiW", "WiiirriiPW", "WiiirriiPW", "WiiiiiiiiW", "WPiiiiiiPW", "WWWWEWWWWW"],
  structures: [], warps: [{ x: 4, y: 7, to: "council_hall", toX: 7, toY: 1, facing: "down" }],
  npcs: [
    { id: "rowan", sprite: "vale", x: 4, y: 2, facing: "down", script: "ch11_ending" },
    { id: "imogen", sprite: "vale", x: 6, y: 2, facing: "down", script: "ch11_ending", visibleWhen: when({ game_cleared: true }) },
  ],
  signs: [], triggers: [], onEnter: "ch11_ending",
};
