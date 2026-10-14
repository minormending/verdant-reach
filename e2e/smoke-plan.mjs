// The smoke suite's plan, for e2e/run.mjs --smoke (`npm run e2e:smoke`).
//
// SMOKE_PHASES: one page load each, in order, in one tab (the save carries
// over from `story` to `continue`). The in-page side is e2e/smoke.ts; each
// phase must report exactly `beats` beats.
// SMOKE_PAGES: the other pages, each opened in a fresh tab, must load with no
// console errors from this site and show their key content.

export const SMOKE_PHASES = [
  { name: "story", beats: 11 },    // title, NEW GAME, prologue, starter, FENNIMORE, PIP, theft, rival 1 won, SAVE
  { name: "continue", beats: 2 },  // CONTINUE from the title; the state matches the save
  { name: "rematch", beats: 3 },   // fixture via CONTINUE; MILO's rematch won at +1
  { name: "leader", beats: 3 },    // fixture via CONTINUE; HOLLIS won
  { name: "whiteout", beats: 3 },  // fixture via CONTINUE; whiteout to the heal point
];

// Each check runs in the page (page.waitForFunction / page.evaluate), so it
// must be self-contained. `ready` waits for the page to finish booting; `check`
// returns { ok, note }.
const booted = (id) => !document.querySelector(`#${id} .boot`) && (document.getElementById(id)?.childElementCount ?? 0) > 0;

export const SMOKE_PAGES = [
  {
    name: "guide.html: the guidebook builds its walkthrough and maps",
    path: "guide.html",
    ready: booted, arg: "guide",
    check: () => {
      const heads = [...document.querySelectorAll("#guide h1, #guide h2")].map((h) => h.textContent ?? "");
      const maps = document.querySelectorAll("#guide canvas").length;
      const stats = /\d+ Quickened/.test(document.body.innerText);
      return { ok: heads.some((h) => /Walkthrough/.test(h)) && maps > 0 && stats, note: `${heads.length} headings, ${maps} map canvases, stats line ${stats}` };
    },
  },
  {
    name: "tilelab.html: the Tile Lab draws the maps and tiles",
    path: "tilelab.html",
    ready: booted, arg: "tilelab",
    check: () => {
      const text = document.body.innerText;
      const canvases = document.querySelectorAll("#tilelab canvas").length;
      return { ok: /Tile Lab/.test(text) && /Tilesets/.test(text) && canvases > 0, note: `${canvases} canvases` };
    },
  },
  {
    name: "devdocs.html: every section and chart renders",
    path: "devdocs.html",
    ready: booted, arg: "devdocs",
    check: async () => {
      const sections = document.querySelectorAll("#devdocs section").length;
      const figs = [...document.querySelectorAll("figure[data-chart]")];
      // Charts draw lazily as they near the viewport: scroll to each in turn.
      for (const f of figs) {
        f.scrollIntoView();
        for (let i = 0; i < 200 && !f.querySelector(".chart-box svg, .chart-error"); i++) await new Promise((r) => setTimeout(r, 25));
      }
      const drawn = figs.filter((f) => f.querySelector(".chart-box svg")).length;
      const failed = figs.filter((f) => !f.querySelector(".chart-box svg")).map((f) => f.dataset.chart);
      return { ok: sections >= 10 && figs.length > 0 && drawn === figs.length,
        note: `${sections} sections, ${drawn}/${figs.length} charts drawn${failed.length ? `; not drawn: ${failed.join(", ")}` : ""}` };
    },
  },
  {
    name: "trainereditor.html: the Trainer Editor lists every map and the shipped data validates",
    path: "trainereditor.html",
    ready: booted, arg: "trainereditor",
    check: () => {
      const text = document.body.innerText;
      const status = text.match(/\d+ edited · \w+/)?.[0] ?? "no status";
      return { ok: /Trainer Editor/.test(text) && /ROUTE 1/.test(text) && /\d+ edited · valid/.test(text), note: status };
    },
  },
];

export const SMOKE_BEATS = SMOKE_PHASES.reduce((n, p) => n + p.beats, 0) + SMOKE_PAGES.length;

/**
 * Open each page in a fresh tab of `browser` under `origin`; record one beat per
 * page and an issue per console error or uncaught exception from this site.
 * Console errors about other sites' resources (the developer docs load Mermaid
 * from a CDN and fall back to the diagram source) are kept as notes instead.
 */
export async function checkPages(browser, origin, { started, beats, issues, notes }) {
  const t = () => Math.round((performance.now() - started) / 100) / 10;
  for (const spec of SMOKE_PAGES) {
    const page = await browser.newPage();
    const where = spec.path;
    page.on("pageerror", (e) => issues.push({ kind: "uncaught", msg: String(e.stack ?? e).slice(0, 300), where, t: t() }));
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const from = m.location()?.url ?? "";
      const entry = { kind: "console.error", msg: m.text().slice(0, 300), where: from ? `${where} (${from})` : where, t: t() };
      if (from && !from.startsWith(origin)) notes.push(entry);
      else issues.push(entry);
    });
    let result;
    try {
      await page.goto(`${origin}/${spec.path}`);
      await page.waitForFunction(spec.ready, spec.arg, { timeout: 60_000 });
      result = await page.evaluate(spec.check);
      await new Promise((r) => setTimeout(r, 500)); // late errors
    } catch (error) {
      result = { ok: false, note: String(error?.message ?? error).split("\n")[0] };
    }
    beats.push({ name: spec.name, ok: !!result?.ok, t: t(), map: where, newFlags: [], note: result?.note, phase: "pages" });
    await page.close();
  }
}
