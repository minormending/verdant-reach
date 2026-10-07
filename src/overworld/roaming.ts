// Pure roaming rules. Randomness and the real calendar date are supplied by the caller.
import type {
  BattleOutcome, Dir, GameData, GameState, MapId, NpcDef, Quickened, WandererHealth, WandererId,
} from "../contracts";
import { calcStat, trainerIvs } from "../battle/logic/stats";
import type { EncounterKind } from "./encounters";
import { DIRS, isWalkable, tryMove, warpAt, type MapRuntime } from "./map";
import { todayISO } from "./progress";

export const WANDERER_LEVEL = 60;
export const ROAMER_MAPS = {
  tumbleweed: ["route_10", "route_11", "route_12"],
  coconut: ["route_8", "driftseed_isle"],
} as const;
export const WANDERERS = ["tumbleweed", "coconut", "burr"] as const;
type State = Pick<GameState, "flags" | "herbarium" | "roamers" | "burr" | "wandererWilted">;

/** Stable DVs keep max HP the same across encounters (only HP/status are saved). */
export function wandererMaxHp(data: GameData, id: WandererId): number {
  return calcStat("hp", data.species[id].baseStats.hp, trainerIvs().hp, 0, WANDERER_LEVEL);
}
export function freshWanderers(data: GameData): Pick<GameState, "roamers" | "burr"> {
  const health = (id: WandererId): WandererHealth => ({ hp: wandererMaxHp(data, id), status: null });
  return {
    roamers: {
      tumbleweed: { map: ROAMER_MAPS.tumbleweed[0], ...health("tumbleweed") },
      coconut: { map: ROAMER_MAPS.coconut[0], ...health("coconut") },
    },
    burr: health("burr"),
  };
}
export function wandererHealth(state: State, id: WandererId): WandererHealth {
  return id === "burr" ? state.burr : state.roamers[id];
}
export function wandererFree(state: State, id: WandererId): boolean {
  return !!state.flags.game_cleared && !!state.flags.wanderers_free
    && !state.flags[`wanderer_caught_${id}`] && !state.herbarium.caught.includes(id)
    && wandererHealth(state, id).hp > 0;
}

/** Return a new state; a future/unchanged date cannot revive a wilted wanderer. */
export function recoverWanderers<T extends State>(state: T, data: GameData, now: Date): T {
  const next = { ...state, roamers: { ...state.roamers }, wandererWilted: { ...state.wandererWilted } };
  const day = todayISO(now);
  for (const id of WANDERERS) {
    const wilted = state.wandererWilted?.[id];
    if (!wilted || wilted >= day || state.flags[`wanderer_caught_${id}`] || state.herbarium.caught.includes(id)) continue;
    const health = { hp: wandererMaxHp(data, id), status: null };
    if (id === "burr") next.burr = health;
    else next.roamers[id] = { ...state.roamers[id], ...health };
    delete next.wandererWilted[id];
  }
  return next;
}

/** Called once per actual map change, including travel to indoor maps. No map is excluded. */
export function moveRoamers<T extends State>(state: T, data: GameData, rng: () => number, now: Date): T {
  const next = recoverWanderers(state, data, now);
  for (const id of ["tumbleweed", "coconut"] as const) {
    if (!wandererFree(next, id)) continue;
    const maps = ROAMER_MAPS[id];
    next.roamers[id] = { ...next.roamers[id], map: maps[Math.floor(rng() * maps.length)] };
  }
  return next;
}

/** Only an already-rolled encounter of the matching terrain is replaced. */
export function meetingRoamer(state: State, map: MapId, kind: EncounterKind, rng: () => number): "tumbleweed" | "coconut" | null {
  const id = kind === "grass" ? "tumbleweed" : kind === "water" ? "coconut" : null;
  return id && wandererFree(state, id) && state.roamers[id].map === map && rng() < 1 / 4 ? id : null;
}

/** Reserve warps (including shared mats) and dead ends that lead only to a warp. */
export function burrTileSafe(map: MapRuntime, x: number, y: number): boolean {
  if (!isWalkable(map, x, y) || warpAt(map, x, y)) return false;
  return (Object.keys(DIRS) as Dir[]).some((dir) => {
    const move = tryMove(map, x, y, dir);
    return move.kind !== "blocked" && !warpAt(map, move.x, move.y);
  });
}

export function burrPlacement(
  state: State, map: MapRuntime, player: { x: number; y: number; facing: Dir },
  occupied: (x: number, y: number) => boolean, rng: () => number,
): NpcDef | null {
  if (!map.def.outdoor || !/^route_\d+$/.test(map.def.id) || !wandererFree(state, "burr") || rng() >= 1 / 8) return null;
  const { dx, dy } = DIRS[player.facing];
  const x = player.x - dx, y = player.y - dy;
  if (!burrTileSafe(map, x, y) || occupied(x, y)) return null;
  return { id: "burr", sprite: "item_pickup", x, y, facing: player.facing, movement: "static" };
}

/** Capture/wilt wins over fleeing; sleep, trapping and flinching cannot delay the escape. */
export function wandererFlees(wild: boolean, turn: number, hp: number, outcome: BattleOutcome | null): boolean {
  return wild && turn >= 1 && hp > 0 && outcome === null;
}

/** Write the result immutably, including early player escapes and player losses. */
export function finishWandererBattle<T extends State>(state: T, id: WandererId, foe: Pick<Quickened, "hp" | "status">, outcome: BattleOutcome, now: Date): T {
  const health = { hp: Math.max(0, foe.hp), status: foe.status };
  const next = { ...state, flags: { ...state.flags }, roamers: { ...state.roamers }, wandererWilted: { ...state.wandererWilted } };
  if (id === "burr") next.burr = health;
  else next.roamers[id] = { ...state.roamers[id], ...health };
  if (outcome === "caught") {
    next.flags[`wanderer_caught_${id}`] = true;
    delete next.wandererWilted[id];
  } else if (health.hp === 0) next.wandererWilted[id] = todayISO(now);
  return next;
}
