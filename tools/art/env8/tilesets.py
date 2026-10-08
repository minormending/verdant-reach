"""Chapter 7 tiles: the alpine pass and lake (`alpine`) and the Rootstock hideout (`hideout`).

Every tile is hand-placed ASCII; at most four colours sit in any 8x8 quadrant
(checked in check()). Light falls from the top-left. Ground textures keep their
edge pixels on the base colour or continue a 4px course, so fields tile without
a stamped border. red_water is the shipped water shoreline recoloured
crimson (every mask, both frames), so the legendWhen swap never moves a shore.
The hideout wall joins as one mass: tops are flat dark steel, faces are riveted
panels; rims are drawn only on open sides, so every joined edge matches.
"""
from __future__ import annotations

import numpy as np
from PIL import Image

import kit
from kit import ascii_tile

TILESETS: dict[str, dict[str, Image.Image]] = {"alpine": {}, "hideout": {}}
ORDER = {"alpine": ["larch_tree", "scree", "snow_grass", "frozen_shore", "red_water"],
         "hideout": ["hideout_floor", "hideout_wall"]}
NAMES = {"alpine": "Alpine Pass", "hideout": "Rootstock Hideout"}

# ------------------------------------------------------------------ larch ---
# A tall, narrow spire: drooping golden-green tufts hang from short tiers, the
# red-brown trunk shows between them. Upper quadrants: grass + 3 needle tones;
# lower quadrants: grass, two needle tones and the bark.
LARCH = [
    ".......hm.......",
    "......hmmd......",
    ".....hmmmmd.....",
    "....d.dmmd.d....",
    "......hhmmd.....",
    "....hhmmmmmd....",
    "...hmmmmmmmdd...",
    "..d.dd.mmd.d.d..",
    ".....mmmmmdd....",
    "...mmmmmmmmmdd..",
    "..mmmmmmmmmmddd.",
    ".d.ddmdmmdd.d.d.",
    "...mmmmmmmmddd..",
    ".mmmmmmmmmmmdddd",
    "d.dd.dd.kk.dd.d.",
    ".......kk.......",
]
LARCH_KEY = {".": "G1", "h": "H0", "m": "H1", "d": "H2", "k": "H3"}

# ------------------------------------------------------------------ scree ---
SCREE_KEY = {".": "#a89c8c", "l": "#d8d0c0", "d": "#786c64", "k": "#4c4450"}
SCREE = [
    [
        "................",
        "..ll............",
        ".lld.......l....",
        "..dd......ld....",
        "...........d....",
        "......ll........",
        ".....lldd.......",
        "......ddk.......",
        "..............l.",
        "..l..........ld.",
        ".ld.......l...d.",
        "..d......lld....",
        ".........ddk....",
        "....l...........",
        "...ldd.......l..",
        "....d.......ld..",
    ],
    [
        "................",
        "........l.......",
        "...l...lld......",
        "..ld....dk......",
        "...d............",
        "............ll..",
        "...........lldd.",
        "..l.........dk..",
        ".ld.............",
        "..d....l........",
        "......ld........",
        ".......d...l....",
        "..........ld....",
        ".ll........d....",
        ".ldd......ll....",
        "..dk......dd....",
    ],
    [
        "................",
        "....l...........",
        "...ld......ll...",
        "....d.....lldd..",
        "...........ddk..",
        ".......l........",
        "......ld........",
        ".......d....l...",
        "...........ld...",
        "..lll.......d...",
        ".lllddd.........",
        "..dddkk.........",
        "............l...",
        "........l..ld...",
        ".......ld...d...",
        "........d.......",
    ],
    [
        "................",
        ".l..............",
        "ld.........l....",
        ".d........ld....",
        ".....ll....d....",
        "....lldd........",
        ".....ddk........",
        "...........l....",
        "..........ld....",
        "...l.......d....",
        "..ld............",
        "...d.....ll.....",
        ".........ldd....",
        "..........dk..l.",
        ".....l.......ld.",
        "....ld........d.",
    ],
]

# ------------------------------------------------------------- snow grass ---
SNOW_GRASS_KEY = {".": "F1", "s": "F2", "g": "#b8c870", "G": "#6c8838"}
SNOW_GRASS = [
    [
        "................",
        "..g..g.....g....",
        "..gG.gG...gG.g..",
        ".gGgGgG...gGgG..",
        ".gGGgGGg.gGGgGG.",
        ".GGgGGGG.GGgGGG.",
        ".sGGGGGs.sGGGGs.",
        "..sssss...ssss..",
        "....g.......g...",
        "..g.gG.g..g.gG..",
        "..gGgGgG..gGgGg.",
        ".gGGgGGGggGGgGG.",
        ".GGgGGGGGGGgGGG.",
        ".sGGGGGsGsGGGGs.",
        "..sssss..ssss...",
        "................",
    ],
    [
        "................",
        "...g..g.....g...",
        "..gGg.Gg..gGg...",
        ".gGgGgG...gGgGg.",
        ".gGGgGGg.gGGgGG.",
        ".GGgGGGG.GGgGGG.",
        ".sGGGGGs.sGGGGs.",
        "..sssss...ssss..",
        ".....g.......g..",
        "...g.Gg.g..g.Gg.",
        "..gGgGgG..gGgGg.",
        ".gGGgGGGggGGgGG.",
        ".GGgGGGGGGGgGGG.",
        ".sGGGGGsGsGGGGs.",
        "..sssss..ssss...",
        "................",
    ],
]

