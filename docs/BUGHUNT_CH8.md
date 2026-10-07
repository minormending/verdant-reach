# Chapter 8 bug hunt

Reviewed HEAD `c547939` against `AGENTS.md` and `docs/CH8.md`, including the
spec's original commit `01e7242` and description correction `f107484`.
`git diff ch8~0...HEAD -- src e2e` is empty because `ch8` points at HEAD;
the review therefore used `git diff ch7...HEAD -- src e2e` and the Chapter 8
implementation commits `7253f42`, `a04ab90` and `c547939`.

## Findings (ranked by severity)

### 1. Minor — takeover lobby music disappears after a grunt battle

**Resolution:** Added first-match `MapDef.musicWhen` resolution and a conditional lobby track, preserving takeover music on entry, battle/menu return and Continue until WREN is beaten, with regression tests and music-id validation.

**Location:** `src/world/scripts/ch8.ts:62`;
`src/world/maps/glasshouse_relay.ts:15`;
`src/overworld/index.ts:1059`.

**Reproduction:** Start Chapter 8, obtain ODELL's keycard, and enter
`glasshouse_relay` before beating WREN. The lobby plays `rootstock_appears`.
Stand at `(7,11)`, face left and talk to `grunt_r1_1` at `(6,11)`. Win the
battle. The lobby now plays `root_relay`, although `ch8_started=true`,
`ch8_takeover=true` and `beat_wren=false`. Leaving and re-entering restores
the takeover track until another lobby battle.

**Evidence:** `ch8_relay_enter` sets the music only on entry. The battle
return calls `playMapMusic()`, which resolves the map's unconditional
`music: "root_relay"`; it does not rerun the entry script. An in-memory
probe using the real overworld `battle()` method, with a mocked winning
battle and animation waits omitted, asserted `rootstock_appears` before
the battle and `root_relay` afterward, with takeover still true. This
violates CH8 §3's requirement that the lobby play `rootstock_appears` while
`ch8_started && !beat_wren`.

**Suggested fix:** Make map music resolution honor the takeover condition
whenever music is restored, including after battles. Add a regression
check that enters the seized lobby, wins a grunt battle and checks the
restored track. Avoid rerunning the entire lobby entry script to restore
music, since that script also owns the reward/end sequence.

No blocker or major findings.

## Clean areas

- **Gating — no issues found.** The door approach rejects entry without
  the keycard; the lobby stair independently requires both chapter start
  and keycard. The only roof entrance remains solid until `relay_patched`.
  Keycard, reward and end guards prevent duplicate awards/calls and
  `ch8_end` before `beat_wren`. A real-scene loss to WREN returned to the
  saved greenhouse heal point without advancing roof flags; retrying won
  and completed the departure. Thirteen save/Continue round trips covered
  1F, 2F, 3F and the roof, with partial/completed patch states, preserving
  flags, position, gates and an escape route.
- **Patch bay — no issues found.** All 9,841 console sequences of length
  zero through eight matched an independent C/A/B reset model, including
  interleaved note reads and serialized flags. Every unsolved sequence
  remained recoverable. Reading the note is intentionally optional under
  §4, despite §3's ambiguous "needs the note" wording.
- **Visibility and placement — no issues found.** Staff, the hiding
  director, BRAM, WREN and MERCER follow the specified phase conditions;
  roof departures survive reload. Authored NPCs do not occupy stairs,
  warps or triggers, and trainer approach paths do not strand exits.
- **Palm House encounters — no issues found.** Grass and bog encounters
  are suppressed during the broadcast and restored afterward, by day and
  night; the existing water behavior is preserved.
- **Chapter 4 regressions — no issues found.** The open-day trigger,
  FLORA's departure/visibility, and sensor quest wiring remain intact.
  Staff and WREN's quest access return after takeover, as specified.
- **Other spec requirements and e2e additions — no issues found.** Map
  sizes, contracts, item data, teams, allowed WREN tuning, battle balance,
  story ordering and the 143-beat runner expectations agree with the spec.
  Placeholder dialogue/art are explicitly allowed for this phase.

## Verification and limits

Passed `npm run typecheck`, `npm test` (89 files, 998 tests),
`npm run build`, and `test -s docs/BUGHUNT_CH8.md`. Additional probes ran
in memory; no throwaway test files remain. Only this report was changed.

The full browser playthrough was not run. The environment rejected a
local Vite WebSocket bind with `EPERM`; the review used source inspection,
the passing field-input/interpreter tests, and the runtime probes above.
Rendering and real browser battle execution were not independently
verified in this review.
