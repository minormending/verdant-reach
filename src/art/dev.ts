// ?dev=art: the Art Lab. Mounts a full-window DOM tool over the game canvas
// (see src/art/lab/). Works in dev and in the production build.

import type { GameContext, Scene } from "../contracts";
import { UI } from "../contracts";
import { activeArt, createArtAssets } from "./index";
import { Lab } from "./lab/lab";

export default async function artLab(ctx: GameContext): Promise<Scene> {
  const reg = activeArt() ?? createArtAssets();
  await reg.ready();
  const lab = new Lab(reg, ctx);
  lab.mount();
  if (typeof window !== "undefined") (window as unknown as { __artLab: unknown }).__artLab = { lab, reg };
  return {
    update() {},
    draw(g) {
      g.fillStyle = UI.black;
      g.fillRect(0, 0, g.canvas.width, g.canvas.height);
    },
    exit() { lab.unmount(); },
  };
}
