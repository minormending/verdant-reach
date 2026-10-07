import type { MapDef } from "../../contracts";
import { OUTDOOR, ifFlags, ifNight, lockedDoor, say, when, type Scripts } from "../build";

// GLASSHOUSE CITY: a whole city under one glass dome. The dome's foot is a
// ring of glass wall, planted inside with palms and evergreens.
//  - North: the ROOT RELAY and its listening mast (west), FLORA VANCE's ROSE
//    CONSERVATORY between two rose gardens (centre, up an avenue of lamps),
//    and the PALM HOUSE (east).
//  - Middle: the fountain square, railed in iron, with four palm lawns and
//    listening post 2. The GREENHOUSE to the west, by the ROUTE 4 gate; the
//    big MARKET to the east, with a row of street stalls before it.
//  - South: a boulevard; the NURSERY GARDEN and its plots (west), a lily pool,
//    three townhouses (east), and the south gate to ROUTE 5.
// `outdoor` so the sky's day/night tint shows through the glass.
export const glasshouse_city: MapDef = {
  id: "glasshouse_city",
  name: "GLASSHOUSE CITY",
  outdoor: true,
  music: "glasshouse_city",
  border: "glass_wall",
  // Structures sit on paving here: the city is paved right up to the walls.
  legend: { ...OUTDOOR, "@": "paving" },
  ambient: "pollen",
  tiles: [
    // x: 0         1         2         3
    // x: 0123456789012345678901234567890123456789
    "IIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII", // 0 the dome rests on a glass wall
    "IlTTlTTlTTlTTlTTlTTlTTlTTlTTlTTlTTlTTlTI", // 1
    "IT...........))))@@@@@@))))..l.......lTI", // 2 ROOT RELAY + mast | ROSE CONSERVATORY | PALM HOUSE
    "Il.@@@@@@.@..))))@@@@@@))))....@@@@@@.lI", // 3
    "IT.@@@@@@.@y..y.6@@@@@@6.y...l.@@@@@@.TI", // 4
    "IT.@@@@@@.@..))))@@@@@@))))....@@@@@@.TI", // 5
    "Il.@@@@@@S.*....6--------6...l.@@@@@@.lI", // 6
    "IT.--------......--------...*.--------TI", // 7
    "IT-l--6----------6-----l--6----6--l---TI", // 8
    "Il.*.y.f....|||||||--|||||||..........lI", // 9 the fountain square, railed
    "IT..@@@@.Y..|-..*.----.*..-|..........TI", // 10
    "ITf.@@@@....|-.l..----..l.-|Y.@@@@@@..TI", // 11
    "Il..@@@@.9..|-!...----....-|..@@@@@@.7lI", // 12
    "IT..----....|---69-----6---|S.@@@@@@.8TI", // 13
    "IT...--.....|-----@@@------|..@@@@@@..TI", // 14
    "I6----------------@@@-----------------lI", // 15 west gate (ROUTE 4) at 0,16-17
    "------------------@@@--------$$-$$-$$-TI", // 16 market stalls
    "----------------6-----96--------------TI", // 17
    "I6------------....----....-|l-9--l--9llI", // 18
    "IT.l.*..l.y.|-.l..----..l.-|----------TI", // 19
    "IT..f.l...*.|-.y..----..*.-|---Y---Y--TI", // 20
    "Il.y...*..l.||||||||--||||||l--------llI", // 21
    "IT..*.y..f..*.y....--.*..f..y..*..*...TI", // 22
    "IT--------------------------------------", // 23 the south boulevard
    "Il.f.-...#######*y.---................lI", // 24
    "IT.@@@@@.#GkGkG#...--..@@@@..@@@@.@@@@TI", // 25 NURSERY GARDEN | townhouses
    "IT.@@@@@.#GkGkG#l..--.f@@@@.m@@@@Y@@@@TI", // 26
    "Il.@@@@@.###N###...--.y@@@@..@@@@.@@@@lI", // 27
    "IT...-...f.*.y.f...--..@@@@..@@@@.@@@@TI", // 28
    "IT...-....^^^^^....------------------.TI", // 29 lily pool
    "Il.*y-.f.^^^^^^^...--.||||||--||||||||lI", // 30
    "IT.9.-.Y..^^^^^....---^^^^^^22^^^^^^^^TI", // 31
    "IT...-----------------^^^^^^22^^^^^^^^TI", // 32
    "Il.................--...l...--...l..l.lI", // 33
    "IlTTlTTlTTlTTlTTlTT--TlTTlTTlTTlTTlTTlTI", // 34
    "IIIIIIIIIIIIIIIIIII--IIIIIIIIIIIIIIIIIII", // 35 south gate (ROUTE 5) at 19-20,35
  ],
  structures: [
    { key: "relay_station", x: 3, y: 3 },      // door 5,6
    { key: "relay_mast", x: 10, y: 3 },
    { key: "rose_conservatory", x: 17, y: 2 }, // door 20,5
    { key: "palm_house", x: 31, y: 3 },        // door 34,6
    { key: "greenhouse", x: 4, y: 10 },        // door 6,12
    { key: "fountain", x: 18, y: 14 },
    { key: "market_large", x: 30, y: 11 },     // door 33,14
    { key: "nursery_garden", x: 3, y: 25 },    // door 5,27
    { key: "city_house", x: 23, y: 25 },       // door 24,28: the GLAZIER's house
    { key: "city_house", x: 29, y: 25 },       // door 30,28 (locked)
    { key: "city_house", x: 34, y: 25 },       // door 35,28 (locked)
  ],
  warps: [
    { x: 39, y: 23, to: "route_10", toX: 1, toY: 10, facing: "right" },
    { x: 0, y: 16, to: "route_4", toX: 50, toY: 12, facing: "left" },
    { x: 0, y: 17, to: "route_4", toX: 50, toY: 13, facing: "left" },
    { x: 19, y: 35, to: "route_5", toX: 14, toY: 1, facing: "down" },
    { x: 20, y: 35, to: "route_5", toX: 15, toY: 1, facing: "down" },
    { x: 5, y: 6, to: "glasshouse_relay", toX: 9, toY: 13, facing: "up" },
    { x: 20, y: 5, to: "glasshouse_conservatory", toX: 7, toY: 16, facing: "up" },
    { x: 34, y: 6, to: "palm_house", toX: 12, toY: 18, facing: "up" },
    { x: 6, y: 12, to: "glasshouse_greenhouse", toX: 5, toY: 7, facing: "up" },
    { x: 33, y: 14, to: "glasshouse_market", toX: 6, toY: 7, facing: "up" },
    { x: 5, y: 27, to: "glasshouse_nursery", toX: 4, toY: 7, facing: "up" },
    { x: 24, y: 28, to: "glasshouse_house", toX: 4, toY: 6, facing: "up" },
  ],
  npcs: [
    { id: "east_gate_guard", sprite: "hiker", x: 38, y: 23, facing: "left", script: "ch9_east_gate", visibleWhen: when({ ch8_done: false }) },
    { id: "grunt_r0_1", sprite: "grunt", x: 4, y: 7, facing: "down", trainer: "grunt_r0_1", sight: 2,
      visibleWhen: when({ ch8_started: true, beat_wren: false }) },
    { id: "grunt_r0_2", sprite: "grunt", x: 6, y: 7, facing: "down", trainer: "grunt_r0_2", sight: 2,
      visibleWhen: when({ ch8_started: true, beat_wren: false }) },
    // Story (docs/CH4_IDS.md). The grey coat at the mast, after the RELAY.
    { id: "watcher", sprite: "grunt", x: 11, y: 8, facing: "up", movement: "static", script: "ch4_watcher",
      visibleWhen: [{ flag: "relay_listened", is: true }, { flag: "ch4_grunt_seen", is: false }] },
    // FAN MAIL: FLORA's most devoted admirer, outside her CONSERVATORY.
    { id: "fan", sprite: "gentleman", x: 25, y: 7, facing: "left", movement: "look_around", script: "q_fan_mail" },
    { id: "pip", sprite: "pip", x: 23, y: 19, facing: "down", movement: "look_around", script: "gc_pip" },
    // FLORA's fans and the GAZETTE on the avenue.
    { id: "reporter", sprite: "reporter", x: 18, y: 7, facing: "up", movement: "look_around", script: "gc_reporter" },
    { id: "fan_a", sprite: "florist", x: 21, y: 7, facing: "up", movement: "static", script: "gc_fan_a" },
    { id: "fan_b", sprite: "schoolkid", x: 16, y: 8, facing: "up", movement: "look_around", script: "gc_fan_b" },
    { id: "researcher", sprite: "researcher", x: 7, y: 8, facing: "down", movement: "look_around", script: "gc_researcher" },
    { id: "elder", sprite: "elder", x: 18, y: 13, facing: "down", movement: "static", script: "gc_elder" },
    { id: "stallholder", sprite: "villager_a", x: 34, y: 16, facing: "down", movement: "static", script: "gc_stallholder" },
    { id: "gardener", sprite: "gardener", x: 8, y: 20, facing: "left", movement: "wander", script: "gc_gardener" },
    { id: "resident", sprite: "villager_b", x: 33, y: 29, facing: "down", movement: "look_around", script: "gc_resident" },
    { id: "kid", sprite: "kid", x: 12, y: 28, facing: "down", movement: "wander", script: "gc_kid" },
    { id: "cat", sprite: "cat", x: 27, y: 26, facing: "down", movement: "static", script: "gc_cat" },
    { id: "dog", sprite: "dog", x: 16, y: 31, facing: "left", movement: "wander", script: "gc_dog" },
    { id: "bird", sprite: "bird", x: 30, y: 9, facing: "left", movement: "wander", script: "gc_bird" },
    { id: "bush:gc_rosehip_garden", sprite: "harvest_bush", x: 15, y: 4, facing: "down", movement: "static", script: "bush_gc_rosehip_garden" },
  ],
  hidden: [
    // In the east rose garden, under the flowers.
    { x: 25, y: 4, item: "plant_food" },
    // At the bottom of the lily pool, among the wishing coins.
    { x: 12, y: 31, item: "glass_pod" },
  ],
  signs: [
    { x: 9, y: 6, text: "ROOT RELAY. Quiet, please: the valley is talking." },
    { x: 28, y: 13, text: "GLASSHOUSE MARKET. Two counters, one roof. Open all hours." },
    { x: 28, y: 26, text: "A mailbox. It's stuffed with seed catalogues." },
    { x: 30, y: 16, text: "Cut tulips. Once, one tulip bulb was worth more than a house." },
    { x: 33, y: 16, text: "Potted cacti. A card: \"Water monthly. Love daily.\"" },
    { x: 36, y: 16, text: "Bananas from the PALM HOUSE. A banana plant is a giant herb, not a tree." },
  ],
  triggers: [
    // The engine checks warps before triggers: guard the sole approach below the door.
    { x: 5, y: 7, script: "ch8_relay_door", when: when({ ch8_started: true, got_keycard: false }) },
    // Closed until the RELAY's open day is over (the door has a real warp).
    { x: 20, y: 6, script: "ch4_conservatory_closed", when: [{ flag: "relay_listened", is: false }] },
    // LISTENING POSTS: post 2 stands on the square's north-west lawn (press A facing it).
    { x: 14, y: 12, script: "q_relay_sensors_post_2" },
    { x: 30, y: 28, script: "gc_door_b" },
    { x: 35, y: 28, script: "gc_door_c" },
  ],
  onEnter: "gc_enter",
};

