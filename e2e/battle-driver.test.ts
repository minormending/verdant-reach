import { describe, expect, it } from "vitest";
import { DATA } from "../src/data";
import { createBattleState } from "../src/battle/logic/battle";
import { createQuickened } from "../src/battle/logic/stats";
import { seeded } from "../src/battle/logic/rng";
import { healingItem, strongestMove } from "./battle-driver";

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
});
