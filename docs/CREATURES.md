# Creature art direction (Round 3)

Owner: agent 1 (Creature Director). Artists 2–5 follow this and **re-read it
every hour or so**: it is updated as the starters land (they become the
reference set). The rules in [STYLE.md](STYLE.md) §1–2 still apply; this file
makes them concrete.

**The problem we are fixing:** the current sprites are clean, but they read
as *specimens*: centred, upright, symmetrical, lit like a seed-catalogue
illustration. A creature has a **stance**, a **line of action** and a
**focus** (the foe). If you mask the colours out and it could be a botanical
plate, it is not done.

Reference sheets (all at 4x unless noted):

| Sheet | Shows |
|---|---|
| [creatures/palette.png](creatures/palette.png) | 4-colour ramps: good hue-shifted ramps vs grey-shifted ones, double-duty colours, when white is allowed |
| [creatures/outline.png](creatures/outline.png) | outline, pixel-perfect curves, selout, internal lines, weighted contact line |
| [creatures/poses.png](creatures/poses.png) | the 6 named poses as silhouettes with their line of action |
| [creatures/anatomy.png](creatures/anatomy.png) | plant part → body part mapping, 3/4 view, specimen-vs-creature comparison |
| [creatures/idle.png](creatures/idle.png) | idle frames: what may move, what may not, and the diff overlay |
| [creatures/starters.png](creatures/starters.png) | the redesigned starter lines: front, back, both icon frames (the reference set; see §10) |

Run the measurable checks with:

```
/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/creature_audit.py [ids...]
```

It flags (`!`) colour count, missing outline colour, floating sprites, size
class, fill, mirror symmetry, orphan pixels and idle-frame problems. A `!` is
a prompt to look, not an automatic fail (deliberate dew dots count as orphans).

---

## 1. Palette discipline

Every sprite (front, front__2, front__3, back, icon, icon__2 of one species)
uses **the same 4 colours**:

| Slot | Role | Value (HSV V / greyscale) | Rule |
|---|---|---|---|
| 0 | outline | `#181818`, always | never used as a fill except 1px seams, grooves and the contact line |
| 1 | dark | 20–45% | the shadow; hue-shifted **toward blue/purple** from the mid by 15–40° |
| 2 | mid | 50–75% | the local colour of the main body |
| 3 | light | 80–97% | the lit plane and the glint; hue-shifted **toward yellow** by 10–30° |

- **Snap every channel to a multiple of 8** (GBC 15-bit; `px.snap` does it).
- **Greyscale test:** desaturate the sprite. The four tones must be four
  clearly separate greys (≥ 18% luminance apart). If dark and mid merge, the
  form disappears in the battle box.
- **Hue-shift examples** (from the existing good ramps):
  - green: `#285828 → #60b038 → #d0f080`: the shadow goes blue-green, the light
    goes lime/yellow.
  - red: `#901828 → #e84020 → #f8d878`: the shadow goes wine/crimson, the light
    goes gold, not pink.
  - brown: `#683818 → #d88830 → #f8e098`.
  - **Bad:** `#305030 → #60a060 → #a0e0a0`. That is grey-shifting (the same hue,
    only lighter or darker) and reads as plastic.
- **Double duty.** Four colours is tight, so one tone does two jobs, the GBC
  way. Plan it on purpose:
  - Red chili: the light slot is lime, so it is both the calyx and the glint.
  - Acorn: the dark brown is both the cap and the nut's shadow.
  - Pick the double-duty colour so that the *secondary material* (calyx,
    stem, centre) is readable as a different thing.
- **The accent colour is the family signature.** It stays in the same slot
  across an evolution line, e.g. the oak line's cap-brown dark, the chili
  line's lime light, the lily line's pink.
- **When white is allowed.** Use near-white (`#f8f8f0` / `#f0f0e8`) as slot 3
  **only** when the real plant is white: chili blossom, white clover,
  moonflower, the dandelion clock, foxglove spots, mint flowers. Otherwise the
  light is a warm tint of the mid colour. **Never** use a pure-white
  specular on a coloured body. The battle background is pale, so white
  creatures need their mid tone (slot 2) to carry the shape.

