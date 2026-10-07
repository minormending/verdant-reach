# Tile seam review

Baseline: `main`. Every changed cell appears in a 3×3 repeat at 4×, before/after.
Mixed cards additionally show reciprocal masks in a 3×3 patch.

Only boundary pixels changed, plus the wall face’s open-north rim (row 1, E2 → E1) to fit shared wood trim.
All other interior pixels and all tileset palettes are unchanged.
Every generated 8×8 quadrant retains at most four colours.

## burnt

14 changed cells. [Review sheet](seams_burnt.png).

| Tile/check | Before | After |
|---|---|---|
| `seam:ash:base0:f0` | x=0.00/y=0.00 | x=0.00/y=0.00 |
| `seam:ash:alt0:f0` | x=0.00/y=0.00 | x=0.00/y=0.00 |
| `seam:ash:alt1:f0` | x=0.00/y=0.00 | x=0.00/y=0.00 |
| `seam:ash:alt2:f0` | x=0.00/y=0.00 | x=0.00/y=0.00 |
| `autotile_edges:ash` | 112 mismatches/max=23.50 | 0 mismatches/max=0.00 |

Changed cells:

`ash@1`, `ash@10`, `ash@11`, `ash@12`, `ash@13`, `ash@14`, `ash@2`, `ash@3`, `ash@4`, `ash@5`, `ash@6`, `ash@7`, `ash@8`, `ash@9`

## city

65 changed cells. [Review sheet](seams_city.png).

| Tile/check | Before | After |
|---|---|---|
| `seam:paving:base0:f0` | x=16.33/y=32.67 | x=0.00/y=0.00 |
| `seam:paving:alt0:f0` | x=16.33/y=32.67 | x=0.00/y=0.00 |
| `seam:paving:alt1:f0` | x=16.33/y=32.67 | x=0.00/y=0.00 |
| `seam:paving:alt2:f0` | x=16.33/y=32.67 | x=0.00/y=0.00 |
| `autotile_edges:paving` | 128 mismatches/max=39.00 | 0 mismatches/max=0.00 |
| `autotile_edges:iron_railing` | 128 mismatches/max=21.00 | 0 mismatches/max=0.00 |
| `autotile_edges:fountain_basin` | 220 mismatches/max=36.83 | 0 mismatches/max=0.00 |

Changed cells:

`fountain_basin@1`, `fountain_basin@10`, `fountain_basin@10__2`, `fountain_basin@11`, `fountain_basin@11__2`, `fountain_basin@12`, `fountain_basin@12__2`, `fountain_basin@13`, `fountain_basin@13__2`, `fountain_basin@14`, `fountain_basin@14__2`, `fountain_basin@15`, `fountain_basin@15__2`, `fountain_basin@1__2`, `fountain_basin@2`, `fountain_basin@2__2`, `fountain_basin@3`, `fountain_basin@3__2`, `fountain_basin@4`, `fountain_basin@4__2`, `fountain_basin@5`, `fountain_basin@5__2`, `fountain_basin@6`, `fountain_basin@6__2`, `fountain_basin@7`, `fountain_basin@7__2`, `fountain_basin@8`, `fountain_basin@8__2`, `fountain_basin@9`, `fountain_basin@9__2`, `iron_railing`, `iron_railing@1`, `iron_railing@10`, `iron_railing@11`, `iron_railing@12`, `iron_railing@13`, `iron_railing@14`, `iron_railing@15`, `iron_railing@2`, `iron_railing@3`, `iron_railing@4`, `iron_railing@5`, `iron_railing@6`, `iron_railing@7`, `iron_railing@8`, `iron_railing@9`, `paving`, `paving@1`, `paving@10`, `paving@11`, `paving@12`, `paving@13`, `paving@14`, `paving@15`, `paving@2`, `paving@3`, `paving@4`, `paving@5`, `paving@6`, `paving@7`, `paving@8`, `paving@9`, `paving~1`, `paving~2`, `paving~3`

