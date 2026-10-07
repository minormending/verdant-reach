# Chapter 10 bug hunt

Reviewed `git diff origin/ch9...HEAD -- src e2e` against `docs/CH10.md`
and `AGENTS.md`, including the existing engine paths used by the new content.
This is a report only; no code was changed.

## Findings, ranked by severity

### 1. P2 — An Elder battle loss leaves the player with no healthy party and makes an immediate retry abort

**Resolution:** Battles starting without a healthy party now return `lost` for
trainers and wild encounters. Normal loss handling whites out unless `canLose`
is set. The Elder's explicit loss branch calls the existing recovery through
built-in `call whiteout` (no new opcode or out-of-scope contract edit), healing,
returning to the last heal point and applying the usual half-money rule without
catching or hiding the Elder. Tests actually wilt the party and play a retry;
the capture driver also returns to the heart after a loss.

**Location:** `src/world/scripts/ch10.ts:118` (loss branch at line 122).
Related engine behavior: `src/overworld/script.ts:324`,
`src/battle/scene.ts:385`, `src/world/scripts/ch10.ts:78`.

**Reproduction:** Plant the Centuryheart Seed, challenge the Elder with a weak
party, and let every party member wilt. Talk to the Elder again without using
a restorative item or visiting a Greenhouse. The second challenge immediately
returns `fled`, without a playable battle. Walk back through an undefeated
trainer's encounter with the same wilted party to get a free trainer win.

**Evidence:** A Node/Vite probe ran the real battle setup, turn resolution and
Chapter 10 interpreter, omitting animation/UI waits. A level-1 Oak Acorn lost
to the Elder; the subsequent challenge produced outcomes `["lost", "fled"]`,
party HP `[0]`, `elder_caught: false`, and an Elder that remained visible.
`canLose: true` suppresses whiteout and the script's failure branch only speaks.
BRAM's ring-three heal is disabled once `beat_mercer` is true. The battle
scene's no-healthy-party guard returns `fled` for wild encounters and `won`
for trainers; a separate real battle-setup probe confirmed both outcomes.
Thus the Elder is retained, but the promised retry does not work immediately
after this outcome, and ordinary loss recovery is absent.

**Suggested fix:** Handle the Elder's `lost` outcome by healing the party or
explicitly invoking the normal whiteout recovery while retaining the Elder
and leaving `elder_caught` false. Keep the specified `canLose` encounter and
add a test that actually wilts the party, then starts a playable retry.
Independently, returning a trainer win for a party with no healthy members
should be replaced with loss/recovery handling.

### 2. P2 — Route 12 does not exercise all field moves required by the binding decision

**Resolution:** The lead amended §9.1 to require ROOT BRIDGE, UPROOT, PRUNE and
RAFT plus eight marks; GLOW and SEED GLIDE are unnecessary on the open plateau.
Route 12 retains all three root gaps and its pit row, and adds a required bramble
and four-tile pond with north/south landings. Each missing tool blocks the road
in regression tests. Real-input tests and the playthrough use both new prompts;
the runner now requires 186 beats. The marks trigger moved one tile west so its
rejection step lands on clear ground even while the new bramble is unpruned.

**Location:** `src/world/maps/route_12.ts:7`.

**Reproduction:** Enter Route 12 with eight marks, ROOT BRIDGE and UPROOT,
but without Pruning Shears, the Lily Raft or the Foxfire Lantern. Cross the
three root gaps and fill a pit; the route to the Arboretum is available
without PRUNE, RAFT or GLOW.

**Evidence:** `docs/CH10.md` §9 decision 1 explicitly specifies
“all field moves, 8 marks.” The route's used tile types are exclusively
`cliff`, `sand`, `path`, `tall_grass`, `pit`, `root_gap`, and `ledge_down`;
it has no pruning obstacle, water crossing or dark section. Its only trigger
is the marks check. The existing route reachability tests prove a complete
route with the bridges and pits filled, without any of those other tools.
The detailed three-gap/two-pit requirements are met, but the broader binding
decision is not implemented. SEED GLIDE is also not exercised on this route;
its intended role in “all field moves” needs design clarification.

