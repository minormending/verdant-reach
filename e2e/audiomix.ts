// Offline level meter for the audio mix (browser, dev server). Renders every
// music track, jingle, sound effect, a spread of cries and the ambience beds
// through the real Chip signal chain in an OfflineAudioContext and reports
// RMS / peak in dBFS, plus a short-term loudness figure (the loudest 400 ms
// window), so levels can be balanced by numbers instead of by ear.
//
//   const m = await import("/e2e/audiomix.ts"); await m.measureAll()

import { JINGLES, MUSIC, SFX, SPECIES_IDS } from "../src/contracts";
import type { JingleId, MusicId, SfxId, SpeciesId } from "../src/contracts";
import { Chip } from "../src/audio/engine";
import { MUSIC_DEFS } from "../src/audio/music";
import { JINGLE_DEFS, SFX_DEFS } from "../src/audio/sfx";
import { cryFor } from "../src/audio/cry";
import { parseSong, songSeconds } from "../src/audio/song";
import { DEFAULT_VOLUME, JINGLE_TRIM, MUSIC_TRIM, SFX_TRIM, routeFor, type Route } from "../src/audio/mix";
import { AmbienceBed, type AmbienceKind } from "../src/audio/ambience";

const RATE = 44100;
const db = (x: number) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
const r1 = (x: number) => Math.round(x * 10) / 10;

export interface Level { id: string; seconds: number; rmsDb: number; peakDb: number; loudDb: number; lowDb: number; highDb: number }

function stats(id: string, buf: AudioBuffer, from = 0): Level {
  const d = buf.getChannelData(0);
  const start = Math.floor(from * RATE);
  let sum = 0, peak = 0, n = 0;
  // Crude band split: a one-pole low-pass at ~250 Hz vs a high-pass at ~4 kHz.
  let lp = 0, hpPrev = 0, hpOut = 0, low = 0, high = 0;
  const aL = 1 - Math.exp((-2 * Math.PI * 250) / RATE);
  const aH = Math.exp((-2 * Math.PI * 4000) / RATE);
  const win = Math.floor(0.4 * RATE);
  let wsum = 0, loud = 0;
  const ring = new Float64Array(win);
  let filled = 0;
  for (let i = start; i < d.length; i++) {
    const x = d[i];
    sum += x * x; n++;
    peak = Math.max(peak, Math.abs(x));
    lp += aL * (x - lp); low += lp * lp;
    hpOut = aH * (hpOut + x - hpPrev); hpPrev = x; high += hpOut * hpOut;
    const k = (i - start) % win;
    wsum += x * x - ring[k];
    ring[k] = x * x;
    filled++;
    if (filled >= win) loud = Math.max(loud, wsum / win);
  }
  if (filled < win) loud = wsum / Math.max(1, filled);
  return {
    id, seconds: r1(n / RATE),
    rmsDb: r1(db(Math.sqrt(sum / Math.max(1, n)))),
    peakDb: r1(db(peak)),
    loudDb: r1(db(Math.sqrt(loud))),
    lowDb: r1(db(Math.sqrt(low / Math.max(1, n)))),
    highDb: r1(db(Math.sqrt(high / Math.max(1, n)))),
  };
}

async function render(seconds: number, schedule: (chip: Chip) => void): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * RATE), RATE);
  const chip = new Chip(ctx as unknown as AudioContext);
  chip.musicBus.gain.value = DEFAULT_VOLUME.music;
  chip.sfxBus.gain.value = DEFAULT_VOLUME.sfx;
  schedule(chip);
  const out = await ctx.startRendering();
  chip.dispose();
  return out;
}

function playAll(chip: Chip, def: Parameters<typeof parseSong>[0], route: Route, seconds: number, gain = 1) {
  const p = chip.play(parseSong(def), routeFor(chip, route), undefined, 0, gain);
  // Schedule the whole render up front (there is no clock running offline).
  for (let i = 0; i < 40; i++) p.pump(seconds + 1);
}

