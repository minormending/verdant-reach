"""Chapter 10 tiles: the Elder Grove (`grove`).

Every tile is native pixels on the named-colour canvas, light from the
top-left, at most four colours in any 8x8 quadrant (check()). No black
outlines: dark hue-shifted rims (umber-violet under the gold, lavender down
the bark, deep loam under the litter).

- aspen_tree: one pale, white-barked aspen per tile, like the Chapter 7
  larch: a golden crown with a cream shimmer over a chalk trunk that leans a
  little east, its knots short horizontal dashes (never dots or pairs, so no
  bark ever reads as a face). The crowns meet across a row, so a band of
  trunks reads as one stand. Three alternates vary the crown and the knots;
  the lean never changes: the whole Grove is one clone.
- grove_floor: golden leaf litter on dark loam, drawn on a torus so it repeats
  without a seam; the alternates keep the same outer ring (any mix joins) and
  add a drift of fresh leaves, pale mushrooms and an aspen sucker.
- grove_grass: tall pale grass and a fern on the same loam (2-frame sway), the
  Grove's encounter tile.
- root_vein: a pale root that glows green-gold (2-frame pulse). It autotiles
  (group "root_vein"): an arm runs to each joined side and meets its
  neighbour's arm pixel for pixel, so a lane is one continuous root.
- listening_clearing: a ring of pale mushrooms in moss round a soft glow
  (2-frame pulse). It joins the root group, so the lanes run into it.
"""
from __future__ import annotations

import numpy as np
from PIL import Image

import kit
from kit import Canvas

TILESETS: dict[str, dict[str, Image.Image]] = {"grove": {}}
ORDER = {"grove": ["aspen_tree", "grove_floor", "grove_grass", "root_vein", "listening_clearing"]}
NAMES = {"grove": "Elder Grove"}


def ascii(rows, key):
    cv = Canvas(16, 16)
    cv.put(rows, key, 0, 0)
    assert all(cv.get(x, y) for y in range(16) for x in range(16)), rows
    return cv


# ------------------------------------------------------------ grove floor ---
# Golden litter ('.') with lit leaves, curled leaves and the dark loam
# showing through. Drawn as a torus: every edge continues the opposite one.
FLOOR_KEY = {".": "f1", "o": "f0", "d": "f2", "x": "a3"}
FLOOR = [
    "..oo.......d....",
    ".oood...........",
    "..dd.....oo.....",
    ".........ood....",
    "....xx....d.....",
    "............oo..",
    ".oo........oood.",
    "oood........dd..",
    ".dd....xx.......",
    "........oo......",
    "....oo..ood.....",
    "...oood..d....xx",
    "....dd..........",
    "..........oo....",
    ".x.......oood...",
    "x.........d.....",
]


def floor(alt=0):
    cv = ascii(FLOOR, FLOOR_KEY)
    if alt == 1:
        # A drift of fresh-fallen gold leaves heaped against a root.
        cv.put([" oo   ", "oo.oo ", ".ooood", "oodoo ", " dd d "], {"o": "f0", ".": "f1", "d": "f2"}, 9, 9)
    elif alt == 2:
        # Pale mushrooms in the litter, each casting a little shadow. They sit
        # inside the upper-left quadrant, whose loam turns to curled leaf so
        # the quadrant keeps four colours; the outer ring is untouched.
        for y in range(1, 8):
            for x in range(1, 8):
                if cv.get(x, y) == "a3":
                    cv.px(x, y, "f2")
        cv.put([" kkk   ", "kkkkk  ", " dkd k ", "  k kkk", " dd dkd", "     k ", "    ddd"],
               {"k": "k0", "d": "f2"}, 1, 1)
    elif alt == 3:
        # An aspen sucker: a new white shoot rising from the shared root,
        # inside the upper-left quadrant (its loam turns to curled leaf).
        for y in range(1, 8):
            for x in range(1, 8):
                if cv.get(x, y) == "a3":
                    cv.px(x, y, "f2")
        cv.put(["  o  ", " ooo ", "oo.oo", " oko ", "  k  ", "  k  ", " dkd "],
               {"o": "f0", ".": "f1", "k": "k0", "d": "f2"}, 2, 1)
    return cv


