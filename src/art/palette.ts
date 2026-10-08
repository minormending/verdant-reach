// Exact palette swaps: every pixel whose RGB equals `from[i]` becomes `to[i]`.
// Used for sports (`?sport`) and palette-only art-pack overrides. Pure.

export type Rgb = [number, number, number];

export function parseHex(hex: string): Rgb | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function toHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function isPalette(p: unknown, len?: number): p is string[] {
  return Array.isArray(p) && (len === undefined || p.length === len) && p.every((c) => typeof c === "string" && parseHex(c) !== null);
}

export function isSportMap(p: unknown): p is Record<string, string> {
  return typeof p === "object" && p !== null && !Array.isArray(p) &&
    Object.entries(p).every(([a, b]) => parseHex(a) !== null && typeof b === "string" && parseHex(b) !== null);
}

/** Compose a palette override and material sport into one simultaneous swap. */
export function materialRecolor(base: Recolor | null, sport: Record<string, string>): Recolor | null {
  const map = new Map(Object.entries(sport).map(([a, b]) => [a.toLowerCase(), b]));
  const from = [...(base?.from ?? [])];
  const to = (base?.to ?? []).map(c => map.get(c.toLowerCase()) ?? c);
  for (const [a, b] of map) {
    if (!from.some(c => c.toLowerCase() === a)) { from.push(a); to.push(b); }
  }
  return makeRecolor(from, to);
}

export function samePalette(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((c, i) => c.toLowerCase() === b[i].toLowerCase());
}

/** A swap from one palette to another, or null when nothing changes. */
export interface Recolor { from: string[]; to: string[] }
export function makeRecolor(from: readonly string[] | undefined, to: readonly string[] | undefined): Recolor | null {
  if (!from || !to || from.length !== to.length || samePalette(from, to)) return null;
  return { from: [...from], to: [...to] };
}

/**
 * Apply a recolour in place to RGBA data. Pixels with alpha 0 are skipped;
 * colours outside `from` are left alone. Returns how many pixels changed.
 */
export function recolorRgba(data: Uint8Array | Uint8ClampedArray, rc: Recolor): number {
  const map = new Map<number, Rgb>();
  rc.from.forEach((h, i) => {
    const a = parseHex(h), b = parseHex(rc.to[i]);
    if (a && b && !map.has((a[0] << 16) | (a[1] << 8) | a[2])) map.set((a[0] << 16) | (a[1] << 8) | a[2], b);
  });
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const to = map.get((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    if (!to) continue;
    data[i] = to[0]; data[i + 1] = to[1]; data[i + 2] = to[2];
    n++;
  }
  return n;
}

/** Distinct opaque colours (lower-case hex) and whether alpha is binary. */
export function colorStats(data: Uint8Array | Uint8ClampedArray): { colors: Set<string>; partialAlpha: number } {
  const colors = new Set<string>();
  let partialAlpha = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;
    if (a !== 255) partialAlpha++;
    colors.add(toHex(data[i], data[i + 1], data[i + 2]));
  }
  return { colors, partialAlpha };
}
