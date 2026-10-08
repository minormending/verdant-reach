import type { MapDef } from "../../contracts";
import { LEGEND, ifFlags, ifNight, say, type Scripts } from "../build";

// JUNE's cottage: books, a window and the hearth against the back wall,
// the bed in the west corner, a central rug and a tea table beside it.
// Two extra columns on the east leave room for the hearth without changing
// the morning scene's row-2 path, JUNE at 7,4, or the heal point at 6,4.
export const player_home: MapDef = {
  id: "player_home",
  name: "HOME",
  outdoor: false,
  music: "fallowfield",
  border: "void",
  legend: LEGEND,
  tiles: [
    "W¤¤¤¤¤¤¤¤¤¤W",
    "W¤¤¤¤¤¤¤¤¤¤W",
    "WwwwwwwwwwwW",
    "WwwwwwwwwwwW",
    "WwwwwwwwwwwW",
    "WwwwwwwwwwwW",
    "WwwwwwwwwwwW",
    "WWWWEWWWWWWW",
  ],
  structures: [
    { key: "prop_bookcase", x: 2, y: 0 },
    { key: "prop_window", x: 6, y: 0 },
    { key: "prop_painting", x: 4, y: 0 },
    { key: "prop_bed_single", x: 1, y: 3 },
    { key: "prop_rug_large", x: 3, y: 3 },
    { key: "prop_fireplace", x: 9, y: 0 },
    { key: "prop_bookcase", x: 8, y: 5 },
    { key: "prop_table_small", x: 8, y: 4 },
    { key: "prop_chair", x: 9, y: 3 },
    { key: "prop_plant_small", x: 10, y: 6 },
  ],
  warps: [{ x: 4, y: 7, to: "fallowfield", toX: 3, toY: 7, facing: "down" }],
  npcs: [
    // The morning scene walks JUNE up 2, left 4 to stand beside the bed (3,2).
    { id: "june", sprite: "villager_a", x: 7, y: 4, facing: "left", movement: "static", script: "home_june" },
  ],
  signs: [
    { x: 2, y: 1, text: "Your old school botany books. A pressed daisy marks the chapter on roots." },
    { x: 3, y: 1, text: "Seed catalogues, dog-eared at the tomatoes. JUNE has circled every one." },
    { x: 8, y: 6, text: "JUNE's jam shelf. BRAMBLE, BRAMBLE, ROSE HIP, and one jar labelled \"???\"." },
  ],
  triggers: [],
  onEnter: "home_enter",
  healPoint: { x: 6, y: 4 },
};

export const scripts: Scripts = {
  home_enter: [
    ifFlags({ prologue_done: true, morning_done: false }, [{ op: "call", script: "morning" }]),
  ],
  home_june: [
    ifFlags({ got_starter: true }, [
      ifFlags({ theft_seen: true, got_pods: false }, [
        say("Someone stole from VALE? From VALE? Brave or daft. Usually both.", "JUNE"),
      ], [
        ifNight(
          [say("Out this late? Your QUICKENED look parched.", "JUNE")],
          [say("Back for a breather? Your QUICKENED look parched.", "JUNE")],
        ),
      ]),
      { op: "yesno", prompt: "Let JUNE water them?", yes: [
        say("Rainwater from the barrel. Softer than tap water, and plants can tell.", "JUNE"),
        { op: "heal" },
        say("There. Good as new. Mind the brambles out there!", "JUNE"),
      ], no: [say("Suit yourself. The watering can's by the door.", "JUNE")] },
    ], [
      say("VALE said, and I quote: \"The greenhouse moved.\"", "JUNE"),
      say("Then she hung up. You'd best go and see what that means.", "JUNE"),
    ]),
  ],
};
