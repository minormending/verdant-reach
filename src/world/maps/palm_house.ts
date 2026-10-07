import type { MapDef } from "../../contracts";
import { LEGEND, ifNight, pickups, say, when, type Scripts } from "../build";

// The PALM HOUSE: a tropical glasshouse inside the dome. Hot, wet and loud
// with dripping. Undergrowth (tropical grass) fills every corner under the
// palms, with a lotus pool in the middle. A raised boardwalk crosses the pool
// east to west; the muddy margin is where LOTUS SEEDS sit. A ring of paths
// runs round the pool. Listening post 3 stands in the north-east thicket.
// MOTH ORCHIDS (KEIKI) are out at night; a BIRD OF PARADISE shoot is rare.
export const palm_house: MapDef = {
  id: "palm_house",
  name: "PALM HOUSE",
  outdoor: false,
  music: "palm_house",
  border: "void",
  legend: LEGEND,
  ambient: "mist",
  tiles: [
    // x: 0         1         2
    // x: 012345678901234567890123
    "IIIIIIIIIIIIIIIIIIIIIIII", // 0
    "Il;;;;l..Yl;;;;l..Y;;;lI", // 1
    "I;;;;;;g.g;;;;;;;gg;;;;I", // 2
    "I;;l;;;ggg;;l;;;;;g;;l;I", // 3
    "Il;;;;gg..;;;;;;;!g;;;;I", // 4
    "I;;;;gg.bbbbbbbbb.gg;;lI", // 5
    "Il;;gg.bb0~~~~0~bb.g;;;I", // 6
    "I;;;g.bb~~~~~~~~~bb.g;;I", // 7
    "I;l;g.b~~0~~~~~~0~b.gl;I", // 8
    "I;;;g===============g;;I", // 9
    "I;;;g.b~~~~0~~~~~~b.g;;I", // 10
    "Il;;g.bb~~~~~~0~~bb.g;lI", // 11
    "I;;;gg.bb~0~~~~~bb.gg;;I", // 12
    "I;;l;gg.bbbbbbbbb.gg;;;I", // 13
    "I;;;;;gg.........gg;l;;I", // 14
    "Il;;;;;ggggg.ggggg;;;;lI", // 15
    "I;;;;l;;Y..ggg..Y;;l;;;I", // 16
    "IYp;;;;;;..ggg..;;;;;pYI", // 17
    "IYYpl;;;;..grg..;;;lpYYI", // 18
    "IIIIIIIIIIIIEIIIIIIIIIII", // 19
  ],
  structures: [],
  warps: [{ x: 12, y: 19, to: "glasshouse_city", toX: 34, toY: 7, facing: "down" }],
  encountersWhen: [{ when: when({ ch8_started: true, beat_wren: false }), encounters: {} }],
  npcs: [
    { id: "director_hiding", sprite: "researcher", x: 10, y: 16, facing: "down", movement: "static", script: "ch8_director",
      visibleWhen: when({ ch8_started: true, got_keycard: false }) },
    { id: "lin", sprite: "researcher", x: 9, y: 14, facing: "right", trainer: "researcher_lin", sight: 4 },
    { id: "amaryl", sprite: "florist", x: 20, y: 12, facing: "left", trainer: "florist_amaryl", sight: 2 },
    { id: "keeper", sprite: "gardener", x: 8, y: 2, facing: "down", movement: "look_around", script: "ph_keeper" },
    { id: "visitor", sprite: "villager_b", x: 15, y: 16, facing: "left", movement: "look_around", script: "ph_visitor" },
    { id: "bird", sprite: "bird", x: 7, y: 15, facing: "right", movement: "wander", script: "ph_bird" },
    ...pickups([
      { item: "glass_pod", x: 22, y: 2 },
      { item: "spring_water", x: 2, y: 13 },
    ]),
  ],
  hidden: [
    // In the potted palm by the north door.
    { x: 9, y: 1, item: "plant_food" },
    // Snagged on a lily pad at the pool's north edge.
    { x: 14, y: 6, item: "compost" },
  ],
  signs: [],
  triggers: [
    // LISTENING POSTS: a sensor head in the north-east thicket (press A facing it).
    { x: 17, y: 4, script: "q_relay_sensors_post_3" },
  ],
  encounters: {
    grass: {
      rate: 14,
      slots: [
        { species: "orchid_keiki", minLevel: 15, maxLevel: 15, weight: 20, time: "day" },
        { species: "orchid_keiki", minLevel: 15, maxLevel: 15, weight: 45, time: "night" },
        { species: "monstera_cutting", minLevel: 15, maxLevel: 19, weight: 45, time: "day" },
        { species: "monstera_cutting", minLevel: 15, maxLevel: 19, weight: 35, time: "night" },
        { species: "lotus_seed", minLevel: 15, maxLevel: 18, weight: 12, time: "day" },
        { species: "lotus_seed", minLevel: 15, maxLevel: 18, weight: 10, time: "night" },
        { species: "paradise_shoot", minLevel: 16, maxLevel: 19, weight: 3, time: "day" },
      ],
    },
    // The pool's muddy margin: lotus country.
    bog: {
      rate: 12,
      slots: [
        { species: "lotus_seed", minLevel: 15, maxLevel: 19, weight: 75 },
        { species: "monstera_cutting", minLevel: 15, maxLevel: 18, weight: 15 },
        { species: "orchid_keiki", minLevel: 15, maxLevel: 15, weight: 10, time: "night" },
        { species: "paradise_shoot", minLevel: 16, maxLevel: 18, weight: 3, time: "day" },
      ],
    },
  },
};

export const scripts: Scripts = {
  ph_keeper: [
    say("Mind the drips. We mist this place six times a day."),
    say("MONSTERA leaves grow holes as they age. Maybe to let the wind through."),
    ifNight(
      [say("Hear the hum? The moth orchids are out. They like the dark best.")],
      [say("Keep your voice down near the pool. The lotuses are listening. Probably.")],
    ),
  ],
  ph_visitor: [
    say("Lotus leaves never get wet. The water beads and rolls right off."),
    say("It takes the dirt with it. Self-cleaning! I want that for my windows."),
  ],
  ph_bird: [
    say("A tiny green bird sips from a hanging flower, hovering. Show-off."),
  ],
};
