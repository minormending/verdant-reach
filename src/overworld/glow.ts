// Pure GLOW geometry, shared by drawing and the dark-map progress validator.
// Positions are tile coordinates (integer = tile centre); fractional player
// coordinates let the light follow a walking actor without jumping ahead.

export interface GlowPosition { x: number; y: number }
export type GlowBand = "core" | "inner" | "outer" | "dark";
export const GLOW_RADIUS = { player: 1, lantern: 3, lamp: 2 } as const;

interface Light extends GlowPosition { radius: number }
const BANDS: readonly GlowBand[] = ["core", "inner", "outer", "dark"];

/** Strongest source wins: overlapping lamps never compound the darkness.
 *  Each round light has a fully visible core and two equal-width falloff bands.
 *  A null player yields just the stationary lamp light (validator). */
export function glowField(player: GlowPosition | null, lamps: readonly GlowPosition[], hasLantern: boolean) {
  const lights: Light[] = lamps.map((p) => ({ ...p, radius: GLOW_RADIUS.lamp }));
  if (player) lights.push({ ...player, radius: hasLantern ? GLOW_RADIUS.lantern : GLOW_RADIUS.player });
  return (x: number, y: number): GlowBand => {
    let best = 3;
    for (const light of lights) {
      const d2 = (x - light.x) ** 2 + (y - light.y) ** 2;
      const r2 = light.radius ** 2;
      const band = d2 <= r2 / 9 ? 0 : d2 <= r2 * 4 / 9 ? 1 : d2 <= r2 ? 2 : 3;
      best = Math.min(best, band);
      if (best === 0) break;
    }
    return BANDS[best];
  };
}

/** Bands at tile centres, row-major, without any rendering or map dependency. */
export function glowTiles(w: number, h: number, player: GlowPosition | null, lamps: readonly GlowPosition[], hasLantern: boolean): GlowBand[][] {
  const bandAt = glowField(player, lamps, hasLantern);
  return Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => bandAt(x, y)));
}

/** Tiles that light a dark map (2-tile radius each). */
export const LIGHT_TILES: ReadonlySet<string> = new Set(["lamp_post", "glow_pipe"]);

/** Find active light tiles through a caller's resolved legend/tile lookup. */
export function glowLamps(w: number, h: number, tile: (x: number, y: number) => string | undefined): GlowPosition[] {
  const lamps: GlowPosition[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (LIGHT_TILES.has(tile(x, y) ?? "")) lamps.push({ x, y });
  }
  return lamps;
}
