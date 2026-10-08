import { describe, expect, it, vi } from "vitest";
import { MAP_IDS, type GameContext, type MapId, type ScriptCmd } from "../contracts";
import { DATA } from "../data";
import { rollEncounter } from "../overworld/encounters";
import { buildMap, checkCond, key, refreshLegend, tileAt, tryMove } from "../overworld/map";
import { runScript, type ScriptHost } from "../overworld/script";
import { newGameState } from "../save";
import { WORLD } from "./index";
import { canReach, eachCmd, flood, grid, isTalkTrigger } from "./validate";

const FLOORS: MapId[] = ["relay_2f", "relay_3f", "relay_roof"];
const resolved = (id: MapId, flags: Record<string, boolean>) => {
  const runtime = buildMap(WORLD.maps[id]);
  refreshLegend(runtime, flags);
  return { ...runtime.def, legend: { ...runtime.def.legend, ...runtime.legendOverride } };
};

function setup(flags: Record<string, boolean>) {
  const state = newGameState({ world: WORLD });
  Object.assign(state.flags, flags);
  const ctx = {
    state, world: WORLD, data: DATA, timeOfDay: () => "day",
    ui: { say: vi.fn(async () => {}) },
    audio: { playMusic: vi.fn() },
  } as unknown as GameContext;
  const host = { ctx, map: () => WORLD.maps.glasshouse_city, movePlayer: vi.fn(async () => {}) } as unknown as ScriptHost;
  return { state, host, run: (id: string) => runScript(host, id) };
}

// Follow actual walkable warp routes. Treat a door's rejecting movePlayer
// script as a barrier, just as the engine bounces the player off its approach.
function reachableMaps(flags: Record<string, boolean>) {
  const rejection = (cmds: ScriptCmd[]): boolean => cmds.some((c) =>
    c.op === "movePlayer" || (c.op === "if" && rejection(checkCond(c.when, flags) ? c.then : c.else ?? [])));
  const found = new Set<MapId>(), visited = new Set<string>();
  const queue: { id: MapId; x: number; y: number }[] = [{ id: "glasshouse_city", x: 5, y: 8 }];
  while (queue.length) {
    const entry = queue.shift()!;
    const k = `${entry.id}:${entry.x},${entry.y}`;
    if (visited.has(k)) continue;
    visited.add(k); found.add(entry.id);
    const m = resolved(entry.id, flags), g = grid(m);
    const barriers = m.triggers.filter((t) => checkCond(t.when, flags) && rejection(WORLD.scripts[t.script]));
    const reach = flood({ ...g, structureSolid: (x, y) => g.structureSolid(x, y) ||
      barriers.some((t) => x >= t.x && x < t.x + (t.w ?? 1) && y >= t.y && y < t.y + (t.h ?? 1)) }, [entry]);
    for (const w of m.warps) if (reach.has(key(w.x, w.y))) queue.push({ id: w.to, x: w.toX, y: w.toY });
  }
  return found;
}

