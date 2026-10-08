import type { Assets, CharacterKey } from "../contracts";
import { facePath, TEXTBOX } from "../contracts";

/** Six ticks closed at the end of each 150-tick period. No random draws. */
export function blinkFrame(tick: number, frames = 1): number {
  return frames > 1 && ((Math.floor(tick) % 150 + 150) % 150) >= 144 ? 1 : 0;
}

/** Above the unchanged 36×3 text box, overlapping its border by four pixels. */
export const FACE_CARD = { x: TEXTBOX.x + 4, y: TEXTBOX.y + 4 - 48, w: 48, h: 48 };

export function drawSpeakerFace(g: CanvasRenderingContext2D, assets: Assets, key: CharacterKey | null | undefined, tick: number) {
  if (!key) return;
  const path = facePath(key);
  if (!assets.has(path)) return; // No optional asset => no draw calls or loading during draw.
  const frame = blinkFrame(tick, assets.imageFrames?.(path) ?? 1);
  const image = assets.imageFrame?.(path, frame) ?? assets.image(path);
  if (image) g.drawImage(image, FACE_CARD.x, FACE_CARD.y);
}
