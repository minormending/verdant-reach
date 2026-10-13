import type { GameData, ScriptCmd, SpeciesId, TrainerDef, WorldData } from "../contracts";
// The level cap only: a pure module (contracts and lookups), no battle scene.
import { MAX_LEVEL } from "../battle/logic/stats";

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

// ---------------------------------------------------------------------------
// Route rematches: talk to a beaten outdoor trainer and fight again, one level
// higher per rematch won. The base TrainerDef is never changed; each fight gets
// a fresh team from buildRematch.
// ---------------------------------------------------------------------------

/** The question asked after a beaten trainer's `after` line (with the trainer's name as speaker). */
export const REMATCH_QUESTION = "Up for a rematch? We've been growing!";
export const rematchPrompt = (trainer: Pick<TrainerDef, "name">) => `${trainer.name}: ${REMATCH_QUESTION}`;

/** Trainer ids any script battles (the story drives those fights, not the generic NPC flow). */
function scriptedTrainers(world: WorldData): Set<string> {
  const out = new Set<string>();
  const walk = (cmds: readonly ScriptCmd[] | undefined) => {
    for (const c of cmds ?? []) {
      if (c.op === "battle") out.add(c.trainer);
      if (c.op === "choice") c.branches.forEach(walk);
      else if (c.op === "yesno") { walk(c.yes); walk(c.no); }
      else if ("then" in c) { walk(c.then); walk(c.else); }
    }
  };
  for (const cmds of Object.values(world.scripts)) walk(cmds);
  return out;
}

const eligibleCache = new WeakMap<WorldData, Set<string>>();

/**
 * THE rematch rule, in one place. A trainer can be rematched when it is fought
 * through the engine's trainer NPC flow (an NPC with `trainer`, by sight or talk)
 * on an `outdoor` map, and is not a story fight:
 * - not a rival (BRAM's `rival_*` variants);
 * - not ROOTSTOCK (grunts and admins: SHEARS, CALLOWAY, WREN, MERCER);
 * - not a Conservatory leader (a `mark`) or the Council/Keeper (leader or keeper music);
 * - not battled by any script.
 * Indoor trainers (Conservatory juniors, the Palm House) are not rematchable.
 */
function rematchSet(world: WorldData): Set<string> {
  let set = eligibleCache.get(world);
  if (!set) {
    const scripted = scriptedTrainers(world);
    set = new Set<string>();
    for (const map of Object.values(world.maps)) {
      if (!map.outdoor) continue;
      for (const npc of map.npcs) {
        const t = npc.trainer ? world.trainers[npc.trainer] : undefined;
        if (!t || scripted.has(t.id) || t.id.startsWith("rival_") || t.className === "ROOTSTOCK"
          || t.mark || (t.music ?? "battle_trainer") !== "battle_trainer") continue;
        set.add(t.id);
      }
    }
    eligibleCache.set(world, set);
  }
  return set;
}

export const rematchTrainerIds = (world: WorldData): string[] => [...rematchSet(world)];
export const isRematchTrainer = (world: WorldData, id: string): boolean => rematchSet(world).has(id);

/**
 * Rematch growth levels for stages whose real trigger is not a level (care, an
 * item, cross-pollination). Trainers can't tend, carry or trade, so in a rematch
 * these grow at a level instead: the fallback is 36, unless the next stage grows
 * by level at 36 or below, when the stage must grow first.
 */
export const REMATCH_FALLBACK_LEVEL = 36;
export const REMATCH_GROWTH_LEVEL: Partial<Record<SpeciesId, number>> = {
  clover_sprout: 36,   // tending -> WHITE CLOVER (final stage): the fallback
  maple_sapling: 36,   // tending -> SUGAR MAPLE; MAPLE SAMARA grew at 12
  apple_sapling: 36,   // tending -> APPLE TREE; APPLE PIP grew at 18
  vanilla_vine: 36,    // cross-pollination -> VANILLA ORCHID (final stage)
  lodgepole_cone: 26,  // EMBER ASH -> LODGEPOLE SEEDLING, which becomes a pine at 32; wild cones are Lv 20-24
  snowdrop_bulb: 34,   // COLD SNAP -> SNOWDROP SHOOT, which becomes a SNOWDROP at 36; wild bulbs are Lv 32-36
};

/** The level at which a species grows in a rematch, or null for a final stage. */
export function rematchGrowthLevel(data: GameData, id: SpeciesId): number | null {
  const grows = data.species[id]?.growsInto;
  if (!grows) return null;
  const t = grows.trigger;
  // Time of day is ignored for trainers: sunlight and moonlight growth go by level.
  if (t.kind === "vigor" || t.kind === "vigor_day" || t.kind === "vigor_night") return t.level;
  return REMATCH_GROWTH_LEVEL[id] ?? REMATCH_FALLBACK_LEVEL;
}

/** Follow the line's `growsInto` chain as far as the level allows (several stages if far enough above). */
export function rematchSpecies(data: GameData, id: SpeciesId, level: number): SpeciesId {
  let species = id;
  for (let guard = 0; guard < 3; guard++) {
    const at = rematchGrowthLevel(data, species);
    if (at === null || level < at) break;
    species = data.species[species].growsInto!.species;
  }
  return species;
}

/**
 * A fresh rematch team: every member at +(wins + 1) levels (capped at MAX_LEVEL),
 * grown for its new level. Members on default moves stay on default moves (the
 * battle picks the level-appropriate set for the new species); hand-picked moves
 * are kept. Same id, AI, items, music, portrait and lines. Rematches pay no
 * prize money, only EXP.
 */
export function buildRematch(data: GameData, trainer: TrainerDef, wins: number): TrainerDef {
  const bonus = Math.max(0, Math.floor(wins)) + 1;
  return {
    ...trainer,
    prize: 0,
    team: trainer.team.map((member) => {
      const level = Math.min(MAX_LEVEL, member.level + bonus);
      return { ...member, level, species: rematchSpecies(data, member.species, level),
        ...(member.moves ? { moves: [...member.moves] } : {}) };
    }),
    ...(trainer.items ? { items: trainer.items.map((item) => ({ ...item })) } : {}),
  };
}
