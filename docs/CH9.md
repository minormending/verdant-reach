# Chapter 9: Thistledown and Sanguine Ridge (plan and binding spec)

**The lead's decisions** (the owner approved Chapters 8 and 9 in advance).
Implementers build exactly this; anything not decided here is an
implementation choice. If something is impossible or contradictory, stop and
say so.

Work happens on branch **`ch9`**, built on `ch8`.

**No art in this phase:**
- placeholders come from `tools/art/placeholder.py` (species, items, ui and
  tiles);
- maps use existing tiles, structures, sprites and music, plus placeholder
  tiles;
- dialogue is `say("TODO(text): …")`.

## 1. Beats

1. **East from the city.**
   - After `ch8_done`, the east gate of Glasshouse City opens (NPC
     `east_gate_guard`, `visibleWhen ch8_done=false`).
   - **Route 10** runs east through scrub to **Thistledown**.
2. **Thistledown,** a desert-edge town in tumbleweed country.
   - It has a Greenhouse and a market.
   - A dry wind blows (ambient `leaves` stand-in). A tumbleweed (NPC
     `tumbleweed_sighting`, sprite `item_pickup` stand-in) rolls across the
     square once and is gone: the first sighting of a Wanderer (foreshadowing
     only, with no battle).
   - Flags `ch9_arrived` and `tumbleweed_seen`.
