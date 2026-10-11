"""Post-game tiles: the Seed Vault (`vault`) and Methuselah Ridge (`summit`).

Every tile is native pixels on the named-colour canvas, light from the
top-left, at most four colours in any 8x8 quadrant (check()). No black
outlines: dark hue-shifted rims (violet under the concrete and the dolomite,
deep blue under the ice, umber under the roots).

The vault (each tile behaves exactly like the stand-in it replaces):
- vault_portal (Route 9, the spur's flanks; solid like the cliff): it joins
  the cliff's autotile group and is the shipped cliff (base = mask 15, and
  mask 11), so before the clear it is the same rock. Once the spur's stair
  opens, the two cells beside it lose their joined side (masks 9 and 7) and
  show the seed-vault portal: a narrow concrete wedge set into the
  mountainside, its face lit by a strip of pale glass, framing the stair.
- vault_wall (walls): precast frosted concrete. Where the room sees the
  wall's face, a frost-crusted lip with icicles, board marks and a steel
  conduit pipe coupled at each panel joint; above, a dark slate top with a
  frost rim on open sides. Every joined side is the dark joint, so faces and
  tops meet at any corner (group "vault_wall").
- root_wall (B2 walls; group "vault_wall"): the same concrete split by a root
  that runs down through every root-wall cell (so a column carries one
  root), pouring out of the broken face to the floor.
- vault_floor (floors): poured concrete slabs laid half a tile off the grid,
  hoar frost in the joints; the alternates add frost needles, a frost bloom
  and a hairline crack.
- vault_rime (the stand-in snow: grass encounters): a pale frost crust with
  feathery tufts of rime, the vault's long grass (two alternates).
- vault_ice (ICE; group "vault_ice"): a sheet of ice laid over the concrete,
  the slab joints ghosting through where the floor's run; open sides show a
  frosted rim and the bare concrete lip, so a crossing reads as a strip of
  ice under the lantern.
- seed_rack (the stand-in bookshelves: solid, interactable; group
  "seed_rack"): steel racks of sealed seed boxes, each with a white label.
  Joined racks share their uprights; only open ends get a post, only an open
  top gets the frosted top board, only an open foot the kick plate.
- reading_desk (one wall cell in B3; group "vault_wall"): a steel desk
  against the archive's north wall, a reading lamp under a green shade, an
  open ledger in its warm pool, labelled drawers.

The summit:
- dolomite_scree (the stand-in snow: grass encounters): pale dolomite chips
  with cushions of moss campion in flower.
- dolomite_rock (the rim, where the stand-in had cliff): angular pale boulders
  on the scree, violet in the shade (three shapes), a ring of loose crags
  against the cloud deck beyond.
- bristlecone_shrub (rim): a small wind-sculpted bristlecone growing out of
  the scree among rocks, its needles flagged to the east.
- cloud_sea (the summit's border): the top of the cloud deck far below,
  billows heaped on a torus, with two alternates.
"""
from __future__ import annotations

import math

import numpy as np
from PIL import Image

import kit
from kit import Canvas, ascii_canvas, shipped

TILESETS: dict[str, dict[str, Image.Image]] = {"vault": {}, "summit": {}}
ORDER = {
    "vault": ["vault_floor", "vault_rime", "reading_desk", "vault_wall", "root_wall", "vault_ice", "seed_rack",
              "vault_portal"],
    "summit": ["dolomite_scree", "cloud_sea", "dolomite_rock", "bristlecone_shrub"],
}
NAMES = {"vault": "The Seed Vault", "summit": "Methuselah Ridge"}

BITS = ((1, 0, -1), (2, 1, 0), (4, 0, 1), (8, -1, 0))


def sides(mask):
    return bool(mask & 1), bool(mask & 2), bool(mask & 4), bool(mask & 8)


# =========================================================== vault floor ===
# Poured slabs as wide as a tile, laid half a tile off the grid so no joint
# runs along a tile edge: the expansion joints ('j') cross at (7, 7), each
# slab's lit lip ('l') just past them, a scatter of aggregate ('a').
SLAB = [
    ".......jl.......",
    ".......jl...a...",
    "..a....jl.......",
    ".......jl.......",
    ".......jl.......",
    ".......jl.....a.",
    ".......jl.......",
    "jjjjjjjjjjjjjjjj",
    "lllllllj........",
    ".......jl.......",
    "...a...jl.......",
    ".......jl....a..",
    ".......jl.......",
    ".......jl.......",
    ".a.....jl.......",
    ".......jl.......",
]
SLAB_KEY = {".": "k1", "j": "kj", "l": "k0", "a": "kj"}


