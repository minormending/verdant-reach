import { describe, expect, it } from "vitest";
import type { GameData, MapDef, TrainerDef, WorldData } from "../contracts";
import { MAP_IDS } from "../contracts";
import { DATA } from "../data";
import { WORLD } from "../world";
import {
  activeEncounterSet, allMapFinds, condLabel, encounterRows, encounterSets, groupMembers, itemSources, mapFinds,
  mapHasContent, pickupItemId, speciesSources, starterVariant, trainerGroup, walkScript, wandererSources,
} from "./indexer";

const trainer = (id: string, extra: Partial<TrainerDef> = {}): TrainerDef => ({
  id, name: id.toUpperCase(), className: "GARDENER", portrait: "gardener", team: [{ species: "oak_acorn", level: 5 }],
  prize: 100, intro: "", defeat: "", after: "", ai: "basic", ...extra,
});

const baseMap = (over: Partial<MapDef>): MapDef => ({
  id: "route_1", name: "TEST", outdoor: true, music: "route", tiles: ["..", ".."], legend: { ".": "grass" },
  border: "tree", structures: [], warps: [], npcs: [], signs: [], triggers: [], ...over,
});

function fixture(def: MapDef, scripts: WorldData["scripts"] = {}, trainers: TrainerDef[] = []): WorldData {
  return {
    maps: { route_1: def } as WorldData["maps"], scripts,
    trainers: Object.fromEntries(trainers.map((t) => [t.id, t])),
    newGame: { map: "route_1", x: 0, y: 0, facing: "down", script: "x" },
  };
}

describe("encounter rows", () => {
  it("splits percentages by time of day (morning shares the day slots)", () => {
    const rows = encounterRows([
      { species: "oak_acorn", minLevel: 3, maxLevel: 5, weight: 30 },
      { species: "chili_blossom", minLevel: 4, maxLevel: 4, weight: 10, time: "day" },
      { species: "lily_seedpod", minLevel: 6, maxLevel: 2, weight: 30, time: "night" },
    ]);
    expect(rows[0]).toMatchObject({ dayPct: 75, nightPct: 50 });
    expect(rows[1]).toMatchObject({ dayPct: 25, nightPct: null });
    expect(rows[2]).toMatchObject({ dayPct: null, nightPct: 50, minLevel: 2, maxLevel: 6 });
  });

  it("merges a plant listed separately by day and by night into one row", () => {
    const rows = encounterRows([
      { species: "oak_acorn", minLevel: 2, maxLevel: 4, weight: 20, time: "day" },
      { species: "oak_acorn", minLevel: 2, maxLevel: 4, weight: 40, time: "night" },
      { species: "chili_blossom", minLevel: 2, maxLevel: 4, weight: 60 },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ species: "oak_acorn", time: "any", dayPct: 25, nightPct: 40 });
  });

  it("drops zero-weight slots and honours a map's forced time", () => {
    const rows = encounterRows([
      { species: "oak_acorn", minLevel: 3, maxLevel: 3, weight: 10 },
      { species: "chili_blossom", minLevel: 3, maxLevel: 3, weight: 0 },
    ], "night");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ dayPct: null, nightPct: 100 });
  });

  it("labels encountersWhen variants and picks the active one", () => {
    const def = baseMap({
      encounters: { grass: { rate: 10, slots: [{ species: "oak_acorn", minLevel: 2, maxLevel: 3, weight: 1 }] } },
      encountersWhen: [{ when: [{ flag: "beat_hollis", is: true }], encounters: { water: { rate: 5, slots: [{ species: "lily_seedpod", minLevel: 9, maxLevel: 9, weight: 1 }] } } }],
    });
    const sets = encounterSets(def, { trainers: { hollis: trainer("hollis", { className: "WARDEN", name: "HOLLIS" }) } });
    expect(sets.map((s) => s.label)).toEqual(["Normally", "after beating WARDEN HOLLIS"]);
    expect(sets[1].tables[0].method).toBe("water");
    expect(activeEncounterSet(def, {})).toBeNull();
    expect(activeEncounterSet(def, { beat_hollis: true })).toEqual([{ flag: "beat_hollis", is: true }]);
  });
});

