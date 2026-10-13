import { describe, expect, it } from "vitest";
import { CHARACTERS, PLAYER_ART, TRAINER_PORTRAITS, isPlayerBack, playerArt } from "./index";

describe("playerArt", () => {
  it("picks the overworld sheet and battle back for each look", () => {
    expect(playerArt({ playerLook: "boy" })).toEqual({ character: "player", back: "player_back" });
    expect(playerArt({ playerLook: "girl" })).toEqual({ character: "player_girl", back: "player_girl_back" });
  });

  it("treats a save from before the choice (or no state) as the boy", () => {
    expect(playerArt({})).toBe(PLAYER_ART.boy);
    expect(playerArt(undefined)).toBe(PLAYER_ART.boy);
    expect(playerArt({ playerLook: "fern" as never })).toBe(PLAYER_ART.boy);
  });

  it("names real contract keys, and only the player backs count as back views", () => {
    for (const art of Object.values(PLAYER_ART)) {
      expect(CHARACTERS).toContain(art.character);
      expect(TRAINER_PORTRAITS).toContain(art.back);
    }
    expect(TRAINER_PORTRAITS.filter(isPlayerBack)).toEqual(["player_back", "player_girl_back"]);
  });
});
