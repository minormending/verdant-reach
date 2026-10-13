// src/data/trainers.json (docs/DATA.md § Trainers): well formed, canonical, and
// built into TRAINERS with the dialogue from src/world/trainers.ts.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DATA } from "../data";
import { REMATCH_LINES } from "./rematches";
import {
  buildTrainers, defaultPrize, formatTrainersFile, linesKey, normalizeEntry, parseTrainersFile, prizeOf,
  trainersFileErrors, type TrainersFile,
} from "./trainerFile";
import { TRAINER_LINES, TRAINERS } from "./trainers";

const TEXT = readFileSync("src/data/trainers.json", "utf8");
const FILE = JSON.parse(TEXT) as TrainersFile;
const ctx = { data: DATA, lines: TRAINER_LINES };
const bad = (edit: (f: TrainersFile) => void) => {
  const f = structuredClone(FILE);
  edit(f);
  return trainersFileErrors(f, ctx);
};

describe("trainers.json", () => {
  it("is well formed, with every trainer joined to its lines", () => {
    expect(trainersFileErrors(FILE, ctx)).toEqual([]);
  });

  it("is in canonical form, so an unchanged export is byte-identical", () => {
    expect(formatTrainersFile(FILE)).toBe(TEXT);
    expect(parseTrainersFile(TEXT).file).toEqual(FILE);
    for (const t of FILE.trainers) expect(normalizeEntry(t)).toEqual(t);
  });

  it("builds TRAINERS in file order, then the Council rematches at +8", () => {
    const seats = FILE.trainers.filter((t) => `${t.id}_rematch` in REMATCH_LINES).map((t) => t.id);
    expect(seats).toEqual(["belladonna", "mimi_osa", "titus_arum", "pyra", "rowan"]);
    expect(Object.keys(TRAINERS)).toEqual([...FILE.trainers.map((t) => t.id), ...seats.map((id) => `${id}_rematch`)]);
    for (const id of seats) {
      expect(TRAINERS[`${id}_rematch`].team.map((m) => m.level)).toEqual(TRAINERS[id].team.map((m) => m.level + 8));
    }
    expect(buildTrainers(FILE, ctx)).toEqual(TRAINERS);
  });

  it("carries every field the game reads", () => {
    for (const e of FILE.trainers) {
      const t = TRAINERS[e.id];
      expect(t.prize, e.id).toBe(prizeOf(e));
      expect([t.name, t.className, t.portrait, t.ai, t.music, t.mark, t.items]).toEqual([e.name, e.className, e.portrait, e.ai, e.music, e.mark, e.items]);
      expect(t.team).toEqual(e.team);
      const lines = TRAINER_LINES[linesKey(e.id, TRAINER_LINES)!];
      expect([t.intro, t.defeat, t.after]).toEqual([lines.intro, lines.defeat, lines.after]);
    }
    expect(TRAINERS.hollis.prize).toBe(1100);
    expect(TRAINERS.schoolkid_milo.prize).toBe(defaultPrize(TRAINERS.schoolkid_milo.team));
    expect(TRAINERS.rival_4_oak.intro).toBe(TRAINER_LINES.rival_4.intro);
  });

  it("stores a prize only where it differs from the default rule", () => {
    for (const t of FILE.trainers) if (t.prize !== undefined) expect(t.prize, t.id).not.toBe(defaultPrize(t.team));
  });

  it("shares nothing mutable between the file and TRAINERS", () => {
    const f = structuredClone(FILE);
    const built = buildTrainers(f, ctx);
    f.trainers[0].team[0].level = 99;
    f.trainers.find((t) => t.items)!.items![0].qty = 9;
    expect(built[f.trainers[0].id].team[0].level).not.toBe(99);
    expect(Object.values(built).some((t) => t.items?.some((i) => i.qty === 9))).toBe(false);
  });
});