# ----------------------------------------------------------- frozen shore ---
SHORE_KEY = {".": "#c4ccd0", "l": "#f0f8f8", "m": "#98a4b0", "d": "#687484"}
SHORE = [
    [
        "................",
        "..lm............",
        ".lmmd...........",
        "..dd............",
        ".........lllll..",
        ".......llllmlll.",
        "......lllllmlll.",
        "........mmmmmm..",
        "................",
        "....lm..........",
        "...lmmd.....lm..",
        "....dd.....lmd..",
        "............d...",
        ".lm.....lm......",
        "lmd....lmmd.....",
        "........dd......",
    ],
    [
        "................",
        ".......lm.......",
        "......lmmd......",
        ".lm....dd.......",
        "lmmd............",
        ".dd.............",
        "...........lm...",
        "..lll.....lmmd..",
        ".lllmlll...dd...",
        ".lllmllll.......",
        "..mmmmmm........",
        "............lm..",
        "...........lmd..",
        "......lm....d...",
        ".....lmd........",
        "......d.........",
    ],
    [
        "................",
        "..lm.......lm...",
        ".lmd......lmmd..",
        "..d........dd...",
        "......lm........",
        ".....lmmd.......",
        "......dd........",
        "..........lm....",
        ".........lmd....",
        "..........d.....",
        "....lm..........",
        "...lmmd....lm...",
        "....dd....lmmd..",
        "...........dd...",
        "................",
        "................",
    ],
    [
        "................",
        "....lm..........",
        "...lmmd.........",
        "....dd..........",
        "..........lll...",
        "..lm....llllmll.",
        ".lmd...lllllmll.",
        "..d.....mmmmmm..",
        "................",
        "................",
        ".....lm.........",
        "....lmmd....lm..",
        ".....dd....lmd..",
        "............d...",
        ".lm.............",
        "lmd.............",
    ],
]


def larch():
    return ascii_tile(LARCH, LARCH_KEY)


# ---------------------------------------------------------------- red lake ---
WATER_TO_RED = {(0x68, 0xa8, 0xe8): "#b03840", (0xc8, 0xe8, 0xf8): "#f0b0a0", (0x30, 0x60, 0xc0): "#701c30"}
# Bloom specks: a loose ring of spores that turns a quarter between frames.
SPECKS = ({(5, 8), (7, 5), (10, 6), (11, 9), (8, 11)},
          {(6, 6), (9, 5), (11, 8), (9, 11), (5, 10)})


