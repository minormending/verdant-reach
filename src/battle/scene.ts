// The battle scene: Crystal layout, intros, menus, animations and the
// post-battle sequence. Turn logic lives in ./logic (pure); this file plays
// the event log back and drives the menus.

import type {
  BattleOutcome, BattleRequest, GameContext, ItemId, Quickened, Scene, SpeciesId, TrainerDef, TrainerPortraitKey,
  Weather,
} from "../contracts";
import { portraitPath, speciesPath, TEXTBOX, UI } from "../contracts";
import { chooseFoeAction, type AiKind } from "./logic/ai";
import {
  active, canContinue, createBattleState, doSwitch, firstHealthy, hasUsableMove, resolveTurn, sendOutFoe,
  type Action, type BattleEvent, type BattleState, type Side,
} from "./logic/battle";
import { attemptCapture, tryRun } from "./logic/capture";
import {
  addFriendship, distributeExp, expProgress, expYield, gainEvs, gainExp, growthTarget, type LevelUp,
} from "./logic/exp";
import { applyItem, consumeItem, isMedicine } from "./logic/items";
import { getItem, getMove, getSpecies, itemName, qName, speciesName, TYPE_NAMES } from "./logic/lookup";
import { createQuickened, recalcStats, trainerIvs } from "./logic/stats";
import { drawBackdrop, drawEnemyHud, drawPlayerHud, drawPodRow, drawStatWindow, drawTrainer, newHud, type HudView } from "./hud";
import { drawWeather, ENEMY_CENTER, Fx, PLAYER_CENTER } from "./fx";
import { Flow } from "../screens/kit/flow";
import { drawCursor, drawPod, drawSpecies, drawTiny, pad, preload } from "../screens/kit/draw";
import { fmt, hasHerbarium, markCaught, markSeen, playerName } from "../screens/kit/text";
import { Menu, ScreenUi } from "../screens/kit/widgets";
import { learnMoveFlow } from "../screens/flows/learn";
import { runGrowth } from "../screens/flows/growth";
import { showHerbariumEntry } from "../screens/herbarium";
import { partyScreen } from "../screens/party";

const ENEMY_HOME = { x: 96, y: 0 };
const PLAYER_HOME = { x: 8, y: 40 };

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
  return b;
}

class BattleScene implements Scene {
  transparent = false;
  private flow: Flow;
  private ui: ScreenUi;
  private fx = new Fx();
  private frame = 0;
  private started = false;
  private finished = false;

  private s!: BattleState;
  private trainer?: TrainerDef;
  private trainerName = "";
  private aiKind: AiKind = "wild";
  private backdrop: NonNullable<BattleRequest["backdrop"]>;

  private enemy = newSprite();
  private player = newSprite();
  private enemyTrainer: TrainerView = { key: "gardener", visible: false, dx: 0 };
  private playerTrainer: TrainerView = { key: "player_back", visible: false, dx: 0 };
  private enemyHud: HudView = newHud();
  private playerHud: HudView = newHud();
  private podRows = { player: false, enemy: false, playerDx: 0, enemyDx: 0 };
  private thrown: { x: number; y: number; open: number; visible: boolean; wobble: number } = { x: 0, y: 0, open: 0, visible: false, wobble: 0 };
  private shake = { x: 0, y: 0 };
  private fade = 0; // 0..1 to black
  private weather: Weather | null = null;
  private overlayDraw: ((g: CanvasRenderingContext2D) => void) | null = null;

  private lastCmd = 0;
  private lastMove = 0;
  private runAttempts = 0;
  private leveled = new Set<string>();

  constructor(private ctx: GameContext, private req: BattleRequest, private done: (o: BattleOutcome) => void) {
    this.flow = new Flow(ctx.input);
    this.ui = new ScreenUi(ctx, this.flow, { blip: false });
    this.ui.tb.autoFrames = 45;
    this.backdrop = req.backdrop ?? (ctx.timeOfDay() === "night" ? "night" : "grass");
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
    this.flow.tick();
  }

  private finish(o: BattleOutcome) {
    if (this.finished) return;
    this.finished = true;
    this.done(o);
  }

