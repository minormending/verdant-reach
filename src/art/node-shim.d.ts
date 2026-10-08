// Minimal typings for the few Node built-ins the art tests and tools use
// (the repo has no @types/node, and the shipped game never imports these).
// Only Node-side files (src/art/fs.ts, *.test.ts) may import them.

declare module "node:fs" {
  export function readFileSync(path: string | URL): Uint8Array;
  export function readFileSync(path: string | URL, encoding: "utf8"): string;
  export function existsSync(path: string | URL): boolean;
  export function readdirSync(path: string | URL): string[];
  export function statSync(path: string | URL): { isDirectory(): boolean; isFile(): boolean };
  export function writeFileSync(path: string | URL, data: string | Uint8Array): void;
  export function mkdirSync(path: string | URL, opts?: { recursive?: boolean }): void;
  export function mkdtempSync(prefix: string): string;
  export function rmSync(path: string | URL, opts?: { recursive?: boolean; force?: boolean }): void;
  export function cpSync(src: string, dest: string, opts?: { recursive?: boolean }): void;
}
declare module "node:zlib" {
  export function inflateSync(data: Uint8Array): Uint8Array;
  export function deflateSync(data: Uint8Array): Uint8Array;
}
declare module "node:url" {
  export function fileURLToPath(url: string | URL): string;
}
declare module "node:path" {
  export function join(...parts: string[]): string;
}
declare module "node:os" {
  export function tmpdir(): string;
}

declare module "node:child_process" {
  export function execFileSync(file: string, args: string[], options: { encoding: "utf8"; stdio?: "pipe" }): string;
}