## hollow

15 changed cells. [Review sheet](seams_hollow.png).

| Tile/check | Before | After |
|---|---|---|
| `autotile_edges:hollow_wall` | 104 mismatches/max=66.67 | 0 mismatches/max=0.00 |

Changed cells:

`hollow_wall`, `hollow_wall@1`, `hollow_wall@10`, `hollow_wall@11`, `hollow_wall@12`, `hollow_wall@13`, `hollow_wall@14`, `hollow_wall@2`, `hollow_wall@3`, `hollow_wall@4`, `hollow_wall@5`, `hollow_wall@6`, `hollow_wall@7`, `hollow_wall@8`, `hollow_wall@9`

## interior

29 changed cells. [Review sheet](seams_interior.png).

| Tile/check | Before | After |
|---|---|---|
| `autotile_edges:wall` | 104 mismatches/max=132.67 | 0 mismatches/max=0.00 |
| `autotile_edges:glass_wall` | 104 mismatches/max=63.00 | 0 mismatches/max=0.00 |

Changed cells:

`glass_wall`, `glass_wall@1`, `glass_wall@10`, `glass_wall@11`, `glass_wall@12`, `glass_wall@13`, `glass_wall@14`, `glass_wall@15`, `glass_wall@2`, `glass_wall@3`, `glass_wall@4`, `glass_wall@5`, `glass_wall@6`, `glass_wall@7`, `glass_wall@8`, `glass_wall@9`, `wall`, `wall@0`, `wall@10`, `wall@12`, `wall@13`, `wall@14`, `wall@15`, `wall@2`, `wall@4`, `wall@5`, `wall@6`, `wall@7`, `wall@8`

## nature

61 changed cells. [Review sheet](seams_nature.png).

| Tile/check | Before | After |
|---|---|---|
| `autotile_edges:tree` | 128 mismatches/max=60.33 | 0 mismatches/max=0.00 |
| `autotile_edges:maple_tree` | 128 mismatches/max=57.33 | 0 mismatches/max=0.00 |
| `autotile_edges:tapped_maple` | 124 mismatches/max=57.33 | 0 mismatches/max=0.00 |
| `autotile_edges:hedge` | 128 mismatches/max=39.50 | 0 mismatches/max=0.00 |

Changed cells:

`hedge`, `hedge@1`, `hedge@10`, `hedge@11`, `hedge@12`, `hedge@13`, `hedge@14`, `hedge@15`, `hedge@2`, `hedge@3`, `hedge@4`, `hedge@5`, `hedge@6`, `hedge@7`, `hedge@8`, `hedge@9`, `maple_tree@1`, `maple_tree@10`, `maple_tree@11`, `maple_tree@12`, `maple_tree@13`, `maple_tree@14`, `maple_tree@15`, `maple_tree@2`, `maple_tree@3`, `maple_tree@4`, `maple_tree@5`, `maple_tree@6`, `maple_tree@7`, `maple_tree@8`, `maple_tree@9`, `tapped_maple@1`, `tapped_maple@10`, `tapped_maple@11`, `tapped_maple@12`, `tapped_maple@13`, `tapped_maple@14`, `tapped_maple@15`, `tapped_maple@2`, `tapped_maple@3`, `tapped_maple@4`, `tapped_maple@5`, `tapped_maple@6`, `tapped_maple@7`, `tapped_maple@8`, `tapped_maple@9`, `tree@1`, `tree@10`, `tree@11`, `tree@12`, `tree@13`, `tree@14`, `tree@15`, `tree@2`, `tree@3`, `tree@4`, `tree@5`, `tree@6`, `tree@7`, `tree@8`, `tree@9`

## oldgrowth

61 changed cells. [Review sheet](seams_oldgrowth.png).

