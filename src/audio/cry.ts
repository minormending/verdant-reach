// Species cries: a short, deterministic rustle + chirp synthesised from the
// species id. Lines share a timbre (seeded by the line), each species adds
// its own contour (seeded by the id), and later stages sit lower.

import type { SpeciesId } from "../contracts";
import { DATA } from "../data";
import { noteText, type SongDef } from "./song";

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CryShape { base: number; def: SongDef }

export function cryFor(species: SpeciesId): CryShape {
  const sp = DATA.species[species];
  const line = sp?.line ?? species;
  const stage = sp?.stage ?? 1;
  const lr = seeded(hashString(line));
  const r = seeded(hashString(species));

  // Line timbre
  const duty = Math.floor(lr() * 4);
  const lineBase = 70 + Math.floor(lr() * 9);   // A#4..F#5
  const rustleMode = lr() < 0.5 ? 0 : 1;
  const rustleOct = 5 + Math.floor(lr() * 2);
  // Stage drops the voice: stage 2 a fourth lower, stage 3 an octave lower.
  const base = lineBase - [0, 5, 12][stage - 1] + Math.floor(r() * 3) - 1;

  const count = 2 + Math.floor(r() * 3) + (stage === 3 ? 1 : 0);
  const notes: string[] = [];
  const echo: string[] = [];
  let pitch = base;
  for (let i = 0; i < count; i++) {
    const len = r() < 0.6 ? 6 : 12;            // 32nd or 16th
    const slide = Math.round((r() - 0.4) * 10); // mostly upward chirps
    notes.push(`p${slide} ${noteText(pitch, len)}`);
    echo.push(`p${slide} ${noteText(pitch - 12, len)}`);
    pitch += Math.floor(r() * 9) - 3;
  }
  // final flourish: a falling or rising tail, longer for big plants
  const tail = stage === 3 ? 24 : 12;
  const tailSlide = r() < 0.5 ? -7 : 5;
  notes.push(`p${tailSlide} ${noteText(pitch, tail)}`);
  echo.push(`p${tailSlide} ${noteText(pitch - 12, tail)}`);

  const rustleVol = 6 + Math.floor(r() * 4);
  const rustle = [`v${rustleVol} @${rustleMode} %1`, `o${rustleOct}c32`, `o${rustleOct - 1}g32`, `o${rustleOct}e32`];

  return {
    base,
    def: {
      bpm: 150,
      loop: false,
      p1: `v12 @${duty} q8 %0 ~${stage * 8} r32 ${notes.join(" ")}`,
      p2: `v5 @${(duty + 1) % 4} q7 r16 ${echo.join(" ")}`,
      noise: rustle.join(" "),
    },
  };
}
