# Round 3: AAA depth pass (10 agents)

**User direction:** "make the game triple A quality for images, creatures,
gameplay, dialogue". Then, mid-brief: **"Specifically, the creatures need to be
refined, their look."**

So creature visuals are the top priority of this round; five of the ten agents
work on them. Read [STYLE.md](STYLE.md), [POLISH.md](POLISH.md) (ownership
model and rules, which still apply) and [ARCHITECTURE.md](ARCHITECTURE.md).

## 1. Creature direction

The current 37 sprites are clean and hand-made, but they read as *nice
botanical clip-art*, not as *creatures you'd want on your team*. The aim is
the appeal of the best monster-game designs, within our rule that plants have
**no faces** (decision Q3: no eyes or mouths drawn on, except real eyespot
markings where the real plant has them).

Creature-ness comes from these, in order:

1. **Stance and gesture.**
   - Every creature is posed as if it's *in a battle, facing the opponent*
     (front sprites face left/3-quarter). Leaves read as arms raised or
     braced, roots or stems plant like feet, heads (flower heads, pods, traps)
     tilt toward the foe.
   - Asymmetry and a line of action are required: no static, centred,
     specimen-on-a-tray poses.
2. **Silhouette.**
   - Each one is instantly recognisable as a solid black shape at 1x and
     distinct from every other species.
   - Exaggerate the signature feature by 20–40%: the flytrap's jaws, the
     chili's curl, the sunflower's disc, the fern's spiral, the acorn's cap.
3. **Charm in the details.**
   - Highlights work like a "glint of life": a dew bead, a glossy pod, a
     sap shine.
   - Tiny motion cues: windswept leaves, a seed drifting off, a curling
     tendril.
4. **Family resemblance.** Each evolution line keeps one shape motif and one
   accent colour and escalates them: the stage-3 form looks like the stage-1
   form grew *up and powerful*, not just bigger.
5. **Pixel craft** (STYLE §1–2):
   - 4 colours, a 1px #181818 outline with selective lighter outline on lit
     edges, light from the top-left, hue-shifted shading.
   - Clusters, no orphan pixels, no pillow shading.
   - Use the size class fully.
6. **Life.** Every species gets a battle idle animation:
   - `front__2.png` (and optionally `front__3.png`), same size and
     registration, ping-ponged by the battle scene.
   - Subtle sway, breath, a leaf flutter, a trap twitch, petals stirring.
     Keep the silhouette stable: only 1–3px of motion.
7. **Back sprites** match the redesigned fronts (the true back view, seen
   from behind and above, cropped at the bottom). **Icons** are crisp,
   2-frame.

Process for every creature artist:
- Draw thumbnails first (the silhouette alone).
- Then the line in sequence, side by side.
- Then render them in-game (battle, party, Herbarium) and critique them
  against this section **and against the other artists' work**. The roster
  must look like one game.
- The **Creature Director** (agent 1) publishes `docs/CREATURES.md` early
  (within its first ~20 minutes): the palette discipline, outline and selout
  rules, the pose rules above made concrete, a "pose vocabulary" with
  examples, and a scoring rubric. **Artists 2–5 must re-read it regularly**
  and follow it.

## 2. New species (16, all 2-stage)

Ids are in `src/contracts/ids.ts`. The types here are suggestions; the data
agent has the final say.

| Line | Stage 1 → 2 | Suggested types | Habitat (for map agents) | Artist |
|---|---|---|---|---|
| Clover | clover_sprout → white_clover | bloom | Fallowfield fields, Route 1 (grass, day) | 4 |
| Cattail | cattail_shoot → cattail | water | Bog, Route 3 pond edges (bog/grass) | 4 |
| Foxglove | foxglove_rosette → foxglove | bloom/ghost | Hedgerow, Route 2 woodland (dusk/night more common) | 4 |
| Holly | holly_seedling → holly | frost/wood | Route 2 woods, Sugarbush Grove | 4 |
| Mint | mint_sprig → peppermint | frost | Hedgerow gardens, Route 1 (grass) | 5 |
| Wild rose | rose_bud → wild_rose | thorn/bloom | Route 3, Bramblegate hedges | 5 |
| Pitcher plant | pitcher_sprout → pitcher_plant | bug/water | Bog | 5 |
| Snapdragon | snapdragon_sprout → snapdragon | dragon/bloom | RARE: quest gift (Herbarium Survey), plus a very rare Route 3 day slot | 5 |

## 3. New gameplay systems (contracts already added)

- **Battle idle frames:** `speciesPath(id, "front__2" | "front__3")`.
- **Stills:** `STILLS` and `stillPath()` give 160x144 story illustrations. The
  `still` / `stillClear` script ops fade to and from them.
- **Hidden items:** `MapDef.hidden` (A on the tile; flag
  `hidden_<map>_<x>_<y>`; a faint sparkle hint).
