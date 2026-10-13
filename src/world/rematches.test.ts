import { describe, expect, it } from "vitest";
import type { SpeciesId, TrainerDef } from "../contracts";
import { TEXTBOX } from "../contracts";
import { DATA } from "../data";
import { MAX_LEVEL } from "../battle/logic/stats";
import { WORLD } from "./index";
import {
  buildRematch, isRematchTrainer, REMATCH_FALLBACK_LEVEL, REMATCH_GROWTH_LEVEL, rematchGrowthLevel, rematchPrompt,
  rematchSpecies, rematchTrainerIds,
} from "./rematches";
import { wrapText } from "./validate";

// Every outdoor route trainer, by map. Story fights (rivals, ROOTSTOCK, leaders,
// the Council and anyone a script battles) and indoor trainers are left out.
const ELIGIBLE = [
  "schoolkid_milo", // route_1
  "birdwatcher_alder", "beekeeper_mae", "gardener_rosa", // route_2
  "hiker_gus", "florist_petra", "birdwatcher_owen", // route_3
  "orchardist_russet", "beekeeper_clem", "schoolkid_tam", "birdwatcher_kit", "hiker_ford", // route_4
  "gardener_ivy", "hiker_dale", // route_5
  "lumberjack_hale", "lumberjack_birch", "forager_sage", "forager_ash", // route_6
  "angler_reed", "angler_moss", "birder_tern", // route_7
  "sailor_kelp", "sailor_brine", "diver_coral", "diver_shoal", // route_8
  "climber_ridge", "climber_scree", "skier_frost", "skier_drift", // route_9
  "drifter_dune", "drifter_mesa", "botanist_sage2", "botanist_rue", // route_10
  "climber_red", "climber_ochre", "ranger_flint", "ranger_shale", // route_11
  "r12_crag", "r12_gorge", "r12_kite", "r12_rook", "r12_sedge", "r12_heath", // route_12
];

const trainer = (id: string) => WORLD.trainers[id];

describe("route rematch eligibility", () => {
  it("lists exactly the outdoor route trainers", () => {
    expect(rematchTrainerIds(WORLD).sort()).toEqual([...ELIGIBLE].sort());
    expect(ELIGIBLE).toHaveLength(43);
  });

  it("excludes rivals, ROOTSTOCK, leaders, the Council, scripted and indoor trainers", () => {
    for (const id of ["rival_1_oak", "rival_4_chili", "grunt_grove_1", "grunt_bs_2", "grunt_dock_1", "grunt_arb_1", "grunt_g1_1",
      "shears", "calloway", "wren", "mercer", "hollis", "flora", "rook", "belladonna", "rowan", "rowan_rematch",
      "jr_hazel", "jr_sorrel", "researcher_lin", "grunt_b1_1"]) {
      expect(trainer(id), id).toBeDefined();
      expect(isRematchTrainer(WORLD, id), id).toBe(false);
    }
    for (const id of ELIGIBLE) {
      const t = trainer(id);
      expect(t.mark, id).toBeUndefined();
      expect(t.className, id).not.toBe("ROOTSTOCK");
      expect(t.music ?? "battle_trainer", id).toBe("battle_trainer");
      const map = Object.values(WORLD.maps).find((m) => m.npcs.some((n) => n.trainer === id))!;
      expect(map.outdoor, id).toBe(true);
    }
  });

  it("asks a question that fits the text box for every eligible trainer", () => {
    for (const id of ELIGIBLE) {
      const lines = wrapText(rematchPrompt(trainer(id)));
      expect(lines.every((l) => l.length <= TEXTBOX.cols), id).toBe(true);
      expect(Math.ceil(lines.length / TEXTBOX.lines), id).toBeLessThanOrEqual(3);
    }
    expect(rematchPrompt(trainer("schoolkid_milo"))).toBe("MILO: Up for a rematch? We've been growing!");
  });
});

