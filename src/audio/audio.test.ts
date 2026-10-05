import { describe, expect, it } from "vitest";
import { JINGLES, MUSIC, SFX, SPECIES_IDS } from "../contracts";
import { CHANNELS, expandRepeats, lenText, noteText, parseChannel, parseSong, songSeconds } from "./song";
import { ARRANGEMENTS, MUSIC_DEFS } from "./music";
import { JINGLE_DEFS, SFX_DEFS } from "./sfx";
import { arrange, parseChord } from "./arrange";
import { cryFor } from "./cry";
import { createAudio } from "./index";

describe("song parser", () => {
  it("parses notes, octaves, accidentals and lengths", () => {
    const ch = parseChannel("o4 c4 c+8 d-8. > c16 < b2");
    expect(ch.events.map((e) => e.midi)).toEqual([60, 61, 61, 72, 71]);
    expect(ch.events.map((e) => e.len)).toEqual([48, 24, 36, 12, 96]);
    expect(ch.length).toBe(48 + 24 + 36 + 12 + 96);
  });

  it("handles default length, rests, ties and triplet lengths", () => {
    const ch = parseChannel("l8 c d r e4^8 r4 ^8 f12 f12 f12");
    expect(ch.events.map((e) => e.len)).toEqual([24, 24, 72, 16, 16, 16]);
    expect(ch.events[2].tick).toBe(72);
    expect(ch.length).toBe(24 * 3 + 72 + 48 + 24 + 48);
  });

  it("tracks volume, duty, envelope, gate, vibrato and slides per note", () => {
    const ch = parseChannel("v9 @1 %3 q4 ~20 p-7 c v15 @3 %0 q8 ~0 p0 d");
    expect(ch.events[0]).toMatchObject({ vol: 9, duty: 1, env: 3, gate: 4, vib: 20, slide: -7 });
    expect(ch.events[1]).toMatchObject({ vol: 15, duty: 3, env: 0, gate: 8, vib: 0, slide: 0 });
  });

  it("expands nested repeats and records loop points and bar lines", () => {
    expect(expandRepeats("[a [b]3 ]2")).toBe("a bbb a bbb ");
    const ch = parseChannel("c4 | L [d4]2 | k8 s8 h8 x8");
    expect(ch.loopTick).toBe(48);
    expect(ch.bars).toEqual([48, 144]);
    expect(ch.events.slice(-4).map((e) => e.drum)).toEqual(["k", "s", "h", "x"]);
  });

  it("rejects malformed input", () => {
    expect(() => parseChannel("c5")).toThrow();      // 192/5 is not whole
    expect(() => parseChannel("[c d")).toThrow();
    expect(() => parseChannel("v16 c")).toThrow();
    expect(() => parseChannel("z")).toThrow();
    expect(() => parseChannel("L c L d")).toThrow();
  });

  it("writes text the parser reads back", () => {
    for (const t of [192, 144, 96, 72, 48, 36, 24, 12, 6, 120, 168, 60, 16]) {
      expect(parseChannel(`c${lenText(t)}`).length).toBe(t);
    }
    expect(noteText(61, 24)).toBe("o4c+8");
    expect(parseChannel(noteText(45, 48)).events[0].midi).toBe(45);
  });

  it("parses chords", () => {
    expect(parseChord("C")).toMatchObject({ root: 0, tones: [0, 4, 7], minor: false });
    expect(parseChord("F#m7")).toMatchObject({ root: 6, minor: true });
    expect(parseChord("Bb").root).toBe(10);
    expect(() => parseChord("H")).toThrow();
  });
});

describe("music", () => {
  it("every MUSIC id has a definition that parses", () => {
    for (const id of MUSIC) {
      expect(MUSIC_DEFS[id], id).toBeDefined();
      const song = parseSong(MUSIC_DEFS[id]);
      expect(song.loop).toBe(true);
      expect(song.channels.p1, id).toBeDefined();
      expect(song.channels.wave, id).toBeDefined();
    }
    expect(Object.keys(MUSIC_DEFS).sort()).toEqual([...MUSIC].sort());
  });

  it("loops are 30-90 s and all channels have the same length", () => {
    for (const id of MUSIC) {
      const song = parseSong(MUSIC_DEFS[id]);
      const secs = songSeconds(song);
      expect(secs, id).toBeGreaterThanOrEqual(30);
      expect(secs, id).toBeLessThanOrEqual(90);
      for (const ch of CHANNELS) {
        const c = song.channels[ch];
        if (c) expect(c.length, `${id}.${ch}`).toBe(song.length);
      }
    }
  });

  it("every melody bar is exactly one bar long", () => {
    for (const [id, a] of Object.entries(ARRANGEMENTS)) {
      const barTicks = (a.meter ?? 4) * 48;
      const ch = parseChannel(a.melody);
      let prev = 0;
      ch.bars.forEach((t, i) => {
        expect(t - prev, `${id} bar ${i + 1}`).toBe(barTicks);
        prev = t;
      });
      expect(ch.length, id).toBe(prev);
    }
  });

  it("keeps melodies in a comfortable pulse range", () => {
    for (const id of MUSIC) {
      for (const e of parseSong(MUSIC_DEFS[id]).channels.p1!.events) {
        expect(e.midi!, id).toBeGreaterThanOrEqual(55);
        expect(e.midi!, id).toBeLessThanOrEqual(96);
      }
    }
  });

  it("arranges a 3/4 chart correctly", () => {
    const def = arrange({ bpm: 100, meter: 3, chords: "C | G", melody: "c2. | d2. |", harmony: "waltz", bass: "half", drums: "soft" });
    const song = parseSong(def);
    for (const ch of CHANNELS) if (song.channels[ch]) expect(song.channels[ch]!.length).toBe(288);
  });
});

describe("jingles and sfx", () => {
  it("every JINGLE and SFX id has a short, non-looping definition", () => {
    for (const id of JINGLES) {
      const s = parseSong(JINGLE_DEFS[id]);
      expect(s.loop).toBe(false);
      expect(songSeconds(s), id).toBeGreaterThan(0.3);
      expect(songSeconds(s), id).toBeLessThan(6);
    }
    for (const id of SFX) {
      const s = parseSong(SFX_DEFS[id]);
      expect(s.loop).toBe(false);
      expect(s.length, id).toBeGreaterThan(0);
      expect(songSeconds(s), id).toBeLessThan(1.5);
    }
  });
});

describe("cries", () => {
  it("are deterministic, distinct per species, and lower for later stages", () => {
    const seen = new Set<string>();
    for (const id of SPECIES_IDS) {
      const a = cryFor(id), b = cryFor(id);
      expect(a.def).toEqual(b.def);
      const key = JSON.stringify(a.def);
      expect(seen.has(key), id).toBe(false);
      seen.add(key);
      const s = parseSong(a.def);
      expect(songSeconds(s), id).toBeLessThan(1.5);
    }
    expect(cryFor("great_oak").base).toBeLessThan(cryFor("oak_acorn").base);
    expect(cryFor("red_chili").base).toBeLessThan(cryFor("green_chili").base);
    expect(cryFor("sundew").base).toBeLessThan(cryFor("sundew_rosette").base);
  });
});

describe("createAudio without WebAudio", () => {
  it("is a safe silent state machine", async () => {
    const a = createAudio();
    a.unlock();
    a.playMusic("route");
    expect(a.current()).toBe("route");
    a.playSfx("select");
    await a.playJingle("heal");
    await a.playCry("oak_acorn");
    a.setVolume(0.5, 0.5);
    a.stopMusic(10);
    expect(a.current()).toBe(null);
  });
});
