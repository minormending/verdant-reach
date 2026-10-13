// The live charts (`<figure data-chart="NAME">`, CONTRACT.md § Charts): data
// from ./data.ts, drawn as dependency-free SVG. Each chart has a title, a
// legend when it has two or more series, hover tooltips, an accessible
// summary (role="img" + aria-label) and a "Show data" table. Charts render
// lazily and redraw when their box changes width.

import { DATA } from "../../data";
import { WORLD } from "../../world";
import { WALKTHROUGH } from "../../guide/walkthrough";
import type { ArtIndex } from "../../art/format";
import worldSource from "../../contracts/world.ts?raw";
import type { ChartName } from "../names";
import { openViewer, panZoom, zoomTools, type PanZoom } from "../panzoom";
import {
  baseStatTotals, bundleKinds, catchCurves, contentCounts, damageSpread, expCurves, layoutModuleGraph, layoutWarpGraph,
  levelCurve, mapSizes, scriptOps, scriptOpsFromSource, speciesByType, storyMapOrder, typeMatrix, warpGraph,
  type Count, type StoryMap,
} from "./data";
import type { SourceStats } from "./sourceStats";
import {
  barPath, compact, dataTable, fitLabel, fmt, frame, hideTip, hover, legend, linear, niceMax, niceTicks, pct, r1, s, showTip,
  svgRoot, text, xAxis, xGrid, yAxis, type Frame, type LegendItem, type TableData, type TipContent,
} from "./svg";

interface Drawn { svg: SVGSVGElement; /** Node-link charts: natural size for pan/zoom. */ graph?: { w: number; h: number } }

interface ChartDef<M> {
  title: string;
  load(): M | Promise<M>;
  summary(m: M): string;
  legend?(m: M): LegendItem[];
  table(m: M): TableData;
  draw(m: M, width: number): Drawn;
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const typeName = (t: string) => t.toUpperCase();

let order: StoryMap[] | null = null;
const story = () => (order ??= storyMapOrder(WALKTHROUGH));
let source: Promise<SourceStats> | null = null;
const sourceStats = () => (source ??= import("virtual:devdocs-source").then((m) => m.default));

// ---- shared chart forms --------------------------------------------------------

interface LineSeries { label: string; series: number; dash?: boolean; points: [number, number][] }

/** Multi-series line chart with a snapping crosshair that lists every series. */
function lineChart(width: number, opts: {
  series: LineSeries[]; xDomain: [number, number]; yMax: number; xLabel: string; yLabel: string;
  xTicks?: number[]; yFormat?: (n: number) => string; xFormat?: (n: number) => string; valueFormat: (n: number) => string;
  tipTitle: (x: number) => string; endLabels?: boolean; height?: number;
}): Drawn {
  const h = opts.height ?? Math.round(Math.max(260, Math.min(380, width * 0.55)));
  const f = frame(width, h, { left: 58, right: opts.endLabels && width > 480 ? 70 : 16, top: 14, bottom: 44 });
  const x = linear(opts.xDomain, [f.m.left, f.m.left + f.iw]);
  const y = linear([0, opts.yMax], [f.m.top + f.ih, f.m.top]);
  const xt = opts.xTicks ?? niceTicks(Math.min(...opts.xDomain), Math.max(...opts.xDomain), width < 480 ? 4 : 8);
  const lines = opts.series.map((se) => s("path", {
    class: `line sk-${se.series}${se.dash ? " dash" : ""}`,
    d: se.points.map(([px, py], i) => `${i ? "L" : "M"}${r1(x(px))},${r1(y(py))}`).join(""),
  }));
  const ends = opts.endLabels && width > 480 ? opts.series.map((se) => {
    const [px, py] = se.points[se.points.length - 1];
    return text(x(px) + 6, y(py) + 4, se.label, { class: "end-label" });
  }) : [];
  const cross = s("g", { class: "crosshair", visibility: "hidden" });
  const xs = opts.series[0].points.map((p) => p[0]);
  const hit = s("rect", { class: "hit-area", x: f.m.left, y: f.m.top, width: f.iw, height: f.ih });
  const move = (clientX: number, clientY: number) => {
    const r = hit.getBoundingClientRect();
    const px = opts.xDomain[0] + ((clientX - r.left) / r.width) * (opts.xDomain[1] - opts.xDomain[0]);
    let best = 0;
    for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - px) < Math.abs(xs[best] - px)) best = i;
    const vx = xs[best];
    cross.replaceChildren(
      s("line", { class: "cross", x1: r1(x(vx)), x2: r1(x(vx)), y1: f.m.top, y2: f.m.top + f.ih }),
      ...opts.series.map((se) => s("circle", { class: `dot sf-${se.series}`, cx: r1(x(vx)), cy: r1(y(se.points[best][1])), r: 4 })),
    );
    cross.setAttribute("visibility", "visible");
    showTip({
      title: opts.tipTitle(vx),
      rows: opts.series.map((se) => ({ label: se.label, value: opts.valueFormat(se.points[best][1]), series: se.series, dash: se.dash })),
    }, clientX, clientY);
  };
  hit.addEventListener("pointermove", (e) => move(e.clientX, e.clientY));
  hit.addEventListener("pointerleave", () => { cross.setAttribute("visibility", "hidden"); hideTip(); });
  return {
    svg: svgRoot(f,
      yAxis(f, y, niceTicks(0, opts.yMax, 5), opts.yLabel, opts.yFormat),
      xAxis(f, x, xt, opts.xLabel, opts.xFormat),
      s("g", { class: "lines" }, lines), ends, cross, hit,
    ),
  };
}

interface HBarRow { label: string; values: number[]; tip?: () => TipContent }

