import type { MapDef } from "../../contracts";
import { OUTDOOR } from "../build";

export const route_10: MapDef = {
  id: "route_10", name: "ROUTE 10", outdoor: true, music: "route", ambient: "leaves",
  // Scrub country: baked clay ("c") and sand tracks, red rock outcrops ("A"),
  // the city's watered verge fraying into sand at the west gate.
  border: "red_rock", legend: { ...OUTDOOR, A: "red_rock", c: "cracked_earth", ",": "desert_scrub" },
  tiles: [
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "A.y....scccccccccccccccccccAcccccccccccccccccccccA",
    "A...y.*ssssssssccccccccccAAAccssscsssssssssscccccA",
    "A.AA.s,,,,,,,,,sscccccccccccccssss,,,,,,,,,,sccccA",
    "A....s,,,,,,,,,sscAAAccccccccccsss,,,,,,,,,,scAAcA",
    "A....s,,,,,,,,,scccAAccccccccccsss,,,,,,,,,,scAAAA",
    "A....s,,,,,,,,,sccccccccAAcccccsss,,,,,,,,,,scAccA",
    "Ay.*..sssssssssccccccccAAAccccssscsssssssssscccccA",
    "A...S.sscccccccccccccccccccccssssssssssssscccccccA",
    "AssssssssssssscccccssssssssssssssssssssssssssssscA",
    "ssssssssssssssssssssssssssssssssssscccccsssssssscc",
    "A......ssccccssssssssssssssssssssccccccccccccccccA",
    "A++....ssccccccccccs,,,,,,,,,,sssccAAcccccccAAcccA",
    "A+++..sscccccccAAccs,,,,,,,,,,ssscccAccccccccAcccA",
    "A.....sccAAAcccAAccs,,,,,,,,,,sssccccccccccccAcccA",
    "A..y.ssccAAcccccccss,,,,,,,,,,sssccccAAccccccccccA",
    "A*....ssccccccccccss,,,,,,,,,,ssccccccAAAcAccccccA",
    "A....y..cccccAAcccccssssssssssssscccccccAAAccccccA",
    "A.y.....ccccAAAccccccccccccccccccccccccccAAccccccA",
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  ],
  structures: [],
  warps: [
    { x: 0, y: 10, to: "glasshouse_city", toX: 38, toY: 23, facing: "left" },
    { x: 49, y: 10, to: "thistledown", toX: 1, toY: 17, facing: "right" },
  ],
  npcs: [
    { id: "drifter_dune", sprite: "hiker", x: 10, y: 8, facing: "down", trainer: "drifter_dune", sight: 2 },
    { id: "drifter_mesa", sprite: "hiker", x: 21, y: 11, facing: "up", trainer: "drifter_mesa", sight: 2 },
    { id: "botanist_sage2", sprite: "gardener", x: 32, y: 8, facing: "down", trainer: "botanist_sage2", sight: 2 },
    { id: "botanist_rue", sprite: "gardener", x: 41, y: 11, facing: "up", trainer: "botanist_rue", sight: 2 },
  ],
  hidden: [{ x: 3, y: 4, item: "spring_water" }, { x: 46, y: 16, item: "glass_pod" }],
  signs: [{ x: 4, y: 8, text: "ROUTE 10. East: THISTLEDOWN, where the scrub gives way to desert." }],
  triggers: [],
  // Numeric growth triggers override the route's ordinary 40–44 range.
  encounters: { grass: { rate: 12, slots: [
    { species: "lithops_pebble", minLevel: 27, maxLevel: 27, weight: 25 },
    { species: "prickly_pear", minLevel: 40, maxLevel: 44, weight: 20 },
    { species: "pear_pad", minLevel: 21, maxLevel: 21, weight: 15 },
    { species: "saguaro_column", minLevel: 39, maxLevel: 39, weight: 15 },
    { species: "dandelion", minLevel: 23, maxLevel: 23, weight: 15 },
    { species: "pitaya_cutting", minLevel: 37, maxLevel: 37, weight: 10, time: "night" },
  ] } },
};
