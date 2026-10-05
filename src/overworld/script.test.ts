import { describe, expect, it, vi } from "vitest";
import type {
  BattleOutcome, GameContext, GameData, GameState, Quickened, ScriptCmd, SpeciesId, WorldData,
} from "../contracts";
import { newGameState } from "../save";
import { runScript, scriptsAwardMark, type ScriptHost } from "./script";

const world: WorldData = {
  maps: {
    herbarium: {
      id: "herbarium", name: "HERBARIUM", outdoor: false, music: "herbarium", tiles: ["."], legend: { ".": "floor_wood" },
      border: "void", structures: [], warps: [], npcs: [], signs: [], triggers: [], healPoint: { x: 3, y: 4 },
    },
  } as unknown as WorldData["maps"],
  scripts: {
    sub: [{ op: "setFlag", flag: "called" }],
  },
  trainers: {
    hollis: {
      id: "hollis", name: "HOLLIS", className: "WARDEN", portrait: "hollis", team: [], prize: 900,
      intro: "", defeat: "", after: "", ai: "smart", mark: "bramble_mark",
    },
  },
  newGame: { map: "herbarium", x: 1, y: 1, facing: "up", script: "intro" },
};

const data = {
  species: { oak_acorn: { name: "Oak Acorn" } },
  items: {
    terrarium_pod: { name: "Terrarium Pod", pocket: "pods" },
    field_herbarium: { name: "Field Herbarium", pocket: "key" },
  },
  moves: { tackle: { pp: 35 } },
} as unknown as GameData;

function makeQ(species: SpeciesId, level: number): Quickened {
  const z = { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 };
  return { uid: `${species}-${level}`, species, level, exp: 0, hp: 1, stats: z, ivs: z, evs: z, moves: [], status: null, friendship: 70, sport: false };
}

/** A fake context + host. UI answers are queued. */
function setup(opts: { choices?: number[]; yesNo?: boolean[]; battles?: BattleOutcome[]; names?: string[] } = {}) {
  const said: string[] = [];
  const choices = [...(opts.choices ?? [])];
  const yesNo = [...(opts.yesNo ?? [])];
  const battles = [...(opts.battles ?? [])];
  const names = [...(opts.names ?? [])];
  const jingles: string[] = [];
  const state: GameState = newGameState({ world });
  state.playerName = "ROWAN";
  const ctx = {
    state, data, world,
    rng: () => 0.5,
    timeOfDay: () => "night",
    audio: {
      playMusic: vi.fn(), stopMusic: vi.fn(), current: () => null, playSfx: vi.fn(),
      playJingle: async (id: string) => { jingles.push(id); }, playCry: async () => {}, unlock: () => {}, setVolume: () => {},
    },
    ui: {
      say: async (t: string) => { said.push(t.replace(/\{PLAYER\}/g, state.playerName)); },
      choose: async () => choices.shift() ?? 0,
      yesNo: async () => yesNo.shift() ?? true,
    },
    screens: { shop: vi.fn(async () => {}), cabinet: vi.fn(async () => {}) },
  } as unknown as GameContext;
  const host: ScriptHost = {
    ctx,
    mapId: () => "herbarium",
    map: () => world.maps.herbarium,
    createQuickened: (_d, s, l) => makeQ(s, l),
    healParty: (party) => party.forEach((q) => (q.hp = q.stats.hp)),
    battle: vi.fn(async () => battles.shift() ?? "won"),
    whiteout: vi.fn(async () => {}),
    warp: vi.fn(async () => {}),
    movePlayer: vi.fn(async () => {}),
    moveNpc: vi.fn(async () => {}),
    face: vi.fn(),
    setNpcVisible: vi.fn(),
    fade: vi.fn(async () => {}),
    shake: vi.fn(async () => {}),
    emote: vi.fn(async () => {}),
    wait: vi.fn(async () => {}),
    showSpecies: vi.fn(),
    hideSpecies: vi.fn(),
    restoreMusic: vi.fn(),
    nameEntry: vi.fn(async () => names.shift() ?? ""),
    endSlice: vi.fn(async () => {}),
  };
  return { ctx, host, state, said, jingles };
}

