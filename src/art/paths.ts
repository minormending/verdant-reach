// Logical asset paths (built by the helpers in src/contracts/constants.ts)
// parsed into structured requests, and built back. Pure.

export type SpeciesFrameKind = "front" | "front__2" | "front__3" | "back" | "icon" | "icon__2";
export const SPECIES_FRAME_KINDS: readonly SpeciesFrameKind[] = ["front", "front__2", "front__3", "back", "icon", "icon__2"];

/** Logical directories served by image sets (ART.md §7). */
export const SET_DIRS = ["assets/trainers", "assets/items", "assets/ui", "assets/stills"] as const;

export type LogicalRef =
  | { type: "species"; id: string; kind: SpeciesFrameKind; sport: boolean }
  | { type: "tile"; key: string; frame: 1 | 2; alt?: number; mask?: number }
  | { type: "structure"; key: string }
  | { type: "character"; key: string }
  | { type: "set"; dir: string; key: string };

const SPECIES_RE = /^assets\/species\/([a-z0-9_]+)\/(front|front__2|front__3|back|icon|icon__2)\.png(\?sport)?$/;
const TILE_RE = /^assets\/tiles\/([a-z0-9_]+?)(?:~([1-9])|@(\d{1,2}))?(__2)?\.png$/;
const ONE_RE = /^assets\/(structures|characters)\/([a-z0-9_]+)\.png$/;
const SET_RE = /^(assets\/(?:trainers|items|ui|stills))\/([A-Za-z0-9_]+)\.png$/;

const cache = new Map<string, LogicalRef | null>();

/** Parse a logical path. Returns null for anything that isn't one. */
export function parseLogical(path: string): LogicalRef | null {
  const hit = cache.get(path);
  if (hit !== undefined) return hit;
  let out: LogicalRef | null = null;
  let m: RegExpExecArray | null;
  if ((m = SPECIES_RE.exec(path))) {
    out = { type: "species", id: m[1], kind: m[2] as SpeciesFrameKind, sport: !!m[3] };
  } else if ((m = TILE_RE.exec(path))) {
    const r: LogicalRef = { type: "tile", key: m[1], frame: m[4] ? 2 : 1 };
    if (m[2]) r.alt = Number(m[2]);
    if (m[3] !== undefined) {
      const mask = Number(m[3]);
      if (mask > 15) r.mask = -1; // invalid: never resolves
      else r.mask = mask;
    }
    out = r;
  } else if ((m = ONE_RE.exec(path))) {
    out = m[1] === "structures" ? { type: "structure", key: m[2] } : { type: "character", key: m[2] };
  } else if ((m = SET_RE.exec(path))) {
    out = { type: "set", dir: m[1], key: m[2] };
  }
  if (cache.size > 20000) cache.clear();
  cache.set(path, out);
  return out;
}

/** Build the logical path for a parsed request (inverse of parseLogical). */
export function logicalPath(ref: LogicalRef): string {
  switch (ref.type) {
    case "species": return `assets/species/${ref.id}/${ref.kind}.png${ref.sport ? "?sport" : ""}`;
    case "tile": {
      const v = ref.alt ? `~${ref.alt}` : ref.mask !== undefined ? `@${ref.mask}` : "";
      return `assets/tiles/${ref.key}${v}${ref.frame === 2 ? "__2" : ""}.png`;
    }
    case "structure": return `assets/structures/${ref.key}.png`;
    case "character": return `assets/characters/${ref.key}.png`;
    case "set": return `${ref.dir}/${ref.key}.png`;
  }
}

/** The species frame list and index a frame kind reads from. */
export function speciesFrameSlot(kind: SpeciesFrameKind): { list: "front" | "back" | "icon"; index: number } {
  switch (kind) {
    case "front": return { list: "front", index: 0 };
    case "front__2": return { list: "front", index: 1 };
    case "front__3": return { list: "front", index: 2 };
    case "back": return { list: "back", index: 0 };
    case "icon": return { list: "icon", index: 0 };
    case "icon__2": return { list: "icon", index: 1 };
  }
}

/** The legacy file a logical path used to be (query stripped). */
export function legacyFileOf(path: string): string {
  const q = path.indexOf("?");
  return q >= 0 ? path.slice(0, q) : path;
}