**Suggested fix:** Add required PRUNE and RAFT obstacles and a meaningful
GLOW section, with tests that removing each required tool blocks its intended
gate. Resolve SEED GLIDE's role with the lead. If the intended scope is only
ROOT BRIDGE and UPROOT, explicitly amend the binding decision before treating
the implementation as compliant.

### 3. P3 — Heart music reverts to the Rootstock alarm after an Elder battle

**Resolution:** The heart uses `musicWhen` to select `prologue_bloom` once
`beat_mercer` is true. The redundant entry script and hardcoded planting music change were removed;
planting refreshes the map lookup after Mercer's win flag is recorded.
Tests run the real overworld battle-return path for won/caught/fled/lost outcomes
and confirm restoration of the calm track.

**Location:** `src/world/maps/elder_grove_heart.ts:5`.
Related paths: `src/world/scripts/ch10.ts:136`,
`src/overworld/index.ts:244`, `src/overworld/index.ts:1066`.

**Reproduction:** Defeat Mercer and complete the planting. Hear
`prologue_bloom`, challenge the Elder, then flee, wilt it, catch it, or lose.
On returning from the battle the heart plays `rootstock_appears` again.

**Evidence:** The map always declares `music: "rootstock_appears"` and has
no `musicWhen`. Planting and `ch10_heart_enter` play the calm track as script
commands, but the overworld's battle return calls `playMapMusic()`; its
`musicFor()` reads map data, not the previous script-selected track. A probe
with both `beat_mercer` and `centuryheart_planted` true returned
`rootstock_appears` from the real `musicFor()` lookup. The specification's
map table requires `prologue_bloom` after `beat_mercer`.

**Suggested fix:** Add a `musicWhen` entry for `beat_mercer: true` selecting
`prologue_bloom`, so map entry and every battle/menu music restoration agree.
Test the lookup and post-Elder-battle music.

## Clean areas and coverage

| Area | Result and evidence |
|---|---|
| Sanguine Ridge / Route 12 progression gates | No issues found with the Chapter 9 gate, three individually required root gaps, persisted pit fills, resettable boulders, or eight-mark gate. Existing tests remove each gap separately, solve all four pit-fill subsets, and show the marks trigger is the sole west-exit approach. Missing field-move coverage is finding 2. |
| `ifMarks` | No issues found. Runtime requires every listed actual mark; duplicates and leader flags cannot replace a missing mark. Reversed order, missing marks, smaller sets, absent `else`, nested command scans and unknown-mark validation are covered. |
| Shifting grove and `legendWhen` | No issues found. Three step clearings negate `grove_lean`; false opens `a` and closes `b`, true does the reverse. The position/lean BFS includes visible NPC occupancy and script-derived toggles, reaches Calloway and the unlocked exit, and proves a return to the entrance from every reachable state. Real-input tests traverse both directions. |
| Save / Continue mid-lean | No issues found. Additional probes serialized and loaded ten fixtures: all three clearings and both lane crossings under each lean. Continue retained position and flag, kept the occupied lane walkable, and restored the matching open/closed lane pair. This map has no boulders, so Continue does not relocate the player or reset the lean. |
| Ring order | No issues found. Admin script prerequisites and each ring's `legendWhen` independently require SHEARS → CALLOWAY → WREN before Mercer. Return exits remain open. |
| Admin / Mercer whiteout | No issues found. Existing interpreter tests cover loss, retry and replay for all four bosses. Additional probes invoked the real overworld whiteout with a simulated lost outcome for each: arrival at the saved Arboretum Greenhouse, HP restored, no new boss-win/planting flag, and seed retained. |
| Planting | No issues found. Requires Mercer and a seed, consumes one seed, sets the persistent planting flag, and replays without another consumption. The two-seed fixture leaves one after repeated planting and `mercer_after`. Narration explicitly preserves the Quickened's choice to remain awake. |
| Elder retention | No issues found with retention after flee, target wilt, player loss, or map re-entry. Only the current battle's `caught` result sets `elder_caught` and hides it; an old Herbarium record does not do so. Player-loss recovery is finding 1. |
| Full party / full cabinet | No issues found. A real capture probe with six party members sent the Elder to the cabinet and retained it through save/reload. The cabinet is an uncapped array; there is no “full cabinet” state in this implementation. With 240 existing cabinet entries, capture produced 241, and save normalization preserved all of them and the Elder. With one party member, capture instead added the Elder to the party. |
| `ch10_end` | No issues found. Arboretum `onEnter` calls arrival then end; `beat_mercer && !ch10_done` gates closure. `ch10_done` and `slice_done` are set before the wait and `endSlice`, hence before its save dialog. Replay/Continue skips another closure. Requiring planting or capture here would differ from the specified condition. |
| Scripted BRAM | No issues found. The permitted single-follower fallback is used: join visibility at the Arboretum, conditional appearances in each ring, and a heal before the heart. The narrow Grove entrance supplies the join trigger if the eastern trigger is bypassed. Persistent visibility conditions hide these appearances after Mercer. |
| `many_trunks` | No issues found. It uses the existing 2–5-hit effect and animation family. Existing tests cover all hit counts, one PP per use, accuracy failure and stopping on target wilt. Additional real-logic probes checked Protect, a miss, and overkill producing exactly one hit event and one wilt event. Smart AI already accounts for expected multi-hit damage. |
| Species / trainers / other spec data | No additional issues found. IDs/map order, stat totals and shapes, growth, catch rates, no-breeding convention, encounters, trainer species/grafts and ±2 level adjustments agree with the spec and its recorded tuning decisions. Placeholder assets/dialogue are explicitly allowed for this phase. |

