// Move animations, one renderer per family (see ./anims for the mapping).
// Each spawns particles / layers on the shared Fx and returns its length in
// frames. All drawing is whole-pixel, small palettes, light from top-left.

import type { TypeId } from "../contracts";
import type { AnimSpec } from "./anims";
import {
  blit, checker, ellipse, Fx, line, px, R, rect, RI, ring, SPR, SpriteFxHost, starBurst, type Pt,
} from "./fx";

export interface MoveStage {
  from: Pt;          // user centre
  to: Pt;            // target centre
  fromGround: Pt;    // user's ground line
  toGround: Pt;      // target's ground line
  userSide: 0 | 1;
  sprites: SpriteFxHost;
}

type Pal = { a: string; b: string; c: string };

const PAL = {
  leaf: { a: "#58a040", b: "#285820", c: "#a8e070" },
  vine: { a: "#489038", b: "#204818", c: "#90d060" },
  cane: { a: "#a06840", b: "#4a2818", c: "#e0b080" },
  bark: { a: "#8a5030", b: "#4a2818", c: "#c88850" },
  seed: { a: "#a87038", b: "#583010", c: "#e0b070" },
  sap: { a: "#e8a030", b: "#905010", c: "#f8e090" },
  oil: { a: "#f07020", b: "#982010", c: "#f8d060" },
  dew: { a: "#d0e880", b: "#708830", c: "#ffffff" },
  resin: { a: "#c02828", b: "#581010", c: "#f09080" },
  fire: { a: "#f89028", b: "#c03010", c: "#f8e878" },
  water: { a: "#3888e0", b: "#183888", c: "#a0d8f8" },
  frost: { a: "#a8e0f8", b: "#3878a0", c: "#ffffff" },
  petal: { a: "#f090c0", b: "#a03870", c: "#f8e0f0" },
  pale: { a: "#e8e0f8", b: "#8070b0", c: "#ffffff" },
  ghost: { a: "#9078c8", b: "#382860", c: "#d8c8f8" },
  toxin: { a: "#9850b8", b: "#482060", c: "#d8a8f0" },
  rot: { a: "#88905a", b: "#404820", c: "#c8c890" },
  pollen: { a: "#f8d040", b: "#b08010", c: "#f8f0a0" },
  sleep: { a: "#a090c0", b: "#504078", c: "#e0d8f0" },
  sun: { a: "#f8d050", b: "#c08020", c: "#f8f8c0" },
  moon: { a: "#c8c0f0", b: "#6058a0", c: "#ffffff" },
  trap: { a: "#58a040", b: "#204818", c: "#e04848" },
  acid: { a: "#c0d838", b: "#607010", c: "#f0f8a0" },
  stone: { a: "#b8b0a0", b: "#585048", c: "#e8e0d0" },
  thorn: { a: "#c09858", b: "#584018", c: "#f0e0b0" },
  ice: { a: "#c8f0f8", b: "#4888b8", c: "#ffffff" },
  wood: { a: "#c89050", b: "#6a4020", c: "#f0d0a0" },
  clover: { a: "#68b848", b: "#286828", c: "#d0f0a0" },
  holly: { a: "#2c7038", b: "#103818", c: "#88c890" },
  rose: { a: "#b04838", b: "#501818", c: "#f8b0b8" },
  mint: { a: "#98e8c8", b: "#287868", c: "#ffffff" },
  digitalis: { a: "#b060c0", b: "#582868", c: "#f0c8f0" },
} satisfies Record<string, Pal>;

