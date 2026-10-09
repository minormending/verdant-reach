// The move and item JSON files (docs/DATA.md): well formed, with helpful errors.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DATA } from "./index";
import { movesFileErrors, type MovesFile } from "./moves";
import { itemsFileErrors, type ItemsFile } from "./items";

const read = <T>(p: string) => JSON.parse(readFileSync(p, "utf8")) as T;

describe("moves.json", () => {
  it("is well formed and matches the loaded moves", () => {
    const f = read<MovesFile>("src/data/moves.json");
    expect(movesFileErrors(f)).toEqual([]);
    expect(f.moves.map((m) => m.id)).toEqual(Object.keys(DATA.moves));
  });
  it("names the move and field on a mistake", () => {
    const f = structuredClone(read<MovesFile>("src/data/moves.json"));
    f.moves[0].type = "plasma" as never;
    f.moves[0].description = "x".repeat(40);
    f.moves[1].effects = [{ kind: "teleport" } as never];
    const errs = movesFileErrors(f);
    expect(errs.some((e) => e.startsWith("moves.json: moves[0] vine_lash: type"))).toBe(true);
    expect(errs.some((e) => e.includes("vine_lash: description must be 1-36"))).toBe(true);
    expect(errs.some((e) => e.includes("moves[1]") && e.includes("effects: unknown kind"))).toBe(true);
  });
});

describe("items.json", () => {
  it("is well formed and matches the loaded items", () => {
    const f = read<ItemsFile>("src/data/items.json");
    expect(itemsFileErrors(f)).toEqual([]);
    expect(f.items.map((i) => i.id)).toEqual(Object.keys(DATA.items));
  });
  it("names the item and field on a mistake", () => {
    const f = structuredClone(read<ItemsFile>("src/data/items.json"));
    f.items[0].pocket = "wallet" as never;
    f.items[0].price = -5;
    const errs = itemsFileErrors(f);
    expect(errs.some((e) => e.startsWith("items.json: items[0] terrarium_pod: pocket"))).toBe(true);
    expect(errs.some((e) => e.includes("terrarium_pod: price"))).toBe(true);
  });
});
