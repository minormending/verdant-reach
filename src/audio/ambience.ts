// Ambience beds under the music: a soft wind with birdsong on routes by day,
// crickets at night, a deeper wind in the grove and sparse birds in towns.
// Everything is synthesised (filtered noise, sine chirps), scheduled ahead on
// the audio clock like the music, and kept well under it: the bed should be
// felt more than heard (about 20 dB below the music; see mix.ts).
//
// Frequency plan: the music lives mostly between 100 Hz and 2.5 kHz, so the
// wind is band-limited to 150–900 Hz at a low level, and the birds and
// crickets sit above the melody (2.8–6 kHz) where they don't mask it.

import type { MusicId, TimeOfDay } from "../contracts";
import { TIME_OF_DAY } from "../contracts";
import type { Chip } from "./engine";

export type AmbienceKind = "none" | "meadow" | "night" | "forest" | "town";

/** Which bed goes under a track at a time of day. Indoors, battles and cues get none. */
export function ambienceFor(music: MusicId | null, tod: TimeOfDay): AmbienceKind {
  const night = tod === "night";
  switch (music) {
    case "route": return night ? "night" : "meadow";
    case "route_night": return "night";
    case "fallowfield":
    case "small_town":
    case "glasshouse_city": return night ? "night" : "town";
    case "palm_house": return "forest";  // under glass: a still, close hush with the odd bird
    case "sugarbush_grove": return "forest";
    case "prologue_bloom": return "night";
    default: return "none";
  }
}

/** Real-clock time of day (`?time=` overrides it, as in the engine). */
export function clockTimeOfDay(): TimeOfDay {
  try {
    const t = new URLSearchParams(location.search).get("time");
    if (t === "morning" || t === "day" || t === "night") return t;
  } catch { /* no location (tests) */ }
  const h = new Date().getHours();
  if (h >= TIME_OF_DAY.morningStart && h < TIME_OF_DAY.dayStart) return "morning";
  if (h >= TIME_OF_DAY.dayStart && h < TIME_OF_DAY.nightStart) return "day";
  return "night";
}

interface BedSpec {
  wind: { level: number; freq: number; q: number; lowpass: number } | null;
  birds: { level: number; every: [number, number]; pitch: [number, number] } | null;
  crickets: { level: number; freq: number } | null;
}

// Linear gains into the ambience bus. Measured offline (e2e/audiomix.ts): each
// bed's loudest 400 ms sits 20–27 dB under the music it plays with and adds
// nothing measurable to its RMS. Birds and crickets are tonal and sit in the
// 3–5 kHz band, about 15 dB under the music's own content there: soft, but
// above the masking threshold for a pure tone.
const BEDS: Record<Exclude<AmbienceKind, "none">, BedSpec> = {
  meadow: {
    wind: { level: 0.079, freq: 520, q: 0.6, lowpass: 900 },
    birds: { level: 0.04, every: [2.5, 7], pitch: [2900, 4600] },
    crickets: null,
  },
  town: {
    wind: { level: 0.044, freq: 600, q: 0.7, lowpass: 900 },
    birds: { level: 0.036, every: [4, 10], pitch: [3100, 5000] },
    crickets: null,
  },
  forest: {
    wind: { level: 0.075, freq: 330, q: 0.8, lowpass: 650 },
    birds: { level: 0.014, every: [5, 12], pitch: [2300, 3400] },
    crickets: null,
  },
  night: {
    wind: { level: 0.048, freq: 420, q: 0.7, lowpass: 700 },
    birds: null,
    crickets: { level: 0.028, freq: 4700 },
  },
};

/** Small seeded RNG so a bed is varied but reproducible in tests. */
function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a ^= a << 13; a >>>= 0;
    a ^= a >>> 17;
    a ^= a << 5; a >>>= 0;
    return a / 4294967296;
  };
}

export class AmbienceBed {
  private ctx: BaseAudioContext;
  private out: GainNode;
  private random: () => number;
  private kind: AmbienceKind = "none";
  private nodes: AudioScheduledSourceNode[] = [];
  private windGain: GainNode | null = null;
  private nextWind = 0;
  private nextBird = 0;
  private nextCricket = 0;
  private cricketPhase = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private noise: AudioBuffer | null = null;

  constructor(chip: Chip, dest: AudioNode, seed = 1) {
    this.ctx = chip.ctx;
    this.out = this.ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(dest);
    this.random = rng(seed);
  }

  get current(): AmbienceKind { return this.kind; }

  /** Cross-fade to a bed (`none` fades out). */
  start(kind: AmbienceKind, fade = 1.2) {
    if (kind === this.kind) return;
    const now = this.ctx.currentTime;
    this.stopSources(now + (kind === "none" ? fade : Math.min(fade, 0.6)));
    this.kind = kind;
    const g = this.out.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    if (kind === "none") {
      g.linearRampToValueAtTime(0, now + fade);
      this.stopTimer();
      return;
    }
    // Fade the old bed out, then the new one in.
    g.linearRampToValueAtTime(0, now + Math.min(fade, 0.6));
    g.linearRampToValueAtTime(1, now + Math.min(fade, 0.6) + Math.max(0.01, fade * 1.5));
    const t0 = now + Math.min(fade, 0.6);
    this.nextWind = t0;
    this.nextBird = t0 + 1 + this.random() * 2;
    this.nextCricket = t0 + 0.3;
    this.startWind(t0);
    this.pump(1.5);
    this.startTimer();
  }

  stop(fade = 0.5) { this.start("none", fade); }

