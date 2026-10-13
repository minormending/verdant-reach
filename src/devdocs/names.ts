// Names the content contract (src/devdocs/CONTRACT.md) promises writers.
// Kept free of game imports so the fragment validator stays cheap.

/** Every `<figure data-chart="NAME">` the page can draw (CONTRACT.md § Charts). */
export const CHART_NAMES = [
  "exp-curves",
  "type-chart",
  "catch-curve",
  "damage-spread",
  "base-stat-totals",
  "species-by-type",
  "level-curve",
  "map-sizes",
  "warp-graph",
  "module-graph",
  "script-ops",
  "content-counts",
  "bundle-kinds",
] as const;
export type ChartName = (typeof CHART_NAMES)[number];

/** Ids the page shell itself creates; fragments may link to them but not reuse them. */
export const SHELL_IDS = ["top", "contents", "cover", "inside", "search"] as const;

/** Code languages the highlighter knows (`<code class="lang-…">`): the contract's four plus js and yaml. */
export const CODE_LANGS = ["ts", "json", "bash", "py", "js", "yaml"] as const;

export const REPO_URL = "https://github.com/minormending/verdant-reach";
/** Where `data-src` links point: the file on GitHub `main`. */
export const srcUrl = (path: string) => `${REPO_URL}/blob/main/${path.replace(/^\/+/, "")}`;