/** Horizontal bars (stacked or grouped), labels on the left, totals at the tips. */
function hbarsSvg(width: number, rows: HBarRow[], opts: {
  series: number[]; stacked?: boolean; xLabel?: string; labelWidth?: number; rowH?: number; title?: string; mono?: boolean;
}): SVGSVGElement {
  const groups = opts.stacked ? 1 : opts.series.length;
  const barH = Math.min(opts.stacked ? 18 : 12, 24);
  const rowH = opts.rowH ?? (opts.stacked ? 30 : groups * (barH + 2) + 14);
  const labelW = opts.labelWidth ?? Math.min(160, Math.max(64, Math.max(...rows.map((r) => r.label.length)) * (opts.mono ? 7 : 6.8) + 18));
  const titleH = opts.title ? 22 : 0;
  const f = frame(width, titleH + rows.length * rowH + 40 + (opts.xLabel ? 12 : 0), { left: labelW, right: 44, top: titleH + 6, bottom: 34 + (opts.xLabel ? 12 : 0) });
  const max = Math.max(1, ...rows.map((r) => (opts.stacked ? r.values.reduce((a, b) => a + b, 0) : Math.max(...r.values))));
  const xm = niceMax(max, width < 480 ? 3 : 5);
  const x = linear([0, xm], [f.m.left, f.m.left + f.iw]);
  const marks = rows.map((r, i) => {
    const y0 = f.m.top + i * rowH + (rowH - (opts.stacked ? barH : groups * (barH + 2) - 2)) / 2;
    const g = s("g", { class: "row" });
    g.append(text(f.m.left - 8, y0 + (opts.stacked ? barH : groups * (barH + 2) - 2) / 2 + 4, fitLabel(r.label, labelW - 10, opts.mono ? 6.6 : 6.4), { "text-anchor": "end", class: opts.mono ? "row-label mono" : "row-label" }));
    if (opts.stacked) {
      let acc = 0;
      r.values.forEach((v, j) => {
        if (!v) return;
        const x0 = x(acc) + (acc ? 1 : 0), x1 = x(acc + v) - 1;
        const last = r.values.slice(j + 1).every((n) => !n);
        g.append(s("path", { class: `bar sf-${opts.series[j]}`, d: last ? barPath(x0, y0, Math.max(1, x1 - x0 + 1), barH, "right") : `M${r1(x0)},${r1(y0)}h${r1(Math.max(1, x1 - x0))}v${barH}h${r1(-Math.max(1, x1 - x0))}Z` }));
        acc += v;
      });
      g.append(text(x(acc) + 6, y0 + barH / 2 + 4, fmt(acc), { class: "value" }));
    } else {
      r.values.forEach((v, j) => {
        const yy = y0 + j * (barH + 2);
        if (v > 0) g.append(s("path", { class: `bar sf-${opts.series[j]}`, d: barPath(x(0), yy, Math.max(2, x(v) - x(0)), barH, "right") }));
        if (v > 0 || j === 0) g.append(text(x(v) + 6, yy + barH / 2 + 4, fmt(v), { class: "value" }));
      });
    }
    const hitR = s("rect", { class: "hit-area", x: 0, y: f.m.top + i * rowH, width: f.w, height: rowH });
    if (r.tip) hover(hitR, r.tip);
    g.append(hitR);
    return g;
  });
  return svgRoot(f,
    opts.title ? text(0, 14, opts.title, { class: "panel-title" }) : null,
    xGrid(f, x, niceTicks(0, xm, width < 480 ? 3 : 5), compact, opts.xLabel),
    marks,
  );
}

// ---- the charts ------------------------------------------------------------

const exp: ChartDef<ReturnType<typeof expCurves>> = {
  title: "EXP needed to reach each level",
  load: () => expCurves(DATA),
  summary: (m) => `Line chart of total EXP needed for levels 1 to 100 for the ${m.length} growth rates. At level 100: ${m.map((c) => `${c.rate} ${fmt(c.points[99].exp)}`).join(", ")}.`,
  legend: (m) => m.map((c, i) => ({ label: `${cap(c.rate)} (${c.species} species)`, series: i + 1, shape: "line" })),
  table: (m) => ({
    head: ["Level", ...m.map((c) => cap(c.rate))],
    rows: [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100].map((lv) => [String(lv), ...m.map((c) => c.points[lv - 1].exp)]),
  }),
  draw: (m, w) => lineChart(w, {
    series: m.map((c, i) => ({ label: cap(c.rate), series: i + 1, points: c.points.map((p) => [p.level, p.exp] as [number, number]) })),
    xDomain: [1, 100], yMax: niceMax(Math.max(...m.map((c) => c.points[99].exp))), xLabel: "Level", yLabel: "Total EXP",
    xTicks: [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].filter((t, i) => w >= 480 || i % 2 === 0),
    valueFormat: (n) => `${fmt(n)} EXP`, tipTitle: (lv) => `Level ${lv}`, endLabels: true,
  }),
};

const multLabel = (m: number) => (m === 0 ? "0" : m === 0.5 ? "½" : m === 0.25 ? "¼" : m === 1 ? "" : `${m}`);
const multWord = (m: number) => (m === 0 ? "no effect" : m < 1 ? "not very effective" : m > 1 ? "super effective" : "neutral");
const multClass = (m: number) => (m === 0 ? "m0" : m < 1 ? "mlo" : m > 1 ? "mhi" : "m1");

const types: ChartDef<ReturnType<typeof typeMatrix>> = {
  title: "Type effectiveness (attacking type → defending type)",
  load: () => typeMatrix(DATA),
  summary: (m) => {
    const hi = m.cells.filter((c) => c.mult > 1).length, lo = m.cells.filter((c) => c.mult > 0 && c.mult < 1).length, z = m.cells.filter((c) => c.mult === 0).length;
    return `Heatmap of ${m.types.length} attacking types against ${m.types.length} defending types: ${hi} super-effective pairs, ${lo} resisted, ${z} with no effect, the rest neutral.`;
  },
  legend: () => [
    { label: "×2 super effective", series: 101 }, { label: "×1 neutral", series: 102 },
    { label: "×½ not very effective", series: 103 }, { label: "×0 no effect", series: 104 },
  ],
  table: (m) => ({ head: ["Attack ↓ / Defend →", ...m.types.map(typeName)], rows: m.types.map((a) => [typeName(a), ...m.types.map((d) => `×${multLabel(m.cells.find((c) => c.atk === a && c.def === d)!.mult) || 1}`)]) }),
  draw: (m, w) => {
    const n = m.types.length;
    const left = 64;
    const cell = Math.max(26, Math.min(48, Math.floor((w - left - 8) / n)));
    const rotate = cell < 50;
    const top = rotate ? 58 : 28;
    const f = frame(left + cell * n + 8, top + cell * n + 24, { left, right: 8, top, bottom: 24 });
    const cells = m.cells.map((c) => {
      const i = m.types.indexOf(c.atk), j = m.types.indexOf(c.def);
      const x0 = left + j * cell, y0 = top + i * cell;
      const g = s("g", {},
        s("rect", { class: `cell ${multClass(c.mult)}`, x: x0 + 1, y: y0 + 1, width: cell - 2, height: cell - 2, rx: 3 }),
        multLabel(c.mult) ? text(x0 + cell / 2, y0 + cell / 2 + 4, multLabel(c.mult), { class: `cell-label ${multClass(c.mult)}`, "text-anchor": "middle" }) : null,
      );
      hover(g, () => ({ title: `${typeName(c.atk)} → ${typeName(c.def)}`, rows: [{ label: multWord(c.mult), value: `×${multLabel(c.mult) || 1}` }] }));
      return g;
    });
    return {
      svg: svgRoot(f,
        m.types.map((t, j) => rotate
          ? text(left + j * cell + cell / 2, top - 6, typeName(t), { class: "col-label", transform: `rotate(-45 ${r1(left + j * cell + cell / 2)} ${top - 6})` })
          : text(left + j * cell + cell / 2, top - 8, typeName(t), { class: "col-label", "text-anchor": "middle" })),
        m.types.map((t, i) => text(left - 8, top + i * cell + cell / 2 + 4, typeName(t), { class: "row-label", "text-anchor": "end" })),
        text(left + (cell * n) / 2, f.h - 6, "Defending type →", { class: "axis-label", "text-anchor": "middle" }),
        cells,
      ),
    };
  },
};

