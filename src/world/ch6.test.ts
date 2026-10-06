import { describe, expect, it } from "vitest";
import { MAP_IDS, TILES, type Cond, type MapDef, type MapId, type ScriptCmd } from "../contracts";
import { DATA } from "../data";
import { buildMap, DIRS, key, tileAt, tryMove } from "../overworld/map";
import { tryRaftMove } from "../overworld/raft";
import { reachableBoulderTiles, solveBoulderPuzzle, tryPushBoulder, type BoulderPosition } from "../overworld/uproot";
import { WORLD } from "./index";
import { checkProgressWithoutRaft, checkProgressWithoutSaxifrage, eachCmd, flood, grid, isTalkTrigger, walkable } from "./validate";

const CH6: MapId[] = [
  "route_7", "saltmarsh_harbour", "saltmarsh_greenhouse", "saltmarsh_market", "saltmarsh_conservatory",
  "route_8", "driftseed_isle", "driftseed_greenhouse", "driftseed_conservatory", "driftseed_vents",
];
const holds = (c: Cond | undefined, f: Record<string, boolean>) => !c || c.every((v) => (f[v.flag] ?? false) === v.is);
function effects(id: string, initial: Record<string, boolean>) {
  const flags = { ...initial }, ops: ScriptCmd[] = [];
  const run = (cmds: ScriptCmd[]) => {
    for (const c of cmds) {
      if (c.op === "if") run(holds(c.when, flags) ? c.then : c.else ?? []);
      else if (c.op === "call") run(WORLD.scripts[c.script]);
      else { ops.push(c); if (c.op === "setFlag") flags[c.flag] = c.value ?? true; }
    }
  };
  run(WORLD.scripts[id]);
  return { flags, ops };
}

