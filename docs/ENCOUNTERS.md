# Recommended encounter tables (Round 3)

This is from the data agent (agent 6) for the world agent (agent 8). The
level bands follow [SLICE.md](SLICE.md). Every route gets 5–7 distinct
species, and the 16 new species sit in the habitats given in ROUND3 §2.
Species data is in `src/data/species/<line>.json` (docs/DATA.md).

**How to read the tables**
- "Day" covers morning and day; "Night" is 18:00–04:00.
- When the day and night weights differ, write two `EncounterSlot`s with
  `time: "day"` and `time: "night"`.
- When a slot's day and night weights match, use one slot with no `time`.
- A dash means the species does not appear at that time.
- Weights are relative within each time of day.

## The new lines at a glance

| Line | Stage 1 → 2 | Types | Grows | Notes |
|---|---|---|---|---|
| Clover | SHAMROCK → WHITE CLOVER | bloom | **tending 120** (~13 level-ups after a fresh catch, so around lv 16 from Route 1) | Common, fast growth, bulky support, catch rate 255. Leaves fold at night, so day only. |
| Cattail | BULRUSH → CATTAIL | water → water/wood | lv 17 | Pond edges and bog. |
| Foxglove | FOX ROSETTE → FOXGLOVE | bloom → bloom/ghost | **lv 18 at night** | Special attacker that inflicts blight. Activity "night"; much more common after dark. |
| Holly | HOLLY SPROUT → HOLLY | thorn → thorn/frost | lv 20 | Slow-growing physical wall. Holly is weak only to water. |
| Mint | MINT SPRIG → PEPPERMINT | frost | lv 16 | Fast growth, fast special attacker. |
| Wild rose | ROSE BUD → WILD ROSE | thorn → thorn/bloom | **lv 18 by day** | Physical attacker. Activity "day". |
| Pitcher | TINY PITCHER → BOG PITCHER | bug → bug/water | lv 18 | Bulky drainer, bog only. A good stage-2 option for Nell. |
| Snapdragon | SNAP SPROUT → SNAPDRAGON | dragon → dragon/bloom | lv 22 | Rare. It's the gift from THE SURVEY at lv 10, plus a ~1% Route 3 day slot. Catch rate 45, slow growth, 4x weak to frost. |

No new stage-1 form grows before lv 16, and wild levels top out at 15, so
stage-2 forms of the new lines never appear in the wild in the slice.
Trainers may use them at lv 16 and up.

## Route 1 (lv 2–4, grass, rate 12)

There are 6 species. By day, the clover and sunflower meadow. By night,
mint and the first foxgloves.

| Species | Levels | Day | Night |
|---|---|---|---|
| dandelion_bud | 2–4 | 35 | 35 |
| sunflower_seedling | 2–4 | 25 | – |
| clover_sprout | 2–4 | 25 | – |
| mint_sprig | 2–4 | 15 | 25 |
| nettle_sprout (rare) | 3–4 | 8 | 12 |
| foxglove_rosette | 3–4 | – | 20 |

## Route 2 (lv 3–7, grass, rate 12)

There are 7 species. This is the woodland edge: holly in the woods, and
foxgloves mostly at dusk and night.

| Species | Levels | Day | Night |
|---|---|---|---|
| dandelion_bud | 3–6 | 25 | 20 |
| bramble_blossom | 3–7 | 22 | 22 |
| fern_fiddlehead | 4–7 | 22 | 25 |
| sunflower_seedling | 3–6 | 15 | – |
| holly_seedling | 4–7 | 10 | 10 |
| foxglove_rosette | 4–7 | 4 | 25 |
| pumpkin_blossom (rare) | 5–7 | 5 | 5 |

## Route 3 (lv 7–11, grass rate 12, bog margin rate 12)

There are 7 species across both tables. Wild roses grow in the hedges, the
moonflower meadow opens at night, cattails stand at the pond edge, and there
is the very rare snapdragon.

Grass:

| Species | Levels | Day | Night |
|---|---|---|---|
| bramble_blossom | 7–11 | 25 | – |
| rose_bud | 7–10 | 22 | 6 |
| nettle_sprout | 7–10 | 20 | 20 |
| pumpkin_blossom | 8–11 | 14 | – |
| moonflower_seed | 8–11 | – | 45 |
| snapdragon_sprout (very rare) | 9–10 | 1 | – |

Bog (pond margin):

| Species | Levels | Day | Night |
|---|---|---|---|
| cattail_shoot | 7–10 | 70 | 70 |
| nettle_sprout | 7–9 | 15 | – |
| moonflower_seed | 8–10 | – | 15 |

SLICE.md also lists fern_fiddlehead for Route 3. Leave it out here to stay
at 7 species; fern is already common on Route 2, in the grove and in the bog.

## Sugarbush Grove (lv 10–14, grass, rate 14)

There are 5 species.

| Species | Levels | Day | Night |
|---|---|---|---|
| maple_samara | 10–13 | 45 | 40 |
| fern_fiddlehead | 10–13 | 28 | 28 |
| holly_seedling | 10–13 | 20 | 20 |
| maple_sapling (rare) | 13–14 | 8 | 8 |
| foxglove_rosette | 11–13 | – | 14 |

## Bog: Sugarbush and the Conservatory 2 boardwalk (lv 12–15, bog, rate 10)

There are 5 species. Use the same table on both maps.

| Species | Levels | Day | Night |
|---|---|---|---|
| sundew_rosette | 12–15 | 30 | 30 |
| flytrap_seedling | 12–14 | 25 | 25 |
| pitcher_sprout | 12–15 | 22 | 22 |
| cattail_shoot | 12–14 | 18 | 18 |
| fern_fiddlehead | 12–14 | 10 | 10 |

## Coverage check

The wild-catchable species are 19 stage-1 forms plus maple_sapling:
- dandelion_bud, sunflower_seedling, clover_sprout, mint_sprig, nettle_sprout,
  foxglove_rosette, bramble_blossom, fern_fiddlehead, holly_seedling,
  pumpkin_blossom, rose_bud, moonflower_seed, cattail_shoot, maple_samara,
  maple_sapling, sundew_rosette, flytrap_seedling, pitcher_sprout, and
  snapdragon_sprout (rare).

The quests in ROUND3 §4 fit this:
- `seed_library` needs 6 caught, which is reachable on Route 1 and Route 2.
- `herbarium_survey` needs 15 caught, which is reachable around Route 3 and
  the grove.

## Trainer ideas (optional, for agents 8 and 9)

- Route 1 and 2 trainers: clover_sprout and mint_sprig (a "gardener" theme).
  Use holly_seedling for a hiker.
- Route 3: rose_bud for the florist and foxglove_rosette for a night trainer.
- Bog trainers: pitcher_sprout and cattail_shoot.
- Nell's ace could be **pitcher_plant (BOG PITCHER)** at lv 17, as an
  alternative to VENUS FLYTRAP. Run `src/battle/logic/balance.test.ts` after
  any change to a boss team.
