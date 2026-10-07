// Post-game events and repeat Council runs (POSTGAME.md §1).
import type { ScriptCmd } from "../../contracts";
import { face, flag, give, ifFlags, ifNight, say, type Scripts } from "../build";
import { COUNCIL_RUN_FLAGS } from "./ch11";

const call = (script: string): ScriptCmd => ({ op: "call", script });

/** Reuse the first run's room gates, but battle only the +8 trainer set. */
function seat(id: string, name: string, win: string, previous: string): Scripts {
  const trainer = `${id}_rematch`;
  const ready = { game_cleared: true, council_run: true, council_rematch: true, [previous]: true };
  const after = `TODO(text): ${name} yields. The next door is open.`;
  return {
    [trainer]: [ifFlags(ready, [ifFlags({ [win]: false }, [
      face(id, "toPlayer"), say(`TODO(text): ${name} is ready for your rematch.`, name),
      { op: "battle", trainer },
      { op: "ifLastBattle", result: "won", then: [call(`${trainer}_after`)] },
    ], [say(after, name)])])],
    [`${trainer}_after`]: [ifFlags({ ...ready, [`beat_${trainer}`]: true, [win]: false }, [
      flag(win), { op: "sfx", id: "door" }, say(after, name),
      // The battle engine pays rowan_rematch.prize (5000); do not pay twice.
      ...(id === "rowan" ? [give("rain_jar", 3),
        say("TODO(text): Take these three RAIN JARS for your next journey.", name)] : []),
    ])],
  };
}

export const postgameScripts: Scripts = {
  pg_centuryheart: [ifFlags({ game_cleared: true, got_centuryheart: false }, [
    say("TODO(text): The planted seed has sprouted twice.", "NARRATOR"),
    say("TODO(text): This CENTURYHEART will take a century to flower.", "NARRATOR"),
    { op: "giveSpecies", species: "centuryheart", level: 30 },
    flag("got_centuryheart"), { op: "hideNpc", npc: "centuryheart_sprout" },
  ])],
  pg_wanderers: [ifFlags({ game_cleared: true }, [ifFlags({ wanderers_free: false }, [
    face("rowan", "toPlayer"),
    say("TODO(text): TUMBLEWEED, COCONUT and BURR are free to wander.", "ROWAN"),
    say("TODO(text): Look on dry routes, at sea, and behind you.", "ROWAN"),
    flag("wanderers_free"),
  ], [say("TODO(text): The three wanderers are finding their own paths.", "ROWAN")])])],
  pg_fennimore: [ifFlags({ game_cleared: true }, [call("pg_diary")], [call("fennimore")])],
  pg_diary: [ifFlags({ game_cleared: true }, [ifFlags({ diary_read: false }, [
    { op: "ifHasItem", item: "old_diary", then: [
      face("fennimore", "toPlayer"), { op: "takeItem", item: "old_diary" },
      say("TODO(text): My grandfather's diary! Kept just in case.", "OLD FENNIMORE"),
      say("TODO(text): It holds the song of the last Quickening.", "OLD FENNIMORE"),
      say("TODO(text): Go to METHUSELAH RIDGE, above the Seed Vault.", "OLD FENNIMORE"),
      say("TODO(text): Visit the oldest bristlecone at night.", "OLD FENNIMORE"),
      flag("diary_read"),
    ], else: [say("TODO(text): Find my grandfather's diary in the Seed Vault.", "OLD FENNIMORE"),
      say("TODO(text): Look in the frozen archive.", "OLD FENNIMORE")] },
  ], [say("TODO(text): The song leads to METHUSELAH RIDGE.", "OLD FENNIMORE"),
    say("TODO(text): Visit the oldest bristlecone at night.", "OLD FENNIMORE")])])],
  pg_methuselah: [ifFlags({ game_cleared: true, diary_read: true }, [ifNight([
    say("TODO(text): METHUSELAH stirs beneath the stars.", "NARRATOR"),
    { op: "wildBattle", species: "methuselah", level: 70, canLose: true },
  ], [say("TODO(text): It's only an old tree.")])])],
  pg_council_rematch: [ifFlags({ game_cleared: true, council_run: false }, [
    ...COUNCIL_RUN_FLAGS.map((f) => flag(f, false)),
    flag("council_run"), flag("council_rematch"),
    say("TODO(text): The Council is ready to meet you again. The door closes behind you.", "NARRATOR"),
  ])],
  ...seat("belladonna", "BELLADONNA", "beat_council_1", "game_cleared"),
  ...seat("mimi_osa", "MIMI OSA", "beat_council_2", "beat_council_1"),
  ...seat("titus_arum", "TITUS ARUM", "beat_council_3", "beat_council_2"),
  ...seat("pyra", "PYRA", "beat_council_4", "beat_council_3"),
  ...seat("rowan", "ROWAN VALE", "beat_keeper", "beat_council_4"),
  pg_rematch_ending: [ifFlags({ game_cleared: true, council_run: true, council_rematch: true, beat_keeper: true }, [
    { op: "hallOfFame" }, flag("council_run", false), flag("council_rematch", false),
    say("TODO(text): Another team takes its place in the Herbarium's Hall of Fame.", "ROWAN VALE"),
  ])],
};
