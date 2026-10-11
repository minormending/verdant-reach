import { describe, expect, it, vi } from "vitest";
import type { GameContext, MapId } from "../contracts";
import { createQuickened, healParty } from "../battle";
import { DATA } from "../data";
import { runScript, type ScriptHost } from "../overworld/script";
import { newGameState } from "../save";
import { WORLD } from "./index";

/** Run the real scripts and interpreter with immediate UI and battle results. */
function setup() {
  const state = newGameState({ world: WORLD });
  state.position.map = "glasshouse_city";
  state.flags.gc_arrival_seen = true;
  state.flags.ch4_grunt_seen = true;
  const ctx = {
    state, data: DATA, world: WORLD,
    ui: { say: vi.fn(async () => {}), yesNo: vi.fn(async () => true) },
    audio: { playMusic: vi.fn(), playSfx: vi.fn(), playJingle: vi.fn(async () => {}) },
  } as unknown as GameContext;
  const host: ScriptHost = {
    ctx,
    mapId: () => state.position.map,
    map: () => WORLD.maps[state.position.map],
    createQuickened, healParty,
    battle: vi.fn(async () => "won" as const),
    whiteout: vi.fn(async () => {}),
    warp: vi.fn(async () => {}),
    movePlayer: vi.fn(async () => {}),
    moveNpc: vi.fn(async () => {}),
    face: vi.fn(), setNpcVisible: vi.fn(),
    fade: vi.fn(async () => {}),
    shake: vi.fn(async () => {}),
    emote: vi.fn(async () => {}),
    wait: vi.fn(async () => {}),
    showSpecies: vi.fn(), hideSpecies: vi.fn(), restoreMusic: vi.fn(),
    nameEntry: vi.fn(async () => ""),
    endSlice: vi.fn(async () => {}),
    credits: vi.fn(async () => {}),
  };
  const talk = async (map: MapId, npc: string) => {
    state.position.map = map;
    const script = WORLD.maps[map].npcs.find((n) => n.id === npc)?.script;
    expect(script).toBeDefined();
    await runScript(host, script!);
  };
  const leaveConservatory = async () => {
    const exit = WORLD.maps.glasshouse_conservatory.warps[0];
    state.position.map = exit.to;
    await expect(runScript(host, WORLD.maps[exit.to].onEnter!)).rejects.toThrow("endSlice");
    expect(state.flags.ch4_done).toBe(true);
    expect(host.endSlice).toHaveBeenCalledOnce();
  };
  return { state, host, talk, leaveConservatory };
}

describe("FAN MAIL", () => {
  it("completes on FLORA's stage before the end card, rewarding only once", async () => {
    const { state, host, talk, leaveConservatory } = setup();
    state.flags.relay_listened = true;
    await talk("glasshouse_city", "fan");
    expect(state.flags.quest_fan_mail_started).toBe(true);
    expect(state.bag.fan_letter).toBe(1);
    expect(state.flags.beat_flora).toBeUndefined();

    await talk("glasshouse_conservatory", "flora");
    expect(state.flags.beat_flora).toBe(true);
    expect(state.marks).toContain("rose_mark");
    expect(state.bag.fan_letter).toBe(1);
    const money = state.money;
    await talk("glasshouse_conservatory", "flora");
    expect(state.flags.fan_letter_delivered).toBe(true);
    expect(state.flags.quest_fan_mail_done).toBe(true);
    expect(state.bag.fan_letter).toBeUndefined();
    expect(state.bag.signed_photo).toBe(1);
    expect(state.money).toBe(money + 1000);
    expect(state.flags.ch4_done).toBeUndefined();
    expect(host.endSlice).not.toHaveBeenCalled();
    expect(WORLD.quests!.fan_mail.steps.every((step) =>
      step.doneWhen.every((c) => (state.flags[c.flag] ?? false) === c.is))).toBe(true);

    await talk("glasshouse_conservatory", "flora");
    expect(state.money).toBe(money + 1000);
    expect(state.bag.signed_photo).toBe(1);
    await leaveConservatory();
    await talk("glasshouse_city", "fan");
    expect(state.money).toBe(money + 1000);
    expect(state.bag.signed_photo).toBe(1);
  });

  it("keeps the usual end card and allows starting the quest afterwards", async () => {
    const { state, talk, leaveConservatory } = setup();
    state.flags.relay_listened = true;
    await talk("glasshouse_conservatory", "flora");
    await leaveConservatory();
    expect(state.flags.quest_fan_mail_started).toBeUndefined();
    const money = state.money;
    await talk("glasshouse_city", "fan");
    await talk("glasshouse_conservatory", "flora");
    expect(state.flags.quest_fan_mail_done).toBe(true);
    expect(state.bag.signed_photo).toBe(1);
    expect(state.money).toBe(money + 1000);
  });

  it("leaves an accepted letter deliverable after skipping it before the end card", async () => {
    const { state, talk, leaveConservatory } = setup();
    state.flags.relay_listened = true;
    await talk("glasshouse_city", "fan");
    await talk("glasshouse_conservatory", "flora");
    await leaveConservatory();
    expect(state.bag.fan_letter).toBe(1);
    expect(state.flags.quest_fan_mail_done).toBeUndefined();
    await talk("glasshouse_conservatory", "flora");
    expect(state.flags.quest_fan_mail_done).toBe(true);
    expect(state.bag.signed_photo).toBe(1);
  });

  it("does not offer the letter before the RELAY or consume it after a loss", async () => {
    const { state, host, talk } = setup();
    await talk("glasshouse_city", "fan");
    expect(state.flags.quest_fan_mail_started).toBeUndefined();
    expect(state.bag.fan_letter).toBeUndefined();
    state.flags.relay_listened = true;
    await talk("glasshouse_city", "fan");
    host.battle = vi.fn(async () => "lost" as const);
    await expect(talk("glasshouse_conservatory", "flora")).rejects.toThrow("whiteout");
    expect(state.bag.fan_letter).toBe(1);
    expect(state.flags.quest_fan_mail_done).toBeUndefined();
    expect(state.flags.ch4_done).toBeUndefined();
    host.battle = vi.fn(async () => "won" as const);
    await talk("glasshouse_conservatory", "flora");
    await talk("glasshouse_conservatory", "flora");
    expect(state.flags.quest_fan_mail_done).toBe(true);
  });

  it("still pays the fan's pending reward in a save with the letter already delivered", async () => {
    const { state, talk } = setup();
    Object.assign(state.flags, {
      relay_listened: true, beat_flora: true, ch4_done: true,
      quest_fan_mail_started: true, fan_letter_delivered: true,
    });
    state.bag.signed_photo = 1;
    const money = state.money;
    await talk("glasshouse_city", "fan");
    expect(state.flags.quest_fan_mail_done).toBe(true);
    expect(state.money).toBe(money + 1000);
    await talk("glasshouse_city", "fan");
    await talk("glasshouse_conservatory", "flora");
    expect(state.money).toBe(money + 1000);
    expect(state.bag.signed_photo).toBe(1);
  });
});
