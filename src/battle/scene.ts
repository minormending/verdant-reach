// The battle scene: Crystal layout, intros, menus, animations and the
// post-battle sequence. Turn logic lives in ./logic (pure); this file plays
// the event log back and drives the menus.

import type {
  BattleOutcome, BattleRequest, GameContext, ItemId, MoveId, Quickened, Scene, SpeciesId, StatusId, TrainerDef,
  TrainerPortraitKey, TypeId, Weather,
} from "../contracts";
import { portraitPath, speciesPath, SCREEN_W, SCREEN_H, TEXTBOX, UI, uiPath } from "../contracts";
import { chooseFoeAction, type AiKind } from "./logic/ai";
import {
  active, canContinue, canFight, createBattleState, doSwitch, firstHealthy, hasUsableMove, resolveTurn, sendOutFoe, targetsFoe,
  type Action, type BattleEvent, type BattleState, type Side,
} from "./logic/battle";
import { attemptCapture, tryRun } from "./logic/capture";
import {
  addFriendship, distributeExp, expProgress, expYield, gainEvs, gainExp, growthTarget, type LevelUp,
} from "./logic/exp";
import { applyItem, consumeItem, isMedicine } from "./logic/items";
import { getItem, getMove, getSpecies, itemName, qName, speciesName, TYPE_NAMES } from "./logic/lookup";
import { calcStats, createQuickened, trainerIvs } from "./logic/stats";
import { finishWandererBattle, wandererFlees, wandererHealth, WANDERER_LEVEL } from "../overworld/roaming";
import { createTrainerQuickened, graftCollarText } from "./logic/trainer";
import {
  drawBackdrop, drawEnemyHud, drawGraftCollarPlaceholder, drawHudBacking, drawPlayerHud, drawPodRow, drawStatWindow, drawTrainer, drawVersusBanner, newHud,
  type BannerKind, type HudView,
} from "./hud";
import {
  drawWeather, ENEMY_CENTER, ENEMY_GROUND, Fx, line, PLAYER_CENTER, PLAYER_GROUND, R, SpriteFxHost, type Pt,
} from "./fx";
import { animFor } from "./anims";
import { playMoveFx } from "./movefx";
import { frontPaths, SpritePlayback, type FrontKind } from "../screens/kit/idle";
import { battleAnimsOn } from "../save";
import { worldTime } from "../engine/time";
import { effectivenessHint, FoeKnowledge, type EffHint } from "./hints";
import { Flow } from "../screens/kit/flow";
import { drawPod, drawSpecies, drawTiny, pad, preload, silhouette, speciesImage, drawSpeciesImage, TYPE_COLORS } from "../screens/kit/draw";
import { fmt, hasHerbarium, markCaught, markSeen, playerName } from "../screens/kit/text";
import { Menu, ScreenUi } from "../screens/kit/widgets";
import { learnMoveFlow } from "../screens/flows/learn";
import { runGrowth } from "../screens/flows/growth";
import { askNickname } from "../screens/flows/nickname";
import { showHerbariumEntry } from "../screens/herbarium";
import { partyScreen } from "../screens/party";

import { ENEMY_HOME, PLAYER_HOME, COMMAND_AREA, MOVE_AREA, MOVE_INFO_AREA } from "./layout";
/** Where a thrown pod comes to rest on the foe's battle ground. */
const POD_REST = { x: ENEMY_CENTER.x - 6, y: ENEMY_GROUND.y - 12 };

interface SpriteView {
  species: SpeciesId | null;
  sport: boolean;
  visible: boolean;
  dx: number;
  dy: number;
  drop: number;
  scale: number;
  silhouette: string | null;
  hidden: boolean; // blink
}
const newSprite = (): SpriteView => ({ species: null, sport: false, visible: false, dx: 0, dy: 0, drop: 0, scale: 1, silhouette: null, hidden: false });

interface TrainerView {
  key: TrainerPortraitKey;
  visible: boolean;
  dx: number;
}

interface PodView { x: number; y: number; open: boolean; visible: boolean; tilt: number; flash: boolean; dim: boolean }

type Choice =
  | { kind: "move"; slot: number }
  | { kind: "switch"; index: number }
  | { kind: "used_item" }
  | { kind: "fled" }
  | { kind: "run_failed" }
  | { kind: "caught" }
  | { kind: "pod_failed" };

export function createBattleScene(ctx: GameContext, req: BattleRequest, done: (o: BattleOutcome) => void): Scene {
  const b = new BattleScene(ctx, req, done);
  if (import.meta.env?.DEV) (window as unknown as { __battle?: BattleScene }).__battle = b;
  return b;
}

class BattleScene implements Scene {
  transparent = false;
  private flow: Flow;
  private ui: ScreenUi;
  private fx = new Fx();
  private sprites = new SpriteFxHost();
  private frame = 0;
  private started = false;
  private finished = false;

  private s!: BattleState;
  private trainer?: TrainerDef;
  private trainerName = "";
  private aiKind: AiKind = "wild";
  private backdrop: NonNullable<BattleRequest["backdrop"]>;
  private knowledge: FoeKnowledge;

  private enemy = newSprite();
  private player = newSprite();
  /** Front-sprite playback per side (Crystal-style intros; the player's side shows a back sprite). */
  private playback: [SpritePlayback, SpritePlayback] = [new SpritePlayback(":battle0"), new SpritePlayback(":battle1")];
  private enemyTrainer: TrainerView = { key: "gardener", visible: false, dx: 0 };
  private playerTrainer: TrainerView = { key: "player_back", visible: false, dx: 0 };
  private enemyHud: HudView = newHud();
  private playerHud: HudView = newHud();
  private podRows = { player: false, enemy: false, playerDx: 0, enemyDx: 0, t: 1 };
  private thrown: PodView = { x: 0, y: 0, open: false, visible: false, tilt: 0, flash: false, dim: false };
  private shake = { x: 0, y: 0 };
  private fade = 0; // 0..1 to black
  private weather: Weather | null = null;
  private overlayDraw: ((g: CanvasRenderingContext2D) => void) | null = null;
  private banner: { kind: BannerKind; f: number; len: number } | null = null;
  /** True while the player is choosing in a menu (idle status reminders play). */
  private idle = false;

  private lastCmd = 0;
  private lastMove = 0;
  private runAttempts = 0;
  private leveled = new Set<string>();

  constructor(private ctx: GameContext, private req: BattleRequest, private done: (o: BattleOutcome) => void) {
    this.flow = new Flow(ctx.input);
    this.ui = new ScreenUi(ctx, this.flow, { blip: false });
    this.ui.tb.autoFrames = 45;
    this.backdrop = req.backdrop ?? (worldTime(ctx) === "night" ? "night" : "grass");
    this.knowledge = new FoeKnowledge([...ctx.state.herbarium.seen]);
  }

  // -------------------------------------------------------------------------
  // Scene
  // -------------------------------------------------------------------------

