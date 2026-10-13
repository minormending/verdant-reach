import { describe, expect, it } from "vitest";
import { DATA } from "../data";
import { WORLD } from "../world";
import { WALKTHROUGH } from "../guide/walkthrough";
import { TRAINERS_FILE } from "../world/trainers";
import { buildCatalog, filterCatalog, storyParts, trainerKind, trainerLocations, type CatalogRow } from "./catalog";

const ctx = { trainers: WORLD.trainers, items: DATA.items, species: DATA.species };
const rows = buildCatalog(WORLD, TRAINERS_FILE.trainers, WALKTHROUGH, ctx);
const row = (id: string) => rows.find((r) => r.id === id)!;
const entries = new Map(TRAINERS_FILE.trainers.map((e) => [e.id, e]));
const fctx = {
  entry: (id: string) => entries.get(id)!,
  speciesName: (id: string) => DATA.species[id as keyof typeof DATA.species]?.name ?? id,
  mapName: (id: string) => WORLD.maps[id as keyof typeof WORLD.maps]?.name ?? id,
};
const ids = (list: CatalogRow[]) => list.map((r) => r.id);

describe("trainer catalog", () => {
  it("has one row per trainers.json entry, each placed on a map and in the story", () => {
    expect(rows.map((r) => r.id)).toEqual(TRAINERS_FILE.trainers.map((e) => e.id));
    for (const r of rows) {
      expect(r.locations.length, r.id).toBeGreaterThan(0);
      expect(r.story, r.id).not.toBeNull();
    }
  });

  it("finds a route trainer's NPC, tile, facing and sight range", () => {
    const milo = row("schoolkid_milo");
    expect(milo.kind).toBe("trainer");
    expect(milo.rematchEligible).toBe(true);
    expect(milo.maps).toEqual(["route_1"]);
    const npc = WORLD.maps.route_1.npcs.find((n) => n.trainer === "schoolkid_milo")!;
    expect(milo.locations).toEqual([expect.objectContaining({
      map: "route_1", how: "sight", npcId: npc.id, x: npc.x, y: npc.y, facing: npc.facing, sight: npc.sight ?? 4,
    })]);
    expect(milo.story?.part).toBe("Chapter 1");
  });

  it("marks leaders' fights as script battles with their conditions, and leaders by their mark", () => {
    const hollis = row("hollis");
    expect(hollis.kind).toBe("leader");
    expect(hollis.rematchEligible).toBe(false);
    const loc = hollis.locations[0];
    expect(loc).toMatchObject({ map: "bramblegate_conservatory", how: "script", npcId: "hollis" });
    expect(loc.when.join(" ")).toMatch(/before beating WARDEN HOLLIS/);
    expect(hollis.story).toMatchObject({ part: "Chapter 2" });
  });

  it("knows rivals, Rootstock and the Council", () => {
    expect(row("rival_2_lily")).toMatchObject({ kind: "rival", group: "rival_2", variant: "lily" });
    expect(row("rival_2_lily").maps).toEqual(["sugarbush"]);
    expect(row("shears").kind).toBe("rootstock");
    expect(row("mercer").kind).toBe("rootstock");
    expect(row("grunt_r3").kind).toBe("rootstock");
    expect(row("belladonna")).toMatchObject({ kind: "council", councilSeat: true });
    expect(row("rowan")).toMatchObject({ kind: "council", councilSeat: true });
    expect(trainerKind({ id: "x", className: "HIKER", music: "battle_trainer" })).toBe("trainer");
  });

  it("places a trainer in the story state where it stands (the relay grunts in Chapter 8)", () => {
    expect(row("grunt_r0_1").story?.part).toBe("Chapter 8");
    expect(row("grunt_r1_1").story?.part).toBe("Chapter 8");
    expect(row("orchardist_russet").story?.part).toBe("Chapter 4");
  });

  it("lists every script battle of a trainer once", () => {
    const locs = trainerLocations(WORLD, "rival_1_oak", ctx);
    expect(locs.every((l) => l.how === "script" && l.map === "fallowfield")).toBe(true);
    expect(new Set(locs.map((l) => `${l.scriptId}|${l.source}|${l.x},${l.y}`)).size).toBe(locs.length);
  });

  it("orders parts as the walkthrough does", () => {
    const parts = storyParts(WALKTHROUGH);
    expect(parts[0]).toBe("Prologue");
    expect(parts.at(-1)).toBe("Post-game");
    expect(parts).toContain("Chapter 11");
  });
});

describe("filterCatalog", () => {
  it("filters by map, part, class, kind and level range", () => {
    expect(ids(filterCatalog(rows, { map: "route_1" }, fctx))).toEqual(["schoolkid_milo"]);
    expect(filterCatalog(rows, { kind: "leader" }, fctx).map((r) => r.id)).toEqual(["hollis", "nell", "flora", "morrow", "saguaro", "reyes", "signe", "rook"]);
    expect(filterCatalog(rows, { part: "Chapter 11" }, fctx).every((r) => r.kind === "council")).toBe(true);
    expect(filterCatalog(rows, { className: "SAILOR" }, fctx).map((r) => r.id)).toEqual(["sailor_kelp", "sailor_brine"]);
    const rm = filterCatalog(rows, { kind: "rematch" }, fctx);
    expect(rm.length).toBeGreaterThan(30);
    expect(rm.every((r) => r.rematchEligible)).toBe(true);
    const mid = filterCatalog(rows, { minLevel: 20, maxLevel: 22 }, fctx);
    for (const r of mid) {
      const lv = fctx.entry(r.id).team.map((m) => m.level);
      expect(Math.max(...lv) >= 20 && Math.min(...lv) <= 22, r.id).toBe(true);
    }
  });

  it("searches names, classes, species and maps, in story order", () => {
    expect(ids(filterCatalog(rows, { text: "milo" }, fctx))).toEqual(["schoolkid_milo"]);
    expect(ids(filterCatalog(rows, { text: "route 1" }, fctx))).toContain("schoolkid_milo");
    expect(ids(filterCatalog(rows, { text: "titan arum" }, fctx))).toEqual(["titus_arum"]);
    const all = filterCatalog(rows, {}, fctx);
    expect(all.length).toBe(rows.length);
    const idx = all.map((r) => r.story!.index);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    expect(ids(filterCatalog(rows, { edited: true }, { ...fctx, edited: (id) => id === "nell" }))).toEqual(["nell"]);
  });
});
