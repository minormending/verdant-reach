import { describe, expect, it } from "vitest";
import { GLOW_RADIUS, glowField, glowLamps, glowTiles } from "./glow";
import { drawGlow, glowPixelHidden } from "./glowRender";
import { buildMap, refreshLegend, tileAt } from "./map";
import type { MapDef } from "../contracts";
import { SCREEN_H, SCREEN_W, TILE } from "../contracts";

describe("GLOW geometry", () => {
  it("has the specified radii, with a core and two discrete falloff bands", () => {
    expect(GLOW_RADIUS).toEqual({ player: 1, lantern: 3, lamp: 2 });
    const light = glowField({ x: 4, y: 4 }, [], true);
    expect([0, 1, 2, 3, 4].map((d) => light(4 + d, 4))).toEqual(["core", "core", "inner", "outer", "dark"]);
    const small = glowField({ x: 0, y: 0 }, [], false);
    expect([0, 0.5, 0.9, 1, 1.01].map((d) => small(d, 0))).toEqual(["core", "inner", "outer", "outer", "dark"]);
  });

  it("is round and symmetric rather than a square or a Manhattan diamond", () => {
    const light = glowField({ x: 4, y: 4 }, [], true);
    expect(light(6, 6)).toBe("outer");
    expect(light(7, 7)).toBe("dark");
    expect(light(7, 5)).toBe("dark");
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
      expect(light(4 + x, 4 + y)).toBe(light(4 - y, 4 + x));
    }
  });

  it("lights tiles independently of the player's lantern and combines sources by brightness", () => {
    const lamps = [{ x: 5, y: 2 }];
    expect(glowField(null, lamps, false)(7, 2)).toBe("outer");
    expect(glowField(null, lamps, true)(7, 3)).toBe("dark");
    const light = glowField({ x: 2, y: 2 }, lamps, true);
    expect(light(5, 2)).toBe("core"); // Player outer band, lamp core.
    expect(glowField(null, [...lamps, ...lamps], false)(6, 2)).toBe("inner");
    const bands = glowTiles(9, 5, { x: 2, y: 2 }, [], false);
    expect(bands[2]).toEqual(["dark", "outer", "core", "outer", "dark", "dark", "dark", "dark", "dark"]);
    expect(bands[1][1]).toBe("dark");
  });

  it("follows the interpolated player position and handles empty light fields", () => {
    const light = glowField({ x: 0.5, y: 0 }, [], false);
    expect(light(1.5, 0)).toBe("outer");
    expect(light(-0.51, 0)).toBe("dark");
    expect(glowTiles(2, 2, null, [], false)).toEqual([["dark", "dark"], ["dark", "dark"]]);
  });

  it("finds lamps in the active legend, including flag-dependent swaps", () => {
    const def: MapDef = {
      id: "herbarium", name: "TEST", outdoor: false, music: "herbarium", dark: true,
      tiles: [".L."], legend: { ".": "floor_wood", L: "lamp_post" }, border: "void",
      structures: [], warps: [], npcs: [], signs: [], triggers: [],
      legendWhen: [{ when: [{ flag: "off", is: true }], legend: { L: "floor_wood" } }],
    };
    const m = buildMap(def);
    refreshLegend(m, {});
    expect(glowLamps(m.w, m.h, (x, y) => tileAt(m, x, y))).toEqual([{ x: 1, y: 0 }]);
    refreshLegend(m, { off: true });
    expect(glowLamps(m.w, m.h, (x, y) => tileAt(m, x, y))).toEqual([]);
  });
});

describe("GLOW drawing", () => {
  it("uses opaque 1/4 and 3/4 dither coverage, with an uncovered core", () => {
    for (const [band, count] of [["core", 0], ["inner", 1], ["outer", 3], ["dark", 4]] as const) {
      const pixels = [[0, 0], [1, 0], [0, 1], [1, 1]].filter(([x, y]) => glowPixelHidden(band, x, y));
      expect(pixels).toHaveLength(count);
    }
  });

  function mask(camX = 0, camY = 0) {
    const pixels = new Set<string>();
    const styles: unknown[] = [];
    const g = {
      save() {}, restore() {}, globalAlpha: 0.5, globalCompositeOperation: "multiply", fillStyle: "red",
      fillRect(x: number, y: number, w: number, h: number) {
        styles.push([this.fillStyle, this.globalAlpha, this.globalCompositeOperation]);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x + w).toBeLessThanOrEqual(SCREEN_W);
        expect(y + h).toBeLessThanOrEqual(SCREEN_H);
        for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) pixels.add(`${x + dx},${y + dy}`);
      },
    };
    drawGlow(g as unknown as CanvasRenderingContext2D, camX, camY, { x: 4, y: 4 }, [], true);
    return { pixels, styles };
  }

  it("covers distant map pixels in black while preserving the core's tinted pixels", () => {
    const { pixels, styles } = mask();
    expect(pixels.has("0,0")).toBe(true);
    expect(pixels.has(`${4 * TILE + 8},${4 * TILE + 8}`)).toBe(false);
    expect(new Set(styles.map((s) => JSON.stringify(s)))).toEqual(new Set(['["#000000",1,"source-over"]']));
    // Outside the maximum radius no visible pixel leaks through the mask.
    for (let y = 0; y < SCREEN_H; y++) expect(pixels.has(`159,${y}`)).toBe(true);
  });

  it("anchors the dither in world pixels as the camera moves", () => {
    const a = mask().pixels;
    const b = mask(1, 1).pixels;
    for (let y = 1; y < SCREEN_H; y++) for (let x = 1; x < SCREEN_W; x++) {
      expect(a.has(`${x},${y}`)).toBe(b.has(`${x - 1},${y - 1}`));
    }
  });
});
