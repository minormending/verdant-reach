import { describe, expect, it } from "vitest";
import type { MapDef } from "../contracts";
import { buildMap, refreshLegend, tryMove } from "./map";
import { tryRaftMove } from "./raft";

const fixture = (): MapDef => ({
  id: "route_1", name: "RAFT TEST", outdoor: true, music: "route", border: "water",
  tiles: ["....", ".~~.", ".~L.", "...."],
  legend: { ".": "grass", "~": "water", L: "ledge_down" },
  structures: [], warps: [], npcs: [], signs: [], triggers: [],
});

describe("RAFT movement", () => {
  it("requires the key item and confirmation to propose a mount from land", () => {
    const m = buildMap(fixture());
    expect(tryRaftMove(m, 0, 1, "right", false, false)).toEqual({ kind: "blocked", reason: "wall" });
    expect(tryRaftMove(m, 0, 1, "right", false, true)).toEqual({ kind: "mount", x: 1, y: 1, rafting: true });
    expect(tryRaftMove(m, 1, 1, "right", false, true)).toEqual({ kind: "blocked", reason: "wall" });
  });

  it("rides between water tiles and dismounts on any walkable shore", () => {
    const m = buildMap(fixture());
    expect(tryRaftMove(m, 1, 1, "right", true, true)).toEqual({ kind: "walk", x: 2, y: 1, rafting: true });
    expect(tryRaftMove(m, 1, 1, "left", true, true)).toEqual({ kind: "walk", x: 0, y: 1, rafting: false });
    for (const tile of ["sand", "boardwalk", "bridge", "floor_tile", "mat_exit"] as const) {
      const def = fixture();
      def.legend["."] = tile;
      expect(tryRaftMove(buildMap(def), 1, 1, "left", true, true)).toMatchObject({ kind: "walk", rafting: false });
    }
  });

  it("honours water:true rather than tile names and resolved legends", () => {
    const def = fixture();
    def.legend["~"] = "pond_lily";
    def.legendWhen = [{ when: [{ flag: "drained", is: true }], legend: { "~": "path" } }];
    const m = buildMap(def);
    expect(tryRaftMove(m, 1, 1, "right", true, true)).toMatchObject({ rafting: true });
    refreshLegend(m, { drained: true });
    expect(tryRaftMove(m, 1, 1, "right", true, true)).toMatchObject({ rafting: false });
  });

  it("blocks occupied water/shore, structures, edges, walls and ledges", () => {
    const m = buildMap(fixture());
    for (const rafting of [false, true]) expect(tryRaftMove(m, 0, 1, "right", rafting, true, () => true)).toEqual({ kind: "blocked", reason: "occupied" });
    expect(tryRaftMove(m, 1, 1, "left", true, true, () => true)).toEqual({ kind: "blocked", reason: "occupied" });
    expect(tryRaftMove(m, 0, 1, "left", true, true)).toEqual({ kind: "blocked", reason: "edge" });
    expect(tryRaftMove(m, 2, 1, "down", true, true)).toEqual({ kind: "blocked", reason: "wall" });
    m.solid.add("2,1");
    expect(tryRaftMove(m, 1, 1, "right", true, true)).toEqual({ kind: "blocked", reason: "wall" });
    expect(tryRaftMove(m, 1, 1, "right", false, true)).toEqual({ kind: "blocked", reason: "wall" });
  });

  it("preserves ordinary land movement and ledge hops", () => {
    const def = fixture();
    def.legend["~"] = "grass";
    const m = buildMap(def);
    for (const dir of ["left", "right", "up", "down"] as const) {
      const old = tryMove(m, 2, 1, dir);
      expect(tryRaftMove(m, 2, 1, dir, false, true)).toEqual(old.kind === "blocked" ? old : { ...old, rafting: false });
    }
  });
});
