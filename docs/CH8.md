# Chapter 8: The Root Relay (plan and binding spec)

**The lead's decisions** (the owner delegated design). Implementers build
exactly this; anything not decided here is an implementation choice. If
something is impossible or contradictory, stop and say so. The calls open to
veto are listed in §8.

Work happens on branch **`ch8`**, built on `ch7`.

**No art in this phase:**
- maps use existing tiles, structures, sprites and music (the Relay already
  has its own tileset: `console`, `sensor_post`, `server_rack`,
  `cable_floor`);
- the one new item icon is a placeholder (`tools/art/placeholder.py items`);
- dialogue is `say("TODO(text): …")`.

There are **no new species, no Conservatory and no new systems** in this
chapter. It is Crystal's Radio Tower: a story dungeon in a city the player
already knows.

## 1. Beats (the bible's Chapter 8, made concrete)

1. **The city goes still.**
   - The first time the player enters `glasshouse_city` with `ch7_done` set
     (script `ch8_arrival`), set `ch8_started`.
   - Rootstock has seized the **ROOT RELAY**, and WREN has reversed the
     sensors. They broadcast Mercer's "command" into the network, and every
     Quickened plant in the region hears a voice telling it to be still.
   - **Mechanic (flavour only):** while `ch8_started && !beat_wren`,
     `palm_house` has **no wild encounters** (an `encountersWhen` entry with
     an empty table: "nothing stirs"). City NPCs comment on their plants
     standing frozen (TODO lines, gated on the same flags).
2. **The locked Relay.**
   - Two grunts guard the Relay door. Its door trigger (`ch8_relay_door`)
     refuses entry without the **RELAY KEYCARD** (TODO line, `movePlayer`
     down).
   - The Relay's director **ODELL** (the existing `relay_director`, sprite
     `researcher`) was thrown out. While `ch8_started && !got_keycard`, he
     hides in the **Palm House** (a second NPC `director_hiding` there).
     Talking to him gives `relay_keycard` and sets `got_keycard`.
3. **The Relay, floor by floor.** The lobby (`glasshouse_relay`, 1F) gains a
   stair to the new floors (§3).
   - **1F lobby:** 2 grunts. WREN and the Chapter 4 staff are gone while
     `ch8_started && !beat_wren` (`visibleWhen`).
   - **2F (`relay_2f`), the SERVER HALL:** 3 grunts among server racks. A
     pinned **work note** (talk trigger on a `workbench` tile, script
     `ch8_patch_note`) gives the patch order (§4).
   - **3F (`relay_3f`), the PATCH BAY:** 2 grunts and the puzzle (§4). Solving
     it opens the stair to the roof.
     - **BRAM** waits on 3F (beat 4).
   - **Roof (`relay_roof`), the MAST:** WREN at the mast's base. MERCER
     stands behind her (beat 5).
4. **Bram (no battle).**
   - Script `ch8_bram`, a trigger on 3F the first time the player arrives.
   - He has read the Bloom Lake files too. He confirms that his father,
     **MERCER THORNE**, started the Quickening on purpose.
   - **He has taken the graft collar off his partner**, and it's healing.
   - He holds the stairwell so no more grunts come up (TODO lines). Set
     `ch8_bram_met`. He stays on 3F (NPC `bram_r3`, `visibleWhen
     ch8_bram_met=true, beat_wren=false`, talk script `ch8_bram_after`).
5. **WREN and MERCER.**
   - Roof trigger `ch8_wren` (first time): WREN, the friendly sensor engineer
     from Chapter 4, now an admin. Battle `wren`.
   - After the win (`ch8_wren_after`): she cuts the broadcast (`sfx pulse`,
     `flash`, a still stand-in `relay_pulse`, `stillClear`). Set
     `beat_wren` and `broadcast_off`.
   - **MERCER THORNE appears for the first time** (NPC `mercer`, sprite
     `gentleman` stand-in, hidden until this beat via `visibleWhen`
     `mercer_seen`). He holds the Relay's **map of the network's hubs**.
     There's a short TODO exchange, with no battle. He and WREN leave by the
     roof's far edge (`moveNpc` off the map edge, `hideNpc`). Set
     `mercer_seen`.
