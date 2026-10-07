import { describe, expect, it } from "vitest";
import { ArtRegistry } from "./registry";
import { tallCharacter, tallCharacterRaw } from "./character.fixture";
import { validateArt } from "./validate";
import { requiredPaths } from "./required";

const pixels = (height = 128) => ({ width: 48, height, data: new Uint8Array(48 * height * 4) });

describe("character bundle frames", () => {
  it("validates a 48x128 sheet declared as 16x32 frames, including required paths", () => {
    const result = validateArt({
      raw: [tallCharacterRaw], packs: {}, legacy: [], image: () => pixels(),
      required: requiredPaths().filter((r) => r.path === "assets/characters/player.png"),
    });
    expect(result.problems).toEqual([]);
    expect(result.missing).toEqual([]);
  });

  it("rejects a sheet whose dimensions disagree with its frame declaration", () => {
    const result = validateArt({ raw: [tallCharacterRaw], packs: {}, legacy: [], image: () => pixels(64), required: [] });
    expect(result.problems).toContainEqual({ where: "characters/player", message: "sheet.png is 48x64, want 48x128" });
  });

  it("reads pack and live-edit frame metadata, and falls back for legacy stores", () => {
    const reg = new ArtRegistry();
    reg.raw = [{ ...tallCharacterRaw, json: { ...tallCharacter, frame: [16, 16] } }, {
      ...tallCharacterRaw, pack: "tall", json: { frame: [16, 32] },
    }];
    reg.index.packs.tall = { name: "Tall", description: "", author: "", species: {}, tilesets: {}, structures: {}, characters: { player: ["sheet.png"] }, sets: {} };
    reg.setActivePacks([]);
    expect(reg.characterFrame("player")).toEqual([16, 16]);
    reg.setActivePacks(["tall"]);
    expect(reg.characterFrame("player")).toEqual([16, 32]);
    reg.patchBundle("characters", "player", { frame: [16, 16] });
    expect(reg.characterFrame("player")).toEqual([16, 16]);
    reg.patchBundle("characters", "player", null);
    expect(reg.characterFrame("player")).toEqual([16, 32]);
    expect(reg.characterFrame("vale")).toEqual([16, 16]);
  });
});
