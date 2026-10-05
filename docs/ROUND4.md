# Round 4: Chapter 4 (Glasshouse City) and swappable art (10 agents)

**User direction**
- "Continue with 10 opus 5.5 sub agents to build Chapter 4."
- "Ensure that all the creatures/tilesets are modular enough (with images) so
  that in the future we can build tools to modify/improve them and swap them
  easily."

So this round does two things:
1. **Chapter 4 ships** at the quality of Chapters 1–3.
2. **All art moves to swappable bundles**: a folder of PNGs plus JSON per
   creature, tileset, structure and character, read directly by the game, with
   art packs, palette-exact sports, an in-browser Art Lab and a Python and CLI
   toolkit. **The format is the contract in [ART.md](ART.md). Read it first.**

Also read:
- [STYLE.md](STYLE.md) (the quality bar and the voice);
- [CREATURES.md](CREATURES.md) (creature rules and the rubric);
- [POLISH.md](POLISH.md) (the ownership model, still in force);
- [ARCHITECTURE.md](ARCHITECTURE.md);
- the story bible, [docs/story/](story/), especially 02–04.

## 1. Chapter 4: Glasshouse City

### Story flow (the narrative owner writes the words; these beats are fixed)

1. **The chapter 3 ending changes.** Nell's win, then Vale's call (`vale_call`)
   no longer ends the slice.
   - Vale has read Fennimore's notes: *the seed hums at the same pitch the
     bog does at night.*
   - She asks the player to take the CENTURYHEART SEED to the **ROOT RELAY**
     in **GLASSHOUSE CITY**, east of Sugarbush, where researchers listen to
     the root network.
   - This sets `ch4_started`. Sugarbush's east exit to Route 4 opens on that
     flag: a sap-collector's cart blocks the road until then (an NPC with
     `visibleWhen`).
2. **Route 4** (Sugarbush to Glasshouse City): an apple orchard and a river.
   - Orchard rows and a cider press.
   - Stepping stones across the shallows, and a ledge shortcut.
   - 4–5 trainers and wild Quickened (§1.3).
   - A bramble patch hides an item for when the player can PRUNE.
   - Hidden items and a harvest bush.
3. **Arrival.** Entering the dome for the first time shows the
   `glasshouse_dome` still (the city under one vast glass roof), then music
   `glasshouse_city`.
   - The city is the region's biggest map: paved plazas, a fountain square,
     iron railings, market stalls, palms and townhouses.
   - The Rose Conservatory, the Root Relay (with its mast), the Nursery
     Garden, the Palm House, the Greenhouse and the big Market.
   - PIP is here with a fact. Flora's fans and a reporter fill the streets.
   - `outdoor: true` (the glass lets the sky through: the day/night tint
     still applies) and `border: "glass_wall"`.
4. **The Rose Conservatory is closed.** Its door script says FLORA is at the
   ROOT RELAY's open day, until `relay_listened`.
