// Dev server for automated runs: the normal dev server, minus HMR, so a long
// playthrough isn't reloaded every time someone saves a file. Reloading the
// page still picks up the latest code.
//   npx vite --config e2e/vite.config.ts --port 5190 --strictPort
import { defineConfig } from "vite";

export default defineConfig({
  root: new URL("..", import.meta.url).pathname,
  server: { hmr: false, ws: false },
  clearScreen: false,
});
