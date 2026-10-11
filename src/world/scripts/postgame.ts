// Post-game events and repeat Council runs (POSTGAME.md §1).
import type { ScriptCmd } from "../../contracts";
import { face, flag, give, ifFlags, ifNight, say, type Scripts } from "../build";
import { COUNCIL_RUN_FLAGS } from "./ch11";

const call = (script: string): ScriptCmd => ({ op: "call", script });
const FEN = "FENNIMORE";

/** Reuse the first run's room gates, but battle only the +8 trainer set. */
function seat(id: string, name: string, win: string, previous: string, intro: string[], after: string): Scripts {
  const trainer = `${id}_rematch`;
  const ready = { game_cleared: true, council_run: true, council_rematch: true, [previous]: true };
  return {
    [trainer]: [ifFlags(ready, [ifFlags({ [win]: false }, [
      face(id, "toPlayer"), ...intro.map((line) => say(line, name)),
      { op: "battle", trainer },
      { op: "ifLastBattle", result: "won", then: [call(`${trainer}_after`)] },
    ], [say(after, name)])])],
    [`${trainer}_after`]: [ifFlags({ ...ready, [`beat_${trainer}`]: true, [win]: false }, [
      flag(win), { op: "sfx", id: "door" }, say(after, name),
      // The battle engine pays rowan_rematch.prize (5000); do not pay twice.
      ...(id === "rowan" ? [give("rain_jar", 3),
        say("Rain off the HERBARIUM roof, bottled. IMOGEN insisted. For the road.", name)] : []),
    ])],
  };
}

