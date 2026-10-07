# Chapter 9 bug hunt

Reviewed HEAD `be675dd` against `AGENTS.md` and `docs/CH9.md`.
The requested `git diff ch9...HEAD -- src e2e tools` contains only four e2e
files: `ch9` already includes the mechanics, data, world and scripts.
Those additions were also reviewed using `git diff ch8...HEAD -- src e2e tools`
and their implementation commits. Neither comparison adds changes under
`tools/`. Only this report was written; no code changes or commits were made.

## Findings, ranked by severity

### 1. Moderate (P2) — conditional ROOT BRIDGE terrain escapes progression validation

**Resolution:** Conditional field-move and pit tiles are forbidden in `legendWhen`.
The validator rejects the synthetic Route 11 variant for `root_gap`,
`bramble_bush` and `pit`; no authored map violates the rule.

**Location:** `src/world/validate.ts:280`, `src/world/validate.ts:110`.

**Reproduction:** In an in-memory clone of `WORLD`, make this map variant:

```ts
const m = world.maps.route_11;
m.tiles[28] = "AAAAAAAAAAAAAggAAAAAAAAAAAAA";
m.legend = { ...m.legend, g: "dirt" };
m.legendWhen = [{
  when: [{ flag: "rival_5_done", is: true }],
  legend: { g: "root_gap" },
}];
```

After BRAM's battle, the only northward crossings at `(13,28)` and `(14,28)`
become gaps, before the player can reach ROOK to obtain FIG ROOT. Build the
runtime map, call `refreshLegend(runtime, { rival_5_done: true })`, then
`tryMove(runtime, 13, 29, "up")`. Compare it with `validateWorld(world)`,
`checkProgressWithoutFigRoot(world)` and a flood of the validator grid.

**Evidence:** The executed probe returned:

```text
validateWorld: []
checkProgressWithoutFigRoot: []
runtime move north: { kind: "blocked", reason: "wall" }
validator flood from (13,29) reaches (13,0): true
```

The new gate's `affects` predicate scans only the base legend, and `grid()`
also reads only that legend. Runtime field-cell discovery and
`refreshLegend()` explicitly support `legendWhen`. Consequently the
validator can approve a variant whose required bridge item is beyond the
bridge it must open, violating CH9 §3's acquisition requirement.

**Suggested fix:** Resolve relevant conditional legends against progression
flags before computing terrain and reachability, and discover root gaps in
conditional legends as well as the base legend. Add a regression for a
conditional gap blocking its own giver; scanning more legends alone does
not fix the base-only grid.

**Scope:** Synthetic variant exercising the new system, not a defect in the
authored Route 11, which has an unconditional gap guarding optional loot.

### 2. Moderate (P2) — the pit solver walks through forced warps

**Resolution:** The boulder BFS treats forced warp arrivals as terminal, including
ice traversal, and never pushes from them. Exit mats retain their down-only
warp rule. The reported pit fixture is rejected and solves with the warp off
the path; runtime regression verifies the intervening exit. The authored
Conservatory still solves for every filled-pit subset with reset boulders.

**Location:** `src/overworld/uproot.ts:69`, `src/overworld/uproot.ts:78`;
runtime comparison: `src/overworld/index.ts:546`.

**Reproduction:** Build a narrow outdoor fixture with these tiles and
legend (`# = wall`, `. = grass`, `P = pit`):

```text
########
#...P..#
########
```

Place the player at `(1,1)`, a boulder at `(2,1)`, and a step-on warp at
`(3,1)` to another map whose return lands at `(1,1)`. The pit is immediately
beside that warp, at `(4,1)`; the goal is `(6,1)`. Give SAXIFRAGE.
`solveBoulderPuzzle(buildMap(def), [boulder], player, goal)` returns `true`.
In runtime, push right once, walk to `(2,1)`, and push right again to fill
the pit. Trying to cross `(3,1)` exits the map before reaching the bridge.
Re-entry returns left of the same compulsory warp.

