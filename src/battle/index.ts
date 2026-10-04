// PLACEHOLDER - replaced by the battle agent.
import type { BattleOutcome, BattleRequest, GameContext, GameData, Quickened, Scene, SpeciesId } from "../contracts";

export function createBattleScene(_ctx: GameContext, _req: BattleRequest, done: (o: BattleOutcome) => void): Scene {
  return { update() { done("won"); }, draw() {} };
}

/** Create a wild/starter/trainer Quickened at a level with level-appropriate moves. */
export function createQuickened(_data: GameData, species: SpeciesId, level: number, _rng: () => number): Quickened {
  const zero = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  return { uid: crypto.randomUUID(), species, level, exp: 0, hp: 1, stats: { ...zero, hp: 1 }, ivs: zero, evs: zero, moves: [], status: null, friendship: 70, sport: false };
}

/** Full heal: hp, pp, status. */
export function healParty(party: Quickened[], _data: GameData): void {
  for (const q of party) { q.hp = q.stats.hp; q.status = null; }
}