describe("Chapter 6 world", () => {
  it("appends all ten maps in order, at the specified dimensions", () => {
    expect(MAP_IDS.slice(MAP_IDS.indexOf("route_7"), MAP_IDS.indexOf("route_7") + 10)).toEqual(CH6);
    for (const [id, w, h] of [
      ["route_7", 30, 50], ["saltmarsh_harbour", 40, 30], ["saltmarsh_conservatory", 16, 18],
      ["route_8", 40, 40], ["driftseed_isle", 34, 30], ["driftseed_conservatory", 16, 18], ["driftseed_vents", 24, 24],
    ] as const) expect([grid(WORLD.maps[id]).w, grid(WORLD.maps[id]).h]).toEqual([w, h]);
  });

  it("keeps the only south road behind the ford keeper until ch5_done", () => {
    const m = WORLD.maps.fallowfield, g = grid(m);
    const exit = m.warps.filter((w) => w.to === "route_7");
    expect(exit).toHaveLength(1);
    const keeper = m.npcs.find((n) => n.id === "ford_keeper")!;
    expect(keeper).toMatchObject({ sprite: "villager_a", script: "ch6_ford_keeper", visibleWhen: [{ flag: "ch5_done", is: false }] });
    for (const done of [false, true]) {
      const blocked = new Set(m.npcs.filter((n) => holds(n.visibleWhen, { ch5_done: done, got_seed: true })).map((n) => key(n.x, n.y)));
      const reach = flood({ ...g, structureSolid: (x, y) => g.structureSolid(x, y) || blocked.has(key(x, y)) }, [{ x: 13, y: 19 }]);
      expect(reach.has(key(exit[0].x, exit[0].y))).toBe(done);
    }
    expect(flood(grid(WORLD.maps.route_7), [{ x: 14, y: 1 }]).has("14,49")).toBe(true);
  });

  it("requires the raft for the sea and harbour south edge, with safe warp arrivals", () => {
    const harbour = WORLD.maps.saltmarsh_harbour;
    const exits = harbour.warps.filter((w) => w.to === "route_8");
    for (const rafting of [false, true]) {
      const reach = flood(grid(harbour, { rafting }), [{ x: 18, y: 1 }]);
      expect(exits.every((w) => reach.has(key(w.x, w.y)))).toBe(rafting);
      const sea = WORLD.maps.route_8;
      expect(flood(grid(sea, { rafting }), [{ x: 18, y: 1 }]).has("18,39")).toBe(rafting);
    }
    // Lead decision: sea crossings (water warp -> water arrival) keep the raft, so they
    // land on open water, never an isolated pier; every other arrival is walkable land.
    const isWater = (id: MapId, x: number, y: number) => !!(TILES as Record<string, { water?: boolean }>)[grid(WORLD.maps[id]).tile(x, y) ?? ""]?.water;
    for (const id of CH6) for (const w of WORLD.maps[id].warps) {
      if (isWater(id, w.x, w.y)) expect(isWater(w.to, w.toX, w.toY), `${id} -> ${w.to}`).toBe(true);
      else expect(walkable(grid(WORLD.maps[w.to]), w.toX, w.toY), `${id} -> ${w.to}`).toBe(true);
    }
    expect(checkProgressWithoutRaft(WORLD)).toEqual([]);
    const without = structuredClone(WORLD);
    without.scripts.ch6_reyes_point = [];
    expect(checkProgressWithoutRaft(without).join("\n")).toMatch(/without RAFT/);
  });

  it("requires obtainable saxifrage for the boulder rooms", () => {
    expect(checkProgressWithoutSaxifrage(WORLD)).toEqual([]);
    const without = structuredClone(WORLD);
    without.scripts.ch6_elder = [];
    expect(checkProgressWithoutSaxifrage(without).join("\n")).toMatch(/without UPROOT/);
    for (const id of ["driftseed_conservatory", "driftseed_vents"] as const) {
      const m = WORLD.maps[id], runtime = buildMap(m), stones = m.npcs.filter((n) => n.pushable);
      const start = { x: m.warps[0].x, y: m.warps[0].y - 1 };
      const goal = id === "driftseed_conservatory" ? { x: 7, y: 3 } : { x: 5, y: 5 };
      const blocked = new Set(m.npcs.map((n) => key(n.x, n.y)));
      const g = grid(m);
      expect(flood({ ...g, structureSolid: (x, y) => g.structureSolid(x, y) || blocked.has(key(x, y)) }, [start]).has(key(goal.x, goal.y))).toBe(false);
      expect(solveBoulderPuzzle(runtime, stones, start, goal)).toBe(true);
      if (id === "driftseed_vents") {
        const reached = reachableBoulderTiles(runtime, stones, start);
        for (const n of m.npcs.filter((n) => n.sprite === "item_pickup")) {
          expect(Object.values(DIRS).some(({ dx, dy }) => reached.has(key(n.x + dx, n.y + dy)))).toBe(true);
        }
      }
    }
  });

  it("gates the Conservatory door on lantern_healed and moves refusals away", () => {
    const m = WORLD.maps.saltmarsh_harbour;
    const door = m.warps.find((w) => w.to === "saltmarsh_conservatory")!;
    const t = m.triggers.find((t) => t.script === "ch6_cons5_door")!;
    expect(t).toMatchObject({ x: door.x, y: door.y + 1 });
    for (const healed of [false, true]) {
      expect(holds(t.when, { lantern_healed: healed })).toBe(!healed);
      expect(effects(t.script, { lantern_healed: healed }).ops.filter((c) => c.op === "movePlayer"))
        .toEqual(healed ? [] : [{ op: "movePlayer", path: ["down"] }]);
    }
  });

  it("reaches a walkable Lantern Tree talk approach from the sea arrivals", () => {
    const harbour = WORLD.maps.saltmarsh_harbour;
    const tree = harbour.triggers.find((t) => t.script === "ch6_lantern_tree")!;
    const land = grid(harbour), raft = grid(harbour, { rafting: true });
    expect(isTalkTrigger(land, tree)).toBe(true);
    const approaches = Object.values(DIRS).map(({ dx, dy }) => ({ x: tree.x + dx, y: tree.y + dy }))
      .filter(({ x, y }) => walkable(land, x, y) && !harbour.npcs.some((n) => n.x === x && n.y === y));
    expect(approaches.length).toBeGreaterThan(0);
    for (const arrival of WORLD.maps.route_8.warps.filter((w) => w.to === harbour.id)) {
      const reach = flood(raft, [{ x: arrival.toX, y: arrival.toY }]);
      expect(approaches.some(({ x, y }) => reach.has(key(x, y)))).toBe(true);
    }
  });

  it("uses the exact encounter species/weights and caps every numeric growth trigger", () => {
    const expected = {
      route_7: [["mangrove_propagule", 30, 23, 23], ["cattail", 20, 24, 27], ["sundew", 15, 24, 27], ["pear_pad", 15, 21, 21], ["seagrass_shoot", 10, 24, 27], ["mint_sprig", 10, 15, 15]],
      route_8: [["seagrass_shoot", 45, 26, 27], ["mangrove_propagule", 30, 23, 23], ["giant_water_lily", 10, 26, 30], ["eelgrass", 15, 28, 30]],
      driftseed_isle: [["pear_pad", 35, 21, 21], ["padded_cactus", 25, 26, 30], ["saguaro_pup", 20, 26, 29], ["fireweed_shoot", 10, 26, 29], ["vanilla_vine", 10, 26, 30]],
      driftseed_vents: [["padded_cactus", 35, 28, 31], ["saguaro_pup", 30, 28, 29], ["fireweed_shoot", 20, 28, 29], ["vanilla_vine", 15, 28, 31]],
    };
    for (const id of Object.keys(expected) as (keyof typeof expected)[]) {
      const enc = WORLD.maps[id].encounters!;
      expect((enc.water ?? enc.grass)!.slots.map((s) => [s.species, s.weight, s.minLevel, s.maxLevel])).toEqual(expected[id]);
    }
    for (const id of CH6) for (const enc of Object.values(WORLD.maps[id].encounters ?? {})) for (const s of enc.slots) {
      const t = DATA.species[s.species].growsInto?.trigger;
      if (t && "level" in t) expect(s.maxLevel, `${id} ${s.species}`).toBeLessThan(t.level);
      expect(s.minLevel).toBeLessThanOrEqual(s.maxLevel);
    }
    expect(WORLD.maps.route_7.hidden).toHaveLength(2);
    expect(WORLD.maps.route_8.hidden).toHaveLength(2);
    expect(WORLD.maps.route_7.npcs.filter((n) => n.trainer)).toHaveLength(3);
    expect(WORLD.maps.route_8.npcs.filter((n) => n.trainer)).toHaveLength(4);
  });

  it("places every story/quest NPC and script, and carries Glasshouse stock plus rain", () => {
    for (const [map, id, script] of [
      ["saltmarsh_harbour", "doctor", "ch6_doctor"], ["saltmarsh_harbour", "reyes_point", "ch6_reyes_point"],
      ["driftseed_isle", "isle_elder", "ch6_elder"], ["saltmarsh_market", "trader", "q_hand_pollinator"],
      ["route_8", "survey_assistant", "q_seagrass_survey"],
    ] as const) expect(WORLD.maps[map].npcs.find((n) => n.id === id)?.script).toBe(script);
    const harbour = WORLD.maps.saltmarsh_harbour;
    const tree = harbour.triggers.find((t) => t.script === "ch6_lantern_tree")!;
    expect(isTalkTrigger(grid(harbour), tree)).toBe(true);
    expect(harbour.signs.some((s) => s.x === tree.x && s.y === tree.y)).toBe(false);
    for (const id of ["ch6_ford_keeper", "ch6_arrival", "ch6_doctor", "ch6_reyes_point", "ch6_lantern_tree", "ch6_cons5_door", "ch6_elder", "saguaro", "ch6_saguaro_after", "ch6_end", "q_seagrass_survey", "q_hand_pollinator"]) expect(WORLD.scripts[id], id).toBeDefined();
    expect(effects(WORLD.maps.saltmarsh_harbour.onEnter!, {}).flags).toMatchObject({ ch6_arrived: true, visited_saltmarsh_harbour: true });
    expect(effects(WORLD.maps.driftseed_isle.onEnter!, {}).flags.visited_driftseed_isle).toBe(true);
    const stock: string[] = [];
    for (const id of ["ch6_market_pods", "ch6_market_care"]) eachCmd(WORLD.scripts[id], (c) => { if (c.op === "shop") stock.push(...c.stock); });
    expect(stock).toEqual(["terrarium_pod", "glass_pod", "water_flask", "spring_water", "compost", "neem_spray", "plant_food", "aloe_gel", "cloche", "rain_jar"]);
  });

  it("keeps prescribed route/junior teams, portraits, battle music and leader rewards", () => {
    const teams = {
      angler_reed: [["cattail", 25], ["sundew", 26]], angler_moss: [["pitcher_plant", 26]],
      birder_tern: [["mangrove_propagule", 24], ["white_clover", 26]],
      grunt_dock_1: [["stinging_nettle", 27], ["fireweed", 27]], grunt_dock_2: [["venus_flytrap", 27], ["sugar_maple", 28]],
      sailor_kelp: [["seagrass_shoot", 27], ["lily_pad", 28]], sailor_brine: [["eelgrass", 29]],
      diver_coral: [["mangrove_sapling", 28], ["cattail", 28]], diver_shoal: [["seagrass_shoot", 28], ["giant_water_lily", 29]],
      jr_spine: [["pear_pad", 28], ["padded_cactus", 29]], jr_needle: [["stinging_nettle", 29], ["padded_cactus", 29]],
      jr_tide: [["seagrass_shoot", 30], ["lily_pad", 30]], jr_current: [["mangrove_sapling", 31], ["eelgrass", 31]],
    };
    for (const [id, team] of Object.entries(teams)) {
      const t = WORLD.trainers[id];
      expect(t.team.map((q) => [q.species, q.level]), id).toEqual(team);
      expect(t.intro).toContain("TODO(text)");
      expect(t.defeat).toContain("TODO(text)");
      expect(t.after).toContain("TODO(text)");
      const portrait = id.startsWith("angler") || id.startsWith("sailor") ? "hiker" : id.startsWith("birder") ? "birdwatcher" : id.startsWith("grunt") ? "grunt" : "gardener";
      expect(t.portrait).toBe(portrait);
      expect(t.music).toBe(id.startsWith("grunt") ? "battle_rootstock" : "battle_trainer");
    }
    // Only levels and moves change during balance tuning; preserve team identity/order.
    for (const [id, species, mark, portrait, waters] of [
      ["saguaro", ["padded_cactus", "prickly_pear", "saguaro_column"], "cactus_mark", "hollis", 1],
      ["reyes", ["eelgrass", "mangrove_sapling", "giant_water_lily", "red_mangrove"], "mangrove_mark", "nell_pitcher", 2],
    ] as const) {
      const t = WORLD.trainers[id];
      expect(t.team.map((q) => q.species)).toEqual(species);
      expect(t).toMatchObject({ ai: "smart", music: "battle_leader", className: "WARDEN", mark, portrait, items: [{ item: "spring_water", qty: waters }] });
      expect(WORLD.maps[id === "saguaro" ? "driftseed_conservatory" : "saltmarsh_conservatory"].npcs.find((n) => n.id === id)?.script).toBe(id);
    }
  });

  it("provides valid unoccupied glide landings below both healing doors", () => {
    for (const [town, greenhouse] of [["saltmarsh_harbour", "saltmarsh_greenhouse"], ["driftseed_isle", "driftseed_greenhouse"]] as const) {
      const m = WORLD.maps[town], door = m.warps.find((w) => w.to === greenhouse)!;
      const d = WORLD.glide!.find((d) => d.map === town)!;
      expect(d).toMatchObject({ x: door.x, y: door.y + 1, facing: "down" });
      expect(walkable(grid(m), d.x, d.y)).toBe(true);
      expect(m.npcs.some((n) => n.x === d.x && n.y === d.y)).toBe(false);
      expect(WORLD.maps[greenhouse].healPoint).toBeDefined();
    }
  });
});

