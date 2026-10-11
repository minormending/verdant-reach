# Post-game bug hunt

Reviewed `git diff origin/ch11...HEAD -- src e2e` at HEAD `ca3911a`
(base `9e5a3fe`) against `docs/POSTGAME.md` and repository `AGENTS.md`.
Review only: no implementation changes. Findings are ranked by severity;
P2 means a functional defect, P3 means a minor gameplay hazard or coverage gap.
No P0/P1 issue found.

## Findings

### 1. P2 — COCONUT cannot be encountered on one of its two roaming maps

**Resolution:** Added Driftseed Isle water encounters (40% SEAGRASS SHOOT 26–27, 30% MANGROVE PROPAGULE 23, 30% EELGRASS 28–30). Numeric growth caps follow Chapter 6; PROPAGULE cannot be 26–30 because it grows at 24. Every roaming destination now has a rollEncounter habitat regression.

- **Location:** `src/overworld/roaming.ts:13`; supporting code:
  `src/world/maps/driftseed_isle.ts:52`, `src/overworld/encounters.ts:59`,
  `src/overworld/index.ts:586`.
- **Reproduction:** Clear the game and release the Wanderers. Enter Driftseed
  Isle when COCONUT's movement roll selects that map. Raft on the water tiles
  at the northern entrance. No COCONUT encounter can happen, however many
  encounter rolls would otherwise succeed.
- **Evidence:** COCONUT chooses uniformly between `route_8` and
  `driftseed_isle`. The island defines only a **grass** encounter table.
  `rollEncounter` returns null for water without a water table, so the runtime
  never reaches `wildEncounter` and its roaming replacement hook. A read-only
  runtime probe selected the island with `moveRoamers(..., () => 0.999, ...)`;
  `rollEncounter(island, "water", "day", () => 0, true, flags)` returned null,
  although `meetingRoamer(state, "driftseed_isle", "water", () => 0)` returned
  `"coconut"` when called directly. Half of COCONUT's possible destinations
  therefore cannot produce a meeting. The 1/4 helper probability itself is
  correct; this is a missing habitat table and a mismatch with the specified
  sea/island meetings.
- **Suggested fix:** Add an appropriate water encounter table to Driftseed
  Isle, retaining encounter replacement after the ordinary encounter roll.
  Test that every roaming destination can actually roll its required habitat
  through the runtime encounter pipeline.

### 2. P2 — Crossing midnight during battle UI delays recovery by another day

**Resolution:** Battle resolution captures the first 0-HP timestamp before playback or EXP waits. Scene regressions cross midnight in EXP for all three Wanderers and verify next-day recovery directly and after save/Continue.

- **Location:** `src/battle/scene.ts:421`; supporting code:
  `src/battle/scene.ts:1075`, `src/battle/scene.ts:1143`,
  `src/overworld/roaming.ts:98`.
- **Reproduction:** Wilt a Wanderer just before local midnight. Leave an EXP,
  level-up, or move-learning prompt open until after midnight, then finish the
  battle. Search for it during the following day or save and Continue: it is
  still wilted until the subsequent midnight.
- **Evidence:** Turn resolution changes the foe's HP before `await play(events)`.
  `afterTurn` then awaits `awardExp`, which can wait for player input. Only
  afterward does `finishWandererBattle(..., new Date())` record the wilt day.
  A runtime battle probe used a 1-HP, blighted COCONUT and a failed pod turn:
  real turn resolution wilted it at **2026-10-07 23:59:59**. Advancing the
  clock to **2026-10-08 00:00:01** during the EXP UI recorded
  `wandererWilted.coconut = "2026-10-08"`. Recovery at noon October 8 still
  returned HP 0. The spec promises return on the day after wilting, not the
  day after dismissing battle dialogue. This affects all three Wanderers.
- **Suggested fix:** Capture the local wilt date when the turn first reduces
  the Wanderer's HP to zero, before playback/EXP waits, and use that timestamp
  for writeback. Add a battle-scene regression that advances across midnight
  during UI and checks recovery on the new day, including save/Continue.

