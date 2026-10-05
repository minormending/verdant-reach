# Crystal-rule rollout: all 65 species (6 agents)

**User direction:** after reviewing the pilot ([CRYSTAL_PILOT.md](CRYSTAL_PILOT.md),
`tools/art/review/crystal_pilot.png`), the user said: "Yes, push and continue."

## What was decided from the pilot

1. **Every species gets a per-species entrance animation** (`anim.intro`, and
   optionally `anim.idle`). This was the clearest win.
   - 3–6 front frames; the signature part moves.
   - The intro lasts about 0.6–1.2 s and ends on frame 0.
2. **The Crystal palette rule becomes the default.**
   - Index 0 is `#181818` and is a **full black outline** (no selout).
   - Indexes 1–2 are the species' two tones; index 3 is the shared white
     `#f8f8f8`, used for highlights only.
   - Shading is flat and bold.
   - `sport` swaps only indexes 1–2.
3. **Exceptions are allowed when a plant's identity needs a third hue.**
   - The sunflower's brown disc is the proven case.
   - An exception keeps a **species-specific light tone in index 3**, but
     follows everything else: full black outline, flat bold shading,
     highlight discipline and the animation.
   - Every exception is justified in `notes` and approved by the Director.
     Expect only a few, such as the sunflower and perhaps the chili.
4. **Lessons from the pilot artists. Apply them.**
   - When there's no dark green, a second hue in the dark slot shades the
     body: the flytrap's red, the oak's bark brown. That's how a two-tone
     plant keeps both hues.
   - Large dark areas go flat and blobby. Break them with 1px white rims on
     lit edges, black splits, and more of the light tone.
   - **Watch out for accidental faces.** A black disc with a white glint
     reads as an eye, and a black rib reads as a mouth. Faces are forbidden
     (decision Q3); check every frame at 1x.
   - The 56x56 box must fit the *largest* animation frame. Plan the pose for
     the biggest gesture.
   - Backs and icons need at least 3% white; fronts need 5–20%.
   - Treat the "one part moves" check as guidance, not law, for plants where
     the head is most of the body.

## Process

- **Back up first.** Before any base bundle changes, the Director snapshots
  every current species bundle into **`public/art/packs/classic/`** (all 65
  species, `source.kind: "imported"`). The old look stays one URL away
  (`?art=classic`), and rollback is trivial.
- **Then redraw the base.** New art is written into
  `public/art/species/<id>/`, the real game art, by new generators in
  `tools/art/crystal/<line>.py`. They use the shared kit
  `tools/art/crystal/kit.py`, which the Director promotes from
  `tools/art/pilot_crystal/common.py`; it writes **base** bundles.
- **Retire the old builders.** The Director swaps the old species builders
  (species_a–f) out of `tools/art/build_all.py` BUILDERS for the new
  `crystal` builder, so a `--regen` never reverts the redraw. The old
  generators stay in the repo as reference.
- **Keep identity.** Keep species ids, sizes, size classes, pose vocabulary
  (docs/CREATURES.md) and each line's motif and accent, so every creature is
  clearly the same species, redrawn. Keep each line's real-cultivar sport
  from docs/SPORTS.md, re-expressed in two tones; the artist updates the
  SPORTS.md row.
- **Never copy, trace or import Nintendo/Game Freak sprites.** The reference
  is for principles only.

## Owners

| # | Agent | Lines (species) | Port |
|---|---|---|---|
| 1 | **Director** | (a) the `classic` snapshot, **first, within about 15 minutes**; then tell main. (b) Promote the pilot kit to `tools/art/crystal/kit.py` (it writes base bundles) and swap BUILDERS. (c) **Promote the pilot oak and flytrap lines into base** and delete the `crystal` pilot pack afterwards. (d) The **sunflower line as the first exception**: rework the current sunflower art (`species_a/sunflower.py`) to the rest of the rule (full black outline, flat shading, highlights) with its own palette, and give it the pilot's intros. (e) Update **docs/CREATURES.md** with the rule, the exceptions and an animation section. (f) Approve or deny exceptions. (g) Make a **final roster review sheet** of all 65 (1x and 4x, silhouettes, a white-share table) and a consistency pass. | 5241 |
| 2 | **Artist A** | chili (chili_blossom, green_chili, red_chili), lily (lily_seedpod, lily_pad, giant_water_lily), dandelion (dandelion_bud, dandelion, dandelion_clock), bramble (bramble_blossom, bramble_berry, blackberry): 12 | 5242 |
| 3 | **Artist B** | pumpkin (pumpkin_blossom, green_pumpkin, pumpkin), fern (fern_fiddlehead, unfurling_fern, ostrich_fern), maple (maple_samara, maple_sapling, sugar_maple), sundew (sundew_rosette, sundew): 11 | 5243 |
| 4 | **Artist C** | nettle (nettle_sprout, stinging_nettle), moonflower (moonflower_seed, moonflower_vine, moonflower), clover (clover_sprout, white_clover), cattail (cattail_shoot, cattail), foxglove (foxglove_rosette, foxglove): 11 | 5244 |
| 5 | **Artist D** | holly (holly_seedling, holly), mint (mint_sprig, peppermint), rose (rose_bud, wild_rose), pitcher (pitcher_sprout, pitcher_plant), snapdragon (snapdragon_sprout, snapdragon): 10 | 5245 |
| 6 | **Artist E** | apple (apple_pip, apple_sapling, apple_tree), orchid (orchid_keiki, orchid_spike, moth_orchid), monstera (monstera_cutting, monstera), lotus (lotus_seed, sacred_lotus), bird of paradise (paradise_shoot, bird_of_paradise): 12 | 5246 |

**Artists**
- Design and draft right away, but **write into `public/art/species/` only
  after main says the classic snapshot has landed.**
- Write your lines as modules in `tools/art/crystal/` (one file per line).
- Run `npm run art:index` after adding or renaming files.
- Compare your work with the other artists' and with the pilot's
  oak and flytrap. The roster must read as one game.

## Rules for every agent

- **Process safety: stop only processes you started yourself.** Never kill
  a process by port or PID unless you launched it. Twice this week an
  agent killed the Claude app's network helper that way. If a port is busy,
  pick another free port.
- Contracts are frozen; ask main via SendMessage. To reach another agent,
  SendMessage main, who relays. No git commits.
- Use your own port and your own browser tab, adding `?timer` when the pane
  is hidden. Stop your server and close your tab at the end.

## Done means

- `npm run typecheck` and `npm test` are green, including the bundle checks.
- `tools/art/build_all.py --regen` reproduces the base species bundles
  byte-identically.
- Every species has `anim.intro`.
- Each artist has seen each of their species **in the real game**: a battle
  intro, the party and the Herbarium. They also checked it in the Art Lab
  Compare tab against `classic` (`#compare/<id>/classic`).
- Final report (under 300 words): what changed, any exceptions taken and
  why, and the weakest sprites.
