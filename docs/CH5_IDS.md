# Chapter 5: the binding spec (ids, flags, numbers, decisions)

Approved plan: [CH5_PLAN.md](CH5_PLAN.md), with all §7 defaults accepted. **This
file is the lead's decisions.** Implementers (Codex) build exactly this.
Anything not decided here is an implementer's *implementation* choice (code
structure, exact tile placement within the stated layout), never a design
choice. If something here is impossible or contradictory, stop and say so in
your summary; don't invent around it.

All work happens on branch **`ch5`**. **No art is drawn in this phase.**
- New species use the grey placeholder from `tools/art/placeholder.py`.
- Maps use **existing** tiles, structures, characters, portraits and music
  only.
- New tile, structure, sprite and music ids are added later, by the lead,
  with the real art.

## A. Species (13)

| id | Display name (≤12) | Line, stage | Types | Base-stat total (target) | Growth → | Activity | Pollination |
|---|---|---|---|---|---|---|---|
| `ghostpipe_stalk` | Ghost Stalk | ghostpipe 1 | ghost | 285 | vigor 22 → ghostpipe_nodding | night | woodland |
| `ghostpipe_nodding` | Nodding Pipe | ghostpipe 2 | ghost | 405 | vigor 30 → ghost_pipe | night | woodland |
| `ghost_pipe` | Ghost Pipe | ghostpipe 3 | ghost | 490 | — | night | woodland |
| `fireweed_fluff` | Fire Fluff | fireweed 1 | fire / bloom | 280 | vigor 20 → fireweed_shoot | day | meadow |
| `fireweed_shoot` | Fire Shoot | fireweed 2 | fire / bloom | 400 | vigor 30 → fireweed | day | meadow |
| `fireweed` | Fireweed | fireweed 3 | fire / bloom | 485 | — | day | meadow |
| `lodgepole_cone` | Sealed Cone | lodgepole 1 | wood | 300 (bulky: high def, low speed) | **item `ember_ash`** → lodgepole_seedling | any | woodland |
| `lodgepole_seedling` | Pine Sprout | lodgepole 2 | wood / fire | 405 | vigor 32 → lodgepole_pine | any | woodland |
| `lodgepole_pine` | Lodgepole | lodgepole 3 | wood / fire | 495 | — | any | woodland |
| `skunk_cabbage_shoot` | Skunk Shoot | skunk 1 | fire / wood | 290 | vigor 26 → skunk_cabbage | any | wetland |
| `skunk_cabbage` | Skunkcabbage | skunk 2 | fire / wood | 445 | — | any | wetland |
| `cedar_seedling` | Cedar Sprout | cedar 1 | wood / ghost | 310 | vigor 34 → red_cedar | any | woodland |
| `red_cedar` | Red Cedar | cedar 2 | wood / ghost | 500 (rare; catch rate 45 or lower) | — | any | woodland |

Totals may vary ±15 to pass the existing data tests and the balance test.
Stat *shapes*:
- ghostpipe: speed and special;
- fireweed: special attack and speed;
- lodgepole: defence, then attack;
- skunk cabbage: HP and special defence;
- cedar: HP, defence and special defence.

**Signature moves** (each is learned in its line's learnset; names ≤12,
descriptions ≤36 and 2 lines at 18 columns; use existing `MoveEffect` kinds
only):

| Move id | Name | Type | Category | Power / Acc / PP | Effects | Learned by |
|---|---|---|---|---|---|---|
| `root_siphon` | Root Siphon | ghost | special | 60 / 100 / 15 | drain 0.5 | ghostpipe (stage 2 at 24) |
| `seed_drift` | Seed Drift | bloom | status | 0 / 100 / 20 | foe accuracy −1 | fireweed (stage 1 at 12) |
| `serotiny` | Serotiny | fire | status | 0 / — / 15 | self attack +1 and special attack +1 | lodgepole (stage 2 at 26) |
| `snowmelt` | Snowmelt | fire | special | 65 / 100 / 15 | scorch 10% | skunk cabbage (stage 1 at 18) |
| `heartwood` | Heartwood | wood | status | 0 / — / 10 | self defence +2 | cedar (stage 1 at 20) |