### 3. P3 — BURR can occupy the only return warp and force a battle to retreat

**Resolution:** A shared safety check excludes warps, shared exit mats and tiles whose only exit is a warp during both placement and saved-hitch restoration. Vault-to-Route-9 arrival is covered. THISTLEDOWN’s Route 11 arrival moves one tile inward (y=53), leaving a safe hitch tile behind and preserving the existing BURR meeting beat.

- **Location:** `src/overworld/roaming.ts:80`; supporting code:
  `src/overworld/index.ts:247`, `src/overworld/index.ts:519`,
  `src/world/maps/seed_vault.ts:31`.
- **Reproduction:** After release, leave the Seed Vault entrance for Route 9.
  The player arrives at `(6,1)`, facing down. On a successful hitch roll,
  BURR occupies `(6,0)`, the sole warp back into the Vault. Turn north and try
  to return: movement is blocked by BURR. Talking to it forces its level-60
  battle before that exit becomes usable.
- **Evidence:** The placement test checks walkability and NPC occupancy but
  does not exclude warps. A runtime probe with successful rolls produced the
  hitch at `(6,0)`; `warpAt` identified `seed_vault_entrance`, and `tryMove`
  returned `{ kind: "blocked", reason: "occupied" }`. Scanning authored warp
  arrivals found the same pattern on many other routes. This is **not a
  permanent soft-lock**: talking removes BURR before the battle. The binding
  spec does not explicitly exclude warp tiles, so this is a gameplay hazard
  for the lead to resolve, rather than an unambiguous placement-spec violation.
- **Suggested fix:** Reserve exit/warp tiles during placement and hitch
  restoration, or provide a way to leave through the occupied exit without
  starting the battle. Add the actual Vault-to-Route-9 arrival as a regression.

### 4. P3 — The e2e roaming milestone can pass without any roaming encounter

**Resolution:** Replaced movement-only success with separate seeded, real TUMBLEWEED grass and COCONUT island-water meetings; both require the requested species, level 60, matching habitat and flee on turn 1. Reports record turn counts; post-game and runner tests now require 24 and 229 beats respectively.

- **Location:** `e2e/playthrough.ts:2399`; supporting assertion:
  `e2e/postgame.test.ts:90`.
- **Reproduction:** Let the bounded search finish with no TUMBLEWEED/COCONUT
  battle but at least one map change by TUMBLEWEED. The roaming milestone
  still passes. The post-game test checks passing beats and rematch outcomes,
  but never requires a TUMBLEWEED/COCONUT battle.
- **Evidence:** The success expression is `meeting ? ... : movement`.
  Therefore a broken replacement hook can remain undetected by this
  end-to-end milestone while movement works. The search targets TUMBLEWEED;
  it also supplies no required COCONUT water meeting, leaving finding 1 outside
  its coverage. Existing unit/integration tests do cover replacement helpers,
  but do not make this e2e assertion equivalent to an actual meeting.
- **Suggested fix:** Require a real roaming battle with the expected request
  and first-turn outcome, using a reproducible seeded route/encounter sequence.
  Add a separate COCONUT water meeting on each supported destination instead
  of accepting movement as a substitute for encountering a roamer.

## Coverage and clean areas

- **ROAMING on the current map:** no issues found in movement or replacement
  selection apart from finding 1. Movement permits the player's destination,
  including the previous roaming map. Replacement is conditional on a real
  matching grass/water encounter and uses `rng() < 1/4`.
- **Save migration and Continue:** no issues found in HP, status, roaming map,
  caught flags, wilt dates, or hitch round-tripping. Continue restores the
  existing hitch and does not reroll initial map movement.
- **Caught and wilted lifecycle:** no issues found in permanent caught removal
  or the pure recovery comparison. Tests cover same-day suppression, local
  midnight recovery and a backwards clock. Finding 2 concerns when the
  battle supplies the wilt timestamp.
