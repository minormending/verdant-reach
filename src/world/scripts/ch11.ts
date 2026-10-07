// World gates and recovery; the next wave supplies the battles and ending.
import { flag, ifFlags, movePlayer, say, type Scripts } from "../build";

export const COUNCIL_RUN_FLAGS = ["council_run", "beat_council_1", "beat_council_2", "beat_council_3", "beat_council_4", "beat_keeper",
  // The battle interpreter also records these trainer ids. Clear them so a
  // later script/interaction cannot skip a seat after losing the run.
  "beat_belladonna", "beat_mimi_osa", "beat_titus_arum", "beat_pyra", "beat_rowan"];
const reset = () => COUNCIL_RUN_FLAGS.map((f) => flag(f, false));
const stub = (id: string) => [say(`TODO(text): ${id}`, "NARRATOR")];
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
  belladonna: stub("belladonna"), belladonna_after: stub("belladonna_after"),
  mimi_osa: stub("mimi_osa"), mimi_osa_after: stub("mimi_osa_after"),
  titus_arum: stub("titus_arum"), titus_arum_after: stub("titus_arum_after"),
  pyra: stub("pyra"), pyra_after: stub("pyra_after"),
  rowan: stub("rowan"), rowan_after: stub("rowan_after"),
  ch11_ending: stub("ch11_ending"),
};
