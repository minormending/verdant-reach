// POSTGAME.md §1 through the real interpreter, including existing map hooks.
import { describe, expect, it, vi } from "vitest";
import type { BattleOutcome, Dir, GameContext, MapId, TimeOfDay } from "../../contracts";
import { createQuickened, healParty } from "../../battle/logic/stats";
import { DATA } from "../../data";
import { newGameState } from "../../save";
import { runScript, ScriptAbort, type ScriptHost } from "../../overworld/script";
import { buildMap, isWalkable, refreshLegend } from "../../overworld/map";
import { WORLD } from "../index";
import { eachCmd } from "../validate";
import { COUNCIL_RUN_FLAGS } from "./ch11";
import { postgameScripts } from "./postgame";

const TRAINERS = ["belladonna", "mimi_osa", "titus_arum", "pyra", "rowan"];
const ROOMS = ["council_1", "council_2", "council_3", "council_4", "keeper_hall"] as const;
const WINS = ["beat_council_1", "beat_council_2", "beat_council_3", "beat_council_4", "beat_keeper"];
function setup(time: TimeOfDay = "day") {
  const state = newGameState({ world: WORLD });
  let map: MapId = "council_hall";
  state.position = { map, x: 2, y: 4, facing: "up" };
  state.heal = { map, x: 2, y: 4 };
  state.flags = { game_cleared: true, ch10_done: true };
  state.party = [createQuickened(DATA, "great_oak", 74, () => 0.5)];
  const ctx = {
    state, data: DATA, world: WORLD, rng: () => 0.5, timeOfDay: vi.fn(() => time),
    ui: { say: vi.fn(async () => {}), yesNo: vi.fn(async () => false), choose: vi.fn(async () => 0) },
    audio: { playMusic: vi.fn(), stopMusic: vi.fn(), current: () => null, playSfx: vi.fn(),
      playJingle: vi.fn(async () => {}), playCry: vi.fn(async () => {}) },
  } as unknown as GameContext;
  const host: ScriptHost = {
    ctx, mapId: () => map, map: () => WORLD.maps[map], createQuickened, healParty: vi.fn(healParty),
    // Prize money is paid by battle/scene.ts, not the script interpreter.
    battle: vi.fn(async (req): Promise<BattleOutcome> => {
      if (req.trainer) state.money += WORLD.trainers[req.trainer].prize;
      return "won";
    }),
    whiteout: vi.fn(async () => {
      const hook = WORLD.maps[map].onWhiteout;
      healParty(state.party, DATA);
      await host.warp(state.heal.map, state.heal.x, state.heal.y, "up");
      if (hook) await runScript(host, hook);
    }),
    warp: vi.fn(async (to: MapId, x: number, y: number, facing?: Dir) => {
      map = to;
      state.position = { map, x, y, facing: facing ?? "up" };
      if (WORLD.maps[map].onEnter) await runScript(host, WORLD.maps[map].onEnter!);
    }),
    face: vi.fn(), setNpcVisible: vi.fn(), movePlayer: vi.fn(async () => {}), moveNpc: vi.fn(async () => {}),
    fade: vi.fn(async () => {}), shake: vi.fn(async () => {}), emote: vi.fn(async () => {}), wait: vi.fn(async () => {}),
    showSpecies: vi.fn(), hideSpecies: vi.fn(), restoreMusic: vi.fn(), nameEntry: vi.fn(async () => ""),
    credits: vi.fn(async () => {}), endSlice: vi.fn(async () => {}),
  };
  const run = async (id: string) => {
    try { await runScript(host, id); }
    catch (error) { if (!(error instanceof ScriptAbort)) throw error; }
  };
  const enter = (id: MapId) => host.warp(id, id === "keeper_hall" ? 6 : 5, id === "keeper_hall" ? 14 : 10, "up");
  const clearRun = async () => {
    await enter("council_1");
    for (const [i, trainer] of TRAINERS.entries()) {
      if (i) await enter(ROOMS[i]);
      await run(trainer); // actual NPC hook selects the rematch
    }
    await host.warp("fellowship_hall", 4, 6, "up");
  };
  return { state, host, run, enter, clearRun };
}