describe("rematch growth levels", () => {
  const nonLevel = Object.values(DATA.species).filter((s) => s.growsInto
    && !["vigor", "vigor_day", "vigor_night"].includes(s.growsInto.trigger.kind));

  it("has one explicit entry for every non-level trigger, and nothing else", () => {
    expect(nonLevel.map((s) => s.id).sort()).toEqual(Object.keys(REMATCH_GROWTH_LEVEL).sort());
    expect(nonLevel.length).toBeGreaterThan(0);
  });

  it("uses 36 unless an earlier level is appropriate", () => {
    // The lowest level any trainer fields each species at: the evolved form's
    // first appearance is the "appropriate" level for a non-level trigger.
    const firstSeen = new Map<SpeciesId, number>();
    for (const t of Object.values(WORLD.trainers)) for (const q of t.team) {
      firstSeen.set(q.species, Math.min(firstSeen.get(q.species) ?? Infinity, q.level));
    }
    for (const s of nonLevel) {
      const level = REMATCH_GROWTH_LEVEL[s.id]!;
      const next = DATA.species[s.growsInto!.species];
      const t = next.growsInto?.trigger;
      const nextLevel = t && "level" in t ? t.level : null;
      const seen = firstSeen.get(next.id);
      if (level === REMATCH_FALLBACK_LEVEL) continue;
      // Earlier than 36 only to stay below the next stage's level, or to match
      // where trainers already field the grown form.
      expect(level < REMATCH_FALLBACK_LEVEL, s.id).toBe(true);
      expect((nextLevel !== null && level < nextLevel) || (seen !== undefined && level <= seen), s.id).toBe(true);
    }
    expect(REMATCH_GROWTH_LEVEL.clover_sprout).toBe(17);
    expect(REMATCH_GROWTH_LEVEL.maple_sapling).toBe(26);
    expect(REMATCH_GROWTH_LEVEL.lodgepole_cone).toBeLessThan(32);
    expect(REMATCH_GROWTH_LEVEL.snowdrop_bulb).toBeLessThan(36);
  });

  it("keeps every line in order: each stage grows at a higher level than the one before", () => {
    for (const s of Object.values(DATA.species)) {
      if (s.stage !== 1) continue;
      let prev = 0;
      for (let id: SpeciesId | undefined = s.id; id && DATA.species[id].growsInto; id = DATA.species[id].growsInto!.species) {
        const at = rematchGrowthLevel(DATA, id)!;
        expect(at, id).toBeGreaterThan(prev);
        expect(at, id).toBeLessThanOrEqual(MAX_LEVEL);
        prev = at;
      }
    }
  });

  it("follows level triggers and ignores time of day", () => {
    expect(rematchGrowthLevel(DATA, "oak_acorn")).toBe(16);
    expect(rematchGrowthLevel(DATA, "sunflower_bud")).toBe(24); // vigor_day
    expect(rematchGrowthLevel(DATA, "moonflower_vine")).toBe(22); // vigor_night
    expect(rematchGrowthLevel(DATA, "maple_sapling")).toBe(26); // tending: trainers field SUGAR MAPLE from Lv 26
    expect(rematchGrowthLevel(DATA, "apple_sapling")).toBe(36); // tending: the 36 fallback
    expect(rematchGrowthLevel(DATA, "great_oak")).toBeNull();
  });

  it("grows several stages at once when far enough above", () => {
    expect(rematchSpecies(DATA, "oak_acorn", 15)).toBe("oak_acorn");
    expect(rematchSpecies(DATA, "oak_acorn", 16)).toBe("oak_sapling");
    const finalAt = rematchGrowthLevel(DATA, "oak_sapling")!;
    expect(rematchSpecies(DATA, "oak_acorn", finalAt)).toBe("great_oak");
    expect(rematchSpecies(DATA, "maple_samara", 25)).toBe("maple_sapling");
    expect(rematchSpecies(DATA, "maple_samara", 26)).toBe("sugar_maple");
    expect(rematchSpecies(DATA, "lodgepole_cone", 32)).toBe("lodgepole_pine");
    expect(rematchSpecies(DATA, "snowdrop_bulb", 35)).toBe("snowdrop_shoot");
    expect(rematchSpecies(DATA, "snowdrop_bulb", 36)).toBe("snowdrop");
  });
});

describe("buildRematch", () => {
  it("raises every member by wins + 1 and caps at MAX_LEVEL", () => {
    const milo = trainer("schoolkid_milo");
    expect(buildRematch(DATA, milo, 0).team.map((m) => m.level)).toEqual(milo.team.map((m) => m.level + 1));
    expect(buildRematch(DATA, milo, 4).team.map((m) => m.level)).toEqual(milo.team.map((m) => m.level + 5));
    const high: TrainerDef = { ...milo, team: [{ species: "great_oak", level: 99 }, { species: "great_oak", level: 100 }] };
    expect(buildRematch(DATA, high, 0).team.map((m) => m.level)).toEqual([100, 100]);
    expect(buildRematch(DATA, high, 50).team.map((m) => m.level)).toEqual([100, 100]);
  });

  it("grows the team for its new level: ROSA's seedling becomes a bud", () => {
    const rosa = trainer("gardener_rosa");
    const at = rematchGrowthLevel(DATA, "sunflower_seedling")!;
    const wins = at - 5 - 1; // the Lv 5 seedling reaches its growth level
    const team = buildRematch(DATA, rosa, wins).team;
    expect(team[0]).toEqual({ species: "sunflower_bud", level: at });
    // A stage-1 member far past both triggers skips straight to stage 3.
    const final = rematchGrowthLevel(DATA, "sunflower_bud")!;
    expect(buildRematch(DATA, rosa, final - 5 - 1).team[0]).toEqual({ species: "sunflower", level: final });
  });

  it("keeps hand-picked moves and leaves default moves to the battle", () => {
    const base: TrainerDef = { ...trainer("schoolkid_milo"), team: [
      { species: "oak_acorn", level: 15, moves: ["vine_lash", "sap_seal"] },
      { species: "oak_acorn", level: 15 },
    ] };
    const team = buildRematch(DATA, base, 0).team;
    expect(team[0]).toEqual({ species: "oak_sapling", level: 16, moves: ["vine_lash", "sap_seal"] });
    expect(team[0].moves).not.toBe(base.team[0].moves);
    expect(team[1]).toEqual({ species: "oak_sapling", level: 16 });
    expect("moves" in team[1]).toBe(false);
  });

  it("pays no prize, keeps everything else and never mutates the shared TrainerDef", () => {
    for (const id of ELIGIBLE) {
      const t = trainer(id);
      const before = structuredClone(t);
      const r = buildRematch(DATA, t, 2);
      expect(r.prize).toBe(0);
      expect(t).toEqual(before);
      expect(r.team).not.toBe(t.team);
      const { team: _a, prize: _b, ...rest } = r;
      const { team: _c, prize: _d, ...baseRest } = t;
      expect(rest).toEqual(baseRest);
      expect(t.prize).toBeGreaterThan(0);
    }
  });
});
