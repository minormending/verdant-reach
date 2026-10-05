// Round 3 world features: hidden items, harvest bushes, quest givers and the
// new species in the encounter tables (docs/ROUND3.md, docs/ENCOUNTERS.md).

import { describe, expect, it } from "vitest";
import type { Cond, EncounterSlot, MapDef, MapId } from "../contracts";
import { WORLD } from "./index";
import { QUEST_GIVERS, eachCmd, harvestId, validateWorld } from "./validate";

const maps = Object.values(WORLD.maps);
const holds = (c: Cond | undefined, f: Record<string, boolean>) => !c || c.every((x) => (f[x.flag] ?? false) === x.is);
const bushes = maps.flatMap((m) => m.npcs.filter((n) => harvestId(n)).map((n) => ({ map: m.id, npc: n })));
const harvestOf = (script: string) => {
  let op: { id: string; item: string } | undefined;
  eachCmd(WORLD.scripts[script], (c) => { if (c.op === "harvest") op = c; });
  return op!;
};

describe("hidden items", () => {
  const all = maps.flatMap((m) => (m.hidden ?? []).map((h) => ({ map: m.id, ...h })));
  it("hides 6 to 10 items across the slice, spread over at least 6 maps", () => {
    expect(all.length).toBeGreaterThanOrEqual(6);
    expect(all.length).toBeLessThanOrEqual(10);
    expect(new Set(all.map((h) => h.map)).size).toBeGreaterThanOrEqual(6);
  });
  it("never hides glass pods outside the grove", () => {
    for (const h of all) if (h.item === "glass_pod") expect(h.map).toBe("sugarbush_grove");
  });
});

describe("harvest bushes", () => {
  it("plants 6 to 10 bushes, each with its own harvest id and a script that picks it", () => {
    expect(bushes.length).toBeGreaterThanOrEqual(6);
    expect(bushes.length).toBeLessThanOrEqual(10);
    for (const { npc } of bushes) {
      expect(npc.script, npc.id).toBeTruthy();
      expect(harvestOf(npc.script!).id).toBe(harvestId(npc));
    }
  });
  it("grows wild berries on ROUTES 1-3 and in HEDGEROW, rose hips in BRAMBLEGATE and on ROUTE 3", () => {
    const where = (item: string) => new Set(bushes.filter((b) => harvestOf(b.npc.script!).item === item).map((b) => b.map));
    for (const m of ["route_1", "route_2", "route_3", "hedgerow"]) expect(where("wild_berry").has(m as MapId), m).toBe(true);
    for (const m of ["bramblegate", "route_3"]) expect(where("rose_hip").has(m as MapId), m).toBe(true);
  });
});

describe("quest givers", () => {
  it("stands every giver where ROUND3 §4 says, with a script narrative has written", () => {
    for (const q of QUEST_GIVERS) {
      const n = WORLD.maps[q.map].npcs.find((x) => x.id === q.npc);
      expect(n, `${q.npc} @ ${q.map}`).toBeDefined();
      expect(n!.script).toBe(q.script);
      expect(WORLD.scripts[q.script], q.script).toBeDefined();
    }
  });
  it("only shows MOSS on ROUTE 2 while the quest is open, then at the cottage once it's done", () => {
    const moss = WORLD.maps.route_2.npcs.find((n) => n.id === "moss")!;
    expect(moss.sprite).toBe("cat");
    expect(holds(moss.visibleWhen, {})).toBe(false);
    expect(holds(moss.visibleWhen, { quest_lost_cat_started: true })).toBe(true);
    expect(holds(moss.visibleWhen, { quest_lost_cat_started: true, moss_found: true })).toBe(false);
    const home = WORLD.maps.hedgerow.npcs.find((n) => n.id === "moss_home")!;
    expect(home.sprite).toBe("cat");
    expect(holds(home.visibleWhen, { quest_lost_cat_started: true, moss_found: true })).toBe(false);
    expect(holds(home.visibleWhen, { quest_lost_cat_done: true })).toBe(true);
  });
  it("keeps the old dialogue of the givers that already existed, for the quest scripts to fall back on", () => {
    expect(WORLD.scripts.sb_syrupmaker).toBeDefined();
    expect(WORLD.scripts.herb_archivist).toBeDefined();
  });
});