// Exhaust the actual legal push states. The ledges confine each stone to its
// chokepoint/pocket, so the three-boulder puzzle has four reachable prefix layouts.
describe("Saguaro UPROOT puzzle", () => {
  it("reaches Saguaro from reset, and keeps the exit in every reachable layout", () => {
    const m = WORLD.maps.driftseed_conservatory, runtime = buildMap(m);
    const start = { x: 7, y: 16 }, exit = { x: 7, y: 17 }, goal = { x: 7, y: 3 };
    expect(solveBoulderPuzzle(runtime, m.npcs.filter((n) => n.pushable), start, goal)).toBe(true);
    const occupied = new Set(m.npcs.filter((n) => !n.pushable).map((n) => key(n.x, n.y)));
    const states = [{ stones: m.npcs.filter((n) => n.pushable).map(({ x, y }) => ({ x, y })), player: start }];
    const seen = new Set<string>();
    for (let i = 0; i < states.length; i++) {
      const { stones, player } = states[i];
      const signature = stones.map((s) => key(s.x, s.y)).sort().join(";");
      if (seen.has(signature)) continue;
      seen.add(signature);
      const blocked = new Set([...occupied, ...stones.map((s) => key(s.x, s.y))]);
      const region = reachableBoulderTiles(runtime, [], player, { occupied: (x, y) => blocked.has(key(x, y)) });
      // Check every player position in this layout, respecting one-way ledges.
      for (const cell of region) {
        const [x, y] = cell.split(",").map(Number);
        expect(solveBoulderPuzzle(runtime, stones, { x, y }, exit), `${signature} from ${cell}`).toBe(true);
      }
      stones.forEach((stone, j) => {
        for (const [dir, { dx, dy }] of Object.entries(DIRS)) {
          const stand = { x: stone.x - dx, y: stone.y - dy };
          if (!region.has(key(stand.x, stand.y))) continue;
          const push = tryPushBoulder(runtime, stone, dir as keyof typeof DIRS, true, (x, y) => blocked.has(key(x, y)));
          if (push.kind === "push") states.push({ stones: stones.map((s, k) => k === j ? { x: push.x, y: push.y } : s), player: stand });
        }
      });
    }
    expect(seen.size).toBe(4);
  });
});

