import { describe, expect, it } from "vitest";
import { FIXTURE_DATA } from "../fixtures";
import {
  attemptCapture, catchProbability, catchValue, criticalChance, runChance, shakeProbability, tryRun,
} from "./capture";
import { createQuickened } from "./stats";
import { seeded } from "./rng";

const data = FIXTURE_DATA;

describe("catch value", () => {
  const q = createQuickened(data, "oak_acorn", 10, seeded(1));
  it("is bounded 1..255", () => {
    q.hp = q.stats.hp;
    expect(catchValue(q, 3, 1)).toBeGreaterThanOrEqual(1);
    q.hp = 1;
    expect(catchValue(q, 255, 3)).toBe(255);
  });
  it("full HP gives rate/3, 1 HP gives about the rate", () => {
    q.hp = q.stats.hp;
    expect(catchValue(q, 45, 1)).toBe(15);
    q.hp = 1;
    expect(catchValue(q, 45, 1)).toBeGreaterThanOrEqual(43);
  });
  it("status adds a bonus; dormant more than blight", () => {
    q.hp = q.stats.hp;
    q.status = null;
    const none = catchValue(q, 45, 1);
    q.status = "blight";
    const b = catchValue(q, 45, 1);
    q.status = "dormant";
    const d = catchValue(q, 45, 1);
    q.status = null;
    expect(b).toBe(none + 5);
    expect(d).toBe(none + 10);
  });
  it("pod multiplier helps", () => {
    q.hp = q.stats.hp;
    expect(catchValue(q, 45, 1.5)).toBeGreaterThan(catchValue(q, 45, 1));
  });
});

describe("catch probability", () => {
  it("is within 0..1 and monotonic", () => {
    let last = 0;
    for (let a = 1; a <= 255; a++) {
      const p = catchProbability(a);
      expect(p).toBeGreaterThan(0);
      expect(p).toBeLessThanOrEqual(1);
      expect(p).toBeGreaterThanOrEqual(last);
      last = p;
      expect(shakeProbability(a)).toBeLessThanOrEqual(1);
    }
    expect(catchProbability(255)).toBe(1);
    expect(catchProbability(127)).toBeCloseTo(127 / 255, 5);
  });
  it("simulated rates match the formula and shakes stay in 0..3", () => {
    const q = createQuickened(data, "oak_acorn", 10, seeded(1));
    q.hp = q.stats.hp;
    const rng = seeded(42);
    let caught = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const r = attemptCapture(q, 45, 1, 0, rng);
      expect(r.shakes).toBeGreaterThanOrEqual(0);
      expect(r.shakes).toBeLessThanOrEqual(3);
      expect(r.critical).toBe(false); // no crits with nothing caught yet
      if (r.caught) caught++;
    }
    const expected = catchProbability(catchValue(q, 45, 1));
    expect(caught / N).toBeGreaterThan(expected - 0.03);
    expect(caught / N).toBeLessThan(expected + 0.03);
  });
  it("critical captures happen once some species are caught", () => {
    expect(criticalChance(255, 0)).toBe(0);
    expect(criticalChance(255, 30)).toBeGreaterThan(criticalChance(255, 5));
    const q = createQuickened(data, "dandelion_bud", 5, seeded(1));
    q.hp = 1;
    const rng = seeded(9);
    let crits = 0;
    for (let i = 0; i < 500; i++) {
      const r = attemptCapture(q, 100, 1, 35, rng);
      if (r.critical) { crits++; expect(r.shakes).toBe(1); }
    }
    expect(crits).toBeGreaterThan(0);
  });
});

describe("run chance", () => {
  it("always escapes when faster or equal", () => {
    expect(runChance(50, 50, 0)).toBe(1);
    expect(runChance(80, 20, 0)).toBe(1);
  });
  it("Gen 2 formula when slower, improving with attempts", () => {
    // F = floor(20*32 / floor(60/4)) = floor(640/15) = 42 -> 42/256
    expect(runChance(20, 60, 0)).toBeCloseTo(42 / 256);
    expect(runChance(20, 60, 1)).toBeCloseTo(72 / 256);
    expect(runChance(20, 60, 8)).toBe(1);
  });
  it("is a probability", () => {
    for (let p = 1; p < 300; p += 7) for (let f = 1; f < 300; f += 11) {
      const c = runChance(p, f, 0);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
    expect(typeof tryRun(10, 100, 0, seeded(1))).toBe("boolean");
  });
});