def vault_floor(alt=0):
    cv = ascii_canvas(SLAB, SLAB_KEY)
    cv.hline(8, 15, 8, "k0")
    # Hoar frost caught in the joints.
    for x, y in ((7, 3), (11, 7), (2, 7), (7, 12)):
        cv.px(x, y, "f1")
    if alt == 1:
        # Frost needles grown out along a joint.
        cv.put(["f  f", " ff ", "f  f"], {"f": "f1"}, 10, 5)
    elif alt == 2:
        # A frost bloom, feathering out from the joint crossing.
        cv.put(["  f  ", " fff f", "ffFff ", " fff  ", "f  f  "], {"f": "f1", "F": "f0"}, 9, 9)
    elif alt == 3:
        # A hairline crack across a slab.
        cv.put(["c    ", " cc  ", "   c ", "    c", "    c"], {"c": "kp"}, 1, 9)
    cv.fold([("f0", "f1"), ("kp", "kj")])
    return cv


# ============================================================= vault rime ==
# Rime crusted on the concrete: a pale frost crust ('.'), its feathery tufts
# lit on top ('0') and shaded below ('2'), bare concrete showing ('k').
RIME = [
    [
        "......k.........",
        "..0...........k.",
        ".000.0..........",
        "00200.0.........",
        "02220000....k...",
        ".2222220........",
        "k........0..0...",
        ".........00.00..",
        "....k...002000..",
        ".......002222000",
        "........222222..",
        "..0.............",
        "..00..0.....k...",
        ".00200.0........",
        "0222222.......k.",
        "................",
    ],
    [
        "........0.......",
        "...k...000.0....",
        "......00200.....",
        "......0222200...",
        "k......22222....",
        "................",
        "...0.......k....",
        "..000..0........",
        ".00200.00.......",
        ".0222220........",
        "..22222.....0...",
        "...........000..",
        ".....k....0020..",
        "..........02220.",
        "...........222..",
        "................",
    ],
    [
        "................",
        ".....k......0...",
        "...........000..",
        ".0....0...00200.",
        "000..00...022220",
        "0200.020...2222.",
        "22220222........",
        ".22222222...k...",
        "................",
        "...k............",
        ".........0..0...",
        "........000.00..",
        "......0002000200",
        "......0222222220",
        ".......2222222..",
        "................",
    ],
]
RIME_KEY = {".": "f2", "0": "f0", "2": "f3", "k": "k1"}


def vault_rime(alt=0):
    # The crust is plain along the tile's edges, so every alternate tiles
    # with every other; tufts that reached the edge pull back from it.
    rows = [r if 0 < y < 15 else "." * 16 for y, r in enumerate(RIME[alt])]
    rows = ["." + r[1:15] + "." for r in rows]
    return ascii_canvas(rows, RIME_KEY)


# ============================================================= vault wall ==
# Precast concrete panels: every joined side is the dark panel joint ('K',
# the slate of the wall top), so faces and tops meet at any corner. The face,
# top to bottom: the joint, a frost-crusted lip with icicles, board-marked
# concrete, the conduit pipe (it runs on through joined faces, coupled at
# each joint), then a dark kick of shadow where the wall meets the floor.
FACE = [
    "KKKKKKKKKKKKKKKK",
    "KffffffffffffffK",
    "KcfccccfcccccfcK",
    "KbfbbbbbbbbbbfbK",
    "KbbbbdbbbbbdbbbK",
    "KbbbbdbbbbbdbbbK",
    "KbbbbbbbbbbbbbbK",
    "KbbbbbbbbbbbbbbK",
    "KssssssKssssssKK",
    "KSSSSSSKSSSSSSKK",
    "KSSSSSSKSSSSSSKK",
    "KbbbbbbbbbbbbbbK",
    "KbbbbbbbbbbbbbbK",
    "KbbbbbbbbbbbbbbK",
    "KKKKKKKKKKKKKKKK",
    "KKKKKKKKKKKKKKKK",
]
FACE_KEY = {"f": "f1", "c": "c1", "b": "c2", "d": "c3", "s": "s0", "S": "s2", "K": "c4"}


