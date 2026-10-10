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

// Hand-written part voices (Chapter 5).
const PAD = "v4 @1 q8 %0";     // a soft held 25% pad note
const BELL = "v7 @2 q8 %5";    // a square ping that decays like a small bell
const DRIP = "v8 @2 q3 %1 p7"; // a short high plink that bends up: a water drop
const ECHO = "v4 @2 q3 %2 p7"; // the same drop, fainter, off the cave wall
const LUB = "v4";              // heartbeat (kick): the first, stronger beat...
const DUB = "v2";              // ...and the softer second one

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

  // ------------------------------------------------------------------ glasshouse city
  // Grand and airy: a Victorian promenade in E-flat. A stately walking bass
  // under glassy arpeggios, a lead that climbs like ironwork arches, and a
  // chromatic C7 turn in the second half (the city showing off).
  glasshouse_city: {
    bpm: 104, harmony: "arp8", harmonyTone: "v5 @1 q5", bass: "walk", bassTone: "v14 q6", drums: "soft", drumTone: "v5",
    chords: "Eb | Bb | Cm | Ab | Eb | Fm Bb | Eb | Bb7 | Ab | Bb | Gm | Cm | Fm | Bb7 | Eb | Eb | C7 | Fm | Bb | Gm | Ab | Bb7 | Eb | Eb",
    melody: `${SOFT}
      o5e-4. f8 g4 b-4 | a-4. g8 f2 | g4 o6c4 o5b-8a-8 g4 | f2. e-4 |
      e-4. f8 g4 b-4 | o6c4 o5a-4 b-4 o6d4 | e-2. o5b-4 | a-4 g4 f4 d4 |
      c4. e-8 a-4 o6c4 | d4. c8 o5b-2 | b-4 o6d4 g4 f8e-8 | e-2. o5g4 |
      a-4. g8 f4 c4 | d4 f4 a-4 o6d4 | e-2. o5b-4 | g4 b-4 o6e-4 r4 |
      e4. d8 c4 o5b-4 | a-2 f4 c4 | d4 f4 b-4 o6d4 | d4. c8 o5b-4 g4 |
      a-4 o6c4 e-4 c4 | o5b-4. a-8 f4 d4 | e-2. f8g8 | e-2 r2 |`,
  },

  // ------------------------------------------------------------------ palm house
  // Humid, lush, gently exotic: D dorian with a reedy, breathy 12.5% lead
  // (a wooden flute), sixteenth-note arpeggios like dripping leaves, a lazy
  // shuffle and a maj7 haze. 16 bars that loop seamlessly into A7 -> Dm7.
  palm_house: {
    bpm: 92, harmony: "arp16", harmonyTone: "v4 @1 q4 ~6", bass: "half", bassTone: "v13 q7", drums: "shuffle", drumTone: "v4", fillEvery: 0,
    chords: "Dm7 | G | Dm7 | G | Fmaj7 | Em7 | Dm7 | Am7 | Bbmaj7 | C | Am7 | Dm7 | Gm7 | C | Bbmaj7 | A7",
    melody: `v10 @0 q7 ~14
      o5a4. f8 e8d8 r4 | b4 a8g8 b4. o6d8 | c4. o5a8 f8e8 d4 | e4 d8 o4b8 o5d2 |
      e4. f8 a4 o6c4 | o5b4. a8 g4 e4 | f4 e8d8 c4 d4 | e2. r4 |
      d4. f8 a4 o6d4 | c4. o5b-8 g4 e4 | a4 g8e8 c4 e4 | d2. r4 |
      b-4. a8 g4 d4 | e4 g4 o6c4 o5b-4 | a2 f4 d4 | c+4 e4 g4 e4 |`,
  },

  // ------------------------------------------------------------------ root relay
  // A hum, pulses and curiosity, slightly uncanny: a steady eighth-note
  // throb in the bass (the network's heartbeat), held pad chords with
  // no root, a ticking console, and a questioning lead full of rests.
  // C minor that keeps slipping sideways (Abmaj7, Dbmaj7, sus chords).
  root_relay: {
    bpm: 90, harmony: "pad", harmonyTone: "v4 @0 q8 ~8", bass: "pulse", bassTone: "v13 q4", drums: "tick", drumTone: "v3", fillEvery: 0,
    chords: "Cm | Abmaj7 | Cm | Gsus4 | Cm | Abmaj7 | Dbmaj7 | G | Fm | Abmaj7 | Cm | Bbsus2 | Abmaj7 | Dbmaj7 | Gsus4 | G",
    melody: `v9 @1 q6 ~10
      r4 o5g4 a-8g8 r4 | r8 c8 e-8 g8 o6c2 | o5b4 g4 r2 | d4. c8 d2 |
      r4 g4 a-8g8 r4 | r8 c8 e-8 g8 o6e-2 | d-4 c4 o5a-4 f4 | g2. r4 |
      a-4. g8 f4 c4 | e-4 g4 o6c4 d4 | e-2. r4 | c4 o5b-4 f4 c4 |
      e-4. f8 g4 o6c4 | f2 e-4 c4 | o5d2 c2 | o4b2. r4 |`,
  },

  // ------------------------------------------------------------------ relay seized
  // The Root Relay under Rootstock: the network's own pulse (the root_relay
  // bass throb and rootless pad), but the questioning lead has been silenced.
  // Every other bar is the broadcast's command, one note struck twice ("be
  // still"), and between them the old curious figure (g, a-flat, g) now
  // droops and stops. The command climbs C, E-flat, D-flat as the tension
  // grows, and it ends on G with B natural, never resting.
  relay_seized: {
    bpm: 90, harmony: "pad", harmonyTone: "v4 @0 q8 ~6", bass: "pulse", bassTone: "v14 q4", drums: "tense", drumTone: "v5", fillEvery: 0,
    chords: "Cm | Cm | Abmaj7 | Abmaj7 | Fm | Fm | Gsus4 | G | Cm | Cm | Dbmaj7 | Dbmaj7 | Fm | Abmaj7 | Gsus4 | G",
    melody: `v10 @1 q5 ~4
      o6c4 r4 o6c4 r4 | o5g4 a-8g8 e-2 | o6c4 r4 o6c4 r4 | o5a-4 g8f8 e-2 |
      o6c4 r4 o6c4 r4 | o5a-4 g8f8 c2 | o5c4 d4 g4 r4 | o5b2. r4 |
      o6e-4 r4 o6e-4 r4 | o6d4 c8 o5b8 g2 | o6d-4 r4 o6d-4 r4 | o6c4 o5a-8f8 c2 |
      o5f4 a-4 o6c4 f4 | o6e-2 c2 | o6d2. r4 | o5b4 o6d4 o5g4 d4 |`,
  },

  // ------------------------------------------------------------------ thistledown
  // A desert-edge town in tumbleweed country: dusty and warm, a little lonely.
  // E dorian (the raised C-sharp, over an A major chord, keeps it from going
  // sad), a soft lead that lingers on long notes, a picked "broken" guitar
  // figure, a slow half-time bass and woodblock ticks. Ends on B7 to roll
  // back into E minor.
  thistledown: {
    bpm: 92, harmony: "broken", harmonyTone: "v6 @1 q4", bass: "half", bassTone: "v12 q6", drums: "tick", drumTone: "v4", fillEvery: 0,
    chords: "Em | Em | D | Em | C | G | A | Em | C | G | D | Bm | C | A | Em | B7",
    melody: `${SOFT}
      o5e2 g4 b4 | o5a4. g8 e2 | o5f+4 a4 d2 | o5e2. r4 |
      o5e4 g4 o6c4 o5b4 | o5a4 g4 d2 | o5c+4 e4 a4 g4 | o5e2. r4 |
      o5g4. a8 b4 o6c4 | o6d2 o5b4 g4 | o5a4 f+4 d4 e8 f+8 | o5f+2 d4 o4b4 |
      o5c4 e4 g4 a4 | o5c+2 e4 a4 | o5g4 f+8 e8 b4 e4 | o5d+2 f+4 b4 |`,
  },

  // ------------------------------------------------------------------ canyon
  // Route 11, the red canyon climbing to Sanguine Ridge: an adventurous D
  // minor gallop. The lead keeps leaping up an octave and scrambling back,
  // a climber finding holds; the bass gallops, the drums drive, and the last
  // two bars hang on A major (the dominant) before the climb starts again.
  canyon: {
    bpm: 120, harmony: "arp8", harmonyTone: "v5 @1 q5", bass: "gallop", bassTone: "v13 q5", drums: "drive", drumTone: "v7",
    chords: "Dm | Dm | C | Dm | Bb | C | Dm | A | Dm | F | C | Gm | Bb | C | A | A",
    melody: `${LEAD}
      o5d4 o6d4 c8 o5a8 f4 | o5f4. e8 d2 | o5c4 o6c4 o5g4 e4 | o5a2. r4 |
      o5b-4 o6b-4 f4 d4 | o6e4 c4 o5g2 | o5a4 o6a4 f4 d4 | o5e2. r4 |
      o5d8 e8 f8 g8 a4 o6a4 | o6c4 o5a4 f4 a4 | o5g4 o6g4 e4 c4 | o5d4 g4 b-4 o6d4 |
      o6d4. c8 o5b-4 a4 | o5g4 o6c4 e4 g4 | o6e2 c+4 o5a4 | o5e2 c+4 e4 |`,
  },

  // ------------------------------------------------------------------ ridge
  // Sanguine Ridge, the ancient dragon trees and the final test: slow, noble
  // and old. A minor with the major E (the harmonic minor's G-sharp) for
  // gravity; long half and whole notes that rise to a high D and sink back,
  // over a held pad and a slow bass, with no drums. Ends on E, the dominant.
  ridge: {
    bpm: 76, harmony: "pad", harmonyTone: "v5 @1 q8 ~6", bass: "half", bassTone: "v12 q8", drums: "none",
    chords: "Am | F | G | Am | Am | Dm | E | E | F | G | Am | C | Dm | E | Am | E",
    melody: `v10 @1 q8 ~12
      o5a2 e2 | o5f2. e8 f8 | o5g2 d2 | o5e1 |
      o5a4 b4 o6c2 | o6d2. c4 | o5b2 g+2 | o5e1 |
      o5f4 a4 o6c2 | o6d2 o5b2 | o6c4 o5b4 a2 | o5g2 e4 g4 |
      o5f2 a4 o6d4 | o6e2. d4 | o6c2 o5b4 a4 | o5g+2. r4 |`,
  },

  // ------------------------------------------------------------------ elder grove
  // The Elder Grove, a forest that is one creature: slow, reverent and
  // watchful. D minor with a lydian E over B-flat (the trunks leaning in), a
  // soft lead in long wide steps, a held low drone, and a whispering
  // sixteenth tremble in the harmony: the quaking aspen leaves. No drums.
  // Ends on A major, so the Grove never quite rests.
  elder_grove: {
    bpm: 70, harmony: "arp16", harmonyTone: "v3 @0 q3", bass: "drone", bassTone: "v11 q8", drums: "none",
    chords: "Dm | Bb | F | C | Dm | Bb | Gm | A | Dm | F | Bb | C | Gm | Bb | Asus4 | A",
    melody: `v9 @1 q8 ~10
      o5a2 d4 f4 | o5f2. e4 | o5c2 a4 g4 | o5g1 |
      o5a2 o6d2 | o6d4 c4 o5b-4 a4 | o5g2. f4 | o5e1 |
      o5f4 a4 o6d4 e4 | o6f2 e4 c4 | o6d2 o5b-2 | o6c1 |
      o5b-4 a4 g4 f4 | o5d2 f4 g4 | o5a2. d4 | o5c+1 |`,
  },

  // ------------------------------------------------------------------ battle mercer
  // Mercer Thorne at the heart: the hardest fight in the game. A driving C
  // minor with the Root Relay's three-note motif (g, a-flat, g) turned into a
  // hammering opening figure, so his battle sounds like the network he
  // seized. Sixteenth arpeggios, an octave bass and the heavy groove; the
  // last two bars sit on G, the dominant, and the fight goes round again.
  battle_mercer: {
    bpm: 150, harmony: "arp16", harmonyTone: "v5 @1 q4", bass: "octave8", bassTone: "v14 q4", drums: "heavy", drumTone: "v9",
    chords: "Cm | Cm | Ab | Bb | Cm | Cm | Fm | G | Cm | Eb | Ab | G | Fm | Ab | Db | G | Cm | Cm | Ab | Bb | Fm | Db | G | G",
    melody: `${LEAD}
      o5g8 a-8 g8 r8 c4 e-4 | o5g4. f8 e-4 d4 | o5e-8 f8 e-8 r8 a-4 c4 | o5d4. e-8 f4 b-4 |
      o6c8 d8 c8 r8 o5g4 e-4 | o5f4. e-8 d4 c4 | o5a-4 g4 f4 e-4 | o5d2 o4b2 |
      o5c4 e-4 g4 o6c4 | o6b-4. a-8 g4 e-4 | o6c4 o5a-4 e-4 c4 | o5d4 g4 b4 o6d4 |
      o6c4. o5a-8 f4 c4 | o5e-4 a-4 o6c4 e-4 | o6d-4. c8 o5b-4 a-4 | o5g2 o6d2 |
      o6e-8 d8 c8 o5b8 g4 o6c4 | o6e-4 d4 c4 g4 | o6a-4. g8 f4 e-4 | o6d4 f4 b-4 a-4 |
      o6g4. f8 e-4 c4 | o6d-4 f4 a-4 g4 | o6f4 e-4 d4 o5b4 | o5g2 b4 o6d4 |`,
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

  // ------------------------------------------------------------------ cedarhallow
  // Hushed and reverent: a slow D dorian hymn among giant cedars. A soft lead
  // that keeps reaching up a fourth (into the canopy) and leaning on the
  // dorian B natural, a held one-note pad, a quiet drone, no drums. Where the
  // tune breathes, the pad gives way to a few small bells. The last bar (G,
  // the dorian IV) settles back into D minor at the loop.
  cedarhallow: {
    bpm: 72, harmony: "pad", bass: "drone", bassTone: "v11 q8", drums: "none",
    chords: "Dm | C | G | Dm | Dm | F | C | Am | G | Em | F | C | Dm | C | G | Am | F | C | Am | G",
    melody: `v9 @1 q8 ~10
      r4 o4a4 o5d4 e4 | g2 e4 c4 | d4. e8 d4 o4b4 | a2. r4 |
      r4 a4 o5d4 f4 | a2 g4 f4 | e4. d8 c4 d4 | e2 r2 |
      d4 g4 b2 | a4. g8 e2 | f4 a4 o6c2 | c4. o5b8 g2 |
      a2 o6d2 | c4 o5g4 e4 g4 | d4. e8 d4 o4b4 | a2. r4 |
      o5c4 f4 a4 g4 | e2 g4 e4 | c2 o4b4 a4 | b2. r4 |`,
    harmonyLine: `
      ${PAD} o4f1 | e1 | d1 | f2 ${BELL} o6d8 o5a8 o6e4 |
      ${PAD} o4f1 | a1 | g1 | e2 ${BELL} o5a8 o6c8 e4 |
      ${PAD} o4b1 | g1 | a1 | g1 |
      f1 | g1 | g1 | e2 ${BELL} o6e8 c8 o5a4 |
      ${PAD} o4a1 | g1 | e1 | d2 ${BELL} o5b8 o6d8 g4 |`,
  },

  // ------------------------------------------------------------------ burnt stand
  // Ashen and eerie: E phrygian (the F major 7 a half step above keeps
  // pulling at the tonic). A thin reed lead whose phrases keep stopping short
  // (some sag a semitone as they die), a faint 12.5% pad, a slow two-beat
  // heartbeat low in the mix with the odd ember crackle. It quickens in the
  // last two bars and never cadences: Bsus4 hangs and the loop starts over.
  burnt_stand: {
    bpm: 72, harmony: "pad", harmonyTone: "v4 @0 q8 ~4", bass: "drone", bassTone: "v10 q8", drums: "none",
    chords: "Em | Fmaj7 | Em | Fmaj7 | Am | Cmaj7 | Bsus4 | Bsus4 | Em | Fmaj7 | Dm | Am | Cmaj7 | Fmaj7 | Dsus2 | Bsus4",
    melody: `v9 @0 q7 ~8
      o4b4 o5e4 g4 r4 | f4. e8 r2 | o4b4 o5e4 g4 a4 | c4 o4b8 r8 r2 |
      o5e4. f8 e4 c4 | p-1 o4b2 p0 r2 | b4 o5e4 f+4 r4 | r1 |
      g4. f8 e4 r4 | a4. g8 f4 r4 | d4 f4 a4 o6c4 | o5b4 r4 r2 |
      e2 g4 b4 | o6c4 o5a4 r2 | a4 e4 r2 | p-1 f+2 p0 r2 |`,
    drumLine: `
      [${LUB} k16 r8 ${DUB} k16 r4 ${LUB} k16 r8 ${DUB} k16 r4 |]2
      ${LUB} k16 r8 ${DUB} k16 r4 ${LUB} k16 r8 ${DUB} k16 r16 v2 h16 r8 |
      ${LUB} k16 r8 ${DUB} k16 r4 ${LUB} k16 r8 ${DUB} k16 r4 |
      [${LUB} k16 r8 ${DUB} k16 r4 ${LUB} k16 r8 ${DUB} k16 r4 |]2
      ${LUB} k16 r8 ${DUB} k16 r8 v2 h16 r16 ${LUB} k16 r8 ${DUB} k16 r4 |
      ${LUB} k16 r8 ${DUB} k16 r4 ${LUB} k16 r8 ${DUB} k16 r4 |
      [${LUB} k16 r8 ${DUB} k16 r4 ${LUB} k16 r8 ${DUB} k16 r4 |]2
      ${LUB} k16 r8 ${DUB} k16 r4 ${LUB} k16 r8 ${DUB} k16 r16 v2 h16 r8 |
      ${LUB} k16 r8 ${DUB} k16 r4 ${LUB} k16 r8 ${DUB} k16 r4 |
      ${LUB} k16 r8 ${DUB} k16 r8 v2 h16 r16 ${LUB} k16 r8 ${DUB} k16 r4 |
      ${LUB} k16 r8 ${DUB} k16 r4 ${LUB} k16 r8 ${DUB} k16 r4 |
      [${LUB} k16 r16 ${DUB} k16 r16]4 |
      [${LUB} k16 r16 ${DUB} k16 r16]4 |`,
  },

  // ------------------------------------------------------------------ the hollow
  // Inside the oldest cedar: dark and still. A low A drone (tied, so it never
  // re-strikes) that sinks to B-flat and F, one slow inner voice of sighing
  // half steps, and water dripping from somewhere above: sparse high plinks
  // on an irregular pattern, a few with a fainter echo off the walls. No
  // drums, no tune to hum: the room is the music.
  hollow: {
    bpm: 66, harmony: "none", bass: "drone", drums: "none",
    chords: "Am | Am | Am | Am | Bb | Bb | Am | Am | F | F | Dm | E | Am | Am | Bb | E",
    melody: `v8 @2 q8 ~5
      o4e1 | f2 e2 | d1 | c2 o3b2 |
      o4d1 | f2 e2 | c1 | o3b2 g+2 |
      a2 o4c2 | a2 g2 | f1 | o3g+1 |
      o4c1 | d2 e2 | f2 d2 | o3b2 g+2 |`,
    harmonyLine: `
      r4. ${DRIP} o6a16 r2 r16 | r8. ${DRIP} o6e16 r8 ${ECHO} o6e16 r2 r16 | r2 r16 ${DRIP} o6g16 r4. | r8 ${DRIP} o7c16 r2. r16 |
      r2. r16 ${DRIP} o6d16 r8 | ${ECHO} o6d16 r2. r16 ${DRIP} o6a16 r16 | r4 ${DRIP} o6e16 r2 r8. | r1 |
      r8. ${DRIP} o6c16 r2. | r4. ${DRIP} o6g16 r8 ${ECHO} o6g16 r4. | r8 ${DRIP} o6a16 r2. r16 | r2 r8 ${DRIP} o6e16 r4 r16 |
      r2 r16 ${DRIP} o7d16 r4. | r16 ${DRIP} o6g16 r8 ${ECHO} o6g16 r2 r8. | r2. r16 ${DRIP} o6c16 r8 | r1 |`,
    bassLine: `v12 q8
      o2a1 | ^1 | ^1 | ^1 | b-1 | ^1 | a1 | ^1 |
      f1 | ^1 | o3d1 | e1 | o2a1 | ^1 | b-1 | o3e1 |`,
  },

  // ------------------------------------------------------------------ alpine
  // Route 9 and Larchmere: a bright G major Ländler (a country waltz) in thin
  // mountain air. The first half walks up the chord; the second half yodels,
  // leaping a sixth and falling back (g to e, d to b, a to f-sharp). A soft
  // waltz accompaniment, no drums. The last bar (D) leans back into G.
  alpine: {
    bpm: 138, meter: 3, harmony: "waltz", harmonyTone: "v5 @1 q5", bass: "waltz", bassTone: "v13 q6", drums: "none",
    chords: "G | G | C | G | D | D | G | G | G | G | C | Am | G | D | G | G | C | C | G | G | D | D | G | G | Em | C | G | Em | Am | D | G | D",
    melody: `${SOFT}
      o5d4 g4 b4 | o6d2 o5b4 | o6c4 o5g4 e4 | o5d2. |
      o5f+4 a4 o6d4 | o6c4 o5a4 f+4 | o5g4 b4 o6d4 | o5g2. |
      o5d4 g8 a8 b4 | o6d4 o5b4 g4 | o5e4 g4 o6c4 | o5e2 c4 |
      o5d4 g4 b4 | o5a4 f+4 d4 | o5g8 a8 b4 a4 | o5g2. |
      o5g4 o6e4 o5g4 | o6e2 c4 | o5d4 b4 d4 | o5b2 g4 |
      o5a4 o6f+4 o5a4 | o6f+4 e8 d8 o5a4 | o5b4 o6d4 o5b4 | o5g2. |
      o5e4 g4 b4 | o6c2 o5g4 | o5b4 a4 g4 | o5e2 g4 |
      o5a4 o6c4 e4 | o6d4 c4 o5a4 | o5b4 g4 b4 | o5a2 f+4 |`,
  },

  // ------------------------------------------------------------------ red lake
  // Bloom Lake while it's forced awake ("the lake is screaming"). F minor that
  // keeps sliding onto the flat side (D-flat, G-flat: a tritone from the
  // tonic's C). A thin reed lead holds long wails that sag a semitone as they
  // die, over a nervous sixteenth shimmer, a pulsing low F and tense drums.
  // It never rests on F minor: the last bar is C, pulling back to the start.
  red_lake: {
    bpm: 96, harmony: "arp16", harmonyTone: "v4 @0 q4", bass: "pulse", bassTone: "v11 q5", drums: "tense", drumTone: "v6", fillEvery: 0,
    chords: "Fm | Fm | Db | Db | Bbm | Gb | C | C | Fm | Ab | Db | Gb | Bbm | C | Db | C",
    melody: `v10 @0 q7 ~10
      o5c2. f4 | o5a-2 g4 f4 | o5f2. a-4 | p-1 o6d-1 p0 |
      o5b-4 o6d-4 f4 d-4 | o6c2 o5b-4 a-4 | o5g2 p-1 e2 p0 | p-1 o5b-1 p0 |
      o5c4 f4 a-4 o6c4 | o6e-2. c4 | o6d-4 c4 o5b-4 a-4 | o5g-2 p-1 b-2 p0 |
      o5f4 b-4 o6d-4 f4 | o6e2 p-1 g2 p0 | o6f2 e-4 d-4 | o6c2 o5e2 |`,
  },

  // ------------------------------------------------------------------ hideout
  // The Rootstock hideout under the lodge: cold, mechanical and busy. A
  // staccato C minor motif that climbs in clipped steps and keeps tripping
  // over chromatic neighbours (f-sharp, b natural), stabbed chords, a driving
  // octave bass and the industrial groove. The G at the end of each phrase is
  // the alarm the base keeps half-raising.
  hideout: {
    bpm: 108, harmony: "stab", harmonyTone: "v5 @2 q3", bass: "octave8", bassTone: "v14 q4", drums: "industrial", drumTone: "v8",
    chords: "Cm | Cm | Ab | G | Cm | Cm | Db | G | Fm | Fm | Ab | G | Cm | Eb | Db | G",
    melody: `v11 @2 q5
      o5c8 r8 c8 e-8 g4 f+8 g8 | o5e-4 d8 c8 o4b4 r4 | o5c8 r8 c8 e-8 a-4 g8 a-8 | o5b2 g4 r4 |
      o6c8 r8 c8 o5b8 a-8 g8 f8 e-8 | o5d4 e-8 d8 c4 r4 | o5d-8 f8 a-8 o6d-8 c4 o5a-4 | o5g2 r8 g8 a-8 b8 |
      o6c4. o5a-8 f4 r4 | o5a-8 g8 f8 e-8 d4 r4 | o5e-4. c8 a-4 g4 | o5b2 d4 g4 |
      o6c8 r8 o5g8 r8 e-8 r8 c8 r8 | o5e-4 g4 b-4 o6d4 | o6d-4 c4 o5a-4 f4 | o5g4 b4 o6d4 o5b4 |`,
  },
};

export const MUSIC_DEFS: Record<MusicId, SongDef> = Object.fromEntries(
  Object.entries(ARRANGEMENTS).map(([id, a]) => [id, arrange(a)]),
) as Record<MusicId, SongDef>;
