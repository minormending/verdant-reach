import { describe, expect, it } from "vitest";
import type { MapDef, ScriptCmd, WorldData } from "../contracts";
import { checkProgressWithoutFigRoot, checkProgressWithoutPrune, flood, grid, validateWorld } from "./validate";

const grant: ScriptCmd[] = [{ op: "giveItem", item: "fig_root" }, { op: "setFlag", flag: "got_fig_root" }];

function fixture(): WorldData {
  const map: MapDef = {
    id: "route_1", name: "ROOT TEST", outdoor: true, music: "route", border: "void", onEnter: "start",
    tiles: ["#########", "#..G....#", "#########"],
    legend: { "#": "wall", ".": "grass", G: "root_gap" }, structures: [],
    npcs: [{ id: "keeper", sprite: "elder", x: 1, y: 1, facing: "right", script: "root" }],
    signs: [], triggers: [], warps: [{ x: 7, y: 1, to: "herbarium", toX: 1, toY: 2 }],
    hidden: [{ x: 6, y: 1, item: "rain_jar" }],
  };
  const ledge: MapDef = {
    ...map, id: "herbarium", name: "LEDGE", tiles: ["###", "#.#", "#.#", "###"],
    npcs: [], hidden: [], warps: [{ x: 1, y: 1, to: "route_1", toX: 6, toY: 1 }],
  };
  return {
    maps: { route_1: map, herbarium: ledge } as WorldData["maps"],
    scripts: { start: [{ op: "giveItem", item: "pruning_shears" }], root: [], story: [] }, trainers: {},
    newGame: { map: "route_1", x: 2, y: 1, facing: "right", script: "start" },
  };
}

describe("ROOT BRIDGE progress validation", () => {
  it("keeps a required warp behind the gap unreachable until Fig Root is obtainable", () => {
    const world = fixture();
    expect(flood(grid(world.maps.route_1), [{ x: 2, y: 1 }]).has("7,1")).toBe(false);
    expect(flood(grid(world.maps.route_1, { bridged: true }), [{ x: 2, y: 1 }]).has("7,1")).toBe(true);
    expect(checkProgressWithoutFigRoot(world).join("\n")).toMatch(/without ROOT BRIDGE: warp at 7,1/);
    expect(checkProgressWithoutFigRoot(world).join("\n")).toMatch(/hidden rain_jar/);
    expect(validateWorld(world).join("\n")).toMatch(/without ROOT BRIDGE/);
    world.scripts.root = structuredClone(grant);
    expect(checkProgressWithoutFigRoot(world)).toEqual([]);
    expect(checkProgressWithoutPrune(world)).toEqual([]);
    expect(validateWorld(world).filter((e) => /^\[(route_1|herbarium)\]/.test(e))).toEqual([]);
  });

  it("rejects acquisition across the gap even with a return warp on the far side", () => {
    const world = fixture();
    world.maps.route_1.npcs[0].x = 7;
    world.scripts.root = structuredClone(grant);
    expect(checkProgressWithoutFigRoot(world).join("\n")).toMatch(/warp at 7,1/);
    expect(validateWorld(world).join("\n")).toMatch(/without ROOT BRIDGE/);
  });

  it("rejects flag-only, zero-quantity, and self-gated grants", () => {
    for (const commands of [
      [{ op: "setFlag", flag: "got_fig_root" }],
      [{ op: "giveItem", item: "fig_root", qty: 0 }],
      [{ op: "if", when: [{ flag: "got_fig_root", is: true }], then: grant }],
      [{ op: "ifHasItem", item: "fig_root", then: grant }],
    ] as ScriptCmd[][]) {
      const world = fixture();
      world.scripts.root = commands;
      expect(checkProgressWithoutFigRoot(world).join("\n")).toMatch(/warp at 7,1/);
    }
  });

  it("requires the actual item grant rather than the story acquisition flag", () => {
    const world = fixture();
    world.scripts.root = [{ op: "giveItem", item: "fig_root" }];
    expect(checkProgressWithoutFigRoot(world)).toEqual([]);
  });
});