const catchC: ChartDef<ReturnType<typeof catchCurves>> = {
  title: "Catch chance with a Terrarium Pod by remaining HP",
  load: () => catchCurves(DATA),
  summary: (m) => `Line chart of the chance one Terrarium Pod catches a plant, from full HP to 1% HP, for catch rates ${[...new Set(m.map((s) => s.catchRate))].join(", ")}, healthy and dormant. ${m.filter((s) => !s.status).map((s) => `Rate ${s.catchRate}: ${pct(s.points[0].p)} at full HP, ${pct(s.points[99].p)} at 1% HP`).join("; ")}.`,
  legend: (m) => [
    ...m.filter((s) => !s.status).map((s, i) => ({ label: `Catch rate ${s.catchRate} (e.g. ${s.example})`, series: i + 1, shape: "line" as const })),
    { label: "Dashed: target is dormant (+10)", series: 100, shape: "dash" },
  ],
  table: (m) => ({
    head: ["HP left", ...m.map((s) => `Rate ${s.catchRate}${s.status ? ", dormant" : ""}`)],
    rows: [100, 90, 75, 50, 25, 10, 1].map((p) => [`${p}%`, ...m.map((s) => pct(s.points.find((x) => x.hpPct === p)!.p))]),
  }),
  draw: (m, w) => {
    const rates = [...new Set(m.map((s) => s.catchRate))];
    return lineChart(w, {
      series: m.map((s) => ({ label: `Rate ${s.catchRate}${s.status ? ", dormant" : ""}`, series: rates.indexOf(s.catchRate) + 1, dash: !!s.status, points: s.points.map((p) => [p.hpPct, p.p] as [number, number]) })),
      xDomain: [100, 1], yMax: 1, xLabel: "HP remaining (%)", yLabel: "Catch chance",
      xTicks: [100, 75, 50, 25, 1], yFormat: (n) => `${Math.round(n * 100)}%`, xFormat: (n) => `${n}%`,
      valueFormat: pct, tipTitle: (p) => `${p}% HP left`,
    });
  },
};

const damage: ChartDef<ReturnType<typeof damageSpread>> = {
  title: "Damage roll spread for one attack",
  load: () => damageSpread(DATA),
  summary: (m) => `Range chart of ${m.attacker}'s ${m.move} (${typeName(m.moveType)}, power ${m.power}, level ${m.level}) against a ${m.defender}-like target with ${m.defenderHp} HP, at every random roll from 85% to 100%: ${m.scenarios.map((s) => `${s.label} ${s.damages[0]}–${s.damages[15]}`).join("; ")}.`,
  table: (m) => ({
    head: ["Case", "Min", "Max", "Rolls (85% → 100%)"],
    rows: m.scenarios.map((s) => [s.label, s.damages[0], s.damages[15], s.damages.join(" ")]),
    numeric: [false, true, true, false],
  }),
  draw: (m, w) => {
    const rowH = 46;
    const f = frame(w, 20 + m.scenarios.length * rowH + 46, { left: 12, right: 24, top: 20, bottom: 46 });
    const xm = niceMax(Math.max(m.defenderHp, ...m.scenarios.map((s) => s.damages[15])) * 1.02);
    const x = linear([0, xm], [f.m.left, f.m.left + f.iw]);
    const rows = m.scenarios.map((sc, i) => {
      const y0 = f.m.top + i * rowH;
      const lo = sc.damages[0], hi = sc.damages[15];
      const distinct = [...new Set(sc.damages)];
      const g = s("g", { class: "row" },
        text(f.m.left, y0 + 13, sc.label, { class: "row-label" }),
        s("rect", { class: "range sf-1", x: r1(x(lo) - 4), y: y0 + 21, width: r1(Math.max(8, x(hi) - x(lo) + 8)), height: 8, rx: 4 }),
        distinct.map((d) => s("circle", { class: "tick-dot", cx: r1(x(d)), cy: y0 + 25, r: 1.6 })),
        x(hi) + 54 > f.w
          ? text(x(lo) - 10, y0 + 29, `${lo}–${hi}`, { class: "value", "text-anchor": "end" })
          : text(x(hi) + 10, y0 + 29, `${lo}–${hi}`, { class: "value" }),
      );
      const hitR = s("rect", { class: "hit-area", x: 0, y: y0, width: f.w, height: rowH });
      hover(hitR, () => ({
        title: sc.label,
        rows: [
          { label: "lowest roll (85%)", value: `${lo} HP` },
          { label: "highest roll (100%)", value: `${hi} HP` },
          { label: "of the target's HP", value: `${Math.round((lo / m.defenderHp) * 100)}–${Math.round((hi / m.defenderHp) * 100)}%` },
        ],
        note: `${distinct.length} distinct values across 16 rolls`,
      }));
      g.append(hitR);
      return g;
    });
    const hpX = x(m.defenderHp);
    return {
      svg: svgRoot(f,
        xGrid(f, x, niceTicks(0, xm, w < 480 ? 4 : 6), compact, "Damage (HP)"),
        s("line", { class: "ref", x1: r1(hpX), x2: r1(hpX), y1: f.m.top - 8, y2: f.m.top + f.ih }),
        text(hpX - 4, f.m.top - 8, `Target HP ${m.defenderHp}`, { class: "ref-label", "text-anchor": "end" }),
        rows,
      ),
    };
  },
};

