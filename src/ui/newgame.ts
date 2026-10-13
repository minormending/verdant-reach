// NEW GAME: Dr. Vale's short intro, the boy/girl choice, name entry, then the
// world's new-game script on the new-game map.

import type { CharacterKey, GameContext, PlayerLook, Scene, SpeciesId } from "../contracts";
import { PLAYER_ART, SCREEN_H, SCREEN_W, UI, characterPath, playerArt, speciesPath } from "../contracts";
import { clearScenes } from "../engine/core";
import { Fader, Timers, drawImagePath } from "../engine/gfx";
import { DEFAULT_PLAYER_NAMES, beginNewGameSession, loadOptions, newGameState } from "../save";
import { drawWindow } from "./kit";
import { nameEntry } from "./nameEntry";

type Portrait =
  | { kind: "char"; key: CharacterKey }
  | { kind: "species"; id: SpeciesId }
  /** Both player looks side by side (`lookIndex` is the one under the cursor). */
  | { kind: "looks" }
  | null;

/** The boy/girl choice, in menu order (BOY first, where the cursor starts). */
export const LOOK_CHOICES: readonly { look: PlayerLook; label: string }[] = [
  { look: "boy", label: "BOY" },
  { look: "girl", label: "GIRL" },
];
/** Where the BOY / GIRL menu sits: right of the portraits (the menu is 56 wide, 40 tall). */
const LOOK_MENU = { x: SCREEN_W - 56, y: 24 } as const;

export async function runNewGame(ctx: GameContext): Promise<void> {
  ctx.state = newGameState(ctx);
  ctx.state.options = loadOptions();
  beginNewGameSession();

  const fader = new Fader();
  fader.set("black");
  const timers = new Timers();
  let portrait: Portrait = null;
  let portraitAlpha = 0;
  let lookIndex = 0;
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
      // soft floor band
      g.fillStyle = "#e0ecd8";
      g.fillRect(0, 64, SCREEN_W, 32);
      g.fillStyle = UI.light;
      for (let x = 0; x < SCREEN_W; x += 4) g.fillRect(x + ((x / 4) % 2) * 2, 64, 2, 1);
      if (portrait?.kind === "looks") {
        g.globalAlpha = Math.round(portraitAlpha * 4) / 4;
        drawWindow(g, 4, 12, 96, 64);
        g.fillStyle = UI.white;
        g.fillRect(9, 17, 86, 54);
        LOOK_CHOICES.forEach(({ look }, i) => {
          const x = 9 + i * 44;
          const picked = i === lookIndex;
          if (picked) { g.fillStyle = "#e8f0e0"; g.fillRect(x, 17, 42, 54); }
          // The look under the cursor steps in place; the other stands still.
          const col = picked ? [0, 1, 0, 2][Math.floor(frame / 16) % 4] : 0;
          // Each 16x16 cell loses its two blank left columns so the pair fits at 3x
          // (the girl's ponytail reaches the right edge).
          drawImagePath(g, ctx.assets, characterPath(PLAYER_ART[look].character), col * 16 + 2, 0, 14, 16, x, 20, 42, 48);
        });
        g.globalAlpha = 1;
      } else if (portrait) {
        g.globalAlpha = Math.round(portraitAlpha * 4) / 4;
        drawWindow(g, 48, 12, 64, 64);
        g.fillStyle = "#e8f0e0";
        g.fillRect(53, 17, 54, 54);
        if (portrait.kind === "char") {
          const sheet = characterPath(portrait.key);
          drawImagePath(g, ctx.assets, sheet, 0, 0, 16, 16, 56, 20, 48, 48);
        } else {
          drawImagePath(g, ctx.assets, speciesPath(portrait.id, "front"), 0, 0, 56, 56, 52, 16);
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
  await say("You're our new junior botanist, aren't you?");
  await say("My notes are such a muddle.");

  await show({ kind: "looks" });
  const look = await chooseLook(ctx, (i) => { lookIndex = i; });
  ctx.state.playerLook = look;
  const sprite = playerArt(ctx.state).character;
  await show({ kind: "char", key: sprite });
  await say("Right! Remind me…");
  await say("…what was your name again?");

  const name = await nameEntry(ctx, {
    title: "YOUR NAME?", max: 7, defaultName: DEFAULT_PLAYER_NAMES[look], sprite,
  });
  ctx.state.playerName = name;

  await show({ kind: "char", key: sprite });
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

/** "Are you a boy? Or are you a girl?" Crystal-style: BOY / GIRL, the cursor on BOY.
 *  `onCursor` follows the highlighted choice so the portraits can show it. */
export async function chooseLook(ctx: GameContext, onCursor?: (index: number) => void): Promise<PlayerLook> {
  const i = await ctx.ui.choose(LOOK_CHOICES.map((c) => c.label), {
    prompt: "Are you a boy?\nOr are you a girl?", cancel: false, ...LOOK_MENU, onCursor,
  });
  return LOOK_CHOICES[i]?.look ?? "boy";
}
