/** Read-only landmark coverage using the game's default map and collision data. */
import { STRUCTURES, type MapDef } from '../../../src/contracts';
import { buildMap, isWalkable, tileAt } from '../../../src/overworld/map';

// Ground textures and traversal surfaces cannot provide orientation landmarks.
// Explicit keys avoid classifying an entire flower meadow or water body as one.
const GROUND = new Set([
  'grass', 'tall_grass', 'flowers', 'flowers_red', 'flowers_yellow', 'path',
  'dirt', 'sand', 'bog', 'boardwalk', 'water', 'stone_path', 'bridge',
  'paving', 'tropical_grass', 'stepping_stones', 'floor_wood', 'floor_tile',
  'floor_greenhouse', 'floor_marble', 'stage_floor', 'cable_floor', 'moss',
  'salt_flat', 'cactus_scrub', 'basalt_floor', 'pier', 'seagrass_bed',
  'ash', 'burnt_grass', 'void', 'mat_exit', 'rug', 'water_channel', 'pond_lily',
  'ice', 'snow', 'snow_grass', 'scree', 'frozen_shore', 'red_water', 'hideout_floor',
  'desert_scrub', 'cracked_earth', 'resin_floor',
]);

export function landmarkCoverage(def: MapDef, town = false) {
  const map = buildMap(def);
  const candidate = new Set<string>();
  const landmarks = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    const tile = tileAt(map, x, y);
    if (tile === 'sign') landmarks.add(key(x, y));
    if (!GROUND.has(tile)) candidate.add(key(x, y));
  }
  const visited = new Set<string>();
  for (const cell of candidate) {
    if (visited.has(cell)) continue;
    const queue = [cell];
    visited.add(cell);
    for (let n = 0; n < queue.length; n++) {
      const [x, y] = queue[n].split(',').map(Number);
      for (const [xx, yy] of [[x-1, y], [x+1, y], [x, y-1], [x, y+1]]) {
        const next = key(xx, yy);
        if (candidate.has(next) && !visited.has(next)) {
          visited.add(next); queue.push(next);
        }
      }
    }
    if (queue.length >= 2) for (const cell of queue) landmarks.add(cell);
  }
  for (const sign of def.signs) landmarks.add(key(sign.x, sign.y));
  for (const s of def.structures) {
    const spec = STRUCTURES[s.key];
    for (let y = 0; y < spec.h; y++) for (let x = 0; x < spec.w; x++) {
      landmarks.add(key(s.x+x, s.y+y));
    }
  }
  let views = 0, covered = 0;
  const uncovered: { x: number; y: number }[] = [];
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    if (!isWalkable(map, x, y)) continue;
    views++;
    // camForTile centres at (4,4); no clamping in the game's follow camera.
    let found = false;
    for (let yy = y-4; yy < y+5 && !found; yy++) {
      for (let xx = x-4; xx < x+6; xx++) if (landmarks.has(key(xx, yy))) {
        found = true; break;
      }
    }
    if (found) covered++;
    else uncovered.push({ x, y });
  }
  const percent = views ? covered / views * 100 : 0;
  const threshold = town ? 85 : 60;
  return { id: def.id, kind: town ? 'town' : 'route/scenery', views, covered,
    percent, threshold, status: percent < threshold ? 'WARN' : 'PASS',
    landmarkTiles: landmarks.size, uncovered };
}