const call = (script: string) => ({ op: "call" as const, script });

export const scripts: Scripts = {
  // First arrival -> the grey coat at the mast (leaving the RELAY) -> the chapter end
  // (leaving the CONSERVATORY with the ROSE MARK). Narrative owns the called scripts.
  gc_enter: [
    ifFlags({ ch7_done: true, ch8_started: false }, [call("ch8_arrival")]),
    ifFlags({ gc_arrival_seen: false }, [call("ch4_city_arrival")], [
      ifFlags({ relay_listened: true, ch4_grunt_seen: false }, [call("ch4_grunt_watch")], [
        ifFlags({ beat_flora: true, relay_listened: true, ch4_done: false }, [call("ch4_end")]),
      ]),
    ]),
  ],
  gc_pip: [
    say("<PLAYER>! The first giant glasshouses were built for ONE plant!"),
    say("A water lily with leaves so big they can hold up a child!"),
    say("The ribs under the leaf gave a gardener the idea for the roof! Look up!"),
  ],
  gc_reporter: [
    ifFlags({ beat_flora: true }, [
      say("FLORA VANCE, beaten in her own CONSERVATORY! Hold the front page!"),
      say("Any comment? No? \"The champion was too modest to speak.\" Lovely."),
    ], [
      say("GLASSHOUSE GAZETTE. I'm here for FLORA. I'm always here for FLORA."),
      say("Last week she wore a hat made of real roses. Sold out the paper."),
    ]),
  ],
  gc_fan_a: [
    ifFlags({ beat_flora: true }, [
      say("You beat FLORA? I don't know whether to cry or ask for your autograph."),
    ], [
      say("FLORA signed my trowel once. I've never dug with it since."),
    ]),
  ],
  gc_fan_b: [
    say("FLORA's roses have FORTY petals. Wild roses only have five!"),
    say("When I grow up I want forty petals."),
  ],
  gc_researcher: [
    ifFlags({ ch8_started: true, beat_wren: false }, [
      say("TODO(text): The sensor plants have stopped moving.", "RESEARCHER"),
    ], [
      ifFlags({ relay_listened: true }, [
        say("The needles all swung at once. I've checked the wiring twice."),
        say("The wiring is fine. That's what worries me."),
      ], [
        say("Open day at the RELAY! We bury sensors among the roots and listen."),
        say("The valley's trees trade sugar and news underground. We eavesdrop."),
      ]),
    ]),
  ],
  gc_elder: [
    ifNight(
      [say("The fountain sounds louder at night. Or the city's just quieter.")],
      [say("Rain off the dome fills this fountain. It's never once run dry."),
        say("The glass catches every drop. Waste nothing, the builders said.")],
    ),
  ],
  gc_stallholder: [
    say("Pineapples from the PALM HOUSE! One plant, two years, ONE fruit."),
    say("So no squeezing them, please."),
  ],
  gc_gardener: [
    ifFlags({ ch8_started: true, beat_wren: false }, [
      say("TODO(text): My plant will not move.", "GARDENER"),
    ], [
      say("No wind under the dome, so no seeds blow in. No weeds!"),
      say("...Almost no weeds. Dandelions always find a way."),
    ]),
  ],
  gc_resident: [
    ifFlags({ ch8_started: true, beat_wren: false }, [
      say("TODO(text): Every plant on my sill stands frozen.", "RESIDENT"),
    ], [
      ifNight(
        [say("Hear that? The RELAY's mast hums at night. Louder since the bloom.")],
        [say("I moved here for the weather. It's always June under the glass.")],
      ),
    ]),
  ],
  gc_kid: [
    say("I threw a coin in the lily pool and wished for a QUICKENED. Nothing yet."),
  ],
  gc_cat: [
    say("A cat sits on the warm step, watching the pool's goldfish with deep longing."),
  ],
  gc_dog: [
    say("The dog has found the only patch of mud in the whole city. It is thrilled."),
  ],
  gc_bird: [
    say("A sparrow, born under the glass. It's never once flown in the rain."),
  ],
  bush_gc_rosehip_garden: [
    say("A rambling rose in the CONSERVATORY garden, heavy with hips."),
    { op: "harvest", id: "gc_rosehip_garden", item: "rose_hip", qty: 2 },
  ],
  gc_door_b: lockedDoor("Locked. Through the letterbox: the smell of baking bread."),
  gc_door_c: lockedDoor("Locked. A note on the door: \"Gone to the RELAY open day.\""),
};
