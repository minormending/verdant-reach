// Native creature sizes, positioned independently from the widescreen canvas.
import { SCREEN_W, TEXTBOX } from "../contracts";
import { HALF, CONTENT_H } from "../screens/kit/layout";

export const ENEMY_HOME = { x: SCREEN_W - 72, y: 8 };
export const PLAYER_HOME = { x: 16, y: CONTENT_H - 56 };
export const ENEMY_CENTER = { x: ENEMY_HOME.x + 28, y: ENEMY_HOME.y + 30 };
export const PLAYER_CENTER = { x: PLAYER_HOME.x + 24, y: PLAYER_HOME.y + 26 };
export const ENEMY_GROUND = { x: ENEMY_CENTER.x, y: ENEMY_HOME.y + 50 };
export const PLAYER_GROUND = { x: PLAYER_CENTER.x, y: PLAYER_HOME.y + 48 };
export const PLAYER_HUD_AREA = { x: HALF - 40, y: CONTENT_H - 92, w: 128, h: 44 };
export const COMMAND_AREA = { x: HALF - 16, y: TEXTBOX.y - 40, w: SCREEN_W - HALF + 16, h: 40 };
export const MOVE_AREA = { ...COMMAND_AREA, y: TEXTBOX.y - 48, h: 48 };
export const MOVE_INFO_AREA = { x: MOVE_AREA.x - 80, y: MOVE_AREA.y, w: 80, h: MOVE_AREA.h };
