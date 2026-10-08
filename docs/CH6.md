# Chapter 6: Saltmarsh Harbour and Driftseed Isle (plan and binding spec)

**The lead's decisions.** The owner delegated design decisions to the lead;
the open calls are listed in §9 for veto before the art and writing pass.
Implementers (Codex) build exactly this; anything not decided here is an
implementation choice, never a design choice. If something is impossible or
contradictory, stop and say so.

Work happens on branch **`ch6`**, which is built on `ch5` (Chapter 6 continues
from Chapter 5's end).

**No art in this phase:**
- placeholders come from `tools/art/placeholder.py`;
- maps use existing tiles, structures, sprites and music;
- dialogue is `say("TODO(text): …")`.

## 1. Beats

1. **The ford.**
   - After `ch5_done`, Fallowfield's south road reopens (the ford has
     drained).
   - The NPC `ford_keeper` blocks it until then.
   - **Route 7** is a salt-marsh estuary: reeds, tidal channels, boardwalks.
2. **Saltmarsh Harbour.**
   - A port town with a Greenhouse, a market (with the trader) and the docks.
   - The **Lantern Tree** stands on the point at the town's east end. It's an
     old mangrove whose fireflies once lit the harbour, and it is dark and
     sick.
3. **The docks.**
   - **THE DOCTOR**, a woman in a grey coat (Dr. Calloway, unnamed until
     Chapter 7), asks to buy the player's seed.
   - Either answer ends with her leaving on a grey boat ("Not yet, then").
   - Two Rootstock grunts then challenge the player.
   - This is the setup for Chapter 7's Bloom Lake.
4. **Captain Ines Reyes.**
   - She is on the point, tending the tree, and won't battle while it's sick.
   - The cure, she says, is the cactus sap that **Brother Saguaro** keeps on
     **Driftseed Isle**.
   - She gives the **LILY RAFT**, which unlocks **RAFT** (riding a giant lily
     pad on water).
5. **Route 8**, a sea route: open water, seagrass beds and islets with
   trainers.
6. **Driftseed Isle**, a volcanic cactus island.
   - The island elder gives **SAXIFRAGE** ("stone-breaker"), which unlocks
     **UPROOT**: pushing boulders with a Quickened's roots.
   - **Conservatory 6, BROTHER SAGUARO (Thorn).** A boulder puzzle;
     **CACTUS MARK**. After the battle he gives the **CACTUS SAP**.
   - The **Vents**: an optional volcanic cave with an UPROOT puzzle, items and
     rare encounters.
7. **Healing the Lantern Tree.**
   - Back on the point, using the sap: a still in which the fireflies return.
   - This sets `lantern_healed`, and the Conservatory opens.
8. **Conservatory 5, CAPTAIN REYES (Water).**
   - The puzzle is crossing pools by raft, with a lever-operated gate.
   - **MANGROVE MARK.**
9. **Chapter end.**
   - Re-entering the harbour after `beat_reyes` brings Vale's call: Bloom
     Lake at Larchmere has turned **red**, and "a doctor in a grey coat" was
     seen there.
   - Then the TO BE CONTINUED card.