const bst: ChartDef<ReturnType<typeof baseStatTotals>> = {
  title: "Base-stat total by species and growth stage",
  load: () => baseStatTotals(DATA),
  summary: (m) => [1, 2, 3].map((st) => {
    const xs = m.filter((x) => x.stage === st).map((x) => x.total);
    return xs.length ? `Stage ${st}: ${xs.length} species, ${Math.min(...xs)}–${Math.max(...xs)}, median ${median(xs)}` : "";
  }).filter(Boolean).join("; ") + ".",
  table: (m) => ({ head: ["Species", "Stage", "Types", "Base-stat total"], rows: m.map((x) => [x.name, String(x.stage), x.types.map(typeName).join(" / "), x.total]), numeric: [false, true, false, true] }),
  draw: (m, w) => {
    // One row per stage: a beeswarm along the base-stat-total axis, as tall as its densest spot.
    const R = 4.5, D = 2 * R + 1.5;
    const lo = Math.floor((Math.min(...m.map((x) => x.total)) - 10) / 50) * 50;
    const hi = niceMax(Math.max(...m.map((x) => x.total)) + 10);
    const left = 16, right = 20;
    const x = linear([lo, hi], [left, w - right]);
    const rows = ([1, 2, 3] as const).map((st) => {
      const xs = m.filter((p) => p.stage === st);
      const placed: { sp: (typeof m)[number]; x: number; dy: number }[] = [];
      const maxOff = w < 600 ? 44 : 64;
      for (const sp of [...xs].sort((p, q) => p.total - q.total || p.id.localeCompare(q.id))) {
        const px = x(sp.total);
        // The nearest free spot within maxOff of the centre line; past that, the least crowded one.
        let dy = NaN, best = 0, bestHits = Infinity;
        for (let k = 0; Math.ceil(k / 2) * D * 0.5 <= maxOff; k++) {
          const off = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (D * 0.5);
          const hits = placed.filter((p) => Math.hypot(p.x - px, p.dy - off) < D).length;
          if (!hits) { dy = off; break; }
          if (hits < bestHits) { bestHits = hits; best = off; }
        }
        placed.push({ sp, x: px, dy: Number.isNaN(dy) ? best : dy });
      }
      const ext = Math.max(R, ...placed.map((p) => Math.abs(p.dy))) + R + 4;
      return { st, xs, placed, ext };
    });
    const labelH = 22;
    let y = 4;
    const out: SVGElement[] = [];
    for (const r of rows) {
      const top = y;
      const cy = top + labelH + r.ext;
      out.push(text(left, top + 14, `Stage ${r.st} · ${r.xs.length} species`, { class: "col-label" }));
      if (r.xs.length) {
        const med = median(r.xs.map((p) => p.total));
        out.push(s("line", { class: "median", x1: r1(x(med)), x2: r1(x(med)), y1: r1(cy - r.ext), y2: r1(cy + r.ext) }));
        out.push(text(w - right, top + 14, `median ${med}`, { class: "ref-label", "text-anchor": "end" }));
      }
      for (const p of r.placed) {
        const g = s("g", {},
          s("circle", { class: "dot sf-1", cx: r1(p.x), cy: r1(cy + p.dy), r: R }),
          s("circle", { class: "hit-area", cx: r1(p.x), cy: r1(cy + p.dy), r: 8 }),
        );
        hover(g, () => ({ title: p.sp.name, rows: [{ label: "base-stat total", value: String(p.sp.total) }, { label: "types", value: p.sp.types.map(typeName).join(" / ") }], note: `Stage ${p.sp.stage}` }));
        out.push(g);
      }
      y = cy + r.ext + 10;
      out.push(s("line", { class: "grid", x1: left, x2: w - right, y1: r1(y - 4), y2: r1(y - 4) }));
    }
    const f = frame(w, y + 34, { left, right, top: 0, bottom: 34 });
    const ticks = niceTicks(lo, hi, w < 480 ? 4 : 8);
    return {
      svg: svgRoot(f,
        ticks.map((t) => s("line", { class: "grid", x1: r1(x(t)), x2: r1(x(t)), y1: 4, y2: r1(y - 4) })),
        ticks.map((t) => text(x(t), y + 12, String(t), { "text-anchor": "middle" })),
        text(w / 2, y + 28, "Base-stat total", { class: "axis-label", "text-anchor": "middle" }),
        out),
    };
  },
};

function median(xs: number[]): number {
  const a = [...xs].sort((p, q) => p - q);
  return a.length % 2 ? a[(a.length - 1) / 2] : Math.round((a[a.length / 2 - 1] + a[a.length / 2]) / 2);
}

const byType: ChartDef<ReturnType<typeof speciesByType>> = {
  title: "Species per type",
  load: () => speciesByType(DATA),
  summary: (m) => `Stacked bar chart of species per type, as primary and secondary type: ${m.map((t) => `${typeName(t.type)} ${t.primary} + ${t.secondary}`).join(", ")}.`,
  legend: () => [{ label: "Primary type", series: 1 }, { label: "Secondary type", series: 2 }],
  table: (m) => ({ head: ["Type", "Primary", "Secondary", "Total"], rows: m.map((t) => [typeName(t.type), t.primary, t.secondary, t.primary + t.secondary]) }),
  draw: (m, w) => ({
    svg: hbarsSvg(w, m.map((t) => ({
      label: typeName(t.type), values: [t.primary, t.secondary],
      tip: () => ({ title: typeName(t.type), rows: [{ label: "primary", value: String(t.primary), series: 1 }, { label: "secondary", value: String(t.secondary), series: 2 }, { label: "total", value: String(t.primary + t.secondary) }] }),
    })), { series: [1, 2], stacked: true, xLabel: "Species" }),
  }),
};

const partShort = (p: string, wide: boolean) => {
  if (p === "Prologue") return wide ? "Prologue" : "P";
  if (p === "Post-game") return wide ? "Post-game" : "PG";
  const n = p.replace(/^Chapter\s+/, "");
  return wide ? `Ch. ${n}` : n;
};

const levels: ChartDef<ReturnType<typeof levelCurve>> = {
  title: "Wild and trainer levels along the story",
  load: () => levelCurve(WORLD, DATA, story()),
  summary: (m) => {
    const w = m.filter((p) => p.wild);
    const t = m.flatMap((p) => p.trainers.map((x) => x.max));
    return `Levels on ${m.length} maps in walkthrough order, from ${m[0]?.name} to ${m[m.length - 1]?.name}. Wild levels range from ${Math.min(...w.map((p) => p.wild!.min))} to ${Math.max(...w.map((p) => p.wild!.max))}; trainers' top levels from ${Math.min(...t)} to ${Math.max(...t)}.`;
  },
  legend: () => [{ label: "Wild levels (range)", series: 1 }, { label: "A trainer's highest level", series: 2, shape: "dot" }],
  table: (m) => ({
    head: ["Map", "Part", "Wild levels", "Trainers (highest level)"],
    rows: m.map((p) => [p.name, p.part, p.wild ? `${p.wild.min}–${p.wild.max}` : "—", p.trainers.map((t) => `${t.name} ${t.max}`).join(", ") || "—"]),
  }),
  draw: (m, w) => {
    const h = Math.round(Math.max(280, Math.min(400, w * 0.5)));
    const f = frame(w, h, { left: 48, right: 10, top: 30, bottom: 44 });
    const maxL = niceMax(Math.max(...m.flatMap((p) => [p.wild?.max ?? 0, ...p.trainers.map((t) => t.max)])));
    const y = linear([0, maxL], [f.m.top + f.ih, f.m.top]);
    const band = f.iw / m.length;
    const cx = (i: number) => f.m.left + band * (i + 0.5);
    const bands: SVGElement[] = [];
    let start = 0;
    for (let i = 1; i <= m.length; i++) {
      if (i < m.length && m[i].part === m[start].part) continue;
      const x0 = f.m.left + band * start, bw = band * (i - start);
      const k = bands.length / 2;
      bands.push(s("rect", { class: k % 2 ? "band alt" : "band", x: r1(x0), y: f.m.top - 22, width: r1(bw), height: f.ih + 22 }));
      const label = partShort(m[start].part, bw >= 58);
      bands.push(text(x0 + bw / 2, f.m.top - 8, bw >= 14 ? label : "", { class: "band-label", "text-anchor": "middle" }));
      start = i;
    }
    const barW = Math.max(2, Math.min(8, band * 0.5));
    const marks = m.map((p, i) => {
      const g = s("g", {});
      if (p.wild) {
        const y1 = y(p.wild.max), y0 = y(p.wild.min);
        g.append(s("rect", { class: "range sf-1", x: r1(cx(i) - barW / 2), y: r1(y1 - barW / 2), width: r1(barW), height: r1(Math.max(barW, y0 - y1 + barW)), rx: r1(barW / 2) }));
      }
      for (const t of p.trainers) g.append(s("circle", { class: "dot sf-2", cx: r1(cx(i)), cy: r1(y(t.max)), r: band < 9 ? 3 : 4 }));
      const hitR = s("rect", { class: "hit-area", x: r1(f.m.left + band * i), y: f.m.top, width: r1(band), height: f.ih });
      hover(hitR, () => ({
        title: p.name,
        rows: [
          ...(p.wild ? [{ label: "wild", value: `Lv ${p.wild.min}–${p.wild.max}`, series: 1 }] : []),
          ...p.trainers.slice(0, 8).map((t) => ({ label: t.name, value: `Lv ${t.max}`, series: 2 })),
        ],
        note: `${p.part}${p.trainers.length > 8 ? ` · and ${p.trainers.length - 8} more trainers` : ""}`,
      }));
      g.append(hitR);
      return g;
    });
    return {
      svg: svgRoot(f, bands, yAxis(f, y, niceTicks(0, maxL, 5), "Level", String),
        s("line", { class: "baseline", x1: f.m.left, x2: f.m.left + f.iw, y1: f.m.top + f.ih, y2: f.m.top + f.ih }),
        text(f.m.left + f.iw / 2, f.h - 18, "Maps in walkthrough order →", { class: "axis-label", "text-anchor": "middle" }),
        marks),
    };
  },
};

