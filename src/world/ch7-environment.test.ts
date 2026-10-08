import { describe, expect, it } from "vitest";
import { STRUCTURES, type MapId, type TileKey } from "../contracts";
import { buildMap, isWalkable, refreshLegend, tileAt, tileProps } from "../overworld/map";
import { WORLD } from "./index";

// The Chapter 7 environment pass redraws the maps; gameplay stays frozen.
// Digests were taken from the stand-in maps before the pass (branch ch7).

const sha = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))),
  (v) => v.toString(16).padStart(2, "0")).join("");

// Warps, triggers, NPCs (positions, sprites, scripts, trainers, sight), hidden
// items, door cells, encounter tables, music and the existing flag swaps.
const GAMEPLAY: [MapId, string][] = [
  ["route_9", "6f3883aebb21379ea1e5bb4e02738527ed1bacab02cd17079c4563acab73e3de"],
  ["larchmere", "ea60b0d9886e6e5e3f49c1f961c8e6a0fe233174b31b56f72740675d735231b3"],
  ["larchmere_greenhouse", "12c566075d59282f9dcf4753afee2c324e2b13234ac884e3efa1438baf19ffc9"],
  ["larchmere_market", "d9fdff3f4da4ee4862d2f8abe0a730af7248296fc4d5aea53c980fc54be31043"],
  ["bloom_lake", "5086fb067172eccfa243903f8957b43de6dce05ddc97ffda45b7b11faaf713df"],
  ["larchmere_lodge", "949ea3a72b5df2d4bd160ef45115be6ee8aaf504f6470d6c903142dad9740263"],
  ["rootstock_hideout_1", "b7b1118917bece8226691506af04440b228f8bf61a6d7616b618941970e67492"],
  ["rootstock_hideout_2", "e851b03539391e317d701e270ecc229c03693b9b850220258978eb872fbf1c05"],
  ["larchmere_conservatory", "a4771cf5ba4a1a7e383f7464c913d1db0a933e3380b16a5139b9eaed2454d2ad"],
];

// The Larchmere chalets are new private homes: each door bounces the player
// with an existing locked-door script. Nothing else may be added.
const CHALET_DOORS = [[3, 5, "bg_door_c"], [9, 5, "hh_door_east"], [4, 22, "gc_door_b"], [10, 22, "hh_door_nw"]] as const;
const isChaletDoor = (id: MapId, x: number, y: number) => id === "larchmere" && CHALET_DOORS.some(([cx, cy]) => cx === x && cy === y);

// The lead's cast swap (after the cast7 wave): new Chapter 7 sprites replace
// these stand-ins one for one. Hash them as the stand-ins, so any other sprite
// change still fails.
const RESKIN: Record<string, string> = {
  signe: "nell_pitcher", skier: "birdwatcher", lodge_keeper: "shopkeeper",
  signal_emitter: "lever", crimson_lily: "potted_plant", calloway: "researcher",
};

function gameplay(id: MapId): string {
  const m = WORLD.maps[id];
  // Bloom Lake's red-water swap is new art; every other legend swap is frozen.
  // The hideout's closed stairs and tunnel now read as hideout wall: the same solid wall.
  const legendWhen = (m.legendWhen ?? []).filter((o) => !Object.values(o.legend).includes("red_water"))
    .map((o) => ({ ...o, legend: Object.fromEntries(Object.entries(o.legend).map(([c, t]) => [c, t === "hideout_wall" ? "wall" : t])) }));
  return JSON.stringify({
    warps: m.warps, triggers: m.triggers.filter((t) => !isChaletDoor(id, t.x, t.y)), npcs: m.npcs.map((n) => ({ ...n, sprite: RESKIN[n.sprite] ?? n.sprite })), hidden: m.hidden ?? [],
    doors: m.structures.filter((s) => STRUCTURES[s.key].door)
      .map((s) => [s.x + STRUCTURES[s.key].door!.x, s.y + STRUCTURES[s.key].door!.y])
      .filter(([x, y]) => !isChaletDoor(id, x, y)),
    encounters: m.encounters ?? null, encountersWhen: m.encountersWhen ?? null,
    music: m.music, musicWhen: m.musicWhen ?? null, onEnter: m.onEnter ?? null,
    healPoint: m.healPoint ?? null, legendWhen: legendWhen.length ? legendWhen : null,
  });
}

