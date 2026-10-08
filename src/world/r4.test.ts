import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHARACTERS } from "../contracts";
import { WORLD } from "./index";

const fallbacks = {
  mercer: "gentleman", rowan: "vale", signe: "nell_pitcher", rook: "hollis",
  belladonna: "florist", mimi_osa: "researcher", titus_arum: "gentleman", pyra: "florist",
} as const;

describe("R4 later cast identities and public fallback", () => {
  it.each(Object.entries(fallbacks))("provides original GBC pixels for %s without the private pack", (key, standIn) => {
    expect(CHARACTERS).toContain(key);
    const folder = new URL(`../../public/art/characters/${key}/`, import.meta.url);
    const meta = JSON.parse(readFileSync(new URL("character.json", folder), "utf8"));
    expect(meta.id).toBe(key);
    expect(meta.frame).toEqual([16, 16]);
    expect(meta.notes).toMatch(/^FALLBACK:/);
    expect(readFileSync(new URL("sheet.png", folder))).toEqual(
      readFileSync(new URL(`../../public/art/characters/${standIn}/sheet.png`, import.meta.url)),
    );
  });

  it("gives every later cast appearance its own key, including council seats", () => {
    const appearances = Object.values(WORLD.maps).flatMap((map) => map.npcs)
      .filter((npc) => npc.id in fallbacks || npc.id === "rowan_arboretum");
    expect(appearances).toHaveLength(13);
    for (const npc of appearances) expect(npc.sprite).toBe(npc.id === "rowan_arboretum" ? "rowan" : npc.id);
  });

  it("keeps unrelated characters sharing the old stand-in sprites", () => {
    expect(WORLD.maps.fellowship_hall.npcs.find((npc) => npc.id === "imogen")?.sprite).toBe("vale");
    expect(WORLD.maps.route_12.npcs.find((npc) => npc.id === "r12_rook")?.sprite).toBe("birdwatcher");
  });
});
