"""Chapter 9 tiles: the desert and canyon (`desert`) and Conservatory 8's floor (`ridge`).

Every tile is native pixels on the named-colour canvas, light from the
top-left, at most four colours in any 8x8 quadrant (check()). No black
outlines: dark hue-shifted rims (deep purple-red under sandstone, olive under
scrub, deep clay in the cracks).

- desert_scrub: sage saltbush and straw tufts on sand, 2-frame sway. Its
  ground is the shipped sand colour, so a scrub patch meets open sand with no
  seam. A prickly pear stands among the swaying plants in every tile (the
  bundle format keeps alternates static, so an animated tile has none).
- cracked_earth: baked clay plates. Every variant crosses the tile edges at
  the same straight crack stubs, so any mix of variants joins pixel for pixel;
  ~3 hides a pair of living stones in a crack.
- red_rock: banded red sandstone that joins as one mass (group "red_rock").
  A cell with rock below is the weathered plateau top; a cell with open ground
  below is the cliff face, banded with strata. Rims appear only on open sides,
  so every joined edge matches.
- red_ledge: a one-way sandstone step in baked clay; it continues seamlessly east-west.
- resin_floor: worn dark-red flags in a running bond, grouted with amber resin.
"""
from __future__ import annotations

import numpy as np
from PIL import Image

import kit
from kit import Canvas

TILESETS: dict[str, dict[str, Image.Image]] = {"desert": {}, "ridge": {}}
ORDER = {"desert": ["desert_scrub", "cracked_earth", "red_ledge", "red_rock"],
         "ridge": ["resin_floor"]}
NAMES = {"desert": "Thistledown Desert", "ridge": "Sanguine Ridge"}


def ascii(rows, key):
    cv = Canvas(16, 16)
    cv.put(rows, key, 0, 0)
    assert all(cv.get(x, y) for y in range(16) for x in range(16)), rows
    return cv


# ----------------------------------------------------------- desert scrub ---
SCRUB_KEY = {".": "S1", ",": "S2", "o": "b1", "d": "b2", "y": "b0"}
# Four plants per tile, off the 8px grid: a sage bush (TL), a straw tuft (TR),
# a straw tuft (BL), a larger bush (BR). The second frame leans every tip east.
SCRUB = [
    [
        "................",
        "..o.o.o.........",
        ".ooooodo...y..y.",
        ".oodoodod...y.y.",
        ".oddoddod..yy.y.",
        ".odddddd...yyyy.",
        "..,dddd,....ydy.",
        "...,,,,....,dd,.",
        "................",
        ".y..y...........",
        "..y.y.y.........",
        "..yy.yy.........",
        "...yyy..........",
        "...ydy..........",
        "..,ddd,.........",
        "................",
    ],
    [
        "................",
        "...o.o.o........",
        ".ooooodo....y..y",
        ".oodoodod...y.y.",
        ".oddoddod..yy.y.",
        ".odddddd...yyyy.",
        "..,dddd,....ydy.",
        "...,,,,....,dd,.",
        "................",
        "..y..y..........",
        "..y.y.y.........",
        "..yy.yy.........",
        "...yyy..........",
        "...ydy..........",
        "..,ddd,.........",
        "................",
    ],
]
# The south-east plant of every tile is a prickly pear (it stands still while
# the bush and tufts sway), so each scrub patch is dotted with cacti.
PEAR = [
    "............oo..",
    "...........oooo.",
    "...........oodo.",
    "........ooyoddo.",
    ".......oooo.dd..",
    ".......oodd.o...",
    "........dd.ooo..",
    "..........oodd,.",
]
PEAR_ROWS = (8, 15)


def scrub(frame):
    rows = [list(r) for r in SCRUB[frame]]
    for j, r in enumerate(PEAR):
        for i in range(8, 16):
            rows[PEAR_ROWS[0] + j][i] = r[i]
    rows[15] = list("." * 16)
    return ascii(["".join(r) for r in rows], SCRUB_KEY)


# ---------------------------------------------------------- cracked earth ---
# Edge stubs shared by every variant: cracks cross the top/bottom edges at
# x=3 and x=11, the left/right edges at y=6 and y=13, straight for two pixels.
STUBS = [((3, 0), (3, 1)), ((11, 0), (11, 1)), ((3, 15), (3, 14)), ((11, 15), (11, 14)),
         ((0, 6), (1, 6)), ((0, 13), (1, 13)), ((15, 6), (14, 6)), ((15, 13), (14, 13))]
