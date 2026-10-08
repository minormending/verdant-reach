// NEW GAME: Dr. Vale's short intro, name entry, then the world's new-game
// script on the new-game map.

import type { CharacterKey, GameContext, Scene, SpeciesId } from "../contracts";
import { SCREEN_H, SCREEN_W, TEXTBOX, UI, characterPath, speciesPath } from "../contracts";
import { clearScenes } from "../engine/core";
import { Fader, Timers, characterFrame, drawImagePath } from "../engine/gfx";
import { DEFAULT_PLAYER_NAME, beginNewGameSession, loadOptions, newGameState } from "../save";
import { drawWindow } from "./kit";
import { nameEntry } from "./nameEntry";

type Portrait = { kind: "char"; key: CharacterKey } | { kind: "species"; id: SpeciesId } | null;

export async function runNewGame(ctx: GameContext): Promise<void> {
  ctx.state = newGameState(ctx);
  ctx.state.options = loadOptions();
  beginNewGameSession();

  const fader = new Fader();
  fader.set("black");
  const timers = new Timers();
  let portrait: Portrait = null;
  let portraitAlpha = 0;
  let frame = 0;

  const scene: Scene = {
    update() {
      frame++;
      fader.tick();
      timers.tick();
      if (portrait && portraitAlpha < 1) portraitAlpha = Math.min(1, portraitAlpha + 1 / 16);
    },
    draw(g) {
      g.fillStyle = UI.white;
      g.fillRect(0, 0, SCREEN_W, SCREEN_H);
      const portraitX = Math.floor((SCREEN_W - 64) / 2);
      const portraitY = Math.floor((TEXTBOX.y - 64) / 2);
      const floorY = portraitY + 52;
      // soft floor band
      g.fillStyle = "#e0ecd8";
      g.fillRect(0, floorY, SCREEN_W, TEXTBOX.y - floorY);
      g.fillStyle = UI.light;
      for (let x = 0; x < SCREEN_W; x += 4) g.fillRect(x + ((x / 4) % 2) * 2, floorY, 2, 1);
      if (portrait) {
        g.globalAlpha = Math.round(portraitAlpha * 4) / 4;
        drawWindow(g, portraitX, portraitY, 64, 64);
        g.fillStyle = "#e8f0e0";
        g.fillRect(portraitX + 5, portraitY + 5, 54, 54);
        if (portrait.kind === "char") {
          const sheet = characterPath(portrait.key);
          const [w, h] = characterFrame(ctx.assets, portrait.key);
          // Fit at an integer scale (3x GBC, 1x tall), feet on the portrait baseline.
          const scale = Math.min(3, Math.floor(48 / w), Math.floor(48 / h));
          drawImagePath(g, ctx.assets, sheet, 0, 0, w, h,
            portraitX + 32 - w * scale / 2, portraitY + 56 - h * scale, w * scale, h * scale);
        } else {
          drawImagePath(g, ctx.assets, speciesPath(portrait.id, "front"), 0, 0, 56, 56, portraitX + 4, portraitY + 4);
        }
        g.globalAlpha = 1;
      }
      fader.draw(g, SCREEN_W, SCREEN_H);
    },
  };

  clearScenes(ctx.scenes);
  ctx.scenes.push(scene);
  ctx.audio.playMusic("herbarium");

  const show = async (p: Portrait) => {
    portrait = p;
    portraitAlpha = 0;
    await timers.frames(16);
  };
  const say = (t: string) => ctx.ui.say(t);

  await fader.to("clear", 24);
  await show({ kind: "char", key: "vale" });
  await say("Ah, there you are! Welcome to the FALLOWFIELD HERBARIUM.");
  await say("I'm DR. VALE. I run this place, when I'm not out in the field.");
  await show({ kind: "species", id: "dandelion_bud" });
  ctx.audio.playCry("dandelion_bud");
  await say("Every plant in this valley is busy. Growing, competing, signalling.");
  await say("They look still, but they never stop working.");
  await show({ kind: "char", key: "vale" });
  await say("Our job is to catalogue them, and to understand them.");
  await say("You're our new junior botanist, aren't you? Remind me…");
  await say("…what was your name again?");

  const name = await nameEntry(ctx, {
    title: "YOUR NAME?", max: 7, defaultName: DEFAULT_PLAYER_NAME, sprite: "player",
  });
  ctx.state.playerName = name;

  await show({ kind: "char", key: "player" });
  await say("{PLAYER}! Of course. I knew that.");
  await show({ kind: "char", key: "vale" });
  await say("Tonight's no ordinary shift, {PLAYER}.");
  await say("The CENTURYHEART on the far slope is about to bloom. The first time in a hundred years!");
  await say("Come up to the roof. You won't want to miss this!");

  ctx.audio.stopMusic(30);
  await fader.to("black", 30);
  await timers.frames(20);

  const { createOverworldScene } = await import("../overworld");
  clearScenes(ctx.scenes);
  ctx.scenes.push(createOverworldScene(ctx, { mode: "new" }));
}
