// The overworld scene: map rendering, grid movement, NPCs, trainers, warps,
// encounters, interactions, whiteout, and the host for the script
// interpreter. Entry point: createOverworldScene(ctx, opts).

import type { ArtImage,
  Ambient, BattleOutcome, BattleRequest, Dir, GameContext, MapDef, MapId, Quickened, Scene, ScriptCmd, ScriptId,
  SpeciesId, StillKey,
} from "../contracts";
import { FIELD_MOVES, SCREEN_H, SCREEN_W, STRUCTURES, TILE, speciesPath, stillPath, tilePath } from "../contracts";
import type { FieldMove } from "../contracts";
import { followerOn } from "../save";
import { createQuickened, healParty } from "../battle";
import { playClock } from "../engine/context";
import { mapTime } from "../engine/time";
import { clearScenes } from "../engine/core";
import { Fader, Shaker, Timers, drawImagePath } from "../engine/gfx";
import { drawWindow } from "../ui/kit";
import { nameEntry } from "../ui/nameEntry";
import { saveDialog } from "../ui/widgets";
import { drawSeedBig, seedIcon } from "../ui/seedArt";
import { Actor, dirTo, type Emote } from "./actor";
import { rollEncounter, type EncounterKind } from "./encounters";
import { tryRaftMove } from "./raft";
import { slidePath } from "./ice";
import {
  DIRS, OPPOSITE, buildMap, checkCond, refreshLegend, inSight, isMatWarp, isWalkable, tileAt, tileProps, tryMove,
  triggerAt, warpAt, type MapRuntime,
} from "./map";
import {
  BattleTransition, TOAST_MS, drawCharacter, drawEmote, drawGrassOverlay, drawMapName, drawShadow, drawStructure,
  drawToast, drawLilyRaft, eraseCharacter, isStaticObject, rowFor, structureImage,
} from "./render";
import { AmbientFx, effectiveAmbient } from "./ambient";
import { autotileMask } from "./autotile";
import { CameraRig, Flash, camForTile } from "./camera";
import { Effects, drawHiddenSparkle, drawWaterGlint } from "./effects";
import { Follower, followerLine } from "./follower";
import { bushId, hasItem, hiddenAt, hiddenFlag, pickedToday, unfoundHidden } from "./progress";
import { FIELD_MOVE_FX, fieldMoveFlag, fieldMoveOf } from "./fieldmove";
import { UPROOT, tryPushBoulder } from "./uproot";
import { canBattle, nurseryStep, readySeed, seedHint, seedStep, sprout } from "./nursery";
import { drawHalo, drawTint, lampInfo, makeScreenCanvas, nightGlass, windowGlow } from "./lights";
import { TileLayer } from "./tilelayer";
import { drawGlow } from "./glowRender";
import {
  ScriptAbort, giveItem, harvest, itemName, quickenedName, runScript, trainerBattle, type ScriptHost, type ToastKind,
} from "./script";
import { runStartMenu } from "./startMenu";
import { visitedGlideMaps, visitedTownFlag } from "./glide";
import { continuePosition } from "./continue";

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

const warnedStills = new Set<string>();

