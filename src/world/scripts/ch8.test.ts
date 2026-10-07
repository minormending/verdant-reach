// Chapter 8 through the real interpreter: ordering, patch resets and retries.
import { describe, expect, it, vi } from "vitest";
import type { BattleOutcome, GameContext, MapId, ScriptCmd } from "../../contracts";
import { createQuickened } from "../../battle/logic/stats";
import { DATA } from "../../data";
import { newGameState } from "../../save";
import { buildMap, checkCond, refreshLegend, tileAt, triggerAt } from "../../overworld/map";
import { runScript, ScriptAbort, type ScriptHost } from "../../overworld/script";
import { WORLD } from "../index";
import { eachCmd, grid, walkable } from "../validate";
import { ch8Scripts } from "./ch8";

function setup(map: MapId = "glasshouse_city", outcome: BattleOutcome = "won") {
  const state = newGameState({ world: WORLD });
  const events: string[] = [];
  const visibility = new Map<string, boolean>();
  const ctx = {
    state, data: DATA, world: WORLD, rng: () => 0.5, timeOfDay: () => "day",
    ui: { say: vi.fn(async () => {}), yesNo: vi.fn(async () => true), choose: async () => 0 },
    audio: {
      playMusic: vi.fn(), stopMusic: vi.fn(), current: () => null,
      playSfx: vi.fn((id) => { events.push(`sfx:${id}`); }),
      playJingle: vi.fn(async () => {}), playCry: vi.fn(async () => {}),
    },
  } as unknown as GameContext;
  const host: ScriptHost = {
    ctx, mapId: () => map, map: () => WORLD.maps[map], createQuickened,
    healParty: vi.fn(), battle: vi.fn(async () => outcome), whiteout: vi.fn(async () => {}),
    warp: vi.fn(async () => {}), movePlayer: vi.fn(async () => {}),
    moveNpc: vi.fn(async (id, path) => { events.push(`move:${id}:${path.length}`); }),
    face: vi.fn(), setNpcVisible: vi.fn((id, visible) => {
      visibility.set(id, visible); events.push(`${visible ? "show" : "hide"}:${id}`);
    }),
    fade: vi.fn(async () => {}), shake: vi.fn(async () => {}),
    flash: vi.fn(async () => { events.push("flash"); }),
    still: vi.fn(async (id) => { events.push(`still:${id}`); }),
    stillClear: vi.fn(async () => { events.push("stillClear"); }),
    camera: vi.fn(async () => {}), cameraReset: vi.fn(async () => {}),
    emote: vi.fn(async () => {}), wait: vi.fn(async () => {}),
    showSpecies: vi.fn(), hideSpecies: vi.fn(), restoreMusic: vi.fn(), nameEntry: vi.fn(async () => ""),
    toast: vi.fn(),
    endSlice: vi.fn(async () => {
      expect(state.flags).toMatchObject({ beat_wren: true, broadcast_off: true, mercer_seen: true,
        relay_reward: true, ch8_done: true, slice_done: true });
    }),
  };
  return { state, host, events, visibility,
    enter: (id: MapId) => { map = id; visibility.clear(); },
    run: async (id: string) => {
      try { await runScript(host, id); }
      catch (error) {
        if (!(error instanceof ScriptAbort)) throw error;
        events.push(`abort:${error.message}`);
      }
    },
    tile: (id: MapId, x: number, y: number) => {
      const runtime = buildMap(WORLD.maps[id]);
      refreshLegend(runtime, state.flags);
      return tileAt(runtime, x, y);
    },
  };
}

const ops = (cmds: ScriptCmd[]) => {
  const out: ScriptCmd[] = [];
  eachCmd(cmds, (c) => out.push(c));
  return out;
};
const READY = { ch7_done: true, ch8_started: true, got_keycard: true, relay_patched: true, ch8_bram_met: true };
const CLEARED = { ...READY, beat_wren: true, broadcast_off: true, mercer_seen: true, mercer_left: true };

