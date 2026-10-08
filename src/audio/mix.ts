// The mix: category trims, per-track trims and default volumes. Levels were
// set by rendering everything offline (e2e/audiomix.ts) and comparing
// short-term loudness, not by ear; see the notes beside each number.

import type { JingleId, MusicId, SfxId } from "../contracts";
import type { Chip } from "./engine";

/** Default option volumes (Options screen scales these). */
export const DEFAULT_VOLUME = { music: 0.8, sfx: 0.9 } as const;

// Measured with e2e/audiomix.ts (OfflineAudioContext, default volumes,
// "loud" = loudest 400 ms RMS). Before this pass music sat at about -14 dBFS
// with peaks at -0.7, jingles 5.5 dB over the music and clipping into the
// compressor, and cries spread over 7 dB. Targets now:
//   music   ~ -17 dBFS loud, peaks under -2     (master -3 dB)
//   jingles ~ music + 1.5 dB                     (-6.7 dB)
//   cries   ~ music + 1 dB, spread under 3 dB    (+1.3 dB, per-duty trim in cry.ts)
//   SFX     UI blips 3-6 dB under music, impacts within 2 dB of it (+1.9 dB)
//   ambience 20-27 dB under the music it plays with (ambience.ts)
// Measured after: music -15.9..-17.9 (mean -16.8, peak -2.2); jingles -13.6..-14.8
// (level_up -17.4); cries -15.1..-18; UI blips -21.4..-24.4, impacts -14.8..-19.9;
// beds: meadow -38.1, night -42.2, forest -39.4, town -42 (no change to music RMS).
export const MIX = {
  master: 0.567,
  glueThresholdDb: -12,
  /** Jingles ride the music bus so they follow the music volume. */
  jingle: 1.25,
  /** Short SFX notes need a boost to read over the music. */
  sfx: 3.0,
  cry: 2.8,
  ambience: 1,
} as const;

/** Per-track gain so every track sits at the same loudness (measured, in dB in the comments). */
export const MUSIC_TRIM: Partial<Record<MusicId, number>> = {
  sugarbush_grove: 1.19,   // -16.3 -> -14.8 before master (sparse, eerie: kept a touch under)
  battle_rootstock: 1.12,  // -15.5 -> -14.5
  conservatory: 0.91,      // -12.8 -> -13.6
  victory_trainer: 0.95,   // -12.9 -> -13.3
  root_relay: 1.25,        // -19.6 -> -17.7 (a sparse hum and pad: kept under the rest, like the grove)
  palm_house: 1.06,        // -17.5 -> -17.0
  cedarhallow: 1.12,       // -18.5 -> -17.5 (hushed: a pad, a drone, no drums)
  burnt_stand: 1.22,       // -19.5 -> -17.8 (sparse and eerie: kept under, like the grove)
  // hollow: -17.5 untrimmed (the held drone carries it), level with root_relay.
  alpine: 1.16,            // -18.3 -> -17.0 (a soft waltz, no drums)
  red_lake: 1.30,          // -20.1 -> -17.8 (thin wails over a shimmer: kept under, like burnt_stand)
  // hideout: -16.9 untrimmed (the industrial groove carries it).
  relay_seized: 1.14,      // -18.8 -> -17.7 (level with root_relay, whose pulse it shares)
  thistledown: 1.12,       // -18.0 -> -17.0 (a picked figure and ticks, no kit)
  ridge: 1.10,             // -17.9 -> -17.1 (a pad and a slow bass, no drums)
  // canyon: -17.2 untrimmed (the gallop and drive carry it).
};

/** Per-effect gain: quiet UI blips up, the long hot ones down. */
export const SFX_TRIM: Partial<Record<SfxId, number>> = {
  cursor: 2.0,      // the shortest blip in the game: must still read in menus over music
  menu_open: 1.41,  // -24.5 -> -21.5
  hit_weak: 1.58,   // -24.9 -> -20.9: a weak hit is still a hit
  door: 1.41,       // -21.3 -> -18.3
  exp_tick: 1.12,   // repeats fast; just under the UI blips
  wilt: 0.71,       // -11.1 -> -14.1: was the loudest thing in the game
  save: 0.79,       // -13.1 -> -15.1
  stat_up: 0.79,    // -13.1 -> -15.1
  stat_down: 0.84,
  prune: 1.5,       // -23.0 -> -19.5: a field action, not a menu blip
  pulse: 0.6,       // -10.2 -> -14.6: a deep triangle swell carries a lot of energy
};

/** Per-jingle gain. */
export const JINGLE_TRIM: Partial<Record<JingleId, number>> = {
  level_up: 1.4,    // a two-beat flourish; measured 5 dB under the other jingles
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