# Interior crack polylines per variant, joining the stub ends into plates.
CRACKS = [
    [[(3, 1), (4, 3), (5, 5), (8, 6), (10, 4), (11, 1)],
     [(1, 6), (3, 6), (5, 5)],
     [(8, 6), (9, 9), (12, 11), (14, 13)],
     [(10, 4), (12, 5), (14, 6)],
     [(9, 9), (6, 11), (3, 13), (1, 13)],
     [(3, 13), (3, 14)],
     [(12, 11), (11, 14)]],
    [[(3, 1), (2, 4), (1, 6)],
     [(2, 4), (6, 4), (9, 2), (11, 1)],
     [(6, 4), (7, 8), (11, 7), (14, 6)],
     [(7, 8), (5, 11), (3, 14)],
     [(5, 11), (1, 13)],
     [(11, 7), (12, 10), (11, 14)],
     [(12, 10), (14, 13)]],
    [[(3, 1), (5, 3), (9, 3), (11, 1)],
     [(5, 3), (4, 6), (1, 6)],
     [(9, 3), (11, 6), (14, 6)],
     [(4, 6), (6, 9), (10, 9), (11, 6)],
     [(6, 9), (4, 12), (1, 13)],
     [(4, 12), (3, 14)],
     [(10, 9), (12, 12), (14, 13)],
     [(12, 12), (11, 14)]],
    [[(3, 1), (4, 4), (2, 6), (1, 6)],
     [(4, 4), (8, 5), (11, 1)],
     [(8, 5), (10, 8), (14, 6)],
     [(10, 8), (10, 11), (14, 13)],
     [(10, 11), (11, 14)],
     [(1, 13), (4, 11), (3, 14)],
     [(4, 11), (6, 9), (10, 8)]],
]
# Two living stones tucked into a plate of ~3 (the Chapter 9 lithops).
LITHOPS = [
    ".00.00.",
    "0001000",
    "2223222",
]


def cracked(alt=0):
    cv = Canvas(16, 16)
    cv.rect(0, 0, 15, 15, "k1")
    for a, b in STUBS:
        cv.line([a, b], "k3")
    for pts in CRACKS[alt]:
        cv.line(pts, "k3")
    crack = {(x, y) for y in range(16) for x in range(16) if cv.get(x, y) == "k3"}
    # The cracks are shallow (clay shadow), deepest where they meet; the plate
    # rim south-east of a crack curls up into the light. The outer ring stays
    # plain clay so every edge matches its neighbour.
    for (x, y) in sorted(crack):
        n = sum((x + dx, y + dy) in crack for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy)
        cv.px(x, y, "k3" if n >= 3 else "k2")
    for (x, y) in sorted(crack):
        for dx, dy in ((1, 0), (0, 1)):
            nx, ny = x + dx, y + dy
            if 1 <= nx <= 14 and 1 <= ny <= 14 and (nx, ny) not in crack:
                cv.px(nx, ny, "k0")
    if alt == 3:
        key = {"0": "k0", "1": "k1", "2": "k2", "3": "k3"}
        for j, r in enumerate(LITHOPS):
            for i, ch in enumerate(r):
                if ch != ".":
                    cv.px(6 + i, 11 + j, key[ch])
    return cv


# --------------------------------------------------------------- red rock ---
# The weathered plateau top and the cliff face share their bedding planes
# (rows 5-6 and 12-13: a shadow crease over a lit lip), so a face beside a
# top, or a top above a face, continues the same strata. Edge rows stay body
# colour; only the face adds vertical joints, a lit brow and a shaded foot.
TOP = [
    "1111111111111111",
    "1111111111111111",
    "1111111111111111",
    "1110111111111111",
    "1112111222211111",
    "1111222000022111",
    "1122000111111221",
    "2200111111111122",
    "0011111111111110",
    "1111111111111111",
    "1111111111101111",
    "1111011111112111",
    "1111211111111111",
    "1111111110111111",
    "1111111112111111",
    "1111111111111111",
]
FACE = [
    "1111111111111111",
    "0000000000000000",
    "1110111110111111",
    "1112111111211111",
    "1112111111211111",
    "1122111111221111",
    "1222211112222111",
    "2222222222222222",
    "0000000000000000",
    "1111111011111011",
    "1111111211111211",
    "1110111211111211",
    "1112111221112221",
    "1222222222222222",
    "2222222222222222",
    "3333333333333333",
]
ROCK = {"0": "r0", "1": "r1", "2": "r2", "3": "r3"}


def red_rock(mask):
    cv = Canvas(16, 16)
    n, e, s, w = (mask & 1), (mask & 2), (mask & 4), (mask & 8)
    rows = [list(r) for r in (TOP if s else FACE)]
    if not n:
        rows[0] = list("2" * 16)
        rows[1] = list("0" * 16)
    for y in range(16):
        if not w:
            rows[y][0] = "2" if y == 0 or y >= 14 else "0"
        if not e:
            rows[y][15] = "3"
            if y > 0 and rows[y][14] != "3":
                rows[y][14] = "2"
    if not n:
        if not w:
            rows[1][0] = "2"
        if not e:
            rows[0][15] = "3"
    cv.put(["".join(r) for r in rows], ROCK, 0, 0)
    return cv


