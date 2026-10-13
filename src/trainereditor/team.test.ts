import { describe, expect, it } from "vitest";
import { DATA } from "../data";
import { createTrainerQuickened } from "../battle/logic/trainer";
import { TRAINERS, TRAINERS_FILE } from "../world/trainers";
import {
  balanceHint, councilRematch, coverage, defaultMoves, grownAt, learnsetMoves, memberMoves, memberStats, memberWarnings,
  routeRematch,
} from "./team";

const entry = (id: string) => TRAINERS_FILE.trainers.find((e) => e.id === id)!;

describe("team logic", () => {
  it("lists a learnset up to a level, each move at the level first learned", () => {
    const sp = DATA.species.oak_acorn;
    const at6 = learnsetMoves(DATA, "oak_acorn", 6);
    expect(at6.every((m) => m.level <= 6)).toBe(true);
    expect(at6.map((m) => m.move)).toEqual([...new Set(sp.learnset.filter((e) => e.level <= 6).map((e) => e.move))]);
    expect(learnsetMoves(DATA, "oak_acorn").length).toBeGreaterThanOrEqual(at6.length);
  });

  it("gives the engine's default moves, as the battle builds them", () => {
    for (const t of Object.values(TRAINERS).slice(0, 40)) {
      for (const m of t.team) {
        if (m.moves) continue;
        const q = createTrainerQuickened(DATA, m, () => 0.3);
        expect(defaultMoves(DATA, m.species, m.level), `${t.id} ${m.species}`).toEqual(q.moves.map((x) => x.id));
      }
    }
    const hollis = entry("hollis").team[0];
    expect(memberMoves(DATA, hollis)).toEqual(hollis.moves);
  });

  it("computes stats with the battle's formula (grafted members five levels lower)", () => {
    const m = { species: "great_oak" as const, level: 27 };
    expect(memberStats(DATA, m)).toEqual(createTrainerQuickened(DATA, m, () => 0.7).stats);
    expect(memberStats(DATA, { ...m, grafted: true })).toEqual(memberStats(DATA, { ...m, level: 22 }));
  });

  it("warns below the growth level, except for a graft collar or BRAM's collared starter", () => {
    expect(grownAt(DATA, "oak_acorn")).toBeNull();
    const at = grownAt(DATA, "oak_sapling")!;
    expect(at.from).toBe("oak_acorn");
    const low = memberWarnings(DATA, "hiker_gus", { species: "oak_sapling", level: at.level - 1 });
    expect(low.map((w) => w.kind)).toEqual(["growth"]);
    expect(memberWarnings(DATA, "hiker_gus", { species: "oak_sapling", level: at.level })).toEqual([]);
    expect(memberWarnings(DATA, "hiker_gus", { species: "oak_sapling", level: at.level - 1, grafted: true })[0].kind).toBe("allowed");
    // Rival 2: BRAM's collared starter is below its growth level on purpose.
    for (const id of ["rival_2_oak", "rival_2_chili", "rival_2_lily"]) {
      const kinds = entry(id).team.flatMap((m) => memberWarnings(DATA, id, m)).map((w) => w.kind);
      expect(kinds, id).not.toContain("growth");
      expect(kinds, id).toContain("allowed");
    }
    // Rival 4's grafted ace is allowed too.
    expect(entry("rival_4_oak").team.flatMap((m) => memberWarnings(DATA, "rival_4_oak", m)).map((w) => w.kind)).not.toContain("growth");
  });

  it("flags moves outside the learnset or above the level", () => {
    const w = memberWarnings(DATA, "x", { species: "oak_acorn", level: 5, moves: ["moonbeam", ...learnsetMoves(DATA, "oak_acorn").filter((m) => m.level > 5).slice(0, 1).map((m) => m.move)] });
    expect(w.map((x) => x.kind)).toEqual(["off_learnset", "above_level"]);
    // The shipped "any move" overrides are all on bosses (smart AI: hand-picked coverage, balance.test.ts).
    const flagged = TRAINERS_FILE.trainers.filter((t) => t.team.some((m) => memberWarnings(DATA, t.id, m).some((w) => w.kind === "off_learnset" || w.kind === "above_level")));
    expect(flagged.length).toBeGreaterThan(0);
    for (const t of flagged) expect(t.ai, t.id).toBe("smart");
  });

  it("sums type coverage from the type chart", () => {
    const team = [{ species: "oak_acorn" as const, level: 10 }, { species: "chili_blossom" as const, level: 10 }];
    const cov = coverage(DATA, team);
    const fire = cov.defence.find((r) => r.type === "fire")!;
    expect(fire.each).toEqual(team.map((m) => {
      let x = 1;
      for (const t of DATA.species[m.species].types) x *= DATA.typeChart.fire?.[t] ?? 1;
      return x;
    }));
    expect(fire.weak).toBe(fire.each.filter((x) => x > 1).length);
    expect(cov.defence).toHaveLength(9);
    for (const t of cov.moveTypes) expect(team.some((m) => memberMoves(DATA, m).some((id) => DATA.moves[id].type === t && DATA.moves[id].power > 0))).toBe(true);
  });

  it("previews rematches with the game's builders", () => {
    const milo = TRAINERS.schoolkid_milo;
    const r = routeRematch(DATA, milo, 2);
    expect(r.team[0].level).toBe(milo.team[0].level + 3);
    expect(r.prize).toBe(0);
    const seat = councilRematch(TRAINERS.belladonna);
    expect(seat).toEqual(TRAINERS.belladonna_rematch);
  });

  it("gives a cheap balance hint against the shipped team", () => {
    const e = entry("hollis");
    expect(balanceHint(DATA, e, e)).toBeNull();
    const up = balanceHint(DATA, { ...e, team: e.team.map((m) => ({ ...m, level: m.level + 3 })) }, e)!;
    expect(up.pct).toBeGreaterThan(0);
    expect(up.text).toMatch(/ace \+3 levels/);
  });
});