  draw(g: CanvasRenderingContext2D): void {
    g.save();
    g.translate(this.shake.x, this.shake.y);
    drawBackdrop(g, this.backdrop, this.frame);
    drawWeather(g, this.weather, this.frame);

    // Enemy side
    if (this.enemyTrainer.visible) {
      drawTrainer(this.ctx, g, this.enemyTrainer.key, ENEMY_HOME.x + this.enemyTrainer.dx, ENEMY_HOME.y);
    }
    this.drawSprite(g, this.enemy, "front", ENEMY_HOME, 56);
    // Player side
    if (this.playerTrainer.visible) {
      drawTrainer(this.ctx, g, "player_back", PLAYER_HOME.x + this.playerTrainer.dx, PLAYER_HOME.y);
    }
    this.drawSprite(g, this.player, "back", PLAYER_HOME, 88);

    if (this.podRows.enemy && this.trainer) drawPodRow(g, this.s.sides[1].party, 1, this.podRows.enemyDx);
    if (this.podRows.player) drawPodRow(g, this.ctx.state.party, 0, this.podRows.playerDx);

    drawEnemyHud(this.ctx, g, this.enemyHud, this.s && this.s.wild && !!this.enemyHud.q && this.ctx.state.herbarium.caught.includes(this.enemyHud.q.species));
    drawPlayerHud(this.ctx, g, this.playerHud);

    if (this.thrown.visible) {
      const wob = this.thrown.wobble;
      drawPod(g, this.thrown.x + wob, this.thrown.y, "ok", this.thrown.open);
    }
    this.fx.draw(g);
    g.restore();

    if (!this.ui.tb.visible && this.ui.overlays.length === 0) {
      this.ctx.ui.drawWindow(g, TEXTBOX.x, TEXTBOX.y, TEXTBOX.w, TEXTBOX.h);
    }
    this.ui.draw(g);
    this.overlayDraw?.(g);
    this.fx.drawFlash(g);
    if (this.fade > 0) {
      const step = Math.ceil(this.fade * 4) / 4;
      g.fillStyle = `rgba(0,0,0,${step})`;
      g.fillRect(0, 0, 160, 144);
    }
  }

