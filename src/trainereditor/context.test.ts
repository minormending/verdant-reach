import { describe, expect, it } from "vitest";
import { DATA } from "../data";
import { WORLD } from "../world";
import { WALKTHROUGH } from "../guide/walkthrough";
import { TRAINERS_FILE } from "../world/trainers";
import { buildCatalog } from "./catalog";
import { adjacentMaps, levelContext, mapEncounters, nearestHeal, nearestWild, nextLeader, wildRange } from "./context";

const rows = buildCatalog(WORLD, TRAINERS_FILE.trainers, WALKTHROUGH, { trainers: WORLD.trainers });
const row = (id: string) => rows.find((r) => r.id === id)!;
const entry = (id: string) => TRAINERS_FILE.trainers.find((e) => e.id === id)!;

describe("trainer context", () => {
  it("reads a map's wild levels from its normal tables", () => {
    const sets = mapEncounters(WORLD.maps.route_1, { trainers: WORLD.trainers });
    const slots = Object.values(WORLD.maps.route_1.encounters ?? {}).flatMap((t) => t?.slots ?? []);
    expect(wildRange(sets)).toEqual({ min: Math.min(...slots.map((s) => s.minLevel)), max: Math.max(...slots.map((s) => s.maxLevel)) });
    expect(wildRange([])).toBeNull();
  });

  it("finds maps one warp away and the nearest heal point", () => {
    const adj = adjacentMaps(WORLD, "route_1");
    expect(adj.length).toBeGreaterThan(0);
    expect(adj).not.toContain("route_1");
    for (const m of adj) expect(WORLD.maps.route_1.warps.some((w) => w.to === m)).toBe(true);
    expect(nearestHeal(WORLD, "bramblegate_greenhouse")).toMatchObject({ map: "bramblegate_greenhouse", warps: 0 });
    const heal = nearestHeal(WORLD, "bramblegate_conservatory")!;
    expect(WORLD.maps[heal.map].healPoint).toBeDefined();
    expect(heal.warps).toBeGreaterThan(0);
  });

  it("compares an indoor trainer with the nearest wild plants", () => {
    expect(nearestWild(WORLD, ["route_1"]).map).toBe("route_1");
    const indoor = nearestWild(WORLD, ["bramblegate_conservatory"]);
    expect(indoor.map).not.toBeNull();
    expect(indoor.map).not.toBe("bramblegate_conservatory");
    expect(wildRange(indoor.sets)).not.toBeNull();
  });

  it("names the next Conservatory leader in story order", () => {
    expect(nextLeader(rows, row("schoolkid_milo"))?.id).toBe("hollis");
    expect(nextLeader(rows, row("hiker_gus"))?.id).toBe("nell");
    expect(nextLeader(rows, row("flora"))?.id).toBe("flora");
    expect(nextLeader(rows, row("r12_crag"))).toBeNull();
  });

  it("compares the trainer with the wild plants and the next leader", () => {
    const ctx = levelContext(entry("schoolkid_milo"), { min: 2, max: 4 }, "route_1", { id: "hollis", label: "WARDEN HOLLIS", team: entry("hollis").team });
    expect(ctx.trainer).toEqual({ min: 4, max: 4 });
    expect(ctx.leader?.range).toEqual({ min: 8, max: 10 });
    expect(ctx.scale.min).toBeLessThanOrEqual(2);
    expect(ctx.scale.max).toBeGreaterThanOrEqual(10);
    expect(ctx.hints).toEqual([]);
    const hot = levelContext({ ...entry("schoolkid_milo"), team: [{ species: "dandelion_bud", level: 20 }] }, { min: 2, max: 4 }, "route_1",
      { id: "hollis", label: "WARDEN HOLLIS", team: entry("hollis").team });
    expect(hot.hints.join(" ")).toMatch(/16 levels above the wild plants/);
    expect(hot.hints.join(" ")).toMatch(/above the next leader's ace \(Lv 10\)/);
  });
});
