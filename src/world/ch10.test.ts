import { describe, expect, it } from "vitest";
import { MAP_IDS, MARKS, type Dir, type MapDef, type ScriptCmd, type SpeciesId } from "../contracts";
import { DATA } from "../data";
import { buildMap, checkCond, DIRS, filledPitFlag, isWalkable, key, refreshLegend, tileAt, tryMove } from "../overworld/map";
import { reachableBoulderTiles, solveBoulderPuzzle } from "../overworld/uproot";
import { WORLD } from "./index";
import { canReach, eachCmd, flood, grid, validateWorld, walkable } from "./validate";

const CH10 = ["route_12", "council_arboretum", "arboretum_greenhouse", "elder_grove_1", "elder_grove_2", "elder_grove_3", "elder_grove_heart", "council_hall"] as const;
const cells = (m: MapDef, tile: string) => m.tiles.flatMap((r, y) => [...r].flatMap((ch, x) => m.legend[ch] === tile ? [{ x, y }] : []));
const ops = (cmds: ScriptCmd[], flags: Record<string, boolean>, marks: string[] = []): ScriptCmd[] => cmds.flatMap((c) => {
  if (c.op === "if") return ops(checkCond(c.when, flags) ? c.then : c.else ?? [], flags, marks);
  if (c.op === "ifMarks") return ops(c.marks.every((m) => marks.includes(m)) ? c.then : c.else ?? [], flags, marks);
  return [c];
});

// Model the actual step graph, including automatic clearings. Keeping the
// flag in the node is essential: the return edges can toggle the lanes again.
function groveGraph(won = false) {
  const m = WORLD.maps.elder_grove_2, runtime = buildMap(m);
  const npcs = new Set(m.npcs.filter((n) => checkCond(n.visibleWhen, { bram_joined: true, beat_mercer: false })).map((n) => key(n.x, n.y)));
  const edges = new Map<string, string[]>();
  const encode = (x: number, y: number, lean: boolean) => `${x},${y},${Number(lean)}`;
  for (const lean of [false, true]) {
    refreshLegend(runtime, { grove_lean: lean, beat_calloway_2: won });
    for (let y = 0; y < runtime.h; y++) for (let x = 0; x < runtime.w; x++) {
      if (!isWalkable(runtime, x, y) || npcs.has(key(x, y))) continue;
      const next: string[] = [];
      for (const dir of Object.keys(DIRS) as Dir[]) {
        const step = tryMove(runtime, x, y, dir, (px, py) => npcs.has(key(px, py)));
        if (step.kind === "blocked") continue;
        let newLean = lean;
        for (const t of m.triggers.filter((t) => t.x === step.x && t.y === step.y)) {
          for (const c of ops(WORLD.scripts[t.script], { grove_lean: newLean })) if (c.op === "setFlag" && c.flag === "grove_lean") newLean = c.value !== false;
        }
        next.push(encode(step.x, step.y, newLean));
      }
      edges.set(encode(x, y, lean), next);
    }
  }
  return edges;
}
function search(edges: Map<string, string[]>, starts: string[]) {
  const seen = new Set(starts), queue = [...starts];
  for (let head = 0; head < queue.length; head++) for (const n of edges.get(queue[head]) ?? []) {
    if (!seen.has(n)) { seen.add(n); queue.push(n); }
  }
  return seen;
}