describe("Chapter 8 world", () => {
  it("appends the three floors in order at the specified sizes with existing music", () => {
    expect(MAP_IDS.slice(-3)).toEqual(FLOORS);
    for (const [id, w, h, name, music] of [
      ["relay_2f", 20, 14, "SERVER HALL", "root_relay"],
      ["relay_3f", 18, 14, "PATCH BAY", "root_relay"],
      ["relay_roof", 16, 12, "RELAY ROOF", "rootstock_appears"],
    ] as const) {
      const m = WORLD.maps[id];
      expect([grid(m).w, grid(m).h, m.name, m.music]).toEqual([w, h, name, music]);
      expect(m.encounters).toBeUndefined();
    }
    expect(WORLD.maps.relay_roof.outdoor).toBe(true);
    expect(WORLD.maps.relay_roof.structures).toEqual([{ key: "relay_mast", x: 7, y: 3 }]);
    expect(WORLD.maps.relay_2f.hidden).toEqual([{ x: 14, y: 9, item: "spring_water" }]);
  });

  it("gates the door and every floor on the keycard, including an old lobby save", async () => {
    const city = WORLD.maps.glasshouse_city;
    const door = city.warps.find((w) => w.to === "glasshouse_relay")!;
    const trigger = city.triggers.find((t) => t.script === "ch8_relay_door")!;
    expect(trigger).toMatchObject({ x: door.x, y: door.y + 1 });
    const incoming = (id: MapId) => Object.values(WORLD.maps).flatMap((m) => m.warps.filter((w) => w.to === id).map(() => m.id));
    expect(incoming("relay_2f")).toEqual(["relay_3f", "glasshouse_relay"]);
    expect(incoming("relay_3f")).toEqual(["relay_2f", "relay_roof"]);
    expect(incoming("relay_roof")).toEqual(["relay_3f"]);
    for (const started of [false, true]) for (const card of [false, true]) {
      const flags = { ch8_started: started, got_keycard: card, relay_patched: true };
      const s = setup(flags);
      await s.run("ch8_relay_door");
      expect(vi.mocked(s.host.movePlayer).mock.calls).toEqual(started && !card ? [[["down"]]] : []);
      expect(vi.mocked(s.host.ctx.ui.say).mock.calls).toHaveLength(started && !card ? 1 : 0);
      const runtime = buildMap(resolved("glasshouse_relay", flags));
      expect(tileAt(runtime, 13, 7)).toBe(started && card ? "stairs_up" : "wall");
      expect(tryMove(runtime, 13, 6, "down").kind === "walk").toBe(started && card);
      const reachable = reachableMaps(flags);
      for (const id of FLOORS) expect(reachable.has(id), id).toBe(started && card);
      expect(reachable.has("glasshouse_relay")).toBe(!started || card);
    }
  });

  it("puts the note before the patch bay and opens the only roof route on relay_patched", () => {
    const note = WORLD.maps.relay_2f.triggers.find((t) => t.script === "ch8_patch_note")!;
    expect(isTalkTrigger(grid(WORLD.maps.relay_2f), note)).toBe(true);
    expect(WORLD.maps.relay_2f.legend[WORLD.maps.relay_2f.tiles[note.y][note.x]]).toBe("workbench");
    expect(WORLD.scripts.ch8_patch_note).toContainEqual(expect.objectContaining({ op: "say", text: expect.stringContaining("C, then A, then B") }));
    const patch = WORLD.maps.relay_3f;
    const consoles = ["a", "b", "c"].map((id) => patch.triggers.find((t) => t.script === `ch8_console_${id}`)!);
    expect(consoles.map((t) => [t.x, t.y])).toEqual([[5, 1], [8, 1], [11, 1]]);
    for (const t of consoles) {
      expect(isTalkTrigger(grid(patch), t)).toBe(true);
      expect(patch.legend[patch.tiles[t.y][t.x]]).toBe("console");
    }
    // Intended route: lobby -> server hall (the hint) -> patch bay -> roof.
    // §4 explicitly lets consoles work without reading the note: no note flag gate.
    const base = { ch8_started: true, got_keycard: true };
    for (const patched of [false, true]) for (const read of [false, true]) {
      const flags = { ...base, relay_patched: patched, patch_note_read: read };
      const m = buildMap(resolved("relay_3f", flags));
      expect(tileAt(m, 15, 2)).toBe(patched ? "stairs_up" : "wall");
      expect(tryMove(m, 15, 3, "up").kind === "walk").toBe(patched);
      const reachable = reachableMaps(flags);
      expect(reachable.has("relay_2f")).toBe(true);
      expect(reachable.has("relay_3f")).toBe(true);
      expect(reachable.has("relay_roof")).toBe(patched);
    }
  });

  it("always allows an exit from every reachable floor tile, even with visible actors", () => {
    for (const started of [false, true]) for (const card of [false, true])
      for (const patched of [false, true]) for (const beaten of [false, true]) {
        const flags = { ch8_started: started, got_keycard: card, relay_patched: patched,
          beat_wren: beaten, ch8_takeover: started && !beaten, ch8_bram_met: true, mercer_seen: beaten };
        for (const id of ["glasshouse_relay", ...FLOORS] as MapId[]) {
          const m = resolved(id, flags), g = grid(m);
          const occupied = new Set(m.npcs.filter((n) => checkCond(n.visibleWhen, flags)).map((n) => key(n.x, n.y)));
          const gg = { ...g, structureSolid: (x: number, y: number) => g.structureSolid(x, y) || occupied.has(key(x, y)) };
          const exit = m.warps.filter((w) => id === "glasshouse_relay" ? w.to === "glasshouse_city" :
            w.to === (id === "relay_2f" ? "glasshouse_relay" : id === "relay_3f" ? "relay_2f" : "relay_3f"));
          expect(exit.length).toBeGreaterThan(0);
          const starts = Object.values(WORLD.maps).flatMap((other) => other.warps
            .filter((w) => w.to === id).map((w) => ({ x: w.toX, y: w.toY })));
          const reachable = canReach(gg, exit);
          for (const cell of flood(gg, starts)) expect(reachable.has(cell), `${id} ${cell}`).toBe(true);
        }
      }
  });

  it("silences every Palm House table only during the broadcast, day and night", () => {
    const m = WORLD.maps.palm_house;
    expect(m.encountersWhen).toEqual([{ when: [{ flag: "ch8_started", is: true }, { flag: "beat_wren", is: false }], encounters: {} }]);
    for (const started of [false, true]) for (const beaten of [false, true]) {
      const flags = { ch8_started: started, beat_wren: beaten };
      const selected = m.encountersWhen?.find((e) => checkCond(e.when, flags))?.encounters ?? m.encounters;
      expect(selected).toBe(started && !beaten ? m.encountersWhen![0].encounters : m.encounters);
      for (const time of ["day", "night"] as const) for (const tile of ["tropical_grass", "bog", "water"] as const) {
        const result = rollEncounter(m, tile, time, () => 0, true, flags);
        const normal = rollEncounter({ encounters: m.encounters }, tile, time, () => 0, true);
        expect(result).toEqual(started && !beaten ? null : normal);
        if (tile === "water") expect(normal).toBeNull();
        else expect(normal).not.toBeNull();
      }
    }
  });

  it("hides Chapter 4 staff only during takeover and preserves Flora's open-day rule", async () => {
    const m = WORLD.maps.glasshouse_relay;
    const staff = ["relay_director", "wren", "listener", "reception", "tech", "visitor", "flora"];
    for (const started of [false, true]) for (const beaten of [false, true]) for (const listened of [false, true]) {
      const s = setup({ ch8_started: started, beat_wren: beaten, relay_listened: listened, ch8_takeover: !(started && !beaten) });
      await s.run(m.onEnter!);
      expect(s.state.flags.ch8_takeover).toBe(started && !beaten);
      for (const id of staff) {
        const n = m.npcs.find((q) => q.id === id)!;
        expect(checkCond(n.visibleWhen, s.state.flags), id).toBe(!(started && !beaten) && (id !== "flora" || !listened));
      }
      expect(s.host.ctx.audio.playMusic).not.toHaveBeenCalled();
    }
  });

  it("uses broadcast flavour for three city NPCs and restores their old dialogue", async () => {
    for (const id of ["gc_researcher", "gc_gardener", "gc_resident"]) {
      for (const started of [false, true]) for (const beaten of [false, true]) {
        const s = setup({ ch8_started: started, beat_wren: beaten });
        await s.run(id);
        const text = vi.mocked(s.host.ctx.ui.say).mock.calls.map(([line]) => line).join(" ");
        expect(text.length).toBeGreaterThan(0);
        expect(text.includes("TODO(text)")).toBe(started && !beaten);
      }
    }
  });

  it("wires the specified story actors, trainer guards, triggers and every scene", () => {
    for (const id of ["ch8_arrival", "ch8_relay_door", "ch8_director", "ch8_patch_note", "ch8_console_a", "ch8_console_b", "ch8_console_c", "ch8_bram", "ch8_bram_after", "ch8_wren", "ch8_wren_after", "ch8_reward", "ch8_end"]) {
      expect(WORLD.scripts[id], id).toBeDefined();
    }
    expect(WORLD.maps.palm_house.npcs.find((n) => n.id === "director_hiding")).toMatchObject({
      sprite: "researcher", script: "ch8_director", visibleWhen: [{ flag: "ch8_started", is: true }, { flag: "got_keycard", is: false }],
    });
    expect(WORLD.maps.relay_3f.npcs.find((n) => n.id === "bram_r3")).toMatchObject({
      sprite: "bram", script: "ch8_bram_after", visibleWhen: [{ flag: "ch8_bram_met", is: true }, { flag: "beat_wren", is: false }],
    });
    expect(WORLD.maps.relay_3f.triggers.some((t) => t.script === "ch8_bram")).toBe(true);
    expect(WORLD.maps.relay_roof.npcs.find((n) => n.id === "wren")).toMatchObject({ script: "ch8_wren" });
    expect(WORLD.maps.relay_roof.triggers.some((t) => t.script === "ch8_wren")).toBe(true);
    expect(WORLD.maps.relay_roof.npcs.find((n) => n.id === "mercer")).toMatchObject({
      sprite: "mercer", visibleWhen: [{ flag: "mercer_seen", is: true }, { flag: "mercer_left", is: false }],
    });
    const called: string[] = [];
    eachCmd(WORLD.scripts.gc_enter, (c) => { if (c.op === "call") called.push(c.script); });
    expect(called).toContain("ch8_arrival");
    for (const [map, prefix, count] of [["glasshouse_city", "grunt_r0_", 2], ["glasshouse_relay", "grunt_r1_", 2], ["relay_2f", "grunt_r2_", 3], ["relay_3f", "grunt_r3_", 2]] as const) {
      for (let i = 1; i <= count; i++) {
        const id = `${prefix}${i}`, n = WORLD.maps[map].npcs.find((q) => q.id === id)!;
        expect(n).toMatchObject({ sprite: "grunt", trainer: id, visibleWhen: [{ flag: "ch8_started", is: true }, { flag: "beat_wren", is: false }] });
        if (map === "glasshouse_city") expect(n).toMatchObject({ sight: 2, y: 7 });
      }
    }
  });

  it("preserves every prescribed team with the reported Wren tuning", () => {
    const teams = {
      grunt_r0_1: [["stinging_nettle", 41], ["foxglove", 41]],
      grunt_r0_2: [["bramble_berry", 41], ["venus_flytrap", 42]],
      grunt_r1_1: [["fireweed", 42], ["holly", 42]],
      grunt_r1_2: [["sugar_maple", 42], ["lodgepole_pine", 43]],
      grunt_r2_1: [["pitcher_plant", 42], ["bladderwort", 43]],
      grunt_r2_2: [["prickly_pear", 43], ["sundew", 43]],
      grunt_r2_3: [["red_mangrove", 43], ["ghost_pipe", 43]],
      grunt_r3_1: [["saguaro", 44]],
      grunt_r3_2: [["moth_orchid", 43], ["larch", 44]],
      wren: [["moth_orchid", 42], ["ghost_pipe", 43], ["sugar_maple", 43], ["red_cedar", 46]],
    };
    for (const [id, team] of Object.entries(teams)) {
      const t = WORLD.trainers[id];
      expect(t.team.map((q) => [q.species, q.level])).toEqual(team);
      expect(t).toMatchObject({ portrait: id === "wren" ? "wren" : "grunt", className: id === "wren" ? "ADMIN" : "GRUNT", music: "battle_rootstock" });
      for (const text of [t.intro, t.defeat, t.after]) expect(text).toContain("TODO(text)");
      for (const q of t.team) for (const move of q.moves ?? []) expect(DATA.species[q.species].learnset.some((l) => l.move === move && l.level <= q.level)).toBe(true);
    }
    expect(WORLD.trainers.wren).toMatchObject({ ai: "smart", items: [{ item: "spring_water", qty: 2 }] });
    WORLD.trainers.wren.team.forEach((q, i) => expect(Math.abs(q.level - [44, 45, 45, 48][i])).toBeLessThanOrEqual(2));
  });
});