const sizes: ChartDef<ReturnType<typeof mapSizes>> = {
  title: "Map dimensions in tiles",
  load: () => mapSizes(WORLD),
  summary: (m) => {
    const o = m.filter((x) => x.outdoor), i = m.filter((x) => !x.outdoor);
    return `Scatter plot of ${m.length} maps by width and height in 16-pixel tiles: ${o.length} outdoor maps (largest ${o[0]?.name}, ${o[0]?.w}×${o[0]?.h}) and ${i.length} indoor maps (median area ${median(i.map((x) => x.area))} tiles).`;
  },
  legend: (m) => [{ label: `Outdoor (${m.filter((x) => x.outdoor).length})`, series: 1, shape: "dot" }, { label: `Indoor (${m.filter((x) => !x.outdoor).length})`, series: 3, shape: "dot" }],
  table: (m) => ({ head: ["Map", "Kind", "Width", "Height", "Area (tiles)"], rows: m.map((x) => [x.name, x.outdoor ? "outdoor" : "indoor", x.w, x.h, x.area]) }),
  draw: (m, w) => {
    const h = Math.round(Math.max(280, Math.min(400, w * 0.6)));
    const f = frame(w, h, { left: 52, right: 16, top: 14, bottom: 44 });
    const x = linear([0, niceMax(Math.max(...m.map((p) => p.w)))], [f.m.left, f.m.left + f.iw]);
    const y = linear([0, niceMax(Math.max(...m.map((p) => p.h)))], [f.m.top + f.ih, f.m.top]);
    const groups = new Map<string, typeof m>();
    for (const p of m) {
      const k = `${p.w}x${p.h}x${p.outdoor}`;
      groups.set(k, [...(groups.get(k) ?? []), p]);
    }
    const dots = [...groups.values()].sort((a, b) => b.length - a.length).map((g) => {
      const p = g[0];
      const r = 4 + Math.sqrt(g.length - 1) * 2.2;
      const el = s("g", {},
        s("circle", { class: `dot sf-${p.outdoor ? 1 : 3}`, cx: r1(x(p.w)), cy: r1(y(p.h)), r: r1(r) }),
        g.length > 1 && r >= 7 ? text(x(p.w), y(p.h) + 3.5, String(g.length), { class: "dot-label", "text-anchor": "middle" }) : null,
        s("circle", { class: "hit-area", cx: r1(x(p.w)), cy: r1(y(p.h)), r: r1(Math.max(10, r + 3)) }),
      );
      hover(el, () => ({
        title: `${p.w} × ${p.h} tiles (${p.outdoor ? "outdoor" : "indoor"})`,
        rows: g.slice(0, 8).map((q) => ({ label: q.name, value: "", series: q.outdoor ? 1 : 3 })),
        note: g.length > 8 ? `and ${g.length - 8} more` : `${p.area} tiles each`,
      }));
      return el;
    });
    return {
      svg: svgRoot(f,
        yAxis(f, y, y.ticks(5), "Height (tiles)", String),
        xAxis(f, x, x.ticks(w < 480 ? 4 : 6), "Width (tiles)", String),
        dots),
    };
  },
};

// ---- node-link charts ------------------------------------------------------------

const warp: ChartDef<ReturnType<typeof warpGraph>> = {
  title: "World connectivity: every map and warp",
  load: () => warpGraph(WORLD, story()),
  summary: (m) => {
    const o = m.nodes.filter((n) => n.outdoor).length;
    return `Node-link diagram of ${m.nodes.length} maps (${o} outdoor, ${m.nodes.length - o} indoor) joined by ${m.edges.filter((e) => !e.scripted).length} warp connections and ${m.edges.filter((e) => e.scripted).length} script warps. Outdoor maps run in story order; each indoor map sits under the outdoor map it opens onto.`;
  },
  legend: () => [
    { label: "Outdoor map", series: 1 }, { label: "Indoor map", series: 3 },
    { label: "Warp tiles (thicker = more doors)", series: 99, shape: "line" }, { label: "Script warp", series: 99, shape: "dash" },
  ],
  table: (m) => ({
    head: ["Map", "Kind", "Part", "Connects to"],
    rows: m.nodes.map((n) => [n.name, n.outdoor ? "outdoor" : "indoor", n.part ?? "—", m.edges.filter((e) => e.a === n.id || e.b === n.id).map((e) => {
      const other = e.a === n.id ? e.b : e.a;
      return `${WORLD.maps[other].name}${e.count > 1 ? ` ×${e.count}` : ""}${e.scripted ? " (script)" : ""}`;
    }).join(", ")]),
  }),
  draw: (m) => {
    const lay = layoutWarpGraph(m.nodes);
    const pos = new Map(lay.placed.map((p) => [p.id, p]));
    const node = new Map(m.nodes.map((n) => [n.id, n]));
    const centre = (id: string) => { const p = pos.get(id)!; return { x: p.x + p.w / 2, y: p.y + p.h / 2 }; };
    const edgeEls = m.edges.map((e) => {
      const a = centre(e.a), b = centre(e.b);
      const el = s("line", {
        class: `edge${e.scripted ? " dash" : ""}`, x1: r1(a.x), y1: r1(a.y), x2: r1(b.x), y2: r1(b.y),
        "stroke-width": r1(1.2 + Math.min(3, Math.log2(e.count) * 0.9)), "data-a": e.a, "data-b": e.b,
      });
      return el;
    });
    const edgeG = s("g", { class: "edges" }, edgeEls);
    const nodeEls = lay.placed.map((p) => {
      const n = node.get(p.id as typeof m.nodes[number]["id"])!;
      const links = m.edges.filter((e) => e.a === n.id || e.b === n.id);
      const g = s("g", { class: `node ${n.outdoor ? "outdoor" : "indoor"}`, "data-id": n.id },
        s("rect", { x: r1(p.x), y: r1(p.y), width: p.w, height: p.h, rx: 6, class: `node-box nb-${n.outdoor ? 1 : 3}` }),
        text(p.x + p.w / 2, p.y + p.h / 2 + 4, fitLabel(n.name, p.w - 10, 6.1), { "text-anchor": "middle", class: "node-label" }),
      );
      hover(g, () => ({
        title: n.name,
        rows: links.slice(0, 10).map((e) => {
          const other = e.a === n.id ? e.b : e.a;
          return { label: WORLD.maps[other].name, value: e.scripted ? "script" : `${e.count} warp${e.count > 1 ? "s" : ""}` };
        }),
        note: `${n.id} · ${n.outdoor ? "outdoor" : "indoor"}${n.part ? ` · ${n.part}` : ""}`,
      }));
      g.addEventListener("pointerenter", () => highlight(edgeG, nodesG, n.id, links.map((e) => (e.a === n.id ? e.b : e.a))));
      g.addEventListener("pointerleave", () => highlight(edgeG, nodesG, null, []));
      return g;
    });
    const nodesG = s("g", { class: "nodes" }, nodeEls);
    let lastPart: string | null = null;
    const parts = lay.hubs.map((hb) => {
      const show = hb.part && hb.part !== lastPart;
      lastPart = hb.part ?? lastPart;
      return show ? text(hb.x, hb.y - 8, hb.part!, { class: "band-label", "text-anchor": "middle" }) : null;
    });
    return {
      svg: s("svg", { class: "chart-svg graph", width: lay.width, height: lay.height, viewBox: `0 0 ${lay.width} ${lay.height}`, "aria-hidden": "true" }, edgeG, nodesG, parts),
      graph: { w: lay.width, h: lay.height },
    };
  },
};

