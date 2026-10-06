import { describe, expect, it } from "vitest";
import { DATA } from "../data";
import type { Cond, MapDef, MapId, ScriptCmd } from "../contracts";
import { MAP_IDS } from "../contracts";
import { glowField, glowLamps } from "../overworld/glow";
import { WORLD } from "./index";
import { checkProgressWithoutLantern, flood, grid, walkable } from "./validate";

const CH5: MapId[] = [
  "route_6", "cedarhallow", "cedarhallow_greenhouse", "cedarhallow_market",
  "cedarhallow_house", "cedar_hollow", "burnt_stand", "cedarhallow_conservatory",
];
const holds = (c: Cond | undefined, f: Record<string, boolean>) => !c || c.every((v) => (f[v.flag] ?? false) === v.is);

/** The actual script conditions and effects, without text/audio/UI execution. */
function effects(script: string, initial: Record<string, boolean>) {
  const flags = { ...initial };
  const ops: ScriptCmd[] = [];
  const run = (cmds: ScriptCmd[]) => {
    for (const c of cmds) {
      if (c.op === "if") run(holds(c.when, flags) ? c.then : c.else ?? []);
      else if (c.op === "call") run(WORLD.scripts[c.script]);
      else {
        ops.push(c);
        if (c.op === "setFlag") flags[c.flag] = c.value ?? true;
      }
    }
  };
  run(WORLD.scripts[script]);
  return { flags, ops };
}

function occupiedGrid(m: MapDef, flags: Record<string, boolean>) {
  const g = grid(m);
  const blocked = new Set(m.npcs.filter((n) => holds(n.visibleWhen, flags)).map((n) => `${n.x},${n.y}`));
  return { ...g, tile: (x: number, y: number) => blocked.has(`${x},${y}`) ? undefined : g.tile(x, y) };
}