## 2. Outline and selout

The renderer (`px.Sprite`) produces the outline; these are the rules it
follows, and that hand edits must keep.

**1px, pixel-perfect, 4-connected.** No doubled corners, no "L" elbows on
curves, and runs step evenly (1-1-2-2-3, not 1-3-1-2):

```
 BAD: doubled elbow        GOOD: pixel-perfect       BAD: jaggy run        GOOD: even run
 . . 0 0 0 0               . . . 0 0 0               0 0 . . . .           0 0 0 . . .
 . 0 0 . . .               . . 0 . . .               . . 0 0 0 .           . . . 0 0 .
 0 0 . . . .               . 0 . . . .               . . . . . 0           . . . . . 0
 0 . . . . .               0 . . . . .
```

**Selout (selective outline).** On the **lit top-left quarter** of the
silhouette, replace the black outline with the **dark tone (slot 1)**. It
makes the light "eat" the edge and the sprite looks rounder and less
stickered-on:

```
   outline everywhere            selout on the lit edge
   . . 0 0 0 0 0 .               . . 1 1 1 1 0 .        1 = dark tone of the body
   . 0 3 3 2 2 2 0               . 1 3 3 2 2 2 0        it stays black on the
   0 3 3 2 2 2 2 0               1 3 3 2 2 2 2 0        right and bottom
   0 2 2 2 2 2 1 0               0 2 2 2 2 2 1 0
   0 2 2 2 2 1 1 0               0 2 2 2 2 1 1 0
   . 0 2 1 1 1 0 .               . 0 2 1 1 1 0 .
   . . 0 0 0 0 . .               . . 0 0 0 0 . .
```

- Use selout only where the outside is **background**, never where one part
  of the creature meets another.
- Use it only on fronts and backs (56/48). **Icons keep a full black
  outline**: at 16px it is the only thing holding the shape on the party
  screen.
- Use it only when the dark tone is ≤ 45% luminance. A pale creature (white
  blossom, lily pink) keeps black edges, or it dissolves into the background.
- Use it on at most ~25% of the outline. Stop where the silhouette turns
  away from the light.

**Internal lines** (one part overlapping another):
- Use **black** when the parts are different materials or far apart in
  depth: a pod over a leaf, a cap over a nut, the lead arm in front of the
  body.
- Use the **dark tone** for folds and parts of the same material, like
  petals over petals or a leaf midrib. It's softer and looks less like
  colouring-book art.
- Internal lines are 1px. Break them where light hits (leave a 1–2px gap on
  the lit side of a fold): a broken line reads as form.

**Weighted contact line.** Where the creature touches the ground, and in the
deepest crease (under a cap, between the "feet"), the black may thicken to
2px over a short run (3–8px). This plants the creature. It is the only place
black is 2px.

**Glint of life.** Every front has **one** glint:
- a 2–4px cluster of the light tone in the shape of the surface (a dash on a
  glossy pod, a dot-plus-tail on a dew bead, a sliver on a cap);
- on the most top-left convex surface of the **head**;
- surrounded by the mid tone, not touching the outline.

A creature with no glint looks dead. One with five looks wet.

## 3. Size classes and registration

All fronts are 56x56, faces left, **bottom-centred**. The lowest opaque row
is **y = 54 or 55** (feet on the ground; never floating, except true floaters
like a seed in a "bobbing" pose, which hover ≤ 3px with a shadow-free gap).

| Class | Who | Largest dimension of the bounding box | Fill (opaque px / 3136) |
|---|---|---|---|
| baby | stage 1 of a 3-stage line | 38–44 (aim 40) | 22–38% |
| teen | stage 2 of 3, or stage 1 of 2 | 44–52 (aim 48) | 28–48% |
| adult | final stage | 52–56 (aim 56, touch ≥ 2 edges) | 38–62% |

