import type { SpeciesId, TileKey, StructureKey, CharacterKey, TrainerPortraitKey } from "./ids";

/** Game Boy Color screen. Everything renders at this size, then integer-scales. */
export const SCREEN_W = 160;
export const SCREEN_H = 144;
export const TILE = 16;
export const VIEW_TILES_X = 10;
export const VIEW_TILES_Y = 9;
export const FPS = 60;

/** 8x8 bitmap font; a full-width text box fits 18 characters x 2 lines. */
export const FONT_W = 8;
export const FONT_H = 8;
export const TEXTBOX = { x: 0, y: 96, w: 160, h: 48, cols: 18, lines: 2 } as const;

/** UI palette (Crystal-like). Sprites carry their own 4-colour palettes. */
export const UI = {
  white: "#f8f8f8",
  light: "#a8d098",
  dark: "#306850",
  black: "#181818",
  hpGreen: "#30b848",
  hpYellow: "#f8b800",
  hpRed: "#e83018",
  expBlue: "#3870e8",
} as const;

/** Real-clock time of day, as in Crystal. */
export const TIME_OF_DAY = { morningStart: 4, dayStart: 10, nightStart: 18 } as const;

// ---------------------------------------------------------------------------
// ASSET CONVENTIONS. Each helper below builds a LOGICAL asset path. Since
// Round 4 these no longer have to be real files: the art registry (src/art/,
// docs/ART.md) resolves them to swappable bundles under public/art/: species
// folders, tileset sheets, structure/character bundles and image sets. Code
// keeps calling ctx.assets.image(<logical path>) exactly as before.
// ---------------------------------------------------------------------------

/** Root of the art bundles (served from public/art/). */
export const ART_ROOT = "art";

/** 16x16 PNG. Optional second animation frame: `${key}__2.png` (water, tall_grass, flowers). */
export const tilePath = (key: TileKey, frame: 1 | 2 = 1) =>
  frame === 1 ? `assets/tiles/${key}.png` : `assets/tiles/${key}__2.png`;

/**
 * AUTOTILING. Tiles in a group pick a variant from their 4 neighbours: mask
 * bit N=1, E=2, S=4, W=8 is set when that neighbour is in the SAME group
 * (out-of-bounds counts as same). The engine draws `${key}@${mask}.png` when
 * it exists (and `${key}@${mask}__2.png` for the second animation frame),
 * falling back to the plain tile. Art may supply any subset of the 16 masks.
 */
export const AUTOTILE: Partial<Record<TileKey, string>> = {
  water: "water", pond_lily: "water", water_channel: "water",
  reeds: "water", bridge: "water", // water flows into reed beds and under bridges
  path: "path", stone_path: "stone_path", dirt: "dirt", sand: "sand",
  bog: "bog", boardwalk: "boardwalk", tall_grass: "tall_grass",
  hedge: "hedge", fence: "fence", stone_wall: "stone_wall", cliff: "cliff",
  glass_wall: "glass_wall", wall: "wall",
  // forests join into one canopy mass with edges on the open sides
  tree: "tree", maple_tree: "maple", tapped_maple: "maple",
  // Round 4
  paving: "paving", tropical_grass: "tropical_grass", orchard_tree: "orchard",
  iron_railing: "iron_railing", rose_trellis: "rose_trellis", fountain_basin: "water",
  stepping_stones: "water", // stones sit in the river; water edges flow round them
  // Chapter 5
  oldgrowth_tree: "oldgrowth", canopy_boardwalk: "canopy_boardwalk", canopy_drop: "canopy_drop",
  rope_rail: "rope_rail", ash: "ash", hollow_wall: "hollow_wall",
  // Chapter 6
  seagrass_bed: "water", mangrove_roots: "mangrove", pier: "pier", volcanic_rock: "volcanic",
  // Frontier: frosted edges surround the sliding surface.
  ice: "ice",
  // Chapter 7: the red lake shares the water shoreline; hideout walls join into one mass.
  red_water: "water", hideout_wall: "hideout_wall",
  // Chapter 8: cable runs join, bend and end.
  cable_trunk: "cable_trunk",
};
/** Ground variation: `${key}~1.png`..`${key}~3.png` (if present) are picked by a
 *  position hash so large fields never look stamped. Base tile = variant 0. */
export const tileAltPath = (key: TileKey, alt: 1 | 2 | 3) => `assets/tiles/${key}~${alt}.png`;
export const tileVariantPath = (key: TileKey, mask: number, frame: 1 | 2 = 1) =>
  frame === 1 ? `assets/tiles/${key}@${mask}.png` : `assets/tiles/${key}@${mask}__2.png`;

/** PNG sized (w*16)x(h*16) per STRUCTURES. */
export const structurePath = (key: StructureKey) => `assets/structures/${key}.png`;

/**
 * Overworld sheet, 48x64 PNG: 4 rows (down, up, left, right) x 3 columns
 * (stand, step A, step B), each frame 16x16, transparent background.
 */
export const characterPath = (key: CharacterKey) => `assets/characters/${key}.png`;
export const CHAR_ROWS = { down: 0, up: 1, left: 2, right: 3 } as const;

/** Trainer battle picture: 56x56 PNG (player_back is 48x48). */
export const portraitPath = (key: TrainerPortraitKey) => `assets/trainers/${key}.png`;

/**
 * Species sprites:
 *  front.png 56x56 (enemy side, faces left), back.png 48x48 (player side),
 *  icon.png 16x16 (party menu; optional icon__2.png second frame).
 * 4 colours + transparency, GBC style.
 */
export type SpeciesSpriteKind =
  | "front" | "front__2" | "front__3" | "front__4" | "front__5" | "front__6" | "front__7" | "front__8"
  | "back" | "icon" | "icon__2";
/** `opts.sport` asks for the sport (shiny) colouring: an exact per-colour swap to the
 *  bundle's `sport` palette (Round 4; replaces the old runtime hue shift). */
export const speciesPath = (id: SpeciesId, kind: SpeciesSpriteKind, opts: { sport?: boolean } = {}) =>
  `assets/species/${id}/${kind}.png${opts.sport ? "?sport" : ""}`;
/** Front frames: front, front__2 .. front__8 (optional). How they play comes from the bundle's
 *  `anim` (see SpeciesAnim / docs/ART.md); with no `anim`, the first ≤3 ping-pong as the idle. */

/** Story illustrations: 160x144 PNG. */
export const stillPath = (key: import("./ids").StillKey) => `assets/stills/${key}.png`;

/** Optional 16x16 item icons. */
export const itemIconPath = (id: string) => `assets/items/${id}.png`;

/** 160x144 title screen art and other full-screen UI images. */
export const uiPath = (name: "title" | "title_logo" | "pod" | "pod_open" | "mark_bramble" | "mark_sundew" | "mark_rose" | "battle_ground"
  | "seed" | "seed__2" | "seed_big" | "mark_pipe" | "raft") => // Round 4: Nursery seed — 16x16 party icon (2 frames) and 56x56 summary/sprouting art
  `assets/ui/${name}.png`;
