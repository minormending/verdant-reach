import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TYPES, type Quickened, type ScriptCmd } from "../../contracts";
import { DATA } from "../../data";
import { expForLevel } from "../../data/growth";
import { WORLD } from "../../world";
import { expToLevel } from "../../battle/logic/exp";
import { WALKTHROUGH } from "../../guide/walkthrough";
import type { ArtIndex } from "../../art/format";
import {
  baseStatTotals, bundleKinds, catchCurves, contentCounts, damageSpread, expCurves, layoutModuleGraph, layoutWarpGraph,
  levelCurve, mapSizes, sampleCatchRates, scriptOps, scriptOpsFromSource, speciesByType, storyMapOrder, typeMatrix, walkCmds, warpGraph,
} from "./data";
import { countTests, folderOf, importSpecifiers, resolveRelative, sourceStats } from "./sourceStats";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const read = (p: string) => readFileSync(ROOT + p, "utf8");

describe("exp-curves", () => {
  it("matches the growth formulas (n^3 * 4/5, n^3, n^3 * 5/4) and exp.ts", () => {
    const curves = expCurves(DATA);
    expect(curves.map((c) => c.rate)).toEqual(["fast", "medium", "slow"]);
    for (const c of curves) {
      expect(c.points).toHaveLength(100);
      expect(c.points[0]).toEqual({ level: 1, exp: 0 });
      for (const { level, exp } of c.points) {
        const n3 = level ** 3;
        const want = level === 1 ? 0 : c.rate === "fast" ? Math.floor((4 * n3) / 5) : c.rate === "medium" ? n3 : Math.floor((5 * n3) / 4);
        expect(exp).toBe(want);
        expect(exp).toBe(expForLevel(c.rate, level));
      }
    }
    const sp = Object.values(DATA.species).find((s) => s.growthRate === "slow")!;
    const q = { species: sp.id } as Quickened;
    expect(curves[2].points[49].exp).toBe(expToLevel(DATA, q, 50));
    expect(curves.reduce((a, c) => a + c.species, 0)).toBe(Object.keys(DATA.species).length);
  });
});

describe("type-chart", () => {
  it("has every pair and reads the chart (missing = 1)", () => {
    const { types, cells } = typeMatrix(DATA);
    expect(types).toEqual([...TYPES]);
    expect(cells).toHaveLength(TYPES.length ** 2);
    for (const c of cells) expect(c.mult).toBe(DATA.typeChart[c.atk]?.[c.def] ?? 1);
    expect(cells.find((c) => c.atk === "wood" && c.def === "water")!.mult).toBe(2);
  });
});

describe("catch-curve", () => {
  it("follows the Gen 2 catch value and (a/255)^(1/4) checks", () => {
    const rates = sampleCatchRates(DATA);
    const all = Object.values(DATA.species).map((s) => s.catchRate);
    expect(rates[0].rate).toBe(Math.min(...all));
    expect(rates[rates.length - 1].rate).toBe(Math.max(...all));
    for (const s of catchCurves(DATA)) {
      expect(s.points).toHaveLength(100);
      for (const { hpPct, p } of s.points) {
        const M = 100, H = hpPct;
        let a = Math.floor(((3 * M - 2 * H) * s.catchRate) / (3 * M));
        if (s.status === "dormant") a += 10;
        a = Math.max(1, Math.min(255, a));
        const want = a >= 255 ? 1 : ((a / 255) ** 0.25) ** 4;
        expect(p).toBeCloseTo(want, 12);
      }
      // Lower HP never lowers the odds.
      for (let i = 1; i < s.points.length; i++) expect(s.points[i].p).toBeGreaterThanOrEqual(s.points[i - 1].p);
    }
  });
});

