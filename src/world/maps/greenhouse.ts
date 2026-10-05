import type { CharacterKey, MapDef, MapId } from "../../contracts";
import { LEGEND, ifFlags, ifNight, say, type Scripts } from "../build";

// The healing centre interior. Every town's GREENHOUSE shares the iconic
// shape: glass roof, a long counter with the keeper behind it under the grow
// beds, the SPECIMEN CABINET in the corner, a red runner to the door. Each
// town dresses its waiting nook differently.
const ROWS = {
  // BRAMBLEGATE: a reading corner with a bookshelf and a tea table.
  bramblegate: [
    // x: 0123456789A
    "WWOOOOOOOWW", // 0
    "WPPpgggpPPW", // 1  grow beds behind the keeper
    "WYgggggggYW", // 2  keeper at 5,2
    "WcCCCCCCCKW", // 3  counter; SPECIMEN CABINET at 1,3
    "WwwwggggggW", // 4  a wood-floored tea nook
    "WhDhgggggpW", // 5  tea table and chairs
    "WPggrrrggPW", // 6
    "WPpgrrrgpYW", // 7
    "WWWWWEWWWWW", // 8
  ],
  // SUGARBUSH: a warm stove, a maple in a pot and a cosy corner by the fire.
  sugarbush: [
    "WWOOOOOOOWW", // 0
    "WPPpgggpPPW", // 1
    "WYgggggggYW", // 2
    "WcCCCCCCCVW", // 3  stove at 9,3 (on the wood)
    "WwwwggggwwW", // 4  wood floor by the stove and the tea table
    "WhDhgggwwpW", // 5
    "WPggrrrggYW", // 6
    "WYpgrrrgpPW", // 7
    "WWWWWEWWWWW", // 8
  ],
  // GLASSHOUSE CITY: marble underfoot, a potted palm, a bench and the
  // newspaper rack (FLORA is on every front page).
  glasshouse: [
    "WWOOOOOOOWW", // 0
    "WPPpgggpPPW", // 1
    "WYgggggggYW", // 2
    "WcCCCCCCCKW", // 3  the newspaper rack at 9,3
    "WiiigggiiiW", // 4  a marble-floored waiting nook
    "WhDhgggii9W", // 5  tea table; a bench by the rack
    "WYggrrrggYW", // 6
    "WPpgrrrgpPW", // 7
    "WWWWWEWWWWW", // 8
  ],
};

export function greenhouseMap(
  id: MapId,
  name: string,
  rows: string[],
  exit: { to: MapId; x: number; y: number },
  visitor: { script: string; sprite: CharacterKey; x: number; y: number },
  signs: MapDef["signs"] = [],
): MapDef {
  return {
    id,
    name,
    outdoor: false,
    music: "greenhouse",
    border: "void",
    legend: LEGEND,
    tiles: rows,
    structures: [],
    warps: [{ x: 5, y: 8, to: exit.to, toX: exit.x, toY: exit.y, facing: "down" }],
    npcs: [
      { id: "keeper", sprite: "greenhouse_keeper", x: 5, y: 2, facing: "down", movement: "static", script: "greenhouse_heal" },
      { id: "visitor", sprite: visitor.sprite, x: visitor.x, y: visitor.y, facing: "left", movement: "look_around", script: visitor.script },
    ],
    signs,
    triggers: [],
    healPoint: { x: 5, y: 4 },
  };
}

export const bramblegate_greenhouse = greenhouseMap(
  "bramblegate_greenhouse", "GREENHOUSE", ROWS.bramblegate, { to: "bramblegate", x: 19, y: 6 },
  { script: "bg_gh_visitor", sprite: "hiker", x: 3, y: 5 },
  [{ x: 9, y: 3, text: "The GREENHOUSE guest book. The latest entry just says: \"thank you, lamps.\"" }],
);
export const sugarbush_greenhouse = greenhouseMap(
  "sugarbush_greenhouse", "GREENHOUSE", ROWS.sugarbush, { to: "sugarbush", x: 24, y: 12 },
  { script: "sb_gh_visitor", sprite: "villager_b", x: 3, y: 5 },
);

export const glasshouse_greenhouse = greenhouseMap(
  "glasshouse_greenhouse", "GREENHOUSE", ROWS.glasshouse, { to: "glasshouse_city", x: 6, y: 13 },
  { script: "gc_gh_visitor", sprite: "villager_a", x: 7, y: 4 },
  [{ x: 9, y: 3, text: "The GLASSHOUSE GAZETTE. \"FLORA VANCE: MY ROSES AND ME.\" Pages 1 to 9." }],
);

export const scripts: Scripts = {
  greenhouse_heal: [
    say("Welcome to the GREENHOUSE! Water, light and warm soil for weary QUICKENED."),
    { op: "yesno", prompt: "Shall I tend to your QUICKENED?", yes: [
      say("Into the light they go..."),
      { op: "heal" },
      say("All watered and perked up! Come back any time."),
    ], no: [
      say("Come back any time. The lamps are always on."),
    ] },
  ],
  bg_gh_visitor: [
    ifNight([
      say("The keeper leaves the grow lamps on all night. Plants count the dark, you know."),
      say("Too little dark and some won't flower at all."),
    ], [
      say("That SPECIMEN CABINET stores the QUICKENED you can't carry."),
      say("Six travel with you. The rest wait in soil and soft light."),
    ]),
  ],
  gc_gh_visitor: [
    ifFlags({ relay_listened: true }, [
      say("Did you feel the floor shake this morning? The ferns here all curled up."),
      say("They uncurled a minute later. Ferns don't DO that."),
    ], [
      say("It never frosts under the dome. Bananas ripen in the PALM HOUSE in winter."),
      say("Glass lets the sunlight in and keeps the warmth from leaving. That's the trick."),
    ]),
  ],
  sb_gh_visitor: [
    ifFlags({ grove_cleared: true }, [
      say("My maple sprout perked right up today. Did you do that? Thank you!"),
    ], [
      say("I brought my maple sprout in. Its leaves went limp, like it had lost blood."),
      say("The keeper says it's sap. Something's draining the whole grove."),
    ]),
  ],
};
