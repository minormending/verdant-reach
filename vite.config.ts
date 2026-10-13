import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { sourceStats } from "./src/devdocs/charts/sourceStats.ts";

// Production builds use a relative base so the game works from any subpath,
// such as GitHub Pages (https://<user>.github.io/verdant-reach/). Every
// runtime asset path is already relative ("assets/..."); only index.html's
// root-absolute links need Vite's rewriting.
//
// Four pages: the game (index.html), the guidebook (guide.html, docs/GUIDE.md),
// the Tile Lab (tilelab.html, docs/ART.md § Tile Lab) and the developer docs
// (devdocs.html, docs/DEVDOCS.md).

const root = fileURLToPath(new URL(".", import.meta.url));

/**
 * "virtual:devdocs-source": folder sizes, imports between src/ folders and
 * test counts for the developer docs' module-graph and content-counts charts,
 * computed from src/**\/*.ts when the module loads. Only devdocs.html imports
 * it, so the game bundle never sees it (and never ships the source).
 */
function devdocsSource(): Plugin {
  const id = "virtual:devdocs-source";
  const resolved = `\0${id}`;
  const walk = (dir: string, out: { path: string; text: string }[]) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (entry.isFile() && entry.name.endsWith(".ts")) {
        out.push({ path: relative(root, full).split("\\").join("/"), text: readFileSync(full, "utf8") });
      }
    }
    return out;
  };
  return {
    name: "devdocs-source",
    resolveId: (source) => (source === id ? resolved : undefined),
    load(loadId) {
      if (loadId !== resolved) return undefined;
      return `export default ${JSON.stringify(sourceStats(walk(join(root, "src"), [])))};`;
    },
  };
}

export default defineConfig(({ command }) => ({
  base: command === "build" ? "./" : "/",
  plugins: [devdocsSource()],
  build: {
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        guide: fileURLToPath(new URL("./guide.html", import.meta.url)),
        tilelab: fileURLToPath(new URL("./tilelab.html", import.meta.url)),
        devdocs: fileURLToPath(new URL("./devdocs.html", import.meta.url)),
      },
    },
  },
}));
