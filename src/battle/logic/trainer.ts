// Trainer-only setup. Collar metadata stays on TrainerDef, never on Quickened.

import type { GameData, Quickened, Stats, TrainerDef } from "../../contracts";
import { getMove, getSpecies, qName } from "./lookup";
import type { Rng } from "./rng";
import { calcStats, clampLevel, createQuickened, trainerIvs } from "./stats";

type TeamMember = TrainerDef["team"][number];
const zeroEvs = (): Stats => ({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });

/** Pure stat calculation: forced growth caps every stat, including max HP. */
export function calcTrainerStats(data: GameData, member: TeamMember, ivs: Stats = trainerIvs(), evs: Stats = zeroEvs()): Stats {
  const level = clampLevel(member.level);
  const statLevel = member.grafted ? Math.max(1, level - 5) : level;
  return calcStats(getSpecies(data, member.species), ivs, evs, statLevel);
}

/** Moves, experience and displayed level still use the real level. */
export function createTrainerQuickened(data: GameData, member: TeamMember, rng: Rng): Quickened {
  const q = createQuickened(data, member.species, member.level, rng);
  q.ivs = trainerIvs();
  q.sport = false;
  q.stats = calcTrainerStats(data, member);
  q.hp = q.stats.hp;
  if (member.moves?.length) {
    q.moves = member.moves.slice(0, 4).map((id) => ({ id, pp: getMove(data, id).pp }));
  }
  return q;
}

/** The scene uses its active trainer slot; player/wild Quickened have no collar. */
export function graftCollarText(data: GameData, trainer: TrainerDef | undefined, index: number, q: Quickened): string | null {
  return trainer?.team[index]?.grafted ? `${qName(data, q)} strains at its GRAFT COLLAR!` : null;
}