def wall_top(mask):
    n, e, s, w = sides(mask)
    cv = ascii_canvas(["." * 16] * 16, {".": "c4"})
    # A little hoar on the slate, kept off the edges so joined tops meet.
    for x, y in ((4, 4), (11, 9), (6, 12)):
        cv.px(x, y, "c3")
    if not n:
        cv.hline(0, 15, 0, "f2"); cv.hline(0, 15, 1, "c3")
    if not w:
        cv.vline(0, 0, 15, "f3"); cv.vline(1, 1 if not n else 0, 15, "c3")
    if not e:
        cv.vline(15, 0, 15, "c3")
    return cv


def wall_face(mask):
    n, e, s, w = sides(mask)
    cv = ascii_canvas(FACE, FACE_KEY)
    if not n:
        # A free-standing wall: the slate top's frosted rim shows above the lip.
        cv.put(["ffffffffffffffff", "dddddddddddddddd"], {"d": "c4", "f": "f2"}, 0, 0)
        cv.hline(1, 14, 2, "f1")
    if not w:
        # The panel's lit return on an open end; the pipe turns into the wall.
        cv.vline(0, 1, 13, "c1")
        cv.vline(1, 8, 10, "c4")
    if not e:
        cv.vline(15, 1, 13, "c3")
    return cv


def vault_wall(mask):
    n, e, s, w = sides(mask)
    cv = wall_top(mask) if s else wall_face(mask)
    cv.fold([("f3", "f2"), ("c3", "c2"), ("c1", "c2")])
    return cv


# ============================================================== root wall ==
# The concrete cracked open by roots. One root runs down through every
# root-wall cell, entering at the top and leaving at the bottom at the same
# place (x 6-8), so a column of them carries one continuous root; it splits
# the wall's slate top along a crack full of earth, or, on a face, pours out
# of the broken concrete and spills to the floor. Each root is a tapering
# cord, lit on its upper-left ('rt0'), its body 'rt1', shaded with the
# crack's own dark ('c4').
ROOTS_TOP = [([(7, -2), (7, 2), (9, 5), (10, 8), (8, 11), (7, 14), (7, 18)], 3.2, 3.2),
             ([(9, 5), (12, 4), (13, 2)], 2.0, 1.2),
             ([(8, 11), (5, 12), (3, 10)], 2.0, 1.2)]
ROOTS_FACE = [([(7, -2), (7, 3), (6, 6), (4, 10), (3, 13), (3, 18)], 3.2, 2.6),
              ([(7, 3), (10, 6), (11, 10), (10, 13), (10, 18)], 2.6, 2.0),
              ([(5, 8), (2, 8)], 1.8, 1.4)]