3. **Route 11**, a red canyon climbing north to Sanguine Ridge.
   - **BRAM** waits at the canyon's switchback (`rival_5`, a **friendly**
     battle, `canLose: true`).
   - His partner wears **no collar** and has regrown (it's ungrafted).
   - Win or lose, he says he's going after his father, and he'll find the
     player when it's time.
   - Set `rival_5_done`.
4. **Sanguine Ridge,** dry cliffs with ancient dragon's blood trees.
   - **Conservatory 8: VALERIAN ROOK (Dragon),** the final test.
   - The puzzle is Crystal's Blackthorn gym: **UPROOT boulders into pits**
     to make a path (§3).
   - **RESIN MARK** (`resin_mark`).
   - After the battle, ROOK tells the player:
     - the Centuryheart is dying, as it must;
     - its seed is the only "voice" that can calm the Elder;
     - Mercer knows it too.
   - He gives the **FIG ROOT** (`fig_root`), which unlocks ROOT BRIDGE (§3).
5. **Chapter end.**
   - Leaving the Conservatory with the mark brings **Vale's call**:
     - Rootstock has been seen at the **Council Arboretum**, the gates of the
       sealed Elder Grove;
     - ROWAN (the Keeper) has gone silent;
     - "Bring the seed."
   - Set `ch9_done` and `slice_done`, then `endSlice`.

**Side quest:** WINDOW PANES. A Thistledown botanist wants three living
stones recorded: catch any lithops-line species, and show a
`lithops_bloom`. Use `ifCaught` per step. The reward is 2 rain_jar + 1
`glass_pod` ×5.

## 2. Species (8)

| id | Name (≤12) | Line, stage | Types | Base-stat total | Growth → | Activity | Pollination |
|---|---|---|---|---|---|---|---|
| `dragon_seedling` | Dragon Seed | dragontree 1 | dragon / wood | 300 | vigor 30 → dragon_sapling | any | woodland |
| `dragon_sapling` | Umbrella Pup | dragontree 2 | dragon / wood | 420 | vigor 45 → dragon_tree | any | woodland |
| `dragon_tree` | Dragon Tree | dragontree 3 | dragon / wood | 530 | — | any | woodland |
| `pitaya_cutting` | Pitaya Pad | pitaya 1 | dragon / thorn | 320 | vigor 38 → dragon_fruit | night | moth |
| `dragon_fruit` | Dragon Fruit | pitaya 2 | dragon / thorn | 495 | — | night | moth |
| `lithops_pebble` | Pebble Leaf | lithops 1 | thorn | 290 | vigor 28 → lithops_pair | day | meadow |
| `lithops_pair` | Split Stone | lithops 2 | thorn | 400 | vigor 40 → lithops_bloom | day | meadow |
| `lithops_bloom` | Living Stone | lithops 3 | thorn / bloom | 490 | — | day | meadow |

- **Pollination:** if `moth` isn't an existing pollination group, use the
  closest existing one (the night-flower group, e.g. moonflower's) and say
  which.
- **Stat shapes:**
  - dragon tree: HP, defence and special defence (slow and bulky);
  - pitaya: special attack and speed;
  - lithops: defence and special defence, with very low speed.
- Totals may vary by ±15 to pass the tests.

**Signature moves** (existing `MoveEffect` kinds only; names ≤12,
descriptions ≤36):

| Move id | Name | Type | Category | Power / Acc / PP | Effects | Learned by |
|---|---|---|---|---|---|---|
| `dragon_resin` | Dragon Resin | dragon | special | 80 / 100 / 10 | drain 0.25 | dragontree (stage 2 at 45) |
| `night_bloom` | Night Bloom | dragon | special | 70 / 100 / 15 | self speed +1 | pitaya (stage 1 at 30) |
| `stone_window` | Stone Window | thorn | status | 0 / — / 15 | self defence +1 and special defence +1 | lithops (stage 1 at 24) |

Each new move needs a battle-animation family (`src/battle/anims.ts`).

**Herbarium:** one fact per line, cited in code comments. No other claims.

| ids | Scientific name | Fact | Source |
|---|---|---|---|
| dragon_* | Dracaena cinnabari | Its red resin is called dragon's blood, and it grows an umbrella-shaped crown. | https://en.wikipedia.org/wiki/Dracaena_cinnabari |
| pitaya_cutting, dragon_fruit | Selenicereus undatus | Its huge flowers open at night and last only one night. | https://en.wikipedia.org/wiki/Selenicereus_undatus |
| lithops_* | Lithops | It grows almost buried, letting light in through translucent "windows" on its leaf tips. | https://en.wikipedia.org/wiki/Lithops |

**Placeholder art:** `python tools/art/placeholder.py species <8 ids>`.

## 3. Systems

**ROOT BRIDGE** (the bible's Whirlpool/Waterfall field move):
- A new `FieldMove` `rootbridge`, unlocked by the key item `fig_root`, in
  the same framework as PRUNE (`src/overworld/fieldmove.ts`).
- A new tile `root_gap` (`walk: false`, `fieldMove: "rootbridge"`): a narrow
  gorge or stream.
- Facing it with the item prompts, PRUNE-style. Confirming sets the flag
  `bridged_<map>_<x>_<y>`. The tile then draws as a new tile `root_bridge`
  (walkable) and stays bridged.
- The validator is ROOT BRIDGE-aware, as it is for PRUNE: tiles behind a
  `root_gap` are reachable only once `fig_root` is obtainable.
- Item `fig_root`:
  - key pocket, name "Fig Root";
  - description "Living roots that grow into bridges." (≤36);
  - add it to REQUIRED_ITEMS, with a placeholder icon.
- **Placeholder tiles:** `root_gap` and `root_bridge`.
- **Use in this chapter:** one `root_gap` on Route 11 guards a side ledge
  with a hidden item. It teaches the move after the player has the root.
  Chapter 10 needs it.

**BOULDER PITS** (extends UPROOT):
- A new tile `pit` (`walk: false`). Pushing a boulder into a `pit` **fills**
  it: the boulder disappears and the tile becomes walkable (draw it as a new
  tile `filled_pit`).
- Filled pits persist via a flag `filled_<map>_<x>_<y>`, unlike boulder
  positions, which reset on map entry.
- Boulders that weren't used still reset on re-entry. A filled pit stays
  filled.
- The BFS solver and the validator understand this. A puzzle test proves
  that the conservatory is solvable from a fresh entry, and that every
  partially solved state (any subset of pits filled, boulders reset) is
  still solvable or already solved. That's the soft-lock check.
- **Placeholder tiles:** `pit` and `filled_pit`.

**Marks:** `resin_mark` (placeholder UI art `mark_resin`).

**Seed Glide:** add landings for `thistledown` and `sanguine_ridge`, and
extend the visited-town logic.

## 4. Maps (8; MAP_IDS appended in this order)

| id | Name | ≈ size | Outdoor | Music (existing) | Ambient | Layout |
|---|---|---|---|---|---|---|
| `route_10` | ROUTE 10 | 50×20 | yes | `route` | `leaves` | From Glasshouse City's east exit (gate NPC `east_gate_guard`) to Thistledown. Dry scrub: `sand`, `dirt`, `rock` and `tall_grass`. 4 trainers, 2 hidden items. |
| `thistledown` | THISTLEDOWN | 30×26 | yes | `small_town` | `leaves` | Exits: west to route_10, north to route_11. Greenhouse, market, a house (the botanist for WINDOW PANES). The tumbleweed sighting trigger. Glide landing. |
| `thistledown_greenhouse` | GREENHOUSE | helper | no | `greenhouse` | — | `greenhouseMap()` |
| `thistledown_market` | MARKET | like the others | no | `market` | — | Same stock as Larchmere's, plus `ember_ash` ×1 price 3000 (the first time it's sold) |
| `thistledown_house` | HOUSE | small | no | `herbarium` | — | The WINDOW PANES botanist |
| `route_11` | ROUTE 11 | 28×56 | yes | `route` | `none` | A canyon climbing north: `cliff`, ledges and `sand`. BRAM's switchback trigger. One `root_gap` side ledge with a hidden `rain_jar`. 4 trainers. |
| `sanguine_ridge` | SANGUINE RIDGE | 32×28 | yes | `small_town` | `none` | Exits: south to route_11. Greenhouse (reuse `greenhouseMap()` as `sanguine_greenhouse`, added after `route_11` as a 9th id if needed), the Conservatory, decorative `big_oak` stand-ins for dragon trees. Glide landing. |
| `sanguine_conservatory` | CONSERVATORY | 18×20 | no | `conservatory` | — | The BOULDER PITS puzzle (§3): 3 pits in a line across the hall, 4 boulders (one spare), solvable from the entrance. 2 juniors. ROOK at the north end. |

### 4.1 Wild encounters

Every slot stays below its species' growth level.

| Map | Kind | Slots | Levels |
|---|---|---|---|
| route_10 | grass | lithops_pebble 25% (≤27), prickly_pear 20%, pear_pad 15%, saguaro_column 15%, dandelion 15%, pitaya_cutting 10% (night only) | 40–44 |
| route_11 | grass | lithops_pair 25% (≤39), dragon_seedling 25% (≤29), pitaya_cutting 20%, snapdragon_sprout 15%, saguaro_column 15% | 42–46 |

The dragon_seedling slot (≤29) and the lithops_pebble slot (≤27) are low,
catchable starts.

## 5. Trainers

| id | Class / portrait (existing) | Where | Team |
|---|---|---|---|
| `drifter_dune`, `drifter_mesa` | HIKER / `hiker` | route_10 | dune: prickly_pear 43, lithops_pair 42 · mesa: saguaro 44 |
| `botanist_sage2`, `botanist_rue` | GARDENER / `gardener` | route_10 | sage2: pitaya_cutting 43, foxglove 43 · rue: lithops_pair 43, dandelion_clock 43 |
| `climber_red`, `climber_ochre` | HIKER / `hiker` | route_11 | red: snapdragon_sprout 44, larch 45 · ochre: dragon_sapling 45 |
| `ranger_flint`, `ranger_shale` | BIRDWATCHER / `birdwatcher` | route_11 | flint: dragon_fruit 45, saguaro 45 · shale: lithops_bloom 46 |
| `rival_5_oak`, `rival_5_chili`, `rival_5_lily` | RIVAL / `bram` | route_11 (script battle, `canLose: true`) | blackberry 46, dandelion_clock 46, sugar_maple 47, red_cedar 47, + the countering starter's stage 3 at **49, not grafted** |
| `jr_ember`, `jr_scale` | JR.GARDENER / `gardener` | the conservatory | ember: snapdragon_sprout 47, dragon_sapling 47 · scale: pitaya_cutting 47, lithops_pair 48 |
| `rook` | WARDEN / `hollis` (portrait stand-in) | the conservatory | snapdragon 49, dragon_fruit 50, lithops_bloom 50, **dragon_tree 53 (ace)**. Smart AI, 2 spring_water, `battle_leader`, mark `resin_mark`. |

**Balance** (extend `balance.test.ts`, with sim parties of Chapter 5–9
catches at about level 49):
- **Rook:** about 58–70% mean player win, the hardest leader (the final
  test). Every starter must win more than 25%.
- **Rival 5:** about 70–85%.
- Adjust levels and moves only, **within ±2 levels**. Report every change.
  If a band is unreachable, stop and report.

## 6. Story flags and script ids (logic only; dialogue is `TODO(text)`)

| Script | Where | Logic |
|---|---|---|
| `ch9_east_gate` | glasshouse_city NPC `east_gate_guard` | "the east road's closed" (TODO) |
| `ch9_arrival` | thistledown `onEnter` (first time) | sets `ch9_arrived`; the tumbleweed rolls across (`moveNpc` off the map edge, `hideNpc`), sets `tumbleweed_seen` |
| `rival_5` | route_11 trigger | `rival_5_<line>` (`canLose: true`, the counter pattern), then TODO lines; Bram leaves north (`moveNpc` and `hideNpc`); sets `rival_5_done` |
| `ch9_cons8_door` | sanguine_ridge, the conservatory door trigger | `!rival_5_done` → TODO ("ROOK only sees challengers who've come the hard way"), then `movePlayer` down |
| `rook` (trainer) + `ch9_rook_after` | the conservatory | after the win: TODO lines (the Centuryheart, the seed's voice, Mercer), give `fig_root`, set `got_fig_root` |
| `ch9_end` | sanguine_ridge `onEnter`, when `beat_rook && got_fig_root && !ch9_done` | Vale's call (TODO), sets `ch9_done` and `slice_done`, then `endSlice` |

**Quest `window_panes`, "WINDOW PANES":**
- giver NPC `stone_botanist` (sprite `researcher`) in thistledown_house,
  script `q_window_panes`;
- step 1: catch any lithops-line species;
- step 2: catch `lithops_bloom`;
- the reward is 2 rain_jar + 5 glass_pod.

## 7. Waves (Codex)

| Wave | Task | Depends on |
|---|---|---|
| 1 | **ROOT BRIDGE** plus the placeholder tiles and the `fig_root` item | — |
| 1 | **BOULDER PITS** (UPROOT extension) with the solver and soft-lock test | — |
| 1 | **Species** (8), moves, Herbarium, placeholder art | — |
| 2 | **World**: 8 maps, the gate, encounters, trainers and balance, glide, the mark, the pit puzzle, stub scripts | wave 1 |
| 3 | **Scripts and quest** logic (§6) | wave 2 |
| 4 | **e2e** through Chapter 9 | wave 3 |
| 5 | **Read-only bug hunt**, then fixes | wave 4 |

## 8. Claude's later pass

Art (8 species; desert, canyon and ridge tiles; root gap and bridge; pits;
the Conservatory; ROOK and others; the resin mark and fig root icons; a
still of the dragon trees), music (the desert town, the canyon, the ridge),
and all dialogue.

## 9. Decisions taken by the lead (approved by the owner in advance)

1. **Route:** Glasshouse City → Route 10 → Thistledown → Route 11 →
   Sanguine Ridge, matching the world map's east side.
2. **New lines:** dragon's blood tree, dragon fruit and living stones
   (Lithops, Thorn for the deferred Rock type). Snapdragon joins Rook's team
   unchanged.
3. **ROOT BRIDGE arrives here** (from ROOK) and is needed in Chapter 10.
4. **The gym is a boulder-into-pit puzzle** (Blackthorn), built on UPROOT.
5. **Bram's fifth battle is friendly.** His partner is ungrafted and
   regrown: the bible's collar arc pays off.
6. **The first Wanderer sighting** is the tumbleweed in Thistledown, as
   flavour only (the bible puts it there).
