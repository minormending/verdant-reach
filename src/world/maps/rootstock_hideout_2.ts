import type { MapDef } from "../../contracts";
import { LEGEND, when } from "../build";

export const rootstock_hideout_2: MapDef = {
  id: "rootstock_hideout_2", name: "HIDEOUT B2", outdoor: false, music: "sugarbush_grove", ambient: "none",
  border: "void", legend: LEGEND,
  tiles: [
    "WWWWWWWWWWWWWWWWWW",
    "WttttttttttttttttW",
    "Wttt[[[[[ttttttEtW",
    "WttttttttttttttttW",
    "WttttttttttxtttttW",
    "WttttttttttttttttW",
    "WttttttttttttttttW",
    "WttttttttttttttttW",
    "WttttttttttttttttW",
    "WttttttttttttttttW",
    "WttttttttttttttttW",
    "WttttttttttttttttW",
    "WttttttttttttttttW",
    "WttttttttttttttttW",
    "WtUttttttttttttttW",
    "WWWWWWWWWWWWWWWWWW",
  ],
  legendWhen: [{ when: when({ beat_calloway: false }), legend: { E: "wall" } }],
  structures: [],
  warps: [
    { x: 2, y: 14, to: "rootstock_hideout_1", toX: 21, toY: 3, facing: "down" },
    // No reverse town warp: Calloway's escape tunnel is one-way.
    { x: 15, y: 2, to: "larchmere", toX: 30, toY: 23, facing: "down" },
  ],
  npcs: [{ id: "calloway", sprite: "researcher", x: 8, y: 5, facing: "down", script: "calloway" }],
  signs: [], triggers: [{ x: 11, y: 4, script: "ch7_files" }],
};
