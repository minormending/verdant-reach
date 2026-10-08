import { describe, expect, it, vi } from "vitest";
import type { GameContext } from "../contracts";
import { ArtCatalog } from "./catalog";
import type { RawBundle } from "./format";
import { materialRecolor, recolorRgba } from "./palette";
import { validateArt } from "./validate";
import { drawSpecies } from "../screens/kit/draw";

function fixture(palette?: string[]): RawBundle {
  return { kind: "species", id: "oak_acorn", pack: null,
    files: ["species.json", "front.png", "back.png", "icon.png", "icon__2.png"],
    json: { format: "verdant.species/2", id: "oak_acorn", size: { front: 64, back: 64, icon: 32 },
      ...(palette ? { palette } : {}), sport: { "#509056": "#907050" },
      frames: { front: ["front.png"], back: ["back.png"], icon: ["icon.png", "icon__2.png"] } } };
}
const image = (url: string) => {
  const size = url.includes("icon") ? 32 : 64;
  const data = new Uint8Array(size * size * 4);
  data.set([80, 144, 86, 255]);
  return { width: size, height: size, data };
};

describe("species bundle v2", () => {
  it.each([undefined, ["#509056"]])("accepts a v2 bundle with palette %j and resolves sports", (palette) => {
    const raw = [fixture(palette)];
    expect(validateArt({ raw, packs: {}, legacy: [], image, required: [] }).problems).toEqual([]);
    const cat = new ArtCatalog(raw);
    const sport = cat.resolve("assets/species/oak_acorn/front.png?sport")!;
    expect(sport.recolor).toEqual({ from: ["#509056"], to: ["#907050"] });
    const pixels = new Uint8Array([80,144,86,255, 42,34,48,255, 80,144,86,0]);
    recolorRgba(pixels, sport.recolor!);
    expect([...pixels]).toEqual([144,112,80,255, 42,34,48,255, 80,144,86,0]);
  });

  it("composes palette overrides with material sports without cascading swaps", () => {
    const rc = materialRecolor({ from: ["#204020", "#402020"], to: ["#509056", "#905056"] },
      { "#509056": "#905056", "#905056": "#0000ff" })!;
    const pixels = new Uint8Array([32,64,32,255,64,32,32,255]);
    recolorRgba(pixels, rc);
    expect([...pixels]).toEqual([144,80,86,255,0,0,255,255]);
  });

  it("does not inherit a v1 palette when a v2 pack omits its palette", () => {
    const base = fixture(["#181818", "#204020", "#509056", "#f8f8f8"]);
    base.json = { ...(base.json as object), format: "verdant.species/1", sport: ["#181818", "#403820", "#907050", "#f8f8f8"] };
    const pack = { ...fixture(), pack: "modern" };
    const cat = new ArtCatalog([base, pack], { packs: ["modern"] });
    expect(cat.bundle("species", "oak_acorn")!.merged.palette).toBeUndefined();
    expect(cat.resolve("assets/species/oak_acorn/front.png?sport")!.recolor).toEqual({ from: ["#509056"], to: ["#907050"] });
  });

  it("inherits traced v1 frames, icons, animation and colours from Crystal over a v2 base", () => {
    const palette = ["#181818", "#204020", "#509056", "#f8f8f8"];
    const crystal: RawBundle = { ...fixture(palette), pack: "crystal",
      files: [...fixture().files, "front__2.png"],
      json: { format: "verdant.species/1", palette, sport: palette,
        frames: { front: ["front.png", "front__2.png"], back: ["back.png"], icon: ["icon.png", "icon__2.png"] },
        anim: { intro: [[0,20],[1,20],[0,12]] } } };
    const traced: RawBundle = { kind: "species", id: "oak_acorn", pack: "traced",
      files: ["species.json", "front.png", "back.png"],
      json: { format: "verdant.species/1", palette: ["#181818", "#403820", "#907050", "#f8f8f8"] } };
    const raw = [fixture(), crystal, traced];
    const cat = new ArtCatalog(raw, { packs: ["traced"] });
    expect(cat.resolve("assets/species/oak_acorn/front.png")!.url).toContain("packs/traced/");
    for (const name of ["front__2", "icon", "icon__2"]) {
      const frame = cat.resolve(`assets/species/oak_acorn/${name}.png`)!;
      expect(frame.url).toContain("packs/crystal/");
      expect(frame.recolor).toEqual({ from: palette, to: (traced.json as {palette: string[]}).palette });
    }
    expect(cat.bundle("species", "oak_acorn")!.merged.anim).toEqual((crystal.json as {anim: unknown}).anim);
    expect(cat.bundle("species", "oak_acorn")!.merged.size).toBeUndefined();
    expect(new ArtCatalog(raw).bundle("species", "oak_acorn")!.merged.format).toBe("verdant.species/2");
    expect(new ArtCatalog(raw, { packs: ["crystal"] }).resolve("assets/species/oak_acorn/icon.png")!.url).toContain("packs/crystal/");

    const missing = new ArtCatalog([fixture(), traced], { packs: ["traced"] });
    expect(missing.resolve("assets/species/oak_acorn/icon.png")).toBeNull();
    const result = validateArt({ raw: [fixture(), traced], legacy: [], required: [], image,
      packs: { traced: { json: { format: "verdant.pack/1", id: "traced", name: "Traced" } } } });
    expect(result.problems.some(p => p.where.startsWith("packs/traced/") && p.message.includes("frames"))).toBe(true);
    const complete = { ...crystal, pack: "complete" };
    expect(new ArtCatalog([fixture(), complete], { packs: ["complete"] }).resolve("assets/species/oak_acorn/icon.png")!.url).toContain("packs/complete/");
  });

  it("rejects mismatched dimensions, more than sixteen shared colours, and array sports", () => {
    const raw = fixture();
    raw.json = { ...(raw.json as object), sport: ["#907050"] };
    const result = validateArt({ raw: [raw], packs: {}, legacy: [], required: [], image: url => {
      const a = image(url);
      for (let i = 0; i < 17; i++) a.data.set([i, 80, 80, 255], i * 4);
      return { ...a, width: 48 };
    } });
    const messages = result.problems.map(p => p.message).join("\n");
    expect(messages).toContain("v2 sport must map");
    expect(messages).toContain("maximum 16");
    expect(messages).toContain("want 64x64");
  });

  it.each([["front",56,64,4], ["back",48,64,8], ["icon",16,32,8], ["front",64,64,0], ["back",64,64,0], ["icon",32,32,0]] as const)("draws %s %ipx native pixels centred in the %ipx slot", (kind, native, _slot, offset) => {
    const img = { width: native, height: native };
    const ctx = { assets: { image: () => img, exists: () => true } } as unknown as GameContext;
    const drawImage = vi.fn();
    const g = new Proxy({ drawImage }, { get: (o,k) => k in o ? o[k as keyof typeof o] : () => {} }) as unknown as CanvasRenderingContext2D;
    drawSpecies(ctx, g, "oak_acorn", kind, 10, 20);
    expect(drawImage).toHaveBeenCalledWith(img, 0, 0, native, native, 10 + offset, 20 + offset, native, native);
  });
});
