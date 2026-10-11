// Chapter 11's Council run and post-game wake (docs/CH11.md §1 and §5).
import type { ScriptCmd } from "../../contracts";
import { face, flag, ifFlags, movePlayer, say, type Scripts } from "../build";

export const COUNCIL_RUN_FLAGS = ["council_run", "council_rematch", "beat_council_1", "beat_council_2", "beat_council_3", "beat_council_4", "beat_keeper",
  // The battle interpreter also records these trainer ids. Clear them so a
  // later script/interaction cannot skip a seat after losing the run.
  "beat_belladonna", "beat_mimi_osa", "beat_titus_arum", "beat_pyra", "beat_rowan",
  "beat_belladonna_rematch", "beat_mimi_osa_rematch", "beat_titus_arum_rematch", "beat_pyra_rematch", "beat_rowan_rematch"];
const reset = () => COUNCIL_RUN_FLAGS.map((f) => flag(f, false));
const call = (script: string): ScriptCmd => ({ op: "call", script });

/** Scripted trainers, so the seat flag opens the exit only after a win. */
function seat(id: string, name: string, win: string, previous: string, intro: string[], after: string): Scripts {
  const ready = { council_run: true, [previous]: true };
  return {
    [id]: [ifFlags(ready, [ifFlags({ [win]: true }, [
      say(after, name),
    ], [
      face(id, "toPlayer"), ...intro.map((line) => say(line, name)),
      { op: "battle", trainer: id },
      { op: "ifLastBattle", result: "won", then: [call(`${id}_after`)] },
    ])], [say("They don't look up. The COUNCIL is faced in order, from the first seat on.")])],
    [`${id}_after`]: [ifFlags({ ...ready, [`beat_${id}`]: true, [win]: false }, [
      flag(win), { op: "sfx", id: "door" }, say(after, name),
    ])],
  };
}

