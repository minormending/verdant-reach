// Chapter 11's Council run and post-game wake (docs/CH11.md §1 and §5).
import type { ScriptCmd } from "../../contracts";
import { face, flag, ifFlags, movePlayer, say, type Scripts } from "../build";

export const COUNCIL_RUN_FLAGS = ["council_run", "beat_council_1", "beat_council_2", "beat_council_3", "beat_council_4", "beat_keeper",
  // The battle interpreter also records these trainer ids. Clear them so a
  // later script/interaction cannot skip a seat after losing the run.
  "beat_belladonna", "beat_mimi_osa", "beat_titus_arum", "beat_pyra", "beat_rowan"];
const reset = () => COUNCIL_RUN_FLAGS.map((f) => flag(f, false));
const call = (script: string): ScriptCmd => ({ op: "call", script });

/** Scripted trainers, so the seat flag opens the exit only after a win. */
function seat(id: string, name: string, win: string, previous: string, intro: string, after: string): Scripts {
  const ready = { council_run: true, [previous]: true };
  return {
    [id]: [ifFlags(ready, [ifFlags({ [win]: true }, [
      say(`TODO(text): ${after}`, name),
    ], [
      face(id, "toPlayer"), say(`TODO(text): ${intro}`, name),
      { op: "battle", trainer: id },
      { op: "ifLastBattle", result: "won", then: [call(`${id}_after`)] },
    ])], [say("TODO(text): Complete the earlier Council seats first.", "NARRATOR")])],
    [`${id}_after`]: [ifFlags({ ...ready, [`beat_${id}`]: true, [win]: false }, [
      flag(win), { op: "sfx", id: "door" }, say(`TODO(text): ${after}`, name),
    ])],
  };
}

export const ch11Scripts: Scripts = {
  ch11_hall_door: [ifFlags({ ch10_done: true }, [
    { op: "warp", to: "council_hall", x: 7, y: 10, facing: "up" },
  ], [say("TODO(text): The Council Hall is closed.", "NARRATOR"), movePlayer("down")])],
  ch11_run_start: [ifFlags({ council_run: false }, [ifFlags({ ch10_done: true }, [
    ...reset(), flag("council_run"),
    say("TODO(text): The door closes behind you.", "NARRATOR"),
  ], [{ op: "warp", to: "council_hall", x: 7, y: 1, facing: "down" }])])],
  ch11_whiteout: [ifFlags({ council_run: true }, [
    ...reset(), { op: "warp", to: "council_hall", x: 2, y: 4, facing: "up" },
  ])],
  ch11_heal: [say("TODO(text): Tend your Quickened at the lobby counter.", "NARRATOR"), { op: "heal" }],
  ch11_market: [{ op: "shop", stock: ["spring_water", "rain_jar", "compost", "neem_spray", "glass_pod"] }],
  ...seat("belladonna", "BELLADONNA", "beat_council_1", "ch10_done",
    "I hold the Apothecary seat. Show me how you tend your team.",
    "The Apothecary yields. The Sleeper's chamber is open."),
  ...seat("mimi_osa", "MIMI OSA", "beat_council_2", "beat_council_1",
    "Rest and movement both have their moment. Are you ready?",
    "The Sleeper yields. The Rotter waits beyond this door."),
  ...seat("titus_arum", "TITUS ARUM", "beat_council_3", "beat_council_2",
    "Even fallen leaves feed new growth. Meet the Rotter's team.",
    "The Rotter yields. Go on to the Kindler's chamber."),
  ...seat("pyra", "PYRA", "beat_council_4", "beat_council_3",
    "The Kindler's team is ready. Let your care shine through.",
    "The Kindler yields. ROWAN VALE, the Keeper, awaits."),
  ...seat("rowan", "ROWAN VALE", "beat_keeper", "beat_council_4",
    "You listened to the Grove. Now let the Keeper meet your team.",
    "You and your Quickened have earned your place. Enter the Herbarium."),
  // The fellowship map's onEnter runs this scene. Clearing council_run makes
  // re-entry harmless, while a fresh run can record another Hall of Fame team.
  ch11_ending: [ifFlags({ council_run: true, beat_keeper: true }, [
    ifFlags({ game_cleared: false }, [
      { op: "showNpc", npc: "imogen" },
      say("TODO(text): DR. VALE arrives at the Herbarium to meet ROWAN.", "NARRATOR"),
      face("rowan", "right"), face("imogen", "left"),
      say("TODO(text): IMOGEN. We have spent too long apart.", "ROWAN VALE"),
      say("TODO(text): We can start again, ROWAN. There is so much to learn together.", "DR. VALE"),
      say("TODO(text): ROWAN and IMOGEN reconcile beside the living collection.", "NARRATOR"),
      face("rowan", "toPlayer"), face("imogen", "toPlayer"),
      say("TODO(text): {PLAYER}, you are now a Fellow of the Herbarium.", "ROWAN VALE"),
      say("TODO(text): Your Field Herbarium is the record of a new world.", "DR. VALE"),
    ]),
    { op: "hallOfFame" }, { op: "credits" },
    flag("game_cleared"), flag("council_run", false),
    { op: "fade", to: "black" },
    { op: "warp", to: "player_home", x: 2, y: 2, facing: "down" },
    { op: "heal" }, { op: "fade", to: "clear" },
    say("TODO(text): You wake at home in FALLOWFIELD. A new day awaits.", "NARRATOR"),
  ])],
};