const dirOf = (s: MoveStage) => (s.to.x >= s.from.x ? 1 : -1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
function bez(p0: Pt, c: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
}
const targetSide = (s: MoveStage): 0 | 1 => (s.userSide === 0 ? 1 : 0);

/** Play a move's animation; returns its length in frames. */
export function playMoveFx(fx: Fx, spec: AnimSpec, type: TypeId, s: MoveStage): number {
  const v = spec.variant;
  switch (spec.family) {
    case "vine_whip": return vineWhip(fx, s, v === "thorn");
    case "seed_arc": return seedArc(fx, s, v === "burr");
    case "heavy_drop": return heavyDrop(fx, s, (v as "acorn" | "gourd" | "log" | "fossil" | "apple") ?? "acorn");
    case "spin_seed": return spinSeed(fx, s);
    case "wind_seeds": return windSeeds(fx, s, v === "fluff");
    case "slash": return slash(fx, s, v ?? "leaf");
    case "drain": return drain(fx, s, v === "acid");
    case "glob": return glob(fx, s, v ?? "sap");
    case "gale": return gale(fx, s, v === "petal");
    case "roots": return roots(fx, s, v === "tap");
    case "toxin": return toxin(fx, s, v === "rot" ? "rot" : v === "digitalis" ? "digitalis" : "toxin");
    case "harden": return harden(fx, s, v ?? "bark");
    case "bristle": return bristle(fx, s);
    case "shield": return shield(fx, s);
    case "light_rays": return lightRays(fx, s, v === "track");
    case "rush": return rush(fx, s);
    case "grow": return grow(fx, s, v === "old");
    case "ember": return ember(fx, s);
    case "smoke": return smoke(fx, s);
    case "burst": return burst(fx, s, v === "pale");
    case "blaze": return blaze(fx, s);
    case "droplet": return droplet(fx, s);
    case "wave": return wave(fx, s, v === "flood");
    case "downpour": return downpour(fx, s);
    case "slam": return slam(fx, s, v === "struggle");
    case "pitfall": return pitfall(fx, s, v);
    case "mist": return mist(fx, s, v === "cold");
    case "snap":
      if (v === "dragon") return dragonSnap(fx, s);
      return snap(fx, s, v === "quick" || v === "dragon_nip", v === "dragon_nip" ? DRAGON_JAW : undefined);
    case "tendrils": return tendrils(fx, s, v === "dodder");
    case "lure": return lure(fx, s, v === "scent");
    case "spores": return spores(fx, s, v === "sleep");
    case "beam": return beam(fx, s, v === "moon");
    case "ghost_touch": return ghostTouch(fx, s);
    case "wither": return wither(fx, s);
    case "volley": return volley(fx, s, v ?? "spines");
    case "frost": return frost(fx, s, v === "bloom", v === "menthol");
    case "blizzard": return blizzard(fx, s);
    case "weather_sun": return weatherSun(fx, s);
    case "weather_rain": return weatherRain(fx, s);
    case "weather_frost": return weatherFrost(fx, s);
  }
  void type;
  return 30;
}

// ---------------------------------------------------------------------------
// Wood
// ---------------------------------------------------------------------------

function vineWhip(fx: Fx, s: MoveStage, thorn: boolean): number {
  const p = thorn ? PAL.cane : PAL.vine;
  const d = dirOf(s);
  const base = { x: s.from.x + d * 12, y: s.from.y + (s.userSide === 0 ? -2 : 8) };
  const N = 40;
  fx.layer(N, (g, f) => {
    // extend 0-10, lash 10-30, retract 30-40
    const ext = f < 10 ? (f + 1) / 10 : f < 30 ? 1 : 1 - (f - 30) / 10;
    const lash = f < 10 ? 0 : f < 30 ? (f - 10) / 20 : 1;
    const swing = Math.sin(lash * Math.PI * 2) * 16;
    const tip = { x: s.to.x - d * 2 + Math.cos(lash * Math.PI * 2) * 6 * d, y: s.to.y + swing };
    const ctrl = { x: lerp(base.x, s.to.x, 0.5), y: Math.min(base.y, s.to.y) - 18 - swing * 0.5 };
    const steps = 40;
    let prev = base;
    for (let i = 1; i <= Math.round(steps * ext); i++) {
      const q = bez(base, ctrl, tip, i / steps);
      line(g, prev.x - 1, prev.y - 1, q.x - 1, q.y - 1, p.b, 3);
      rect(g, q.x, q.y, 1, 1, p.a);
      if (i % 3 === 0) px(g, q.x - 1, q.y - 1, p.c);
      if (i % 6 === 3 && i > 4) {
        // a leaf (or thorn) along the vine, alternating sides
        const side = Math.floor(i / 6) % 2 ? -1 : 1;
        if (thorn) { px(g, q.x + side, q.y - 3, "#f0e0b0"); px(g, q.x + side * 2, q.y - 4, "#f0e0b0"); px(g, q.x + side, q.y - 2, p.b); }
        else blit(g, side < 0 ? ["..bb", ".bca", "bcab", "bab."] : [".bab", "bacb", "acb.", "bb.."], q.x + side * 3, q.y - 3, { a: PAL.leaf.a, b: PAL.leaf.b, c: PAL.leaf.c });
      }
      prev = q;
    }
  });
  for (const k of [16, 26]) {
    fx.at(k, () => { fx.impact({ x: s.to.x + R(-6, 6), y: s.to.y + R(-6, 8) }); fx.shake(4, 1); });
  }
  return N + 2;
}

function seedArc(fx: Fx, s: MoveStage, burr: boolean): number {
  const n = burr ? 3 : 5;
  const p = burr ? PAL.thorn : PAL.seed;
  const d = dirOf(s);
  for (let i = 0; i < n; i++) {
    const tx = s.to.x + R(-12, 12), ty = s.to.y + R(-8, 10);
    fx.add({
      x: s.from.x, y: s.from.y, shape: burr ? "burr" : "seed", color: p.a, color2: p.b, color3: p.c, max: 16, delay: i * 5,
      to: { sx: s.from.x + d * 8, sy: s.from.y - 6, x: tx, y: ty, arc: R(18, 28) },
      onEnd: (q) => {
        fx.impact({ x: q.x, y: q.y }, "#f8f8f8", p.c);
        if (burr) {
          // the burr hooks on and jiggles there
          fx.layer(14, (g, f) => blit(g, SPR.burr, q.x + (f % 4 < 2 ? 1 : 0), q.y, { a: p.a, b: p.b, c: p.c }));
        }
      },
    });
  }
  return n * 5 + 16 + (burr ? 16 : 6);
}

function heavyDrop(fx: Fx, s: MoveStage, kind: "acorn" | "gourd" | "log" | "fossil" | "apple"): number {
  const art = kind === "gourd" || kind === "apple" ? SPR.gourd : kind === "log" ? SPR.log : kind === "fossil" ? SPR.fossil : SPR.acorn;
  const pal: Record<string, string> = kind === "gourd" ? { a: "#e88830", b: "#804010", c: "#f8c870" }
    : kind === "apple" ? { a: "#d83830", b: "#681818", c: "#f8a078" }
    : kind === "log" ? { a: "#a06838", b: "#4a2818", c: "#d8a870", w: "#f0d8b0" }
    : kind === "fossil" ? { a: "#c8c0b0", b: "#605850", c: "#f0e8d8" }
    : { a: "#c08848", b: "#5a3418", c: "#f0c888" };
  const fall = kind === "log" ? 14 : 18;
  const landY = s.to.y + (kind === "log" ? 6 : 4);
  const y0 = -16;
  const N = fall + 24;
  // shadow grows on the ground first
  fx.layer(fall, (g, f) => {
    const r = 3 + Math.floor((f / fall) * (kind === "log" ? 12 : 8));
    checker(g, s.toGround.x - r, s.toGround.y - 1, r * 2, 3, "#384030", 0);
  }, { back: true });
  fx.layer(N, (g, f) => {
    let y: number;
    let x = s.to.x;
    if (f < fall) y = lerp(y0, landY, (f / fall) ** 2);
    else {
      const k = f - fall;
      y = landY - Math.round(Math.sin(Math.min(1, k / 10) * Math.PI) * (kind === "acorn" ? 8 : 3));
      if (kind === "log") x += Math.min(k, 10) * 0.6 * dirOf(s);
      if (k > 14 && (k >> 1) % 2 === 0) return; // blink out
    }
    blit(g, art, x, y, pal);
  });
  fx.at(fall, () => {
    fx.impact({ x: s.to.x, y: landY + 2 }, "#ffffff", "#f8d040", true);
    fx.shake(12, kind === "acorn" ? 2 : 3, "y");
    fx.dust(s.toGround, 8);
    s.sprites.add(targetSide(s), "squash", 8);
    if (kind === "fossil") fx.flashScreen("#f8f0d8", 2);
  });
  return N + 2;
}

function spinSeed(fx: Fx, s: MoveStage): number {
  const N = 34;
  for (let k = 0; k < 2; k++) {
    const trail: Pt[] = [];
    fx.layer(N - 6, (g, f) => {
      const t = clamp01(f / (N - 10));
      const a = t * Math.PI * 4 + k * Math.PI;
      const c = { x: lerp(s.from.x, s.to.x, t), y: lerp(s.from.y - 8, s.to.y, t) - Math.sin(t * Math.PI) * 16 };
      const pos = { x: c.x + Math.cos(a) * 8 * (1 - t * 0.6), y: c.y + Math.sin(a) * 5 * (1 - t * 0.6) };
      trail.push(pos);
      if (trail.length > 5) trail.shift();
      trail.forEach((q, i) => { if (i % 2 === 0) px(g, q.x, q.y, PAL.wood.c); });
      // samara: nut + rotating wing
      const wa = f * 0.7 + k;
      const ex = Math.cos(wa) * 11, ey = Math.sin(wa) * 5;
      line(g, pos.x - 1, pos.y - 1, pos.x + ex - 1, pos.y + ey - 1, "#6a4020", 4);
      line(g, pos.x, pos.y, pos.x + ex, pos.y + ey, "#d8a060", 2);
      line(g, pos.x + ex * 0.4, pos.y + ey * 0.4, pos.x + ex, pos.y + ey, "#f8e0b0", 1);
      rect(g, pos.x - 2, pos.y - 2, 5, 5, "#3a2010");
      rect(g, pos.x - 1, pos.y - 1, 3, 3, "#a06838");
      px(g, pos.x - 1, pos.y - 1, "#e0b070");
    }, { delay: k * 6 });
  }
  fx.at(N - 6, () => { fx.impact(s.to); fx.shake(4, 1); });
  fx.at(N, () => fx.impact({ x: s.to.x + 6, y: s.to.y + 4 }));
  return N + 4;
}

function windSeeds(fx: Fx, s: MoveStage, fluff = false): number {
  const d = dirOf(s);
  const N = 44;
  windLines(fx, N, d, 0, 96);
  // Cattail fluff: a denser drift of buff-brown down instead of white parachutes.
  for (let i = 0; i < (fluff ? 11 : 7); i++) {
    fx.add({
      x: s.from.x, y: s.from.y, shape: "tuft", color: fluff ? (i % 2 ? "#f0e0c0" : "#f8f0e0") : "#f8f8f8",
      color2: fluff ? "#8a6038" : "#806848", color3: fluff ? "#c8a070" : "#90a0b0", max: 26, delay: i * (fluff ? 2 : 3), sway: 2,
      to: { sx: s.from.x + d * 6 + R(-6, 6), sy: s.from.y - 8 + R(-8, 8), x: s.to.x + R(-14, 14), y: s.to.y + R(-12, 10), arc: R(6, 20) },
      onEnd: (q) => fx.add({ x: q.x, y: q.y, shape: "twinkle", color: "#ffffff", color2: "#c8e0f0", max: 8 }),
    });
  }
  return N;
}

function windLines(fx: Fx, frames: number, d: number, y0: number, y1: number, color = "#98b0c0", color2 = "#c0d0d8") {
  const lines = Array.from({ length: 9 }, (_, i) => ({ y: Math.round(lerp(y0 + 4, y1 - 6, i / 8) + R(-3, 3)), len: RI(8, 18), off: RI(0, 160), sp: R(4, 7) }));
  fx.layer(frames, (g, f) => {
    for (const l of lines) {
      const x = d > 0 ? ((l.off + f * l.sp) % 200) - 20 : 180 - ((l.off + f * l.sp) % 200);
      rect(g, x, l.y, l.len, 1, l.len > 13 ? color : color2);
    }
  });
}

function slash(fx: Fx, s: MoveStage, kind: string): number {
  if (kind === "frond") return frond(fx, s);
  const hook = kind === "hook" || kind === "holly";
  const p = kind === "holly" ? PAL.holly : kind === "clover" ? PAL.clover : hook ? PAL.thorn : PAL.leaf;
  const leafPal = kind === "clover" ? PAL.clover : PAL.leaf;
  const cuts = hook ? [{ dx: 1, dy: 1 }, { dx: -1, dy: 1 }] : [{ dx: 1, dy: 1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 }];
  cuts.forEach((c, i) => {
    const off = hook ? 0 : (i - 1) * 7;
    fx.layer(12, (g, f) => {
      const grow = clamp01((f + 1) / 5);
      if (f > 8 && f % 2 === 0) return;
      const len = 30 * grow;
      for (const pass of [0, 1]) {
        for (let k = 0; k <= len; k++) {
          const t = k / 30;
          const x = s.to.x + off + c.dx * (t * 30 - 15);
          const y = s.to.y + c.dy * (t * 30 - 15) + Math.round(Math.sin(t * Math.PI) * 4) * -c.dx;
          const w = t > 0.2 && t < 0.8 ? 2 : 1;
          if (pass === 0) rect(g, x - 1, y - 1, w + 2, w + 2, p.b);
          else rect(g, x, y, w, w, k > len - 3 ? p.c : "#ffffff");
        }
      }
    }, { delay: i * 7 });
    fx.at(i * 7 + 3, () => {
      fx.impact({ x: s.to.x + off, y: s.to.y }, "#ffffff", p.c);
      fx.shake(4, hook ? 2 : 1);
      if (!hook) for (let k = 0; k < 3; k++) fx.add({ x: s.to.x + off, y: s.to.y, vx: R(-1.2, 1.2), vy: R(-1.4, -0.4), ay: 0.08, shape: "leaf", color: leafPal.a, color2: leafPal.b, color3: leafPal.c, max: 18, blink: true });
      // a lucky glint on each clover cut
      if (kind === "clover") fx.add({ x: s.to.x + off + R(-6, 6), y: s.to.y + R(-8, 4), shape: "twinkle", color: "#ffffff", color2: "#f8d850", max: 12 });
    });
  });
  if (kind === "hook") fx.at(10, () => { for (let k = 0; k < 6; k++) fx.add({ x: s.to.x, y: s.to.y, vx: R(-1.6, 1.6), vy: R(-1.6, 0.4), ay: 0.1, shape: "hair", color: PAL.thorn.b, color2: PAL.thorn.a, max: 16, flip: k % 2 === 0, blink: true }); });
  // holly: glossy spined leaves and a couple of red berries knocked loose
  if (kind === "holly") fx.at(10, () => {
    for (let k = 0; k < 5; k++) fx.add({ x: s.to.x, y: s.to.y, vx: R(-1.6, 1.6), vy: R(-1.8, -0.2), ay: 0.1, shape: "leaf", color: PAL.holly.a, color2: PAL.holly.b, color3: PAL.holly.c, max: 18, flip: k % 2 === 0, blink: true });
    for (let k = 0; k < 2; k++) fx.add({ x: s.to.x + R(-4, 4), y: s.to.y, vx: R(-1, 1), vy: R(-1.6, -0.8), ay: 0.12, shape: "bubble", color: "#d02828", color2: "#f8a0a0", max: 18 });
  });
  return cuts.length * 7 + 14;
}

function frond(fx: Fx, s: MoveStage): number {
  const d = dirOf(s);
  const N = 26;
  const pivot = { x: s.to.x - d * 26, y: s.to.y - 34 };
  fx.layer(N, (g, f) => {
    const t = clamp01(f / 16);
    const a0 = d > 0 ? Math.PI * 0.05 : Math.PI * 0.95;
    const a1 = d > 0 ? Math.PI * 0.75 : Math.PI * 0.25;
    const a = lerp(a0, a1, 1 - (1 - t) * (1 - t));
    const L = 44;
    for (let k = 4; k < L; k++) {
      const x = pivot.x + Math.cos(a) * k;
      const y = pivot.y + Math.sin(a) * k;
      px(g, x, y, "#5a3418");
      if (k % 3 === 0) {
        const ll = Math.max(2, Math.round(7 * Math.sin((k / L) * Math.PI)));
        const nx = -Math.sin(a), ny = Math.cos(a);
        line(g, x, y, x + nx * ll, y + ny * ll - 1, "#3c8838");
        line(g, x, y, x - nx * ll, y - ny * ll - 1, "#3c8838");
        px(g, x + nx * ll, y + ny * ll - 1, "#90d070");
      }
    }
    // motion smear behind the frond
    if (f < 16 && f > 2) for (let k = 20; k < L; k += 4) px(g, pivot.x + Math.cos(a - 0.2 * d) * k, pivot.y + Math.sin(a - 0.2 * d) * k, "#d8e8c8");
  });
  fx.at(10, () => { fx.impact(s.to, "#ffffff", "#c8f0a0", true); fx.shake(8, 2); });
  return N + 4;
}

function drain(fx: Fx, s: MoveStage, acid: boolean): number {
  const p = acid ? PAL.acid : PAL.leaf;
  const ts = targetSide(s);
  s.sprites.add(ts, "tint", 14, { color: p.c });
  if (acid) for (let i = 0; i < 8; i++) fx.add({ x: s.to.x + R(-14, 14), y: s.to.y + R(0, 16), vy: -0.6, sway: 1, shape: "bubble", color: p.b, color2: p.c, max: 18, delay: i * 2, blink: true });
  fx.layer(14, (g, f) => { if (f % 4 < 2) ring(g, s.to.x, s.to.y, 22 - f, 16 - f, p.a); });
  return 14 + fx.drain(s.to, s.from, p.c, p.b) - 10;
}

function glob(fx: Fx, s: MoveStage, kind: string): number {
  const p = kind === "oil" ? PAL.oil : kind === "dew" ? PAL.dew : kind === "resin" ? PAL.resin : PAL.sap;
  const d = dirOf(s);
  const n = 3;
  for (let i = 0; i < n; i++) {
    const tx = s.to.x + (i - 1) * 9 + R(-3, 3), ty = s.to.y + R(-8, 6);
    fx.add({
      x: s.from.x, y: s.from.y, shape: "glob", color: p.a, color2: p.b, color3: p.c, size: i === 0 ? 1 : 0, max: 15, delay: i * 5,
      to: { sx: s.from.x + d * 8, sy: s.from.y - 4, x: tx, y: ty, arc: 20 },
      onEnd: (q) => {
        fx.shake(3, 1);
        splat(fx, { x: q.x, y: q.y }, p, i === 0 ? 6 : 4);
        if (kind === "oil") for (let k = 0; k < 4; k++) fx.add({ x: q.x + R(-6, 6), y: q.y + R(-2, 4), vy: R(-1, -0.5), shape: "ember", color: PAL.fire.a, color2: PAL.fire.b, max: 16, delay: k * 2 });
      },
    });
  }
  return n * 5 + 15 + 22;
}

/** A splat that spreads, then drips. */
function splat(fx: Fx, at: Pt, p: Pal, r: number) {
  const drips = Array.from({ length: 3 }, () => ({ x: Math.round(at.x + R(-r, r)), len: RI(3, 7) }));
  fx.layer(22, (g, f) => {
    const rr = Math.min(r, 2 + f);
    ellipse(g, at.x, at.y, rr, Math.max(1, rr - 2), p.b);
    ellipse(g, at.x, at.y - 1, rr - 1, Math.max(1, rr - 3), p.a);
    px(g, at.x - rr + 2, at.y - 2, p.c);
    if (f > 4) for (const dr of drips) {
      const h = Math.min(dr.len, f - 4);
      rect(g, dr.x, at.y + 1, 1, h, p.a);
      px(g, dr.x, at.y + 1 + h, p.b);
    }
    if (f < 4) for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; px(g, at.x + Math.cos(a) * (r + f * 2), at.y + Math.sin(a) * (r + f), p.a); }
  });
}