describe("post-game story events", () => {
  it("registers every script with TODO dialogue and existing operations", () => {
    for (const [id, cmds] of Object.entries(postgameScripts)) {
      expect(WORLD.scripts[id]).toEqual(cmds);
      eachCmd(cmds, (cmd) => {
        if (cmd.op === "say") expect(cmd.text).toMatch(/^TODO\(text\): /);
        expect(cmd.op).not.toBe("credits");
        expect(cmd.op).not.toBe("endSlice");
      });
    }
  });

  it("does nothing before game_cleared, even with diary and trainer flags", async () => {
    const { state, host, run } = setup("night");
    Object.assign(state.flags, { game_cleared: false, diary_read: true, council_run: true, council_rematch: true,
      ...Object.fromEntries(WINS.map((f) => [f, true])) });
    state.bag.old_diary = 1;
    const before = structuredClone(state);
    for (const id of ["pg_centuryheart", "pg_wanderers", "pg_diary", "pg_methuselah", "pg_council_rematch", "pg_rematch_ending",
      ...TRAINERS.flatMap((id) => [`${id}_rematch`, `${id}_rematch_after`])]) await run(id);
    expect(state).toEqual(before);
    expect(host.battle).not.toHaveBeenCalled();
    expect(host.ctx.ui.say).not.toHaveBeenCalled();
  });

  it.each([false, true])("gives exactly one level-30 Centuryheart (full party: %s)", async (full) => {
    const { state, host, run, enter } = setup();
    if (full) state.party = Array.from({ length: 6 }, () => createQuickened(DATA, "great_oak", 74, () => 0.5));
    await enter("elder_grove_heart");
    await run("pg_centuryheart");
    const gift = [...state.party, ...state.box].filter((q) => q.species === "centuryheart");
    expect(gift).toHaveLength(1);
    expect(gift[0]).toMatchObject({ level: 30, metAt: { map: "elder_grove_heart", level: 30 } });
    expect(state.flags.got_centuryheart).toBe(true);
    expect(state.herbarium.caught).toContain("centuryheart");
    expect(host.setNpcVisible).toHaveBeenCalledWith("centuryheart_sprout", false);
    const before = structuredClone(state);
    await run("pg_centuryheart");
    expect(state).toEqual(before);
    expect(host.setNpcVisible).toHaveBeenCalledOnce();
  });

  it("releases all wanderers once through Council Hall's ROWAN hook", async () => {
    const { state, host, run } = setup();
    const hook = WORLD.maps.council_hall.npcs.find((n) => n.id === "rowan")!.script!;
    await run(hook);
    expect(state.flags.wanderers_free).toBe(true);
    const before = structuredClone(state);
    await run(hook);
    expect(state).toEqual(before);
    expect(vi.mocked(host.ctx.ui.say).mock.calls.filter(([text]) => text.includes("are free to wander"))).toHaveLength(1);
  });

  it("requires the diary, consumes it once, and unlocks the Ridge through Fennimore's hook", async () => {
    const { state, host, run, enter } = setup();
    await enter("fennimore_house");
    const hook = WORLD.maps.fennimore_house.npcs.find((n) => n.id === "fennimore")!.script!;
    await run(hook);
    expect(state.flags.diary_read).not.toBe(true);
    const entrance = buildMap(WORLD.maps.seed_vault_entrance);
    const ridgeExit = WORLD.maps.seed_vault_entrance.warps.find((w) => w.to === "methuselah_ridge")!;
    refreshLegend(entrance, state.flags);
    expect(isWalkable(entrance, ridgeExit.x, ridgeExit.y)).toBe(false);
    state.bag.old_diary = 2;
    await run(hook);
    expect(state.flags.diary_read).toBe(true);
    expect(state.bag.old_diary).toBe(1);
    refreshLegend(entrance, state.flags);
    expect(isWalkable(entrance, ridgeExit.x, ridgeExit.y)).toBe(true);
    await run(hook);
    expect(state.bag.old_diary).toBe(1);
    expect(vi.mocked(host.ctx.ui.say).mock.calls.filter(([text]) => text.includes("song of the last Quickening"))).toHaveLength(1);
    expect(vi.mocked(host.ctx.ui.say).mock.calls.at(-1)?.[0]).toContain("at night");
  });

  it.each(["morning", "day"] as const)("shows only the old-tree line during %s", async (time) => {
    const { state, host, run, enter } = setup(time);
    state.flags.diary_read = true;
    await enter("methuselah_ridge");
    await run("pg_methuselah");
    expect(host.battle).not.toHaveBeenCalled();
    expect(host.ctx.ui.say).toHaveBeenCalledWith("TODO(text): It's only an old tree.", undefined);
  });

  it("requires diary_read for the night battle", async () => {
    const { host, run, enter } = setup("night");
    await enter("methuselah_ridge");
    await run("pg_methuselah");
    expect(host.battle).not.toHaveBeenCalled();
    expect(host.ctx.ui.say).not.toHaveBeenCalled();
  });

  it.each(["won", "caught", "fled", "lost"] as const)("Methuselah is repeatable after %s at night without whiteout", async (outcome) => {
    const { state, host, run, enter } = setup("night");
    state.flags.diary_read = true;
    await enter("methuselah_ridge");
    const before = structuredClone(state);
    vi.mocked(host.battle).mockResolvedValue(outcome);
    await run("pg_methuselah");
    await run("pg_methuselah");
    expect(host.battle).toHaveBeenCalledTimes(2);
    expect(host.battle).toHaveBeenLastCalledWith(expect.objectContaining({
      kind: "wild", wild: { species: "methuselah", level: 70, sport: undefined }, canLose: true,
    }));
    expect(state).toEqual(before);
    expect(host.whiteout).not.toHaveBeenCalled();
  });
});

