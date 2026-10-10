"""Chapter 11 tiles: the Council's rooms (`council`).

Every tile is native pixels on the named-colour canvas, light from the
top-left, at most four colours in any 8x8 quadrant (check()). No black
outlines: dark hue-shifted rims (violet under the basalt, deep blue under the
night floor, deep maroon under the loam, umber under the gold).

- jar_shelf (APOTHECARY): a built-in shelf of dark wood. Dried herb bundles
  hang from the top board beside a stoppered violet bottle; a labelled green
  jar and an amber pot stand on the lower shelf. It fills its cell, so it
  stands in the wall row or on the floor alike.
- poison_bed (APOTHECARY): a raised bed of foxglove spires and nightshade
  behind a low iron rail, on the basalt floor. It autotiles (group
  "poison_bed"): joined beds share one planting, the kerb and rail run on
  across joined sides, and only open ends get a post and a kerb cap.
- star_floor (SLEEPER): deep night-blue slabs in a running bond with a silver
  star scatter; the alternates move the stars and drop a folded leaflet.
- moon_lantern (SLEEPER): a crescent moon lamp on a brass post, rising from a
  moss cushion of folded sensitive-plant leaves (2-frame glow).
- night_window (SLEEPER): the house window, frame and sill unchanged, glazed
  with the night: a crescent moon in the west pane, stars in the east.
- loam_floor (ROTTER): crumbly maroon loam, drawn on a torus; the alternates
  add pale mushrooms, a rotting leaf and white mycelium.
- rot_pool (ROTTER): a steaming bog pool in the loam (2-frame steam and
  bubbles). It autotiles (group "rot_pool"): banks only on open sides,
  rounded where two open sides meet, and the water texture is a torus, so
  joined cells meet pixel for pixel.
- brazier (KINDLER): an iron fire bowl on the resin flags (2-frame flame).
- aspen_pillar (KEEPER, lobby): a pale aspen-wood column on the marble floor.
  It autotiles north-south (group "aspen_pillar"): the top cell carries a
  crown of golden aspen leaves, the bottom cell a carved gold Council crest
  over a stepped plinth, and the shaft runs straight through joined cells.
"""
from __future__ import annotations

import math

import numpy as np
from PIL import Image

import kit
from kit import Canvas, ascii_canvas, shipped

TILESETS: dict[str, dict[str, Image.Image]] = {"council": {}}
ORDER = {"council": ["jar_shelf", "night_window", "star_floor", "loam_floor", "moon_lantern", "brazier",
                     "poison_bed", "rot_pool", "aspen_pillar"]}
NAMES = {"council": "The Council"}

BITS = ((1, 0, -1), (2, 1, 0), (4, 0, 1), (8, -1, 0))


def sides(mask):
    return bool(mask & 1), bool(mask & 2), bool(mask & 4), bool(mask & 8)


# -------------------------------------------------------------- jar shelf ---
# Quadrants: herbs (wood, back, two olives), the violet bottle (wood, back,
# violet, label), the green jar (wood, back, green, label), the amber pot
# (wood, back, amber, label).
SHELF = [
    "WWWWWWWWWWWWWWWW",
    "WxhxxxhxxxxxxxxW",
    "WxhxxxhxxxxWWxxW",
    "WxhxxxhxxxxPPxxW",
    "WHhHxHhHxxPPPPxW",
    "WHHhxHHhxxPLLPxW",
    "WhxhxhxhxxPPPPxW",
    "WWWWWWWWWWWWWWWW",
    "WxxxxxxxxxxxxxxW",
    "WxWWWWxxxxxWxxxW",
    "WxJJJJxxxxAAAxxW",
    "WxJLLJxxxAAAAAxW",
    "WxJLLJxxxALLLAxW",
    "WxJJJJxxxAAAAAxW",
    "WxxJJxxxxxAAAxxW",
    "WWWWWWWWWWWWWWWW",
]
SHELF_KEY = {"W": "w1", "x": "w3", "H": "h1", "h": "h2", "P": "p1", "L": "lb", "J": "j1", "A": "am"}


def jar_shelf():
    return ascii_canvas(SHELF, SHELF_KEY)