const gates: { script: string; flags: Record<string, boolean>; needs: string[]; advances: string }[] = [
  { script: "ch8_arrival", flags: { ch7_done: true }, needs: ["ch7_done"], advances: "ch8_started" },
  { script: "ch8_director", flags: READY, needs: ["ch8_started"], advances: "got_keycard" },
  { script: "ch8_bram", flags: READY, needs: ["ch8_started", "got_keycard"], advances: "ch8_bram_met" },
  { script: "ch8_wren", flags: READY, needs: ["relay_patched", "ch8_bram_met"], advances: "beat_wren" },
  { script: "ch8_wren_after", flags: { ...READY, beat_wren: true }, needs: ["beat_wren"], advances: "broadcast_off" },
  { script: "ch8_reward", flags: CLEARED, needs: ["beat_wren", "broadcast_off", "mercer_seen"], advances: "relay_reward" },
  { script: "ch8_end", flags: { ...CLEARED, relay_reward: true },
    needs: ["beat_wren", "broadcast_off", "mercer_seen", "relay_reward"], advances: "ch8_done" },
];

describe("Chapter 8 scripts", () => {
  it("wires every scene with spoken TODO placeholders and the correct speakers", () => {
    for (const [id, cmds] of Object.entries(ch8Scripts)) {
      expect(WORLD.scripts[id], id).toBe(cmds);
      for (const c of ops(cmds)) if (c.op === "say") {
        expect(c.text).toMatch(/^TODO\(text\): /);
        expect(c.speaker).toBeTruthy();
        if (id === "ch8_director" || id === "ch8_reward") expect(c.speaker).toBe("ODELL");
        if (id === "ch8_bram" || id === "ch8_bram_after") expect(c.speaker).toBe("BRAM");
        if (id === "ch8_wren") expect(c.speaker).toBe("WREN");
      }
    }
  });

  it("follows arrival → keycard → lobby → note → patch → Bram → Wren → Mercer → reward → end", async () => {
    const s = setup(), { state, run, host, events } = s;
    const money = state.money;
    // Chapter 4 has already finished when Chapter 7's call sends us here.
    Object.assign(state.flags, { ch7_done: true, gc_arrival_seen: true, ch4_grunt_seen: true, ch4_done: true });
    await run(WORLD.maps.glasshouse_city.onEnter!);
    expect(state.flags).toMatchObject({ ch8_started: true, ch8_takeover: true });
    expect(host.camera).toHaveBeenCalledWith(5, 6, 60);
    await run("ch8_relay_door");
    expect(host.movePlayer).toHaveBeenCalledWith(["down"]);
    expect(s.tile("glasshouse_relay", 13, 7)).toBe("wall");
    s.enter("palm_house");
    await run("ch8_director");
    expect(state.flags.got_keycard).toBe(true);
    expect(state.bag.relay_keycard).toBe(1);
    await run("ch8_relay_door");
    expect(host.movePlayer).toHaveBeenCalledOnce();
    s.enter("glasshouse_relay");
    await run(WORLD.maps.glasshouse_relay.onEnter!);
    expect(host.ctx.audio.playMusic).not.toHaveBeenCalled();
    expect(s.tile("glasshouse_relay", 13, 7)).toBe("stairs_up");
    s.enter("relay_2f");
    await run("ch8_patch_note");
    expect(state.flags.patch_note_read).toBe(true);
    s.enter("relay_3f");
    expect(s.tile("relay_3f", 15, 2)).toBe("wall");
    for (const id of ["c", "a", "b"]) await run(`ch8_console_${id}`);
    expect(state.flags.relay_patched).toBe(true);
    expect(s.tile("relay_3f", 15, 2)).toBe("stairs_up");
    await run("ch8_bram");
    expect(state.flags.ch8_bram_met).toBe(true);
    expect(host.battle).not.toHaveBeenCalled();
    await run("ch8_bram_after");
    s.enter("relay_roof"); events.length = 0;
    await run("ch8_wren");
    expect(host.battle).toHaveBeenCalledWith({ kind: "trainer", trainer: "wren", canLose: false, backdrop: undefined });
    expect(state.flags).toMatchObject({ beat_wren: true, broadcast_off: true, mercer_seen: true, mercer_left: true, ch8_takeover: false });
    expect(events).toEqual(["show:wren", "sfx:pulse", "flash", "still:relay_pulse", "stillClear", "show:mercer",
      "move:mercer:8", "hide:mercer", "move:wren:9", "hide:wren"]);
    expect(host.endSlice).not.toHaveBeenCalled();
    expect(state.bag.rain_jar).toBeUndefined();
    s.enter("glasshouse_relay");
    await run(WORLD.maps.glasshouse_relay.onEnter!);
    expect(state.bag.rain_jar).toBe(2);
    expect(state.money).toBe(money + 3000);
    expect(host.endSlice).toHaveBeenCalledOnce();
    expect(events.at(-1)).toBe("abort:endSlice");
    const lines = vi.mocked(host.ctx.ui.say).mock.calls.map(([text]) => text);
    expect(lines.indexOf("TODO(text): Please accept two RAIN JARS and $3000.")).toBeLessThan(
      lines.indexOf("TODO(text): MERCER has the map of the network's hubs."));
  });

  it.each(gates.flatMap((g) => g.needs.map((missing) => ({ ...g, missing }))))(
    "$script refuses progression without $missing", async ({ script, flags, missing, advances }) => {
      const { state, run, host } = setup();
      Object.assign(state.flags, flags, { [missing]: false, [advances]: false });
      const money = state.money;
      await run(script);
      expect(state.flags[advances]).not.toBe(true);
      expect(host.battle).not.toHaveBeenCalled();
      expect(host.still).not.toHaveBeenCalled();
      expect(host.endSlice).not.toHaveBeenCalled();
      expect(state.bag.relay_keycard).toBeUndefined();
      expect(state.bag.rain_jar).toBeUndefined();
      expect(state.money).toBe(money);
    },
  );

  it("meets Bram once on first 3F arrival, before solving the patch", async () => {
    const s = setup("relay_3f");
    Object.assign(s.state.flags, { ch8_started: true, got_keycard: true });
    await s.run(WORLD.maps.relay_3f.onEnter!);
    expect(s.state.flags.ch8_bram_met).toBe(true);
    expect(s.state.flags.relay_patched).not.toBe(true);
    const lines = vi.mocked(s.host.ctx.ui.say).mock.calls.length;
    await s.run("ch8_bram");
    expect(s.host.ctx.ui.say).toHaveBeenCalledTimes(lines);
    expect(s.host.battle).not.toHaveBeenCalled();
  });

  it.each(["abc", "acb", "bac", "bca", "cab", "cba"])("opens the stair only for C,A,B: %s", async (order) => {
    const s = setup("relay_3f");
    for (const [i, id] of [...order].entries()) {
      await s.run(`ch8_console_${id}`);
      expect(s.state.flags.relay_patched ?? false).toBe(order === "cab" && i === 2);
    }
    expect(s.state.flags.patch_note_read).not.toBe(true);
    expect(s.tile("relay_3f", 15, 2)).toBe(order === "cab" ? "stairs_up" : "wall");
    expect(vi.mocked(s.host.ctx.audio.playSfx).mock.calls.filter(([id]) => id === "door")).toHaveLength(order === "cab" ? 1 : 0);
    if (order === "cab") {
      expect(s.host.camera).toHaveBeenCalledWith(15, 2, 45);
      expect(s.host.cameraReset).toHaveBeenCalledOnce();
      for (const id of "abc") await s.run(`ch8_console_${id}`);
      expect(s.host.cameraReset).toHaveBeenCalledOnce();
      expect(s.host.ctx.ui.say).toHaveBeenLastCalledWith(
        "TODO(text): The signal is already routed to the roof stair.", { speaker: "NARRATOR" });
    }
  });

  it.each([["c", "b"], ["c", "c"], ["c", "a", "a"], ["c", "a", "c"]])(
    "resets after a wrong mid-sequence press: %j", async (...presses) => {
      const s = setup("relay_3f");
      for (const id of presses) await s.run(`ch8_console_${id}`);
      expect(s.state.flags).toMatchObject({ patch_1: false, patch_2: false });
      expect(s.state.flags.relay_patched).not.toBe(true);
      expect(s.host.ctx.audio.playSfx).toHaveBeenLastCalledWith("bump");
      await s.run("ch8_console_c");
      expect(s.state.flags).toMatchObject({ patch_1: true, patch_2: false });
      await s.run("ch8_console_a");
      expect(s.state.flags).toMatchObject({ patch_1: true, patch_2: true });
      await s.run("ch8_console_b");
      expect(s.state.flags.relay_patched).toBe(true);
    },
  );

  it("retries the roof trigger after losing without cutting the broadcast or revealing Mercer", async () => {
    const s = setup("relay_roof", "lost");
    Object.assign(s.state.flags, READY);
    const runtime = buildMap(WORLD.maps.relay_roof);
    const trigger = triggerAt(runtime, 7, 7, s.state.flags)!;
    await s.run(trigger.script);
    expect(s.events).toEqual(["abort:whiteout"]);
    expect(s.host.whiteout).toHaveBeenCalledOnce();
    for (const id of ["beat_wren", "broadcast_off", "mercer_seen", "mercer_left"]) expect(s.state.flags[id]).not.toBe(true);
    expect(s.host.setNpcVisible).not.toHaveBeenCalled();
    expect(triggerAt(runtime, 7, 7, s.state.flags)).toBe(trigger);
    vi.mocked(s.host.battle).mockResolvedValue("won");
    await s.run(trigger.script);
    expect(s.state.flags).toMatchObject(CLEARED);
    expect(triggerAt(runtime, 7, 7, s.state.flags)).toBeUndefined();
    await s.run("ch8_wren"); await s.run("ch8_wren_after");
    expect(s.host.battle).toHaveBeenCalledTimes(2);
    expect(s.host.still).toHaveBeenCalledOnce();
    expect(s.host.moveNpc).toHaveBeenCalledTimes(2);
  });

  it("gives the keycard and lobby rewards only once and ends only once", async () => {
    const s = setup("palm_house"), money = s.state.money;
    s.state.flags.ch8_started = true;
    await s.run("ch8_director"); await s.run("ch8_director");
    expect(s.state.bag.relay_keycard).toBe(1);
    Object.assign(s.state.flags, CLEARED);
    s.enter("glasshouse_relay");
    await s.run("ch8_end");
    expect(s.host.endSlice).not.toHaveBeenCalled();
    await s.run("ch8_reward"); await s.run("ch8_reward");
    expect(s.state.bag.rain_jar).toBe(2);
    expect(s.state.money).toBe(money + 3000);
    await s.run("ch8_relay_enter"); await s.run("ch8_relay_enter");
    await s.run("ch8_end"); await s.run("ch8_reward");
    expect(s.state.bag.rain_jar).toBe(2);
    expect(s.state.money).toBe(money + 3000);
    expect(s.host.endSlice).toHaveBeenCalledOnce();
  });

  it("hides Mercer and Wren during departure and after a roof reload", async () => {
    const s = setup("relay_roof"), roof = WORLD.maps.relay_roof;
    Object.assign(s.state.flags, READY);
    const visible = (id: string) => checkCond(roof.npcs.find((n) => n.id === id)!.visibleWhen, s.state.flags);
    expect(visible("mercer")).toBe(false);
    expect(visible("wren")).toBe(true);
    await s.run("ch8_wren");
    expect(s.visibility.get("mercer")).toBe(false);
    expect(s.visibility.get("wren")).toBe(false);
    s.enter("relay_roof");
    expect(visible("mercer")).toBe(false);
    expect(visible("wren")).toBe(false);
    expect(checkCond(WORLD.maps.relay_3f.npcs.find((n) => n.id === "bram_r3")!.visibleWhen, s.state.flags)).toBe(false);
    // Exit paths remain clear until they cross the far edge, including railing.
    for (const c of ops(ch8Scripts.ch8_wren_after)) if (c.op === "moveNpc") {
      const npc = roof.npcs.find((n) => n.id === c.npc)!;
      let x = npc.x;
      for (const dir of c.path) { expect(dir).toBe("right"); x++; }
      expect(x).toBe(grid(roof).w);
      expect(c.path.slice(0, -2).every((_, i) => walkable(grid(roof), npc.x + i + 1, npc.y))).toBe(true);
    }
  });
});