/** Maps under glass: battles there use the `glasshouse` backdrop. */
const GLASSHOUSE_MAPS: ReadonlySet<string> = new Set<MapId>(["palm_house", "glasshouse_city", "glasshouse_conservatory"]);

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
  /** The lead Quickened walking behind the player. */
  follower = new Follower();
  /** What the follower last showed (a species id or "seed"; null = inactive), to pop it back in on changes. */
  followerSpecies: string | null = null;
  /** The sprouting scene's seed window: crack stage and wobble frames left. */
  sprouting: { crack: number; shake: number } | null = null;
  /** A field move's user hopping in front of the player when no follower is out. */
  fieldHop: { species: SpeciesId; sport: boolean; x: number; y: number; t: number } | null = null;
  /** Full-screen story illustration over the map (still / stillClear). */
  still: { key: StillKey; img: ArtImage } | null = null;
  toasts: { kind: ToastKind; title: string; at: number }[] = [];

  constructor(private ctx: GameContext, private opts: OverworldOpts) {
    const pos = opts.mode === "continue" ? continuePosition(ctx.world, ctx.state.position) : ctx.state.position;
    this.player = new Actor("player", "player", pos.x, pos.y, pos.facing);
    this.host = this.makeHost();
    this.tiles = new TileLayer(ctx.assets);
    this.loadMap(pos.map, pos.x, pos.y, pos.facing, true);
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
    if (this.still) {
      // A script that forgot `stillClear` never leaves the illustration stuck up.
      this.busy++;
      await this.host.stillClear?.();
      this.busy--;
    }
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

  loadMap(id: MapId, x: number, y: number, facing: Dir, preserveRaft = false) {
    if (!preserveRaft) delete this.ctx.state.rafting;
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
    // Fresh actors on every entry reset UPROOT puzzles to their authored layout.
    this.npcs = (def.npcs ?? []).map((n) => new Actor(n.id, n.sprite, n.x, n.y, n.facing, n));
    this.follower.place(x, y, facing);
    this.camera.snap();
    this.effects.clear();
    this.ambientOverride = null;
    this.runStreak = 0;
    this.ctx.state.position = { map: id, x, y, facing };
    for (const town of visitedGlideMaps(this.ctx.state)) this.ctx.state.flags[visitedTownFlag(town)] = true;
    if (def.outdoor && id !== this.lastOutdoor && def.name) this.popup = { name: def.name, t: 0 };
    else if (!def.outdoor) this.popup = null;
    if (def.outdoor) this.lastOutdoor = id;
  }

  musicFor(def: MapDef) {
    const music = def.musicWhen?.find((entry) => checkCond(entry.when, this.ctx.state.flags))?.music ?? def.music;
    if (def.outdoor && music === "route" && mapTime(def, this.ctx.timeOfDay) === "night") return "route_night" as const;
    return music;
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

  /** Nursery yard boarders: NPC ids `boarder_1` / `boarder_2` show nursery slots 0 / 1. */
  boarderOf(a: Actor): Quickened | undefined {
    const m = /^boarder_([12])$/.exec(a.id);
    return m ? this.ctx.state.nursery?.slots[Number(m[1]) - 1] : undefined;
  }

  visible(a: Actor): boolean {
    if (a.away) return false;
    if (a.forceVisible !== null) return a.forceVisible;
    if (!a.def) return true;
    if (/^boarder_[12]$/.test(a.id) && !this.boarderOf(a)) return false;
    if (a.sprite === "item_pickup" && this.ctx.state.flags[this.pickedFlag(a.id)]) return false;
    return checkCond(a.def.visibleWhen, this.ctx.state.flags);
  }

  npcAt(x: number, y: number): Actor | undefined {
    return this.npcs.find((n) => this.visible(n) && n.occupies(x, y));
  }

  occupiedForPlayer = (x: number, y: number) => !!this.npcAt(x, y);
  /** Wanderers step around the follower too (it never blocks the player or scripts). */
  occupiedForNpc = (x: number, y: number) =>
    this.player.occupies(x, y) || !!this.npcAt(x, y) || (this.followerVisible() && this.follower.occupies(x, y));

  /** The Quickened that walks behind the player: the first healthy one (a seed rolls along too), else the lead. */
  followerMon(): Quickened | null {
    const party = this.ctx.state.party;
    if (!party.length || !followerOn(this.ctx.state.options) || this.ctx.state.rafting) return null;
    return party.find((q) => q.seed || q.hp > 0) ?? party[0];
  }

  followerVisible(): boolean {
    return this.followerSpecies !== null && !this.follower.tucked;
  }

  /** Keep the follower in step with the player; called each frame before the player ticks. */
  private updateFollower() {
    const mon = this.followerMon();
    const species = mon ? (mon.seed ? "seed" : mon.species) : null;
    const p = this.player;
    if (species !== this.followerSpecies) {
      // Turned on, first Quickened, or a new lead: it pops out of the player's tile on the next step.
      const wasShown = this.followerSpecies !== null && !this.follower.tucked;
      this.followerSpecies = species;
      if (species && wasShown) this.follower.pop = 12; // a new lead takes over in place
      else if (species) this.follower.place(p.x, p.y, p.facing);
    }
    const st = p.step;
    // After dismounting, keep it tucked until the player leaves a land tile.
    if (species && st && st.t === 0 && !tileProps(tileAt(this.map, st.fx, st.fy)).water) this.follower.follow(st.fx, st.fy, st.dur);
    this.follower.tick();
  }

  /** Bush rows: picked today? */
  private pickedToday = (harvestId: string) => pickedToday(this.ctx.state, harvestId);

  findNpc(id: string): Actor | undefined {
    return this.npcs.find((n) => n.id === id);
  }

  actor(who: string): Actor | undefined {
    return who === "player" ? this.player : this.findNpc(who);
  }

  /** Time of day on the current map (a map's forced `time` beats the clock). */
  time() {
    return mapTime(this.map?.def, this.ctx.timeOfDay);
  }

  backdrop(kind?: EncounterKind): BattleRequest["backdrop"] {
    const def = this.map.def;
    if (kind === "water" || (this.ctx.state.rafting && tileProps(tileAt(this.map, this.player.x, this.player.y)).water)) return "water";
    // Under glass: green-gold daylight; after dark, the dome lets the night in (outdoor maps tint too).
    if (GLASSHOUSE_MAPS.has(this.mapId)) return def.outdoor && this.time() === "night" ? "night" : "glasshouse";
    if (!def.outdoor) return "indoor";
    if (kind === "bog" || tileAt(this.map, this.player.x, this.player.y) === "bog") return "bog";
    if (this.time() === "night") return "night";
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
    this.updateFollower();
    if (this.followerEmote && ++this.followerEmote.t >= 40) this.followerEmote = null;
    const arrived = this.player.tick();
    this.camera.update(this.followCam());
    this.ambient.set(effectiveAmbient(this.ambientOverride ?? this.map.def.ambient, this.time()));
    this.ambient.update();
    this.effects.update();
    this.stepEffects();
    if (arrived && this.inputStep) {
      this.inputStep = false;
      this.ctx.state.position = { map: this.mapId, x: this.player.x, y: this.player.y, facing: this.player.facing };
      this.onArrive();
    }
    if (this.sprouting && this.sprouting.shake > 0) this.sprouting.shake--;
    if (this.fieldHop) this.fieldHop.t++;
    if (this.busy > 0 || this.dead) return;

    // A seed that has counted down sprouts as soon as the player has control (any map).
    const seed = readySeed(this.ctx.state.party);
    if (seed && !this.player.moving) {
      this.walking = false;
      void this.flow(() => this.sproutScene(seed));
      return;
    }

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
    const fs = this.follower.step;
    if (fs && fs.t === 1 && this.followerVisible() && tileAt(m, fs.tx, fs.ty) === "tall_grass") {
      this.effects.rustle(fs.tx, fs.ty, this.frame + 3);
    }
    if (this.follower.pop === 1 && this.followerVisible() && tileAt(m, this.follower.x, this.follower.y) !== "tall_grass") {
      this.effects.land(this.follower.x, this.follower.y);
    }
    for (const a of [this.player, ...this.npcs]) {
      if (a.wobble > 0) a.wobble--;
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
      const scriptRunning = this.busy > 0;
      void this.flow(() => runStartMenu(this.ctx, {
        scriptRunning,
        glide: async (destination) => {
          await this.fader.to("black", 10);
          this.ctx.audio.playSfx("run");
          this.loadMap(destination.map, destination.x, destination.y, destination.facing);
          this.playMapMusic();
          await this.timers.frames(6);
          await this.fader.to("clear", 14);
          if (this.map.def.onEnter) await this.runScript(this.map.def.onEnter);
        },
      }));
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
    const res = tryRaftMove(this.map, p.x, p.y, dir, !!this.ctx.state.rafting, hasItem(this.ctx.state, "lily_raft"), this.occupiedForPlayer);
    const running = this.ctx.input.held("b");
    if (res.kind === "walk") {
      if (res.rafting) this.ctx.state.rafting = true;
      else delete this.ctx.state.rafting;
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
    // Mounts need A and confirmation, like the other field interactions.
    // Blocked. Standing on a warp and pushing outward uses it (door mats: down only).
    const here = warpAt(this.map, p.x, p.y);
    if (here && res.kind === "blocked" && res.reason !== "occupied" && (!isMatWarp(this.map, p.x, p.y) || dir === "down")) {
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
    // Every step: nursery boarders grow, and seeds in the party count down.
    nurseryStep(st, this.ctx.data, this.ctx.rng);
    seedStep(st.party);
    const w = warpAt(this.map, p.x, p.y);
    if (w && (!isMatWarp(this.map, p.x, p.y) || p.facing === "down")) {
      this.walking = false;
      void this.flow(() => this.useWarp(w));
      return;
    }
    if (tileProps(tileAt(this.map, p.x, p.y)).slide) {
      const next = slidePath(this.map, p.x, p.y, p.facing, this.occupiedForPlayer)[0];
      if (next) {
        this.inputStep = true;
        this.walking = true;
        void p.begin(p.facing, next.kind === "ledge" ? HOP_FRAMES : WALK_FRAMES, { hop: next.kind === "ledge" });
        return;
      }
    }
    const trig = triggerAt(this.map, p.x, p.y, st.flags);
    if (trig) {
      this.walking = false;
      void this.flow(() => this.runScript(trig.script));
      return;
    }
    if (this.checkTrainers()) return;
    if (this.grace > 0) { this.grace--; return; }
    const enc = rollEncounter(this.map.def, tileAt(this.map, p.x, p.y), this.time(), this.ctx.rng, !!st.rafting, st.flags);
    if (enc) {
      this.walking = false;
      void this.flow(() => this.wildEncounter(enc.species, enc.level, enc.kind));
    }
  }

  private updateNpcs() {
    const rng = this.ctx.rng;
    for (const n of this.npcs) {
      if (n.def && n.sprite === "bird" && (n.away || this.visible(n))) { this.birdAi(n); continue; }
      if (!n.def || n.def.pushable || n.moving || !this.visible(n)) continue;
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
      void this.flow(() => npc.def?.pushable ? this.uproot(npc) : this.talk(npc));
      return true;
    }
    if (!npc && this.followerVisible() && !this.follower.moving && this.follower.x === fx && this.follower.y === fy) {
      void this.flow(() => this.talkFollower());
      return true;
    }
    const tile = tileAt(this.map, fx, fy);
    const raftMove = tryRaftMove(this.map, p.x, p.y, p.facing, !!this.ctx.state.rafting, hasItem(this.ctx.state, "lily_raft"), this.occupiedForPlayer);
    if (raftMove.kind === "mount") {
      void this.flow(() => this.mountRaft());
      return true;
    }
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
    // A trigger on a solid, interactable tile (a sensor post) can't be stepped on: A runs it.
    const props = tileProps(tile);
    if (props.interact && !isWalkable(this.map, fx, fy)) {
      const trig = triggerAt(this.map, fx, fy, this.ctx.state.flags);
      if (trig) {
        void this.flow(() => this.runScript(trig.script));
        return true;
      }
    }
    // Field moves (PRUNE): checked before hidden items so nothing is found through a bramble.
    const move = fieldMoveOf(tile);
    if (move) {
      void this.flow(() => this.useFieldMove(move, fx, fy));
      return true;
    }
    const hidden = hiddenAt(this.map.def, this.ctx.state.flags, fx, fy) ?? hiddenAt(this.map.def, this.ctx.state.flags, p.x, p.y);
    if (hidden) {
      void this.flow(() => this.findHidden(hidden));
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
    const boarder = this.boarderOf(npc);
    if (boarder && !def.script) {
      await this.talkBoarder(npc, boarder);
      return;
    }
    if (!isStaticObject(this.ctx.assets, npc.sprite)) npc.facing = OPPOSITE[this.player.facing];
    const bush = bushId(npc.id);
    if (def.script) await this.runScript(def.script);
    else if (npc.sprite === "item_pickup") await this.pickup(npc);
    else if (bush) {
      // A bush placed without its script still works: rose bushes give hips, the rest berries.
      console.warn(`[overworld] bush "${npc.id}" on ${this.mapId} has no script; guessing its fruit`);
      await harvest(this.host, bush, /rose|hip/i.test(bush) ? "rose_hip" : "wild_berry", 2);
    }
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

  /** A hidden item under A: flag first (so it can never be found twice), then the find. */
  private async findHidden(h: NonNullable<MapDef["hidden"]>[number]) {
    this.ctx.state.flags[hiddenFlag(this.mapId, h.x, h.y)] = true;
    await giveItem(this.host, h.item, h.qty ?? 1, { found: true });
  }

  /** Talking to the follower: it turns to you, chirps its cry, and you get a line about how it's doing. */
  private async talkFollower() {
    const ctx = this.ctx;
    const mon = this.followerMon();
    if (!mon) return;
    const f = this.follower;
    const p = this.player;
    if (p.x < f.x) f.flip = false;
    else if (p.x > f.x) f.flip = true;
    f.pop = 12;
    if (mon.seed) {
      this.followerEmote = { kind: "...", t: 0 };
      await this.timers.frames(40);
      await ctx.ui.say(`The SEED wobbles. ${seedHint(mon.seed.steps)}`);
      return;
    }
    const sp = ctx.data.species?.[mon.species];
    const line = followerLine({
      name: quickenedName(ctx, mon), friendship: mon.friendship, hpFrac: mon.stats.hp > 0 ? mon.hp / mon.stats.hp : 0,
      status: mon.status, activity: sp?.activity ?? "any", time: this.time(), outdoor: this.map.def.outdoor,
    }, ctx.rng());
    const cry = mon.hp > 0 ? ctx.audio.playCry(mon.species) : Promise.resolve();
    this.followerEmote = { kind: line.emote, t: 0 };
    await Promise.all([this.timers.frames(40), cry]);
    await ctx.ui.say(line.text);
  }
  followerEmote: { kind: Emote; t: number } | null = null;

  /** A nursery boarder in the yard: it turns to you, chirps, and you hear how it's doing. */
  private async talkBoarder(npc: Actor, q: Quickened) {
    const ctx = this.ctx;
    const name = quickenedName(ctx, q);
    npc.facing = this.player.x < npc.x ? "left" : "right";
    npc.bob = 8;
    await ctx.audio.playCry(q.species);
    const lines = [
      `${name} is soaking up the sun.`,
      `${name} rustles happily in the yard.`,
      `${name} is stretching its roots.`,
    ];
    await ctx.ui.say(lines[Math.floor(ctx.rng() * lines.length)]);
  }

  /** Who performs a field move: the follower if it's out, else the first non-seed. */
  private fieldMoveUser(): Quickened | undefined {
    const party = this.ctx.state.party;
    const f = this.followerVisible() ? this.followerMon() : null;
    if (f && !f.seed) return f;
    return party.find(canBattle) ?? party.find((q) => !q.seed);
  }

  /** NPC field move: confirmation, then one legal push of the current actor. */
  async uproot(boulder: Actor) {
    const ctx = this.ctx;
    const hasSaxifrage = hasItem(ctx.state, UPROOT.item);
    if (!hasSaxifrage) { await ctx.ui.say(UPROOT.locked); return; }
    if (!(await ctx.ui.yesNo(UPROOT.prompt))) return;
    const dir = this.player.facing;
    const push = tryPushBoulder(this.map, boulder, dir, hasSaxifrage, (x, y) => !!this.npcAt(x, y));
    if (push.kind !== "push") { await ctx.ui.say(push.text); return; }
    ctx.audio.playSfx("prune");
    this.shaker.start(4);
    await boulder.begin(dir, NPC_SCRIPT_FRAMES);
  }

  /** Field move flow: tile property -> key item -> prompt -> hop + particles -> flag. */
  async useFieldMove(move: FieldMove, x: number, y: number) {
    const ctx = this.ctx;
    const fx = FIELD_MOVE_FX[move];
    if (!hasItem(ctx.state, FIELD_MOVES[move].item)) {
      await ctx.ui.say(fx.locked);
      return;
    }
    const user = this.fieldMoveUser();
    if (!user || !(await ctx.ui.yesNo(fx.prompt))) return;
    await ctx.ui.say(`${quickenedName(ctx, user)} used ${fx.name}!`);
    // The user hops: the follower in place, or (follower off) a quick hop in front of the player.
    const followerUser = this.followerVisible() && this.followerMon() === user;
    if (followerUser) this.follower.pop = 12;
    else {
      const { dx, dy } = DIRS[this.player.facing];
      this.fieldHop = { species: user.species, sport: user.sport, x: this.player.x * TILE + dx * 8, y: this.player.y * TILE + dy * 8, t: 0 };
    }
    await this.timers.frames(14);
    ctx.audio.playSfx(fx.sfx);
    this.effects.snip(x, y, this.frame);
    this.shaker.start(4);
    ctx.state.flags[fieldMoveFlag(move, this.mapId, x, y)] = true;
    await this.timers.frames(22);
    this.fieldHop = null;
  }

  /** The seed sprouts: it wobbles and cracks, a flash, the plant appears, jingle, nickname. */
  async sproutScene(q: Quickened) {
    const ctx = this.ctx;
    try {
      await ctx.ui.say("Oh? The SEED is moving!");
      this.sprouting = { crack: 0, shake: 0 };
      await this.timers.frames(20);
      for (let c = 1; c <= 3; c++) {
        this.sprouting.shake = 18;
        await this.timers.frames(26);
        this.sprouting.crack = c;
        ctx.audio.playSfx("sprout");
        await this.timers.frames(c === 3 ? 30 : 18);
      }
      const flash = this.flash.run("white", 36);
      // The flash holds solid for its first frames: swap the seed for the plant under it.
      this.sprouting = null;
      sprout(ctx.state, q, this.mapId);
      this.species = q.species;
      this.speciesSport = q.sport;
      await flash;
      const name = quickenedName(ctx, q);
      void ctx.audio.playCry(q.species);
      const jingle = ctx.audio.playJingle("sprouted");
      await Promise.all([ctx.ui.say(`${name} sprouted from the SEED!`), jingle]);
      if (await ctx.ui.yesNo(`Give a nickname to ${name}?`)) {
        const nick = await this.host.nameEntry({ kind: "nickname", species: q.species, defaultName: name, max: 10 });
        if (nick && nick.toUpperCase() !== name) q.nickname = nick;
      }
    } finally {
      // Never leave a seed stuck at zero (it would sprout again every frame).
      if (q.seed) sprout(ctx.state, q, this.mapId);
      this.sprouting = null;
      this.species = null;
      this.speciesSport = false;
    }
  }
  /** Sport colouring for the species window (sprouted sports). */
  speciesSport = false;

  /** A species icon (sport palette when the art registry provides it), falling back to frame 1 and the plain palette. */
  speciesImg(id: SpeciesId, kind: "icon" | "icon__2", sport: boolean): ArtImage | undefined {
    const a = this.ctx.assets;
    if (kind === "icon__2" && !a.has(speciesPath(id, kind))) kind = "icon";
    return (sport ? a.image(speciesPath(id, kind, { sport: true })) : undefined)
      ?? a.image(speciesPath(id, kind)) ?? (kind === "icon__2" ? this.speciesImg(id, "icon", sport) : undefined);
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

  async mountRaft() {
    if (!(await this.ctx.ui.yesNo("Ride the LILY RAFT?"))) return;
    const p = this.player;
    const move = tryRaftMove(this.map, p.x, p.y, p.facing, !!this.ctx.state.rafting, hasItem(this.ctx.state, "lily_raft"), this.occupiedForPlayer);
    if (move.kind !== "mount") return;
    this.ctx.state.rafting = true;
    p.bumpAnim = 0;
    this.inputStep = true;
    await p.begin(p.facing, WALK_FRAMES);
  }

  async emote(a: Actor, kind: Emote) {
    a.emote = { kind, t: 0 };
    await this.timers.frames(40);
  }

  async useWarp(w: MapDef["warps"][number]) {
    const facing = w.facing ?? this.player.facing;
    this.ctx.audio.playSfx("door");
    // GBC-style stepped fade: quick out, a beat of black, a gentler fade in.
    await this.fader.to("black", 10);
    let preserveRaft = false;
    const destination = this.ctx.world.maps[w.to];
    if (this.ctx.state.rafting && destination) {
      const arrival = buildMap(destination);
      refreshLegend(arrival, this.ctx.state.flags);
      preserveRaft = !!tileProps(tileAt(arrival, w.toX, w.toY)).water;
    }
    this.loadMap(w.to, w.toX, w.toY, facing, preserveRaft);
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

  async wildEncounter(species: SpeciesId, level: number, kind: EncounterKind) {
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

  /** Fade to a story illustration. Missing art is skipped (logged once) so scripts still read. */
  async showStill(key: StillKey) {
    const assets = this.ctx.assets;
    const path = stillPath(key);
    let img = assets.image(path);
    if (!img) {
      await assets.loadAll([path]);
      img = assets.image(path);
    }
    if (!img) {
      if (!warnedStills.has(key)) { warnedStills.add(key); console.warn(`[overworld] still "${key}" has no art yet; skipping it`); }
      return;
    }
    if (this.still?.key === key) return;
    if (this.fader.level < 1) await this.fader.to("black", this.still ? 12 : 16);
    this.still = { key, img };
    this.popup = null;
    await this.timers.frames(8);
    await this.fader.to("clear", 20);
  }

  /** Back from the illustration to the map; if the script already faded to black, stay black. */
  async clearStill() {
    if (!this.still) return;
    if (this.fader.level >= 1) { this.still = null; return; }
    await this.fader.to("black", 16);
    this.still = null;
    await this.timers.frames(6);
    await this.fader.to("clear", 16);
  }

  /** The bush shakes, flips to its picked row, and sheds a little burst of leaves and fruit. */
  async harvestFx(harvestId: string) {
    const n = this.findNpc(`bush:${harvestId}`);
    const { dx, dy } = DIRS[this.player.facing];
    const tx = n?.x ?? this.player.x + dx;
    const ty = n?.y ?? this.player.y + dy;
    if (n) n.wobble = 12;
    this.effects.leafBurst(tx, ty, this.frame, /rose|hip/i.test(harvestId) ? "hip" : "berry");
    // Let the burst land before the text box freezes the world.
    await this.timers.frames(24);
  }

  /** One toast at a time, oldest first; timed in real milliseconds so text boxes above don't freeze them. */
  private drawToasts(g: CanvasRenderingContext2D) {
    const t = this.toasts[0];
    if (!t || this.transition.kind) return;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (t.at < 0) t.at = now;
    const ms = now - t.at;
    if (ms > TOAST_MS.in + TOAST_MS.hold + TOAST_MS.out) { this.toasts.shift(); return; }
    drawToast(g, t.kind, t.title, ms);
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
          const res = tryRaftMove(self.map, self.player.x, self.player.y, dir, !!ctx.state.rafting, hasItem(ctx.state, "lily_raft"));
          if (res.kind === "walk" || res.kind === "ledge") {
            if (res.rafting) ctx.state.rafting = true;
            else delete ctx.state.rafting;
          }
          await self.player.begin(dir, res.kind === "ledge" ? HOP_FRAMES : WALK_FRAMES, { hop: res.kind === "ledge" });
          while (tileProps(tileAt(self.map, self.player.x, self.player.y)).slide) {
            const next = slidePath(self.map, self.player.x, self.player.y, dir, self.occupiedForPlayer)[0];
            if (!next) break;
            await self.player.begin(dir, next.kind === "ledge" ? HOP_FRAMES : WALK_FRAMES, { hop: next.kind === "ledge" });
          }
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
      still: (key) => self.showStill(key),
      stillClear: () => self.clearStill(),
      harvestFx: (id) => self.harvestFx(id),
      toast(kind, title) {
        self.popup = null; // the map-name sign and a toast never share the top of the screen
        self.toasts.push({ kind, title, at: -1 });
      },
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
    const tod = this.time();
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
    // Hidden items: a faint twinkle every few seconds on unfound tiles in view.
    for (const h of unfoundHidden(m.def, flags)) {
      const sx = h.x * TILE - camX;
      const sy = h.y * TILE - camY;
      if (sx < -TILE || sy < -TILE || sx > SCREEN_W || sy > SCREEN_H) continue;
      drawHiddenSparkle(g, h.x, h.y, sx, sy, this.frame);
    }

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
      const row = rowFor(a.id, a.sprite, a.facing, flags, this.pickedToday, a.def?.stateFlag);
      if (a.wobble > 0) sx += [0, 1, 1, 0, -1, -1][a.wobble % 6];
      if (a.lastRow !== null && a.lastRow !== row) a.clunk = 8;
      a.lastRow = row;
      const clunk = a.clunk > 4 ? 1 : 0;
      const boarder = this.boarderOf(a);
      if (boarder) {
        // Nursery boarders walk the yard as their party icons (2-frame bob, mirrored when facing right).
        const moving = !!a.step;
        const kind = (moving ? a.frameColumn() > 0 : Math.floor((this.frame + a.home.x * 7) / 24) % 2 === 1)
          && assets.has(speciesPath(boarder.species, "icon__2")) ? "icon__2" : "icon";
        items.push({
          base: py + TILE, order: 1,
          draw: () => {
            const img = this.speciesImg(boarder.species, kind, boarder.sport);
            if (!img) return;
            const by = groundY - 3 - lift - (a.bob > 4 ? 1 : 0);
            g.save();
            if (a.facing === "right") { g.translate(sx + TILE, by); g.scale(-1, 1); g.drawImage(img, 0, 0); }
            else g.drawImage(img, sx, by);
            g.restore();
          },
        });
        continue;
      }
      items.push({
        base: py + TILE, order: 1,
        draw: () => {
          if (lift && (!a.fly || a.fly.t < 24)) drawShadow(g, sx, groundY, lift);
          if (a === this.player && this.ctx.state.rafting) drawLilyRaft(g, sx, groundY);
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
    const mon = this.followerVisible() ? this.followerMon() : null;
    if (mon) {
      const f = this.follower;
      const { px, py, lift } = f.pixel();
      const sx = px - camX;
      const groundY = py - camY;
      const sy = groundY - 3;
      if (sx > -16 && sx < SCREEN_W && sy - lift > -24 && sy - lift < SCREEN_H) {
        const frame2 = f.iconFrame(this.frame) === 1;
        const kind = frame2 && assets.has(speciesPath(mon.species, "icon__2")) ? "icon__2" : "icon";
        const wilted = mon.hp <= 0 && !mon.seed;
        items.push({
          base: py + TILE, order: 0.5,
          draw: () => {
            if (lift) drawShadow(g, sx, groundY, lift);
            const img = mon.seed ? seedIcon(assets, frame2 ? 1 : 0) : this.speciesImg(mon.species, kind, mon.sport);
            const dy = sy - lift + (wilted ? 1 : 0);
            if (img) {
              for (const layer of lg ? [g, lg] : [g]) {
                layer.save();
                if (layer === lg) layer.globalCompositeOperation = "destination-out";
                if (f.flip) { layer.translate(sx + TILE, dy); layer.scale(-1, 1); layer.drawImage(img, 0, 0); }
                else layer.drawImage(img, sx, dy);
                layer.restore();
              }
            }
            if (!lift) {
              const cells = f.step ? [[f.step.fx, f.step.fy], [f.step.tx, f.step.ty]] : [[f.x, f.y]];
              for (const [cx, cy] of cells) {
                if (tileAt(m, cx, cy) !== "tall_grass") continue;
                const art = this.tiles.resolve(m, cx, cy);
                drawGrassOverlay(g, assets, art, cx * TILE - camX, cy * TILE - camY, second, this.effects.grassSway(cx, cy));
              }
            }
          },
        });
      }
    }
    if (this.fieldHop) {
      const h = this.fieldHop;
      const img = this.speciesImg(h.species, Math.floor(h.t / 4) % 2 ? "icon__2" : "icon", h.sport);
      const lift = Math.round(Math.abs(Math.sin((Math.min(h.t, 24) / 12) * Math.PI)) * 5);
      const hx = h.x - camX;
      const hy = h.y - camY - 3;
      items.push({
        base: h.y + TILE + 1, order: 2,
        draw: () => {
          drawShadow(g, hx, hy + 3, Math.max(1, lift));
          if (img) g.drawImage(img, hx, hy - lift);
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
    if (this.followerEmote && mon) {
      {
        const { px, py } = this.follower.pixel();
        drawEmote(g, this.followerEmote.kind, px - camX, py - camY - 2, this.followerEmote.t);
      }
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
    if (m.def.dark) {
      const { px, py } = this.player.pixel();
      drawGlow(g, camX, camY, { x: px / TILE, y: py / TILE }, this.tiles.lights, hasItem(ctx.state, "foxfire_lantern"));
    }

    // Story illustration (text boxes and the species window draw over it).
    if (this.still) g.drawImage(this.still.img, 0, 0, SCREEN_W, SCREEN_H);

    // UI layer.
    if (this.popup && this.popup.t > 0 && !this.transition.kind) drawMapName(g, this.popup.name, this.popup.t);
    this.drawToasts(g);
    if (this.sprouting) {
      drawWindow(g, 48, 20, 64, 64, { shadow: true });
      const wob = this.sprouting.shake > 0 ? [0, 1, 1, 0, -1, -1][this.sprouting.shake % 6] : 0;
      drawSeedBig(g, assets, 52 + wob, 24, this.sprouting.crack);
    } else if (this.species) {
      drawWindow(g, 48, 20, 64, 64, { shadow: true });
      const sportImg = this.speciesSport ? assets.image(speciesPath(this.species, "front", { sport: true })) : undefined;
      if (sportImg) g.drawImage(sportImg, 52, 24);
      else drawImagePath(g, assets, speciesPath(this.species, "front"), 0, 0, 56, 56, 52, 24);
    }
    this.transition.draw(g);
    this.flash.draw(g, SCREEN_W, SCREEN_H);
    this.fader.draw(g, SCREEN_W, SCREEN_H);
  }
}

export { itemName };
