import { describe, expect, it, vi } from "vitest";
import type { MapId } from "../src/contracts";
import { WORLD } from "../src/world";
import { MUST_WIN_ATTEMPTS, mustWin, trainingPlan, warpDistances, type Loss } from "./must-win";

/** Scripted attempts: each entry is [result, losses during that attempt]. */
function harness(script: [boolean, number][]) {
  const losses: Loss[] = [];
  const deps = {
    losses: () => losses,
    train: vi.fn(async (n: number) => `round ${n}`),
    warn: vi.fn(),
    fail: vi.fn(),
  };
  const attempt = vi.fn(async (n: number) => {
    const [ok, lost] = script[n - 1];
    for (let i = 0; i < lost; i++) losses.push({ opponent: "WARDEN ROOK", map: "sanguine_conservatory", t: n * 10 });
    return ok;
  });
  return { deps, attempt };
}

describe("mustWin", () => {
  it("runs a won fight once, with no training or warning", async () => {
    const { deps, attempt } = harness([[true, 0]]);
    expect(await mustWin("ROOK", attempt, deps)).toBe(true);
    expect(attempt).toHaveBeenCalledExactlyOnceWith(1);
    expect(deps.train).not.toHaveBeenCalled();
    expect(deps.warn).not.toHaveBeenCalled();
  });

  it("returns a failure without a whiteout at once: it is not a lost battle", async () => {
    const { deps, attempt } = harness([[false, 0]]);
    expect(await mustWin("ROOK", attempt, deps)).toBe(false);
    expect(attempt).toHaveBeenCalledOnce();
    expect(deps.train).not.toHaveBeenCalled();
    expect(deps.fail).not.toHaveBeenCalled();
  });

  it("trains after a whiteout, warns, and retries with the next attempt number", async () => {
    const { deps, attempt } = harness([[false, 1], [true, 0]]);
    expect(await mustWin("ROOK", attempt, deps)).toBe(true);
    expect(attempt.mock.calls).toEqual([[1], [2]]);
    expect(deps.train).toHaveBeenCalledExactlyOnceWith(1);
    expect(deps.warn).toHaveBeenCalledExactlyOnceWith(
      "ROOK: attempt 1 lost to WARDEN ROOK on sanguine_conservatory at 10s; trained (round 1) and retrying");
    expect(deps.fail).not.toHaveBeenCalled();
  });

  it(`fails with the real reason after ${MUST_WIN_ATTEMPTS} lost attempts`, async () => {
    const { deps, attempt } = harness([[false, 1], [false, 1], [false, 1], [true, 0]]);
    expect(await mustWin("ROOK", attempt, deps)).toBe(false);
    expect(attempt).toHaveBeenCalledTimes(MUST_WIN_ATTEMPTS);
    expect(deps.train).toHaveBeenCalledTimes(MUST_WIN_ATTEMPTS - 1);
    expect(deps.fail).toHaveBeenCalledExactlyOnceWith(
      "ROOK: still not won after 3 attempts (lost to WARDEN ROOK on sanguine_conservatory at 30s)");
  });

  it("accepts a win that recovered from a whiteout inside the attempt, with a warning", async () => {
    const { deps, attempt } = harness([[true, 1]]);
    expect(await mustWin("ROOK", attempt, deps)).toBe(true);
    expect(deps.train).not.toHaveBeenCalled();
    expect(deps.warn).toHaveBeenCalledWith(expect.stringContaining("won on attempt 1 despite a whiteout"));
  });
});

describe("trainingPlan", () => {
  const seen = new Set<MapId>(["thistledown", "route_10", "route_11", "sanguine_ridge", "sanguine_conservatory"]);
  const route11 = ["climber_red", "climber_ochre", "ranger_flint", "ranger_shale"];
  const beaten = Object.fromEntries(route11.map((id) => [`beat_${id}`, true]));

  it("measures warp distance outwards from the fight", () => {
    const d = warpDistances(WORLD, "sanguine_conservatory");
    expect(d.get("sanguine_conservatory")?.distance).toBe(0);
    expect(d.get("sanguine_ridge")?.distance).toBe(1);
    expect(d.get("route_11")?.distance).toBe(2);
  });

  it("before ROOK: heals at the ridge GREENHOUSE and rematches ROUTE 11's beaten climbers and rangers", () => {
    const plan = trainingPlan(WORLD, beaten, "sanguine_conservatory", seen);
    expect(plan.heal).toBe("sanguine_greenhouse");
    // The three nearest the canyon's ridge end, not the far southern climber.
    expect(plan.trainers).toEqual(["ranger_shale", "ranger_flint", "climber_ochre"]
      .map((id) => ({ map: "route_11", npc: id, trainer: id })));
    expect(route11).toContain("climber_red");
    expect(plan.wild).not.toBeNull();
  });

  it("never plans an unbeaten trainer, an unvisited town or story-only fights", () => {
    const plan = trainingPlan(WORLD, { beat_jr_ember: true, beat_jr_scale: true, beat_rook: false }, "sanguine_conservatory", new Set());
    expect(plan).toEqual({ heal: null, trainers: [], wild: null });
    // Conservatory juniors are indoor trainers: never rematches, beaten or not.
    const juniors = trainingPlan(WORLD, { beat_jr_ember: true, beat_jr_scale: true }, "sanguine_conservatory", seen);
    expect(juniors.trainers).toEqual([]);
    expect(juniors.wild).toBe("route_11");
  });

  it("finds the Arboretum GREENHOUSE and ROUTE 12's plateau trainers from the Elder Grove's heart", () => {
    const r12 = ["r12_crag", "r12_gorge", "r12_kite", "r12_rook", "r12_sedge", "r12_heath"];
    const plan = trainingPlan(WORLD, Object.fromEntries(r12.map((id) => [`beat_${id}`, true])), "elder_grove_heart",
      new Set<MapId>(["route_12", "council_arboretum", "elder_grove_1", "elder_grove_2", "elder_grove_3", "elder_grove_heart"]));
    expect(plan.heal).toBe("arboretum_greenhouse");
    expect(plan.trainers.length).toBeGreaterThan(0);
    for (const t of plan.trainers) expect(t.map).toBe("route_12");
  });
});