describe("trainersFileErrors", () => {
  it("names the trainer and field", () => {
    const errs = bad((f) => {
      const t = f.trainers[0];
      t.team[0].species = "triffid" as never;
      t.team[0].level = 101;
      t.team.push(...Array.from({ length: 6 }, () => ({ species: "oak_acorn" as const, level: 5 })));
      t.portrait = "player_back";
      t.ai = "genius" as never;
      t.music = "battle_wild" as never;
    });
    expect(errs).toContain("trainers.json: trainers[0] schoolkid_milo: team[0]: unknown species triffid");
    expect(errs).toContain("trainers.json: trainers[0] schoolkid_milo: team[0]: level must be a whole number 1-100");
    expect(errs).toContain("trainers.json: trainers[0] schoolkid_milo: team must have 1-6 members");
    expect(errs.some((e) => e.includes("portrait player_back is not a trainer portrait"))).toBe(true);
    expect(errs.some((e) => e.includes("ai must be basic or smart"))).toBe(true);
    expect(errs.some((e) => e.includes("music must be one of"))).toBe(true);
  });

  it("checks moves: at most four, unique, known", () => {
    const errs = bad((f) => {
      const hollis = f.trainers.find((t) => t.id === "hollis")!;
      hollis.team[0].moves = ["vine_lash", "vine_lash"];
      hollis.team[1].moves = ["vine_lash", "curl_up", "sap_drain", "thorn_jab", "sap_seal"];
      f.trainers[0].team[0].moves = ["laser"];
    });
    expect(errs.some((e) => e.includes("hollis: team[0]: moves must be unique"))).toBe(true);
    expect(errs.some((e) => e.includes("hollis: team[1]: moves must list 1-4 moves"))).toBe(true);
    expect(errs.some((e) => e.includes("schoolkid_milo: team[0]: unknown move laser"))).toBe(true);
  });

  it("checks the bag, prize and mark", () => {
    const errs = bad((f) => {
      const hollis = f.trainers.find((t) => t.id === "hollis")!;
      hollis.items = [{ item: "water_flask", qty: 0 }, { item: "water_flask", qty: 1 }, { item: "moon_rock", qty: 1 }];
      hollis.prize = -1;
      f.trainers.find((t) => t.id === "nell")!.mark = "bramble_mark";
    });
    expect(errs.some((e) => e.includes("hollis: items[0]: qty must be a whole number, at least 1"))).toBe(true);
    expect(errs.some((e) => e.includes("hollis: items[1]: water_flask is listed twice"))).toBe(true);
    expect(errs.some((e) => e.includes("hollis: items[2]: unknown item moon_rock"))).toBe(true);
    expect(errs.some((e) => e.includes("hollis: prize must be a whole number"))).toBe(true);
    expect(errs.some((e) => e.includes("nell: mark bramble_mark is already awarded by hollis"))).toBe(true);
  });

  it("joins every trainer to its lines, and every set of lines to a trainer", () => {
    const errs = bad((f) => {
      f.trainers[0].id = "schoolkid_nobody";
      f.trainers.push({ ...structuredClone(f.trainers[1]) });
      f.trainers.push({ ...structuredClone(f.trainers[2]), id: "belladonna_rematch" });
    });
    expect(errs).toContain("trainers.json: trainers[0] schoolkid_nobody: has no dialogue lines (add them in src/world/trainers.ts)");
    expect(errs).toContain('trainers.json: no trainer uses the dialogue lines "schoolkid_milo" (src/world/trainers.ts)');
    expect(errs.some((e) => e.includes("gardener_rosa: id is defined twice"))).toBe(true);
    expect(errs.some((e) => e.includes("belladonna_rematch: ids ending _rematch are built from the Council seats"))).toBe(true);
  });

  it("reads a rival variant's lines from its battle", () => {
    expect(linesKey("rival_2_lily", TRAINER_LINES)).toBe("rival_2");
    expect(linesKey("hollis", TRAINER_LINES)).toBe("hollis");
    expect(linesKey("nobody_oak", TRAINER_LINES)).toBeNull();
  });

  it("rejects the wrong format and refuses to build an invalid file", () => {
    const f = structuredClone(FILE);
    (f as { format: string }).format = "verdant.trainers/0";
    expect(trainersFileErrors(f, ctx)[0]).toBe('trainers.json: format: expected "verdant.trainers/1"');
    expect(() => buildTrainers(f, ctx)).toThrow(/Invalid trainer data/);
    expect(parseTrainersFile("{ nope").error).toMatch(/not valid JSON/);
  });
});