function gale(fx: Fx, s: MoveStage, petal: boolean): number {
  const p = petal ? PAL.petal : PAL.leaf;
  const N = 52;
  if (petal) fx.tintScreen("#f8c8e0", N);
  windLines(fx, N, dirOf(s), 0, 96, petal ? "#d890b0" : "#88b070", petal ? "#f0c0d8" : "#b8d8a0");
  for (let i = 0; i < 26; i++) {
    fx.add({
      x: s.to.x, y: s.to.y, shape: petal ? "petal" : "leaf", color: i % 3 ? p.a : p.c, color2: p.b, color3: p.c, flip: i % 2 === 0,
      max: 34, delay: Math.floor(i * 0.7), blink: true,
      orbit: { cx: s.to.x, cy: s.to.y, r: 46, a: (i / 26) * Math.PI * 2, va: 0.2 * dirOf(s), vr: -1.2, squash: 0.55 },
    });
  }
  for (const k of [18, 28, 38]) fx.at(k, () => { fx.impact({ x: s.to.x + R(-10, 10), y: s.to.y + R(-8, 8) }, "#ffffff", p.c); fx.shake(3, 1); });
  return N;
}

function roots(fx: Fx, s: MoveStage, tap: boolean): number {
  const g0 = s.toGround;
  const start = tap ? 18 : 0;
  if (tap) {
    // a seed is planted first
    fx.add({
      x: s.from.x, y: s.from.y, shape: "seed", color: PAL.seed.a, color2: PAL.seed.b, color3: PAL.seed.c, max: 16,
      to: { sx: s.from.x, sy: s.from.y - 4, x: g0.x, y: g0.y - 2, arc: 22 },
      onEnd: () => fx.dust(g0, 4),
    });
  }
  const strands = [-20, -9, 4, 16];
  strands.forEach((ox, i) => {
    const lean = ox < 0 ? 1 : -1;
    fx.layer(34, (g, f) => {
      const h = Math.min(36, f * 3);
      let x = g0.x + ox;
      for (let k = 0; k < h; k++) {
        const curl = k > 22 ? (k - 22) * 0.6 * lean : 0;
        x = g0.x + ox + Math.round(Math.sin(k / 4 + i) * 2 + curl);
        const y = g0.y - k;
        rect(g, x, y, 2, 1, PAL.bark.b);
        if (k % 3 === 0) px(g, x, y, PAL.bark.c);
        if (k % 6 === 2) px(g, x + (k % 12 < 6 ? -1 : 2), y, PAL.bark.a);
      }
    }, { delay: start + i * 2 });
  });
  fx.at(start + 2, () => {
    fx.shake(10, 1, "y");
    for (let k = 0; k < 10; k++) fx.add({ x: g0.x + R(-18, 18), y: g0.y, vx: R(-1, 1), vy: R(-2, -0.8), ay: 0.12, shape: "clod", color: "#8a6038", color2: "#4a2818", max: 18 });
  });
  fx.at(start + 14, () => fx.impact(s.to, "#ffffff", "#c8a060"));
  if (tap) {
    fx.at(start + 22, () => {
      for (let k = 0; k < 8; k++) fx.add({ x: g0.x + R(-14, 14), y: g0.y, vy: -1.2, shape: "spore", color: "#78c050", color2: "#c8f0a0", max: 20, delay: k * 2 });
    });
  } else {
    // snare: bands cinch round the target
    fx.layer(20, (g, f) => {
      const r = 26 - Math.min(10, f);
      for (const dy of [-6, 6]) {
        for (let a = 0; a <= Math.PI; a += 0.08) {
          const x = s.to.x + Math.cos(a) * r, y = s.to.y + dy + Math.sin(a) * 4;
          rect(g, x, y, 2, 1, PAL.bark.b);
          if (Math.round(a * 20) % 5 === 0) px(g, x, y, PAL.bark.c);
        }
      }
    }, { delay: start + 16 });
    fx.at(start + 22, () => s.sprites.add(targetSide(s), "jitter", 14));
  }
  return start + 40;
}

function toxin(fx: Fx, s: MoveStage, kind: "toxin" | "rot" | "digitalis"): number {
  const rot = kind === "rot";
  const p = rot ? PAL.rot : kind === "digitalis" ? PAL.digitalis : PAL.toxin;
  // Foxglove: a few speckled bells drop onto the foe before the poison wells up.
  if (kind === "digitalis") {
    for (let i = 0; i < 4; i++) fx.add({ x: s.to.x + R(-14, 14), y: s.to.y - 30, vy: 1.1, sway: 1, shape: "petal", color: p.a, color2: p.b, color3: p.c, max: 20, delay: i * 4, blink: true });
  }
  const g0 = s.toGround;
  const N = 44;
  fx.tintScreen(rot ? "#b0b088" : "#c8a8d8", N);
  fx.layer(N, (g, f) => {
    const r = Math.min(22, 4 + f);
    ellipse(g, g0.x, g0.y, r, Math.max(1, Math.round(r / 5)), p.b);
    ellipse(g, g0.x, g0.y - 1, r - 3, Math.max(1, Math.round(r / 6)), p.a);
  }, { back: true });
  for (let i = 0; i < 18; i++) {
    fx.add({
      x: g0.x + R(-18, 18), y: g0.y - 2, vy: R(-1.1, -0.5), sway: 2, shape: rot ? "spore" : "bubble", color: p.a, color2: p.c,
      max: RI(18, 28), delay: 6 + i * 2,
      onEnd: (q) => { fx.add({ x: q.x, y: q.y, shape: "twinkle", color: p.c, color2: p.a, max: 4 }); },
    });
  }
  s.sprites.add(targetSide(s), "tint", 12, { color: p.a, delay: 18 });
  return N;
}