function highlight(edges: SVGGElement, nodes: SVGGElement, id: string | null, neighbours: string[]) {
  edges.parentElement?.classList.toggle("focus", !!id);
  for (const e of Array.from(edges.children)) {
    const on = !!id && (e.getAttribute("data-a") === id || e.getAttribute("data-b") === id);
    e.classList.toggle("on", on);
  }
  const near = new Set([id, ...neighbours]);
  for (const n of Array.from(nodes.children)) n.classList.toggle("on", !!id && near.has(n.getAttribute("data-id")));
}

const modules: ChartDef<SourceStats> = {
  title: "Imports between top-level folders of src/",
  load: sourceStats,
  summary: (m) => {
    const lay = layoutModuleGraph(m);
    const fanIn = new Map<string, number>();
    for (const e of m.edges) fanIn.set(e.to, (fanIn.get(e.to) ?? 0) + e.count);
    const top = [...fanIn].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${v})`).join(", ");
    return `Layered node-link diagram of ${m.folders.length} folders and ${m.edges.length} folder-to-folder import links (${m.edges.reduce((a, e) => a + e.count, 0)} import statements, tests excluded) in ${lay.layers.length} layers, with contracts at the bottom. Most imported: ${top}. ${lay.back.length} links point upwards (cycles between folders).`;
  },
  legend: () => [{ label: "Imports downwards (thicker = more import statements)", series: 99, shape: "line" }, { label: "Imports upwards (closes a cycle)", series: 98, shape: "dash" }],
  table: (m) => ({
    head: ["Folder", "Files", "Lines", "Imports from"],
    rows: m.folders.map((f) => [f.folder, f.files, f.lines, m.edges.filter((e) => e.from === f.folder).map((e) => `${e.to} ${e.count}`).join(", ") || "—"]),
    numeric: [false, true, true, false],
  }),
  draw: (m) => {
    const lay = layoutModuleGraph(m);
    const colW = 168, rowH = 88, nw = 128, nh = 42, pad = 24;
    const W = lay.cols * colW + pad * 2, H = lay.layers.length * rowH + pad * 2 - (rowH - nh);
    const top = lay.layers.length - 1;
    const at = new Map(lay.nodes.map((n) => [n.id, { x: pad + n.col * colW + (colW - nw) / 2, y: pad + (top - n.layer) * rowH, n }]));
    const back = new Set(lay.back.map((b) => `${b.from}>${b.to}`));
    const edgeEls = m.edges.filter((e) => at.has(e.from) && at.has(e.to)).map((e) => {
      const a = at.get(e.from)!, b = at.get(e.to)!;
      const up = back.has(`${e.from}>${e.to}`);
      const x1 = a.x + nw / 2 + (up ? 10 : 0), y1 = up ? a.y : a.y + nh;
      const x2 = b.x + nw / 2 + (up ? 10 : 0), y2 = up ? b.y + nh : b.y;
      const dy = Math.max(30, Math.abs(y2 - y1) * 0.45);
      const d = up
        ? `M${r1(x1)},${r1(y1)}C${r1(x1 + 40)},${r1(y1 - dy)} ${r1(x2 + 40)},${r1(y2 + dy)} ${r1(x2)},${r1(y2)}`
        : `M${r1(x1)},${r1(y1)}C${r1(x1)},${r1(y1 + dy)} ${r1(x2)},${r1(y2 - dy)} ${r1(x2)},${r1(y2)}`;
      const el = s("path", { class: `edge${up ? " dash up" : ""}`, d, "stroke-width": r1(1 + Math.log2(e.count + 1) * 0.9), "marker-end": "url(#arrow)", "data-a": e.from, "data-b": e.to });
      hover(el, () => ({ title: `${e.from} → ${e.to}`, rows: [{ label: "import statements", value: String(e.count) }], note: up ? "Points upwards: part of an import cycle between folders" : undefined }));
      return el;
    });
    const edgeG = s("g", { class: "edges" }, edgeEls);
    const nodeEls = lay.nodes.map((n) => {
      const p = at.get(n.id)!;
      const outs = m.edges.filter((e) => e.from === n.id);
      const ins = m.edges.filter((e) => e.to === n.id);
      const g = s("g", { class: "node", "data-id": n.id },
        s("rect", { x: r1(p.x), y: r1(p.y), width: nw, height: nh, rx: 8, class: `node-box nb-${n.id === "contracts" ? 2 : 1}` }),
        text(p.x + nw / 2, p.y + 17, n.id === "main" ? "main.ts" : `${n.id}/`, { "text-anchor": "middle", class: "node-label strong mono" }),
        text(p.x + nw / 2, p.y + 33, `${n.files} file${n.files === 1 ? "" : "s"} · ${compact(n.lines)} lines`, { "text-anchor": "middle", class: "node-sub" }),
      );
      hover(g, () => ({
        title: n.id === "main" ? "src/main.ts" : `src/${n.id}/`,
        rows: [
          { label: "imports from", value: outs.map((e) => e.to).join(", ") || "nothing" },
          { label: "imported by", value: ins.map((e) => e.from).join(", ") || "nothing" },
        ],
        note: `${n.files} files, ${fmt(n.lines)} lines (tests excluded) · layer ${n.layer}`,
      }));
      g.addEventListener("pointerenter", () => highlight(edgeG, nodesG, n.id, [...outs.map((e) => e.to), ...ins.map((e) => e.from)]));
      g.addEventListener("pointerleave", () => highlight(edgeG, nodesG, null, []));
      return g;
    });
    const nodesG = s("g", { class: "nodes" }, nodeEls);
    const defs = s("defs", {}, s("marker", { id: "arrow", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse", markerUnits: "userSpaceOnUse" }, s("path", { d: "M0,0L10,5L0,10z", class: "arrow-head" })));
    return { svg: s("svg", { class: "chart-svg graph", width: W, height: H, viewBox: `0 0 ${W} ${H}`, "aria-hidden": "true" }, defs, edgeG, nodesG), graph: { w: W, h: H } };
  },
};

const ops: ChartDef<ReturnType<typeof scriptOps>> = {
  title: "ScriptCmd ops by use across every script",
  load: () => scriptOps(WORLD, scriptOpsFromSource(worldSource)),
  summary: (m) => {
    const used = m.filter((o) => o.count > 0);
    return `Dot plot on a logarithmic scale of the ${m.length} ScriptCmd ops by how often they appear in the world's scripts (${fmt(m.reduce((a, o) => a + o.count, 0))} commands in all). Most used: ${used.slice(0, 4).map((o) => `${o.op} ${o.count}`).join(", ")}. Unused: ${m.filter((o) => !o.count).map((o) => o.op).join(", ") || "none"}.`;
  },
  table: (m) => ({ head: ["Op", "Uses"], rows: m.map((o) => [o.op, o.count]) }),
  draw: (m, w) => {
    const used = m.filter((o) => o.count > 0);
    const unused = m.filter((o) => !o.count);
    const twoCols = w >= 760;
    const colRows = twoCols ? Math.ceil(used.length / 2) : used.length;
    const rowH = 20, labelW = 112, gap = twoCols ? 32 : 0;
    const colW = twoCols ? (w - gap) / 2 : w;
    const top = 8;
    const plotH = colRows * rowH;
    const unusedLines = unused.length ? Math.ceil((14 + unused.map((o) => o.op).join(", ").length) / Math.max(20, Math.floor(w / 6.6))) + 1 : 0;
    const H = top + plotH + 40 + unusedLines * 16;
    const maxC = Math.max(...used.map((o) => o.count));
    const top10 = Math.log10(maxC) * 1.06 + 0.05;
    const decades = Math.floor(top10);
    const els: SVGElement[] = [];
    for (let c = 0; c < (twoCols ? 2 : 1); c++) {
      const x0 = c * (colW + gap) + labelW, x1 = c * (colW + gap) + colW - 40;
      const x = (v: number) => x0 + (Math.log10(v) / top10) * (x1 - x0);
      for (let d = 0; d <= decades; d++) {
        const v = 10 ** d;
        els.push(s("line", { class: d === 0 ? "baseline" : "grid", x1: r1(x(v)), x2: r1(x(v)), y1: top, y2: top + plotH }));
        els.push(text(x(v), top + plotH + 16, compact(v), { "text-anchor": "middle", class: "tick" }));
      }
      els.push(text((x0 + x1) / 2, top + plotH + 32, "Uses (log scale)", { class: "axis-label", "text-anchor": "middle" }));
      used.slice(c * colRows, (c + 1) * colRows).forEach((o, i) => {
        const y = top + i * rowH + rowH / 2;
        const g = s("g", { class: "row" },
          text(x0 - 8, y + 4, o.op, { "text-anchor": "end", class: "row-label mono" }),
          s("line", { class: "stem", x1: r1(x0), x2: r1(x(o.count)), y1: y, y2: y }),
          s("circle", { class: "dot sf-1", cx: r1(x(o.count)), cy: y, r: 4 }),
          text(x(o.count) + 8, y + 4, fmt(o.count), { class: "value" }),
          s("rect", { class: "hit-area", x: c * (colW + gap), y: y - rowH / 2, width: colW, height: rowH }),
        );
        hover(g, () => ({ title: `{ op: "${o.op}" }`, rows: [{ label: "uses across all scripts", value: fmt(o.count) }] }));
        els.push(g);
      });
    }
    const perLine = Math.max(20, Math.floor(w / 6.6));
    const unusedText = unused.length ? `Unused (0): ${unused.map((o) => o.op).join(", ")}` : "";
    const lines: string[] = [];
    for (const word of unusedText.split(" ")) {
      if (lines.length && (lines[lines.length - 1] + " " + word).length <= perLine) lines[lines.length - 1] += ` ${word}`;
      else lines.push(word);
    }
    lines.filter(Boolean).forEach((ln, i) => els.push(text(0, top + plotH + 54 + i * 15, ln, { class: "note-label mono" })));
    const f = frame(w, H, { left: 0, right: 0, top: 0, bottom: 0 });
    return { svg: svgRoot(f, els) };
  },
};

