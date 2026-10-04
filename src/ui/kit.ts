// PLACEHOLDER - replaced by the engine agent (bitmap font, windows, text box, menus).
import type { GameContext, UiKit } from "../contracts";
import { UI } from "../contracts";

export function createUiKit(_ctx: GameContext): UiKit {
  const kit: UiKit = {
    drawText(g, text, x, y, color = UI.black) {
      g.fillStyle = color;
      g.font = "8px monospace";
      g.textBaseline = "top";
      g.fillText(text, x, y);
    },
    drawWindow(g, x, y, w, h) {
      g.fillStyle = UI.white; g.fillRect(x, y, w, h);
      g.strokeStyle = UI.black; g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    },
    measure: (t) => t.length * 8,
    wrap: (t, cols) => {
      const out: string[] = []; let line = "";
      for (const w of t.split(" ")) {
        if ((line + " " + w).trim().length > cols) { out.push(line); line = w; } else line = (line + " " + w).trim();
      }
      if (line) out.push(line);
      return out;
    },
    say: async () => {},
    choose: async () => 0,
    yesNo: async () => true,
  };
  return kit;
}