# -------------------------------------------------------------- star floor ---
# Running-bond slabs, 16 wide and 8 high; joints in the deepest blue, each
# slab's top-left lip lit. Stars stay off the outer ring so any mix joins.
def star_floor(alt=0):
    cv = Canvas()
    cv.rect(0, 0, 15, 15, "s2")
    # The bond is offset by (4, 4), so no joint runs along a tile edge.
    cv.hline(0, 15, 3, "s3")
    cv.hline(0, 15, 11, "s3")
    cv.vline(3, 4, 10, "s3")
    cv.vline(11, 0, 2, "s3"); cv.vline(11, 12, 15, "s3")

    def sparkle(x, y):
        cv.px(x, y, "sw")
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            cv.px(x + dx, y + dy, "st")

    if alt == 0:
        cv.px(6, 1, "st"); cv.px(13, 13, "st")
    elif alt == 1:
        sparkle(13, 6); cv.px(2, 13, "st")
    elif alt == 2:
        # A folded sensitive-plant leaflet blown onto the floor: its paired
        # leaflets closed up along the stem, as the plant does at night.
        cv.px(13, 6, "st")
        cv.put(["    gG", "   gG ", "  gG  ", " gGG  ", "gG    "], {"g": "ms2", "G": "ms1"}, 1, 9)
    else:
        cv.px(9, 6, "st"); cv.px(2, 9, "st"); cv.px(13, 14, "st")
    return cv


# -------------------------------------------------------------- loam floor ---
LOAM = [
    "..o.......d.....",
    ".ood.......x....",
    "..d.....o.......",
    "........ood.....",
    "....x....d......",
    "..............o.",
    ".o.....d.....ood",
    "ood.............",
    ".d.....o....x...",
    "......ood.......",
    "...x...d........",
    "...........o....",
    ".o........ood...",
    "ood...x....d....",
    ".d..............",
    "........d.......",
]
LOAM_KEY = {".": "l1", "o": "l0", "d": "l2", "x": "l3"}


def loam_floor(alt=0):
    cv = ascii_canvas(LOAM, LOAM_KEY)
    if alt == 1:
        # Pale mushrooms in the upper-right quadrant (its crumbs give way).
        cv.replace("l0", "l1", (8, 0, 15, 7)); cv.replace("l3", "l2", (8, 0, 15, 7))
        cv.put([" cc    ", "cccc c ", "dCCdccc", " kk CCC", " kk  k ", " dd  d "],
               {"c": "c0", "C": "c1", "k": "c0", "d": "l2"}, 8, 1)
    elif alt == 2:
        # Wet, darker loam where the steam condenses.
        cv.put(["  xx   ", " xxxx  ", "xxxxxx ", " xxxx  ", "  x    "], {"x": "l2"}, 2, 8)
        cv.put(["  dd ", " d   "], {"d": "l3"}, 3, 9)
    elif alt == 3:
        # A worm cast: a little coil of fresh crumbs.
        cv.put([" oo ", "o..o", " od ", "  d "], {"o": "l0", ".": "l1", "d": "l2"}, 9, 9)
    return cv


# ------------------------------------------------------------ moon lantern ---
def moon_lantern(frame=1):
    cv = star_floor(0)
    # Clear the floor's stars; the lamp is the only light here.
    cv.replace("st", "s2"); cv.replace("sw", "s2")
    # Halo: a soft ring round the moon, swelling on the second frame.
    cx, cy = 7.5, 3.8
    for y in range(9):
        for x in range(16):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if 3.4 < d <= (4.3 if frame == 1 else 5.0):
                cv.px(x, y, "ha")
    # The crescent: a disc with a smaller disc bitten from its east side.
    for y in range(9):
        for x in range(16):
            px, py = x + 0.5, y + 0.5
            if math.hypot(px - cx, py - cy) <= 3.3 and math.hypot(px - (cx + 1.8), py - (cy - 0.6)) > 2.5:
                lit = (px - cx) + (py - cy) < 0.6
                cv.px(x, y, "mo0" if lit else "mo1")
    # Brass post from the moon's foot into the moss.
    cv.vline(7, 7, 11, "mo1")
    cv.px(8, 8, "mo1")
    # The moss cushion, lit on its upper-left, with folded leaf sprigs.
    for y in range(9, 16):
        for x in range(16):
            dx, dy = (x + 0.5 - 8) / 7.2, (y + 0.5 - 15.2) / 5.2
            if dx * dx + dy * dy <= 1:
                cv.px(x, y, "ms1" if (dx + dy * 0.8 < -0.35 and dy < -0.4) else "ms2")
    cv.put(["G   ", "gG  ", " gG ", "  g "], {"g": "ms2", "G": "ms1"}, 2, 8)
    cv.put(["   G", "  Gg", " Gg ", " g  "], {"g": "ms2", "G": "ms1"}, 10, 8)
    cv.put(["G G", " g "], {"g": "ms2", "G": "ms1"}, 4, 12)
    cv.put(["G G", " g "], {"g": "ms2", "G": "ms1"}, 10, 13)
    cv.vline(7, 9, 10, "mo1")
    cv.fold([("s1", "s2"), ("s3", "s2"), ("ha", "s2")])
    return cv


