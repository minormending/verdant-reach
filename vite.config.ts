import { defineConfig } from "vite";

// Production builds use a relative base so the game works from any subpath,
// such as GitHub Pages (https://<user>.github.io/verdant-reach/). Every
// runtime asset path is already relative ("assets/..."); only index.html's
// root-absolute links need Vite's rewriting.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "./" : "/",
}));