# ------------------------------------------------------------ aspen tree ---
# One tree per tile: a crown of overlapping leaf clumps (drawn back to front,
# each lit on its upper-left and shaded lower-right) over a chalk trunk.
# The trunk leans a little east; its knots are single horizontal dashes.
# Quadrant budget (GBC): upper-left cream/gold/rim/litter, upper-right
# gold/amber/rim/litter, lower half litter/bark/bark shade/rim.
QUAD = {(0, 0): ("f1", "a0", "a1", "a3"), (8, 0): ("f1", "a1", "a2", "a3"),
        (0, 8): ("f1", "k0", "k1", "a3"), (8, 8): ("f1", "k0", "k1", "a3")}
FOLD = {"a0": ["a1", "a2", "a3"], "a1": ["a2", "a0", "a3"], "a2": ["a3", "a1"], "k0": ["a1", "a2"],
        "k1": ["a2", "a3"], "f1": ["a3"], "a3": ["a2"]}
# (cx, cy, r): back to front.
CROWNS = [
    [(8.4, 2.8, 3.4), (4.6, 4.2, 3.4), (12.0, 4.0, 3.6), (2.8, 7.4, 2.4), (13.2, 7.6, 2.4), (8.0, 6.2, 2.8)],
    [(7.6, 2.6, 3.6), (11.8, 4.4, 3.4), (4.2, 4.8, 3.2), (13.0, 7.8, 2.2), (3.2, 7.8, 2.6), (8.6, 6.4, 2.6)],
    [(8.8, 2.6, 3.2), (4.8, 3.8, 3.2), (12.4, 4.6, 3.4), (2.6, 7.2, 2.2), (13.4, 8.0, 2.6), (7.4, 6.6, 2.8)],
    [(8.0, 3.0, 3.6), (4.0, 4.6, 3.2), (12.2, 3.8, 3.2), (3.4, 8.0, 2.4), (12.8, 7.4, 2.6), (8.2, 6.2, 2.6)],
]
# Trunk: (row, first x, width) from the crown down; leans east going up.
TRUNK = [(7, 7, 2), (8, 7, 2), (9, 6, 3), (10, 6, 3), (11, 6, 3), (12, 6, 3), (13, 5, 4), (14, 4, 6)]
KNOTS = [(11, 7), (12, 7), (10, 7), (13, 6)]          # one dash per tree: (row, x)


def aspen(alt=0):
    cv = Canvas(16, 16)
    cv.rect(0, 0, 15, 15, "f1")
    # The trunk first: the crown's lowest clumps overlap its top.
    for y, x0, w in TRUNK:
        for x in range(x0, x0 + w):
            cv.px(x, y, "k0")
        cv.px(x0 + w, y, "k1")                     # the bark's shaded side
    ky, kx = KNOTS[alt]
    cv.hline(kx, kx + 1, ky, "a3")
    cv.hline(3, 10, 15, "a3")                      # its shadow on the litter
    for i, (cx, cy, r) in enumerate(CROWNS[alt]):
        for y in range(16):
            for x in range(16):
                dx, dy = x + 0.5 - cx, y + 0.5 - cy
                d = (dx * dx + dy * dy) ** 0.5
                if d > r:
                    continue
                lit = -(dx + dy) / (r * 1.414)       # +1 toward the upper-left
                if d > r - 1.0 and lit < -0.15:
                    c = "a3"                        # rim in shadow
                elif lit < -0.25:
                    c = "a2"
                elif lit > 0.5 and d < r * 0.75:
                    c = "a0"                        # each clump's lit crest
                elif lit < 0.1 and (x * 3 + y * 5 + i) % 7 == 0:
                    c = "a2"                        # a leaf in shadow
                else:
                    c = "a1"
                cv.px(x, y, c)
    # Fold each 8x8 quadrant into its four colours.
    for (qx, qy), allowed in QUAD.items():
        for y in range(qy, qy + 8):
            for x in range(qx, qx + 8):
                c = cv.get(x, y)
                if c in allowed:
                    continue
                for alt_c in FOLD[c]:
                    if alt_c in allowed:
                        cv.px(x, y, alt_c)
                        break
    return cv