  update(): void {
    if (!this.started) {
      this.started = true;
      this.main().then(
        (o) => this.finish(o),
        (e) => {
          console.error("[battle] crashed", e);
          this.finish(this.req.kind === "wild" ? "fled" : "won");
        },
      );
    }
    this.frame++;
    this.fx.update();
    this.sprites.update();
    if (this.playerHud.flash > 0) this.playerHud.flash--;
    if (this.banner) this.banner.f++;
    if (this.idle && this.frame % 120 === 60) this.idleStatus();
    this.flow.tick();
  }

  private finish(o: BattleOutcome) {
    if (this.finished) return;
    this.finished = true;
    this.done(o);
  }

  draw(g: CanvasRenderingContext2D): void {
    const sh = this.fx.shakeOffset();
    g.save();
    g.translate(this.shake.x + sh.x, this.shake.y + sh.y);
    drawBackdrop(this.ctx, g, this.backdrop, this.frame);
    drawWeather(g, this.weather, this.frame);
    drawHudBacking(g, this.backdrop);
    this.fx.drawBack(g);

    // Enemy side
    if (this.enemyTrainer.visible) {
      drawTrainer(this.ctx, g, this.enemyTrainer.key, ENEMY_HOME.x + this.enemyTrainer.dx, ENEMY_HOME.y, {}, this.frame);
    }
    this.drawSprite(g, this.enemy, "front", ENEMY_HOME, ENEMY_HOME.y + 64, 1);
    // Player side
    if (this.playerTrainer.visible) {
      drawTrainer(this.ctx, g, "player_back", PLAYER_HOME.x + this.playerTrainer.dx, PLAYER_HOME.y, {}, this.frame);
    }
    this.drawSprite(g, this.player, "back", PLAYER_HOME, PLAYER_HOME.y + 64, 0);

    if (this.podRows.enemy && this.trainer) drawPodRow(g, this.s.sides[1].party, 1, this.podRows.enemyDx, this.podRows.t);
    if (this.podRows.player) drawPodRow(g, this.ctx.state.party, 0, this.podRows.playerDx, this.podRows.t);

    const caught = this.s && this.s.wild && !!this.enemyHud.q && this.ctx.state.herbarium.caught.includes(this.enemyHud.q.species);
    drawEnemyHud(this.ctx, g, this.enemyHud, caught, this.frame);
    drawPlayerHud(this.ctx, g, this.playerHud, this.frame);

    if (this.thrown.visible) this.drawThrownPod(g);
    this.fx.draw(g);
    g.restore();

    if (!this.ui.tb.visible && this.ui.overlays.length === 0) {
      this.ctx.ui.drawWindow(g, TEXTBOX.x, TEXTBOX.y, TEXTBOX.w, TEXTBOX.h);
    }
    this.ui.draw(g);
    this.overlayDraw?.(g);
    if (this.banner && this.trainer) {
      const t = this.trainer;
      drawVersusBanner(this.ctx, g, this.banner.kind, t.portrait, fmt(this.ctx, t.className).toUpperCase(), fmt(this.ctx, t.name).toUpperCase(), this.banner.f, this.banner.len, this.frame);
    }
    this.fx.drawFlash(g);
    if (this.fade > 0) {
      const step = Math.ceil(this.fade * 4) / 4;
      g.fillStyle = `rgba(0,0,0,${step})`;
      g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
  }

  private drawSprite(g: CanvasRenderingContext2D, v: SpriteView, kind: "front" | "back", home: { x: number; y: number }, clipBottom: number, side: Side) {
    if (!v.visible || !v.species || v.hidden) return;
    const m = this.sprites.mods(side, this.frame);
    if (m.hidden) return;
    const x = home.x + v.dx + m.dx;
    const y = home.y + v.dy + m.dy;
    const sil = v.silhouette ?? m.tint ?? undefined;
    const pose = kind === "front" ? this.idlePose(v, side, !!sil) : kind;
    drawSpecies(this.ctx, g, v.species, pose, x, y, { sport: v.sport, scale: v.scale, drop: v.drop, clipBottom, silhouette: sil });
    if (kind === "front" && side === 1 && this.trainer?.team[this.s.sides[1].active]?.grafted) {
      drawGraftCollarPlaceholder(g, x, y, { scale: v.scale, drop: v.drop, clipBottom, silhouette: sil });
    }
    if (m.shine !== null && !sil && v.scale === 1) this.drawShine(g, v, pose, x, y + v.drop, m.shine, clipBottom);
  }

  /** Idle breathing for front sprites; still while dormant/frozen, wilting, flashing or scaling. */
  private idlePose(v: SpriteView, side: Side, silhouetted: boolean): FrontKind {
    if (!v.species || silhouetted || v.scale !== 1 || v.drop !== 0) return "front";
    const status = this.hudOf(side).status;
    if (status === "dormant" || status === "frostbite") return "front";
    return this.playback[side].kind(v.species, this.frame);
  }

  /**
   * The species on `side` has just appeared (with its cry): play its front
   * intro once. BATTLE ANIM OFF skips it (straight to the idle). The player's
   * side shows a back sprite, which has no animation.
   */
  private startIntro(side: Side) {
    const v = this.viewOf(side);
    const pb = this.playback[side];
    if (side === 0 || !v.species || !battleAnimsOn(this.ctx.state?.options)) { pb.reset(); return; }
    pb.appear(v.species, this.frame);
  }

  /** Wait out the rest of a side's intro (so the next beat doesn't cut it off). */
  private introLeft(side: Side): number {
    const v = this.viewOf(side);
    return v.species ? this.playback[side].remaining(v.species, this.frame) : 0;
  }

  /** A diagonal white glint sweeping across a sprite (masked to its shape). */
  private drawShine(g: CanvasRenderingContext2D, v: SpriteView, kind: FrontKind | "back", x: number, y: number, t: number, clipBottom: number) {
    if (!v.species) return;
    const size = 64;
    const img = speciesImage(this.ctx, v.species, kind, { sport: v.sport });
    const white = silhouette(`${v.species}:${kind}:${v.sport ? "s" : ""}`, img, "#f8f8f8");
    const c = Math.round(-8 + t * (size * 2 + 8));
    g.save();
    g.beginPath();
    for (let r = 0; r < size; r++) {
      if (y + r >= clipBottom) break;
      g.rect(x + c - r, y + r, 5, 1);
      g.rect(x + c - r + 8, y + r, 2, 1);
    }
    g.clip();
    drawSpeciesImage(g, white, kind, x, y);
    g.restore();
  }

  /** The thrown pod (art if present, else the procedural pod), rocked by `tilt`. */
  private drawThrownPod(g: CanvasRenderingContext2D) {
    const p = this.thrown;
    const img = this.ctx.assets.image(uiPath(p.open ? "pod_open" : "pod"));
    const x = Math.round(p.x), y = Math.round(p.y);
    if (!img) {
      drawPod(g, x, y, p.dim ? "wilted" : "ok", p.open ? 3 : 0);
      return;
    }
    const src: CanvasImageSource = p.flash ? silhouette(`pod:${p.open}`, img, "#f8f8f8") : img;
    const h = img.height, w = img.width;
    // rock about the base: shear rows by tilt (top moves most)
    for (let r = 0; r < h; r++) {
      const off = Math.round((p.tilt * (h - 1 - r)) / (h - 1));
      g.drawImage(src, 0, r, w, 1, x - 2 + off, y - 1 + r, w, 1);
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private get data() { return this.ctx.data; }
  private get party() { return this.ctx.state.party; }
  private me(): Quickened { return active(this.s, 0); }
  private foe(): Quickened { return active(this.s, 1); }

  private say(text: string, mode: "wait" | "auto" | "hold" = "auto") {
    return this.ui.say(fmt(this.ctx, text), mode);
  }

  private setHud(side: Side) {
    const q = active(this.s, side);
    const h = side === 0 ? this.playerHud : this.enemyHud;
    h.q = q;
    h.hp = q.hp;
    h.level = q.level;
    h.status = q.status;
    h.exp = expProgress(this.data, q);
  }

  private hudOf(side: Side) { return side === 0 ? this.playerHud : this.enemyHud; }
  private viewOf(side: Side) { return side === 0 ? this.player : this.enemy; }
  private centerOf(side: Side) { return side === 0 ? PLAYER_CENTER : ENEMY_CENTER; }
  private groundOf(side: Side) { return side === 0 ? PLAYER_GROUND : ENEMY_GROUND; }

  /** Slide a HUD in from its side of the screen. */
  private async slideHud(side: Side) {
    const h = this.hudOf(side);
    h.visible = true;
    const from = side === 0 ? SCREEN_W : -SCREEN_W;
    await this.flow.animate(10, (_i, t) => { h.dx = Math.round(from * (1 - t) * (1 - t)); });
    h.dx = 0;
  }

  private idleStatus() {
    for (const side of [0, 1] as Side[]) {
      const h = this.hudOf(side);
      const v = this.viewOf(side);
      if (h.visible && h.status && v.visible && !this.fx.busy) this.fx.statusIdle(this.centerOf(side), h.status);
    }
  }

  private async preload() {
    const paths = new Set<string>();
    for (const q of this.party) {
      paths.add(speciesPath(q.species, "back"));
      paths.add(speciesPath(q.species, "front"));
      paths.add(speciesPath(q.species, "icon"));
    }
    for (const q of this.s.sides[1].party) {
      for (const p of frontPaths(q.species)) paths.add(p);
    }
    paths.add(portraitPath("player_back"));
    for (const u of ["pod", "pod_open", "battle_ground"] as const) paths.add(uiPath(u));
    if (this.trainer) paths.add(portraitPath(this.trainer.portrait));
    try {
      await Promise.race([preload(this.ctx, [...paths]), this.flow.wait(240)]);
    } catch {
      /* missing art falls back to placeholders */
    }
  }

  // -------------------------------------------------------------------------
  // Main
  // -------------------------------------------------------------------------

  private async main(): Promise<BattleOutcome> {
    const ctx = this.ctx;
    const req = this.req;
    const lead = firstHealthy(this.party);
    if (lead < 0) {
      console.error("[battle] no healthy Quickened in the party");
      return "lost";
    }
    // Foe party
    let foeParty: Quickened[];
    if (req.kind === "trainer") {
      const t = req.trainer ? ctx.world.trainers[req.trainer] : undefined;
      if (!t || t.team.length === 0) {
        console.error(`[battle] unknown or empty trainer "${req.trainer}"`);
        return "won";
      }
      this.trainer = t;
      this.trainerName = fmt(ctx, `${t.className} ${t.name}`).toUpperCase().trim();
      this.aiKind = t.ai;
      this.enemyTrainer.key = t.portrait;
      foeParty = t.team.map((m) => createTrainerQuickened(this.data, m, ctx.rng));
    } else {
      if (!req.wild) {
        console.error("[battle] wild battle without a species");
        return "fled";
      }
      const foe = createQuickened(this.data, req.wanderer ?? req.wild.species, req.wanderer ? WANDERER_LEVEL : req.wild.level, ctx.rng);
      if (req.wanderer) {
        foe.ivs = trainerIvs();
        foe.stats = calcStats(getSpecies(this.data, foe.species), foe.ivs, foe.evs, foe.level);
        const health = wandererHealth(ctx.state, req.wanderer);
        foe.hp = health.hp;
        foe.status = health.status;
      }
      foe.sport = req.wild.sport ?? foe.sport;
      foeParty = [foe];
    }
    this.s = createBattleState({
      data: this.data, playerParty: this.party, playerActive: lead, foeParty, wild: req.kind === "wild",
      time: worldTime(ctx), foeTrainer: this.trainerName,
      foeItems: Object.fromEntries((this.trainer?.items ?? []).map((i) => [i.item, i.qty])),
    });

    this.fade = 1;
    await this.preload();
    await this.intro();

    let outcome: BattleOutcome | null = null;
    let wandererWiltedAt: Date | undefined;
    while (!outcome) {
      const choice = await this.chooseAction();
      if (choice.kind === "fled") { outcome = "fled"; break; }
      if (choice.kind === "caught") { outcome = "caught"; break; }
      const pAction: Action = choice.kind === "move" ? { kind: "move", slot: choice.slot }
        : choice.kind === "switch" ? { kind: "switch", index: choice.index } : { kind: "none" };
      const fAction = chooseFoeAction(this.s, this.aiKind, ctx.rng);
      const events = resolveTurn(this.s, pAction, fAction, ctx.rng);
      // Resolution mutates HP synchronously; playback and EXP can wait past midnight.
      if (req.wanderer && this.foe().hp <= 0 && !wandererWiltedAt) wandererWiltedAt = new Date();
      await this.play(events);
      outcome = await this.afterTurn();
    }
    if (req.kind === "wild" && req.wanderer) {
      Object.assign(ctx.state, finishWandererBattle(ctx.state, req.wanderer, this.foe(), outcome, wandererWiltedAt ?? new Date()));
    }
    await this.ending(outcome);
    return outcome;
  }

  private bannerKind(): BannerKind | null {
    const t = this.trainer;
    if (!t) return null;
    if (t.music === "battle_rootstock") return "rootstock";
    if (t.mark || t.music === "battle_leader") return "leader";
    return null;
  }

  // -------------------------------------------------------------------------
  // Intro
  // -------------------------------------------------------------------------

  private async intro() {
    const ctx = this.ctx;
    const f = this.flow;
    const foe = this.foe();
    const banner = this.bannerKind();
    // Leaders and Rootstock get a versus banner over black first.
    if (banner) {
      this.banner = { kind: banner, f: 0, len: 72 };
      this.fade = 0;
      await f.wait(this.banner.len);
      this.banner = null;
      this.fx.flashScreen("#f8f8f8", 3);
      this.fade = 1;
    }
    this.playerTrainer.visible = true;
    this.playerTrainer.dx = SCREEN_W;
    if (this.trainer) {
      this.enemyTrainer.visible = true;
      this.enemyTrainer.dx = -SCREEN_W;
    } else {
      this.enemy.species = foe.species;
      this.enemy.sport = foe.sport;
      this.enemy.visible = true;
      this.enemy.dx = -SCREEN_W;
      this.playback[1].hold(foe.species); // rest pose while it slides in; the intro plays with its cry
    }
    await f.animate(10, (_i, t) => { this.fade = 1 - t; });
    this.fade = 0;
    // Both sides glide in (eased, whole pixels).
    await f.animate(44, (_i, t) => {
      const k = Math.round((1 - t) * (1 - t) * SCREEN_W);
      this.playerTrainer.dx = k;
      if (this.trainer) this.enemyTrainer.dx = -k; else this.enemy.dx = -k;
    });
    this.playerTrainer.dx = 0;
    if (this.trainer) this.enemyTrainer.dx = 0; else this.enemy.dx = 0;
    this.podRows.player = true;
    this.podRows.t = 0;
    if (this.trainer) {
      this.podRows.enemy = true;
      await f.animate(28, (i, t) => {
        this.podRows.t = t;
        if (i % 5 === 0 && i < 26) ctx.audio.playSfx("cursor");
      });
      await this.say(`${this.trainerName} wants to battle!`, "wait");
      // Trainer steps aside and sends out the lead.
      this.podRows.enemy = false;
      await f.animate(20, (_i, t) => { this.enemyTrainer.dx = Math.round(t * t * 72); });
      this.enemyTrainer.visible = false;
      await this.sendOutFoeAnim(`${this.trainerName} sent out ${qName(this.data, foe)}!`);
    } else {
      // The wild Quickened catches the light: a glint, a hop, its cry.
      this.sprites.add(1, "shine", 16);
      await f.animate(16, (i, t) => {
        this.podRows.t = t;
        this.enemy.dy = -Math.round(Math.sin(Math.min(1, i / 10) * Math.PI) * 3);
      });
      this.enemy.dy = 0;
      void ctx.audio.playCry(foe.species);
      this.startIntro(1);
      if (foe.sport) await f.wait(this.fx.sparkle(ENEMY_CENTER));
      markSeen(ctx, foe.species);
      this.setHud(1);
      await this.slideHud(1);
      await this.say(`Wild ${qName(this.data, foe)} appeared!`, "wait");
    }
    // Player sends out the lead.
    this.podRows.player = false;
    await f.animate(16, (_i, t) => { this.playerTrainer.dx = -Math.round(t * t * 64); });
    this.playerTrainer.visible = false;
    await this.sendOutPlayerAnim();
  }

  /** Lob a pod along an arc, tumbling. */
  private async lobPod(from: Pt, to: Pt, frames: number, arc: number) {
    const p = this.thrown;
    p.visible = true; p.open = false; p.flash = false; p.dim = false;
    await this.flow.animate(frames, (i, t) => {
      p.x = Math.round(from.x + (to.x - from.x) * t);
      p.y = Math.round(from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * arc);
      p.tilt = [0, 2, 0, -2][(i >> 1) % 4];
    });
    p.tilt = 0;
  }

  /** Pod pops open: flash, puff, the Quickened grows out of a white silhouette. */
  private async popOut(side: Side, sport: boolean) {
    const v = this.viewOf(side);
    const c = this.centerOf(side);
    this.thrown.open = true;
    this.ctx.audio.playSfx("pod_click");
    this.fx.puff(c);
    v.visible = true;
    v.dx = 0; v.drop = 0;
    v.scale = 0.1;
    v.silhouette = UI.white;
    await this.flow.animate(6, () => undefined);
    this.thrown.visible = false;
    // grow in whole-pixel steps
    await this.flow.animate(10, (_i, t) => { v.scale = [0.25, 0.5, 0.75, 1][Math.min(3, Math.floor(t * 4))]; });
    v.scale = 1;
    v.silhouette = null;
    if (sport) await this.flow.wait(this.fx.sparkle(c));
  }

  private async sendOutFoeAnim(text: string) {
    const foe = this.foe();
    markSeen(this.ctx, foe.species);
    const v = this.enemy;
    v.species = foe.species;
    v.sport = foe.sport;
    v.visible = false;
    const say = this.say(text, "hold");
    this.ctx.audio.playSfx("pod_throw");
    await this.lobPod({ x: 168, y: 4 }, { x: ENEMY_CENTER.x - 6, y: ENEMY_CENTER.y + 4 }, 14, 10);
    await this.popOut(1, foe.sport);
    void this.ctx.audio.playCry(foe.species);
    this.startIntro(1);
    this.setHud(1);
    await this.slideHud(1);
    await say;
    await this.flow.wait(Math.max(16, this.introLeft(1)));
    const strain = graftCollarText(this.data, this.trainer, this.s.sides[1].active, foe);
    if (strain) await this.say(strain, "wait");
  }

  private async sendOutPlayerAnim() {
    const me = this.me();
    const v = this.player;
    v.species = me.species;
    v.sport = me.sport;
    v.visible = false;
    const say = this.say(`Go! ${qName(this.data, me)}!`, "hold");
    this.ctx.audio.playSfx("pod_throw");
    await this.lobPod({ x: -8, y: 76 }, { x: PLAYER_CENTER.x - 6, y: PLAYER_CENTER.y + 6 }, 14, 16);
    await this.popOut(0, me.sport);
    void this.ctx.audio.playCry(me.species);
    this.startIntro(0); // back sprite: no front intro to play
    this.setHud(0);
    await this.slideHud(0);
    await say;
    await this.flow.wait(16);
  }

  private async withdrawAnim(side: Side) {
    const v = this.viewOf(side);
    v.silhouette = UI.white;
    this.fx.puff(this.centerOf(side));
    await this.flow.animate(10, (_i, t) => { v.scale = [1, 0.75, 0.5, 0.25][Math.min(3, Math.floor(t * 4))]; });
    v.visible = false;
    v.scale = 1;
    v.silhouette = null;
    this.hudOf(side).visible = false;
  }

  // -------------------------------------------------------------------------
  // Player menus
  // -------------------------------------------------------------------------

  private async chooseAction(): Promise<Choice> {
    for (;;) {
      this.ui.tb.show(`What will ${qName(this.data, this.me())} do?`, "instant");
      const cmd = new Menu(this.ctx, ["FIGHT", "BAG", "QUICKENED", "RUN"], {
        ...COMMAND_AREA, cols: 2, colW: (COMMAND_AREA.w - 16) / 2, spacing: 16, cancel: false, start: this.lastCmd,
      });
      this.idle = true;
      const c = await this.ui.choose(cmd, (g) => {
        cmd.draw(g);
      });
      this.idle = false;
      this.lastCmd = Math.max(0, c);
      if (c === 0) {
        const r = await this.fightMenu();
        if (r) return r;
      } else if (c === 1) {
        const r = await this.bagMenu();
        if (r) return r;
      } else if (c === 2) {
        const idx = await this.pickSwitch(true);
        if (idx >= 0) return { kind: "switch", index: idx };
      } else if (c === 3) {
        const r = await this.tryRunAway();
        if (r) return r;
      }
    }
  }

  /** SUPER / WEAK / NONE for the active move slots, if the foe is known. */
  private moveHints(): EffHint[] {
    const foe = this.foe();
    if (!this.knowledge.knows(foe.species)) return this.me().moves.map(() => null);
    const types = getSpecies(this.data, foe.species).types as readonly TypeId[];
    return this.me().moves.map((m) => effectivenessHint(this.data, getMove(this.data, m.id), types));
  }

  private async fightMenu(): Promise<Choice | null> {
    const me = this.me();
    if (!hasUsableMove(me)) return { kind: "move", slot: -1 };
    const labels = me.moves.map((m) => getMove(this.data, m.id).name.toUpperCase());
    while (labels.length < 4) labels.push("-");
    const hints = this.moveHints();
    const describe = () => {
      this.ui.tb.clear();
    };
    for (;;) {
      const menu = new Menu(this.ctx, labels, {
        ...MOVE_AREA, spacing: 8, start: Math.min(this.lastMove, me.moves.length - 1), onMove: describe,
      });
      describe();
      this.idle = true;
      const r = await this.ui.choose(menu, (g) => {
        menu.draw(g);
        hints.forEach((h, i) => { if (h) drawHintTag(g, h, SCREEN_W - 30, MOVE_AREA.y + 8 + i * 8 + 1); });
        this.drawMoveInfo(g, menu.index);
        // Description sits in the empty field, above the dialogue control rail.
        const move = me.moves[menu.index];
        const text = move ? getMove(this.data, move.id).description : "Choose a move.";
        this.ctx.ui.drawWindow(g, 88, 98, SCREEN_W - 88, 26);
        this.ctx.ui.wrap(text, 54).slice(0, 3).forEach((line, i) => drawTiny(g, line, 96, 102 + i * 7));
      });
      this.idle = false;
      if (r < 0) return null;
      if (r >= me.moves.length) continue;
      this.lastMove = r;
      if (me.moves[r].pp <= 0) {
        await this.say("There's no PP left for this move!", "wait");
        this.ui.tb.clear();
        continue;
      }
      return { kind: "move", slot: r };
    }
  }

  private drawMoveInfo(g: CanvasRenderingContext2D, index: number) {
    const m = this.me().moves[index];
    const { x, y, w, h } = MOVE_INFO_AREA;
    this.ctx.ui.drawWindow(g, x, y, w, h);
    if (!m) return;
    const mv = getMove(this.data, m.id);
    const c = TYPE_COLORS[mv.type];
    this.ctx.ui.drawText(g, "TYPE/", x + 8, y + 8);
    const cat = mv.category === "physical" ? "PHY" : mv.category === "special" ? "SPC" : "STA";
    drawTiny(g, cat, x + 58, y + 9, UI.dark);
    g.fillStyle = c?.mid ?? UI.dark;
    g.fillRect(x + 8, y + 17, 3, 6);
    this.ctx.ui.drawText(g, TYPE_NAMES[mv.type] ?? String(mv.type).toUpperCase(), x + 14, y + 16);
    drawTiny(g, "PP", x + 8, y + 26);
    const low = m.pp <= Math.max(1, Math.floor(mv.pp / 4));
    this.ctx.ui.drawText(g, `${pad(m.pp, 2)}/${pad(mv.pp, 2)}`, x + 24, y + 24, m.pp === 0 ? UI.hpRed : low ? "#c07010" : undefined);
  }

  /** Party pick for a switch. Returns an index or -1. */
  private async pickSwitch(cancelable: boolean): Promise<number> {
    for (;;) {
      const start = Math.max(0, this.party.findIndex((q, i) => canFight(q) && i !== this.s.sides[0].active));
      const idx = await partyScreen(this.ctx, { mode: "pick", prompt: "Switch to which?", verb: "SWITCH", start });
      if (idx < 0) {
        if (cancelable) return -1;
        continue;
      }
      const q = this.party[idx];
      if (!q) continue;
      if (idx === this.s.sides[0].active && q.hp > 0) {
        await this.say(`${qName(this.data, q)} is already out!`, "wait");
        if (cancelable) return -1;
        continue;
      }
      if (q.seed) {
        await this.say("A SEED can't battle!", "wait");
        if (cancelable) return -1;
        continue;
      }
      if (q.hp <= 0) {
        await this.say(`${qName(this.data, q)} has no energy left!`, "wait");
        if (cancelable) return -1;
        continue;
      }
      return idx;
    }
  }

  private async bagMenu(): Promise<Choice | null> {
    const item = await this.ctx.screens.bag({ inBattle: true });
    if (!item) return null;
    const it = getItem(this.data, item);
    if (it.effect.kind === "pod") return this.throwPod(item);
    if (!it.usableInBattle || !isMedicine(this.data, item)) {
      await this.say("Now isn't the time to use that!", "wait");
      return null;
    }
    const idx = await this.ctx.screens.party({ mode: "pick", prompt: "Use on which?" });
    if (idx < 0) return null;
    const q = this.party[idx];
    if (!q) return null;
    const isActive = idx === this.s.sides[0].active;
    const res = applyItem(this.data, item, q);
    if (!res.ok) {
      await this.say(res.text, "wait");
      return null;
    }
    consumeItem(this.ctx.state.bag, item);
    await this.say(`${playerName(this.ctx)} used ${itemName(this.data, item)}!`, "auto");
    if (isActive) {
      if (res.hpTo !== res.hpFrom) {
        this.healSparkle(0);
        await this.animateHp(0, res.hpFrom, res.hpTo);
      }
      this.playerHud.status = q.status;
    }
    await this.say(res.text, "auto");
    return { kind: "used_item" };
  }

  private healSparkle(side: Side) {
    const c = this.centerOf(side);
    for (let i = 0; i < 8; i++) this.fx.add({ x: c.x + R(-16, 16), y: c.y + R(4, 18), vy: -0.8, shape: "twinkle", color: "#ffffff", color2: "#88e0a0", max: 16, delay: i * 2 });
    this.sprites.add(side, "shine", 14);
  }

  private async tryRunAway(): Promise<Choice | null> {
    if (this.trainer) {
      await this.say("No! There's no running from a trainer battle!", "wait");
      return null;
    }
    const ok = tryRun(this.me().stats.spe, this.foe().stats.spe, this.runAttempts, this.ctx.rng);
    this.runAttempts++;
    if (ok) {
      this.ctx.audio.playSfx("run");
      await this.say("Got away safely!", "wait");
      return { kind: "fled" };
    }
    await this.say("Can't escape!", "auto");
    return { kind: "run_failed" };
  }

  // -------------------------------------------------------------------------
  // Capture
  // -------------------------------------------------------------------------

  private async throwPod(item: ItemId): Promise<Choice | null> {
    const ctx = this.ctx;
    if (this.trainer) {
      await this.say("The trainer blocked the pod!", "auto");
      await this.say("Don't be a thief!", "wait");
      return null;
    }
    consumeItem(ctx.state.bag, item);
    const foe = this.foe();
    const species = getSpecies(this.data, foe.species);
    const pod = getItem(this.data, item);
    const mult = pod.effect.kind === "pod" ? pod.effect.catchMultiplier : 1;
    await this.say(`${playerName(ctx)} used ${itemName(this.data, item)}!`, "hold");
    const r = attemptCapture(foe, species.catchRate, mult, ctx.state.herbarium.caught.length, ctx.rng);
    const p = this.thrown;
    const v = this.enemy;

    // 1. The throw: a high, tumbling arc from the player's side.
    ctx.audio.playSfx("pod_throw");
    const hit = { x: ENEMY_CENTER.x - 6, y: ENEMY_CENTER.y - 10 };
    if (r.critical) this.fx.flashScreen("#f8e070", 2);
    await this.lobPod({ x: PLAYER_HOME.x + 12, y: PLAYER_HOME.y + 36 }, hit, 26, 40);
    // 2. Bounce off, open, beam the foe in.
    await this.flow.animate(6, (_i, t) => { p.y = Math.round(hit.y - Math.sin(t * Math.PI) * 6); p.x = hit.x + Math.round(t * 2); });
    p.open = true;
    ctx.audio.playSfx("pod_click");
    this.fx.flashScreen("#f8f8f8", 2);
    const mouth = { x: p.x + 4, y: p.y + 4 };
    this.fx.layer(16, (g, f) => {
      if (f % 4 >= 3) return;
      for (const [dx, dy] of [[-22, 6], [-12, 20], [0, 24], [12, 20], [22, 6]]) {
        line(g, mouth.x, mouth.y, ENEMY_CENTER.x + dx - f, ENEMY_CENTER.y + dy - Math.floor(f / 2), f % 2 ? "#f8d048" : "#c89020");
      }
    });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.fx.add({ x: mouth.x, y: mouth.y, shape: "twinkle", color: "#ffffff", color2: "#f8e070", max: 14, delay: 4 + i, to: { sx: ENEMY_CENTER.x + Math.cos(a) * 24, sy: ENEMY_CENTER.y + Math.sin(a) * 20, x: mouth.x, y: mouth.y, arc: 0 } });
    }
    v.silhouette = UI.white;
    await this.flow.wait(4);
    await this.flow.animate(14, (_i, t) => {
      v.scale = [1, 0.75, 0.5, 0.25, 0.125][Math.min(4, Math.floor(t * 5))];
      v.dy = -Math.round(t * 14);
    });
    v.visible = false;
    v.scale = 1; v.dy = 0; v.silhouette = null;
    this.enemyHud.visible = false;
    p.open = false;
    await this.flow.wait(10);
    // 3. Drop to the ground, two bounces.
    const top = p.y;
    await this.flow.animate(12, (_i, t) => { p.y = Math.round(top + (POD_REST.y - top) * t * t); p.x = Math.round(hit.x + 2 + (POD_REST.x - hit.x - 2) * t); });
    ctx.audio.playSfx("bump");
    for (const hgt of [7, 3]) {
      await this.flow.animate(hgt * 2, (_i, t) => { p.y = Math.round(POD_REST.y - Math.sin(t * Math.PI) * hgt); });
      ctx.audio.playSfx("bump");
    }
    p.y = POD_REST.y;
    this.fx.dust({ x: POD_REST.x + 4, y: ENEMY_GROUND.y - 1 }, 4);
    await this.flow.wait(r.critical ? 12 : 26);

    // 4. Wobbles.
    for (let i = 0; i < r.shakes; i++) {
      ctx.audio.playSfx("pod_shake");
      await this.flow.animate(24, (k) => { p.tilt = [0, -1, -2, -3, -3, -2, -1, 0, 1, 2, 3, 3, 2, 1, 0, -1, -1, 0, 0, 0, 0, 0, 0, 0][k] ?? 0; });
      p.tilt = 0;
      await this.flow.wait(i === r.shakes - 1 ? 22 : 30);
    }
    if (r.caught) {
      // 5. Click: flash, a burst of stars, the pod settles dim.
      ctx.audio.playSfx("pod_click");
      p.flash = true;
      await this.flow.wait(3);
      p.flash = false;
      await this.flow.wait(this.fx.stars({ x: p.x + 4, y: p.y + 2 }) - 6);
      p.dim = true;
      const name = qName(this.data, foe);
      const jingle = ctx.audio.playJingle("caught");
      if (r.critical) await this.say("A critical capture!", "auto");
      await this.say(`Gotcha! ${name} was caught!`, "wait");
      await jingle;
      const first = markCaught(ctx, foe.species);
      foe.metAt = { map: ctx.state.position.map, level: foe.level };
      foe.friendship = Math.max(foe.friendship, 70);
      if (first && hasHerbarium(ctx)) {
        await this.say(`${name}'s data was added to your HERBARIUM.`, "wait");
        await showHerbariumEntry(ctx, foe.species);
      }
      await askNickname(ctx, this.ui, foe);
      const shown = qName(this.data, foe);
      if (this.party.length < 6) {
        this.party.push(foe);
      } else {
        ctx.state.box.push(foe);
        await this.say(`${shown} was sent to the CABINET.`, "wait");
      }
      p.visible = false;
      return { kind: "caught" };
    }
    // Broke free: the pod bursts, the foe pops back out.
    p.open = true;
    ctx.audio.playSfx("pod_click");
    this.fx.flashScreen("#f8f8f8", 2);
    this.fx.puff({ x: p.x + 4, y: p.y + 4 });
    await this.flow.wait(4);
    p.visible = false;
    p.open = false;
    v.visible = true;
    v.silhouette = UI.white;
    await this.flow.animate(10, (_i, t) => { v.scale = [0.25, 0.5, 0.75, 1][Math.min(3, Math.floor(t * 4))]; });
    v.scale = 1; v.silhouette = null;
    this.enemyHud.visible = true;
    void ctx.audio.playCry(foe.species);
    const lines = [
      `Oh no! ${qName(this.data, foe)} broke free!`,
      "Aww! It appeared to be caught!",
      "Aargh! Almost had it!",
      "Shoot! It was so close too!",
    ];
    await this.say(lines[r.shakes], "wait");
    return { kind: "pod_failed" };
  }

  // -------------------------------------------------------------------------
  // Event playback
  // -------------------------------------------------------------------------

  private async play(events: BattleEvent[]) {
    // Within one turn, the same side repeating the same move is a multi-hit.
    const seen = new Set<string>();
    for (const e of events) {
      const key = e.t === "anim" ? `${e.side}:${e.move}` : "";
      await this.playOne(e, e.t === "anim" && seen.has(key));
      if (key) seen.add(key);
    }
  }

  /** Play a move animation for `side` (also used by the dev gallery). */
  async playMoveAnim(side: Side, moveId: MoveId, repeat = false): Promise<void> {
    const mv = getMove(this.data, moveId);
    if (!battleAnimsOn(this.ctx.state?.options)) {
      // OPTIONS → BATTLE ANIM OFF: a beat, then straight to the hit reaction.
      await this.flow.wait(repeat ? 4 : 10);
      return;
    }
    const spec = animFor(mv);
    const other: Side = side === 0 ? 1 : 0;
    const self = !targetsFoe(mv);
    if (mv.category === "physical" && !self && !repeat) await this.lunge(side);
    const stage = {
      from: this.centerOf(side), to: this.centerOf(self ? side : other),
      fromGround: this.groundOf(side), toGround: this.groundOf(self ? side : other),
      userSide: side, sprites: this.sprites,
    };
    const multi = mv.effects.some((e) => e.kind === "multi_hit");
    let n: number;
    if (repeat && multi) {
      // quick follow-up hits of a multi-hit move
      n = 12;
      this.fx.impact({ x: stage.to.x + R(-8, 8), y: stage.to.y + R(-8, 8) }, "#ffffff", TYPE_COLORS[mv.type]?.light ?? "#f8d040");
    } else {
      n = playMoveFx(this.fx, spec, mv.type, stage);
    }
    await this.flow.wait(n);
  }

  private async playOne(e: BattleEvent, repeat: boolean) {
    const f = this.flow;
    const ctx = this.ctx;
    switch (e.t) {
      case "text":
        await this.say(e.text, "auto");
        break;
      case "anim":
        await this.playMoveAnim(e.side, e.move, repeat);
        break;
      case "hp": {
        const h = this.hudOf(e.side);
        const q = h.q ?? active(this.s, e.side);
        if (e.kind === "hit") {
          const eff = e.eff ?? 1;
          ctx.audio.playSfx(eff > 1 ? "hit_super" : eff < 1 ? "hit_weak" : "hit");
          const big = eff > 1 || !!e.crit || (e.from - e.to) >= q.stats.hp / 3;
          await this.hitReact(e.side, { big, crit: !!e.crit, eff });
          if (e.side === 1) this.knowledge.learn(q.species);
        } else if (e.kind === "recoil") {
          ctx.audio.playSfx("hit_weak");
          await this.hitReact(e.side, { big: false, crit: false, eff: 1 });
        } else if (e.kind === "drain") {
          const other: Side = e.side === 0 ? 1 : 0;
          await f.wait(this.fx.drain(this.centerOf(other), this.centerOf(e.side)) - 12);
        } else if (e.kind === "heal") {
          this.healSparkle(e.side);
        }
        await this.animateHp(e.side, e.from, e.to);
        break;
      }
      case "status":
        this.hudOf(e.side).status = e.status;
        if (e.status) {
          // the new status announces itself once with its own puff
          await f.wait(Math.min(24, this.fx.status(this.centerOf(e.side), e.status)));
        }
        break;
      case "stat":
        ctx.audio.playSfx(e.up ? "stat_up" : "stat_down");
        await f.wait(this.fx.stat(this.centerOf(e.side), e.up));
        break;
      case "residual": {
        const other: Side = e.side === 0 ? 1 : 0;
        await f.wait(this.fx.status(this.centerOf(e.side), e.kind, this.centerOf(other)));
        break;
      }
      case "wilt":
        await this.wiltAnim(e.side);
        break;
      case "weather":
        this.weather = e.weather;
        break;
      case "switch_out": {
        // `active` already points at the newcomer; the HUD still holds the outgoing one.
        const out = this.hudOf(e.side).q ?? active(this.s, e.side);
        const name = qName(this.data, out);
        if (e.side === 0) await this.say(`${name}, come back!`, "hold");
        else await this.say(`${this.trainerName} withdrew ${name}!`, "hold");
        await this.withdrawAnim(e.side);
        break;
      }
      case "switch_in":
        if (e.side === 0) await this.sendOutPlayerAnim();
        else await this.sendOutFoeAnim(`${this.trainerName} sent out ${qName(this.data, this.foe())}!`);
        break;
      case "miss":
        // a whiff of air past the target
        this.fx.add({ x: this.centerOf(e.side === 0 ? 1 : 0).x, y: this.centerOf(e.side === 0 ? 1 : 0).y, shape: "twinkle", color: "#ffffff", color2: "#c8d0d8", max: 10 });
        break;
      case "item":
        if (e.side === 1) this.healSparkle(1);
        break;
    }
  }

  private async lunge(side: Side) {
    const v = this.viewOf(side);
    const dir = side === 0 ? 1 : -1;
    await this.flow.animate(10, (_i, t) => {
      const k = Math.round(Math.sin(t * Math.PI) * 8);
      v.dx = dir * k;
      v.dy = -dir * Math.round(k / 2);
    });
    v.dx = 0; v.dy = 0;
  }

  /** The hurt reaction: a white blink, then flicker; big hits shake, crits flash. */
  private async hitReact(side: Side, o: { big: boolean; crit: boolean; eff: number }) {
    const v = this.viewOf(side);
    if (o.crit) this.fx.flashScreen("#f8f8f8", 2);
    if (o.big) this.fx.shake(o.eff > 1 ? 16 : 12, o.eff > 1 || o.crit ? 3 : 2, side === 1 ? "x" : "xy");
    await this.flow.animate(26, (i) => {
      if (i < 4) { v.silhouette = UI.white; v.hidden = false; }
      else { v.silhouette = null; v.hidden = Math.floor((i - 4) / 4) % 2 === 0 && i < 22; }
      if (o.crit && i === 6) this.fx.flashScreen("#f8f8f8", 1);
    });
    v.hidden = false;
    v.silhouette = null;
  }

  private async animateHp(side: Side, from: number, to: number) {
    const h = this.hudOf(side);
    const q = h.q ?? active(this.s, side);
    const max = Math.max(1, q.stats.hp);
    // Crystal drains the bar about a pixel per frame (48px bar).
    const pxDiff = Math.abs(to - from) * 48 / max;
    const frames = Math.max(8, Math.min(64, Math.round(pxDiff * 1.3)));
    await this.flow.animate(frames, (_i, t) => { h.hp = from + (to - from) * t; });
    h.hp = to;
    await this.flow.wait(6);
  }

  private async wiltAnim(side: Side) {
    const v = this.viewOf(side);
    const q = this.hudOf(side).q ?? active(this.s, side);
    void this.ctx.audio.playCry(q.species);
    await this.flow.wait(24);
    this.ctx.audio.playSfx("wilt");
    this.fx.dust(this.groundOf(side), 6);
    // slides down into its battle ground, accelerating
    await this.flow.animate(16, (_i, t) => { v.drop = Math.round(t * t * 64); });
    v.visible = false;
    v.drop = 0;
    const h = this.hudOf(side);
    await this.flow.animate(8, (_i, t) => { h.dx = Math.round((side === 0 ? 1 : -1) * t * 100); });
    h.visible = false;
    h.dx = 0;
    if (side === 0) addFriendship(q, -1);
  }

  // -------------------------------------------------------------------------
  // After each turn: wilts, exp, replacements
  // -------------------------------------------------------------------------

  private async afterTurn(): Promise<BattleOutcome | null> {
    const foe = this.foe();
    const me = this.me();
    let foeNext = -1;
    if (foe.hp <= 0) {
      if (this.s.wild) this.ctx.audio.playMusic("victory_wild");
      await this.awardExp(foe);
      if (this.s.wild) return "won";
      foeNext = firstHealthy(this.s.sides[1].party);
      if (foeNext < 0) {
        await this.trainerVictory();
        return "won";
      }
    }
    if (me.hp <= 0) {
      if (!canContinue(this.party)) return "lost";
    }
    if (this.req.wanderer && wandererFlees(this.s.wild, this.s.turn, foe.hp, null)) {
      this.ctx.audio.playSfx("run");
      await this.say(`${qName(this.data, foe)} fled!`, "wait");
      return "fled";
    }
    if (me.hp <= 0) {
      const r = await this.forcedSwitch();
      if (r) return r;
    }
    if (foeNext >= 0) {
      const next = this.s.sides[1].party[foeNext];
      // Shift: offer a switch before the trainer's next one comes out.
      if (this.me().hp > 0 && this.party.filter(canFight).length > 1) {
        const change = await this.ui.yesNo(
          fmt(this.ctx, `${this.trainerName} is about to use ${qName(this.data, next)}. Will ${playerName(this.ctx)} change QUICKENED?`),
        );
        if (change) {
          const idx = await this.pickSwitch(true);
          if (idx >= 0) {
            const ev: BattleEvent[] = [];
            doSwitch(this.s, 0, idx, ev);
            await this.play(ev);
          }
        }
      }
      sendOutFoe(this.s, foeNext);
      await this.sendOutFoeAnim(`${this.trainerName} sent out ${qName(this.data, next)}!`);
    }
    return null;
  }

  private async forcedSwitch(): Promise<BattleOutcome | null> {
    if (this.s.wild) {
      for (;;) {
        const next = await this.ui.yesNo("Use next QUICKENED?");
        if (next) break;
        const runner = this.party.find(canFight)!;
        const ok = tryRun(runner.stats.spe, this.foe().stats.spe, this.runAttempts, this.ctx.rng);
        this.runAttempts++;
        if (ok) {
          this.ctx.audio.playSfx("run");
          await this.say("Got away safely!", "wait");
          return "fled";
        }
        await this.say("Can't escape!", "wait");
      }
    }
    const idx = await this.pickSwitch(false);
    const ev: BattleEvent[] = [];
    doSwitch(this.s, 0, idx, ev);
    await this.play(ev);
    return null;
  }

  private async awardExp(foe: Quickened) {
    const base = expYield(this.data, foe, !this.s.wild);
    const shares = distributeExp(this.party, this.s.participants, base);
    const rest = shares.filter((sh) => !sh.participant);
    let restAnnounced = false;
    for (const sh of shares) {
      const q = this.party[sh.index];
      gainEvs(this.data, q, foe.species);
      const name = qName(this.data, q);
      if (sh.participant) {
        await this.say(`${name} gained ${sh.amount} EXP. Points!`, "auto");
      } else if (!restAnnounced) {
        restAnnounced = true;
        await this.say(
          rest.length === 1 ? `${name} gained ${sh.amount} EXP. Points!` : `The rest of the team gained ${sh.amount} EXP. Points!`,
          "auto",
        );
      }
      const isActive = sh.index === this.s.sides[0].active && this.playerHud.visible;
      const before = expProgress(this.data, q);
      const ups = gainExp(this.data, q, sh.amount);
      if (isActive) await this.animateExp(before, ups.length, expProgress(this.data, q));
      for (const up of ups) await this.levelUp(q, up, isActive);
    }
  }

  private async animateExp(from: number, levels: number, to: number) {
    const h = this.playerHud;
    const fill = async (a: number, b: number) => {
      const frames = Math.max(4, Math.round((b - a) * 64));
      await this.flow.animate(frames, (i, t) => {
        h.exp = a + (b - a) * t;
        if (i % 4 === 0) this.ctx.audio.playSfx("exp_tick");
      });
    };
    let cur = from;
    for (let i = 0; i < levels; i++) {
      await fill(cur, 1);
      cur = 0;
      h.flash = 28;
      await this.flow.wait(10);
      h.exp = 0;
    }
    await fill(cur, to);
  }

  private async levelUp(q: Quickened, up: LevelUp, isActive: boolean) {
    this.leveled.add(q.uid);
    if (isActive) {
      this.playerHud.level = up.level;
      this.playerHud.hp = q.hp;
      this.playerHud.flash = Math.max(this.playerHud.flash, 28);
      this.sprites.add(0, "shine", 16);
      this.fx.sparkle(PLAYER_CENTER, "#f8e070", 10);
    }
    const jingle = this.ctx.audio.playJingle("level_up");
    await this.say(`${qName(this.data, q)} grew to level ${up.level}!`, "wait");
    await jingle;
    // Stat window: gains first, then the new totals (A to continue).
    const gains = {} as typeof up.newStats;
    for (const k of Object.keys(up.newStats) as (keyof typeof up.newStats)[]) gains[k] = up.newStats[k] - up.oldStats[k];
    this.overlayDraw = (g) => drawStatWindow(this.ctx, g, up.newStats, gains);
    await this.flow.button(["a", "b"]);
    this.overlayDraw = (g) => drawStatWindow(this.ctx, g, up.newStats);
    await this.flow.button(["a", "b"]);
    this.overlayDraw = null;
    for (const m of up.newMoves) await learnMoveFlow(this.ctx, this.ui, this.flow, q, m);
  }

  private async trainerVictory() {
    const ctx = this.ctx;
    const t = this.trainer!;
    const leader = !!t.mark || t.music === "battle_leader";
    ctx.audio.playMusic(leader ? "victory_leader" : "victory_trainer");
    this.enemyTrainer.visible = true;
    this.enemyTrainer.dx = 72;
    await this.flow.animate(20, (_i, k) => { this.enemyTrainer.dx = Math.round((1 - k) * (1 - k) * 72); });
    this.enemyTrainer.dx = 0;
    await this.say(`${playerName(ctx)} defeated ${this.trainerName}!`, "wait");
    if (t.defeat) await this.say(t.defeat, "wait");
    if (t.prize > 0) {
      ctx.state.money += t.prize;
      await this.say(`${playerName(ctx)} got $${t.prize} for winning!`, "wait");
    }
  }

  // -------------------------------------------------------------------------
  // Ending: growth checks, fade out
  // -------------------------------------------------------------------------

  private async ending(outcome: BattleOutcome) {
    this.ui.tb.clear();
    if (outcome !== "lost") {
      const time = worldTime(this.ctx);
      for (const q of [...this.party]) {
        if (!this.leveled.has(q.uid) || q.hp <= 0) continue;
        const to = growthTarget(this.data, q, time);
        if (to) {
          this.fade = 1;
          await runGrowth(this.ctx, q, to);
        }
      }
    }
    await this.flow.animate(16, (_i, t) => { this.fade = Math.max(this.fade, t); });
    this.fade = 1;
  }

  // -------------------------------------------------------------------------
  // Dev helpers (window.__battle in dev builds)
  // -------------------------------------------------------------------------

  devSetWeather(w: Weather | null) { this.weather = w; }
  devSetStatus(side: Side, st: StatusId | null) { this.hudOf(side).status = st; }
  devSpeciesName(id: SpeciesId) { return speciesName(this.data, id); }
}

/** A small tab with SUPER / WEAK / NONE in the tiny font. */
function drawHintTag(g: CanvasRenderingContext2D, hint: Exclude<EffHint, null>, x: number, y: number) {
  const bg = hint === "SUPER" ? "#d04020" : hint === "WEAK" ? "#6878a0" : "#808080";
  const w = hint.length * 4 + 3;
  g.fillStyle = bg;
  g.fillRect(x + 1, y - 1, w - 2, 7);
  g.fillRect(x, y, w, 5);
  drawTiny(g, hint, x + 2, y, UI.white);
}
