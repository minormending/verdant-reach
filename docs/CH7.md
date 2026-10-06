# Chapter 7: Larchmere and Bloom Lake (plan and binding spec)

**The lead's decisions** (the owner delegated design). Implementers build
exactly this; anything not decided here is an implementation choice. If
something is impossible or contradictory, stop and say so. The calls open to
veto are listed in §9.

Work happens on branch **`ch7`**, built on `ch6`.

**No art in this phase:**
- placeholders come from `tools/art/placeholder.py` (extended to tiles in
  §3);
- maps use existing tiles, structures, sprites and music, plus the
  placeholder `ice` and `snow` tiles;
- dialogue is `say("TODO(text): …")`.

## 1. Beats (the bible's Chapter 7, made concrete)

1. **The pass north.**
   - After `ch6_done`, the Cedarhallow ranger opens the north avenue: the
     snow has cleared.
   - **Route 9** climbs through larch forest and scree into snow.
2. **Larchmere,** an alpine lake town: a Greenhouse, a market, and the
   **Lakeside Lodge**.
   - **SIGNE**'s Conservatory is shut. She won't battle "while the lake is
     screaming".
   - **Bloom Lake** is red: hundreds of plants forced awake and furious.
     Its encounters are higher-level and more frequent than normal.
3. **Bloom Lake**, reached by raft.
   - At the centre, on an islet, is the **CRIMSON LILY**: a one-off **sport**
     `giant_water_lily` at level 40, met in a static battle. It can be
     caught, and if it's fled or wilted it's gone for good.
4. **The Lodge, then the hideout.**
   - The lodge keeper is nervous. A bookcase hides the stair (a talk trigger
     opens it once the player has seen the grunt by the lodge door).
   - **Rootstock Hideout B1:** three **SIGNAL EMITTERS** (lever-style NPC
     objects). Switching each off (flags `emitter_1_off`..`3`) weakens the
     broadcast. Grunts guard each one.
   - **Hideout B2:** **DR. CALLOWAY** (named for the first time; she was THE
     DOCTOR in Chapter 6) is fought as an admin.
   - **The files (the reveal):** the still `rootstock_files`. The first forced
     Quickening was months **before** the Long Bloom, so Rootstock caused it.
   - Calloway escapes through a back tunnel.
   - Setting `lake_calmed` turns the lake normal (`legendWhen`) and lowers
     the encounter rate.
5. **Conservatory 7, SIGNE (Frost).**
   - It opens once `lake_calmed` is set.
   - The puzzle is an **ice-slide floor**, Crystal's Mahogany gym: the player
     slides until blocked.
   - **SNOWDROP MARK.** After the battle she gives a **COLD SNAP**: the first
     real use of the growth item, which opens the `snowdrop_bulb`.
6. **Chapter end.**
   - Re-entering Larchmere with the mark brings Vale's call.
   - She has seen the files. She **admits she knew Mercer Thorne**: they
     studied together, and she turned down his offer.
   - The hook: the Root Relay in Glasshouse City has gone silent.
   - Then the TO BE CONTINUED card.

**Side quest:** LOST CLIMBER. A mountaineer on Route 9 lost her pack in the
snow. Find it (a hidden item, then a talk) for a reward of 2 rain_jar + a
cold_snap.

## 2. Species (12)

| id | Name (≤12) | Line, stage | Types | Base-stat total | Growth → | Activity | Pollination |
|---|---|---|---|---|---|---|---|
| `snowdrop_bulb` | Snow Bulb | snowdrop 1 | frost | 290 | **item `cold_snap`** → snowdrop_shoot | any | meadow |
| `snowdrop_shoot` | Snow Shoot | snowdrop 2 | frost / bloom | 400 | vigor 36 → snowdrop | any | meadow |
| `snowdrop` | Snowdrop | snowdrop 3 | frost / bloom | 490 | — | any | meadow |
| `campion_cushion` | Moss Cushion | campion 1 | frost | 300 | vigor 30 → campion_mound | day | meadow |
| `campion_mound` | Moss Mound | campion 2 | frost / wood | 410 | vigor 40 → moss_campion | day | meadow |
| `moss_campion` | Moss Campion | campion 3 | frost / bloom | 500 | — | day | meadow |
| `larch_seedling` | Larch Sprout | larch 1 | wood / frost | 310 | vigor 34 → larch | any | woodland |
| `larch` | Larch | larch 2 | wood / frost | 480 | — | any | woodland |
| `edelweiss_bud` | Edel Bud | edelweiss 1 | frost / bloom | 300 | vigor 32 → edelweiss | day | meadow |
| `edelweiss` | Edelweiss | edelweiss 2 | frost / bloom | 470 | — | day | meadow |
| `bladderwort_sprig` | Bladder Sprig | bladderwort 1 | bug / water | 295 | vigor 33 → bladderwort | any | carnivore |
| `bladderwort` | Bladderwort | bladderwort 2 | bug / water | 465 | — | any | carnivore |