export async function measureMusic(ids: readonly MusicId[] = MUSIC, seconds = 24): Promise<Level[]> {
  const out: Level[] = [];
  for (const id of ids) {
    const def = MUSIC_DEFS[id];
    const len = Math.min(seconds, def.loop ? seconds : songSeconds(parseSong(def)) + 0.5);
    const buf = await render(len, (chip) => playAll(chip, def, "music", len, MUSIC_TRIM[id] ?? 1));
    out.push(stats(id, buf, Math.min(1, len / 4)));
  }
  return out;
}

export async function measureJingles(ids: readonly JingleId[] = JINGLES): Promise<Level[]> {
  const out: Level[] = [];
  for (const id of ids) {
    const def = JINGLE_DEFS[id];
    const len = songSeconds(parseSong(def)) + 0.4;
    out.push(stats(id, await render(len, (chip) => playAll(chip, def, "jingle", len, JINGLE_TRIM[id] ?? 1))));
  }
  return out;
}

export async function measureSfx(ids: readonly SfxId[] = SFX): Promise<Level[]> {
  const out: Level[] = [];
  for (const id of ids) {
    const def = SFX_DEFS[id];
    const len = songSeconds(parseSong(def)) + 0.2;
    out.push(stats(id, await render(len, (chip) => playAll(chip, def, "sfx", len, SFX_TRIM[id] ?? 1))));
  }
  return out;
}

export async function measureCries(ids: readonly SpeciesId[] = SPECIES_IDS): Promise<Level[]> {
  const out: Level[] = [];
  for (const id of ids) {
    const cry = cryFor(id);
    const len = songSeconds(parseSong(cry.def)) + 0.2;
    const l = stats(`${id}@${cry.duty}`, await render(len, (chip) => playAll(chip, cry.def, "cry", len, cry.level)));
    out.push(l);
  }
  return out;
}

export async function measureAmbience(kinds: AmbienceKind[] = ["meadow", "night", "forest", "town"], seconds = 20): Promise<Level[]> {
  const out: Level[] = [];
  for (const k of kinds) {
    const buf = await render(seconds, (chip) => {
      const bed = new AmbienceBed(chip, routeFor(chip, "ambience"), 1234);
      bed.start(k, 0);
      bed.pump(seconds);
    });
    out.push(stats(k, buf, 2));
  }
  return out;
}

/** Music with the route bed under it: how much the bed adds. */
export async function measureBedUnderMusic(music: MusicId, kind: AmbienceKind, seconds = 16) {
  const def = MUSIC_DEFS[music];
  const dry = stats(`${music}`, await render(seconds, (chip) => playAll(chip, def, "music", seconds, MUSIC_TRIM[music] ?? 1)), 2);
  const wet = stats(`${music}+${kind}`, await render(seconds, (chip) => {
    playAll(chip, def, "music", seconds, MUSIC_TRIM[music] ?? 1);
    const bed = new AmbienceBed(chip, routeFor(chip, "ambience"), 99);
    bed.start(kind, 0);
    bed.pump(seconds);
  }), 2);
  return { dry, wet };
}

export async function measureAll() {
  const t0 = performance.now();
  const music = await measureMusic();
  const jingles = await measureJingles();
  const sfx = await measureSfx();
  const cries = await measureCries();
  let ambience: Level[] = [];
  try { ambience = await measureAmbience(); } catch (e) { console.warn(e); }
  const fmt = (l: Level) => `${l.id.padEnd(20)} rms ${String(l.rmsDb).padStart(6)}  loud ${String(l.loudDb).padStart(6)}  peak ${String(l.peakDb).padStart(6)}  low ${String(l.lowDb).padStart(6)}  high ${String(l.highDb).padStart(6)}`;
  const sum = (ls: Level[]) => {
    const r = ls.map((l) => l.loudDb);
    return `loud min ${Math.min(...r)} max ${Math.max(...r)} mean ${r1(r.reduce((a, b) => a + b, 0) / r.length)}; peak max ${Math.max(...ls.map((l) => l.peakDb))}`;
  };
  return {
    ms: Math.round(performance.now() - t0),
    music: [sum(music), ...music.map(fmt)],
    jingles: [sum(jingles), ...jingles.map(fmt)],
    sfx: [sum(sfx), ...sfx.map(fmt)],
    cries: [sum(cries), ...cries.map(fmt)],
    ambience: ambience.length ? [sum(ambience), ...ambience.map(fmt)] : [],
  };
}
