import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { sourceStats } from "./src/devdocs/charts/sourceStats.ts";

// Production builds use a relative base so the game works from any subpath,
// such as GitHub Pages (https://<user>.github.io/verdant-reach/). Every
// runtime asset path is already relative ("assets/..."); only index.html's
// root-absolute links need Vite's rewriting.
//
// Five pages: the game (index.html), the guidebook (guide.html, docs/GUIDE.md),
// the Tile Lab (tilelab.html, docs/ART.md § Tile Lab), the developer docs
// (devdocs.html, docs/DEVDOCS.md) and the Trainer Editor (trainereditor.html,
// docs/TRAINERS.md).

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

/** The Trainer Editor's "Save to repo" endpoint (src/trainereditor/main.ts). */
const TRAINER_SAVE_URL = "/__trainereditor/save";
const TRAINER_SAVE_MAX = 2 * 1024 * 1024;

/**
 * Dev server only (`apply: "serve"`; never in a build or `vite preview`): the
 * Trainer Editor's "Save to repo". It accepts a same-origin JSON POST, checks
 * the body with the build's own trainersFileErrors (loaded through the dev
 * server, so it is the same code and data the game uses) and writes
 * src/data/trainers.json in its canonical layout. Anything else is refused.
 */
function trainerEditorSave(): Plugin {
  return {
    name: "trainer-editor-save",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(TRAINER_SAVE_URL, (req, res) => {
        const reply = (status: number, body: { ok: boolean; errors?: string[]; bytes?: number }) => {
          res.statusCode = status;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(body));
        };
        if (req.method !== "POST") return reply(405, { ok: false, errors: ["POST only"] });
        const origin = req.headers.origin;
        let sameOrigin = !origin;
        try { if (origin) sameOrigin = new URL(origin).host === req.headers.host; } catch { sameOrigin = false; }
        if (!sameOrigin || req.headers["x-trainer-editor"] !== "1" || !String(req.headers["content-type"] ?? "").startsWith("application/json")) {
          return reply(403, { ok: false, errors: ["only the Trainer Editor page on this dev server may save"] });
        }
        const chunks: Buffer[] = [];
        let size = 0;
        req.on("data", (c: Buffer) => {
          size += c.length;
          if (size > TRAINER_SAVE_MAX) req.destroy();
          else chunks.push(c);
        });
        req.on("end", () => {
          void (async () => {
            try {
              const file = JSON.parse(Buffer.concat(chunks).toString("utf8"));
              const tf = await server.ssrLoadModule("/src/world/trainerFile.ts");
              const { TRAINER_LINES } = await server.ssrLoadModule("/src/world/trainers.ts");
              const { DATA } = await server.ssrLoadModule("/src/data/index.ts");
              const errors: string[] = tf.trainersFileErrors(file, { data: DATA, lines: TRAINER_LINES });
              if (errors.length) return reply(422, { ok: false, errors });
              const text: string = tf.formatTrainersFile(file);
              writeFileSync(join(root, "src/data/trainers.json"), text);
              server.config.logger.info(`[trainer-editor] wrote src/data/trainers.json (${text.length} bytes)`);
              reply(200, { ok: true, bytes: text.length });
            } catch (e) {
              reply(400, { ok: false, errors: [e instanceof Error ? e.message : String(e)] });
            }
          })();
        });
      });
    },
  };
}

export default defineConfig(({ command }) => ({
  base: command === "build" ? "./" : "/",
  plugins: [devdocsSource(), trainerEditorSave()],
  build: {
    rolldownOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        guide: fileURLToPath(new URL("./guide.html", import.meta.url)),
        tilelab: fileURLToPath(new URL("./tilelab.html", import.meta.url)),
        devdocs: fileURLToPath(new URL("./devdocs.html", import.meta.url)),
        trainereditor: fileURLToPath(new URL("./trainereditor.html", import.meta.url)),
      },
    },
  },
}));
