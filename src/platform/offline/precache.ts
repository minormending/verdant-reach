// Build-time helpers for the offline service worker (sw.template.js): which
// built files to store, and the worker's source with them filled in. Pure, so
// vite.config.ts and the tests share it.

/** Files a phone needs to play offline: everything but the worker itself, source maps and OS clutter. */
export function precacheList(files: readonly string[]): string[] {
  const keep = files
    .map((f) => f.split("\\").join("/"))
    .filter((f) => f !== "sw.js" && !f.endsWith(".map") && !/(^|\/)\.DS_Store$/.test(f));
  // "./" is what the browser asks for when the game is opened by its folder URL.
  return ["./", ...keep.sort()];
}

/** The worker's source with this build's version and file list. */
export function swSource(template: string, files: readonly string[], version: string): string {
  const versionLine = 'const VERSION = "__VERSION__";';
  const filesLine = "const FILES = __FILES__;";
  if (!template.includes(versionLine) || !template.includes(filesLine)) throw new Error("sw.template.js lost its placeholders");
  return template
    .replace(versionLine, `const VERSION = ${JSON.stringify(version)};`)
    .replace(filesLine, `const FILES = ${JSON.stringify(files)};`);
}
