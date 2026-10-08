# Chapter 6 bug hunt

Reviewed `git diff ch5...HEAD -- src e2e tools` against `docs/CH6.md` and
`AGENTS.md`. Report only; no code changes. Findings are ranked by severity.

## 1. Blocker — Continue resets boulders behind the saved player and traps them

**Location:** `src/overworld/index.ts:229` (also `:137`);
`src/world/maps/driftseed_conservatory.ts:15` and `:38`.

**Exact reproduction:**

1. Obtain SAXIFRAGE and enter the Driftseed Conservatory normally.
2. Stand at `(6,12)`, face right and UPROOT the first boulder into `(8,12)`.
   Repeat from `(6,8)` and `(6,4)` for the other two boulders.
3. Reach `(7,3)`, defeat SAGUARO and receive the sap. Save while still at
   `(7,3)`, restart and choose CONTINUE.
4. All three stones return to their starting positions. At `(7,3)`, SAGUARO
   occupies the tile above, the reset third boulder occupies the tile below,
   and walls occupy both sides. The player cannot move or leave the room.
   SAGUARO will not battle again, the room has no wild encounters to cause a
   whiteout, and GLIDE is unavailable indoors. This save cannot progress through
   normal play.

**Evidence:** Continue calls `loadMap` with the saved coordinates, but that
function always creates fresh NPC actors from the authored layout. Boulder
positions are not saved. A probe through the actual `createSave().write/read()`
and overworld constructor restored the player to `(7,3)` and stones to
`(7,12)`, `(7,8)`, `(7,4)`. The runtime movement results were:

```text
up:    blocked / occupied
down:  blocked / occupied
left:  blocked / wall
right: blocked / wall
canGlide: false
```

The stone cannot be pushed down from the north: its destination `(7,5)` is a
non-walkable ledge. Its west-side pushing approach `(6,4)` is inaccessible
from the saved position. The runtime BFS also returned `false` for reaching
the exit `(7,17)` from saved positions `(7,3)`, `(7,7)` and `(7,11)` with reset
stones. The existing exhaustive puzzle test (`src/world/ch6.test.ts:213`)
checks exits with each *current* layout; it never pairs saved player positions
with the reset layout.

**Same defect in the Vents:** push the stone right from `(11,10)` into
`(12,10)`, walk north to `(11,8)`, save and Continue. The reset stone blocks
the return route, and the ledge at `(11,11)` prevents pushing it south
(`src/world/maps/driftseed_vents.ts:19`, `:36`). The BFS cannot reach exit
`(11,23)` from that reset state either. Wild encounters permit a forced
whiteout here, so this variant is recoverable at the cost of money.

**Suggested fix:** restore the active boulder layout on Continue while
retaining the specified reset on genuine map re-entry, or move the player to
a safe entrance whenever loading resets a puzzle. Add save/Continue coverage
for player positions above each cleared chokepoint in both rooms.

## 2. Major — The chapter can finish without the doctor scene or either dock fight

**Location:** `src/world/scripts/ch6.ts:205` and `:216`;
`src/world/maps/saltmarsh_harbour.ts:61`.

**Exact reproduction:**

1. Arrive in the harbour from Route 7 at `(18,1)`.
2. Walk south to `(18,12)`, then east to `(31,12)`. Face right and talk to
   REYES to receive the raft. Never step on `(12,20)` or `(13,20)` and never
   talk to the doctor.
3. Walk back to `(19,12)`, south to `(19,20)`, face down and confirm RAFT
   onto `(19,21)`. Continue south to the sea warp at `(19,29)`.
4. Complete the island, sap, tree and REYES beats normally, continuing to
   avoid the doctor's pier. Re-enter the harbour after beating REYES.
5. Vale's call and the end card run with `ch6_doctor_met`,
   `beat_grunt_dock_1` and `beat_grunt_dock_2` still unset. The narrator says
   the player remembers the woman at the docks despite never meeting her.

**Evidence:** runtime movement probes with the doctor visible and her trigger
excluded found both the Route 7 arrival → REYES approach and REYES approach →
sea-exit paths. `ch6_reyes_point` grants the raft without a doctor or grunt
prerequisite. Both grunts stay hidden until `ch6_doctor_met`. The later story
scripts require neither the meeting nor the fights. Running the real script
interpreter with `ch6_arrived=true`, `beat_reyes=true` and no doctor/grunt flags
executed `endSlice`, set `ch6_done` and emitted the memory line.

The narrow trigger matches §6's coordinate table, but does not enforce §1's
doctor-and-grunts story beats or support the ending's unconditional recollection.

**Suggested fix:** make the doctor scene and subsequent challenges unavoidable
before departure, for example by gating the raft handoff/sea access on their
completion. If those beats are intentionally optional, explicitly revise that
story requirement and condition the ending's recollection on `ch6_doctor_met`.

## Areas with no additional issues found

- **RAFT:** no issues found with shore access on the authored Chapter 6 water
  maps, save/load while rafting, land encounter filtering, water-to-water and
  water-to-land tile warps, whiteouts, or follower hiding/dismount handling.
  Runtime probes connected every unoccupied water tile to a shore in Route 7,
  the harbour, Route 8, the island and the open Reyes puzzle. Morning, day and
  night water encounters roll; shore steps do not roll the water table. No
  issue found in the GLOW/night rendering integration by code inspection.
- **UPROOT, excluding finding 1:** no issues found with the authored puzzles'
  legal pushes into doorways/warps, NPC occupancy, solver/runtime push rules,
  or exit access while retaining the current layout. Ordinary re-entry from
  the entrance resets to a solvable layout.
- **Trade and quests:** no issues found. Offering the trade before seeing a
  vine is explicitly permitted by the updated spec. Seeds cannot be offered;
  an all-seed party makes no exchange. POLLY's cross-pollination growth has
  cancellation disabled. Completion flags prevent duplicate trades and survey
  rewards.
- **Other story gates and GLIDE:** no issues found with REYES before
  `lantern_healed`, sap consumption/reward duplication, repeating the doctor
  scene after completion, or the new GLIDE landings. Both landings are
  unoccupied walkable land below their Greenhouse doors.
- **Other spec comparisons:** no additional issues found in the added ids,
  species, moves, approved Herbarium entries/source comments, encounter caps,
  trainer teams, market stock or placeholder tooling. The explicit lead
  decision allowing SAGUARO's 72–90% band supersedes the older 72–82% line in
  §5; that difference is not reported as a bug.

## Verification and limits

- `npm run typecheck`: passed.
- `npm test`: passed, 79 files / 829 tests.
- `npm run build`: passed (large-chunk advisory only).
- Additional in-memory probes used the actual runtime movement, boulder BFS,
  save serialization, overworld construction and script interpreter. No
  throwaway source/test files were retained.
- Full browser playthrough and visual night/GLOW inspection were not run;
  local socket binding is denied in this environment. Findings above are
  backed by runtime/interpreter probes and source review, not a claimed full
  browser replay.