/** Corner brackets closing in on a point, plus a sprite shine. */
function brackets(fx: Fx, at: Pt, frames: number, col: string, col2: string, delay = 0) {
  fx.layer(frames, (g, f) => {
    const r = Math.max(16, 30 - f * 2);
    const ry = Math.round(r * 0.85);
    const L = 5;
    const c = f > frames - 6 && f % 2 ? col2 : col;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = at.x + sx * r, y = at.y + sy * ry;
      rect(g, sx < 0 ? x : x - L + 1, y, L, 2, c);
      rect(g, x - (sx < 0 ? 0 : 1), sy < 0 ? y : y - L + 2, 2, L, c);
    }
  }, { delay });
}

function harden(fx: Fx, s: MoveStage, kind: string): number {
  const p = kind === "sap" ? PAL.sap : kind === "night" ? PAL.ghost : kind === "evergreen" ? PAL.holly : PAL.bark;
  const at = s.from;
  if (kind === "evergreen") {
    // waxy evergreen leaves close round the user, glinting with frost
    brackets(fx, at, 20, p.b, p.c);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      fx.add({ x: at.x + Math.cos(a) * 26, y: at.y + Math.sin(a) * 20, shape: "leaf", color: p.a, color2: p.b, color3: p.c, max: 20, delay: i * 2, flip: i % 2 === 0,
        to: { sx: at.x + Math.cos(a) * 26, sy: at.y + Math.sin(a) * 20, x: at.x + Math.cos(a) * 12, y: at.y + Math.sin(a) * 10, arc: 0 } });
    }
    for (let i = 0; i < 6; i++) fx.add({ x: at.x + R(-16, 16), y: at.y + R(-14, 12), shape: "twinkle", color: "#ffffff", color2: "#c8f0f8", max: 12, delay: 18 + i * 3 });
    s.sprites.add(s.userSide, "shine", 14, { delay: 16 });
    s.sprites.add(s.userSide, "tint", 8, { color: "#88c890", delay: 24 });
    return 38;
  }
  brackets(fx, at, 20, p.b, p.c);
  s.sprites.add(s.userSide, "shine", 14, { delay: 8 });
  s.sprites.add(s.userSide, "tint", 8, { color: p.a, delay: 20 });
  if (kind === "bark") {
    // bark plates flash over the body
    fx.layer(12, (g, f) => {
      if (f % 4 >= 2) return;
      for (let i = 0; i < 6; i++) {
        const x = at.x - 12 + (i % 3) * 9, y = at.y - 8 + Math.floor(i / 3) * 10;
        rect(g, x, y, 7, 1, p.b); rect(g, x, y + 1, 1, 5, p.b); px(g, x + 1, y + 1, p.c);
      }
    }, { delay: 22 });
  } else if (kind === "sap") {
    for (let i = 0; i < 6; i++) fx.add({ x: at.x + R(-14, 14), y: at.y - 18, vy: 0.9, shape: "drop", color: p.a, color2: p.c, color3: p.b, max: 22, delay: 6 + i * 3, blink: true });
  } else {
    fx.tintScreen("#9890c8", 34);
    for (let i = 0; i < 6; i++) fx.add({ x: at.x + R(-18, 18), y: at.y + R(-16, 12), shape: "twinkle", color: "#ffffff", color2: p.c, max: 12, delay: 8 + i * 3 });
  }
  return 36;
}

function bristle(fx: Fx, s: MoveStage): number {
  const at = s.from;
  const p = PAL.thorn;
  for (const k of [0, 12]) {
    fx.layer(10, (g, f) => {
      const r0 = 10 + f, r1 = 14 + f * 2;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + (k ? 0.26 : 0);
        line(g, at.x + Math.cos(a) * r0, at.y + Math.sin(a) * r0 * 0.8, at.x + Math.cos(a) * r1, at.y + Math.sin(a) * r1 * 0.8, f > 6 ? p.c : p.b);
      }
    }, { delay: k });
  }
  s.sprites.add(s.userSide, "jitter", 8, { delay: 2 });
  s.sprites.add(s.userSide, "shine", 12, { delay: 18 });
  return 32;
}

function shield(fx: Fx, s: MoveStage): number {
  const at = s.from;
  fx.layer(40, (g, f) => {
    const grow = Math.min(1, (f + 1) / 8);
    const rx = Math.round(26 * grow), ry = Math.round(22 * grow);
    if (f < 8 || f % 6 < 4) {
      ring(g, at.x, at.y + 2, rx, ry, "#58a040");
      ring(g, at.x, at.y + 2, rx - 1, ry - 1, "#c8f0a0");
    }
    if (f >= 8) {
      // a travelling glint on the shell
      const a = (f - 8) * 0.25 - Math.PI * 0.75;
      starBurst(g, Math.round(at.x + Math.cos(a) * rx), Math.round(at.y + 2 + Math.sin(a) * ry), 2, "#ffffff", "#c8f0a0");
    }
  });
  s.sprites.add(s.userSide, "squash", 10);
  return 42;
}

function lightRays(fx: Fx, s: MoveStage, track: boolean): number {
  const at = s.from;
  const N = 50;
  fx.tintScreen("#f8f0a8", N);
  const shafts = track ? [0, 1, 2] : [-16, -8, 0, 8, 16];
  shafts.forEach((ox, i) => {
    fx.layer(N - i * 3, (g, f) => {
      const len = Math.min(at.y + 24, (f + 1) * 8);
      const w = (f >> 2) % 2 ? 3 : 4;
      if (track) {
        // slanted shafts from the sun (top-right)
        for (let k = 0; k < len; k += 1) {
          const x = at.x + 40 - i * 6 - Math.floor(k * 0.6) + 12, y = k;
          if ((x + y + (f >> 1)) % 2 === 0) rect(g, x, y, w, 1, "#f8f0b0");
          else px(g, x + 1, y, "#ffffff");
        }
      } else {
        checker(g, at.x + ox - 1, 0, w, len, "#f8f8d0", (f >> 2) + i);
        rect(g, at.x + ox, Math.max(0, len - 4), 1, 4, "#ffffff");
      }
    }, { delay: i * 3, back: true });
  });
  for (let i = 0; i < 10; i++) fx.add({ x: at.x + R(-16, 16), y: at.y + R(4, 18), vy: -0.7, shape: "twinkle", color: "#ffffff", color2: "#f8d850", max: 16, delay: 14 + i * 3 });
  s.sprites.add(s.userSide, "shine", 16, { delay: 20 });
  return N;
}

function rush(fx: Fx, s: MoveStage): number {
  const at = s.from;
  const d = -dirOf(s);
  const N = 34;
  const ls = Array.from({ length: 8 }, (_, i) => ({ y: at.y - 18 + i * 5 + RI(-1, 1), len: RI(6, 14), off: RI(0, 40) }));
  fx.layer(N, (g, f) => {
    for (const l of ls) {
      const x = at.x + d * (((l.off + f * 6) % 60) - 30);
      rect(g, x - (d > 0 ? 0 : l.len), l.y, l.len, 1, l.len > 10 ? "#c89868" : "#e8c098");
    }
  });
  s.sprites.add(s.userSide, "jitter", 24);
  for (let i = 0; i < 8; i++) fx.add({ x: at.x + R(-18, 18), y: at.y + R(-16, 16), shape: "twinkle", color: "#ffffff", color2: "#f8a8c8", max: 10, delay: 6 + i * 3 });
  return N;
}

function grow(fx: Fx, s: MoveStage, old: boolean): number {
  const at = s.from;
  const p = old ? { a: "#3c7838", b: "#183818", c: "#90c870" } : PAL.leaf;
  for (let i = 0; i < 12; i++) fx.add({
    x: at.x, y: at.y, shape: "leaf", color: i % 2 ? p.a : p.c, color2: p.b, color3: p.c, flip: i % 2 === 0, max: 26, delay: i, blink: true,
    orbit: { cx: at.x, cy: at.y + 4, r: 4, a: (i / 12) * Math.PI * 2, va: 0.12, vr: 1.1, squash: 0.7 },
  });
  if (old) fx.tintScreen("#c8d0a0", 30);
  s.sprites.add(s.userSide, "pulse", 24, { delay: 4 });
  s.sprites.add(s.userSide, "shine", 12, { delay: 18 });
  return 34;
}

// ---------------------------------------------------------------------------
// Fire
// ---------------------------------------------------------------------------

function ember(fx: Fx, s: MoveStage): number {
  const d = dirOf(s);
  const fly = 16;
  fx.layer(fly, (g, f) => {
    const t = f / (fly - 1);
    const x = lerp(s.from.x + d * 8, s.to.x, t), y = lerp(s.from.y - 4, s.to.y, t) - Math.sin(t * Math.PI) * 12;
    blit(g, (f >> 1) % 2 ? SPR.flameA : SPR.flameB, x, y, { a: PAL.fire.a, b: PAL.fire.b, c: PAL.fire.c });
    if (f % 2 === 0) fx.add({ x: x - d * 3, y: y + R(-1, 1), vy: R(-0.4, 0), shape: "ember", color: PAL.fire.a, color2: PAL.fire.b, max: 10 });
  });
  fx.at(fly, () => {
    fx.impact(s.to, "#ffffff", PAL.fire.c);
    fx.shake(4, 1);
    for (let i = 0; i < 12; i++) fx.add({
      x: s.to.x + R(-16, 16), y: s.to.y + R(6, 18), vy: R(-0.9, -0.4), shape: "flame", flip: i % 2 === 0,
      color: PAL.fire.a, color2: PAL.fire.b, color3: PAL.fire.c, max: RI(14, 22), delay: i * 2, blink: true,
    });
  });
  return fly + 36;
}

