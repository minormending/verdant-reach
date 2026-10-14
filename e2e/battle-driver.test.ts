import { describe, expect, it } from "vitest";
import { DATA } from "../src/data";
import { createBattleState } from "../src/battle/logic/battle";
import { createQuickened } from "../src/battle/logic/stats";
import { seeded } from "../src/battle/logic/rng";
import { foeThreat, healingItem, hitDamage, strongestMove } from "./battle-driver";

function battle() {
  const rng = seeded(1);
  const me = createQuickened(DATA, "red_chili", 48, rng);
  const foe = createQuickened(DATA, "moonflower", 35, rng);
  return createBattleState({ data: DATA, playerParty: [me], playerActive: 0, foeParty: [foe], wild: false });
}

describe("battle driver", () => {
  it("chooses effective damage rather than slot order or nominal power", () => {
    const s = battle();
    // Equal-power moves isolate chart/STAB rather than nominal power.
    s.data = { ...DATA, moves: {
      ...DATA.moves,
      status: { ...Object.values(DATA.moves)[0], id: "status", name: "Status", category: "status", power: 0, effects: [] },
      weak: { ...Object.values(DATA.moves)[0], id: "weak", name: "Weak", type: "water", category: "special", power: 60, effects: [] },
      strong: { ...Object.values(DATA.moves)[0], id: "strong", name: "Strong", type: "fire", category: "special", power: 60, effects: [] },
    } };
    s.sides[0].party[0].moves = [{ id: "status", pp: 10 }, { id: "weak", pp: 10 }, { id: "strong", pp: 10 }];
    expect(strongestMove(s)).toBe(2);
    s.sides[0].party[0].moves[2].pp = 0;
    expect(strongestMove(s)).toBe(1);
    s.sides[0].party[0].moves[1].pp = 0;
    expect(strongestMove(s)).toBe(0);
    s.sides[0].party[0].moves[0].pp = 0;
    expect(strongestMove(s)).toBe(-1);
  });

  it("scores fixed damage even though its move power is zero", () => {
    const s = battle();
    s.sides[0].party[0].moves = [{ id: "fossil_print", pp: 10 }, { id: "wither", pp: 15 }];
    expect(strongestMove(s)).toBe(1); // Level 48 beats a fixed 40 HP.
    s.sides[0].party[0].moves[1].pp = 0;
    expect(strongestMove(s)).toBe(0);
  });

  it("uses only existing battle medicine when HP is low", () => {
    const q = battle().sides[0].party[0];
    const bag = { water_flask: 2, rain_jar: 0, terrarium_pod: 10 };
    expect(healingItem(DATA, bag, q)).toBeNull();
    q.hp = 1;
    expect(healingItem(DATA, bag, q)).toBe("water_flask");
    expect(bag.water_flask).toBe(2);
    expect(q.hp).toBe(1);
    expect(healingItem(DATA, { rain_jar: 1, water_flask: 2 }, q)).toBe("rain_jar");
    expect(healingItem(DATA, {}, q)).toBeNull();
  });

  it("prefers a sure knockout to a stronger but less accurate overkill", () => {
    const s = battle();
    const base = Object.values(DATA.moves)[0];
    s.data = { ...DATA, moves: {
      ...DATA.moves,
      sure: { ...base, id: "sure", name: "Sure", type: "fire", category: "special", power: 60, accuracy: 100, effects: [] },
      wild: { ...base, id: "wild", name: "Wild", type: "fire", category: "special", power: 120, accuracy: 70, effects: [] },
    } };
    s.sides[0].party[0].moves = [{ id: "wild", pp: 5 }, { id: "sure", pp: 5 }];
    const foe = s.sides[1].party[0];
    foe.hp = 5; // either move knocks it out: accuracy decides
    expect(strongestMove(s)).toBe(1);
    foe.hp = foe.stats.hp; // neither does: the bigger expected hit wins
    expect(hitDamage(s, 0, s.data.moves.wild) * 0.7).toBeGreaterThan(hitDamage(s, 0, s.data.moves.sure));
    expect(strongestMove(s)).toBe(0);
  });

  it("keeps a recoil move that would wilt the user as a last resort", () => {
    const s = battle();
    s.sides[0].party[0].moves = [{ id: "timber", pp: 5 }, { id: "wither", pp: 15 }];
    expect(strongestMove(s)).toBe(0); // healthy: TIMBER's power is worth its recoil
    s.sides[0].party[0].hp = 1;
    expect(strongestMove(s)).toBe(1);
    s.sides[0].party[0].moves[1].pp = 0;
    expect(strongestMove(s)).toBe(0);
  });

  it("skips medicine when its own sure hit finishes the foe first, or when healing cannot outlast one hit", () => {
    const s = battle();
    const me = s.sides[0].party[0], foe = s.sides[1].party[0];
    const bag = { rain_jar: 1 };
    me.hp = Math.floor(me.stats.hp / 4);
    expect(healingItem(DATA, bag, me, s)).toBe("rain_jar"); // low and the foe stands
    expect(foeThreat(s)).toBeGreaterThan(0);
    foe.hp = 1; // the faster helper's sure hit ends it first
    expect(healingItem(DATA, bag, me, s)).toBeNull();
    expect(healingItem(DATA, bag, me)).toBe("rain_jar"); // the plain rule ignores the battle
    foe.hp = foe.stats.hp;
    foe.level = 100;
    foe.stats = { ...foe.stats, spa: 999, atk: 999 };
    expect(foeThreat(s)).toBeGreaterThan(me.stats.hp); // even full HP falls to one hit
    expect(healingItem(DATA, bag, me, s)).toBeNull();
  });
});

