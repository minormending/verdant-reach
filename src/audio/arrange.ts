// Composition aid: turns a chord chart + hand-written melody into a full
// four-channel SongDef (in the MML song format). Melodies and chord charts
// are written by hand in music.ts; this file only voices the accompaniment
// (arpeggios, bass lines, drum grooves), the way a GB sound driver's
// macro-based tracks were often built.

import { TICKS_PER_QUARTER, noteText, restText, type SongDef } from "./song";

export type HarmonyStyle = "arp8" | "arp16" | "stab" | "pad" | "waltz" | "broken" | "none";
export type BassStyle = "root8" | "octave8" | "walk" | "half" | "march" | "waltz" | "gallop" | "drone" | "pulse";
export type DrumStyle = "none" | "soft" | "rock" | "march" | "drive" | "heavy" | "tick" | "industrial" | "tense" | "shuffle";

export interface Arrangement {
  bpm: number;
  meter?: 3 | 4;
  /** Bars separated by `|`; several chords in one bar split it evenly. */
  chords: string;
  /** p1 MML: the lead. Must fill exactly the same number of bars. */
  melody: string;
  harmony: HarmonyStyle;
  /** Header for the p2 channel, e.g. "v7 @1 q6". */
  harmonyTone?: string;
  bass: BassStyle;
  bassTone?: string;
  drums: DrumStyle;
  drumTone?: string;
  /** Drum fill on every Nth bar (default 8; 0 = none). */
  fillEvery?: number;
}

const ROOTS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const QUALITIES: Record<string, number[]> = {
  "": [0, 4, 7], m: [0, 3, 7], "7": [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11],
  dim: [0, 3, 6], aug: [0, 4, 8], sus4: [0, 5, 7], sus2: [0, 2, 7], "6": [0, 4, 7, 9], m6: [0, 3, 7, 9],
};

export interface Chord { root: number; tones: number[]; minor: boolean }