- **Mass, not just extent.** A spindly sprite that reaches 56 tall but fills
  19% (the old green chili) reads as weak on the battle platform. Thin
  forms need a counter-mass: a big lead leaf, a curl, a calyx crown.
- The **horizontal centre of mass** sits 0–6px **right** of the canvas
  centre (x 28–34), because the head leans left toward the foe and the body
  and tail counterbalance behind. Do not let the whole sprite drift left
  out of its box.
- **Back sprites** (48x48) fill **more**: 60–85% of the canvas, cropped at the
  bottom. The player's creature is big and close.

## 4. Creature-ness without faces: the pose vocabulary

### 4.1 Anatomy: map the plant onto a body

| Body part | Plant part | Rule |
|---|---|---|
| **Head** | the signature organ: flower, pod, trap, cap, crown, frond tip | upper third; **tilted 10–25° toward the foe (left)**; offset 3–8px left of the feet's centre |
| **Lead arm** | the nearest big leaf or petiole | the foe-side limb; **larger** (the near side in 3/4 view), raised to guard or thrust forward at the foe; never hanging |
| **Rear arm** | the far leaf | about 70–85% of the lead arm's size, higher, swept back or up for balance; partly overlapped by the body |
| **Torso** | stem, trunk, pod body | **curved along the line of action**, never a straight vertical |
| **Feet** | roots, stem base, ground leaves, pad edge | **2 contact points**, planted wide (wider than the head for heavy types); the front foot ahead (left), the back foot behind (right) |
| **Tail** | a trailing tendril, a back leaf, a seed drifting off | opposite the head, finishing the line of action; it is also the motion cue |

**3/4 view:** the far side of anything paired (leaves, petals, roots) is
drawn ~80% size and 1–3px higher, partly hidden. That one rule kills the
"specimen" look.

**No faces** (decision Q3): no eyes, mouths or brows, and no arrangement of
spots that reads as a face. Real eyespots only where the real plant has
them. Expression comes from the **head tilt** (curious: up-tilt; aggressive:
down-tilt and forward; defensive: pulled back behind the lead arm) and
from the **arms** (raised = ready; spread = threat; curled = guard).

### 4.2 Line of action

Draw one curve through head → torso → feet before anything else. It must be
a **C or an S, never a vertical I**. The head end leans toward the foe
(left).

```
   C (lunge)        S (coiled)        reverse C (looming)    I (specimen: NOT ALLOWED)
     .--.             .-.                  .--.                      |
    /                (   )                     \                     |
   |                  \                         |                    |
    \                  `--.                    /                     |
     `-                    )                  /                      |
                        --'                 -'                       |
```

### 4.3 The six named poses

Pick one per species and write it in your module docstring. Evolution lines
usually escalate: e.g. braced → lunging → looming.

**BRACED**: low, wide and stubborn. Heavy types (acorn, pumpkin, holly,
nettle sprout).
- Base 1.3–1.6× the head width, two feet planted wide.
- Head low and forward, lead arm up across the body like a shield.
- Line of action: a shallow C leaning left.

```
        ___
     .-'   '-.      head pushed forward-left
    /  (cap)  )
   (  __.--.__)     lead arm raised across the front (shield)
  //\/       \ \
 //  \  body  \ \
/_/   \_______/\_\  wide stance, front foot ahead
```

**LUNGING**: committed, mid-strike. Fast attackers (chili, flytrap,
snapdragon, nettle).
- The head is 6–12px left of the feet, so the whole body is a diagonal.
- Lead arm thrust forward, rear arm/tail flung back.
- Line of action: a strong C or a straight diagonal at 30–45°.