const counts: ChartDef<ReturnType<typeof contentCounts>> = {
  title: "What the game is made of",
  load: async () => contentCounts(DATA, WORLD, await sourceStats()),
  summary: (m) => `Bar charts. Game content: ${m.content.map((c) => `${c.value} ${c.label.toLowerCase()}`).join(", ")}. Test cases by folder (it/test calls in *.test.ts): ${m.tests.map((t) => `${t.label} ${t.value}`).join(", ")}, ${fmt(m.tests.reduce((a, t) => a + t.value, 0))} in all.`,
  table: (m) => ({ head: ["What", "Count"], rows: [...m.content.map((c) => [c.label, c.value]), ...m.tests.map((t) => [`Tests: ${t.label}`, t.value])] }),
  draw: (m, w) => {
    const two = w >= 760;
    const pw = two ? (w - 32) / 2 : w;
    const panel = (title: string, rows: Count[], series: number, mono = false) =>
      hbarsSvg(pw, rows.map((c) => ({ label: c.label, values: [c.value], tip: () => ({ title: c.label, rows: [{ label: title.toLowerCase(), value: fmt(c.value) }] }) })), { series: [series], title, rowH: 24, mono });
    const a = panel("Game content", m.content, 1);
    const b = panel(`Test cases by folder (${fmt(m.tests.reduce((x, t) => x + t.value, 0))})`, m.tests, 3, true);
    const ha = Number(a.getAttribute("height")), hb = Number(b.getAttribute("height"));
    b.setAttribute("x", two ? String(pw + 32) : "0");
    b.setAttribute("y", two ? "0" : String(ha + 16));
    const H = two ? Math.max(ha, hb) : ha + hb + 16;
    const f = frame(w, H, { left: 0, right: 0, top: 0, bottom: 0 });
    return { svg: svgRoot(f, a, b) };
  },
};