**Evidence:** An in-memory probe used the real scene's `uproot()` method,
ticked the actor animations, and invoked `onArrive()` on `(3,1)` with
`useWarp()` replaced by a recording stub:

```text
solver: true
filled_route_1_4_1: true
warpUsed: ["route_2"]
goalReached: false
```

The BFS expands walking neighbors from warp tiles as ordinary floor; it
neither terminates traversal at step-on warps nor models re-entry and its
boulder reset. The validator now uses this solver for general pit-room
reachability, so a successful solver result is insufficient evidence for
layouts with a warp between the standing tile and the goal.

**Suggested fix:** Stop local walking expansion at compulsory warp arrivals
(respect exit-mat direction rules), or model map transitions and reset
layouts explicitly. Include a pit beside an intervening warp in solver and
runtime regression coverage. Ice traversal must likewise stop at warps.

**Scope:** Synthetic boundary case. The traversal limitation existed in the
older boulder solver and carries into the new pit support; the authored
Conservatory's only warp is its southern exit, outside the puzzle path.

### 3. Minor (P3) — “hardest leader” is not enforced and the current sim does not establish it

**Resolution:** Raised only ROOK's snapdragon from level 47 to 48; his remaining
levels (48/48/51) and all moves stay unchanged. All levels remain within ±2
of CH9's base team. The existing model gives ROOK mean player win **58.6%**,
minimum **30.7%**, below SIGNE **62.8%** and FLORA **61.2%**. The balance test
now enforces both comparisons alongside the 58–70% band and starter floors.
AGENTS.md identifies FLORA as the early spike and ROOK as the hardest leader.

**Location:** `src/battle/logic/balance.test.ts:267`;
team tuning: `src/world/trainers.ts:469`.

**Reproduction:** Run:

```sh
npx vitest run src/battle/logic/balance.test.ts --reporter=verbose --disableConsoleIntercept
```

**Evidence:** The passing suite reports ROOK mean player win **63.8%**,
SIGNE **62.8%**, and FLORA approximately **61%**, using each leader's
ordinary milestone parties. Lower player win rates indicate harder battles
under this model. The new test asserts ROOK's 58–70% band and that he is
harder than Rival 5, but never compares him with any earlier leader.
CH9 §5 additionally calls ROOK “the hardest leader (the final test).” His
band and every-starter floor do pass; this is a relative-difficulty/spec
coverage issue, not an out-of-band finding.

**Suggested fix:** Clarify the intended ranking with the lead, then add an
explicit comparison under the agreed simulation model. If CH9's ranking
is intended to supersede the older convention, tune only ROOK's moves and
levels within the permitted ±2 range while retaining his prescribed band
and starter floors.

**Uncertainty:** AGENTS.md still says FLORA should be the hardest boss “so
far,” while CH9 specifies ROOK. Parties and sample sizes differ between
milestones, and a one-point difference from SIGNE is not a robust empirical
difficulty claim. The definite omission is the lack of a ranking check;
the output does not prove that the Chapter 9 ranking requirement is met.

No blocker or major defect was found in the authored Chapter 9 route.

## Clean areas

- **ROOT BRIDGE item gating and persistence — no issues found.** Without
  FIG ROOT, facing-A gives the locked explanation and sets no bridge flag;
  declining confirmation leaves the gap intact. Confirmation makes the
  replacement walkable, leaves the key item intact, and persists through
  save/Continue independently of continued item ownership. PRUNE and bridge
  flags do not clear each other's terrain. The authored rain-jar ledge is
  inaccessible before bridging. A water-adjacent probe blocked an unbridged
  gap from a raft and correctly dismounted onto the completed bridge.
