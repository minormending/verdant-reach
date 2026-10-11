// POSTGAME.md §1/§4: the northern vault and its summit, on their own tiles (tools/art/envpg) and existing music.
import type { MapDef, SpeciesId } from "../../contracts";
import { LEGEND, OUTDOOR, pickups, when } from "../build";

export const POSTGAME_MAPS = ["seed_vault_entrance", "seed_vault_b1", "seed_vault_b2", "seed_vault_b3", "methuselah_ridge"] as const;

function encounters(species: SpeciesId[], minLevel: number, maxLevel: number): MapDef["encounters"] {
  return { grass: { rate: 12, slots: species.map((id) => ({ species: id, minLevel, maxLevel, weight: 10 })) } };
}

export const seed_vault_entrance: MapDef = {
  id: "seed_vault_entrance", name: "SEED VAULT", outdoor: false, music: "sugarbush_grove",
  // A cold vestibule: frosted concrete, receiving racks, a steel grating
  // runner (g) from the door to the ridge stair.
  border: "void", legend: { ...LEGEND, R: "stairs_up", W: "vault_wall", t: "vault_floor", K: "seed_rack", g: "hideout_floor" },
  legendWhen: [{ when: when({ diary_read: false }), legend: { R: "vault_wall" } },
    { when: when({ game_cleared: false }), legend: { R: "vault_wall", u: "vault_wall" } }],
  tiles: [
    "WWWWWWRWWWWWWW",
    "WtttttgttttttW",
    "WKttttgtttttKW",
    "WKttttgtttttKW",
    "WtttttgttttttW",
    "WtttttgttttttW",
    "WtttttgttttttW",
    "WtttttgttttttW",
    "WttuttgttttttW",
    "WtttttgttttttW",
    "WtttttgttttttW",
    "WWWWWWEWWWWWWW",
  ], structures: [],
  warps: [
    { x: 6, y: 11, to: "route_9", toX: 6, toY: 1, facing: "down" },
    { x: 3, y: 8, to: "seed_vault_b1", toX: 11, toY: 17, facing: "up" },
    { x: 6, y: 0, to: "methuselah_ridge", toX: 7, toY: 12, facing: "up" },
  ], npcs: [], signs: [], triggers: [],
};

export const seed_vault_b1: MapDef = {
  id: "seed_vault_b1", name: "SEED VAULT B1", outdoor: false, dark: true, music: "sugarbush_grove",
  border: "void", legend: { ...LEGEND, W: "vault_wall", t: "vault_floor", "?": "vault_rime", "{": "vault_ice" },
  // Three ice crossings alternate their stopping ends. Sideways movement
  // is possible only at a stop; the ice solver must not branch mid-slide.
  tiles: [
    "WWWWWWWWWWWWWWWWWWWWWWWW",
    "W??????????????????????W",
    "W??????????u???????????W",
    "W??????????????????????W",
    "WttttttttttttttttttttttW",
    "WWWtWWWWWWWWWWWWWWWWWWWW",
    "WWWt{{{{{{{{{{{{{{{{tWWW",
    "WWWWWWWWWWWWWWWWWWWWtWWW",
    "WWWWWWWWWWWWWWWWWWWWtWWW",
    "WWWWWWWWWWWWWWWWWWWWtWWW",
    "WWWt{{{{{{{{{{{{{{{{tWWW",
    "WWWtWWWWWWWWWWWWWWWWWWWW",
    "WWWtWWWWWWWWWWWWWWWWWWWW",
    "WWWtWWWWWWWWWWWWWWWWWWWW",
    "WWWt{{{{{{{{{{{{{{{{tWWW",
    "WWWWWWWWWWWWWWWWWWWWtWWW",
    "WttttttttttttttttttttttW",
    "W??????????????????????W",
    "W??????????U???????????W",
    "WWWWWWWWWWWWWWWWWWWWWWWW",
  ], structures: [],
  warps: [
    { x: 11, y: 18, to: "seed_vault_entrance", toX: 3, toY: 9, facing: "down" },
    { x: 11, y: 2, to: "seed_vault_b2", toX: 3, toY: 16, facing: "up" },
  ], npcs: [], signs: [], triggers: [],
  encounters: encounters(["nightshade", "oleander", "sensitive_plant", "holly", "peppermint", "larch"], 58, 60),
};

