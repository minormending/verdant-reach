// ?dev=audio : jukebox. LEFT/RIGHT pick a category, UP/DOWN pick an entry,
// A plays it, B stops the music, SELECT cycles music volume.

import type { GameContext, Scene } from "../contracts";
import { JINGLES, MUSIC, SFX, SPECIES_IDS, UI } from "../contracts";
import { audioDebug } from "./index";

type Cat = { name: string; ids: readonly string[]; play(id: string): void };

export default function jukebox(ctx: GameContext): Scene {
  let last = "";
  const cats: Cat[] = [
    { name: "MUSIC", ids: MUSIC, play: (id) => { ctx.audio.stopMusic(); ctx.audio.playMusic(id as never); } },
    { name: "JINGLE", ids: JINGLES, play: (id) => { void ctx.audio.playJingle(id as never); } },
    { name: "SFX", ids: SFX, play: (id) => ctx.audio.playSfx(id as never) },
    { name: "CRY", ids: SPECIES_IDS, play: (id) => { void ctx.audio.playCry(id as never); } },
  ];
  let cat = 0;
  const sel = [0, 0, 0, 0];
  const VISIBLE = 9;
  const vols = [1, 0.6, 0.3, 0];
  let vol = 0;

  return {
    enter() { ctx.audio.setVolume(vols[vol], 0.9); },
    update() {
      const c = cats[cat];
      const n = c.ids.length;
      if (ctx.input.repeat("left")) cat = (cat + cats.length - 1) % cats.length;
      if (ctx.input.repeat("right")) cat = (cat + 1) % cats.length;
      if (ctx.input.repeat("up")) sel[cat] = (sel[cat] + n - 1) % n;
      if (ctx.input.repeat("down")) sel[cat] = (sel[cat] + 1) % n;
      if (ctx.input.pressed("a")) {
        ctx.audio.unlock();
        const id = cats[cat].ids[sel[cat]];
        cats[cat].play(id);
        last = id;
      }
      if (ctx.input.pressed("b")) { ctx.audio.stopMusic(20); last = ""; }
      if (ctx.input.pressed("select")) { vol = (vol + 1) % vols.length; ctx.audio.setVolume(vols[vol], 0.9); }
    },
    draw(g) {
      const ui = ctx.ui;
      g.fillStyle = UI.light;
      g.fillRect(0, 0, 160, 144);
      ui.drawWindow(g, 0, 0, 160, 24);
      ui.drawText(g, "JUKEBOX", 8, 8);
      ui.drawText(g, `<${cats[cat].name}>`.padStart(10), 72, 8);

      ui.drawWindow(g, 0, 24, 160, 88);
      const c = cats[cat];
      const top = Math.max(0, Math.min(sel[cat] - 4, c.ids.length - VISIBLE));
      for (let i = 0; i < VISIBLE && top + i < c.ids.length; i++) {
        const idx = top + i;
        const id = c.ids[idx];
        const name = cat === 3 ? ctx.data.species[id as keyof typeof ctx.data.species]?.name ?? id : id;
        const label = name.replace(/_/g, " ").toUpperCase().slice(0, 17);
        if (idx === sel[cat]) ui.drawText(g, ">", 8, 32 + i * 8);
        ui.drawText(g, label, 16, 32 + i * 8);
      }

      ui.drawWindow(g, 0, 112, 160, 32);
      const d = audioDebug(ctx.audio);
      const playing = ctx.audio.current();
      if (d && d.state !== "running") {
        ui.drawText(g, "A: UNLOCK + PLAY", 8, 120);
      } else if (playing) {
        ui.drawText(g, playing.replace(/_/g, " ").toUpperCase().slice(0, 18), 8, 120);
      } else {
        ui.drawText(g, (last || "B:STOP SEL:VOL").replace(/_/g, " ").toUpperCase().slice(0, 18), 8, 120);
      }
      // progress bar through the current song (shows the scheduler is advancing)
      if (d && d.songLength > 0) {
        const w = Math.floor((d.songTick / d.songLength) * 136);
        g.fillStyle = UI.dark;
        g.fillRect(8, 131, 136, 4);
        g.fillStyle = d.jingle ? UI.hpYellow : UI.hpGreen;
        g.fillRect(8, 131, w, 4);
      }
    },
  };
}
