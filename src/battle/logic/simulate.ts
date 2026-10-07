// Deterministic battle/run simulation. The caller owns the party: each fight
// mutates its HP, status and PP just as runtime does, with no between-seat heal.
import type { GameData, Quickened, TimeOfDay, TrainerDef } from "../../contracts";
import { chooseFoeAction } from "./ai";
import { active, canContinue, createBattleState, doSwitch, firstHealthy, resolveTurn, sendOutFoe, type Action, type BattleState } from "./battle";
import type { Rng } from "./rng";
import { createTrainerQuickened } from "./trainer";

export function simulateTrainerRun(opts: {
  data: GameData;
  party: Quickened[];
  trainers: TrainerDef[];
  rng: Rng;
  playerAction: (battle: BattleState) => Action;
  time?: TimeOfDay;
  /** Existing single-fight balance fixtures omit items on both sides. */
  foeItems?: boolean;
  turnLimit?: number;
}): { won: boolean; completed: number; turns: number } {
  let completed = 0, turns = 0;
  for (const trainer of opts.trainers) {
    if (!canContinue(opts.party)) return { won: false, completed, turns };
    const foe = trainer.team.map((t) => createTrainerQuickened(opts.data, t, opts.rng));
    const battle = createBattleState({
      data: opts.data, playerParty: opts.party, playerActive: firstHealthy(opts.party),
      foeParty: foe, wild: false, time: opts.time ?? "day", foeTrainer: trainer.name,
      foeItems: opts.foeItems === false ? {} : Object.fromEntries((trainer.items ?? []).map((i) => [i.item, i.qty])),
    });
    let fightTurns = 0;
    while (canContinue(opts.party) && canContinue(foe) && fightTurns < (opts.turnLimit ?? 300)) {
      resolveTurn(battle, opts.playerAction(battle), chooseFoeAction(battle, trainer.ai, opts.rng), opts.rng);
      fightTurns++; turns++;
      if (active(battle, 1).hp <= 0) { const k = firstHealthy(foe); if (k >= 0) sendOutFoe(battle, k); }
      if (active(battle, 0).hp <= 0) { const k = firstHealthy(opts.party); if (k >= 0) doSwitch(battle, 0, k, []); }
    }
    if (canContinue(foe) || !canContinue(opts.party)) return { won: false, completed, turns };
    completed++;
  }
  return { won: true, completed, turns };
}