describe("encounters with the round-3 species", () => {
  const slots = (m: MapDef): EncounterSlot[] => [...(m.encounters?.grass?.slots ?? []), ...(m.encounters?.bog?.slots ?? [])];
  const at = (m: MapDef, time: "day" | "night") => new Set(slots(m).filter((s) => !s.time || s.time === "any" || s.time === time).map((s) => s.species));
  const BANDS: Partial<Record<MapId, [number, number]>> = {
    route_1: [2, 4], route_2: [3, 7], route_3: [7, 11], sugarbush_grove: [10, 14], sugarbush: [12, 15], sugarbush_conservatory: [12, 15],
  };

  it("gives every route 5-7 species, and a different mix by night", () => {
    for (const id of ["route_1", "route_2", "route_3"] as const) {
      const m = WORLD.maps[id];
      const n = new Set(slots(m).map((s) => s.species)).size;
      expect(n, id).toBeGreaterThanOrEqual(5);
      expect(n, id).toBeLessThanOrEqual(7);
      expect([...at(m, "day")].sort(), id).not.toEqual([...at(m, "night")].sort());
    }
  });
  it("follows the SLICE level curve", () => {
    for (const [id, [lo, hi]] of Object.entries(BANDS)) {
      for (const s of slots(WORLD.maps[id as MapId])) {
        expect(s.minLevel, `${id} ${s.species}`).toBeGreaterThanOrEqual(lo);
        expect(s.maxLevel, `${id} ${s.species}`).toBeLessThanOrEqual(hi);
      }
    }
  });
  it("puts every new line's first stage in the wild, SNAP SPROUT only as a very rare ROUTE 3 day slot", () => {
    const wild = new Set(maps.flatMap((m) => slots(m).map((s) => s.species)));
    for (const s of ["clover_sprout", "cattail_shoot", "foxglove_rosette", "holly_seedling", "mint_sprig", "rose_bud", "pitcher_sprout", "snapdragon_sprout"]) {
      expect(wild.has(s as never), s).toBe(true);
    }
    for (const m of maps) for (const s of slots(m)) {
      if (!s.species.startsWith("snapdragon")) continue;
      expect(m.id).toBe("route_3");
      expect(s.time).toBe("day");
      expect(s.weight).toBeLessThanOrEqual(1);
    }
  });
});

describe("validator self-check (round 3)", () => {
  const clone = () => structuredClone(WORLD);
  it("catches hidden items that can't be found", () => {
    const w = clone();
    // route_1 3,0 is in the tree line; 9,0 is the warp.
    w.maps.route_1.hidden = [{ x: 3, y: 0, item: "compost" }, { x: 9, y: 0, item: "compost" }, { x: 8, y: 10, item: "nope" }];
    const errs = validateWorld(w).join("\n");
    expect(errs).toMatch(/hidden compost at 3,0 has no reachable free tile/);
    expect(errs).toMatch(/hidden compost at 9,0 is on a warp/);
    expect(errs).toMatch(/hidden nope at 8,10: unknown item/);
    expect(errs).toMatch(/hidden nope at 8,10 is under an NPC/);
  });
  it("catches bushes that block a lane or don't harvest their own id", () => {
    const w = clone();
    // HEDGEROW's south road is two tiles wide at 12-13,19; plug both.
    w.maps.hedgerow.npcs.push(
      { id: "bush:plug_a", sprite: "harvest_bush", x: 12, y: 19, facing: "down", script: "bush_r1_berry_north" },
      { id: "bush:plug_b", sprite: "harvest_bush", x: 13, y: 19, facing: "down", script: "bush_r1_berry_north" },
      { id: "berries", sprite: "harvest_bush", x: 16, y: 18, facing: "down", script: "bush_r1_berry_north" },
    );
    const errs = validateWorld(w).join("\n");
    expect(errs).toMatch(/\[hedgerow\] .*block the way/);
    expect(errs).toMatch(/bush:plug_a: its script must/);
    expect(errs).toMatch(/npc berries: a harvest_bush must be named bush:<harvestId>/);
  });
  it("only warns while a quest script is missing, and errors on a misplaced giver", () => {
    const w = clone();
    delete w.scripts.q_moonwatch;
    w.maps.fallowfield.npcs = w.maps.fallowfield.npcs.filter((n) => n.id !== "librarian");
    const warnings: string[] = [];
    const errs = validateWorld(w, warnings).join("\n");
    expect(errs).not.toMatch(/q_moonwatch/);
    expect(warnings.join("\n")).toMatch(/npc stargazer script q_moonwatch missing/);
    expect(errs).toMatch(/giver librarian missing from fallowfield/);
  });
});