Each new move needs a battle-animation family (`src/battle/anims.ts`, which the
hints test checks).

**Herbarium:** every one of the 13 gets an entry with this **one fact**
(sourced in a code comment, as the existing entries are). Write 2–4 short
sentences around the fact, in the existing voice. Keep the scientific names.

| id(s) | Scientific name | Fact (must appear, true) | Source to cite |
|---|---|---|---|
| ghostpipe_* | Monotropa uniflora | It has no chlorophyll. It gets its food from fungi that are linked to the roots of nearby trees. | https://www.fs.usda.gov/wildflowers/plant-of-the-week/monotropa_uniflora.shtml |
| fireweed_* | Chamaenerion angustifolium | It is one of the first plants to grow back after a forest fire. | https://www.fs.usda.gov/wildflowers/plant-of-the-week/chamerion_angustifolium.shtml |
| lodgepole_* | Pinus contorta | Many of its cones are sealed shut with resin and only open in the heat of a fire (serotiny). | https://www.fs.usda.gov/database/feis/plants/tree/pinconl/all.html |
| skunk_cabbage_* | Symplocarpus foetidus | It can heat its own flowers well above the air temperature, melting snow around it. | https://en.wikipedia.org/wiki/Symplocarpus_foetidus |
| cedar_*, red_cedar | Thuja plicata | It can live for over a thousand years. | https://www.fs.usda.gov/database/feis/plants/tree/thupli/all.html |

Use a different, equally true angle per stage only if you are certain of it;
otherwise repeat the line's fact in fresh words. **Make no cultural or
medicinal claims.**

**Growth item:** set `lodgepole_cone.growsInto.trigger = { kind: "item", item: "ember_ash" }`.
This makes Ember Ash and the ABLE/NOT ABLE picker live. Update the data test
that asserts "no species uses ember_ash" (it was written to fail at exactly
this point).

**Placeholder art:** run
`python tools/art/placeholder.py species <the 13 ids>`, then
`npm run art:index`.

## B. Maps (8 new; MAP_IDS append in this order)

Draft them with **existing tiles only**. The lead redoes the visuals later
with new tilesets, so keep the legend characters meaningful and the layouts
honest.

| id | Name | Size (≈) | Outdoor | Music (existing) | Ambient | Layout decisions |
|---|---|---|---|---|---|---|
| `route_6` | ROUTE 6 | 30×60 | yes | `route` / night `route_night` | `mist` | South end at Sugarbush Grove's new north exit; north end into Cedarhallow. Old-growth: dense `tree` mass with ≥2 big clearings. A **canopy walkway** section uses `boardwalk` over `water` or `bog`, at least 15 tiles long, as the route's spine. Undergrowth encounters are `tall_grass`, plus 1 bog pocket (`bog` encounters). 4 trainers, 2 hidden items, 1 harvest bush (`wild_berry`). |
| `cedarhallow` | CEDARHALLOW | 36×30 | yes | `small_town` | `leaves` | Exits: south to route_6, east to burnt_stand. Structures: `greenhouse` (heal), `market`, `house_small` (ranger's house), `conservatory` (Morrow), `house_large` (stand-in for the Hollow's shrine trunk), plus 2 decorative `big_oak` (stand-ins for giant cedars). A glide landing outside the greenhouse door. 6–8 NPCs, one of them PIP. |
| `cedarhallow_greenhouse` | GREENHOUSE | (helper) | no | `greenhouse` | — | Use `greenhouseMap()` like the others; `healPoint` set. |
| `cedarhallow_market` | MARKET | like bramblegate_market | no | `market` | — | Stock: terrarium_pod, glass_pod, water_flask, spring_water, compost, neem_spray, aloe_gel, cloche. |
| `cedarhallow_house` | RANGER'S HOUSE | small interior | no | `herbarium` | — | The ranger (FIRE FOLLOWERS quest giver), plus 1 flavour NPC. |
| `cedar_hollow` | THE HOLLOW | 20×24 interior | no | `sugarbush_grove` | `spores` | **Entrance hall** (lit) with the shrine keeper. Beyond it, **dark rooms** (see GLOW, §D) with 3 side-shrines (solid interactable tiles, `sensor_post` as a stand-in, for SHRINE OFFERINGS), 2 hidden items, and an encounter area (`tall_grass` as a stand-in). The dark part is a separate map? **No: one map**, and the whole map is `dark: true`; the entrance hall is lit by 2 `lamp_post`. Rare red cedar here. |
| `burnt_stand` | BURNT STAND | 40×30 | yes | `sugarbush_grove` | `spores` | West exit back to Cedarhallow. Ash ground (`dirt`/`path`), dead trunks (`tree`, `stump`, `log`), fresh-shoot encounters (`tall_grass`). Grunt camp with `crate`/`barrel` (the cone sacks). The **burnt heart**: a clearing at the far east with the vision trigger. Two `item_pickup`s with `ember_ash`. |
| `cedarhallow_conservatory` | CONSERVATORY | 16×18 interior | no | `conservatory` | — | `dark: true`. The puzzle in §E. 2 juniors, then MORROW at the north end. |