## Balance evidence and uncertainty

No issues found within the explicitly documented **no-item balance model**.
The tests pass the admin 70–82% and Mercer 55–68% mean bands, and every tested
party/starter exceeds 25%. All trainer adjustments are recorded in
`docs/CH10.md` §10 and stay within ±2 levels.

An additional probe reused the suite's six party/starter fixtures, 300 trials
each and seed 99. Mercer's documented model reproduced **56.8%** mean
(minimum **28.3%**). Giving him the configured three Spring Waters in that
same random-DV model changed the mean to **70.3%**. Also using runtime's
fixed trainer DVs produced **68.1%**, with individual rates
63.0%, 94.3%, 67.3%, 47.0%, 80.0%, and 57.0%.

The runtime-DV admin probes produced SHEARS **76.7%**, CALLOWAY **75.9%**
and WREN **75.2%**, all inside their mean bands; the lowest individual rate
was WREN **26.3%**. The 68.1% Mercer estimate is too close to the 68% limit
to establish a robust difficulty defect from this sample. The suite deliberately
omits foe items (`src/battle/logic/balance.test.ts:176`), and its random
trainer DVs differ from runtime. A runtime-consistent, larger-sample check
would improve confidence before retuning; these probe results are a coverage
limitation, not an additional confirmed finding.

## Verification and limitations

- `npm run typecheck` — passed.
- `npm test` — passed: 101 files, 1,158 tests.
- `npm run build` — passed; existing large-bundle warning only.
- Additional Node/Vite probes used middleware mode with no server listener;
  source remained unchanged. Battle probes skipped drawing/animation waits;
  actual battle setup, capture/storage, selected turn resolution, interpreter,
  save/Continue and map-music logic ran as described above.
- No full browser `npm run e2e` was run for this review. The real-input Vitest
  tests passed, including Route 12, both grove directions and an actual Elder
  wilt followed by pod attempts. The binding spec records prior local-server
  failures; end-to-end browser verification remains outstanding.
- Required report check: `test -s docs/BUGHUNT_CH10.md` — passed.

Only `docs/BUGHUNT_CH10.md` is changed. No fixes, commits, branches or pushes
were made.

## Fix verification

The resolution notes above describe the follow-up fixes; the original review
evidence and limitations are retained unchanged. Browser verification was
attempted with `npm run e2e -- --allow-placeholders`, but server startup failed
with `listen EPERM: operation not permitted 127.0.0.1` before any beat ran.

- `npm run typecheck` — passed.
- `npm test` — passed: 101 files, 1,177 tests, including the real-input Route 12
  crossings and Elder wilt/recovery/retry checks.
- `npm run build` — passed; existing large-bundle warning only.
- `npm run e2e -- --allow-placeholders` — blocked by the sandbox's local-server
  bind restriction above; the full 186-beat browser playthrough remains unverified.
- `git diff --check` and `test -s docs/BUGHUNT_CH10.md` — passed.
