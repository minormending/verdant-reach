// Audio entry point: `createAudio(): AudioService`.
// Silent (but fully functional as a state machine) until `unlock()` is called
// from a user gesture, and in environments without WebAudio (tests).

import type { AudioService, JingleId, MusicId, SfxId, SpeciesId } from "../contracts";
import { Chip, type Player } from "./engine";
import { MUSIC_DEFS } from "./music";
import { JINGLE_DEFS, SFX_DEFS } from "./sfx";
import { cryFor } from "./cry";
import { parseSong, songSeconds, type ParsedSong, type SongDef } from "./song";
import { DEFAULT_VOLUME, JINGLE_TRIM, MUSIC_TRIM, SFX_TRIM } from "./mix";
import { AmbienceBed, ambienceFor, clockTimeOfDay } from "./ambience";

export interface AudioDebug {
  state: string;
  current: MusicId | null;
  songTick: number;
  songLength: number;
  jingle: boolean;
}

const cache = new Map<SongDef, ParsedSong>();
const parsed = (def: SongDef) => {
  let p = cache.get(def);
  if (!p) { p = parseSong(def); cache.set(def, p); }
  return p;
};

/**
 * Wait for a sound that a flow awaits (a jingle or a cry): resolves when it
 * ends, or after `lengthMs` passed through `scaleMs` if that is sooner. Under
 * GAME SPEED the flow then moves on at its own pace while the sound plays to
 * its end (it is never cut). At x1 `scaleMs` changes nothing and only the end counts.
 */
export function awaitSound(
  start: (onEnd: () => void) => void,
  lengthMs: number,
  scaleMs: (ms: number) => number,
  after: (f: () => void, ms: number) => unknown = (f, ms) => setTimeout(f, ms),
): Promise<void> {
  return new Promise<void>((resolve) => {
    start(resolve);
    const wait = scaleMs(lengthMs);
    if (wait < lengthMs) after(resolve, Math.max(0, wait));
  });
}

export interface AudioOptions {
  /** Real ms for a wait written at normal speed (GAME SPEED; src/engine/speed.ts `scaledMs`). */
  scaleMs?: (ms: number) => number;
}

