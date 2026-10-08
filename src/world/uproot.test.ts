import { describe, expect, it } from "vitest";
import type { MapDef, ScriptCmd, WorldData } from "../contracts";
import { checkProgressWithoutSaxifrage, validateWorld } from "./validate";
import { continuePosition } from "../overworld/continue";
import { buildMap, key } from "../overworld/map";
import { reachableBoulderTiles } from "../overworld/uproot";
import { WORLD } from "./index";

const grant: ScriptCmd[] = [
  { op: "if", when: [{ flag: "got_saxifrage", is: false }], then: [
    { op: "giveItem", item: "saxifrage" }, { op: "setFlag", flag: "got_saxifrage" },
  ] },
];

/** A narrow crossing with a side pocket: moving the stone up clears the path.
 *  The elder is accessible before it; no production maps are involved. */
function fixture(): WorldData {
  const room: MapDef = {
    id: "route_1", name: "BOULDER TEST", outdoor: true, music: "route", border: "wall",
    tiles: ["#######", "###.###", "#.....#", "#...###", "#######"],
    legend: { "#": "wall", ".": "grass" }, structures: [], signs: [],
    warps: [{ x: 1, y: 2, to: "route_2", toX: 1, toY: 0 }],
    npcs: [
      { id: "stone", sprite: "boulder", x: 3, y: 2, facing: "down", pushable: true },
      { id: "elder", sprite: "elder", x: 1, y: 3, facing: "up", script: "grant" },
    ],
    triggers: [{ x: 5, y: 2, script: "story", when: [{ flag: "got_saxifrage", is: true }] }],
  };
  const outside: MapDef = {
    ...room, id: "route_2", name: "OUTSIDE", tiles: ["..."], npcs: [], triggers: [],
    warps: [{ x: 2, y: 0, to: "route_1", toX: 1, toY: 2 }],
  };
  return {
    maps: { route_1: room, route_2: outside } as WorldData["maps"],
    scripts: { start: [], grant, story: [] }, trainers: {},
    newGame: { map: "route_2", x: 0, y: 0, facing: "right", script: "start" },
  };
}

describe("UPROOT progression validation", () => {
  it("lets every boulder map's Continue entrance reach every exit in its starting layout", () => {
    const rooms = Object.values(WORLD.maps).filter((m) => m.npcs.some((n) => n.pushable));
    expect(rooms.length).toBeGreaterThan(0);
    for (const room of rooms) {
      const entrance = continuePosition(WORLD, { map: room.id, x: -1, y: -1, facing: "up" });
      const blocked = new Set(room.npcs.map((n) => key(n.x, n.y)));
      const reached = reachableBoulderTiles(buildMap(room), [], entrance, { occupied: (x, y) => blocked.has(key(x, y)) });
      for (const exit of room.warps) expect(reached.has(key(exit.x, exit.y)), `${room.id} exit ${exit.x},${exit.y}`).toBe(true);
    }
  });

  it("allows a reachable SAXIFRAGE giver and a solvable starting puzzle", () => {
    expect(checkProgressWithoutSaxifrage(fixture())).toEqual([]);
  });

  it("does not treat boulders as NPCs needing talk scripts", () => {
    const errors = validateWorld(fixture()).join("\n");
    expect(errors).not.toMatch(/npc stone has nothing to say|without UPROOT/);
  });

  it("includes UPROOT progress checks in the main validator", () => {
    const w = fixture();
    w.maps.route_1.npcs[1].x = 5;
    w.maps.route_1.npcs[1].y = 2;
    expect(validateWorld(w).join("\n")).toMatch(/without UPROOT: npc elder/);
  });

  it("rejects an elder beyond the very boulder that needs SAXIFRAGE", () => {
    const w = fixture();
    w.maps.route_1.npcs[1].x = 5;
    w.maps.route_1.npcs[1].y = 2;
    expect(checkProgressWithoutSaxifrage(w).join("\n")).toMatch(/npc elder.*before got_saxifrage/);
  });

  it.each(["flag", "item"])("rejects self-gated acquisition through %s", (kind) => {
    const w = fixture();
    w.scripts.grant = kind === "flag"
      ? [{ op: "if", when: [{ flag: "got_saxifrage", is: true }], then: [{ op: "giveItem", item: "saxifrage" }] }]
      : [{ op: "ifHasItem", item: "saxifrage", then: [{ op: "giveItem", item: "saxifrage" }] }];
    expect(checkProgressWithoutSaxifrage(w).join("\n")).toMatch(/boulder rooms require an obtainable saxifrage/);
  });

  it("does not use a flag alone to stand in for the key item", () => {
    const w = fixture();
    w.scripts.grant = [{ op: "setFlag", flag: "got_saxifrage" }];
    expect(checkProgressWithoutSaxifrage(w).join("\n")).toMatch(/require an obtainable saxifrage/);
  });

  it("checks paths explicitly required before the item, even if the item is obtainable", () => {
    const w = fixture();
    w.maps.route_1.triggers[0].when = [{ flag: "got_saxifrage", is: false }];
    expect(checkProgressWithoutSaxifrage(w).join("\n")).toMatch(/trigger story.*before got_saxifrage/);
  });

  it("checks warps blocked by boulders when no key item can be acquired", () => {
    const w = fixture();
    w.scripts.grant = [];
    w.maps.route_1.warps.push({ x: 5, y: 2, to: "route_2", toX: 1, toY: 0 });
    expect(checkProgressWithoutSaxifrage(w).join("\n")).toMatch(/warp at 5,2.*before got_saxifrage/);
  });

  it("uses BFS rather than removing every boulder after acquisition", () => {
    const w = fixture();
    w.maps.route_1.tiles[3] = "#..####"; // cannot stand south of the stone to push into the pocket
    expect(checkProgressWithoutSaxifrage(w).join("\n")).toMatch(/trigger story/);
  });

  it("rejects a post-item story path even if its boulder cannot move at all", () => {
    const w = fixture();
    w.scripts.grant = [];
    w.maps.route_1.npcs.push({ id: "second", sprite: "boulder", x: 4, y: 2, facing: "down", pushable: true });
    w.maps.route_1.tiles[3] = "#..####";
    expect(checkProgressWithoutSaxifrage(w).join("\n")).toMatch(/trigger story.*before got_saxifrage/);
  });

  it("follows calls and ignores unreachable uncalled grants", () => {
    const w = fixture();
    w.scripts.grant = [];
    w.scripts.unused = grant;
    expect(checkProgressWithoutSaxifrage(w).join("\n")).toMatch(/require an obtainable saxifrage/);
    w.scripts.grant = [{ op: "call", script: "unused" }];
    expect(checkProgressWithoutSaxifrage(w)).toEqual([]);
  });

  it("rejects circular positive prerequisites and accepts a reachable setter", () => {
    const w = fixture();
    w.scripts.grant = [{ op: "if", when: [{ flag: "ready", is: true }], then: grant }];
    w.scripts.story = [{ op: "setFlag", flag: "ready" }];
    expect(checkProgressWithoutSaxifrage(w).join("\n")).toMatch(/require an obtainable saxifrage/);
    w.maps.route_2.onEnter = "story";
    expect(checkProgressWithoutSaxifrage(w)).toEqual([]);
  });

  it("does not change validation for worlds without pushable NPCs", () => {
    const w = fixture();
    w.maps.route_1.npcs = [];
    expect(checkProgressWithoutSaxifrage(w)).toEqual([]);
  });
});