function smoke(fx: Fx, s: MoveStage): number {
  const N = 44;
  fx.tintScreen("#d8b8a0", N);
  for (let i = 0; i < 9; i++) fx.add({ x: s.toGround.x + R(-18, 18), y: s.toGround.y - 2, vy: R(-0.8, -0.5), sway: 2, shape: "smoke", color: "#a8a098", color2: "#787068", max: 30, delay: i * 3, blink: true });
  for (let i = 0; i < 10; i++) fx.add({ x: s.to.x + R(-14, 14), y: s.to.y + R(4, 16), vy: R(-1.2, -0.6), shape: "ember", color: PAL.fire.a, color2: PAL.fire.b, max: 16, delay: 10 + i * 2 });
  s.sprites.add(targetSide(s), "tint", 10, { color: "#f8a060", delay: 20 });
  return N;
}

function burst(fx: Fx, s: MoveStage, pale: boolean): number {
  const p = pale ? PAL.pale : PAL.fire;
  const at = s.to;
  const d = dirOf(s);
  if (!pale) {
    fx.add({ x: s.from.x, y: s.from.y, shape: "glob", size: 1, color: "#e83820", color2: "#801808", color3: "#f8a080", max: 14, to: { sx: s.from.x + d * 6, sy: s.from.y - 4, x: at.x, y: at.y, arc: 16 } });
  } else {
    // a pale bud swells on the foe
    fx.layer(14, (g, f) => {
      const r = 2 + Math.floor(f / 2);
      ellipse(g, at.x, at.y, r, r, p.b);
      ellipse(g, at.x - 1, at.y - 1, r - 1, r - 1, p.a);
      px(g, at.x - r + 2, at.y - r + 2, "#ffffff");
    });
  }
  fx.at(14, () => {
    fx.flashScreen(pale ? "#f0e8ff" : "#fff0c0", 2);
    fx.shake(10, 2, "xy");
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      fx.add({
        x: at.x, y: at.y, vx: Math.cos(a) * R(1.6, 2.4), vy: Math.sin(a) * R(1.2, 1.8), ay: pale ? 0.02 : 0.06,
        shape: pale ? "petal" : i % 2 ? "seed" : "flame", color: pale ? p.a : i % 2 ? "#f8e070" : p.a, color2: pale ? p.b : i % 2 ? "#c06010" : p.b, color3: p.c,
        max: 20, blink: true,
      });
    }
  });
  fx.layer(12, (g, f) => { ring(g, at.x, at.y, 4 + f * 3, 3 + f * 2, f % 2 ? p.c : "#ffffff"); if (f < 4) starBurst(g, at.x, at.y, 6 + f * 2, "#ffffff", p.c); }, { delay: 14 });
  return 40;
}

function blaze(fx: Fx, s: MoveStage): number {
  const g0 = s.toGround;
  const N = 56;
  fx.tintScreen("#f8b878", N);
  const cols = Array.from({ length: 7 }, (_, i) => ({ x: g0.x - 27 + i * 9, h: RI(18, 32), ph: RI(0, 7) }));
  fx.layer(N, (g, f) => {
    const grow = Math.min(1, f / 14) * (f > N - 10 ? (N - f) / 10 : 1);
    for (const c of cols) {
      const h = Math.round(c.h * grow * (0.85 + 0.15 * (((f + c.ph) >> 2) % 2)));
      if (h <= 1) continue;
      for (let y = 0; y < h; y++) {
        const t = y / h;
        const w = Math.max(1, Math.round((1 - t) * 5 + (((y + f + c.ph) >> 1) % 3 === 0 ? 1 : 0)));
        const sway = Math.round(Math.sin((y + f * 2 + c.ph * 3) / 5) * t * 2);
        const col = t > 0.7 ? PAL.fire.b : t > 0.3 ? PAL.fire.a : PAL.fire.c;
        rect(g, c.x - w + sway, g0.y - y, w * 2, 1, col);
      }
      px(g, c.x, g0.y - 2, "#ffffff");
    }
  });
  fx.at(8, () => fx.shake(36, 2));
  for (let i = 0; i < 14; i++) fx.add({ x: g0.x + R(-26, 26), y: g0.y - R(10, 30), vy: R(-1.2, -0.6), shape: "ember", color: PAL.fire.c, color2: PAL.fire.a, max: 18, delay: 14 + i * 2 });
  s.sprites.add(targetSide(s), "tint", 20, { color: "#f87830", delay: 14 });
  return N;
}

// ---------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------

function droplet(fx: Fx, s: MoveStage): number {
  const p = PAL.water;
  const d = dirOf(s);
  fx.add({
    x: s.from.x, y: s.from.y, shape: "glob", size: 1, color: p.a, color2: p.b, color3: p.c, max: 16,
    to: { sx: s.from.x + d * 8, sy: s.from.y - 6, x: s.to.x, y: s.to.y, arc: 24 },
    onEnd: (q) => {
      fx.impact({ x: q.x, y: q.y }, "#ffffff", p.c);
      fx.shake(4, 1);
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI * (0.1 + 0.8 * (i / 9));
        fx.add({ x: q.x, y: q.y, vx: Math.cos(a) * R(1, 1.8), vy: Math.sin(a) * R(1.2, 2), ay: 0.14, shape: "drop", color: p.a, color2: p.c, color3: p.b, max: 20, blink: true });
      }
      fx.layer(10, (g, f) => ring(g, q.x, q.y + 6, 3 + f * 2, 1 + f, f % 2 ? p.c : "#ffffff"));
    },
  });
  return 40;
}

function wave(fx: Fx, s: MoveStage, flood: boolean): number {
  const p = PAL.water;
  const d = dirOf(s);
  const N = flood ? 46 : 40;
  const H = flood ? 30 : 18;
  const g0 = s.toGround;
  fx.layer(N, (g, f) => {
    const t = f / (N - 1);
    const front = g0.x - d * 60 + d * t * 120;
    const tail = 46;
    for (let k = 0; k < tail; k++) {
      const x = Math.round(front - d * k);
      if (x < 0 || x > 159) continue;
      const env = Math.sin(Math.min(1, k / tail) * Math.PI) * (k < 8 ? k / 8 : 1);
      const h = Math.round(H * env * (0.8 + 0.2 * Math.sin((k + f) / 3)));
      if (h <= 0) continue;
      rect(g, x, g0.y - h + 2, 1, h, p.a);
      rect(g, x, g0.y - h + 2, 1, 2, p.c);
      if ((k + f) % 5 === 0) px(g, x, g0.y - h + 1, "#ffffff");
      if (k % 7 === 3) px(g, x, g0.y - Math.floor(h / 2), p.c);
    }
    // foam crest at the front
    const crest = Math.round(front);
    rect(g, crest - d * 2, g0.y - H + 2, 3, 2, "#ffffff");
  });
  fx.at(Math.round(N * 0.45), () => { fx.shake(flood ? 14 : 8, flood ? 2 : 1); fx.impact(s.to, "#ffffff", p.c); });
  if (!flood) {
    // undertow: a whirl drags the foe down
    fx.layer(20, (g, f) => {
      for (let i = 0; i < 3; i++) ring(g, g0.x, g0.y, 20 - i * 6 - (f % 6), 4 - i, (i + f) % 2 ? p.a : p.c);
    }, { delay: N - 18 });
    s.sprites.add(targetSide(s), "sink", 18, { delay: N - 18 });
  }
  return N + (flood ? 0 : 4);
}

function downpour(fx: Fx, s: MoveStage): number {
  const N = 48;
  fx.tintScreen("#7888b0", N);
  const at = s.to;
  for (let i = 0; i < 44; i++) fx.add({
    x: at.x + R(-34, 34), y: -6 - R(0, 20), vy: R(5, 7), vx: -0.6, shape: "streak", color: i % 3 ? "#5878c8" : "#ffffff", color2: "#a0d8f8",
    max: RI(9, 13), delay: i, onEnd: (q) => { if (i % 3 === 0) fx.add({ x: q.x, y: s.toGround.y - 1, shape: "twinkle", color: "#ffffff", color2: "#a0d8f8", max: 4 }); },
  });
  for (const k of [14, 26, 38]) fx.at(k, () => { fx.impact({ x: at.x + R(-8, 8), y: at.y + R(-8, 8) }, "#ffffff", "#a0d8f8"); fx.shake(4, 1, "y"); });
  return N + 6;
}

function slam(fx: Fx, s: MoveStage, plain: boolean): number {
  const d = dirOf(s);
  if (plain) {
    for (const k of [0, 8]) fx.at(k, () => { fx.impact({ x: s.to.x + R(-6, 6), y: s.to.y + R(-6, 6) }, "#ffffff", "#f8d040", true); fx.shake(6, 2); });
    return 22;
  }
  const start = { x: s.to.x - d * 34, y: s.to.y - 26 };
  fx.layer(22, (g, f) => {
    const t = clamp01(f / 9);
    const x = lerp(start.x, s.to.x - d * 4, t * t), y = lerp(start.y, s.to.y, t * t);
    if (f > 16 && f % 2) return;
    blit(g, SPR.pad, x, y, { a: "#58a848", b: "#205018", c: "#a8e080" }, d < 0);
  });
  fx.at(9, () => { fx.impact(s.to, "#ffffff", "#a0d8f8", true); fx.shake(8, 2); s.sprites.add(targetSide(s), "squash", 8); for (let i = 0; i < 6; i++) fx.add({ x: s.to.x, y: s.to.y, vx: R(-1.5, 1.5), vy: R(-1.8, -0.4), ay: 0.14, shape: "drop", color: PAL.water.a, color2: PAL.water.c, max: 16 }); });
  return 26;
}

