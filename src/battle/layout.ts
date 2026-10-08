// Native creature sizes, positioned independently from the widescreen canvas.
import { SCREEN_W, TEXTBOX } from "../contracts";
import { HALF, CONTENT_H } from "../screens/kit/layout";

export const ENEMY_HOME = { x: SCREEN_W - 72, y: 8 };
export const PLAYER_HOME = { x: 16, y: CONTENT_H - 72 };
export const ENEMY_CENTER = { x: ENEMY_HOME.x + 32, y: ENEMY_HOME.y + 32 };
export const PLAYER_CENTER = { x: PLAYER_HOME.x + 32, y: PLAYER_HOME.y + 32 };
export const ENEMY_GROUND = { x: ENEMY_CENTER.x, y: ENEMY_HOME.y + 62 };
export const PLAYER_GROUND = { x: PLAYER_CENTER.x, y: PLAYER_HOME.y + 62 };
export const PLAYER_HUD_AREA = { x: HALF - 40, y: 48, w: 128, h: 44 };
// Controls occupy the dialogue rail; no panel can cover a creature or HUD.
export const COMMAND_AREA = { x: HALF - 16, y: TEXTBOX.y, w: SCREEN_W - HALF + 16, h: 40 };
export const MOVE_AREA = { x: 96, y: TEXTBOX.y, w: SCREEN_W - 96, h: 48 };
export const MOVE_INFO_AREA = { x: 0, y: TEXTBOX.y, w: 96, h: MOVE_AREA.h };
