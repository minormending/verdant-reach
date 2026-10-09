// Chapter 7 through the real interpreter, including retries and one-off rewards.
import { describe, expect, it, vi } from "vitest";
import type { BattleOutcome, GameContext, MapId, ScriptCmd } from "../../contracts";
import { createQuickened } from "../../battle/logic/stats";
import { DATA } from "../../data";
import { newGameState } from "../../save";
import { runScript, ScriptAbort, type ScriptHost } from "../../overworld/script";
import { hiddenFlag } from "../../overworld/progress";
import { WORLD } from "../index";
import { eachCmd, grid, walkable } from "../validate";
import { ch7Scripts } from "./ch7";
import { QUESTS, questScripts } from "./quests";

function setup(map: MapId = "larchmere", outcome: BattleOutcome = "won") {
  const state = newGameState({ world: WORLD });
  const events: string[] = [];
  const ctx = {
    state, data: DATA, world: WORLD, rng: () => 0.5, timeOfDay: () => "day",
    ui: { say: vi.fn(async () => {}), yesNo: vi.fn(async () => true), choose: async () => 0 },
    audio: {
      playMusic: vi.fn(), stopMusic: vi.fn(), current: () => null,
      playSfx: vi.fn(), playJingle: vi.fn(async () => {}), playCry: vi.fn(async () => {}),
    },
  } as unknown as GameContext;
  const host: ScriptHost = {
    credits: vi.fn(async () => {}),
    ctx, mapId: () => map, map: () => WORLD.maps[map], createQuickened,
    healParty: vi.fn(), battle: vi.fn(async () => outcome), whiteout: vi.fn(async () => {}),
    warp: vi.fn(async () => {}), movePlayer: vi.fn(async () => {}),
    moveNpc: vi.fn(async (id, path) => { events.push(`move:${id}:${path.join(",")}`); }),
    face: vi.fn(), setNpcVisible: vi.fn((id, visible) => { events.push(`${visible ? "show" : "hide"}:${id}`); }),
    fade: vi.fn(async () => {}), shake: vi.fn(async () => {}), flash: vi.fn(async () => {}),
    still: vi.fn(async (id) => { events.push(`still:${id}`); }),
    stillClear: vi.fn(async () => { events.push("stillClear"); }),
    camera: vi.fn(async () => {}), cameraReset: vi.fn(async () => {}),
    emote: vi.fn(async () => {}), wait: vi.fn(async () => {}),
    showSpecies: vi.fn(), hideSpecies: vi.fn(), restoreMusic: vi.fn(), nameEntry: vi.fn(async () => ""),
    toast: vi.fn(),
    endSlice: vi.fn(async () => {
      expect(state.flags).toMatchObject({ beat_signe: true, got_cold_snap_signe: true, ch7_done: true, slice_done: true });
      expect(state.marks).toContain("snowdrop_mark");
    }),
  };
  return { state, host, events, run: async (id: string) => {
    try { await runScript(host, id); }
    catch (error) {
      if (!(error instanceof ScriptAbort)) throw error;
      events.push(`abort:${error.message}`);
    }
  } };
}

const ops = (cmds: ScriptCmd[]) => {
  const out: ScriptCmd[] = [];
  eachCmd(cmds, (c) => out.push(c));
  return out;
};