export function parseChord(sym: string): Chord {
  const m = /^([A-G])([b#]?)(.*)$/.exec(sym);
  if (!m) throw new Error(`bad chord ${sym}`);
  const q = QUALITIES[m[3]];
  if (!q) throw new Error(`bad chord quality ${sym}`);
  const root = (ROOTS[m[1]] + (m[2] === "b" ? -1 : m[2] === "#" ? 1 : 0) + 12) % 12;
  return { root, tones: q, minor: q[1] === 3 };
}

export function parseChart(chart: string): Chord[][] {
  return chart.split("|").map((b) => b.trim()).filter(Boolean).map((b) => b.split(/\s+/).map(parseChord));
}

/** Chord tones inside one octave window starting at `low`, ascending. */
function windowTones(c: Chord, low: number): number[] {
  return c.tones
    .map((t) => { let n = low + ((c.root + t - low) % 12 + 12) % 12; return n; })
    .sort((a, b) => a - b);
}
const bassRoot = (c: Chord) => 45 + ((c.root - 45) % 12 + 12) % 12; // A2..G#3

type Emit = (midi: number | null, ticks: number) => void;

function harmonySegment(style: HarmonyStyle, c: Chord, ticks: number, emit: Emit, barPos: number, meter: number) {
  const w = windowTones(c, 58);
  const up = [...w, w[0] + 12];
  const cycle = [...up, ...up.slice(1, -1).reverse()];
  const steps = (len: number) => Math.floor(ticks / len);
  switch (style) {
    case "none": emit(null, ticks); return;
    case "arp8": for (let i = 0; i < steps(24); i++) emit(cycle[i % cycle.length], 24); return;
    case "arp16": for (let i = 0; i < steps(12); i++) emit(up[i % up.length], 12); return;
    case "broken": for (let i = 0; i < steps(24); i++) emit(i % 2 === 0 ? w[0] : w[1 + ((i >> 1) % (w.length - 1))], 24); return;
    case "stab": for (let i = 0; i < steps(24); i++) emit(i % 2 === 1 ? w[1 + ((i >> 1) % (w.length - 1))] : null, 24); return;
    case "pad": {
      const n = Math.max(1, steps(96));
      for (let i = 0; i < n; i++) emit(w[1 + (i % (w.length - 1))], ticks / n);
      return;
    }
    case "waltz": for (let i = 0; i < steps(48); i++) emit((barPos / 48 + i) % meter === 0 ? null : w[1 + (i % (w.length - 1))], 48); return;
  }
}

function bassSegment(style: BassStyle, c: Chord, ticks: number, emit: Emit) {
  const r = bassRoot(c);
  const fifth = r + 7 > 57 ? r - 5 : r + 7;
  const third = r + (c.minor ? 3 : 4);
  const steps = (len: number) => Math.floor(ticks / len);
  switch (style) {
    case "drone": emit(r, ticks); return;
    case "root8": for (let i = 0; i < steps(24); i++) emit(i % 4 === 3 ? fifth : r, 24); return;
    case "pulse": for (let i = 0; i < steps(24); i++) emit(r, 24); return;
    case "octave8": for (let i = 0; i < steps(24); i++) emit(i % 2 ? r + 12 : r, 24); return;
    case "walk": { const seq = [r, third, fifth, r + 9]; for (let i = 0; i < steps(48); i++) emit(seq[i % 4], 48); return; }
    case "half": for (let i = 0; i < Math.ceil(ticks / 96); i++) emit(i % 2 ? fifth : r, 96); return;
    case "march": for (let i = 0; i < steps(48); i++) emit(i % 2 ? fifth : r, 48); return;
    case "waltz": emit(r, 48); if (ticks > 48) emit(null, ticks - 48); return;
    case "gallop": for (let i = 0; i < steps(48); i++) { emit(r, 24); emit(r, 12); emit(i % 2 ? fifth : r + 12, 12); } return;
  }
}

// One 4/4 bar of drums per style (3/4 styles use the first three beats).
const GROOVES: Record<Exclude<DrumStyle, "none">, string> = {
  soft:       "k8 h8 h8 h8 s8 h8 h8 h8",
  rock:       "k8 h8 s8 h8 k8 k8 s8 h8",
  march:      "k8 s16 s16 s8 s8 k8 s16 s16 s8 s16 s16",
  drive:      "k8 h8 s8 h8 k8 h8 s8 k8",
  heavy:      "k8 k8 s8 h8 k8 k8 s8 s8",
  tick:       "h8 r8 h8 h8 r8 h8 h8 r8",
  industrial: "k8 x16 h16 s8 h8 k8 k8 s16 s16 h8",
  tense:      "k8 r8 h8 k8 r8 h8 s8 h8",
  shuffle:    "k8. h16 s8. h16 k8. h16 s8. h16",
};
const FILLS: Partial<Record<DrumStyle, string>> = {
  rock: "k8 h8 s8 h8 s16 s16 s16 s16 s8 s8",
  drive: "k8 h8 s8 h8 s16 s16 s16 s16 x8 s8",
  heavy: "k8 k8 s8 s8 s16 s16 s16 s16 x4",
  march: "k8 s16 s16 s8 s8 s16 s16 s16 s16 s8 s8",
  industrial: "k8 x16 h16 s8 h8 s16 s16 s16 s16 x8 s8",
};

function drumBar(style: DrumStyle, meter: number, fill: boolean): string {
  if (style === "none") return restText(meter * TICKS_PER_QUARTER);
  if (meter === 3) return style === "tick" ? "h4 h4 h4" : "k4 h4 s4";
  return (fill && FILLS[style]) || GROOVES[style];
}

export function arrange(a: Arrangement): SongDef {
  const meter = a.meter ?? 4;
  const barTicks = meter * TICKS_PER_QUARTER;
  const bars = parseChart(a.chords);
  const harm: string[] = [];
  const bass: string[] = [];
  const drums: string[] = [];
  // Bounded emitter: truncates overshoot and pads any remainder with rest.
  const segment = (out: string[], ticks: number, fn: (emit: Emit) => void) => {
    let used = 0;
    fn((midi, t) => {
      const len = Math.min(t, ticks - used);
      if (len <= 0) return;
      out.push(midi === null ? restText(len) : noteText(midi, len));
      used += len;
    });
    if (used < ticks) out.push(restText(ticks - used));
  };
  const fillEvery = a.fillEvery ?? 8;
  bars.forEach((chords, b) => {
    const seg = barTicks / chords.length;
    chords.forEach((c, k) => {
      segment(harm, seg, (e) => harmonySegment(a.harmony, c, seg, e, k * seg, meter));
      segment(bass, seg, (e) => bassSegment(a.bass, c, seg, e));
    });
    harm.push("|"); bass.push("|");
    drums.push(drumBar(a.drums, meter, fillEvery > 0 && (b + 1) % fillEvery === 0), "|");
  });
  const def: SongDef = {
    bpm: a.bpm,
    loop: true,
    p1: a.melody,
    p2: a.harmony === "none" ? undefined : `${a.harmonyTone ?? "v6 @1 q6"} ${harm.join(" ")}`,
    wave: `${a.bassTone ?? "v15 q6"} ${bass.join(" ")}`,
    noise: a.drums === "none" ? undefined : `${a.drumTone ?? "v9"} ${drums.join(" ")}`,
  };
  return def;
}

export const barCount = (a: Arrangement) => parseChart(a.chords).length;
