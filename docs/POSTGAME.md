# Post-game (plan and binding spec)

**The lead's decisions** (the owner delegated design through the post-game).
Implementers build exactly this. If something is impossible or
contradictory, stop and say so.

Work happens on branch **`postgame`**, built on `ch11`. Everything here is
gated on `game_cleared`.

**No art in this phase:** placeholders, existing tiles, sprites and music,
and dialogue as `say("TODO(text): …")`.

## 1. Content

1. **The Centuryheart.**
   - Back at the Elder's heart, the planted seed has sprouted **twice**.
     Talking to the second sprout (NPC `centuryheart_sprout`,
     `visibleWhen game_cleared=true, got_centuryheart=false`) gives the
     species `centuryheart` at level 30 (`giveSpecies`) and sets
     `got_centuryheart`.
   - It is a rosette that will take a century to flower. It **never grows**
     (single stage) and can't breed.
2. **The Three Wanderers** (roaming legendaries, a new **ROAMING** system,
   §3).
   - **TUMBLEWEED** roams the dry routes (route_10, route_11, route_12),
     meeting the player in grass.
   - **COCONUT** roams the sea (Chapter 6's sea and island routes),
     meeting the player in water encounters.
   - **BURR** hitches a ride.
     - Each time the player enters an outdoor route map, there's a 1-in-8
       chance it appears **on the tile behind the player** as an NPC
       (`burr`, sprite `item_pickup` stand-in).
     - Talking to it starts its battle. If it's fled, it hops off to a
       later map. If it's caught, it's gone.
   - All three: level 60. They **flee after the first turn** (Crystal's
     beasts). Their HP and status **persist** between meetings. Once
     caught, they're gone. If wilted, they come back the next day (real
     clock).
   - **Release:** talking to ROWAN in the Council Hall after `game_cleared`
     (`pg_wanderers`) sets `wanderers_free`.
