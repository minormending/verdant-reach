// Run Chapter 6 through the real interpreter; placeholder dialogue is editable.
import { describe, expect, it, vi } from "vitest";
import type { BattleOutcome, Button, GameContext, MapId, ScriptCmd, SpeciesId } from "../../contracts";
import { createQuickened } from "../../battle/logic/stats";
import { createSceneStack } from "../../engine/core";
import { DATA } from "../../data";
import { newGameState } from "../../save";
import { runScript, ScriptAbort, type ScriptHost } from "../../overworld/script";
import { createUiKit } from "../../ui/kit";
import { WORLD } from "../index";
import { eachCmd, grid, walkable } from "../validate";
import { ch6Scripts } from "./ch6";
import { handPollinatorOffer, QUESTS, questScripts } from "./quests";

function setup(map: MapId = "saltmarsh_harbour", outcome: BattleOutcome = "won", answer = true) {
  const state = newGameState({ world: WORLD });
  const events: string[] = [];
  const ctx = {
    state, data: DATA, world: WORLD, rng: () => 0.5, timeOfDay: () => "day",
    ui: { say: vi.fn(async () => {}), yesNo: vi.fn(async () => answer), choose: async () => 0 },
    audio: {
      playMusic: vi.fn(), stopMusic: vi.fn(), current: () => null,
      playSfx: (id: string) => { events.push(`sfx:${id}`); },
      playJingle: vi.fn(async () => {}), playCry: vi.fn(async () => {}),
    },
  } as unknown as GameContext;
  const host: ScriptHost = {
    credits: vi.fn(async () => {}),
    ctx, mapId: () => map, map: () => WORLD.maps[map], createQuickened,
    healParty: vi.fn(), battle: vi.fn(async () => outcome), whiteout: vi.fn(async () => {}),
    warp: vi.fn(async () => {}), movePlayer: vi.fn(async () => {}),
    moveNpc: vi.fn(async (id, path) => { events.push(`move:${id}:${path.join(",")}`); }),
    face: vi.fn(), setNpcVisible: vi.fn((id, visible) => {
      events.push(`${visible ? "show" : "hide"}:${id}`);
      if (id.startsWith("grunt_dock") && visible) expect(state.flags.ch6_doctor_met).toBe(true);
      if (id === "reyes_point" && !visible) expect(state.flags.lantern_healed).toBe(true);
    }),
    fade: vi.fn(async () => {}), shake: vi.fn(async () => {}),
    flash: vi.fn(async (color) => {
      expect(state.bag.cactus_sap ?? 0).toBe(0);
      events.push(`flash:${color}`);
    }),
    still: vi.fn(async (id) => { events.push(`still:${id}`); }),
    stillClear: vi.fn(async () => { events.push("stillClear"); }),
    camera: vi.fn(async () => {}), cameraReset: vi.fn(async () => {}),
    emote: vi.fn(async () => {}), wait: vi.fn(async () => {}),
    showSpecies: vi.fn(), hideSpecies: vi.fn(), restoreMusic: vi.fn(), nameEntry: vi.fn(async () => ""),
    endSlice: vi.fn(async () => {
      expect(state.flags).toMatchObject({ beat_reyes: true, ch6_done: true, slice_done: true });
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

describe("Chapter 6 scripts", () => {
  it("wires the scenes and quests and gives every spoken placeholder a speaker", () => {
    for (const id of [
      "ch6_ford_keeper", "ch6_town_enter", "ch6_arrival", "ch6_doctor", "ch6_reyes_point",
      "ch6_lantern_tree", "ch6_cons5_door", "ch6_isle_enter", "ch6_elder", "saguaro",
      "ch6_saguaro_after", "reyes", "ch6_end", "q_seagrass_survey", "q_hand_pollinator", "cons5_gate",
    ]) expect(WORLD.scripts[id], id).toBeDefined();
    const commands = ops([...Object.values(ch6Scripts).flat(), ...questScripts.q_seagrass_survey, ...handPollinatorOffer]);
    for (const c of commands) if (c.op === "say") {
      expect(c.text).toMatch(/^TODO\(text\): /);
      expect(c.speaker).toBeTruthy();
    }
  });

  it("runs the arrival once and records both glide destinations", async () => {
    const { run, state, host } = setup();
    await run("ch6_town_enter");
    expect(state.flags).toMatchObject({ ch6_arrived: true, visited_saltmarsh_harbour: true });
    expect(host.endSlice).not.toHaveBeenCalled();
    const boxes = vi.mocked(host.ctx.ui.say).mock.calls.length;
    await run("ch6_town_enter");
    expect(host.ctx.ui.say).toHaveBeenCalledTimes(boxes);
    await run("ch6_isle_enter");
    expect(state.flags.visited_driftseed_isle).toBe(true);
  });

  it.each([true, false])("keeps the seed for doctor answer %s and reveals grunts after departure", async (answer) => {
    const { run, state, host, events } = setup("saltmarsh_harbour", "won", answer);
    state.flags.got_seed = true;
    const bag = { ...state.bag };
    await run("ch6_doctor");
    expect(host.moveNpc).not.toHaveBeenCalled();
    await run("ch6_arrival");
    events.length = 0;
    await run("ch6_doctor");
    expect(state.flags).toMatchObject({ got_seed: true, ch6_doctor_met: true });
    expect(state.bag).toEqual(bag);
    expect(host.ctx.ui.yesNo).toHaveBeenCalledOnce();
    expect(events).toEqual([
      "move:doctor:up,up", "move:doctor:down,down,down,down,down", "hide:doctor",
      "show:grunt_dock_1", "show:grunt_dock_2",
    ]);
    expect(host.cameraReset).toHaveBeenCalled();
    await run("ch6_doctor");
    expect(host.ctx.ui.yesNo).toHaveBeenCalledOnce();
  });

  it.each(Array.from({ length: 8 }, (_, flags) => ({
    doctor: !!(flags & 1), first: !!(flags & 2), second: !!(flags & 4),
  })))("gates the sole raft grant on docks completion: $doctor/$first/$second", async ({ doctor, first, second }) => {
    const grants = Object.entries(WORLD.scripts).filter(([, cmds]) => ops(cmds).some((c) => c.op === "giveItem" && c.item === "lily_raft"));
    expect(grants.map(([id]) => id)).toEqual(["ch6_reyes_point"]);
    const { run, state, host } = setup();
    Object.assign(state.flags, { ch6_arrived: true, ch6_doctor_met: doctor, beat_grunt_dock_1: first, beat_grunt_dock_2: second });
    await run("ch6_reyes_point");
    await run("ch6_reyes_point");
    const complete = doctor && first && second;
    expect(state.flags.got_raft ?? false).toBe(complete);
    expect(state.bag.lily_raft ?? 0).toBe(complete ? 1 : 0);
    if (!complete) {
      expect(host.ctx.ui.say).toHaveBeenCalledWith("TODO(text): Something is wrong at the docks.", { speaker: "REYES" });
      expect(host.ctx.ui.say).toHaveBeenCalledWith("TODO(text): Check the docks before sailing to Driftseed Isle.", { speaker: "REYES" });
    }
  });

  it("enforces docks → raft → island → saxifrage → Saguaro → sap → tree → Reyes → end", async () => {
    const { run, state, host, events } = setup();
    await run("ch6_elder");
    await run("saguaro");
    await run("ch6_saguaro_after");
    await run("ch6_lantern_tree");
    await run("reyes");
    await run("ch6_end");
    expect(host.battle).not.toHaveBeenCalled();
    expect(host.endSlice).not.toHaveBeenCalled();
    expect(state.bag.saxifrage).toBeUndefined();
    expect(state.bag.cactus_sap).toBeUndefined();
    expect(state.flags.lantern_healed).not.toBe(true);

    await run("ch6_arrival");
    await run("ch6_doctor");
    await runScript(host, [{ op: "battle", trainer: "grunt_dock_1" }, { op: "battle", trainer: "grunt_dock_2" }]);
    expect(state.flags).toMatchObject({ ch6_doctor_met: true, beat_grunt_dock_1: true, beat_grunt_dock_2: true });
    vi.mocked(host.battle).mockClear();
    await run("ch6_reyes_point");
    await run("ch6_reyes_point");
    expect(state.flags.got_raft).toBe(true);
    expect(state.bag.lily_raft).toBe(1);
    await run("ch6_elder");
    expect(state.flags.got_saxifrage).not.toBe(true);
    await run("ch6_isle_enter");
    await run("ch6_elder");
    await run("ch6_elder");
    expect(state.flags.got_saxifrage).toBe(true);
    expect(state.bag.saxifrage).toBe(1);
    await run("ch6_saguaro_after");
    expect(state.flags.got_sap).not.toBe(true);
    await run("saguaro");
    expect(state.flags).toMatchObject({ beat_saguaro: true, got_sap: true });
    expect(state.marks).toContain("cactus_mark");
    expect(state.bag.cactus_sap).toBe(1);
    await run("saguaro");
    expect(state.bag.cactus_sap).toBe(1);
    expect(host.battle).toHaveBeenCalledOnce();
    await run("reyes");
    expect(host.battle).toHaveBeenCalledOnce();
    events.length = 0;
    await run("ch6_lantern_tree");
    expect(events).toEqual(["flash:gold", "sfx:pulse", "still:lantern_tree_healed", "stillClear", "hide:reyes_point"]);
    expect(state.flags.lantern_healed).toBe(true);
    expect(state.bag.cactus_sap ?? 0).toBe(0);
    await run("ch6_lantern_tree");
    await run("ch6_saguaro_after");
    expect(host.still).toHaveBeenCalledOnce();
    expect(state.bag.cactus_sap ?? 0).toBe(0);
    await run("reyes");
    expect(state.flags.beat_reyes).toBe(true);
    expect(state.marks).toContain("mangrove_mark");
    expect(host.endSlice).not.toHaveBeenCalled();
    await run("reyes");
    expect(host.battle).toHaveBeenCalledTimes(2);
    await run("ch6_town_enter");
    expect(state.flags).toMatchObject({ ch6_done: true, slice_done: true });
    expect(host.endSlice).toHaveBeenCalledOnce();
    await run("ch6_town_enter");
    expect(host.endSlice).toHaveBeenCalledOnce();
  });

  it("does not heal the tree with a flag alone or consume sap without its story flag", async () => {
    for (const gotSap of [false, true]) for (const hasSap of [false, true]) {
      const { run, state, host } = setup();
      state.flags.got_sap = gotSap;
      if (hasSap) state.bag.cactus_sap = 1;
      await run("ch6_lantern_tree");
      expect(state.flags.lantern_healed ?? false).toBe(gotSap && hasSap);
      expect(host.still).toHaveBeenCalledTimes(gotSap && hasSap ? 1 : 0);
      expect(state.bag.cactus_sap ?? 0).toBe(hasSap && !gotSap ? 1 : 0);
    }
  });

  it.each(["saguaro", "reyes"] as const)("allows a %s retry after a loss without premature rewards", async (leader) => {
    const { run, state, host } = setup(leader === "saguaro" ? "driftseed_conservatory" : "saltmarsh_conservatory", "lost");
    Object.assign(state.flags, { got_saxifrage: true, lantern_healed: true });
    await run(leader);
    expect(state.flags[`beat_${leader}`]).not.toBe(true);
    expect(state.flags.got_sap).not.toBe(true);
    expect(state.bag.cactus_sap).toBeUndefined();
    expect(state.marks).toEqual([]);
    expect(host.whiteout).toHaveBeenCalledOnce();
    vi.mocked(host.battle).mockResolvedValue("won");
    await run(leader);
    expect(state.flags[`beat_${leader}`]).toBe(true);
    expect(state.marks).toContain(leader === "saguaro" ? "cactus_mark" : "mangrove_mark");
    if (leader === "saguaro") expect(state.bag.cactus_sap).toBe(1);
  });

  it("bounces the locked door and toggles both sluice states", async () => {
    const { run, state, host } = setup();
    await run("ch6_cons5_door");
    expect(host.movePlayer).toHaveBeenCalledWith(["down"]);
    state.flags.lantern_healed = true;
    await run("ch6_cons5_door");
    expect(host.movePlayer).toHaveBeenCalledOnce();
    await run("cons5_gate");
    expect(state.flags.cons5_gate).toBe(true);
    await run("cons5_gate");
    expect(state.flags.cons5_gate).toBe(false);
  });

  it("keeps the doctor's approach and departure on clear map tiles", () => {
    const map = WORLD.maps.saltmarsh_harbour, g = grid(map);
    const npc = map.npcs.find((n) => n.id === "doctor")!;
    const trigger = map.triggers.find((t) => t.script === "ch6_doctor")!;
    const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    let { x, y } = npc;
    for (const c of ops(ch6Scripts.ch6_doctor)) if (c.op === "moveNpc") {
      expect(c.npc).toBe(npc.id);
      for (const dir of c.path) {
        x += delta[dir][0]; y += delta[dir][1];
        expect(walkable(g, x, y), `${x},${y}`).toBe(true);
        expect(map.npcs.some((n) => n.id !== npc.id && n.x === x && n.y === y)).toBe(false);
        expect(y === trigger.y && x >= trigger.x && x < trigger.x + (trigger.w ?? 1)).toBe(false);
      }
    }
    expect([x, y]).toEqual([12, 26]);
    expect(ops(ch6Scripts.ch6_doctor).at(-1)?.op).toBe("cameraReset");
  });
});

describe("Chapter 6 quests", () => {
  it("prepares the exact vanilla offer and completes only after a real exchange and growth", async () => {
    const { host, state } = setup("saltmarsh_market");
    const { ctx } = host;
    await runScript(host, handPollinatorOffer);
    expect(state.flags.quest_hand_pollinator_started).toBe(true);
    expect(state.flags.quest_hand_pollinator_done).not.toBe(true);

    // Drive the actual party picker and unskippable trade-growth scene.
    const scenes = createSceneStack();
    let button: Button | undefined;
    ctx.scenes = scenes;
    ctx.input = {
      pressed: (b: Button) => b === button,
      repeat: (b: Button) => b === button,
      held: (b: Button) => b === button,
    } as GameContext["input"];
    ctx.assets = { exists: () => false, has: () => false, image: () => ({ width: 16, height: 16 }) } as unknown as GameContext["assets"];
    ctx.ui = createUiKit(ctx);
    state.options.textSpeed = "fast";
    const offered = createQuickened(DATA, "vanilla_vine", 26, () => 0.5);
    state.party = [offered];
    let finished = false;
    const trade = runScript(host, handPollinatorOffer).then(() => { finished = true; });
    for (let i = 0; i < 2500 && !finished; i++) {
      button = "a";
      scenes.top()?.update(1000 / 60);
      for (let j = 0; j < 12; j++) await Promise.resolve();
      button = undefined;
    }
    expect(finished, "vanilla exchange and growth completed").toBe(true);
    await trade;
    expect(state.party).toHaveLength(1);
    expect(state.party[0]).not.toBe(offered);
    expect(state.party[0]).toMatchObject({ species: "vanilla_orchid", level: 30, nickname: "POLLY" });
    expect(state.herbarium.caught).toContain("vanilla_orchid");
    expect(state.flags.quest_hand_pollinator_done).toBe(true);
    expect(scenes.all()).toHaveLength(0);
    const received = state.party[0];
    ctx.ui = { ...ctx.ui, say: vi.fn(async () => {}) };
    await runScript(host, handPollinatorOffer);
    expect(state.party[0]).toBe(received);
  });

  it("keeps the final titles, steps and rewards", () => {
    expect(QUESTS.seagrass_survey).toMatchObject({ title: "SEAGRASS SURVEY", reward: "3 GLASS PODS + RAIN JAR" });
    expect(QUESTS.seagrass_survey.steps.map((s) => s.text)).toEqual(["Catch a SEAGRASS.", "Catch a MANGROVE."]);
    expect(QUESTS.hand_pollinator).toMatchObject({ title: "HAND POLLINATOR", reward: "a VANILLA" });
    expect(QUESTS.hand_pollinator.steps.map((s) => s.text)).toEqual(["Trade a VANILLA VINE."]);
  });

  it.each([
    ["seagrass_shoot", "mangrove_propagule"], ["eelgrass", "mangrove_sapling"], ["eelgrass", "red_mangrove"],
  ] satisfies [SpeciesId, SpeciesId][])("completes the survey with caught %s and %s, rewarding once", async (seagrass, mangrove) => {
    const { run, state } = setup("route_8");
    await run("q_seagrass_survey");
    expect(state.flags.quest_seagrass_survey_started).toBe(true);
    state.herbarium.seen.push(seagrass, mangrove);
    await run("q_seagrass_survey");
    expect(state.flags.quest_seagrass_survey_done).not.toBe(true);
    state.herbarium.caught.push(seagrass);
    await run("q_seagrass_survey");
    expect(state.flags.seagrass_survey_seagrass).toBe(true);
    expect(state.flags.seagrass_survey_mangrove).not.toBe(true);
    state.herbarium.caught.push(mangrove);
    await run("q_seagrass_survey");
    expect(state.flags).toMatchObject({ seagrass_survey_mangrove: true, quest_seagrass_survey_done: true });
    await run("q_seagrass_survey");
    expect(state.bag).toMatchObject({ glass_pod: 3, rain_jar: 1 });
  });

  it("credits both catches made before starting the survey", async () => {
    const { run, state } = setup("route_8");
    state.herbarium.caught.push("eelgrass", "red_mangrove");
    await run("q_seagrass_survey");
    expect(state.flags.quest_seagrass_survey_done).toBe(true);
    expect(state.bag).toMatchObject({ glass_pod: 3, rain_jar: 1 });
  });
});
