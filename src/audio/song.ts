// Compact song format: one MML-style string per channel.
//
// Channels: p1, p2 (pulse), wave (triangle-ish bass), noise.
// Timing: 192 ticks per whole note (48 per quarter), tempo in BPM (quarter).
//
// Commands (case-sensitive; whitespace and `|` bar lines are ignored, but bar
// lines are recorded so tests can check every bar is full):
//   c d e f g a b   note; accidentals + # (sharp) or - (flat); then an
//                   optional length (1 2 4 8 16 32 64, 3 6 12 24 48) and dots.
//                   e.g. `c+8.`  `b-4`  `g`
//   r[len]          rest
//   ^len            tie: extend the previous note (or rest)
//   k s h x [len]   drums (noise channel): kick, snare, hat, crash
//   o<n> < >        octave set / down / up (o4 c = middle C, MIDI 60)
//   l<len>          default length
//   v<0-15>         volume
//   @<n>            pulse duty 0-3 = 12.5/25/50/75%; noise: 0 white, 1 metallic
//   %<n>            envelope: 0 = sustain, n = fade 1/15 every n/64 s (GB style)
//   q<1-8>          gate: note sounds for q/8 of its length
//   ~<cents>        vibrato depth (0 = off)
//   p<±semitones>   pitch slide over each following note (p0 = off)
//   [ ... ]n        repeat n times (nestable)
//   L               loop point (music loops back here; default 0)

export const TICKS_PER_WHOLE = 192;
export const TICKS_PER_QUARTER = 48;

export type ChannelId = "p1" | "p2" | "wave" | "noise";
export const CHANNELS: ChannelId[] = ["p1", "p2", "wave", "noise"];
export type Drum = "k" | "s" | "h" | "x";

export interface SongDef {
  bpm: number;
  loop: boolean;
  p1?: string;
  p2?: string;
  wave?: string;
  noise?: string;
}

export interface NoteEvent {
  tick: number;
  len: number;          // ticks
  midi: number | null;  // pitched note (null for drums)
  drum: Drum | null;
  vol: number;          // 0..15
  duty: number;         // 0..3
  env: number;          // 0 = sustain
  gate: number;         // 1..8
  vib: number;          // cents
  slide: number;        // semitones over the note
}

export interface ParsedChannel {
  events: NoteEvent[];
  length: number;       // ticks
  loopTick: number | null;
  bars: number[];       // tick at each `|`
}

export interface ParsedSong {
  bpm: number;
  loop: boolean;
  length: number;       // ticks (longest channel)
  loopTick: number;
  channels: Partial<Record<ChannelId, ParsedChannel>>;
}

const NOTE_SEMI: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

