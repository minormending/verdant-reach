// Field moves (HM equivalents, no move slots). Generic framework:
//   tile property (TILES[key].fieldMove) -> key item (FIELD_MOVES[move].item)
//   -> prompt -> flag `<flag>_<map>_<x>_<y>` -> the cell reads as `cleared` forever.
// A new field move (Uproot, Raft, Glow...) is one entry in FIELD_MOVE_FX plus its
// contract entry; the overworld does the rest. Pure (no DOM); unit-tested.

import type { FieldMove, MapDef, MapId, SfxId, TileKey, TileProps } from "../contracts";
import { FIELD_MOVES, TILES } from "../contracts";

export interface FieldMoveFx {
  /** Display name, as in "OAK ACORN used PRUNE!". */
  name: string;
  /** Flag prefix: `${flag}_${map}_${x}_${y}` marks a cleared cell. */
  flag: string;
  /** What a cleared cell reads (and draws) as. */
  cleared: TileKey;
  /** Said when the player lacks the key item. */
  locked: string;
  /** Yes/no prompt when the player has it. */
  prompt: string;
  sfx: SfxId;
  /** Particle burst played as the tile clears. */
  particles: "snip";
}

export const FIELD_MOVE_FX: Record<FieldMove, FieldMoveFx> = {
  prune: {
    name: "PRUNE",
    flag: "pruned",
    cleared: "bramble_stump",
    locked: "A thorny tangle. It needs PRUNING.",
    prompt: "A thorny tangle. PRUNE it?",
    sfx: "prune",
    particles: "snip",
  },
};

export function fieldMoveOf(t: TileKey): FieldMove | undefined {
  return ((TILES as Record<string, TileProps>)[t])?.fieldMove;
}

export function fieldMoveItem(move: FieldMove): string {
  return FIELD_MOVES[move].item;
}

export const fieldMoveFlag = (move: FieldMove, map: MapId, x: number, y: number) =>
  `${FIELD_MOVE_FX[move].flag}_${map}_${x}_${y}`;

/** Every cell that could ever hold a field-move tile (base legend or any `legendWhen`). */
export function fieldMoveCells(def: MapDef): { x: number; y: number }[] {
  const chars = new Set<string>();
  const scan = (legend: Record<string, TileKey>) => {
    for (const [ch, t] of Object.entries(legend)) if (fieldMoveOf(t)) chars.add(ch);
  };
  scan(def.legend ?? {});
  for (const o of def.legendWhen ?? []) scan(o.legend);
  if (chars.size === 0) return [];
  const out: { x: number; y: number }[] = [];
  def.tiles.forEach((row, y) => Array.from(row).forEach((ch, x) => { if (chars.has(ch)) out.push({ x, y }); }));
  return out;
}