function pitfall(fx: Fx, s: MoveStage, kind?: string): number {
  const g0 = s.toGround;
  const rim = kind === "rim";
  const N = rim ? 34 : 44;
  // PITFALL SLURP: once the walls close, nectar-green motes drain back to the user.
  if (kind === "slurp") {
    for (let i = 0; i < 8; i++) fx.add({
      x: s.to.x, y: s.to.y, shape: "drop", color: "#a8d860", color2: "#f0f8c0", color3: "#486820", max: 16, delay: 24 + i * 2,
      to: { sx: s.to.x + R(-10, 10), sy: s.to.y + R(-8, 8), x: s.from.x + R(-6, 6), y: s.from.y + R(-6, 6), arc: R(8, 18) },
    });
  }
  // SLICK RIM: the foe skids on the waxy rim before it slips in.
  if (rim) s.sprites.add(targetSide(s), "jitter", 10, { delay: 4 });
  fx.layer(N, (g, f) => {
    const rise = Math.min(1, f / 10) * (f > N - 8 ? (N - f) / 8 : 1);
    const close = clamp01((f - 12) / 6);
    const H = Math.round(40 * rise);
    for (const side of [-1, 1]) {
      const x0 = g0.x + side * Math.round(lerp(26, 9, close));
      // pitcher wall: green tube, red-veined rim curling inward
      for (let y = 0; y < H; y++) {
        const w = 8;
        const x = side < 0 ? x0 - w : x0;
        rect(g, x, g0.y - y, w, 1, y % 6 === 0 ? "#3c7a30" : "#58a040");
        px(g, side < 0 ? x0 - 1 : x0, g0.y - y, "#204818");
        if (y % 4 === 1) px(g, x + 3, g0.y - y, "#a83838");
      }
      if (H > 2) {
        rect(g, side < 0 ? x0 - 9 : x0 - 1, g0.y - H - 1, 10, 3, "#c84040");
        rect(g, side < 0 ? x0 - 9 : x0 - 1, g0.y - H - 1, 10, 1, "#f08080");
      }
    }
  });
  fx.at(rim ? 14 : 18, () => { fx.impact(s.to, "#ffffff", "#c8f0a0", true); fx.shake(rim ? 6 : 10, 2); });
  s.sprites.add(targetSide(s), "sink", rim ? 14 : 20, { delay: rim ? 12 : 16 });
  return N;
}

function mist(fx: Fx, s: MoveStage, cold: boolean): number {
  const at = cold ? s.to : s.from;
  const N = 46;
  const puffs = Array.from({ length: 7 }, (_, i) => ({ a: (i / 7) * Math.PI * 2, r: R(14, 22), sz: RI(5, 8) }));
  fx.layer(N, (g, f) => {
    const t = f / (N - 1);
    const close = Math.min(1, f / 18);
    for (const p of puffs) {
      const a = p.a + t * 1.2;
      const r = lerp(p.r + 26, p.r, close);
      const x = at.x + Math.cos(a) * r, y = at.y + 4 + Math.sin(a) * r * 0.5;
      if (f > N - 10 && (f + p.sz) % 2) continue;
      ellipse(g, x, y, p.sz, p.sz - 2, cold ? "#d0e8f0" : "#e8f0f0");
      checker(g, x - p.sz, y - p.sz + 2, p.sz * 2, p.sz - 2, cold ? "#a8d0e8" : "#c8d8e0", 0);
    }
  });
  if (cold) {
    fx.tintScreen("#c8e8f8", N);
    for (let i = 0; i < 8; i++) fx.add({ x: at.x + R(-16, 16), y: at.y + R(-14, 14), shape: "twinkle", color: "#ffffff", color2: "#88c8e8", max: 12, delay: 14 + i * 3 });
    fx.at(24, () => { fx.impact(at, "#ffffff", "#a8e0f8"); s.sprites.add(targetSide(s), "tint", 10, { color: "#c8f0f8" }); });
  } else {
    s.sprites.add(s.userSide, "shine", 14, { delay: 22 });
  }
  return N;
}

// ---------------------------------------------------------------------------
// Bug
// ---------------------------------------------------------------------------

interface JawPal { body: string; back: string; lip: string; teeth: string; hi: string }
const FLYTRAP_JAW: JawPal = { body: "#58a040", back: "#204818", lip: "#e04848", teeth: "#f8f0a0", hi: "#a8e070" };
/** Snapdragon "jaws": the two-lipped flower, magenta with a gold throat. */
const DRAGON_JAW: JawPal = { body: "#d04890", back: "#581838", lip: "#f8c040", teeth: "#ffffff", hi: "#f8a0d0" };

function snap(fx: Fx, s: MoveStage, quick: boolean, jaw: JawPal = FLYTRAP_JAW, big = false): number {
  const at = s.to;
  const W = big ? 22 : quick ? 12 : 16;
  const open = quick ? 4 : 12;   // frames hovering open
  const shut = quick ? 3 : 4;    // frames to clamp
  const hold = 10;
  const N = open + shut + hold + 6;
  const lobe = (g: CanvasRenderingContext2D, gap: number, up: boolean) => {
    const sy = up ? -1 : 1;
    for (let i = -W; i <= W; i++) {
      const t = i / W;
      const curve = Math.round((1 - t * t) * (big ? 10 : 7));
      const yEdge = at.y + sy * gap;           // the lip
      const yBack = yEdge + sy * (curve + 2);  // the outer back
      const top = Math.min(yEdge, yBack), h = Math.abs(yBack - yEdge) + 1;
      rect(g, at.x + i, top, 1, h, jaw.body);
      px(g, at.x + i, yBack, jaw.back);
      px(g, at.x + i, yEdge, jaw.lip);
      px(g, at.x + i, yEdge + sy, jaw.lip);
      if (i % 3 === 0) { px(g, at.x + i, yEdge - sy, jaw.teeth); px(g, at.x + i, yEdge - sy * 2, jaw.teeth); } // cilia / teeth
      if (up && i % 5 === 0 && curve > 3) px(g, at.x + i, yBack + 2, jaw.hi);
    }
  };
  fx.layer(N, (g, f) => {
    let gap: number;
    if (f < open) gap = (big ? 20 : 16) + ((f >> 1) % 2) * (big ? 2 : 1);                     // hovering, jaws open
    else if (f < open + shut) gap = Math.round(lerp(big ? 20 : 16, 0, (f - open + 1) / shut));
    else gap = 0;
    if (f > N - 6 && f % 2) return;
    lobe(g, gap, true);
    lobe(g, gap, false);
  });
  fx.at(open + shut, () => {
    fx.impact(at, "#ffffff", jaw.teeth === "#ffffff" ? jaw.lip : "#f8f0a0", !quick);
    fx.shake(quick ? 6 : 12, quick ? 1 : 3, quick ? "x" : "xy");
    fx.flashScreen("#ffffff", 1);
    s.sprites.add(targetSide(s), "squash", 8);
  });
  return N + 2;
}

/**
 * DRAGON SNAP, the snapdragon's signature: the screen darkens, a roar of
 * rings rolls out from the user, huge two-lipped jaws tremble over the foe
 * and slam shut in a gold flash, scattering petals and sparks.
 */
function dragonSnap(fx: Fx, s: MoveStage): number {
  const lead = 22;
  fx.tintScreen("#481830", lead + 30);
  for (let k = 0; k < 3; k++) {
    fx.layer(14, (g, f) => {
      const r = 6 + f * 3;
      ring(g, s.from.x, s.from.y, r, Math.round(r * 0.7), f % 2 ? "#f8c040" : "#d04890");
    }, { delay: k * 6 });
  }
  s.sprites.add(s.userSide, "jitter", 12, { delay: 2 });
  fx.at(lead, () => {
    const n = snap(fx, s, false, DRAGON_JAW, true);
    fx.at(n - 18, () => { // the clamp
      fx.flashScreen("#f8e070", 2);
      fx.shake(18, 3, "xy");
      for (let k = 0; k < 10; k++) {
        fx.add({ x: s.to.x, y: s.to.y, vx: R(-2.2, 2.2), vy: R(-2.4, -0.2), ay: 0.1, shape: k % 2 ? "petal" : "spark",
          color: k % 2 ? "#d04890" : "#f8e070", color2: k % 2 ? "#581838" : "#ffffff", color3: "#f8a0d0", max: 22, blink: true });
      }
    });
  });
  return lead + 46;
}