// Morrow-style coverage over position + lever state, using runtime RAFT moves.
describe("Reyes raft pools", () => {
  const m: MapDef = WORLD.maps.saltmarsh_conservatory;
  const lever = m.npcs.find((n) => n.sprite === "lever")!;
  const leader = m.npcs.find((n) => n.id === "reyes")!;
  const occupied = new Set(m.npcs.map((n) => key(n.x, n.y)));
  const runtime = (open: boolean) => {
    const r = buildMap(m);
    const override = m.legendWhen!.find((o) => holds(o.when, { cons5_gate: open }))!;
    r.legendOverride = { ...m.legend, ...override.legend };
    return r;
  };
  const variants = [runtime(false), runtime(true)];
  const next = (p: BoulderPosition, open: boolean) => {
    const r = variants[Number(open)], result: BoulderPosition[] = [];
    for (const dir of Object.keys(DIRS) as (keyof typeof DIRS)[]) {
      const water = !!(TILES[tileAt(r, p.x, p.y)] as { water?: boolean }).water;
      const move = tryRaftMove(r, p.x, p.y, dir, water, true, (x, y) => occupied.has(key(x, y)));
      if (move.kind !== "blocked") result.push({ x: move.x, y: move.y });
    }
    return result;
  };
  const by = (p: BoulderPosition, n: BoulderPosition) => Math.abs(p.x - n.x) + Math.abs(p.y - n.y) === 1;
  type State = BoulderPosition & { open: boolean };
  const bfs = (start: State, toggle: boolean) => {
    const stateKey = (s: State) => `${key(s.x, s.y)}|${Number(s.open)}`;
    const seen = new Map([[stateKey(start), start]]), q = [start];
    for (let i = 0; i < q.length; i++) {
      const s = q[i], steps = next(s, s.open).map((p) => ({ ...p, open: s.open }));
      if (toggle && by(s, lever)) steps.push({ ...s, open: effects(lever.script!, { cons5_gate: s.open }).flags.cons5_gate });
      for (const n of steps) if (!seen.has(stateKey(n))) { seen.set(stateKey(n), n); q.push(n); }
    }
    return [...seen.values()];
  };
  it("needs RAFT to reach the switch island", () => {
    const r = variants[0];
    expect(tryMove(r, 7, 14, "up").kind).toBe("blocked");
    expect(tryRaftMove(r, 7, 14, "up", false, true).kind).toBe("mount");
  });
  it("opens only the gate state that reaches Reyes, retaining the exit in both states", () => {
    for (const open of [false, true]) {
      const reached = bfs({ x: 7, y: 16, open }, false);
      expect(reached.some((s) => by(s, leader))).toBe(open);
      expect(reached.some((s) => s.x === 7 && s.y === 17)).toBe(true);
      expect(reached.some((s) => by(s, lever))).toBe(true);
    }
  });
  it("covers every reachable position/lever state with an escape and a route to Reyes", () => {
    const reached = bfs({ x: 7, y: 16, open: false }, true);
    expect(new Set(reached.map((s) => s.open))).toEqual(new Set([false, true]));
    for (const s of reached) {
      const onward = bfs(s, true);
      expect(onward.some((p) => p.x === 7 && p.y === 17)).toBe(true);
      expect(onward.some((p) => by(p, leader))).toBe(true);
    }
    for (const n of m.npcs) expect(reached.some((s) => by(s, n)), n.id).toBe(true);
  });
});
