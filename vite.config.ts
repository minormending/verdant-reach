import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Production builds use a relative base so the game works from any subpath,
// such as GitHub Pages (https://<user>.github.io/verdant-reach/). Every
// runtime asset path is already relative ("assets/..."); only index.html's
// root-absolute links need Vite's rewriting.
//
// Two pages: the game (index.html) and the guidebook (guide.html, docs/GUIDE.md).
export default defineConfig(({ command }) => ({
  base: command === "build" ? "./" : "/",
  build: {
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        guide: fileURLToPath(new URL("./guide.html", import.meta.url)),
      },
    },
  },
}));
