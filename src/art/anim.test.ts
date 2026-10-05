// Crystal-style species animations: `anim` validation, packs, and the
// playback state machine (docs/ART.md §3).

import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildIndex } from "../../tools/art/index.mjs";
import type { SpeciesAnim } from "../contracts";
import { animMaxFrame, animState, checkSpeciesAnim, introRemaining, parseSpeciesAnim, stepAt, stepsLength } from "./anim";
import { ArtCatalog } from "./catalog";
import { diskImages, loadPacksFromDisk, loadRawFromDisk } from "./fs";
import { frontKind, parseLogical, speciesFrameSlot } from "./paths";
import { errorsOnly, validateArt } from "./validate";

const FIX = fileURLToPath(new URL("./__fixtures__/public/", import.meta.url));
const index = buildIndex(FIX);
const raw = loadRawFromDisk(FIX, index);

describe("anim validation", () => {
  it("accepts a well-formed anim, and no anim at all", () => {
    expect(checkSpeciesAnim(undefined, 1)).toEqual([]);
    expect(checkSpeciesAnim(null, 1)).toEqual([]);
    expect(parseSpeciesAnim(null)).toBeUndefined();
    expect(checkSpeciesAnim({ intro: [[0, 8], [1, 6], [0, 1]], idle: [[0, 40], [1, 20]] }, 2)).toEqual([]);
    expect(checkSpeciesAnim({ idle: [[0, 40]] }, 1)).toEqual([]);
    expect(checkSpeciesAnim({ intro: [[0, 1]], future: true }, 1)).toEqual([]); // unknown fields are ignored
  });

  it("every frame index must exist", () => {
    expect(checkSpeciesAnim({ intro: [[0, 4], [3, 4], [0, 1]] }, 3).join("\n")).toMatch(/intro\[1\] frame 3 does not exist \(frames.front has 3\)/);
    expect(checkSpeciesAnim({ idle: [[-1, 4]] }, 3).join("\n")).toMatch(/idle\[0\] frame -1 must be a whole number/);
    expect(checkSpeciesAnim({ idle: [[1.5, 4]] }, 3).join("\n")).toMatch(/frame 1.5/);
  });

  it("intro must end on frame 0", () => {
    expect(checkSpeciesAnim({ intro: [[0, 4], [1, 4]] }, 2)).toEqual(["anim.intro must end on frame 0"]);
  });

  it("ticks must be positive integers", () => {
    const msgs = checkSpeciesAnim({ intro: [[1, 0], [0, 2.5]], idle: [[0, "40"]] }, 2).join("\n");
    expect(msgs).toMatch(/intro\[0\] ticks 0 must be a positive whole number/);
    expect(msgs).toMatch(/intro\[1\] ticks 2.5/);
    expect(msgs).toMatch(/idle\[0\] ticks "40"/);
  });

  it("rejects malformed shapes", () => {
    expect(checkSpeciesAnim([], 1)).toEqual(["anim must be an object with optional intro / idle step lists"]);
    expect(checkSpeciesAnim({ intro: [] }, 1).join("")).toMatch(/non-empty list/);
    expect(checkSpeciesAnim({ idle: [[0, 4, 5]] }, 1).join("")).toMatch(/idle\[0\] must be \[frame, ticks\]/);
  });
});

