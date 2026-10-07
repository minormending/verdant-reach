import { describe, expect, it } from "vitest";
import type { GameData, GameState, PollinationGroup, Quickened, SpeciesId, WorldData } from "../contracts";
import { DATA } from "../data";
import { createQuickened } from "../battle/logic/stats";
import { newGameState } from "../save";
import {
  board, boardBlock, boarderExp, canBattle, collectSeed, compatibility, inheritIvs, levelsGained, makeSeed,
  nurseryOf, nurseryStep, readySeed, SEED_CHECK_STEPS, SEED_FRIENDSHIP, SEED_STEPS, seedHint, seedStep, sprout,
  stage1Of, takeBack, takeBackFee, type Boarder,
} from "./nursery";

/** The real data, with pollination groups pinned so the tests don't depend on data tuning. */
function withGroups(groups: Partial<Record<SpeciesId, PollinationGroup[]>>): GameData {
  const species = { ...DATA.species };
  for (const id of Object.keys(species) as SpeciesId[]) species[id] = { ...species[id], pollination: groups[id] ?? [] };
  return { ...DATA, species };
}
const data = withGroups({
  oak_acorn: ["woodland"], oak_sapling: ["woodland"], great_oak: ["woodland"],
  maple_samara: ["woodland"], maple_sapling: ["woodland"], sugar_maple: ["woodland"],
  dandelion_bud: ["meadow"], fern_fiddlehead: ["spore"],
});

const world = { maps: {}, newGame: { map: "fallowfield", x: 1, y: 1, facing: "down", script: "x" } } as unknown as WorldData;
const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };
const mk = (id: SpeciesId, level: number, rng = seq(0.3, 0.7, 0.1, 0.9)) => createQuickened(data, id, level, rng);

function stateWith(...party: Quickened[]): GameState {
  const s = newGameState({ world });
  s.party = party;
  return s;
}

describe("nursery: boarding", () => {
  it("the Elder cannot breed with another Elder or a woodland partner using its real groups", () => {
    const elder = createQuickened(DATA, "elder", 60, seq(0.5));
    const other = createQuickened(DATA, "elder", 60, seq(0.5));
    const aspen = createQuickened(DATA, "quaking_aspen", 50, seq(0.5));
    const sucker = createQuickened(DATA, "aspen_sucker", 30, seq(0.5));
    expect(compatibility(DATA, sucker, aspen)).toBe(0.5);
    for (const pair of [[elder, other], [elder, aspen], [aspen, elder]]) {
      expect(compatibility(DATA, pair[0], pair[1])).toBe(0);
      const state = stateWith();
      state.nursery = { slots: pair, steps: SEED_CHECK_STEPS - 1, seedReady: false };
      expect(nurseryStep(state, DATA, () => 0)).toBe(false);
      expect(state.nursery.seedReady).toBe(false);
    }
  });
  it("boards a plant, remembers its level and charges $100 + $100 per level gained", () => {
    const st = stateWith(mk("oak_acorn", 10), mk("maple_samara", 12));
    expect(boardBlock(st, 1)).toBeNull();
    const b = board(st, 1);
    expect(st.party).toHaveLength(1);
    expect(nurseryOf(st).slots).toEqual([b]);
    expect(b.boardedLevel).toBe(12);
    expect(takeBackFee(b)).toBe(100);
    b.level = 15;
    expect(levelsGained(b)).toBe(3);
    expect(takeBackFee(b)).toBe(400);
    const back = takeBack(st, 0);
    expect(back).toBe(b);
    expect((back as Boarder).boardedLevel).toBeUndefined();
    expect(st.party).toHaveLength(2);
    expect(nurseryOf(st).slots).toHaveLength(0);
  });

  it("keeps at least one healthy non-seed Quickened in the party", () => {
    const seed = mk("oak_acorn", 5);
    seed.seed = { steps: 900 };
    const lone = mk("oak_acorn", 10);
    const st = stateWith(lone, seed);
    expect(boardBlock(st, 0)).toBe("last");
    expect(boardBlock(st, 1)).toBe("seed");
    const wilted = mk("maple_samara", 9);
    wilted.hp = 0;
    st.party.push(wilted);
    expect(boardBlock(st, 0)).toBe("last");      // a wilted plant doesn't count
    st.party.push(mk("dandelion_bud", 6));
    expect(boardBlock(st, 0)).toBeNull();
  });

  it("holds two boarders at most", () => {
    const st = stateWith(mk("oak_acorn", 10), mk("maple_samara", 10), mk("dandelion_bud", 10), mk("fern_fiddlehead", 10));
    board(st, 0);
    board(st, 0);
    expect(boardBlock(st, 0)).toBe("full");
  });
});

