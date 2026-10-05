import { describe, expect, it } from "vitest";
import type { Quickened, SpeciesId } from "../../contracts";
import { FIXTURE_DATA } from "../fixtures";
import {
  active, createBattleState, effectiveSpeed, executeMove, endOfTurn, resolveTurn, type BattleEvent, type BattleState,
} from "./battle";
import { createQuickened, recalcStats, trainerIvs } from "./stats";
import { seeded, sequence } from "./rng";

const data = FIXTURE_DATA;

function mk(species: SpeciesId, level: number, moves?: string[]): Quickened {
  const q = createQuickened(data, species, level, seeded(level * 7));
  q.ivs = trainerIvs();
  recalcStats(data, q);
  q.hp = q.stats.hp;
  if (moves) q.moves = moves.map((id) => ({ id, pp: data.moves[id].pp }));
  return q;
}

function battle(p: Quickened[], f: Quickened[], wild = true): BattleState {
  return createBattleState({ data, playerParty: p, playerActive: 0, foeParty: f, wild, time: "day" });
}

const texts = (ev: BattleEvent[]) => ev.filter((e) => e.t === "text").map((e) => (e as { text: string }).text);

describe("turn order", () => {
  it("faster moves first", () => {
    const fast = mk("dandelion_bud", 20, ["tackle"]);
    const slow = mk("oak_acorn", 20, ["tackle"]);
    const s = battle([slow], [fast]);
    const ev = resolveTurn(s, { kind: "move", slot: 0 }, { kind: "move", slot: 0 }, seeded(1));
    const used = texts(ev).filter((t) => t.includes("used"));
    expect(used[0]).toContain("Wild DANDELION BUD");
  });
  it("priority beats speed", () => {
    const fast = mk("dandelion_bud", 20, ["tackle"]);
    const slow = mk("flytrap_seedling", 5, ["quick_snap"]);
    const s = battle([slow], [fast]);
    const ev = resolveTurn(s, { kind: "move", slot: 0 }, { kind: "move", slot: 0 }, seeded(1));
    expect(texts(ev).find((t) => t.includes("used"))).toContain("FLYTRAP");
  });
  it("rootbound halves speed", () => {
    const q = mk("dandelion_bud", 20);
    const s = battle([q], [mk("oak_acorn", 20)]);
    const before = effectiveSpeed(s, 0);
    q.status = "rootbound";
    expect(effectiveSpeed(s, 0)).toBe(Math.floor(before / 2));
  });
  it("random tiebreak on equal speed", () => {
    const firsts = new Set<string>();
    for (let seed = 1; seed < 40; seed++) {
      const a = mk("oak_acorn", 20, ["tackle"]);
      const b = mk("oak_acorn", 20, ["tackle"]);
      b.nickname = "OTHER";
      const s = battle([a], [b]);
      const ev = resolveTurn(s, { kind: "move", slot: 0 }, { kind: "move", slot: 0 }, seeded(seed));
      firsts.add(texts(ev).find((t) => t.includes("used"))!);
    }
    expect(firsts.size).toBe(2);
  });
});

