import type { TrainerDef } from "../contracts";

/** Clone without sharing mutable team, move or item arrays with the first run. */
export function cloneRematch(trainer: TrainerDef, levels: number): TrainerDef {
  return { ...trainer, id: `${trainer.id}_rematch`,
    team: trainer.team.map((member) => ({ ...member, level: member.level + levels,
      ...(member.moves ? { moves: [...member.moves] } : {}) })),
    ...(trainer.items ? { items: trainer.items.map((item) => ({ ...item })) } : {}),
  };
}

// Post-game trainers have their own placeholder dialogue (POSTGAME.md §1).
const pgLines = (id: string) => ({
  intro: `TODO(text): ${id} intro`, defeat: `TODO(text): ${id} defeat`, after: `TODO(text): ${id} after`,
});
export function councilRematches(council: readonly TrainerDef[]): TrainerDef[] {
  return council.map((trainer) => {
    const rematch = cloneRematch(trainer, 8);
    return { ...rematch, ...pgLines(rematch.id), ...(trainer.id === "rowan" ? { prize: 5000 } : {}) };
  });
}