function tendrils(fx: Fx, s: MoveStage, dodder: boolean): number {
  if (dodder) {
    const N = 40;
    fx.layer(N, (g, f) => {
      const turns = 3;
      const h = Math.min(1, f / 18);
      const tight = f > 18 ? Math.min(6, f - 18) : 0;
      const steps = Math.round(90 * h);
      for (let k = 0; k < steps; k++) {
        const t = k / 90;
        const a = t * Math.PI * 2 * turns + f * 0.05;
        const r = 22 - tight;
        const x = s.to.x + Math.cos(a) * r, y = s.toGround.y - t * 44 + Math.sin(a) * 3;
        const front = Math.sin(a) > 0;
        px(g, x, y, front ? "#f0a030" : "#a06018");
        if (front && k % 4 === 0) px(g, x, y - 1, "#f8e090");
      }
    });
    fx.at(20, () => { s.sprites.add(targetSide(s), "jitter", 14); fx.impact(s.to, "#ffffff", "#f8d080"); });
    fx.at(28, () => fx.drain(s.to, s.from, "#f0a030", "#f8e090"));
    return N + 20;
  }
  const d = dirOf(s);
  const N = 36;
  const strands = Array.from({ length: 5 }, (_, i) => ({ dy: (i - 2) * 6, bend: R(-10, 10) }));
  fx.layer(N, (g, f) => {
    const ext = f < 12 ? (f + 1) / 12 : f < 26 ? 1 : 1 - (f - 26) / 10;
    for (const st of strands) {
      const p0 = { x: s.from.x + d * 10, y: s.from.y + st.dy * 0.5 };
      const p1 = { x: s.to.x - d * 6, y: s.to.y + st.dy };
      const c = { x: lerp(p0.x, p1.x, 0.5), y: lerp(p0.y, p1.y, 0.5) + st.bend - 10 };
      const steps = 30;
      let tip = p0;
      for (let k = 0; k <= Math.round(steps * ext); k++) {
        const q = bez(p0, c, p1, k / steps);
        px(g, q.x, q.y, "#c04848");
        tip = q;
      }
      // glistening dew at the tip
      rect(g, tip.x - 1, tip.y - 1, 3, 3, "#f0a0c0");
      px(g, tip.x - 1, tip.y - 1, "#ffffff");
    }
  });
  fx.at(13, () => { fx.impact(s.to, "#ffffff", "#f8c0d8"); s.sprites.add(targetSide(s), "jitter", 10); });
  return N + 2;
}

function lure(fx: Fx, s: MoveStage, scent: boolean): number {
  const d = dirOf(s);
  const N = 48;
  fx.tintScreen(scent ? "#f8d0e8" : "#f8e8b0", N);
  if (scent) {
    for (let k = 0; k < 3; k++) {
      fx.layer(30, (g, f) => {
        const t = f / 29;
        const x0 = lerp(s.from.x + d * 10, s.to.x - d * 10, t);
        const y0 = lerp(s.from.y - 8, s.to.y, t) - 8 + k * 7;
        for (let i = 0; i < 18; i++) px(g, x0 - d * i, y0 + Math.round(Math.sin((i + f) / 2.5) * 2), i % 4 === 0 ? "#ffffff" : "#e070a8");
      }, { delay: k * 6 });
    }
  }
  for (let i = 0; i < 10; i++) {
    fx.add({
      x: s.from.x, y: s.from.y, shape: i % 3 === 0 ? "heart" : scent ? "petal" : "drop", color: scent ? "#f070a8" : "#f8c040",
      color2: scent ? "#a03870" : "#c08010", color3: "#fff8e0", max: 26, delay: i * 2, sway: 3,
      to: { sx: s.from.x + d * 8, sy: s.from.y - 8, x: s.to.x + R(-14, 14), y: s.to.y + R(-12, 8), arc: R(10, 22) },
      onEnd: (q) => fx.add({ x: q.x, y: q.y, shape: "twinkle", color: "#ffffff", color2: scent ? "#f8a0c8" : "#f8e070", max: 8 }),
    });
  }
  s.sprites.add(targetSide(s), "pulse", 16, { delay: 30 });
  return N;
}

// ---------------------------------------------------------------------------
// Bloom / ghost
// ---------------------------------------------------------------------------

function spores(fx: Fx, s: MoveStage, sleep: boolean): number {
  const p = sleep ? PAL.sleep : PAL.pollen;
  const d = dirOf(s);
  const N = 56;
  for (let i = 0; i < 20; i++) {
    const tx = s.to.x + R(-18, 18), ty = s.to.y + R(-14, 12);
    fx.add({
      x: s.from.x, y: s.from.y, shape: "spore", color: p.b, color2: i % 3 ? p.a : p.c, max: 30, delay: i, sway: 2,
      to: { sx: s.from.x + d * 6 + R(-6, 6), sy: s.from.y - 6 + R(-6, 6), x: tx, y: ty, arc: R(4, 16), ease: "out" },
      onEnd: (q) => fx.add({
        x: q.x, y: q.y, shape: "spore", color: p.b, color2: p.a, max: 18, blink: true,
        orbit: { cx: s.to.x, cy: s.to.y, r: Math.hypot(q.x - s.to.x, q.y - s.to.y), a: Math.atan2(q.y - s.to.y, q.x - s.to.x), va: 0.05, vr: -0.2, squash: 1 },
      }),
    });
  }
  if (sleep) for (let i = 0; i < 3; i++) fx.add({ x: s.to.x + 8 + i * 5, y: s.to.y - 8, vx: 0.3, vy: -0.4, sway: 2, shape: "z", color: "#504078", max: 24, delay: 30 + i * 6, size: i % 2 });
  fx.tintScreen(sleep ? "#c8c0d8" : "#f8f0b0", N);
  return N;
}

function beam(fx: Fx, s: MoveStage, moon: boolean): number {
  const p = moon ? PAL.moon : PAL.sun;
  const N = 46;
  fx.tintScreen(moon ? "#384078" : "#f8e8a0", N, true);
  const src = { x: s.from.x + dirOf(s) * 10, y: s.from.y - 4 };
  // charge: motes gather at the source
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    fx.add({ x: src.x, y: src.y, shape: "twinkle", color: "#ffffff", color2: p.a, max: 12, delay: i, to: { sx: src.x + Math.cos(a) * 18, sy: src.y + Math.sin(a) * 14, x: src.x, y: src.y, arc: 0 } });
  }
  fx.layer(26, (g, f) => {
    const w = [2, 4, 6, 5, 6, 4][f % 6] ?? 4;
    const ext = Math.min(1, (f + 1) / 4);
    const ex = lerp(src.x, s.to.x, ext), ey = lerp(src.y, s.to.y, ext);
    if (f > 22 && f % 2) return;
    line(g, src.x, src.y - Math.floor(w / 2), ex, ey - Math.floor(w / 2), p.b, w);
    line(g, src.x, src.y - Math.floor(w / 2) + 1, ex, ey - Math.floor(w / 2) + 1, p.a, Math.max(1, w - 2));
    line(g, src.x, src.y, ex, ey, "#ffffff", 1);
    if (ext >= 1) starBurst(g, Math.round(s.to.x), Math.round(s.to.y), 4 + (f % 3), "#ffffff", p.a);
  }, { delay: 12 });
  fx.at(16, () => { fx.shake(18, 1); s.sprites.add(targetSide(s), "tint", 16, { color: p.c }); });
  return N;
}

function ghostTouch(fx: Fx, s: MoveStage): number {
  const N = 44;
  fx.tintScreen("#504878", N);
  for (let i = 0; i < 8; i++) fx.add({
    x: s.to.x, y: s.to.y, shape: "wisp", color: PAL.ghost.c, color2: "#ffffff", max: 30, delay: i * 2, blink: true,
    orbit: { cx: s.to.x, cy: s.to.y, r: 34, a: (i / 8) * Math.PI * 2, va: 0.16, vr: -1, squash: 0.7 },
  });
  // a pale hand of three fingers reaching up from the foe's shadow
  fx.layer(20, (g, f) => {
    const h = Math.min(18, f * 2);
    for (let k = -1; k <= 1; k++) {
      const x = s.to.x + k * 4;
      rect(g, x, s.toGround.y - h - (k === 0 ? 3 : 0), 2, h + (k === 0 ? 3 : 0), "#e8e0f8");
      px(g, x, s.toGround.y - h - (k === 0 ? 3 : 0), "#ffffff");
    }
    rect(g, s.to.x - 5, s.toGround.y - 3, 12, 4, "#e8e0f8");
  }, { delay: 18 });
  fx.at(30, () => { fx.impact(s.to, "#ffffff", PAL.ghost.c); fx.shake(6, 1); s.sprites.add(targetSide(s), "tint", 10, { color: PAL.ghost.a }); });
  return N;
}

function wither(fx: Fx, s: MoveStage): number {
  const N = 50;
  fx.tintScreen("#787070", N);
  s.sprites.add(targetSide(s), "tint", 36, { color: "#988878" });
  for (let i = 0; i < 12; i++) fx.add({
    x: s.to.x + R(-16, 16), y: s.to.y + R(-18, 4), vy: R(0.5, 0.9), sway: 3, shape: "leaf", color: i % 2 ? "#a08050" : "#807058", color2: "#584830", color3: "#c0a878",
    max: 34, delay: 8 + i * 2, blink: true, flip: i % 2 === 0,
  });
  fx.at(10, () => s.sprites.add(targetSide(s), "sink", 20));
  return N;
}

// ---------------------------------------------------------------------------
// Thorn / frost
// ---------------------------------------------------------------------------

