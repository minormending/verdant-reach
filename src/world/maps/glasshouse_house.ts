import type { MapDef } from "../../contracts";
import { LEGEND, ifFlags, ifNight, say, type Scripts } from "../build";

// A townhouse on the south lane: the GLAZIER's family. He fitted half the
// dome's panes; his workbench still holds a pane, half puttied. His grandson
// keeps a jar of "Quickened" cuttings on the sill.
export const glasshouse_house: MapDef = {
  id: "glasshouse_house",
  name: "GLASSHOUSE CITY",
  outdoor: false,
  music: "glasshouse_city",
  border: "void",
  legend: LEGEND,
  tiles: [
    // x: 0123456789
    "WWOOWWOOWW", // 0
    "WKKwFwwJZW", // 1 bookshelves, the fireplace, a glazier's bench, a bed
    "WwwwwwwwwW", // 2
    "WhDhwwwwpW", // 3
    "WhDhwrrwwW", // 4
    "WwwwwrrwYW", // 5
    "WpwwwrrwwW", // 6
    "WWWWEWWWWW", // 7
  ],
  structures: [],
  warps: [{ x: 4, y: 7, to: "glasshouse_city", toX: 24, toY: 29, facing: "down" }],
  npcs: [
    { id: "glazier", sprite: "elder", x: 6, y: 2, facing: "down", movement: "look_around", script: "gh_glazier" },
    { id: "grandson", sprite: "kid", x: 7, y: 5, facing: "left", movement: "wander", script: "gh_grandson" },
  ],
  signs: [
    { x: 7, y: 1, text: "A pane of glass, half puttied into a cast-iron frame. The putty smells of linseed." },
    { x: 1, y: 1, text: "\"THE GREAT GLASSHOUSES\". Someone has underlined every page about cast iron." },
  ],
  triggers: [],
};

export const scripts: Scripts = {
  gh_glazier: [
    say("Forty years I glazed that dome. Nine thousand panes, give or take."),
    say("Old glasshouses were built like ships. Iron ribs, glass for sails."),
    ifNight(
      [say("At night the dome ticks as it cools. Like a clock with no hands.")],
      [ifFlags({ relay_listened: true }, [
        say("This morning every pane rang, all at once. Like a struck bell."),
        say("Forty years, and I never heard it do that."),
      ], [
        say("A cracked pane rings flat, you know. I can hear one from the street."),
      ])],
    ),
  ],
  gh_grandson: [
    say("I'm growing cuttings in a jar! You snip a stem and it grows new roots."),
    say("Grandad says it's the same plant, just in two places. Spooky."),
  ],
};