describe("status", () => {
  it("blight deals 1/8 per turn, scorch 1/16", () => {
    const a = mk("oak_acorn", 30);
    const b = mk("dandelion_bud", 30);
    const s = battle([a], [b]);
    a.status = "blight";
    b.status = "scorch";
    const ev: BattleEvent[] = [];
    endOfTurn(s, [0, 1], seeded(1), ev);
    expect(a.stats.hp - a.hp).toBe(Math.floor(a.stats.hp / 8));
    expect(b.stats.hp - b.hp).toBe(Math.floor(b.stats.hp / 16));
  });
  it("status damage can wilt", () => {
    const a = mk("oak_acorn", 30);
    const s = battle([a], [mk("dandelion_bud", 30)]);
    a.status = "blight";
    a.hp = 1;
    const ev: BattleEvent[] = [];
    endOfTurn(s, [0, 1], seeded(1), ev);
    expect(a.hp).toBe(0);
    expect(ev.some((e) => e.t === "wilt" && e.side === 0)).toBe(true);
    expect(a.status).toBeNull();
  });
  it("frostbite blocks action and thaws 20% of the time", () => {
    let thawed = 0;
    for (let seed = 1; seed <= 500; seed++) {
      const a = mk("oak_acorn", 20, ["tackle"]);
      a.status = "frostbite";
      const s = battle([a], [mk("dandelion_bud", 20)]);
      const ev: BattleEvent[] = [];
      executeMove(s, 0, 0, true, seeded(seed), ev);
      if (a.status === null) thawed++;
      else expect(texts(ev)).toContain("OAK ACORN is frozen stiff!");
    }
    expect(thawed).toBeGreaterThan(70);
    expect(thawed).toBeLessThan(130);
  });
  it("dormant lasts 1-3 turns", () => {
    for (let seed = 1; seed < 30; seed++) {
      const a = mk("oak_acorn", 20, ["tackle"]);
      const s = battle([a], [mk("great_oak", 60)]);
      const rng = seeded(seed);
      const ev0: BattleEvent[] = [];
      // inflict via the pollen move
      s.sides[1].party[0].moves = [{ id: "pollen_puff", pp: 10 }];
      while (a.status !== "dormant") executeMove(s, 1, 0, true, rng, ev0);
      const turns = s.dormant[a.uid];
      expect(turns).toBeGreaterThanOrEqual(1);
      expect(turns).toBeLessThanOrEqual(3);
      let skipped = 0;
      for (let t = 0; t < 5 && a.status === "dormant"; t++) {
        const ev: BattleEvent[] = [];
        executeMove(s, 0, 0, true, rng, ev);
        if (texts(ev).some((x) => x.includes("is dormant"))) skipped++;
      }
      expect(a.status).toBeNull();
      expect(skipped).toBe(turns - 1);
    }
  });
  it("rootbound fails ~25% of the time", () => {
    let fails = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const a = mk("oak_acorn", 20, ["sap_seal"]);
      a.status = "rootbound";
      const s = battle([a], [mk("dandelion_bud", 20)]);
      const ev: BattleEvent[] = [];
      executeMove(s, 0, 0, true, seeded(seed), ev);
      if (texts(ev).some((t) => t.includes("can't move"))) fails++;
    }
    expect(fails).toBeGreaterThan(70);
    expect(fails).toBeLessThan(130);
  });
  it("fire types can't be scorched; status moves fail on statused foes", () => {
    const a = mk("bramble_blossom", 20, ["allelopathy"]);
    const b = mk("chili_blossom", 20);
    const s = battle([a], [b]);
    b.status = "dormant";
    const ev: BattleEvent[] = [];
    executeMove(s, 0, 0, true, sequence([0]), ev);
    expect(b.status).toBe("dormant");
    expect(texts(ev).join(" ")).toMatch(/failed/);
  });
});

