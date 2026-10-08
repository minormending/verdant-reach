# Verdant Reach: style bible (art + voice)

The bar is **AAA for the GBC era**. Picture what Game Freak's best artists
would ship in 2001 with modern taste: every pixel deliberate, nothing noisy,
nothing generic. When in doubt, look at Pokémon Crystal, then do better.

## 1. Pixel art rules (everyone)

- **Resolution:** native 320x180. Never draw sub-pixel or scaled art. No
  anti-aliasing, no gradients, no dithering noise. Dithering only as a
  deliberate 2-colour pattern.
- **Light** comes from the **top-left** on every object, tile, sprite and
  portrait. Shadows fall bottom-right.
- **Outlines:**
  - Creatures, characters and portraits use a 1px outline in the darkest
    colour of their palette (#181818 for creatures, as now). Selectively
    lighten it on lit edges ("selout") where it helps readability.
  - Environment tiles have no black outlines. They use dark hue-shifted
    edges instead, e.g. dark green under foliage, dark brown under wood.
- **Colour:**
  - Creatures: 4 colours plus transparency (GBC rule).
  - Tiles: at most 4 colours per 8x8 quadrant.
  - Shadows hue-shift toward blue/purple and highlights toward yellow,
    never plain darker/lighter grey.
  - Shared environment ramps, all derived from the current tileset, which
    each art lead may refine but must keep consistent:

    | Ramp | Colours |
    |---|---|
    | grass | `#e0f0a0 #98d060 #58a040 #285828` |
    | wood | `#f0c890 #c88850 #8a5030 #4a2818` |
    | stone | `#f0f0e8 #b8b8b0 #787878 #383840` |
    | water | `#c8e8f8 #68a8e8 #3060c0 #183070` |
    | maple | `#f8c060 #e88030 #b04020 #602010` |
    | bog | `#a8b878 #687838 #384820 #182410` |
- **Clusters:** no orphan pixels and no "pillow shading" (darkening every
  edge evenly). Shading follows form. Highlights are small and deliberate.
- **Silhouette first:** every creature, character and landmark must be
  identifiable as a solid black silhouette at 1x.
- **Animation:**
  - Idle loops are 2–4 frames.
  - Tiles: water, tall grass and flowers animate every ~32 frames.
  - Prefer subtle motion: a sway, a breath, a blink of light.

## 2. Creatures (species sprites)

- **Front sprite (56x56):** the creature faces left, in a 3/4 view where the
  plant allows. It sits bottom-centred and fills its size class (baby ~40,
  teen ~48, adult ~56).
- **Must look hand-made, not traced:**
  - The auto-trace is a reference underlay, not the final art.
  - The final art has clean clusters, one deliberate highlight shape, a
    consistent 1px outline, and readable features (pods, spots, ribs, veins,
    eyespots) placed on purpose.
- **Character:** plants have no faces (decision Q3). Personality comes from
  POSE: a sapling leaning in, a flytrap's jaws parted, a chili curling like a
  flame. Push poses past photo realism toward iconic, the way Pokémon
  stylise real animals.
- **Back sprite (48x48):** a real back view seen from behind and slightly
  above, cropped at the bottom like GBC back sprites. It must not be a
  mirrored front.
- **Icon (16x16, 2 frames):** a readable miniature with a bob, or a
  squash-and-stretch hop.
- **Evolution lines** read as one family: shared palette accents and a
  growing signature feature (the acorn cap becomes the oak's crown edge, and
  so on).

## 3. Environment

- Tiles must tile seamlessly and **autotile** (see `AUTOTILE` in
  `src/contracts/constants.ts`). These need edge variants:
  - water shorelines with foam;
  - paths with grass-overlap edges;
  - joined hedges, fences and walls;
  - forest canopies that merge, with trunks only visible on the open south
    edge.
- **Variation:** ground tiles get 2–4 subtle variants. The engine picks one by
  a position hash when `${key}~1.png` … `${key}~3.png` exist, so large fields
  never look stamped.
- **Structures:** each building has its own architecture and roof colour, plus
  readable signage (GREENHOUSE, MARKET, CONSERVATORY). Every town should have
  a landmark you'd remember.
- **Interiors:** cosy, lived-in and specific. The Herbarium has specimen
  sheets on the walls, a microscope and labelled drawers.

## 4. Maps (level design)

- **Every screen (10x9 tiles) should be a composed picture:**
  - a focal point;
  - framing (trees, cliffs, water);
  - a path that leads the eye;
  - at least one detail worth noticing (a bench, a scarecrow, mushrooms by
    a stump).
- **Routes:**
  - Never straight corridors. Use bends, optional side areas, a visible
    item you have to work out how to reach, ledges as shortcuts back, and
    tall-grass patches with shape.
- **Towns:**
  - A clear centre (square, well, landmark tree), buildings with yards and
    fences, and ambient life (a cat by a door, a dog that wanders).
  - Plus 4–8 NPCs with something to say.
- **Each town feels different:**

  | Place | Feel |
  |---|---|
  | Fallowfield | farmland: fields, barn, windmill, scarecrow |
  | Hedgerow | hedged lanes, cottage gardens |
  | Bramblegate | brick, bramble arches, the Conservatory as a glass palace |
  | Sugarbush | maple forest, sugar shack, sap buckets, warm autumn colours |
  | Bog | boardwalks, reeds, lily ponds, mist |
- **Conservatories have a puzzle** (gyms do):
  - Bramblegate: a hedge maze opened with levers (`hedge_gate` + `lever`
    objects, flags, `visibleWhen`).
  - Sugarbush: valves that drain and fill bog channels (`legendWhen` swaps
    tiles; `valve` objects).
- **Ambient particles:** `MapDef.ambient`, e.g. pollen in Fallowfield, leaves
  in Sugarbush, fireflies at night on Route 3, mist in the bog.

## 5. Voice and dialogue

- **Tone:** warm, curious, a little wry. Crystal crossed with a nature
  documentary narrated by someone who loves you.
- **Text boxes:** 36 columns x 3 lines. Write in short beats; one idea per
  box. Upper-case proper names (DR. VALE, BRAM, QUICKENED, ROOTSTOCK).
- **Every NPC** has a reason to exist:
  - a real plant fact;
  - a world detail;
  - a joke;
  - a hint;
  - or a reaction to story progress (use flags so lines change after events).
- **Character voices:**

  | Character | Voice |
  |---|---|
  | VALE | brilliant, scatterbrained, warm |
  | BRAM | clipped, defensive, cracks showing |
  | HOLLIS | slow, rural, proverb-ish |
  | NELL | bubbly, slightly macabre about her carnivores |
  | SHEARS | cold, corporate |
  | PIP | breathless facts |
  | FENNIMORE | gentle, cryptic |
- **No** filler like "Hello!" with nothing after it. No meta jokes about
  video games. No dialogue that contradicts the story bible.