describe("Chapter 7 scripts", () => {
  it("wires every scene, with finished dialogue and speaker-less narration", () => {
    for (const id of [
      "ch7_pass_ranger", "ch7_town_enter", "ch7_arrival", "ch7_cons7_door", "ch7_crimson_lily",
      "ch7_lodge_grunt", "ch7_bookcase", "ch7_emitter_1", "ch7_emitter_2", "ch7_emitter_3",
      "calloway", "ch7_calloway_after", "ch7_files", "signe", "ch7_signe_after", "ch7_end", "q_lost_climber",
    ]) expect(WORLD.scripts[id], id).toBeDefined();
    for (const c of ops([...Object.values(ch7Scripts).flat(), ...questScripts.q_lost_climber])) if (c.op === "say") {
      expect(c.text).not.toMatch(/TODO/);
      expect([undefined, "RANGER", "GRUNT", "DR. CALLOWAY", "SIGNE", "VALE", "LODGE KEEPER", "VISITOR", "KID", "CLERK", "MOUNTAINEER"]).toContain(c.speaker);
    }
  });

  it("requires the cleared pass for a one-off arrival and glide visit", async () => {
    const { run, state, host } = setup();
    await run("ch7_town_enter");
    await run("ch7_arrival");
    expect(state.flags.ch7_arrived).not.toBe(true);
    expect(state.flags.visited_larchmere).not.toBe(true);
    expect(host.ctx.ui.say).not.toHaveBeenCalled();
    state.flags.ch6_done = true;
    await run("ch7_town_enter");
    expect(state.flags).toMatchObject({ ch7_arrived: true, visited_larchmere: true });
    const boxes = vi.mocked(host.ctx.ui.say).mock.calls.length;
    await run("ch7_town_enter");
    await run("ch7_arrival");
    expect(host.ctx.ui.say).toHaveBeenCalledTimes(boxes);
    expect(host.endSlice).not.toHaveBeenCalled();
  });

  it("enforces pass → arrival → lodge → bookcase → emitters → Calloway → files → Signe → Cold Snap → end", async () => {
    const { run, state, host, events } = setup();
    const later = ["ch7_lodge_grunt", "ch7_bookcase", "ch7_emitter_1", "ch7_emitter_2", "ch7_emitter_3", "calloway", "ch7_calloway_after", "ch7_files", "signe", "ch7_signe_after", "ch7_end"];
    for (const id of later) await run(id);
    expect(host.battle).not.toHaveBeenCalled();
    expect(host.warp).not.toHaveBeenCalled();
    expect(host.still).not.toHaveBeenCalled();
    expect(host.endSlice).not.toHaveBeenCalled();
    expect(state.bag.cold_snap).toBeUndefined();

    state.flags.ch6_done = true;
    await run("ch7_town_enter");
    await run("ch7_bookcase");
    expect(host.warp).not.toHaveBeenCalled();
    await run("ch7_lodge_grunt");
    await run("ch7_lodge_grunt");
    expect(state.flags).toMatchObject({ beat_grunt_lodge: true, lodge_grunt_seen: true });
    expect(host.battle).toHaveBeenCalledOnce();
    expect(host.setNpcVisible).toHaveBeenCalledWith("grunt_lodge", false);
    await run("ch7_emitter_1");
    expect(state.flags.emitter_1_off).not.toBe(true);
    await run("ch7_bookcase");
    expect(state.flags.lodge_stair_open).toBe(true);
    expect(host.warp).toHaveBeenCalledWith("rootstock_hideout_1", 2, 17, "up");
    await run("ch7_bookcase");
    expect(host.warp).toHaveBeenCalledTimes(2);

    for (const n of [1, 2, 3]) {
      await run(`ch7_emitter_${n}`);
      expect(state.flags[`emitter_${n}_off`]).not.toBe(true);
      await runScript(host, [{ op: "battle", trainer: `grunt_b1_${n}` }]);
      await run(`ch7_emitter_${n}`);
      expect(state.flags[`emitter_${n}_off`]).toBe(true);
      expect(state.flags.emitters_off ?? false).toBe(n === 3);
      if (n < 3) {
        const battles = vi.mocked(host.battle).mock.calls.length;
        await run("calloway");
        expect(host.battle).toHaveBeenCalledTimes(battles);
      }
    }
    await run("ch7_files");
    expect(host.still).not.toHaveBeenCalled();
    await run("calloway");
    expect(state.flags).toMatchObject({ beat_calloway: true, calloway_escaped: true });
    expect(host.setNpcVisible).toHaveBeenCalledWith("calloway", false);
    const moves = vi.mocked(host.moveNpc).mock.calls.length;
    await run("calloway");
    await run("ch7_calloway_after");
    expect(host.moveNpc).toHaveBeenCalledTimes(moves);
    const battles = vi.mocked(host.battle).mock.calls.length;
    await run("signe");
    expect(host.battle).toHaveBeenCalledTimes(battles);
    events.length = 0;
    await run("ch7_files");
    expect(events).toEqual(["still:rootstock_files", "stillClear"]);
    expect(state.flags).toMatchObject({ files_read: true, lake_calmed: true });
    await run("ch7_files");
    expect(host.still).toHaveBeenCalledOnce();
    await run("ch7_signe_after");
    expect(state.bag.cold_snap).toBeUndefined();
    await run("signe");
    expect(state.flags).toMatchObject({ beat_signe: true, got_cold_snap_signe: true });
    expect(state.marks).toContain("snowdrop_mark");
    expect(state.bag.cold_snap).toBe(1);
    expect(host.endSlice).not.toHaveBeenCalled();
    await run("signe");
    await run("ch7_signe_after");
    expect(state.bag.cold_snap).toBe(1);
    expect(host.battle).toHaveBeenCalledTimes(battles + 1);
    await run("ch7_town_enter");
    expect(state.flags).toMatchObject({ ch7_done: true, slice_done: true });
    expect(host.endSlice).toHaveBeenCalledOnce();
    await run("ch7_town_enter");
    await run("ch7_end");
    expect(host.endSlice).toHaveBeenCalledOnce();
  });

  it.each([
    [1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 3, 1], [3, 1, 2], [3, 2, 1],
  ])("opens B2 exactly once with emitter order %s/%s/%s", async (...order) => {
    const { run, state, host } = setup("rootstock_hideout_1");
    Object.assign(state.flags, { lodge_stair_open: true, beat_grunt_b1_1: true, beat_grunt_b1_2: true, beat_grunt_b1_3: true });
    for (const [i, n] of order.entries()) {
      await run(`ch7_emitter_${n}`);
      expect(state.flags.emitters_off ?? false).toBe(i === 2);
    }
    for (const n of order) await run(`ch7_emitter_${n}`);
    expect(host.ctx.audio.playSfx).toHaveBeenCalledWith("door");
    expect(vi.mocked(host.ctx.audio.playSfx).mock.calls.filter(([id]) => id === "door")).toHaveLength(1);
    expect(host.cameraReset).toHaveBeenCalledOnce();
    expect([state.flags.emitter_1_off, state.flags.emitter_2_off, state.flags.emitter_3_off]).toEqual([true, true, true]);
  });

  it.each(["caught", "won", "fled", "lost"] as const)("consumes the sport lily once after outcome %s", async (outcome) => {
    const { run, state, host } = setup("bloom_lake", outcome);
    await run("ch7_crimson_lily");
    expect(host.battle).not.toHaveBeenCalled();
    state.flags.ch7_arrived = true;
    await run("ch7_crimson_lily");
    expect(host.battle).toHaveBeenCalledWith({ kind: "wild", wild: { species: "giant_water_lily", level: 40, sport: true }, canLose: true, backdrop: undefined });
    expect(state.flags.crimson_lily_done).toBe(true);
    expect(host.setNpcVisible).toHaveBeenCalledWith("crimson_lily", false);
    expect(host.whiteout).not.toHaveBeenCalled();
    await run("ch7_crimson_lily");
    expect(host.battle).toHaveBeenCalledOnce();
    expect(host.setNpcVisible).toHaveBeenCalledOnce();
  });

  it.each(["ch7_lodge_grunt", "calloway", "signe"])("retries %s after a loss without advancing the story", async (id) => {
    const { run, state, host } = setup("larchmere", "lost");
    Object.assign(state.flags, { ch7_arrived: true, emitters_off: true, lake_calmed: true });
    await run(id);
    expect(host.whiteout).toHaveBeenCalledOnce();
    expect(state.flags.lodge_grunt_seen).not.toBe(true);
    expect(state.flags.beat_calloway).not.toBe(true);
    expect(state.flags.calloway_escaped).not.toBe(true);
    expect(state.flags.beat_signe).not.toBe(true);
    expect(state.flags.got_cold_snap_signe).not.toBe(true);
    expect(state.marks).toEqual([]);
    expect(state.bag.cold_snap).toBeUndefined();
    vi.mocked(host.battle).mockResolvedValue("won");
    await run(id);
    expect(state.flags[id === "ch7_lodge_grunt" ? "lodge_grunt_seen" : `beat_${id}`]).toBe(true);
    if (id === "signe") {
      expect(state.marks).toEqual(["snowdrop_mark"]);
      expect(state.bag.cold_snap).toBe(1);
    }
    await run(id);
    expect(host.battle).toHaveBeenCalledTimes(2);
  });

  it("waits for Signe's Cold Snap before ending, even if the mark battle is already won", async () => {
    const { run, state, host } = setup();
    state.flags.beat_signe = true;
    state.marks.push("snowdrop_mark");
    await run("ch7_end");
    expect(host.endSlice).not.toHaveBeenCalled();
    await run("ch7_signe_after");
    await run("ch7_end");
    expect(host.endSlice).toHaveBeenCalledOnce();
  });

  it("bounces the locked Conservatory door onto a clear map tile", async () => {
    const { run, state, host } = setup();
    await run("ch7_cons7_door");
    expect(host.movePlayer).toHaveBeenCalledWith(["down"]);
    const map = WORLD.maps.larchmere;
    const trigger = map.triggers.find((t) => t.script === "ch7_cons7_door")!;
    expect(walkable(grid(map), trigger.x, trigger.y + 1)).toBe(true);
    state.flags.lake_calmed = true;
    await run("ch7_cons7_door");
    expect(host.movePlayer).toHaveBeenCalledOnce();
  });

  it("keeps Calloway's escape path and the bookcase warp on clear map tiles", () => {
    const map = WORLD.maps.rootstock_hideout_2, g = grid(map);
    const npc = map.npcs.find((n) => n.id === "calloway")!;
    const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    let { x, y } = npc;
    for (const c of ops(ch7Scripts.ch7_calloway_after)) if (c.op === "moveNpc") {
      expect(c.npc).toBe(npc.id);
      for (const dir of c.path) {
        x += delta[dir][0]; y += delta[dir][1];
        expect(walkable(g, x, y), `${x},${y}`).toBe(true);
        expect(map.npcs.some((n) => n.id !== npc.id && n.x === x && n.y === y)).toBe(false);
        expect(map.triggers.some((t) => t.x === x && t.y === y)).toBe(false);
      }
    }
    expect([x, y]).toEqual([15, 3]);
    const tunnel = map.warps.find((w) => w.to === "larchmere")!;
    expect([x, y]).toEqual([tunnel.x, tunnel.y + 1]);
    expect(ops(ch7Scripts.ch7_calloway_after).at(-1)?.op).toBe("cameraReset");
    for (const c of ops(ch7Scripts.ch7_bookcase)) if (c.op === "warp") {
      expect(walkable(grid(WORLD.maps[c.to]), c.x, c.y)).toBe(true);
      expect(WORLD.maps[c.to].npcs.some((n) => n.x === c.x && n.y === c.y)).toBe(false);
    }
  });
});