describe("script interpreter", () => {
  it("sets flags and branches with if / else", async () => {
    const { host, state, said } = setup();
    const script: ScriptCmd[] = [
      { op: "if", when: [{ flag: "met_vale", is: true }], then: [{ op: "say", text: "again" }], else: [{ op: "say", text: "first" }] },
      { op: "setFlag", flag: "met_vale" },
      { op: "if", when: [{ flag: "met_vale", is: true }], then: [{ op: "say", text: "again" }], else: [{ op: "say", text: "first" }] },
      { op: "setFlag", flag: "met_vale", value: false },
    ];
    await runScript(host, script);
    expect(said).toEqual(["first", "again"]);
    expect(state.flags.met_vale).toBe(false);
  });

  it("follows choice and yesno branches", async () => {
    const { host, said } = setup({ choices: [2], yesNo: [false] });
    await runScript(host, [
      { op: "choice", prompt: "Pick", options: ["A", "B", "C"], branches: [[{ op: "say", text: "a" }], [{ op: "say", text: "b" }], [{ op: "say", text: "c" }]] },
      { op: "yesno", prompt: "Sure?", yes: [{ op: "say", text: "yes" }], no: [{ op: "say", text: "no" }] },
    ]);
    expect(said).toEqual(["c", "no"]);
  });

  it("treats a cancelled choice as the last option", async () => {
    const { host, said } = setup({ choices: [-1] });
    await runScript(host, [{ op: "choice", options: ["A", "B"], branches: [[{ op: "say", text: "a" }], [{ op: "say", text: "b" }]] }]);
    expect(said).toEqual(["b"]);
  });

  it("branches on time of day", async () => {
    const { host, said } = setup();
    await runScript(host, [{ op: "ifTime", time: ["morning", "day"], then: [{ op: "say", text: "sun" }], else: [{ op: "say", text: "moon" }] }]);
    expect(said).toEqual(["moon"]);
  });

  it("gives and takes items with display names", async () => {
    const { host, state, said, jingles } = setup();
    await runScript(host, [
      { op: "giveItem", item: "terrarium_pod", qty: 5 },
      { op: "giveItem", item: "field_herbarium" },
      { op: "takeItem", item: "terrarium_pod", qty: 2 },
    ]);
    expect(state.bag).toEqual({ terrarium_pod: 3, field_herbarium: 1 });
    expect(said[0]).toBe("ROWAN received 5 TERRARIUM PODS!");
    expect(said[1]).toBe("ROWAN put the TERRARIUM PODS in the POD POCKET.");
    expect(said[2]).toBe("ROWAN received FIELD HERBARIUM!");
    expect(said[3]).toContain("KEY POCKET");
    expect(jingles).toEqual(["item_get", "item_get"]);
    await runScript(host, [{ op: "takeItem", item: "field_herbarium" }]);
    expect(state.bag.field_herbarium).toBeUndefined();
  });

  it("gives a species to the party (with nickname), then to the box when full", async () => {
    const { host, state, said, jingles } = setup({ yesNo: [true, false], names: ["Acorny"] });
    await runScript(host, [{ op: "giveSpecies", species: "oak_acorn", level: 5, moves: ["tackle"] }]);
    expect(state.party).toHaveLength(1);
    expect(state.party[0].nickname).toBe("Acorny");
    expect(state.party[0].moves).toEqual([{ id: "tackle", pp: 35 }]);
    expect(state.party[0].metAt).toEqual({ map: "herbarium", level: 5 });
    expect(state.herbarium.seen).toContain("oak_acorn");
    expect(state.herbarium.caught).toContain("oak_acorn");
    expect(said[0]).toBe("ROWAN received OAK ACORN!");
    expect(jingles).toContain("caught");

    for (let i = 0; i < 5; i++) state.party.push(makeQ("oak_acorn", 2));
    await runScript(host, [{ op: "giveSpecies", species: "oak_acorn", level: 5 }]);
    expect(state.party).toHaveLength(6);
    expect(state.box).toHaveLength(1);
    expect(said[said.length - 1]).toContain("SPECIMEN CABINET");
  });

  it("records battle results for ifLastBattle and sets beat_ flags", async () => {
    const { host, state, said } = setup({ battles: ["lost", "won"] });
    await runScript(host, [
      { op: "battle", trainer: "rival_1", canLose: true },
      { op: "ifLastBattle", result: "won", then: [{ op: "say", text: "w" }], else: [{ op: "say", text: "l" }] },
      { op: "battle", trainer: "hollis" },
      { op: "ifLastBattle", result: "won", then: [{ op: "say", text: "w" }], else: [{ op: "say", text: "l" }] },
    ]);
    expect(said.slice(0, 1)).toEqual(["l"]);
    expect(state.flags.beat_rival_1).toBeUndefined();
    expect(state.flags.beat_hollis).toBe(true);
    // Hollis carries a mark and no script awards it, so the engine does.
    expect(state.marks).toEqual(["bramble_mark"]);
    expect(said).toContain("ROWAN received the BRAMBLE MARK!");
    expect(said[said.length - 1]).toBe("w");
  });

  it("whites out and stops the script on a loss that can't be lost", async () => {
    const { host, said } = setup({ battles: ["lost"] });
    await expect(runScript(host, [{ op: "battle", trainer: "hollis" }, { op: "say", text: "after" }])).rejects.toThrow("whiteout");
    expect(host.whiteout).toHaveBeenCalledOnce();
    expect(said).not.toContain("after");
  });

  it("heals and records the heal point", async () => {
    const { host, state, jingles } = setup();
    state.party.push({ ...makeQ("oak_acorn", 5), hp: 0, stats: { hp: 20, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 } });
    await runScript(host, [{ op: "heal" }]);
    expect(state.party[0].hp).toBe(20);
    expect(state.heal).toEqual({ map: "herbarium", x: 3, y: 4 });
    expect(jingles).toEqual(["heal"]);
  });

  it("calls sub-scripts, stops at end, and passes overworld ops to the host", async () => {
    const { host, state, said, ctx } = setup();
    await runScript(host, [
      { op: "call", script: "sub" },
      { op: "giveMoney", amount: 250 },
      { op: "giveMark", mark: "sundew_mark" },
      { op: "warp", to: "herbarium", x: 2, y: 2, facing: "up" },
      { op: "movePlayer", path: ["up", "up"] },
      { op: "moveNpc", npc: "vale", path: ["left"] },
      { op: "face", who: "vale", dir: "toPlayer" },
      { op: "hideNpc", npc: "pot" },
      { op: "emote", who: "player", emote: "!" },
      { op: "fade", to: "white" },
      { op: "shake", frames: 30 },
      { op: "showSpecies", species: "oak_acorn" },
      { op: "hideSpecies" },
      { op: "shop", stock: ["terrarium_pod"] },
      { op: "openCabinet" },
      { op: "music", id: "rival_appears" },
      { op: "restoreMusic" },
      { op: "end" },
      { op: "say", text: "never" },
    ]);
    expect(state.flags.called).toBe(true);
    expect(state.money).toBe(3250);
    expect(state.marks).toEqual(["sundew_mark"]);
    expect(host.warp).toHaveBeenCalledWith("herbarium", 2, 2, "up");
    expect(host.movePlayer).toHaveBeenCalledWith(["up", "up"]);
    expect(host.moveNpc).toHaveBeenCalledWith("vale", ["left"]);
    expect(host.face).toHaveBeenCalledWith("vale", "toPlayer");
    expect(host.setNpcVisible).toHaveBeenCalledWith("pot", false);
    expect(host.emote).toHaveBeenCalledWith("player", "!");
    expect(host.fade).toHaveBeenCalledWith("white");
    expect(host.shake).toHaveBeenCalledWith(30);
    expect(host.showSpecies).toHaveBeenCalledWith("oak_acorn");
    expect(ctx.screens.shop).toHaveBeenCalledWith(["terrarium_pod"]);
    expect(ctx.screens.cabinet).toHaveBeenCalled();
    expect(ctx.audio.playMusic).toHaveBeenCalledWith("rival_appears");
    expect(host.restoreMusic).toHaveBeenCalled();
    expect(said).not.toContain("never");
    expect(state.herbarium.seen).toContain("oak_acorn");
  });

  it("names the rival, defaulting to BRAM", async () => {
    const { host, state } = setup({ names: [""] });
    await runScript(host, [{ op: "nameRival" }]);
    expect(state.rivalName).toBe("BRAM");
  });

  it("detects scripts that award a mark themselves", () => {
    expect(scriptsAwardMark({ a: [{ op: "if", when: [], then: [{ op: "giveMark", mark: "sundew_mark" }] }] }, "sundew_mark")).toBe(true);
    expect(scriptsAwardMark({ a: [{ op: "say", text: "" }] }, "sundew_mark")).toBe(false);
  });

  it("passes cutscene camera, ambient and flash ops to the host in order", async () => {
    const { host } = setup();
    const log: string[] = [];
    host.camera = vi.fn(async (x: number, y: number, f?: number) => { log.push(`camera ${x},${y},${f ?? "-"}`); });
    host.cameraReset = vi.fn(async (f?: number) => { log.push(`reset ${f ?? "-"}`); });
    host.ambient = vi.fn((k) => { log.push(`ambient ${k}`); });
    host.flash = vi.fn(async (c) => { log.push(`flash ${c}`); });
    await runScript(host, [
      { op: "camera", x: 12, y: 3, frames: 40 },
      { op: "ambient", kind: "leaves" },
      { op: "flash", color: "gold" },
      { op: "camera", x: 1, y: 2 },
      { op: "cameraReset" },
      { op: "cameraReset", frames: 10 },
    ]);
    expect(log).toEqual(["camera 12,3,40", "ambient leaves", "flash gold", "camera 1,2,-", "reset -", "reset 10"]);
  });

  it("skips cutscene ops quietly on hosts that don't support them", async () => {
    const { host, said } = setup();
    await runScript(host, [
      { op: "camera", x: 1, y: 1 }, { op: "cameraReset" }, { op: "ambient", kind: "rain" }, { op: "flash", color: "white" },
      { op: "say", text: "after" },
    ]);
    expect(said).toEqual(["after"]);
  });
});