  private drawSprite(g: CanvasRenderingContext2D, v: SpriteView, kind: "front" | "back", home: { x: number; y: number }, clipBottom: number) {
    if (!v.visible || !v.species || v.hidden) return;
    drawSpecies(this.ctx, g, v.species, kind, home.x + v.dx, home.y + v.dy, {
      sport: v.sport, scale: v.scale, drop: v.drop, clipBottom, silhouette: v.silhouette ?? undefined,
    });
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

  private foeLabel(): string {
    return (this.s.wild ? "Wild " : "Enemy ") + qName(this.data, this.foe());
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

  private async preload() {
    const paths = new Set<string>();
    for (const q of this.party) {
      paths.add(speciesPath(q.species, "back"));
      paths.add(speciesPath(q.species, "front"));
      paths.add(speciesPath(q.species, "icon"));
    }
    for (const q of this.s.sides[1].party) paths.add(speciesPath(q.species, "front"));
    paths.add(portraitPath("player_back"));
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
      foeParty = t.team.map((m) => this.makeTrainerQ(m.species, m.level, m.moves));
    } else {
      if (!req.wild) {
        console.error("[battle] wild battle without a species");
        return "fled";
      }
      foeParty = [createQuickened(this.data, req.wild.species, req.wild.level, ctx.rng)];
    }
    const lead = firstHealthy(this.party);
    if (lead < 0) {
      console.error("[battle] no healthy Quickened in the party");
      return req.kind === "wild" ? "fled" : "won";
    }
    this.s = createBattleState({
      data: this.data, playerParty: this.party, playerActive: lead, foeParty, wild: req.kind === "wild",
      time: ctx.timeOfDay(), foeTrainer: this.trainerName,
      foeItems: Object.fromEntries((this.trainer?.items ?? []).map((i) => [i.item, i.qty])),
    });

    this.fade = 1;
    await this.preload();
    await this.intro();

    let outcome: BattleOutcome | null = null;
    while (!outcome) {
      const choice = await this.chooseAction();
      if (choice.kind === "fled") { outcome = "fled"; break; }
      if (choice.kind === "caught") { outcome = "caught"; break; }
      const pAction: Action = choice.kind === "move" ? { kind: "move", slot: choice.slot }
        : choice.kind === "switch" ? { kind: "switch", index: choice.index } : { kind: "none" };
      const fAction = chooseFoeAction(this.s, this.aiKind, ctx.rng);
      const events = resolveTurn(this.s, pAction, fAction, ctx.rng);
      await this.play(events);
      outcome = await this.afterTurn();
    }
    await this.ending(outcome);
    return outcome;
  }

  private makeTrainerQ(species: SpeciesId, level: number, moves?: string[]): Quickened {
    const q = createQuickened(this.data, species, level, this.ctx.rng);
    q.ivs = trainerIvs();
    q.sport = false;
    recalcStats(this.data, q);
    q.hp = q.stats.hp;
    if (moves && moves.length) q.moves = moves.slice(0, 4).map((id) => ({ id, pp: getMove(this.data, id).pp }));
    return q;
  }

  // -------------------------------------------------------------------------
  // Intro
  // -------------------------------------------------------------------------

  private async intro() {
    const ctx = this.ctx;
    const f = this.flow;
    const foe = this.foe();
    // Fade in from the engine's transition.
    this.playerTrainer.visible = true;
    this.playerTrainer.dx = 152;
    if (this.trainer) {
      this.enemyTrainer.visible = true;
      this.enemyTrainer.dx = -152;
    } else {
      this.enemy.species = foe.species;
      this.enemy.sport = foe.sport;
      this.enemy.visible = true;
      this.enemy.dx = -152;
    }
    await f.animate(10, (_i, t) => { this.fade = 1 - t; });
    this.fade = 0;
    await f.animate(48, (_i, t) => {
      const k = Math.round((1 - t) * 152);
      this.playerTrainer.dx = k;
      if (this.trainer) this.enemyTrainer.dx = -k; else this.enemy.dx = -k;
    });
    this.podRows.player = true;
    if (this.trainer) {
      this.podRows.enemy = true;
      await f.animate(10, (_i, t) => {
        this.podRows.playerDx = Math.round((1 - t) * 64);
        this.podRows.enemyDx = -Math.round((1 - t) * 64);
      });
      await this.say(`${this.trainerName} wants to battle!`, "wait");
      // Trainer steps aside and sends out the lead.
      this.podRows.enemy = false;
      await f.animate(20, (_i, t) => { this.enemyTrainer.dx = Math.round(t * 72); });
      this.enemyTrainer.visible = false;
      await this.sendOutFoeAnim(`${this.trainerName} sent out ${qName(this.data, foe)}!`);
    } else {
      await f.animate(10, (_i, t) => { this.podRows.playerDx = Math.round((1 - t) * 64); });
      void ctx.audio.playCry(foe.species);
      if (foe.sport) await f.wait(this.fx.sparkle(ENEMY_CENTER));
      markSeen(ctx, foe.species);
      this.setHud(1);
      this.enemyHud.visible = true;
      await this.say(`Wild ${qName(this.data, foe)} appeared!`, "wait");
    }
    // Player sends out the lead.
    this.podRows.player = false;
    await f.animate(16, (_i, t) => { this.playerTrainer.dx = -Math.round(t * 64); });
    this.playerTrainer.visible = false;
    await this.sendOutPlayerAnim();
  }

  private async sendOutFoeAnim(text: string) {
    const foe = this.foe();
    markSeen(this.ctx, foe.species);
    const v = this.enemy;
    v.species = foe.species;
    v.sport = foe.sport;
    v.visible = true;
    v.dx = 0; v.drop = 0;
    v.scale = 0.1;
    v.silhouette = UI.white;
    const say = this.say(text, "hold");
    this.ctx.audio.playSfx("pod_throw");
    this.fx.puff(ENEMY_CENTER);
    await this.flow.animate(12, (_i, t) => { v.scale = 0.1 + 0.9 * t; if (t > 0.6) v.silhouette = null; });
    v.scale = 1; v.silhouette = null;
    void this.ctx.audio.playCry(foe.species);
    if (foe.sport) await this.flow.wait(this.fx.sparkle(ENEMY_CENTER));
    this.setHud(1);
    this.enemyHud.visible = true;
    await say;
    await this.flow.wait(20);
  }

  private async sendOutPlayerAnim() {
    const me = this.me();
    const v = this.player;
    v.species = me.species;
    v.sport = me.sport;
    v.visible = true;
    v.dx = 0; v.drop = 0;
    v.scale = 0.1;
    v.silhouette = UI.white;
    const say = this.say(`Go! ${qName(this.data, me)}!`, "hold");
    this.ctx.audio.playSfx("pod_throw");
    this.fx.puff(PLAYER_CENTER);
    await this.flow.animate(12, (_i, t) => { v.scale = 0.1 + 0.9 * t; if (t > 0.6) v.silhouette = null; });
    v.scale = 1; v.silhouette = null;
    void this.ctx.audio.playCry(me.species);
    if (me.sport) await this.flow.wait(this.fx.sparkle(PLAYER_CENTER));
    this.setHud(0);
    this.playerHud.visible = true;
    await say;
    await this.flow.wait(20);
  }

  private async withdrawAnim(side: Side) {
    const v = this.viewOf(side);
    v.silhouette = UI.white;
    await this.flow.animate(10, (_i, t) => { v.scale = 1 - t; });
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
      this.ui.tb.clear();
      const cmd = new Menu(this.ctx, ["FIGHT", "BAG", "QUICKENED", "RUN"], {
        x: 0, y: TEXTBOX.y, w: 160, h: 48, cols: 2, colW: 88, spacing: 16, cancel: false, start: this.lastCmd,
      });
      const c = await this.ui.choose(cmd, (g) => {
        cmd.draw(g);
      });
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

  private async fightMenu(): Promise<Choice | null> {
    const me = this.me();
    if (!hasUsableMove(me)) return { kind: "move", slot: -1 };
    const labels = me.moves.map((m) => getMove(this.data, m.id).name.toUpperCase());
    while (labels.length < 4) labels.push("-");
    for (;;) {
      const menu = new Menu(this.ctx, labels, {
        x: 32, y: TEXTBOX.y, w: 128, h: 48, spacing: 8, start: Math.min(this.lastMove, me.moves.length - 1),
      });
      const r = await this.ui.choose(menu, (g) => {
        menu.draw(g);
        this.drawMoveInfo(g, menu.index);
      });
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
    this.ctx.ui.drawWindow(g, 0, 56, 80, 40);
    if (!m) return;
    const mv = getMove(this.data, m.id);
    this.ctx.ui.drawText(g, "TYPE/", 8, 64);
    const cat = mv.category === "physical" ? "PHY" : mv.category === "special" ? "SPC" : "STA";
    drawTiny(g, cat, 58, 65, UI.dark);
    this.ctx.ui.drawText(g, TYPE_NAMES[mv.type] ?? String(mv.type).toUpperCase(), 16, 72);
    drawTiny(g, "PP", 8, 82);
    this.ctx.ui.drawText(g, `${pad(m.pp, 2)}/${pad(mv.pp, 2)}`, 24, 80);
  }

  /** Party pick for a switch. Returns an index or -1. */
  private async pickSwitch(cancelable: boolean): Promise<number> {
    for (;;) {
      const start = Math.max(0, this.party.findIndex((q, i) => q.hp > 0 && i !== this.s.sides[0].active));
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
      if (res.hpTo !== res.hpFrom) await this.animateHp(0, res.hpFrom, res.hpTo);
      this.playerHud.status = q.status;
    }
    await this.say(res.text, "auto");
    return { kind: "used_item" };
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

    // Arc from the player's side to the foe.
    const t0 = this.thrown;
    t0.visible = true;
    t0.open = 0;
    t0.wobble = 0;
    ctx.audio.playSfx("pod_throw");
    await this.flow.animate(26, (_i, t) => {
      t0.x = Math.round(24 + (ENEMY_CENTER.x - 4 - 24) * t);
      t0.y = Math.round(78 + (14 - 78) * t - Math.sin(t * Math.PI) * 36);
    });
    // Open and pull the foe in.
    t0.open = 3;
    this.fx.flash = { color: "rgba(255,255,255,0.6)", frames: 3 };
    const v = this.enemy;
    v.silhouette = UI.white;
    await this.flow.animate(14, (_i, t) => { v.scale = 1 - t; v.dy = -Math.round(t * 16); });
    v.visible = false;
    v.scale = 1; v.dy = 0; v.silhouette = null;
    t0.open = 0;
    await this.flow.wait(8);
    // Drop to the ground with a bounce.
    await this.flow.animate(14, (_i, t) => {
      const bounce = t < 0.7 ? t / 0.7 : 1 - Math.sin(((t - 0.7) / 0.3) * Math.PI) * 0.15;
      t0.y = Math.round(14 + (42 - 14) * bounce);
    });
    const r = attemptCapture(foe, species.catchRate, mult, ctx.state.herbarium.caught.length, ctx.rng);
    await this.flow.wait(r.critical ? 10 : 20);
    for (let i = 0; i < r.shakes; i++) {
      ctx.audio.playSfx("pod_shake");
      await this.flow.animate(16, (k) => { t0.wobble = [0, -1, -2, -2, -1, 0, 1, 2, 2, 1, 0, 0, 0, 0, 0, 0][k] ?? 0; });
      t0.wobble = 0;
      await this.flow.wait(18);
    }
    if (r.caught) {
      ctx.audio.playSfx("pod_click");
      await this.flow.wait(this.fx.stars({ x: t0.x + 4, y: t0.y }));
      const name = qName(this.data, foe);
      this.enemyHud.visible = false;
      const jingle = ctx.audio.playJingle("caught");
      if (r.critical) await this.say("A critical capture!", "auto");
      await this.say(`Gotcha! ${name} was caught!`, "wait");
      await jingle;
      const first = markCaught(ctx, foe.species);
      foe.metAt = { map: ctx.state.position.map, level: foe.level };
      foe.friendship = Math.max(foe.friendship, 70);
      if (first && hasHerbarium(ctx)) {
        await this.say(`${name}'s data was added to the FIELD HERBARIUM.`, "wait");
        await showHerbariumEntry(ctx, foe.species);
      }
      if (this.party.length < 6) {
        this.party.push(foe);
      } else {
        ctx.state.box.push(foe);
        await this.say(`${name} was sent to the CABINET.`, "wait");
      }
      t0.visible = false;
      return { kind: "caught" };
    }
    // Broke free.
    t0.visible = false;
    this.fx.puff({ x: t0.x + 4, y: t0.y + 4 });
    v.visible = true;
    v.silhouette = UI.white;
    await this.flow.animate(10, (_i, t) => { v.scale = t; });
    v.scale = 1; v.silhouette = null;
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
    for (const e of events) await this.playOne(e);
  }

  private async playOne(e: BattleEvent) {
    const f = this.flow;
    const ctx = this.ctx;
    switch (e.t) {
      case "text":
        await this.say(e.text, "auto");
        break;
      case "anim": {
        const from = this.centerOf(e.side);
        const to = this.centerOf(e.side === 0 ? 1 : 0);
        if (e.category === "physical" && !e.selfTarget) await this.lunge(e.side);
        const n = this.fx.move(e.type, e.category, from, to, e.selfTarget);
        await f.wait(n);
        break;
      }
      case "hp": {
        if (e.kind === "hit") {
          const eff = e.eff ?? 1;
          ctx.audio.playSfx(eff > 1 ? "hit_super" : eff < 1 ? "hit_weak" : "hit");
          await this.hitFlash(e.side, eff > 1 || !!e.crit);
        } else if (e.kind === "recoil") {
          ctx.audio.playSfx("hit_weak");
          await this.hitFlash(e.side, false);
        } else if (e.kind === "drain") {
          const other: Side = e.side === 0 ? 1 : 0;
          await f.wait(this.fx.drain(this.centerOf(other), this.centerOf(e.side)));
        }
        await this.animateHp(e.side, e.from, e.to);
        break;
      }
      case "status":
        this.hudOf(e.side).status = e.status;
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
      case "item":
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

  private async hitFlash(side: Side, shake: boolean) {
    const v = this.viewOf(side);
    await this.flow.animate(24, (i) => {
      v.hidden = Math.floor(i / 4) % 2 === 0;
      if (shake) this.shake.x = i < 16 ? (Math.floor(i / 2) % 2 === 0 ? 2 : -2) : 0;
    });
    v.hidden = false;
    this.shake.x = 0;
  }

  private async animateHp(side: Side, from: number, to: number) {
    const h = this.hudOf(side);
    const q = h.q ?? active(this.s, side);
    const max = Math.max(1, q.stats.hp);
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
    await this.flow.animate(18, (_i, t) => { v.drop = Math.round(t * 56); });
    v.visible = false;
    v.drop = 0;
    this.hudOf(side).visible = false;
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
      const r = await this.forcedSwitch();
      if (r) return r;
    }
    if (foeNext >= 0) {
      const next = this.s.sides[1].party[foeNext];
      // Shift: offer a switch before the trainer's next one comes out.
      if (this.me().hp > 0 && this.party.filter((q) => q.hp > 0).length > 1) {
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
        const runner = this.party.find((q) => q.hp > 0)!;
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
      h.exp = 0;
    }
    await fill(cur, to);
  }

  private async levelUp(q: Quickened, up: LevelUp, isActive: boolean) {
    this.leveled.add(q.uid);
    if (isActive) {
      this.playerHud.level = up.level;
      this.playerHud.hp = q.hp;
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
    await this.flow.animate(20, (_i, k) => { this.enemyTrainer.dx = Math.round((1 - k) * 72); });
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
      const time = this.ctx.timeOfDay();
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
}