# ----------------------------------------------------------------- brazier ---
FLAME = [
    [
        "......2.........",
        ".....22...2.....",
        ".....212..22....",
        "....2112.212....",
        "....21102112....",
        "...2110001112...",
        "...2100000012...",
        "...2110000112...",
    ],
    [
        ".........2......",
        "....2...22......",
        "....22..212.....",
        "....212.2112....",
        "...2112210112...",
        "...2110001112...",
        "...2100000112...",
        "...2110000012...",
    ],
]
BOWL = [
    "..RRRRRRRRRRRR..",
    "..iRRRRRRRRRRi..",
    "...iiiiiiiiii...",
    "....i..i...i....",
    "...i...i....i...",
    "...i...i....i...",
    "..ii..ii...ii...",
    "................",
]


def brazier(frame=1):
    cv = shipped("resin_floor")
    cv.put(FLAME[frame - 1], {"0": "fl0", "1": "rf0", "2": "rf2"}, 0, 0)
    cv.put(BOWL, {"R": "rf1", "i": "ir"}, 0, 8)
    # Firelight flickers on the bowl's belly.
    if frame == 2:
        cv.put(["..R", "R.."], {"R": "rf0"}, 6, 9)
    else:
        cv.put(["R..", "..R"], {"R": "rf0"}, 7, 9)
    cv.fold([("rf1", "rf3"), ("rf2", "rf3"), ("rf0", "rf2")])
    return cv


# --------------------------------------------------------------- poison bed ---
# One planting texture, a 16x16 torus: foxglove spires on the left, a
# nightshade bush with glossy berries on the right, all in dark soil.
PLANTS = [
    "...F............",
    "..fFF......L....",
    "...LFF....LLL...",
    "..fFFL...LLbLL..",
    "...LFFf..LLLLLL.",
    "..fFFL..LLLLFLL.",
    "...LFF...bLLF.L.",
    "..LLL.L..LLLLb..",
    ".LL.LL....LLL...",
    "LL.L.LL..LLbLL..",
    ".L...L....LL.L..",
    "..........L.....",
    "................",
    "..F.........L...",
    ".fFF.......LLL..",
    "...F.......L....",
]
PLANT_KEY = {".": "bs3", "L": "n1", "l": "n2", "F": "fx1", "f": "fx0", "b": "be"}
# The open south side, rows 8-15: leaves spill over the soil edge onto the
# lit kerb lip; the rail's dark bar crosses the kerb face on two posts.
FRONT = [
    "L.L.L.L...L.L.L.",
    "1111111111111111",
    "2212222222212222",
    "3333333333333333",
    "2232222222232222",
    "2232222222232222",
    "3333333333333333",
    "2232222222232222",
]


def poison_bed(mask):
    n, e, s, w = sides(mask)
    cv = ascii_canvas(PLANTS, PLANT_KEY)
    if not s:
        # The front: a lit kerb lip, the kerb face, and a low iron rail in
        # front of it (a dark top bar on posts with lit caps), then the floor.
        cv.put(FRONT, {"1": "bs1", "2": "bs2", "3": "bs3", "L": "n1"}, 0, 8)
    if not w:
        cv.vline(0, 0, 8 if not s else 15, "bs3")
        if not s:
            cv.put(["1", "3", "3", "3", "3", "3", "2"], {"1": "bs1", "2": "bs2", "3": "bs3"}, 0, 9)
            cv.put(["1", "2", "2", "2", "3"], {"1": "bs1", "2": "bs2", "3": "bs3"}, 1, 9)
    if not e:
        cv.vline(15, 0, 8 if not s else 15, "bs3")
        if not s:
            cv.put(["3", "3", "3", "3", "3", "3", "2"], {"2": "bs2", "3": "bs3"}, 15, 9)
            cv.put(["1", "2", "2", "2", "3"], {"1": "bs1", "2": "bs2", "3": "bs3"}, 14, 9)
    cv.fold([("fx0", "fx1"), ("n2", "bs3"), ("be", "bs3")])
    return cv


# ---------------------------------------------------------------- rot pool ---
# Murky green water: small wave arcs ('r') on a torus, so joined cells meet;
# ',' marks a deeper patch.
# Murky water: short wave glints ('r') on a torus, so joined cells meet.
# Murky water: short wave glints ('r'), kept off the cell's outer ring so a
# joined edge is plain water whatever the neighbour shows.
WATER = [
    "................",
    "..rrr...........",
    "............rr..",
    "................",
    ".......rr.......",
    ".rr.............",
    ".............rr.",
    "...........rrr..",
    "....rr..........",
    "................",
    ".............rr.",
    "..rrr...........",
    "........rr......",
    "................",
    ".rr..........rr.",
    "................",
]