describe("script walking", () => {
  it("follows calls and every branch, once per script, with branch labels", () => {
    const world = fixture(baseMap({}), {
      a: [{ op: "if", when: [{ flag: "got_x", is: true }], then: [{ op: "call", script: "b" }], else: [{ op: "giveItem", item: "water_flask" }] }],
      b: [{ op: "yesno", prompt: "?", yes: [{ op: "giveSpecies", species: "oak_acorn", level: 5 }], no: [] }, { op: "call", script: "a" }],
    });
    const seen: string[] = [];
    walkScript(world, "a", (op, when) => { if (op.op === "giveSpecies" || op.op === "giveItem") seen.push(`${op.op}:${when.join("|")}`); });
    expect(seen).toEqual(["giveSpecies:got x", "giveItem:"]);
  });

  it("collects gifts, shops, trades, static battles and scripted fights from NPCs, triggers and onEnter", () => {
    const def = baseMap({
      npcs: [
        { id: "clerk", sprite: "villager_a", x: 1, y: 0, facing: "down", script: "shop" },
        { id: "boss", sprite: "villager_b", x: 0, y: 1, facing: "down", script: "fight" },
      ],
      triggers: [{ x: 1, y: 1, script: "fight" }],
      onEnter: "arrive",
    });
    const world = fixture(def, {
      shop: [{ op: "shop", stock: ["water_flask", "terrarium_pod"] }],
      fight: [{ op: "battle", trainer: "rival_1_oak" }, { op: "battle", trainer: "rival_1_chili" }, { op: "battle", trainer: "rival_1_lily" }],
      arrive: [
        { op: "trade", wants: ["oak_acorn"], gives: { species: "lily_seedpod", level: 10 } },
        { op: "wildBattle", species: "chili_blossom", level: 30 },
        { op: "giveSpecies", species: "oak_acorn", level: 5 },
      ],
    }, [trainer("rival_1_oak"), trainer("rival_1_chili"), trainer("rival_1_lily")]);
    const f = mapFinds(world, DATA, "route_1");
    expect(f.shops[0].stock).toEqual(["water_flask", "terrarium_pod"]);
    expect(f.trades[0].gives.species).toBe("lily_seedpod");
    expect(f.statics[0]).toMatchObject({ species: "chili_blossom", level: 30 });
    expect(f.gifts[0]).toMatchObject({ species: "oak_acorn", from: "on arrival" });
    // One entry for the rival's three variants, placed at the NPC (not the trigger).
    expect(f.trainers).toHaveLength(1);
    expect(f.trainers[0]).toMatchObject({ ids: ["rival_1_chili", "rival_1_lily", "rival_1_oak"], x: 0, y: 1, n: 1, scripted: true });
  });
});

describe("items on a map", () => {
  it("mirrors the engine's pickup id rule", () => {
    const items = { water_flask: {}, glass_pod: {} };
    expect(pickupItemId("water_flask_2", items)).toBe("water_flask");
    expect(pickupItemId("item_glass_pod", items)).toBe("glass_pod");
    expect(pickupItemId("mystery", items)).toBeNull();
  });

  it("numbers ground, scripted, bush and hidden items in one sequence", () => {
    const def = baseMap({
      npcs: [
        { id: "glass_pod", sprite: "item_pickup", x: 0, y: 0, facing: "down" },
        { id: "special", sprite: "item_pickup", x: 1, y: 0, facing: "down", script: "special", visibleWhen: [{ flag: "got_starter", is: true }] },
        { id: "bush:b", sprite: "harvest_bush", x: 0, y: 1, facing: "down", script: "bush" },
      ],
      hidden: [{ x: 1, y: 1, item: "spring_water", qty: 2 }],
    });
    const world = fixture(def, {
      special: [{ op: "giveItem", item: "compost", qty: 3 }],
      bush: [{ op: "harvest", id: "b", item: "wild_berry", qty: 2 }],
    });
    const f = mapFinds(world, DATA, "route_1");
    expect(f.items.map((i) => `${i.n}:${i.kind}:${i.item}x${i.qty}`)).toEqual([
      "1:ground:glass_podx1", "2:ground:compostx3", "3:bush:wild_berryx2", "4:hidden:spring_waterx2",
    ]);
    expect(f.items[1].when).toBe("got starter");
    // Pickup and bush scripts don't double as gifts.
    expect(f.itemGifts).toEqual([]);
    expect(mapHasContent(f)).toBe(true);
  });
});

