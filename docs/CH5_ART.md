# Chapter 5: the art and writing pass (6 Claude agents)

Branch **`ch5`**. The code is done (CH5_IDS.md). This pass replaces every
placeholder and stand-in with real art, music and words. **The lead (main)
made the design calls below.** Agents make craft choices within them; if a
call is impossible, say so in the final report rather than inventing around it.

**Done means (the whole team):**
- `npm run release-check` → `release-check: OK` (today it lists every
  placeholder bundle and every `TODO(text)` line: that list is the checklist);
- `npm run typecheck`, `npm test` and `npm run build` pass;
- `npm run e2e` passes **without** `--allow-placeholders` (main runs the final one).

Contracts are already extended (`src/contracts/ids.ts`, `constants.ts`):
15 tiles plus `glow_pipe`, 5 structures, 7 characters, 4 portraits, 3 music
ids (temporary aliases in `src/audio/music.ts`), 2 stills, `mark_pipe`.
They are **frozen**: if you need a change, say so in your final report.
`src/art/bundles.test.ts` fails until every new id has art; it is the art
checklist.

## Rules for every agent

- **Edit only what you own** (table below); read anything.
- **No git commits.** Main reviews and commits.
- **Process safety:** stop only processes you started yourself. **Never** kill
  a process by port or PID otherwise (agents have killed the desktop app's
  network helper this way).
- **Your own port** for `npm run dev -- --port <port> --strictPort`, and stop
  that server when you finish. `npm run e2e` binds a free port itself; pass
  `--report e2e/report-<you>.json` so parallel runs don't overwrite each
  other (delete your report file when done).
- After adding, removing or renaming anything under `public/art/`, run
  `npm run art:index`. Generators must be deterministic:
  `.venv/bin/python tools/art/build_all.py --regen` must reproduce your
  bundles byte-identically (register new builders in `BUILDERS`).
- **Look at your work in the real game**, not just in isolation, and critique
  it against docs/STYLE.md (and docs/CREATURES.md for creatures).
- Never copy, trace or import Nintendo or Game Freak sprites.
- **Final report** (under 350 words): what changed, what's unfinished, and
  notes for the other owners.

## Owners

| # | Agent | Owns | Port |
|---|---|---|---|
| A | **Creatures: ghostpipe + fireweed** | `tools/art/crystal/ghostpipe.py`, `fireweed.py`; the 6 species bundles; their rows in docs/SPORTS.md; their `WHITE_PARTS`/`EXCEPTIONS` entries in `tools/art/crystal/kit.py` | 5251 |
| B | **Creatures: lodgepole, skunk cabbage, cedar** | `tools/art/crystal/lodgepole.py`, `skunk_cabbage.py`, `cedar.py`; the 7 species bundles; their SPORTS.md rows | 5252 |
| C | **Environment + map pass** | new tilesets and structures (`tools/art/env5/`, bundles in `public/art/tilesets/`, `public/art/structures/`); the **layout, legend, structure and NPC `sprite` fields** of the 8 Chapter 5 map files and the Sugarbush Grove exit; `src/overworld/` only if a tile needs render support (say so) | 5253 |
| D | **Cast: characters, portraits, stills, icons** | 7 character bundles, 4 portraits, 2 stills, `mark_pipe`, the `foxfire_lantern` icon (and any other Chapter 5 item without an icon); `tools/art/cast5/`; the graft-collar overlay drawing (`src/battle/hud.ts`, its one function, and `hud.test.ts`); the **`portrait`** fields of Chapter 5 trainers in `trainers.ts` | 5254 |
| E | **Writer** | every `TODO(text)`: `src/world/scripts/ch5.ts`, the Chapter 5 parts of `quests.ts`, the text fields of Chapter 5 trainers in `trainers.ts` (`name`, `class`, `intro`, `defeat`, `after`), and **string literals only** in the Chapter 5 map files (signs, flavour); the still ops in ch5.ts; review the 13 Herbarium entries in `src/data/` for voice (facts stay) | 5255 |
| F | **Composer** | `src/audio/`: write `cedarhallow`, `burnt_stand` and `hollow` (replace the aliases), `ambienceFor`, `MUSIC_TRIM`, and the audio tests | 5256 |

**Shared files.** `trainers.ts`: D edits `portrait`, E edits the text fields.
Chapter 5 map files: C edits layout and sprites, E edits only string
literals. **Re-read before every edit and keep edits surgical**; never
reformat a shared file.

## Design calls

### Creatures (A, B)

The Crystal rule binds (AGENTS.md, CREATURES.md § Crystal rule): #181818
outline, two species tones (the second hue in the dark slot), #f8f8f8 for
highlights only, the white share 5–20%, an `anim.intro` that moves the
signature part, no faces, stage 1 small and the final stage filling 56. Copy
the structure of a similar existing line module and run
`.venv/bin/python tools/art/crystal/build.py <line> --sheet`, with errors at 0.