export function createAudio(opts: AudioOptions = {}): AudioService {
  const scaleMs = opts.scaleMs ?? ((ms: number) => ms);
  let chip: Chip | null = null;
  let current: MusicId | null = null;
  let music: Player | null = null;
  let jingles = 0;
  let resumeTick = 0;
  let volMusic: number = DEFAULT_VOLUME.music;
  let volSfx: number = DEFAULT_VOLUME.sfx;
  let bed: AmbienceBed | null = null;
  let ducks = 0;

  const running = () => chip !== null && chip.ctx.state === "running";

  function startMusic(fromTick = 0) {
    if (!chip || !current || jingles > 0) return;
    music?.stop(0.03);
    music = chip.play(parsed(MUSIC_DEFS[current]), chip.musicBus, undefined, fromTick, MUSIC_TRIM[current] ?? 1);
  }

  /** The ambience bed follows the music: routes, towns, the grove, night. */
  function updateBed() {
    if (!chip) return;
    if (!bed) bed = new AmbienceBed(chip, chip.ambienceBus, (Date.now() & 0xffff) + 1);
    bed.start(ambienceFor(current, clockTimeOfDay()));
  }

  function applyVolumes() {
    if (!chip) return;
    const now = chip.ctx.currentTime;
    chip.musicBus.gain.setTargetAtTime(volMusic, now, 0.02);
    chip.sfxBus.gain.setTargetAtTime(volSfx, now, 0.02);
  }

  function duck(on: boolean) {
    if (!chip) return;
    ducks += on ? 1 : -1;
    const now = chip.ctx.currentTime;
    chip.duckGain.gain.setTargetAtTime(ducks > 0 ? 0.45 : 1, now, 0.04);
  }

  function playOnce(def: SongDef, bus: "sfx" | "jingle" | "cry", onDone: () => void, level = 1): Player | null {
    if (!chip) { onDone(); return null; }
    const out = bus === "jingle" ? chip.jingleBus : bus === "cry" ? chip.cryBus : chip.effectBus;
    return chip.play(parsed(def), out, onDone, 0, level);
  }
  /** The jingle playing now: under GAME SPEED a flow can reach the next one first. */
  let jingle: Player | null = null;
  const lengthMs = (def: SongDef) => songSeconds(parsed(def)) * 1000;

  let suspended = false;
  const service: AudioService & { debug(): AudioDebug; suspend(on: boolean): void } = {
    playMusic(id: MusicId) {
      if (current === id && (music || jingles > 0)) return;
      current = id;
      resumeTick = 0;
      startMusic(0);
      updateBed();
    },

    stopMusic(fadeFrames = 0) {
      current = null;
      resumeTick = 0;
      music?.stop(Math.max(0.03, fadeFrames / 60));
      music = null;
      bed?.stop(Math.max(0.3, fadeFrames / 60));
    },

    current: () => current,

    playSfx(id: SfxId) {
      if (!running()) return;
      playOnce(SFX_DEFS[id], "sfx", () => {}, SFX_TRIM[id] ?? 1);
    },

    playJingle(id: JingleId): Promise<void> {
      if (!running()) return Promise.resolve();
      jingles++;
      if (music) {
        resumeTick = music.positionTicks();
        music.stop(0.05);
        music = null;
      }
      // A new jingle replaces one still finishing (only possible above x1).
      jingle?.stop(0.05);
      const def = JINGLE_DEFS[id];
      return awaitSound((resolve) => {
        let p: Player | null = null;
        p = playOnce(def, "jingle", () => {
          if (jingle === p) jingle = null;
          jingles--;
          if (jingles === 0 && current && !music) startMusic(resumeTick);
          resolve();
        }, JINGLE_TRIM[id] ?? 1);
        if (p && !p.isFinished) jingle = p;
      }, lengthMs(def), scaleMs);
    },

    playCry(species: SpeciesId): Promise<void> {
      if (!running()) return Promise.resolve();
      duck(true);
      const cry = cryFor(species);
      return awaitSound((resolve) => {
        playOnce(cry.def, "cry", () => { duck(false); resolve(); }, cry.level);
      }, lengthMs(cry.def), scaleMs);
    },

    /** Safe to call on every press: returns at once when audio is already running. */
    unlock() {
      if (typeof AudioContext === "undefined" || running()) return;
      if (!chip) {
        try {
          chip = new Chip(new AudioContext({ latencyHint: "interactive" }));
        } catch {
          return;
        }
        applyVolumes();
      }
      const c = chip;
      if (suspended) return;
      void c.ctx.resume().then(() => {
        if (current && !music && jingles === 0) startMusic(resumeTick);
        if (current && (!bed || bed.current === "none")) updateBed();
      });
    },

    setVolume(m: number, s: number) {
      volMusic = Math.max(0, Math.min(1, m));
      volSfx = Math.max(0, Math.min(1, s));
      applyVolumes();
    },

    suspend(on: boolean) {
      suspended = on;
      if (!chip) return;
      if (on) void chip.ctx.suspend().catch(() => {});
      else void chip.ctx.resume().catch(() => {});
    },

    debug(): AudioDebug {
      return {
        state: chip ? chip.ctx.state : "locked",
        current,
        songTick: music ? Math.floor(music.songTick()) : 0,
        songLength: music ? music.song.length : 0,
        jingle: jingles > 0,
      };
    },
  };
  return service;
}

/** Dev helper: read engine state if the service is ours. */
export function audioDebug(a: AudioService): AudioDebug | null {
  const d = (a as Partial<{ debug(): AudioDebug }>).debug;
  return typeof d === "function" ? d.call(a) : null;
}

/** Platform helper: suspend all sound while the game is paused (not part of AudioService). */
export function setAudioSuspended(a: AudioService, on: boolean): void {
  const s = (a as Partial<{ suspend(on: boolean): void }>).suspend;
  if (typeof s === "function") s.call(a, on);
}
