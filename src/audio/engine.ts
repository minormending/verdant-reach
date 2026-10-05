// WebAudio chiptune engine: 2 pulse channels (4 duties, band-limited
// PeriodicWaves), a triangle wave channel and an LFSR noise channel.
// Notes are scheduled slightly ahead on the audio clock by a light timer, so
// timing doesn't depend on frame rate and there are no glitches.

import {
  midiToHz, secondsPerTick, type ChannelId, type NoteEvent, type ParsedChannel, type ParsedSong,
} from "./song";

const LOOKAHEAD = 0.18;       // seconds scheduled ahead of the audio clock
const HIDDEN_LOOKAHEAD = 1.5; // when the tab is hidden (timers throttle to 1 Hz)
const TIMER_MS = 25;
const ATTACK = 0.004;
const RELEASE = 0.012;
const MIX: Record<ChannelId, number> = { p1: 0.14, p2: 0.14, wave: 0.32, noise: 0.11 };

export class Chip {
  readonly ctx: AudioContext;
  readonly master: GainNode;
  readonly musicBus: GainNode;
  readonly sfxBus: GainNode;
  readonly duckGain: GainNode;
  private pulse: PeriodicWave[] = [];
  private noise: AudioBuffer[] = [];
  private players = new Set<Player>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 4;
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(comp).connect(ctx.destination);
    this.duckGain = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicBus.connect(this.duckGain).connect(this.master);
    // SFX notes are short, so they get a boost to sit level with the music.
    const sfxBoost = ctx.createGain();
    sfxBoost.gain.value = 2.4;
    this.sfxBus.connect(sfxBoost).connect(this.master);
    for (const d of [0.125, 0.25, 0.5, 0.75]) this.pulse.push(pulseWave(ctx, d));
    this.noise = [lfsrNoise(ctx, false), lfsrNoise(ctx, true)];
  }

  play(song: ParsedSong, bus: GainNode, onEnd?: () => void, startTick = 0): Player {
    const p = new Player(this, song, bus, onEnd, startTick);
    this.players.add(p);
    this.ensureTimer();
    p.pump(this.lookahead());
    return p;
  }

  forget(p: Player) {
    this.players.delete(p);
    if (this.players.size === 0 && this.timer !== null) { clearInterval(this.timer); this.timer = null; }
  }

  private lookahead() {
    return typeof document !== "undefined" && document.hidden ? HIDDEN_LOOKAHEAD : LOOKAHEAD;
  }

  private ensureTimer() {
    if (this.timer !== null) return;
    this.timer = setInterval(() => {
      const la = this.lookahead();
      for (const p of [...this.players]) p.pump(la);
    }, TIMER_MS);
  }

  /** Schedule one note. Returns the source node(s) so a player can cut them. */
  voice(ch: ChannelId, ev: NoteEvent, t: number, spt: number, out: AudioNode): AudioScheduledSourceNode[] {
    const ctx = this.ctx;
    const dur = Math.max(0.012, ev.len * spt * (ev.gate / 8));
    const peak = (ev.vol / 15) * MIX[ch];
    if (peak <= 0) return [];
    const g = ctx.createGain();
    envelope(g.gain, t, dur, peak, ev);
    g.connect(out);
    const end = t + dur + RELEASE + 0.01;
    const sources: AudioScheduledSourceNode[] = [];

    if (ch === "noise") {
      if (ev.drum === "k") {
        // Kick: a fast pitch-dropping triangle thump plus a tick of noise.
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.setValueAtTime(180, t);
        o.frequency.exponentialRampToValueAtTime(42, t + 0.09);
        const kg = ctx.createGain();
        kg.gain.setValueAtTime(0, t);
        kg.gain.linearRampToValueAtTime((ev.vol / 15) * 0.55, t + 0.003);
        kg.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        o.connect(kg).connect(out);
        o.start(t); o.stop(t + 0.16);
        sources.push(o);
      }
      const src = ctx.createBufferSource();
      src.buffer = this.noise[ev.duty % 2];
      src.loop = true;
      const [rate, decay] = ev.drum ? DRUMS[ev.drum] : [Math.pow(2, ((ev.midi ?? 60) - 60) / 12), 0];
      src.playbackRate.setValueAtTime(rate, t);
      if (ev.slide) src.playbackRate.exponentialRampToValueAtTime(rate * Math.pow(2, ev.slide / 12), t + dur);
      if (ev.drum) {
        // Drums ignore the channel envelope: fixed one-shot decays.
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(peak * (ev.drum === "k" ? 0.5 : 1), t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0005, t + decay);
        g.gain.setValueAtTime(0, t + decay + 0.001);
      }
      src.connect(g);
      src.start(t, Math.random() * 0.5);
      src.stop(Math.max(end, ev.drum ? t + decay + 0.02 : end));
      sources.push(src);
    } else {
      const o = ctx.createOscillator();
      if (ch === "wave") o.type = "triangle";
      else o.setPeriodicWave(this.pulse[ev.duty]);
      const f = midiToHz(ev.midi ?? 60);
      o.frequency.setValueAtTime(f, t);
      if (ev.slide) o.frequency.exponentialRampToValueAtTime(f * Math.pow(2, ev.slide / 12), t + dur);
      if (ev.vib > 0 && dur > 0.12) {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 5.5;
        const depth = ctx.createGain();
        depth.gain.setValueAtTime(0, t);
        depth.gain.linearRampToValueAtTime(0, t + 0.1);           // delayed vibrato
        depth.gain.linearRampToValueAtTime(ev.vib, t + Math.min(dur, 0.35));
        lfo.connect(depth).connect(o.detune);
        lfo.start(t); lfo.stop(end);
        sources.push(lfo);
      }
      o.connect(g);
      o.start(t); o.stop(end);
      sources.push(o);
    }
    const last = sources[sources.length - 1];
    last.onended = () => g.disconnect();
    return sources;
  }
}