describe("Council rematch run", () => {
  it("starts fresh from the actual entry hook, closes the return door, and cannot reset an active run", async () => {
    const { state, run, enter } = setup();
    Object.assign(state.flags, Object.fromEntries(COUNCIL_RUN_FLAGS.map((f) => [f, true])), { council_run: false });
    await enter("council_1");
    expect(state.flags.council_run).toBe(true);
    expect(state.flags.council_rematch).toBe(true);
    for (const f of COUNCIL_RUN_FLAGS.filter((f) => !["council_run", "council_rematch"].includes(f))) expect(state.flags[f], f).toBe(false);
    const first = buildMap(WORLD.maps.council_1);
    refreshLegend(first, state.flags);
    expect(isWalkable(first, 5, 11)).toBe(false);
    await run("belladonna");
    await run("pg_council_rematch");
    await enter("council_1");
    expect(state.flags.beat_council_1).toBe(true);
  });

  it("refuses out-of-order fights, stale after hooks, and a premature ending", async () => {
    const { state, host, run, enter } = setup();
    for (const id of [...TRAINERS, ...TRAINERS.map((id) => `${id}_rematch_after`), "ch11_ending"]) await run(id);
    await enter("council_1");
    for (const id of [...TRAINERS.slice(1), ...TRAINERS.map((id) => `${id}_rematch_after`), "ch11_ending"]) await run(id);
    expect(host.battle).not.toHaveBeenCalled();
    expect(state.hallOfFame ?? []).toEqual([]);
    expect(state.bag.rain_jar).toBeUndefined();
    for (const win of WINS) expect(state.flags[win]).toBe(false);
  });

  it("uses all five +8 trainers, preserves room gates and pays the Keeper's rewards once", async () => {
    const { state, host, run, enter } = setup();
    await enter("council_1");
    state.party[0].hp = 1;
    for (const [i, id] of TRAINERS.entries()) {
      if (i) await enter(ROOMS[i]);
      const room = buildMap(WORLD.maps[ROOMS[i]]), exit = WORLD.maps[ROOMS[i]].warps[0];
      refreshLegend(room, state.flags);
      expect(isWalkable(room, exit.x, exit.y)).toBe(false);
      const money = state.money;
      await run(id);
      expect(state.flags[WINS[i]]).toBe(true);
      expect(state.flags[`beat_${id}_rematch`]).toBe(true);
      if (id === "rowan") {
        expect(state.money - money).toBe(5000);
        expect(state.bag.rain_jar).toBe(3);
      }
      refreshLegend(room, state.flags);
      expect(isWalkable(room, exit.x, exit.y)).toBe(true);
      const before = structuredClone(state);
      await run(id);
      await run(`${id}_after`);
      await run(`${id}_rematch_after`);
      expect(state).toEqual(before);
      expect(host.battle).toHaveBeenCalledTimes(i + 1);
    }
    expect(vi.mocked(host.battle).mock.calls.map(([req]) => req.trainer)).toEqual(TRAINERS.map((id) => `${id}_rematch`));
    expect(state.party[0].hp).toBe(1);
    expect(host.healParty).not.toHaveBeenCalled();
    await host.warp("fellowship_hall", 4, 6, "up");
    expect(state.flags).toMatchObject({ game_cleared: true, council_run: false, council_rematch: false });
    expect(state.hallOfFame).toHaveLength(1);
    await run("ch11_ending");
    await run("rowan_after");
    await host.warp("fellowship_hall", 4, 6, "up");
    expect(state.bag.rain_jar).toBe(3);
    expect(state.hallOfFame).toHaveLength(1);
    expect(state.position.map).toBe("fellowship_hall");
    expect(host.credits).not.toHaveBeenCalled();
    expect(host.endSlice).not.toHaveBeenCalled();
  });

  it.each(TRAINERS)("a rematch loss to %s whites out to the lobby and resets every seat", async (loser) => {
    const { state, host, run, enter } = setup();
    await enter("council_1");
    const index = TRAINERS.indexOf(loser);
    for (let i = 0; i < index; i++) {
      if (i) await enter(ROOMS[i]);
      await run(TRAINERS[i]);
    }
    await enter(ROOMS[index]);
    vi.mocked(host.battle).mockResolvedValueOnce("lost");
    await run(loser);
    expect(host.whiteout).toHaveBeenCalledOnce();
    expect(state.position).toEqual({ map: "council_hall", x: 2, y: 4, facing: "up" });
    for (const f of COUNCIL_RUN_FLAGS) expect(state.flags[f], f).toBe(false);
    expect(state.flags.game_cleared).toBe(true);
    expect(state.bag.rain_jar).toBeUndefined();
    await run(`${loser}_after`);
    await run("ch11_ending");
    expect(state.hallOfFame ?? []).toEqual([]);
    await enter("council_1");
    await run("rowan");
    expect(host.battle).toHaveBeenCalledTimes(index + 1);
    await run("belladonna");
    expect(host.battle).toHaveBeenCalledTimes(index + 2);
    expect(host.credits).not.toHaveBeenCalled();
  });

  it("allows a fresh full run to award three further jars without replaying credits", async () => {
    const { state, host, clearRun } = setup();
    await clearRun();
    await clearRun();
    expect(state.bag.rain_jar).toBe(6);
    expect(state.hallOfFame).toHaveLength(2);
    expect(host.battle).toHaveBeenCalledTimes(10);
    expect(host.credits).not.toHaveBeenCalled();
    expect(host.healParty).not.toHaveBeenCalled();
  });
});