| Tile/check | Before | After |
|---|---|---|
| `autotile_edges:oldgrowth_tree` | 128 mismatches/max=52.33 | 0 mismatches/max=0.00 |
| `autotile_edges:canopy_boardwalk` | 124 mismatches/max=146.67 | 0 mismatches/max=0.00 |
| `autotile_edges:canopy_drop` | 128 mismatches/max=9.17 | 0 mismatches/max=0.00 |
| `autotile_edges:rope_rail` | 128 mismatches/max=84.00 | 0 mismatches/max=0.00 |

Changed cells:

`canopy_boardwalk`, `canopy_boardwalk@1`, `canopy_boardwalk@10`, `canopy_boardwalk@11`, `canopy_boardwalk@12`, `canopy_boardwalk@13`, `canopy_boardwalk@14`, `canopy_boardwalk@15`, `canopy_boardwalk@2`, `canopy_boardwalk@3`, `canopy_boardwalk@4`, `canopy_boardwalk@5`, `canopy_boardwalk@6`, `canopy_boardwalk@7`, `canopy_boardwalk@8`, `canopy_boardwalk@9`, `canopy_drop`, `canopy_drop@1`, `canopy_drop@10`, `canopy_drop@11`, `canopy_drop@12`, `canopy_drop@13`, `canopy_drop@14`, `canopy_drop@15`, `canopy_drop@2`, `canopy_drop@3`, `canopy_drop@5`, `canopy_drop@6`, `canopy_drop@7`, `canopy_drop@8`, `canopy_drop@9`, `oldgrowth_tree@1`, `oldgrowth_tree@10`, `oldgrowth_tree@11`, `oldgrowth_tree@12`, `oldgrowth_tree@13`, `oldgrowth_tree@14`, `oldgrowth_tree@15`, `oldgrowth_tree@2`, `oldgrowth_tree@3`, `oldgrowth_tree@4`, `oldgrowth_tree@5`, `oldgrowth_tree@6`, `oldgrowth_tree@7`, `oldgrowth_tree@8`, `oldgrowth_tree@9`, `rope_rail`, `rope_rail@1`, `rope_rail@10`, `rope_rail@11`, `rope_rail@12`, `rope_rail@13`, `rope_rail@14`, `rope_rail@15`, `rope_rail@2`, `rope_rail@3`, `rope_rail@4`, `rope_rail@5`, `rope_rail@6`, `rope_rail@7`, `rope_rail@9`

## orchard

45 changed cells. [Review sheet](seams_orchard.png).

| Tile/check | Before | After |
|---|---|---|
| `autotile_edges:orchard_tree` | 128 mismatches/max=54.00 | 0 mismatches/max=0.00 |
| `autotile_edges:stepping_stones` | 208 mismatches/max=31.67 | 0 mismatches/max=0.00 |

Changed cells:

`orchard_tree@1`, `orchard_tree@10`, `orchard_tree@11`, `orchard_tree@12`, `orchard_tree@13`, `orchard_tree@14`, `orchard_tree@15`, `orchard_tree@2`, `orchard_tree@3`, `orchard_tree@4`, `orchard_tree@5`, `orchard_tree@6`, `orchard_tree@7`, `orchard_tree@8`, `orchard_tree@9`, `stepping_stones@1`, `stepping_stones@10`, `stepping_stones@10__2`, `stepping_stones@11`, `stepping_stones@11__2`, `stepping_stones@12`, `stepping_stones@12__2`, `stepping_stones@13`, `stepping_stones@13__2`, `stepping_stones@14`, `stepping_stones@14__2`, `stepping_stones@15__2`, `stepping_stones@1__2`, `stepping_stones@2`, `stepping_stones@2__2`, `stepping_stones@3`, `stepping_stones@3__2`, `stepping_stones@4`, `stepping_stones@4__2`, `stepping_stones@5`, `stepping_stones@5__2`, `stepping_stones@6`, `stepping_stones@6__2`, `stepping_stones@7`, `stepping_stones@7__2`, `stepping_stones@8`, `stepping_stones@8__2`, `stepping_stones@9`, `stepping_stones@9__2`, `stepping_stones__2`