// [playbackRate, decay seconds]
const DRUMS: Record<"k" | "s" | "h" | "x", [number, number]> = {
  k: [0.35, 0.05], s: [0.9, 0.13], h: [2.6, 0.035], x: [1.3, 0.55],
};

function envelope(p: AudioParam, t: number, dur: number, peak: number, ev: NoteEvent) {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + ATTACK);
  let atRelease = peak;
  if (ev.env > 0) {
    const fade = (ev.vol * ev.env) / 64; // GB: one step of 15 every env/64 s
    if (fade <= dur) {
      p.linearRampToValueAtTime(0, t + ATTACK + fade);
      atRelease = 0;
    } else {
      atRelease = peak * (1 - dur / fade);
      p.linearRampToValueAtTime(atRelease, t + dur);
    }
  } else {
    p.setValueAtTime(peak, t + dur);
  }
  if (atRelease > 0) p.linearRampToValueAtTime(0, t + dur + RELEASE);
}

function pulseWave(ctx: AudioContext, duty: number): PeriodicWave {
  const N = 48;
  const real = new Float32Array(N);
  const imag = new Float32Array(N);
  for (let n = 1; n < N; n++) {
    real[n] = Math.sin(2 * Math.PI * n * duty) / (n * Math.PI);
    imag[n] = (1 - Math.cos(2 * Math.PI * n * duty)) / (n * Math.PI);
  }
  return ctx.createPeriodicWave(real, imag);
}

/** Game Boy–style LFSR noise: 15-bit (hiss) or 7-bit (metallic). */
function lfsrNoise(ctx: AudioContext, short: boolean): AudioBuffer {
  const len = ctx.sampleRate; // 1 s, looped
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let lfsr = 0x7fff;
  const stepEvery = 2; // samples per LFSR clock at playbackRate 1
  let v = 1;
  for (let i = 0; i < len; i++) {
    if (i % stepEvery === 0) {
      const bit = (lfsr ^ (lfsr >> 1)) & 1;
      lfsr = (lfsr >> 1) | (bit << 14);
      if (short) lfsr = (lfsr & ~0x40) | (bit << 6);
      v = lfsr & 1 ? -1 : 1;
    }
    data[i] = v * 0.8;
  }
  return buf;
}

// ------------------------------------------------------------------ player

interface Cursor { ch: ChannelId; data: ParsedChannel; idx: number; passBase: number; done: boolean }