const bundles: ChartDef<ReturnType<typeof bundleKinds>> = {
  title: "Art bundles by kind",
  load: async () => {
    const res = await fetch("art/index.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`art/index.json: HTTP ${res.status}`);
    return bundleKinds((await res.json()) as ArtIndex);
  },
  summary: (m) => `Grouped bar chart of art bundles per kind in public/art: ${m.rows.map((r) => `${r.base} ${r.kind}`).join(", ")}${m.packs.length ? `; art packs override ${m.packs.map((p) => `${p} ${m.rows.reduce((a, r) => a + r.packs[p], 0)}`).join(", ")}` : ""}.`,
  legend: (m) => [{ label: "Base bundles (public/art/<kind>/)", series: 1 }, ...m.packs.map((p, i) => ({ label: `Overridden by the ${p} pack`, series: i + 2 }))],
  table: (m) => ({ head: ["Kind", "Base", ...m.packs.map((p) => `Pack: ${p}`)], rows: m.rows.map((r) => [r.kind, r.base, ...m.packs.map((p) => r.packs[p])]) }),
  draw: (m, w) => ({
    svg: hbarsSvg(w, m.rows.map((r) => ({
      label: r.kind, values: [r.base, ...m.packs.map((p) => r.packs[p])],
      tip: () => ({ title: r.kind, rows: [{ label: "base bundles", value: String(r.base), series: 1 }, ...m.packs.map((p, i) => ({ label: `${p} pack`, value: String(r.packs[p]), series: i + 2 }))] }),
    })), { series: [1, ...m.packs.map((_, i) => i + 2)], xLabel: "Bundles", mono: true }),
  }),
};

export const CHARTS: Record<ChartName, ChartDef<any>> = {
  "exp-curves": exp,
  "type-chart": types,
  "catch-curve": catchC,
  "damage-spread": damage,
  "base-stat-totals": bst,
  "species-by-type": byType,
  "level-curve": levels,
  "map-sizes": sizes,
  "warp-graph": warp,
  "module-graph": modules,
  "script-ops": ops,
  "content-counts": counts,
  "bundle-kinds": bundles,
};

// ---- mounting ------------------------------------------------------------------

interface Mounted { fig: HTMLElement; name: ChartName; state: "idle" | "loading" | "done"; done?: Promise<void> }
const mounted: Mounted[] = [];

function btn(label: string, title: string, onClick: (b: HTMLButtonElement) => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "tool-btn";
  b.textContent = label;
  b.title = title;
  b.addEventListener("click", () => onClick(b));
  return b;
}

async function render(mt: Mounted): Promise<void> {
  const { fig, name } = mt;
  const def = CHARTS[name];
  const box = fig.querySelector<HTMLElement>(".chart-box")!;
  try {
    const model = await def.load();
    box.setAttribute("aria-label", `${def.title}. ${def.summary(model)}`);
    if (def.legend) fig.querySelector(".chart-legend-slot")!.replaceChildren(legend(def.legend(model)));
    const tableSlot = fig.querySelector<HTMLElement>(".chart-table")!;
    tableSlot.replaceChildren(dataTable(def.table(model), def.title));
    const toggle = fig.querySelector<HTMLButtonElement>(".show-data")!;
    toggle.hidden = false;
    let pz: PanZoom | null = null;
    let lastW = 0;
    const draw = () => {
      const w = Math.max(280, Math.floor(box.clientWidth));
      if (w === lastW) return;
      lastW = w;
      const out = def.draw(model, w);
      if (out.graph) {
        const viewport = document.createElement("div");
        viewport.className = "graph-port";
        viewport.tabIndex = 0;
        viewport.setAttribute("aria-label", `${def.title}: drag to pan, Ctrl or ⌘ + scroll to zoom`);
        const stage = document.createElement("div");
        stage.append(out.svg);
        viewport.append(stage);
        // As tall as the graph at fit-to-width, within limits.
        const fitW = Math.min(1, w / out.graph.w);
        viewport.style.height = `${Math.round(Math.max(260, Math.min(out.graph.h * fitW + 16, Math.min(720, innerHeight * 0.8))))}px`;
        box.replaceChildren(viewport, zoomTools(() => pz, [btn("⤢", "Open full screen", () => openViewer(out.svg, out.graph!, def.title))]));
        pz = panZoom(viewport, stage, out.graph, { wheel: "modifier", fitMax: 1 });
        pz.fit();
      } else {
        box.replaceChildren(out.svg);
      }
    };
    draw();
    let t = 0;
    new ResizeObserver(() => { clearTimeout(t); t = window.setTimeout(draw, 120); }).observe(box);
  } catch (e) {
    console.error(`[devdocs] chart "${name}" failed`, e);
    const p = document.createElement("p");
    p.className = "chart-error";
    p.textContent = `This chart could not be drawn (${e instanceof Error ? e.message : String(e)}).`;
    box.replaceChildren(p);
    box.removeAttribute("role");
  }
  mt.state = "done";
}

function start(mt: Mounted): Promise<void> {
  if (mt.state === "idle") { mt.state = "loading"; mt.done = render(mt); }
  return mt.done ?? Promise.resolve();
}

const io = typeof IntersectionObserver !== "undefined"
  ? new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io!.unobserve(e.target);
      const mt = mounted.find((x) => x.fig === e.target);
      if (mt) void start(mt);
    }
  }, { rootMargin: "400px 0px" })
  : null;

/** Turn every `figure[data-chart]` under `root` into a lazily drawn chart. Unknown names show an error box. */
export function mountCharts(root: ParentNode): void {
  for (const fig of Array.from(root.querySelectorAll<HTMLElement>("figure[data-chart]"))) {
    const name = fig.dataset.chart as ChartName;
    const def = CHARTS[name];
    fig.classList.add("chart");
    const head = document.createElement("div");
    head.className = "chart-head";
    const title = document.createElement("p");
    title.className = "chart-title";
    title.textContent = def ? def.title : `Unknown chart "${name}"`;
    const tools = document.createElement("div");
    tools.className = "chart-tools";
    const table = document.createElement("div");
    table.className = "chart-table table-scroll";
    table.hidden = true;
    const toggle = btn("Show data", "Show the chart's data as a table", (b) => {
      table.hidden = !table.hidden;
      b.textContent = table.hidden ? "Show data" : "Hide data";
      b.setAttribute("aria-expanded", String(!table.hidden));
    });
    toggle.classList.add("show-data");
    toggle.setAttribute("aria-expanded", "false");
    toggle.hidden = true;
    tools.append(toggle);
    head.append(title, tools);
    const legendSlot = document.createElement("div");
    legendSlot.className = "chart-legend-slot";
    const box = document.createElement("div");
    box.className = "chart-box";
    box.setAttribute("role", "img");
    box.setAttribute("aria-label", def ? def.title : "Unknown chart");
    const caption = fig.querySelector("figcaption");
    fig.replaceChildren(head, legendSlot, box, table, ...(caption ? [caption] : []));
    if (!def) {
      box.textContent = `There is no chart named "${name}" (see src/devdocs/CONTRACT.md).`;
      box.classList.add("chart-error");
      continue;
    }
    const placeholder = document.createElement("p");
    placeholder.className = "chart-wait";
    placeholder.textContent = "Drawing…";
    box.append(placeholder);
    const mt: Mounted = { fig, name, state: "idle" };
    mounted.push(mt);
    if (io) io.observe(fig); else void start(mt);
  }
}

/** Draw every chart now (before printing). */
export async function renderAllCharts(): Promise<void> {
  await Promise.all(mounted.map(start));
}
