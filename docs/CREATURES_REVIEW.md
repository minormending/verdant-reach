# Creature review (Creature Director)

Scored with the rubric in [CREATURES.md](CREATURES.md) §9 (ship at ≥ 8).
Evidence:
- battle mocks: the enemy front at (96, 0) and the player back at (8, 40);
- the party screen and the Herbarium in game (port 5201);
- `tools/art/creature_audit.py`.

Fix notes are concrete and per sprite. Owners are as in
[ROUND3.md](ROUND3.md) §5.

## Starters (agent 1): done

| Species | Pose | Score | Notes |
|---|---|---|---|
| oak_acorn | BRACED | 9 | Rotated 28° at the foe, cap brim as a brow, radicle feet, glint under the brim. The icon is upright (fine at 16px). |
| oak_sapling | BRACED | 8 | The cap now reads as a scaly acorn cap, not a mushroom (notch-only scales). Its 1x silhouette is still busy on the right. |
| great_oak | LOOMING | 8 | Crown hunched over the foe, acorn fist, drifting leaf. Fill is 63% (1 over the target; acceptable for a tree). The back is the weakest of the line. |
| chili_blossom | LUNGING | 8 | Star flower thrust out on a hooked neck, leaf arm up. The petals still overlap into a wheel at 1x. |
| green_chili | LUNGING | 9 | Comma body, lime calyx head, leaf arms, the tail tip curling up. |
| red_chili | COILED | 9 | Fat shoulder, flame-hook tail, an ember. The strongest silhouette in the line. |
| lily_seedpod | REARING | 9 | Spiny bud with a cream sepal arm and two sepal feet. Reads as a critter. |
| lily_pad | REARING | 8 | Tilted Victoria pad, ribbed bud rearing. The bud's spines are kept short so it doesn't collide with the flytrap. |
| giant_water_lily | LOOMING | 8 | Victoria "tray" rim plus a big leaning bloom. The back is centred rather than leaning to the top-right. |

## Cross-roster review (all 53)

Taken after the artists' files had been quiet for about 16 minutes. The
audit was clean apart from the flags quoted below.

### Roster-wide findings (the top 6)

1. **Some backs are front views.** These show the face of the organ, which
   only the foe would see:
   - the flytrap line: open jaws and teeth;
   - sunflower and sunflower_bud: the seed disc;
   - moonflower: the trumpet face;
   - bramble_blossom: the pink centre;
   - sundew and sundew_rosette: the same tentacle fan as the front.

   A back must show the outside: the outer lobe of the trap with its
   midrib, the green bracts behind the disc, the sepals behind the petals
   (§6). Rubric item 10 fails for all of them.
2. **Stage escalation is too flat in five lines.** Stage 1 and stage 2 share
   a silhouette, so the evolution reads as a resize:
   - flytrap_seedling vs young_flytrap;
   - cattail_shoot vs cattail;
   - pitcher_sprout vs pitcher_plant;
   - snapdragon_sprout vs snapdragon;
   - mint_sprig vs peppermint.

   The adult needs a new load-bearing feature (§4.4): a second trap as an
   arm, a taller spike plus a leaf blade swung like a sword, a second
   pitcher, a second bloom on a raised raceme, a flowering spike.
3. **The mint line is still a specimen:** upright stacks of leaf pairs, with
   a symmetric back. It is the one line with no line of action.
4. **Flat faces.** Discs face the camera:
   - sunflower and dandelion: the heads are frontal;
   - moonflower: the trumpet is frontal;
   - wild_rose: the bloom is frontal.

   Tilt each head 15–25° toward the foe as a squashed, rotated ellipse,
   with the near petals longer (see chili_blossom).
5. **Dark-on-dark icons.** The holly and holly_seedling icons, and the
   blackberry icon, are near-solid blobs at 1x on the party screen. Lift
   the mid tone and put one light glint on each berry.
6. **Busy texture.** sundew and sundew_rosette have dozens of 1px dew dots
   and red hairs. Reduce them to 6–10 clustered 2px beads with a glint each.
   At 1x the hairs read as noise.

### Per sprite

