# Chapter 7 bug hunt

Reviewed `git diff ch6...HEAD -- src e2e tools` against `docs/CH7.md` and
`AGENTS.md`. Report only; no code changes. No blocker or major issues found.

## Findings (ranked by severity)

### 1. Minor — emitters lose their switched-off appearance after re-entry or Continue

**Resolution:** Emitters now render from persistent `stateFlag` values; regression tests cover switching, re-entry, save/Continue and talking again.

**Location:** `src/world/maps/rootstock_hideout_1.ts:36` (also lines 37–38),
`src/world/scripts/ch7.ts:18`. Supporting renderer: `src/overworld/render.ts:175`.

**Reproduction:** Open the lodge stair, defeat `grunt_b1_1`, and switch off
`emitter_1`. It changes to the UP lever frame. Leave B1 and return, or save
beside the emitter and Continue. It now shows the original DOWN frame despite
`emitter_1_off=true`. The same applies to emitters 2 and 3. Talking to the
already-off emitter changes its appearance back to UP.

**Evidence:** The script changes actor facing and sets a persistent flag, but
all three map definitions recreate the actor facing DOWN. `rowFor()` derives
lever state from flags only for IDs matching `lever:<flag>`; these IDs are
`emitter_1..3`, so it uses transient facing. A probe ran the real emitter
script, serialized the save, and created the Continue scene: output was
`scriptCompleted=true, off=true, before="up", after="down"`. Progress remains
intact; this is misleading visual feedback, not a repeatable reward or toggle.

**Suggested fix:** Resolve the emitter's rendered row from `emitter_<n>_off`
while retaining the specified NPC IDs, or restore its facing from that flag
on map load. Verify re-entry and Continue as well as the initial switch.

### 2. Minor — slides skip warps on intermediate ice tiles (fixture-only)

**Resolution:** Arrival checks warps before continuing a slide; the ice solver and validator stop at warp tiles, with regression tests for ice and non-ice warps.

**Location:** `src/overworld/index.ts:544`–553.

**Reproduction:** Use an outdoor map fixture with rows `#######`, `#.III.#`,
`#######`, where `#=wall`, `.=floor_tile`, and `I=ice`. Place a warp at `(3,1)`
to another map. Start at `(1,1)` facing RIGHT, issue one RIGHT movement, and
tick 40 frames. The player passes through the warp and finishes at `(5,1)`
without using it.

**Evidence:** `onArrive()` starts the next slide step and returns before
checking `warpAt()` whenever the next step is legal. A real overworld probe
counted zero `useWarp()` calls and ended at `(5,1)`. Moving the same warp to
the non-ice landing `(5,1)` produced one call. Thus landing on a normal door
or exit works, but the new ice behavior bypasses the usual step-on warp
interaction when the warp itself is ice. No authored Chapter 7 warp is on
ice, so this does not block the current chapter.

**Suggested fix:** Check eligible warps before continuing the slide, and make
the movement planner/solver handle those transitions consistently. Add a
runtime check for both an intermediate ice warp and a non-ice landing warp.

### 3. Minor — Route 9 lacks its specified southern leaf ambience

**Resolution:** The lead amended CH7 §4 to specify `mist` throughout Route 9, matching the existing map; no code change required.

**Location:** `src/world/maps/route_9.ts:5`.

**Reproduction:** Enter Route 9 from Cedarhallow at `(14,54)` during daytime
and walk through its southern larch forest, then north into the snow. Both
regions use mist; the southern section never uses leaves.

**Evidence:** CH7 §4 specifies `leaves (south) / mist`. The map declares only
`ambient: "mist"`, has no `onEnter` script, and has no triggers to change the
ambient override. The runtime therefore selects mist throughout the route.

**Suggested fix:** Select leaves in the southern forest and mist farther
north, including when entering from either end or continuing a saved game.

## Areas with no issues found

- **Authored ICE puzzle:** no issues found with NPC blocking, stuck slides,
  input during slides, encounters on ice, or solver/runtime reachability.
  The authored gym has 97 reachable stops, all with a route to the exit;
  none are ice tiles, so normal play cannot save halfway across its ice
  lanes. A separate NPC-blocked ice fixture saved at `(3,1)`, restored that
  position, and moved off the ice after Continue without an encounter.
  Non-ice landing warps work as described above.
- **CRIMSON LILY:** no issues found with repeat encounters or unintended
  disappearance. Catch, wilt, flee, and loss consume the encounter as
  implemented by the specified `canLose` battle. Sport status survives
  capture into either party or cabinet. The cabinet has no capacity limit,
  so a full party does not create a full-box loss case.
- **`encountersWhen`:** no issues found with first-match selection, rates,
  or stale red/calm tables. Runtime probes with a 10% random draw encountered
  a plant before `lake_calmed` and returned no encounter afterward; a zero
  draw encountered a plant in both states. Flag lookup happens each roll.
- **Hideout progression:** no issues found with actual double toggles,
  premature B2 stairs, files before Calloway, or the tunnel before Calloway
  and the files. Save/Continue probes preserved partial emitter progress,
  open stairs, the calmed-lake flag, and Calloway's disappearance. The emitter
  appearance issue is finding 1.
- **Story and rewards:** no issues found with the pass gate, Conservatory
  gate, chapter-end condition, duplicate Signe COLD SNAP, duplicate quest
  rewards, or duplicate CLIMBER PACK. Finding the pack before accepting the
  quest works. Skipping the optional lily does not bypass a required gate
  specified in §6.
- **Glide and raft:** no issues found with Larchmere visit inference and
  landing, Bloom Lake boarding, islet dismounting, or returning to town.
  Existing field-input tests exercise the lake crossing; a separate probe
  confirmed Larchmere's landing from a Bloom Lake state.
- **Remaining spec/data/tool changes:** no issues found with the species,
  growth items, signatures, trainer teams, permitted boss tuning, placeholder
  tile generation, or placeholder release-gate coverage. Boss level changes
  are documented in `trainers.ts` and remain within ±2. The other explicit
  mismatch found is finding 3.

## Verification and limits

- `npm run typecheck` — passed.
- `npm test` — passed: 86 files, 939 tests, including field-input and battle
  scene tests and the Chapter 7 balance checks.
- `npm run build` — passed; emitted the usual chunk-size warning.
- `test -s docs/BUGHUNT_CH7.md` — passed.
- Direct probes loaded the real TypeScript modules through Vite SSR and
  exercised movement, rendering-state selection, save serialization,
  Continue, conditional encounters, and glide lookup. No throwaway test
  files were retained.
- The full 126-beat browser playthrough was not run. The environment denied
  a TCP listener during the initial SSR probe (`EPERM`); subsequent probes
  disabled WebSockets and completed without listeners. No claim of full
  browser-playthrough validation is made.

## Resolution verification

- `npm run typecheck` — passed.
- `npm test` — passed: 87 files, 954 tests. Added regressions exercise actual
  emitter scripts and rendering across re-entry, save/Continue and repeat
  interaction; ice tests cover one warp call on ice and on a non-ice landing,
  solver reachability and validator movement.
- `npm run build` — passed; emitted the usual chunk-size warning.
- `npm run e2e -- --allow-placeholders` — attempted, but the sandbox denied
  Vite's local listener (`listen EPERM: operation not permitted 127.0.0.1`).
  The runner completed zero beats; the 126-beat playthrough remains unverified
  here and must run in the lead's harness.