- **First-turn flee and statuses:** no issues found. All three resolve one
  complete turn, including residual damage, then flee if still alive and the
  battle has not ended. Sleep/trapping and a player switch do not delay it;
  capture, wilting and a party loss end the battle appropriately. HP and the
  final status write back, including player escapes/losses.
- **RNG:** no issues found in deterministic helpers given the same seed,
  draw sequence and date, or the independent seeded battle streams. Runtime
  roaming uses the existing world stream shared with NPC AI; idle time can
  shift subsequent world rolls. Seed-only reproducibility independent of
  waiting, or preserving the RNG cursor across reloads, is not established
  by the spec and is not counted as a confirmed defect here.
- **BURR terrain, occupancy and followers:** no issues found for walls,
  structures, water, ledges, out-of-bounds cells, or visible NPC occupancy.
  Followers tuck onto the player on entry before placement, never block
  player movement, and NPC interaction takes priority. Warp occupancy is
  covered by finding 3.
- **Gating:** no issues found. The Route 9 spur requires `game_cleared`;
  the Ridge additionally requires `diary_read`. Event NPC visibility and
  scripts enforce their respective gates, roaming requires clear/release,
  and post-game maps are not GLIDE destinations. The access validator tests
  missing gates and extra incoming edges.
- **Centuryheart:** no issues found. The guarded level-30 gift sets
  `got_centuryheart` and hides the NPC; full parties receive it in the box.
  Its data has no growth target and an empty pollination group.
- **Methuselah:** no issues found. The event requires night and both story
  gates; day/morning only show the old-tree line. It sets no one-off flag,
  and `canLose: true` permits repeat interactions after flee/loss.
- **Seed Vault puzzles:** no issues found. B1's alternating ice stops have
  retreat paths. B2 requires both pit fills and ROOT BRIDGE; all four saved
  pit subsets solve with reset stones. Continue starts at the lower entrance
  with a retreat available. Map re-entry resets displaced boulders.
- **Rematches:** no issues found. Teams are independent +8 clones. The door
  closes, ordered wins open exits, losses white out/reset the run, and Continue
  does not reset an active run. Keeper victory pays 5000 via the battle engine
  and three rain jars via its guarded after-script, once per successful run;
  rematch completion records the team without credits or automatic healing.
- **No breeding and other species/move mismatches:** no issues found. All five
  use empty pollination groups, with exhaustive compatibility tests in both
  slots. Types, BSTs, catch rates and signatures match the spec. Old Rings
  supports both defence boosts and healing, so the fallback is unnecessary.
  The prescribed Herbarium facts/source annotations are present. Existing
  Fennimore's interior is reused, as the spec expressly allows.

## Verification and limits

- `npm run typecheck` — passed.
- `npm test` — 116 files, 1,377 tests passed, including post-game runtime
  playthrough tests for seeds 1 and 42.
- `npm run build` — passed; existing bundle-size advisory only.
- Read-only Node/Vite SSR probes asserted findings 1–3 using actual world,
  encounter, overworld and battle modules. The midnight probe replaced UI
  waits and advanced the clock during EXP; battle resolution, writeback and
  recovery used production source. No throwaway repository tests were added.
- Browser/headless full-playthrough execution was not performed; visual
  behavior was reviewed from source, not a browser session.
- `test -s docs/BUGHUNT_POSTGAME.md` — passed after writing this report.

All reported implementation fixes remain unfinished by design: this task
authorizes findings only.

## Fix verification

Typecheck, the unit/integration suite (1384 tests), and the production build pass.
The post-game driver covers all 24 milestones with seeds 1 and 42, including
both real roaming encounters and their first-turn flee outcomes.
`npm run e2e -- --allow-placeholders` was attempted in the worker sandbox,
but Vite could not bind its listener (`listen EPERM 127.0.0.1`); the full
229-beat browser playthrough still needs to run in an environment that permits
local listening sockets.
