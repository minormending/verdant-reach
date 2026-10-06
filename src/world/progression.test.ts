import { describe, expect, it } from "vitest";
import type { MapDef, ScriptCmd, WorldData } from "../contracts";
import { checkProgressWithoutRaft, checkProgressWithoutSaxifrage, validateWorld } from "./validate";

const grant = (item: string, flag: string): ScriptCmd[] => [
  { op: "giveItem", item }, { op: "setFlag", flag },
];

/** The raft reaches the far shore's SAXIFRAGE giver. Its boulder then needs
 *  a northward push into the pocket before the goal and exit can be reached. */
function fixture(): WorldData {
  const crossing: MapDef = {
    id: "route_1", name: "COMBINED TEST", outdoor: true, music: "route", border: "wall",
    tiles: ["############", "#######.####", "#..~~......#", "#..~~...####", "############"],
    legend: { "#": "wall", ".": "grass", "~": "water" }, structures: [], signs: [],
    npcs: [
      { id: "captain", sprite: "elder", x: 2, y: 2, facing: "left", script: "raft" },
      { id: "elder", sprite: "elder", x: 5, y: 3, facing: "up", script: "saxifrage" },
      { id: "stone", sprite: "boulder", x: 7, y: 2, facing: "down", pushable: true },
    ],
    triggers: [{ x: 9, y: 2, script: "goal", when: [
      { flag: "got_raft", is: true }, { flag: "got_saxifrage", is: true },
    ] }],
    warps: [{ x: 10, y: 2, to: "herbarium", toX: 1, toY: 2 }],
  };
  const exit: MapDef = {
    ...crossing, id: "herbarium", name: "EXIT", tiles: ["###", "#.#", "#.#", "###"],
    npcs: [], triggers: [], warps: [{ x: 1, y: 1, to: "route_1", toX: 1, toY: 3 }],
  };
  return {
    maps: { route_1: crossing, herbarium: exit } as WorldData["maps"],
    scripts: { start: [], raft: grant("lily_raft", "got_raft"), saxifrage: grant("saxifrage", "got_saxifrage"), goal: [] },
    trainers: {}, newGame: { map: "route_1", x: 1, y: 3, facing: "right", script: "start" },
  };
}

describe("combined progression gates", () => {
  it("reaches the goal only after rafting to SAXIFRAGE and solving the boulder layout", () => {
    const w = fixture();
    expect(checkProgressWithoutRaft(w)).toEqual([]);
    expect(checkProgressWithoutSaxifrage(w)).toEqual([]);
    expect(validateWorld(w).filter((e) => /^\[(route_1|herbarium)\]/.test(e))).toEqual([]);
  });

  it.each(["raft", "saxifrage"])("rejects the combined route without the %s grant", (script) => {
    const w = fixture();
    w.scripts[script] = [];
    expect(validateWorld(w).join("\n")).toMatch(/without UPROOT: trigger goal/);
    if (script === "raft") expect(checkProgressWithoutRaft(w).join("\n")).toMatch(/npc elder.*before got_raft/);
  });

  it("rejects mutually dependent grants across the two gates", () => {
    const w = fixture();
    w.scripts.raft = [{ op: "if", when: [{ flag: "got_saxifrage", is: true }], then: w.scripts.raft }];
    expect(checkProgressWithoutRaft(w).join("\n")).toMatch(/npc elder.*before got_raft/);
    expect(checkProgressWithoutSaxifrage(w).join("\n")).toMatch(/trigger goal.*before got_saxifrage/);
  });

  it("still rejects an unsolvable exit route when both items can be acquired", () => {
    const w = fixture();
    w.maps.route_1.tiles[3] = "#..~~..#####"; // No standing tile south of the boulder.
    expect(checkProgressWithoutSaxifrage(w).join("\n")).toMatch(/warp at 10,2.*reset layout/);
  });
});
