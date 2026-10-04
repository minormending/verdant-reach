# Vertical slice: Prologue + Act 1 (to Conservatory 2)

Story source: `/Users/kevinramdath/projects/research/creature-sprites/story/`
(premise, world, characters, plot chapters 1–3, key plants, mechanics,
decisions). This file pins down what the slice must contain. Where it is
silent, follow the story bible.

Expected play time is about 60–90 minutes. The slice ends after Conservatory 2
with a "TO BE CONTINUED" card.

## Flow

1. **Title.** NEW GAME / CONTINUE (when a save exists) / OPTIONS.
2. **New game.** Dr. Vale's short intro, then name entry for the player (an
   on-screen letter grid). The rival is always BRAM.
3. **Prologue, night** (`herbarium_roof`).
   - The player's first evening shift. Vale takes them up to the observation
     deck to watch the CENTURYHEART bloom on the far slope, the first bloom
     in a hundred years.
   - Music: `prologue_bloom`. Gold pollen (fade to white and back).
   - A low hum comes up through the floor; only the player notices (`shake`).
   - Fade to black.
4. **Morning** (`player_home`).
   - A housemate says DR. VALE called: "the greenhouse moved."
   - Walk through Fallowfield to the Herbarium.
5. **Starter** (`herbarium`, greenhouse room).
   - Three potted seedlings (NPC objects with the `potted_plant` sprite) have
     turned to face the door.
   - Inspect each pot: `showSpecies`, a short description, then "Choose this
     one?" The choices are OAK ACORN, CHILI BLOSSOM and LILY SEEDPOD, at level 5.
   - Vale gives the FIELD HERBARIUM (it unlocks the menu entry) and sends the
     player to OLD FENNIMORE in Hedgerow, who phoned about "a seed that won't
     sit still."
6. **Route 1 → Hedgerow → Fennimore's house.**
   - Fennimore gives the CENTURYHEART SEED (a key item; its description hints
     it is warm and humming) and FENNIMORE'S LETTER for Vale.
   - On the way back to Fallowfield, PIP shows how catching works
     (scripted). Pip is a kid who knows plant facts.
7. **Theft.** Back at the Herbarium, a pot is empty: the starter strong
   against the player's.
   - A boy was seen running off.
   - **Rival battle 1** with BRAM on the way out (`canLose: true`; the story
     continues either way). Bram is cold. He says the plants are tools,
     calls his father "a man who fixes things," and leaves.
   - Vale reads the letter ("the old songs say: the heart blooms and the
     woods listen"), gives 5 TERRARIUM PODS and 2 WATER FLASKS, and sends the
     player to catalogue the Quickened and earn Conservatory accreditation
     (Pressed Marks).
8. **Route 2 → Bramblegate.**
   - Trainers, wild Quickened, ledges, an item pickup.
   - BRAMBLEGATE GREENHOUSE (heal and cabinet) and the MARKET (shop).
9. **Conservatory 1: HOLLIS (Wood).**
   - Inside are hedge walls, two junior gardeners and Hollis.
   - Lesson: "they choose you." Award: BRAMBLE MARK.
   - Rootstock is foreshadowed: a grey-coated grunt is seen leaving town.
10. **Route 3: night meadow.**
    - MOONFLOWER lines appear only at night.
    - At least one NPC comments on day versus night.
    - Trainers include a Rootstock grunt. First music cue: `rootstock_appears`.
11. **Sugarbush.**
    - The maple-syrup town is distressed: the Quickened maples in the
      sugarbush are wilting.
    - The SUGARBUSH GREENHOUSE heals. NELL PITCHER's Conservatory is blocked;
      a worried villager won't let the player into the bog path until the
      grove is cleared.
12. **Sugarbush Grove** (dungeon).
    - Rootstock grunts have tapped the maples and are draining their sap
      "for study."
    - A small maze, 3 grunts, then the admin SHEARS.
    - Shears drops lines about "Mr. Thorne" and "rootstock."
    - Win: the grunts leave, the taps come out, and the maples stir. Set
      `grove_cleared`.
13. **Rival battle 2.** BRAM in Sugarbush after the grove.
    - His partner wears a GRAFT COLLAR (dialogue only). He's winning ugly and
      is a little shaken by what he saw in the grove.
14. **Conservatory 2: NELL PITCHER (Bug, carnivorous)** in the bog.
    - Boardwalk paths and two trainers.
    - Award: SUNDEW MARK.
    - After the win, Nell mentions that the bog "hums" at night.
    - Dr. Vale calls: she's found something in Fennimore's notes.
15. `endSlice` shows a **TO BE CONTINUED** card, then returns to the title.
    Optionally offer to save first.

## Numbers (guidance for world + data)

- Starters at level 5. Starter lines grow at 16 and 32. Wild lines grow
  earlier (around 10–14 and 22–26).
- Wild levels:

  | Area | Levels |
  |---|---|
  | Route 1 | 2–4 |
  | Route 2 | 3–7 |
  | Route 3 | 7–11 |
  | Grove | 10–14 |
  | Bog | 12–15 |

- Teams:

  | Opponent | Team |
  |---|---|
  | Hollis | 2 Quickened, levels 9 and 11 |
  | Shears | 2 Quickened, levels 13 and 14 |
  | Bram 2 | 3 Quickened, levels 12–15 |
  | Nell | 3 Quickened, levels 14, 15 and 17 (her ace is VENUS FLYTRAP or a stage-2 line) |

- About 6–8 trainers on routes and 2 in each Conservatory.
- Prices: terrarium pod 200, water flask 300, neem spray 250. The market sells
  pods, flasks and neem spray. Glass pods are found only in the grove.

## Species distribution

The roster is in `src/contracts/ids.ts`.

| Area | Species |
|---|---|
| Route 1 | dandelion_bud, sunflower_seedling, nettle_sprout (rare) |
| Route 2 | dandelion_bud, bramble_blossom, fern_fiddlehead, pumpkin_blossom (rare), sunflower_seedling |
| Route 3, day | bramble_blossom, fern_fiddlehead, nettle_sprout, pumpkin_blossom |
| Route 3, night | moonflower_seed, fern_fiddlehead, nettle_sprout |
| Sugarbush Grove | maple_samara, fern_fiddlehead, maple_sapling (rare) |
| Bog | sundew_rosette, flytrap_seedling, fern_fiddlehead |
| Trainers only | starter lines and the evolved forms |

The Field Herbarium should be completable to at least about 30 of the 37 in
the slice.