describe("Chapter 10 world", () => {
  it("appends eight maps in the prescribed order and sizes", () => {
    expect(MAP_IDS.slice(MAP_IDS.indexOf("route_12"))).toEqual(CH10);
    const sizes = [[40, 36], [34, 28], [11, 9], [30, 30], [30, 30], [26, 26], [20, 20], [16, 12]];
    CH10.forEach((id, i) => {
      const m = WORLD.maps[id];
      expect([grid(m).w, grid(m).h]).toEqual(sizes[i]);
      expect(m.outdoor).toBe(!["arboretum_greenhouse", "council_hall"].includes(id));
    });
    expect(WORLD.maps.elder_grove_heart.structures).toContainEqual({ key: "big_oak", x: 8, y: 7 });
    expect(WORLD.maps.elder_grove_heart.musicWhen).toEqual([{ when: [{ flag: "beat_mercer", is: true }], music: "prologue_bloom" }]);
  });

  it("requires Chapter 9 before the west road, and eight actual marks before the Arboretum", () => {
    const m = buildMap(WORLD.maps.sanguine_ridge);
    for (const done of [false, true]) {
      refreshLegend(m, { ch9_done: done });
      expect(tryMove(m, 1, 15, "left").kind).toBe(done ? "walk" : "blocked");
      expect(ops(WORLD.scripts.ch10_west_gate, { ch9_done: done }).some((c) => c.op === "movePlayer")).toBe(!done);
    }
    for (let missing = -1; missing < MARKS.length; missing++) {
      const marks = MARKS.filter((_, i) => i !== missing);
      const script = ops(WORLD.scripts.ch10_marks_warden, {}, marks);
      expect(script.some((c) => c.op === "movePlayer")).toBe(missing !== -1);
      expect(script.some((c) => c.op === "setFlag")).toBe(missing === -1);
    }
    // The only western exit has a single approach through the checking trigger.
    const route = WORLD.maps.route_12, g = grid(route, { bridged: true, pruned: true, rafting: true });
    const terrain = { ...g, tile: (x: number, y: number) => g.tile(x, y) === "pit" ? "filled_pit" as const : g.tile(x, y) };
    expect(flood(terrain, [{ x: 38, y: 28 }]).has("0,3")).toBe(true);
    expect(flood({ ...terrain, structureSolid: (x, y) => g.structureSolid(x, y) || (x === 1 && y === 3) }, [{ x: 38, y: 28 }]).has("0,3")).toBe(false);
    expect(route.triggers.find((t) => t.x === 1 && t.y === 3)?.script).toBe("ch10_marks_warden");
  });

  it.each([undefined, "rootbridge", "uproot", "prune", "raft"])("blocks the required road when %s is missing", (missing) => {
    const m = WORLD.maps.route_12;
    expect(cells(m, "bramble_bush")).toEqual([{ x: 3, y: 3 }]);
    expect(cells(m, "water")).toHaveLength(4);
    const g = grid(m, { bridged: missing !== "rootbridge", pruned: missing !== "prune", rafting: missing !== "raft" });
    const solved = { ...g, tile: (x: number, y: number) => g.tile(x, y) === "pit" && missing !== "uproot" ? "filled_pit" as const : g.tile(x, y) };
    expect(flood(solved, [{ x: 38, y: 28 }]).has("0,3")).toBe(!missing);
  });

  it("requires all three root gaps independently and a filled pit", () => {
    const m = WORLD.maps.route_12, gaps = cells(m, "root_gap"), pits = cells(m, "pit");
    expect(gaps).toHaveLength(3);
    expect(pits).toEqual([{ x: 5, y: 7 }, { x: 6, y: 7 }]);
    const flags = Object.fromEntries([["pruned_route_12_3_3", true], ...gaps.map((p) => [`bridged_route_12_${p.x}_${p.y}`, true]), ...pits.map((p) => [filledPitFlag(m.id, p.x, p.y), true])]);
    for (const removed of [undefined, ...gaps]) {
      const rt = buildMap(m), chosen = { ...flags };
      if (removed) chosen[`bridged_route_12_${removed.x}_${removed.y}`] = false;
      refreshLegend(rt, chosen);
      const g = { ...grid(m, { rafting: true }), tile: (x: number, y: number) => tileAt(rt, x, y) };
      expect(flood(g, [{ x: 38, y: 28 }]).has("0,3")).toBe(!removed);
    }
    expect(flood(grid(m, { bridged: true, pruned: true, rafting: true }), [{ x: 38, y: 28 }]).has("0,3")).toBe(false);
    const stones = m.npcs.filter((n) => n.pushable);
    for (let subset = 0; subset < 4; subset++) {
      const rt = buildMap(m);
      refreshLegend(rt, { ...flags, ...Object.fromEntries(pits.map((p, i) => [filledPitFlag(m.id, p.x, p.y), !!(subset & (1 << i))])) });
      expect(solveBoulderPuzzle(rt, stones, { x: 38, y: 28 }, { x: 0, y: 3 }, { rafting: true })).toBe(true);
      const reach = reachableBoulderTiles(rt, stones, { x: 38, y: 28 }, { rafting: true });
      const g = { ...grid(m, { rafting: true }), tile: (x: number, y: number) => tileAt(rt, x, y) === "pit" && reach.has(key(x, y)) ? "filled_pit" as const : tileAt(rt, x, y) };
      const exits = canReach(g, m.warps);
      expect([...reach].every((k) => exits.has(k))).toBe(true);
    }
    expect(m.npcs.filter((n) => n.trainer)).toHaveLength(6);
    expect(m.hidden).toHaveLength(3);
  });

  it("opens each next ring only after its admin is beaten, preserving the return exit", () => {
    for (const [id, admin, next] of [["elder_grove_1", "shears_2", "elder_grove_2"], ["elder_grove_2", "calloway_2", "elder_grove_3"], ["elder_grove_3", "wren_2", "elder_grove_heart"]] as const) {
      const m = WORLD.maps[id], rt = buildMap(m), exit = m.warps.find((w) => w.to === next)!;
      for (const won of [false, true]) {
        refreshLegend(rt, { [`beat_${admin}`]: won });
        expect(isWalkable(rt, exit.x, exit.y)).toBe(won);
        expect(isWalkable(rt, m.warps[0].x, m.warps[0].y)).toBe(true);
        expect(WORLD.maps[next].warps.some((w) => w.to === id)).toBe(true);
      }
      expect(m.npcs.find((n) => n.id === admin)?.script).toBe(admin);
    }
  });

  it("solves the shifting grove with a position/lean BFS, with a return from every reachable state", () => {
    expect(WORLD.maps.elder_grove_2.triggers.filter((t) => t.script === "ch10_listening_clearing")).toHaveLength(3);
    for (const won of [false, true]) {
      const edges = groveGraph(won), reached = search(edges, ["15,28,0"]);
      expect([...reached].some((k) => k.startsWith("13,4,"))).toBe(true); // talk to CALLOWAY
      expect([...reached].some((k) => k.startsWith("15,0,"))).toBe(won);
      expect([...reached].some((k) => k.endsWith(",1"))).toBe(true);
      const reverse = new Map<string, string[]>();
      for (const [from, targets] of edges) for (const to of targets) reverse.set(to, [...reverse.get(to) ?? [], from]);
      const canReturn = search(reverse, ["15,29,0", "15,29,1"]);
      expect([...reached].filter((k) => !canReturn.has(k))).toEqual([]);
    }
  });

  it("has an open route to the heart after the admins, with exits from every reachable ring tile", () => {
    for (const id of ["elder_grove_1", "elder_grove_3", "elder_grove_heart"] as const) {
      const m = WORLD.maps[id], rt = buildMap(m);
      refreshLegend(rt, { beat_shears_2: true, beat_wren_2: true });
      const g = { ...grid(m, { rafting: true }), tile: (x: number, y: number) => tileAt(rt, x, y) };
      const reach = flood(g, [{ x: m.warps[0].x, y: m.warps[0].y }]), exits = canReach(g, m.warps);
      expect([...reach].every((k) => exits.has(k))).toBe(true);
      expect(m.warps.every((w) => reach.has(key(w.x, w.y)))).toBe(true);
    }
    expect(WORLD.maps.elder_grove_heart.warps[0].to).toBe("elder_grove_3");
  });

  it("uses the exact weighted encounter slots and never exceeds a numeric growth cap", () => {
    const slots = (id: typeof CH10[number]) => WORLD.maps[id].encounters!.grass!.slots.map((s) => [s.species, s.weight, s.minLevel, s.maxLevel]);
    expect(slots("route_12")).toEqual([["dragon_sapling", 20, 44, 44], ["lithops_pair", 20, 39, 39], ["saguaro", 15, 48, 55], ["larch", 15, 48, 55], ["red_cedar", 10, 48, 55], ["moss_campion", 10, 48, 55], ["dragon_fruit", 10, 48, 55]]);
    for (const id of ["elder_grove_1", "elder_grove_2", "elder_grove_3"] as const) expect(slots(id)).toEqual([["aspen_sucker", 40, 41, 41], ["ghost_pipe", 20, 48, 55], ["red_cedar", 15, 48, 55], ["moonflower", 15, 48, 55], ["cedar_seedling", 10, 33, 33]]);
    for (const id of MAP_IDS.slice(MAP_IDS.indexOf("route_6"))) {
      const m = WORLD.maps[id];
      for (const enc of [m.encounters, ...(m.encountersWhen ?? []).map((e) => e.encounters)]) for (const table of Object.values(enc ?? {})) for (const s of table.slots) {
        const growth = DATA.species[s.species].growsInto?.trigger;
        if (growth && "level" in growth) expect(s.maxLevel, `${id} ${s.species}`).toBeLessThan(growth.level);
      }
    }
  });

  it("stages every scene id, Bram's fallback appearances, the closed hall and glide landing", () => {
    for (const id of ["ch10_west_gate", "ch10_marks_warden", "ch10_arrival", "ch10_council_door", "ch10_bram_joins", "shears_2", "shears_2_after", "calloway_2", "calloway_2_after", "wren_2", "wren_2_after", "ch10_bram_heal", "mercer", "ch10_planting", "ch10_elder", "ch10_end"]) expect(WORLD.scripts[id], id).toBeDefined();
    expect(ops(WORLD.scripts.ch10_council_door, {}).some((c) => c.op === "movePlayer")).toBe(true);
    expect(ops(WORLD.scripts.ch10_council_door, { ch10_done: true }).some((c) => c.op === "movePlayer")).toBe(false);
    for (const [i, id] of (["elder_grove_1", "elder_grove_2", "elder_grove_3"] as const).entries()) expect(WORLD.maps[id].npcs.find((q) => q.id === `bram_ring_${i + 1}`)?.visibleWhen).toContainEqual({ flag: "bram_joined", is: true });
    const m = WORLD.maps.council_arboretum, door = m.warps.find((w) => w.to === "arboretum_greenhouse")!, landing = WORLD.glide!.find((d) => d.map === m.id)!;
    expect(landing).toMatchObject({ x: door.x, y: door.y + 1, facing: "down" });
    expect(walkable(grid(m), landing.x, landing.y)).toBe(true);
    expect(m.npcs.some((n) => n.x === landing.x && n.y === landing.y)).toBe(false);
    const calls: string[] = [];
    eachCmd(WORLD.scripts[m.onEnter!], (c) => { if (c.op === "call") calls.push(c.script); });
    expect(calls).toEqual(["ch10_arrival", "ch10_end"]);
    expect(validateWorld(WORLD)).toEqual([]);
  });

  it("keeps the prescribed boss species, grafts, levels within ±2 and only learned moves", () => {
    const teams: Record<string, [SpeciesId, number, boolean?][]> = {
      shears_2: [["bramble_berry", 53], ["holly", 54], ["stinging_nettle", 55], ["blackberry", 56]],
      calloway_2: [["red_mangrove", 55, true], ["lodgepole_pine", 54], ["ghost_pipe", 54], ["saguaro", 56, true]],
      wren_2: [["moth_orchid", 54], ["ghost_pipe", 55], ["red_cedar", 56], ["quaking_aspen", 57]],
      mercer: [["apple_tree", 56], ["wild_rose", 56], ["sugar_maple", 57], ["red_cedar", 57], ["dragon_tree", 58], ["quaking_aspen", 60]],
    };
    for (const [id, team] of Object.entries(teams)) {
      const t = WORLD.trainers[id];
      expect(t.team.map((q) => q.species)).toEqual(team.map((q) => q[0]));
      t.team.forEach((q, i) => {
        expect(Math.abs(q.level - team[i][1])).toBeLessThanOrEqual(2);
        expect(q.grafted ?? false).toBe(team[i][2] ?? false);
        for (const move of q.moves ?? []) expect(DATA.species[q.species].learnset.some((m) => m.move === move && m.level <= q.level), `${id} ${q.species} ${move}`).toBe(true);
      });
      expect(t.ai).toBe("smart");
      expect(t.music).toBe("battle_rootstock");
    }
    expect(WORLD.trainers.mercer.items).toEqual([{ item: "spring_water", qty: 3 }]);
    for (const id of CH10) for (const n of WORLD.maps[id].npcs.filter((q) => q.trainer)) {
      const t = WORLD.trainers[n.trainer!];
      for (const text of [t.intro, t.defeat, t.after]) expect(text).toMatch(/^(?!.*TODO)\S.*\S$/);
      if (t.id.startsWith("grunt_")) {
        expect([t.className, t.name]).toEqual(["ROOTSTOCK", "GRUNT"]);
        expect(t.team).toHaveLength(2);
        expect(t.team.every((q) => q.level >= 51 && q.level <= 54)).toBe(true);
      }
      if (t.id.startsWith("r12_")) {
        expect(t.team.length).toBeGreaterThanOrEqual(2);
        expect(t.team.length).toBeLessThanOrEqual(3);
        expect(t.team.every((q) => q.level >= 50 && q.level <= 53 && q.species !== "elder")).toBe(true);
      }
    }
  });
});
