// A whole map drawn onto one canvas with the game's own renderer pieces:
// the overworld's tile resolution (autotile masks, ground variation, field-move
// state, conditional legends), structures, character sheets and the tall-grass
// overlay, all through the art registry. One tile of border frames the map so
// structures that rise above their footprint aren't clipped.

import type { MapDef, StructureKey } from "../contracts";
import { STRUCTURES, TILE, characterPath, structurePath, tilePath } from "../contracts";
import { buildMap, checkCond, refreshLegend, tileAt } from "../overworld/map";
import { autotileMask } from "../overworld/autotile";
import { assetCatalog, drawCell } from "../overworld/tilelayer";
import { drawCharacter, drawGrassOverlay, drawStructure, rowFor } from "../overworld/render";
import type { ArtRegistry } from "../art";

/** Tiles of border drawn around the map. */
export const MAP_MARGIN = 1;

export interface MapPicture {
  canvas: HTMLCanvasElement;
  /** Map size in tiles (without the margin). */
  w: number;
  h: number;
}

/** Map size in tiles (the longest row, as the engine measures it). */
export function mapSize(def: MapDef): { w: number; h: number } {
  return { w: Math.max(0, ...def.tiles.map((r) => Array.from(r).length)), h: def.tiles.length };
}

/** Draw `def` as it looks with `flags` set (unset flags read false, as in a new game). */
export async function renderMap(registry: ArtRegistry, def: MapDef, flags: Record<string, boolean> = {}, into?: HTMLCanvasElement): Promise<MapPicture> {
  await registry.ready();
  const m = buildMap(def);
  refreshLegend(m, flags);
  const cat = assetCatalog(registry);
  const x0 = -MAP_MARGIN;
  const y0 = -MAP_MARGIN;
  const W = m.w + MAP_MARGIN * 2;
  const H = m.h + MAP_MARGIN * 2;

  const cells = [];
  const paths = new Set<string>();
  for (let y = y0; y < y0 + H; y++) {
    for (let x = x0; x < x0 + W; x++) {
      const art = cat.resolve(tileAt(m, x, y), autotileMask(m, x, y), x, y);
      cells.push(art);
      paths.add(art.path);
      paths.add(tilePath(art.key));
    }
  }
  // NPCs visible in this story state. Trainers and item balls (the guide's subjects) also show
  // when their condition only names flags the block left unset.
  const unstated = (n: MapDef["npcs"][number]) => !(n.visibleWhen ?? []).some((c) => c.flag in flags);
  const npcs = def.npcs.filter((n) => !/^boarder_[12]$/.test(n.id)
    && (checkCond(n.visibleWhen, flags) || ((n.sprite === "item_pickup" || !!n.trainer) && unstated(n))));
  for (const s of def.structures ?? []) paths.add(structurePath(s.key));
  for (const n of npcs) paths.add(characterPath(n.sprite));
  paths.add(tilePath("tall_grass"));
  await registry.loadAll([...paths]);

  const c = into ?? document.createElement("canvas");
  c.width = W * TILE;
  c.height = H * TILE;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, c.width, c.height);
  for (let i = 0; i < cells.length; i++) drawCell(g, registry, cells[i], (i % W) * TILE, Math.floor(i / W) * TILE, false);

  // Y-sorted scenery and characters, as the overworld draws them.
  const ox = MAP_MARGIN * TILE;
  const oy = MAP_MARGIN * TILE;
  const items: { base: number; order: number; draw: () => void }[] = [];
  for (const s of def.structures ?? []) {
    const spec = STRUCTURES[s.key as StructureKey];
    if (!spec) continue;
    items.push({ base: (s.y + spec.h) * TILE, order: 0, draw: () => drawStructure(g, registry, s.key, ox + s.x * TILE, oy + s.y * TILE) });
  }
  for (const n of npcs) {
    items.push({
      base: (n.y + 1) * TILE, order: 1,
      draw: () => {
        const row = rowFor(n.id, n.sprite, n.facing, flags, () => false, n.stateFlag);
        const sx = ox + n.x * TILE;
        const sy = oy + n.y * TILE;
        drawCharacter(g, registry, n.sprite, 0, row, sx, sy - 4);
        if (tileAt(m, n.x, n.y) === "tall_grass") {
          drawGrassOverlay(g, registry, cat.resolve("tall_grass", autotileMask(m, n.x, n.y), n.x, n.y), sx, sy, false);
        }
      },
    });
  }
  items.sort((a, b) => a.base - b.base || a.order - b.order);
  for (const it of items) it.draw();
  return { canvas: c, w: m.w, h: m.h };
}
