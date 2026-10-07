import { describe, expect, it } from "vitest";
import { type MapId } from "../contracts";
import { buildMap, isWalkable, refreshLegend, tileAt, tileProps } from "../overworld/map";
import { WORLD } from "./index";

// Frozen movement/RAFT/encounter/ledge geometry from the Chapter 6 stand-ins.
// Art may change names and masks, but every gameplay terrain cell stays put.
const BEFORE: [MapId, boolean, string][] = [
  ["route_7", false, "563f598ff9ff02fc614c77fab2cd1eadf58b4d1b55da79adb0531ccdb92754d2"],
  ["saltmarsh_harbour", false, "d1ab0ff86ad051176c76d953f812cd416817df902686c303509a31ebf4878287"],
  ["saltmarsh_conservatory", false, "5618d9a514e519d4276f541538a947b4f24947633223bbd49bdb51302de58b61"],
  ["saltmarsh_conservatory", true, "f068aee4f031b4c9037309b6c2486377a488c6978728bf3c585b0b5421a208e2"],
  ["route_8", false, "67f5a259c1fb6ec06c2e3f7f3a528f2b9609bb649ee8b8aa8a8a7dcfde06a2f3"],
  ["driftseed_isle", false, "abd56b85113f08f6e1da558610f197d0ed2eafcd6e75f0cfe3eab0ab9e2a84f8"],
  ["driftseed_conservatory", false, "a4a0722de881dd7048dd3e1b206cf3c4946b47913c03535d91f2a4e0efd765c7"],
  ["driftseed_vents", false, "d61c3b4962df2b565f1205200b18c8f581c9ac83720ef0019760fbc758e50fd0"],
];

describe("Chapter 6 environment geometry", () => {
  for (const [id, gate, expected] of BEFORE) {
    it(`preserves ${id} terrain (gate ${gate})`, async () => {
      const m = buildMap(WORLD.maps[id]);
      refreshLegend(m, { cons5_gate: gate });
      let layout = "";
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        const props = tileProps(tileAt(m, x, y));
        const walk = isWalkable(m, x, y);
        // The required 3x4 Lantern Tree adds one canopy row above the old
        // 3x3 oak, leaving the interactive plaque below it uncovered.
        // Its approach, scripts, shoreline and every warp remain unchanged.
        const treeCanopy = id === "saltmarsh_harbour" && y === 7 && x >= 33 && x <= 35;
        if (treeCanopy) expect(walk).toBe(false);
        layout += treeCanopy ? "." : props.water ? "~" : props.ledge ? "v" :
          walk ? props.encounter === "grass" ? "g" : props.encounter === "bog" ? "b" : "." : "#";
      }
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(layout));
      expect(Array.from(new Uint8Array(digest), (v) => v.toString(16).padStart(2, "0")).join("")).toBe(expected);
    });
  }
});
