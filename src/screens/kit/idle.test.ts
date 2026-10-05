import { describe, expect, it } from "vitest";
import { idleFrameCount, idleKind, idlePose, pingPong, seedOf } from "./idle";

describe("idle animation", () => {
  it("ping-pongs the available poses", () => {
    expect(pingPong(1)).toEqual([0]);
    expect(pingPong(2)).toEqual([0, 1]);
    expect(pingPong(3)).toEqual([0, 1, 2, 1]);
  });

  it("holds each pose 20-30 frames and visits every pose in order", () => {
    for (const n of [2, 3]) {
      const seed = seedOf(`test${n}`);
      const runs: { pose: number; len: number }[] = [];
      for (let t = 0; t < 2000; t++) {
        const p = idlePose(n, t, seed);
        const last = runs[runs.length - 1];
        if (last && last.pose === p) last.len++;
        else runs.push({ pose: p, len: 1 });
      }
      // ignore the partial first/last runs
      for (const r of runs.slice(1, -1)) {
        expect(r.len).toBeGreaterThanOrEqual(20);
        expect(r.len).toBeLessThanOrEqual(30);
      }
      for (let i = 1; i < runs.length; i++) expect(Math.abs(runs[i].pose - runs[i - 1].pose)).toBe(1);
      expect(new Set(runs.map((r) => r.pose)).size).toBe(n);
    }
  });

  it("gives different sprites different phases", () => {
    const a = seedOf("oak_acorn:battle1"), b = seedOf("oak_acorn:summary");
    let differ = 0;
    for (let t = 0; t < 600; t++) if (idlePose(2, t, a) !== idlePose(2, t, b)) differ++;
    expect(differ).toBeGreaterThan(30);
  });

  it("is static without extra frames, and counts frames from what exists", () => {
    expect(idlePose(1, 123, 5)).toBe(0);
    const has = (p: string) => p.endsWith("front__2.png");
    expect(idleFrameCount("oak_acorn", has)).toBe(2);
    expect(idleFrameCount("oak_acorn", (p) => /front__[23]\.png$/.test(p))).toBe(3);
    expect(idleFrameCount("oak_acorn", () => false)).toBe(1);
    expect(["front", "front__2", "front__3"]).toContain(idleKind("oak_acorn", 77));
  });
});
