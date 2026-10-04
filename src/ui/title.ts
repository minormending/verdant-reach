// PLACEHOLDER - replaced by the engine agent (title screen -> new game / continue).
import type { GameContext, Scene } from "../contracts";

export function createTitleScene(ctx: GameContext): Scene {
  return {
    update() {},
    draw(g) {
      ctx.ui.drawWindow(g, 8, 48, 144, 40);
      ctx.ui.drawText(g, "VERDANT REACH", 28, 60);
      ctx.ui.drawText(g, "scaffold ok", 36, 72);
    },
  };
}
