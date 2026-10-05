import { describe, expect, it } from "vitest";
import { MUSIC, SFX, SPECIES_IDS } from "../contracts";
import { MIX, MUSIC_TRIM, SFX_TRIM } from "./mix";
import { ambienceFor } from "./ambience";
import { CRY_DUTY_TRIM, cryFor } from "./cry";
import { createAudio } from "./index";

describe("mix", () => {
  it("keeps every trim in a sane range (no cue silenced or blown out)", () => {
    for (const v of Object.values(MUSIC_TRIM)) expect(v).toBeGreaterThan(0.7), expect(v).toBeLessThan(1.4);
    for (const v of Object.values(SFX_TRIM)) expect(v).toBeGreaterThan(0.5), expect(v).toBeLessThan(2);
    for (const v of CRY_DUTY_TRIM) expect(v).toBeGreaterThan(0.6), expect(v).toBeLessThan(1.8);
    expect(MIX.master).toBeLessThanOrEqual(1);
  });

  it("only trims ids that exist", () => {
    for (const k of Object.keys(MUSIC_TRIM)) expect(MUSIC).toContain(k);
    for (const k of Object.keys(SFX_TRIM)) expect(SFX).toContain(k);
  });

  it("gives every cry a playback level", () => {
    for (const id of SPECIES_IDS) {
      const c = cryFor(id);
      expect(c.level).toBe(CRY_DUTY_TRIM[c.duty]);
    }
  });
});

describe("ambience", () => {
  it("puts beds under outdoor tracks only", () => {
    expect(ambienceFor("route", "day")).toBe("meadow");
    expect(ambienceFor("route", "morning")).toBe("meadow");
    expect(ambienceFor("route", "night")).toBe("night");
    expect(ambienceFor("route_night", "day")).toBe("night");
    expect(ambienceFor("fallowfield", "day")).toBe("town");
    expect(ambienceFor("fallowfield", "night")).toBe("night");
    expect(ambienceFor("sugarbush_grove", "day")).toBe("forest");
    for (const id of ["herbarium", "greenhouse", "market", "conservatory", "battle_wild", "battle_leader", "title", "slice_end", "victory_wild"] as const) {
      expect(ambienceFor(id, "day")).toBe("none");
      expect(ambienceFor(id, "night")).toBe("none");
    }
    expect(ambienceFor(null, "day")).toBe("none");
  });

  it("stays silent and safe without WebAudio", () => {
    const a = createAudio();
    a.playMusic("route");
    a.stopMusic(10);
    a.playMusic("fallowfield");
    expect(a.current()).toBe("fallowfield");
  });
});
