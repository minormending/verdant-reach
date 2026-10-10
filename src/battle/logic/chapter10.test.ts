import { describe, expect, it } from "vitest";
import { DATA } from "../../data";
import { createBattleState, executeMove, type BattleEvent } from "./battle";
import { seeded, sequence } from "./rng";
import { createQuickened } from "./stats";

function setup() {
  const user = createQuickened(DATA, "quaking_aspen", 50, seeded(1));
  user.moves = [{ id: "many_trunks", pp: 10 }];
  const target = createQuickened(DATA, "elder", 80, seeded(2));
  const state = createBattleState({ data: DATA, playerParty: [user], playerActive: 0,
    foeParty: [target], wild: true, time: "day" });
  const events: BattleEvent[] = [];
  return { user, target, state, events };
}

describe("Many Trunks in battle", () => {
  it.each([{ roll: 0, hits: 2 }, { roll: 0.4, hits: 3 }, { roll: 0.8, hits: 4 }, { roll: 0.99, hits: 5 }])(
    "lands $hits hits and spends one PP", ({ roll, hits }) => {
      const { user, target, state, events } = setup();
      executeMove(state, 0, 0, true, sequence([0, roll, 0.9]), events);
      expect(events.filter((e) => e.t === "hp" && e.kind === "hit")).toHaveLength(hits);
      expect(events).toContainEqual({ t: "text", text: `Hit ${hits} times!` });
      expect(user.moves[0].pp).toBe(9);
      expect(target.hp).toBeGreaterThan(0);
    },
  );

  it("can miss before any hits and still spends only one PP", () => {
    const { user, target, state, events } = setup();
    const hp = target.hp;
    executeMove(state, 0, 0, true, sequence([0.95]), events);
    expect(events).toContainEqual({ t: "miss", side: 0 });
    expect(target.hp).toBe(hp);
    expect(user.moves[0].pp).toBe(9);
  });

  it("stops hitting as soon as the target wilts", () => {
    const { target, state, events } = setup();
    target.hp = 1;
    executeMove(state, 0, 0, true, sequence([0, 0.99, 0.9]), events);
    expect(events.filter((e) => e.t === "hp" && e.kind === "hit")).toHaveLength(1);
    expect(target.hp).toBe(0);
  });
});
