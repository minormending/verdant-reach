// Original compositions for every MusicId. Melodies and chord charts are
// written by hand for this game; the accompaniment is voiced by arrange.ts.
// None of these quote existing game or film music.
//
// Reading the melodies: `|` is a bar line, `o5` sets the octave, lengths are
// 1/2/4/8/16 with dots, `+`/`-` are sharp/flat. Each line is 4 bars.

import type { MusicId } from "../contracts";
import { arrange, type Arrangement } from "./arrange";
import type { SongDef } from "./song";

const LEAD = "v11 @2 q7";      // bright 50% lead
const SOFT = "v10 @1 q7 ~12";  // 25% lead with a little vibrato
const THIN = "v10 @0 q6";      // 12.5% reedy lead

export const ARRANGEMENTS: Record<MusicId, Arrangement> = {
  // ------------------------------------------------------------------ title
  // Hopeful and wondrous: a rising sixth that keeps reaching upward.
  title: {
    bpm: 112, harmony: "arp8", bass: "half", drums: "soft",
    chords: "C | G | Am | F | C | G | F | G | Am | Em | F | C | Dm | G | E7 | Am | F | G | Em | Am | F | G | C | C",
    melody: `${SOFT}
      o4g4 o5e2 d8c8 | d4. e8 d4 o4b4 | o5c4. o4b8 a4 o5e4 | f2 e8d8 c4 |
      o4g4 o5e2 g8e8 | d4. c8 d4 g4 | a4. g8 f4 a4 | g2. r4 |
      e4 a4 g8e8 c4 | b4. a8 g4 e4 | a4 g4 f4 c4 | e2. r4 |
      d4 f4 a4 o6c4 | o5b2 a8g8 f4 | g+4 b4 o6d4 c8o5b8 | a2. r4 |
      c4 f4 a4 g8f8 | g4. f8 e4 d4 | e4 g4 b4 a8g8 | a2 e4 c4 |
      f4. g8 a4 f4 | g4. a8 b4 o6d4 | c1 | r1 |`,
  },

  // ------------------------------------------------------------------ prologue
  // Slow and magical: long, floating notes over maj7 colours.
  prologue_bloom: {
    bpm: 72, harmony: "arp8", harmonyTone: "v5 @1 q5 ~8", bass: "drone", bassTone: "v12 q8", drums: "none",
    chords: "Dmaj7 | Bm7 | Gmaj7 | A | Dmaj7 | Bm7 | Em7 | A | Gmaj7 | F#m7 | Em7 | Bm7 | Gmaj7 | A | Dmaj7 | Dmaj7",
    melody: `v10 @1 q8 ~20
      o5f+2. e4 | d4 c+4 o4b2 | o5d2. f+4 | e1 |
      a2. f+4 | e4 f+4 d2 | g2 f+4 e4 | e2. c+4 |
      d2 f+4 a4 | o6c+2. o5a4 | b2 g2 | f+1 |
      g4 a4 b4 o6d4 | c+2. o5a4 | a4 g4 f+4 e4 | d1 |`,
  },

  // ------------------------------------------------------------------ herbarium
  // Curious and bouncy: chromatic neighbour notes, staccato.
  herbarium: {
    bpm: 120, harmony: "stab", harmonyTone: "v6 @2 q3", bass: "octave8", bassTone: "v15 q4", drums: "shuffle",
    chords: "F | Dm | Gm C | F | F | Dm | Gm C | F | Bb | C | Am Dm | Gm C | F | Dm | Gm C | F",
    melody: `v11 @2 q4
      o5c8f8a8g+8 a4 f4 | d8f8a8g+8 a4 r4 | b-8a8g8f8 e8g8 c4 | f8r8a8r8 f4 r4 |
      c8f8a8g+8 a4 f4 | d8f8a8g+8 a4 r4 | b-8a8g8f8 e8g8 c4 | f4 o6c4 o5f4 r4 |
      d8f8b-8f8 d8f8 b-4 | e8g8o6c8o5g8 e8g8 o6c4 | o5c4 o4a4 o5f4 d4 | g8a8b-8o6c8 d8c8o5b-8g8 |
      c8f8a8g+8 a4 f4 | d8f8a8g+8 a4 r4 | b-8a8g8f8 e8g8 c4 | f2 r2 |`,
  },

  // ------------------------------------------------------------------ fallowfield
  // Pastoral home: simple, singable, settled.
  fallowfield: {
    bpm: 96, harmony: "broken", harmonyTone: "v6 @1 q6", bass: "half", drums: "soft", drumTone: "v6",
    chords: "G | C | G | D | Em | C | Am D | G | C | G | Am | D | G Em | C D | G | G",
    melody: `${SOFT}
      o5d4 g4 f+8e8 d4 | e4. d8 c4 e4 | d4 o4b4 g4 b4 | a2. r4 |
      b4 o5e4 d8e8 g4 | g4. e8 c4 e4 | d4 c4 o4b4 a4 | g2. r4 |
      o5e4 g4 o6c4 o5g4 | b4. a8 g4 d4 | c4 e4 a4 g8e8 | f+2. r4 |
      g4 d4 e4 o4b4 | o5c4 e4 d4 f+4 | g4. f+8 g4 a4 | g2. r4 |`,
  },

  // ------------------------------------------------------------------ route
  // Adventurous: bright major, pushing eighth-note bass.
  route: {
    bpm: 144, harmony: "arp16", harmonyTone: "v5 @1 q5", bass: "root8", drums: "rock",
    chords: "D | D | G | A | Bm | G | Em | A | D | D | G | A | Bm | G | A | A | G | A | F#m | Bm | G | A | D | D",
    melody: `${LEAD}
      o5d4. a8 a4 f+8a8 | b8a8f+8e8 d4 o4a4 | b4. o5d8 g4 f+8g8 | a4 e4 c+4 e4 |
      f+4. e8 d4 f+4 | g4. f+8 e4 d4 | e8f+8g8a8 b4 g4 | a2. r4 |
      d4. a8 a4 f+8a8 | b8a8f+8e8 d4 o4a4 | b4. o5d8 g4 f+8g8 | a4 e4 c+4 e4 |
      f+4. e8 d4 f+4 | g4. f+8 e4 d4 | c+4 d4 e4 c+4 | o4a2. r4 |
      o5b4. a8 g4 d4 | c+4. d8 e4 a4 | a4. f+8 e4 c+4 | d4 f+4 b4 a4 |
      g4 b4 o6d4 c+8o5b8 | a4. g8 f+4 e4 | d2 f+4 a4 | o6d2. r4 |`,
  },

  // ------------------------------------------------------------------ route at night
  // Gentle and mysterious: A minor, hats only, slow vibrato.
  route_night: {
    bpm: 88, harmony: "arp8", harmonyTone: "v5 @1 q4 ~6", bass: "half", bassTone: "v13 q7", drums: "tick", drumTone: "v4",
    chords: "Am | Em | F | G | Am | Em | Dm | E | F | G | Em | Am | Dm | Em | F | E",
    melody: `v9 @1 q7 ~18
      o5e2 d4 c4 | o4b2. r4 | o5c4 d4 e4 f4 | g2 d2 |
      e2 a4 g4 | e2. r4 | f4 e4 d4 f4 | e2 o4g+2 |
      o5a2 g4 f4 | g2. d4 | e4 g4 b4 g4 | a2. r4 |
      f4 a4 o6d4 c4 | o5b2 g4 e4 | f4 e4 d4 c4 | o4b1 |`,
  },

  // ------------------------------------------------------------------ small town
  // Cosy: walking bass, offbeat chords, warm B-flat.
  small_town: {
    bpm: 104, harmony: "stab", harmonyTone: "v6 @1 q4", bass: "walk", drums: "soft", drumTone: "v6",
    chords: "Bb | Gm | Eb | F | Bb | Gm | Cm F | Bb | Eb | F | Dm | Gm | Eb | F | Bb | Bb",
    melody: `${SOFT}
      o5d4 f4 d8c8 o4b-4 | o5d4 c4 o4b-4 g4 | b-4. o5c8 e-4 g4 | f2. r4 |
      d4 f4 b-4 a8g8 | f4 d4 o4b-4 o5d4 | c4 e-4 d4 c4 | o4b-2. r4 |
      o5e-4 g4 b-4 g4 | f4. e-8 d4 c4 | d4 f4 a4 f4 | g2. r4 |
      e-4 f4 g4 b-4 | a4. g8 f4 e-4 | d4 c4 o4b-4 o5d4 | o4b-2. r4 |`,
  },

  // ------------------------------------------------------------------ greenhouse
  // Soothing waltz with a borrowed C minor for warmth.
  greenhouse: {
    bpm: 100, meter: 3, harmony: "waltz", harmonyTone: "v5 @1 q5", bass: "waltz", bassTone: "v13 q7", drums: "none",
    chords: "G | Bm | C | D | G | Em | Am | D | C | D | Bm | Em | Am | D | G | G | C | Cm | G | Em | Am | D | G | G",
    melody: `${SOFT}
      o5d2 g4 | f+2 d4 | e4 g4 e4 | d2. |
      b2 o6d4 | o5b4 g4 e4 | o6c2 o5a4 | f+2. |
      g2 e4 | f+2 a4 | b2 f+4 | g2. |
      e4 a4 c4 | d4 f+4 a4 | g2. | d4 e4 f+4 |
      g2 e4 | g2 e-4 | d2 o4b4 | o5e2 g4 |
      c4 e4 a4 | a2 f+4 | g2. | r2. |`,
  },

  // ------------------------------------------------------------------ market
  // Jaunty: oom-pah bass, hopping staccato tune.
  market: {
    bpm: 150, harmony: "stab", harmonyTone: "v6 @2 q3", bass: "march", bassTone: "v15 q4", drums: "rock", drumTone: "v7",
    chords: "C | Am | F | G | C | Am | Dm G | C | F | F | C | C | D7 | D7 | G | G7 | C | Am | F | G | C | A7 | Dm G | C",
    melody: `v11 @2 q5
      o5g8e8r8g8 a8g8e8c8 | e8c8r8e8 a4 g4 | f8a8o6c8o5a8 o6f4 e8c8 | o5g4 r8d8 g4 r4 |
      g8e8r8g8 a8g8e8c8 | e8c8r8e8 a4 g4 | d8f8a8f8 g8b8o6d8o5b8 | o6c4 o5g8e8 c4 r4 |
      a4. g8 a8o6c8 r4 | o5a8g8f8a8 g4 f4 | e4. d8 e8g8 r4 | e8d8c8e8 d4 c4 |
      f+4. e8 f+8a8 r4 | o6c8o5a8f+8a8 o6c4 o5a4 | b4. a8 g8b8 o6d4 | f4 d4 o5b4 g4 |
      g8e8r8g8 a8g8e8c8 | e8c8r8e8 a4 g4 | f8a8o6c8o5a8 o6f4 e8c8 | o5g4 r8d8 g4 r4 |
      g8e8r8g8 a8g8e8c8 | e8c+8r8e8 a4 g4 | d8f8a8f8 g8b8o6d8o5b8 | o6c4 o5g8e8 c4 r4 |`,
  },

  // ------------------------------------------------------------------ conservatory
  // Proud and rhythmic: dotted fanfare figures over a march.
  conservatory: {
    bpm: 120, harmony: "stab", harmonyTone: "v6 @1 q4", bass: "march", drums: "march",
    chords: "G | C | G | D | G | C | Am D | G | Em | C | G | D | Em | C | D | D",
    melody: `${LEAD}
      o5d8.d16 g4 b4. a8 | g8.e16 c4 e4 g4 | d8.d16 g4 b4 o6d4 | o5a4. f+8 d4 r4 |
      d8.d16 g4 b4. a8 | e8.g16 o6c4 c8.d16 e4 | d4 c4 o5b4 a4 | g2. r4 |
      b8.b16 o6e4 d8c8 o5b4 | a8.a16 g4 e4 g4 | d8.d16 g4 a4 b4 | a2. r4 |
      g8.g16 b4 o6e4 g4 | e8.d16 c4 o5g4 e4 | f+8.g16 a4 o6d4 c4 | d2. r4 |`,
  },

  // ------------------------------------------------------------------ sugarbush grove
  // Tense and woody: E minor ostinato, reedy 12.5% lead, sparse kicks.
  sugarbush_grove: {
    bpm: 108, harmony: "arp8", harmonyTone: "v5 @0 q3", bass: "pulse", bassTone: "v14 q3", drums: "tense", drumTone: "v7",
    chords: "Em | Em | C | B7 | Em | Em | Am | B7 | C | D | Em | Em | Am | C | B7 | B7",
    melody: `${THIN}
      o4b4. o5c8 o4b2 | g4 a4 b4 o5e4 | e4. d8 c2 | o4b2 a+2 |
      e4 g4 b4 o5e4 | d4 e4 f+4 g4 | a2 g4 e4 | f+2. d+4 |
      e4 g4 o6c4 o5b4 | a4 f+4 d4 a4 | b2 g2 | e2. r4 |
      c4. o4b8 a4 o5e4 | g4. a8 g4 e4 | o4f+4 a4 o5d+4 f+4 | o4b1 |`,
  },

  // ------------------------------------------------------------------ rival
  // Brash: syncopated C minor with a cocky raised seventh.
  rival_appears: {
    bpm: 144, harmony: "stab", harmonyTone: "v6 @2 q3", bass: "octave8", drums: "drive", drumTone: "v8",
    chords: "Cm | Cm | Ab | Bb | Cm | Cm | Ab | G | Fm | Fm | Cm | Cm | Ab | Bb | Cm | G7 | Ab | Bb | G | G",
    melody: `v11 @3 q6
      o5c8c8r8e-8 r8g4 f8 | e-8d8 c4 o4g4 r4 | o5c8c8r8e-8 r8a-4 g8 | f4 d4 o4b-4 r4 |
      o5c8c8r8e-8 r8g4 f8 | g8f8e-8d8 e-4 c4 | c8e-8a-8g8 a-4 o6c4 | o5b2. r4 |
      a-4. g8 f4 c4 | a-8g8f8e-8 f4 r4 | g4. f8 e-4 c4 | e-8d8c8d8 e-4 g4 |
      a-4. g8 a-4 o6c4 | d4. c8 o5b-4 f4 | g2 e-4 c4 | d4 f4 b4 o6d4 |
      c4 o5a-4 e-4 c4 | d4 f4 b-4 o6d4 | d2 o5b2 | g2. r4 |`,
  },

  // ------------------------------------------------------------------ rootstock
  // Sinister march: D minor with a creeping flat second (E-flat).
  rootstock_appears: {
    bpm: 116, harmony: "stab", harmonyTone: "v6 @0 q3", bass: "march", bassTone: "v15 q5", drums: "march", drumTone: "v8",
    chords: "Dm | Eb | Dm | Eb | Gm | A | Dm | A | Dm | Eb | Dm | Bb | Gm | Eb | A7 | A",
    melody: `v11 @0 q6
      o4d4 d8d8 f4 a4 | g4. f8 e-2 | d4 d8d8 f4 a4 | b-2 g4 e-4 |
      o5d4. c8 o4b-4 g4 | a2 o5c+4 e4 | f4. e8 d4 o4a4 | o5c+2 e2 |
      o4d4 d8d8 f4 a4 | g4. f8 e-2 | d4 d8d8 f4 a4 | o5f4 d4 o4b-4 f4 |
      g4 b-4 o5d4 g4 | g4. f8 e-4 c4 | c+2 e4 g4 | a2 r2 |`,
  },

  // ------------------------------------------------------------------ wild battle
  // Driving: galloping bass, sixteenth arpeggios, A minor.
  battle_wild: {
    bpm: 168, harmony: "arp16", harmonyTone: "v5 @1 q5", bass: "gallop", bassTone: "v15 q5", drums: "drive",
    chords: "Am | Am | F | G | Am | Am | F | E | Dm | Dm | Am | Am | F | G | E7 | E | F | G | Am | Am | F | G | E | E",
    melody: `${LEAD}
      o5a8e8a8b8 o6c4 o5b8a8 | g8e8g8a8 e4 r4 | f8a8o6c8o5a8 o6f4 e8c8 | d4 o5b4 g4 b4 |
      a8e8a8b8 o6c4 o5b8a8 | o6c8o5b8a8g8 a4 e4 | f4 a4 o6c4 o5a4 | e4 g+4 b4 g+4 |
      a4. g8 f4 d4 | f8g8a8b8 o6c4 d4 | e4. d8 c4 o5a4 | e2. r4 |
      f4. g8 a4 o6c4 | d4. c8 o5b4 g4 | g+4 a4 b4 o6d4 | e2 o5b4 g+4 |
      a8o6c8f8c8 o5a8o6c8 o5a4 | b8o6d8g8d8 o5b8o6d8 o5b4 | o6c4 o5b4 a4 e4 | a2. r4 |
      o6c4. o5a8 f4 a4 | b4. a8 g4 b4 | o6e4 d4 c4 o5b4 | g+2 e2 |`,
  },

  // ------------------------------------------------------------------ trainer battle
  // Heavier: E minor, 75% duty grit, double-kick groove.
  battle_trainer: {
    bpm: 160, harmony: "arp16", harmonyTone: "v5 @2 q5", bass: "gallop", bassTone: "v15 q5", drums: "heavy",
    chords: "Em | Em | C | D | Em | Em | C | B | Am | Am | Em | Em | C | D | B7 | B | C | D | B7 | Em | Am | C | B | B",
    melody: `v11 @3 q7
      o5e8e8g8e8 b8e8a8g8 | f+8e8d8e8 o4b4 r4 | o5c8c8e8c8 g8c8f+8e8 | d4 f+4 a4 o6d4 |
      o5e8e8g8e8 b8e8a8g8 | g8f+8e8d8 e4 b4 | o6c4. o5b8 a4 g4 | f+2 d+2 |
      e4. f+8 g4 a4 | o6c4 o5b4 a4 e4 | g4. f+8 e4 b4 | e2. r4 |
      e4 g4 o6c4 e4 | d4. c8 o5a4 f+4 | d+4 f+4 b4 a4 | f+2. r4 |
      g4. a8 g4 e4 | f+4. g8 a4 d4 | d+4 f+4 a4 b4 | g2 e2 |
      a4. b8 o6c4 e4 | g4. e8 c4 o5g4 | f+4 a4 b4 o6d+4 | o5b2. r4 |`,
  },

  // ------------------------------------------------------------------ leader battle
  // Epic: D minor, a soaring lyrical third section, 32 bars.
  battle_leader: {
    bpm: 152, harmony: "arp16", harmonyTone: "v5 @1 q5", bass: "gallop", bassTone: "v15 q5", drums: "drive", drumTone: "v9",
    chords: "Dm | Dm | Bb | C | Dm | Dm | Bb | A | Gm | Gm | Dm | Dm | Bb | C | A7 | A | Bb | C | Am | Dm | Bb | C | A | A | Dm | C | Bb | A | Dm | C | Bb A | A",
    melody: `${LEAD}
      o5d4. a8 a4 g8f8 | e8f8g8e8 d4 o4a4 | o5d4. f8 b-4 a8g8 | g4 e4 c4 e4 |
      d4. a8 o6d4 c8o5a8 | b-8a8g8f8 e4 d4 | f4 b-4 a4 g4 | e2 c+2 |
      d4 g4 b-4 a8g8 | a4. g8 f4 d4 | f4. e8 d4 a4 | a2. r4 |
      b-4. a8 b-4 o6d4 | c4. o5b-8 a4 g4 | a4 c+4 e4 g4 | a2. r4 |
      ~14 f2 b-4. a8 | g2 e4. f8 | e2 a4. g8 | f2 d4 e4 |
      f2 b-4 o6d4 | c2 o5g4. a8 | a2 o6c+4 e4 | e2. r4 |
      ~0 d4. c8 o5a4 f4 | g4. f8 e4 c4 | d4. e8 f4 b-4 | a2 e4 c+4 |
      d8f8a8o6d8 c8o5a8f8a8 | g8e8c8e8 g8o6c8o5b-8g8 | f4 d4 e4 c+4 | a2. r4 |`,
  },

  // ------------------------------------------------------------------ rootstock battle
  // Industrial: F minor machine riff, metallic hats, Neapolitan G-flat.
  battle_rootstock: {
    bpm: 156, harmony: "arp16", harmonyTone: "v5 @0 q4", bass: "octave8", bassTone: "v15 q4", drums: "industrial", drumTone: "v9 @1",
    chords: "Fm | Fm | Db | Eb | Fm | Fm | Gb | C | Bbm | Bbm | Fm | Fm | Db | Eb | C7 | C | Fm | Gb | Fm | Gb | Db | Eb | C | C",
    melody: `v11 @0 q5
      o5f8f8r8f8 a-8g8f8c8 | e-8f8r8c8 r8c8 e-4 | f8f8r8f8 a-8g8f8d-8 | e-8e-8r8e-8 g8f8e-8o4b-8 |
      o5f8f8r8f8 a-8g8f8c8 | a-8g8f8e-8 f4 c4 | g-4. f8 e-4 d-4 | c2 e2 |
      f4. e-8 d-4 o4b-4 | o5d-8f8b-8f8 d-8f8 b-4 | a-4. g8 f4 c4 | f2. r4 |
      a-4 f4 d-4 f4 | g4 b-4 e-4 g4 | e4 g4 o6c4 o5b-4 | g2 e2 |
      o6c8c8r8c8 d-8c8o5a-8f8 | g-8g-8r8g-8 b-8g-8 d-4 | o6c8c8r8c8 d-8c8o5a-8f8 | b-8b-8r8b-8 o6d-8o5b-8 g-4 |
      f4. a-8 f4 d-4 | g4. b-8 g4 e-4 | e4 g4 b-4 o6c4 | o5e2. r4 |`,
  },

  // ------------------------------------------------------------------ victories
  victory_wild: {
    bpm: 120, harmony: "arp8", harmonyTone: "v6 @1 q5", bass: "root8", drums: "soft",
    chords: "G | C | D | G | Em | C | A | D | G | C | D7 | Bm | C | D | G | G",
    melody: `${LEAD}
      o5g8r8g8a8 b4 g4 | o6c4 o5b8a8 g4 e4 | f+4 a4 d4 f+4 | g2. r4 |
      b4. a8 g4 e4 | c4 e4 g4 o6c4 | c+4 o5b8a8 e4 c+4 | d2 a4 f+4 |
      g4 b4 o6d4 o5b4 | o6c4. o5b8 a4 g4 | a4 f+4 a4 o6c4 | o5b2 f+2 |
      g4 e4 c4 e4 | f+4 g4 a4 o6c4 | o5b4 o6d4 g4 d4 | o5g2. r4 |`,
  },

  victory_trainer: {
    bpm: 132, harmony: "arp8", harmonyTone: "v6 @1 q5", bass: "octave8", drums: "rock", drumTone: "v7",
    chords: "C | F | G | C | Am | F | D7 | G | C | F | G | Em | Am | Dm | G | G7 | F | G | C | C",
    melody: `${LEAD}
      o5c8e8g8o6c8 o5b4 g4 | a4. g8 f4 c4 | d8g8b8o6d8 c4 o5b4 | o6c2. r4 |
      o5a4. b8 o6c4 e4 | d4 c4 o5a4 f4 | f+4 a4 o6c4 o5a4 | g2. r4 |
      e4 g4 o6c4 o5g4 | f4 a4 o6c4 o5a4 | b4. a8 g4 d4 | e4 g4 b4 g4 |
      a4. g8 a4 o6c4 | d4. c8 o5a4 f4 | g4 b4 o6d4 o5b4 | o6f4 d4 o5b4 g4 |
      a8b8 o6c4 o5a4 f4 | b8o6c8 d4 o5b4 g4 | o6c4 o5g4 e4 g4 | o6c2. r4 |`,
  },

  victory_leader: {
    bpm: 120, harmony: "arp16", harmonyTone: "v5 @1 q5", bass: "octave8", drums: "march", drumTone: "v7",
    chords: "D | G | A | D | Bm | G | E7 | A | D | G | A | F#m | Bm | Em | A | A | G | A | F#m | Bm | G | A | D | D",
    melody: `${LEAD}
      o5d4. f+8 a4 o6d4 | o5b4. a8 g4 b4 | a4. g8 f+4 e4 | f+2. r4 |
      f+4. g8 a4 b4 | o6d4. c+8 o5b4 g4 | g+4 b4 o6e4 d4 | c+2. r4 |
      o5a4. b8 a4 f+4 | g4. a8 b4 o6d4 | c+4. o5b8 a4 e4 | f+2 c+2 |
      d4 f+4 b4 a4 | g4. f+8 e4 g4 | f+4 e4 c+4 e4 | a2. r4 |
      b4 o6d4 o5b4 g4 | a4 o6c+4 e4 c+4 | c+4. o5b8 a4 f+4 | f+4 b4 o6d4 c+4 |
      d4 o5b4 g4 b4 | a4. b8 o6c+4 e4 | d2 o5a4 f+4 | d2. r4 |`,
  },

  // ------------------------------------------------------------------ slice end
  // Bittersweet, hopeful: F major with a borrowed B-flat minor sigh.
  slice_end: {
    bpm: 84, harmony: "arp8", harmonyTone: "v5 @1 q5 ~6", bass: "half", bassTone: "v13 q7", drums: "none",
    chords: "F | Am | Bb | C | Dm | Am | Bb | C | Dm | Bb | F | C | Bb | Bbm | F | F",
    melody: `v10 @1 q8 ~16
      o5c2 a4 g4 | e2. c4 | d4 f4 b-4 a4 | g2. r4 |
      a2 f4 d4 | e2 a4 g4 | f4. e8 d4 f4 | g2 e2 |
      f2 a4 o6d4 | d2 c4 o5b-4 | a2. f4 | g2. r4 |
      f4 g4 a4 b-4 | o6d-2 o5b-4 f4 | a4 g4 f2 | f1 |`,
  },
};

export const MUSIC_DEFS: Record<MusicId, SongDef> = Object.fromEntries(
  Object.entries(ARRANGEMENTS).map(([id, a]) => [id, arrange(a)]),
) as Record<MusicId, SongDef>;