// Voice: docs/STYLE.md §5. Narration has no speaker; the Wanderers and
// METHUSELAH never speak in words.
export const postgameScripts: Scripts = {
  pg_centuryheart: [ifFlags({ game_cleared: true, got_centuryheart: false }, [
    say("Where you planted the CENTURYHEART SEED, the soil has split. Twice."),
    say("One shoot is rooted deep against the ELDER. The second leans toward you."),
    say("A tight rosette of stiff, spiny leaves. It will take a century to flower."),
    say("It won't grow any bigger while you watch. It doesn't seem to mind. It's in no hurry."),
    { op: "giveSpecies", species: "centuryheart", level: 30 },
    flag("got_centuryheart"), { op: "hideNpc", npc: "centuryheart_sprout" },
  ])],
  pg_wanderers: [ifFlags({ game_cleared: true }, [ifFlags({ wanderers_free: false }, [
    face("rowan", "toPlayer"),
    say("<PLAYER>. With the GROVE GATE open, three wanderers slipped out. Plants built to travel.", "ROWAN"),
    say("I could round them up. I won't. TUMBLEWEED, COCONUT and BURR are free to wander.", "ROWAN"),
    say("TUMBLEWEED dries, snaps off at the base, and rolls the dry routes, dropping seed.", "ROWAN"),
    say("COCONUT keeps to the sea. Its fruit floats. It can drift for months and still sprout.", "ROWAN"),
    say("And BURR's hooks catch on fur and coats. If it finds you, it'll be right behind you.", "ROWAN"),
    say("Outside, the wind picks up. Something round and dry tumbles past the window."),
    flag("wanderers_free"),
  ], [say("Twenty years keeping things in. Strange, letting them go. ...It suits me.", "ROWAN")])])],
  pg_fennimore: [ifFlags({ game_cleared: true }, [call("pg_diary")], [call("fennimore")])],
  pg_diary: [ifFlags({ game_cleared: true }, [ifFlags({ diary_read: false }, [
    { op: "ifHasItem", item: "old_diary", then: [
      face("fennimore", "toPlayer"), { op: "takeItem", item: "old_diary" },
      say("Frost on the cover, his hand inside. The rest of Grandfather's diary!", FEN),
      say("\"Kept just in case,\" he wrote. And here's the case. Look. The last pages.", FEN),
      say("He wrote out the song of the last QUICKENING. All of it. Not just the bit we know.", FEN),
      say("\"The heart blooms, and the woods listen. The seeds take to the road...\"", FEN),
      say("\"...and the oldest pine keeps count of the years, and wakes by starlight.\"", FEN),
      say("The oldest pine. That'll be on METHUSELAH RIDGE, above the SEED VAULT.", FEN),
      say("Some bristlecones have stood more than four thousand eight hundred years.", FEN),
      say("Go and see it at night. That's when it remembers. Grandfather never did go.", FEN),
      flag("diary_read"),
    ], else: [say("A FELLOW of the HERBARIUM. IMOGEN rang to tell me. Twice.", FEN),
      say("My grandfather's diary stops mid-song. \"The rest is kept in the VAULT.\"", FEN),
      say("\"Just in case,\" he wrote. The SEED VAULT, under the peaks at the top of ROUTE 9.", FEN),
      say("My knees won't take its stairs. Yours will. Try the FROZEN ARCHIVE, at the bottom.", FEN)] },
  ], [say("Grandfather's song is open on my desk. I keep humming it. Can't help it.", FEN),
    say("METHUSELAH RIDGE, up the SEED VAULT's north stair. And go at night.", FEN)])])],
  pg_methuselah: [ifFlags({ game_cleared: true, diary_read: true }, [ifNight([
    { op: "still", image: "methuselah_night" },
    say("The old bristlecone is mostly bare, silvered wood. One strip of bark still lives."),
    say("Under the stars, its needles stir. There's no wind."),
    say("Down in the rock, something hums. Low and slow, like a song you almost remember."),
    { op: "stillClear" },
    { op: "wildBattle", species: "methuselah", level: 70, canLose: true },
  ], [say("A twisted bristlecone, grey with age. In daylight, it's only an old tree.")])])],
  pg_council_rematch: [ifFlags({ game_cleared: true, council_run: false }, [
    ...COUNCIL_RUN_FLAGS.map((f) => flag(f, false)),
    flag("council_run"), flag("council_rematch"),
    say("The door swings shut behind you. The COUNCIL has been growing, too."),
  ])],
  ...seat("belladonna", "BELLADONNA", "beat_council_1", "game_cleared", [
    "FELLOW <PLAYER>. I keep a file on you now. It's thicker than I'd like.",
    "My NETTLES have had time to grow. Eight levels each. I measured.",
    "Same rules as before. Touch nothing. Let's see if you've grown too.",
  ], "Filed again, under \"lost\". MIMI OSA's door is open. She's awake. Probably."),
  ...seat("mimi_osa", "MIMI OSA", "beat_council_2", "beat_council_1", [
    "Mm...? Oh. The FELLOW. You came all this way to wake me up again...",
    "My MOONFLOWERS open at dusk. I've been waiting all day for this. Mostly asleep.",
    "...Let's see who folds first this time.",
  ], "Folded. Again. TITUS ARUM's next. You'll know when you're close. Mm... night."),
  ...seat("titus_arum", "TITUS ARUM", "beat_council_3", "beat_council_2", [
    "A FELLOW of the HERBARIUM! In my humble chamber! Breathe deep, breathe deep!",
    "A TITAN ARUM's bloom lasts only a day or two. So let's not waste a minute of it!",
    "Everything goes back to the soil in the end, my dear. Shall we see who goes first?",
  ], "Magnificent! Simply putrid! On you go. PYRA's next. You'll smell the smoke."),
  ...seat("pyra", "PYRA", "beat_council_4", "beat_council_3", [
    "You're BACK! I knew it! I've been burning for a rematch since the last one!",
    "Everything's hotter now! My CHILI's never been this ripe! No holding back!",
    "FELLOW or not, I'm not going easy. Ready? GO!",
  ], "Whoo! Okay! Still burning bright! ROWAN's through there. Go on, go!"),
  ...seat("rowan", "ROWAN", "beat_keeper", "beat_council_4", [
    "Back again. Good. IMOGEN said you would be.",
    "She has me repotting seedlings now. Patient work. Turns out I'm good at it.",
    "But the KEEPER's seat is still mine, FELLOW. Show me what's grown.",
  ], "Well grown. Go on through. IMOGEN's waiting. ...She brought sandwiches again."),
  pg_rematch_ending: [ifFlags({ game_cleared: true, council_run: true, council_rematch: true, beat_keeper: true }, [
    { op: "hallOfFame" }, flag("council_run", false), flag("council_rematch", false),
    say("Another team for the HALL OF FAME. The HERBARIUM keeps every one.", "ROWAN"),
    say("On a proper sheet, with the date! ...Not pressed. Don't worry. Just written down.", "VALE"),
  ])],
};
