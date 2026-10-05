"""Chapter 4 structures: Glasshouse City under its dome.

  relay_station      ROOT RELAY: warm-stone institute with a steel mansard,
                     porthole dormers, a lattice mast and copper cables that
                     run into the ground like roots
  nursery_garden     sage-green potting shed with a gable sign and glass
                     lean-tos full of seedlings
  palm_house         curvilinear white-iron glasshouse (two-tier nave,
                     apsidal wings) with palms pressing at the glass
  city_house         two-storey honey-stone townhouse: slate mansard,
                     dormer, iron balcony, bay window, rose boxes
  market_large       GLASSHOUSE MARKET: clock tower and an iron-and-glass
                     train-shed gable over striped stalls
  rose_conservatory  Flora's CONSERVATORY: blush glass, gilt ribs, an ogee
                     roof, a rose window, roses climbing the base
  fountain           three-tier Victorian fountain in a round stone basin
  relay_mast         lattice listening mast with a brass horn and beacon

Same rules as structures.py: light from the top-left, hue-shifted dark
edges, lit blue window glass (src/overworld/lights.ts glows any blue pane
cluster of 2-96 px and <=15 px across), transparent outside the silhouette.
"""

from __future__ import annotations

import math

import numpy as np
from PIL import Image

import kit
from kit import Canvas, S

STRUCTS = {  # mirrors src/contracts/ids.ts STRUCTURES
    "relay_station": (6, 4, (2, 3)),
    "nursery_garden": (5, 3, (2, 2)),
    "palm_house": (6, 4, (3, 3)),
    "city_house": (4, 4, (1, 3)),
    "market_large": (6, 4, (3, 3)),
    "rose_conservatory": (6, 4, (3, 3)),
    "fountain": (3, 3, None),
    "relay_mast": (1, 3, None),
}
IMAGES: dict[str, Image.Image] = {}

window, door, plaque, glazing, foundation = S.window, S.door, S.plaque, S.glazing, S.foundation
roof_hip, bricks, text_w, chimney, flowerbox = S.roof_hip, S.bricks, S.text_w, S.chimney, S.flowerbox
eaves_shadow, plaster = S.eaves_shadow, S.plaster
STONE = ("H0", "H1", "H2", "H3")


