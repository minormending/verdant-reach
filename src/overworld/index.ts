// The overworld scene: map rendering, grid movement, NPCs, trainers, warps,
// encounters, interactions, whiteout, and the host for the script
// interpreter. Entry point: createOverworldScene(ctx, opts).

import type {
  BattleOutcome, BattleRequest, Dir, GameContext, MapDef, MapId, Scene, ScriptCmd, ScriptId, SpeciesId,
} from "../contracts";
import { SCREEN_H, SCREEN_W, STRUCTURES, TILE, speciesPath } from "../contracts";
import { createQuickened, healParty } from "../battle";
import { playClock } from "../engine/context";
import { clearScenes } from "../engine/core";
import { Fader, Shaker, Timers, drawImagePath } from "../engine/gfx";
import { drawWindow } from "../ui/kit";
import { nameEntry } from "../ui/nameEntry";
import { saveDialog } from "../ui/widgets";
import { Actor, dirTo, type Emote } from "./actor";
import { rollEncounter } from "./encounters";
import {
  DIRS, OPPOSITE, buildMap, checkCond, refreshLegend, inSight, isMatWarp, tileAt, tryMove, triggerAt, warpAt, type MapRuntime,
} from "./map";
import {
  BattleTransition, drawCharacter, drawEmote, drawGrassOverlay, drawMapName, drawShadow, drawStructure, drawTile,
  drawTint, isStaticObject,
} from "./render";
import {
  ScriptAbort, giveItem, itemName, runScript, trainerBattle, type ScriptHost,
} from "./script";
import { runStartMenu } from "./startMenu";

export interface OverworldOpts {
  /** "new": run WORLD.newGame.script; "continue": run the map's onEnter. */
  mode?: "new" | "continue" | "none";
  /** Script to run after the first fade-in (dev). */
  script?: ScriptId | ScriptCmd[];
}

const WALK_FRAMES = 8;
const RUN_FRAMES = 4;
const HOP_FRAMES = 16;
const NPC_WANDER_FRAMES = 16;
const NPC_SCRIPT_FRAMES = 12;
const ENCOUNTER_GRACE_STEPS = 3;

const EMPTY_MAP: MapDef = {
  id: "player_home", name: "", outdoor: false, music: "herbarium",
  tiles: ["."], legend: { ".": "void" }, border: "void",
  structures: [], warps: [], npcs: [], signs: [], triggers: [],
};

const BOOKSHELF_TEXT = [
  "Pressed-plant folios, labelled in tiny careful handwriting.",
  "A field guide to mosses. Several pages are stuck together.",
  "“Hedgerows of the Valley,” well thumbed and full of notes.",
  "Seed catalogues going back fifty years.",
  "A thick book on soil. Someone has underlined “mycorrhiza.”",
];

export function createOverworldScene(ctx: GameContext, opts: OverworldOpts = {}): Scene {
  return new Overworld(ctx, opts);
}

class Overworld implements Scene {
  map!: MapRuntime;
  mapId!: MapId;
  player: Actor;
  npcs: Actor[] = [];
  frame = 0;
  busy = 0;
  fader = new Fader();
  shaker = new Shaker();
  timers = new Timers();
  transition = new BattleTransition();
  popup: { name: string; t: number } | null = null;
  lastOutdoor: MapId | null = null;
  species: SpeciesId | null = null;
  bumpCooldown = 0;
  turnTimer = 0;
  lastPressed: Dir | null = null;
  walking = false;
  inputStep = false;
  grace = 0;
  started = false;
  dead = false;
  pendingEnter: ScriptId | null = null;
  host: ScriptHost;

