// Chapter 10 through the real interpreter: progression, replay and encounter outcomes.
import { describe, expect, it, vi } from "vitest";
import { MARKS, type BattleOutcome, type GameContext, type MapId } from "../../contracts";
import { createQuickened } from "../../battle/logic/stats";
import { DATA } from "../../data";
import { newGameState } from "../../save";
import { runScript, ScriptAbort, type ScriptHost } from "../../overworld/script";
import { checkCond } from "../../overworld/map";
import { WORLD } from "../index";
import { eachCmd, grid, walkable } from "../validate";
import { ch10Scripts } from "./ch10";

function setup(outcome: BattleOutcome = "won") {
  let map: MapId = "council_arboretum";
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
    warp: vi.fn(async () => {}), movePlayer: vi.fn(async () => {}), moveNpc: vi.fn(async () => {}),
    face: vi.fn(), setNpcVisible: vi.fn((id, visible) => { events.push(`${visible ? "show" : "hide"}:${id}`); }),
    fade: vi.fn(async () => {}), shake: vi.fn(async () => { events.push("shake"); }), flash: vi.fn(async () => {}),
    still: vi.fn(async (id) => { events.push(`still:${id}`); }),
    stillClear: vi.fn(async () => { events.push("stillClear"); }),
    camera: vi.fn(async () => {}), cameraReset: vi.fn(async () => {}),
    emote: vi.fn(async () => {}), wait: vi.fn(async () => {}),
    showSpecies: vi.fn(), hideSpecies: vi.fn(), restoreMusic: vi.fn(), nameEntry: vi.fn(async () => ""), toast: vi.fn(),
    endSlice: vi.fn(async () => {
      expect(state.flags).toMatchObject({ beat_mercer: true, ch10_done: true, slice_done: true });
    }),
  };
  const run = async (id: string) => {
    try { await runScript(host, id); }
    catch (error) { if (!(error instanceof ScriptAbort)) throw error; }
  };
  return { state, host, events, run, enter: async (id: MapId) => {
    map = id;
    if (WORLD.maps[id].onEnter) await run(WORLD.maps[id].onEnter!);
  } };
}

const ready = { ch9_done: true, ch10_arrived: true, bram_joined: true };
const rings = ["elder_grove_1", "elder_grove_2", "elder_grove_3"] as const;
const admins = { beat_shears_2: true, beat_calloway_2: true, beat_wren_2: true };

