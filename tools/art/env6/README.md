# Chapter 6 environment

Run `tools/art/env6/build.py` with the pinned art venv. It is registered as
`env6` in `build_all.py`. `--review` redraws the sheets without emitting bundles.

The generator owns `coast`, `island`, and five structure bundles. All art is
original native pixel drawing, with no traced or imported game assets. Every
tile uses at most four colours total. Artkit keeps output deterministic and
protects edited/imported bundles. Four-way connected textures keep continuous
plank courses and small basalt column joints rather than a repeated tile rim.

Lead review files:

- `tools/art/review/ch6_env_lead.png`: every base tile, alternate and animation
  frame at 4x, and all five structures at 2x (1100px wide).
- `tools/art/review/ch6_maps_lead.png`: literal map-data renders at 160x144,
  enlarged 2x. The original six views plus the harbour square and island south appear.
- `tools/art/review/ch6_dressing_tiles.png`: the six new tiles at 4x, including
  all three dune-grass/shell alternates and both moss shimmer frames.
- `tools/art/review/ch6_tiles_patch.png`: QA-generated cross patches, including
  connected masks, both seagrass frames, and ground alternates.

The harbour's market occupies a weatherboard harbour cottage, with MARKET
signage and a wall net. The island elder and Vents entrance use driftwood huts.
Basalt shoulders around the smaller Vents hut retain the old entrance's solid
cells and door coordinate. The 3x4 Lantern Tree moves one row above the 3x3 oak's
position, adding three canopy cells while leaving the existing interactive
plaque and its approach uncovered. All NPC positions, scripts and warps remain
unchanged. Two pairs of existing walkable gateway tiles provide orientation
cues on the towns' roads without changing terrain movement or encounters.

The Vents' existing grass encounter cells use sulphur-yellow/green vent moss;
non-encounter paths use basalt floor. This preserves the exact encounter
footprint because the specified basalt-floor contract has no encounter flag.
Additional steam cells replace solid wall cells, leaving the boulder corridor clear.
The towns mix quiet salt flats with shell scatter and sparse dune grass. Fishing
nets and dock supplies cluster beside open approaches; the island has driftwood,
rounded stones and palms. New town ground never adds encounters, and the southern
island encounter patches stay exactly where they were.
The geometry regression test freezes the original map terrain, including both
sluice states, with only the Lantern Tree's three new canopy cells and an explicit
list of isolated town props exempted. Every exempted prop is asserted by key and
coordinate; all water, ledges, encounters and remaining terrain are unchanged.

New traversal keys are excluded from map landmark coverage. Salt flats, dune grass, shell scatter, vent moss and
basalt floors are included in repeatable-ground seam QA. The basalt's 13.33
shared-edge difference is below the allowed 16 threshold; its column texture
continues without a 16px border. New tiles have no before-art Fourier comparison,
so grid-artifact assessment includes the visual cross patches.