describe("trainer groups", () => {
  const ts = Object.fromEntries(["rival_2_oak", "rival_2_chili", "rival_2_lily", "rowan", "rowan_rematch", "hiker_oak"].map((id) => [id, trainer(id)]));
  it("groups starter variants and rematches", () => {
    expect(trainerGroup("rival_2_chili", ts)).toBe("rival_2");
    expect(trainerGroup("rowan_rematch", ts)).toBe("rowan");
    expect(trainerGroup("hiker_oak", ts)).toBe("hiker_oak");
    // Ordered by the player's choice (OAK, CHILI, LILY): BRAM holds the counter line.
    expect(groupMembers("rival_2", ts)).toEqual(["rival_2_chili", "rival_2_lily", "rival_2_oak"]);
    expect(groupMembers("rowan", ts)).toEqual(["rowan", "rowan_rematch"]);
    expect(starterVariant("rival_2_lily")).toBe("lily");
    expect(starterVariant("rowan")).toBeNull();
  });
});

describe("condition labels", () => {
  it("reads trainer flags and the post-game", () => {
    expect(condLabel([{ flag: "game_cleared", is: true }])).toBe("after the credits");
    expect(condLabel([{ flag: "beat_x", is: false }, { flag: "lake_calmed", is: true }])).toBe("before beating X, lake calmed");
  });
});

describe("the real world", () => {
  const finds = allMapFinds(WORLD, DATA as GameData);

  it("indexes every map", () => {
    expect(finds.map((f) => f.map)).toEqual(MAP_IDS.filter((id) => WORLD.maps[id]));
  });

  it("finds every trainer somewhere (NPC sight or a script battle)", () => {
    const seen = new Set(finds.flatMap((f) => f.trainers.flatMap((t) => t.ids)));
    const missing = Object.keys(WORLD.trainers).filter((id) => !seen.has(id));
    expect(missing).toEqual([]);
  });

  it("gives every evolution line a source (wild, gift, trade, static or a Wanderer)", () => {
    const sources = speciesSources(finds, wandererSources(WORLD));
    const lines = new Map<string, string[]>();
    for (const s of Object.values(DATA.species)) lines.set(s.line, [...(lines.get(s.line) ?? []), s.id]);
    const orphan = [...lines].filter(([, ids]) => !ids.some((id) => sources.has(id as never))).map(([l]) => l);
    expect(orphan).toEqual([]);
  });

  it("finds every item in DATA somewhere, with valid ids", () => {
    const sources = itemSources(finds);
    for (const id of sources.keys()) expect(DATA.items[id], id).toBeDefined();
    expect(Object.keys(DATA.items).filter((id) => !sources.has(id))).toEqual([]);
  });

  it("has the starters as gifts in the Herbarium and Bram's variants on Fallowfield", () => {
    const herb = finds.find((f) => f.map === "herbarium")!;
    expect(herb.gifts.map((g) => g.species)).toEqual(expect.arrayContaining(["oak_acorn", "chili_blossom", "lily_seedpod"]));
    const town = finds.find((f) => f.map === "fallowfield")!;
    expect(town.trainers.some((t) => t.ids.length === 3 && t.ids.every((id) => id.startsWith("rival_1_")))).toBe(true);
  });

  it("keeps marker numbers unique per map", () => {
    for (const f of finds) {
      const n = f.items.map((i) => i.n);
      expect(new Set(n).size, f.map).toBe(n.length);
      const t = f.trainers.map((x) => x.n).filter((x) => x !== null);
      expect(new Set(t).size, f.map).toBe(t.length);
    }
  });
});