**Glide:** add a Cedarhallow landing to `WorldData.glide` (the walkable tile
outside the greenhouse door, facing down), and include `cedarhallow` in the
visited-town logic.

**Sugarbush Grove:** open a 1–2 tile exit in the top border near SHEARS's
clearing, warping to route_6's south end. The NPC `grove_ranger` (sprite
`hiker`, script `ch5_grove_ranger`) stands in the gap with
`visibleWhen: [{ flag: "ch4_done", is: false }]`: present until Chapter 4 is
done. Keep every existing Grove test and puzzle green.

**Wild encounters** (stage-1 levels stay below their growth level):

| Map | Slots (day / night) | Levels |
|---|---|---|
| route_6 grass | day: fireweed_fluff 25%, skunk_cabbage_shoot 20%, fern_fiddlehead 20%, holly_seedling 15%, maple_sapling 15%, cedar_seedling 5%. night: ghostpipe_stalk 35%, moonflower_seed 20%, fern_fiddlehead 20%, skunk_cabbage_shoot 20%, cedar_seedling 5% | 18–22 (stage-1 forms capped below growth) |
| route_6 bog | skunk_cabbage_shoot 50%, cattail_shoot 30%, sundew_rosette 20% | 18–21 |
| burnt_stand grass | fireweed_fluff 40%, lodgepole_cone 35%, fireweed_shoot 15% (20+), nettle_sprout 10% | 20–24 |
| cedar_hollow grass | ghostpipe_stalk 45%, ghostpipe_nodding 20% (22+), moonflower_vine 20%, cedar_seedling 15% | 22–25 |

## C. Trainers (`src/world/trainers.ts`; text fields are `TODO(text)` placeholders that the lead writes)

| id | Class / portrait (existing) | Where | Team |
|---|---|---|---|
| `lumberjack_hale` | HIKER / `hiker` | route_6 | maple_sapling 21, holly 22 |
| `lumberjack_birch` | HIKER / `hiker` | route_6 | pumpkin 22 |
| `forager_sage` | GARDENER / `gardener` | route_6 | moonflower_vine 20, skunk_cabbage_shoot 21 |
| `forager_ash` | BIRDWATCHER / `birdwatcher` | route_6 | fireweed_fluff 21, sundew 22 |
| `grunt_bs_1`, `grunt_bs_2`, `grunt_bs_3` | GRUNT / `grunt`, music `battle_rootstock` | burnt_stand | 1: stinging_nettle 23, fireweed_shoot 23 · 2: bramble_berry 23, lodgepole_cone 24 · 3: venus_flytrap 24, foxglove 24 |
| `rival_4_oak`, `rival_4_chili`, `rival_4_lily` | RIVAL / `bram` | burnt_stand (script battle, `canLose: true`) | blackberry 25, dandelion 25, sugar_maple 26, + the countering starter's **stage 3 at 27, `grafted: true`** (§D). Same counter pattern as rival_2/3. |
| `jr_nightshade`, `jr_lantern` | JR.GARDENER / `gardener` | conservatory | 1: moonflower_vine 23, ghostpipe_stalk 23 · 2: foxglove 24, ghostpipe_nodding 24 |
| `morrow` | WARDEN / `hollis` (portrait stand-in) | conservatory | ghostpipe_nodding 24, moonflower 26, **ghost_pipe 28 (ace)**. Smart AI, 1 spring_water, `battle_leader`, mark `pipe_mark`. |