describe("Chapter 5 world", () => {
  it("appends the eight maps in the binding order and uses the specified dimensions", () => {
    expect(MAP_IDS.slice(-8)).toEqual(CH5);
    for (const [id, w, h] of [
      ["route_6", 30, 60], ["cedarhallow", 36, 30], ["cedar_hollow", 20, 24],
      ["burnt_stand", 40, 30], ["cedarhallow_conservatory", 16, 18],
    ] as const) expect([grid(WORLD.maps[id]).w, grid(WORLD.maps[id]).h]).toEqual([w, h]);
  });

  it("opens the Grove's only north gap only after Chapter 4", () => {
    const m = WORLD.maps.sugarbush_grove;
    const north = m.warps.filter((w) => w.to === "route_6");
    expect(north).toHaveLength(1);
    const ranger = m.npcs.find((n) => n.id === "grove_ranger")!;
    expect(ranger).toMatchObject({ sprite: "ranger", script: "ch5_grove_ranger" });
    for (const done of [false, true]) {
      const g = occupiedGrid(m, { ch4_done: done, grove_cleared: true });
      const reach = flood(g, [{ x: 13, y: 26 }]);
      expect(reach.has(`${north[0].x},${north[0].y}`)).toBe(done);
    }
  });

  it("makes the long canopy walkway the only connection between the clearings", () => {
    const m = WORLD.maps.route_6, g = grid(m);
    for (let y = 21; y <= 39; y++) {
      expect(g.tile(14, y)).toBe("canopy_boardwalk");
      expect(g.tile(13, y)).toBe("rope_rail");
    }
    const start = [{ x: 14, y: 58 }];
    expect(flood(g, start).has("14,1")).toBe(true);
    const severed = { ...g, tile: (x: number, y: number) => y === 30 && g.tile(x, y) === "canopy_boardwalk" ? "canopy_drop" as const : g.tile(x, y) };
    expect(flood(severed, start).has("14,1")).toBe(false);
    expect(m.npcs.filter((n) => n.trainer)).toHaveLength(4);
    expect(m.hidden).toHaveLength(2);
    expect(m.npcs.filter((n) => n.sprite === "harvest_bush")).toHaveLength(1);
  });

  it("keeps the Conservatory door shut until both the vision and lantern flag", () => {
    const town = WORLD.maps.cedarhallow;
    const door = town.warps.find((w) => w.to === "cedarhallow_conservatory")!;
    const triggers = town.triggers.filter((t) => t.script === "ch5_conservatory_door");
    expect(triggers.every((t) => t.x === door.x && t.y === door.y + 1)).toBe(true);
    for (const vision of [false, true]) for (const lantern of [false, true]) {
      const flags = { burnt_vision_seen: vision, got_lantern: lantern };
      const rejected = !(vision && lantern);
      const result = effects("ch5_conservatory_door", flags);
      expect(triggers.some((t) => holds(t.when, flags))).toBe(rejected);
      expect(result.ops.filter((c) => c.op === "movePlayer")).toEqual(rejected ? [{ op: "movePlayer", path: ["down"] }] : []);
    }
  });

  it("provides a walkable Cedarhallow landing below the greenhouse, and records arrival", () => {
    const m = WORLD.maps.cedarhallow;
    const door = m.warps.find((w) => w.to === "cedarhallow_greenhouse")!;
    const landing = WORLD.glide!.find((d) => d.map === m.id)!;
    expect(landing).toMatchObject({ x: door.x, y: door.y + 1, facing: "down" });
    expect(walkable(grid(m), landing.x, landing.y)).toBe(true);
    expect(m.npcs.some((n) => n.x === landing.x && n.y === landing.y)).toBe(false);
    expect(effects(m.onEnter!, {}).flags).toMatchObject({ ch5_arrived: true, visited_cedarhallow: true });
    expect(WORLD.maps.cedarhallow_greenhouse.healPoint).toBeDefined();
  });

  it("lights the real Hollow's entrance and keeper, and passes the dark-map validator", () => {
    const m = WORLD.maps.cedar_hollow, g = grid(m);
    const lamps = glowLamps(g.w, g.h, g.tile);
    expect(lamps).toHaveLength(2);
    const light = glowField(null, lamps, false);
    const lit = { ...g, tile: (x: number, y: number) => light(x, y) === "dark" ? undefined : g.tile(x, y) };
    const exit = m.warps[0], keeper = m.npcs.find((n) => n.id === "shrine_keeper")!;
    const reach = flood(lit, [{ x: exit.x, y: exit.y }]);
    expect(light(keeper.x, keeper.y)).not.toBe("dark");
    expect([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => reach.has(`${keeper.x + dx},${keeper.y + dy}`))).toBe(true);
    expect(m.dark).toBe(true);
    expect(WORLD.maps.cedarhallow_conservatory.dark).toBe(true);
    expect(checkProgressWithoutLantern(WORLD)).toEqual([]);
    const before = effects("ch5_shrine_keeper", {});
    expect(before.ops.some((c) => c.op === "giveItem")).toBe(false);
    const grant = effects("ch5_shrine_keeper", { burnt_vision_seen: true });
    expect(grant.ops).toContainEqual({ op: "giveItem", item: "foxfire_lantern" });
    expect(grant.flags.got_lantern).toBe(true);
    expect(effects("ch5_shrine_keeper", grant.flags).ops.some((c) => c.op === "giveItem")).toBe(false);
    const broken = structuredClone(WORLD);
    broken.scripts.ch5_shrine_keeper = [];
    expect(checkProgressWithoutLantern(broken).join("\n")).toMatch(/dark rooms require an obtainable foxfire_lantern/);
  });

  it("uses exactly the specified encounter weights by time and terrain", () => {
    const slots = (id: MapId, kind: "grass" | "bog", time: "day" | "night") =>
      WORLD.maps[id].encounters![kind]!.slots.filter((s) => !s.time || s.time === "any" || s.time === time).map((s) => [s.species, s.weight]);
    expect(slots("route_6", "grass", "day")).toEqual([
      ["fireweed_fluff", 25], ["skunk_cabbage_shoot", 20], ["unfurling_fern", 20], ["holly_seedling", 15], ["maple_sapling", 15], ["cedar_seedling", 5],
    ]);
    expect(slots("route_6", "grass", "night")).toEqual([
      ["ghostpipe_stalk", 35], ["moonflower_vine", 20], ["unfurling_fern", 20], ["skunk_cabbage_shoot", 20], ["cedar_seedling", 5],
    ]);
    expect(slots("route_6", "bog", "day")).toEqual([["skunk_cabbage_shoot", 50], ["cattail", 30], ["sundew", 20]]);
    expect(slots("burnt_stand", "grass", "day")).toEqual([["fireweed_fluff", 25], ["lodgepole_cone", 35], ["fireweed_shoot", 30], ["stinging_nettle", 10]]);
    expect(slots("cedar_hollow", "grass", "night")).toEqual([["ghostpipe_stalk", 30], ["ghostpipe_nodding", 35], ["moonflower", 20], ["cedar_seedling", 15]]);
    // No wild slot may exceed its species' growth level (the lead's v1 table broke this).
    for (const id of ["route_6", "burnt_stand", "cedar_hollow"] as const) for (const kind of ["grass", "bog"] as const) {
      for (const s of WORLD.maps[id].encounters?.[kind]?.slots ?? []) {
        const t = DATA.species[s.species].growsInto?.trigger;
        if (t && (t.kind === "vigor" || t.kind === "vigor_day" || t.kind === "vigor_night")) expect(s.maxLevel, `${id} ${s.species}`).toBeLessThan(t.level);
      }
    }
    const ashes = WORLD.maps.burnt_stand.npcs.filter((n) => n.sprite === "item_pickup");
    expect(ashes.map((n) => n.id)).toEqual(["ember_ash", "ember_ash_2"]);
  });

  it("puts the specified grafted stage-three starter last in every rival team", () => {
    for (const [line, species] of [["oak", "great_oak"], ["chili", "red_chili"], ["lily", "giant_water_lily"]]) {
      const team = WORLD.trainers[`rival_4_${line}`].team;
      expect(team.map((t) => [t.species, t.level])).toEqual([["blackberry", 25], ["dandelion", 25], ["sugar_maple", 26], [species, 27]]);
      expect(team.slice(0, 3).some((t) => t.grafted)).toBe(false);
      expect(team[3].grafted).toBe(true);
    }
    expect(WORLD.trainers.morrow).toMatchObject({ ai: "smart", music: "battle_leader", mark: "pipe_mark", items: [{ item: "spring_water", qty: 1 }] });
  });
});
