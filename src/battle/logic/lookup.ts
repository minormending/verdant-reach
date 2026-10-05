// Defensive lookups into GameData. Data lands in parallel, so every lookup
// tolerates unknown ids with a sensible fallback instead of crashing.

import type { GameData, Item, Move, Quickened, Species, SpeciesId, StatusId, TypeId } from "../../contracts";

const warned = new Set<string>();
function warnOnce(key: string, msg: string) {
  if (warned.has(key)) return;
  warned.add(key);
  if (typeof console !== "undefined") console.warn(msg);
}

export function getSpecies(data: GameData, id: SpeciesId): Species {
  const s = data.species[id];
  if (s) return s;
  warnOnce(`species:${id}`, `[battle] unknown species "${id}", using fallback`);
  return {
    id,
    name: id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    line: id,
    stage: 1,
    types: ["wood"],
    baseStats: { hp: 50, atk: 50, def: 50, spa: 50, spd: 50, spe: 50 },
    growthRate: "medium",
    catchRate: 120,
    baseExp: 60,
    activity: "any",
    learnset: [],
  };
}

/** Struggle: used when no move has PP left. Typeless, 1/4 recoil. */
export const STRUGGLE: Move = {
  id: "struggle",
  name: "Struggle",
  type: "wood",
  category: "physical",
  power: 50,
  accuracy: null,
  pp: 1,
  priority: 0,
  effects: [{ kind: "recoil", fraction: 1 / 4 }],
  description: "A desperate thrash when no other move is left.",
};

export function getMove(data: GameData, id: string): Move {
  if (id === STRUGGLE.id) return STRUGGLE;
  const m = data.moves[id];
  if (m) return m;
  warnOnce(`move:${id}`, `[battle] unknown move "${id}", using fallback`);
  return {
    id,
    name: id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 12),
    type: "wood",
    category: "physical",
    power: 40,
    accuracy: 100,
    pp: 35,
    priority: 0,
    effects: [],
    description: "",
  };
}

export function getItem(data: GameData, id: string): Item {
  const it = data.items[id];
  if (it) return it;
  warnOnce(`item:${id}`, `[battle] unknown item "${id}", using fallback`);
  return {
    id,
    name: id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 12),
    pocket: "items",
    price: 0,
    description: "",
    effect: { kind: "none" },
    usableInBattle: false,
    usableInField: false,
  };
}

/** Upper-case display name, Crystal-style ("OAK ACORN"). */
export function qName(data: GameData, q: Quickened): string {
  return (q.nickname || getSpecies(data, q.species).name).toUpperCase();
}

export function speciesName(data: GameData, id: SpeciesId): string {
  return getSpecies(data, id).name.toUpperCase();
}

export function moveName(data: GameData, id: string): string {
  return getMove(data, id).name.toUpperCase();
}

export function itemName(data: GameData, id: string): string {
  return getItem(data, id).name.toUpperCase();
}

export const TYPE_NAMES: Record<TypeId, string> = {
  wood: "WOOD", fire: "FIRE", water: "WATER", bug: "BUG", bloom: "BLOOM",
  ghost: "GHOST", thorn: "THORN", frost: "FROST", dragon: "DRAGON",
};

export const STATUS_ABBR: Record<StatusId, string> = {
  blight: "BLT", scorch: "SCR", frostbite: "FRB", dormant: "DRM", rootbound: "RTB",
};

export const STATUS_NAME: Record<StatusId, string> = {
  blight: "BLIGHT", scorch: "SCORCH", frostbite: "FROSTBITE", dormant: "DORMANT", rootbound: "ROOTBOUND",
};