export const seed_vault_b2: MapDef = {
  id: "seed_vault_b2", name: "SEED VAULT B2", outdoor: false, music: "sugarbush_grove",
  // The collapsed storage hall: roots (R) break in through the walls.
  border: "void", legend: { ...LEGEND, W: "vault_wall", R: "root_wall", t: "vault_floor", "?": "vault_rime" },
  // Two stones fill two pits. Each stone has a north pocket for retreat
  // after Continue resets it above an already-filled pit. ROOT BRIDGE is
  // needed between the pit crossings; none of the barriers can be bypassed.
  tiles: [
    "WWWWRWWWWWWWWWWWWWWRWWRW",
    "W??????WWtttWttRW??????W",
    "W??????RWtttRttWW???u??W",
    "W??????WWtttWttWR??????W",
    "WttttttWWtttWttWWttttttW",
    "WttttttWRtttWttWWttttttW",
    "WttttttWWtttWttWRttttttW",
    "RttttttRWtttWttWWttttttW",
    "WttttttWWtttRttWWttttttW",
    "WtttttttWtttRtttRttttttW",
    "Wtttttttøttt<tttøttttttW",
    "WtttttttRtttRtttWttttttW",
    "WttttttWWtttRttRWttttttR",
    "WttttttWWtttWttWWttttttW",
    "WttttttWWtttWttWRttttttW",
    "WttttttRWtttWttWWttttttW",
    "W??????WWtttRttWW??????W",
    "W??U???WRtttWttWW??????W",
    "W??????WWtttWttWW??????W",
    "WRWWWWWWWWWWWWWWWWWWWWWW",
  ], structures: [],
  warps: [
    { x: 3, y: 17, to: "seed_vault_b1", toX: 11, toY: 3, facing: "down" },
    { x: 20, y: 2, to: "seed_vault_b3", toX: 7, toY: 11, facing: "up" },
  ], npcs: [
    { id: "vault_boulder_1", sprite: "boulder", x: 7, y: 10, facing: "right", pushable: true },
    { id: "vault_boulder_2", sprite: "boulder", x: 15, y: 10, facing: "right", pushable: true },
  ], signs: [], triggers: [],
  encounters: encounters(["prayer_plant", "flame_lily", "titan_arum", "red_cedar", "dragon_tree", "moss_campion"], 60, 63),
};

export const seed_vault_b3: MapDef = {
  id: "seed_vault_b3", name: "FROZEN ARCHIVE", outdoor: false, music: "herbarium",
  // Racks of sealed seed boxes (K) and the reading desk (D) where the diary lies.
  border: "void", legend: { ...LEGEND, W: "vault_wall", t: "vault_floor", "?": "vault_rime", K: "seed_rack", D: "reading_desk" },
  tiles: [
    "WWWWWWWDWWWWWWWW",
    "WKKKKttttttKKKKW",
    "W??????????????W",
    "W??????????????W",
    "WttttttttttttttW",
    "WKKKKttttttKKKKW",
    "WttttttttttttttW",
    "WttttttttttttttW",
    "WKKKKttttttKKKKW",
    "W??????????????W",
    "W??????????????W",
    "WttttttttttttttW",
    "WttttttUtttttttW",
    "WWWWWWWWWWWWWWWW",
  ], structures: [],
  warps: [{ x: 7, y: 12, to: "seed_vault_b2", toX: 20, toY: 3, facing: "down" }],
  npcs: pickups([{ item: "old_diary", x: 7, y: 2 }]).map((n) => ({ ...n, visibleWhen: when({ game_cleared: true }) })),
  signs: [], triggers: [],
  encounters: encounters(["nightshade", "oleander", "sensitive_plant", "prayer_plant", "titan_arum", "flame_lily", "great_oak", "giant_water_lily"], 63, 66),
};

export const methuselah_ridge: MapDef = {
  id: "methuselah_ridge", name: "METHUSELAH RIDGE", outdoor: true, music: "route", ambient: "mist",
  // A bare dolomite summit above the cloud deck: crags (A) and wind-shaped
  // bristlecones (T) on the rim, a scree track (:) up to the oldest tree.
  border: "cloud_sea", legend: { ...OUTDOOR, A: "dolomite_rock", T: "bristlecone_shrub", "?": "dolomite_scree", ":": "scree", "@": "dolomite_scree" },
  tiles: [
    "AAAATA@@@AATAAAA",
    "A?????@@@??????A",
    "A?????@@@??????A",
    "A?????::::?????A",
    "A?????::::?????A",
    "A?????::::?????T",
    "A?????::::?????A",
    "A?????::::?????A",
    "T?????::::?????A",
    "A?????::::?????A",
    "A?????::::?????A",
    "A?????::::?????A",
    "A?????::::?????A",
    "AAAATAA:AATAAAAA",
  ], structures: [{ key: "methuselah_tree", x: 6, y: 0 }],
  warps: [{ x: 7, y: 13, to: "seed_vault_entrance", toX: 6, toY: 1, facing: "down" }],
  npcs: [{ id: "methuselah", sprite: "bristlecone", x: 7, y: 3, facing: "down", script: "pg_methuselah",
    visibleWhen: when({ game_cleared: true, diary_read: true }) }],
  signs: [], triggers: [],
  encounters: encounters(["larch", "holly", "moss_campion", "red_cedar"], 63, 66),
};