# -------------------------------------------------------------- red ledge ---
# The ledge sits in baked clay: the clay above keeps cracked_earth's edge
# stubs (x=3 and x=11), so it joins the clay field to the north; the drop
# casts a clay shadow onto the landing below.
LEDGE = [
    "...,.......,....",
    "...,.......,....",
    "................",
    "................",
    "................",
    "................",
    "0000000000000000",
    "1111111111111111",
    "1121111111211111",
    "2222222222222222",
    "1111211111112111",
    "2222222222222222",
    "3333333333333333",
    ";;;;;;;;;;;;;;;;",
    ";;;;;;;;;;;;;;;;",
    ";;;;;;;;;;;;;;;;",
]
LEDGE_KEY = {".": "k1", ",": "k2", ";": "k2", **ROCK}


def red_ledge():
    return ascii(LEDGE, LEDGE_KEY)


# ------------------------------------------------------------ resin floor ---
# Two courses of 8x8 flags in a running bond. Each flag is lit along its top
# and west edges; the grout is dark resin that glints amber where joints meet.
FLAG = [
    "00000000",
    "01111111",
    "01111111",
    "01111111",
    "01111111",
    "01111111",
    "01111111",
    "eeeeeeee",
]
FLAG_KEY = {"0": "h0", "1": "h1", "e": "e2", "g": "e1"}


def resin(alt=0):
    rows = []
    for y in range(16):
        r = FLAG[y % 8]
        off = 0 if y < 8 else 4
        rows.append(list((r * 3)[8 - off: 8 - off + 16]))
    # Vertical joints: the last column of each flag in its course.
    for y in range(16):
        for x in range(16):
            if (x + (4 if y >= 8 else 0)) % 8 == 7:
                rows[y][x] = "e"
    # Amber glints where the resin pools at a few joint crossings.
    for x, y in ((7, 7), (3, 15)):
        rows[y][x] = "g"
    if alt == 1:
        # A cracked flag, the crack filled with resin.
        for x, y in ((9, 9), (10, 10), (10, 11), (11, 12), (12, 12)):
            rows[y][x] = "e"
    elif alt == 2:
        # Resin wept from a joint: a small amber bead.
        for x, y in ((6, 5), (6, 6), (5, 6)):
            rows[y][x] = "g"
        rows[6][7] = "g"
    elif alt == 3:
        # Foot-worn: the centre of the lower flag polished pale.
        for x, y in ((9, 10), (10, 10), (8, 11), (9, 11), (10, 11), (9, 12)):
            rows[y][x] = "0"
    return ascii(["".join(r) for r in rows], FLAG_KEY)


def build():
    for k in TILESETS:
        TILESETS[k].clear()
    de, ri = TILESETS["desert"], TILESETS["ridge"]
    de["desert_scrub"] = scrub(0).image()
    de["desert_scrub__2"] = scrub(1).image()
    for alt in range(4):
        de["cracked_earth" + (f"~{alt}" if alt else "")] = cracked(alt).image()
    de["red_ledge"] = red_ledge().image()
    de["red_rock"] = red_rock(15).image()
    for mask in range(16):
        de[f"red_rock@{mask}"] = red_rock(mask).image()
    for alt in range(4):
        ri["resin_floor" + (f"~{alt}" if alt else "")] = resin(alt).image()
    check()


def check():
    for tid, tiles in TILESETS.items():
        for stem, im in tiles.items():
            a = np.asarray(im)
            assert a.shape == (16, 16, 4) and (a[:, :, 3] == 255).all(), stem
            assert kit.quadrant_colours(im) <= 4, (stem, kit.quadrant_colours(im))
    # Ground fields repeat without seams, and every cracked_earth variant
    # shares its outer ring, so any mix of variants joins pixel for pixel.
    de = TILESETS["desert"]
    ring = None
    for stem in ("cracked_earth", "cracked_earth~1", "cracked_earth~2", "cracked_earth~3"):
        a = np.asarray(de[stem]).astype(int)
        edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
        ring = edge if ring is None else ring
        assert (edge == ring).all(), stem
        for e1, e2 in ((a[0], a[-1]), (a[:, 0], a[:, -1])):
            assert np.abs(e1 - e2)[:, :3].mean() < 16, stem
    # Joined sandstone meets pixel for pixel across every reciprocal pair.
    r = {m: np.asarray(de[f"red_rock@{m}"]).astype(int) for m in range(16)}
    for a in range(16):
        for b in range(16):
            if a & 2 and b & 8:
                assert np.abs(r[a][:, -1] - r[b][:, 0])[:, :3].mean() <= 16, ("E-W", a, b)
            if a & 4 and b & 1:
                assert np.abs(r[a][-1] - r[b][0])[:, :3].mean() <= 16, ("S-N", a, b)