| Line | Look (real plant, real life stages) | Tones (mid, dark) | Signature motion | Sport |
|---|---|---|---|---|
| ghostpipe | stalk: one bent white stem with scale leaves, pushing out of leaf litter · nodding: a hooked stem with one nodding bell · ghost_pipe: a clump of 5–7 waxy stems whose heads lift upright (they do as they fruit) | cool pale lilac-grey, dusky violet-grey | the nodding heads lift and sway | the natural **pink form** of *Monotropa uniflora* |
| fireweed | fluff: a downy seed tuft on a split pod · shoot: a reddish leafy shoot with closed buds · fireweed: a tall spike, magenta flowers opening bottom-up, plumes of seed at the top | magenta-pink, deep red-violet (the stem) | seed fluff drifts off the plant | the white-flowered **f. albiflorum** |
| lodgepole | cone: a closed, resin-sealed cone on ash · seedling: a whorl of first needles · pine: a tall, very straight, narrow pine | needle green, bark/cone brown (dark slot) | the cone scales crack open; needles shiver | **'Chief Joseph'** (golden winter needles) |
| skunk cabbage | shoot: a mottled hooded spathe in snowmelt · skunk_cabbage: the hood among big bright leaves | leaf green, maroon spathe mottling (dark slot) | a heat shimmer / steam curl rising off the hood (white highlight only) | a greenish-yellow spathe form; if no real one can be named, say so and keep it close to source |
| cedar | seedling: flat scale-leaf sprays on a thin stem · red_cedar: a huge buttressed trunk with drooping sprays, fibrous red bark | spray green, red-brown bark (dark slot) | the sprays droop and lift like breathing | **'Zebrina'** (yellow-banded foliage) |

- **Ghost pipe is genuinely white**: add the 3 ghostpipe ids to `WHITE_PARTS`
  (up to 35%) with a `WHITE:` note. The white must stay waxy and shaded, not
  a flat blob; the dark slot carries the form.
- No other exceptions without asking main.
- `species.json` notes must describe the art (never start with PLACEHOLDER).
  Set `source` so `--regen` owns the bundle.

### Environment (C)

Match the existing GBC environment style (look at `tools/art/env4/` and the
nature/town tilesets). Each tileset is a new bundle: **`oldgrowth`** (Route 6
and town ground), **`burnt`**, **`hollow`** (the Hollow and Conservatory 4).

| Tile | Look |
|---|---|
| `oldgrowth_tree` | massive cedar and fir trunks with a dark, layered canopy; autotile group `oldgrowth` (edges on the open sides, like `tree`) |
| `moss`, `fern_brush` | deep-green mossy floor (`~1..3` alts); waist-high sword ferns (2-frame sway like `tall_grass`) |
| `canopy_boardwalk`, `canopy_drop`, `rope_rail` | weathered planks high in the trees; a dim, misty drop to the forest floor below (autotiled edges); a rope-and-post rail |
| `ash`, `burnt_trunk`, `charred_log`, `fresh_shoots` | grey ash ground with ember flecks (alts); black snags with cracked silver bark; a charred log; bright green fireweed shoots in ash (2-frame) |
| `shrine_floor`, `hollow_wall`, `carved_post` | worn, ring-patterned heartwood floor; the inner wall of the living trunk (autotiled); a carved cedar post with a small offering ledge |
| `ghostpipe_clump`, `glow_pipe` | pale ghost pipes, unlit; the same clump glowing (2-frame shimmer). `glow_pipe` lights a dark map like a lamp post |
| `night_floor` | dark slate flagstones for the night conservatory |

| Structure | Look |
|---|---|
| `cedar_house` 4×4 | a plank house built into the base of a living cedar, moss on the roof |
| `hollow_trunk` 5×5 | the oldest cedar: a vast fluted trunk with a carved doorway at its foot and offering ribbons |
| `night_conservatory` 6×4 | a dark-framed glasshouse, panes faintly lit pale blue from inside |
| `giant_cedar` 3×4 | a landmark cedar (scenery) |
| `camp_tent` 3×2 | a drab Rootstock canvas tent with the Rootstock mark |

**Map pass.** Swap every stand-in for the new art, keeping each map's
gameplay: the same warps, triggers, NPC positions where scripts depend on
them, encounter areas (`fern_brush` / `fresh_shoots` keep encounter kind
`grass`), and puzzle logic.
- route_6: `oldgrowth_tree` mass, `moss`, `fern_brush`. The canopy walkway
  as the spine (`canopy_boardwalk` over `canopy_drop` with `rope_rail`; it may
  replace the boardwalk-over-bog section, but keep the 1 bog pocket).
- cedarhallow: `cedar_house` for the ranger's house and others,
  `hollow_trunk` for the Hollow (it replaces `house_large`), `night_conservatory`,
  `giant_cedar` for the `big_oak` stand-ins, and moss ground.
- cedar_hollow: `shrine_floor`, `hollow_wall`, `carved_post` side-shrines (they
  replace `sensor_post`), and `ghostpipe_clump` decoration. The encounter area
  is a mossy inner court of `fern_brush`. Keep the 2 entrance-hall light
  sources (`lamp_post` may become `glow_pipe`).