describe("damage-spread", () => {
  const sample = damageSpread(DATA);
  it("uses a real damaging move and rolls 85..100", () => {
    expect(sample.power).toBeGreaterThan(0);
    for (const s of sample.scenarios) {
      expect(s.damages).toHaveLength(16);
      for (let i = 1; i < 16; i++) expect(s.damages[i]).toBeGreaterThanOrEqual(s.damages[i - 1]);
    }
  });
  it("matches the Gen 2 formula by hand for the neutral STAB hit", () => {
    const atk = Object.values(DATA.species).find((s) => s.name === sample.attacker)!;
    const def = Object.values(DATA.species).find((s) => s.name === sample.defender)!;
    const move = Object.values(DATA.moves).find((m) => m.name === sample.move)!;
    const L = sample.level;
    const stat = (base: number, iv: number) => Math.floor((((base + iv) * 2) * L) / 100) + 5;
    const special = move.category === "special";
    const A = special ? stat(atk.baseStats.spa, 8) : stat(atk.baseStats.atk, 9);
    const D = special ? stat(def.baseStats.spd, 8) : stat(def.baseStats.def, 8);
    const base = Math.floor(Math.floor(Math.floor((2 * L) / 5 + 2) * move.power * A / D) / 50) + 2;
    const stab = Math.floor(base * 1.5);
    const want = [85, 100].map((r) => Math.max(1, Math.floor((stab * r) / 100)));
    const s = sample.scenarios.find((x) => x.label === "STAB, neutral")!;
    expect(s.stab).toBe(true);
    expect(s.effectiveness).toBe(1);
    expect([s.damages[0], s.damages[15]]).toEqual(want);
    expect(sample.scenarios.find((x) => x.label === "No STAB, neutral")!.stab).toBe(false);
    expect(sample.scenarios.find((x) => x.label === "STAB, super effective")!.effectiveness).toBe(2);
    expect(sample.scenarios.find((x) => x.label === "STAB, resisted")!.effectiveness).toBe(0.5);
  });
});

describe("species charts", () => {
  it("totals base stats and counts types", () => {
    const totals = baseStatTotals(DATA);
    expect(totals).toHaveLength(Object.keys(DATA.species).length);
    const oak = DATA.species[totals[0].id];
    expect(totals[0].total).toBe(Object.values(oak.baseStats).reduce((a, b) => a + b, 0));
    const byType = speciesByType(DATA);
    expect(byType.reduce((a, t) => a + t.primary, 0)).toBe(Object.keys(DATA.species).length);
    expect(byType.reduce((a, t) => a + t.secondary, 0)).toBe(Object.values(DATA.species).filter((s) => s.types.length === 2).length);
  });
});

describe("world charts", () => {
  const order = storyMapOrder(WALKTHROUGH);
  it("orders maps by the walkthrough and charts levels", () => {
    expect(order.length).toBeGreaterThan(20);
    expect(new Set(order.map((o) => o.map)).size).toBe(order.length);
    const curve = levelCurve(WORLD, DATA, order);
    expect(curve.length).toBeGreaterThan(10);
    for (const p of curve) {
      if (p.wild) expect(p.wild.min).toBeLessThanOrEqual(p.wild.max);
      for (const t of p.trainers) expect(t.id).not.toMatch(/_rematch$/);
    }
  });
  it("measures every map", () => {
    const sizes = mapSizes(WORLD);
    expect(sizes).toHaveLength(Object.keys(WORLD.maps).length);
    for (const s of sizes) expect(s.area).toBe(s.w * s.h);
  });
  it("links every warp and lays the graph out without overlaps, deterministically", () => {
    const g = warpGraph(WORLD, order);
    expect(g.nodes).toHaveLength(Object.keys(WORLD.maps).length);
    const ids = new Set(g.nodes.map((n) => n.id));
    for (const e of g.edges) { expect(ids.has(e.a)).toBe(true); expect(ids.has(e.b)).toBe(true); }
    for (const [id, m] of Object.entries(WORLD.maps)) for (const w of m.warps) {
      if (w.to === id) continue;
      const [a, b] = id < w.to ? [id, w.to] : [w.to, id];
      expect(g.edges.some((e) => e.a === a && e.b === b && !e.scripted)).toBe(true);
    }
    for (const n of g.nodes) expect(WORLD.maps[n.hub].outdoor || n.hub === n.id).toBe(true);
    const lay = layoutWarpGraph(g.nodes);
    expect(lay.placed).toHaveLength(g.nodes.length);
    for (let i = 0; i < lay.placed.length; i++) for (let j = i + 1; j < lay.placed.length; j++) {
      const p = lay.placed[i], q = lay.placed[j];
      const overlap = p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h;
      expect(overlap, `${p.id} overlaps ${q.id}`).toBe(false);
    }
    expect(layoutWarpGraph(warpGraph(WORLD, order).nodes)).toEqual(lay);
  });
  it("counts every ScriptCmd op, including unused ones", () => {
    const ops = scriptOpsFromSource(read("src/contracts/world.ts"));
    expect(ops).toContain("say");
    expect(ops).toContain("end");
    expect(ops).toContain("nursery");
    const counts = scriptOps(WORLD, ops);
    let total = 0;
    const seen = new Set<string>();
    const walk = (cmds: ScriptCmd[]) => {
      for (const c of cmds) {
        total++;
        seen.add(c.op);
        const anyC = c as unknown as Record<string, unknown>;
        for (const k of ["then", "else", "yes", "no"]) if (Array.isArray(anyC[k])) walk(anyC[k] as ScriptCmd[]);
        if (c.op === "choice") for (const b of c.branches) walk(b);
      }
    };
    for (const s of Object.values(WORLD.scripts)) walk(s);
    expect(counts.reduce((a, c) => a + c.count, 0)).toBe(total);
    for (const op of seen) expect(ops, `op "${op}" missing from the ScriptCmd union`).toContain(op);
    let walked = 0;
    for (const s of Object.values(WORLD.scripts)) walkCmds(s, () => walked++);
    expect(walked).toBe(total);
  });
});