def cord(cv, pts, w0, w1, body="rt1"):
    """A tapering cord along a polyline (stacked discs), body colour only."""
    n = len(pts) - 1
    for i, ((x0, y0), (x1, y1)) in enumerate(zip(pts, pts[1:])):
        steps = max(abs(x1 - x0), abs(y1 - y0), 1) * 2
        for k in range(steps + 1):
            t = k / steps
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            r = (w0 + (w1 - w0) * (i + t) / n) / 2
            for yy in range(int(y - r) - 1, int(y + r) + 2):
                for xx in range(int(x - r) - 1, int(x + r) + 2):
                    if (xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r:
                        cv.px(xx, yy, body)


def light_cords(cv, body="rt1", lit="rt0", dark="c4"):
    """Light a cord from the top-left: upper-left rims lit, lower-right rims dark."""
    src = cv.copy()
    for y in range(16):
        for x in range(16):
            if src.get(x, y) != body:
                continue
            off = lambda dx, dy: 0 <= x + dx < 16 and 0 <= y + dy < 16 and src.get(x + dx, y + dy) != body
            if off(-1, 0) or off(0, -1):
                cv.px(x, y, lit)
            elif off(1, 0) or off(0, 1):
                cv.px(x, y, dark)


def root_wall(mask):
    n, e, s, w = sides(mask)
    cv = wall_top(mask) if s else wall_face(mask)
    # The crack the root came through.
    if not s:
        cv.put(["k   k", " kkk ", "kk kk", " k  k"], {"k": "c4"}, 4, 2)
    else:
        # The slab has split along the root; earth shows in the crack.
        cord(cv, [(7, 2), (9, 5), (10, 8), (8, 11), (7, 13)], 5.0, 4.4, body="rt2")
    for pts, w0, w1 in (ROOTS_TOP if s else ROOTS_FACE):
        cord(cv, pts, w0, w1)
    light_cords(cv)
    cv.fold([("f3", "f2"), ("c3", "c4"), ("c1", "c2"), ("s0", "s2"), ("f2", "c4"), ("f1", "c2"), ("s2", "c2"),
             ("rt2", "c4")])
    return cv


# ============================================================ reading desk ==
# Against the archive's north wall: the wall face behind, a reading lamp
# under a green shade, and a steel desk whose top holds an open ledger (two
# pale pages either side of a dark spine) in the lamp's warm pool; labelled
# drawers below.
DESK = [
    "........gGGGGg..",
    ".......gGGGGGGg.",
    ".......gggggggg.",
    "KsssssssssyyKyyK",
    "KLLLkLLLsssyKyyK",
    "KLLLkLLLsssyKyyK",
    "KsssssssssyKKKyK",
    "ssssssssssssssss",
    "KddddddddddddddK",
    "KddLLLdddddbbbdK",
    "KKddKKKKKKKKddKK",
]
DESK_KEY = {"g": "gn2", "G": "gn1", "K": "c4", "s": "s1", "L": "lb", "k": "c4", "y": "lm0", "b": "lm0", "d": "s2"}


def reading_desk():
    cv = wall_face(11)
    cv.put(DESK, DESK_KEY, 0, 5)
    cv.fold([("c3", "c2"), ("c1", "c2"), ("f1", "c2")])
    return cv


# ============================================================== vault ice ==
# The sheet: pale ice over the concrete, whose joints ('j') ghost through
# where the floor's would run (crossing at (7, 7)); long glints ('0') run
# down to the right, a pressure crack ('x').
ICE = [
    ".......j........",
    "..0....j........",
    "...0...j........",
    "....0..j...x....",
    ".......j...x....",
    ".......j....x...",
    "....0..j....x...",
    "jjjjj0jjjjjjjjjj",
    ".......j..0.....",
    ".......j...0....",
    ".......j....0...",
    "..x....j........",
    "...x...j........",
    "...x...j......0.",
    "....x..j.......0",
    ".......j........",
]
ICE_KEY = {".": "i1", "0": "i0", "j": "i2", "x": "i3"}


def vault_ice(mask):
    n, e, s, w = sides(mask)
    cv = ascii_canvas(ICE, ICE_KEY)
    # Open sides: bare concrete lip, then a frosted rim on the ice; open
    # corners round off.
    for y in range(16):
        for x in range(16):
            dn, ds, dw, de = y, 15 - y, x, 15 - x
            d = min([v for v, open_ in ((dn, not n), (ds, not s), (dw, not w), (de, not e)) if open_] or [99])
            corner = ((not n and not w and dn + dw < 3) or (not n and not e and dn + de < 3)
                      or (not s and not w and ds + dw < 3) or (not s and not e and ds + de < 3))
            if d == 0 or corner:
                cv.px(x, y, "k1")
            elif d == 1:
                cv.px(x, y, "i0" if (not n and dn == 1) or (not w and dw == 1) else "f2")
    # The far (north) lip throws a sliver of shadow onto the ice.
    if not n:
        for x in range(16):
            if cv.get(x, 2) in ("i1", "i0"):
                cv.px(x, 2, "i2")
    cv.fold([("f2", "i0"), ("i3", "i2"), ("k1", "i0")])
    return cv


# ============================================================== seed rack ==
# Two shelves of sealed seed boxes: frosted steel shelf lips ('f') at rows 0,
# 7 and 14, dark headroom under each, five-pixel boxes each with a white
# label. Every joined side is the same (lips on the rows, the dark upright
# between), so racks join in runs and stacks; only an open end gets a post,
# an open top the frosted top board, an open foot the kick plate.
SHELF = ["gbbbbgbbbbbgbbbg",
         "gbLLbgbLLbbgbLbg",
         "gbbbbgbbbbbgbbbg",
         "gbbbbgbbbbbgbbbg",
         "gbbbbgbbbbbgbbbg"]
SHELF_B = ["gbbbbbgbbbbgbbbg",
           "gbLLbbgbLLbgbLLg",
           "gbbbbbgbbbbgbbbg",
           "gbbbbbgbbbbgbbbg",
           "gbbbbbgbbbbgbbbg"]
BOX_COLOURS = [("bx1", "ol1"), ("ru1", "bx1")]   # (west half, east half) per shelf


def seed_rack(mask):
    n, e, s, w = sides(mask)
    cv = ascii_canvas(["g" * 16] * 16, {"g": "s3"})
    for (rows, top), (west, east) in zip(((SHELF, 2), (SHELF_B, 9)), BOX_COLOURS):
        for j, row in enumerate(rows):
            for x, ch in enumerate(row):
                cv.px(x, top + j, {"g": "s3", "L": "lb", "b": west if x < 8 else east}[ch])
    for y in (0, 7, 14):
        cv.hline(0, 15, y, "f2")
    cv.hline(0, 15, 15, "f2" if s else "s3")
    if not n:
        cv.hline(0, 15, 0, "f1")                 # the top board, frost on it
    # Posts on open ends; a joined shelf lip runs on over them.
    y0, y1 = (1 if n else 0), (14 if s else 15)
    if not w:
        cv.vline(0, y0, y1, "f2"); cv.vline(1, y0, y1, "s3")
    if not e:
        cv.vline(15, y0, y1, "s3"); cv.vline(14, y0, y1, "s3")
    cv.fold([("f1", "f2")])
    return cv


# =========================================================== vault portal ==
# Each flank draws over the shipped cliff (whose dark rim it borrows): a
# concrete wing wall leaning in toward the stair, so the three cells read as
# one narrow wedge; a strip of pale glass runs across the top of its face.
# The rock's own top row stays (it joins the cliff above the map), and the
# east wing stands on the rock below it, so it keeps the cliff's bottom row.
def portal_flank(mask):
    cv = shipped(f"cliff@{mask}")
    west = mask == 9                      # the west flank: its stair is to the east
    lit, body, line = ("k0", "k1", "kj") if west else ("k1", "kj", "k2")
    for y in range(1, 16 if west else 15):
        xo = round(7.4 - y * 0.45)        # the wing's outer edge, leaning in as it rises
        for i in range(xo, 16):
            x = i if west else 15 - i
            if i == xo:
                col = "cD"                # the rock's dark rim against the wing
            elif i == xo + 1:
                col = lit
            elif i == 15:
                col = "k2"                # the reveal beside the door
            else:
                col = body
                if i == 11 and 6 <= y <= 13:
                    col = line            # a formwork seam
            if 2 <= y <= 4 and xo + 1 <= i <= 14:
                col = ("g0", "g1", "g2")[y - 2]
            elif y == 5 and xo + 1 <= i <= 14:
                col = "k2"                # the strip's shadow on the face
            cv.px(x, y, col)
    if west:
        # Snow drifted against the foot of the wing (the snowfield is south).
        cv.put(["   ff  ff   ff  ", "ffffffffffffffff"], {"f": "f1"}, 0, 14)
    else:
        for i in range(round(7.4 - 14 * 0.45), 16):
            cv.px(15 - i, 14, "k3")       # the wing's foot on the rock
    cliff = shipped(f"cliff@{mask}")
    cv.fold([("k0", "k1"), ("g2", "g1"), ("kj", "k1"), ("f1", "k1"), ("k3", "cD"), ("k2", "cD"),
             ("cA", "cB"), ("cC", "cD"), ("cG", "cB")])
    # The rock's joined edges stay the shipped cliff's, pixel for pixel.
    cv.a[0, :] = cliff.a[0, :]
    if west:
        cv.a[:, 0] = cliff.a[:, 0]
    else:
        cv.a[15, :] = cliff.a[15, :]
        cv.a[:, 15] = cliff.a[:, 15]
    return cv


def vault_portal(mask):
    if mask in (7, 9):
        return portal_flank(mask)
    return shipped(f"cliff@{mask}")


# ========================================================= dolomite scree ==
# Pale chips on a torus; '0' lit chip tops, '2' chip shade, '3' deep shade.
SCREE = [
    "................",
    "...........02...",
    "..02.......223..",
    ".0223...........",
    "..3.............",
    "........02......",
    ".......0223.....",
    "........3.......",
    "............02..",
    "..2.........223.",
    "................",
    "..........02....",
    "....02....223...",
    "...0223.........",
    "....3...........",
    "................",
]
SCREE_KEY = {".": "d1", "0": "d0", "2": "d2", "3": "d3"}
# A moss campion cushion: a tight dome of tiny leaves, pink flowers on top.
CUSHION = [
    " 0p0  ",
    "0pmpm1",
    "m1m1m2",
    " 2222 ",
]
CUSHION_KEY = {"0": "m0", "m": "m1", "1": "m1", "2": "m2", "p": "mp"}


def dolomite_scree(alt=0):
    cv = ascii_canvas(SCREE, SCREE_KEY)
    spots = {0: [], 1: [(9, 2)], 2: [(4, 8)], 3: [(1, 2), (9, 10)]}[alt]
    for x, y in spots:
        # Clear the chips under the cushion first so its rim stays clean.
        cv.rect(x - 1, y - 1, x + 6, y + 4, "d1")
        cv.put(CUSHION, CUSHION_KEY, x, y)
    cv.fold([("d0", "d1"), ("d3", "d2"), ("m0", "m1"), ("d2", "d1")])
    return cv


# ========================================================== dolomite rock ==
# The summit's rim: angular dolomite boulders sitting on the scree, each lit
# on its upper-left faces ('0', '1'), its body '2', shaded faces '3', the
# deepest crevices and its shadow on the scree '4'. The scree shows round
# them, so the rim reads as loose crags against the cloud beyond; three
# shapes (the base and two alternates) keep the ring from looking stamped.
BOULDERS = [
    [
        "................",
        "......0001......",
        "....001112......",
        "...00111122.....",
        "..001111222300..",
        "..0111112223011.",
        ".01111122233112.",
        ".011112223331223",
        ".111122233441223",
        ".21122223341223.",
        ".222222334412334",
        "..2222333444334.",
        "...22333444444..",
        "....444444......",
        "................",
        "................",
    ],
    [
        "................",
        "...001..........",
        "..00112...0011..",
        "..011122.001122.",
        ".0111223.0111123",
        ".0111223401112233",
        ".11122334112233.",
        ".1222233411223.4",
        ".22223334222334.",
        "..2233344233344.",
        "..333344.4444...",
        "...4444.........",
        "........001.....",
        ".......01123....",
        "........4444....",
        "................",
    ],
    [
        "................",
        "................",
        ".....00011......",
        "...000111112....",
        "..00111111223...",
        ".001111112223...",
        ".0111111122233..",
        ".1111112222333..",
        ".2111122223334..",
        ".2222222233344..",
        "..22222333444...",
        "...333344444....",
        "....4444........",
        "...........01...",
        "..........0123..",
        "...........44...",
    ],
]
BOULDER_KEY = {"0": "d0", "1": "d1", "2": "d2", "3": "d3", "4": "d4"}


def scree_ground():
    """The dolomite_scree base, chips and all, for props that stand on it."""
    return ascii_canvas(SCREE, SCREE_KEY)


def dolomite_rock(alt=0):
    cv = scree_ground()
    # Clear the chips the boulder covers or crowds, then lay the boulder.
    # Boulders keep off the tile's outer ring, so the scree joins round them.
    rows = ["." + r[1:15].ljust(14, ".") + "." if 0 < y < 15 else "." * 16 for y, r in enumerate(BOULDERS[alt])]
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != ".":
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        if cv.get(x + dx, y + dy) in ("d0", "d2", "d3"):
                            cv.px(x + dx, y + dy, "d1")
    cv.put(rows, BOULDER_KEY)
    # The lit ledges on a boulder sit on the scree's own pale: give them a
    # frost-pale top so the rock's edge still reads against it.
    cv.fold([("d0", "d1")])
    return cv


# ====================================================== bristlecone shrub ==
# A wind-sculpted bristlecone growing out of the scree among rocks: a
# twisted silver trunk ('W' lit, 'v' shade) leaning east with its rust strip
# ('R'), a dead spike, and its needles ('N') flagged east by the wind.
SHRUB = [
    "....W...........",
    "....Wv....NNN...",
    "...WWv..NNNNNNN.",
    "....Wv.NNNNNNNN.",
    ".....WvNNNNNNNN.",
    ".....WWvvNNNNN..",
    "..NNN.WWv.NNNN..",
    ".NNNNNNWWv......",
    "NNNNNN.WRv......",
    ".NNN.WWWRvv.....",
    "....W...WRvv....",
    ".......WWRRv....",
    "......WWWRRvv...",
    "...22WWWWRRvvv2.",
    "..2334444444443.",
    "................",
]
SHRUB_KEY = {"W": "bw1", "v": "d3", "R": "rb1", "N": "nd2", "2": "d2", "3": "d3", "4": "d4"}


def bristlecone_shrub():
    cv = scree_ground()
    for y in range(16):
        for x in range(16):
            if SHRUB[y][x] != "." or (y < 15 and x < 15 and SHRUB[y + 1][x + 1] != "."):
                cv.px(x, y, "d1")
    cv.put(SHRUB, SHRUB_KEY)
    # Lit tips on the windward needles.
    for x, y in ((10, 1), (9, 2), (8, 3), (2, 6), (1, 7), (0, 8)):
        cv.px(x, y, "nd0")
    cv.fold([("d0", "d1"), ("d2", "d1"), ("nd0", "nd2"), ("d4", "d3")])
    return cv


# ============================================================== cloud sea ==
# The cloud deck far below the summit: round billows heaped on each other,
# lit on their upper-left ('cl0'), their bodies 'cl1', shaded lower-right
# rims 'cl2' and the blue troughs between them 'cl3'. Billows are laid out
# on a torus, so the deck is seamless; the alternates heap one more small
# billow inside the tile (off its edges, so every mix joins). It is still:
# the map's mist drifts over it.
# (centre x, centre y, half-width, half-height): wide, low billows in two
# staggered rows, as a cloud deck looks from far above.
BILLOWS = [(4.0, 4.0, 6.5, 3.6), (12.0, 12.0, 6.5, 3.6), (12.5, 3.0, 3.6, 2.6), (4.5, 11.0, 3.4, 2.4)]
EXTRA = {1: (9.0, 7.5, 2.6, 1.8), 2: (7.5, 8.0, 3.0, 2.0)}


def cloud_sea(alt=0):
    puffs = BILLOWS + ([EXTRA[alt]] if alt else [])
    cv = Canvas()
    for y in range(16):
        for x in range(16):
            best = None
            for cx, cy, rx, ry in puffs:
                dx = (x + 0.5 - cx + 8) % 16 - 8
                dy = (y + 0.5 - cy + 8) % 16 - 8
                d = math.hypot(dx / rx, dy / ry)
                # The lower billow on screen sits in front of the one behind it.
                if d < 1 and (best is None or dy < best[2]):
                    best = (d, dx / rx, dy / ry)
            if best is None:
                cv.px(x, y, "cl3")
                continue
            d, ux, uy = best
            if ux * 0.5 + uy < -0.35:
                col = "cl0"                    # the sunlit top
            elif d > 0.72 and uy > 0.05:
                col = "cl2"                    # the shaded underside
            else:
                col = "cl1"
            cv.px(x, y, col)
    return cv


# ================================================================== build ==
def build():
    for k in TILESETS:
        TILESETS[k].clear()
    v, sm = TILESETS["vault"], TILESETS["summit"]
    for alt in range(4):
        v["vault_floor" + (f"~{alt}" if alt else "")] = vault_floor(alt).image()
        sm["dolomite_scree" + (f"~{alt}" if alt else "")] = dolomite_scree(alt).image()
    for alt in range(3):
        v["vault_rime" + (f"~{alt}" if alt else "")] = vault_rime(alt).image()
    v["reading_desk"] = reading_desk().image()
    for key, fn in (("vault_wall", vault_wall), ("root_wall", root_wall), ("vault_ice", vault_ice),
                    ("seed_rack", seed_rack)):
        v[key] = fn(0).image()
        for m in range(16):
            v[f"{key}@{m}"] = fn(m).image()
    # The portal: the shipped cliff (base = mask 15, and mask 11) until the
    # stair opens beside it; only the two flank masks are new pixels.
    v["vault_portal"] = vault_portal(15).image()
    for m in (7, 9, 11):
        v[f"vault_portal@{m}"] = vault_portal(m).image()
    for alt in range(3):
        sm["cloud_sea" + (f"~{alt}" if alt else "")] = cloud_sea(alt).image()
    for alt in range(3):
        sm["dolomite_rock" + (f"~{alt}" if alt else "")] = dolomite_rock(alt).image()
    sm["bristlecone_shrub"] = bristlecone_shrub().image()


def edge_difference(a, b):
    """tools/art/qa/checks.py edge_difference: mean RGB difference over black."""
    return float(np.abs(a[..., :3].astype(float) - b[..., :3].astype(float)).mean())


def autotile_worst(tiles, key):
    """The QA autotile_edges measure: every reciprocal pair of masks (missing
    masks fall back to the base, as the runtime does), every frame."""
    def frames(m):
        stem = f"{key}@{m}" if f"{key}@{m}" in tiles else key
        return [np.asarray(tiles[stem])] + ([np.asarray(tiles[stem + "__2"])] if stem + "__2" in tiles else [])
    v = {m: frames(m) for m in range(16)}
    worst = (0.0, None)
    for a in range(16):
        for b in range(16):
            for axis, bit, rec in (("x", 2, 8), ("y", 4, 1)):
                if a & bit and b & rec:
                    for f in range(max(len(v[a]), len(v[b]))):
                        l, r = v[a][f % len(v[a])], v[b][f % len(v[b])]
                        d = edge_difference(l[:, -1] if axis == "x" else l[-1], r[:, 0] if axis == "x" else r[0])
                        worst = max(worst, (d, (a, b, axis, f)), key=lambda t: t[0])
    return worst


AUTOTILED = {"vault": ["vault_wall", "root_wall", "vault_ice", "seed_rack", "vault_portal"], "summit": []}


def check():
    for tid, tiles in TILESETS.items():
        for stem, im in tiles.items():
            a = np.asarray(im)
            assert a.shape == (16, 16, 4) and (a[:, :, 3] == 255).all(), stem
            if stem.startswith("vault_portal"):
                # The shipped cliff, copied as it is; the flanks splice its
                # four rock colours (kept exact on the joined edges) with the
                # wing's concrete and glass, so they are exempt.
                continue
            assert kit.quadrant_colours(im) <= 4, (stem, kit.quadrant_colours(im))
    v = TILESETS["vault"]
    # Before the clear the portal is the shipped cliff, pixel for pixel.
    assert (np.asarray(v["vault_portal"]) == np.asarray(shipped("cliff@15").image())).all()
    assert (np.asarray(v["vault_portal@11"]) == np.asarray(shipped("cliff@11").image())).all()
    ring = lambda a: np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    for tid, key in (("vault", "vault_floor"), ("summit", "dolomite_scree"), ("vault", "vault_rime"),
                     ("summit", "dolomite_rock"), ("summit", "cloud_sea")):
        t = TILESETS[tid]
        base = np.asarray(t[key]).astype(int)
        for n in (1, 2, 3):
            if f"{key}~{n}" in t:
                alt = np.asarray(t[f"{key}~{n}"]).astype(int)
                assert (ring(alt) == ring(base)).all(), (key, n)
        # Fields repeat without seams (the QA seam measure); the cloud deck's
        # billow rows overlap across its edge by design, like its interior.
        if key != "cloud_sea":
            assert edge_difference(base[:, 0], base[:, -1]) <= 16 and edge_difference(base[0], base[-1]) <= 16, key
    # Joined cells meet across every reciprocal pair (the QA autotile_edges gate).
    for tid, keys in AUTOTILED.items():
        for key in keys:
            worst, where = autotile_worst(TILESETS[tid], key)
            assert worst <= 16, (key, round(worst, 2), where)
