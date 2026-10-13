# The developer docs (devdocs.html)

How Verdant Reach is built, for developers new to the codebase, published
next to the game: https://minormending.github.io/verdant-reach/devdocs.html
(dev: http://localhost:5173/devdocs.html).

Writers supply only **HTML fragments** in `src/devdocs/sections/`, following
the content contract in [src/devdocs/CONTRACT.md](../src/devdocs/CONTRACT.md).
The page shell turns them into the page: navigation, search, diagrams, charts
and highlighted code. Every chart is computed in the browser from the game's
own modules, so the numbers can't drift from the build.

## How it is built

`devdocs.html` is the fourth Vite page (`build.rolldownOptions.input` in
`vite.config.ts`); `npm run build` emits `dist/devdocs.html` beside the game,
the guidebook and the Tile Lab. It shares the game's modules (data, world,
battle formulas), so the build splits common code into shared chunks; the
game's own entry, base and behaviour are unchanged.

| Module | Job |
|---|---|
| `src/devdocs/CONTRACT.md` | The content contract writers follow: one `<section>` per file, building blocks, chart names. |
| `src/devdocs/sections/*.html` | The content, loaded with `import.meta.glob(…, { query: "?raw", eager: true })` in file-name order (`sections.ts`). |
| `src/devdocs/validate.ts` | Pure, string-based fragment checks (no DOM), shared by the browser (dev) and vitest. |
| `src/devdocs/sections.test.ts` | Runs the validator over the real sections, plus self-tests of the validator. |
| `src/devdocs/main.ts`, `devdocs.css` | Page shell: cover, sticky contents with scroll-spy, search, light/dark, Advanced blocks, callouts, source links, tables, print. |
| `src/devdocs/highlight.ts` | A tiny highlighter (keywords, strings, comments, numbers) for `lang-ts`, `lang-json`, `lang-bash`, `lang-py` (also `lang-js`, `lang-yaml`). Text nodes only, never HTML. |
| `src/devdocs/mermaid.ts` | Mermaid diagrams: lazy, themed, re-rendered on theme change, with a source fallback (below). |
| `src/devdocs/panzoom.ts` | Pan/zoom (drag, wheel, pinch, keys) and the full-screen viewer used by diagrams and node-link charts. |
| `src/devdocs/charts/data.ts` | **Pure chart data** from `DATA`, `WORLD`, the battle formulas (`src/battle/logic`), the guidebook's walkthrough order and the art index. Tested in `data.test.ts` against the real formulas. |
| `src/devdocs/charts/sourceStats.ts` | Pure parsing of source text: folder sizes, imports between `src/` folders, test counts. |
| `src/devdocs/charts/index.ts`, `svg.ts` | The charts, as dependency-free SVG: titles, legends, tooltips, `role="img"` summaries, "Show data" tables, redraw on resize. |
| `src/devdocs/names.ts` | Chart names, reserved shell ids, code languages, the GitHub source URL. |

### Charts and source statistics

`module-graph` and `content-counts` need facts about the source tree. Rather
than shipping the source (about 3 MB) to the browser, a small Vite plugin in
`vite.config.ts` (`devdocsSource`) walks `src/**/*.ts` when the virtual module
`virtual:devdocs-source` is loaded and serves only the result of
`sourceStats()`, a few kilobytes of JSON. Only the docs page imports it, so
the game bundle never sees it. In dev it is computed when the server first
loads it; restart the dev server to refresh it. Test counts are `it(`/`test(`
calls in `*.test.ts` files, so loops that generate tests count once.

`script-ops` reads the op names from the `ScriptCmd` union in
`src/contracts/world.ts` (imported with `?raw`), so ops that no script uses
show up as unused. `bundle-kinds` fetches `art/index.json` at runtime, like the
art registry does.

The node-link charts are laid out deterministically: `warp-graph` places
outdoor maps in walkthrough order, snaking through rows, with each indoor map
under its nearest outdoor map; `module-graph` puts a folder one layer above
the highest folder it imports (cycles broken weakest-first and drawn as dashed
upward edges). Both are tested for determinism, and `warp-graph` for overlaps.

## Diagrams: why Mermaid comes from a CDN

The game has a hard rule: **zero runtime dependencies**. Mermaid is large
(megabytes of JavaScript with its renderers) and would be the repo's first runtime package,
so it is **not** in `package.json`. Instead `src/devdocs/mermaid.ts` imports a
pinned ESM build at runtime, on this page only:

`https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs`

- **Pinned:** the exact version is in the URL, so a new Mermaid release can't
  change the page. Bump it deliberately and look at every diagram.
- **Lazy:** the library loads when the first diagram nears the viewport, and
  each diagram renders as it scrolls near. Rendering is serialised.
- **Themed:** the `base` theme with colours read from the page's CSS
  variables; diagrams redraw when the light/dark mode changes.
- **Fails soft:** if the CDN can't be reached (offline, blocked), each
  diagram shows its source in a styled box with a note. A diagram with a
  syntax error shows its source and the error (and logs it in the console).
- **Safe:** `securityLevel: "strict"`; fragments can't carry scripts anyway.

Click a diagram to open it full screen (drag to pan, scroll or pinch to zoom,
Esc to close). Wide diagrams never shrink below about 65% and scroll inside
their box instead.

## How to add a section

1. Read [src/devdocs/CONTRACT.md](../src/devdocs/CONTRACT.md).
2. Add `src/devdocs/sections/<nn>-<slug>.html` with one
   `<section id="slug" data-title="…" data-summary="…">`, one `<h2>`, `h3`/`h4`
   with ids prefixed `slug-`, and at least one `<details class="advanced">`.
   The file-name number sets the order.
3. Use the building blocks: `<pre class="mermaid">`, `<figure data-chart="NAME">`,
   `<aside class="note|tip|warn">`, `<pre><code class="lang-ts">` (escape `<`,
   `>` and `&`), `<a data-src="src/…">` (optionally `#L40`) and
   `<a href="#id">`.
4. Run `npx vitest run src/devdocs` and look at it in `npm run dev`
   (`/devdocs.html#slug`). In dev, problems also show in a red banner at the
   top of the page and in the console.

`sections.test.ts` fails on: a file without exactly one `<section id
data-title>`, duplicate ids (across all files) or ids the shell reserves,
missing `h2` or Advanced block, unknown elements (often an unescaped `<` in
code), `<script>`, `<style>`, iframes and other embeds, inline event handlers,
`javascript:` URLs, external images, unknown chart names or code languages,
`#anchor` links that point nowhere, and `data-src` paths that don't exist in
the repository.

### Adding a chart

Add the NAME to `CHART_NAMES` (`src/devdocs/names.ts`) and to the table in
CONTRACT.md, a pure data function with a test in `charts/data.ts` /
`data.test.ts`, and a `ChartDef` in `charts/index.ts` (title, `load`,
`summary` for screen readers, `table`, `draw`, and `legend` for two or more
series). Series colours are `sf-N` (fill) and `sk-N` (stroke, legend) classes,
validated for colour-vision deficiency; text never wears a series colour.

### Working on the shell before the sections exist

`devdocs.html?fixture=1` (dev only) appends any stand-in fragments in
`src/devdocs/fixture.local/*.html`, a gitignored folder; production builds
drop that code path.
