import { describe, expect, it } from "vitest";
import { JINGLES, MUSIC, SFX, SPECIES_IDS } from "../contracts";
import { CHANNELS, expandRepeats, lenText, noteText, parseChannel, parseSong, songSeconds } from "./song";
import { ARRANGEMENTS, MUSIC_DEFS } from "./music";
import { JINGLE_DEFS, SFX_DEFS } from "./sfx";
import { arrange, barCount, parseChord } from "./arrange";
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

  it("every melody bar (and every hand-written part's bar) is exactly one bar long", () => {
    for (const [id, a] of Object.entries(ARRANGEMENTS)) {
      const barTicks = (a.meter ?? 4) * 48;
      const parts = { melody: a.melody, harmonyLine: a.harmonyLine, bassLine: a.bassLine, drumLine: a.drumLine };
      for (const [part, src] of Object.entries(parts)) {
        if (!src) continue;
        const ch = parseChannel(src);
        let prev = 0;
        ch.bars.forEach((t, i) => {
          expect(t - prev, `${id}.${part} bar ${i + 1}`).toBe(barTicks);
          prev = t;
        });
        expect(ch.length, `${id}.${part}`).toBe(prev);
        expect(ch.bars.length, `${id}.${part} bar count`).toBe(barCount(a));
      }
    }
  });

  it("uses hand-written parts in place of the generated ones", () => {
    const def = arrange({
      bpm: 90, chords: "C | G", melody: "c1 | d1 |", harmony: "arp8", bass: "half", drums: "rock",
      harmonyLine: "v3 e1 | g1 |", bassLine: "v9 o2c1 | ^1 |", drumLine: "k1 | r1 |",
    });
    expect(def.p2).toBe("v3 e1 | g1 |");
    expect(def.wave).toBe("v9 o2c1 | ^1 |");
    expect(def.noise).toBe("k1 | r1 |");
    const song = parseSong(def);
    expect(song.channels.wave!.events).toHaveLength(1);       // the tie holds one note
    expect(song.channels.wave!.events[0].len).toBe(384);
  });

  it("keeps melodies in a comfortable pulse range", () => {
    for (const id of MUSIC) {
      for (const e of parseSong(MUSIC_DEFS[id]).channels.p1!.events) {
        expect(e.midi!, id).toBeGreaterThanOrEqual(55);
        expect(e.midi!, id).toBeLessThanOrEqual(96);
      }
    }
  });

  // Chapter 5: each track's character is written into its parts, so check it.
  it("cedarhallow: a slow, drumless D dorian hymn with bells between pad notes", () => {
    const a = ARRANGEMENTS.cedarhallow;
    expect(a.bpm).toBeLessThanOrEqual(80);
    const song = parseSong(MUSIC_DEFS.cedarhallow);
    expect(song.channels.noise).toBeUndefined();
    // dorian: B natural, never B-flat, in the tune
    const pcs = new Set(song.channels.p1!.events.map((e) => e.midi! % 12));
    expect(pcs.has(11)).toBe(true);
    expect(pcs.has(10)).toBe(false);
    const p2 = song.channels.p2!.events;
    const bells = p2.filter((e) => e.env > 0);
    expect(bells.length).toBeGreaterThanOrEqual(8);
    expect(bells.length).toBeLessThan(p2.length);              // mostly pad, sparse bells
    for (const b of bells) expect(b.midi!).toBeGreaterThanOrEqual(81);
  });

  it("burnt_stand: a low heartbeat and a melody that keeps stopping short", () => {
    const song = parseSong(MUSIC_DEFS.burnt_stand);
    const noise = song.channels.noise!.events;
    const kicks = noise.filter((e) => e.drum === "k");
    expect(kicks.length).toBeGreaterThanOrEqual(64);           // lub-dub in every bar
    for (const k of kicks) expect(k.vol).toBeLessThanOrEqual(5); // low in the mix
    expect(noise.every((e) => e.drum === "k" || e.drum === "h")).toBe(true);
    // phrases stop short: at least half the bars end in silence
    const p1 = song.channels.p1!;
    const barTicks = 192;
    let silentEnds = 0;
    for (let b = 1; b <= p1.bars.length; b++) {
      const end = b * barTicks;
      const sounding = p1.events.some((e) => e.tick < end && e.tick + e.len > end - 24);
      if (!sounding) silentEnds++;
    }
    expect(silentEnds).toBeGreaterThanOrEqual(p1.bars.length / 2);
  });

  it("hollow: a tied drone, a slow inner voice and irregular high drips", () => {
    const song = parseSong(MUSIC_DEFS.hollow);
    expect(song.channels.noise).toBeUndefined();
    const wave = song.channels.wave!.events;
    expect(wave.length).toBeLessThanOrEqual(10);               // held, not re-struck each bar
    expect(Math.max(...wave.map((e) => e.midi!))).toBeLessThanOrEqual(52);
    for (const e of song.channels.p1!.events) expect(e.len).toBeGreaterThanOrEqual(96); // halves and wholes
    const p2 = song.channels.p2!.events;
    for (const d of p2) expect(d.midi!).toBeGreaterThanOrEqual(84);
    const drips = p2.filter((e) => e.vol >= 6);                 // the echoes are fainter
    expect(drips.length).toBeGreaterThanOrEqual(12);
    const gaps = [...drips.slice(1).map((d, i) => d.tick - drips[i].tick), song.length - drips.at(-1)!.tick + drips[0].tick];
    expect(new Set(gaps).size).toBe(gaps.length);               // irregular: no two gaps alike, even across the loop
  });

  // Chapter 7.
  it("alpine: a drumless G major waltz whose second half yodels in sixths", () => {
    const a = ARRANGEMENTS.alpine;
    expect(a.meter).toBe(3);
    expect(a.chords.split("|")[0].trim()).toBe("G");
    const song = parseSong(MUSIC_DEFS.alpine);
    expect(song.channels.noise).toBeUndefined();
    const notes = song.channels.p1!.events;
    const pcs = new Set(notes.map((e) => e.midi! % 12));
    expect(pcs.has(6)).toBe(true);                             // F-sharp: G major...
    expect(pcs.has(5)).toBe(false);                            // ...never F natural
    const half = song.length / 2;
    const leaps = (from: number, to: number) => notes.filter((e, i) => i > 0 && e.tick >= from && e.tick < to
      && Math.abs(e.midi! - notes[i - 1].midi!) >= 8).length;
    expect(leaps(half, song.length)).toBeGreaterThan(leaps(0, half)); // the yodel half leaps more
    expect(leaps(half, song.length)).toBeGreaterThanOrEqual(6);
  });

  it("red_lake: F minor wails that sag a semitone, never resting on the tonic chord at the loop", () => {
    const a = ARRANGEMENTS.red_lake;
    const song = parseSong(MUSIC_DEFS.red_lake);
    const sags = song.channels.p1!.events.filter((e) => e.slide < 0);
    expect(sags.length).toBeGreaterThanOrEqual(5);
    for (const s of sags) expect(s.len).toBeGreaterThanOrEqual(96); // long wails, halves and wholes
    expect(a.chords.split("|").at(-1)!.trim()).toBe("C");       // ends on the dominant
    expect(a.chords).toMatch(/\bGb\b/);                          // the tritone side
    expect(song.channels.noise).toBeDefined();
  });

  it("hideout: a staccato C minor motif over the industrial groove", () => {
    const a = ARRANGEMENTS.hideout;
    expect(a.drums).toBe("industrial");
    const song = parseSong(MUSIC_DEFS.hideout);
    const p1 = song.channels.p1!.events;
    const short = p1.filter((e) => e.len <= 24).length;
    expect(short).toBeGreaterThan(p1.length / 2);                // mostly eighths: clipped steps
    const pcs = new Set(p1.map((e) => e.midi! % 12));
    expect(pcs.has(3)).toBe(true);                               // E-flat: C minor
    expect(pcs.has(6) && pcs.has(11)).toBe(true);                // the chromatic neighbours F-sharp and B
  });

  // Chapter 8.
  it("relay_seized: the relay's pulse under a two-hit command that keeps silencing the old tune", () => {
    const a = ARRANGEMENTS.relay_seized;
    expect(a.bass).toBe(ARRANGEMENTS.root_relay.bass);                      // the same network throb
    const p1 = parseSong(MUSIC_DEFS.relay_seized).channels.p1!;
    const barTicks = 192;
    const commands = p1.bars.map((_, b) => p1.events.filter((e) => e.tick >= b * barTicks && e.tick < (b + 1) * barTicks))
      .filter((n) => n.length === 2 && n[0].midi === n[1].midi && n[1].tick - n[0].tick === 96).length;
    expect(commands).toBeGreaterThanOrEqual(5);                               // "be still", struck twice
    expect(a.chords.split("|").at(-1)!.trim()).toBe("G");                     // never rests on C minor
  });

  // Chapter 9.
  it("thistledown: E dorian over a picked figure and woodblock ticks, rolling home on B7", () => {
    const a = ARRANGEMENTS.thistledown;
    expect([a.harmony, a.drums]).toEqual(["broken", "tick"]);
    const pcs = new Set(parseSong(MUSIC_DEFS.thistledown).channels.p1!.events.map((e) => e.midi! % 12));
    expect(pcs.has(1)).toBe(true);                                       // dorian C-sharp
    expect(a.chords.split("|").at(-1)!.trim()).toBe("B7");
  });

  it("canyon: a D minor gallop whose lead keeps leaping an octave", () => {
    const a = ARRANGEMENTS.canyon;
    expect(a.bass).toBe("gallop");
    const p1 = parseSong(MUSIC_DEFS.canyon).channels.p1!.events;
    const leaps = p1.filter((e, i) => i > 0 && Math.abs(e.midi! - p1[i - 1].midi!) >= 7).length;
    expect(leaps).toBeGreaterThanOrEqual(6);
  });

  it("ridge: slow, drumless and long-breathed, harmonic minor, ending on E", () => {
    const a = ARRANGEMENTS.ridge;
    expect(a.bpm).toBeLessThanOrEqual(80);
    const song = parseSong(MUSIC_DEFS.ridge);
    expect(song.channels.noise).toBeUndefined();
    const p1 = song.channels.p1!.events;
    expect(p1.filter((e) => e.len >= 96).length).toBeGreaterThan(p1.length / 2); // halves and longer
    expect(new Set(p1.map((e) => e.midi! % 12)).has(8)).toBe(true);    // G-sharp
    expect(a.chords.split("|").at(-1)!.trim()).toBe("E");
  });

  // Chapter 10.
  it("elder_grove: a drumless drone under a trembling sixteenth rustle, never resting", () => {
    const a = ARRANGEMENTS.elder_grove;
    expect([a.harmony, a.bass, a.drums]).toEqual(["arp16", "drone", "none"]);
    expect(parseSong(MUSIC_DEFS.elder_grove).channels.noise).toBeUndefined();
    expect(a.chords.split("|").at(-1)!.trim()).toBe("A");
  });

  it("battle_mercer: opens on the Root Relay's g / a-flat / g motif over the heavy groove", () => {
    const a = ARRANGEMENTS.battle_mercer;
    expect(a.drums).toBe("heavy");
    const p1 = parseSong(MUSIC_DEFS.battle_mercer).channels.p1!.events;
    expect(p1.slice(0, 3).map((e) => e.midi! % 12)).toEqual([7, 8, 7]);       // g, a-flat, g
    expect(a.chords.split("|").at(-1)!.trim()).toBe("G");
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
