import { describe, expect, it } from "vitest";
import type { Quickened, SpeciesId } from "../../contracts";
import { FIXTURE_DATA } from "../fixtures";
import { createBattleState } from "./battle";
import { chooseFoeAction, scoreMove } from "./ai";
import { createQuickened, recalcStats, trainerIvs } from "./stats";
import { seeded } from "./rng";

const data = FIXTURE_DATA;
function mk(species: SpeciesId, level: number, moves?: string[]): Quickened {
  const q = createQuickened(data, species, level, seeded(level));
  q.ivs = trainerIvs();
  recalcStats(data, q);
  q.hp = q.stats.hp;
  if (moves) q.moves = moves.map((id) => ({ id, pp: data.moves[id].pp }));
  return q;
}
const st = (p: Quickened[], f: Quickened[], items: Record<string, number> = {}) =>
  createBattleState({ data, playerParty: p, playerActive: 0, foeParty: f, wild: false, foeTrainer: "WARDEN HOLLIS", foeItems: items });

describe("basic AI", () => {
  it("only picks moves with PP", () => {
    const foe = mk("chili_blossom", 20, ["ember", "tackle"]);
    foe.moves[0].pp = 0;
    const s = st([mk("oak_acorn", 20)], [foe]);
    for (let i = 0; i < 50; i++) expect(chooseFoeAction(s, "basic", seeded(i))).toEqual({ kind: "move", slot: 1 });
  });
  it("prefers super-effective moves slightly", () => {
    const foe = mk("chili_blossom", 20, ["ember", "nectar_lure"]);
    const s = st([mk("oak_acorn", 20)], [foe]);
    let se = 0;
    for (let i = 0; i < 1000; i++) {
      const a = chooseFoeAction(s, "basic", seeded(i));
      if (a.kind === "move" && a.slot === 0) se++;
    }
    expect(se).toBeGreaterThan(560);
    expect(se).toBeLessThan(750);
  });
  it("struggles with no PP at all", () => {
    const foe = mk("chili_blossom", 20, ["ember"]);
    foe.moves[0].pp = 0;
    const s = st([mk("oak_acorn", 20)], [foe]);
    expect(chooseFoeAction(s, "basic", seeded(1))).toEqual({ kind: "move", slot: -1 });
  });
});

describe("smart AI", () => {
  it("picks the strongest move against the target", () => {
    const foe = mk("chili_blossom", 20, ["tackle", "ember", "nectar_lure"]);
    const s = st([mk("oak_acorn", 20)], [foe]);
    let ember = 0;
    for (let i = 0; i < 100; i++) {
      const a = chooseFoeAction(s, "smart", seeded(i));
      if (a.kind === "move" && a.slot === 1) ember++;
    }
    expect(ember).toBeGreaterThan(70);
  });
  it("values status on a healthy target and not on a statused one", () => {
    const foe = mk("dandelion_bud", 20, ["pollen_puff"]);
    const target = mk("oak_acorn", 20);
    const s = st([target], [foe]);
    const fresh = scoreMove(s, 1, data.moves.pollen_puff);
    target.status = "blight";
    expect(scoreMove(s, 1, data.moves.pollen_puff)).toBeLessThan(fresh);
  });
  it("heals with items at low HP", () => {
    const foe = mk("oak_sapling", 20, ["tackle"]);
    foe.hp = 3;
    const s = st([mk("chili_blossom", 20)], [foe], { spring_water: 1 });
    let used = 0;
    for (let i = 0; i < 100; i++) if (chooseFoeAction(s, "smart", seeded(i)).kind === "item") used++;
    expect(used).toBeGreaterThan(55);
    const s2 = st([mk("chili_blossom", 20)], [mk("oak_sapling", 20, ["tackle"])], { spring_water: 1 });
    for (let i = 0; i < 50; i++) expect(chooseFoeAction(s2, "smart", seeded(i)).kind).not.toBe("item");
  });
  it("sometimes switches out of a bad matchup", () => {
    const foe = mk("oak_acorn", 20, ["tackle"]);
    const backup = mk("lily_seedpod", 20, ["bubble"]);
    const s = st([mk("chili_blossom", 20, ["ember"])], [foe, backup]);
    let switched = 0;
    for (let i = 0; i < 200; i++) {
      const a = chooseFoeAction(s, "smart", seeded(i));
      if (a.kind === "switch") { switched++; expect(a.index).toBe(1); }
    }
    expect(switched).toBeGreaterThan(30);
    expect(switched).toBeLessThan(140);
  });
  it("prefers a heal move when badly hurt", () => {
    const foe = mk("sunflower_seedling", 20, ["tackle", "photosynthesise"]);
    foe.hp = Math.floor(foe.stats.hp / 5);
    const s = st([mk("great_oak", 60)], [foe]);
    let heal = 0;
    for (let i = 0; i < 100; i++) {
      const a = chooseFoeAction(s, "smart", seeded(i));
      if (a.kind === "move" && a.slot === 1) heal++;
    }
    expect(heal).toBeGreaterThan(60);
  });
});