6. **Chapter end.**
   - Back in the lobby (`glasshouse_relay` `onEnter`, when
     `beat_wren && !ch8_done`), ODELL thanks the player. Give rain_jar ×2
     and $3000 (`pay`), then set `relay_reward`.
   - **Vale's call** (`ch8_end`, same trigger, after the reward): Mercer has
     the hub map. Valerian Rook at **Sanguine Ridge** wants to see the
     player: "the Centuryheart is dying, as it must". Set `ch8_done` and
     `slice_done`, then `endSlice`.

## 2. Contracts and data

- **MAP_IDS** (append in this order): `relay_2f`, `relay_3f`, `relay_roof`.
- **Item** `relay_keycard`:
  - key pocket, name "Keycard";
  - description "ODELL's pass to every RELAY floor." (36 characters
    at most);
  - add it to REQUIRED_ITEMS;
  - placeholder icon: `python tools/art/placeholder.py items relay_keycard`.
- **No new characters.** MERCER uses `gentleman` and BRAM uses `bram` until
  the art pass. The art pass adds `mercer`, and then this NPC switches over.

## 3. Maps

| id | Name | ≈ size | Music (existing) | Layout |
|---|---|---|---|---|
| `glasshouse_relay` (edit) | ROOT RELAY | as is | `root_relay`; while `ch8_started && !beat_wren`, the lobby plays `rootstock_appears` (a `musicWhen` if it exists, otherwise the arrival script plays it) | Add a **stair up** in the staff passage (the dead-end cupboard behind the staff door at 13,6) via `legendWhen` on `ch8_started`. Keep every Chapter 4 test green. The 1F grunts (`grunt_r1_1`, `grunt_r1_2`) and the hidden/visible switches for the Chapter 4 staff go here. |
| `relay_2f` | SERVER HALL | 20×14 | `root_relay` | Rows of `server_rack` with `cable_floor` lanes. 3 grunts with sight lines across the lanes. The work-note `workbench`. Stairs down to 1F and up to 3F. 1 hidden item (`spring_water`). |
| `relay_3f` | PATCH BAY | 18×14 | `root_relay` | Three `console` tiles in a row on the north wall (consoles A, B and C, west to east). The stair to the roof is a `wall` tile until `relay_patched` (`legendWhen`). 2 grunts. BRAM by the down-stair. |
| `relay_roof` | RELAY ROOF | 16×12 | `rootstock_appears` | Outdoor (`outdoor: true`). The `relay_mast` structure, `iron_railing` round the edge, `paving` floor. WREN in front of the mast, MERCER beside it. The exit is the stair back down. |

**Validator:** everything must be reachable. The roof's only route is
through the patch bay, which needs `relay_patched`, which needs the note
(make that ordering explicit in a test). Exiting is always possible.

## 4. The patch bay puzzle

- The note on 2F gives the order **C, then A, then B** (TODO text that names
  the order; the writer phrases it as a hint).
- Each console is a talk trigger (`ch8_console_a`, `_b`, `_c`).
- **Progress:** flags `patch_1` and `patch_2`.
  - The right console at the right step sets the next flag (`sfx select`).
  - The right console when it's the last step sets `relay_patched`
    (`sfx door`, camera to the stair). The stair opens.
  - Any wrong console clears `patch_1` and `patch_2` (`sfx bump`, a TODO
    "static" line).
  - Once `relay_patched` is set, consoles say a TODO "it's routed" line.
- The consoles work whether or not the note was read. Reading it is the
  intended route, not a gate.
- **Test** (interpreter-level, like `ch7.test.ts`): all 6 orders of A/B/C
  from a fresh state. Exactly one (C, A, B) sets `relay_patched`. A wrong
  press mid-sequence resets, and the sequence can then be done correctly.

## 5. Trainers