describe("nursery: steps and growth", () => {
  it("gives 1 exp per step and levels up without learning moves", () => {
    const q = mk("oak_acorn", 5);
    const moves = q.moves.map((m) => m.id);
    const need = data.expForLevel("medium", 6) - q.exp;
    const sp = data.species.oak_acorn;
    let ups = 0;
    for (let i = 0; i < need; i++) ups += boarderExp(data, q, 1);
    expect(ups).toBe(1);
    expect(q.level).toBe(6);
    expect(q.moves.map((m) => m.id)).toEqual(moves);
    expect(q.species).toBe(sp.id); // never grows in the nursery
  });

  it("checks for a seed every 256 steps with 50% for the same line, 20% for a shared group", () => {
    const oak = mk("oak_acorn", 10), sapling = mk("oak_sapling", 18), maple = mk("maple_samara", 10), dand = mk("dandelion_bud", 10);
    expect(compatibility(data, oak, sapling)).toBe(0.5);
    expect(compatibility(data, oak, maple)).toBe(0.2);
    expect(compatibility(data, oak, dand)).toBe(0);
    expect(compatibility(data, oak, undefined)).toBe(0);
    // no groups at all: never, even for the same line
    expect(compatibility(withGroups({}), oak, sapling)).toBe(0);

    const st = stateWith(mk("dandelion_bud", 10), oak, maple);
    board(st, 1);
    board(st, 1);
    const n = nurseryOf(st);
    for (let i = 0; i < SEED_CHECK_STEPS - 1; i++) expect(nurseryStep(st, data, () => 0)).toBe(false);
    expect(n.steps).toBe(SEED_CHECK_STEPS - 1);
    expect(nurseryStep(st, data, () => 0.25)).toBe(false); // 0.25 >= 0.2: no seed this time
    expect(n.steps).toBe(0);
    for (let i = 0; i < SEED_CHECK_STEPS - 1; i++) nurseryStep(st, data, () => 0.19);
    expect(nurseryStep(st, data, () => 0.19)).toBe(true);
    expect(n.seedReady).toBe(true);
  });

  it("never sets a seed with a single boarder", () => {
    const st = stateWith(mk("dandelion_bud", 10), mk("oak_acorn", 10));
    board(st, 1);
    for (let i = 0; i < SEED_CHECK_STEPS * 3; i++) nurseryStep(st, data, () => 0);
    expect(nurseryOf(st).seedReady).toBe(false);
  });
});