- **Authored pit puzzle and re-entry — no issues found.** All eight subsets
  of filled pits, with all four boulders reset, reach ROOK's approach and
  the exit. Additional probes exercised actual scene UPROOT calls with
  actor animation ticks: fill fresh pits northward; move reset stones into
  the western pockets where pits are already filled. Each subset reached
  `(8,3)` and `(8,19)`. Save/Continue retained the flags, reset four stones,
  and placed the player at `(8,18)`. Walking between pushes used runtime
  movement rules, with positions advanced directly, rather than browser
  input. Occupied pits reject pushes; no authored pit has an NPC on it.
  Solver and runtime agree for these authored layouts.
- **Story gates and rewards — no issues found.** The city guard blocks the
  sole east exit until `ch8_done`. BRAM precedes the Conservatory door gate;
  ROOK independently checks `rival_5_done`. The friendly win and loss paths
  both complete BRAM's departure and heal the party, without loss whiteout.
  His countering starter is stage 3, level 49, ungrafted. ROOK loss does not
  grant the mark/root or finish the chapter. Repeated dialogue does not
  duplicate FIG ROOT. `ch9_end` requires both `beat_rook` and `got_fig_root`,
  and runs on ridge entry after departure. WINDOW PANES uses caught records
  for both steps, supports records obtained before accepting it, awards
  two rain jars and five glass pods, and does not repeat the reward.
- **Glide — no issues found.** Both new landings are walkable, unobstructed
  tiles below their greenhouse doors. Visit inference includes the new
  interiors, maps and milestone flags without using `ch8_done` alone to
  unlock Thistledown or ridge access.
- **Data and numeric balance bands — no issues found.** All eight species
  names, three move names and descriptions meet their limits; types,
  growth triggers, totals, stat shapes, signatures and animation families
  match CH9. Pitaya explicitly uses moonflower's existing `garden` and
  `tropical` pollination groups. All Route 10/11 encounter maxima are below
  numeric growth thresholds. ROOK is 63.8% and Rival 5 is 81.3% mean player
  win, inside their specified bands; minima are 32.3% and 41.7%. ROOK's four
  levels are each reduced by the permitted two, with move changes recorded
  beside the team. Herbarium comments cite the requested facts without
  adding another botanical claim.
- **Other reviewed spec requirements and e2e changes — no issues found.**
  Map sizes/order, the extra ridge greenhouse, trainer placements, mark,
  field-move tiles and required key item are wired. Ember Ash first sells
  in Thistledown for 3000. Placeholder assets/dialogue are intentional for
  this phase. The runner expects 162 beats, and the added field-input tests
  exercise both rival outcomes, actual pit confirmation/re-entry, the root
  gap/hidden jar and WINDOW PANES catch/growth/reward flow.

## Verification and limits

Passed `npm run typecheck`, `npm test` (**96 files, 1,090 tests**),
`npm run build`, the targeted balance run (**27 tests**), and
`test -s docs/BUGHUNT_CH9.md`. The build emits its existing bundle-size
warning. Additional probes were executed through Vite SSR with in-memory
fixtures; no throwaway tests or code edits remain.

The full browser playthrough was not run. Vite's attempted WebSocket bind
was rejected with `EPERM`; SSR loading and the probes nevertheless
completed. Rendering and the complete 162-beat browser run were not
independently verified. Findings 1–2 are explicitly synthetic system
boundaries, not demonstrated failures of the current Chapter 9 maps.


## Resolution verification (2026-10-07)

Passed `npm run typecheck`, `npm test` (**96 files, 1,098 tests**) and
`npm run build` (existing bundle-size warning). The tests include the new
conditional Route 11 regressions, pit/warp solver and runtime regressions,
ROOK's ranking, and the authored Conservatory's eight filled-pit subsets.
No authored `legendWhen` introduces forbidden terrain.

Attempted `npm run e2e -- --allow-placeholders`; the runner failed before
executing any beats because Vite could not bind localhost:
`listen EPERM: operation not permitted 127.0.0.1`. This environment does not
permit an escalated retry. The complete 162-beat browser verification remains
unfinished and must run in an environment permitting the local server.