# ------------------------------------------------------------ grove grass ---
GRASS_KEY = {".": "f1", "y": "g0", "o": "g1", "d": "g2", "x": "a3", "a": "a2"}
GRASS = [
    [
        "....y......y....",
        ".y..y.y..y.y..y.",
        ".yy.yy...yy.y.y.",
        "..yyoy....yyoy..",
        "..yooo....yooo..",
        "...ooo.....odo..",
        "...ddd....dddd..",
        ".......y........",
        "y...y.yy.....y.y",
        "yy..yyy...y.yy.y",
        ".yy..yoy..yy.yoy",
        ".ooy.ooo...yooo.",
        ".ooo.odo...oooo.",
        "..ddddd.....ddd.",
        "................",
        "................",
    ],
    [
        ".....y......y...",
        "..y..y.y..y.y..y",
        ".yy.yy...yy.y.y.",
        "..yyoy....yyoy..",
        "..yooo....yooo..",
        "...ooo.....odo..",
        "...ddd....dddd..",
        "........y.......",
        ".y...y.yy.....y.",
        "yy..yyy...y.yy.y",
        ".yy..yoy..yy.yoy",
        ".ooy.ooo...yooo.",
        ".ooo.odo...oooo.",
        "..ddddd.....ddd.",
        "................",
        "................",
    ],
]


def grass(frame):
    return ascii(GRASS[frame], GRASS_KEY)


# -------------------------------------------------------------- root vein ---
ROOT_BG = "f1"


# A root is a 2px pale core with its glow on the side away from the light.
# Straight runs wander a pixel; two perpendicular arms join in a curve (never
# a right angle through the centre); three or four meet at a gnarled knot.
# Every arm leaves its edge on the same pixels (core columns/rows 7-8, glow
# column/row 9), so joined neighbours meet exactly.
WANDER = [0, 0, 0, 0, 1, 1, 1, 0, 0, -1, -1, -1, 0, 0, 0, 0]
ROOT_LEAVES = [(2, 2, "dd"), (12, 2, "d"), (2, 13, "d"), (12, 13, "dd"), (3, 10, "d")]


def _straight(core, vertical):
    for t in range(16):
        o = WANDER[t]
        for k in (7, 8):
            core.add((k + o, t) if vertical else (t, k + o))


def _arc(core, corner):
    """A quarter-circle from one edge midpoint to the next, round `corner`."""
    cx, cy = corner
    for y in range(16):
        for x in range(16):
            d = ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2) ** 0.5
            if 7.0 <= d < 9.0:
                core.add((x, y))


def _stub(core, bit, length=8):
    for t in range(length + 1):
        for k in (7, 8):
            core.add({1: (k, t), 4: (k, 15 - t), 8: (t, k), 2: (15 - t, k)}[bit])


def root(mask, frame=1, base=None):
    cv = base or Canvas(16, 16)
    if base is None:
        cv.rect(0, 0, 15, 15, ROOT_BG)
        for x, y, s in ROOT_LEAVES:
            for i, ch in enumerate(s):
                cv.px(x + i, y, "f2")
    glow = "v2" if frame == 1 else "v1"
    n, e, s_, w = bool(mask & 1), bool(mask & 2), bool(mask & 4), bool(mask & 8)
    core = set()
    arms = n + e + s_ + w
    knot = False
    if arms == 2 and n and s_:
        _straight(core, True)
    elif arms == 2 and e and w:
        _straight(core, False)
    elif arms == 2:
        corner = (16 if e else 0, 16 if s_ else 0)
        _arc(core, corner)
    else:
        knot = True
        for bit, on in ((1, n), (2, e), (4, s_), (8, w)):
            if on:
                _stub(core, bit)
    # Keep the edge crossings canonical.
    core = {(x, y) for x, y in core if 0 <= x < 16 and 0 <= y < 16}
    for bit, on in ((1, n), (2, e), (4, s_), (8, w)):
        edge = {1: lambda p: p[1] <= 1, 4: lambda p: p[1] >= 14, 8: lambda p: p[0] <= 1, 2: lambda p: p[0] >= 14}[bit]
        core = {p for p in core if not edge(p)}
        if on:
            for t in (0, 1):
                for k in (7, 8):
                    core.add({1: (k, t), 4: (k, 15 - t), 8: (t, k), 2: (15 - t, k)}[bit])
    # Glow on the far side (east of a vertical run, south of a horizontal one).
    halo = set()
    for x, y in core:
        for dx, dy in ((1, 0), (0, 1)):
            q = (x + dx, y + dy)
            if q not in core and 0 <= q[0] < 16 and 0 <= q[1] < 16:
                halo.add(q)
    for p in halo:
        cv.px(*p, glow)
    for p in core:
        cv.px(*p, "v0")
    if knot:
        cv.put(["  v  ", " vvv ", "vvvvg", " vvg ", "  g  "], {"v": "v0", "g": glow}, 5, 5)
        cv.put(["v", " v"], {"v": "v0"}, 9, 5)
    # Fine rootlets off the long runs (interior only).
    if mask == 5:
        cv.line([(9, 4), (11, 3), (12, 1)], glow)
        cv.line([(6, 11), (4, 12)], glow)
    elif mask == 10:
        cv.line([(4, 9), (3, 11), (2, 12)], glow)
        cv.line([(11, 6), (12, 4)], glow)
    return cv