describe("nursery: seeds", () => {
  it("finds the stage-1 species of a line", () => {
    expect(stage1Of(data, "great_oak")).toBe("oak_acorn");
    expect(stage1Of(data, "oak_acorn")).toBe("oak_acorn");
    expect(stage1Of(data, "sugar_maple")).toBe("maple_samara");
  });

  it("inherits exactly three Gen 2 DVs from the parents", () => {
    const own = { hp: 0, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 };
    const a = { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 };
    const iv = inheritIvs(own, a, a, seq(0, 0.2, 0, 0.2, 0, 0.2));
    const dvs = [iv.atk, iv.def, iv.spe, iv.spa];
    expect(dvs.filter((v) => v === 15)).toHaveLength(3);
    expect(dvs.filter((v) => v === 1)).toHaveLength(1);
    expect(iv.spa).toBe(iv.spd);
    expect(iv.hp).toBe(((iv.atk & 1) << 3) | ((iv.def & 1) << 2) | ((iv.spe & 1) << 1) | (iv.spa & 1));
  });

  it("makes a level-5 stage-1 seed of the seed parent's line with level-1 moves plus a shared move", () => {
    const mother = mk("great_oak", 40);
    const father = mk("oak_sapling", 30);
    const sp = data.species.oak_acorn;
    const later = sp.learnset.find((e) => e.level > 1)!.move;
    mother.moves = [{ id: later, pp: 10 }];
    father.moves = [{ id: later, pp: 10 }];
    const q = makeSeed(data, mother, father, seq(0.5, 0.1, 0.8, 0.3, 0.6));
    expect(q.species).toBe("oak_acorn");
    expect(q.level).toBe(5);
    expect(q.seed).toEqual({ steps: SEED_STEPS[sp.growthRate] });
    expect(q.friendship).toBe(SEED_FRIENDSHIP);
    const lv1 = sp.learnset.filter((e) => e.level <= 1).map((e) => e.move);
    for (const m of lv1.slice(-3)) expect(q.moves.map((x) => x.id)).toContain(m);
    expect(q.moves.map((x) => x.id)).toContain(later);
    expect(q.moves.length).toBeLessThanOrEqual(4);
    expect(q.hp).toBe(q.stats.hp);
  });

  it("rolls a sport at 1/256", () => {
    const a = mk("oak_acorn", 10), b = mk("oak_acorn", 10);
    expect(makeSeed(data, a, b, () => 0.001).sport).toBe(true);   // < 1/256
    expect(makeSeed(data, a, b, () => 0.5).sport).toBe(false);
  });

  it("hands over the seed only when one is ready and there is room", () => {
    const st = stateWith(mk("dandelion_bud", 10), mk("oak_acorn", 10), mk("maple_samara", 10));
    board(st, 1);
    board(st, 1);
    expect(collectSeed(st, data, () => 0.5)).toBeNull();
    nurseryOf(st).seedReady = true;
    const q = collectSeed(st, data, () => 0.5)!;
    expect(q.species).toBe("oak_acorn"); // the first boarded is the seed parent
    expect(st.party).toContain(q);
    expect(nurseryOf(st).seedReady).toBe(false);
  });

  it("counts seeds down per step, can't battle, and sprouts into the herbarium", () => {
    const fighter = mk("oak_acorn", 10);
    const seed = mk("dandelion_bud", 5);
    seed.seed = { steps: 2 };
    const st = stateWith(seed, fighter);
    expect(canBattle(seed)).toBe(false);
    expect(canBattle(fighter)).toBe(true);
    expect(seedStep(st.party)).toEqual([]);
    expect(seed.seed.steps).toBe(1);
    expect(readySeed(st.party)).toBeUndefined();
    expect(seedStep(st.party)).toEqual([seed]);
    expect(readySeed(st.party)).toBe(seed);
    expect(st.herbarium.caught).not.toContain("dandelion_bud");
    sprout(st, seed, "route_1");
    expect(seed.seed).toBeUndefined();
    expect(seed.metAt).toEqual({ map: "route_1", level: 5 });
    expect(st.herbarium.seen).toContain("dandelion_bud");
    expect(st.herbarium.caught).toContain("dandelion_bud");
    expect(st.flags.sprouted_any).toBe(true);
  });

  it("gives hints that warm up as the seed nears sprouting", () => {
    expect(seedHint(1000)).toMatch(/warm/);
    expect(seedHint(300)).toMatch(/moving/);
    expect(seedHint(20)).toMatch(/sprout soon/);
    for (const s of [1000, 300, 20]) expect(seedHint(s).length).toBeLessThanOrEqual(36);
  });
});
