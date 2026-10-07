import { describe, expect, it } from "vitest";
import { MAP_IDS, REQUIRED_ITEMS } from "../contracts";
import { DATA } from "../data";
import { fieldMoveFlag } from "../overworld/fieldmove";
import { buildMap, filledPitFlag, refreshLegend } from "../overworld/map";
import { continuePosition } from "../overworld/continue";
import { reachableBoulderTiles, solveBoulderPuzzle } from "../overworld/uproot";
import { WORLD } from "./index";
import { POSTGAME_MAPS } from "./maps/seed_vault";
import { cloneRematch } from "./rematches";
import { canReach, checkPostgameAccess, flood, grid, reachablePostgameMaps, validateWorld } from "./validate";

const entrance = { x: 11, y: 17 }, lower = { x: 11, y: 2 };

describe("post-game world access", () => {
  it("registers five new maps and reuses Fennimore's existing cottage", () => {
    expect(MAP_IDS.slice(MAP_IDS.indexOf("seed_vault_entrance"))).toEqual(POSTGAME_MAPS);
    const sizes = [[14, 12], [24, 20], [24, 20], [16, 14], [16, 14]];
    for (const [i, id] of POSTGAME_MAPS.entries()) {
      expect([WORLD.maps[id].tiles[0].length, WORLD.maps[id].tiles.length]).toEqual(sizes[i]);
      expect(WORLD.maps[id].outdoor).toBe(id === "methuselah_ridge");
    }
    expect(WORLD.maps.fennimore_house.npcs.find((n) => n.id === "fennimore")?.script).toBe("pg_fennimore");
    expect(WORLD.scripts.pg_fennimore).toEqual([{ op: "if", when: [{ flag: "game_cleared", is: true }],
      then: [{ op: "call", script: "pg_diary" }], else: [{ op: "call", script: "fennimore" }] }]);
  });

  it("requires game_cleared for every new area even if the diary flag was set early", () => {
    for (const diary_read of [false, true]) expect(reachablePostgameMaps(WORLD, { game_cleared: false, diary_read }).size).toBe(0);
    expect(reachablePostgameMaps(WORLD, { game_cleared: true, diary_read: false })).toEqual(new Set(POSTGAME_MAPS.slice(0, 4)));
    expect(reachablePostgameMaps(WORLD, { game_cleared: true, diary_read: true })).toEqual(new Set(POSTGAME_MAPS));
    expect(checkPostgameAccess(WORLD)).toEqual([]);
  });

  it("the main validator catches a missing Route 9 gate or a Ridge diary gate", () => {
    const world = structuredClone(WORLD);
    world.maps.route_9.legendWhen = [];
    expect(checkPostgameAccess(world).join("\n")).toContain("reachable without game_cleared");
    expect(validateWorld(world).join("\n")).toContain("reachable without game_cleared");
    world.maps.route_9 = structuredClone(WORLD.maps.route_9);
    world.maps.seed_vault_entrance.legendWhen = world.maps.seed_vault_entrance.legendWhen!.filter((entry) => !entry.when.some((c) => c.flag === "diary_read"));
    expect(checkPostgameAccess(world)).toEqual(["[methuselah_ridge] reachable without diary_read"]);
  });

  it("catches an extra ordinary route into a deeper floor", () => {
    const world = structuredClone(WORLD);
    world.maps.route_1.warps.push({ x: 9, y: 0, to: "seed_vault_b3", toX: 7, toY: 11 });
    expect(checkPostgameAccess(world).join("\n")).toContain("[seed_vault_b3] reachable without game_cleared");
  });

  it("stages the event NPCs with their required gates and script hooks", () => {
    expect(WORLD.maps.elder_grove_heart.npcs.find((n) => n.id === "centuryheart_sprout")).toMatchObject({
      script: "pg_centuryheart", visibleWhen: [{ flag: "game_cleared", is: true }, { flag: "got_centuryheart", is: false }],
    });
    expect(WORLD.maps.methuselah_ridge.npcs.find((n) => n.id === "methuselah")).toMatchObject({
      script: "pg_methuselah", visibleWhen: [{ flag: "game_cleared", is: true }, { flag: "diary_read", is: true }],
    });
    expect(WORLD.maps.council_hall.npcs.find((n) => n.id === "rowan")).toMatchObject({ script: "pg_wanderers", visibleWhen: [{ flag: "game_cleared", is: true }] });
    for (const id of ["pg_centuryheart", "pg_wanderers", "pg_diary", "pg_methuselah", "pg_council_rematch"]) expect(WORLD.scripts[id]).toBeDefined();
    const cmd = WORLD.scripts.pg_methuselah[0];
    expect(cmd.op).toBe("if");
    if (cmd.op === "if") expect(cmd.then[0]).toMatchObject({ op: "ifTime", time: ["night"], else: [{ op: "say", text: "TODO(text): It's only an old tree." }] });
  });

  it("places the one-time diary pickup in the archive", () => {
    expect(REQUIRED_ITEMS).toContain("old_diary");
    expect(DATA.items.old_diary).toMatchObject({ name: "Old Diary", pocket: "key", price: 0, usableInBattle: false, usableInField: false });
    expect(DATA.items.old_diary.name.length).toBeLessThanOrEqual(12);
    expect(DATA.items.old_diary.description.length).toBeLessThanOrEqual(36);
    expect(WORLD.maps.seed_vault_b3.npcs).toContainEqual(expect.objectContaining({ id: "old_diary", sprite: "item_pickup", visibleWhen: [{ flag: "game_cleared", is: true }] }));
  });

  it("encounters every Chapter 11 line and older finals at levels 58–66", () => {
    const slots = POSTGAME_MAPS.flatMap((id) => WORLD.maps[id].encounters?.grass?.slots ?? []);
    const ch11 = DATA.species;
    const lines = ["nightshade_sprout", "oleander", "mimosa_sprout", "prayer_plant", "corpse_corm", "flame_lily_tuber"] as const;
    for (const id of lines) expect(slots.some((s) => ch11[s.species].line === ch11[id].line), id).toBe(true);
    for (const slot of slots) {
      expect(slot.minLevel).toBeGreaterThanOrEqual(58);
      expect(slot.maxLevel).toBeLessThanOrEqual(66);
      expect(slot.maxLevel).toBeGreaterThanOrEqual(slot.minLevel);
      expect(ch11[slot.species].growsInto).toBeUndefined();
    }
    expect(Math.min(...slots.map((s) => s.minLevel))).toBe(58);
    expect(Math.max(...slots.map((s) => s.maxLevel))).toBe(66);
    expect(slots.some((s) => s.species === "great_oak")).toBe(true);
  });
});