describe("move effects", () => {
  it("stat moves change stages and cap at +6", () => {
    const a = mk("oak_acorn", 20, ["sap_seal"]);
    const s = battle([a], [mk("dandelion_bud", 20)]);
    for (let i = 0; i < 8; i++) executeMove(s, 0, 0, true, seeded(i), []);
    expect(s.sides[0].vol.stages.def).toBe(6);
    const ev: BattleEvent[] = [];
    a.moves[0].pp = 5;
    executeMove(s, 0, 0, true, seeded(1), ev);
    expect(texts(ev).join(" ")).toMatch(/won't go higher/);
  });
  it("drain heals the user", () => {
    const a = mk("flytrap_seedling", 20, ["snap_trap"]);
    a.hp = 5;
    const s = battle([a], [mk("dandelion_bud", 20)]);
    executeMove(s, 0, 0, true, sequence([0.01, 0.9, 0.5]), []);
    expect(a.hp).toBeGreaterThan(5);
  });
  it("recoil hurts the user", () => {
    const a = mk("lily_seedpod", 20, ["pad_slam"]);
    const s = battle([a], [mk("chili_blossom", 20)]);
    executeMove(s, 0, 0, true, sequence([0.01, 0.9, 0.5]), []);
    expect(a.hp).toBeLessThan(a.stats.hp);
  });
  it("multi-hit hits 2-5 times", () => {
    const counts = new Set<number>();
    for (let seed = 1; seed < 80; seed++) {
      const a = mk("dandelion_bud", 30, ["seed_burst"]);
      const b = mk("great_oak", 80);
      const s = battle([a], [b]);
      const ev: BattleEvent[] = [];
      executeMove(s, 0, 0, true, seeded(seed), ev);
      const hits = ev.filter((e) => e.t === "hp" && e.kind === "hit").length;
      if (hits > 0) {
        expect(hits).toBeGreaterThanOrEqual(2);
        expect(hits).toBeLessThanOrEqual(5);
        counts.add(hits);
      }
    }
    expect(counts.size).toBeGreaterThanOrEqual(3);
  });
  it("fixed damage equals the level and ignores resistances", () => {
    const a = mk("moonflower_seed", 17, ["moonbeam"]);
    const b = mk("dandelion_bud", 30);
    const s = battle([a], [b]);
    executeMove(s, 0, 0, true, sequence([0.01]), []);
    expect(b.stats.hp - b.hp).toBe(17);
  });
  it("always_hit ignores evasion", () => {
    const a = mk("moonflower_seed", 20, ["shadow_vine"]);
    const b = mk("dandelion_bud", 20);
    const s = battle([a], [b]);
    s.sides[1].vol.stages.evasion = 6;
    executeMove(s, 0, 0, true, sequence([0.99, 0.99, 0.5]), []);
    expect(b.hp).toBeLessThan(b.stats.hp);
  });
  it("weather lasts 5 turns", () => {
    const a = mk("chili_blossom", 20, ["heat_wave"]);
    const b = mk("dandelion_bud", 20, ["nectar_lure"]);
    const s = battle([a], [b]);
    resolveTurn(s, { kind: "move", slot: 0 }, { kind: "none" }, seeded(1));
    expect(s.weather?.kind).toBe("sun");
    for (let i = 0; i < 3; i++) resolveTurn(s, { kind: "none" }, { kind: "none" }, seeded(1));
    expect(s.weather?.kind).toBe("sun");
    const ev = resolveTurn(s, { kind: "none" }, { kind: "none" }, seeded(1));
    expect(s.weather).toBeNull();
    expect(texts(ev)).toContain("The sunlight faded.");
  });
  it("photosynthesise heals more in sun", () => {
    const heal = (weather: "sun" | "rain" | null) => {
      const a = mk("sunflower_seedling", 20, ["photosynthesise"]);
      a.hp = 1;
      const s = battle([a], [mk("dandelion_bud", 20)]);
      s.weather = weather ? { kind: weather, turns: 5 } : null;
      executeMove(s, 0, 0, true, seeded(1), []);
      return a.hp - 1;
    };
    expect(heal("sun")).toBeGreaterThan(heal(null));
    expect(heal(null)).toBeGreaterThan(heal("rain"));
  });
  it("root tap drains the foe each turn and wood is immune", () => {
    const a = mk("oak_acorn", 20, ["root_tap"]);
    const b = mk("dandelion_bud", 20, ["nectar_lure"]);
    const s = battle([a], [b]);
    a.hp = 10;
    resolveTurn(s, { kind: "move", slot: 0 }, { kind: "none" }, sequence([0.01, 0.5]));
    expect(s.sides[1].vol.rootTapped).toBe(true);
    expect(b.hp).toBe(b.stats.hp - Math.floor(b.stats.hp / 8));
    expect(a.hp).toBeGreaterThan(10);
    const c = mk("fern_fiddlehead", 20);
    const s2 = battle([mk("oak_acorn", 20, ["root_tap"])], [c]);
    const ev: BattleEvent[] = [];
    executeMove(s2, 0, 0, true, sequence([0.01]), ev);
    expect(s2.sides[1].vol.rootTapped).toBe(false);
  });
  it("protect blocks the foe's move this turn", () => {
    const a = mk("oak_acorn", 20, ["curl_up"]);
    const b = mk("chili_blossom", 20, ["ember"]);
    const s = battle([a], [b]);
    const ev = resolveTurn(s, { kind: "move", slot: 0 }, { kind: "move", slot: 0 }, seeded(3));
    expect(a.hp).toBe(a.stats.hp);
    expect(texts(ev).join(" ")).toMatch(/protected itself/);
    expect(s.sides[0].vol.protecting).toBe(false);
  });
  it("flinch only when moving first", () => {
    const a = mk("nettle_sprout", 30, ["thorn_jab"]);
    const b = mk("great_oak", 30, ["tackle"]);
    let flinched = 0;
    for (let seed = 0; seed < 100; seed++) {
      a.moves[0].pp = 20;
      const s = battle([a], [b]);
      b.hp = b.stats.hp;
      a.hp = a.stats.hp;
      const ev = resolveTurn(s, { kind: "move", slot: 0 }, { kind: "move", slot: 0 }, seeded(seed));
      if (texts(ev).some((t) => t.includes("flinched"))) flinched++;
    }
    expect(flinched).toBeGreaterThan(10);
    expect(flinched).toBeLessThan(55);
  });
  it("struggle when out of PP", () => {
    const a = mk("oak_acorn", 20, ["tackle"]);
    a.moves[0].pp = 0;
    const b = mk("dandelion_bud", 20);
    const s = battle([a], [b]);
    const ev: BattleEvent[] = [];
    executeMove(s, 0, -1, true, sequence([0.5]), ev);
    expect(texts(ev).join(" ")).toMatch(/STRUGGLE/);
    expect(a.hp).toBeLessThan(a.stats.hp);
  });
  it("missing respects accuracy", () => {
    const a = mk("dandelion_bud", 20, ["pollen_puff"]);
    const b = mk("oak_acorn", 20);
    const s = battle([a], [b]);
    const ev: BattleEvent[] = [];
    executeMove(s, 0, 0, true, sequence([0.9]), ev);
    expect(texts(ev).join(" ")).toMatch(/missed/);
    expect(b.status).toBeNull();
  });
  it("wilts and clears volatile state", () => {
    const a = mk("great_oak", 80, ["leaf_blade"]);
    const b = mk("lily_seedpod", 3);
    const s = battle([a], [b]);
    const ev = resolveTurn(s, { kind: "move", slot: 0 }, { kind: "move", slot: 0 }, seeded(2));
    expect(b.hp).toBe(0);
    expect(ev.some((e) => e.t === "wilt" && e.side === 1)).toBe(true);
    // The wilted foe doesn't get to act.
    expect(texts(ev).filter((t) => t.includes("Wild LILY SEEDPOD used")).length).toBe(0);
  });
  it("switching first, then the foe gets a free hit on the newcomer", () => {
    const a = mk("oak_acorn", 20, ["tackle"]);
    const c = mk("lily_seedpod", 20, ["tackle"]);
    const b = mk("chili_blossom", 20, ["ember"]);
    const s = battle([a, c], [b]);
    const ev = resolveTurn(s, { kind: "switch", index: 1 }, { kind: "move", slot: 0 }, seeded(5));
    expect(active(s, 0)).toBe(c);
    expect(ev[0].t).toBe("switch_out");
    expect(s.participants.has(c.uid)).toBe(true);
  });
});