describe("Chapter 10 scripts", () => {
  it("wires finished dialogue, one name per speaker, speaker-less narration and scripted admin encounters", () => {
    const speakers = new Set<string>();
    let narration = 0;
    for (const [id, cmds] of Object.entries(ch10Scripts)) {
      expect(WORLD.scripts[id]).toEqual(cmds);
      eachCmd(cmds, (c) => { if (c.op === "say") {
        expect(c.text).not.toMatch(/TODO/);
        // Narration has no speaker, as in Chapters 5–9: "NARRATOR" would print "NARRATOR:".
        if (c.speaker === undefined) { narration++; return; }
        speakers.add(c.speaker);
        if (id.startsWith("ch10_bram")) expect(c.speaker).toBe("BRAM");
        if (id === "ch10_end" || id === "ch10_rowan") expect(c.speaker).toBe("ROWAN");
        // The Elder never speaks in words.
        if (id === "ch10_elder") expect(c.speaker).toBeUndefined();
      } });
    }
    expect(narration).toBeGreaterThan(0);
    expect([...speakers].sort()).toEqual(["BRAM", "DR. CALLOWAY", "GUARD", "MARKS WARDEN", "MERCER", "ROWAN", "SHEARS", "VISITOR", "WREN"]);
    for (const [i, id] of ["shears_2", "calloway_2", "wren_2"].entries()) {
      const map = WORLD.maps[rings[i]];
      expect(map.npcs.find((n) => n.id === id)).toMatchObject({ script: id });
      expect(map.npcs.find((n) => n.id === id)?.trainer).toBeUndefined();
    }
    // The only path through the Grove Gate also joins Bram, even if his east-side trigger was bypassed.
    expect(WORLD.maps.council_arboretum.triggers).toContainEqual({
      x: 16, y: 1, script: "ch10_bram_joins", when: [{ flag: "bram_joined", is: false }],
    });
  });

  it("runs the road → arrival → Bram → rings → heal → Mercer → planting → Elder → Council chain once", async () => {
    const { run, enter, state, host, events } = setup();
    state.bag.centuryheart_seed = 1;
    await run("ch10_west_gate");
    expect(host.movePlayer).toHaveBeenCalledWith(["right"]);
    state.flags.ch9_done = true;
    state.marks.push(...MARKS);
    await run("ch10_west_gate");
    expect(host.movePlayer).toHaveBeenCalledOnce();
    await run("ch10_marks_warden");
    await enter("council_arboretum");
    expect(state.flags).toMatchObject({ ch10_marks_checked: true, ch10_arrived: true, visited_council_arboretum: true });
    const boxes = vi.mocked(host.ctx.ui.say).mock.calls.length;
    await run("ch10_arrival");
    expect(host.ctx.ui.say).toHaveBeenCalledTimes(boxes);
    await run("ch10_council_door");
    expect(host.movePlayer).toHaveBeenLastCalledWith(["down"]);
    await run("ch10_bram_joins");
    await run("ch10_bram_joins");
    expect(state.flags.bram_joined).toBe(true);
    expect(host.setNpcVisible).toHaveBeenCalledWith("bram_arboretum", false);
    for (const [i, id] of ["shears_2", "calloway_2", "wren_2"].entries()) {
      await enter(rings[i]);
      await run(id);
      expect(state.flags[`beat_${id}`]).toBe(true);
      expect(state.flags[`${id}_yielded`]).toBe(true);
      await run(id);
      await run(`${id}_after`);
      expect(host.battle).toHaveBeenCalledTimes(i + 1);
    }
    await run("ch10_bram_heal");
    await run("ch10_bram_heal");
    expect(host.healParty).toHaveBeenCalledOnce();
    await enter("elder_grove_heart");
    events.length = 0;
    await run("mercer");
    expect(state.flags).toMatchObject({ beat_mercer: true, centuryheart_planted: true });
    expect(state.bag.centuryheart_seed).toBeUndefined();
    expect(events).toEqual(["still:bloom", "shake", "stillClear", "hide:mercer", "hide:rowan", "hide:grunt_heart_1", "hide:grunt_heart_2", "show:the_elder"]);
    expect(host.ctx.ui.say).toHaveBeenCalledWith(expect.stringMatching(/the QUICKENED don't go back to sleep\. They choose to stay awake\.$/), undefined);
    expect(events).toEqual(["still:centuryheart_sprouts", "shake", "stillClear", "hide:mercer", "hide:rowan", "hide:grunt_heart_1", "hide:grunt_heart_2", "show:the_elder"]);
    expect(host.ctx.ui.say).toHaveBeenCalledWith("TODO(text): The Quickened stay awake. They choose to stay awake.", { speaker: "NARRATOR" });
    await run("mercer");
    await run("mercer_after");
    await run("ch10_planting");
    expect(host.still).toHaveBeenCalledOnce();
    expect(host.restoreMusic).toHaveBeenCalledOnce();
    expect(host.battle).toHaveBeenCalledTimes(4);
    vi.mocked(host.battle).mockResolvedValue("caught");
    await run("ch10_elder");
    expect(state.flags.elder_caught).toBe(true);
    expect(host.setNpcVisible).toHaveBeenCalledWith("the_elder", false);
    await run("ch10_elder");
    expect(host.battle).toHaveBeenCalledTimes(5);
    expect(host.endSlice).not.toHaveBeenCalled();
    await enter("council_arboretum");
    await enter("council_arboretum");
    await run("ch10_end");
    expect(host.endSlice).toHaveBeenCalledOnce();
    vi.mocked(host.movePlayer).mockClear();
    await run("ch10_council_door");
    expect(host.movePlayer).not.toHaveBeenCalled();
  });

  it("rejects later scenes out of order and requires every actual mark for arrival", async () => {
    const { run, enter, state, host } = setup();
    for (const id of ["ch10_bram_joins", "shears_2", "shears_2_after", "calloway_2", "calloway_2_after", "wren_2", "wren_2_after", "ch10_bram_heal", "mercer", "mercer_after", "ch10_planting", "ch10_elder", "ch10_end"]) await run(id);
    expect(host.battle).not.toHaveBeenCalled();
    expect(host.healParty).not.toHaveBeenCalled();
    expect(host.still).not.toHaveBeenCalled();
    expect(host.endSlice).not.toHaveBeenCalled();
    expect(state.flags.bram_joined).not.toBe(true);
    await enter("council_arboretum");
    expect(state.flags.ch10_arrived).not.toBe(true);
    state.marks.push(...MARKS);
    await enter("council_arboretum");
    expect(state.flags.ch10_arrived).not.toBe(true);
    state.flags.ch9_done = true;
    for (let missing = 0; missing < MARKS.length; missing++) {
      state.marks = MARKS.filter((_, i) => i !== missing);
      await run("ch10_marks_warden");
      await enter("council_arboretum");
      expect(state.flags.ch10_marks_checked).not.toBe(true);
      expect(state.flags.ch10_arrived).not.toBe(true);
    }
    expect(host.movePlayer).toHaveBeenCalledTimes(8);
    state.marks = [...MARKS];
    await enter("council_arboretum");
    await run("ch10_bram_joins");
    for (const id of ["calloway_2", "wren_2", "mercer"]) await run(id);
    expect(host.battle).not.toHaveBeenCalled();
    await run("shears_2");
    await run("wren_2");
    await run("mercer");
    expect(host.battle).toHaveBeenCalledOnce();
    await run("calloway_2");
    await run("mercer");
    expect(host.battle).toHaveBeenCalledTimes(2);
  });

  it.each(["shears_2", "calloway_2", "wren_2", "mercer"])("retries %s after a loss without advancing", async (id) => {
    const { run, state, host } = setup("lost");
    Object.assign(state.flags, ready, admins);
    delete state.flags[`beat_${id}`];
    state.bag.centuryheart_seed = 1;
    await run(id);
    expect(host.whiteout).toHaveBeenCalledOnce();
    expect(state.flags[`beat_${id}`]).not.toBe(true);
    expect(state.flags[`${id}_yielded`]).not.toBe(true);
    expect(state.flags.centuryheart_planted).not.toBe(true);
    expect(state.bag.centuryheart_seed).toBe(1);
    vi.mocked(host.battle).mockResolvedValue("won");
    await run(id);
    expect(state.flags[`beat_${id}`]).toBe(true);
    await run(id);
    expect(host.battle).toHaveBeenCalledTimes(2);
  });

  it("plants only after Mercer with a real seed, consuming exactly one despite replay", async () => {
    const { run, state, host } = setup();
    state.bag.centuryheart_seed = 2;
    await run("ch10_planting");
    expect(state.bag.centuryheart_seed).toBe(2);
    state.flags.beat_mercer = true;
    delete state.bag.centuryheart_seed;
    await run("ch10_planting");
    expect(state.flags.centuryheart_planted).not.toBe(true);
    expect(host.still).not.toHaveBeenCalled();
    state.bag.centuryheart_seed = 2;
    await run("ch10_planting");
    await run("ch10_planting");
    await run("mercer_after");
    expect(state.bag.centuryheart_seed).toBe(1);
    expect(host.still).toHaveBeenCalledOnce();
    expect(host.shake).toHaveBeenCalledOnce();
  });

  it.each(["caught", "fled", "lost", "won"] as const)("keeps the Elder retryable unless this attempt is caught (%s)", async (outcome) => {
    const { run, enter, state, host } = setup(outcome);
    // An old Herbarium record must not masquerade as this attempt's catch.
    state.herbarium.caught.push("elder");
    await run("ch10_elder");
    expect(host.battle).not.toHaveBeenCalled();
    state.flags.centuryheart_planted = true;
    await enter("elder_grove_heart");
    await run("ch10_elder");
    expect(host.battle).toHaveBeenCalledWith({ kind: "wild", wild: { species: "elder", level: 60, sport: undefined }, canLose: true, backdrop: undefined });
    expect(state.flags.elder_caught ?? false).toBe(outcome === "caught");
    // A loss to the Elder heals in place instead of whiting out.
    expect(host.whiteout).not.toHaveBeenCalled();
    expect(host.healParty).toHaveBeenCalledTimes(outcome === "lost" ? 1 : 0);
    const elder = WORLD.maps.elder_grove_heart.npcs.find((n) => n.id === "the_elder")!;
    await enter("elder_grove_heart");
    expect(checkCond(elder.visibleWhen, state.flags)).toBe(outcome !== "caught");
    if (outcome === "caught") {
      expect(host.setNpcVisible).toHaveBeenCalledWith("the_elder", false);
      await run("ch10_elder");
      expect(host.battle).toHaveBeenCalledOnce();
    } else {
      expect(host.setNpcVisible).not.toHaveBeenCalled();
      vi.mocked(host.battle).mockResolvedValue("caught");
      await run("ch10_elder");
      expect(host.battle).toHaveBeenCalledTimes(2);
      expect(state.flags.elder_caught).toBe(true);
      expect(host.setNpcVisible).toHaveBeenCalledWith("the_elder", false);
    }
  });

  it("heals once per ring-three arrival, after Wren and before Mercer", async () => {
    const { run, enter, state, host } = setup();
    Object.assign(state.flags, ready);
    await enter("elder_grove_3");
    await run("ch10_bram_heal");
    expect(host.healParty).not.toHaveBeenCalled();
    state.flags.beat_wren_2 = true;
    await run("ch10_bram_heal");
    await run("ch10_bram_heal");
    expect(host.healParty).toHaveBeenCalledOnce();
    await enter("elder_grove_heart");
    await enter("elder_grove_3");
    await run("ch10_bram_heal");
    await run("ch10_bram_heal");
    expect(host.healParty).toHaveBeenCalledTimes(2);
    state.flags.beat_mercer = true;
    await enter("elder_grove_3");
    await run("ch10_bram_heal");
    expect(host.healParty).toHaveBeenCalledTimes(2);
  });

  it("ends only after beat_mercer, once, including the Arboretum onEnter", async () => {
    const { run, enter, state, host } = setup();
    Object.assign(state.flags, ready, admins, { centuryheart_planted: true, elder_caught: true });
    await run("ch10_end");
    await enter("council_arboretum");
    expect(state.flags.ch10_done).not.toBe(true);
    expect(host.endSlice).not.toHaveBeenCalled();
    state.flags.beat_mercer = true;
    await enter("council_arboretum");
    expect(state.flags).toMatchObject({ ch10_done: true, slice_done: true });
    await enter("council_arboretum");
    await run("ch10_end");
    expect(host.endSlice).toHaveBeenCalledOnce();
  });

  it("bounces gates onto clear tiles", () => {
    for (const [mapId, script, dx, dy] of [
      ["sanguine_ridge", "ch10_west_gate", 1, 0],
      ["route_12", "ch10_marks_warden", 1, 0],
      ["council_arboretum", "ch10_council_door", 0, 1],
    ] as const) {
      const map = WORLD.maps[mapId], trigger = map.triggers.find((t) => t.script === script)!;
      expect(walkable(grid(map), trigger.x + dx, trigger.y + dy)).toBe(true);
    }
  });
});
