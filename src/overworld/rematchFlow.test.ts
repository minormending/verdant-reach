import { afterEach, describe, expect, it, vi } from "vitest";
import type { BattleOutcome, BattleRequest, GameContext, Scene } from "../contracts";
import { createQuickened } from "../battle";
import { DATA } from "../data";
import { Fader, Timers } from "../engine/gfx";
import { newGameState } from "../save";
import { WORLD } from "../world";
import { createOverworldScene } from "./index";

interface Npc { id: string; x: number; y: number; def?: { trainer?: string } }
type Ow = Scene & {
  npcs: Npc[]; player: { x: number; y: number; facing: string };
  trainerTalk(npc: Npc, id: string): Promise<void>;
  checkTrainers(): boolean;
  whiteout(): Promise<void>;
  transition: { run(kind: string): Promise<void> };
};

const MILO = WORLD.trainers.schoolkid_milo;

function setup(map: "route_1" | "bramblegate_conservatory", outcome: BattleOutcome = "won", answer = true) {
  const state = newGameState({ world: WORLD });
  state.party = [createQuickened(DATA, "great_oak", 60, () => 0.5)];
  state.position = { map, x: 2, y: 2, facing: "down" };
  state.flags = { beat_schoolkid_milo: true, beat_jr_hazel: true };
  const said: string[] = [];
  const asked: string[] = [];
  const battles: BattleRequest[] = [];
  const ctx = {
    world: WORLD, state, data: DATA, rng: () => 0.5, timeOfDay: () => "day",
    assets: { exists: () => false, has: () => false, image: () => undefined },
    audio: { stopMusic: vi.fn(), playMusic: vi.fn(), playSfx: vi.fn(), current: () => null },
    ui: {
      say: vi.fn(async (text: string) => { said.push(text); }),
      yesNo: vi.fn(async (prompt: string) => { asked.push(prompt); return answer; }),
    },
    battle: vi.fn(async (req: BattleRequest) => { battles.push(req); return outcome; }),
  } as unknown as GameContext;
  vi.spyOn(Fader.prototype, "to").mockResolvedValue(undefined);
  vi.spyOn(Timers.prototype, "frames").mockResolvedValue(undefined);
  const scene = createOverworldScene(ctx, { mode: "none" }) as Ow;
  const whiteout = vi.spyOn(scene, "whiteout").mockResolvedValue(undefined);
  vi.spyOn(scene.transition, "run").mockResolvedValue(undefined);
  const npc = (trainer: string) => scene.npcs.find((n) => n.def?.trainer === trainer)!;
  return { ctx, scene, state, said, asked, battles, whiteout, npc };
}

afterEach(() => vi.restoreAllMocks());

describe("route rematch talk flow", () => {
  it("says the after line, asks, and battles a fresh team at +1, then +2 after a win", async () => {
    const h = setup("route_1");
    await h.scene.trainerTalk(h.npc("schoolkid_milo"), "schoolkid_milo");
    expect(h.said).toEqual([MILO.after]);
    expect(h.asked).toEqual(["MILO: Up for a rematch? We've been growing!"]);
    expect(h.battles).toHaveLength(1);
    const req = h.battles[0];
    expect(req).toMatchObject({ kind: "trainer", trainer: "schoolkid_milo" });
    expect(req.trainerDef!.team.map((m) => m.level)).toEqual(MILO.team.map((m) => m.level + 1));
    expect(req.trainerDef!.prize).toBe(0);
    expect(req.trainerDef).not.toBe(MILO);
    expect(h.state.trainerRematches).toEqual({ schoolkid_milo: 1 });
    await h.scene.trainerTalk(h.npc("schoolkid_milo"), "schoolkid_milo");
    expect(h.battles[1].trainerDef!.team.map((m) => m.level)).toEqual(MILO.team.map((m) => m.level + 2));
    expect(h.state.trainerRematches).toEqual({ schoolkid_milo: 2 });
    expect(MILO.team).toEqual(WORLD.trainers.schoolkid_milo.team);
    expect(MILO.team[0].level).toBe(4);
    expect(h.whiteout).not.toHaveBeenCalled();
  });

  it("a lost rematch whites out and keeps the count, so the retry is at the same level", async () => {
    const h = setup("route_1", "lost");
    h.state.trainerRematches = { schoolkid_milo: 3 };
    await h.scene.trainerTalk(h.npc("schoolkid_milo"), "schoolkid_milo");
    expect(h.battles[0].trainerDef!.team.map((m) => m.level)).toEqual(MILO.team.map((m) => m.level + 4));
    expect(h.whiteout).toHaveBeenCalledOnce();
    expect(h.state.trainerRematches).toEqual({ schoolkid_milo: 3 });
    await h.scene.trainerTalk(h.npc("schoolkid_milo"), "schoolkid_milo");
    expect(h.battles[1].trainerDef!.team.map((m) => m.level)).toEqual(MILO.team.map((m) => m.level + 4));
  });

  it("NO does nothing", async () => {
    const h = setup("route_1", "won", false);
    await h.scene.trainerTalk(h.npc("schoolkid_milo"), "schoolkid_milo");
    expect(h.said).toEqual([MILO.after]);
    expect(h.asked).toHaveLength(1);
    expect(h.battles).toHaveLength(0);
    expect(h.state.trainerRematches).toBeUndefined();
  });

  it("indoor trainers keep today's behaviour: the after line only", async () => {
    const h = setup("bramblegate_conservatory");
    await h.scene.trainerTalk(h.npc("jr_hazel"), "jr_hazel");
    expect(h.said).toEqual([WORLD.trainers.jr_hazel.after]);
    expect(h.asked).toHaveLength(0);
    expect(h.battles).toHaveLength(0);
  });

  it("sight never re-triggers a beaten trainer", () => {
    const h = setup("route_1");
    const milo = h.npc("schoolkid_milo");
    Object.assign(h.scene.player, { x: milo.x - 2, y: milo.y });
    expect(h.scene.checkTrainers()).toBe(false);
    expect(h.battles).toHaveLength(0);
    h.state.flags.beat_schoolkid_milo = false; // control: unbeaten, the same spot is seen
    expect(h.scene.checkTrainers()).toBe(true);
  });
});