def rot_pool(mask, frame=1):
    n, e, s, w = sides(mask)
    loam = loam_floor(0)
    cv = Canvas()
    # Water where every open side is at least 2px away; open corners round
    # off. The banks stay thin so a joined edge differs little whatever the
    # neighbour's other sides do (the QA autotile check).
    water = np.zeros((16, 16), bool)
    for y in range(16):
        for x in range(16):
            px, py = x + 0.5, y + 0.5
            ok = (n or py > 2) and (s or py < 14) and (w or px > 2) and (e or px < 14)
            for open_a, open_b, (cx, cy) in ((not n, not w, (6, 6)), (not n, not e, (10, 6)),
                                             (not s, not w, (6, 10)), (not s, not e, (10, 10))):
                if open_a and open_b and (px - cx) * (1 if cx > 8 else -1) > 0 and (py - cy) * (1 if cy > 8 else -1) > 0:
                    ok = ok and math.hypot(px - cx, py - cy) <= 4.0
            water[y, x] = ok

    def near_water(x, y, r):
        return any(0 <= x + dx < 16 and 0 <= y + dy < 16 and water[y + dy, x + dx]
                   for dy in range(-r, r + 1) for dx in range(-r, r + 1))

    for y in range(16):
        for x in range(16):
            if water[y, x]:
                ch = WATER[y][x]
                cv.px(x, y, {"r": "b1", ",": "b3"}.get(ch, "b2"))
            elif near_water(x, y, 1):
                cv.px(x, y, "l2")                      # a dark, wet bank round the water
            else:
                c = loam.get(x, y)
                cv.px(x, y, {"l0": "l1", "l3": "l2"}.get(c, c))
    # The banks shade the water's north and west rims (two pixels deep under
    # the far bank); the near bank's lip is lit.
    for y in range(16):
        for x in range(16):
            if not water[y, x]:
                continue
            if (y > 0 and not water[y - 1, x]) or (x > 0 and not water[y, x - 1]):
                cv.px(x, y, "b3")
    for y in range(16):
        for x in range(16):
            if not water[y, x] and y > 0 and water[y - 1, x]:
                cv.px(x, y, "l0")
    # A bubble in a ring of ripple rises in the cell's middle, and steam
    # curls up off the pool's far (north) edge; both stay clear of the cell
    # edges, so joined cells still meet.
    bx, by = (9, 9) if frame == 1 else (6, 10)
    if all(water[by + dy, bx + dx] for dy in (-1, 0, 1) for dx in (-2, -1, 0, 1, 2)):
        cv.put([" rr ", "r  r", " rr "], {"r": "b1"}, bx - 2, by - 1)
        cv.px(bx - 1, by, "sm"); cv.px(bx, by, "b2")
    if not n:
        puffs = [(5, 3), (9, 1)] if frame == 1 else [(6, 2), (9, 0)]
        for px_, py_ in puffs:
            cv.put([" ss ", "ssss", " ss "], {"s": "sm"}, px_, py_)
    cv.fold([("l2", "l1"), ("b1", "b2"), ("l0", "l1"), ("sm", "b2")])
    return cv


# ------------------------------------------------------------- night window ---
# The house window (tools/art/tiles.py) glazed with the night: its own frame,
# wall and sill, flat night-blue glass, a crescent moon in the west pane and
# stars in the east, for the SLEEPER's north wall.
def night_window():
    cv = shipped("window")
    cv.replace("wc", "s2"); cv.replace("wd", "s2")
    for x, y in ((4, 2), (5, 2), (5, 3), (6, 3), (5, 4), (6, 4), (4, 5), (5, 5)):
        cv.px(x, y, "mo0")
    cv.px(10, 3, "st"); cv.px(12, 5, "st"); cv.px(9, 7, "st")
    return cv