## palm_house

32 changed cells. [Review sheet](seams_palm_house.png).

| Tile/check | Before | After |
|---|---|---|
| `seam:tropical_grass:base0:f0` | x=26.83/y=29.67 | x=0.00/y=0.00 |
| `seam:tropical_grass:base0:f1` | x=28.83/y=29.67 | x=0.00/y=0.00 |
| `autotile_edges:tropical_grass` | 256 mismatches/max=38.67 | 0 mismatches/max=0.00 |

Changed cells:

`tropical_grass`, `tropical_grass@1`, `tropical_grass@10`, `tropical_grass@10__2`, `tropical_grass@11`, `tropical_grass@11__2`, `tropical_grass@12`, `tropical_grass@12__2`, `tropical_grass@13`, `tropical_grass@13__2`, `tropical_grass@14`, `tropical_grass@14__2`, `tropical_grass@15`, `tropical_grass@15__2`, `tropical_grass@1__2`, `tropical_grass@2`, `tropical_grass@2__2`, `tropical_grass@3`, `tropical_grass@3__2`, `tropical_grass@4`, `tropical_grass@4__2`, `tropical_grass@5`, `tropical_grass@5__2`, `tropical_grass@6`, `tropical_grass@6__2`, `tropical_grass@7`, `tropical_grass@7__2`, `tropical_grass@8`, `tropical_grass@8__2`, `tropical_grass@9`, `tropical_grass@9__2`, `tropical_grass__2`

## rose

16 changed cells. [Review sheet](seams_rose.png).

| Tile/check | Before | After |
|---|---|---|
| `autotile_edges:rose_trellis` | 128 mismatches/max=63.33 | 0 mismatches/max=0.00 |

Changed cells:

`rose_trellis`, `rose_trellis@1`, `rose_trellis@10`, `rose_trellis@11`, `rose_trellis@12`, `rose_trellis@13`, `rose_trellis@14`, `rose_trellis@15`, `rose_trellis@2`, `rose_trellis@3`, `rose_trellis@4`, `rose_trellis@5`, `rose_trellis@6`, `rose_trellis@7`, `rose_trellis@8`, `rose_trellis@9`

## terrain

108 changed cells. [Review sheet](seams_terrain.png).

| Tile/check | Before | After |
|---|---|---|
| `autotile_edges:tall_grass` | 256 mismatches/max=33.50 | 0 mismatches/max=0.00 |
| `seam:path:base0:f0` | x=0.00/y=0.00 | x=0.00/y=0.00 |
| `seam:path:alt0:f0` | x=0.00/y=0.00 | x=0.00/y=0.00 |
| `seam:path:alt1:f0` | x=0.00/y=0.00 | x=0.00/y=0.00 |
| `seam:path:alt2:f0` | x=0.00/y=0.00 | x=0.00/y=0.00 |
| `autotile_edges:path` | 96 mismatches/max=19.83 | 0 mismatches/max=0.00 |
| `seam:stone_path:base0:f0` | x=37.67/y=91.67 | x=0.00/y=0.00 |
| `autotile_edges:stone_path` | 128 mismatches/max=92.33 | 0 mismatches/max=0.00 |
| `seam:dirt:base0:f0` | x=4.83/y=0.00 | x=0.00/y=0.00 |
| `seam:dirt:alt0:f0` | x=12.17/y=4.83 | x=12.17/y=4.83 |
| `seam:dirt:alt1:f0` | x=9.17/y=7.33 | x=9.17/y=7.33 |
| `seam:dirt:alt2:f0` | x=12.17/y=5.00 | x=12.17/y=5.00 |
| `autotile_edges:dirt` | 112 mismatches/max=21.17 | 0 mismatches/max=0.00 |
| `seam:sand:base0:f0` | x=0.00/y=0.00 | x=0.00/y=0.00 |
| `seam:sand:alt0:f0` | x=0.00/y=9.83 | x=0.00/y=9.83 |
| `seam:sand:alt1:f0` | x=2.00/y=5.83 | x=2.00/y=5.83 |
| `seam:sand:alt2:f0` | x=2.00/y=8.00 | x=2.00/y=8.00 |
| `autotile_edges:sand` | 96 mismatches/max=22.67 | 0 mismatches/max=0.00 |
| `autotile_edges:cliff` | 128 mismatches/max=124.67 | 0 mismatches/max=0.00 |