# ------------------------------------------------------------- components ---
def ashlar(cv, x0, y0, x1, y1, course=4, length=8, ramp=STONE):
    """Coursed warm-stone blocks: lit top edge per course, mauve joints,
    the east end in shade."""
    h0, h1, h2, h3 = ramp
    cv.rect(x0, y0, x1, y1, h1)
    for row, yy in enumerate(range(y0, y1 + 1, course)):
        cv.hline(x0, x1, yy, h0)
        cv.hline(x0, x1, min(y1, yy + course - 1), h2)
        off = (row % 2) * (length // 2)
        for xx in range(x0 + off, x1 + 1, length):
            cv.vline(xx, yy + 1, min(y1, yy + course - 1), h2)
    cv.vline(x1, y0, y1, h2)


def rose_cluster(cv, x, y, big=False):
    cv.put([" rr", "rRr", " r "] if not big else [" rr ", "rrRr", "rRRr", " rr "],
           {"r": "RO1", "R": "RO2"}, x, y)
    cv.px(x + 1, y, "RO0")


def climbing_roses(cv, x0, x1, ybase, height, seed=0):
    rng = np.random.default_rng(seed)
    for xx in range(x0, x1 + 1):
        top = ybase - height + int(rng.integers(0, 4))
        for yy in range(top, ybase + 1):
            if (xx + yy) % 3 or yy > top + 1:
                cv.px(xx, yy, "L2" if (xx * 7 + yy) % 5 else "G2")
    for xx in range(x0 + 1, x1, 5):
        rose_cluster(cv, xx + int(rng.integers(0, 2)), ybase - height + 1 + int(rng.integers(0, 3)))


def iron_cresting(cv, x0, x1, y):
    """Victorian roof cresting: a rail with fleur finials."""
    cv.hline(x0, x1, y, "I3")
    for xx in range(x0 + 1, x1, 3):
        cv.px(xx, y - 1, "I3")
        cv.px(xx, y - 2, "I1")


def curved_glass(cv, xs, top_of, ybot, pane=4, ribs=("R0", "R1"), glass=("Q0", "Q1", "Q2", "Q3"),
                 rib_every=4, rings=(), lit_split=0.55):
    """Fill x in xs from top_of(x) down to ybot with glass; vertical ribs
    every `rib_every`, horizontal glazing bars at `rings` (absolute y)."""
    x0, x1 = xs[0], xs[-1]
    span = max(1, x1 - x0)
    for xx in xs:
        t = (xx - x0) / span
        top = top_of(xx)
        for yy in range(top, ybot + 1):
            col = glass[1] if t < lit_split else (glass[2] if t < 0.85 else glass[3])
            cv.px(xx, yy, col)
        cv.px(xx, top, ribs[0] if t < lit_split else ribs[1])
        if (xx - x0) % rib_every == 0:
            cv.vline(xx, top, ybot, ribs[0] if t < lit_split else ribs[1])
        for ry in rings:
            if ry > top:
                cv.px(xx, ry, ribs[0] if t < lit_split else ribs[1])


def palm_crown(cv, cx, cy, size=1.0, seed=0, pal=("TP1", "TP2", "TP3")):
    """A small palm head (fronds arching out and down)."""
    for ang, L, droop in ((-170, 9, .6), (-135, 8, .35), (-95, 6, .1), (-55, 8, .35), (-12, 9, .6),
                          (160, 7, 1.0), (25, 7, 1.0)):
        r = math.radians(ang)
        lit = ang < -60 or ang > 150
        for k in range(1, 30):
            t = k / 29
            x = cx + L * size * t * math.cos(r)
            y = cy + L * size * t * math.sin(r) + droop * 7 * size * t * t
            xi, yi = int(round(x)), int(round(y))
            cv.px(xi, yi, pal[0] if lit else pal[1])
            if 0.25 < t < 0.95:
                cv.px(xi, yi + 1, pal[2])


# ------------------------------------------------------------- buildings ----
def relay_station():
    cv = Canvas(96, 64)
    # steel mansard roof with porthole dormers
    for yy in range(16, 29):
        inset = max(0, (20 - yy) * 2) if yy < 20 else 0
        for xx in range(2 + inset, 94 - inset):
            t = (xx - 2) / 91
            col = "ST1" if t < 0.6 else "ST2"
            if (xx + (yy // 3) * 2) % 6 == 0:
                col = "ST2" if t < 0.6 else "ST3"
            if yy % 3 == 0:
                col = "ST0" if t < 0.6 else "ST1"
            cv.px(xx, yy, col)
        cv.px(2 + inset, yy, "ST0"); cv.px(93 - inset, yy, "ST3")
    cv.hline(10, 85, 16, "ST3")
    iron_cresting(cv, 12, 62, 15)
    for dx in (12, 32, 52):
        cv.rect(dx, 19, dx + 9, 27, "ST3")
        cv.rect(dx + 1, 20, dx + 8, 27, "H0")
        cv.vline(dx + 8, 20, 27, "H2")
        cv.rect(dx - 1, 18, dx + 10, 19, "ST3"); cv.hline(dx, dx + 9, 18, "ST1")
        cv.put([" ## ", "#ww#", "#wW#", " ## "], {"#": "ST3", "w": "W1", "W": "W2"}, dx + 3, 21)
        cv.px(dx + 4, 22, "W0")
    # the listening mast rises from the east end of the roof: a tapering
    # lattice, a brass ear turned to the ground and a red beacon
    for yy in range(4, 20):
        half = 1 + (yy - 4) // 4
        xl, xr = 79 - half, 80 + half
        cv.px(xl, yy, "I1"); cv.px(xr, yy, "I3")
        k = (yy - 4) % 4
        if k == 0:
            cv.hline(xl, xr, yy, "I3")
        else:
            cv.px(xl + k * (xr - xl) // 4, yy, "I2")
    cv.put([
        "  cc   ",
        " cCCc  ",
        "cCyyCc ",
        "cCyyCc#",
        " cCCc  ",
        "  cc   ",
    ], {"c": "C2", "C": "C1", "y": "Y1", "#": "I3"}, 70, 3)
    cv.put(["k", "K", "#"], {"k": "K1", "K": "B2", "#": "I3"}, 79, 1)
    cv.px(80, 1, "K1"); cv.px(80, 2, "B2"); cv.px(80, 3, "I3")
    cv.rect(74, 19, 85, 20, "ST3"); cv.hline(75, 84, 19, "ST1")
    cv.hline(1, 94, 28, "ST3")
    cv.hline(1, 94, 29, "H3")
    # sign band: phosphor letters on a dark panel
    cv.rect(0, 30, 95, 38, "H1"); cv.hline(0, 95, 30, "H0"); cv.hline(0, 95, 38, "H2")
    sw = text_w("ROOT RELAY") + 8
    sx = 48 - sw // 2
    cv.rect(sx, 30, sx + sw - 1, 38, "ST3")
    cv.hline(sx + 1, sx + sw - 2, 31, "ST2")
    cv.text("ROOT RELAY", sx + 4, 32, "PH1")
    # stone walls
    ashlar(cv, 0, 39, 95, 61)
    cv.vline(0, 30, 61, "H0")
    window(cv, 5, 42, 10, 13, frame="ST3", sill="H0")
    window(cv, 55, 42, 10, 13, frame="ST3", sill="H0")
    window(cv, 79, 42, 10, 13, frame="ST3", sill="H0")
    # door: steel double door under a fanlight
    cv.rect(31, 41, 48, 62, "H2")
    cv.rect(32, 42, 47, 62, "H0")
    cv.put([
        "  ######  ",
        " #wwwwww# ",
        "#wW#ww#Ww#",
        "##########",
    ], {"#": "ST3", "w": "W1", "W": "W2"}, 35, 42)
    door(cv, 2, 3, "double", top=47, ramp=("ST0", "ST1", "ST2", "ST3"))
    # copper cables run down the corners and root into the ground
    for cx0 in (18, 73):
        cv.vline(cx0, 29, 59, "C1"); cv.vline(cx0 + 1, 29, 59, "C2")
        for i, (dx, dy) in enumerate(((-2, 0), (-3, 1), (-4, 2), (2, 0), (3, 1), (4, 2), (5, 2))):
            cv.px(cx0 + dx, 60 + dy, "C2" if dx > 0 else "C1")
        cv.hline(cx0 - 1, cx0 + 2, 60, "C2")
    foundation(cv, 0, 95, 62, 63, STONE)
    return cv


def nursery_garden():
    cv = Canvas(80, 48)
    # glass lean-tos: west (x0..21) and east (x63..79), roofs sloping off the shed
    for (x0, x1, west) in ((0, 21, True), (62, 79, False)):
        def top(xx, x0=x0, x1=x1, west=west):
            t = (xx - x0) / (x1 - x0)
            return int(round(14 + (1 - t) * 10)) if west else int(round(14 + t * 10))
        curved_glass(cv, list(range(x0, x1 + 1)), top, 29, rib_every=4,
                     ribs=("T0", "R1"), lit_split=0.6 if west else 0.3)
        cv.hline(x0, x1, 30, "T0")
        glazing(cv, x0, 31, x1, 44, pw=5, ph=7, frame="T0", frame_dark="R1", seed=21 if west else 22)
        cv.recolor(x0, 31, x1, 44, "L2", "G2")
        cv.vline(x0 if west else x1, 24 if west else 24, 44, "R1" if not west else "T0")
    # potting shed: sage-green boards under a terracotta gable
    cx = 41
    for yy in range(2, 22):
        half = 4 + (yy - 2)
        for xx in range(cx - half, cx + half + 1):
            col = "B1" if xx <= cx else "B2"
            if (yy - 2) % 3 == 0:
                col = "B0" if xx <= cx else "B1"
            elif (xx + yy) % 4 == 0:
                col = "B2" if xx <= cx else "B3"
            cv.px(xx, yy, col)
        cv.px(cx - half, yy, "B3"); cv.px(cx + half, yy, "B3")
    cv.hline(cx - 3, cx + 3, 2, "B3")
    # gable end (boards) with the sign
    for yy in range(8, 22):
        half = (yy - 8)
        for xx in range(cx - half, cx + half + 1):
            cv.px(xx, yy, "G2" if (xx - cx) % 3 else "L2")
    cv.rect(20, 22, 62, 44, "G2")
    for xx in range(20, 63, 3):
        cv.vline(xx, 22, 44, "L2")
        cv.vline(xx + 1, 22, 44, "G1")
    cv.vline(20, 22, 44, "G1"); cv.vline(62, 22, 44, "L3")
    eaves_shadow(cv, 20, 62, 22, "L3", "L2")
    sw = plaque(cv, cx - (text_w("NURSERY") + 6) // 2, 13, "NURSERY", bg="E0", ink="L3", frame="O3")
    # window with seedlings on the sill (west of door) and a pot shelf (east)
    window(cv, 23, 27, 8, 9, frame="O3", sill="O1")
    window(cv, 51, 27, 8, 9, frame="O3", sill="O1")
    for xx in (24, 27, 52, 55):
        cv.put([" g", "pp"], {"g": "G1", "p": "C1"}, xx, 35)
    door(cv, 2, 2, "wood", top=27, ramp=("O0", "O1", "O2", "O3"))
    # a staging bench of seed trays outside the east lean-to, and a water butt
    cv.rect(64, 40, 78, 41, "O1"); cv.hline(64, 78, 42, "O3")
    for xx in range(65, 78, 2):
        cv.px(xx, 39, "G1")
    cv.vline(65, 43, 45, "O3"); cv.vline(77, 43, 45, "O3")
    cv.put([" ### ", "#OoO#", "#ooO#", "#OoO#", "#ooO#", " ### "],
           {"#": "O3", "o": "O1", "O": "O2"}, 13, 40)
    foundation(cv, 0, 79, 45, 47, ("H0", "H1", "H2", "H3"))
    return cv


def palm_house():
    cv = Canvas(96, 64)
    # wings: low walls with apsidal (quarter-round) outer ends
    def wing_top(xx, x0, x1, west):
        d = (x1 - xx) if west else (xx - x0)        # distance from the nave
        r = 12
        base = 24
        span = x1 - x0
        if d > span - r:                             # rounding into the end
            u = (d - (span - r)) / r
            return int(round(base + r - r * math.sqrt(max(0.0, 1 - u * u)) + 2))
        return base
    for (x0, x1, west, seed) in ((0, 27, True, 31), (68, 95, False, 32)):
        xs = list(range(x0, x1 + 1))
        curved_glass(cv, xs, lambda xx: wing_top(xx, x0, x1, west), 39,
                     rib_every=3, rings=(30, 35), lit_split=0.55)
        glazing(cv, x0, 40, x1, 56, pw=4, ph=8, seed=seed)
        cv.recolor(x0, 40, x1, 56, "L2", "TP2"); cv.recolor(x0, 40, x1, 56, "G2", "TP1")
        cv.recolor(x0, 40, x1, 56, "G1", "TP1")
        cv.hline(x0, x1, 39, "R0")
        foundation(cv, x0, x1, 57, 63, STONE)
    # nave: tall curved roof, then a raised clerestory with its own curve
    def nave_top(xx):
        u = (xx - 47.5) / 20.5
        return int(round(30 - 12 * math.sqrt(max(0.0, 1 - u ** 4))))
    xs = list(range(27, 69))
    curved_glass(cv, xs, nave_top, 36, rib_every=3, rings=(27, 32), lit_split=0.5)

    def clere_top(xx):
        u = (xx - 47.5) / 10.5
        return int(round(16 - 12 * math.sqrt(max(0.0, 1 - u ** 4))))
    xs2 = list(range(37, 59))
    curved_glass(cv, xs2, clere_top, 17, rib_every=3, rings=(10,), lit_split=0.5)
    cv.hline(37, 58, 17, "R0")
    # palms inside, pressing up under the clerestory and the wing roofs
    palm_crown(cv, 45, 13, 0.9)
    palm_crown(cv, 14, 30, 0.6)
    palm_crown(cv, 82, 31, 0.6)
    cv.vline(45, 14, 36, "O2"); cv.vline(46, 15, 36, "O3")
    # finials
    for fx in (47, 48):
        cv.vline(fx, 1, 3, "R1")
    cv.px(47, 0, "Y1")
    # sign band across the nave
    cv.rect(27, 37, 68, 44, "R0")
    cv.rect(28, 37, 67, 43, "L3")
    cv.hline(28, 67, 37, "L2")
    cv.text("PALM HOUSE", 48 - text_w("PALM HOUSE") // 2, 38, "T0", "TP3")
    glazing(cv, 27, 45, 68, 56, pw=5, ph=6, seed=33)
    cv.recolor(27, 45, 68, 56, "L2", "TP2"); cv.recolor(27, 45, 68, 56, "G2", "TP1")
    cv.recolor(27, 45, 68, 56, "G1", "TP1")
    for xx in (27, 68):
        cv.vline(xx, 18, 56, "R0" if xx == 27 else "R1")
    foundation(cv, 27, 68, 57, 63, STONE)
    # door: glass double door in a white arch, lit lamps either side
    cv.rect(49, 45, 62, 46, "R0")
    door(cv, 3, 3, "glass", top=47)
    cv.put([" ######## ", "#wWwwWwwW#"], {"#": "R0", "w": "W1", "W": "W2"}, 51, 45)
    for lx in (46, 64):
        cv.put(["y", "Y", "#"], {"y": "Y0", "Y": "Y1", "#": "I3"}, lx, 50)
    return cv


def city_house():
    cv = Canvas(64, 64)
    chimney(cv, 3, 0, 9, ("H0", "H1", "H2", "H3"))
    chimney(cv, 53, 0, 9, ("H0", "H1", "H2", "H3"))
    for xx in (5, 55):
        cv.rect(xx, -1, xx + 2, 0, "B2")
    # slate mansard
    for yy in range(8, 21):
        inset = max(0, (12 - yy) * 2)
        for xx in range(1 + inset, 63 - inset):
            t = xx / 63
            col = "U1" if t < 0.62 else "U2"
            if yy % 3 == 0:
                col = "U0" if t < 0.62 else "U1"
            elif (xx + (yy // 3) * 3) % 5 == 0:
                col = "U2" if t < 0.62 else "U3"
            cv.px(xx, yy, col)
        cv.px(1 + inset, yy, "U0"); cv.px(62 - inset, yy, "U3")
    cv.hline(9, 54, 8, "U3")
    iron_cresting(cv, 10, 53, 7)
    # dormer
    cv.rect(25, 10, 38, 20, "H0"); cv.vline(38, 10, 20, "H2")
    for i in range(5):
        cv.hline(31 - i - 1, 32 + i + 1, 5 + i, "U1" if i < 4 else "U3")
        cv.px(31 - i - 1, 5 + i, "U0"); cv.px(32 + i + 1, 5 + i, "U3")
    window(cv, 28, 12, 8, 7, frame="H3", sill="H2")
    cv.hline(0, 63, 21, "U3")
    # first floor: stone with stucco quoins, two tall sashes, iron balcony
    ashlar(cv, 0, 22, 63, 41, course=4, length=10)
    eaves_shadow(cv, 0, 63, 22, "H3", "H2")
    for qx in (0, 61):
        for yy in range(24, 62, 4):
            cv.rect(qx, yy, qx + 2, yy + 1, "E0")
    window(cv, 9, 25, 9, 12, frame="H3", sill=None, curtain="RO1")
    window(cv, 40, 25, 9, 12, frame="H3", sill=None, curtain="RO1")
    for x0, x1 in ((6, 21), (37, 52)):
        cv.hline(x0, x1, 37, "I3"); cv.hline(x0, x1, 41, "I3")
        for xx in range(x0, x1 + 1, 2):
            cv.vline(xx, 38, 40, "I3")
        cv.hline(x0, x1, 36, "I1")
        for xx in range(x0 + 1, x1, 4):
            rose_cluster(cv, xx, 33 + (xx % 2))
    cv.hline(0, 63, 42, "H0"); cv.hline(0, 63, 43, "H2")   # string course
    # ground floor: bay window (east), panelled door under a fanlight (west)
    ashlar(cv, 0, 44, 63, 61, course=4, length=10)
    for qx in (0, 61):
        for yy in range(44, 62, 4):
            cv.rect(qx, yy, qx + 2, yy + 1, "E0")
    cv.rect(34, 45, 58, 61, "E0"); cv.vline(58, 45, 61, "E2")
    cv.hline(33, 59, 44, "U3"); cv.hline(34, 58, 45, "U1")
    window(cv, 36, 47, 7, 10, frame="H3", sill=None, cross=False)
    window(cv, 43, 47, 8, 10, frame="H3", sill=None, cross=False)
    window(cv, 51, 47, 6, 10, frame="H3", sill=None, cross=False)
    cv.hline(35, 57, 57, "H2"); cv.hline(35, 57, 58, "E2")
    flowerbox(cv, 36, 56, 59, "RO1")
    # fanlight + door with a brass knocker; door cell (1,3) = x16..31
    cv.rect(16, 44, 31, 47, "E0")
    cv.put([
        "   ######   ",
        "  #wWwWwW#  ",
        " #wwwwwwww# ",
        "############",
    ], {"#": "H3", "w": "W1", "W": "W0"}, 18, 44)
    door(cv, 1, 3, "wood", top=48, ramp=("RO0", "RO1", "RO2", "RO3"))
    for xx in (16, 17, 30, 31):
        cv.vline(xx, 48, 62, "E0" if xx in (16, 30) else "E2")
    foundation(cv, 0, 63, 62, 63, STONE)
    cv.hline(16, 31, 63, "H1")
    return cv


def market_large():
    cv = Canvas(96, 64)
    # clock tower (west)
    cv.rect(2, 8, 15, 61, "H1")
    ashlar(cv, 2, 8, 15, 61, course=4, length=7)
    cv.vline(2, 8, 61, "H0"); cv.vline(15, 8, 61, "H3")
    for yy in range(0, 8):               # pyramid cap in slate with a gilt finial
        half = 1 + yy
        for xx in range(9 - half, 9 + half):
            cv.px(xx, yy + 1, "ST1" if xx < 9 else "ST2")   # (not blue: it must not "glow")
    cv.hline(1, 16, 8, "ST3")
    cv.px(8, 0, "Y1"); cv.px(9, 0, "Y2")
    cv.put([
        " #### ",
        "#wwww#",
        "#ww#w#",
        "#w##w#",
        "#wwww#",
        " #### ",
    ], {"#": "I3", "w": "T0"}, 6, 12)
    window(cv, 6, 24, 6, 8, frame="H3", sill="H0", cross=False)
    window(cv, 6, 38, 6, 8, frame="H3", sill="H0", cross=False)
    # the hall: a train-shed gable of iron and glass, radiating bars
    gx0, gx1, apex, eave = 16, 95, 4, 34
    cx = (gx0 + gx1) / 2
    rx = (gx1 - gx0) / 2
    for xx in range(gx0, gx1 + 1):
        u = (xx + 0.5 - cx) / rx
        top = int(round(eave - (eave - apex) * math.sqrt(max(0.0, 1 - u * u))))
        for yy in range(top, eave + 1):
            col = "Q1" if u < 0.1 else ("Q2" if u < 0.7 else "Q3")
            cv.px(xx, yy, col)
        cv.px(xx, top, "I1" if u < 0.1 else "I3")
        if top + 1 <= eave:
            cv.px(xx, top + 1, "I3")
    # radial glazing bars from a hub at the eave centre
    hub = (cx, eave + 2)
    for k in range(1, 12):
        ang = math.pi * k / 12
        for s in range(4, 60):
            x = hub[0] - math.cos(ang) * s
            y = hub[1] - math.sin(ang) * s * 0.62
            xi, yi = int(round(x)), int(round(y))
            if cv.get(xi, yi) in ("Q1", "Q2", "Q3"):
                cv.px(xi, yi, "I1" if x < cx else "I3")
    for i in range(3):
        cv.px(30 + i, 26 - i, "Q0"); cv.px(42 + i, 16 - i, "Q0")
    # gilt clock-face roundel at the apex hub ring
    cv.put([" yyy ", "yTTTy", "yTITy", " yyy "], {"y": "Y2", "T": "T0", "I": "I3"},
           int(cx) - 2, 6)
    cv.hline(gx0, gx1, eave + 1, "I3")
    # sign band
    cv.rect(gx0, eave + 2, gx1, eave + 10, "B2")
    cv.hline(gx0, gx1, eave + 2, "B1"); cv.hline(gx0, gx1, eave + 10, "B3")
    label = "GLASSHOUSE MARKET"
    cv.text(label, int(cx) - text_w(label) // 2, eave + 4, "Y0", "B3")
    # arcade: brick piers, striped rose awnings over stalls either side
    ashlar(cv, gx0, 45, gx1, 61, course=4, length=8)
    for x0, x1 in ((18, 45), (66, 93)):
        for xx in range(x0, x1 + 1):
            stripe = "RO1" if ((xx - x0) // 4) % 2 == 0 else "H0"
            for yy in range(46, 50):
                cv.px(xx, yy, stripe)
            cv.px(xx, 50, "RO2" if stripe == "RO1" else "H2")
            if (xx - x0) % 4 in (1, 2):
                cv.px(xx, 51, "RO2" if stripe == "RO1" else "H2")
        cv.rect(x0, 52, x1, 61, "O3")
        cols = [("K1", "B0"), ("Y1", "Y0"), ("OR1", "OR0"), ("RO1", "RO0"), ("M1", "M0")]
        for i, xx in enumerate(range(x0 + 1, x1 - 4, 6)):
            a, b = cols[(i + x0) % len(cols)]
            cv.rect(xx, 57, xx + 4, 61, "O2"); cv.hline(xx, xx + 4, 57, "O1")
            for j in range(1, 4):
                cv.px(xx + j, 56, a)
            cv.px(xx + 2, 55, a); cv.px(xx + 1, 56, b)
        cv.hline(x0, x1, 52, "O2")
    # central arched entrance (door cell 3,3 = x48..63)
    for yy in range(44, 62):
        for xx in range(46, 66):
            dx = (xx + 0.5 - 56) / 10
            dy = (yy - 52) / 9
            if yy >= 52 or dx * dx + dy * dy <= 1:
                cv.px(xx, yy, "H0" if xx < 56 else "H2")
    door(cv, 3, 3, "double", top=49, ramp=("I0", "I1", "I2", "I3"))
    cv.put(["  #####  ", " #wwwww# ", "#wWwWwWw#"], {"#": "I3", "w": "W1", "W": "W2"}, 52, 45)
    foundation(cv, 0, 95, 62, 63, STONE)
    return cv


def rose_conservatory():
    """Flora's CONSERVATORY: rose-tinted glass on white glazing bars, gilt
    rings and finials, an ogee (onion) roof, a rose window over the door,
    and roses climbing a deep-rose brick plinth."""
    cv = Canvas(96, 64)
    BLUSH = ("T0", "N0", "RO0", "N1")
    WHITE = ("T0", "N1")

    def tint(x0, y0, x1, y1):
        cv.recolor(x0, y0, x1, y1, "Q1", "N0"); cv.recolor(x0, y0, x1, y1, "Q2", "RO0")
        cv.recolor(x0, y0, x1, y1, "Q0", "T0"); cv.recolor(x0, y0, x1, y1, "R1", "N1")
        cv.recolor(x0, y0, x1, y1, "R0", "T0")

    # wings: barrel vaults with gilt eaves, roses climbing the plinths
    for (x0, x1, seed) in ((0, 27, 41), (68, 95, 42)):
        def top(xx, x0=x0, x1=x1):
            t = (xx - x0) / (x1 - x0)
            return int(round(26 + 7 * (1 - math.sin(t * math.pi))))
        curved_glass(cv, list(range(x0, x1 + 1)), top, 38, glass=BLUSH, ribs=WHITE,
                     rib_every=4, rings=(32,))
        cv.hline(x0, x1, 38, "Y1"); cv.hline(x0, x1, 39, "Y2")
        glazing(cv, x0, 40, x1, 55, pw=4, ph=8, plants=False, seed=seed)
        tint(x0, 40, x1, 55)
        bricks(cv, x0, 56, x1, 63, face="RO2", mortar="RO3", hi="RO1", course=3, length=6)
        climbing_roses(cv, x0, x1, 57, 8, seed=seed)
        ux = x0 + 1 if x0 == 0 else x1 - 3
        cv.put([" y ", "yYy", " Y "], {"y": "Y1", "Y": "Y2"}, ux, 22)
    # central pavilion with an ogee roof: a spire's point over a dome's shoulders
    px0, px1 = 28, 67
    cx = (px0 + px1 + 1) / 2
    half = (px1 - px0 + 1) / 2

    def ogee(xx):
        u = min(1.0, abs(xx + 0.5 - cx) / half)
        h = 31 * (0.38 * (1 - u) ** 2.6 + 0.62 * math.sqrt(max(0.0, 1 - u ** 2.5)))
        return int(round(35 - h))
    curved_glass(cv, list(range(px0, px1 + 1)), ogee, 35, glass=BLUSH, ribs=WHITE,
                 rib_every=5, lit_split=0.5)
    for ry in (14, 24):                        # gilt rings
        for xx in range(px0, px1 + 1):
            if ogee(xx) < ry:
                cv.px(xx, ry, "Y1" if xx < cx else "Y2")
    for xx in range(px0, px1 + 1):             # gilt edge on the silhouette
        cv.px(xx, ogee(xx), "Y1" if xx < cx else "Y2")
    cv.put([" y ", "yYy", " Y ", " y "], {"y": "Y1", "Y": "Y2"}, int(cx) - 2, 0)
    cv.rect(px0, 36, px1, 63, "T0")
    # sign band
    cv.rect(px0 - 4, 36, px1 + 4, 43, "RO3")
    cv.rect(px0 - 3, 37, px1 + 3, 42, "RO2"); cv.hline(px0 - 3, px1 + 3, 37, "RO1")
    cv.text("CONSERVATORY", int(cx) - text_w("CONSERVATORY") // 2, 38, "T0", "RO3")
    glazing(cv, px0, 44, px1, 57, pw=5, ph=7, plants=False, seed=43)
    tint(px0, 44, px1, 57)
    bricks(cv, px0, 58, px1, 63, face="RO2", mortar="RO3", hi="RO1", course=3, length=6)
    # rose window over the door (its blue panes glow at night)
    rx, ry = 56, 48
    for yy in range(ry - 4, ry + 5):
        for xx in range(rx - 4, rx + 5):
            d = math.hypot(xx - rx, yy - ry)
            if d <= 4.4:
                ang = math.atan2(yy - ry, xx - rx)
                petal = (int((ang + math.pi) / (math.pi / 4)) % 2) == 0
                cv.px(xx, yy, "Y2" if d > 3.5 else (("RO1" if petal else "W1") if d > 1 else "Y1"))
    door(cv, 3, 3, "glass", top=54)
    tint(48, 54, 63, 63)
    for xx in (47, 64):
        cv.vline(xx, 44, 62, "Y1" if xx == 47 else "Y2")
    climbing_roses(cv, 29, 45, 63, 5, seed=44)
    climbing_roses(cv, 66, 67, 63, 5, seed=45)
    return cv


def fountain():
    cv = Canvas(48, 48)
    # basin: an elliptical stone kerb with water inside
    cx, cy = 23.5, 36
    for yy in range(24, 48):
        for xx in range(0, 48):
            dx, dy = (xx - cx) / 23.5, (yy - cy) / 11.5
            d = dx * dx + dy * dy
            if d <= 1:
                cv.px(xx, yy, "H1" if dx < 0.25 else "H2")
                if d > 0.9 and dy > 0:
                    cv.px(xx, yy, "H2" if dx < 0.25 else "H3")
            dx2, dy2 = (xx - cx) / 20, (yy - (cy - 1)) / 8.5
            if dx2 * dx2 + dy2 * dy2 <= 1:
                cv.px(xx, yy, "W1" if dy2 > -0.55 else "H3")
                if dy2 > 0.5:
                    cv.px(xx, yy, "W2")
    for xx in range(4, 44):        # lit kerb top
        for yy in range(24, 32):
            dx, dy = (xx - cx) / 23.5, (yy - cy) / 11.5
            if 0.78 < dx * dx + dy * dy <= 1 and dy < 0 and cv.get(xx, yy) in ("H1", "H2"):
                cv.px(xx, yy, "H0")
    # ripples
    for (x, y) in ((8, 36), (9, 36), (34, 39), (35, 39), (36, 39), (14, 41), (15, 41), (29, 33), (30, 33)):
        cv.px(x, y, "W0")
    # pedestal and two tiers
    cv.rect(21, 22, 26, 37, "H1"); cv.vline(21, 22, 37, "H0"); cv.rect(25, 22, 26, 37, "H2")
    cv.hline(19, 28, 37, "H2"); cv.hline(20, 27, 36, "H1")

    def bowl(y, half, depth):
        for j in range(depth):
            w = half - j * 2
            for xx in range(int(cx - w), int(cx + w) + 1):
                cv.px(xx, y + j, "H1" if xx < cx else "H2")
            cv.px(int(cx - w), y + j, "H0")
        cv.hline(int(cx - half), int(cx + half), y, "H0")
        cv.hline(int(cx - half) + 1, int(cx + half) - 1, y - 1, "Q1")
        cv.px(int(cx - half), y - 1, "H0"); cv.px(int(cx + half), y - 1, "H2")
    bowl(22, 12, 4)
    cv.rect(22, 11, 25, 21, "H1"); cv.vline(22, 11, 21, "H0"); cv.vline(25, 11, 21, "H2")
    bowl(11, 7, 3)
    cv.rect(23, 4, 24, 10, "H1"); cv.px(24, 5, "H2")
    cv.put([" w ", "wWw"], {"w": "Q1", "W": "W0"}, 22, 1)
    # water: a jet from the top and curtains falling off each bowl's lip
    for (x, y0, y1) in ((16, 11, 19), (31, 11, 19), (11, 22, 31), (36, 22, 31)):
        for yy in range(y0, y1 + 1):
            cv.px(x, yy, "W0" if yy % 3 else "Q1")
            cv.px(x + (1 if x > cx else -1), yy + 1, "Q1")
    for (x, y) in ((23, 0), (24, 0), (21, 3), (26, 3), (19, 6), (28, 6), (18, 9), (29, 9)):
        cv.px(x, y, "W0")
    for (x, y) in ((10, 33), (12, 34), (37, 33), (35, 34)):
        cv.px(x, y, "W0")
    return cv


def relay_mast():
    cv = Canvas(16, 48)
    # tapering lattice
    for yy in range(8, 42):
        half = 2 + (yy - 8) * 4 // 33
        xl, xr = 8 - half, 7 + half
        cv.px(xl, yy, "I1"); cv.px(xr, yy, "I3")
        k = (yy - 8) % 6
        if k == 0:
            cv.hline(xl, xr, yy, "I3")
        else:
            xd = xl + int(round((xr - xl) * k / 6))
            cv.px(xd, yy, "I2")
            cv.px(xr - (xd - xl), yy, "I3")
    # brass listening horn, aimed down at the ground, and a beacon
    cv.put([
        "     kk     ",
        "     KK     ",
        "     ##     ",
        "  cccccc    ",
        " cCCCCCCc   ",
        " cCyyyyCc   ",
        "  cCCCCc    ",
        "    cc      ",
    ], {"k": "K1", "K": "B2", "#": "I3", "c": "C2", "C": "C1", "y": "Y1"}, 3, 0)
    # a small platform rail
    cv.hline(3, 12, 9, "I3"); cv.px(3, 8, "I3"); cv.px(12, 8, "I3")
    # plinth + cables rooting into the ground
    cv.rect(3, 41, 12, 45, "H1"); cv.hline(3, 12, 41, "H0"); cv.vline(12, 41, 45, "H2")
    cv.hline(3, 12, 45, "H3")
    for (x, y) in ((2, 46), (1, 47), (13, 46), (14, 47), (6, 46), (5, 47), (10, 46), (11, 47)):
        cv.px(x, y, "C2")
    cv.vline(9, 10, 44, "C2")
    return cv


BUILDERS = {
    "relay_station": relay_station, "nursery_garden": nursery_garden, "palm_house": palm_house,
    "city_house": city_house, "market_large": market_large, "rose_conservatory": rose_conservatory,
    "fountain": fountain, "relay_mast": relay_mast,
}


def build_all():
    for key, fn in BUILDERS.items():
        w, h, _ = STRUCTS[key]
        im = fn().image()
        assert im.size == (w * 16, h * 16), (key, im.size)
        IMAGES[key] = im


def review():
    import tilesets as TS
    paving = kit.to_img(TS.TILESETS["city"]["paving"])
    cells = []
    for key, im in IMAGES.items():
        w, h, dr = STRUCTS[key]
        bg = Image.new("RGBA", (im.width + 32, im.height + 32))
        for y in range(0, bg.height, 16):
            for x in range(0, bg.width, 16):
                bg.paste(paving, (x, y))
        bg.alpha_composite(im, (16, 16))
        cells.append((key, bg))
    kit.gbc.grid_sheet(cells, 4, 3).save(kit.REVIEW / "structures.png")
