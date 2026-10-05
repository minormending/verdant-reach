# Chapter 4 ids (world → narrative contract)

Owner: agent 9 (world). Narrative (agent 10) writes every script marked
**N** below; world writes the ones marked **W** (incidental lines, doors).
Flags marked "N sets" must be set by the narrative script named. If you need
an id changed, SendMessage main; I'll update this file and the maps.

Coordinates are final (maps landed); see "Positions" at the end.

## Flags

| Flag | Set by | Read by |
|---|---|---|
| `ch4_started` | N: `vale_call` (rewritten ending) | Sugarbush cart blocker (`sap_cart` NPC visibleWhen false; cart tiles swap to road via legendWhen) |
| `gc_arrival_seen` | N: `ch4_city_arrival` | `gc_enter` (W) calls `ch4_city_arrival` while false |
| `relay_listened` | N: `ch4_relay_listen` | Relay trigger (off once true), Flora at the Relay (hidden once true), Rose Conservatory closed trigger (off once true), Nursery Bram |
| `ch4_grunt_seen` | N: `ch4_grunt_watch` | `gc_enter` calls `ch4_grunt_watch` when `relay_listened` && !`ch4_grunt_seen`; `watcher` NPC visibleWhen |
| `rival_3_done` | N: `rival_3` | Nursery `bram` NPC visibleWhen; keepers' hedge tramples (legendWhen) |
| `got_shears` | N: `rival_3` (with giveItem `pruning_shears`) | incidental lines (W) |
| `beat_flora` | engine (battle win vs trainer `flora`) | `gc_enter` chapter end; incidental lines |
| `ch4_done` | N: `ch4_end` (set before `endSlice`) | `gc_enter` stops calling `ch4_end` |
| `sensor_1_read` / `sensor_2_read` / `sensor_3_read` | N: `q_relay_sensors_post_<n>` | quest steps |
| `rgc_lever_1` / `rgc_lever_2` / `rgc_lever_3` | W: Conservatory 3 levers | rose gates (puzzle) |

## Maps, NPCs and scripts

### sugarbush (east exit → route_4)
| NPC / trigger | Sprite | Script | Owner | Notes |
|---|---|---|---|---|
| `sap_cart` | villager_a | `sb_sap_cart` | W | visibleWhen `ch4_started: false`; stands in the 1-tile gap beside his cart |
| `sap_collector` | villager_a | `sb_sap_collector` | W | visibleWhen `ch4_started: true`; cart moved aside |

### route_4
| NPC / trigger | Sprite | Script / trainer | Owner |
|---|---|---|---|
| sensor post 1 (tile `sensor_post`) | — | `q_relay_sensors_post_1` | N |
| trainers | orchardist, beekeeper, birdwatcher, schoolkid, hiker | `orchardist_russet`, `beekeeper_clem`, `birdwatcher_kit`, `schoolkid_tam`, `hiker_ford` | W teams / N text |
| incidental NPCs | various | `r4_*` | W |

### glasshouse_city
| NPC / trigger | Sprite | Script | Owner | Notes |
|---|---|---|---|---|
| onEnter | — | `gc_enter` | W | an if-chain: `ch4_city_arrival` (first visit) → `ch4_grunt_watch` (after the Relay) → `ch4_end` (`beat_flora` && `relay_listened` && !`ch4_done`). Leaving the Conservatory lands in the city, so the chapter end runs there. |
| first arrival | — | `ch4_city_arrival` | N | still `glasshouse_dome`, music `glasshouse_city`; set `gc_arrival_seen` |
| `watcher` | grunt | `ch4_watcher` | N | visibleWhen `relay_listened: true, ch4_grunt_seen: false`; the camera pan target |
| grunt watch | — | `ch4_grunt_watch` | N | pan to `watcher`, then hideNpc + set `ch4_grunt_seen` |
| chapter end | — | `ch4_end` | N | Vale's call, set `ch4_done`, `endSlice` |
| Rose Conservatory closed | trigger on the tile below the door | `ch4_conservatory_closed` | N | when `relay_listened: false`; **must end with `movePlayer down`** |
| sensor post 2 (tile `sensor_post`, city square) | — | `q_relay_sensors_post_2` | N | |
| `fan` | gentleman | `q_fan_mail` | N | quest giver |
| `pip` | pip | `gc_pip` | W | a fact |
| `reporter`, fans, residents, pets | various | `gc_*` | W | |

### glasshouse_relay
| NPC / trigger | Sprite | Script | Owner | Notes |
|---|---|---|---|---|
| listening-room trigger | — | `ch4_relay_listen` | N | strip across the listening-room door, when `relay_listened: false`. The main beat. Set `relay_listened`. |
| `wren` | wren | `q_relay_sensors` | N | always visible; quest only after `relay_listened` (branch in the script) |
| `flora` | flora_vance | `ch4_flora_relay` | N | visibleWhen `relay_listened: false` (hide her in the beat, or she vanishes with the flag) |
| `relay_director` | researcher | `ch4_director` | N | |
| listening desk (`console` tile) | — | sign text (W) | | the seed goes here in the beat |
| researchers | researcher | `rl_*` | W | |