describe("anim in bundles and packs", () => {
  const cat = (packs: string[] = []) => new ArtCatalog(raw, { packs, legacy: index.legacy });

  it("front__4 .. front__8 are logical paths", () => {
    expect(parseLogical("assets/species/fern/front__8.png?sport")).toEqual({ type: "species", id: "fern", kind: "front__8", sport: true });
    expect(parseLogical("assets/species/fern/front__9.png")).toBeNull();
    expect(speciesFrameSlot("front__6")).toEqual({ list: "front", index: 5 });
    expect(frontKind(0)).toBe("front");
    expect(frontKind(7)).toBe("front__8");
  });

  it("a pack adds frames and an anim through the shallow merge", () => {
    expect(cat().resolve("assets/species/fern/front__4.png")).toBeNull();
    expect(parseSpeciesAnim(cat().bundle("species", "fern")!.merged.anim)).toBeUndefined(); // base: legacy ping-pong
    const c = cat(["anim"]);
    expect(c.resolve("assets/species/fern/front__4.png")).toMatchObject({ url: "art/packs/anim/species/fern/front__4.png", layer: "anim" });
    expect(c.resolve("assets/species/fern/front__2.png")!.url).toBe("art/species/fern/front__2.png"); // falls through to base
    const anim = parseSpeciesAnim(c.bundle("species", "fern")!.merged.anim)!;
    expect(anim.intro![0]).toEqual([0, 8]);
    expect(anim.idle).toEqual([[0, 40], [3, 20]]);
    expect(c.pathsOf(c.bundle("species", "fern")!)).toContain("assets/species/fern/front__4.png?sport");
  });

  it("the validator checks a pack's anim against the merged frames", () => {
    const run = (r = raw) => errorsOnly(validateArt({
      raw: r, packs: loadPacksFromDisk(FIX, index), legacy: index.legacy, image: diskImages(FIX), required: [],
    }).problems).map((p) => `${p.where}: ${p.message}`);
    expect(run()).toEqual([]);
    const broken = raw.map((b) => (b.pack === "anim" && b.kind === "species"
      ? { ...b, json: { ...(b.json as object), anim: { intro: [[0, 4], [4, 4], [2, 0]] } } } : b));
    const msgs = run(broken).join("\n");
    expect(msgs).toMatch(/packs\/anim\/species\/fern: anim.intro\[1\] frame 4 does not exist \(frames.front has 4\)/);
    expect(msgs).toMatch(/anim.intro\[2\] ticks 0/);
    expect(msgs).toMatch(/anim.intro must end on frame 0/);
    // Nine front frames is one too many.
    const nine = raw.map((b) => (b.pack === "anim" && b.kind === "species"
      ? { ...b, json: { ...(b.json as object), frames: { front: Array(9).fill("front.png"), back: ["back.png"], icon: ["icon.png"] } } } : b));
    expect(run(nine).join("\n")).toMatch(/frames.front must list 1–8 file name\(s\)/);
  });
});

describe("anim playback state machine", () => {
  const anim: SpeciesAnim = { intro: [[0, 8], [1, 6], [2, 6], [0, 1]], idle: [[0, 40], [3, 20]] };

  it("measures and indexes steps", () => {
    expect(stepsLength(anim.intro)).toBe(21);
    expect(stepsLength(undefined)).toBe(0);
    expect(stepAt(anim.intro!, 0)).toBe(0);
    expect(stepAt(anim.intro!, 7)).toBe(0);
    expect(stepAt(anim.intro!, 8)).toBe(1);
    expect(stepAt(anim.intro!, 999)).toBe(3);
    expect(animMaxFrame(anim)).toBe(3);
  });

  it("plays the intro once, then loops idle from its first step", () => {
    const frames = Array.from({ length: 21 + 60 * 2 }, (_, t) => animState(anim, t, { intro: true }));
    expect(frames.slice(0, 21).every((s) => s.phase === "intro")).toBe(true);
    expect(frames.slice(0, 21).map((s) => s.frame).join("")).toBe("0".repeat(8) + "1".repeat(6) + "2".repeat(6) + "0");
    expect(frames.slice(21).every((s) => s.phase === "idle")).toBe(true);
    const idle = frames.slice(21).map((s) => s.frame).join("");
    expect(idle).toBe(("0".repeat(40) + "3".repeat(20)).repeat(2));
    expect(introRemaining(anim, 0)).toBe(21);
    expect(introRemaining(anim, 20)).toBe(1);
    expect(introRemaining(anim, 21)).toBe(0);
  });

  it("holds frame 0 after the intro when there is no idle", () => {
    const a: SpeciesAnim = { intro: [[1, 3], [0, 1]] };
    expect(animState(a, 0, { intro: true })).toEqual({ phase: "intro", frame: 1, step: 0 });
    expect(animState(a, 4, { intro: true })).toEqual({ phase: "hold", frame: 0, step: -1 });
    expect(animState(a, 9999, { intro: true }).frame).toBe(0);
  });

  it("without intro it starts in the idle loop", () => {
    expect(animState(anim, 0)).toMatchObject({ phase: "idle", frame: 0 });
    expect(animState(anim, 45)).toMatchObject({ phase: "idle", frame: 3 });
    expect(animState({}, 45)).toEqual({ phase: "hold", frame: 0, step: -1 });
  });

  it("parses defensively: bad steps dropped, intro forced to end on frame 0", () => {
    expect(parseSpeciesAnim(undefined)).toBeUndefined();
    expect(parseSpeciesAnim("x")).toBeUndefined();
    expect(parseSpeciesAnim({})).toEqual({});
    expect(parseSpeciesAnim({ intro: [[1, 4], [2, 0], "x"], idle: [] })).toEqual({ intro: [[1, 4], [0, 1]] });
  });
});
