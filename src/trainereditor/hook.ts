// The game's ?trainerlab=1 hook ("Play with these trainers"): apply the
// Trainer Editor's saved edits to the game's trainers at boot, in memory. Only
// src/main.ts imports this, dynamically and only when the URL has
// `trainerlab`; without the param the game never loads it. An edit set that
// fails the build's checks is not applied (logged), and the game carries on
// with the shipped trainers.

import type { TrainerDef } from "../contracts";
import { DATA } from "../data";
import { WORLD } from "../world";
import { buildTrainers, trainersFileErrors } from "../world/trainerFile";
import { TRAINER_LINES, TRAINERS_FILE } from "../world/trainers";
import { applyEdits, pruneEdits, type Edits } from "./edits";
import { loadEdits } from "./store";

/** Replace every trainer in `target` (WORLD.trainers, the record every module reads) with `built`. */
export function installTrainers(target: Record<string, TrainerDef>, built: Record<string, TrainerDef>): void {
  for (const id of Object.keys(target)) delete target[id];
  Object.assign(target, built);
}

/** Build the edited trainers, or the errors that stop them being used. */
export function editedTrainers(edits: Edits): { trainers?: Record<string, TrainerDef>; errors: string[]; count: number } {
  const ctx = { data: DATA, lines: TRAINER_LINES };
  const live = pruneEdits(TRAINERS_FILE, edits);
  const file = applyEdits(TRAINERS_FILE, live);
  const errors = trainersFileErrors(file, ctx);
  return errors.length ? { errors, count: Object.keys(live).length } : { trainers: buildTrainers(file, ctx), errors, count: Object.keys(live).length };
}

export async function applyStoredTrainerEdits(): Promise<void> {
  try {
    const edits = await loadEdits();
    if (!edits || !Object.keys(edits).length) { console.info("[trainerlab] no saved Trainer Editor edits; using the shipped trainers"); return; }
    const { trainers, errors, count } = editedTrainers(edits);
    if (!trainers) { console.warn(`[trainerlab] the saved edits don't pass the trainer checks; using the shipped trainers:\n${errors.join("\n")}`); return; }
    installTrainers(WORLD.trainers, trainers);
    console.info(`[trainerlab] playing with ${count} edited trainer(s)`);
  } catch (e) {
    console.warn("[trainerlab] could not apply the Trainer Editor's edits", e);
  }
}
