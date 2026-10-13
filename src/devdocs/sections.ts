// The section fragments, in file-name order (CONTRACT.md). Raw HTML strings,
// bundled at build time; the shell parses them into the page.

import type { Fragment } from "./validate";

const raw = import.meta.glob<string>("./sections/*.html", { query: "?raw", eager: true, import: "default" });

const toFragments = (mods: Record<string, string>): Fragment[] =>
  Object.keys(mods)
    .sort()
    .map((key) => ({ file: key.slice(key.lastIndexOf("/") + 1), html: mods[key] }));

export const FRAGMENTS: Fragment[] = toFragments(raw);

/**
 * Dev only: `devdocs.html?fixture=1` appends the untracked stand-in sections
 * in src/devdocs/fixture.local/ (gitignored), so the shell can be worked on
 * before the real sections exist. Production builds drop this branch.
 */
export async function devFixtures(): Promise<Fragment[]> {
  if (!import.meta.env.DEV || !new URLSearchParams(location.search).has("fixture")) return [];
  const lazy = import.meta.glob<string>("./fixture.local/*.html", { query: "?raw", import: "default" });
  const mods: Record<string, string> = {};
  for (const [k, load] of Object.entries(lazy)) mods[k] = await load();
  return toFragments(mods);
}
