// Source statistics for the `module-graph` and `content-counts` charts.
//
// Pure: takes { path, text } pairs. vite.config.ts runs it over src/**/*.ts
// at build (and dev) time and serves the small result as the virtual module
// "virtual:devdocs-source", so the page never ships the source itself.

export interface SourceFile { path: string; text: string }

export interface FolderStats {
  /** Top-level folder under src/ ("battle"), or "main" for src/main.ts and other root files. */
  folder: string;
  files: number;
  lines: number;
  testFiles: number;
  /** `it(` / `test(` calls in the folder's *.test.ts files. */
  tests: number;
}

export interface ImportEdge { from: string; to: string; count: number }

export interface SourceStats {
  folders: FolderStats[];
  /** Imports between different top-level folders, from non-test files only. */
  edges: ImportEdge[];
}

/** "src/battle/logic/exp.ts" -> "battle"; "src/main.ts" -> "main". Null outside src/. */
export function folderOf(path: string): string | null {
  const p = path.replace(/^\/+/, "").replace(/^\.\//, "");
  if (!p.startsWith("src/")) return null;
  const rest = p.slice(4).split("/");
  return rest.length > 1 ? rest[0] : "main";
}

/** Resolve a relative specifier against the importing file's directory (POSIX paths). */
export function resolveRelative(fromPath: string, spec: string): string {
  const parts = fromPath.split("/").slice(0, -1);
  for (const seg of spec.split("/")) {
    if (seg === "." || seg === "") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}

/** Relative module specifiers a file imports or re-exports (static, dynamic and side-effect imports). */
export function importSpecifiers(text: string): string[] {
  const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
  const out: string[] = [];
  const res = [
    /\b(?:import|export)\s[^"'`;]*?\bfrom\s*["'](\.{1,2}\/[^"']+)["']/g,
    /\bimport\s*["'](\.{1,2}\/[^"']+)["']/g,
    /\bimport\s*\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g,
  ];
  for (const re of res) for (let m = re.exec(code); m; m = re.exec(code)) out.push(m[1]);
  return out;
}

/** Test cases in a test file: `it(`/`test(` calls (with .skip/.only/.todo/.each variants). */
export function countTests(text: string): number {
  const re = /(?:^|[^\w.$])(?:it|test)(?:\.(?:skip|only|todo|concurrent|fails|skipIf\([^)]*\)|runIf\([^)]*\)))*(?:\.each\s*(?:\([\s\S]*?\)|`[\s\S]*?`))?\s*\(\s*["'`]/g;
  return (text.match(re) ?? []).length;
}

const isTest = (p: string) => /\.test\.ts$/.test(p);

export function sourceStats(files: readonly SourceFile[]): SourceStats {
  const folders = new Map<string, FolderStats>();
  const edges = new Map<string, ImportEdge>();
  const sorted = [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const known = new Set(sorted.map((f) => folderOf(f.path)).filter((f): f is string => !!f && f !== "main"));
  // "src/contracts" (a folder's index) is the folder, not a root file.
  const targetFolder = (resolved: string) => {
    const seg = resolved.replace(/^src\//, "").replace(/\.[a-z]+$/, "");
    return !seg.includes("/") && known.has(seg) ? seg : folderOf(resolved);
  };
  for (const f of sorted) {
    const folder = folderOf(f.path);
    if (!folder || !f.path.endsWith(".ts") || f.path.endsWith(".d.ts")) continue;
    const st = folders.get(folder) ?? { folder, files: 0, lines: 0, testFiles: 0, tests: 0 };
    folders.set(folder, st);
    const lines = f.text.split("\n").length - (f.text.endsWith("\n") ? 1 : 0);
    if (isTest(f.path)) {
      st.testFiles++;
      st.tests += countTests(f.text);
      continue;
    }
    st.files++;
    st.lines += lines;
    for (const spec of importSpecifiers(f.text)) {
      const to = targetFolder(resolveRelative(f.path, spec));
      if (!to || to === folder) continue;
      const key = `${folder}>${to}`;
      const e = edges.get(key) ?? { from: folder, to, count: 0 };
      e.count++;
      edges.set(key, e);
    }
  }
  return {
    folders: [...folders.values()].sort((a, b) => a.folder.localeCompare(b.folder)),
    edges: [...edges.values()].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)),
  };
}