export class Player {
  private chip: Chip;
  readonly song: ParsedSong;
  private out: GainNode;
  private spt: number;
  private startTime = 0;
  private cursors: Cursor[] = [];
  private live = new Set<AudioScheduledSourceNode>();
  private finished = false;
  private onEnd?: () => void;
  private endTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(chip: Chip, song: ParsedSong, bus: GainNode, onEnd?: () => void, startTick = 0) {
    this.chip = chip;
    this.song = song;
    this.spt = secondsPerTick(song.bpm);
    this.onEnd = onEnd;
    this.out = chip.ctx.createGain();
    this.out.connect(bus);
    if (startTick > 0) {
      // fade back in when resuming mid-song
      this.out.gain.setValueAtTime(0, chip.ctx.currentTime);
      this.out.gain.linearRampToValueAtTime(1, chip.ctx.currentTime + 0.25);
    }
    this.seek(startTick, chip.ctx.currentTime + 0.03);
  }

  /** Absolute song position in ticks (keeps counting across loops). */
  positionTicks(): number {
    return Math.max(0, (this.chip.ctx.currentTime - this.startTime) / this.spt);
  }

  /** Position within the song (0..length) for display. */
  songTick(): number {
    const abs = this.positionTicks();
    const { length, loopTick, loop } = this.song;
    if (abs < length || !loop) return Math.min(abs, length);
    const span = length - loopTick;
    return span > 0 ? loopTick + ((abs - length) % span) : length;
  }

  seek(absTick: number, when: number) {
    this.startTime = when - absTick * this.spt;
    const { length, loopTick, loop } = this.song;
    const span = length - loopTick;
    this.cursors = [];
    for (const [ch, data] of Object.entries(this.song.channels) as [ChannelId, ParsedChannel][]) {
      let passBase = 0;
      let local = absTick;
      if (loop && absTick >= length && span > 0) {
        const k = Math.floor((absTick - length) / span);
        passBase = (k + 1) * span;
        local = absTick - passBase;
      }
      let idx = data.events.findIndex((e) => e.tick >= local);
      if (idx < 0) idx = data.events.length;
      this.cursors.push({ ch, data, idx, passBase, done: false });
    }
  }

  pump(lookahead: number) {
    if (this.finished) return;
    const horizon = this.chip.ctx.currentTime + lookahead;
    const { length, loopTick, loop } = this.song;
    const span = length - loopTick;
    let allDone = true;
    for (const c of this.cursors) {
      if (c.done) continue;
      let guard = 0;
      while (guard++ < 512) {
        if (c.idx >= c.data.events.length) {
          if (!loop || span <= 0) { c.done = true; break; }
          c.passBase += span;
          c.idx = c.data.events.findIndex((e) => e.tick >= loopTick);
          if (c.idx < 0) { c.done = true; break; }
        }
        const ev = c.data.events[c.idx];
        const t = this.startTime + (c.passBase + ev.tick) * this.spt;
        if (t > horizon) break;
        if (t >= this.chip.ctx.currentTime - 0.01) {
          for (const s of this.chip.voice(c.ch, ev, Math.max(t, this.chip.ctx.currentTime), this.spt, this.out)) {
            this.live.add(s);
            s.addEventListener("ended", () => this.live.delete(s));
          }
        }
        c.idx++;
      }
      if (!c.done) allDone = false;
    }
    if (allDone && !this.endTimer) {
      const endAt = this.startTime + length * this.spt;
      const ms = Math.max(0, (endAt - this.chip.ctx.currentTime) * 1000) + 30;
      this.endTimer = setTimeout(() => this.finish(), ms);
    }
  }

  /** Fade out over `seconds`, then stop everything. */
  stop(seconds = 0.03) {
    if (this.finished) return;
    const now = this.chip.ctx.currentTime;
    const g = this.out.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + Math.max(0.01, seconds));
    for (const s of this.live) { try { s.stop(now + Math.max(0.01, seconds) + 0.01); } catch { /* already stopped */ } }
    this.finished = true;
    if (this.endTimer) clearTimeout(this.endTimer);
    this.chip.forget(this);
    setTimeout(() => { this.out.disconnect(); this.onEnd?.(); }, (seconds + 0.05) * 1000);
  }

  private finish() {
    if (this.finished) return;
    this.finished = true;
    this.chip.forget(this);
    setTimeout(() => this.out.disconnect(), 200);
    this.onEnd?.();
  }

  get isFinished() { return this.finished; }
}