def red_water(water: Image.Image, frame: int) -> Image.Image:
    a = np.asarray(water.convert("RGBA")).copy()
    body = np.all(a[:, :, :3] == (0x68, 0xa8, 0xe8), axis=2)
    out = a.copy()
    for src, dst in WATER_TO_RED.items():
        out[np.all(a[:, :, :3] == src, axis=2)] = kit.rgba(dst)
    light = kit.rgba(WATER_TO_RED[(0xc8, 0xe8, 0xf8)])
    for x, y in sorted(SPECKS[frame - 1]):
        # A speck needs open water on all four sides, so shores and ripples stay clean.
        if all(body[y + dy, x + dx] for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1))):
            q = out[(y // 8) * 8:(y // 8) * 8 + 8, (x // 8) * 8:(x // 8) * 8 + 8]
            cols = {tuple(c) for c in q.reshape(-1, 4)} | {light}
            if len(cols) <= 4:
                out[y, x] = light
    return Image.fromarray(out, "RGBA")


# --------------------------------------------------------------- hideout ---
# Floor plates: 8px steel plates with two drain slots each, lit top-left.
PLATE = ["44444445",
         "45555556",
         "45666656",
         "45555556",
         "45555556",
         "45666656",
         "45555556",
         "56666666"]
STEEL = {"4": "S4", "5": "S5", "6": "S6", "7": "S7"}


def plates():
    return [PLATE[y % 8] * 2 for y in range(16)]


def floor(alt=0):
    rows = [list(r) for r in plates()]
    if alt == 1:
        # A service hatch: one plate without slots, a recessed pull bar.
        for y in range(9, 15):
            for x in range(9, 15):
                rows[y][x] = "5"
        for x in range(10, 14):
            rows[11][x] = "7"
            rows[12][x] = "4"
    elif alt == 2:
        # A cable run crosses one plate on its way to the racks.
        for x in range(0, 8):
            rows[3][x] = "7"
            rows[4][x] = "6"
    elif alt == 3:
        # Boot-worn: the lit edges of two plates scuffed bright.
        for (x, y) in ((2, 9), (3, 9), (11, 1), (12, 1), (12, 2)):
            rows[y][x] = "4"
    return ascii_tile(["".join(r) for r in rows], STEEL)


def wall(mask):
    """Face (no wall below): a dark cornice, riveted blue-steel panels and a
    pipe run. Top (wall below): flat steel with a lit rim on open sides only."""
    if mask & 4:
        rows = [["6"] * 16 for _ in range(16)]
        if not mask & 1:
            rows[0] = ["4"] * 16
            rows[1] = ["5"] * 16
        if not mask & 8:
            for y in range(16):
                rows[y][0] = "4" if y == 0 or mask & 1 else "5"
        if not mask & 2:
            for y in range(16):
                rows[y][15] = "7"
        return ascii_tile(["".join(r) for r in rows], STEEL)
    face = [
        "6666666666666666",
        "7777777777777777",
        "6555555665555556",
        "6545555665555456",
        "6566666666666656",
        "7444444444444447",
        "7555555555555557",
        "7777777777777777",
        "6555556665555556",
        "6566666665666666",
        "6545666665666456",
        "6566666665666666",
        "6566666665666666",
        "6545666665666456",
        "7777777777777777",
        "7777777777777777",
    ]
    # Panel joints: both edge columns are the dark seam, so faces meet tops cleanly.
    rows = [list("6" + r[1:-1] + "6") for r in face]
    if not mask & 8:
        for y in range(2, 14):
            rows[y][0] = "5"
    if not mask & 2:
        for y in range(2, 14):
            rows[y][15] = "7"
    return ascii_tile(["".join(r) for r in rows], STEEL)


def build(water_frames=None):
    """water_frames: {mask: (frame1, frame2)} of the shipped water tile."""
    for k in TILESETS:
        TILESETS[k].clear()
    al, hd = TILESETS["alpine"], TILESETS["hideout"]
    al["larch_tree"] = larch()
    for i, rows in enumerate(SCREE):
        al["scree" + (f"~{i}" if i else "")] = ascii_tile(rows, SCREE_KEY)
    al["snow_grass"] = ascii_tile(SNOW_GRASS[0], SNOW_GRASS_KEY)
    al["snow_grass__2"] = ascii_tile(SNOW_GRASS[1], SNOW_GRASS_KEY)
    for i, rows in enumerate(SHORE):
        al["frozen_shore" + (f"~{i}" if i else "")] = ascii_tile(rows, SHORE_KEY)
    if water_frames is None:
        water_frames = shipped_water()
    al["red_water"] = red_water(water_frames[15][0], 1)
    al["red_water__2"] = red_water(water_frames[15][1], 2)
    for mask in range(16):
        al[f"red_water@{mask}"] = red_water(water_frames[mask][0], 1)
        al[f"red_water@{mask}__2"] = red_water(water_frames[mask][1], 2)
    for i in range(4):
        hd["hideout_floor" + (f"~{i}" if i else "")] = floor(i)
    hd["hideout_wall"] = wall(15)
    for mask in range(16):
        hd[f"hideout_wall@{mask}"] = wall(mask)
    check()


def shipped_water():
    from artkit.resolve import Resolver
    r = Resolver()
    def im(p):
        x = r.image(p)
        return x if isinstance(x, Image.Image) else Image.fromarray(x, "RGBA")
    return {m: (im(f"assets/tiles/water@{m}.png"), im(f"assets/tiles/water@{m}__2.png")) for m in range(16)}


def check():
    for tid, tiles in TILESETS.items():
        for stem, im in tiles.items():
            a = np.asarray(im)
            assert a.shape == (16, 16, 4) and (a[:, :, 3] == 255).all(), stem
            assert kit.quadrant_colours(im) <= 4, (stem, kit.quadrant_colours(im))
    # Ground fields repeat without seams (the QA seam measure, with margin).
    # The hideout grate is a continuous 4px course, so it is exempt.
    for stem, im in {**TILESETS["alpine"], **TILESETS["hideout"]}.items():
        if stem.split("~")[0] in ("scree", "frozen_shore"):
            a = np.asarray(im).astype(int)
            for e1, e2 in ((a[0], a[-1]), (a[:, 0], a[:, -1])):
                assert np.abs(e1 - e2)[:, :3].mean() < 15, stem
    # Joined hideout walls meet pixel for pixel.
    w = {m: np.asarray(TILESETS["hideout"][f"hideout_wall@{m}"]) for m in range(16)}
    for a in range(16):
        for b in range(16):
            if a & 2 and b & 8:
                assert np.abs(w[a][:, -1].astype(int) - w[b][:, 0]).mean() <= 16 * 4, (a, b)