| id | Class / portrait (existing) | Where | Team |
|---|---|---|---|
| `grunt_r0_1`, `grunt_r0_2` | GRUNT / `grunt`, `battle_rootstock` | the Relay door, outside (they stand *beside* the door: battle each with `sight: 2`; the door trigger stays the gate) | r0_1: stinging_nettle 41, foxglove 41 · r0_2: bramble_berry 41, venus_flytrap 42 |
| `grunt_r1_1`, `grunt_r1_2` | GRUNT | 1F | r1_1: fireweed 42, holly 42 · r1_2: sugar_maple 42, lodgepole_pine 43 |
| `grunt_r2_1..3` | GRUNT | 2F | r2_1: pitcher_plant 42, bladderwort 43 · r2_2: prickly_pear 43, sundew 43 · r2_3: red_mangrove 43, ghost_pipe 43 |
| `grunt_r3_1`, `grunt_r3_2` | GRUNT | 3F | r3_1: saguaro 44 · r3_2: moth_orchid 43, larch 44 |
| `wren` | ADMIN / `researcher` (portrait stand-in) | roof | moth_orchid 44, ghost_pipe 45, sugar_maple 45, **red_cedar 48 (ace)**. Smart AI, 2 spring_water, `battle_rootstock`. *(Orchids and ghost pipes both live off fungal networks: her team is the network.)* |

If any listed species id doesn't exist, stop and say so. Don't substitute.

**Balance** (extend `balance.test.ts`, with sim parties carrying Chapter
5–7 catches at about level 44):
- **Wren:** about 68–80% mean player win.
- Every starter must win more than 25%.
- Adjust levels and moves only, within **±2 levels** of the table. Report
  every change. If the band is unreachable, stop and report.

Wild encounters: none are new. `palm_house`'s broadcast-time empty table is
in §1.

## 6. Story flags and script ids (logic only; dialogue is `TODO(text)`)

| Script | Where | Logic |
|---|---|---|
| `ch8_arrival` | glasshouse_city `onEnter` | `ch7_done && !ch8_started`: camera to the Relay, TODO lines, set `ch8_started` |
| `ch8_relay_door` | glasshouse_city, the Relay door trigger | `ch8_started && !got_keycard`: TODO, then `movePlayer` down. Otherwise a no-op (pass through) |
| `ch8_director` | palm_house NPC `director_hiding` (sprite `researcher`, `visibleWhen ch8_started=true, got_keycard=false`) | TODO, give `relay_keycard`, set `got_keycard` |
| `ch8_patch_note` | relay_2f workbench | TODO (names C, A, B), set `patch_note_read` |
| `ch8_console_a/b/c` | relay_3f consoles | §4 |
| `ch8_bram` / `ch8_bram_after` | relay_3f trigger / NPC `bram_r3` | §1 beat 4 |
| `ch8_wren` / `ch8_wren_after` | relay_roof trigger / after the `wren` win | §1 beat 5; `ifLastBattle won`. If lost, the usual whiteout, and the trigger fires again next time |
| `ch8_reward` + `ch8_end` | glasshouse_relay `onEnter` | §1 beat 6 |
| city flavour | glasshouse_city NPCs | 2–3 existing NPCs get an extra `ifFlags` branch while `ch8_started && !beat_wren` (TODO "my plant won't move") |

## 7. Waves (Codex)

| Wave | Task | Depends on |
|---|---|---|
| 1 | **World:** contracts, item, the lobby stair, 3 maps, `palm_house` `encountersWhen`, trainers and balance, stub scripts | — |
| 2 | **Scripts:** §1 and §6, the puzzle (§4) and its test | wave 1 |
| 3 | **e2e** through Chapter 8 | wave 2 |
| 4 | **Read-only bug hunt** of `ch8` | wave 3 |

**Claude's later pass:** the `mercer` character and portrait, `wren`'s
admin portrait, the Relay floors' look, a still for the Mercer reveal
(`mercer_hub_map`), the keycard icon, the dialogue, and possibly a track for
the seized Relay.

## 8. Decisions taken by the lead (veto before the art and writing pass)

1. **No new species, Conservatory or system.** It's a story dungeon in
   Glasshouse City, kept small so the chapter lands on character.
2. **No rival battle.** BRAM arrives as an ally: he has taken the collar off
   his partner. This is the turn the bible sets up, and it's stronger than a
   fifth fight.
3. **WREN is the friendly Chapter 4 engineer turned admin.** CH4's script
   already marks her as "later the ROOTSTOCK admin".
4. **MERCER appears here for the first time,** in person, and doesn't
   battle. He leaves with the hub map.
5. **A keycard from the hiding director** gates the Relay, Crystal's Radio
   Tower card key, and sends the player through the Palm House.
6. **The patch bay** is a short order puzzle, with the hint on the floor
   below.