  /** Schedule events up to `ahead` seconds past the audio clock. */
  pump(ahead: number) {
    if (this.kind === "none") return;
    const spec = BEDS[this.kind];
    const horizon = this.ctx.currentTime + ahead;
    if (spec.wind && this.windGain) {
      // Gusts: a new target level every 1.5–4 s.
      while (this.nextWind < horizon) {
        const lvl = spec.wind.level * (0.45 + 0.55 * this.random());
        this.windGain.gain.setTargetAtTime(lvl, this.nextWind, 0.9);
        this.nextWind += 1.5 + this.random() * 2.5;
      }
    }
    if (spec.birds) {
      while (this.nextBird < horizon) {
        this.birdPhrase(this.nextBird, spec.birds);
        const [lo, hi] = spec.birds.every;
        this.nextBird += lo + this.random() * (hi - lo);
      }
    }
    if (spec.crickets) {
      while (this.nextCricket < horizon) {
        this.cricketChirp(this.nextCricket, spec.crickets);
        // Two crickets answering each other, ~0.45 s apart, with longer pauses now and then.
        this.cricketPhase++;
        this.nextCricket += this.cricketPhase % 9 === 0 ? 1.4 + this.random() : 0.42 + this.random() * 0.12;
      }
    }
  }

  dispose() {
    this.stopTimer();
    this.stopSources(this.ctx.currentTime);
    this.out.disconnect();
  }

  // ---------------------------------------------------------------- sources

  private startTimer() {
    if (this.timer !== null || typeof setInterval === "undefined") return;
    this.timer = setInterval(() => {
      const hidden = typeof document !== "undefined" && document.hidden;
      this.pump(hidden ? 2.5 : 1.0);
    }, 250);
  }

  private stopTimer() {
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
  }

  private stopSources(at: number) {
    for (const n of this.nodes) { try { n.stop(at); } catch { /* already stopped */ } }
    this.nodes = [];
    this.windGain = null;
  }

  private noiseBuffer(): AudioBuffer {
    if (this.noise) return this.noise;
    const len = Math.floor(this.ctx.sampleRate * 2.5);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    const r = rng(7);
    // Pinkish noise (Paul Kellet's cheap filter): wind has less hiss than white noise.
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = r() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    }
    // Cross-fade the loop seam.
    const fade = Math.floor(this.ctx.sampleRate * 0.05);
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      d[len - fade + i] = d[len - fade + i] * (1 - k) + d[i] * k;
    }
    this.noise = buf;
    return buf;
  }

  private startWind(t: number) {
    const spec = BEDS[this.kind as Exclude<AmbienceKind, "none">].wind;
    if (!spec) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    src.loop = true;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = spec.freq;
    bp.Q.value = spec.q;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = spec.lowpass;
    // A slow LFO on the band centre makes the wind "breathe".
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07 + this.random() * 0.05;
    const depth = this.ctx.createGain();
    depth.gain.value = spec.freq * 0.35;
    lfo.connect(depth).connect(bp.frequency);
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(spec.level * 0.7, t, 0.8);
    src.connect(bp).connect(lp).connect(g).connect(this.out);
    src.start(t, this.random() * 2);
    lfo.start(t);
    this.nodes.push(src, lfo);
    this.windGain = g;
  }

  /** 2–5 quick sine chirps with fast pitch sweeps: a small songbird, far off. */
  private birdPhrase(t: number, spec: NonNullable<BedSpec["birds"]>) {
    const n = 2 + Math.floor(this.random() * 4);
    const base = spec.pitch[0] + this.random() * (spec.pitch[1] - spec.pitch[0]);
    const shape = this.random();
    let at = t;
    for (let i = 0; i < n; i++) {
      const dur = 0.045 + this.random() * 0.06;
      const f0 = base * (1 + (shape < 0.5 ? 0.12 : -0.08) * (i % 2 ? 1 : -1) + (this.random() - 0.5) * 0.06);
      const f1 = f0 * (shape < 0.33 ? 1.35 : shape < 0.66 ? 0.78 : 1.12);
      const o = this.ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(f0, at);
      o.frequency.exponentialRampToValueAtTime(f1, at + dur);
      const g = this.ctx.createGain();
      const lvl = spec.level * (0.6 + 0.4 * this.random()) * (i === n - 1 ? 0.8 : 1);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(lvl, at + 0.008);
      g.gain.exponentialRampToValueAtTime(lvl * 0.02, at + dur);
      g.gain.setValueAtTime(0, at + dur + 0.005);
      o.connect(g).connect(this.out);
      o.start(at);
      o.stop(at + dur + 0.02);
      o.onended = () => g.disconnect();
      at += dur + 0.025 + this.random() * 0.05;
    }
  }

  /** A field-cricket chirp: 3–4 pulses of a ~4.7 kHz tone at ~30 pulses/s. */
  private cricketChirp(t: number, spec: NonNullable<BedSpec["crickets"]>) {
    const second = this.cricketPhase % 2 === 1;
    const f = spec.freq * (second ? 0.94 : 1);
    const lvl = spec.level * (second ? 0.6 : 1);
    const pulses = 3 + (this.random() < 0.4 ? 1 : 0);
    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    for (let i = 0; i < pulses; i++) {
      const p = t + i * 0.034;
      g.gain.setValueAtTime(0, p);
      g.gain.linearRampToValueAtTime(lvl, p + 0.006);
      g.gain.linearRampToValueAtTime(0, p + 0.022);
    }
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + pulses * 0.034 + 0.03);
    o.onended = () => g.disconnect();
  }
}