- **Harvest bushes:**
  - NPC sprite `harvest_bush`, with id `bush:<harvestId>`.
  - Its script uses `{ op: "harvest", id, item, qty }`.
  - Regrows on the next real-world day (`GameState.harvested`).
  - Items: `wild_berry` (heal) and `rose_hip` (cure).
- **Conditional ops:** `ifHasItem`, `ifPartyHas`, `ifCaught`, `ifCaughtCount`.
- **Quests:** `startQuest` / `completeQuest`, `QuestDef` in `WorldData.quests`,
  and a **NOTES** screen in the START menu.
- **Follower:** the lead Quickened walks behind the player using its 16x16
  icon frames, toggled by `options.follower`. `options.battleAnims` toggles
  move animations.

## 4. Quests

Narrative writes the scripts and `QuestDef`s in `src/world/scripts/quests.ts`
and wires `WORLD.quests`. Map agents place the giver NPCs with exactly these
ids and `script` ids.

| Quest id | Title | Giver (NPC id @ map) | Goal | Reward |
|---|---|---|---|---|
| `seed_library` | SEED LIBRARY | `librarian` @ fallowfield (outside or in the large house) | Have 6 species CAUGHT (`ifCaughtCount 6`) | 3 GLASS PODs |
| `lost_cat` | MOSS IS MISSING | `cottager` @ hedgerow | Find the cat MOSS (NPC `moss`, sprite `cat`) hiding on route_2, visible while started and not found; talk to it, set `moss_found`; return | 2 SPRING WATER; MOSS appears at the cottage afterwards |
| `florists_order` | A SUNNY ORDER | `marigold` @ bramblegate (market street) | Show any sunflower-line Quickened (`ifPartyHas [sunflower_seedling, sunflower_bud, sunflower]`) | RAIN JAR + $1000 |
| `moonwatch` | MOONWATCH | `stargazer` @ route_3 (in the night meadow; by day says "come back after dark", via `ifTime`) | Catch a moonflower-line Quickened (`ifCaught`) | 2 GLASS PODs + lore about the last bloom |
| `sap_run` | THE SAP RUN | `syrupmaker` @ sugarbush (existing NPC) | Gives a SYRUP JAR; deliver it to `baker` @ hedgerow | $1500 + 5 WILD BERRY |
| `herbarium_survey` | THE SURVEY | `archivist` @ herbarium (existing NPC) | `ifCaughtCount 15` | Gift: SNAPDRAGON SPROUT, level 10 |

Map agents use these script ids on the givers: `q_<questId>` (e.g.
`q_lost_cat`), `q_lost_cat_moss` for the cat and `q_sap_run_baker` for the
baker. Narrative defines them all.

## 5. Owners (this round)

| # | Agent | Owns | Port |
|---|---|---|---|
| 1 | **Creature Director + starters** | `docs/CREATURES.md`; species art for the oak, chili and lily lines (9 ids); `tools/art/species_a/` for those lines; final cross-roster consistency review | 5201 |
| 2 | **Creature art: field lines** | the dandelion, bramble, sunflower and pumpkin lines (12 ids); `tools/art/species_a/` (non-starter files) and the pumpkin line in `species_b/` | 5202 |
| 3 | **Creature art: wild lines** | the fern, flytrap, sundew, maple, nettle and moonflower lines (16 ids); `tools/art/species_b/` (except pumpkin) | 5203 |
| 4 | **Creature art: new lines I** | the clover, cattail, foxglove and holly lines (8 ids); `tools/art/species_c/` (new) | 5204 |
| 5 | **Creature art: new lines II** | the mint, wild rose, pitcher plant and snapdragon lines (8 ids); `tools/art/species_d/` (new) | 5205 |
| 6 | **Creature data** | `src/data/` (species, moves, items, herbarium facts for the 16 new species, fact-checked with sources); the balance test | 5206 |
| 7 | **Systems: engine, battle, screens** | `src/engine/`, `src/overworld/`, `src/ui/`, `src/save/`, `src/battle/`, `src/screens/`. Builds every system in §3 and the Herbarium "FOUND IN" habitat info (from WORLD encounter tables) | 5207 |
| 8 | **World** | `src/world/maps/` (all), `build.ts`, `validate.ts` and tests: new-species encounters, hidden items (6–10 across the slice), harvest bushes, quest givers, more environmental detail | 5208 |
| 9 | **Narrative** | `src/world/scripts/` (story and the new `quests.ts`), trainer text; stills wired into the story; editorial pass on the story and quest text | 5209 |
| 10 | **Visual art: stills + environment + icons** | `public/assets/stills/` (new), `public/assets/tiles/`, `structures/`, `characters/` (harvest_bush plus fixes), `items/`, `ui/`; `tools/art/` generators for those | 5210 |

Shared rules:
- `tools/art/build_all.py` must keep regenerating everything byte-identically.
  Artists 4 and 5 (and agent 10 for stills) add their builders to it,
  surgically, re-reading before editing.
- Run `tools/art/build_manifest.py` after adding files.
- No commits. Contracts are frozen; ask main.
- Use your own port and tab.
