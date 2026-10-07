# Seam-fix revision measurements

Before = reviewed seam-fix commit `HEAD` (`d9cac67`); baseline = `main`. Changes remain uncommitted.

[All changed main/after cross patches at 2×](seams_patch.png). Each revised key appears in the table below; every revised 8×8 quadrant retains at most four colours.

[Reviewed seam fix / final revision patches at 2×](seams_revision_patch.png) shows only the 10 keys changed in this revision.

The wall interior is a continuous cap. Boardwalk courses continue through corners and across boundaries. Tree crowns retain their fully joined texture; old-growth sprays, stone courses and rose leaves use a shifted texture phase with small authored continuations. Silhouette quadrants fold hues only where necessary to preserve that shared texture.

Edge measurements are the maximum RGB/alpha mean difference over every reciprocal mask pair and frame. Grid energy is the maximum 16px Fourier energy over mask-15 frames. WARN edge differences ≤16 are intentionally retained.

| Tileset/key | Main edge | Before edge | After edge | Main grid energy | Before grid energy | After grid energy |
|---|---:|---:|---:|---:|---:|---:|
| `interior/wall` | 132.67 | 0.00 | 14.83 | 0.00 | 10.51 | 0.00 |
| `nature/maple_tree` | 57.33 | 0.00 | 16.00 | 1098.10 | 1128.53 | 1098.10 |
| `nature/tapped_maple` | 57.33 | 0.00 | 16.00 | 1098.10 | 1203.53 | 1098.10 |
| `nature/tree` | 60.33 | 0.00 | 13.00 | 713.93 | 672.81 | 713.93 |
| `oldgrowth/canopy_boardwalk` | 146.67 | 0.00 | 12.67 | 1.15 | 119.94 | 1.15 |
| `oldgrowth/oldgrowth_tree` | 52.33 | 0.00 | 14.67 | 0.00 | 42.67 | 0.00 |
| `oldgrowth/rope_rail` | 84.00 | 0.00 | 12.67 | 84.79 | 149.90 | 69.66 |
| `rose/rose_trellis` | 63.33 | 0.00 | 13.67 | 17.73 | 62.98 | 18.30 |
| `town/stone_wall` | 81.00 | 0.00 | 14.00 | 1.06 | 39.14 | 1.06 |
| `water/boardwalk` | 149.33 | 0.00 | 6.33 | 0.00 | 104.51 | 0.00 |

10 keys revised. The approved `cliff` is unchanged by this revision: grid energy 42.02→102.67 versus main remains a warning for the lead’s visual judgement. No grid-artifact warnings remain on revised keys.

The patch view preserves the before shape and texture family; phase changes move details within the existing motif rather than stamping a new border. The diagnostic uses base fallbacks (not position-hashed wall decorations); the generator’s room/map review images cover those decorations.

Verification passed: 43 QA unit tests; 6 generator edge tests; `qa.py --tiles --changed main` (0 errors); `build_all.py` (0 validation errors); `npm run typecheck`; 691 tests across 69 Vitest files; `npm run build`. Full `build_all.py --regen` compared SHA-256 hashes across 1,846 files under `public/art` and `tools/art` (excluding Python caches): 0 byte differences. All final changed paths are within the worker's allowed scope. Changes remain uncommitted.