- burnt_stand: `ash`, `burnt_trunk`, `charred_log`, `fresh_shoots`, a
  `camp_tent`, and `cone_sack` NPC objects at the camp (sprite `cone_sack`).
- cedarhallow_conservatory: `night_floor`. The lights may become `glow_pipe`.
- **NPC sprites:** `morrow_bs` and Morrow → `morrow`; shrine keeper →
  `shrine_keeper`; the cedarhallow_house ranger and Sugarbush's
  `grove_ranger` → `ranger`; the route_6 lumberjacks → `lumberjack`; the
  foragers → `forager`; the conservatory juniors → `night_gardener`.
- **Keep green:** the world validator (reachability, GLOW lamp-lit paths before
  the lantern), `puzzles.test.ts` (Conservatory 4), the glide landing, and
  `npm run e2e -- --allow-placeholders` (73 beats). If you move anything the
  e2e walks to, check its report.

### Cast (D)

Match the existing character sheets (48×64, 4 rows × 3 frames) and portraits
(56×56). Look at `tools/art/cast4/`.

| id | Look |
|---|---|
| `morrow` | tall and quiet; a long charcoal coat with a high collar, silver hair tied back, a sprig of white ghost pipe pinned at the collar |
| `shrine_keeper` | an old woman: a cedar-red shawl, white hair in a bun, a walking staff |
| `ranger` | olive ranger uniform, flat-brimmed hat |
| `lumberjack` | red-and-black check shirt, beanie, beard, an axe over the shoulder |
| `forager` | headscarf, green apron, a basket of mushrooms |
| `night_gardener` | a junior in dark blue overalls with a small glowing jar |
| `cone_sack` | a burlap sack of cones, tied at the neck (static object) |

- **Portraits:** `morrow`, `lumberjack`, `forager`, `night_gardener`. Then set
  the `portrait` of `morrow`, the lumberjacks, the foragers and the juniors in
  `trainers.ts`.
- **Stills (160×144):**
  - `fire_cone_vision`: pale trunks all leaning toward the viewer, a vast
    dim shape beneath the roots, about to vanish. Eerie, not monstrous; the
    first image of the Elder (it must not have a face);
  - `morrow_listening`: Morrow kneeling in the burnt stand at night, his ear
    to a clump of glowing ghost pipes.
- **`mark_pipe`** (16×16): a ghost-pipe flower, in the style of the other marks.
- **`foxfire_lantern` icon:** a jar of glowing green-white fungus. Also check
  `ember_ash` and `glider_seed` have icons.
- **The graft collar:** replace the placeholder band in `src/battle/hud.ts`
  with a real overlay: a dark leather and brass collar with a wire splint,
  drawn procedurally across the lower third of the front sprite. Keep it in
  one function and update `hud.test.ts`.

### Writer (E)

The voice is docs/STYLE.md: warm and concise, with an 18-column × 2-line box
(the validator checks the fit) and UPPER-CASE names. The beats and the key
lines are fixed in CH5_PLAN.md §2. Use them, especially:
- the shrine keeper: *"Fungi are the old roads. They'll light yours."*;
- Morrow: *"You saw it too. … It isn't dreaming. It's frightened."*

Morrow is quiet and exact; after his battle he calls the network "a
forest-wide nerve" and says the Elder has been listening since the Long Bloom.
BRAM is angrier and less sure, and the collar visibly hurts his partner. The
grunts bag cones "for the doctor" and never name him. Vale's call is listed
in CH5_IDS.md §F.

- Replace the `relay_pulse` stand-in with `fire_cone_vision` in `ch5_vision`,
  and show `morrow_listening` when the player first meets Morrow at the
  burnt stand (`ch5_morrow_burnt`), then `stillClear` before the lines.
- Trainer names, classes (LUMBERJACK, FORAGER, NIGHT GARDENER, WARDEN for
  Morrow) and their intro, defeat and after lines.
- Signs and flavour in the map files (string literals only).
- No cultural or medicinal claims about cedar.
- Finally, run `npm run e2e -- --report e2e/report-writer.json` **without**
  `--allow-placeholders` (once C's map pass is in, if you can tell; otherwise
  main reruns it).

### Composer (F)

Original chiptune in the existing arrangement format (`src/audio/music.ts`,
`arrange.ts`), looping seamlessly:
- `cedarhallow`: hushed and reverent; a slow, modal town theme among giant
  trees (try D dorian or A aeolian, a soft pad, and sparse bells);
- `burnt_stand`: ashen and eerie; quiet and unresolved, with a heartbeat
  low in the mix and a melody that keeps stopping short;
- `hollow`: dark, with dripping water (sparse high plinks on an irregular
  pattern), a drone, and slow inner-voice movement.
- Set `ambienceFor` (cedarhallow: town by day, night at night; burnt_stand:
  forest; hollow: none) and `MUSIC_TRIM` so the loudness matches the others
  (see mix.ts and its test). Keep the audio tests green and add a case each.
