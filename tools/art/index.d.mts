// Types for tools/art/index.mjs (imported by src/art/bundles.test.ts).
export const INDEX_FORMAT: "verdant.artindex/1";
export const BUNDLE_KINDS: Record<"species" | "tilesets" | "structures" | "characters" | "sets", string>;
export const DEFAULT_PUBLIC: string;
export function buildIndex(publicDir?: string): import("../../src/art/format").ArtIndex;
export function formatIndex(index: import("../../src/art/format").ArtIndex): string;
export function strayFolders(publicDir?: string): string[];