// Voice: docs/STYLE.md §5. Narration has no speaker. Toxicity is only ever
// "toxic if eaten" (CH11.md §7.3).
const firstRunScripts: Scripts = {
  ch11_hall_door: [ifFlags({ ch10_done: true }, [
    { op: "warp", to: "council_hall", x: 7, y: 10, facing: "up" },
  ], [say("The doors are barred from inside. The COUNCIL HALL is closed."), movePlayer("down")])],
  ch11_run_start: [ifFlags({ council_run: false }, [ifFlags({ ch10_done: true }, [
    ...reset(), flag("council_run"),
    say("The door swings shut behind you. From here, the only way out is forward."),
  ], [{ op: "warp", to: "council_hall", x: 7, y: 1, facing: "down" }])])],
  ch11_whiteout: [ifFlags({ council_run: true }, [
    ...reset(), { op: "warp", to: "council_hall", x: 2, y: 4, facing: "up" },
  ])],
  ch11_heal: [
    say("The COUNCIL's own GREENHOUSE counter. Last water and light before the seats."),
    { op: "heal" },
    say("All tended. Mind yourself in there. Nobody on the COUNCIL goes easy."),
  ],
  ch11_market: [{ op: "shop", stock: ["spring_water", "rain_jar", "compost", "neem_spray", "glass_pod"] }],
  ...seat("belladonna", "BELLADONNA", "beat_council_1", "ch10_done", [
    "The APOTHECARY's seat. I'm BELLADONNA. Touch nothing. I label everything for a reason.",
    "The four of us went into the GROVE after MERCER. The lanes turned us round for days.",
    "You walked straight to the heart. So. Let's see what kind of botanist does that.",
  ], "Every one well tended. Go on. MIMI OSA's chamber is open. Try not to wake her."),
  ...seat("mimi_osa", "MIMI OSA", "beat_council_2", "beat_council_1", [
    "Shh... Mm? Oh. You got past BELLADONNA. I was only resting my eyes.",
    "I'm MIMI OSA. The SLEEPER. Everything in this room knows when to close...",
    "...and when to open. Let's see if you know when to wake up.",
  ], "There. Wide awake now. TITUS ARUM is next. Don't worry. You'll smell him first."),
  ...seat("titus_arum", "TITUS ARUM", "beat_council_3", "beat_council_2", [
    "Ah! Do come in. Breathe deep. ...No? Most people don't, at first.",
    "I am the ROTTER. My TITAN ARUM's bloom smells of carrion. The flies adore it.",
    "Rot is how a forest eats, my dear. Every fallen leaf goes back in. Shall we begin?",
  ], "Bravo. Bravo! Through you go. PYRA keeps the KINDLER's seat. Mind your eyebrows."),
  ...seat("pyra", "PYRA", "beat_council_4", "beat_council_3", [
    "Finally! I've paced a groove in this floor. I'm PYRA. The KINDLER.",
    "Folk think fire only ends things. Ha! My LODGEPOLE keeps cones sealed till fire opens them.",
    "And FIREWEED's among the first back on burned ground. Fire clears the way. Ready?",
  ], "Phew! You burn bright. Go on. ROWAN's waiting. The KEEPER is the real test."),
  ...seat("rowan", "ROWAN", "beat_keeper", "beat_council_4", [
    "Twenty years at the GROVE GATE. Long enough to forget how to talk to people.",
    "You pulled me out of that clearing, <PLAYER>. I owe you. But this hall doesn't deal in favours.",
    "So show me everything you've grown. All of it. I won't hold back.",
  ], "It's done. Go through to the HERBARIUM. ...There's someone there I sent for."),
  // The fellowship map's onEnter runs this scene. Clearing council_run makes
  // re-entry harmless, while a fresh run can record another Hall of Fame team.
  ch11_ending: [ifFlags({ council_run: true, beat_keeper: true }, [
    ifFlags({ game_cleared: false }, [
      { op: "showNpc", npc: "imogen" },
      { op: "still", image: "fellowship" },
      say("Tall windows. Shelves of pressed sheets, row on row. Quick footsteps on the stair."),
      say("VALE hurries in, coat buttoned wrong, a crumpled note in her hand."),
      face("rowan", "right"), face("imogen", "left"),
      say("You sent me a NOTE, ROWAN. Twenty years, and you sent a note.", "VALE"),
      say("I wrote you one every spring, IMOGEN. This is the first I sent.", "ROWAN"),
      say("...I wrote a few myself. They're in a drawer somewhere. Under the seed packets.", "VALE"),
      say("I chose the gate over you. I told myself the GROVE needed me more.", "ROWAN"),
      say("And I told myself you'd picked trees over people. We were both half right.", "VALE"),
      say("The GROVE doesn't need a gatekeeper now. It's awake. It can speak for itself.", "ROWAN"),
      say("Then come home for a while. The greenhouse could use someone patient.", "VALE"),
      say("For a moment, neither speaks. Then two VALES laugh at once, the same laugh."),
      face("rowan", "toPlayer"), face("imogen", "toPlayer"),
      say("<PLAYER>. You heard the GROVE when no one else would listen.", "ROWAN"),
      say("By the word of the COUNCIL, you are a FELLOW of the HERBARIUM.", "ROWAN"),
      say("Your FIELD HERBARIUM isn't just a catalogue any more, <PLAYER>.", "VALE"),
      say("It's the record of a new world. Every plant that chose to stay awake. Keep writing.", "VALE"),
      say("...Now. Who's hungry? I packed sandwiches. Somewhere.", "VALE"),
    ]),
    { op: "stillClear" }, { op: "hallOfFame" }, { op: "credits" },
    flag("game_cleared"), flag("council_run", false),
    { op: "fade", to: "black" },
    { op: "warp", to: "player_home", x: 2, y: 2, facing: "down" },
    { op: "heal" }, { op: "fade", to: "clear" },
    say("You wake at home in FALLOWFIELD. Rain in the barrel, sun on the sill."),
    say("Your FIELD HERBARIUM still has blank pages. Plenty of them."),
    say("And out past the fields, something new has begun to wander."),
  ])],
};

// Keep the same map/NPC hooks while selecting the post-game trainer set.
const rematchRoutes: Record<string, string> = {
  ch11_run_start: "pg_council_rematch", ch11_ending: "pg_rematch_ending",
};
for (const id of ["belladonna", "mimi_osa", "titus_arum", "pyra", "rowan"]) {
  rematchRoutes[id] = `${id}_rematch`;
  rematchRoutes[`${id}_after`] = `${id}_rematch_after`;
}
export const ch11Scripts: Scripts = Object.fromEntries(Object.entries(firstRunScripts).map(([id, cmds]) => [id,
  rematchRoutes[id] ? [ifFlags({ game_cleared: true }, [call(rematchRoutes[id])], cmds)] : cmds,
]));
