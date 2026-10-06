// Execute Chapter 5's contract through the real interpreter, including retries
// and branch order. Text stays editable by the lead without changing tests.
import { describe, expect, it, vi } from "vitest";
import type { BattleOutcome, GameContext, MapId, ScriptCmd, SpeciesId } from "../../contracts";
import { DATA } from "../../data";
import { newGameState } from "../../save";
import { runScript, ScriptAbort, type ScriptHost } from "../../overworld/script";
import { WORLD } from "../index";
import { eachCmd, grid, walkable } from "../validate";
import { ch5Scripts } from "./ch5";
import { QUESTS, questScripts } from "./quests";

function setup(map: MapId = "burnt_stand", outcome: BattleOutcome = "won") {
  const state = newGameState({ world: WORLD });
  const events: string[] = [];
  const ctx = {
    state, data: DATA, world: WORLD, rng: () => 0.5, timeOfDay: () => "night",
    ui: { say: vi.fn(async () => {}), yesNo: async () => true, choose: async () => 0 },
    audio: {
      playMusic: vi.fn(), stopMusic: vi.fn(), current: () => null,
      playSfx: (id: string) => { events.push(`sfx:${id}`); },
      playJingle: vi.fn(async () => {}), playCry: vi.fn(async () => {}),
    },
  } as unknown as GameContext;
  const host: ScriptHost = {
    ctx, mapId: () => map, map: () => WORLD.maps[map],
    createQuickened: () => { throw new Error("No species grants in Chapter 5"); },
    healParty: vi.fn(), battle: vi.fn(async () => outcome), whiteout: vi.fn(async () => {}),
    warp: vi.fn(async () => {}), movePlayer: vi.fn(async () => {}), moveNpc: vi.fn(async () => {}),
    face: vi.fn(), setNpcVisible: vi.fn((id, visible) => {
      events.push(`${visible ? "show" : "hide"}:${id}`);
      if (id === "morrow_bs" && visible) expect(state.flags.burnt_vision_seen).toBe(true);
    }),
    fade: vi.fn(async () => {}), shake: vi.fn(async () => { events.push("shake"); }),
    flash: vi.fn(async (color) => { events.push(`flash:${color}`); }),
    still: vi.fn(async (id) => { events.push(`still:${id}`); }),
    stillClear: vi.fn(async () => { events.push("stillClear"); }),
    camera: vi.fn(async () => {}), cameraReset: vi.fn(async () => {}),
    emote: vi.fn(async () => {}), wait: vi.fn(async () => {}),
    showSpecies: vi.fn(), hideSpecies: vi.fn(), restoreMusic: vi.fn(), nameEntry: vi.fn(async () => ""),
    endSlice: vi.fn(async () => {
      expect(state.flags).toMatchObject({ beat_morrow: true, ch5_done: true, slice_done: true });
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

describe("Chapter 5 scripts", () => {
  it("wires every §F scene and quest without duplicate ids", () => {
    for (const id of [
      "ch5_grove_ranger", "ch5_arrival", "ch5_conservatory_door", "ch5_grunts", "rival_4",
      "ch5_vision", "ch5_morrow_burnt", "ch5_shrine_keeper", "morrow", "ch5_end",
      "q_fire_followers", "q_shrine_offerings", ...[1, 2, 3].map((n) => `q_shrine_offerings_shrine_${n}`),
    ]) expect(WORLD.scripts[id], id).toBeDefined();
    for (const c of ops([...Object.values(ch5Scripts).flat(), ...Object.entries(questScripts)
      .filter(([id]) => /^q_(fire_followers|shrine_offerings)/.test(id)).flatMap(([, cmds]) => cmds)])) {
      if (c.op === "say") {
        expect(c.text).toMatch(/^TODO\(text\): /);
        expect(c.speaker).toBeTruthy();
      }
    }
  });

  it("sets the arrival, camp, vision and Morrow-return flags", async () => {
    const { run, state, host, events } = setup();
    await run("ch5_arrival");
    await run("ch5_grunts");
    await run("ch5_vision");
    expect(state.flags.burnt_vision_seen).not.toBe(true);
    await run("ch5_morrow_burnt");
    expect(state.flags.morrow_returned).not.toBe(true);
    await run("rival_4");
    events.length = 0;
    await run("ch5_vision");
    expect(events).toEqual(["shake", "flash:gold", "sfx:pulse", "still:relay_pulse", "stillClear", "show:morrow_bs"]);
    await run("ch5_morrow_burnt");
    expect(state.flags).toMatchObject({
      ch5_arrived: true, visited_cedarhallow: true, ch5_grunts_seen: true,
      rival_4_done: true, burnt_vision_seen: true, morrow_returned: true,
    });
    expect(host.setNpcVisible).toHaveBeenCalledWith("morrow_bs", false);
    await run("ch5_vision");
    expect(events.filter((e) => e === "show:morrow_bs")).toHaveLength(1);
  });

  it.each([
    ["oak", "chili"], ["chili", "lily"], ["lily", "oak"],
  ])("counters the %s starter with %s after either battle result", async (starter, counter) => {
    for (const result of ["won", "lost"] as const) {
      const { run, state, host } = setup("burnt_stand", result);
      state.flags[`got_starter_${starter}`] = true;
      await run("rival_4");
      expect(host.battle).toHaveBeenCalledWith(expect.objectContaining({ trainer: `rival_4_${counter}`, canLose: true }));
      expect(state.flags.rival_4_done).toBe(true);
      expect(host.moveNpc).toHaveBeenCalledWith("bram", expect.any(Array));
      expect(host.setNpcVisible).toHaveBeenCalledWith("bram", false);
      expect(host.whiteout).not.toHaveBeenCalled();
      expect(host.healParty).toHaveBeenCalledOnce();
      await run("rival_4");
      expect(host.battle).toHaveBeenCalledOnce();
    }
  });

  it("requires the vision for the lantern and both for Conservatory entry", async () => {
    for (const vision of [false, true]) for (const lantern of [false, true]) {
      const { run, state, host } = setup("cedar_hollow");
      Object.assign(state.flags, { burnt_vision_seen: vision, got_lantern: lantern });
      await run("ch5_conservatory_door");
      expect(host.movePlayer).toHaveBeenCalledTimes(vision && lantern ? 0 : 1);
      await run("ch5_shrine_keeper");
      expect(state.bag.foxfire_lantern ?? 0).toBe(vision && !lantern ? 1 : 0);
      if (vision || lantern) expect(state.flags.got_lantern).toBe(true);
      await run("ch5_shrine_keeper");
      expect(state.bag.foxfire_lantern ?? 0).toBe(vision && !lantern ? 1 : 0);
    }
  });

  it("awards the Pipe Mark only for a win, then gates the end and seed grant", async () => {
    for (const outcome of ["won", "lost"] as const) {
      const { run, state, host } = setup("cedarhallow_conservatory", outcome);
      await run("ch5_end");
      expect(host.endSlice).not.toHaveBeenCalled();
      await run("morrow");
      expect(host.battle).not.toHaveBeenCalled();
      Object.assign(state.flags, { burnt_vision_seen: true, got_lantern: true });
      await run("morrow");
      expect(state.flags.beat_morrow ?? false).toBe(outcome === "won");
      expect(state.marks.includes("pipe_mark")).toBe(outcome === "won");
      await run("ch5_end");
      expect(host.endSlice).toHaveBeenCalledTimes(outcome === "won" ? 1 : 0);
      expect(state.bag.glider_seed ?? 0).toBe(outcome === "won" ? 1 : 0);
      await run("ch5_end");
      expect(state.bag.glider_seed ?? 0).toBe(outcome === "won" ? 1 : 0);
      if (outcome === "won") {
        await run("morrow");
        expect(host.battle).toHaveBeenCalledOnce();
      } else expect(host.whiteout).toHaveBeenCalledOnce();
    }
  });

  it("uses clear map tiles for departing NPCs and restores the camera", () => {
    const map = WORLD.maps.burnt_stand, g = grid(map);
    const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    for (const id of ["rival_4", "ch5_morrow_burnt"]) {
      const cmds = ops(ch5Scripts[id]);
      for (const c of cmds) if (c.op === "moveNpc") {
        const npc = map.npcs.find((n) => n.id === c.npc)!;
        let { x, y } = npc;
        for (const dir of c.path) {
          x += delta[dir][0]; y += delta[dir][1];
          expect(walkable(g, x, y), `${id}: ${x},${y}`).toBe(true);
          const flags: Record<string, boolean> = { rival_4_done: id !== "rival_4", burnt_vision_seen: id !== "rival_4" };
          expect(map.npcs.some((n) => n.id !== npc.id && n.x === x && n.y === y &&
            (!n.visibleWhen || n.visibleWhen.every((v) => (flags[v.flag] ?? false) === v.is)))).toBe(false);
        }
      }
      expect(cmds.some((c) => c.op === "cameraReset")).toBe(true);
    }
  });
});

describe("Chapter 5 quests", () => {
  it("keeps the final quest titles, steps and rewards", () => {
    expect(QUESTS.fire_followers).toMatchObject({ title: "FIRE FOLLOWERS", reward: "3 GLASS PODS + EMBER ASH" });
    expect(QUESTS.fire_followers.steps.map((s) => s.text)).toEqual(["Catch a FIREWEED.", "Catch a LODGEPOLE."]);
    expect(QUESTS.shrine_offerings).toMatchObject({ title: "SHRINE OFFERINGS", reward: "2 RAIN JARS + $1500" });
    expect(QUESTS.shrine_offerings.steps).toHaveLength(3);
  });

  it.each([
    ["fireweed_fluff", "lodgepole_cone"], ["fireweed_shoot", "lodgepole_seedling"], ["fireweed", "lodgepole_pine"],
  ] satisfies [SpeciesId, SpeciesId][])("completes FIRE FOLLOWERS with caught %s and %s and grants once", async (fireweed, lodgepole) => {
    const { run, state } = setup("cedarhallow_house");
    await run("q_fire_followers");
    expect(state.flags.quest_fire_followers_started).toBe(true);
    expect(state.flags.quest_fire_followers_done).not.toBe(true);
    state.herbarium.seen.push(fireweed, lodgepole);
    await run("q_fire_followers");
    expect(state.flags.quest_fire_followers_done).not.toBe(true);
    state.herbarium.caught.push(fireweed);
    await run("q_fire_followers");
    expect(state.flags.fire_followers_fireweed).toBe(true);
    expect(state.flags.fire_followers_lodgepole).not.toBe(true);
    expect(state.flags.quest_fire_followers_done).not.toBe(true);
    state.herbarium.caught.push(lodgepole);
    await run("q_fire_followers");
    expect(state.flags).toMatchObject({ fire_followers_lodgepole: true, quest_fire_followers_done: true });
    await run("q_fire_followers");
    expect(state.bag).toMatchObject({ glass_pod: 3, ember_ash: 1 });
  });

  it("immediately credits records caught before FIRE FOLLOWERS starts", async () => {
    const { run, state } = setup("cedarhallow_house");
    state.herbarium.caught.push("fireweed", "lodgepole_pine");
    await run("q_fire_followers");
    expect(state.flags.quest_fire_followers_done).toBe(true);
  });

  it("starts SHRINE OFFERINGS after the lantern, records three visits and rewards once", async () => {
    const { run, state } = setup("cedar_hollow");
    const money = state.money;
    await run("q_shrine_offerings");
    await run("q_shrine_offerings_shrine_1");
    expect(state.flags.quest_shrine_offerings_started).not.toBe(true);
    expect(state.flags.shrine_1_offered).not.toBe(true);
    state.flags.burnt_vision_seen = true;
    await run("ch5_shrine_keeper");
    expect(state.flags).toMatchObject({ got_lantern: true, quest_shrine_offerings_started: true });
    for (const n of [1, 2, 3]) {
      await run(`q_shrine_offerings_shrine_${n}`);
      await run(`q_shrine_offerings_shrine_${n}`);
      expect(state.flags[`shrine_${n}_offered`]).toBe(true);
      if (n < 3) {
        await run("q_shrine_offerings");
        expect(state.flags.quest_shrine_offerings_done).not.toBe(true);
      }
    }
    await run("ch5_shrine_keeper");
    expect(state.flags.quest_shrine_offerings_done).toBe(true);
    await run("ch5_shrine_keeper");
    expect(state.bag.rain_jar).toBe(2);
    expect(state.money).toBe(money + 1500);
  });
});
