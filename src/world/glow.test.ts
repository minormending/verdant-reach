import { describe, expect, it } from "vitest";
import type { MapDef, ScriptCmd, WorldData } from "../contracts";
import { checkProgressWithoutLantern, validateWorld } from "./validate";

const grant: ScriptCmd[] = [
  { op: "if", when: [{ flag: "got_lantern", is: false }], then: [
    { op: "giveItem", item: "foxfire_lantern" }, { op: "setFlag", flag: "got_lantern" },
  ] },
];

/** Test-only Hollow: two lamp posts light the hall; the east room is dark.
 *  No actual Chapter 5 map or existing map definition is changed. */
function fixture(): WorldData {
  const outside: MapDef = {
    id: "route_1", name: "OUTSIDE", outdoor: true, music: "route", border: "tree",
    tiles: ["..."], legend: { ".": "grass" }, structures: [], npcs: [], signs: [], triggers: [],
    warps: [{ x: 2, y: 0, to: "herbarium", toX: 1, toY: 2 }],
  };
  const hollow: MapDef = {
    id: "herbarium", name: "DARK TEST", outdoor: false, dark: true, music: "herbarium", border: "void",
    tiles: ["#############", "#.L..L......#", "#...........#", "#############"],
    legend: { "#": "wall", ".": "floor_wood", L: "lamp_post" }, structures: [], signs: [],
    warps: [{ x: 1, y: 2, to: "route_1", toX: 1, toY: 0 }],
    npcs: [{ id: "keeper", sprite: "elder", x: 3, y: 2, facing: "left", script: "lantern" }],
    triggers: [{ x: 10, y: 2, script: "shrine", when: [{ flag: "got_lantern", is: true }] }],
  };
  // The focused checker accepts partial worlds; validateWorld itself still
  // requires all MAP_IDS and keeps its existing complete-world tests.
  return {
    maps: { route_1: outside, herbarium: hollow } as WorldData["maps"],
    scripts: { start: [], lantern: grant, shrine: [] }, trainers: {},
    newGame: { map: "route_1", x: 0, y: 0, facing: "right", script: "start" },
  };
}

