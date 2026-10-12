// Which maps use which tile keys, from the map rows, `legend`, every
// `legendWhen` variant, the border tile, and the tiles a field move or a
// filled pit turns a cell into. Pure: no DOM; unit-tested.

import type { MapDef, MapId, TileKey } from "../contracts";
import { FIELD_MOVE_FX, fieldMoveOf } from "../overworld/fieldmove";

export interface MapKeyUse {
  /** Cells drawn with the key in a new game (the base legend). */
  cells: number;
  /** Cells that show the key only in some story state (legendWhen, field moves, filled pits). */
  cond: number;
  /** The key is the map's border (drawn beyond its edges). */
  border: boolean;
}

export interface KeyUsage {
  maps: Map<MapId, MapKeyUse>;
  cells: number;
  cond: number;
}

export interface MapUsage {
  /** Every key the map can show, in any story state. */
  keys: Set<TileKey>;
  /** Flags named by the map's `legendWhen` conditions (the story states that change its tiles). */
  flags: string[];
}

export interface UsageIndex {
  keys: Map<TileKey, KeyUsage>;
  maps: Map<MapId, MapUsage>;
}

function use(idx: UsageIndex, key: TileKey, map: MapId): MapKeyUse {
  let k = idx.keys.get(key);
  if (!k) { k = { maps: new Map(), cells: 0, cond: 0 }; idx.keys.set(key, k); }
  let m = k.maps.get(map);
  if (!m) { m = { cells: 0, cond: 0, border: false }; k.maps.set(map, m); }
  idx.maps.get(map)!.keys.add(key);
  return m;
}

export function usageIndex(maps: readonly MapDef[]): UsageIndex {
  const idx: UsageIndex = { keys: new Map(), maps: new Map() };
  for (const def of maps) {
    const flags = new Set<string>();
    for (const e of def.legendWhen ?? []) for (const c of e.when) flags.add(c.flag);
    idx.maps.set(def.id, { keys: new Set(), flags: [...flags].sort() });
    // How often each row character appears.
    const chars = new Map<string, number>();
    for (const row of def.tiles) for (const ch of Array.from(row)) chars.set(ch, (chars.get(ch) ?? 0) + 1);
    const add = (key: TileKey, n: number, cond: boolean) => {
      const m = use(idx, key, def.id);
      const k = idx.keys.get(key)!;
      if (cond) { m.cond += n; k.cond += n; } else { m.cells += n; k.cells += n; }
    };
    const alsoBecomes = (key: TileKey, n: number) => {
      const move = fieldMoveOf(key);
      if (move) add(FIELD_MOVE_FX[move].cleared, n, true);
      if (key === "pit") add("filled_pit", n, true);
    };
    for (const [ch, n] of chars) {
      const key = def.legend[ch];
      if (!key) continue;
      add(key, n, false);
      alsoBecomes(key, n);
    }
    for (const e of def.legendWhen ?? []) {
      for (const [ch, key] of Object.entries(e.legend)) {
        const n = chars.get(ch) ?? 0;
        if (!n) continue;
        add(key, n, true);
        alsoBecomes(key, n);
      }
    }
    use(idx, def.border, def.id).border = true;
  }
  return idx;
}

/** "12 maps · 3,410 cells (+40 in some story states)". */
export function usageLabel(u: KeyUsage | undefined): string {
  if (!u || u.maps.size === 0) return "unused";
  const n = (x: number) => x.toLocaleString("en-US");
  const borders = [...u.maps.values()].filter((m) => m.border).length;
  return `${u.maps.size} map${u.maps.size === 1 ? "" : "s"} · ${n(u.cells)} cell${u.cells === 1 ? "" : "s"}`
    + (u.cond ? ` (+${n(u.cond)} in some story states)` : "")
    + (borders ? ` · border of ${borders}` : "");
}
