import { describe, expect, it } from "vitest";
import type { Quickened, TrainerDef } from "../../contracts";
import { DATA } from "../../data";
import { active, type BattleState } from "./battle";
import { seeded } from "./rng";
import { simulateTrainerRun } from "./simulate";
import { createQuickened } from "./stats";

const trainer = (name: string): TrainerDef => ({
  id: name, name, className: "TEST", portrait: "hiker", team: [{ species: "oak_acorn", level: 1, moves: ["quick_snap"] }],
  items: [{ item: "spring_water", qty: 2 }],
  ai: "smart", music: "battle_leader", prize: 0, intro: "", defeat: "", after: "",
});

describe("back-to-back trainer simulation", () => {
  it("fully heals HP, status, PP and fainted members only between fights", () => {
    const rng = seeded(7);
    const fainted = createQuickened(DATA, "great_oak", 60, rng);
    fainted.hp = 0;
    const q = createQuickened(DATA, "red_chili", 60, rng);
    q.hp -= 30;
    q.status = "blight";
    q.moves = [{ id: "ember_seed", pp: 7 }];
    fainted.moves = [{ id: "timber", pp: 0 }];
    const snapshots: { hp: number; pp: number; status: Quickened["status"]; active: number }[] = [];
    const fights: BattleState[] = [];
    const result = simulateTrainerRun({ data: DATA, party: [fainted, q], trainers: [trainer("ONE"), trainer("TWO")], rng,
      playerAction: (battle) => {
        if (!fights.includes(battle)) {
          fights.push(battle);
          snapshots.push({ hp: active(battle, 0).hp, pp: active(battle, 0).moves[0].pp, status: active(battle, 0).status, active: battle.sides[0].active });
        }
        return { kind: "move", slot: 0 };
      },
    });
    expect(result.won).toBe(true);
    expect(result.completed).toBe(2);
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].hp).toBe(q.stats.hp - 30);
    expect(snapshots[0].pp).toBe(7);
    expect(snapshots[1].hp).toBe(fainted.stats.hp);
    expect(snapshots[1].pp).toBe(DATA.moves.timber.pp);
    expect(snapshots.map((s) => s.status)).toEqual(["blight", null]);
    expect(snapshots.map((s) => s.active)).toEqual([1, 0]);
    expect(q.hp).toBe(q.stats.hp);
    expect(q.status).toBe(null);
    expect(q.moves[0].pp).toBe(DATA.moves.ember_seed.pp);
    // The final fight remains spent: healing is between rooms only.
    expect(fainted.moves[0].pp).toBeLessThan(DATA.moves.timber.pp);
    expect(fights[0].sides[0].party[1]).toBe(q);
    expect(fights[1].sides[0].party[1]).toBe(q);
    expect(fights.map((s) => s.foeItems)).toEqual([{ spring_water: 2 }, { spring_water: 2 }]);
    expect(fights[0].sides[0].vol).not.toBe(fights[1].sides[0].vol);
  });

  it("leaves a single fight's damage, status and spent PP on the party", () => {
    const rng = seeded(7), q = createQuickened(DATA, "red_chili", 60, rng);
    q.hp -= 30;
    const initialHp = q.hp;
    q.status = "blight";
    q.moves = [{ id: "ember_seed", pp: 7 }];
    const result = simulateTrainerRun({ data: DATA, party: [q], trainers: [trainer("ONE")], rng,
      playerAction: () => ({ kind: "move", slot: 0 }),
    });
    expect(result).toMatchObject({ won: true, completed: 1 });
    expect(q.hp).toBeLessThan(initialHp);
    expect(q.status).toBe("blight");
    expect(q.moves[0].pp).toBe(6);
  });

  it("ends on whiteout without starting later fights", () => {
    const rng = seeded(1), q = createQuickened(DATA, "oak_acorn", 1, rng);
    const strong = { ...trainer("STRONG"), team: [{ species: "red_chili" as const, level: 66 }] };
    const result = simulateTrainerRun({ data: DATA, party: [q], trainers: [strong, trainer("LATER")], rng,
      playerAction: () => ({ kind: "move", slot: 0 }),
    });
    expect(result).toMatchObject({ won: false, completed: 0 });
    expect(q.hp).toBe(0);
  });

  it("treats the turn limit as failure rather than advancing to another room", () => {
    const rng = seeded(1), q = createQuickened(DATA, "great_oak", 60, rng);
    const result = simulateTrainerRun({ data: DATA, party: [q], trainers: [trainer("ONE"), trainer("TWO")], rng,
      turnLimit: 1, playerAction: () => ({ kind: "none" }),
    });
    expect(result).toEqual({ won: false, completed: 0, turns: 1 });
  });
});
