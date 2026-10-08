// Crystal-style START menu in a top-right window. Sub-screens come from
// `ctx.screens` (battle agent); the trainer card and SAVE live in src/ui.

import type { GameContext, GlideDestination, Scene } from "../contracts";
import { SCREEN_W } from "../contracts";
import { storeOptions } from "../save";
import { notesScreen } from "../screens";
import { anyQuestStarted } from "./progress";
import { availableGlideDestinations, canGlide, glideLanding } from "./glide";
import { Menu } from "../ui/kit";
import { saveDialog, trainerCard } from "../ui/widgets";

export type StartItem = "herbarium" | "quickened" | "bag" | "glide" | "notes" | "card" | "save" | "options" | "exit";

/** Which entries are shown right now. */
export function startMenuItems(ctx: GameContext, scriptRunning = false): StartItem[] {
  const items: StartItem[] = [];
  if ((ctx.state.bag["field_herbarium"] ?? 0) > 0) items.push("herbarium");
  if (ctx.state.party.length > 0) items.push("quickened");
  items.push("bag");
  if (canGlide(ctx.state, ctx.world.maps[ctx.state.position.map], scriptRunning)) items.push("glide");
  if (anyQuestStarted(ctx.state.flags)) items.push("notes");
  items.push("card", "save", "options", "exit");
  return items;
}

function label(ctx: GameContext, id: StartItem): string {
  switch (id) {
    case "herbarium": return "HERBARIUM";
    case "quickened": return "QUICKENED";
    case "bag": return "BAG";
    case "glide": return "GLIDE";
    case "notes": return "NOTES";
    case "card": return ctx.state.playerName || "PLAYER";
    case "save": return "SAVE";
    case "options": return "OPTIONS";
    case "exit": return "EXIT";
  }
}

let lastItem: StartItem = "bag";

function openMenu(ctx: GameContext, scriptRunning: boolean): Promise<StartItem | null> {
  const items = startMenuItems(ctx, scriptRunning);
  const sfx = (id: "cursor" | "select" | "cancel") => ctx.audio.playSfx(id);
  return ctx.scenes.run<StartItem | null>((done) => {
    const start = Math.max(0, items.indexOf(lastItem));
    const w = 96;
    const menu = new Menu(items.map((i) => label(ctx, i)), sfx, { x: SCREEN_W - w - 8, y: 8, w, start });
    const scene: Scene = {
      transparent: true,
      update() {
        if (ctx.input.pressed("start")) { sfx("cancel"); done(null); return; }
        const r = menu.update(ctx.input);
        if (r === null) return;
        if (r < 0) { done(null); return; }
        lastItem = items[r];
        done(items[r]);
      },
      draw(g) { menu.draw(g); },
    };
    return scene;
  });
}

/** Runs the START menu until closed. */
export async function runStartMenu(ctx: GameContext, actions: {
  scriptRunning: boolean;
  glide(destination: GlideDestination): Promise<void>;
}): Promise<void> {
  ctx.audio.playSfx("menu_open");
  for (;;) {
    const item = await openMenu(ctx, actions.scriptRunning);
    if (!item || item === "exit") return;
    switch (item) {
      case "herbarium": await ctx.screens.herbarium(); break;
      case "quickened": await ctx.screens.party({ mode: "view" }); break;
      case "bag": await ctx.screens.bag({ inBattle: false }); break;
      case "glide": {
        if (!canGlide(ctx.state, ctx.world.maps[ctx.state.position.map], actions.scriptRunning)) break;
        const destinations = availableGlideDestinations(ctx.world, ctx.state);
        const chosen = await ctx.ui.choose([...destinations.map((d) => d.name), "CANCEL"], { prompt: "Where shall we go?", cancel: true });
        const destination = destinations[chosen];
        if (!destination) break;
        const landing = glideLanding(ctx.world, ctx.state, destination.map);
        if (landing) {
          await actions.glide(landing);
          return;
        }
        break;
      }
      case "notes": await notesScreen(ctx); break;
      case "card": await trainerCard(ctx); break;
      case "options":
        await ctx.screens.options();
        storeOptions(ctx.state.options);
        break;
      case "save":
        await saveDialog(ctx);
        return; // Crystal closes the menu after saving
    }
  }
}
