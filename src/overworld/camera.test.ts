import { describe, expect, it } from "vitest";
import { CameraRig, Flash, camForTile, easeInOut, panFrames } from "./camera";
import { AmbientFx, effectiveAmbient, fireflyBrightness } from "./ambient";

describe("camera rig", () => {
  it("eases in and out", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
    expect(easeInOut(0.1)).toBeLessThan(0.1); // slow start
    expect(easeInOut(0.9)).toBeGreaterThan(0.9); // slow finish
  });

  it("pans to a tile, holds, then returns to the player and follows", async () => {
    const cam = new CameraRig();
    const player = { x: 0, y: 0 };
    cam.update(player);
    let arrived = false;
    const p = cam.pan(camForTile(10, 4), 20).then(() => (arrived = true));
    const xs: number[] = [];
    for (let i = 0; i < 20; i++) { cam.update(player); xs.push(cam.x); }
    await p;
    expect(arrived).toBe(true);
    expect({ x: cam.x, y: cam.y }).toEqual(camForTile(10, 4));
    // eased: small first step, larger middle steps
    expect(xs[1] - xs[0]).toBeLessThan(xs[10] - xs[9]);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThanOrEqual(xs[i - 1]);
    // holds while the player moves
    cam.update({ x: 50, y: 50 });
    expect({ x: cam.x, y: cam.y }).toEqual(camForTile(10, 4));
    const back = cam.reset(10, { x: 50, y: 50 });
    for (let i = 0; i < 10; i++) cam.update({ x: 50, y: 50 });
    await back;
    expect(cam.following).toBe(true);
    cam.update({ x: 60, y: 70 });
    expect({ x: cam.x, y: cam.y }).toEqual({ x: 60, y: 70 });
  });

  it("reset while already following resolves at once", async () => {
    const cam = new CameraRig();
    await cam.reset();
    expect(cam.following).toBe(true);
  });

  it("picks a pleasant default pan length", () => {
    expect(panFrames(0, 0)).toBe(20);
    expect(panFrames(160, 0)).toBe(100);
    expect(panFrames(2000, 0)).toBe(120);
  });

  it("flashes solid then fades in quarter steps", async () => {
    const f = new Flash();
    const done = f.run("gold", 20);
    expect(f.level()).toBe(1);
    const levels: number[] = [];
    for (let i = 0; i < 20; i++) { f.tick(); levels.push(f.level()); }
    await done;
    expect(levels[levels.length - 1]).toBe(0);
    for (const l of levels) expect([0, 0.25, 0.5, 0.75, 1]).toContain(l);
  });
});

describe("ambient", () => {
  it("only shows fireflies at night", () => {
    expect(effectiveAmbient("fireflies", "night")).toBe("fireflies");
    expect(effectiveAmbient("fireflies", "day")).toBe("none");
    expect(effectiveAmbient("pollen", "morning")).toBe("pollen");
    expect(effectiveAmbient(undefined, "day")).toBe("none");
  });

  it("spawns particles per kind and switches cleanly", () => {
    const fx = new AmbientFx();
    fx.set("pollen");
    expect(fx.count).toBeGreaterThan(0);
    fx.set("none");
    expect(fx.count).toBe(0);
    fx.set("rain");
    for (let i = 0; i < 200; i++) fx.update();
    expect(fx.count).toBeGreaterThan(20);
  });

  it("ramps fireflies on and off softly", () => {
    expect(fireflyBrightness(0, 200)).toBe(1);
    expect(fireflyBrightness(6, 200)).toBe(2);
    expect(fireflyBrightness(30, 200)).toBe(3);
    expect(fireflyBrightness(150, 200)).toBe(0);
    expect(fireflyBrightness(80, 200)).toBe(1);
  });
});