```
  __
 (  `-.            head well past the feet
  `-.  `\
     \   \  __
      \   \/  )    rear arm / tail flung back
       \     /
        )   (
       /     \__   weight on the front foot
```

**COILED**: tension stored, about to spring. Spirals and curls (fern
fiddlehead, sundew tentacle, pitcher lid, tendrils, chili curl).
- An S-curve: the head pulled back over the body, ready to whip forward.
- The coil is the signature: exaggerate the spiral to 120–140% of the
  real thing.

```
    .--.
   ( @  )   coil / head pulled back
    `-. \
      )  )
     /  /   S-curve torso
    (  (
     `--`-.  planted base
```

**LOOMING**: a big final form towering over the foe (great oak, sugar maple,
sunflower, ostrich fern, giant water lily).
- Top-heavy, with the crown or head mass 1.4–2× the base width.
- The crown leans/overhangs toward the left; the arms (boughs, fronds)
  spread wide.
- The trunk is short and thick with planted roots. It touches the top and
  both sides.

```
  .-~~~~~~~~-.
 (  crown     )~.     crown overhangs the foe side
(   leans  left  )
 `-.__  ____.--'
      \/  \/          boughs as arms, spread
      |    |
     /|    |\
   _/ '----' \_      root feet, wide
```

**REARING**: rising up from water or ground to strike or display. Emergent
or floating bases (lily pad, cattail, pitcher plant, moonflower vine).
- The base is horizontal (pad, rosette, water line); the body rises from it
  and leans back-then-forward.
- The head is at the top-left of a rising curve, and the base edge curls up
  on the far side (the 3/4 tilt).

```
          .-.
         (   )   head at the top of the rise
          \  \
          |   )
  ___.---'   /___
 (____________..-'   tilted base, far edge lifted
```

**BOBBING**: light, airborne or buoyant (dandelion clock, maple samara,
moonflower seed, clover sprout, lily seedpod).
- The body tilted 10–20°, with motion cues (a seed drifting off, windswept
  tufts, water rings).
- May hover ≤ 3px. Asymmetric tilt is mandatory; a level, centred floater is
  a specimen.

```
     .  *        a seed drifting off (the tail)
   .-~~-.  ,
  ( tilt )'
   `-..-'
     ||
   ~~~~~~        water ring / ground puff
```

### 4.4 Asymmetry and exaggeration

- **Mirror test:** flip the front horizontally and overlay it. The overlap
  (IoU, `mirror` in the audit) must be **≤ 0.70** (0.80 is a hard fail). The
  old great oak scored 0.90 and the lily pad 0.93; that's why they read as
  icons on a tray.
- **Exaggerate the signature feature by 20–40%** versus a photo-true
  proportion, and push the rest *down* to make room:

  | Line | Signature |
  |---|---|
  | oak | the acorn cap: thicker rim, deeper scales, worn like a helmet |
  | chili | the curl and the flame tip |
  | lily | the flower's points and the pad's notch |
  | flytrap | the jaws and the cilia |
  | sunflower | the disc |
  | fern | the spiral |
  | maple | the samara wing and the leaf points |
  | sundew | the dew-tipped tentacles |
  | pumpkin | the ribs and the stem curl |
  | dandelion | the clock and the saw teeth |
  | bramble | the drupelets and the thorns |
  | nettle | the stinging hairs and the serrations |
  | moonflower | the spiral-furled bud and the pale trumpet |
  | clover | the trefoil |
  | cattail | the brown spike |
  | foxglove | the bells and their spots |
  | holly | the spines and the berries |
  | mint | the square stem and the crinkled pairs |
  | rose | the hips, the thorns and the petal cup |
  | pitcher | the lid and the lip |
  | snapdragon | the "jaw" bloom |
- **Family resemblance:** one shape motif + one accent colour per line,
  escalating. Put stage 1, 2 and 3 side by side at 1x: you should be able to
  draw an arrow through the motif. Stage 3 = stage 1 *grown up and
  powerful*: the same motif, now load-bearing (e.g. the acorn cap becomes
  the great oak's crown-helm).

### 4.5 Specimen vs creature checklist

| Specimen (reject) | Creature (ship) |
|---|---|
| centred, vertical stem | C/S line of action, head over the foe side |
| leaves paired at one height | lead arm big and raised, rear arm small and high |
| the flower faces the camera, flat | head tilted 10–25° toward the foe, 3/4 |
| even lighting everywhere | a clear lit top-left plane, the shadow side 30–40% of the body |
| roots or base as a flat line | two planted feet, a weighted contact line |
| nothing loose | one motion cue: a drifting seed or petal, a curling tendril, a windswept tip |

## 5. Idle animation (front__2, front__3)

The battle scene ping-pongs `front → front__2 → front__3 → front__2 → front`
(or `front ↔ front__2` with two frames).
- `front__2` is the **in-between**; `front__3` is the **extreme**. With 2 frames,
  front__2 is the extreme.
- **Registration is identical.** Same canvas, same feet: the bottom-most row
  and the contact pixels **do not move**. Motion grows with height: the feet
  move 0px, the torso 0–1px, the head and arm tips 1–2px, the motion cue
  (tendril tip, drifting seed) up to 3px.
- **The silhouette stays stable.** The overlap with the front must be
  ≥ 0.82 (the audit checks it), and the colours must be the same 4.
- **Pick one motion idea per species**, matched to its pose:
  - braced: a breath (the body squashes 1px down and 1px wider, the arm
    lifts 1px);
  - lunging: a feint (the head dips 1px forward, the tail 2px back);
  - coiled: a coil tightens (the spiral rotates by one step);
  - looming: the crown sways 1–2px with leaves fluttering at its edges;
  - rearing: the head bobs 1px with a ripple at the base;
  - bobbing: a 1–2px vertical float, with the seed or ring drifting 2–3px.
- **Redraw, don't shift.** Rebuild each frame from the same parts with
  moved control points, then re-outline. Never translate a block of pixels
  so that its outline tears or doubles.
- **The glint may twinkle**: it moves 1px or grows by 1px on the extreme
  frame. It's the cheapest "alive" cue there is.
- Each frame is held about 400–500 ms by the engine, so design for slow,
  calm breathing. Nothing should jitter.

## 6. Back sprites (48x48)

- A **true back view**, from behind and above. The camera is over the
  player creature's shoulder, looking at the foe (top-right). Show what the
  front hides:
  - the top of the cap;
  - the back of the petals and their sepals;
  - the pod's stem end;
  - the underside sheen of the leaves.
- **Cropped at the bottom:** the body runs off the bottom edge (opaque bottom
  row, no outline there). Fill 60–85%.
- **Same 4 colours and the same family motif** as the front. The head is the
  biggest shape, 55–80% of the width.
- **Pose carries over:**
  - the head leans **toward the top-right** (toward the foe);
  - the lead arm is raised on the right;
  - the line of action stays a C (now opening to the right).
- **Never a mirrored or flipped front.** Light is still top-left: the
  shadow is on the bottom-right of every form.
- No idle frames are required for backs.

## 7. Icons (16x16, icon + icon__2)

- **Full 1px black outline, no selout.** The same 4 colours as the front.
- The **head/signature fills ≥ 50%** of the icon. Simplify everything else:
  at most one leaf or limb per side.
- **Bottom on row 14 or 15** (row 15 for frame 1 is fine); 1px clear on
  each side.
- **Frame 2 is a hop or a squash**:
  - a hop: the whole icon up 1px;
  - a squash: the top drops 1px while the base stays put;
  - a sway: the head moves 1px left.
  The follower uses these frames on the overworld, so the motion must read
  at 1x.
- Pose survives the miniature: the head still leans left. A centred
  upright icon is a miss.
- No orphan pixels; at most 1–2 interior detail pixels (a glint, a seam).

## 8. Process (every species)

1. **Thumbnail the silhouette** at 1x as a solid black mask. Pick the pose,
   then draw the line of action.
2. Check it against the line and against similar species: put your
   silhouettes next to the whole roster's.
3. Block in parts, light and outline. Then **hand edit**:
   - clusters;
   - glint;
   - internal lines;
   - selout;
   - the contact line.
4. Idle frames, back, icons.
5. Run the audit, then the in-game check:
   - battle (`?dev=battle&mode=wild&species=<id>&level=20&timer`);
   - party and Herbarium (`?dev=screens&open=party|herbarium`).
6. **Score it with the rubric** below. Iterate until it scores ≥ 8.

## 9. Scoring rubric (10 points; ship at ≥ 8)

One point each. An automatic **0** for: more than 4 colours, a drawn face,
or a mirrored front used as the back.

| # | Criterion | Pass when… |
|---|---|---|
| 1 | **Silhouette** | it reads as its species as a solid black shape at 1x, and doesn't collide with any other species' silhouette |
| 2 | **Pose** | a named pose is legible at a glance; the line of action is C/S; it faces left/3-4 |
| 3 | **Focus** | the head tilts toward the foe; the lead arm is big and raised; mirror IoU ≤ 0.70 |
| 4 | **Signature** | the signature feature is exaggerated 20–40% and the family motif is visible across the line |
| 5 | **Palette** | 4 colours including #181818; the ramp is hue-shifted; it passes the greyscale test; white only where real |
| 6 | **Line** | 1px pixel-perfect outline, selout on the lit edge, internal lines chosen (black vs dark), a contact line |
| 7 | **Clusters** | no orphans or pillow shading; shading follows the form; light from the top-left; the shadow side is 30–40% |
| 8 | **Scale** | size class and fill targets met; bottom row 54–55; centre of mass at x 28–34 |
| 9 | **Charm** | exactly one glint of life, plus one motion cue/detail; it looks alive, not pasted |
| 10 | **Set** | idle frames present (1–3px, stable); the back is a true back view; 2 icon frames readable at 1x; it all matches |

Write the score per species in your module docstring, e.g.
`score: 9 (6: selout missing on the rear arm)`. The director's review
(`docs/CREATURES_REVIEW.md`) scores every species with this table.

## 10. The starters as worked examples

Source: `tools/art/species_a/{oak,chili,lily}.py`, with the helpers in
`kit.py`:
- `rot` poses the control points;
- `selout` does the selective outline;
- `Ico` builds hand-finished icons;
- `icon2` makes the hop-or-squash second frame.

Each front is a function of the idle frame `f` (0, 1, 2), so all three
frames come from the same parts with moved control points.

| Line | Motif / accent | Stage 1 | Stage 2 | Stage 3 |
|---|---|---|---|---|
| oak | the acorn cap worn as a helmet / cap brown | BRACED: tilted 28° at the foe, brim pulled low, pale radicle feet | BRACED: C-trunk, lobed lead leaf up as a shield, cap helmet | LOOMING: the crown hunches over the foe, a lead bough with an acorn fist |
| chili | the lime calyx, the flame curl / lime | LUNGING: the star flower thrust out on a hooked neck, leaf arm up | LUNGING: a comma body, calyx "head" leaning in, leaf arms, the tail tip curling up | COILED: a fat shoulder, the tail whipped into a flame hook, an ember drifting off |
| lily | the spiny rose bud, the upturned rim / rose | REARING: a spiny bud leaning in, a cream sepal peeled up as an arm, two sepal feet | REARING: a tilted rimmed pad, the ribbed bud rearing on its stalk, a furled leaf behind | LOOMING: the pink-crowned bloom leaning over its Victoria tray, reflexed petals as arms |

Things the starters taught, so they apply to everyone:
- **Turn the plant until it has a front.** A chili hangs from its calyx.
  Standing it on its belly, with the calyx as a head and the curled tip as
  a tail, turned a vegetable into an animal. A first try that stood the pod
  on its tip read as a horn.
- **Rotate the whole body 20–30° about the feet,** don't just lean the top.
  The acorn only came alive once the cap, nut and stalk rotated together.
- **A helmet needs a brim.** The cap overhangs the nut by 3–4px on the foe
  side, and that overhang is the "brow" that gives it attitude.
- **The idle frame is the pose, pushed.** Frame 3 is the same tilt plus
  1.5–3°, or the same curve plus 1–1.5px. Nothing new appears.