function volley(fx: Fx, s: MoveStage, kind: string): number {
  const d = dirOf(s);
  const flip = d < 0;
  const cfg = {
    jab: { n: 1, gap: 0, shape: "thorn" as const, pal: PAL.thorn, fly: 7, spread: 0 },
    spines: { n: 3, gap: 4, shape: "thorn" as const, pal: PAL.thorn, fly: 9, spread: 10 },
    hairs: { n: 12, gap: 1, shape: "hair" as const, pal: { a: "#a8b868", b: "#485020", c: "#f0f8d0" }, fly: 10, spread: 16 },
    splinter: { n: 4, gap: 4, shape: "splinter" as const, pal: PAL.wood, fly: 12, spread: 12 },
    ice: { n: 2, gap: 6, shape: "needle" as const, pal: PAL.ice, fly: 9, spread: 6 },
    rose: { n: 2, gap: 5, shape: "thorn" as const, pal: PAL.rose, fly: 8, spread: 6 },
  }[kind] ?? { n: 3, gap: 4, shape: "thorn" as const, pal: PAL.thorn, fly: 9, spread: 10 };
  for (let i = 0; i < cfg.n; i++) {
    const tx = s.to.x + R(-cfg.spread, cfg.spread), ty = s.to.y + R(-cfg.spread, cfg.spread) * 0.7;
    fx.add({
      x: s.from.x, y: s.from.y, shape: cfg.shape, color: cfg.pal.a, color2: cfg.pal.b, color3: cfg.pal.c, flip, max: cfg.fly, delay: i * cfg.gap,
      to: { sx: s.from.x + d * 10, sy: s.from.y - 4 + R(-3, 3), x: tx, y: ty, arc: cfg.shape === "splinter" ? 10 : 2 },
      onEnd: (q) => {
        if (cfg.shape === "hair") { if (i % 3 === 0) fx.add({ x: q.x, y: q.y, shape: "spark", color: "#ffffff", color2: cfg.pal.a, max: 6 }); return; }
        fx.impact({ x: q.x, y: q.y }, "#ffffff", cfg.pal.c, kind === "jab");
        if (kind === "rose") for (let k = 0; k < 3; k++) fx.add({ x: q.x, y: q.y, vx: R(-1, 1), vy: R(-1.2, -0.2), ay: 0.05, shape: "petal", color: "#f090a8", color2: "#a03850", color3: "#f8e0e8", max: 18, blink: true });
        if (kind === "ice") for (let k = 0; k < 4; k++) fx.add({ x: q.x, y: q.y, vx: R(-1.2, 1.2), vy: R(-1.2, 0.6), ay: 0.06, shape: "shard", color: "#ffffff", color2: PAL.ice.b, max: 12 });
      },
    });
  }
  if (kind === "ice") fx.layer(20, (g, f) => { if (f % 3 === 0) px(g, lerp(s.from.x, s.to.x, f / 20), lerp(s.from.y, s.to.y, f / 20), "#ffffff"); });
  const total = (cfg.n - 1) * cfg.gap + cfg.fly;
  fx.at(total, () => fx.shake(kind === "jab" ? 6 : 4, kind === "jab" ? 2 : 1));
  return total + 12;
}

function frost(fx: Fx, s: MoveStage, bloom: boolean, menthol = false): number {
  const N = 46;
  // Menthol: the same crystals in cool mint, with a waft of minty air first.
  const armCol = menthol ? "#98e8c8" : "#a8d8f0", core = menthol ? "#287868" : "#4888b8", shard2 = menthol ? "#68c8a8" : "#88c8e8";
  fx.tintScreen(menthol ? "#c8f0e0" : "#c8e8f8", N);
  if (menthol) windLines(fx, 20, dirOf(s), Math.max(0, s.to.y - 30), s.to.y + 20, "#98e8c8", "#c8f8e8");
  const seeds = Array.from({ length: bloom ? 6 : 4 }, (_, i) => ({
    x: s.to.x + R(-16, 16), y: s.to.y + R(-14, 12), len: RI(bloom ? 6 : 4, bloom ? 10 : 7), d: i * 3, rot: R(0, Math.PI / 3),
  }));
  fx.layer(28, (g, f) => {
    for (const c of seeds) {
      const k = f - c.d;
      if (k < 0) continue;
      const L = Math.min(c.len, k);
      for (let arm = 0; arm < 6; arm++) {
        const a = c.rot + (arm / 6) * Math.PI * 2;
        const ex = c.x + Math.cos(a) * L, ey = c.y + Math.sin(a) * L;
        line(g, c.x, c.y, ex, ey, arm % 2 ? "#ffffff" : armCol);
        if (L > 3) {
          const mx = c.x + Math.cos(a) * L * 0.6, my = c.y + Math.sin(a) * L * 0.6;
          px(g, mx + Math.cos(a + 1) * 2, my + Math.sin(a + 1) * 2, "#ffffff");
          px(g, mx + Math.cos(a - 1) * 2, my + Math.sin(a - 1) * 2, "#ffffff");
        }
      }
      px(g, c.x, c.y, core);
    }
  });
  s.sprites.add(targetSide(s), "tint", 20, { color: menthol ? "#c8f8e0" : "#c8f0f8", delay: 10 });
  fx.at(28, () => {
    fx.flashScreen("#f0f8ff", 1);
    fx.shake(8, 2);
    for (const c of seeds) for (let k = 0; k < 4; k++) fx.add({ x: c.x, y: c.y, vx: R(-1.6, 1.6), vy: R(-1.6, 0.8), ay: 0.08, shape: "shard", color: "#ffffff", color2: shard2, max: 14, blink: true });
    if (bloom) for (let k = 0; k < 6; k++) fx.add({ x: s.to.x, y: s.to.y, shape: "twinkle", color: "#ffffff", color2: "#a8e0f8", max: 10, delay: k * 2, orbit: { cx: s.to.x, cy: s.to.y, r: 4, a: k, va: 0.2, vr: 2 } });
  });
  return N;
}

function blizzard(fx: Fx, s: MoveStage): number {
  const d = dirOf(s);
  const N = 56;
  fx.tintScreen("#e0f0f8", N);
  for (let i = 0; i < 40; i++) fx.add({
    x: d > 0 ? R(-20, 0) : R(160, 180), y: R(0, 92), vx: d * R(3, 5), vy: R(0.2, 0.8), shape: i % 3 ? "px1" : "flake", color: "#ffffff", color2: "#a8d0e8",
    max: 40, delay: i,
  });
  const g0 = s.toGround;
  fx.layer(N - 14, (g, f) => {
    const h = Math.min(16, Math.max(0, f - 10));
    if (h <= 0) return;
    // the drift piles up over the foe's feet; it never covers the HUD below
    g.save();
    g.beginPath();
    g.rect(0, 0, 160, 55);
    g.clip();
    ellipse(g, g0.x, g0.y + 2, 30, h, "#88b8d8");
    ellipse(g, g0.x - 2, g0.y + 1, 27, Math.max(1, h - 2), "#f8f8f8");
    for (let k = 0; k < 5; k++) px(g, g0.x - 20 + k * 9, g0.y - h + 4 + (k % 2), "#c8e0f0");
    g.restore();
  }, { delay: 6 });
  fx.at(34, () => { fx.shake(10, 2, "y"); fx.impact(s.to, "#ffffff", "#a8e0f8", true); });
  fx.at(N - 8, () => { for (let k = 0; k < 10; k++) fx.add({ x: g0.x + R(-24, 24), y: g0.y - R(0, 16), vx: R(-1, 1), vy: R(-1.4, -0.4), ay: 0.1, shape: "px", color: "#ffffff", max: 14 }); });
  return N;
}

// ---------------------------------------------------------------------------
// Weather calls
// ---------------------------------------------------------------------------

function weatherSun(fx: Fx, s: MoveStage): number {
  const N = 50;
  fx.layer(N, (g, f) => {
    const r = Math.min(14, 2 + f);
    const cx = 132, cy = 14;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + f * 0.04;
      const r0 = r + 3, r1 = r + 6 + ((i + (f >> 2)) % 2) * 4;
      line(g, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, "#f8c040");
    }
    ellipse(g, cx, cy, r, r, "#f8c840");
    ellipse(g, cx - 1, cy - 1, r - 3, r - 3, "#f8e888");
    if (r > 6) rect(g, cx - r + 4, cy - r + 4, 2, 2, "#ffffff");
  }, { back: true });
  fx.tintScreen("#f8e8a0", N);
  fx.at(14, () => fx.flashScreen("#fff8d0", 2));
  s.sprites.add(s.userSide, "shine", 14, { delay: 18 });
  return N;
}

function weatherRain(fx: Fx, s: MoveStage): number {
  const N = 50;
  fx.tintScreen("#98a8c8", N);
  const clouds = [{ x: 20, w: 18 }, { x: 70, w: 22 }, { x: 122, w: 20 }];
  fx.layer(N, (g, f) => {
    const drop = Math.min(10, f);
    for (const c of clouds) {
      ellipse(g, c.x, drop - 2, c.w, 8, "#8898b0");
      ellipse(g, c.x - 4, drop - 4, c.w - 6, 6, "#b8c4d4");
      checker(g, c.x - c.w, drop - 4, c.w * 2, 6, "#f8f8f8", 0);
    }
  }, { back: true });
  for (let i = 0; i < 40; i++) fx.add({ x: R(0, 170), y: R(-10, 6), vx: -0.6, vy: R(5, 7), shape: "streak", color: "#5878c8", color2: "#a0d8f8", max: 14, delay: 12 + i });
  void s;
  return N + 6;
}

function weatherFrost(fx: Fx, s: MoveStage): number {
  const N = 50;
  fx.tintScreen("#d8f0f8", N);
  fx.layer(N, (g, f) => {
    const L = Math.min(18, f);
    for (let i = 0; i < 160; i += 4) {
      const h = Math.max(0, L - ((i * 7) % 9));
      rect(g, i, 0, 3, Math.floor(h / 2), "#f8f8f8");
      px(g, i + 1, Math.floor(h / 2), "#a8d8f0");
      rect(g, i, 96 - Math.floor(h / 3), 3, Math.floor(h / 3), "#e8f4f8");
    }
    for (let j = 0; j < 96; j += 4) {
      const h = Math.max(0, L - ((j * 5) % 7));
      rect(g, 0, j, Math.floor(h / 2), 3, "#f8f8f8");
      rect(g, 160 - Math.floor(h / 2), j, Math.floor(h / 2), 3, "#f8f8f8");
    }
  }, { back: true });
  for (let i = 0; i < 16; i++) fx.add({ x: R(4, 156), y: R(4, 90), shape: "twinkle", color: "#ffffff", color2: "#88c8e8", max: 12, delay: 10 + i * 2 });
  fx.at(16, () => fx.flashScreen("#f0f8ff", 2));
  void s;
  return N;
}