**Stat shapes:**
- snowdrop: special attack and speed;
- campion: HP and the defences (very bulky);
- larch: attack and defence;
- edelweiss: special defence and special attack;
- bladderwort: speed and attack.

Totals may vary ±15 to pass the tests.

**Signature moves** (existing `MoveEffect` kinds; names ≤12; descriptions ≤36
and 2 lines):

| id | Name | Type | Category | Power / Acc / PP | Effects | Learned by |
|---|---|---|---|---|---|---|
| `thaw_bloom` | Thaw Bloom | frost | special | 75 / 100 / 15 | frostbite 10% | snowdrop (stage 2 at 38) |
| `cushion` | Cushion | frost | status | 0 / — / 10 | self defence +1 and special defence +1 | campion (stage 1 at 22) |
| `needle_drop` | Needle Drop | wood | physical | 25 / 100 / 20 | multi_hit 2–5 | larch (stage 1 at 26) |
| `woolly_coat` | Woolly Coat | frost | status | 0 / — / 15 | self special defence +2 | edelweiss (stage 1 at 24) |
| `vacuum_trap` | Vacuum Trap | bug | physical | 60 / 100 / 15 | priority +1 (as a move field) | bladderwort (stage 1 at 25) |

**Herbarium**, one fact per line, cited in code comments; no other claims:

| ids | Scientific name | Fact | Source |
|---|---|---|---|
| snowdrop_* | Galanthus nivalis | Its bulb needs a cold winter before it will flower. | https://en.wikipedia.org/wiki/Galanthus_nivalis |
| campion_*, moss_campion | Silene acaulis | It grows as a dense cushion that keeps its centre several degrees warmer than the surrounding air. | https://en.wikipedia.org/wiki/Silene_acaulis |
| larch_* | Larix decidua | Unlike most conifers, larches drop all their needles every autumn. | https://en.wikipedia.org/wiki/Larix_decidua |
| edelweiss_* | Leontopodium nivale | Its woolly white hairs help protect it from cold and strong mountain sunlight. | https://en.wikipedia.org/wiki/Leontopodium_nivale |
| bladderwort_* | Utricularia vulgaris | Its tiny underwater bladders snap open and suck in prey in about a millisecond. | https://en.wikipedia.org/wiki/Utricularia |

**Placeholder art:** `python tools/art/placeholder.py species <12 ids>`.

## 3. Systems

**ICE** (new TileKey `ice`, `TileProps.slide: true`, walkable):
- Stepping onto ice makes the player **slide** in the facing direction until
  the next tile is blocked or isn't ice. The player stops *on* the last ice
  tile, or steps onto the non-ice tile that ends the slide.
- No input is taken mid-slide. Encounters don't roll on ice. NPCs block a
  slide.
- The sliding logic is a pure, unit-tested function.
- **The solver:** a BFS over slide moves (each direction from each stop), for
  puzzle tests. The world validator treats ice movement with these rules.

**SNOW** (new TileKey `snow`): walkable, with encounter `grass`. Purely visual
otherwise, for the alpine routes.

**Placeholder tiles:** extend `tools/art/placeholder.py` with `tiles <key>…`,
which writes a placeholder tileset bundle `placeholder_tiles` (one 16×16
cell per key, notes starting with `PLACEHOLDER`). It never overwrites real
art, and the release gate must catch it.

**Static sport battle:** extend `ScriptCmd` `wildBattle` with
`sport?: boolean`, so the battle's Quickened is a sport, and a catch keeps it.
The CRIMSON LILY script sets `crimson_lily_done` whatever the outcome
(caught, wilted or fled), so it's one-off.

**Lake state:** Bloom Lake's red tint is art, which comes later. For now
`lake_calmed` switches the encounter table and rate (see §4) using a
`legendWhen`-swappable encounter tile or a scripted rate.
- **Decision:** two encounter tables keyed by a new optional
  `MapDef.encountersWhen?: { when: Cond; encounters: … }[]` (first match
  wins), mirroring `legendWhen`.

**Marks:** `snowdrop_mark` (placeholder UI art `mark_snowdrop`).

**Seed Glide:** add a `larchmere` landing and extend the visited-town logic.

## 4. Maps (9; MAP_IDS appended in this order)

