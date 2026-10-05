import type { MapDef } from "../../contracts";
import { LEGEND, ifFlags, say, when, type Scripts } from "../build";

// The ROOT RELAY: a university listening station. A lobby with a reception
// desk, a reading table and the server racks humming along the east wall;
// north, through a doorway, the LISTENING ROOM: consoles round the walls and
// the felt-lined LISTENING DESK in the middle, where the seed goes.
// Stepping into the listening room starts the open day beat (ch4_relay_listen).
// FLORA leaves by the staff door (13,6) at its end; the passage behind is a
// dead-end cupboard, closed off from the lobby.
export const glasshouse_relay: MapDef = {
  id: "glasshouse_relay",
  name: "ROOT RELAY",
  outdoor: false,
  music: "root_relay",
  border: "void",
  legend: LEGEND,
  tiles: [
    // x: 0         1
    // x: 012345678901234567
    "WOOWWOOWWWWOOWWOOW", // 0 the LISTENING ROOM
    "W[[x/xxx//xxx/x[[W", // 1 consoles along the back wall
    "W[//////////////[W", // 2
    "W////////////////W", // 3
    "W//x///xxxx///x//W", // 4 the LISTENING DESK at 7..10,4
    "WhD/////////////pW", // 5 the beat triggers on 7..8,5
    "WWWWWWW//WWWW/WWWW", // 6 doorway 7..8; staff door 13,6
    "WKKKiiiiiii[W/W[[W", // 7 the LOBBY; the staff passage (FLORA leaves this way)
    "Wiiiiiiiiiii[W[//W", // 8
    "WpiiDDiiiiii//i//W", // 9
    "WhiiDDiiiiii[[i[[W", // 10 server racks
    "WiiiiiiiiiiiiiiiiW", // 11
    "WYiCCCCiiiiiiii!pW", // 12 reception; a spare sensor head on show
    "WpiiiiiiirriiiiipW", // 13
    "WWWWWWWWWEEWWWWWWW", // 14
  ],
  structures: [],
  warps: [
    { x: 9, y: 14, to: "glasshouse_city", toX: 5, toY: 7, facing: "down" },
    { x: 10, y: 14, to: "glasshouse_city", toX: 5, toY: 7, facing: "down" },
  ],
  npcs: [
    // The open day (docs/CH4_IDS.md): the director, WREN and FLORA wait by the desk.
    { id: "relay_director", sprite: "researcher", x: 5, y: 4, facing: "right", movement: "static", script: "ch4_director" },
    { id: "wren", sprite: "wren", x: 11, y: 4, facing: "left", movement: "static", script: "q_relay_sensors" },
    { id: "flora", sprite: "flora_vance", x: 13, y: 3, facing: "left", movement: "static", script: "ch4_flora_relay",
      visibleWhen: when({ relay_listened: false }) },
    { id: "listener", sprite: "researcher", x: 2, y: 2, facing: "up", movement: "static", script: "rl_listener" },
    { id: "reception", sprite: "researcher", x: 4, y: 11, facing: "down", movement: "static", script: "rl_reception" },
    { id: "tech", sprite: "researcher", x: 15, y: 9, facing: "up", movement: "look_around", script: "rl_tech" },
    { id: "visitor", sprite: "villager_a", x: 7, y: 9, facing: "left", movement: "look_around", script: "rl_visitor" },
  ],
  signs: [
    { x: 3, y: 4, text: "A console. A slow green line, labelled ROOT NET: CALM." },
    { x: 14, y: 4, text: "A console. It's counting something. The number keeps going up." },
    { x: 8, y: 4, text: "The LISTENING DESK. A felt-lined cradle, just the size of a seed." },
    { x: 15, y: 12, text: "A spare SENSOR HEAD on a stand. \"Buried 2 m deep. Hears roots talk.\"" },
  ],
  triggers: [
    // The open day: step into the listening room.
    { x: 7, y: 5, w: 2, script: "ch4_relay_listen", when: when({ relay_listened: false }) },
  ],
};

export const scripts: Scripts = {
  rl_listener: [
    say("Shh. Headphones on. That crackle? Two oaks, sharing sugar."),
    say("The big one feeds the little one in the shade. Every summer."),
  ],
  rl_reception: [
    ifFlags({ relay_listened: true }, [
      say("Every phone in the building rang at once. Then the lights flickered."),
      say("The director says it was the weather. There's no weather under glass."),
    ], [
      say("Welcome to the ROOT RELAY open day! The LISTENING ROOM is straight up."),
      say("Please don't touch the consoles. Or the researchers."),
    ]),
  ],
  rl_tech: [
    say("These racks store every whisper the sensors pick up. Years of it."),
    say("Mostly it's roots asking each other for water. Very polite."),
  ],
  rl_visitor: [
    say("A forest's trees are wired together by fungus threads underground."),
    say("Somebody called it the WOOD WIDE WEB. I wish it had been me."),
  ],
};
