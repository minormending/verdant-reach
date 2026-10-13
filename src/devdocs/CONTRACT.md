# Developer docs: content contract

The developer documentation page (`devdocs.html`, deployed at
`https://minormending.github.io/verdant-reach/devdocs.html`) is assembled from
HTML fragments in `src/devdocs/sections/`. The page shell (`src/devdocs/`)
loads them in file-name order, builds the navigation, renders diagrams and
charts, and highlights code. Writers only write fragments.

**Audience.** A junior to mid-level developer new to the codebase. Explain
the *why* as well as the *what*, define terms the first time they appear, and
prefer a diagram to a paragraph. Every section also has at least one
**Advanced** block for senior developers: invariants, trade-offs, performance,
edge cases, failure modes, how to extend safely.

## A section file

`src/devdocs/sections/<nn>-<slug>.html`, e.g. `03-engine.html`. One fragment:

```html
<section id="engine" data-title="The engine" data-summary="One line for the table of contents.">
  <h2>The engine</h2>
  <p>…</p>
  <h3 id="engine-loop">The fixed-step loop</h3>
  …
</section>
```

- `id` is unique and stable; sub-headings get ids prefixed with the section id.
- Only `h2` (once, the section title) and `h3`/`h4` inside.
- No `<script>`, no inline event handlers, no external images. Plain HTML.

## Building blocks

| Block | Markup |
|---|---|
| Diagram (flowchart, sequence, state, class, ER…) | `<pre class="mermaid">flowchart LR\n  A --> B</pre>` (Mermaid syntax; keep labels short; quote labels with punctuation) |
| Live chart from game data | `<figure data-chart="NAME"><figcaption>Caption</figcaption></figure>` with a NAME from the list below |
| Advanced block | `<details class="advanced"><summary>Advanced: short title</summary> … </details>` |
| Callouts | `<aside class="note">…</aside>`, `<aside class="tip">…</aside>`, `<aside class="warn">…</aside>` |
| Code | `<pre><code class="lang-ts">…</code></pre>` (also `lang-json`, `lang-bash`, `lang-py`); escape `<`, `>` and `&` |
| Link to source | `<a data-src="src/engine/core.ts">core.ts</a>` (optionally `#L40`) → GitHub `main` |
| Link to another section | `<a href="#battle-damage">damage</a>` |
| Key term | `<dfn>scene stack</dfn>` on first use |
| Table | plain `<table>` with `<thead>` |

Code excerpts must be copied from the real source (shortened with `// …`
where needed), never invented. Every claim must match the code on `main`.

## Charts (rendered from the game's own modules)

| NAME | What it shows |
|---|---|
| `exp-curves` | EXP needed per level for each growth rate (fast/medium/slow) |
| `type-chart` | The full type-effectiveness heatmap |
| `catch-curve` | Catch probability vs. remaining HP for a few catch rates, with and without status |
| `damage-spread` | Damage roll spread for a sample attack (min–max range, STAB, effectiveness) |
| `base-stat-totals` | Base-stat total by species, grouped by stage |
| `species-by-type` | Species count per type (primary and secondary) |
| `level-curve` | Wild-encounter and trainer levels across the story (by chapter/map order) |
| `map-sizes` | Map dimensions/area by map kind (outdoor/indoor) |
| `warp-graph` | Every map as a node and every warp as an edge (the world's connectivity) |
| `module-graph` | Source modules (`src/*`) and their imports between top-level folders |
| `script-ops` | Every ScriptCmd op with how often it is used across all scripts |
| `content-counts` | Counts: species, moves, items, maps, trainers, scripts, tests by area |
| `bundle-kinds` | Art bundles by kind (species, tileset, structure, character, set) |

If you need a chart that isn't listed, describe it in your report instead of
inventing a NAME.