CLEAR_KEY = {"m": "v3", "k": "v0", "g": "glow", "v": "v0"}
# A mossy ring set with pale mushrooms round a soft glow; the second frame
# swells the glow by a pixel.
CLEARING = [
    [
        "................",
        ".....k....k.....",
        "...kkmmmmmmkk...",
        "..kmmmmmmmmmmk..",
        "..mmmmmmmmmmmm..",
        ".kmmmmgggmmmmmk.",
        ".mmmmggvvgmmmmm.",
        ".mmmmgvvvvgmmmm.",
        ".mmmmgvvvvgmmmm.",
        ".kmmmmgvvgmmmmk.",
        "..mmmmmggmmmmm..",
        "..mmmmmmmmmmmm..",
        "..kmmmmmmmmmmk..",
        "...kkmmmmmmkk...",
        ".....k....k.....",
        "................",
    ],
    [
        "................",
        ".....k....k.....",
        "...kkmmmmmmkk...",
        "..kmmmmmmmmmmk..",
        "..mmmmmggmmmmm..",
        ".kmmmggggggmmmk.",
        ".mmmmggvvggmmmm.",
        ".mmmggvvvvggmmm.",
        ".mmmggvvvvggmmm.",
        ".kmmmggvvggmmmk.",
        "..mmmmggggmmmm..",
        "..mmmmmggmmmmm..",
        "..kmmmmmmmmmmk..",
        "...kkmmmmmmkk...",
        ".....k....k.....",
        "................",
    ],
]


def clearing(mask=0, frame=1):
    cv = Canvas(16, 16)
    cv.rect(0, 0, 15, 15, ROOT_BG)
    glow = "v2" if frame == 1 else "v1"
    root(mask, frame, base=cv)
    cv.put(CLEARING[frame - 1], dict(CLEAR_KEY, g=glow), 0, 0)
    return cv


def build():
    for k in TILESETS:
        TILESETS[k].clear()
    g = TILESETS["grove"]
    for alt in range(4):
        g["aspen_tree" + (f"~{alt}" if alt else "")] = aspen(alt).image()
    for alt in range(4):
        g["grove_floor" + (f"~{alt}" if alt else "")] = floor(alt).image()
    g["grove_grass"] = grass(0).image()
    g["grove_grass__2"] = grass(1).image()
    for f, sfx in ((1, ""), (2, "__2")):
        g["root_vein" + sfx] = root(0, f).image()
        g["listening_clearing" + sfx] = clearing(0, f).image()
        for m in range(16):
            g[f"root_vein@{m}{sfx}"] = root(m, f).image()
            g[f"listening_clearing@{m}{sfx}"] = clearing(m, f).image()


def check():
    for tid, tiles in TILESETS.items():
        for stem, im in tiles.items():
            a = np.asarray(im)
            assert a.shape == (16, 16, 4) and (a[:, :, 3] == 255).all(), stem
            assert kit.quadrant_colours(im) <= 4, (stem, kit.quadrant_colours(im))
    # Every grove_floor variant shares the base's outer ring, so any mix joins.
    g = TILESETS["grove"]
    ring = lambda a: np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    base = ring(np.asarray(g["grove_floor"]))
    for n in (1, 2, 3):
        assert (ring(np.asarray(g[f"grove_floor~{n}"])) == base).all(), n