| Species | Owner | Score | Fix notes |
|---|---|---|---|
| dandelion_bud | 2 | 8 | Good lean. The idle frame could flutter the bud's yellow tip by 1px. |
| dandelion | 2 | 7 | The flower head is frontal and centred over the stem. Tilt the head 20° at the foe and raise one saw-tooth leaf as the lead arm. |
| dandelion_clock | 2 | 8 | Great clock, and the drifting seeds are the motion cue. Mirror 0.66 is near the limit: push the clock 3px left of the stem. |
| bramble_blossom | 2 | 7 | The back shows the flower face (fix: sepals plus the petal backs). The front pose is good. |
| bramble_berry | 2 | 8 | The cane-arm curl is strong. Put a glint on 2–3 drupelets only, not all of them. |
| blackberry | 2 | 8 | Good mass and presence. The icon is a dark blob: lift the mid tone. |
| sunflower_seedling | 2 | 7 | The seed-coat "helmet" works. The body is still a plain seedling: curve the stem into a C and make the lead cotyledon bigger and raised. |
| sunflower_bud | 2 | 8 | Nice nodding bud. Its back shows the disc; show the green bracts instead. |
| sunflower | 2 | 7 | The disc faces the camera and the back is also a disc. Turn the disc 3/4 to the left and let a leaf arm come forward. Back: green bracts and the stem's back. |
| pumpkin_blossom | 2 | 8 | Fill is 21% (minimum 22). Make the star flower 10% bigger. |
| green_pumpkin | 2 | 9 | The creature read with stem-legs is excellent. This is the roster's best gag. |
| pumpkin | 2 | 9 | Same. The back is close to a mirrored front (IoU 0.71). Show the stem from behind and the top of the ribs. |
| fern_fiddlehead | 3 | 9 | Iconic coil. |
| unfurling_fern | 3 | 8 | Good. The pinnae read as busy at 1x; drop one. |
| ostrich_fern | 3 | 8 | A strong looming fan. The coil is small for the line motif: grow it 25%. |
| flytrap_seedling | 3 | 8 | Strong jaws. **The back shows the open mouth: redo it as the outer lobes.** |
| young_flytrap | 3 | 7 | Same silhouette as the seedling, with the same back problem. Add the second trap raised as an arm (as venus_flytrap does), but smaller. |
| venus_flytrap | 3 | 8 | Great front. The back is the open jaws again. |
| sundew_rosette | 3 | 7 | Noise dew (see finding 6). The back is a front. |
| sundew | 3 | 7 | The same two issues. The front pose (a tentacle curling at the foe) is good. |
| maple_samara | 3 | 9 | A winged critter on root legs. Lovely. |
| maple_sapling | 3 | 8 | Good. It leans slightly away from the foe: tilt the crown 2–3px left. |
| sugar_maple | 3 | 8 | A big looming crown. The mirror IoU of 0.60 is fine, but the crown could overhang left more. |
| nettle_sprout | 3 | 8 | Better: it now has a pose. The stinging hairs are a strong signature. |
| stinging_nettle | 3 | 8 | Good. Make the lead leaf bigger than the rest. |
| moonflower_seed | 3 | 8 | Tilted now, good. |
| moonflower_vine | 3 | 7 | No clear head: the furled bud reads as a leaf. Make the twisted white bud the head, leaning at the foe, with the tendril as a tail. |
| moonflower | 3 | 6 | The trumpet faces the camera (the back too), and the leaves pile up underneath with no body. Tilt the trumpet 3/4 at the foe on a curved vine "neck", and have a heart leaf as the lead arm. |
| clover_sprout | 4 | 8 | Good trefoil read. Push the lean 2px. |
| white_clover | 4 | 7 | The flower head is a white cauliflower blob at 1x. Break it into florets with 2–3 dark-tone notches, and tilt it at the foe. |
| cattail_shoot | 4 | 8 | The spike-head creature works. Too close to the adult (finding 2). |
| cattail | 4 | 8 | Escalate: a longer spike plus one blade swung forward like a sword. |
| foxglove_rosette | 4 | 8 | Nice. |
| foxglove | 4 | 8 | A curled raceme with presence. The icon reads as a purple witch's hat; show 2 bells. |
| holly_seedling | 4 | 8 | Good spines. The icon is a dark blob. |
| holly | 4 | 7 | A dense dark mass at 1x. Open up one gap between the leaves, make the berry cluster bigger (+30%), and give the lead leaf a spine-tipped thrust. |
| mint_sprig | 5 | 6 | A specimen (finding 3): C-lean the square stem, with the top pair raised at the foe. |
| peppermint | 5 | 6 | The same, and a symmetric back. Add the flower spike as the escalation. |
| rose_bud | 5 | 8 | A strong bud head. 54px wide exceeds the teen class (52). |
| wild_rose | 5 | 7 | The bloom is frontal. Tilt it 3/4 and let a thorny cane arm come forward. |
| pitcher_sprout | 5 | 8 | The rosette base is fixed. Good. |
| pitcher_plant | 5 | 8 | Escalation (finding 2). The lid could tilt more toward the foe. |
| snapdragon_sprout | 5 | 8 | Good. |
| snapdragon | 5 | 8 | Too close to the sprout; raise a second bloom on the raceme as a striking head. The jaw stays clear of a face. |

**Summary:**
- 9 starters at 8–9.
- 44 others: 4 at 9, 26 at 8, 11 at 7, 3 at 6.
- The 6s and 7s are fixable with the notes above. The biggest wins, in
  order: the backs (finding 1), the mint line, moonflower, and frontal
  discs.
