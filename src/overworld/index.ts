// The overworld scene: map rendering, grid movement, NPCs, trainers, warps,
// encounters, interactions, whiteout, and the host for the script
// interpreter. Entry point: createOverworldScene(ctx, opts).

import type {
  Ambient, BattleOutcome, BattleRequest, Dir, GameContext, MapDef, MapId, Scene, ScriptCmd, ScriptId, SpeciesId,
} from "../contracts";
import { SCREEN_H, SCREEN_W, STRUCTURES, TILE, speciesPath, tilePath } from "../contracts";
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
  DIRS, OPPOSITE, buildMap, checkCond, refreshLegend, inSight, isMatWarp, isWalkable, tileAt, tileProps, tryMove,
  triggerAt, warpAt, type MapRuntime,
} from "./map";
import {
  BattleTransition, drawCharacter, drawEmote, drawGrassOverlay, drawMapName, drawShadow, drawStructure,
  eraseCharacter, isStaticObject, rowFor, structureImage,
} from "./render";
import { AmbientFx, effectiveAmbient } from "./ambient";
import { autotileMask } from "./autotile";
import { CameraRig, Flash, camForTile } from "./camera";
import { Effects, drawWaterGlint } from "./effects";
import { drawHalo, drawTint, lampInfo, makeScreenCanvas, nightGlass, windowGlow } from "./lights";
import { TileLayer } from "./tilelayer";
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
/** Running eases up to speed over the first steps (6 -> 5 -> 4 frames per tile). */
const RUN_RAMP = [6, 5, 4];
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
  camera = new CameraRig();
  flash = new Flash();
  ambient = new AmbientFx();
  ambientOverride: Ambient | null = null;
  effects = new Effects();
  tiles: TileLayer;
  lightCanvas: HTMLCanvasElement | null = null;
  runStreak = 0;

  constructor(private ctx: GameContext, private opts: OverworldOpts) {
    const pos = ctx.state.position;
    this.player = new Actor("player", "player", pos.x, pos.y, pos.facing);
    this.host = this.makeHost();
    this.tiles = new TileLayer(ctx.assets);
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
    if (!this.camera.following) {
      this.busy++;
      await this.camera.reset(20, this.followCam());
      this.busy--;
    }
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
    this.camera.snap();
    this.effects.clear();
    this.ambientOverride = null;
    this.runStreak = 0;
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
    if (a.away) return false;
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
    this.flash.tick();
    // The map-name sign waits until the player has control (so it never sits over
    // an onEnter cutscene or a fade), then slides in; a cutscene that starts while
    // it's showing dismisses it.
    if (this.popup) {
      if (this.busy === 0) this.popup.t++;
      else if (this.popup.t > 0) this.popup = null;
    }
    if (this.bumpCooldown > 0) this.bumpCooldown--;

    for (const n of this.npcs) n.tick();
    const arrived = this.player.tick();
    this.camera.update(this.followCam());
    this.ambient.set(effectiveAmbient(this.ambientOverride ?? this.map.def.ambient, this.ctx.timeOfDay()));
    this.ambient.update();
    this.effects.update();
    this.stepEffects();
    if (arrived && this.inputStep) {
      this.inputStep = false;
      this.ctx.state.position = { map: this.mapId, x: this.player.x, y: this.player.y, facing: this.player.facing };
      this.onArrive();
    }
    if (this.busy > 0 || this.dead) return;

    this.updateNpcs();
    if (!this.player.moving) this.handleInput();
  }

  /** Camera top-left that centres the player. */
  followCam(): { x: number; y: number } {
    const pp = this.player.pixel();
    return { x: pp.px - 64, y: pp.py - 64 };
  }

  /** Dust, grass rustles and landing puffs for steps that just began or ended. */
  private stepEffects() {
    const m = this.map;
    for (const n of this.npcs) {
      // A hedge gate (or any puzzle object) vanishing leaves a puff of leaves and dust.
      if (n.sprite !== "hedge_gate") continue;
      const vis = this.visible(n);
      if (n.lastRow !== null && !vis && n.lastRow !== "gone") {
        this.effects.land(n.x, n.y);
        this.effects.rustle(n.x, n.y, this.frame);
      }
      n.lastRow = vis ? n.lastRow ?? "down" : "gone";
    }
    for (const a of [this.player, ...this.npcs]) {
      if (a.clunk > 0) a.clunk--;
      if (a.bob > 0) a.bob--;
      if (a.fly) {
        if (++a.fly.t >= 80) a.fly = null;
      }
      if (a.justLanded) {
        a.justLanded = false;
        this.effects.land(a.x, a.y);
      }
      const st = a.step;
      if (!st || st.t !== 1 || (a !== this.player && !this.visible(a))) continue;
      if (tileAt(m, st.tx, st.ty) === "tall_grass") this.effects.rustle(st.tx, st.ty, this.frame);
      if (a === this.player && !st.hop && st.dur <= RUN_RAMP[0]) {
        const from = tileAt(m, st.fx, st.fy);
        if (from !== "tall_grass" && !tileProps(from).water && from !== "bog") {
          this.effects.dust(st.fx, st.fy, a.facing);
        }
      }
    }
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
      this.runStreak = 0;
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
      const dur = running ? RUN_RAMP[Math.min(this.runStreak, RUN_RAMP.length - 1)] : WALK_FRAMES;
      this.runStreak = running ? this.runStreak + 1 : 0;
      void p.begin(dir, dur);
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
    this.runStreak = 0;
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
      if (n.def && n.sprite === "bird" && (n.away || this.visible(n))) { this.birdAi(n); continue; }
      if (!n.def || n.moving || !this.visible(n)) continue;
      if (n.sprite === "cat" || n.sprite === "dog") { this.petAi(n); continue; }
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

  private dist(n: Actor) {
    return Math.abs(n.x - this.player.x) + Math.abs(n.y - this.player.y);
  }

  /** Ambient step for animals: stays within `range` of home, avoids warps and triggers. */
  private animalStep(n: Actor, dir: Dir, frames: number, range: number, hop = false): boolean {
    const { dx, dy } = DIRS[dir];
    const tx = n.x + dx;
    const ty = n.y + dy;
    n.facing = dir;
    if (Math.abs(tx - n.home.x) > range || Math.abs(ty - n.home.y) > range) return false;
    const res = tryMove(this.map, n.x, n.y, dir, this.occupiedForNpc);
    if (res.kind !== "walk" || warpAt(this.map, tx, ty) || triggerAt(this.map, tx, ty, {})) return false;
    void n.begin(dir, frames, hop ? { hop: true, dist: 1 } : {});
    return true;
  }

  /** Cats and dogs: idle wandering with pauses; they turn to look at the player. */
  private petAi(n: Actor) {
    const rng = this.ctx.rng;
    const dog = n.sprite === "dog";
    const mode = n.def?.movement ?? "wander";
    const d = this.dist(n);
    if (d <= 3) {
      // Dogs always watch you (with a happy bounce now and then); cats only sometimes deign to.
      if (dog) {
        n.facing = dirTo(n, this.player);
        if (n.bob === 0 && rng() < 0.02) n.bob = 8;
        n.burst = 0;
        return;
      }
      if (--n.aiTimer > 0) return;
      n.aiTimer = 90 + Math.floor(rng() * 150);
      if (rng() < 0.6) n.facing = dirTo(n, this.player);
      return;
    }
    if (mode === "static") return;
    if (--n.aiTimer > 0) return;
    const dirs: Dir[] = ["up", "down", "left", "right"];
    if (n.burst > 0) {
      n.burst--;
      const keep = rng() < 0.7 ? n.facing : dirs[Math.floor(rng() * 4)];
      if (!this.animalStep(n, keep, 10, 3)) n.burst = 0;
      n.aiTimer = n.burst > 0 ? 2 : 70 + Math.floor(rng() * 110);
      return;
    }
    const r = rng();
    if (dog && r < 0.55) {
      n.burst = 1 + Math.floor(rng() * 3);
      n.aiTimer = 1;
    } else if (!dog && r < 0.35) {
      this.animalStep(n, dirs[Math.floor(rng() * 4)], 16, 2);
      n.aiTimer = 110 + Math.floor(rng() * 170);
    } else {
      // pause: maybe glance about
      if (rng() < 0.5) n.facing = dirs[Math.floor(rng() * 4)];
      n.aiTimer = (dog ? 60 : 140) + Math.floor(rng() * 160);
    }
  }

  /** Birds hop and peck about, and fly off when the player comes near; they come back later. */
  private birdAi(n: Actor) {
    const rng = this.ctx.rng;
    if (n.away) {
      if (n.fly) return;
      const far = Math.abs(n.home.x - this.player.x) > 6 || Math.abs(n.home.y - this.player.y) > 5;
      if (far && --n.aiTimer <= 0) {
        n.aiTimer = 60;
        if (isWalkable(this.map, n.home.x, n.home.y) && !this.occupiedForNpc(n.home.x, n.home.y)) {
          n.x = n.home.x; n.y = n.home.y; n.step = null; n.away = false;
        }
      }
      return;
    }
    if (n.moving) return;
    if (this.dist(n) <= 2) {
      const dx = this.player.x < n.x ? 1 : this.player.x > n.x ? -1 : rng() < 0.5 ? 1 : -1;
      n.facing = dx > 0 ? "right" : "left";
      n.fly = { t: 0, dx };
      n.away = true;
      n.aiTimer = 120;
      return;
    }
    if (--n.aiTimer > 0) return;
    n.aiTimer = 30 + Math.floor(rng() * 90);
    const r = rng();
    if (r < 0.45) n.bob = 8;                                   // peck / hop in place
    else if (r < 0.75) n.facing = (["left", "right", "down"] as Dir[])[Math.floor(rng() * 3)];
    else if (n.def?.movement !== "static") {
      this.animalStep(n, (["up", "down", "left", "right"] as Dir[])[Math.floor(rng() * 4)], 10, 2, true);
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
    // GBC-style stepped fade: quick out, a beat of black, a gentler fade in.
    await this.fader.to("black", 10);
    this.loadMap(w.to, w.toX, w.toY, facing);
    this.playMapMusic();
    await this.timers.frames(6);
    await this.fader.to("clear", 14);
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
          await self.fader.to("black", 10);
        }
        self.loadMap(to, x, y, facing ?? self.player.facing);
        self.playMapMusic();
        const onEnter = self.map.def.onEnter;
        if (faded) {
          // The script will fade back in itself; run onEnter once it does.
          if (onEnter) self.pendingEnter = onEnter;
          return;
        }
        await self.timers.frames(6);
        await self.fader.to("clear", 14);
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
      camera(x, y, frames) {
        if (self.camera.following) self.camera.update(self.followCam());
        return self.camera.pan(camForTile(x, y), frames);
      },
      cameraReset: (frames) => self.camera.reset(frames, self.followCam()),
      ambient(kind) { self.ambientOverride = kind; },
      flash: (color) => self.flash.run(color),
    };
  }

  // -------------------------------------------------------------------------
  // Draw
  // -------------------------------------------------------------------------

  draw(g: CanvasRenderingContext2D) {
    const ctx = this.ctx;
    const assets = ctx.assets;
    const m = this.map;
    const flags = ctx.state.flags;
    refreshLegend(m, flags);
    this.tiles.ensure(m);
    const shake = this.shaker.offset(this.frame);
    const base = this.camera.following ? this.followCam() : this.camera;
    const camX = Math.round(base.x) + shake.x;
    const camY = Math.round(base.y) + shake.y;
    const second = Math.floor(this.frame / 32) % 2 === 1;
    const tod = ctx.timeOfDay();
    const night = m.def.outdoor && tod === "night";

    // Ground: cached tile layer, water glints, dust.
    this.tiles.draw(g, m, camX, camY, second);
    const tx0 = Math.floor(camX / TILE);
    const ty0 = Math.floor(camY / TILE);
    for (let ty = ty0; ty <= ty0 + 9; ty++) {
      for (let tx = tx0; tx <= tx0 + 10; tx++) {
        const t = tileAt(m, tx, ty);
        if (!tileProps(t).water || autotileMask(m, tx, ty) !== 15) continue;
        drawWaterGlint(g, tx, ty, tx * TILE - camX, ty * TILE - camY, this.frame);
      }
    }
    if (!m.def.outdoor && tod === "night") {
      for (let ty = ty0; ty <= ty0 + 9; ty++) {
        for (let tx = tx0; tx <= tx0 + 10; tx++) {
          if (tileAt(m, tx, ty) !== "window") continue;
          const img = assets.image(this.tiles.resolve(m, tx, ty).path) ?? assets.image(tilePath("window"));
          const night = img && nightGlass(img);
          if (night) g.drawImage(night, tx * TILE - camX, ty * TILE - camY);
        }
      }
    }
    this.effects.drawGround(g, camX, camY);

    // Night emissive layer (window glass, lamp heads); characters erase it where they stand in front.
    let lg: CanvasRenderingContext2D | null = null;
    if (night) {
      this.lightCanvas ??= makeScreenCanvas();
      lg = this.lightCanvas?.getContext("2d") ?? null;
      lg?.clearRect(0, 0, SCREEN_W, SCREEN_H);
    }
    const lamps: { x: number; y: number }[] = [];
    if (night) {
      const lampImg = assets.image(tilePath("lamp_post"));
      const info = lampInfo(lampImg);
      for (const l of this.tiles.lamps) {
        const sx = l.x * TILE - camX;
        const sy = l.y * TILE - camY;
        if (sx < -40 || sy < -40 || sx > SCREEN_W + 40 || sy > SCREEN_H + 40) continue;
        lamps.push({ x: sx + info.cx, y: sy + info.cy });
        if (info.mask && lg) lg.drawImage(info.mask, sx, sy);
      }
    }

    // Y-sorted scenery and characters: structures sort by the bottom of their
    // footprint, characters by their feet, so the player passes behind roofs
    // and canopies that rise above a footprint and in front of their bases.
    type Item = { base: number; order: number; draw: () => void };
    const items: Item[] = [];
    for (const s of m.def.structures ?? []) {
      const spec = STRUCTURES[s.key];
      if (!spec) continue;
      const sx = s.x * TILE - camX;
      const sy = s.y * TILE - camY;
      if (sx > SCREEN_W || sy > SCREEN_H || sx + spec.w * TILE < 0 || sy + spec.h * TILE < -64) continue;
      items.push({
        base: (s.y + spec.h) * TILE, order: 0,
        draw: () => {
          drawStructure(g, assets, s.key, sx, sy);
          if (lg) {
            const si = structureImage(assets, s.key, sx, sy);
            const glow = si && windowGlow(si.img);
            if (glow && si) lg.drawImage(glow, si.x, si.y);
          }
        },
      });
    }
    const actors = [this.player, ...this.npcs.filter((n) => this.visible(n) || n.fly)];
    for (const a of actors) {
      const { px, py, lift: hopLift } = a.pixel();
      let sx = px - camX;
      let lift = hopLift + (a.bob > 4 ? (a.sprite === "bird" ? 2 : 1) : 0);
      let col = a.frameColumn();
      if (a.fly) {
        const t = a.fly.t;
        sx += Math.round(a.fly.dx * t * 1.7);
        lift = Math.round(t * 1.2 + Math.sin(t / 4) * 2);
        col = 1 + (Math.floor(t / 3) % 2);
      }
      const groundY = py - camY;
      const sy = groundY - 4;
      if (sx < -16 || sx > SCREEN_W || sy - lift < -24 || sy - lift > SCREEN_H) continue;
      const row = rowFor(a.id, a.sprite, a.facing, flags);
      if (a.lastRow !== null && a.lastRow !== row) a.clunk = 8;
      a.lastRow = row;
      const clunk = a.clunk > 4 ? 1 : 0;
      items.push({
        base: py + TILE, order: 1,
        draw: () => {
          if (lift && (!a.fly || a.fly.t < 24)) drawShadow(g, sx, groundY, lift);
          drawCharacter(g, assets, a.sprite, col, row, sx, sy - lift + clunk);
          if (lg) eraseCharacter(lg, assets, a.sprite, col, row, sx, sy - lift + clunk);
          if (!lift) {
            const cells = a.step ? [[a.step.fx, a.step.fy], [a.step.tx, a.step.ty]] : [[a.x, a.y]];
            for (const [cx, cy] of cells) {
              if (tileAt(m, cx, cy) !== "tall_grass") continue;
              const art = this.tiles.resolve(m, cx, cy);
              drawGrassOverlay(g, assets, art, cx * TILE - camX, cy * TILE - camY, second, this.effects.grassSway(cx, cy));
            }
          }
        },
      });
    }
    items.sort((a, b) => a.base - b.base || a.order - b.order);
    for (const it of items) it.draw();
    for (const a of actors) {
      if (!a.emote) continue;
      const { px, py } = a.pixel();
      drawEmote(g, a.emote.kind, px - camX, py - camY - 4, a.emote.t);
    }
    this.effects.drawOver(g, camX, camY);

    // Atmosphere: particles, time-of-day tint, then lights above the tint.
    this.ambient.draw(g, camX, camY);
    if (m.def.outdoor) drawTint(g, tod);
    if (night) {
      for (const l of lamps) drawHalo(g, l.x, l.y);
      if (this.lightCanvas) g.drawImage(this.lightCanvas, 0, 0);
    }
    this.ambient.drawGlow(g, camX, camY);

    // UI layer.
    if (this.popup && this.popup.t > 0 && !this.transition.kind) drawMapName(g, this.popup.name, this.popup.t);
    if (this.species) {
      drawWindow(g, 48, 20, 64, 64, { shadow: true });
      drawImagePath(g, assets, speciesPath(this.species, "front"), 0, 0, 56, 56, 52, 24);
    }
    this.transition.draw(g);
    this.flash.draw(g, SCREEN_W, SCREEN_H);
    this.fader.draw(g, SCREEN_W, SCREEN_H);
  }
}

export { itemName };
