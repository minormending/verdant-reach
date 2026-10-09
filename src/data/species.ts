// Species data lives in ./species/<line>.json, one file per evolution line
// (format: docs/DATA.md). This module loads them at build time (Vite inlines
// the JSON) and checks each file's shape, so a bad edit fails loudly with the
// file and field rather than breaking a battle later. Balance and data tests
// still gate every change (src/battle/logic/balance.test.ts, src/data/*.test.ts).

import type { GrowthTrigger, PollinationGroup, Species, SpeciesId, Stats, TypeId } from "../contracts";
import { POLLINATION_GROUPS, SPECIES_IDS, TYPES } from "../contracts";

/** One evolution line as stored on disk. */
export interface SpeciesLineFile {
  format: "verdant.speciesline/1";
  line: string;
  pollination: PollinationGroup[];
  species: {
    id: SpeciesId;
    name: string;
    stage: 1 | 2 | 3;
    types: [TypeId] | [TypeId, TypeId];
    baseStats: Stats;
    growthRate: Species["growthRate"];
    catchRate: number;
    baseExp: number;
    evYield: Partial<Stats>;
    activity: Species["activity"];
    growsInto?: { species: SpeciesId; trigger: GrowthTrigger };
    learnset: [number, string][];
  }[];
}

const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
const RATES = ["fast", "medium", "slow"];
const ACTIVITY = ["any", "day", "night"];
const TRIGGERS = ["vigor", "vigor_day", "vigor_night", "tending", "item", "cross_pollination"];

/** Shape errors for one line file (empty when valid). Cross-file checks are in the data tests. */
export function speciesLineErrors(file: string, d: SpeciesLineFile): string[] {
  const errs: string[] = [];
  const at = (where: string, msg: string) => errs.push(`${file}: ${where}: ${msg}`);
  const isInt = (n: unknown) => typeof n === "number" && Number.isInteger(n);
  if (d.format !== "verdant.speciesline/1") at("format", `expected "verdant.speciesline/1"`);
  if (`${d.line}.json` !== file) at("line", `must match the file name (${file})`);
  if (!Array.isArray(d.pollination) || d.pollination.some((g) => !(POLLINATION_GROUPS as readonly string[]).includes(g))) at("pollination", "unknown group");
  if (!Array.isArray(d.species) || d.species.length === 0) at("species", "must be a non-empty array");
  for (const [i, s] of (d.species ?? []).entries()) {
    const w = `species[${i}] ${s.id ?? "?"}`;
    if (!(SPECIES_IDS as readonly string[]).includes(s.id)) at(w, "id is not in SPECIES_IDS (src/contracts/ids.ts)");
    if (typeof s.name !== "string" || !s.name || s.name.length > 12) at(w, "name must be 1-12 characters");
    if (![1, 2, 3].includes(s.stage)) at(w, "stage must be 1, 2 or 3");
    if (!Array.isArray(s.types) || s.types.length < 1 || s.types.length > 2 || s.types.some((t) => !(TYPES as readonly string[]).includes(t))) at(w, "types must be 1-2 known types");
    for (const k of STAT_KEYS) if (!isInt(s.baseStats?.[k]) || s.baseStats[k] < 1 || s.baseStats[k] > 255) at(w, `baseStats.${k} must be an integer 1-255`);
    if (!RATES.includes(s.growthRate)) at(w, `growthRate must be one of ${RATES.join(", ")}`);
    if (!isInt(s.catchRate) || s.catchRate < 3 || s.catchRate > 255) at(w, "catchRate must be an integer 3-255");
    if (!isInt(s.baseExp) || s.baseExp < 1) at(w, "baseExp must be a positive integer");
    for (const [k, v] of Object.entries(s.evYield ?? {})) if (!(STAT_KEYS as readonly string[]).includes(k) || !isInt(v)) at(w, `evYield.${k} is invalid`);
    if (!ACTIVITY.includes(s.activity)) at(w, `activity must be one of ${ACTIVITY.join(", ")}`);
    if (s.growsInto && (!(SPECIES_IDS as readonly string[]).includes(s.growsInto.species) || !TRIGGERS.includes(s.growsInto.trigger?.kind))) at(w, "growsInto needs a known species and trigger kind");
    if (!Array.isArray(s.learnset) || s.learnset.some((e) => !Array.isArray(e) || !isInt(e[0]) || e[0] < 1 || typeof e[1] !== "string")) at(w, "learnset entries must be [level, move]");
  }
  return errs;
}

const files = import.meta.glob<SpeciesLineFile>("./species/*.json", { eager: true, import: "default" });

function load(): Record<SpeciesId, Species> {
  const byId = new Map<SpeciesId, Species>();
  const errs: string[] = [];
  for (const [path, d] of Object.entries(files)) {
    const file = path.slice(path.lastIndexOf("/") + 1);
    errs.push(...speciesLineErrors(file, d));
    for (const s of d.species ?? []) {
      if (byId.has(s.id)) errs.push(`${file}: ${s.id} is defined twice`);
      byId.set(s.id, {
        id: s.id, name: s.name, line: d.line, stage: s.stage, types: s.types,
        baseStats: s.baseStats, growthRate: s.growthRate, catchRate: s.catchRate, baseExp: s.baseExp,
        evYield: s.evYield, activity: s.activity, growsInto: s.growsInto,
        learnset: s.learnset.map(([level, move]) => ({ level, move })),
        pollination: d.pollination,
      });
    }
  }
  if (errs.length) throw new Error(`Invalid species data:\n${errs.join("\n")}`);
  // SPECIES_IDS order, so iteration order is stable whatever the file layout.
  return Object.fromEntries(SPECIES_IDS.filter((id) => byId.has(id)).map((id) => [id, byId.get(id)!])) as Record<SpeciesId, Species>;
}

export const SPECIES = load();
