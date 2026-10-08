# Creatures v2: the modern style (replaces the Crystal rule)

**The owner's decision (2026-10-08):** the creatures leave the 4-colour GBC
"Crystal rule" and are redrawn in a modern 16-bit style that sits naturally
in LimeZu's world. These are the lead's binding rules. Creature art is
**ours** (original, public), never LimeZu's.

Everything that made the roster work stays:
- real plants at real life stages;
- no faces;
- a signature motion per line;
- sports based on real cultivars;
- deterministic generators;
- QA-gated iteration.

## 1. Canvas and sizes (the 320×180 screen)

| Sprite | v1 (GBC) | v2 |
|---|---|---|
| front (the foe side, faces left) | 56×56 | **64×64** |
| back (the player side) | 48×48 | **64×64** |
| party icon (2 frames) | 16×16 | **32×32** |

**Size classes** on the 64 canvas (the largest bounding-box dimension and
the fill of opaque pixels over 4096):
- baby (stage 1 of 3) is 42–50, at 20–36%;
- teen (stage 2 of 3, or stage 1 of 2) is 50–58, at 26–46%;
- adult (the final stage) is 58–64, at 36–60%, touching at least 2 edges.

**Grounding:** the lowest opaque row is 61–63, bottom-centred, with the
centre of mass slightly right of centre (the plant leans toward the foe).

## 2. Palette and outline

- **Up to 16 colours** per species (all frames share one palette), with
  binary alpha. There is **no fixed palette size**: use what the plant
  needs.
- **Outline:** a dark, slightly warm outline (#2a2230 by default), *not*
  pure black.
  - **Selective outlining** is allowed and encouraged: where the outline
    meets a lit fill, it may lighten to a dark shade of that fill
    (sel-out).
  - Interior lines use the darkest shade of the material, not the outline
    colour.
- **Shading:** light from the top-left.
  - Each material (leaf, petal, bark, fruit) has a ramp of **3–4 tones**,
    **hue-shifted**: shadows cooler and more saturated, highlights warmer
    and lighter.
  - No pillow shading (lighting the edges and darkening the centre).
  - Dithering is allowed only as a deliberate texture (bark, moss), never
    as a gradient.
- **Highlights:** a near-white specular (#f4f0e6) only on glossy parts
  (wet leaves, berries, glass-like petals), with 1–3 small clusters.
  There's no white-share rule any more.
- **Harmony with LimeZu:**
  - match its saturation and value range: mid-saturated greens, warm
    browns, soft shadows;
  - avoid neon and pure primaries.
  The QA suite gets a **palette harmony check** comparing each species'
  palette to the gamut of LimeZu's exterior palette (`Palette.png` in the
  exteriors pack, read locally) and warning on outliers.

## 3. Form

- **Real plant, real stage.** The bar is the same as v1, and the Herbarium
  facts stay.
- **Readable at 1×:** strong silhouettes and one clear focal part (a
  flower, a fruit, a trap, a cone). Avoid fussy single-pixel noise; clusters
  of 2 px or more read better.
- **No faces, ever** (decision Q3). Dark dots near highlights read as eyes,
  and dark slits as mouths; `face_risk` stays an error check.
- **Pose and personality:** plants "act" through posture: leaning,
  coiling, reaching, drooping. Keep each line's v1 pose language (the pose
  vocabulary in CREATURES.md v1).
- **Backs:** the same plant seen from behind and slightly above, larger in
  frame (fill 45–75%), cropped at the bottom like the v1 backs.

## 4. Animation

- `anim.intro`: 36–72 ticks, ending on frame 0. The **signature part
  moves** (the flytrap snaps, the fern uncurls, the ghost pipes lift).
- `anim.idle`: a gentle 2–4 frame loop (sway, breathe), optional.
- **Up to 8 front frames.** Moving regions are declared, as in v1.

## 5. Sports (shinies)

- A sport is a **recolour of named materials** (for example the petals or
  the leaves), defined as a map from palette colours to colours in
  `species.json` (`sport: { "#rrggbb": "#rrggbb", … }`). The outline and
  untouched materials don't change.
- Still **based on a real cultivar or natural colour form**
  (docs/SPORTS.md). Rewrite the table for v2 as each line is redrawn.

## 6. Pipeline and QA

- **Generators:** `tools/art/creatures2/<line>.py` (deterministic,
  registered in BUILDERS), with `kit2.py` providing ramps, an outline
  pass, sel-out, shading helpers and the checker.
- **`qa.py`, v2 mode:**
  - colour count ≤ 16;
  - outline not pure black;
  - size classes per §1;
  - grounding;
  - `face_risk`;
  - `anim_signature`;
  - `clone_risk`;
  - `silhouette_noise`;
  - palette harmony (a warning).
- **The loop** (proven in Chapter 6): Codex draws against the QA, then the
  lead runs blind-ID twice and takes one compact 3× look, followed by one
  feedback round.
- **The old art** stays reachable as `?art=classic`, and the current GBC
  Crystal art moves into a `crystal` pack.

## 7. Rollout

1. **R5a, engine:** 64×64 front and back and 32×32 icons; battle and menu
   layouts use the new sizes; the art bundle format v2 (any palette, sport
   maps); the QA suite's v2 mode; kit2.
2. **R5b, pilot:** the three starter lines (oak, chili, water lily), so
   the most-seen creatures set the bar. The lead reviews closely.
3. **R5c onward:** the roster, line by line in batches, in chapter order.
   The lead reviews one sheet per batch.
