# Chapter 5 bug hunt

Reviewed `git diff main...HEAD -- src e2e tools/art/placeholder.py` against
`AGENTS.md` and `docs/CH5_IDS.md`. Two confirmed findings, ranked below. No
blocker found. No implementation or art files were changed.

## 1. Major — Pruning Shears remove Cedarhallow from SEED GLIDE

**Location:** `src/overworld/glide.ts:37` (destination filtering at
`src/overworld/glide.ts:46`).

**What goes wrong:** Chapter 5 evidence correctly raises `furthest` to 4, but
the final Pruning Shears compatibility check assigns it back to 3. A normal
player already carries the shears from Chapter 4, so Cedarhallow cannot be
selected as a return destination after receiving the Glider Seed. Neither
its visit flag nor the Pipe Mark fixes this; saving and continuing preserves
the same failure.

**Exact reproduction:** Finish Chapter 5 normally, continue, and walk south
onto Route 6. For a minimal state, use position
`{ map: "route_6", x: 14, y: 58, facing: "down" }`, flags
`ch4_done=true`, `ch5_arrived=true`, `visited_cedarhallow=true`,
`ch5_done=true`, marks `["pipe_mark"]`, and bag
`{ pruning_shears: 1, glider_seed: 1 }`. Press START, select GLIDE, and press A.
CEDARHALLOW is absent from the destinations despite having been visited.

**Evidence:** A read-only Vite SSR probe invoked the actual
`visitedGlideMaps` and `availableGlideDestinations` functions with that state.
Both returned only Fallowfield, Bramblegate, Sugarbush, and Glasshouse City.
Deleting only `bag.pruning_shears` made `visitedGlideMaps` return Cedarhallow
as the fifth town. The existing glide tests check shears with earlier
destinations, but do not combine shears with Chapter 5 evidence.

**Suggested fix:** Replace the assignment with
`furthest = Math.max(furthest, 3)`. Add a regression that retains Cedarhallow
with shears present, including after leaving town and after a save round trip.

## 2. Minor — Placeholder UI/item generation overwrites real generated art

**Location:** `tools/art/placeholder.py:79` (CLI dispatch at lines 87–90).

**What goes wrong:** The tool promises that an existing non-placeholder
bundle is never overwritten, but that protection is applied only to species.
UI and item names go directly to `emit.set_images`. Its writer protects
`edited`/`imported` entries, but overwrites ordinary `generated` entries,
including the repository's existing real art, replacing their PNG and source
metadata with the grey placeholder. The same happens if future real art for
`mark_pipe` or `foxfire_lantern` remains generated and someone reruns the
Chapter 5 placeholder command.

**Exact reproduction:** With the art Python dependencies installed and the
current generated art present, run
`python tools/art/placeholder.py ui mark_bramble` or
`python tools/art/placeholder.py items water_flask`. No game flags, position,
or controller input are involved. The existing real image is replaced rather
than skipped. These destructive commands were not run against this checkout.

**Evidence:** A Python AST probe executed the actual `images()` function with
only `blob` and `emit.set_images` mocked, reading the current set metadata.
It requested writes for both `mark_bramble` (source `tools/art/ui.py`) and
`water_flask` (source `tools/art/items.py`) without a protection check.
`tools/art/artkit/emit.py:131` delegates to
`tools/art/artkit/bundles.py:208`; the latter skips only locked source kinds
and otherwise writes the PNG and replaces its source. No assets were written
by the probe.

**Suggested fix:** Inspect each existing imageset entry before emitting it;
skip real generated entries as well as edited/imported ones. Recognize
existing placeholders by their source tool or an explicit placeholder marker.
Test this with an isolated temporary imageset containing real generated art.

## Other areas checked

- **GLOW geometry and rendering:** no issues found. Radii, discrete falloff,
  lamp combination, and interpolated coordinates agree with the spec. The
  mask draws after the world/tint and before story illustrations and UI;
  transparent menus draw later in the scene stack.
- **Dark-map validator and Hollow entrance:** no issues found in the actual
  Chapter 5 world. The keeper and exit have lamp-lit access, the real world
  passes `checkProgressWithoutLantern`, and the negative fixture tests cover
  inaccessible grants and circular positive prerequisites.
- **Graft collar:** no issues found. All six stats use the lower calculation
  level while moves, experience, and displayed level retain the real level.
  Metadata remains on trainer definitions; player/wild setup and trainer
  capture rejection prevent leakage. Send-out and drawing hooks use the
  active enemy trainer slot.
- **Eight maps and story scripts:** no additional issues found. Reviewed
  entrances, return warps, structure doors, pickups, visible conditions,
  quest interaction tiles, chapter-end continuation, and scripted exits.
  A flood probe blocking both rival-trigger tiles and Bram's occupied tile
  could not reach the burnt heart. The Conservatory door has only the gated
  approach. Prerequisite checks match the binding script spec.
- **Save/load and NPC exits:** no issues found in the cases checked. A real
  save round trip at Conservatory position `(7,6)` retained both lever flags,
  lantern inventory, and the walkable return path. Actor visibility is rebuilt
  from persistent flags on map load. Player input returns only after scripts
  complete, so START/SAVE cannot interrupt Bram's departure; his completion
  flag and hide operation finish before saving becomes available.
- **Quests and repeated rewards:** no issues found. A real-interpreter probe
  confirmed that shrine flags cannot be earned before acceptance, the keeper
  grants one lantern, and both quests pay their rewards only once. Fire
  Followers uses caught records as specified. The two Ember Ash pickups have
  distinct persistent pickup ids.
- **Conservatory 4 puzzle:** no issues found. A probe using the runtime's
  `buildMap`/`refreshLegend` and NPC occupancy found Morrow reachable only in
  combination `11`, with the exit reachable in all four combinations. The
  existing exhaustive puzzle tests also passed.
- **Species, moves, trainer data, mark UI, and e2e changes:** no additional
  issues found in the reviewed code and tests. Placeholder dialogue and art
  are explicitly authorized by this phase's spec.

## Verification and limits

- `npm run typecheck` — passed.
- `npm test` — passed: 63 files, 636 tests.
- `npm run build` — passed; emitted the usual bundle-size warning.
- Targeted probes — confirmed the glide failure and placeholder write request;
  checked runtime puzzle combinations, dark-map save/load, rival-gate geometry,
  and quest replay behavior. Probes ran from inline scripts, with no temporary
  test files or asset edits left behind.
- `test -s docs/BUGHUNT_CH5.md` — passed.

No browser e2e playthrough or visual inspection was performed. Rendering
conclusions are based on code and the drawing tests, and save/load coverage is
targeted rather than exhaustive.
