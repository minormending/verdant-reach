// Walkthrough validation (docs/GUIDE.md): every data block names something
// that exists in the game, section ids are unique, and every map with wild
// plants, trainers or items has a walkthrough map panel.

import { describe, expect, it } from "vitest";
import { MAP_IDS } from "../contracts";
import { DATA } from "../data";
import { WORLD } from "../world";
import { allMapFinds, groupMembers, mapHasContent } from "./indexer";
import type { Block, Section } from "./types";
import { WALKTHROUGH } from "./walkthrough";

const blocks = (s: Section[]) => s.flatMap((sec) => sec.blocks.map((b) => ({ sec: sec.id, b })));
const where = (sec: string, b: Block) => `${sec}: ${JSON.stringify(b).slice(0, 80)}`;

/** Maps with encounters, trainers or items that no walkthrough `map` block shows. */
export function uncoveredMaps(sections: Section[]): string[] {
  const covered = new Set(blocks(sections).flatMap(({ b }) => ("map" in b ? [b.map] : [])));
  return allMapFinds(WORLD, DATA).filter((f) => mapHasContent(f) && !covered.has(f.map)).map((f) => f.map);
}

describe("walkthrough content", () => {
  it("uses unique, well-formed section ids with a part and a title", () => {
    const ids = WALKTHROUGH.map((s) => s.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes, "duplicate section ids").toEqual([]);
    for (const s of WALKTHROUGH) {
      expect(s.id, s.id).toMatch(/^[a-z0-9][a-z0-9-]*$/);
      expect(s.part.trim(), `${s.id} part`).not.toBe("");
      expect(s.title.trim(), `${s.id} title`).not.toBe("");
      expect(s.blocks.length, `${s.id} has no blocks`).toBeGreaterThan(0);
    }
  });

  it("names only maps, trainers, species and items that exist", () => {
    const bad: string[] = [];
    for (const { sec, b } of blocks(WALKTHROUGH)) {
      if ("map" in b && !WORLD.maps[b.map]) bad.push(`unknown map: ${where(sec, b)}`);
      if ("boss" in b && !WORLD.trainers[b.boss] && !groupMembers(b.boss, WORLD.trainers).length) bad.push(`unknown trainer: ${where(sec, b)}`);
      if ("species" in b && !DATA.species[b.species]) bad.push(`unknown species: ${where(sec, b)}`);
      if ("item" in b && !DATA.items[b.item]) bad.push(`unknown item: ${where(sec, b)}`);
    }
    expect(bad).toEqual([]);
  });

  it("keeps text blocks non-empty", () => {
    const bad: string[] = [];
    for (const { sec, b } of blocks(WALKTHROUGH)) {
      if ("p" in b && !b.p.trim()) bad.push(where(sec, b));
      if ("tip" in b && !b.tip.trim()) bad.push(where(sec, b));
      if ("list" in b && (!b.list.length || b.list.some((x) => !x.trim()))) bad.push(where(sec, b));
      if ("checklist" in b && (!b.checklist.length || b.checklist.some((x) => !x.trim()))) bad.push(where(sec, b));
    }
    expect(bad).toEqual([]);
  });

  it("covers every map with wild plants, trainers or items with a map panel", () => {
    // Fails until the writers have placed a `{ map }` block for each listed map.
    expect(uncoveredMaps(WALKTHROUGH), "maps without a walkthrough map panel").toEqual([]);
  });

  it("finds content maps to cover (sanity check of the coverage rule)", () => {
    const all = uncoveredMaps([]);
    expect(all.length).toBeGreaterThan(40);
    expect(all.every((m) => (MAP_IDS as readonly string[]).includes(m))).toBe(true);
  });
});
