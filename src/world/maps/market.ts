import type { MapDef } from "../../contracts";

// Both shop sizes retain the counter tiles under table props: the interaction
// engine checks those tiles to talk to the clerk from two tiles away.
export function marketInterior(wide = false): Pick<MapDef, "tiles" | "structures"> {
  if (!wide) return {
    tiles: [
      "W¤¤¤¤¤¤¤¤W",
      "W¤¤¤¤¤¤¤¤W",
      "WtCttttttW",
      "WtCttttttW",
      "WtCttttttW",
      "WttttttttW",
      "WttttttttW",
      "WWWWEWWWWW",
    ],
    structures: [
      { key: "prop_shop_shelf", x: 2, y: 0 },
      { key: "prop_window", x: 5, y: 0 },
      { key: "prop_shop_shelf", x: 7, y: 0 },
      { key: "prop_table_small", x: 2, y: 2 },
      { key: "prop_table_small", x: 2, y: 3 },
      { key: "prop_table_small", x: 2, y: 4 },
      { key: "prop_display_case", x: 5, y: 4 },
      { key: "prop_rug_small", x: 4, y: 5 },
      { key: "prop_table_small", x: 2, y: 6 },
      { key: "prop_plant_small", x: 1, y: 6 },
      { key: "prop_plant_small", x: 8, y: 5 },
      { key: "prop_plant_small", x: 8, y: 6 },
    ],
  };
  return {
    tiles: [
      "W¤¤¤¤¤¤¤¤¤¤¤¤W",
      "W¤¤¤¤¤¤¤¤¤¤¤¤W",
      "WtttCttttCtttW",
      "WCCCttttttCCCW",
      "WttttttttttttW",
      "WttttttttttttW",
      "WttttttttttttW",
      "WttttttttttttW",
      "WWWWWWEEWWWWWW",
    ],
    structures: [
      { key: "prop_window", x: 1, y: 0 },
      { key: "prop_shop_shelf", x: 4, y: 1 },
      { key: "prop_window", x: 6, y: 0 },
      { key: "prop_shop_shelf", x: 8, y: 1 },
      { key: "prop_window", x: 11, y: 0 },
      ...[1, 2, 3, 10, 11, 12].map((x) => ({ key: "prop_table_small" as const, x, y: 3 })),
      { key: "prop_display_case", x: 6, y: 4 },
      { key: "prop_rug_small", x: 6, y: 6 },
      { key: "prop_table_small", x: 2, y: 7 },
      { key: "prop_chair", x: 3, y: 6 },
      { key: "prop_chair", x: 10, y: 6 },
      { key: "prop_table_small", x: 11, y: 7 },
      { key: "prop_plant_small", x: 1, y: 7 },
      { key: "prop_plant_small", x: 12, y: 7 },
    ],
  };
}