5. **The Root Relay** (the main beat).
   - Researchers, consoles and buried-sensor posts. The director is named by
     narrative; no plant puns on real people.
   - **WREN** is a brilliant, friendly network engineer: the future Rootstock
     admin, so foreshadow lightly.
   - **FLORA VANCE** is there as the Relay's celebrity patron.
   - The player sets the seed on the listening desk: shake, then still
     `relay_pulse`, then sfx `pulse`.
     - **Something enormous, deep under the valley, answers with one pulse.**
       This is the first hint of the Elder.
     - Wren, very quietly: it's *answering*. She asks to "borrow" the seed;
       the director refuses.
   - Flora invites the player to her Conservatory ("it reopens this
     afternoon, darling").
   - Set `relay_listened`.
   - A grey-coated grunt is seen watching the Relay as the player leaves
     (a camera pan): foreshadowing for Act 2.
6. **The Nursery Garden.** A keeper couple, named by narrative after garden
   plants, but **not** "Rowan" (taken by Vale's sibling).
   - They explain pollination and board plants (§2.2).
   - **Bram**, the first time the player enters after `relay_listened`: he's
     pressuring the keepers for "a stronger seed, now."
     - "You can't hurry a seed."
     - His partner wears the graft collar.
     - **Rival battle 3** (`rival_3_<line>`, can't be lost); then he leaves,
       trampling the keepers' hedge.
   - The keepers then give the **PRUNING SHEARS** (`pruning_shears`), which
     unlock PRUNE (§2.1): "the old Hedgerow path's gone wild since the bloom."
7. **Conservatory 3: FLORA VANCE (Bloom).** The famous difficulty spike.
   - Puzzle: a rose-trellis maze with `rose_gate`s opened by levers. It must
     be solvable, and the puzzle test proves it.
   - 2 junior trainers (an arranger and a gentleman fan).
   - Flora: 3 Quickened, levels about 19 / 20 / 22.
     - Her ace is **MOTH ORCHID** at 22.
     - Her line-up should *feel* hard: smart AI, one healing item and good
       coverage, but it stays beatable with any starter (the balance test).
   - **ROSE MARK** (`rose_mark`, UI art `mark_rose`). She's dramatic about
     losing; Whitney's tears are the reference, but in our voice.
8. **Chapter end.** When the player has both `rose_mark` and
   `relay_listened`, and leaves the Conservatory, Vale calls.
   - She's heard about the pulse: *something under the valley answered your
     seed.*
   - She mentions CEDARHALLOW and the Burnt Stand: "the fire-cones opened
     there last week, and nothing was burning."
   - Then `endSlice` (TO BE CONTINUED), with the save offer as now.
9. **Route 5**, optional: a short Glasshouse City to Hedgerow loop, gated by
   brambles at both ends, so PRUNE is required.
   - 2 trainers, hidden items, and a shortcut home that makes the world feel
     connected.
   - Hedgerow gains a new exit for it.

**PRUNE payoff in the old maps.** Add 4–6 bramble patches across Routes 1–3
and Hedgerow, each guarding a hidden item, a shortcut or a harvest bush. None
may block required progress.

### 1.2 New maps (MAP_IDS)

| Map | Notes |
|---|---|
| `route_4` | Orchard and river, roughly 40–60 tiles long. Music `route` (day) / `route_night`. |
| `glasshouse_city` | The big map (about 40×36). Music `glasshouse_city`. Ambient `pollen` under the dome. |
| `palm_house` | Tropical glasshouse: `tropical_grass` encounters, a lotus pool, a raised walkway. Music `palm_house`. Battle backdrop `glasshouse`. |
| `glasshouse_greenhouse` | Healing centre: use `greenhouseMap()` with a city-flavoured nook |
| `glasshouse_market` | The big market: two counters (pods and medicine; plant care). The stock list is in §1.4. |
| `glasshouse_nursery` | Nursery house (counter: the `nursery` op) and yard (the second keeper, boarders shown in the yard) |
| `glasshouse_relay` | Lobby, listening room with consoles and the desk, server racks. Music `root_relay`. |
| `glasshouse_conservatory` | Rose maze, 2 juniors, Flora |
| `glasshouse_house` | Residents' house: a quest giver plus flavour |
| `route_5` | Short loop to Hedgerow; brambles at both ends |

### 1.3 New species (12) and encounters

The types are suggestions; data has the final say. Display names are
≤12 characters, e.g. MONSTERA CUT. → choose well.

| Line | Stages | Types (suggested) | Habitat | Growth (suggested) |
|---|---|---|---|---|
| Apple | apple_pip → apple_sapling → apple_tree | wood / bloom | Route 4 orchard (day) | vigor 18 → tending (friendship), "a tree you cared for" |
| Moth orchid | orchid_keiki → orchid_spike → moth_orchid | bloom (stage 3 bloom/ghost?) | Palm House, more at night | vigor 20 → vigor_night 34. Flora's ace. |
| Monstera | monstera_cutting → monstera | wood | Palm House | vigor 24 |
| Lotus | lotus_seed → sacred_lotus | water / bloom | Palm House pool edge | vigor 26 |
| Bird of paradise | paradise_shoot → bird_of_paradise | bloom / fire | Palm House, RARE (day) | vigor 28 |

**Wild levels**

| Area | Levels | Also found here |
|---|---|---|
| Route 4 | 14–18 | apple_pip, clover, dandelion, mint, rose_bud, maple_samara; the sundew line by the river edge (data and world decide) |
| Palm House | 15–19 | — |
| Route 5 | 16–19 | a mix of Route 1–2 lines, higher |

Trainers on Route 4 are 15–19. Bram 3 is 3–4 Quickened, about 18–22,
including his evolved starter (graft-collared and forced, so it is past its
growth level).

### 1.4 Market, items and quests

- **Glasshouse Market stock:** terrarium pod, glass pod, water flask, spring
  water, compost, neem spray, plant food. Data may add 1–2 new
  consumables.
- **Key item:** `pruning_shears`.
- **Quests** (narrative writes the scripts and QuestDefs; maps place the
  givers with exactly these NPC and script ids):

| Quest id | Title | Giver | Goal | Reward |
|---|---|---|---|---|
| `relay_sensors` | LISTENING POSTS | `wren` @ glasshouse_relay (after `relay_listened`) | "Check" 3 `sensor_post` tiles: Route 4, the city square and the Palm House. Each is a sign-like interaction script that sets `sensor_<n>_read`. | $2000 + 3 GLASS POD. *(Subtext for Act 2: Wren is using you to map the hubs. Never say it.)* |
| `first_seed` | THE FIRST SEED | `nursery_keeper_b` @ glasshouse_nursery yard | Sprout any Nursery seed (the engine sets `sprouted_any` when a seed sprouts) | RAIN JAR + 5 PLANT FOOD |
| `fan_mail` | FAN MAIL | `fan` (sprite `gentleman`) @ glasshouse_city | Deliver a letter to Flora *after* beating her. Uses a key item `fan_letter` (data adds it). | A signed photo of Flora (a key item, flavour) + $1000 |

Script ids are `q_<questId>`. Sensor posts use `q_relay_sensors_post_<n>`.

## 2. New systems (contracts already added)

### 2.1 PRUNE (the field move framework)

- `TILES.bramble_bush.fieldMove = "prune"`. `FIELD_MOVES.prune.item = "pruning_shears"`.
- **Using it.** Press A facing a bramble. Without the shears: "A thorny
  tangle. It could be PRUNED." With the shears: "PRUNE it?"
  - On yes, the lead (or follower) Quickened does a little hop and the
    bramble is snipped: sfx `prune` and 3–4 frames of leaf particles.
  - This sets `pruned_<map>_<x>_<y>`. From then on, that cell draws and
    behaves as `bramble_stump` (walkable). Permanent.
- **Framework.** Build this generically (tile property, then key item, then
  prompt, then flag), so that later field moves (Uproot, Raft, Glow) are
  table entries plus an animation.
- **Validator.** The world validator treats prunable tiles as walls for
  required-progress reachability *before* `pruning_shears` is obtainable, and
  as open after. Required story paths must never need PRUNE before the
  Nursery gives the shears.

### 2.2 Nursery Garden (breeding)

- **Boarding.** The `nursery` op runs the keeper's counter. Up to 2
  boarders live in `GameState.nursery`.
  - Each boarder gains 1 exp per player step and can level up there. No
    moves are learned there: keep the old moves, as Gen 2 does.
  - Taking a boarder back costs $100 plus $100 per level gained.
  - **The party must keep at least one non-seed Quickened.**
- **Seed setting**
  - Two boarders that share a `pollination` group (`Species.pollination`)
    can set seed.
  - Every 256 steps there's a chance of a seed: 50% for the same line, 20%
    for the same group, 0% otherwise. Then `seedReady = true`.
  - The yard keeper hints when a seed is ready (`ifNurserySeed`).
- **Collecting.** `nursery` gives the seed when it's ready. It joins the
  party as a Quickened of the **stage-1 species** of the *first-boarded*
  parent's line, the "seed parent", with
  `seed: { steps: 600–1200 by growth rate }`.
  - Level 5.
  - It inherits 3 random IVs from the parents.
  - It knows its level-1 moves, plus one move both parents know if its
    learnset has it.
  - A 1/256 sport chance (twice the wild rate, as a reward).
- **Seeds in the party**
  - They show the `ui/seed` icon (2 frames). The summary shows `seed_big`
    and a hint that changes as it nears sprouting ("It's warm.",
    "Something's moving inside.").
  - They can't battle and are skipped when picking a lead.
  - Their steps count down on overworld steps.
  - At 0: the sprouting scene. "Oh? The SEED is moving!", then the
    `seed_big` art cracks, a flash, `showSpecies`, jingle `sprouted`, then
    "<NAME> sprouted from the SEED!". It's added to the Herbarium
    seen/caught, and flag `sprouted_any` is set.
  - The scene works in any overworld map.
- **Data.** Every species gets `pollination` (data owner). The Centuryheart
  and legendaries have none, and none are in the game yet.

### 2.3 Smaller additions

- Battle backdrop `glasshouse`: soft green-gold light through the glass, leaf
  shadows.
- `uiPath("seed" | "seed__2" | "seed_big")` and `uiPath("mark_rose")`.
- New music `glasshouse_city`, `palm_house` and `root_relay`; jingle
  `sprouted`; sfx `prune`, `sprout` and `pulse`. Placeholders alias existing
  tracks (marked `ROUND4-STUB`); replace them.

## 3. Swappable art (the modularity requirement)

The full contract is [ART.md](ART.md). The plan:

- **During the round, the game must keep running at all times.**
  - The new runtime resolves a logical path through the bundles first, and
    falls back to the legacy `public/assets/` file.
  - The pipeline owner migrates every existing asset into `public/art/`
    bundles.
  - Once the runtime runs purely on bundles and the e2e passes, the pipeline
    owner deletes `public/assets/` and `src/assets/manifest.ts`. Coordinate
    via main.
- **All new art this round is authored directly as bundles** in
  `public/art/`, never in `public/assets/`.
- **Sport palettes become exact.** The runtime hue-shift hack
  (`sportVersion` in `src/screens/kit/draw.ts`) is replaced by `?sport` paths.
  - Migration seeds each existing species' `sport` from the old hue shift
    applied to its 4 colours, so nothing changes visually.
  - Creature artist 4 then designs real sports for all 53 older species.
- **Generators are authoring tools now, not the source of truth.**
  - `tools/art/build_all.py --regen` must still reproduce every
    `kind: "generated"` bundle byte-identically.
  - A plain `build_all.py` (no flag) only validates and rebuilds
    `index.json`.
- **Demo pack `traced`.** Proof that swapping works: the original
  photo-traced sprites for the sunflower, oak, pumpkin, flytrap and fern lines
  (from `creature-sprites`), and a palette-only override for one or two more
  species.
- **Art Lab** (`?dev=art`): see ART.md §10. It's the seed of the future
  editing tools, so build it cleanly.

## 4. Owners (this round)

Edit only what you own; read anything.

| # | Agent | Owns | Port |
|---|---|---|---|
| 1 | **Art runtime** | `src/art/` (new): the registry, logical-path resolver, sheet slicing, palette and sport swap, packs, the Art Lab dev scene, PNG decoder and `bundles.test.ts`. Also `src/assets/` (retire it); `createAssets` in `src/engine/core.ts`; the asset-loading lines in `src/main.ts`; `tools/art/index.mjs` plus the `art:index` script in `package.json`. **Surgical** asset call-site edits in other modules (`ASSET_PATHS` users, `sportVersion` to `?sport`): re-read before editing, keep them minimal, and tell main. | 5211 |
| 2 | **Art pipeline + migration** | `public/art/` structure and the migration of **all existing** assets into bundles; `tools/art/` (the `artkit/` library, `art.py` CLI, rewiring the existing generators to write bundles, `build_all.py`); the tooling sections of `docs/ART.md`; the `traced` demo pack; `public/art/CREDITS.md`. At the end, delete `public/assets/`. | 5212 |
| 3 | **Creature art: Palm House lines** | the orchid (3), monstera (2) and lotus (2) bundles in `public/art/species/`; `tools/art/species_e/` | 5213 |
| 4 | **Creature art: orchard + sports** | the apple (3) and bird of paradise (2) bundles; `tools/art/species_f/`; **the `sport` palettes of all 53 existing species** (edit their `species.json` only after agent 2 has migrated them, and set `source` to `edited` only if you change pixels, which you shouldn't) | 5214 |
| 5 | **Environment art** | new tilesets and structures for Chapter 4 (all new TileKeys and STRUCTURES) as bundles; `tools/art/env4/` | 5215 |
| 6 | **Characters, portraits, items, UI, stills** | the 10 new character bundles, 5 portraits, item icons (`pruning_shears`, `fan_letter`, signed photo and any new data items), UI (`mark_rose`, `seed`, `seed__2`, `seed_big`), stills (`glasshouse_dome`, `relay_pulse`). Add entries to the migrated `sets/*/set.json`. `tools/art/` generators for these (new files, or surgical additions to your Round-3 generators). | 5216 |
| 7 | **Systems** | `src/engine/` (except `createAssets`), `src/overworld/`, `src/ui/`, `src/save/`, `src/battle/`, `src/screens/`: PRUNE, the Nursery, seeds and sprouting, the glasshouse backdrop, save migration, and the new ops `nursery` / `ifNurserySeed` | 5217 |
| 8 | **Data + audio** | `src/data/` (12 species with stats, learnsets, growth, `pollination` for all 65, new moves, items, Herbarium entries with sourced true facts) and the balance test (Flora, Bram 3, Route 4/5 trainers). `src/audio/`: 3 tracks, the `sprouted` jingle and 3 sfx. | 5218 |
| 9 | **World** | `src/world/maps/` (10 new maps; the Sugarbush and Hedgerow exits; bramble patches in older maps; delete `round4_stubs.ts`), `build.ts`, `validate.ts` and tests (PRUNE-aware reachability, the Conservatory 3 puzzle test), and the **teams and levels** in `src/world/trainers.ts` for new trainers | 5219 |
| 10 | **Narrative + e2e** | `src/world/scripts/` (new `ch4.ts`, the chapter 3 transition, quests), the text fields in `trainers.ts`, and dialogue inside new maps where world asks; **`e2e/`**: extend the full playthrough through Chapter 4 to the new `endSlice` | 5220 |

**Shared-file rules**
- **`trainers.ts`.** World adds entries (ids, teams, levels, portrait).
  Narrative fills `intro` / `defeat` / `after` / `name`. Data may tune
  levels or moves to pass the balance test. Re-read before every edit, keep
  edits surgical, and SendMessage the others when you change a shared
  entry.
- **Maps vs narrative.** As in POLISH.md.
- **Contracts are frozen.** If you need a change, SendMessage `main` with
  exactly what you need.
- **To reach another agent,** SendMessage `main`; main relays.
- **No git commits.** Main integrates and commits.
- **Use your own port and your own browser tab.** `?timer` keeps a hidden tab
  running. Stop your server and close your tab when done.

## 5. Definition of done (all agents)

- `npm run typecheck` and `npm test` are green. The failures that exist at
  the start are the checklist:
  - manifest/bundle coverage (art);
  - data for the new species and items (data);
  - the stub maps (world).
- **You looked at your work in the real game,** not just in isolation, and
  critiqued it against STYLE.md and CREATURES.md.
- Art agents also check their bundles in the **Art Lab** once agent 1 ships
  it.
- **Final report** (under 350 words): what changed, anything unfinished, and
  integration notes for the other owners.