// Cell classes: "~" water, "g" grass encounter, "i" ice, "." walkable, "#" blocked.
function cells(id: MapId, flags: Record<string, boolean>, skip: (x: number, y: number) => boolean = () => false): string {
  const m = buildMap(WORLD.maps[id]);
  refreshLegend(m, flags);
  let s = "";
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const p = tileProps(tileAt(m, x, y));
    s += skip(x, y) ? "?" : p.water ? "~" : p.slide ? "i" : !isWalkable(m, x, y) ? "#" : p.encounter === "grass" ? "g" : ".";
  }
  return s;
}

// Bloom Lake: the water body, the islet, the shore encounter strips and every
// movement cell are frozen. Isolated shore props are the only listed exception.
const LAKE_DRESSING: [number, number, TileKey][] = [
  // larch clumps in the four corners
  [1, 1, "larch_tree"], [2, 1, "larch_tree"], [1, 2, "larch_tree"], [33, 1, "larch_tree"], [34, 1, "larch_tree"], [34, 2, "larch_tree"],
  [1, 34, "larch_tree"], [2, 34, "larch_tree"], [1, 33, "larch_tree"], [33, 34, "larch_tree"], [34, 34, "larch_tree"], [34, 33, "larch_tree"],
  // a log, rocks and a stump on the grass verge; the landing sign
  [11, 3, "log"], [25, 3, "rock"], [8, 32, "stump"], [27, 32, "rock"], [3, 16, "sign"],
];

describe("Chapter 7 environment keeps gameplay", () => {
  for (const [id, expected] of GAMEPLAY) {
    it(`freezes ${id} warps, triggers, NPCs, items and encounters`, async () => {
      expect(await sha(gameplay(id))).toBe(expected);
    });
  }

  it("freezes the Bloom Lake water and land layout in both lake states", async () => {
    for (const calmed of [false, true]) {
      const skip = (x: number, y: number) => LAKE_DRESSING.some(([px, py]) => px === x && py === y);
      expect(await sha(cells("bloom_lake", { lake_calmed: calmed }, skip))).toBe("1c686cf6ed68e95d23e2a7200214aac6214a441c7b77acc22b790a7cc2fe9343");
    }
    const m = buildMap(WORLD.maps.bloom_lake);
    for (const [x, y, key] of LAKE_DRESSING) {
      expect(tileAt(m, x, y)).toBe(key);
      expect(isWalkable(m, x, y)).toBe(false);
      expect(tileProps(key).water).toBeUndefined();
    }
  });

  it("shows red water until the lake is calmed, then ordinary water", () => {
    const m = buildMap(WORLD.maps.bloom_lake);
    for (const [calmed, key] of [[false, "red_water"], [true, "water"]] as const) {
      refreshLegend(m, { lake_calmed: calmed });
      expect(tileAt(m, 10, 10)).toBe(key);
      expect(tileAt(m, 18, 18)).not.toBe(key);
    }
  });

  it("keeps the ice puzzle cell for cell", async () => {
    expect(await sha(cells("larchmere_conservatory", {}))).toBe("6f37d8406c53e726bd73dc1d33a5854d86848585144a7983ab674c6be8ebb43d");
  });

  it("gives each chalet door a locked-door bounce", () => {
    const m = WORLD.maps.larchmere;
    for (const [x, y, script] of CHALET_DOORS) {
      expect(m.structures.some((s) => s.key === "chalet" && s.x + 1 === x && s.y + 2 === y)).toBe(true);
      expect(m.triggers.find((t) => t.x === x && t.y === y)?.script).toBe(script);
      expect(WORLD.scripts[script].at(-1)).toEqual({ op: "movePlayer", path: ["down"] });
    }
    expect(m.structures.filter((s) => s.key === "chalet")).toHaveLength(CHALET_DOORS.length);
  });

  it("keeps the bookcase stair and the files console exactly", () => {
    const lodge = buildMap(WORLD.maps.larchmere_lodge);
    expect(tileAt(lodge, 10, 2)).toBe("bookshelf");
    expect(WORLD.maps.larchmere_lodge.legendWhen).toEqual([{ when: [{ flag: "lodge_stair_open", is: true }], legend: { K: "stairs_down" } }]);
    expect(WORLD.maps.larchmere_lodge.tiles.join("").split("K")).toHaveLength(2);
    expect(tileAt(buildMap(WORLD.maps.rootstock_hideout_2), 11, 4)).toBe("console");
  });
});
