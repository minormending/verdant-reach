// Council progression and the ending through the real script interpreter.
import { describe, expect, it, vi } from "vitest";
import type { BattleOutcome, Dir, GameContext, MapId } from "../../contracts";
import { createQuickened, healParty } from "../../battle/logic/stats";
import { DATA } from "../../data";
import { newGameState } from "../../save";
import { runScript, ScriptAbort, type ScriptHost } from "../../overworld/script";
import { buildMap, isWalkable, refreshLegend } from "../../overworld/map";
import { WORLD } from "../index";
import { eachCmd, grid, walkable } from "../validate";
import { ch11Scripts, COUNCIL_RUN_FLAGS } from "./ch11";

const TRAINERS = ["belladonna", "mimi_osa", "titus_arum", "pyra", "rowan"];
const ROOMS = ["council_1", "council_2", "council_3", "council_4", "keeper_hall"] as const;
const WINS = ["beat_council_1", "beat_council_2", "beat_council_3", "beat_council_4", "beat_keeper"];

function setup() {
  let map: MapId = "council_arboretum";
  let faded = false;
  let pendingEnter: string | undefined;
  const state = newGameState({ world: WORLD });
  state.flags = { ch10_done: true, prologue_done: true, morning_done: true };
  state.party = [
    createQuickened(DATA, "great_oak", 66, () => 0.5),
    createQuickened(DATA, "sacred_lotus", 64, () => 0.5),
  ];
  state.party[0].nickname = "ACORN";
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
    healParty: vi.fn(healParty),
    battle: vi.fn(async (req): Promise<BattleOutcome> => {
      events.push(`battle:${req.trainer}`);
      return "won";
    }),
    // Match the engine's recovery order: capture the losing map's hook,
    // recover at the last heal point, then run the hook on the new map.
    whiteout: vi.fn(async () => {
      const hook = WORLD.maps[map].onWhiteout;
      healParty(state.party, DATA);
      await host.warp(state.heal.map, state.heal.x, state.heal.y, "up");
      if (hook) await runScript(host, hook);
    }),
    warp: vi.fn(async (to: MapId, x: number, y: number, facing?: Dir) => {
      map = to;
      state.position = { map, x, y, facing: facing ?? "up" };
      events.push(`warp:${to}`);
      const onEnter = WORLD.maps[to].onEnter;
      if (faded) pendingEnter = onEnter;
      else if (onEnter) await runScript(host, onEnter);
    }),
    fade: vi.fn(async (to) => {
      faded = to !== "clear";
      if (!faded && pendingEnter) {
        const script = pendingEnter;
        pendingEnter = undefined;
        await runScript(host, script);
      }
    }),
    credits: vi.fn(async () => {
      events.push("credits");
      expect(state.hallOfFame).toHaveLength(vi.mocked(host.credits).mock.calls.length);
      expect(state.position.map).toBe("fellowship_hall");
    }),
    movePlayer: vi.fn(async () => {}), moveNpc: vi.fn(async () => {}),
    face: vi.fn(), setNpcVisible: vi.fn(),
    shake: vi.fn(async () => {}), emote: vi.fn(async () => {}), wait: vi.fn(async () => {}),
    showSpecies: vi.fn(), hideSpecies: vi.fn(), restoreMusic: vi.fn(), nameEntry: vi.fn(async () => ""),
    endSlice: vi.fn(async () => {}),
  };
  const run = async (id: string) => {
    try { await runScript(host, id); }
    catch (error) { if (!(error instanceof ScriptAbort)) throw error; }
  };
  const enter = (id: MapId) => host.warp(id, id === "keeper_hall" ? 6 : 5, id === "keeper_hall" ? 14 : 10, "up");
  const clearRun = async () => {
    await enter("council_1");
    for (const [i, trainer] of TRAINERS.entries()) {
      if (i > 0) await enter(ROOMS[i]);
      await run(trainer);
    }
    await host.warp("fellowship_hall", 4, 6, "up");
  };
  return { state, host, events, run, enter, clearRun };
}