Changed cells:

`cliff`, `cliff@1`, `cliff@10`, `cliff@11`, `cliff@12`, `cliff@13`, `cliff@14`, `cliff@15`, `cliff@2`, `cliff@3`, `cliff@4`, `cliff@5`, `cliff@6`, `cliff@7`, `cliff@8`, `cliff@9`, `dirt`, `dirt@1`, `dirt@10`, `dirt@11`, `dirt@12`, `dirt@13`, `dirt@14`, `dirt@15`, `dirt@2`, `dirt@3`, `dirt@4`, `dirt@5`, `dirt@6`, `dirt@7`, `dirt@8`, `dirt@9`, `path@1`, `path@10`, `path@11`, `path@12`, `path@13`, `path@14`, `path@2`, `path@3`, `path@4`, `path@5`, `path@6`, `path@7`, `path@8`, `path@9`, `sand@1`, `sand@10`, `sand@11`, `sand@12`, `sand@13`, `sand@14`, `sand@2`, `sand@3`, `sand@4`, `sand@5`, `sand@6`, `sand@7`, `sand@8`, `sand@9`, `stone_path`, `stone_path@1`, `stone_path@10`, `stone_path@11`, `stone_path@12`, `stone_path@13`, `stone_path@14`, `stone_path@15`, `stone_path@2`, `stone_path@3`, `stone_path@4`, `stone_path@5`, `stone_path@6`, `stone_path@7`, `stone_path@8`, `stone_path@9`, `tall_grass`, `tall_grass@1`, `tall_grass@10`, `tall_grass@10__2`, `tall_grass@11`, `tall_grass@11__2`, `tall_grass@12`, `tall_grass@12__2`, `tall_grass@13`, `tall_grass@13__2`, `tall_grass@14`, `tall_grass@14__2`, `tall_grass@15`, `tall_grass@15__2`, `tall_grass@1__2`, `tall_grass@2`, `tall_grass@2__2`, `tall_grass@3`, `tall_grass@3__2`, `tall_grass@4`, `tall_grass@4__2`, `tall_grass@5`, `tall_grass@5__2`, `tall_grass@6`, `tall_grass@6__2`, `tall_grass@7`, `tall_grass@7__2`, `tall_grass@8`, `tall_grass@8__2`, `tall_grass@9`, `tall_grass@9__2`, `tall_grass__2`

## town

16 changed cells. [Review sheet](seams_town.png).

| Tile/check | Before | After |
|---|---|---|
| `autotile_edges:stone_wall` | 128 mismatches/max=81.00 | 0 mismatches/max=0.00 |

Changed cells:

`stone_wall`, `stone_wall@1`, `stone_wall@10`, `stone_wall@11`, `stone_wall@12`, `stone_wall@13`, `stone_wall@14`, `stone_wall@15`, `stone_wall@2`, `stone_wall@3`, `stone_wall@4`, `stone_wall@5`, `stone_wall@6`, `stone_wall@7`, `stone_wall@8`, `stone_wall@9`

## water

160 changed cells. [Review sheet](seams_water.png).

| Tile/check | Before | After |
|---|---|---|
| `autotile_edges:water` | 240 mismatches/max=39.00 | 0 mismatches/max=0.00 |
| `autotile_edges:pond_lily` | 256 mismatches/max=58.67 | 0 mismatches/max=0.00 |
| `autotile_edges:water_channel` | 220 mismatches/max=35.50 | 0 mismatches/max=0.00 |
| `autotile_edges:reeds` | 128 mismatches/max=66.00 | 0 mismatches/max=0.00 |
| `autotile_edges:bridge` | 64 mismatches/max=112.00 | 0 mismatches/max=0.00 |
| `autotile_edges:bog` | 112 mismatches/max=21.00 | 0 mismatches/max=0.00 |
| `autotile_edges:boardwalk` | 116 mismatches/max=149.33 | 0 mismatches/max=0.00 |

