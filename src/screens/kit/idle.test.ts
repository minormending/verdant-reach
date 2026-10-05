import { describe, expect, it } from "vitest";
import type { SpeciesAnim, SpeciesId } from "../../contracts";
import { frontPaths, idleFrameCount, idleKind, idlePose, isAnimated, pingPong, seedOf, SpritePlayback } from "./idle";

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

describe("Crystal-style playback (SpritePlayback)", () => {
  const anim: SpeciesAnim = { intro: [[0, 4], [2, 3], [1, 2], [0, 1]], idle: [[0, 6], [4, 2]] };
  const id = "sunflower" as SpeciesId;
  const lookup = (s: SpeciesId) => (s === id ? anim : undefined);

  it("plays the intro once from appear(), then loops idle", () => {
    const pb = new SpritePlayback(":t", lookup);
    pb.appear(id, 100);
    const seq = Array.from({ length: 10 + 16 }, (_, i) => pb.kind(id, 100 + i));
    expect(seq.slice(0, 10)).toEqual(["front", "front", "front", "front", "front__3", "front__3", "front__3", "front__2", "front__2", "front"]);
    expect(seq.slice(10)).toEqual([...Array(6).fill("front"), "front__5", "front__5", ...Array(6).fill("front"), "front__5", "front__5"]);
    expect(pb.remaining(id, 100)).toBe(10);
    expect(pb.playing(id, 109)).toBe(true);
    expect(pb.playing(id, 110)).toBe(false);
  });

  it("holds the rest pose until appear(), and forgets the intro for another species", () => {
    const pb = new SpritePlayback(":t", lookup);
    pb.hold(id);
    for (let t = 0; t < 50; t++) expect(pb.kind(id, t)).toBe("front");
    pb.appear(id, 50);
    expect(pb.kind(id, 54)).toBe("front__3");
    // A different species on the same view: no intro of its own was started.
    expect(pb.remaining("oak_acorn" as SpeciesId, 54)).toBe(0);
    pb.reset();
    expect(pb.remaining(id, 54)).toBe(0);
  });

  it("without an intro (or after reset) it is the phase-shifted idle loop", () => {
    const pb = new SpritePlayback(":t", lookup);
    const kinds = new Set(Array.from({ length: 40 }, (_, t) => pb.kind(id, t)));
    expect(kinds).toEqual(new Set(["front", "front__5"]));
    for (let t = 0; t < 40; t++) expect(pb.kind(id, t)).toBe(idleKind(id, t, ":t", anim));
    // Two views of the species are out of phase.
    let differ = 0;
    for (let t = 0; t < 80; t++) if (idleKind(id, t, ":a", anim) !== idleKind(id, t, ":b", anim)) differ++;
    expect(differ).toBeGreaterThan(0);
  });

  it("an anim with no idle holds frame 0 after the intro", () => {
    const one: SpeciesAnim = { intro: [[1, 2], [0, 1]] };
    const pb = new SpritePlayback("", () => one);
    pb.appear(id, 0);
    expect([0, 1, 2, 3, 500].map((t) => pb.kind(id, t))).toEqual(["front__2", "front__2", "front", "front", "front"]);
    expect(idleKind(id, 1234, "", one)).toBe("front");
  });

  it("no anim keeps the legacy ping-pong (and ignores hold/appear)", () => {
    const pb = new SpritePlayback(":battle1", () => undefined);
    pb.hold(id);
    for (let t = 0; t < 300; t += 7) expect(pb.kind(id, t)).toBe(idleKind(id, t, ":battle1", undefined));
    pb.appear(id, 0);
    expect(pb.remaining(id, 0)).toBe(0);
    for (let t = 0; t < 300; t += 7) expect(pb.kind(id, t)).toBe(idleKind(id, t, ":battle1", undefined));
  });

  it("knows which frames to preload and whether a species moves", () => {
    expect(frontPaths(id, anim)).toEqual([0, 1, 2, 3, 4].map((i) => `assets/species/sunflower/${i ? `front__${i + 1}` : "front"}.png`));
    expect(frontPaths(id, undefined)).toHaveLength(3);
    expect(isAnimated(id, anim)).toBe(true);
    expect(isAnimated(id, {})).toBe(false);
  });
});
