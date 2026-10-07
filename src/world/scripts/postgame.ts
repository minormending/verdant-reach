// Wave 3 world hooks; event effects and the rematch run arrive in wave 4.
import { ifFlags, ifNight, say, type Scripts } from "../build";

const stub = (text: string) => [ifFlags({ game_cleared: true }, [say(`TODO(text): ${text}`)])];
export const postgameScripts: Scripts = {
  pg_centuryheart: stub("A second CENTURYHEART sprout is waiting."),
  pg_wanderers: stub("ROWAN knows where the three wanderers sleep."),
  pg_fennimore: [ifFlags({ game_cleared: true }, [{ op: "call", script: "pg_diary" }], [{ op: "call", script: "fennimore" }])],
  pg_diary: stub("OLD FENNIMORE remembers the last Quickening."),
  pg_methuselah: [ifFlags({ game_cleared: true, diary_read: true }, [ifNight([
    say("TODO(text): METHUSELAH stirs beneath the stars."),
  ], [say("TODO(text): It's only an old tree.")])])],
  pg_council_rematch: stub("The Council is ready to meet you again."),
};
