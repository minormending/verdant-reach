import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { WORLD } from '../../../src/world';
import type { MapDef } from '../../../src/contracts';
import { landmarkCoverage } from './maps';

const fixture = (): MapDef => ({
  id: 'route_1', name: 'TEST', outdoor: true, music: WORLD.maps.route_1.music,
  tiles: Array.from({ length: 18 }, () => '.'.repeat(24)),
  legend: { '.': 'grass', T: 'tree', S: 'sign' }, border: 'tree',
  structures: [], signs: [], npcs: [], warps: [], triggers: [],
});

describe('landmark coverage', () => {
  it('does not count ground or out-of-map border scenery', () => {
    const result = landmarkCoverage(fixture());
    expect(result.views).toBe(432);
    expect(result.percent).toBe(0);
    expect(result.status).toBe('WARN');
  });
  it('counts clusters of two, but not isolated decorative tiles', () => {
    const map = fixture();
    map.tiles[8] = '..........T.............';
    expect(landmarkCoverage(map).percent).toBe(0);
    map.tiles[8] = '..........TT............';
    expect(landmarkCoverage(map).percent).toBeGreaterThan(0);
    expect(landmarkCoverage(map).views).toBe(430);
  });
  it('counts signs and full structure footprints and respects collision', () => {
    const map = fixture();
    map.signs = [{ x: 12, y: 9, text: 'TEST' }];
    const sign = landmarkCoverage(map);
    expect(sign.covered).toBe(90);
    map.structures = [{ key: 'greenhouse', x: 10, y: 6 }];
    const building = landmarkCoverage(map);
    expect(building.covered).toBeGreaterThan(sign.covered);
    expect(building.views).toBeLessThan(sign.views);
  });
  it('uses separate town and route warning thresholds', () => {
    const map = fixture();
    map.signs = [{ x: 4, y: 4, text: '' }, { x: 14, y: 4, text: '' },
      { x: 4, y: 13, text: '' }, { x: 14, y: 13, text: '' }];
    const route = landmarkCoverage(map);
    expect(route.percent).toBeGreaterThanOrEqual(60);
    expect(route.percent).toBeLessThan(85);
    expect(route.status).toBe('PASS');
    expect(landmarkCoverage(map, true).status).toBe('WARN');
  });
  it('reports every outdoor map', () => {
    const towns = new Set(WORLD.glide.map(g => g.map));
    const rows = Object.values(WORLD.maps).filter(m => m.outdoor)
      .map(m => landmarkCoverage(m, towns.has(m.id)));
    expect(rows.length).toBeGreaterThan(10);
    expect(rows.every(r => r.views > 0)).toBe(true);
    if (process.env.ART_QA_MAPS === '1') {
      console.log('\nMap                       status coverage   views  target');
      for (const r of rows) console.log(`${r.id.padEnd(25)} ${r.status}   ${r.percent.toFixed(1).padStart(5)}% ${String(r.views).padStart(7)}  ${r.threshold}%`);
      const output = process.env.ART_QA_MAPS_JSON || '/tmp/art-qa-maps.json';
      writeFileSync(output, JSON.stringify({ schema: 'verdant.map-qa/1', maps: rows }, null, 2) + '\n');
      console.log(`JSON: ${output}`);
    }
  });
});
