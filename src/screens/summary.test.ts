import { describe, expect, it } from "vitest";
import type { Quickened } from "../contracts";
import { swapMoves } from "./summary";
import { cleanNickname, NICKNAME_MAX } from "./flows/nickname";

const q = (): Quickened => ({
  uid: "x", species: "oak_acorn", level: 5, exp: 0, hp: 20,
  stats: { hp: 20, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
  ivs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  moves: [{ id: "vine_lash", pp: 3 }, { id: "sap_seal", pp: 30 }, { id: "root_tap", pp: 7 }],
  status: null, friendship: 70, sport: false,
});

describe("swapMoves", () => {
  it("swaps two slots and keeps each move's PP with it", () => {
    const m = q();
    expect(swapMoves(m, 0, 2)).toBe(true);
    expect(m.moves).toEqual([{ id: "root_tap", pp: 7 }, { id: "sap_seal", pp: 30 }, { id: "vine_lash", pp: 3 }]);
  });
  it("ignores same-slot and out-of-range swaps", () => {
    const m = q();
    expect(swapMoves(m, 1, 1)).toBe(false);
    expect(swapMoves(m, 0, 3)).toBe(false);
    expect(swapMoves(m, -1, 0)).toBe(false);
    expect(m.moves.map((x) => x.id)).toEqual(["vine_lash", "sap_seal", "root_tap"]);
  });
});

describe("cleanNickname", () => {
  it("keeps a real nickname, trimmed and capped", () => {
    expect(cleanNickname("  Acorny ", "OAK ACORN")).toBe("Acorny");
    expect(Array.from(cleanNickname("ABCDEFGHIJKLMN", "OAK ACORN")!).length).toBe(NICKNAME_MAX);
  });
  it("drops empty names and the species name itself", () => {
    expect(cleanNickname("   ", "OAK ACORN")).toBeUndefined();
    expect(cleanNickname("Oak Acorn", "OAK ACORN")).toBeUndefined();
  });
});

import { countOf } from "./kit/text";
describe("countOf", () => {
  it("pluralises item names without doubling an S", () => {
    expect(countOf(1, "TERRARIUM POD")).toBe("1 TERRARIUM POD");
    expect(countOf(5, "TERRARIUM POD")).toBe("5 TERRARIUM PODS");
    expect(countOf(3, "COMPOST")).toBe("COMPOST ×3");
    expect(countOf(3, "SUNFLOWER SEEDS")).toBe("3 SUNFLOWER SEEDS");
  });
});