**Side content:**
- **Quest SEAGRASS SURVEY** (Reyes's assistant on Route 8).
- **The HAND POLLINATOR trade** in the market (§5).

## 2. Species (13)

| id | Name (≤12) | Line, stage | Types | Base-stat total | Growth → | Activity | Pollination |
|---|---|---|---|---|---|---|---|
| `mangrove_propagule` | Propagule | mangrove 1 | water | 290 | vigor 24 → mangrove_sapling | any | wetland |
| `mangrove_sapling` | Stilt Sprout | mangrove 2 | water / wood | 410 | vigor 34 → red_mangrove | any | wetland |
| `red_mangrove` | Red Mangrove | mangrove 3 | water / wood | 500 | — | any | wetland |
| `seagrass_shoot` | Seagrass Tip | seagrass 1 | water | 300 | vigor 28 → eelgrass | any | wetland |
| `eelgrass` | Eelgrass | seagrass 2 | water | 450 | — | any | wetland |
| `pear_pad` | Pear Pad | prickly pear 1 | thorn | 290 | vigor 22 → padded_cactus | day | garden |
| `padded_cactus` | Pad Cactus | prickly pear 2 | thorn | 400 | vigor 32 → prickly_pear | day | garden |
| `prickly_pear` | Prickly Pear | prickly pear 3 | thorn / bloom | 490 | — | day | garden |
| `saguaro_pup` | Saguaro Pup | saguaro 1 | thorn | 300 | vigor 30 → saguaro_column | day | meadow |
| `saguaro_column` | Tall Saguaro | saguaro 2 | thorn | 420 | vigor 40 → saguaro | day | meadow |
| `saguaro` | Old Saguaro | saguaro 3 | thorn / water | 520 (slow-growing line; catch rate ≤45 from stage 2) | — | day | meadow |
| `vanilla_vine` | Vanilla Vine | vanilla 1 | bloom | 300 (rare) | **cross_pollination** → vanilla_orchid | any | tropical |
| `vanilla_orchid` | Vanilla | vanilla 2 | bloom / wood | 470 | — | any | tropical |

**Stat shapes:**
- mangrove: defence and special defence;
- seagrass: special attack and speed;
- prickly pear: attack and defence;
- saguaro: HP and defence, with very low speed;
- vanilla: special attack and special defence.

Totals may vary ±15 to pass the tests.

**Signature moves** (existing `MoveEffect` kinds only; names ≤12; descriptions
≤36 and 2 lines):

| id | Name | Type | Category | Power / Acc / PP | Effects | Learned by |
|---|---|---|---|---|---|---|
| `stilt_roots` | Stilt Roots | water | status | 0 / — / 15 | self defence +1 and special defence +1 | mangrove (stage 2 at 26) |
| `tidal_sway` | Tidal Sway | water | special | 70 / 100 / 15 | foe speed −1 at 20% | seagrass (stage 1 at 20) |
| `glochid_spray` | Glochids | thorn | physical | 20 / 100 / 20 | multi_hit 2–5 | prickly pear (stage 1 at 14) |
| `water_store` | Water Store | water | status | 0 / — / 10 | heal 0.5 | saguaro (stage 2 at 32) |
| `hand_pollen` | Hand Pollen | bloom | status | 0 / — / 15 | self special attack +2 | vanilla (stage 1 at 18) |

**Herbarium**, one fact per line; cite these sources in code comments; no
other claims:

| ids | Scientific name | Fact | Source |
|---|---|---|---|
| mangrove_* | Rhizophora mangle | Its seeds sprout while still on the parent tree, then drop as long propagules that can float at sea for months. | https://en.wikipedia.org/wiki/Rhizophora_mangle |
| seagrass_*, eelgrass | Zostera marina | It is a true flowering plant that is pollinated underwater: its pollen drifts through the sea. | https://en.wikipedia.org/wiki/Zostera_marina |
| pear_pad, padded_cactus, prickly_pear | Opuntia | Its pads carry glochids: tiny barbed bristles that detach at a touch. | https://en.wikipedia.org/wiki/Opuntia |
| saguaro_* , saguaro | Carnegiea gigantea | A saguaro may grow for 50 to 70 years before it sprouts its first arm. | https://www.nps.gov/sagu/learn/nature/saguaro-cactus.htm |
| vanilla_* | Vanilla planifolia | Outside Mexico its flowers are pollinated by hand, a method worked out by Edmond Albius on Réunion in 1841. | https://en.wikipedia.org/wiki/Edmond_Albius |

**Placeholder art:** `python tools/art/placeholder.py species <13 ids>`.

## 3. Systems

**Sea crossings:** route-to-route sea warps land on open water, so the player stays on the raft; never on an isolated pier. (The lead's decision after the e2e found the stranding.)

**RAFT** (key item `lily_raft`, "Lily Raft", in `REQUIRED_ITEMS` with a placeholder icon):
- Facing a `water: true` tile from land with the raft in the bag: "Ride the
  LILY RAFT?" On yes, the player steps onto the water in **raft mode**.
- In raft mode the player moves on `water: true` tiles only. Stepping onto any
  walkable land tile dismounts.
- Raft mode persists across save and load: `GameState.rafting?: boolean`.
  A warp keeps raft mode when the player is rafting and the destination tile
  is water. Every other warp, and a whiteout, ends it.
- **Encounters:** maps may define `encounters.water` (`{ rate, slots }`), and
  each raft step rolls it, as Surf does.
- **Visual placeholder:** the player sprite drawn on a procedural green
  lily-pad ellipse, in one function, for the art pass to replace.
- **Validator:** water-only regions count as reachable only once
  `got_raft` is obtainable, with the same shape as the PRUNE and lantern
  rules. Story-required tiles must respect this.

**UPROOT** (key item `saxifrage`, "Saxifrage", in `REQUIRED_ITEMS` with a placeholder icon):
- `NpcDef.pushable?: boolean` marks a boulder (sprite `boulder`, a new
  character id with a placeholder sheet).
- Facing a pushable boulder with the item, pressing A asks "UPROOT it?". On
  yes, the boulder moves 1 tile in the facing direction if that tile is
  walkable, inside the map, and free of NPCs or other boulders. Otherwise it
  says it won't budge.
- **Boulder positions reset when the map is re-entered**, so every puzzle must
  be solvable from its starting layout.
- **Continue in any boulder map places the player at its entrance**, alongside
  the reset stones: use the first warp into the room from the map named by its
  first exit. Normal map entry and Continue elsewhere keep their arrival tiles.
- **Test helper:** a reusable BFS solver over boulder layouts (small boards)
  for puzzle tests.
- **Validator:** required paths through boulder rooms count as reachable only
  after `got_saxifrage`.
- Extend `tools/art/placeholder.py` with `characters <id>` (a 48x64 sheet)
  for the boulder.

**Trades:** use the existing `trade` op (§5). **Seed Glide:** add landings for
`saltmarsh_harbour` and `driftseed_isle` and extend the visited-town logic.
**Marks:** `cactus_mark` and `mangrove_mark` (placeholder UI art).

## 4. Maps (10; MAP_IDS appended in this order)

| id | Name | ≈ size | Outdoor | Music (existing) | Ambient | Layout |
|---|---|---|---|---|---|---|
| `route_7` | ROUTE 7 | 30×50 | yes | `route` | `mist` | Fallowfield's south exit (`ford_keeper` gate) to the harbour. Reeds and tall grass, tidal channels (`water`), boardwalks. 3 trainers, 2 hidden items. |
| `saltmarsh_harbour` | SALTMARSH HARBOUR | 40×30 | yes | `small_town` | `none` | Exits: north to route_7, south to route_8 (water, raft only). Docks (`boardwalk` piers) and **the point** (east), with the Lantern Tree as a `big_oak` stand-in. Greenhouse, market, Conservatory (`conservatory`). Glide landing. |
| `saltmarsh_greenhouse` | GREENHOUSE | helper | no | `greenhouse` | — | `greenhouseMap()` |
| `saltmarsh_market` | MARKET | like bramblegate_market | no | `market` | — | Stock: Glasshouse's list plus `rain_jar`. The NPC `trader` (§5). |
| `saltmarsh_conservatory` | CONSERVATORY | 16×18 | no | `conservatory` | — | Pools crossed by raft between islands; 1 lever (`cons5_gate`) opens a sluice gate via `legendWhen`. 2 juniors, then REYES. |
| `route_8` | ROUTE 8 | 40×40 | yes | `route` | `none` | Open sea (raft) from the harbour south to Driftseed. Seagrass beds are `water` with `encounters.water`. 3 islets, 4 trainers on islets or boardwalks. 2 hidden items on islets. |
| `driftseed_isle` | DRIFTSEED ISLE | 34×30 | yes | `small_town` | `none` | Shore landing (from route_8 by raft), cactus scrub (tall grass), the elder's hut (`house_small`), Greenhouse, the Conservatory, the Vents entrance (`house_large` stand-in). Glide landing. |
| `driftseed_greenhouse` | GREENHOUSE | helper | no | `greenhouse` | — | `greenhouseMap()` |
| `driftseed_conservatory` | CONSERVATORY | 16×18 | no | `conservatory` | — | **UPROOT puzzle**: 3 boulders block the way to SAGUARO; solvable from reset (BFS test). 2 juniors. |
| `driftseed_vents` | THE VENTS | 24×24 | no | `sugarbush_grove` | `spores` | Optional cave: 1 UPROOT puzzle guarding 2 items, plus encounters. |

**Wild encounters.** Every slot stays below its species' growth level (the
validator test from Chapter 5 must cover these maps too).

| Map | Kind | Slots | Levels |
|---|---|---|---|
| route_7 | grass | mangrove_propagule 30%, cattail 20%, sundew 15%, pear_pad 15% (≤21), seagrass_shoot 10%, mint_sprig 10% (cap per growth) | 24–27 |
| route_8 | water | seagrass_shoot 45%, mangrove_propagule 30% (≤23), giant_water_lily 10% (stage 3), eelgrass 15% (28+) | 26–30 |
| driftseed_isle | grass | pear_pad 35% (≤21), padded_cactus 25%, saguaro_pup 20%, fireweed_shoot 10%, vanilla_vine 10% | 26–30 |
| driftseed_vents | grass | padded_cactus 35%, saguaro_pup 30%, fireweed_shoot 20%, vanilla_vine 15% | 28–31 |

Wherever a stated level exceeds a species' growth cap, cap that slot to growth
minus 1; never use a stage above what's listed.

## 5. Trainers and trade

| id | Class / portrait (existing) | Where | Team |
|---|---|---|---|
| `angler_reed`, `angler_moss` | HIKER / `hiker` | route_7 | reed: cattail 25, sundew 26 · moss: pitcher_plant 26 |
| `birder_tern` | BIRDWATCHER / `birdwatcher` | route_7 | mangrove_propagule 24, white_clover 26 |
| `grunt_dock_1`, `grunt_dock_2` | GRUNT / `grunt`, `battle_rootstock` | the harbour docks (after the doctor scene) | 1: stinging_nettle 27, fireweed 27 · 2: venus_flytrap 27, sugar_maple 28 |
| `sailor_kelp`, `sailor_brine`, `diver_coral`, `diver_shoal` | HIKER / `hiker`; GARDENER / `gardener` | route_8 islets | kelp: seagrass_shoot 27, lily_pad 28 · brine: eelgrass 29 · coral: mangrove_sapling 28, cattail 28 · shoal: seagrass_shoot 28, giant_water_lily 29 |
| `jr_spine`, `jr_needle` | JR.GARDENER / `gardener` | driftseed_conservatory | spine: pear_pad 28, padded_cactus 29 · needle: stinging_nettle 29, padded_cactus 29 |
| `saguaro` | WARDEN / `hollis` | driftseed_conservatory | padded_cactus 34, prickly_pear 35, **saguaro_column 37 (ace)**. Smart AI, 1 spring_water, `battle_leader`, mark `cactus_mark`. *Lead's tuning: about 87% mean player win. Thorn is weak to the fire types every party has by now, so he's the gentler Chapter 6 leader, with the band widened to 72–90%; levels below 34 made him a walkover.* |
| `jr_tide`, `jr_current` | JR.GARDENER / `gardener` | saltmarsh_conservatory | tide: seagrass_shoot 30, lily_pad 30 · current: mangrove_sapling 31, eelgrass 31 |
| `reyes` | WARDEN / `nell_pitcher` | saltmarsh_conservatory | eelgrass 32, mangrove_sapling 32, giant_water_lily 33, **red_mangrove 35 (ace)**. *Tuned to about 70%: harder than Saguaro through 4 members and matchups, not levels.* Smart AI, 2 spring_water, `battle_leader`, mark `mangrove_mark`. |

**Balance** (extend `balance.test.ts`, with sim parties that carry Chapter 5
and 6 catches):
- **Saguaro:** about 72–82% mean player win.
- **Reyes:** about 65–75%, harder than Saguaro but easier than Flora's 61%
  spike. That sits at the top of the band.
- Every starter must win more than 25% against both.
- Adjust levels and moves only, and report the changes.

**Trade** (NPC `trader` in saltmarsh_market, script `q_hand_pollinator`):
- `wants: ["vanilla_vine"]`, `gives: { species: "vanilla_vine", level: 30,
  nickname: "POLLY" }`. It arrives and grows into `vanilla_orchid` at once.
- No *seen* gate (the lead dropped it: the engine has no such check, and the trade's party filter already needs a vine). He simply asks for one.
- TODO(text) lines: hand-pollination lore.

## 6. Story flags and script ids (logic only; dialogue is `TODO(text)`)

| Script | Where | Logic |
|---|---|---|
| `ch6_ford_keeper` | fallowfield, NPC `ford_keeper` (sprite `villager_a`) at the south exit, `visibleWhen ch5_done=false` | "the ford's flooded" |
| `ch6_arrival` | saltmarsh_harbour `onEnter` (first time) | sets `ch6_arrived` |
| `ch6_doctor` | the docks trigger at (12,20), width 2, when `ch6_arrived && !ch6_doctor_met`; doctor starts at (12,23) | NPC `doctor` (sprite `researcher`) approaches; `yesno` sell the seed? Either branch has TODO lines and keeps the seed. She walks off the pier (`moveNpc`, `hideNpc`). Sets `ch6_doctor_met`, then shows the 2 dock grunts. |
| `ch6_reyes_point` | NPC `reyes_point` (sprite `nell_pitcher` stand-in) on the point, `visibleWhen lantern_healed=false` | requires `ch6_doctor_met && beat_grunt_dock_1 && beat_grunt_dock_2`; otherwise sends the player to the docks (TODO text). First eligible talk: give `lily_raft`, set `got_raft`; later: a reminder |
| `ch6_lantern_tree` | sign-like talk trigger on the tree | if `got_sap && !lantern_healed`: take `cactus_sap`, `flash` gold, `still` (stand-in `bloom`) → `stillClear`, set `lantern_healed`. Else: lore. |
| `ch6_cons5_door` | saltmarsh_conservatory door trigger | `!lantern_healed` → TODO, then `movePlayer` down |
| `ch6_elder` | NPC `isle_elder` (sprite `elder`) in the elder's hut | first: give `saxifrage`, set `got_saxifrage` |
| `saguaro` (trainer) + `ch6_saguaro_after` | driftseed_conservatory | after the win: give `cactus_sap` (a key item in REQUIRED_ITEMS, placeholder icon), set `got_sap` |
| `ch6_end` | saltmarsh_harbour `onEnter`, when `beat_reyes && !ch6_done` | Vale's call (TODO); sets `ch6_done`, `slice_done`, then `endSlice` |

**Quest `seagrass_survey`, "SEAGRASS SURVEY":**
- giver `survey_assistant` (sprite `researcher`) on route_8's middle islet,
  script `q_seagrass_survey`;
- steps: catch the seagrass line; catch the mangrove line (`ifCaught`);
- reward: 3 glass_pod + rain_jar.

**Quest `hand_pollinator`, "HAND POLLINATOR":** the trade above, with a
`QuestDef` (step: trade a vanilla vine; reward: "a VANILLA").

## 7. Waves (Codex)

| Wave | Task | Depends on |
|---|---|---|
| 1 | **RAFT** system | — |
| 1 | **UPROOT** system (plus the characters option for placeholder.py) | — |
| 1 | **Species** (13), moves, Herbarium, placeholder art | — |
| 2 | **World**: 10 maps, the ford, encounters, trainers and balance, the trade NPC, glide landings, marks, both puzzles with solver tests, stub scripts | wave 1 |
| 3 | **Scripts and quests** logic (§6) | wave 2 |
| 4 | **e2e** through Chapter 6 | wave 3 |
| 5 | **Read-only bug hunt** of `ch6` | wave 4 |

## 8. Claude's later pass

All art, the music (harbour, sea and island themes), all dialogue, and a
visual map pass. The release gate blocks merging until it's done.

## 9. Decisions taken by the lead (veto before the art and writing pass)

1. **Fixed order:** Saguaro, then Reyes, because the sap gates the tree. The
   bible allows either order.
2. **RAFT and UPROOT both arrive in Chapter 6:** the raft from Reyes, the
   saxifrage from the island elder.
3. **Dr. Calloway appears early,** unnamed, as THE DOCTOR at the docks,
   setting up Bloom Lake.
4. **Vanilla is the first cross-pollination line,** via the hand-pollinator
   trade.
5. **No Bram scene in Chapter 6:** he processes off-screen and returns in
   Chapter 7 or 8.