3. **The Seed Vault** (a post-game dungeon under the northern peaks).
   - Route 9 gains a north spur (`legendWhen game_cleared`) to
     `seed_vault_entrance` and on to `seed_vault_b1`, `seed_vault_b2` and
     `seed_vault_b3`.
   - The floors combine the field moves:
     - **B1** is dark (GLOW) with ICE;
     - **B2** has BOULDER PITS and a ROOT BRIDGE;
     - **B3** is the frozen archive.
   - High-level wild encounters, 58–66: every Chapter 11 line, plus older
     finals.
   - In B3's archive: **FENNIMORE'S DIARY**, the key item
     `old_diary` (his grandfather's diary from Chapter 1, "kept just in
     case").
4. **Methuselah** (the mythical).
   - Give the diary to OLD FENNIMORE in Hedgerow (`pg_diary`). He reads the
     song of the last Quickening and sends the player to **Methuselah
     Ridge**, a small summit map reached from the Seed Vault entrance by a
     new exit (`legendWhen diary_read`).
   - **At night only** (`ifTime night`), the oldest bristlecone (NPC
     `methuselah`) can be talked to: `wildBattle methuselah 70`
     (`canLose: true`).
   - It isn't one-off. During the day the TODO line is "it's only an old
     tree".
5. **Rematches.**
   - After `game_cleared`, the Council run can be repeated **at +8 levels**
     (`council_rematch`, the same rooms, a second trainer set
     `*_rematch`).
   - The run rule applies.
   - Beating the Keeper again gives 5000 and a rain_jar ×3, and no credits.

## 2. Species (5)

| id | Name (≤12) | Types | BST | Catch rate | Notes |
|---|---|---|---|---|---|
| `centuryheart` | Centuryheart | bloom / dragon | 600 | — (gift) | Single stage; can't breed |
| `tumbleweed` | Tumbleweed | thorn / wood | 580 | 3 | roams (the dry routes) |
| `coconut` | Coconut | water / wood | 580 | 3 | roams (the sea) |
| `burr` | Burr | thorn / bug | 580 | 3 | hitches rides |
| `methuselah` | Methuselah | wood / frost | 620 | 3 | mythical; night-only event |

- None of the five can breed: use the no-breeding convention from
  Chapter 10.
- **One signature move each** (existing effect kinds):
  - `long_bloom_2` "Century": bloom, special, 100/90/5, self special attack
    −1;
  - `roll_scatter` "Roll Scatter": thorn, physical, 75/100/15, self speed
    +1;
  - `drift_seed` "Drift Seed": water, special, 80/100/10, healing 25% of
    the damage dealt;
  - `hook_cling` "Hook Cling": bug, physical, 70/100/15, foe speed −1;
  - `old_rings` "Old Rings": wood, status, 0/—/10, self defence +1 and
    special defence +1, healing 25%. *If there's no combined boost-and-heal
    effect, use defence +1 and special defence +1 only, and say so.*
- **Herbarium:**

| id | Scientific name | Fact | Source |
|---|---|---|---|
| centuryheart | Puya raimondii | It can grow for decades before flowering once, then dies. | https://en.wikipedia.org/wiki/Puya_raimondii |
| tumbleweed | Salsola tragus | When dry, it breaks off at the root and rolls in the wind, scattering seeds as it goes. | https://en.wikipedia.org/wiki/Salsola_tragus |
| coconut | Cocos nucifera | Its fruit can float and stay viable across long ocean crossings. | https://en.wikipedia.org/wiki/Coconut |
| burr | Arctium | Its hooked burrs inspired the invention of Velcro. | https://en.wikipedia.org/wiki/Arctium |
| methuselah | Pinus longaeva | Some living bristlecone pines are more than 4,800 years old. | https://en.wikipedia.org/wiki/Pinus_longaeva |

## 3. Systems

**ROAMING** (`src/overworld/roaming.ts`, pure and unit-tested):
- `state.roamers: Record<"tumbleweed" | "coconut", { map, hp, status }>`
  (save migration).
- **Movement:** on every map change, each free roamer moves to a random map
  from its list (seeded RNG). It **may** land on the player's new map: that's
  how the player meets it, as in Crystal.
- **Meeting:**
  - when the player's map holds a roamer, a grass encounter (tumbleweed) or
    a water encounter (coconut) is replaced by the roamer with probability
    1/4;
  - the battle is a wild battle where the roamer always flees at the end of
    its first turn, if it isn't caught or wilted;
  - HP and status write back afterwards.
- **BURR:** a separate hook on outdoor map entry (1/8, seeded), placing a
  temporary NPC behind the player, if that tile is walkable and free.
- **Tests:** movement is seeded and can land on the player's new map; the flee rule; HP
  persistence; caught means gone; wilted means back the next day; BURR's
  placement only on free walkable tiles; save and Continue.

**Rematch trainers:** a helper that clones a TrainerDef at +N levels into
`<id>_rematch`.

## 4. Maps (7 new)

`seed_vault_entrance` (indoor lobby 14×12), `seed_vault_b1` (dark, ICE,
24×20), `seed_vault_b2` (pits, a root gap, 24×20), `seed_vault_b3` (the
archive, 16×14), `methuselah_ridge` (an outdoor summit, 16×14),
`hedgerow_fennimore` (the existing Fennimore interior gets a post-game
script branch; make no new map if it exists), plus the Route 9 spur via
`legendWhen`.
- Validator: every post-game area is reachable only with `game_cleared`,
  and Methuselah Ridge only with `diary_read`.
- Puzzle tests for B1 (ice) and B2 (pits).

## 5. Waves (Codex)

| Wave | Task |
|---|---|
| 1 | Species (5), moves, Herbarium, placeholders, the no-breeding check |
| 2 | ROAMING + BURR, with tests and save migration |
| 3 | World: the Seed Vault, Methuselah Ridge, the spur, encounters, rematch trainers and balance (Keeper rematch about 45–60%), stub scripts |
| 4 | Scripts: the Centuryheart gift, wanderer release, the diary, Methuselah at night, the rematch run (tests) |
| 5 | e2e: from the post-game wake-up through the Centuryheart gift, the Seed Vault to the diary, Fennimore, and Methuselah (seeded night) |
| 6 | Read-only bug hunt, then fixes |

## 6. Decisions taken by the lead

1. **The Centuryheart is a gift that never grows**, honouring the bible's
   "it takes a century".
2. **Crystal's roaming rules** for two Wanderers; **BURR hitches rides**
   (the bible's "appears behind the player").
3. **The Seed Vault is the post-game dungeon,** and its prize unlocks the
   mythical (Fennimore's diary ties back to Chapter 1).
4. **Methuselah is night-only** and not one-off.
5. **Council rematch at +8.**