describe("Chapter 11 scripts", () => {
  it("wires TODO dialogue and uses the existing credits and recovery ops", () => {
    for (const [id, cmds] of Object.entries(ch11Scripts)) {
      expect(WORLD.scripts[id]).toEqual(cmds);
      eachCmd(cmds, (c) => {
        expect(c.op).not.toBe("endSlice");
        if (c.op === "say") {
          expect(c.text).toMatch(/^TODO\(text\): /);
          expect(c.speaker).toBeTruthy();
          expect(c.speaker).toBe(c.speaker?.toUpperCase());
        }
        if (c.op === "warp") expect(walkable(grid(WORLD.maps[c.to]), c.x, c.y)).toBe(true);
      });
    }
    expect(WORLD.maps.fellowship_hall.onEnter).toBe("ch11_ending");
  });

  it("runs all four seats then the Keeper, opening each door only on victory", async () => {
    const { state, host, run, enter } = setup();
    await run("ch11_hall_door");
    expect(state.position.map).toBe("council_hall");
    await run("ch11_heal");
    expect(state.heal).toEqual({ map: "council_hall", x: 2, y: 4 });
    await enter("council_1");
    expect(state.flags.council_run).toBe(true);
    for (const [i, trainer] of TRAINERS.entries()) {
      if (i > 0) await enter(ROOMS[i]);
      const room = buildMap(WORLD.maps[ROOMS[i]]);
      const exit = WORLD.maps[ROOMS[i]].warps[0];
      refreshLegend(room, state.flags);
      expect(isWalkable(room, exit.x, exit.y)).toBe(false);
      await run(trainer);
      expect(state.flags[WINS[i]]).toBe(true);
      expect(state.flags[`beat_${trainer}`]).toBe(true);
      refreshLegend(room, state.flags);
      expect(isWalkable(room, exit.x, exit.y)).toBe(true);
      await run(trainer);
      await run(`${trainer}_after`);
      expect(host.battle).toHaveBeenCalledTimes(i + 1);
      for (const win of WINS.slice(i + 1)) expect(state.flags[win]).not.toBe(true);
    }
    expect(vi.mocked(host.battle).mock.calls.map(([req]) => req.trainer)).toEqual(TRAINERS);
    expect(host.healParty).toHaveBeenCalledOnce(); // lobby only, never between seats
    expect(host.credits).not.toHaveBeenCalled();
    expect(state.flags.game_cleared).not.toBe(true);
  });

  it("refuses seats, after scripts and the ending out of order", async () => {
    const { state, host, run, enter } = setup();
    for (const id of [...TRAINERS, ...TRAINERS.map((t) => `${t}_after`), "ch11_ending"]) await run(id);
    expect(host.battle).not.toHaveBeenCalled();
    await enter("council_1");
    for (const id of [...TRAINERS.slice(1), ...TRAINERS.map((t) => `${t}_after`), "ch11_ending"]) await run(id);
    expect(host.battle).not.toHaveBeenCalled();
    for (const win of WINS) expect(state.flags[win]).toBe(false);
    expect(state.hallOfFame ?? []).toEqual([]);
    expect(host.credits).not.toHaveBeenCalled();
    await run("belladonna");
    await run("titus_arum");
    await run("pyra");
    await run("rowan");
    expect(host.battle).toHaveBeenCalledOnce();
  });

  it.each(TRAINERS)("a loss to %s resets the run, requiring every seat again", async (loser) => {
    const { state, host, run, enter } = setup();
    await enter("council_1");
    const index = TRAINERS.indexOf(loser);
    for (let i = 0; i < index; i++) {
      if (i > 0) await enter(ROOMS[i]);
      await run(TRAINERS[i]);
    }
    if (index > 0) await enter(ROOMS[index]);
    vi.mocked(host.battle).mockResolvedValueOnce("lost");
    state.party[0].hp = 0;
    await run(loser);
    expect(host.whiteout).toHaveBeenCalledOnce();
    expect(state.position).toEqual({ map: "council_hall", x: 2, y: 4, facing: "up" });
    for (const flag of COUNCIL_RUN_FLAGS) expect(state.flags[flag], flag).toBe(false);
    expect(state.flags.ch10_done).toBe(true);
    expect(state.party[0].hp).toBe(state.party[0].stats.hp);
    await run(`${loser}_after`);
    expect(state.flags[WINS[index]]).toBe(false);
    expect(state.hallOfFame ?? []).toEqual([]);
    expect(host.credits).not.toHaveBeenCalled();
    await enter("council_1");
    await run("rowan");
    expect(host.battle).toHaveBeenCalledTimes(index + 1);
    await run("belladonna");
    expect(host.battle).toHaveBeenCalledTimes(index + 2);
    expect(state.flags.beat_council_1).toBe(true);
  });

  it("reconciles the Vales, grants fellowship, records the team, rolls credits and wakes once", async () => {
    const { state, host, events, run, clearRun } = setup();
    await clearRun();
    expect(state.flags).toMatchObject({ beat_keeper: true, game_cleared: true, council_run: false });
    expect(state.position).toEqual({ map: "player_home", x: 2, y: 2, facing: "down" });
    expect(state.heal.map).toBe("player_home");
    expect(state.hallOfFame).toEqual([[
      { species: "great_oak", level: 66, nickname: "ACORN" },
      { species: "sacred_lotus", level: 64 },
    ]]);
    expect(host.setNpcVisible).toHaveBeenCalledWith("imogen", true);
    const texts = vi.mocked(host.ctx.ui.say).mock.calls.map(([text]) => text);
    const reconcile = texts.findIndex((t) => t.includes("ROWAN and IMOGEN reconcile"));
    const fellowship = texts.findIndex((t) => t.includes("Fellow of the Herbarium"));
    const record = texts.findIndex((t) => t.includes("record of a new world"));
    expect(reconcile).toBeGreaterThan(-1);
    expect(fellowship).toBeGreaterThan(reconcile);
    expect(record).toBeGreaterThan(fellowship);
    expect(events.slice(-3)).toEqual(["warp:fellowship_hall", "credits", "warp:player_home"]);
    const boxes = texts.length;
    for (const script of ["rowan", "rowan_after", "ch11_ending", "ch11_ending"]) await run(script);
    // An old fellowship map entry must not roll the credits or append again.
    await host.warp("fellowship_hall", 4, 6, "up");
    expect(host.credits).toHaveBeenCalledOnce();
    expect(state.hallOfFame).toHaveLength(1);
    expect(vi.mocked(host.ctx.ui.say).mock.calls.slice(boxes).map(([text]) => text))
      .not.toContain(expect.stringContaining("Fellow of the Herbarium"));
    expect(host.endSlice).not.toHaveBeenCalled();
  });

  it("waits for credits before setting game_cleared and waking at home", async () => {
    const { state, host, enter, run } = setup();
    await enter("council_1");
    for (const [i, trainer] of TRAINERS.entries()) {
      if (i > 0) await enter(ROOMS[i]);
      await run(trainer);
    }
    let finish!: () => void;
    let started!: () => void;
    const creditsStarted = new Promise<void>((resolve) => { started = resolve; });
    host.credits = vi.fn(() => {
      started();
      return new Promise<void>((resolve) => { finish = resolve; });
    });
    const ending = host.warp("fellowship_hall", 4, 6, "up");
    await creditsStarted;
    expect(state.flags.game_cleared).not.toBe(true);
    expect(state.position.map).toBe("fellowship_hall");
    expect(state.hallOfFame).toHaveLength(1);
    finish();
    await ending;
    expect(state.flags.game_cleared).toBe(true);
    expect(state.position.map).toBe("player_home");
  });

  it("routes subsequent clears to rematches without credits or reconciliation", async () => {
    const { state, host, run, clearRun } = setup();
    await clearRun();
    state.party[0].level = 67;
    await clearRun();
    await run("ch11_ending");
    await run("rowan_after");
    expect(host.credits).toHaveBeenCalledOnce();
    expect(state.hallOfFame).toHaveLength(2);
    expect(state.hallOfFame?.map((team) => team[0].level)).toEqual([66, 67]);
    expect(host.battle).toHaveBeenCalledTimes(10);
    expect(vi.mocked(host.battle).mock.calls.slice(5).map(([req]) => req.trainer)).toEqual(TRAINERS.map((id) => `${id}_rematch`));
    expect(state.bag.rain_jar).toBe(3);
    expect(vi.mocked(host.ctx.ui.say).mock.calls.filter(([t]) => t.includes("ROWAN and IMOGEN reconcile"))).toHaveLength(1);
    expect(state.flags.game_cleared).toBe(true);
    expect(state.flags.council_run).toBe(false);
    expect(state.position.map).toBe("fellowship_hall");
  });
});