  constructor(private ctx: GameContext, private opts: OverworldOpts) {
    const pos = ctx.state.position;
    this.player = new Actor("player", "player", pos.x, pos.y, pos.facing);
    this.host = this.makeHost();
    this.loadMap(pos.map, pos.x, pos.y, pos.facing);
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  enter() {
    playClock.running = true;
    if (this.started) return;
    this.started = true;
    this.fader.set("black");
    void this.flow(async () => {
      this.playMapMusic();
      await this.fader.to("clear", 16);
      if (this.opts.mode === "new") {
        const script = this.ctx.world.newGame.script;
        await this.runScript(script);
      } else if (this.opts.mode !== "none" && this.map.def.onEnter) {
        await this.runScript(this.map.def.onEnter);
      }
      if (this.opts.script) await this.runScript(this.opts.script);
    });
  }

  exit() {
    this.dead = true;
  }

  /** Run an async sequence with player control locked. Errors never escape. */
  async flow(fn: () => Promise<void>): Promise<void> {
    this.busy++;
    try {
      await fn();
    } catch (e) {
      if (!(e instanceof ScriptAbort)) console.error("[overworld]", e);
    } finally {
      this.busy--;
      if (this.busy === 0 && !this.dead) await this.settle();
    }
  }

  /** After a sequence: never leave the screen faded or a species window up. */
  private async settle() {
    this.species = null;
    if (this.fader.level > 0) {
      this.busy++;
      await this.fader.to("clear", 12);
      this.busy--;
    }
    if (this.pendingEnter) {
      const s = this.pendingEnter;
      this.pendingEnter = null;
      await this.flow(() => this.runScript(s));
    }
  }

  async runScript(script: ScriptId | ScriptCmd[]) {
    await runScript(this.host, script);
  }

  // -------------------------------------------------------------------------
  // Map loading
  // -------------------------------------------------------------------------

  loadMap(id: MapId, x: number, y: number, facing: Dir) {
    let def = this.ctx.world.maps?.[id];
    if (!def) {
      console.error(`[overworld] map "${id}" is not defined`);
      const start = this.ctx.world.newGame;
      const fallback = this.map?.def ?? this.ctx.world.maps?.[start.map];
      if (fallback && !this.map) ({ x, y, facing } = start);
      def = fallback ?? EMPTY_MAP;
      id = def.id;
    }
    this.map = buildMap(def);
    this.mapId = id;
    const p = this.player;
    p.x = x; p.y = y; p.step = null; p.facing = facing; p.bumpAnim = 0;
    this.npcs = (def.npcs ?? []).map((n) => new Actor(n.id, n.sprite, n.x, n.y, n.facing, n));
    this.ctx.state.position = { map: id, x, y, facing };
    if (def.outdoor && id !== this.lastOutdoor && def.name) this.popup = { name: def.name, t: 0 };
    else if (!def.outdoor) this.popup = null;
    if (def.outdoor) this.lastOutdoor = id;
  }

  musicFor(def: MapDef) {
    if (def.outdoor && def.music === "route" && this.ctx.timeOfDay() === "night") return "route_night" as const;
    return def.music;
  }

  playMapMusic() {
    const id = this.musicFor(this.map.def);
    if (this.ctx.audio.current() !== id) this.ctx.audio.playMusic(id);
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  pickedFlag(npcId: string) {
    return `picked_${this.mapId}_${npcId}`;
  }

  visible(a: Actor): boolean {
    if (a.forceVisible !== null) return a.forceVisible;
    if (!a.def) return true;
    if (a.sprite === "item_pickup" && this.ctx.state.flags[this.pickedFlag(a.id)]) return false;
    return checkCond(a.def.visibleWhen, this.ctx.state.flags);
  }

  npcAt(x: number, y: number): Actor | undefined {
    return this.npcs.find((n) => this.visible(n) && n.occupies(x, y));
  }

  occupiedForPlayer = (x: number, y: number) => !!this.npcAt(x, y);
  occupiedForNpc = (x: number, y: number) => this.player.occupies(x, y) || !!this.npcAt(x, y);

  findNpc(id: string): Actor | undefined {
    return this.npcs.find((n) => n.id === id);
  }

  actor(who: string): Actor | undefined {
    return who === "player" ? this.player : this.findNpc(who);
  }

  backdrop(kind?: "grass" | "bog"): BattleRequest["backdrop"] {
    const def = this.map.def;
    if (!def.outdoor) return "indoor";
    if (kind === "bog" || tileAt(this.map, this.player.x, this.player.y) === "bog") return "bog";
    if (this.ctx.timeOfDay() === "night") return "night";
    return "grass";
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  update() {
    this.frame++;
    refreshLegend(this.map, this.ctx.state.flags);
    this.fader.tick();
    this.shaker.tick();
    this.timers.tick();
    this.transition.tick();
    if (this.popup) this.popup.t++;
    if (this.bumpCooldown > 0) this.bumpCooldown--;

    for (const n of this.npcs) n.tick();
    const arrived = this.player.tick();
    if (arrived && this.inputStep) {
      this.inputStep = false;
      this.ctx.state.position = { map: this.mapId, x: this.player.x, y: this.player.y, facing: this.player.facing };
      this.onArrive();
    }
    if (this.busy > 0 || this.dead) return;

    this.updateNpcs();
    if (!this.player.moving) this.handleInput();
  }

  private currentDir(): Dir | null {
    const input = this.ctx.input;
    for (const d of ["up", "down", "left", "right"] as Dir[]) if (input.pressed(d)) this.lastPressed = d;
    if (this.lastPressed && (input.held(this.lastPressed) || input.pressed(this.lastPressed))) return this.lastPressed;
    for (const d of ["up", "down", "left", "right"] as Dir[]) if (input.held(d)) return d;
    return null;
  }

  private handleInput() {
    const input = this.ctx.input;
    const p = this.player;
    if (input.pressed("start")) {
      this.walking = false;
      p.bumpAnim = 0;
      this.popup = null;
      void this.flow(() => runStartMenu(this.ctx));
      return;
    }
    if (input.pressed("a")) {
      if (this.interact()) { this.walking = false; this.popup = null; return; }
    }
    const dir = this.currentDir();
    if (!dir) {
      this.walking = false;
      this.turnTimer = 0;
      p.bumpAnim = 0;
      return;
    }
    if (dir !== p.facing && !this.walking) {
      // Tap to turn in place; keep holding to walk.
      p.facing = dir;
      p.bumpAnim = 0;
      this.turnTimer = 5;
      return;
    }
    if (this.turnTimer > 0) {
      this.turnTimer--;
      return;
    }
    this.attemptMove(dir);
  }

  private attemptMove(dir: Dir) {
    const p = this.player;
    p.facing = dir;
    const res = tryMove(this.map, p.x, p.y, dir, this.occupiedForPlayer);
    const running = this.ctx.input.held("b");
    if (res.kind === "walk") {
      p.bumpAnim = 0;
      this.inputStep = true;
      this.walking = true;
      void p.begin(dir, running ? RUN_FRAMES : WALK_FRAMES);
      return;
    }
    if (res.kind === "ledge") {
      p.bumpAnim = 0;
      this.inputStep = true;
      this.walking = true;
      this.ctx.audio.playSfx("ledge");
      void p.begin(dir, HOP_FRAMES, { hop: true });
      return;
    }
    // Blocked. Standing on a warp and pushing outward uses it (door mats: down only).
    const here = warpAt(this.map, p.x, p.y);
    if (here && res.reason !== "occupied" && (!isMatWarp(this.map, p.x, p.y) || dir === "down")) {
      this.walking = false;
      void this.flow(() => this.useWarp(here));
      return;
    }
    this.walking = false;
    p.bumpAnim++;
    if (this.bumpCooldown === 0) {
      this.ctx.audio.playSfx("bump");
      this.bumpCooldown = 16;
    }
  }

  private onArrive() {
    const p = this.player;
    const st = this.ctx.state;
    const w = warpAt(this.map, p.x, p.y);
    if (w && (!isMatWarp(this.map, p.x, p.y) || p.facing === "down")) {
      this.walking = false;
      void this.flow(() => this.useWarp(w));
      return;
    }
    const trig = triggerAt(this.map, p.x, p.y, st.flags);
    if (trig) {
      this.walking = false;
      void this.flow(() => this.runScript(trig.script));
      return;
    }
    if (this.checkTrainers()) return;
    if (this.grace > 0) { this.grace--; return; }
    const enc = rollEncounter(this.map.def, tileAt(this.map, p.x, p.y), this.ctx.timeOfDay(), this.ctx.rng);
    if (enc) {
      this.walking = false;
      void this.flow(() => this.wildEncounter(enc.species, enc.level, enc.kind));
    }
  }

  private updateNpcs() {
    const rng = this.ctx.rng;
    for (const n of this.npcs) {
      if (!n.def || n.moving || !this.visible(n)) continue;
      const mode = n.def.movement ?? "static";
      if (mode === "static") continue;
      if (--n.aiTimer > 0) continue;
      if (mode === "look_around") {
        const dirs: Dir[] = ["up", "down", "left", "right"];
        const options = dirs.filter((d) => d !== n.facing);
        n.facing = options[Math.floor(rng() * options.length)];
        n.aiTimer = 70 + Math.floor(rng() * 90);
        if (n.def.trainer) this.checkTrainers();
      } else if (mode === "wander") {
        n.aiTimer = 50 + Math.floor(rng() * 130);
        const dirs: Dir[] = ["up", "down", "left", "right"];
        const dir = dirs[Math.floor(rng() * 4)];
        const { dx, dy } = DIRS[dir];
        const tx = n.x + dx;
        const ty = n.y + dy;
        if (Math.abs(tx - n.home.x) > 2 || Math.abs(ty - n.home.y) > 2) { n.facing = dir; continue; }
        const res = tryMove(this.map, n.x, n.y, dir, this.occupiedForNpc);
        if (res.kind !== "walk" || warpAt(this.map, tx, ty) || triggerAt(this.map, tx, ty, {})) { n.facing = dir; continue; }
        void n.begin(dir, NPC_WANDER_FRAMES);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Interaction
  // -------------------------------------------------------------------------

  private interact(): boolean {
    const p = this.player;
    const { dx, dy } = DIRS[p.facing];
    const fx = p.x + dx;
    const fy = p.y + dy;
    const npc = this.npcAt(fx, fy);
    if (npc && !npc.moving) {
      void this.flow(() => this.talk(npc));
      return true;
    }
    const tile = tileAt(this.map, fx, fy);
    if (tile === "counter") {
      const across = this.npcAt(fx + dx, fy + dy);
      if (across && !across.moving) {
        void this.flow(() => this.talk(across));
        return true;
      }
    }
    const sign = this.map.def.signs.find((s) => s.x === fx && s.y === fy);
    if (sign) {
      void this.flow(() => this.ctx.ui.say(sign.text));
      return true;
    }
    if (tile === "bookshelf") {
      const text = BOOKSHELF_TEXT[Math.abs(fx * 7 + fy * 13) % BOOKSHELF_TEXT.length];
      void this.flow(() => this.ctx.ui.say(text));
      return true;
    }
    if (tile === "specimen_cabinet") {
      void this.flow(async () => {
        await this.ctx.ui.say("{PLAYER} opened the SPECIMEN CABINET.");
        await this.ctx.screens.cabinet();
      });
      return true;
    }
    if (tile === "mailbox") {
      void this.flow(() => this.ctx.ui.say("The mailbox is empty."));
      return true;
    }
    return false;
  }

  private async talk(npc: Actor) {
    const def = npc.def;
    if (!def) return;
    this.player.bumpAnim = 0;
    if (def.trainer) {
      await this.trainerTalk(npc, def.trainer);
      return;
    }
    if (!isStaticObject(this.ctx.assets, npc.sprite)) npc.facing = OPPOSITE[this.player.facing];
    if (def.script) await this.runScript(def.script);
    else if (npc.sprite === "item_pickup") await this.pickup(npc);
    if (npc.sprite === "item_pickup") this.ctx.state.flags[this.pickedFlag(npc.id)] = true;
  }

  /** Item ball with no script: the item id comes from the NPC id ("item_water_flask", "water_flask_2"). */
  private async pickup(npc: Actor) {
    const items = this.ctx.data.items ?? {};
    const raw = npc.id.replace(/^item[_:-]?/, "");
    const candidates = [npc.id, raw, raw.replace(/[_-]\d+$/, ""), raw.split(":").pop() ?? raw];
    const item = candidates.find((c) => c in items);
    if (!item) {
      console.warn(`[overworld] item_pickup "${npc.id}" on ${this.mapId}: no script and no item id`);
      return;
    }
    await giveItem(this.host, item, 1, { found: true });
  }

  private async trainerTalk(npc: Actor, trainerId: string) {
    const tr = this.ctx.world.trainers[trainerId];
    npc.facing = OPPOSITE[this.player.facing];
    if (!tr) {
      console.warn(`[overworld] unknown trainer "${trainerId}"`);
      return;
    }
    if (this.ctx.state.flags[`beat_${trainerId}`]) {
      await this.ctx.ui.say(tr.after);
      return;
    }
    await this.trainerEncounter(trainerId);
  }

  private async trainerEncounter(trainerId: string) {
    const tr = this.ctx.world.trainers[trainerId];
    await this.ctx.ui.say(tr.intro);
    const r = await trainerBattle(this.host, trainerId);
    if (r === "lost") await this.whiteout();
  }

  /** Line of sight from undefeated trainers. Starts the encounter and returns true if spotted. */
  private checkTrainers(): boolean {
    const p = this.player;
    if (p.moving) return false;
    const flags = this.ctx.state.flags;
    for (const n of this.npcs) {
      const id = n.def?.trainer;
      if (!id || flags[`beat_${id}`] || n.moving || !this.visible(n)) continue;
      const dist = inSight(this.map, n.x, n.y, n.facing, n.def?.sight ?? 4, p, (x, y) => !!this.npcAt(x, y));
      if (dist > 0) {
        this.walking = false;
        void this.flow(() => this.trainerSpotted(n, id, dist));
        return true;
      }
    }
    return false;
  }

  private async trainerSpotted(n: Actor, trainerId: string, dist: number) {
    this.player.bumpAnim = 0;
    await this.emote(n, "!");
    for (let i = 1; i < dist; i++) await n.begin(n.facing, NPC_SCRIPT_FRAMES);
    this.player.facing = OPPOSITE[n.facing];
    await this.timers.frames(6);
    await this.trainerEncounter(trainerId);
  }

  // -------------------------------------------------------------------------
  // Sequences
  // -------------------------------------------------------------------------

  async emote(a: Actor, kind: Emote) {
    a.emote = { kind, t: 0 };
    await this.timers.frames(40);
  }

  async useWarp(w: MapDef["warps"][number]) {
    const facing = w.facing ?? this.player.facing;
    this.ctx.audio.playSfx("door");
    await this.fader.to("black", 12);
    this.loadMap(w.to, w.toX, w.toY, facing);
    this.playMapMusic();
    await this.timers.frames(4);
    await this.fader.to("clear", 12);
    if (this.map.def.onEnter) await this.runScript(this.map.def.onEnter);
  }

  async battle(req: BattleRequest): Promise<BattleOutcome> {
    const ctx = this.ctx;
    const trainer = req.trainer ? ctx.world.trainers[req.trainer] : undefined;
    ctx.audio.playMusic(req.kind === "trainer" ? trainer?.music ?? "battle_trainer" : "battle_wild");
    ctx.audio.playSfx("encounter");
    this.player.bumpAnim = 0;
    await this.transition.run(req.kind === "trainer" ? "trainer" : "wild");
    let result: BattleOutcome;
    try {
      result = await ctx.battle({ ...req, backdrop: req.backdrop ?? this.backdrop() });
    } finally {
      this.transition.clear();
      this.fader.set("black");
    }
    this.grace = ENCOUNTER_GRACE_STEPS;
    if (result === "lost" && !req.canLose) return result; // whiteout fades in
    this.playMapMusic();
    await this.fader.to("clear", 12);
    return result;
  }

  async wildEncounter(species: SpeciesId, level: number, kind: "grass" | "bog") {
    const r = await this.battle({ kind: "wild", wild: { species, level }, backdrop: this.backdrop(kind) });
    if (r === "lost") await this.whiteout();
  }

  async whiteout() {
    const ctx = this.ctx;
    const st = ctx.state;
    this.fader.set("black");
    ctx.audio.stopMusic(10);
    await ctx.ui.say("{PLAYER} has no healthy Quickened left!");
    const lost = Math.floor(st.money / 2);
    st.money -= lost;
    if (lost > 0) await ctx.ui.say(`{PLAYER} dropped $${lost} in the scramble…`);
    await ctx.ui.say(st.heal.map === "player_home" ? "…and scurried back home!" : "…and scurried back to the greenhouse!");
    healParty(st.party, ctx.data);
    this.loadMap(st.heal.map, st.heal.x, st.heal.y, "up");
    this.playMapMusic();
    await this.timers.frames(20);
    await this.fader.to("clear", 16);
  }

  async endSlice() {
    const ctx = this.ctx;
    await saveDialog(ctx, "Would you like to save your game?");
    ctx.audio.stopMusic(40);
    await this.fader.to("white", 40);
    await this.timers.frames(20);
    const { toBeContinued } = await import("../ui/tbc");
    await toBeContinued(ctx);
    const { createTitleScene } = await import("../ui/title");
    this.dead = true;
    playClock.running = false;
    clearScenes(ctx.scenes);
    ctx.scenes.push(createTitleScene(ctx));
  }

  makeHost(): ScriptHost {
    const self = this;
    const ctx = this.ctx;
    return {
      ctx,
      mapId: () => self.mapId,
      map: () => self.map?.def,
      createQuickened,
      healParty,
      battle: (req) => self.battle(req),
      whiteout: () => self.whiteout(),
      backdrop: () => self.backdrop(),
      async warp(to, x, y, facing) {
        const faded = self.fader.level >= 1;
        if (!faded) {
          ctx.audio.playSfx("door");
          await self.fader.to("black", 12);
        }
        self.loadMap(to, x, y, facing ?? self.player.facing);
        self.playMapMusic();
        const onEnter = self.map.def.onEnter;
        if (faded) {
          // The script will fade back in itself; run onEnter once it does.
          if (onEnter) self.pendingEnter = onEnter;
          return;
        }
        await self.timers.frames(4);
        await self.fader.to("clear", 12);
        if (onEnter) await self.runScript(onEnter);
      },
      async movePlayer(path) {
        for (const dir of path) {
          const res = tryMove(self.map, self.player.x, self.player.y, dir);
          await self.player.begin(dir, res.kind === "ledge" ? HOP_FRAMES : WALK_FRAMES, { hop: res.kind === "ledge" });
        }
        const p = self.player;
        ctx.state.position = { map: self.mapId, x: p.x, y: p.y, facing: p.facing };
      },
      async moveNpc(id, path) {
        const n = self.findNpc(id);
        if (!n) { console.warn(`[script] moveNpc: no npc "${id}" on ${self.mapId}`); return; }
        for (const dir of path) await n.begin(dir, NPC_SCRIPT_FRAMES);
      },
      face(who, dir) {
        const a = self.actor(who);
        if (!a) { console.warn(`[script] face: no actor "${who}"`); return; }
        a.facing = dir === "toPlayer" ? dirTo(a, self.player) : dir;
      },
      setNpcVisible(id, v) {
        const n = self.findNpc(id);
        if (!n) { console.warn(`[script] show/hideNpc: no npc "${id}" on ${self.mapId}`); return; }
        n.forceVisible = v;
      },
      async fade(to) {
        await self.fader.to(to, to === "white" ? 24 : 16);
        if (to === "clear" && self.pendingEnter) {
          const s = self.pendingEnter;
          self.pendingEnter = null;
          await self.runScript(s);
        }
      },
      shake: (frames) => self.shaker.start(frames),
      async emote(who, e) {
        const a = self.actor(who);
        if (!a) { console.warn(`[script] emote: no actor "${who}"`); return; }
        await self.emote(a, e);
      },
      wait: (frames) => self.timers.frames(frames),
      showSpecies(id) { self.species = id; },
      hideSpecies() { self.species = null; },
      restoreMusic: () => self.playMapMusic(),
      nameEntry(o) {
        const title = o.kind === "player" ? "YOUR NAME?" : o.kind === "rival" ? "RIVAL'S NAME?" : "NICKNAME?";
        return nameEntry(ctx, {
          title, max: o.max, defaultName: o.defaultName,
          sprite: o.kind === "rival" ? "bram" : o.kind === "player" ? "player" : undefined,
          species: o.species,
        });
      },
      endSlice: () => self.endSlice(),
    };
  }

  // -------------------------------------------------------------------------
  // Draw
  // -------------------------------------------------------------------------

  draw(g: CanvasRenderingContext2D) {
    const ctx = this.ctx;
    const assets = ctx.assets;
    const m = this.map;
    const shake = this.shaker.offset(this.frame);
    const pp = this.player.pixel();
    const camX = pp.px - 64 + shake.x;
    const camY = pp.py - 64 + shake.y;

    // Tiles (border beyond the edges).
    const tx0 = Math.floor(camX / TILE);
    const ty0 = Math.floor(camY / TILE);
    for (let ty = ty0; ty <= ty0 + Math.ceil(SCREEN_H / TILE); ty++) {
      for (let tx = tx0; tx <= tx0 + Math.ceil(SCREEN_W / TILE); tx++) {
        drawTile(g, assets, tileAt(m, tx, ty), tx * TILE - camX, ty * TILE - camY, this.frame);
      }
    }
    // Structures.
    for (const s of m.def.structures ?? []) {
      const spec = STRUCTURES[s.key];
      if (!spec) continue;
      const sx = s.x * TILE - camX;
      const sy = s.y * TILE - camY;
      if (sx > SCREEN_W || sy > SCREEN_H + 32 || sx + spec.w * TILE < 0 || sy + spec.h * TILE < -32) continue;
      drawStructure(g, assets, s.key, sx, sy);
    }
    // Characters, back to front.
    const actors = [this.player, ...this.npcs.filter((n) => this.visible(n))];
    actors.sort((a, b) => a.pixel().py - b.pixel().py);
    for (const a of actors) {
      const { px, py, lift } = a.pixel();
      const sx = px - camX;
      const sy = py - camY - 4;
      if (sx < -16 || sx > SCREEN_W || sy < -24 || sy > SCREEN_H) continue;
      if (lift) drawShadow(g, sx, py - camY);
      drawCharacter(g, assets, a.sprite, a.frameColumn(), a.facing, sx, sy - lift);
      if (!lift) {
        const cells = a.step ? [[a.step.fx, a.step.fy], [a.step.tx, a.step.ty]] : [[a.x, a.y]];
        for (const [cx, cy] of cells) {
          if (tileAt(m, cx, cy) === "tall_grass") drawGrassOverlay(g, assets, cx * TILE - camX, cy * TILE - camY, this.frame);
        }
      }
    }
    for (const a of actors) {
      if (!a.emote) continue;
      const { px, py } = a.pixel();
      drawEmote(g, a.emote.kind, px - camX, py - camY - 4, a.emote.t);
    }
    if (m.def.outdoor) drawTint(g, ctx.timeOfDay());

    // UI layer.
    if (this.popup && !this.transition.kind) drawMapName(g, this.popup.name, this.popup.t);
    if (this.species) {
      drawWindow(g, 48, 20, 64, 64);
      drawImagePath(g, assets, speciesPath(this.species, "front"), 0, 0, 56, 56, 52, 24);
    }
    this.transition.draw(g);
    this.fader.draw(g, SCREEN_W, SCREEN_H);
  }
}

export { itemName };