describe("dark-map progress", () => {
  it("allows a lamp-lit entrance hall giving the lantern before the dark rooms", () => {
    expect(checkProgressWithoutLantern(fixture())).toEqual([]);
  });

  it("allows a completely lamp-lit hall without requiring a lantern grant", () => {
    const w = fixture();
    w.maps.herbarium.tiles = ["########", "#.L..L.#", "#......#", "########"];
    w.maps.herbarium.triggers = [];
    w.scripts.lantern = [];
    expect(checkProgressWithoutLantern(w)).toEqual([]);
  });

  it("checks unlit warps when the lantern cannot be obtained", () => {
    const w = fixture();
    w.scripts.lantern = [];
    w.maps.herbarium.warps.push({ x: 10, y: 2, to: "route_1", toX: 1, toY: 0 });
    expect(checkProgressWithoutLantern(w).join("\n")).toMatch(/warp at 10,2.*lamp-lit path/);
  });

  it("includes the GLOW rule in the main world validator", () => {
    const w = fixture();
    w.maps.herbarium.npcs[0].x = 10;
    expect(validateWorld(w).join("\n")).toMatch(/without GLOW: npc keeper/);
  });

  it("rejects a lantern giver beyond the lamp light, despite adjacent lit floor", () => {
    const w = fixture();
    w.maps.herbarium.npcs[0].x = 7; // (7,2) is outside the radius of the second lamp.
    expect(checkProgressWithoutLantern(w).join("\n")).toMatch(/npc keeper.*lamp-lit path/);
  });

  it("rejects a lit giver separated from the entry by an unlit corridor", () => {
    const w = fixture();
    w.maps.herbarium.tiles = ["#############", "#L........L.#", "#...........#", "#############"];
    w.maps.herbarium.npcs[0].x = 10;
    expect(checkProgressWithoutLantern(w).join("\n")).toMatch(/npc keeper.*lamp-lit path/);
  });

  it("does not mistake the player's 1-tile light for a safe lamp-lit route", () => {
    const w = fixture();
    w.maps.herbarium.legend.L = "floor_wood";
    expect(checkProgressWithoutLantern(w).join("\n")).toMatch(/warp.*lamp-lit path/);
  });

  it("rejects a story trigger explicitly required before got_lantern outside the hall", () => {
    const w = fixture();
    w.maps.herbarium.triggers[0].when = [{ flag: "got_lantern", is: false }];
    expect(checkProgressWithoutLantern(w).join("\n")).toMatch(/trigger shrine.*lamp-lit path/);
  });

  it("checks pre-lantern NPCs even when the lantern is obtainable elsewhere", () => {
    const w = fixture();
    w.maps.herbarium.npcs.push({ id: "early", sprite: "elder", x: 10, y: 2, facing: "left", script: "shrine", visibleWhen: [{ flag: "got_lantern", is: false }] });
    expect(checkProgressWithoutLantern(w).join("\n")).toMatch(/npc early.*lamp-lit path/);
  });

  it.each(["flag", "item"])("rejects lantern acquisition gated by its own %s", (kind) => {
    const w = fixture();
    w.scripts.lantern = kind === "flag"
      ? [{ op: "if", when: [{ flag: "got_lantern", is: true }], then: [{ op: "giveItem", item: "foxfire_lantern" }] }]
      : [{ op: "ifHasItem", item: "foxfire_lantern", then: [{ op: "giveItem", item: "foxfire_lantern" }] }];
    expect(checkProgressWithoutLantern(w).join("\n")).toMatch(/dark rooms require an obtainable foxfire_lantern/);
  });

  it("does not let an unlit map's onEnter bootstrap lantern acquisition", () => {
    const w = fixture();
    w.maps.herbarium.legend.L = "floor_wood";
    w.maps.herbarium.onEnter = "lantern";
    expect(checkProgressWithoutLantern(w).join("\n")).toMatch(/npc keeper.*lamp-lit path/);
  });

  it("follows calls and scripted warps only from accessible scripts", () => {
    const w = fixture();
    w.scripts.lantern = [{ op: "call", script: "grant" }];
    w.scripts.grant = [{ op: "call", script: "lantern" }, ...grant];
    expect(checkProgressWithoutLantern(w)).toEqual([]);
    w.maps.herbarium.npcs[0].x = 10;
    w.scripts.shuttle = [{ op: "warp", to: "herbarium", x: 9, y: 2 }, ...grant];
    expect(checkProgressWithoutLantern(w).join("\n")).toMatch(/npc keeper/);
  });

  it("allows a reachable external giver, and requires a real item grant rather than just a flag", () => {
    const w = fixture();
    w.maps.herbarium.npcs[0].x = 10;
    w.scripts.start = grant;
    expect(checkProgressWithoutLantern(w)).toEqual([]);
    w.scripts.start = [{ op: "setFlag", flag: "got_lantern" }];
    w.scripts.lantern = [];
    expect(checkProgressWithoutLantern(w).join("\n")).toMatch(/npc keeper/);
  });

  it("checks solid talk triggers using a lit target and a lit standing tile", () => {
    const w = fixture();
    w.maps.herbarium.tiles[1] = "#.LS.L......#";
    w.maps.herbarium.legend.S = "sensor_post";
    w.maps.herbarium.npcs = [];
    w.maps.herbarium.triggers.push({ x: 3, y: 1, script: "lantern", when: [{ flag: "got_lantern", is: false }] });
    expect(checkProgressWithoutLantern(w)).toEqual([]);
  });

  it("does not alter validation for maps without dark", () => {
    const w = fixture();
    delete w.maps.herbarium.dark;
    w.scripts.lantern = [];
    expect(checkProgressWithoutLantern(w)).toEqual([]);
  });

  it("rejects a grant requiring a story flag whose setter is in the unlit rooms", () => {
    const w = fixture();
    w.scripts.lantern = [{ op: "if", when: [{ flag: "vision", is: true }], then: grant }];
    w.maps.herbarium.triggers[0].when = undefined;
    w.scripts.shrine = [{ op: "setFlag", flag: "vision" }];
    expect(checkProgressWithoutLantern(w).join("\n")).toMatch(/dark rooms require an obtainable foxfire_lantern/);
    w.maps.route_1.onEnter = "shrine";
    expect(checkProgressWithoutLantern(w)).toEqual([]);
  });

  it("rejects circular positive-flag prerequisites even when their scripts are lit", () => {
    const w = fixture();
    w.scripts.lantern = [{ op: "if", when: [{ flag: "ready", is: true }], then: grant }];
    w.maps.route_1.onEnter = "ready";
    w.scripts.ready = [{ op: "if", when: [{ flag: "ready", is: true }], then: [{ op: "setFlag", flag: "ready" }] }];
    expect(checkProgressWithoutLantern(w).join("\n")).toMatch(/dark rooms require an obtainable foxfire_lantern/);
  });

  it("keeps pre-lantern scripted arrivals reachable after acquisition", () => {
    const w = fixture();
    w.maps.route_1.warps = [];
    w.scripts.start = [{ op: "if", when: [{ flag: "got_lantern", is: false }], then: [{ op: "warp", to: "herbarium", x: 1, y: 2 }] }];
    expect(checkProgressWithoutLantern(w)).toEqual([]);
  });
});