# ------------------------------------------------------------- aspen pillar ---
# Column cells, drawn over the marble ('.' keeps the floor). The shaft is
# chalk bark lit on the west ('k') with a violet rim ('r'), lavender in shade
# ('s') to its east edge, and casts a narrow shadow south-east ('h').
SHAFT = "....rkkkksssh..."
# The top cell: a crown of round golden aspen leaves, each lit on its
# upper-left ('w' a glint, '1' gold) and shaded lower-right ('2' amber).
CROWN = [
    "......11.11.....",
    "...1w1211w12....",
    "..1w12211w1121..",
    ".1w1121w12212.2.",
    ".11221121122122.",
    "..2212222122.2..",
    "...2rkkk2ss2h...",
    "....rkkkksssh...",
]
# The bottom cell: a carved gold crest (a leaf in a roundel, its east half in
# shade) above a stepped plinth.
CREST = [
    " 2222 ",
    "2w12s2",
    "2112s2",
    "2122s2",
    " 2222 ",
]
PLINTH = [
    "...rkkkkkksss...",
    "..rkkkkkkksssss.",
    "..rssssssssssshh",
    "...hhhhhhhhhhhh.",
]
PILLAR_KEY = {"r": "mb2", "k": "k0", "s": "k1", "h": "mb2", "w": "mb0", "1": "a1", "2": "a2", "d": "k2"}


def aspen_pillar(mask):
    n, _, s, _ = sides(mask)
    cv = shipped("floor_marble")
    cv.replace("mb3", "mb2")
    # The marble's joint lines run along its west and north edges; under a
    # column they give way to plain stone, so stacked or neighbouring column
    # cells meet without a stray line.
    cv.a[0, :] = cv.a[15, :]
    cv.a[:, 0] = cv.a[:, 15]
    for y in range(16):
        cv.put([SHAFT], PILLAR_KEY, 0, y)
    # Bark dashes (short horizontal marks, never dots, never stacked in pairs).
    if n and s:
        cv.hline(6, 7, 3, "k2"); cv.hline(7, 9, 11, "k2")
    if not n:
        # Above the crown there is only floor: clear the shaft there.
        for y in range(6):
            for x in range(4, 13):
                cv.px(x, y, "mb0")
        cv.put(CROWN, PILLAR_KEY, 0, 0)
    if not s:
        if n:
            cv.put(CREST, PILLAR_KEY, 5, 4)
        cv.put(PLINTH, PILLAR_KEY, 0, 12)
    cv.fold([("mb1", "mb0"), ("mb2", "k1"), ("k2", "k1")])
    return cv


def build():
    for k in TILESETS:
        TILESETS[k].clear()
    t = TILESETS["council"]
    t["jar_shelf"] = jar_shelf().image()
    for alt in range(4):
        t["star_floor" + (f"~{alt}" if alt else "")] = star_floor(alt).image()
        t["loam_floor" + (f"~{alt}" if alt else "")] = loam_floor(alt).image()
    for f, sfx in ((1, ""), (2, "__2")):
        t["moon_lantern" + sfx] = moon_lantern(f).image()
        t["brazier" + sfx] = brazier(f).image()
        t["rot_pool" + sfx] = rot_pool(0, f).image()
        for m in range(16):
            t[f"rot_pool@{m}{sfx}"] = rot_pool(m, f).image()
    t["night_window"] = night_window().image()
    t["poison_bed"] = poison_bed(0).image()
    t["aspen_pillar"] = aspen_pillar(0).image()
    for m in range(16):
        t[f"poison_bed@{m}"] = poison_bed(m).image()
        t[f"aspen_pillar@{m}"] = aspen_pillar(m).image()


def check():
    for tid, tiles in TILESETS.items():
        for stem, im in tiles.items():
            a = np.asarray(im)
            assert a.shape == (16, 16, 4) and (a[:, :, 3] == 255).all(), stem
            assert kit.quadrant_colours(im) <= 4, (stem, kit.quadrant_colours(im))
    t = TILESETS["council"]
    ring = lambda a: np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    for key in ("star_floor", "loam_floor"):
        base = np.asarray(t[key]).astype(int)
        for n in (1, 2, 3):
            alt = np.asarray(t[f"{key}~{n}"]).astype(int)
            assert (ring(alt) == ring(base)).all(), (key, n)
        for e1, e2 in ((base[0], base[-1]), (base[:, 0], base[:, -1])):
            assert np.abs(e1 - e2)[:, :3].mean() < 16, key
    # Joined cells meet across every reciprocal pair, every frame.
    for key, frames in (("poison_bed", [""]), ("rot_pool", ["", "__2"]), ("aspen_pillar", [""])):
        for sfx in frames:
            r = {m: np.asarray(t[f"{key}@{m}{sfx}"]).astype(int) for m in range(16)}
            for a in range(16):
                for b in range(16):
                    if a & 2 and b & 8:
                        assert np.abs(r[a][:, -1] - r[b][:, 0])[:, :3].mean() <= 16, (key, "E-W", a, b)
                    if a & 4 and b & 1:
                        assert np.abs(r[a][-1] - r[b][0])[:, :3].mean() <= 16, (key, "S-N", a, b)
