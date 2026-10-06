# Chapter 5 plan: Cedarhallow and the Burnt Stand (DRAFT)

**Status:** draft for the owner's review. The open questions are in §7; each
has a recommended default.

Sources:
- the story bible: `docs/story/04-plot.md` Ch. 5, `02-world.md`,
  `03-characters.md` (Morrow), `05-key-plants.md`, `06-mechanics-in-world.md`;
- the Chapter 4 ending (Vale's call in `src/world/scripts/ch4.ts`).

## 1. Where Chapter 4 leaves us

Vale's last call:

> "Something under the valley answered your seed. … Have you heard of
> CEDARHALLOW? … The fire-cones opened there last week. And nothing was
> burning. … Something is waking up all the old seeds."

The player is in Glasshouse City with three Marks. The chapter is the
**turn from wonder to mystery** (04-plot.md): the first look at the Elder, and
the first time anyone says it's *frightened*.

## 2. Beats (fixed; the words are written later)

1. **The way north opens.**
   - Once `ch4_done` is set, the ranger at the far (north) end of
     **Sugarbush Grove** lets the player through: "the cedars have been
     restless."
   - That leads to **Route 6**, an old-growth rainforest route with a
     **canopy walkway**: raised boardwalks between giant trunks, with mist
     and moss.
2. **Cedarhallow.**
   - A town built among living cedars, with shrines inside hollow trunks.
   - It has a Greenhouse, a small market and the **Hollow** (a shrine inside
     the oldest cedar).
   - The Conservatory is shut: MORROW is "out at the Burnt Stand. He goes
     every night now."
3. **The Burnt Stand** (a short dungeon east of town): a fire-scarred forest
   of black trunks, fireweed and fresh green shoots.
   - **Rootstock grunts** are bagging the opened cones "for the doctor".
     This foreshadows Dr. Calloway, the forced-growth admin in Ch. 7, who
     isn't named yet.
   - **Rival battle 4:** BRAM.
     - His starter is at **stage 3, forced early under a graft collar**:
       the first time the player *sees* the collar mechanic.
     - He wins ugly or loses. Either way, the collar visibly hurts his
       partner, and he's angrier and less sure.
   - **The vision.** At the burnt heart, one sealed cone opens in the
     player's hands, then the still `fire_cone_vision`.
     - Pale trunks, all leaning toward the player.
     - Something vast beneath them, then gone.
     - This is the first image of the Elder.
   - **MORROW** is there in the dark, listening at a ghost pipe:
     > "You saw it too. … It isn't dreaming. It's *frightened*."
     He goes back to town.
   - The player finds **EMBER ASH** (×2), the first real use of the
     growth-item system (§4).
4. **The Hollow.** The shrine keeper (an old woman who tends the cedar
   shrines) recognises the vision.
   - She gives the **FOXFIRE LANTERN**, a jar of glowing fungus, which
     unlocks the **GLOW** field move.
   - Her line: "Fungi are the old roads. They'll light yours."
   - The Hollow's inner rooms are dark. They're optional: items, lore
     carvings, and a rare encounter, red cedar (§3).
5. **Conservatory 4: MORROW (Ghost).**
   - A **night garden** that is **dark** (GLOW required), lit only by
     glowing ghost pipes.
   - Puzzle: the safe path shows only within the lantern's light, and it
     shifts when levers swap which ghost pipes glow. In spirit it's
     Ecruteak's invisible floor; it must be provably solvable.
   - Two juniors, then MORROW.
   - **PIPE MARK** (`pipe_mark`).
   - Morrow, after the battle: the network is "a forest-wide nerve", and the
     Elder has been *listening* since the Long Bloom.
6. **Chapter end.**
   - Leaving the Conservatory with the Mark triggers Vale's call:
     - the **Lantern Tree** at **Saltmarsh Harbour** has gone dark;
     - Captain Reyes won't battle anyone until it's well;
     - "and someone's been asking about your seed at the docks."
   - Vale posts the **GLIDER SEED** to the Cedarhallow Greenhouse, so the
     player can **SEED GLIDE** south. The system is already built.
   - Then the TO BE CONTINUED card.

**Side quests (2):**
- **FIRE FOLLOWERS:** a forest ranger asks the player to record the plants that
  return after a fire (catch fireweed and the lodgepole line), using
  `ifCaught`.
- **SHRINE OFFERINGS:** take three things to the Hollow's dark side-shrines
  (GLOW, hidden items).

## 3. New species (proposed: 13; see Q1)

Rules:
- every line is a real plant at real life stages, and every Herbarium entry
  holds a sourced, true fact;
- art follows the Crystal rule.

| Line | Stages (ids) | Types (proposed) | Where | Growth | Real hook |
|---|---|---|---|---|---|
| Ghost pipe | `ghostpipe_stalk` → `ghostpipe_nodding` → `ghost_pipe` | ghost | Route 6 (night), the Hollow, Morrow's ace | 22 → 30 | No chlorophyll. It takes its food from fungi linked to tree roots: it literally feeds on the network. |
| Fireweed | `fireweed_fluff` → `fireweed_shoot` → `fireweed` | fire / bloom | Burnt Stand | 20 → 30 | It's the first plant back after a fire, and a single plant releases tens of thousands of downy seeds. |
| Lodgepole pine | `lodgepole_cone` → `lodgepole_seedling` → `lodgepole_pine` | wood / fire | Burnt Stand | **Ember Ash** → vigour 32 | Its cones are serotinous: sealed with resin and opened by fire. |
| Skunk cabbage | `skunk_cabbage_bud` → `skunk_cabbage` | fire / wood | Route 6 bog pockets | vigour 26 | It warms itself well above the air temperature (thermogenesis), melting snow around it. |
| Western red cedar | `cedar_seedling` → `red_cedar` | wood / ghost | the Hollow (rare) | vigour 34 | Long-lived and rot-resistant, and the "tree of life" to many Pacific Northwest peoples. Check any cultural claim carefully. |

Wild levels: Route 6 18–23, Burnt Stand 20–24, the Hollow 22–25.

**Trainers**
- **Morrow:** about 24 / 26 / 28 (ghostpipe_nodding, moonflower, ghost_pipe as
  the ace).
- **Rival 4:** about 24–28, with a graft-collared stage-3 starter.

Balance stays guarded by `balance.test.ts`: Morrow must be beatable with every
starter, a little easier than Flora's spike.

## 4. Systems

| System | What | State |
|---|---|---|
| **GLOW** | `MapDef.dark?: true`. With the FOXFIRE LANTERN the player sees about 3 tiles around them; without it, the map is near-black and an NPC says you need a light. Show the light radius as a soft round falloff in the GBC palette. Works with the existing night tint, lamps and window glows. The validator checks that required progress through dark maps happens only after the lantern is obtainable. | new (Codex) |
| **Graft collar** | Trainer team members can be `grafted: true`: forced to a higher stage early, with stats capped (e.g. computed as if 5 levels lower), a collar overlay on the battle sprite, and a line of battle text when it strains. Bible: "forces growth early but caps stats." | new (Codex mechanic; Claude art) |
| **Growth items** | Ember Ash opens `lodgepole_cone`. It's found ×2 in the Burnt Stand, not sold. Cold Snap stays reserved for Larchmere (Ch. 7). | built; only data and placement are needed |
| **SEED GLIDE** | The GLIDER SEED is given at the chapter end. Add Cedarhallow as a landing. | built; data only |
| **Uproot, trades, deferred types** | Not in Chapter 5 (see Q4 and Q5). | later |

## 5. New ids (contract additions; main adds them before work starts)

- **Maps (8):**
  - `route_6`;
  - `cedarhallow`, `cedarhallow_greenhouse`, `cedarhallow_market`;
  - `cedar_hollow` (dark rooms inside);
  - `burnt_stand`;
  - `cedarhallow_conservatory` (dark);
  - `cedarhallow_house` (the ranger: FIRE FOLLOWERS).
- **Items:** `foxfire_lantern` (key; FIELD_MOVES `glow`), plus placement of
  `ember_ash` and `glider_seed`.
- **Mark:** `pipe_mark` (UI art `mark_pipe`).
- **Characters:** `morrow`, `shrine_keeper`, `ranger`, `night_gardener` (a
  junior), `lumberjack` (route trainer) and `forager` (route trainer), plus
  the existing grunt, Bram and so on.
- **Portraits:** `morrow`, `night_gardener`, `lumberjack`, `forager`.
- **Music:** `cedarhallow` (hushed and reverent), `burnt_stand` (ashen and
  eerie), `hollow` (dark, with dripping water).
- **Stills:** `fire_cone_vision` (the Elder glimpsed), `morrow_listening`.
- **Tiles (about 16):**
  - old-growth trunk, moss, fern undergrowth (an encounter tile), the canopy
    boardwalk, its supports and rope rail;
  - burnt trunk, ash ground, charred log, fresh shoots (an encounter tile);
  - shrine floor, carved post, hollow-trunk wall, glow-pipe (lit or unlit,
    for the puzzle);
  - stepping roots.
- **Structures:** `cedar_house` (built into a trunk), `shrine_cedar` (the
  Hollow entrance), `night_conservatory`, and `cedarhallow_greenhouse`
  (reusing `greenhouse`).

## 6. Who does what (to save Claude usage; see AGENTS.md and ../delegate/)

**Phase 0 (Claude):** this plan, approved. Then the contract additions, `docs/CH5_IDS.md` (every NPC, script id, flag and trigger) and stubs, so everything compiles.

**Phase 1, in parallel:**
- **Codex** gets one brief each:
  - **GLOW** (engine plus validator, with procedural darkness, so no art is
    needed);
  - **the graft collar mechanic** (battle logic and balance hooks, with a
    placeholder overlay);
  - **species data** for the 13: stats, learnsets, moves and pollination.
    Claude writes the facts brief, and Codex fills in the numbers and
    passes the balance test.
- **Claude:**
  - all art: 13 species, about 16 tiles, 4 structures, 6 characters, 4
    portraits, 2 stills, the Mark, the collar overlay and item icons;
  - the three music tracks are audio. Claude composes them in the existing
    chiptune style; Codex shouldn't.

**Phase 2:**
- **Codex** gets one brief each:
  - **map drafts** for the 8 maps against `CH5_IDS.md`, passing the validator
    (reachability, no soft-locks, and the dark/lantern gating);
  - **the Conservatory 4 puzzle** plus its solvability test.
- **Claude** writes all the story and quest scripts and dialogue (the voice
  matters) and the Herbarium text.

**Phase 3:**
- **Claude** does the visual polish pass on every map in the browser.
- **Codex** extends the e2e through Chapter 5 to the new end card.
- **Claude** integrates: `npm run e2e` must pass, then push.

## 7. Open questions (recommended default first)

1. **Roster size: 13 new species?** *Recommended: yes.* The ghost pipe,
   fireweed and lodgepole lines are bible commitments; the skunk cabbage and
   red cedar fill the old-growth. *Alternative:* drop the skunk cabbage (11),
   saving about 15% of the art work.
2. **The graft collar in Chapter 5?** *Recommended: yes.* It gives Bram's arc
   a visible beat now, and the mechanic pays off when he removes it (Act 2/3).
3. **The GLIDER SEED at the end of Chapter 5?** *Recommended: yes.* Chapter 6
   starts at Saltmarsh Harbour, far south; this mirrors getting Fly before
   Cianwood.
4. **Uproot and the trade NPC:** *Recommended: defer to Chapter 6.* Driftseed
   Isle's cliffs suit Uproot, and the harbour market suits a trade NPC.
5. **The deferred types (Poison, Psychic, Dark):** *Recommended: keep 9 types
   through Act 2.* Revisit before the Council (Act 3), as the bible intends.
6. **Morrow's puzzle:** *Recommended: the lantern-light path with lever-swapped
   ghost pipes.* *Alternative:* a dark maze with moving "listening" NPC
   ghost-gardeners, in the spirit of trainer sight lines.
