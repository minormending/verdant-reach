import { describe, expect, it } from "vitest";
import type { TrainerDef } from "../contracts";
import { TRAINERS, TRAINERS_FILE } from "../world/trainers";
import { editedTrainers, installTrainers } from "./hook";

const entry = (id: string) => structuredClone(TRAINERS_FILE.trainers.find((e) => e.id === id)!);

describe("the ?trainerlab=1 hook", () => {
  it("builds the edited trainers, Council rematches included", () => {
    const seat = entry("belladonna");
    seat.team[2].level = 60;
    const { trainers, errors, count } = editedTrainers({ belladonna: seat });
    expect(errors).toEqual([]);
    expect(count).toBe(1);
    expect(trainers!.belladonna.team[2].level).toBe(60);
    expect(trainers!.belladonna_rematch.team[2].level).toBe(68);
    expect(Object.keys(trainers!)).toEqual(Object.keys(TRAINERS));
  });

  it("refuses edits that fail the checks", () => {
    const milo = entry("schoolkid_milo");
    milo.team = [];
    const r = editedTrainers({ schoolkid_milo: milo });
    expect(r.trainers).toBeUndefined();
    expect(r.errors.some((e) => e.includes("team must have 1-6 members"))).toBe(true);
  });

  it("replaces the world's trainers in place", () => {
    const target: Record<string, TrainerDef> = { a: TRAINERS.hollis, b: TRAINERS.nell };
    const keep = target;
    installTrainers(target, { c: TRAINERS.flora });
    expect(keep).toBe(target);
    expect(Object.keys(target)).toEqual(["c"]);
  });
});
