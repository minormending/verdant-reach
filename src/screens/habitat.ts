// Herbarium "FOUND IN": where a species grows wild, computed from the
// world's encounter tables (grass + bog), in map order, with a (DAY) or
// (NIGHT) tag when it only appears at one time. Pure; unit-tested.

import type { GameData, MapId, SpeciesId, WorldData } from "../contracts";
import { MAP_IDS } from "../contracts";

export interface Place { map: MapId; name: string; time: "any" | "day" | "night" }

export type Habitat =
  | { kind: "unknown" }                       // not seen yet
  | { kind: "wild"; places: Place[] }
  | { kind: "grown"; from: SpeciesId }        // only by growth from an earlier stage
  | { kind: "rare" };                         // gift / quest only

export function wildPlaces(world: Pick<WorldData, "maps">, species: SpeciesId): Place[] {
  const byName = new Map<string, { map: MapId; times: Set<"any" | "day" | "night"> }>();
  const order = [...MAP_IDS, ...Object.keys(world.maps ?? {}).filter((k) => !MAP_IDS.includes(k as MapId))] as MapId[];
  for (const id of order) {
    const def = world.maps?.[id];
    if (!def?.encounters) continue;
    for (const table of [def.encounters.grass, def.encounters.bog]) {
      for (const s of table?.slots ?? []) {
        if (s.species !== species || !(s.weight > 0) || !(table!.rate > 0)) continue;
        const name = (def.name || id.replace(/_/g, " ")).toUpperCase();
        let e = byName.get(name);
        if (!e) byName.set(name, (e = { map: id, times: new Set() }));
        e.times.add(s.time ?? "any");
      }
    }
  }
  return [...byName].map(([name, e]) => {
    const t = e.times;
    const time = t.has("any") || (t.has("day") && t.has("night")) ? "any" : t.has("night") ? "night" : "day";
    return { map: e.map, name, time };
  });
}

export function habitatOf(
  world: Pick<WorldData, "maps">, data: Pick<GameData, "species">, species: SpeciesId, seen: boolean,
): Habitat {
  if (!seen) return { kind: "unknown" };
  const places = wildPlaces(world, species);
  if (places.length) return { kind: "wild", places };
  const from = Object.values(data.species ?? {}).find((s) => s?.growsInto?.species === species);
  if (from) return { kind: "grown", from: from.id };
  return { kind: "rare" };
}

/** Text-box lines (each <= `cols`) for a habitat. Long names wrap with a one-space hanging indent. */
export function habitatLines(h: Habitat, nameOf: (id: SpeciesId) => string, cols = 18): string[] {
  switch (h.kind) {
    case "unknown": return ["UNKNOWN"];
    case "rare": return ["RARE", "No wild sightings."];
    case "grown": return ["Grows from", nameOf(h.from).toUpperCase()];
    case "wild": {
      const out: string[] = [];
      for (const p of h.places) {
        const tag = p.time === "day" ? " (DAY)" : p.time === "night" ? " (NIGHT)" : "";
        const full = p.name + tag;
        if (full.length <= cols) { out.push(full); continue; }
        // wrap words; the tag stays with the last word when it fits
        const words = full.split(" ");
        let line = "";
        for (const w of words) {
          const next = line ? `${line} ${w}` : w;
          if (next.length > cols && line) {
            out.push(line);
            line = ` ${w}`;
          } else line = next;
        }
        if (line) out.push(line);
      }
      return out;
    }
  }
}
