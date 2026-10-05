import type { MapDef } from "../../contracts";
import { LEGEND, ifFlags, ifNight, say, type Scripts } from "../build";

// The cottage <PLAYER> shares with JUNE. Bed and bookshelves by the west wall,
// the hearth in the middle of the back wall with the rug in front of it, and
// JUNE's kitchen corner: stove, worktop and the long table under the window.
//
//            0123456789
export const player_home: MapDef = {
  id: "player_home",
  name: "HOME",
  outdoor: false,
  music: "fallowfield",
  border: "void",
  legend: LEGEND,
  tiles: [
    "WWOOWWWOOW", // 0
    "WKKKwFwVCW", // 1
    "WZwwwwwwwW", // 2
    "WhwrrrwwDW", // 3
    "WwwrrrwwDW", // 4
    "WDwrrrwhDW", // 5
    "WwwwwwwwKW", // 6
    "WWWWEWWWWW", // 7
  ],
  structures: [],
  warps: [{ x: 4, y: 7, to: "fallowfield", toX: 3, toY: 7, facing: "down" }],
  npcs: [
    // The morning scene walks JUNE up 2, left 4 to stand beside the bed (3,2).
    { id: "june", sprite: "villager_a", x: 7, y: 4, facing: "left", movement: "static", script: "home_june" },
  ],
  signs: [],
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
