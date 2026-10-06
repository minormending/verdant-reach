import { describe, expect, it } from "vitest";
import type { MapDef, ScriptCmd, WorldData } from "../contracts";
import { WORLD } from "./index";
import { canReach, checkProgressWithoutRaft, flood, grid, validateWorld } from "./validate";

const grant: ScriptCmd[] = [{ op: "giveItem", item: "lily_raft" }, { op: "setFlag", flag: "got_raft" }];

function fixture(): WorldData {
  const map: MapDef = {
    id: "route_1", name: "RAFT TEST", outdoor: true, music: "route", border: "void",
    tiles: ["#########", "#..~~~..#", "#..~~~..#", "#########"],
    legend: { "#": "wall", ".": "grass", "~": "water" }, structures: [],
    npcs: [{ id: "captain", sprite: "elder", x: 2, y: 1, facing: "left", script: "raft" }],
    signs: [], triggers: [{ x: 7, y: 2, script: "story", when: [{ flag: "got_raft", is: true }] }],
    warps: [{ x: 7, y: 1, to: "herbarium", toX: 1, toY: 2 }],
  };
  const island: MapDef = {
    ...map, id: "herbarium", name: "ISLAND", tiles: ["###", "#.#", "#.#", "###"],
    npcs: [], triggers: [], warps: [{ x: 1, y: 1, to: "route_1", toX: 6, toY: 2 }],
  };
  return {
    maps: { route_1: map, herbarium: island } as WorldData["maps"],
    scripts: { start: [], raft: structuredClone(grant), story: [] }, trainers: {},
    newGame: { map: "route_1", x: 1, y: 2, facing: "right", script: "start" },
  };
}

describe("RAFT progress validation", () => {
  it("permits water-only regions after a reachable raft grant", () => {
    const w = fixture();
    expect(checkProgressWithoutRaft(w)).toEqual([]);
    const g = grid(w.maps.route_1);
    expect(flood(g, [{ x: 1, y: 2 }]).has("7,2")).toBe(false);
    const raft = grid(w.maps.route_1, { rafting: true });
    expect(flood(raft, [{ x: 1, y: 2 }]).has("7,2")).toBe(true);
    expect(canReach(raft, [{ x: 1, y: 2 }]).has("7,2")).toBe(true);
  });

  it("rejects a raft giver across the water and exposes story/warp failures", () => {
    const w = fixture();
    w.maps.route_1.npcs[0].x = 7;
    const errors = checkProgressWithoutRaft(w).join("\n");
    expect(errors).toMatch(/npc captain.*before got_raft/);
    expect(errors).toMatch(/trigger story/);
    expect(errors).toMatch(/warp at 7,1/);
    expect(validateWorld(w).join("\n")).toMatch(/without RAFT/);
  });

  it("includes rafting in eventual geometry and PRUNE validation after acquisition", () => {
    const w = fixture();
    const errors = validateWorld(w).filter((e) => e.startsWith("[route_1]") || e.startsWith("[herbarium]"));
    expect(errors).toEqual([]);
  });

  it("rejects flag-only grants, missing grants and self-gated acquisition", () => {
    for (const cmds of [
      [], [{ op: "setFlag", flag: "got_raft" }],
      [{ op: "if", when: [{ flag: "got_raft", is: true }], then: grant }],
      [{ op: "ifHasItem", item: "lily_raft", then: grant }],
    ] as ScriptCmd[][]) {
      const w = fixture();
      w.scripts.raft = cmds;
      expect(checkProgressWithoutRaft(w).join("\n")).toMatch(/without RAFT/);
    }
  });

  it("checks explicit pre-raft story tiles even when acquisition succeeds", () => {
    const w = fixture();
    w.maps.route_1.triggers[0].when = [{ flag: "got_raft", is: false }];
    expect(checkProgressWithoutRaft(w).join("\n")).toMatch(/trigger story.*land path/);
  });

  it("follows calls from reachable scripts and ignores unreachable script warps", () => {
    const w = fixture();
    w.scripts.raft = [{ op: "call", script: "grant" }];
    w.scripts.grant = [{ op: "call", script: "raft" }, ...grant];
    expect(checkProgressWithoutRaft(w)).toEqual([]);
    w.maps.route_1.npcs[0].x = 7;
    w.scripts.unused = [{ op: "warp", to: "route_1", x: 7, y: 2 }, ...grant];
    expect(checkProgressWithoutRaft(w).join("\n")).toMatch(/npc captain/);
  });

  it("rejects a grant depending on a flag whose only setter needs the raft", () => {
    const w = fixture();
    w.scripts.raft = [{ op: "if", when: [{ flag: "ready", is: true }], then: grant }];
    w.maps.route_1.triggers[0].when = undefined;
    w.scripts.story = [{ op: "setFlag", flag: "ready" }];
    expect(checkProgressWithoutRaft(w).join("\n")).toMatch(/without RAFT/);
    w.maps.route_1.onEnter = "story";
    expect(checkProgressWithoutRaft(w)).toEqual([]);
  });

  it("does not change maps using water as scenery or maps without water", () => {
    expect(checkProgressWithoutRaft(WORLD)).toEqual([]);
    const w = fixture();
    w.maps.route_1.legend["~"] = "grass";
    w.scripts.raft = [];
    expect(checkProgressWithoutRaft(w)).toEqual([]);
  });

  it("validates water encounter references and time coverage", () => {
    const w = fixture();
    w.maps.route_1.encounters = { water: { rate: 10, slots: [{ species: "missing" as never, minLevel: 4, maxLevel: 2, weight: 100, time: "day" }] } };
    const errors = validateWorld(w).join("\n");
    expect(errors).toMatch(/encounter species missing/);
    expect(errors).toMatch(/encounter levels missing/);
    expect(errors).toMatch(/water encounters empty at night/);
  });
});
