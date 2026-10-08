import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ArtCatalog } from "./catalog";
import { ArtRegistry } from "./registry";
import { validateArt } from "./validate";
import { requiredPaths } from "./required";
import type { RawBundle } from "./format";
import type { ArtImage, GameContext } from "../contracts";
import { drawTrainer } from "../battle/hud";
import { drawImageOpts } from "../screens/kit/draw";

const bundle = (frames?: number): RawBundle => ({ kind: "sets", id: "portraits", pack: null,
  files: ["set.json", "bram.png"], json: { format: "verdant.imageset/1", id: "portraits", logicalDir: "assets/trainers",
    images: { bram: { file: "bram.png", size: [56,56], ...(frames === undefined ? {} : { frames }) } } } });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("resolves every trainer's derived layers using only the public fixture inventory", () => {
  expect(execFileSync("python3", ["tools/art/limezu/test_portraits.py", "PortraitTests.test_every_trainer_against_fixture_inventory"], { encoding: "utf8", stdio: "pipe" })).toBe("");
});

describe("horizontal portrait frames", () => {
  it("validates per-frame sizes, rejects wrong sheets and bad frame counts", () => {
    const run = (frames: number | undefined, width: number) => validateArt({ raw: [bundle(frames)], packs: {}, legacy: [], required: [],
      image: () => ({ width, height: 56, data: new Uint8Array(width*56*4) }) }).problems;
    expect(run(undefined,56)).toEqual([]);
    expect(run(2,112)).toEqual([]);
    expect(run(2,56)).not.toEqual([]);
    expect(run(0,56).some(p => p.message.includes("positive integer"))).toBe(true);
    expect(requiredPaths().some(p => p.path.startsWith("assets/faces/"))).toBe(false);
  });
  it("crops native frames once, caches them, and returns static images unchanged", () => {
    const operations: unknown[][] = [];
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0,
      getContext: () => ({ drawImage: (...args: unknown[]) => operations.push(args) }) }) });
    const art = new ArtRegistry(), sheet = { width:112, height:56 } as ArtImage;
    art.catalog = new ArtCatalog([bundle(2)], { legacy: [] });
    vi.spyOn(art,"image").mockReturnValue(sheet);
    const first = art.imageFrame("assets/trainers/bram.png",0)!;
    const blink = art.imageFrame("assets/trainers/bram.png",1)!;
    expect([first.width,first.height,blink.width,blink.height]).toEqual([56,56,56,56]);
    expect(operations.map(c=>c.slice(1))).toEqual([[0,0,56,56,0,0,56,56],[56,0,56,56,0,0,56,56]]);
    expect(art.imageFrame("assets/trainers/bram.png",1)).toBe(blink);
    expect(operations).toHaveLength(2);
    art.catalog = new ArtCatalog([bundle()], { legacy: [] });
    expect(art.imageFrames("assets/trainers/bram.png")).toBe(1);
    expect(art.imageFrame("assets/trainers/bram.png",1)).toBe(sheet);
  });
  it("retains the exact pre-animation draw calls for a GBC trainer", () => {
    const image = { width:56,height:56 } as ArtImage;
    const ctx = { assets: { image: () => image } } as unknown as GameContext;
    const record = () => { const calls: unknown[][] = []; const g = new Proxy({}, { get: (_,key) => (...args: unknown[]) => calls.push([key,...args]) }) as CanvasRenderingContext2D; return { calls,g }; };
    const expected = record(), actual = record();
    drawImageOpts(expected.g,image,20,30,56,56,{});
    drawTrainer(ctx,actual.g,"bram",20,30,{},149);
    expect(actual.calls).toEqual(expected.calls);
  });
});
