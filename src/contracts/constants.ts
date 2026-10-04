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
// ASSET CONVENTIONS (paths are relative to the site root, files live under
// public/). The art agent produces these; the engine loads them by path.
// ---------------------------------------------------------------------------

/** 16x16 PNG. Optional second animation frame: `${key}__2.png` (water, tall_grass, flowers). */
export const tilePath = (key: TileKey, frame: 1 | 2 = 1) =>
  frame === 1 ? `assets/tiles/${key}.png` : `assets/tiles/${key}__2.png`;

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
export const speciesPath = (id: SpeciesId, kind: "front" | "back" | "icon" | "icon__2") =>
  `assets/species/${id}/${kind}.png`;

/** Optional 16x16 item icons. */
export const itemIconPath = (id: string) => `assets/items/${id}.png`;

/** 160x144 title screen art and other full-screen UI images. */
export const uiPath = (name: "title" | "title_logo" | "pod" | "pod_open" | "mark_bramble" | "mark_sundew" | "battle_ground") =>
  `assets/ui/${name}.png`;
