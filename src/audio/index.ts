// Audio entry point: `createAudio(): AudioService`.
// Silent (but fully functional as a state machine) until `unlock()` is called
// from a user gesture, and in environments without WebAudio (tests).

import type { AudioService, JingleId, MusicId, SfxId, SpeciesId } from "../contracts";
import { Chip, type Player } from "./engine";
import { MUSIC_DEFS } from "./music";
import { JINGLE_DEFS, SFX_DEFS } from "./sfx";
import { cryFor } from "./cry";
import { parseSong, type ParsedSong, type SongDef } from "./song";

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

export function createAudio(): AudioService {
  let chip: Chip | null = null;
  let current: MusicId | null = null;
  let music: Player | null = null;
  let jingles = 0;
  let resumeTick = 0;
  let volMusic = 0.8;
  let volSfx = 0.9;
  let ducks = 0;

  const running = () => chip !== null && chip.ctx.state === "running";

  function startMusic(fromTick = 0) {
    if (!chip || !current || jingles > 0) return;
    music?.stop(0.03);
    music = chip.play(parsed(MUSIC_DEFS[current]), chip.musicBus, undefined, fromTick);
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

  function playOnce(def: SongDef, onDone: () => void) {
    if (!chip) { onDone(); return; }
    chip.play(parsed(def), chip.sfxBus, onDone);
  }

  const service: AudioService & { debug(): AudioDebug } = {
    playMusic(id: MusicId) {
      if (current === id && (music || jingles > 0)) return;
      current = id;
      resumeTick = 0;
      startMusic(0);
    },

    stopMusic(fadeFrames = 0) {
      current = null;
      resumeTick = 0;
      music?.stop(Math.max(0.03, fadeFrames / 60));
      music = null;
    },

    current: () => current,

    playSfx(id: SfxId) {
      if (!running()) return;
      playOnce(SFX_DEFS[id], () => {});
    },

    playJingle(id: JingleId): Promise<void> {
      if (!running()) return Promise.resolve();
      jingles++;
      if (music) {
        resumeTick = music.positionTicks();
        music.stop(0.05);
        music = null;
      }
      return new Promise<void>((resolve) => {
        playOnce(JINGLE_DEFS[id], () => {
          jingles--;
          if (jingles === 0 && current && !music) startMusic(resumeTick);
          resolve();
        });
      });
    },

    playCry(species: SpeciesId): Promise<void> {
      if (!running()) return Promise.resolve();
      duck(true);
      return new Promise<void>((resolve) => {
        playOnce(cryFor(species).def, () => { duck(false); resolve(); });
      });
    },

    unlock() {
      if (typeof AudioContext === "undefined") return;
      if (!chip) {
        try {
          chip = new Chip(new AudioContext({ latencyHint: "interactive" }));
        } catch {
          return;
        }
        applyVolumes();
      }
      const c = chip;
      void c.ctx.resume().then(() => {
        if (current && !music && jingles === 0) startMusic(resumeTick);
      });
    },

    setVolume(m: number, s: number) {
      volMusic = Math.max(0, Math.min(1, m));
      volSfx = Math.max(0, Math.min(1, s));
      applyVolumes();
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
