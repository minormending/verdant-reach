import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DATA } from "../data";
import { buildTrainers, type TrainerEntry } from "../world/trainerFile";
import { TRAINER_LINES, TRAINERS_FILE } from "../world/trainers";
import { applyEdits, diffEntry, diffFile, editsFromFile, exportText, namesFrom, pruneEdits, sameEntry, setEdit, validate } from "./edits";

const base = TRAINERS_FILE;
const ctx = { data: DATA, lines: TRAINER_LINES };
const names = namesFrom(DATA);
const entry = (id: string) => structuredClone(base.trainers.find((e) => e.id === id)!);

describe("edits", () => {
  it("exports the shipped file byte for byte when nothing changed", () => {
    expect(exportText(base, {})).toBe(readFileSync("src/data/trainers.json", "utf8"));
  });

  it("records an edit, and drops it when the entry matches the shipped one again", () => {
    const milo = entry("schoolkid_milo");
    milo.team[0].level = 7;
    let edits = setEdit(base, {}, milo);
    expect(Object.keys(edits)).toEqual(["schoolkid_milo"]);
    expect(applyEdits(base, edits).trainers[0].team[0].level).toBe(7);
    milo.team[0].level = 4;
    edits = setEdit(base, edits, milo);
    expect(edits).toEqual({});
    expect(setEdit(base, {}, { ...milo, id: "nobody" })).toEqual({});
  });

  it("keeps the shipped order and every other trainer", () => {
    const hollis = entry("hollis");
    hollis.items = [...(hollis.items ?? []), { item: "spring_water", qty: 1 }];
    const file = applyEdits(base, setEdit(base, {}, hollis));
    expect(file.trainers.map((t) => t.id)).toEqual(base.trainers.map((t) => t.id));
    expect(file.trainers.filter((t, i) => !sameEntry(t, base.trainers[i])).map((t) => t.id)).toEqual(["hollis"]);
    expect(validate(file, ctx).errors).toEqual([]);
    const built = buildTrainers(file, ctx);
    expect(built.hollis.items).toEqual([{ item: "water_flask", qty: 2 }, { item: "spring_water", qty: 1 }]);
  });

  it("prunes stale edits and imports a whole file as edits", () => {
    const milo = entry("schoolkid_milo");
    milo.team[0].level = 9;
    expect(pruneEdits(base, { schoolkid_milo: milo, ghost: { ...milo, id: "ghost" }, hollis: entry("hollis") })).toEqual({ schoolkid_milo: milo });
    const file = applyEdits(base, { schoolkid_milo: milo });
    const imported = editsFromFile(base, { ...file, trainers: [...file.trainers.slice(0, -1), { ...milo, id: "extra" }] });
    expect(Object.keys(imported.edits)).toEqual(["schoolkid_milo"]);
    expect(imported.unknown).toEqual(["extra"]);
    expect(imported.missing).toEqual([base.trainers.at(-1)!.id]);
  });

  it("says what changed in words", () => {
    const before = entry("hollis");
    const after: TrainerEntry = structuredClone(before);
    after.team[0].level = 9;
    after.team[1].moves = undefined;
    after.team[1].grafted = true;
    after.prize = undefined;
    after.ai = "basic";
    after.items = undefined;
    const d = diffEntry(before, after, names);
    expect(d).toContain("#1 Fiddlehead: level 8 → 9");
    expect(d.some((x) => x.startsWith("#2 ") && x.includes("→ default moves"))).toBe(true);
    expect(d.some((x) => x.includes("now grafted"))).toBe(true);
    expect(d).toContain("prize: 1100 → default (200)");
    expect(d).toContain("AI: smart → basic");
    expect(d).toContain("bag: Water Flask x2 → none");
    const swap = structuredClone(before);
    swap.team.reverse();
    expect(diffEntry(before, swap, names)[0]).toMatch(/^team: /);
    expect(diffFile(base, { hollis: after }, names)).toEqual([{ id: "hollis", label: "WARDEN HOLLIS", changes: d }]);
  });

  it("validates with the build's own check, sorted by trainer", () => {
    const milo = entry("schoolkid_milo");
    milo.team[0].moves = ["vine_lash", "vine_lash"];
    const v = validate(applyEdits(base, { schoolkid_milo: milo }), ctx);
    expect(v.byTrainer.get("schoolkid_milo")).toEqual(["team[0]: moves must be unique"]);
    expect(v.general).toEqual([]);
  });
});
