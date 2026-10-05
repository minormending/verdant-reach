# Crystal-rule pilot: 3 lines, as an art pack

**User direction.** The user shared a sheet of Pokémon Crystal battle sprites
and asked what we can learn from them and how to make our creatures look
similar. They then said: "run the pilot with agents".

**Question this pilot answers:** do our creatures look better under
Crystal's palette and animation discipline? It's a pilot, so it ships as
the **`crystal` art pack** (`?art=crystal`) and never touches the base art.
The user compares the two side by side and decides whether the whole roster
follows.

**Lines:**
- oak: `oak_acorn`, `oak_sapling`, `great_oak`;
- flytrap: `flytrap_seedling`, `young_flytrap`, `venus_flytrap`;
- sunflower: `sunflower_seedling`, `sunflower_bud`, `sunflower`.

These are deliberately the hardest cases: a green-on-green tree, a red-mouthed
carnivore and a yellow flower whose identity *is* its light tone.

## What Crystal does that we don't (the rules for this pilot)

### Rule 1. Shared black and white; the species owns two colours

| Index | Role | Colour |
|---|---|---|
| 0 | Outline, deepest crevices and cast shadow | **always `#181818`** |
| 1 | The species' dark tone: shading and secondary hue | the species' choice |
| 2 | The species' light tone: the body hue, usually most of the sprite | the species' choice |
| 3 | Highlights | **always `#f8f8f8`** (shared white) |

- **White is a highlight, not a body colour.**
  - Use it for specular shine on glossy parts (acorn caps, flytrap lobes,
    seeds), dew drops, light rims on petal and leaf edges, and the paper
    white of a genuinely white part.
  - Aim for roughly 5–20% of the opaque pixels, and use it to make the form
    *pop*.
- **The hue lives in indexes 1–2.**
  - A yellow sunflower puts yellow in 2 and a deep gold or brown in 1. Find
    the second hue by hue-shifting (warmer and darker), not by greying.
  - A two-hue plant such as the flytrap (green body, red trap) has to choose.
    The dark slot can carry the second hue: red lobes in index 1, lit by
    index 2 green rims, which is how Crystal handles two-tone species.
- **Shading is flat and bold.**
  - Light comes from the top-left.
  - Use 2 tones per form, with black for the deepest folds and cast shadows.
  - No pillow shading, no dither noise, and no orphan pixels.
- **The `sport` swaps only indexes 1 and 2.** Indexes 0 and 3 stay
  `#181818` and `#f8f8f8`. Keep each line's real cultivar from
  docs/SPORTS.md, re-expressed in two colours.
- **This is a redraw, not a recolour.** A mechanical remap washes out, so
  design the clusters for this palette from scratch.
  - Keep the creature recognisably the same species.
  - Keep the pose vocabulary and size class from docs/CREATURES.md, and the
    silhouette identity, so the user can compare like with like.

### Rule 2. A per-species entrance animation

Crystal gives each species its own short sequence: 2–10 frames, usually
moving **one part** (a mouth, a tail, a bulb), played once when it appears.
That's personality, not just "alive".

- **Frames:** 3–6 front frames (`front`, `front__2` … up to `front__8`), with
  the same registration. Only the signature part moves; the rest of the body
  stays pixel-identical between frames.
- **`anim.intro`:**
  - lasts about 0.6–1.2 s (36–72 ticks) and ends on frame 0;
  - uses timing for character: holds, anticipation, a snap.
- **`anim.idle`:** optional and subtle, e.g. hold frame 0 for about 40 ticks,
  then a 1-frame twitch.
- **Gestures** to start from (artists may find better ones):

| Line | Stage | Gesture |
|---|---|---|
| oak | acorn | the cap tips up, a peek, then it snaps down |
| oak | sapling | branches flex like arms bracing |
| oak | great oak | the crown heaves and leaves shiver, then it settles |
| flytrap | seedling | tiny traps yawn open |
| flytrap | young | a lunge, then a snap |
| flytrap | Venus flytrap | the jaws gape wide, hold, then **SNAP** with the cilia bristling |
| sunflower | seedling | the cotyledons spread |
| sunflower | bud | the bud swells and cracks a sliver of yellow |
| sunflower | sunflower | the head lifts and turns to face the foe, the petals flare and the disc gleams |

### Rule 3. Back sprites and icons follow Rule 1

- **Back sprites** are bold and simple.
- **Icons** are 2 frames and read clearly at 16x16 with the shared white.

## Format (see docs/ART.md section 3, which now documents `anim` and up to 8 front frames)

Pack bundles live in `public/art/packs/crystal/species/<id>/`.
- Each has a `species.json` with `palette`, `sport`, `frames` (all files
  supplied in the pack folder), `anim`, `notes` (the gesture and what was
  learned), `credits` and `source`.
- `pack.json` gives the pack's `name` "CRYSTAL RULE (PILOT)" and a
  description.
- Run `npm run art:index` after adding files.
- **Never copy, trace or import any Nintendo/Game Freak sprite.** The
  reference sheet is for studying principles only. The game is public on
  GitHub Pages.

## Owners

| # | Agent | Owns | Port |
|---|---|---|---|
| 1 | **Animation runtime** | `src/art/` (the registry exposes `speciesAnim`; the validator and bundles test accept 1–8 front frames and check `anim`), the Art Lab (an intro play button and a timeline); `src/screens/kit/idle.ts` and `draw.ts`, `src/battle/` and `src/screens/herbarium.ts` (play `intro` on battle entry, for the foe and the player's send-out, and on Herbarium page open, then `idle`; legacy ping-pong when there's no `anim`); and a **comparison dev route**, e.g. `?dev=art` gaining a "compare" view that shows the base and the `crystal` pack side by side at 1x/2x/4x with intros playing | 5231 |
| 2 | **Oak line** | `public/art/packs/crystal/species/{oak_acorn,oak_sapling,great_oak}/`, `tools/art/pilot_crystal/oak.py` | 5232 |
| 3 | **Flytrap line** | `public/art/packs/crystal/species/{flytrap_seedling,young_flytrap,venus_flytrap}/`, `tools/art/pilot_crystal/flytrap.py` | 5233 |
| 4 | **Sunflower line, plus pack lead** | `public/art/packs/crystal/species/{sunflower_seedling,sunflower_bud,sunflower}/`, `tools/art/pilot_crystal/sunflower.py`, **`public/art/packs/crystal/pack.json`**, the shared `tools/art/pilot_crystal/build.py` and `common.py` (palette constants and a rule checker that all three artists use) | 5234 |

- Agent 4 publishes `common.py` early (in the first ~15 minutes), with the
  Rule 1 checker: indexes 0 and 3 fixed, a white share between 5 and 20%,
  2 frames' registration identical outside the moving part, and so on.
  Agents 2 and 3 use it.
- Artists compare their lines with each other's: the three lines must look
  like one game.
- Contracts are frozen. Ask main via SendMessage. No git commits.

## Done means

- `npm run typecheck` and `npm test` are green, including the bundle checks
  on the pack.
- Each artist has seen their line **in the real game** with `?art=crystal`:
  in battle (with the intro playing), in the party and in the Herbarium.
  They also compared it in the comparison view against the base art, and
  iterated until it's clearly the best version of the rule they can make.
- Each artist's final report (under 300 words) gives a recommendation for
  rolling it out to the roster, and is **honest about where the rule hurts**.
