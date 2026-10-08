// Chapter 9 through the real interpreter: gates, battle outcomes and rewards.
import { describe, expect, it, vi } from "vitest";
import type { BattleOutcome, GameContext, MapId, ScriptCmd, SpeciesId } from "../../contracts";
import { createQuickened } from "../../battle/logic/stats";
import { DATA } from "../../data";
import { newGameState } from "../../save";
import { runScript, ScriptAbort, type ScriptHost } from "../../overworld/script";
import { WORLD } from "../index";
import { eachCmd, grid, walkable } from "../validate";
import { ch9Scripts } from "./ch9";
import { QUESTS, questScripts } from "./quests";

function setup(initialMap: MapId = "thistledown", outcome: BattleOutcome = "won") {
  let map = initialMap;
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
    ctx, mapId: () => map, map: () => WORLD.maps[map], createQuickened,
    healParty: vi.fn(), battle: vi.fn(async () => outcome), whiteout: vi.fn(async () => {}),
    warp: vi.fn(async () => {}), movePlayer: vi.fn(async () => {}),
    moveNpc: vi.fn(async (id, path) => { events.push(`move:${id}:${path.join(",")}`); }),
    face: vi.fn(), setNpcVisible: vi.fn((id, visible) => { events.push(`${visible ? "show" : "hide"}:${id}`); }),
    fade: vi.fn(async () => {}), shake: vi.fn(async () => {}), flash: vi.fn(async () => {}),
    camera: vi.fn(async () => {}), cameraReset: vi.fn(async () => {}),
    emote: vi.fn(async () => {}), wait: vi.fn(async () => {}),
    showSpecies: vi.fn(), hideSpecies: vi.fn(), restoreMusic: vi.fn(), nameEntry: vi.fn(async () => ""),
    toast: vi.fn(),
    endSlice: vi.fn(async () => {
      expect(state.flags).toMatchObject({ beat_rook: true, got_fig_root: true, ch9_done: true, slice_done: true });
      expect(state.marks).toContain("resin_mark");
      expect(state.bag.fig_root).toBe(1);
    }),
  };
  const run = async (id: string) => {
    try { await runScript(host, id); }
    catch (error) {
      if (!(error instanceof ScriptAbort)) throw error;
      events.push(`abort:${error.message}`);
    }
  };
  return { state, host, events, run, enter: async (id: MapId) => {
    map = id;
    if (WORLD.maps[id].onEnter) await run(WORLD.maps[id].onEnter!);
  } };
}

function ops(cmds: ScriptCmd[]) {
  const out: ScriptCmd[] = [];
  eachCmd(cmds, (c) => out.push(c));
  return out;
}

