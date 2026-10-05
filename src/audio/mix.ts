// The mix: category trims, per-track trims and default volumes. Levels were
// set by rendering everything offline (e2e/audiomix.ts) and comparing
// short-term loudness, not by ear; see the notes beside each number.

import type { MusicId, SfxId } from "../contracts";
import type { Chip } from "./engine";

/** Default option volumes (Options screen scales these). */
export const DEFAULT_VOLUME = { music: 0.8, sfx: 0.9 } as const;

// Measured with e2e/audiomix.ts (OfflineAudioContext, default volumes,
// "loud" = loudest 400 ms RMS). Before this pass music sat at about -14 dBFS
// with peaks at -0.7, jingles 5.5 dB over the music and clipping into the
// compressor, and cries spread over 7 dB. Targets now:
//   music  ~ -17 dBFS loud, peaks under -3      (master -3 dB)
//   jingles ~ music + 1.5 dB                     (-4 dB)
//   cries  ~ music + 1 dB, spread under 4 dB     (+1.3 dB, per-duty trim in cry.ts)
//   SFX    UI blips 3-6 dB under music, impacts within 2 dB of it
//   ambience 20-26 dB under the music it plays with (ambience.ts)
export const MIX = {
  master: 0.567,
  glueThresholdDb: -12,
  /** Jingles ride the music bus so they follow the music volume. */
  jingle: 1.7,
  /** Short SFX notes need a boost to read over the music. */
  sfx: 2.4,
  cry: 2.8,
  ambience: 1,
} as const;

/** Per-track gain so every track sits at the same loudness (measured, in dB in the comments). */
export const MUSIC_TRIM: Partial<Record<MusicId, number>> = {
  sugarbush_grove: 1.19,   // -16.3 -> -14.8 before master (sparse, eerie: kept a touch under)
  battle_rootstock: 1.12,  // -15.5 -> -14.5
  conservatory: 0.91,      // -12.8 -> -13.6
  victory_trainer: 0.95,   // -12.9 -> -13.3
};

/** Per-effect gain: quiet UI blips up, the long hot ones down. */
export const SFX_TRIM: Partial<Record<SfxId, number>> = {
  cursor: 1.58,     // -29.3 -> -25.3: must read in menus over music
  menu_open: 1.41,  // -24.5 -> -21.5
  hit_weak: 1.58,   // -24.9 -> -20.9: a weak hit is still a hit
  door: 1.41,       // -21.3 -> -18.3
  exp_tick: 1.12,   // repeats fast; just under the UI blips
  wilt: 0.71,       // -11.1 -> -14.1: was the loudest thing in the game
  save: 0.79,       // -13.1 -> -15.1
  stat_up: 0.79,    // -13.1 -> -15.1
  stat_down: 0.84,
};

export type Route = "music" | "jingle" | "sfx" | "cry" | "ambience";

export function routeFor(chip: Chip, r: Route): AudioNode {
  switch (r) {
    case "music": return chip.musicBus;
    case "jingle": return chip.jingleBus;
    case "sfx": return chip.effectBus;
    case "cry": return chip.cryBus;
    case "ambience": return chip.ambienceBus;
  }
}
