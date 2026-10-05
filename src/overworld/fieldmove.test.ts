import { describe, expect, it } from "vitest";
import type { MapDef } from "../contracts";
import { FIELD_MOVES } from "../contracts";
import { FIELD_MOVE_FX, fieldMoveCells, fieldMoveFlag, fieldMoveOf } from "./fieldmove";
import { buildMap, isWalkable, refreshLegend, tileAt, tryMove } from "./map";

const def: MapDef = {
  id: "route_1", name: "ROUTE 1", outdoor: true, music: "route",
  tiles: [
    "..B..",
    ".BXB.",
    ".....",
  ],
  legend: { ".": "grass", B: "bramble_bush", X: "tree" },
  legendWhen: [{ when: [{ flag: "grown", is: true }], legend: { X: "bramble_bush" } }],
  border: "tree", structures: [], warps: [], npcs: [], signs: [], triggers: [],
};

describe("field moves", () => {
  it("every field move has an item and a full table entry", () => {
    for (const move of Object.keys(FIELD_MOVES) as (keyof typeof FIELD_MOVES)[]) {
      expect(FIELD_MOVES[move].item).toBeTruthy();
      const fx = FIELD_MOVE_FX[move];
      expect(fx.cleared).toBeTruthy();
      expect(fx.locked.length).toBeLessThanOrEqual(36);
      expect(fx.prompt.length).toBeLessThanOrEqual(36);
    }
    expect(fieldMoveOf("bramble_bush")).toBe("prune");
    expect(fieldMoveOf("tree")).toBeUndefined();
    expect(fieldMoveFlag("prune", "route_1", 2, 0)).toBe("pruned_route_1_2_0");
  });

  it("finds every cell that can hold a field-move tile, including legendWhen swaps", () => {
    expect(fieldMoveCells(def)).toEqual([{ x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }]);
  });

  it("a pruned bramble reads, draws and walks as a stump; others stay thorny", () => {
    const m = buildMap(def);
    const flags: Record<string, boolean> = {};
    refreshLegend(m, flags);
    expect(tileAt(m, 2, 0)).toBe("bramble_bush");
    expect(isWalkable(m, 2, 0)).toBe(false);
    const before = m.legendSig;
    flags[fieldMoveFlag("prune", "route_1", 2, 0)] = true;
    refreshLegend(m, flags);
    expect(m.legendSig).not.toBe(before); // tile caches rebuild
    expect(tileAt(m, 2, 0)).toBe("bramble_stump");
    expect(isWalkable(m, 2, 0)).toBe(true);
    expect(tryMove(m, 2, 2, "up").kind).toBe("blocked"); // (2,1) is still a tree
    expect(tileAt(m, 1, 1)).toBe("bramble_bush");
    // a flag on a cell whose tile is not prunable changes nothing
    flags[fieldMoveFlag("prune", "route_1", 2, 1)] = true;
    refreshLegend(m, flags);
    expect(tileAt(m, 2, 1)).toBe("tree");
    // ...until a legendWhen swap makes it a bramble: then it's already cut
    flags.grown = true;
    refreshLegend(m, flags);
    expect(tileAt(m, 2, 1)).toBe("bramble_stump");
  });
});
