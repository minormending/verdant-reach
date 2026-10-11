import type { TrainerDef } from "../contracts";

/** Clone without sharing mutable team, move or item arrays with the first run. */
export function cloneRematch(trainer: TrainerDef, levels: number): TrainerDef {
  return { ...trainer, id: `${trainer.id}_rematch`,
    team: trainer.team.map((member) => ({ ...member, level: member.level + levels,
      ...(member.moves ? { moves: [...member.moves] } : {}) })),
    ...(trainer.items ? { items: trainer.items.map((item) => ({ ...item })) } : {}),
  };
}

// The Council's rematch lines (POSTGAME.md §1). As in Chapter 11, the seat
// scripts (scripts/postgame.ts) speak the run's intro and after lines; these
// cover the battle's defeat line and any direct talk. Each line names only
// species the rematch team fields. Toxicity is only ever "toxic if eaten".
export const REMATCH_LINES: Record<string, { intro: string; defeat: string; after: string }> = {
  belladonna_rematch: {
    intro: "Gloves on, FELLOW. My NETTLES have grown since we last met.",
    defeat: "Noted. Labelled. Filed under \"lost\". Again.",
    after: "NETTLES spread on creeping underground stems. That's why they grow in patches.",
  },
  mimi_osa_rematch: {
    intro: "Mm. Again? ...All right. I'm up. Mostly.",
    defeat: "...Wide awake. Ugh.",
    after: "A MOONFLOWER opens at dusk and closes by morning. We'd get along, it and I.",
  },
  titus_arum_rematch: {
    intro: "Back for a second whiff? Splendid! Breathe deep!",
    defeat: "Ah! Composted, and gladly!",
    after: "Between blooms, a TITAN ARUM grows one huge leaf, year after year. Patience!",
  },
  pyra_rematch: {
    intro: "Round two! I've been at a rolling boil all week!",
    defeat: "Burned out AGAIN! Ha! Brilliant!",
    after: "FLAME LILY climbs with its leaf tips. They curl round anything, like little hooks!",
  },
  rowan_rematch: {
    intro: "The seat's still mine, FELLOW. Show me what's grown since.",
    defeat: "...Still well grown. Every one of them.",
    after: "A SACRED LOTUS seed can sprout after centuries in a dry lakebed. Patience pays.",
  },
};
export function councilRematches(council: readonly TrainerDef[]): TrainerDef[] {
  return council.map((trainer) => {
    const rematch = cloneRematch(trainer, 8);
    return { ...rematch, ...REMATCH_LINES[rematch.id], ...(trainer.id === "rowan" ? { prize: 5000 } : {}) };
  });
}