describe("LOST CLIMBER quest", () => {
  it("keeps the final title, steps, reward and hidden key item", () => {
    expect(QUESTS.lost_climber).toMatchObject({ title: "LOST CLIMBER", giver: "MOUNTAINEER, ROUTE 9", area: "route_9", reward: "2 RAIN JARS + COLD SNAP" });
    expect(QUESTS.lost_climber.steps.map((s) => s.text)).toEqual(["Find the lost CLIMBER PACK.", "Return it to the MOUNTAINEER."]);
    const pack = WORLD.maps.route_9.hidden!.find((h) => h.item === "climber_pack")!;
    expect(QUESTS.lost_climber.steps[0].doneWhen).toEqual([{ flag: hiddenFlag("route_9", pack.x, pack.y), is: true }]);
    expect(DATA.items.climber_pack).toMatchObject({ pocket: "key", price: 0, effect: { kind: "none" } });
  });

  it.each([false, true])("returns a pack found before the offer: %s, rewarding exactly once", async (foundFirst) => {
    const { run, state, host } = setup("route_9");
    if (foundFirst) state.bag.climber_pack = 1;
    await run("q_lost_climber");
    expect(state.flags.quest_lost_climber_started).toBe(true);
    if (!foundFirst) {
      expect(state.flags.quest_lost_climber_done).not.toBe(true);
      expect(state.bag.rain_jar).toBeUndefined();
      expect(state.bag.cold_snap).toBeUndefined();
      // The pickup flag alone cannot replace possession of the actual pack.
      state.flags.hidden_route_9_8_8 = true;
      await run("q_lost_climber");
      expect(state.flags.quest_lost_climber_done).not.toBe(true);
      state.bag.climber_pack = 1;
      await run("q_lost_climber");
    }
    expect(state.flags.quest_lost_climber_done).toBe(true);
    expect(state.bag.climber_pack).toBeUndefined();
    expect(state.bag).toMatchObject({ rain_jar: 2, cold_snap: 1 });
    await run("q_lost_climber");
    await run("q_lost_climber");
    expect(state.bag).toMatchObject({ rain_jar: 2, cold_snap: 1 });
    expect(host.ctx.audio.playJingle).toHaveBeenCalledWith("quest");
    expect(vi.mocked(host.ctx.audio.playJingle).mock.calls.filter(([id]) => id === "quest")).toHaveLength(1);
    expect(host.toast).toHaveBeenCalledWith("note_done", "LOST CLIMBER");
  });
});
