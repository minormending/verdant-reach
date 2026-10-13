import { describe, expect, it } from "vitest";
import type { GameContext } from "../src/contracts";
import { DATA } from "../src/data";
import { WORLD } from "../src/world";
import { randomStream } from "../src/engine/random";
import { normalizeState } from "../src/save";
import { buildFixture, CHAPTER_1_FLAGS, FIXTURES, FixtureError, settableFlags, type FixtureName } from "./fixtures";
import { SMOKE_BEATS, SMOKE_PAGES, SMOKE_PHASES } from "./smoke-plan.mjs";

// The smoke suite's prepared states (e2e/fixtures.ts) are checked here too, so a
// story change that breaks one fails `npm test`, before any browser starts.
const ctx = { world: WORLD, data: DATA } as unknown as GameContext;
const names = Object.keys(FIXTURES) as FixtureName[];

describe("smoke fixtures", () => {
  it("still match the story: every Chapter 1 flag is set by some script, battle or trainer", () => {
    const known = settableFlags(WORLD);
    expect(CHAPTER_1_FLAGS.filter((f) => !known.has(f))).toEqual([]);
  });

  it.each(names)("%s builds a state that survives the save's normalizeState", (name) => {
    const st = buildFixture(ctx, name, randomStream(1, "e2e:smoke-fixtures"));
    const spec = FIXTURES[name];
    expect(st.position.map).toBe(spec.at.map);
    expect(WORLD.maps[st.heal.map].healPoint).toEqual({ x: st.heal.x, y: st.heal.y });
    expect(st.party.map((q) => [q.species, q.level])).toEqual(spec.party.map((m) => [m.species, m.level]));
    expect(st.party.every((q) => q.hp > 0)).toBe(true);
    const loaded = normalizeState(JSON.parse(JSON.stringify(st)), st);
    expect(loaded?.position).toEqual(st.position);
    expect(spec.flags.every((f) => loaded?.flags[f])).toBe(true);
  });

  it("is deterministic for a seed", () => {
    const a = buildFixture(ctx, "leader", randomStream(7, "e2e:smoke-fixtures"));
    const b = buildFixture(ctx, "leader", randomStream(7, "e2e:smoke-fixtures"));
    // uid is a random id, not a gameplay value.
    const strip = (party: typeof a.party) => party.map(({ uid: _uid, ...q }) => q);
    expect(strip(a.party)).toEqual(strip(b.party));
  });

  it("names every broken assumption instead of building a stale state", () => {
    const world = { ...WORLD, maps: { ...WORLD.maps, route_1: { ...WORLD.maps.route_1, npcs: [] } } };
    const broken = { world, data: DATA } as unknown as GameContext;
    expect(() => buildFixture(broken, "rematch", Math.random)).toThrow(FixtureError);
    expect(() => buildFixture(broken, "rematch", Math.random)).toThrow(/no NPC milo/);
    expect(settableFlags(world).has("beat_schoolkid_milo")).toBe(false);
  });
});

describe("smoke plan", () => {
  it("counts every phase beat and page check", () => {
    expect(SMOKE_PHASES.map((p) => p.name)).toEqual(["story", "continue", "rematch", "leader", "whiteout"]);
    expect(SMOKE_BEATS).toBe(SMOKE_PHASES.reduce((n, p) => n + p.beats, 0) + SMOKE_PAGES.length);
    expect(SMOKE_PAGES.map((p) => p.path)).toEqual(["guide.html", "tilelab.html", "devdocs.html", "trainereditor.html"]);
  });
});