| id | Name | ≈ size | Outdoor | Music (existing) | Ambient | Layout |
|---|---|---|---|---|---|---|
| `route_9` | ROUTE 9 | 30×56 | yes | `route` | `leaves` (south) / `mist` | Cedarhallow north avenue (gate NPC `pass_ranger`, `visibleWhen ch6_done=false`) to Larchmere. Larch forest (tree), then scree (rock, ledges), then snow (`snow`). 4 trainers, 2 hidden items (one is the LOST CLIMBER pack). |
| `larchmere` | LARCHMERE | 36×30 | yes | `small_town` | `none` | Exits: south to route_9, east to bloom_lake (shore). Greenhouse, market, Lodge (`lodge` structure), Conservatory. Glide landing. |
| `larchmere_greenhouse` | GREENHOUSE | helper | no | `greenhouse` | — | `greenhouseMap()` |
| `larchmere_market` | MARKET | like the others | no | `market` | — | Same stock as Saltmarsh (`cold_snap` is never sold). |
| `bloom_lake` | BLOOM LAKE | 36×36 | yes | `route` | `spores` | A big lake (raft), shore paths, the central islet with the CRIMSON LILY (a static-battle NPC `crimson_lily`, sprite `potted_plant` stand-in, `visibleWhen crimson_lily_done=false`). `encountersWhen`: before `lake_calmed`, rate 20, levels 36–40; after, rate 8, levels 33–37 (§4.1). |
| `larchmere_lodge` | LAKESIDE LODGE | 14×12 | no | `herbarium` | — | The keeper, plus the bookcase stair trigger to the hideout (`talk` trigger on a `bookshelf` tile). |
| `rootstock_hideout_1` | HIDEOUT B1 | 24×20 | no | `sugarbush_grove` | — | 3 emitters (NPC sprite `lever`, ids `emitter_1..3`), 3 grunts, the stairs down open after all 3 are off. |
| `rootstock_hideout_2` | HIDEOUT B2 | 18×16 | no | `sugarbush_grove` | — | CALLOWAY, the files desk (a talk trigger on `console`), and the back tunnel exit to larchmere (one-way, after `beat_calloway`). |
| `larchmere_conservatory` | CONSERVATORY | 16×20 | no | `conservatory` | — | The ICE puzzle: solvable from the entrance (ice-solver test), reaching SIGNE at the north; the exit is always reachable. 2 juniors. |

### 4.1 Wild encounters

Every slot stays below its species' growth level; cap where needed. The test
from Chapters 5–6 covers these maps.

| Map | Kind | Slots | Levels |
|---|---|---|---|
| route_9 | grass/snow | larch_seedling 25%, campion_cushion 25%, edelweiss_bud 20%, holly 10%, peppermint 10%, snowdrop_bulb 10% | 32–35 |
| bloom_lake (red) | water | bladderwort_sprig 35% (≤32), lily_pad 25%, cattail 20%, eelgrass 20% | 36–40 |
| bloom_lake (calm) | water | bladderwort_sprig 40% (≤32), eelgrass 30%, lily_pad 30% | 33–37 |
| bloom_lake shore | grass | edelweiss_bud 40% (≤31), campion_cushion 30% (≤29), snowdrop_bulb 30% | 33–36 |

## 5. Trainers

| id | Class / portrait (existing) | Where | Team |
|---|---|---|---|
| `climber_ridge`, `climber_scree` | HIKER / `hiker` | route_9 | ridge: larch_seedling 33, holly 34 · scree: campion_mound 34 |
| `skier_frost`, `skier_drift` | BIRDWATCHER / `birdwatcher` | route_9 | frost: peppermint 34, edelweiss_bud 33 · drift: snowdrop_shoot 34, larch 35 |
| `grunt_lodge`, `grunt_b1_1..3` | GRUNT / `grunt`, `battle_rootstock` | the lodge door; B1 by each emitter | lodge: stinging_nettle 35, venus_flytrap 35 · b1_1: fireweed 36, sugar_maple 36 · b1_2: red_mangrove 36, bladderwort 36 · b1_3: prickly_pear 37, foxglove 36 |
| `calloway` | ADMIN / `shears` (portrait stand-in) | B2 | ghost_pipe 38, lodgepole_pine 39, **red_mangrove 41 (ace, `grafted: true` at the same level: forced growth is her specialty)**. Smart AI, 1 spring_water, `battle_rootstock`. |
| `jr_flurry`, `jr_hoarfrost` | JR.GARDENER / `gardener` | the conservatory | flurry: edelweiss 38, snowdrop_shoot 38 · hoarfrost: campion_mound 39, holly 39 |
| `signe` | WARDEN / `nell_pitcher` | the conservatory | edelweiss 40, moss_campion 41, larch 41, **snowdrop 43 (ace)**. Smart AI, 2 spring_water, `battle_leader`, mark `snowdrop_mark`. |