### glasshouse_nursery (house + yard, one map)
| NPC / trigger | Sprite | Script | Owner | Notes |
|---|---|---|---|---|
| onEnter | — | `gn_enter` | W | calls `rival_3` when `relay_listened` && !`rival_3_done` |
| `nursery_keeper` | nursery_keeper | `gn_keeper` | N | behind the counter; runs `{ op: "nursery" }` |
| `nursery_keeper_b` | nursery_keeper_b | `q_first_seed` | N | yard; quest giver + `ifNurserySeed` hint |
| `bram` | bram | `rival_3` | N | visibleWhen `relay_listened: true, rival_3_done: false` |
| rival 3 | — | `rival_3` | N | `battle` `rival_3_<COUNTER[line]>` (canLose: true), then shears (`pruning_shears`), set `got_shears`, `rival_3_done` |

### glasshouse_conservatory
| NPC / trigger | Sprite | Script / trainer | Owner |
|---|---|---|---|
| `flora` | flora_vance | `flora` (battle trainer `flora`, `rose_mark`, fan letter delivery) | N |
| juniors | arranger, gentleman | `jr_posy`, `jr_wexley` | W teams / N text |
| levers, rose gates | lever, rose_gate | `rgc_lever_*`, `rgc_gate` | W |

### palm_house
| NPC / trigger | Script / trainer | Owner |
|---|---|---|
| sensor post 3 (tile `sensor_post`) | `q_relay_sensors_post_3` | N |
| trainers | `researcher_lin`, `florist_amaryl` | W teams / N text |

### route_5
| Trainers | `gardener_ivy`, `hiker_dale` | W teams / N text |

### Trainers (src/world/trainers.ts)
`flora` (FLORA, rose_mark, battle_leader, smart, items), `jr_posy`, `jr_wexley`,
`rival_3_oak` / `rival_3_chili` / `rival_3_lily` (same COUNTER pattern as
rival_2: the trainer id is Bram's line), and the route trainers above. Text
fields hold `TODO(narrative)` placeholders until agent 10 fills them.

## Positions (for cutscene paths and camera pans)

| Map | What | Tile |
|---|---|---|
| sugarbush | east exit to ROUTE 4 / `sap_cart` (until `ch4_started`) / cart crate (`]`, legendWhen) / `sap_collector` (after) | 29,21 / 27,21 / 28,21 / 27,20 |
| route_4 | west exit / east exits to the city / sensor post 1 / bramble ring (RAIN JAR) | 0,12 / 51,12-13 / 43,4 / 21,6 |
| glasshouse_city | west gate (arrival 1,16-17) / south gate to ROUTE 5 / RELAY door / CONSERVATORY door (closed trigger on 20,6) / NURSERY door / PALM HOUSE door / MARKET door / GREENHOUSE door / GLAZIER's house door | 0,16-17 / 19-20,35 / 5,6 / 20,5 / 5,27 / 34,6 / 33,14 / 6,12 / 24,28 |
| glasshouse_city | `watcher` (exits right x4 to 15,8) / relay mast (1x3) / sensor post 2 / `fan` / `pip` | 11,8 / 10,3-5 / 14,12 / 25,7 / 23,19 |
| glasshouse_relay | arrival / beat trigger (w2) / LISTENING DESK / `relay_director` / `wren` / `flora` (exits down x3 to the staff door 13,6) | 9,13 / 7-8,5 / 7-10,4 (camera 8,4) / 5,4 / 11,4 / 13,3 |
| glasshouse_nursery | arrival / `nursery_keeper` (PEONY, behind the counter) / `nursery_keeper_b` (LUPIN) / `bram` / keepers' hedge cell (`]`) / `boarder_1`, `boarder_2` | 4,7 / 2,2 / 11,2 / 9,4 / 13,4 / 15,2, 15,5 |
| glasshouse_conservatory | arrival / `flora` / levers 1, 2 / gates A, B, C, D / `posy`, `wexley` | 7,16 / 7,2 / 1,12, 14,5 / 5,10, 12,10, 7,4, 1,6 / 13,7, 6,7 |
| palm_house | arrival / sensor post 3 | 12,18 / 17,4 |
| route_5 | north entry (from the city) / west exit to HEDGEROW / brambles | 14-15,0 / 0,16 / 13-16,3 and 2,16 |
| hedgerow | east exit to ROUTE 5 | 25,12 |

Note for `rival_3`: the player arrives at 4,7, so PEONY (2,2) is off the top of
the screen; a `camera` to about 6,4 at the start of the scene frames all four.

## Sensor posts: how they fire

`sensor_post` is a solid, interactable tile. Each post carries a **trigger on
its own (solid) tile**; since it can never be stepped on, the engine runs it
when the player presses A facing the post (requested from systems via main).