**Balance:** extend `balance.test.ts`.
- Morrow must be beatable with every starter, and **easier than Flora**: a
  higher mean win rate than Flora's.
- Rival 4 must be beatable with every starter at the expected level (about
  25–27). Rival 4 is the graft collar's showcase.
- If the numbers fail, adjust **levels and moves only** (not species), and
  report what you changed.

## D. Systems

**GLOW** (contracts: `MapDef.dark?: boolean`; item `foxfire_lantern`).
- Item: key pocket, name "Lantern" or "Foxfire Jar" (≤13), description: a jar
  of glowing fungus (≤36). Add it to `REQUIRED_ITEMS`, and run
  `python tools/art/placeholder.py items foxfire_lantern`.
- On a `dark` map, the screen is black except for light sources:
  - **With the lantern in the bag:** a light of **3 tiles' radius** around the
    player. The core is fully visible, with 2 dithered falloff bands (GBC
    style, not a smooth alpha gradient).
  - **Without it:** 1 tile's radius.
  - `lamp_post` tiles: a 2-tile radius each.
  - It's automatic. No menu use, no move slot (the "no HM" rule).
- The darkness draws under the text box and menus and over the map and NPCs.
  It composes with the night tint (don't double-darken).
- **Validator:** on a `dark` map, every story-required NPC, trigger and warp
  that the player must reach **before** `got_lantern` must lie within a
  `lamp_post`'s 2-tile light, reachable through lit tiles only. The Hollow's
  lit entrance hall, where the lantern is given, is the case this allows.
  Everything else on dark maps counts as reachable only once `got_lantern`
  is obtainable. This is the same spirit as the PRUNE-aware check. Add tests
  for both sides.
- The Conservatory door script refuses entry without the lantern (§F).

**The graft collar** (contracts: an optional team-member field
`grafted?: boolean` on `TrainerDef.team` entries).
- A grafted Quickened's stats are computed **as if its level were 5 lower**
  (minimum 1). It shows its real level. This is "forced growth that caps
  stats".
- On send-out, the battle text says: `<NAME> strains at its GRAFT COLLAR!`
  (fits 18×2).
- **Placeholder visual:** draw a 2px band in `#a07840` with a `#181818`
  outline across the lower third of the front sprite (procedural). The lead
  replaces it with real art later; keep the drawing in one function.
- Only trainer teams use it, and it doesn't persist on caught or player
  Quickened.

**Ember Ash:** two `item_pickup` NPCs in burnt_stand (`ember_ash` ×1 each), and
not sold.

**Glider Seed:** given by `ch5_end` (§F).

## E. Conservatory 4 puzzle (cedarhallow_conservatory)

- **Layout:** the floor is `floor_greenhouse`, with "pits" (`void`) between
  the safe tiles. Three parallel candidate paths run south to north. Which one
  is walkable depends on which of **2 levers** (NPCs, sprite `lever`) is on.
- **State flags:** `cons4_lever_a`, `cons4_lever_b`. The 4 combinations select
  the floor via `legendWhen`. Exactly **one** combination opens a full path to
  MORROW, and the juniors stand beside it.
- The lantern light reveals only nearby tiles. That's the design: the player
  sees the path as they walk it. Pits are solid walls (no falling), so nothing
  can soft-lock.
- **Test:** extend `puzzles.test.ts`. From the entrance, for every lever
  combination, MORROW is reachable in exactly one, the exit is always
  reachable, and no state soft-locks.

## F. Story flags and script ids

The lead writes all dialogue later. Implement the *logic* with `say("TODO(text): <what this line says>")` placeholders.

| Script / trigger | Where | Logic |
|---|---|---|
| `ch5_grove_ranger` | sugarbush_grove | Before `ch4_done`: "the north path's closed" (a TODO line). |
| `ch5_arrival` | cedarhallow `onEnter` (first time) | Sets `ch5_arrived`. |
| `ch5_conservatory_door` | cedarhallow, the conservatory door trigger | If `!burnt_vision_seen`: Morrow is out (TODO), then `movePlayer` down. Else if `!got_lantern`: "pitch black, you'll want a light" (TODO), then `movePlayer` down. Else: let the player pass (no-op). |
| `ch5_grunts` | burnt_stand trigger at the camp | Sets `ch5_grunts_seen`; camera pan to the cone sacks; TODO lines ("for the doctor"). |
| `rival_4` | burnt_stand trigger before the heart | Battle `rival_4_<line>` (`canLose: true`, the counter pattern as `rival_3`), then sets `rival_4_done`. After either result: TODO lines, and Bram leaves (`moveNpc` and `hideNpc`). |
| `ch5_vision` | burnt_stand trigger at the burnt heart, when `rival_4_done && !burnt_vision_seen` | `shake`, `flash` gold, `sfx pulse`, then a `still` (use `relay_pulse` as a stand-in until `fire_cone_vision` exists), `stillClear`, TODO lines. Sets `burnt_vision_seen`, then `showNpc` `morrow_bs`. |
| `ch5_morrow_burnt` | NPC `morrow_bs` (sprite `elder` stand-in) in burnt_stand | TODO lines ("It isn't dreaming. It's frightened."), sets `morrow_returned`, `hideNpc`. |
| `ch5_shrine_keeper` | NPC `shrine_keeper` (sprite `elder`) in cedar_hollow's lit hall | If `burnt_vision_seen && !got_lantern`: give `foxfire_lantern`, set `got_lantern`. Else: lore TODO lines. |
| `ch5_end` | cedarhallow `onEnter`, when `beat_morrow && !ch5_done` | TODO lines (Vale's call: the Lantern Tree has gone dark; someone asking about the seed at the docks), give `glider_seed`, set `ch5_done`, `slice_done`, then `endSlice`. |

**Quests** (add to `quests.ts` with `QuestDef`s; TODO text is allowed in
`say`, but titles and steps must be final):
- `fire_followers`, "FIRE FOLLOWERS":
  - giver NPC `ranger` (sprite `hiker`) in cedarhallow_house, script
    `q_fire_followers`;
  - step 1: catch any fireweed-line species; step 2: catch any lodgepole-line
    species (`ifCaught`);
  - reward: 3 glass_pod + `ember_ash` ×1.
- `shrine_offerings`, "SHRINE OFFERINGS":
  - giver `shrine_keeper` (after `got_lantern`), script `q_shrine_offerings`;
  - visit the 3 side-shrines (talk triggers on solid tiles, scripts
    `q_shrine_offerings_shrine_1..3`, flags `shrine_<n>_offered`);
  - reward: rain_jar ×2 + $1500.

**Chapter gating:**
- Route 6 opens only after `ch4_done` (the grove ranger).
- `ch4_end` currently calls `endSlice`. Keep that behaviour: the TO BE
  CONTINUED card after Chapter 4 stays. After it, play continues in Chapter 5
  on Continue, exactly as FAN MAIL already relies on.

## G. Verification every task must keep green

`npm run typecheck`, `npm test` and `npm run build`. Tasks that change the world
or scripts also run `npm run e2e` (the existing 46 beats must still pass; the
lead runs it if your sandbox can't). Never weaken an existing test to pass.