**Balance** (extend `balance.test.ts`, with sim parties carrying Chapter 5–7
catches at the expected levels):
- **Calloway:** about 70–82% mean player win.
- **Signe:** about 62–72%, the hardest leader so far after Flora's spike.
- Every starter must win more than 25%.
- Adjust levels and moves only, staying within **±2 levels** of the table.
  Report every change. If a band is unreachable within ±2, **stop and report**
  rather than move levels further.

## 6. Story flags and script ids (logic only; dialogue is `TODO(text)`)

| Script | Where | Logic |
|---|---|---|
| `ch7_pass_ranger` | cedarhallow, NPC `pass_ranger` (sprite `hiker`) at the north exit, `visibleWhen ch6_done=false` | "the pass is snowed in" |
| `ch7_arrival` | larchmere `onEnter` (first time) | sets `ch7_arrived` |
| `ch7_cons7_door` | larchmere, the conservatory door trigger | `!lake_calmed` → TODO, then `movePlayer` down |
| `ch7_crimson_lily` | bloom_lake NPC `crimson_lily` | TODO intro; `wildBattle` giant_water_lily 40 with `sport: true` and `canLose: true`; set `crimson_lily_done`; `hideNpc` |
| `ch7_lodge_grunt` | larchmere_lodge trigger by the door (first time) | the grunt battle (`grunt_lodge`), then set `lodge_grunt_seen` |
| `ch7_bookcase` | larchmere_lodge, the talk trigger on the bookshelf | if `lodge_grunt_seen`: reveal the stair (a `legendWhen` swap via flag `lodge_stair_open`), then warp to B1. Else: books (TODO). |
| `ch7_emitter_1..3` | B1 emitter NPCs (sprite `lever`) | each sets `emitter_<n>_off` (a lever animation if available). After all 3, `legendWhen` opens the stairs to B2 (flag `emitters_off`). |
| `calloway` (trainer) + `ch7_calloway_after` | B2 | after the win: TODO lines, set `beat_calloway` |
| `ch7_files` | B2, the talk trigger on the console | `still` (stand-in `relay_pulse`) for the files reveal, TODO lines, set `files_read` and `lake_calmed`, then open the tunnel |
| `ch7_signe_after` | after the `signe` win | give `cold_snap`, set `got_cold_snap_signe` |
| `ch7_end` | larchmere `onEnter`, when `beat_signe && !ch7_done` | Vale's call (TODO: she knew Mercer Thorne; the Relay has gone silent); set `ch7_done`, `slice_done`, then `endSlice` |

**Quest `lost_climber`, "LOST CLIMBER":**
- giver NPC `mountaineer` (sprite `hiker`) on route_9, script
  `q_lost_climber`;
- a hidden item `climber_pack` (a key item in REQUIRED_ITEMS, placeholder
  icon) in the snow;
- returning it gives 2 rain_jar + 1 cold_snap.

## 7. Waves (Codex)

| Wave | Task | Depends on |
|---|---|---|
| 1 | **ICE** plus `snow`, the placeholder tiles, and `encountersWhen` | — |
| 1 | **Static sport battle** (`wildBattle.sport`) | — |
| 1 | **Species** (12), moves, Herbarium, placeholder art | — |
| 2 | **World**: 9 maps, the gate, encounters, trainers and balance, glide, the mark, the ice puzzle and its solver test, stub scripts | wave 1 |
| 3 | **Scripts and quest** logic (§6) | wave 2 |
| 4 | **e2e** through Chapter 7 | wave 3 |
| 5 | **Read-only bug hunt** of `ch7`, then fixes | wave 4 |

## 8. Claude's later pass

Art (12 species; ice, snow and lake tiles; the lodge and hideout; Calloway,
Signe and others; stills `rootstock_files` and the CRIMSON LILY), the music
(alpine, the red lake, the hideout), and all dialogue. The release gate blocks
merging until it's done.

## 9. Decisions taken by the lead (veto before the art and writing pass)

1. **The CRIMSON LILY is a sport giant water lily** (the bible's red Gyarados
   beat), not a new species.
2. **Dr. Calloway is named and fought here.** She was THE DOCTOR in
   Chapter 6, and her ace is graft-collared.
3. **Signe's puzzle is an ice-slide floor,** Crystal's Mahogany gym. The
   SNOWDROP MARK, then the COLD SNAP, the first use of the growth item.
4. **The reveal is delivered through files** in the hideout. Vale's
   confession comes in the end call, and Bram's confirmation is saved for
   the Root Relay (Chapter 8).
5. **No Bram in Chapter 7.**