Changed cells:

`boardwalk`, `boardwalk@1`, `boardwalk@10`, `boardwalk@11`, `boardwalk@12`, `boardwalk@13`, `boardwalk@14`, `boardwalk@15`, `boardwalk@2`, `boardwalk@3`, `boardwalk@4`, `boardwalk@5`, `boardwalk@6`, `boardwalk@7`, `boardwalk@8`, `boardwalk@9`, `bog`, `bog@1`, `bog@10`, `bog@11`, `bog@12`, `bog@13`, `bog@14`, `bog@15`, `bog@2`, `bog@3`, `bog@4`, `bog@5`, `bog@6`, `bog@7`, `bog@8`, `bog@9`, `bridge`, `bridge@0`, `bridge@1`, `bridge@10`, `bridge@11`, `bridge@12`, `bridge@13`, `bridge@14`, `bridge@15`, `bridge@2`, `bridge@3`, `bridge@4`, `bridge@5`, `bridge@6`, `bridge@7`, `bridge@8`, `bridge@9`, `pond_lily`, `pond_lily@1`, `pond_lily@10`, `pond_lily@10__2`, `pond_lily@11`, `pond_lily@11__2`, `pond_lily@12`, `pond_lily@12__2`, `pond_lily@13`, `pond_lily@13__2`, `pond_lily@14`, `pond_lily@14__2`, `pond_lily@15`, `pond_lily@15__2`, `pond_lily@1__2`, `pond_lily@2`, `pond_lily@2__2`, `pond_lily@3`, `pond_lily@3__2`, `pond_lily@4`, `pond_lily@4__2`, `pond_lily@5`, `pond_lily@5__2`, `pond_lily@6`, `pond_lily@6__2`, `pond_lily@7`, `pond_lily@7__2`, `pond_lily@8`, `pond_lily@8__2`, `pond_lily@9`, `pond_lily@9__2`, `pond_lily__2`, `reeds@1`, `reeds@10`, `reeds@11`, `reeds@12`, `reeds@13`, `reeds@14`, `reeds@15`, `reeds@2`, `reeds@3`, `reeds@4`, `reeds@5`, `reeds@6`, `reeds@7`, `reeds@8`, `reeds@9`, `water`, `water@1`, `water@10`, `water@10__2`, `water@11`, `water@11__2`, `water@12`, `water@12__2`, `water@13`, `water@13__2`, `water@14`, `water@14__2`, `water@15`, `water@15__2`, `water@1__2`, `water@2`, `water@2__2`, `water@3`, `water@3__2`, `water@4`, `water@4__2`, `water@5`, `water@5__2`, `water@6`, `water@6__2`, `water@7`, `water@7__2`, `water@8`, `water@8__2`, `water@9`, `water@9__2`, `water__2`, `water_channel`, `water_channel@1`, `water_channel@10`, `water_channel@10__2`, `water_channel@11`, `water_channel@11__2`, `water_channel@12`, `water_channel@12__2`, `water_channel@13`, `water_channel@13__2`, `water_channel@14`, `water_channel@14__2`, `water_channel@15`, `water_channel@15__2`, `water_channel@1__2`, `water_channel@2`, `water_channel@2__2`, `water_channel@3`, `water_channel@3__2`, `water_channel@4`, `water_channel@4__2`, `water_channel@5`, `water_channel@5__2`, `water_channel@6`, `water_channel@6__2`, `water_channel@7`, `water_channel@7__2`, `water_channel@8`, `water_channel@8__2`, `water_channel@9`, `water_channel@9__2`, `water_channel__2`

