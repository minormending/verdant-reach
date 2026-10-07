import { describe, expect, it, vi } from "vitest";
import type {
  BattleOutcome, GameContext, GameData, GameState, Quickened, ScriptCmd, SpeciesId, WorldData,
} from "../contracts";
import { newGameState } from "../save";
import { MARKS } from "../contracts";
import { ifMarks } from "../world/build";
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
  quests: {
    sap_run: { id: "sap_run", title: "THE SAP RUN", giver: "SYRUP MAKER", area: "sugarbush", steps: [], reward: "$1500" },
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
    wild_berry: { name: "Wild Berry", pocket: "items" },
    rose_hip: { name: "Rose Hip", pocket: "items" },
    compost: { name: "Compost", pocket: "items" },
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

  it("ifTime honours a map's forced time over the clock", async () => {
    const { host, said } = setup();
    host.map = () => ({ ...world.maps.herbarium, time: "day" });
    await runScript(host, [{ op: "ifTime", time: ["day"], then: [{ op: "say", text: "sun" }], else: [{ op: "say", text: "moon" }] }]);
    expect(said).toEqual(["sun"]);
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

  it.each(["won", "caught", "lost", "fled"] as const)("continues a static sport fixture after %s with canLose", async (outcome) => {
    const { host, state } = setup({ battles: [outcome] });
    const fixture: ScriptCmd[] = [
      { op: "wildBattle", species: "giant_water_lily", level: 40, sport: true, canLose: true },
      { op: "setFlag", flag: "static_sport_done" },
      { op: "hideNpc", npc: "static_sport" },
    ];
    await runScript(host, fixture);
    expect(host.battle).toHaveBeenCalledExactlyOnceWith({
      kind: "wild", wild: { species: "giant_water_lily", level: 40, sport: true }, canLose: true, backdrop: undefined,
    });
    expect(state.flags.static_sport_done).toBe(true);
    expect(host.setNpcVisible).toHaveBeenCalledWith("static_sport", false);
    expect(host.whiteout).not.toHaveBeenCalled();
  });

  it("leaves the sport override unset for ordinary scripted wild battles", async () => {
    const { host } = setup();
    await runScript(host, [{ op: "wildBattle", species: "giant_water_lily", level: 40 }]);
    expect(host.battle).toHaveBeenCalledWith(expect.objectContaining({
      wild: { species: "giant_water_lily", level: 40, sport: undefined },
    }));
  });

  it("still whites out on a wild battle loss without canLose", async () => {
    const { host, state } = setup({ battles: ["lost"] });
    await expect(runScript(host, [
      { op: "wildBattle", species: "giant_water_lily", level: 40, sport: true },
      { op: "setFlag", flag: "static_sport_done" },
    ])).rejects.toThrow("whiteout");
    expect(host.whiteout).toHaveBeenCalledOnce();
    expect(state.flags.static_sport_done).toBeUndefined();
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

describe("round-3 script ops", () => {
  const branch = (text: string): ScriptCmd[] => [{ op: "say", text }];

  it("branches on items in the bag (with a quantity)", async () => {
    const { host, state, said } = setup();
    state.bag.syrup_jar = 1;
    await runScript(host, [
      { op: "ifHasItem", item: "syrup_jar", then: branch("has"), else: branch("not") },
      { op: "ifHasItem", item: "syrup_jar", qty: 2, then: branch("two"), else: branch("one") },
      { op: "ifHasItem", item: "rain_jar", then: branch("rain") },
    ]);
    expect(said).toEqual(["has", "one"]);
  });

  it("branches on the party and on caught species (single id or a list)", async () => {
    const { host, state, said } = setup();
    state.party.push(makeQ("sunflower_bud", 12));
    state.herbarium.caught.push("moonflower_seed", "oak_acorn");
    await runScript(host, [
      { op: "ifPartyHas", species: ["sunflower_seedling", "sunflower_bud", "sunflower"], then: branch("sunny"), else: branch("no sun") },
      { op: "ifPartyHas", species: "oak_acorn", then: branch("oak"), else: branch("no oak") },
      { op: "ifCaught", species: ["moonflower_seed", "moonflower_vine"], then: branch("moon"), else: branch("no moon") },
      { op: "ifCaught", species: "pitcher_sprout", then: branch("pitcher"), else: branch("no pitcher") },
      { op: "ifCaughtCount", atLeast: 2, then: branch(">=2"), else: branch("<2") },
      { op: "ifCaughtCount", atLeast: 3, then: branch(">=3"), else: branch("<3") },
    ]);
    expect(said).toEqual(["sunny", "no oak", "moon", "no pitcher", ">=2", "<3"]);
  });

  it("counts each caught species once", async () => {
    const { host, state, said } = setup();
    state.herbarium.caught.push("oak_acorn", "oak_acorn");
    await runScript(host, [{ op: "ifCaughtCount", atLeast: 2, then: branch("yes"), else: branch("no") }]);
    expect(said).toEqual(["no"]);
  });

  it("harvests once per real-world day and regrows the next day", async () => {
    const { host, state, said, jingles } = setup();
    let now = new Date(2026, 9, 5, 23, 50);
    host.now = () => now;
    const fx: string[] = [];
    host.harvestFx = async (id) => { fx.push(id); };
    const pick: ScriptCmd[] = [{ op: "harvest", id: "hedgerow_1", item: "wild_berry", qty: 2 }];
    await runScript(host, pick);
    expect(state.bag.wild_berry).toBe(2);
    expect(state.harvested).toEqual({ hedgerow_1: "2026-10-05" });
    expect(said).toEqual(["ROWAN picked 2 WILD BERRIES!", "ROWAN put the WILD BERRIES in the ITEMS POCKET."]);
    expect(jingles).toEqual(["item_get"]);
    expect(fx).toEqual(["hedgerow_1"]);

    said.length = 0;
    await runScript(host, pick);
    expect(state.bag.wild_berry).toBe(2);
    expect(said[0]).toMatch(/tomorrow/);
    expect(fx).toHaveLength(1);

    // A different bush is independent; after midnight the first regrows.
    await runScript(host, [{ op: "harvest", id: "rose_1", item: "rose_hip" }]);
    expect(state.bag.rose_hip).toBe(1);
    now = new Date(2026, 9, 6, 0, 5);
    said.length = 0;
    await runScript(host, pick);
    expect(state.bag.wild_berry).toBe(4);
    expect(said[0]).toBe("ROWAN picked 2 WILD BERRIES!");
  });

  it("starts and completes quests with flags, toasts and the quest jingle", async () => {
    const { host, state, jingles, ctx } = setup();
    const toasts: string[] = [];
    host.toast = (kind, title) => toasts.push(`${kind}:${title}`);
    await runScript(host, [{ op: "startQuest", quest: "sap_run" }, { op: "startQuest", quest: "sap_run" }]);
    expect(state.flags.quest_sap_run_started).toBe(true);
    expect(toasts).toEqual(["new_note:THE SAP RUN"]);
    expect(ctx.audio.playSfx).toHaveBeenCalledWith("menu_open");
    await runScript(host, [{ op: "completeQuest", quest: "sap_run" }, { op: "completeQuest", quest: "sap_run" }]);
    expect(state.flags.quest_sap_run_done).toBe(true);
    expect(jingles).toEqual(["quest"]);
    expect(toasts).toEqual(["new_note:THE SAP RUN", "note_done:THE SAP RUN"]);
    // Starting a finished quest does nothing; unknown quests still get a readable title.
    await runScript(host, [{ op: "startQuest", quest: "sap_run" }, { op: "startQuest", quest: "lost_cat" }]);
    expect(toasts[2]).toBe("new_note:LOST CAT");
  });

  it("completing a quest that was never started marks both flags", async () => {
    const { host, state } = setup();
    await runScript(host, [{ op: "completeQuest", quest: "moonwatch" }]);
    expect(state.flags.quest_moonwatch_started).toBe(true);
    expect(state.flags.quest_moonwatch_done).toBe(true);
  });

  it("passes stills to the host, and skips them on hosts without stills", async () => {
    const { host, said } = setup();
    await runScript(host, [{ op: "still", image: "bloom" }, { op: "stillClear" }, { op: "say", text: "ok" }]);
    expect(said).toEqual(["ok"]);
    const log: string[] = [];
    host.still = async (k) => { log.push(`still ${k}`); };
    host.stillClear = async () => { log.push("clear"); };
    await runScript(host, [{ op: "still", image: "theft" }, { op: "say", text: "over it" }, { op: "stillClear" }]);
    expect(log).toEqual(["still theft", "clear"]);
  });

  it("finds marks awarded inside the new branching ops", () => {
    const s: Record<string, ScriptCmd[]> = {
      a: [{ op: "ifCaughtCount", atLeast: 1, then: [], else: [{ op: "giveMark", mark: "sundew_mark" }] }],
    };
    expect(scriptsAwardMark(s, "sundew_mark")).toBe(true);
    expect(scriptsAwardMark(s, "bramble_mark")).toBe(false);
  });

  it("ifMarks opens the eight-mark gate only with every mark, regardless of order", async () => {
    const { host, state, said } = setup();
    const gate = ifMarks(MARKS, [{ op: "say", text: "open" }], [
      { op: "say", text: "closed" }, { op: "movePlayer", path: ["right"] },
    ]);
    // Leader flags do not substitute for marks that were never awarded.
    for (const leader of ["hollis", "nell", "flora", "morrow", "saguaro", "reyes", "signe", "rook"]) {
      state.flags[`beat_${leader}`] = true;
    }
    for (const missing of MARKS) {
      state.marks = MARKS.filter((m) => m !== missing);
      await runScript(host, [gate]);
      expect(said.at(-1), missing).toBe("closed");
    }
    expect(host.movePlayer).toHaveBeenCalledTimes(8);
    state.marks = [...MARKS].reverse();
    await runScript(host, [gate]);
    expect(said.at(-1)).toBe("open");
    expect(host.movePlayer).toHaveBeenCalledTimes(8);
  });

  it("duplicate marks cannot open the gate, and a missing else is a no-op", async () => {
    const { host, state, said } = setup();
    state.marks = Array.from({ length: 8 }, () => MARKS[0]);
    await runScript(host, [ifMarks(MARKS, [{ op: "say", text: "open" }]), { op: "say", text: "after" }]);
    expect(said).toEqual(["after"]);
  });

  it("ifMarks supports a smaller required set and static scans of either branch", async () => {
    const { host, state, said } = setup();
    const condition = ifMarks(["bramble_mark"], [{ op: "say", text: "yes" }], [{ op: "giveMark", mark: "sundew_mark" }]);
    expect(scriptsAwardMark({ test: [condition] }, "sundew_mark")).toBe(true);
    state.marks = ["bramble_mark"];
    await runScript(host, [condition]);
    expect(said).toEqual(["yes"]);
  });

  it("gives items with natural plurals", async () => {
    const { host, said } = setup();
    await runScript(host, [{ op: "giveItem", item: "compost", qty: 3 }, { op: "giveItem", item: "wild_berry", qty: 5 }]);
    expect(said[0]).toBe("ROWAN received COMPOST ×3!");
    expect(said[1]).toBe("ROWAN put the COMPOST in the ITEMS POCKET.");
    expect(said[2]).toBe("ROWAN received 5 WILD BERRIES!");
  });
});