describe("source stats", () => {
  it("parses imports and tests", () => {
    expect(folderOf("src/battle/logic/exp.ts")).toBe("battle");
    expect(folderOf("src/main.ts")).toBe("main");
    expect(resolveRelative("src/battle/logic/exp.ts", "../../contracts")).toBe("src/contracts");
    expect(importSpecifiers(`import { a } from "./a";\nimport type { B } from '../b';\nexport * from "./c";\nimport "./d.css";\nconst x = await import("./e");\n// import { z } from "./nope";`))
      .toEqual(["./a", "../b", "./c", "./d.css", "./e"]);
    expect(countTests(`it("a", () => {}); test('b', () => {}); it.skip("c", f); it.each([1, 2])("d %s", f); fit("x"); split("y")`)).toBe(4);
  });
  it("builds folder stats and the layered module graph from the real tree", () => {
    const files: { path: string; text: string }[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(ROOT + dir)) {
        const p = `${dir}/${name}`;
        if (name.endsWith(".ts")) files.push({ path: p, text: read(p) });
        else if (!name.includes(".")) { try { walk(p); } catch { /* a file without an extension */ } }
      }
    };
    walk("src");
    const stats = sourceStats(files);
    const names = stats.folders.map((f) => f.folder);
    for (const f of ["battle", "contracts", "data", "engine", "world", "main"]) expect(names).toContain(f);
    expect(stats.edges.some((e) => e.from === "battle" && e.to === "contracts")).toBe(true);
    expect(stats.edges.every((e) => e.from !== e.to)).toBe(true);
    const lay = layoutModuleGraph(stats);
    const contracts = lay.nodes.find((n) => n.id === "contracts")!;
    expect(contracts.layer).toBe(0);
    expect(lay.layers.flat().sort()).toEqual([...names].sort());
    const counts = contentCounts(DATA, WORLD, stats);
    expect(counts.content.find((c) => c.label === "Species")!.value).toBe(Object.keys(DATA.species).length);
    expect(counts.tests.reduce((a, t) => a + t.value, 0)).toBeGreaterThan(1000);
  });
});

describe("bundle-kinds", () => {
  it("counts the art index's bundles per kind", () => {
    const index = JSON.parse(read("public/art/index.json")) as ArtIndex;
    const { rows, packs } = bundleKinds(index);
    expect(rows.map((r) => r.kind)).toEqual(["species", "tilesets", "structures", "characters", "sets"]);
    expect(rows[0].base).toBe(Object.keys(index.species).length);
    expect(packs).toEqual(Object.keys(index.packs).sort());
  });
});
