import type { MapDef } from "../../contracts";
import { OUTDOOR, when } from "../build";

export const thistledown: MapDef = {
  id: "thistledown", name: "THISTLEDOWN", outdoor: true, music: "small_town", ambient: "leaves",
  // A desert-edge town under red cliffs ("A"): sand streets through baked clay
  // ("c"), and green only where the wind pump's water reaches.
  border: "red_rock", legend: { ...OUTDOOR, A: "red_rock", c: "cracked_earth", "@": "sand" },
  tiles: [
    "AAAAAAAAAAAAAAccAAAAAAAAAAAAAA",
    "AAAAccccAAAAAcccccAAAAAAAAAAAA",
    "AAccccccccAAccssccccccAAAAAAAA",
    "Accc@@@@ccccccsscAAccccccAAAAA",
    "Accc@@@@ccccccssccccccccccAAAA",
    "Accc@@@@ccccccssccccccccccAAAA",
    "A*.sssss.yssssssccccccccAAAAAA",
    "A..sssssy.sssssssssscccccAAccA",
    "Accc@@@@ccccccsscccc@@@@cccccA",
    "Accc@@@@ccccccsscccc@@@@ccccAA",
    "Accc@@@@ccccccsscccc@@@@ccccAA",
    "AccsssssssssssssssssssssssccAA",
    "Accccccccsssssssssssss######cA",
    "AcAAccccsss@@sssss$$$s#.....cA",
    "AcAAAcccsss@@sssssssssNkkkkk.A",
    "Acccccccsss@@sssssssss#kkkkk.A",
    "Acccccccssssssssssssss#....78A",
    "cssssssssssssssssssssssssssscA",
    "Acccccccc6....ssl...96cccccccA",
    "AAccccccc.....ss.~~~..cccccccA",
    "AAAcccccc..S..ss.~~~q.ccccccAA",
    "AAAAcccccl....ss....l.cccccAAA",
    "AAAAAAccccccccsscccccccccAAAAA",
    "AAAAAAAAcccccccccccccccAAAAAAA",
    "AAAAAAAAccccccccccccccAAAAAAAA",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  ],
  structures: [
    { key: "greenhouse", x: 4, y: 8 }, { key: "market", x: 20, y: 8 }, { key: "adobe_house", x: 4, y: 3 }, // the WINDOW PANES botanist
    { key: "windmill_pump", x: 11, y: 13 }, // the square's wind pump
  ],
  warps: [
    { x: 0, y: 17, to: "route_10", toX: 48, toY: 10, facing: "left" },
    { x: 14, y: 0, to: "route_11", toX: 13, toY: 54, facing: "up" },
    { x: 15, y: 0, to: "route_11", toX: 14, toY: 54, facing: "up" },
    { x: 6, y: 10, to: "thistledown_greenhouse", toX: 5, toY: 7, facing: "up" },
    { x: 21, y: 10, to: "thistledown_market", toX: 6, toY: 7, facing: "up" },
    { x: 5, y: 5, to: "thistledown_house", toX: 4, toY: 6, facing: "up" },
  ],
  npcs: [{ id: "tumbleweed_sighting", sprite: "item_pickup", x: 3, y: 17, facing: "right", script: "ch9_tumbleweed", visibleWhen: when({ tumbleweed_seen: false }) }],
  signs: [
    { x: 11, y: 20, text: "THISTLEDOWN. The last sweet water before the red canyon." },
    { x: 18, y: 13, text: "A stall of dried chiles and prickly pear jam. Back soon, says a note." },
    { x: 19, y: 13, text: "Clay water jars, sealed with wax. They sweat to keep the water cool." },
    { x: 20, y: 13, text: "Dragon's blood resin, sold in red tears. A little goes a long way." },
  ],
  triggers: [], onEnter: "ch9_arrival",
};
