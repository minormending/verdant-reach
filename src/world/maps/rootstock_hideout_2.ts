import type { MapDef } from "../../contracts";
import { LEGEND, when } from "../build";

export const rootstock_hideout_2: MapDef = {
  id: "rootstock_hideout_2", name: "HIDEOUT B2", outdoor: false, music: "hideout", ambient: "none",
  border: "void",
  // Dark steel grate (t), riveted walls (W), server racks ([), cable runs (/) and consoles (x).
  legend: { ...LEGEND, W: "hideout_wall", t: "hideout_floor" },
  tiles: [
    "WWWWWWWWWWWWWWWWWW",
    "Wt[[[[[[[t[[[tt/tW",
    "WtttttttttttttWEWW",
    "W[tttttttttttttttW",
    "W[ttttttttDxDttttW",
    "WttttttttttttttttW",
    "Wtttttt////ttttttW",
    "Wtttttttt/tttttttW",
    "Wtt[[[[tt/t[[[[ttW",
    "Wtttttttt/tttttttW",
    "Wtttttttt/tttttttW",
    "Wtt[[[[tt/t[[[[ttW",
    "Wtttttttt/tttttt[W",
    "Wtttttttt/tttttD[W",
    "WtUttttttttttttttW",
    "WWWWWWWWWWWWWWWWWW",
  ],
  legendWhen: [
    { when: when({ beat_calloway: false }), legend: { E: "hideout_wall" } },
    { when: when({ files_read: false }), legend: { E: "hideout_wall" } },
  ],
  structures: [],
  warps: [
    { x: 2, y: 14, to: "rootstock_hideout_1", toX: 21, toY: 3, facing: "down" },
    // No reverse town warp: Calloway's escape tunnel is one-way.
    { x: 15, y: 2, to: "larchmere", toX: 30, toY: 23, facing: "down" },
  ],
  npcs: [{ id: "calloway", sprite: "calloway", x: 8, y: 5, facing: "down", script: "calloway", visibleWhen: when({ calloway_escaped: false }) }],
  signs: [], triggers: [{ x: 11, y: 4, script: "ch7_files" }],
};
