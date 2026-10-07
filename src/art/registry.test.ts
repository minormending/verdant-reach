import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyIndex, type IndexPack } from "./format";
import { ArtRegistry, PACKS_STORAGE_KEY } from "./registry";

const tree = (name: string, files: string[]): IndexPack => ({
  name, description: "Test metadata", author: "Test", species: {}, tilesets: {}, structures: {},
  characters: { player: files }, sets: {},
});
const baseIndex = () => ({
  ...emptyIndex(), characters: { player: ["sheet.png"] },
  packs: { classic: tree("Classic", ["sheet.png"]), traced: tree("Traced", ["sheet.png"]) },
});
const localIndex = () => ({ ...emptyIndex(), packs: { limezu: tree("Local test pack", ["tall.png"]) } });
const character = (sheet: string, frame: [number, number]) => ({ sheet, frame });

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.stubGlobal("location", { search: "" });
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: vi.fn() });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function mockFetch(local: unknown = localIndex(), root = "art/") {
  const files: Record<string, unknown> = {
    [`${root}index.json`]: baseIndex(),
    [`${root}characters/player/character.json`]: character("sheet.png", [16, 16]),
    [`${root}packs/classic/characters/player/character.json`]: character("sheet.png", [16, 16]),
    [`${root}packs/traced/characters/player/character.json`]: character("sheet.png", [16, 16]),
    [`${root}packs/limezu/characters/player/character.json`]: character("tall.png", [16, 32]),
  };
  const fetcher = vi.fn(async (url: string) => {
    if (url === `${root}packs/limezu/index.json`) {
      if (local instanceof Error) throw local;
      if (local instanceof Response) return local;
      return new Response(JSON.stringify(local));
    }
    return url in files ? new Response(JSON.stringify(files[url])) : new Response("", { status: 404 });
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

describe("local packs at startup", () => {
  it("discovers, merges and enables local packs by default before loading bundle art", async () => {
    const fetcher = mockFetch();
    const reg = new ArtRegistry();
    await Promise.all([reg.ready(), reg.ready()]);
    expect(reg.loaded).toBe(true);
    expect(reg.indexLoaded).toBe(true);
    expect(reg.activePacks()).toEqual(["limezu"]);
    expect(reg.characterFrame("player")).toEqual([16, 32]);
    expect(reg.resolve("assets/characters/player.png")?.url).toBe("art/packs/limezu/characters/player/tall.png");
    expect(reg.packs()).toContainEqual({ id: "limezu", name: "Local test pack", description: "Test metadata", author: "Test", local: true });
    expect(reg.packs().find((p) => p.id === "classic")?.local).toBe(false);
    expect(fetcher.mock.calls.filter(([u]) => u === "art/packs/limezu/index.json")).toHaveLength(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it.each(["?art=classic,traced", "?art= classic , traced "])("keeps locals below URL packs: %s", async (search) => {
    mockFetch();
    vi.stubGlobal("location", { search });
    const reg = new ArtRegistry();
    await reg.ready();
    expect(reg.activePacks()).toEqual(["limezu", "classic", "traced"]);
    expect(reg.resolve("assets/characters/player.png")?.url).toBe("art/packs/traced/characters/player/sheet.png");
  });

  it.each(["?art=base", "?art=base,classic"])("disables local defaults with %s", async (search) => {
    mockFetch();
    vi.stubGlobal("location", { search });
    const reg = new ArtRegistry();
    await reg.ready();
    expect(reg.activePacks()).toEqual(search.endsWith("classic") ? ["classic"] : []);
    expect(reg.characterFrame("player")).toEqual([16, 16]);
    expect(reg.packs().find((p) => p.id === "limezu")?.local).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it("keeps local defaults for an empty URL selection and ignores saved packs", async () => {
    mockFetch();
    vi.stubGlobal("location", { search: "?art=" });
    vi.stubGlobal("localStorage", { getItem: () => '["base","classic"]' });
    const reg = new ArtRegistry();
    await reg.ready();
    expect(reg.activePacks()).toEqual(["limezu"]);
  });

  it("keeps explicit local selection order without duplicates", async () => {
    mockFetch();
    const reg = new ArtRegistry({ packs: ["classic", "limezu", "limezu"] });
    await reg.ready();
    expect(reg.activePacks()).toEqual(["classic", "limezu"]);
    expect(reg.characterFrame("player")).toEqual([16, 32]);
  });

  it.each([
    ["404", () => new Response("", { status: 404 })],
    ["server error", () => new Response("", { status: 503 })],
    ["network error", () => new Error("offline")],
    ["invalid JSON", () => new Response("<html>SPA fallback</html>")],
    ["invalid format", () => ({ ...localIndex(), format: "wrong" })],
    ["malformed file lists", () => ({ ...localIndex(), packs: { limezu: { ...tree("Bad", []), characters: { player: 42 } } } })],
    ["wrong pack id", () => ({ ...emptyIndex(), packs: { other: tree("Other", []) } })],
  ])("silently preserves base fallback for %s", async (_name, local) => {
    mockFetch(local());
    const reg = new ArtRegistry();
    await reg.ready();
    expect(reg.index).toEqual(baseIndex());
    expect(reg.activePacks()).toEqual([]);
    expect(reg.characterFrame("player")).toEqual([16, 16]);
    expect(reg.resolve("assets/characters/player.png")?.url).toBe("art/characters/player/sheet.png");
    expect(reg.packs().every((p) => !p.local)).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it("still enables URL packs when the local index is missing", async () => {
    mockFetch(new Response("", { status: 404 }));
    vi.stubGlobal("location", { search: "?art=traced,classic" });
    const reg = new ArtRegistry();
    await reg.ready();
    expect(reg.activePacks()).toEqual(["traced", "classic"]);
    expect(reg.resolve("assets/characters/player.png")?.url).toBe("art/packs/classic/characters/player/sheet.png");
    expect(warn).not.toHaveBeenCalled();
  });

  it("honours saved packs below the URL and uses a custom art root", async () => {
    mockFetch(localIndex(), "./custom/art/");
    vi.stubGlobal("localStorage", { getItem: () => '["classic"]' });
    const reg = new ArtRegistry({ artRoot: "./custom/art/" });
    await reg.ready();
    expect(reg.activePacks()).toEqual(["limezu", "classic"]);
    expect(reg.resolve("assets/characters/player.png")?.url).toBe("./custom/art/packs/classic/characters/player/sheet.png");
  });

  it("persists disabled locals and preserves them in the Art Lab Play selection", async () => {
    mockFetch();
    const setItem = vi.fn();
    let stored: string | null = null;
    vi.stubGlobal("localStorage", { getItem: () => stored, setItem });
    const reg = new ArtRegistry();
    await reg.ready();
    reg.setActivePacks(["classic"], true);
    expect(reg.packSelection()).toEqual(["base", "classic"]);
    expect(setItem).toHaveBeenCalledWith(PACKS_STORAGE_KEY, '["base","classic"]');
    stored = '["base","classic"]';
    const next = new ArtRegistry();
    await next.ready();
    expect(next.activePacks()).toEqual(["classic"]);
    next.setActivePacks(["limezu", "classic"], true);
    expect(next.packSelection()).toEqual(["limezu", "classic"]);
    expect(setItem).toHaveBeenLastCalledWith(PACKS_STORAGE_KEY, '["limezu","classic"]');
  });

  it("keeps compare forks exact while carrying local pack tags", async () => {
    mockFetch();
    const reg = new ArtRegistry();
    await reg.ready();
    const base = reg.fork([]);
    expect(base.activePacks()).toEqual([]);
    expect(base.characterFrame("player")).toEqual([16, 16]);
    expect(base.packs().find((p) => p.id === "limezu")?.local).toBe(true);
    expect(reg.fork(["limezu"]).characterFrame("player")).toEqual([16, 32]);
  });
});