describe("Chapter 9 scripts", () => {
  it("wires every scene, with finished dialogue, one name per speaker and speaker-less narration", () => {
    for (const id of ["ch9_east_gate", "ch9_arrival", "ch9_tumbleweed", "rival_5", "ch9_cons8_door", "rook", "ch9_rook_after", "ch9_end", "q_window_panes"]) {
      expect(WORLD.scripts[id], id).toBeDefined();
    }
    const speakers = new Set<string>();
    let narration = 0;
    for (const [id, cmds] of Object.entries(ch9Scripts)) {
      expect(WORLD.scripts[id], id).toBe(cmds);
      for (const c of ops(cmds)) if (c.op === "say") {
        expect(c.text).not.toMatch(/TODO/);
        // Narration has no speaker, as in Chapters 5–8: "NARRATOR" would print "NARRATOR:".
        if (c.speaker === undefined) { narration++; continue; }
        speakers.add(c.speaker);
        if (id === "rook" || id === "ch9_rook_after") expect(c.speaker).toBe("ROOK");
        if (id === "ch9_end") expect(c.speaker).toBe("VALE");
      }
    }
    expect(narration).toBeGreaterThan(0);
    expect([...speakers].sort()).toEqual(["BRAM", "CLERK", "GUARD", "KID", "RESIDENT", "ROOK", "TRADER", "VALE", "VISITOR"]);
    for (const c of ops(questScripts.q_window_panes)) if (c.op === "say") {
      expect(c.text).not.toMatch(/TODO/);
      expect(c.speaker).toBe("BOTANIST");
    }
  });

  it("enforces east gate → arrival → Bram → door → Rook → Fig Root → Vale's call", async () => {
    const { run, enter, state, host, events } = setup("glasshouse_city");
    state.flags.got_starter_oak = true;
    await run("ch9_east_gate");
    expect(host.ctx.ui.say).toHaveBeenCalledWith(expect.stringMatching(/^The east road's closed\./), { speaker: "GUARD" });
    await enter("thistledown");
    expect(state.flags.ch9_arrived).not.toBe(true);
    state.flags.ch8_done = true;
    vi.mocked(host.ctx.ui.say).mockClear();
    await run("ch9_east_gate");
    expect(host.ctx.ui.say).not.toHaveBeenCalled();
    await enter("thistledown");
    expect(state.flags).toMatchObject({ ch9_arrived: true, tumbleweed_seen: true, visited_thistledown: true });
    expect(host.battle).not.toHaveBeenCalled();
    await enter("sanguine_ridge");
    await run("ch9_cons8_door");
    expect(host.movePlayer).toHaveBeenCalledWith(["down"]);
    await enter("route_11");
    await run("rival_5");
    expect(host.battle).toHaveBeenCalledWith({ kind: "trainer", trainer: "rival_5_chili", canLose: true, backdrop: undefined });
    expect(state.flags.rival_5_done).toBe(true);
    expect(host.setNpcVisible).toHaveBeenCalledWith("bram", false);
    await enter("sanguine_ridge");
    await run("ch9_cons8_door");
    expect(host.movePlayer).toHaveBeenCalledOnce();
    await enter("sanguine_conservatory");
    await run("ch9_rook_after");
    expect(state.bag.fig_root).toBeUndefined();
    await run("rook");
    expect(state.flags).toMatchObject({ beat_rook: true, got_fig_root: true });
    expect(state.marks).toEqual(["resin_mark"]);
    expect(state.bag.fig_root).toBe(1);
    expect(host.endSlice).not.toHaveBeenCalled();
    await enter("sanguine_ridge");
    expect(host.endSlice).toHaveBeenCalledOnce();
    expect(events.at(-1)).toBe("abort:endSlice");
    await enter("thistledown");
    await run("rival_5");
    await run("rook");
    await run("ch9_rook_after");
    await enter("sanguine_ridge");
    await run("ch9_end");
    expect(host.battle).toHaveBeenCalledTimes(2);
    expect(host.endSlice).toHaveBeenCalledOnce();
    expect(state.bag.fig_root).toBe(1);
    expect(state.marks).toEqual(["resin_mark"]);
    expect(vi.mocked(host.ctx.audio.playJingle).mock.calls.filter(([id]) => id === "mark")).toHaveLength(1);
  });

  it.each([
    ["ch9_arrival", {}, "ch9_arrived"],
    ["ch9_tumbleweed", { ch8_done: true }, "tumbleweed_seen"],
    ["rival_5", { ch8_done: true }, "rival_5_done"],
    ["rook", { ch8_done: true, ch9_arrived: true }, "beat_rook"],
    ["ch9_rook_after", { rival_5_done: true }, "got_fig_root"],
    ["ch9_end", { got_fig_root: true }, "ch9_done"],
    ["ch9_end", { beat_rook: true }, "ch9_done"],
  ] as const)("refuses %s out of order", async (script, flags, blockedFlag) => {
    const { run, state, host } = setup();
    Object.assign(state.flags, flags);
    await run(script);
    expect(state.flags[blockedFlag]).not.toBe(true);
    expect(state.bag.fig_root).toBeUndefined();
    expect(state.marks).toEqual([]);
    expect(host.battle).not.toHaveBeenCalled();
    expect(host.moveNpc).not.toHaveBeenCalled();
    expect(host.setNpcVisible).not.toHaveBeenCalled();
    expect(host.endSlice).not.toHaveBeenCalled();
  });

  it("bounces the locked door onto a clear tile until Bram's battle is done", async () => {
    const { run, state, host } = setup("sanguine_ridge");
    const map = WORLD.maps.sanguine_ridge;
    const trigger = map.triggers.find((t) => t.script === "ch9_cons8_door")!;
    expect(walkable(grid(map), trigger.x, trigger.y + 1)).toBe(true);
    await run("ch9_cons8_door");
    expect(host.movePlayer).toHaveBeenCalledWith(["down"]);
    state.flags.rival_5_done = true;
    await run("ch9_cons8_door");
    expect(host.movePlayer).toHaveBeenCalledOnce();
  });

  it("rolls the tumbleweed off the map and hides it only once", async () => {
    const { run, enter, state, host, events } = setup();
    state.flags.ch8_done = true;
    await enter("thistledown");
    expect(events.map((e) => e.split(":").slice(0, 2).join(":"))).toEqual(["move:tumbleweed_sighting", "hide:tumbleweed_sighting"]);
    const [id, path] = vi.mocked(host.moveNpc).mock.calls[0];
    const map = WORLD.maps.thistledown;
    const npc = map.npcs.find((n) => n.id === id)!;
    expect(path.every((dir) => dir === "right")).toBe(true);
    expect(npc.x + path.length).toBe(grid(map).w);
    expect(state.flags.tumbleweed_seen).toBe(true);
    const boxes = vi.mocked(host.ctx.ui.say).mock.calls.length;
    await enter("thistledown");
    await run("ch9_arrival");
    await run("ch9_tumbleweed");
    expect(host.ctx.ui.say).toHaveBeenCalledTimes(boxes);
    expect(host.moveNpc).toHaveBeenCalledOnce();
    expect(host.setNpcVisible).toHaveBeenCalledOnce();
    expect(host.battle).not.toHaveBeenCalled();
  });

  it.each([
    ["oak", "chili", "won"], ["oak", "chili", "lost"],
    ["chili", "lily", "won"], ["chili", "lily", "lost"],
    ["lily", "oak", "won"], ["lily", "oak", "lost"],
  ] as const)("finishes friendly rival_5 with starter %s against %s after a %s result", async (starter, counter, outcome) => {
    const { run, state, host, events } = setup("route_11", outcome);
    Object.assign(state.flags, { ch9_arrived: true, [`got_starter_${starter}`]: true });
    await run("rival_5");
    expect(host.battle).toHaveBeenCalledWith({ kind: "trainer", trainer: `rival_5_${counter}`, canLose: true, backdrop: undefined });
    expect(state.flags.rival_5_done).toBe(true);
    expect(state.flags[`beat_rival_5_${counter}`] ?? false).toBe(outcome === "won");
    expect(host.whiteout).not.toHaveBeenCalled();
    expect(host.healParty).toHaveBeenCalledOnce();
    expect(events[0]).toMatch(/^move:bram:up/);
    expect(events[1]).toBe("hide:bram");
    // Win or lose, BRAM says he's going after his father and will find the player.
    for (const text of [/^I'm going after my father\./, /I'll find you when it's time\.$/]) {
      expect(host.ctx.ui.say).toHaveBeenCalledWith(expect.stringMatching(text), { speaker: "BRAM" });
    }
    const npc = WORLD.maps.route_11.npcs.find((n) => n.id === "bram")!;
    let y = npc.y;
    for (const dir of vi.mocked(host.moveNpc).mock.calls[0][1]) {
      expect(dir).toBe("up");
      expect(walkable(grid(WORLD.maps.route_11), npc.x, --y)).toBe(true);
    }
    await run("rival_5");
    expect(host.battle).toHaveBeenCalledOnce();
    expect(host.moveNpc).toHaveBeenCalledOnce();
  });

  it("retries Rook after a loss and grants the mark and root once on winning", async () => {
    const { run, state, host } = setup("sanguine_conservatory", "lost");
    state.flags.rival_5_done = true;
    await run("rook");
    expect(host.whiteout).toHaveBeenCalledOnce();
    expect(state.flags.beat_rook).not.toBe(true);
    expect(state.flags.got_fig_root).not.toBe(true);
    expect(state.marks).toEqual([]);
    expect(state.bag.fig_root).toBeUndefined();
    await run("ch9_rook_after");
    await run("ch9_end");
    expect(host.endSlice).not.toHaveBeenCalled();
    vi.mocked(host.battle).mockResolvedValue("won");
    await run("rook");
    await run("rook");
    await run("ch9_rook_after");
    expect(host.battle).toHaveBeenCalledTimes(2);
    expect(state.marks).toEqual(["resin_mark"]);
    expect(state.bag.fig_root).toBe(1);
  });
});

describe("WINDOW PANES quest", () => {
  it("defines the two caught-record steps and the specified reward", () => {
    expect(QUESTS.window_panes).toMatchObject({ title: "WINDOW PANES", giver: "BOTANIST, THISTLEDOWN", area: "thistledown_house", reward: "2 RAIN JARS + 5 GLASS PODS" });
    expect(QUESTS.window_panes.steps.map((s) => s.doneWhen)).toEqual([
      [{ flag: "window_panes_lithops", is: true }], [{ flag: "window_panes_bloom", is: true }],
    ]);
    expect(ops(questScripts.q_window_panes).filter((c) => c.op === "ifCaught").map((c) => c.species)).toContainEqual(["lithops_pebble", "lithops_pair", "lithops_bloom"]);
    expect(WORLD.maps.thistledown_house.npcs.find((n) => n.id === "stone_botanist")).toMatchObject({ sprite: "stone_botanist", script: "q_window_panes" });
  });

  it.each(["lithops_pebble", "lithops_pair"] as const)("records %s first, then the bloom, with one reward", async (first) => {
    const { run, state, host } = setup("thistledown_house");
    state.herbarium.seen.push("lithops_pebble", "lithops_pair", "lithops_bloom");
    await run("q_window_panes");
    expect(state.flags.quest_window_panes_started).toBe(true);
    expect(state.flags.window_panes_lithops).not.toBe(true);
    expect(state.flags.window_panes_bloom).not.toBe(true);
    expect(state.flags.quest_window_panes_done).not.toBe(true);
    expect(state.bag.rain_jar).toBeUndefined();
    state.herbarium.caught.push(first);
    await run("q_window_panes");
    expect(state.flags.window_panes_lithops).toBe(true);
    expect(state.flags.window_panes_bloom).not.toBe(true);
    expect(state.flags.quest_window_panes_done).not.toBe(true);
    expect(state.bag.glass_pod).toBeUndefined();
    state.herbarium.caught.push("lithops_bloom");
    await run("q_window_panes");
    expect(state.flags).toMatchObject({ window_panes_lithops: true, window_panes_bloom: true, quest_window_panes_done: true });
    expect(state.bag).toMatchObject({ rain_jar: 2, glass_pod: 5 });
    await run("q_window_panes");
    await run("q_window_panes");
    expect(state.bag).toMatchObject({ rain_jar: 2, glass_pod: 5 });
    expect(vi.mocked(host.ctx.audio.playJingle).mock.calls.filter(([id]) => id === "quest")).toHaveLength(1);
    expect(host.toast).toHaveBeenCalledWith("note_done", "WINDOW PANES");
  });

  it.each([
    ["lithops_bloom"], ["lithops_pebble", "lithops_pair", "lithops_bloom"],
  ] as SpeciesId[][])("accepts qualifying records caught before the quest: %s", async (...caught) => {
    const { run, state } = setup("thistledown_house");
    state.herbarium.caught.push(...caught);
    await run("q_window_panes");
    expect(state.flags).toMatchObject({ quest_window_panes_started: true, window_panes_lithops: true, window_panes_bloom: true, quest_window_panes_done: true });
    expect(state.bag).toMatchObject({ rain_jar: 2, glass_pod: 5 });
    await run("q_window_panes");
    expect(state.bag).toMatchObject({ rain_jar: 2, glass_pod: 5 });
  });
});
