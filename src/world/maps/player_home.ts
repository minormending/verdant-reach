import type { MapDef } from "../../contracts";
import { LEGEND, ifFlags, ifNight, say, type Scripts } from "../build";

// The player's cottage: bed, bookshelves, kitchen table, and JUNE the housemate.
export const player_home: MapDef = {
  id: "player_home",
  name: "HOME",
  outdoor: false,
  music: "fallowfield",
  border: "void",
  legend: LEGEND,
  tiles: [
    "WWOOWWWOOW", // 0
    "WZwwwKKwpW", // 1
    "WwwwwwwwwW", // 2
    "WwwwDDwwwW", // 3
    "WwwwDDwwwW", // 4
    "WwwwwwwwwW", // 5
    "WpwwrrwwpW", // 6
    "WWWWEWWWWW", // 7
  ],
  structures: [],
  warps: [{ x: 4, y: 7, to: "fallowfield", toX: 4, toY: 6, facing: "down" }],
  npcs: [
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
      ifNight(
        [say("Out late again? Your QUICKENED look thirsty.", "JUNE")],
        [say("Back for a breather? Your QUICKENED look thirsty.", "JUNE")],
      ),
      { op: "yesno", prompt: "Let JUNE water them?", yes: [
        say("There. A drink and a sunny sill. Good as new.", "JUNE"),
        { op: "heal" },
        say("Off you go. Mind the brambles!", "JUNE"),
      ], no: [say("Suit yourself. The watering can's here.", "JUNE")] },
    ], [
      say("DR. VALE said, and I quote: \"The greenhouse moved.\"", "JUNE"),
      say("Then she hung up. Better go see what that means.", "JUNE"),
    ]),
  ],
};