describe("Seed Vault B1 ice", () => {
  const map = WORLD.maps.seed_vault_b1, g = grid(map), reached = flood(g, [entrance]);
  it("is dark and requires the full alternating ice path to the next floor", () => {
    expect(map.dark).toBe(true);
    expect(reached.has(`${lower.x},${lower.y}`)).toBe(true);
    for (const y of [6, 10, 14]) {
      expect(reached.has(`3,${y}`)).toBe(true);
      expect(reached.has(`20,${y}`)).toBe(true);
      expect(reached.has(`11,${y}`)).toBe(false);
    }
    const blocked = grid({ ...map, legend: { ...map.legend, "{": "wall" } });
    expect(flood(blocked, [entrance]).has(`${lower.x},${lower.y}`)).toBe(false);
  });
  it("can retreat from every reachable slide stop and from either floor entrance", () => {
    const exitReach = canReach(g, map.warps);
    for (const point of reached) expect(exitReach.has(point), point).toBe(true);
    expect(flood(g, [{ x: 11, y: 3 }]).has("11,18")).toBe(true);
  });
});

describe("Seed Vault B2 pits and root bridge", () => {
  const room = WORLD.maps.seed_vault_b2, start = { x: 3, y: 16 }, goal = { x: 20, y: 2 };
  const bridge = fieldMoveFlag("rootbridge", room.id, 12, 10);
  const runtime = (subset: number, bridged = true) => {
    const map = buildMap(room);
    refreshLegend(map, { [bridge]: bridged, [filledPitFlag(room.id, 8, 10)]: !!(subset & 1), [filledPitFlag(room.id, 16, 10)]: !!(subset & 2) });
    return map;
  };
  it("requires both UPROOT and ROOT BRIDGE to cross", () => {
    expect(solveBoulderPuzzle(runtime(0), [], start, goal)).toBe(false);
    expect(solveBoulderPuzzle(runtime(0, false), room.npcs, start, goal)).toBe(false);
    expect(solveBoulderPuzzle(runtime(0), room.npcs, start, goal)).toBe(true);
    expect(solveBoulderPuzzle(runtime(3), [], start, goal)).toBe(true);
  });
  it("solves every persisted pit subset with reset stones, and returns after both fills", () => {
    const before = JSON.stringify(room);
    for (let subset = 0; subset < 4; subset++) {
      expect(solveBoulderPuzzle(runtime(subset), room.npcs, start, goal), `subset ${subset}`).toBe(true);

    }
    // Reaching B3 necessarily fills both pits; those fills persist on return.
    expect(solveBoulderPuzzle(runtime(3), room.npcs, { x: 20, y: 3 }, { x: 3, y: 17 })).toBe(true);
    expect(JSON.stringify(room)).toBe(before);
  });
  it("Continue can always retreat to the previous floor before pushing or bridging", () => {
    const entry = continuePosition(WORLD, { map: room.id, x: -1, y: -1, facing: "up" });
    const stones = new Set(room.npcs.map((n) => `${n.x},${n.y}`));
    const tiles = reachableBoulderTiles(runtime(0, false), [], entry, { occupied: (x, y) => stones.has(`${x},${y}`) });
    expect(tiles.has("3,17")).toBe(true);
  });
});

describe("Council rematch trainers", () => {
  it("clones every Council team exactly eight levels higher with legal moves", () => {
    for (const id of ["belladonna", "mimi_osa", "titus_arum", "pyra", "rowan"]) {
      const base = WORLD.trainers[id], rematch = WORLD.trainers[`${id}_rematch`];
      expect(rematch.team).toEqual(base.team.map((member) => ({ ...member, level: member.level + 8 })));
      expect(rematch.ai).toBe("smart");
      expect(rematch.items).toEqual(base.items);
      expect(rematch.portrait).toBe(base.portrait);
      for (const member of rematch.team) for (const move of member.moves ?? []) {
        expect(DATA.species[member.species].learnset.filter((l) => l.level <= member.level).map((l) => l.move)).toContain(move);
      }
      for (const kind of ["intro", "defeat", "after"] as const) expect(rematch[kind]).toBe(`TODO(text): ${id}_rematch ${kind}`);
    }
    expect(WORLD.trainers.rowan_rematch.prize).toBe(5000);
  });
  it("the general +N helper does not share mutable arrays or change its source", () => {
    const base = structuredClone(WORLD.trainers.rowan), before = structuredClone(base);
    const clone = cloneRematch(base, 8);
    clone.team[0].level = 100;
    clone.team[0].moves!.pop();
    clone.items![0].qty = 99;
    expect(base).toEqual(before);
    expect(clone.id).toBe("rowan_rematch");
  });
});