/** Expand `[ ... ]n` repeats. */
export function expandRepeats(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "[") {
      let depth = 1;
      let j = i + 1;
      while (j < src.length && depth > 0) {
        if (src[j] === "[") depth++;
        else if (src[j] === "]") depth--;
        j++;
      }
      if (depth !== 0) throw new Error(`unclosed [ at ${i}`);
      const inner = expandRepeats(src.slice(i + 1, j - 1));
      let k = j;
      while (k < src.length && /[0-9]/.test(src[k])) k++;
      const n = k > j ? parseInt(src.slice(j, k), 10) : 2;
      out += inner.repeat(n);
      i = k;
    } else if (ch === "]") {
      throw new Error(`unmatched ] at ${i}`);
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

export function parseChannel(source: string): ParsedChannel {
  const s = expandRepeats(source);
  const events: NoteEvent[] = [];
  const bars: number[] = [];
  let i = 0;
  let tick = 0;
  let octave = 4;
  let defLen = 24;
  let vol = 12, duty = 2, env = 0, gate = 7, vib = 0, slide = 0;
  let loopTick: number | null = null;
  let last: NoteEvent | null = null;

  const err = (msg: string): never => { throw new Error(`${msg} at ${i} in "${s.slice(Math.max(0, i - 10), i + 10)}"`); };
  const int = (signed = false): number | null => {
    let j = i;
    if (signed && (s[j] === "-" || s[j] === "+")) j++;
    while (j < s.length && s[j] >= "0" && s[j] <= "9") j++;
    const txt = s.slice(i, j);
    if (txt === "" || txt === "-" || txt === "+") return null;
    i = j;
    return parseInt(txt, 10);
  };
  const length = (): number => {
    const n = int();
    let base: number;
    if (n === null) base = defLen;
    else {
      if (n <= 0 || TICKS_PER_WHOLE % n !== 0) err(`bad length ${n}`);
      base = TICKS_PER_WHOLE / n;
    }
    let total = base, add = base;
    while (s[i] === ".") {
      add /= 2;
      if (!Number.isInteger(add)) err("dot too fine");
      total += add;
      i++;
    }
    return total;
  };
  const push = (midi: number | null, drum: Drum | null, len: number) => {
    const ev: NoteEvent = { tick, len, midi, drum, vol, duty, env, gate, vib, slide };
    events.push(ev);
    last = ev;
    tick += len;
  };

  while (i < s.length) {
    const c = s[i++];
    if (c === " " || c === "\n" || c === "\t" || c === "\r" || c === ",") continue;
    if (c === "|") { bars.push(tick); continue; }
    if (c in NOTE_SEMI) {
      let semi = NOTE_SEMI[c];
      while (s[i] === "+" || s[i] === "#" || s[i] === "-") { semi += s[i] === "-" ? -1 : 1; i++; }
      const midi = 12 * (octave + 1) + semi;
      if (midi < 0 || midi > 127) err(`note out of range ${midi}`);
      push(midi, null, length());
    } else if (c === "k" || c === "s" || c === "h" || c === "x") {
      push(null, c, length());
    } else if (c === "r") {
      const len = length();
      last = null;
      tick += len;
    } else if (c === "^") {
      const len = length();
      if (last) (last as NoteEvent).len += len;
      tick += len;
    } else if (c === "o") {
      const n = int(); if (n === null || n < 0 || n > 9) err("bad octave"); octave = n!;
    } else if (c === "<") octave--;
    else if (c === ">") octave++;
    else if (c === "l") {
      const n = int(); if (n === null || TICKS_PER_WHOLE % n !== 0) err("bad default length");
      defLen = TICKS_PER_WHOLE / n!;
      let add = defLen;
      while (s[i] === ".") { add /= 2; defLen += add; i++; }
    } else if (c === "v") {
      const n = int(); if (n === null || n < 0 || n > 15) err("bad volume"); vol = n!;
    } else if (c === "@") {
      const n = int(); if (n === null || n < 0 || n > 3) err("bad duty"); duty = n!;
    } else if (c === "%") {
      const n = int(); if (n === null || n < 0 || n > 7) err("bad envelope"); env = n!;
    } else if (c === "q") {
      const n = int(); if (n === null || n < 1 || n > 8) err("bad gate"); gate = n!;
    } else if (c === "~") {
      const n = int(); if (n === null || n < 0 || n > 200) err("bad vibrato"); vib = n!;
    } else if (c === "p") {
      const n = int(true); if (n === null || Math.abs(n) > 48) err("bad slide"); slide = n!;
    } else if (c === "L") {
      if (loopTick !== null) err("duplicate loop point");
      loopTick = tick;
    } else err(`unexpected '${c}'`);
  }
  return { events, length: tick, loopTick, bars };
}

export function parseSong(def: SongDef): ParsedSong {
  const channels: ParsedSong["channels"] = {};
  let length = 0;
  let loopTick: number | null = null;
  for (const id of CHANNELS) {
    const src = def[id];
    if (!src) continue;
    const ch = parseChannel(src);
    channels[id] = ch;
    length = Math.max(length, ch.length);
    if (ch.loopTick !== null) loopTick = loopTick === null ? ch.loopTick : Math.min(loopTick, ch.loopTick);
  }
  return { bpm: def.bpm, loop: def.loop, length, loopTick: loopTick ?? 0, channels };
}

export const secondsPerTick = (bpm: number) => 60 / (bpm * TICKS_PER_QUARTER);
export const songSeconds = (song: ParsedSong) => song.length * secondsPerTick(song.bpm);
export const midiToHz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

// ------------------------------------------------------------------ writing
const NAMES = ["c", "c+", "d", "d+", "e", "f", "f+", "g", "g+", "a", "a+", "b"];

/** MML length text for a tick count, using ties where needed (e.g. 120 -> "2^8"). */
export function lenText(ticks: number): string {
  const parts: string[] = [];
  let rest = ticks;
  const opts: [number, string][] = [];
  for (const n of [1, 2, 4, 8, 16, 32, 64, 3, 6, 12, 24, 48]) {
    const t = TICKS_PER_WHOLE / n;
    opts.push([t, `${n}`]);
    if (Number.isInteger(t * 1.5)) opts.push([t * 1.5, `${n}.`]);
  }
  opts.sort((a, b) => b[0] - a[0]);
  while (rest > 0) {
    const o = opts.find(([t]) => t <= rest);
    if (!o) throw new Error(`cannot express ${ticks} ticks`);
    parts.push(o[1]);
    rest -= o[0];
  }
  return parts.join("^");
}

/** One absolute-octave note, e.g. noteText(61, 24) = "o4c+8". */
export function noteText(midi: number, ticks: number): string {
  const oct = Math.floor(midi / 12) - 1;
  return `o${oct}${NAMES[midi % 12]}${lenText(ticks)}`;
}
export const restText = (ticks: number) => `r${lenText(ticks)}`;
