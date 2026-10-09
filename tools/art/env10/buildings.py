"""Chapter 9 architecture and landmarks: Thistledown's adobe and wind pump,
Sanguine Ridge's dragon's blood trees and Conservatory 8.

Native integer pixels on the named-colour canvas (kit.Canvas), light from the
top-left, dark hue-shifted edges instead of black outlines, transparent
outside each silhouette. Doors are bottom-aligned inside the contract's door
tile. Windows, doors, domes and the sign font come from tools/art/structures.py
so the towns match the earlier chapters.
"""
from __future__ import annotations

import math

import kit
from kit import Canvas
import structures as S

SIZES = {"dragon_tree_big": (3, 3), "adobe_house": (4, 3), "ridge_conservatory": (6, 4), "windmill_pump": (2, 3)}
DOORS = {"adobe_house": (1, 2), "ridge_conservatory": (3, 3)}
IMAGES = {}
WOOD = ("O0", "O1", "O2", "O3")


def thick(cv, a, b, w, c):
    """A branch of width w (horizontal offsets) from a to b."""
    for i in range(w):
        cv.line([(a[0] + i, a[1]), (b[0] + i, b[1])], c)


# ------------------------------------------------------------ dragon tree ---
def dragon_tree_big():
    """An ancient dragon's blood tree: a dense umbrella crown of stiff leaf
    rosettes on a crowd of forking grey branches, a thick silver trunk
    weeping a little red resin, and its shadow on the baked ground."""
    cv = Canvas(48, 48)
    # Ground shadow, offset east (light from the top-left).
    for y in range(41, 48):
        for x in range(48):
            if ((x - 26) / 17) ** 2 + ((y - 44.5) / 3.2) ** 2 <= 1:
                cv.px(x, y, "k2")
    # Trunk: short and massive, flaring into the ground.
    for y in range(28, 46):
        flare = max(0, y - 40)
        x0, x1 = 19 - flare // 2, 28 + (flare + 1) // 2
        for x in range(x0, x1 + 1):
            u = (x - x0) / max(1, x1 - x0)
            col = "t0" if u < 0.2 else ("t1" if u < 0.62 else ("t2" if u < 0.9 else "t3"))
            cv.px(x, y, col)
    for x, y0, y1 in ((22, 31, 42), (25, 29, 39), (27, 34, 44)):
        cv.vline(x, y0, y1, "t2")
    cv.hline(17, 31, 46, "t3")
    cv.hline(19, 29, 47, "k3")
    # Dragon's blood: resin weeping from an old wound.
    cv.put(["#", "#r", "#", ".#"], {"#": "K2", "r": "B3", ".": "B2"}, 21, 34)
    # Branches: the trunk forks, and forks again, fanning up under the crown.
    for (a, b, w) in (((21, 29), (14, 23), 3), ((25, 29), (32, 23), 3),
                      ((14, 23), (7, 18), 2), ((15, 23), (18, 17), 2),
                      ((32, 23), (29, 17), 2), ((33, 23), (40, 18), 2),
                      ((7, 18), (3, 15), 1), ((8, 18), (11, 15), 1),
                      ((18, 17), (21, 14), 1), ((29, 17), (26, 14), 1),
                      ((40, 18), (44, 15), 1), ((39, 18), (36, 15), 1)):
        thick(cv, a, b, w, "t1")
        thick(cv, (a[0] + w, a[1]), (b[0] + w, b[1]), 1, "t2")
        thick(cv, (a[0] - 1, a[1]), (b[0] - 1, b[1]), 1, "t0")
    # The umbrella: a broad flat dome. Fill, then rosettes back to front.
    cx = 23.5
    def top_at(x):
        u = (x + 0.5 - cx) / 23.5
        return 12 - 10 * math.sqrt(max(0.0, 1 - u * u))
    for x in range(48):
        u = (x + 0.5 - cx) / 23.5
        if abs(u) > 1:
            continue
        bot = int(round(14 + 3 * math.sqrt(1 - u * u)))
        for y in range(int(round(top_at(x))), bot + 1):
            cv.px(x, y, "d2" if y >= bot - 1 else "d1")
        cv.px(x, bot, "d3")
    # Rosettes: overlapping scalloped fans of stiff leaves, drawn back to
    # front, each lit on its north-west rim and shadowed underneath.
    rows = ((5, (-14, -5, 4, 13)), (9, (-19, -10, -1, 8, 17)), (13, (-22, -14, -5, 4, 13, 21)))
    for ry, offs in rows:
        for o in offs:
            rx = cx + o
            r = 5.0
            yb = ry + int(abs(o) / 23.5 * 3)
            for y in range(yb - 6, yb + 2):
                for x in range(int(rx - r - 1), int(rx + r + 2)):
                    if cv.get(x, y) is None:
                        continue
                    dx, dy = x + 0.5 - rx, y + 0.5 - yb
                    d = math.hypot(dx, dy * 1.25)
                    if y == yb + 1 and abs(dx) < r - 0.5:
                        cv.px(x, y, "d2")
                    elif dy <= 0.5 and d <= r:
                        west = dx < 1 and x < cx + 8
                        if d > r - 1.2:
                            cv.px(x, y, ("d0" if west else "d1") if (x % 2 == 0 or dy < -2) else "d1")
                        elif d < r - 2.5 and west and dy < -1 and x % 3 == 0:
                            cv.px(x, y, "d0")
                        else:
                            cv.px(x, y, "d1" if x < cx + 10 or d < r - 2 else "d2")
    # The crown's outline: dark hue-shifted rim, ragged spikes underneath.
    for x in range(48):
        u = (x + 0.5 - cx) / 23.5
        if abs(u) > 1:
            continue
        t = int(round(top_at(x)))
        while t < 48 and cv.get(x, t) is None:
            t += 1
        cv.px(x, t, "d2" if x > cx + 6 else ("d1" if cv.get(x, t) == "d0" else cv.get(x, t)))
        bot = int(round(14 + 3 * math.sqrt(1 - u * u)))
        drop = (1, 2, 0, 1, 3, 0, 2)[x % 7] if abs(u) < 0.96 else 0
        for k in range(drop):
            cv.px(x, bot + 1 + k, "d3" if k == drop - 1 else "d2")
    return cv


# ------------------------------------------------------------ adobe house ---
def adobe_house():
    """A Thistledown adobe: a flat roof deck inside a soft rounded parapet
    (raised in a pueblo hump over the door), viga beam ends along the
    roofline, a turquoise window with potted living stones on the sill, a
    chile ristra by the wooden door and a potted barrel cactus."""
    cv = Canvas(64, 48)

    def rounded(x0, y0, x1, y1, r, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                dx = max(x0 + r - x, 0, x - (x1 - r))
                dy = max(y0 + r - y, 0, y - (y1 - r))
                if dx * dx + dy * dy <= r * r + r:
                    cv.px(x, y, c)
    # The parapet ring (lit on top), the deck sunk inside it.
    rounded(0, 1, 63, 18, 4, "a3")
    rounded(1, 1, 62, 17, 4, "a0")
    rounded(4, 4, 59, 12, 2, "a2")
    cv.hline(5, 58, 4, "a3")                     # the north parapet's shadow on the deck
    cv.vline(4, 5, 11, "a3")
    for x in (14, 27, 40, 52):                   # rolled roof seams
        cv.vline(x, 6, 11, "a3")
        cv.vline(x + 1, 6, 11, "a1")
    cv.vline(61, 3, 15, "a1"); cv.vline(62, 4, 16, "a2")
    # The front parapet face, and its pueblo hump over the door bay.
    cv.rect(1, 13, 62, 17, "a1")
    cv.hline(2, 61, 13, "a0")
    rounded(11, 8, 34, 16, 4, "a1")
    rounded(12, 8, 33, 15, 4, "a0")
    cv.rect(13, 11, 32, 16, "a1")
    cv.hline(13, 32, 11, "a0")
    cv.rect(55, 13, 62, 17, "a2")
    cv.hline(1, 62, 18, "a3")
    # Front wall.
    cv.rect(1, 19, 62, 44, "a1")
    cv.vline(1, 19, 44, "a0"); cv.vline(2, 19, 44, "a0")
    cv.rect(55, 19, 62, 44, "a2")
    cv.vline(62, 13, 44, "a3")
    cv.hline(1, 61, 19, "a2")
    for x, y in ((8, 26), (9, 27), (47, 40), (48, 41), (36, 23)):  # soft plaster wear
        cv.px(x, y, "a2")
    # Viga beam ends poking out under the parapet.
    for x in (4, 39, 47, 57):
        cv.put([" oo ", "o..O", "oO.O", " OO "], {"o": "O1", ".": "O0", "O": "O2"}, x, 16)
        cv.hline(x, x + 3, 20, "a2")
    # A wooden canale spout on the east, with a rain stain below it.
    cv.rect(57, 11, 63, 12, "O2"); cv.hline(57, 63, 11, "O1"); cv.px(63, 12, "O3")
    cv.vline(60, 21, 30, "a2")
    # Deep-set window: turquoise frame, a timber lintel, living stones on the sill.
    cv.rect(38, 24, 51, 35, "a3")
    S.window(cv, 40, 25, 11, 9, frame="Q3", sill=None, glass=("W0", "W1", "W2"))
    cv.rect(37, 22, 52, 23, "O2"); cv.hline(37, 52, 22, "O1"); cv.px(52, 23, "O3")
    cv.rect(37, 35, 52, 36, "a0"); cv.hline(37, 52, 36, "a2")
    for x in (39, 44, 48):
        cv.put(["k3k", "kkk"], {"k": "k2", "3": "k0"}, x, 33)
    # The door (tile 1,2) under a heavy timber lintel.
    cv.rect(15, 28, 32, 30, "O2"); cv.hline(15, 32, 28, "O1"); cv.hline(15, 32, 30, "O3")
    cv.rect(17, 31, 30, 32, "a3")
    # A string of dried red chiles beside the door.
    cv.put([" G ", "GLG"], {"G": "G2", "L": "L3"}, 9, 22)
    for j in range(10):
        y = 24 + j
        c = ("K1", "K2", "B2")[j % 3]
        cv.px(9 + (j % 2), y, c)
        cv.px(10 + (j % 2), y, "K2" if c == "K1" else "B3")
    # A potted barrel cactus east of the door.
    cv.put([
        "  yGy  ",
        " GGgGG ",
        "GgGgGgL",
        "GgGgGgL",
        " GgGgL ",
        "  LLL  ",
        " CCCCC ",
        " cCCCc ",
        "  ccc  ",
    ], {"G": "G2", "g": "G1", "L": "L3", "y": "K1", "C": "C1", "c": "C2"}, 34, 36)
    # Plinth along the wall foot.
    cv.rect(0, 45, 63, 47, "a2")
    cv.hline(0, 63, 45, "a1")
    cv.hline(0, 63, 47, "a3")
    S.door(cv, 1, 2, "wood", top=32, ramp=WOOD)
    return cv


# ----------------------------------------------------------- wind pump ---
def windmill_pump():
    """A desert wind pump over a plank trough: a galvanised wheel of blades
    and a red-striped tail vane on a braced lattice tower, the pump rod
    running down to a spout that fills the trough."""
    cv = Canvas(32, 48)
    # Lattice tower: two tapering legs with X braces.
    for (a, b) in (((5, 44), (12, 17)), ((26, 44), (19, 17))):
        cv.line([a, b], "t2")
        cv.line([(a[0] + 1, a[1]), (b[0] + 1, b[1])], "t3" if a[0] > 15 else "t1")
    for y0, y1 in ((18, 25), (25, 33), (33, 41)):
        xl0, xl1 = 12 - (y0 - 17) * 7 // 27, 12 - (y1 - 17) * 7 // 27
        xr0, xr1 = 20 + (y0 - 17) * 7 // 27, 20 + (y1 - 17) * 7 // 27
        cv.line([(xl0 + 1, y0), (xr1, y1)], "t2")
        cv.line([(xr0, y0), (xl1 + 1, y1)], "t2")
        cv.hline(xl1 + 1, xr1, y1, "t1")
    cv.hline(10, 22, 17, "t3"); cv.hline(10, 22, 16, "t1")
    # The pump rod down the middle to the spout.
    cv.vline(16, 17, 36, "t3"); cv.vline(15, 17, 36, "t0")
    # Tail vane: a long arm and a tapered fin, east of the hub.
    cv.hline(15, 26, 9, "t3")
    cv.put([
        "#####",
        "#KKKK#",
        "#TTTTT#",
        "#KKKKKk#",
        "#kkkkkk#",
        "########",
    ], {"#": "t3", "K": "K1", "k": "K2", "T": "T0"}, 23, 5)
    # The wheel: radial blades in a rim, lit from the north-west.
    hx, hy, R = 12.5, 9.5, 9.0
    for y in range(0, 19):
        for x in range(2, 24):
            d = math.hypot(x + 0.5 - hx, y + 0.5 - hy)
            if d > R:
                continue
            ang = math.atan2(y + 0.5 - hy, x + 0.5 - hx)
            sector = ((ang + math.pi) / (2 * math.pi)) * 16
            gap = (sector % 1) < 0.3
            lit = (x + 0.5 - hx) + (y + 0.5 - hy) < 0
            if d < 2.0:
                cv.px(x, y, "t3")
            elif d > R - 1.0:
                cv.px(x, y, "t1" if lit else "t2")
            elif not gap:
                cv.px(x, y, "R0" if lit else ("R1" if d < R - 3 else "t1"))
            elif d > R - 4:
                cv.px(x, y, None)
    cv.px(12, 9, "t1")
    # The trough: plank sides and bright water.
    cv.rect(1, 36, 30, 45, "O3")
    cv.rect(2, 37, 29, 39, "W1")
    cv.hline(2, 29, 37, "O1")
    for x in (5, 6, 20, 21, 22):
        cv.px(x, 38, "W0")
    cv.hline(3, 28, 39, "W2")
    for y in range(40, 45):
        cv.hline(2, 29, y, "O1" if y % 2 == 0 else "O2")
    cv.vline(2, 40, 44, "O0"); cv.vline(29, 40, 44, "O3")
    cv.hline(1, 30, 45, "O3")
    cv.rect(3, 46, 5, 47, "O3"); cv.rect(26, 46, 28, 47, "O3")
    # The spout pours into the trough.
    cv.put(["##", "#w", " w"], {"#": "t3", "w": "W0"}, 15, 34)
    return cv


# ---------------------------------------------------------- conservatory ---
def carving(cv, x0, y0):
    """A dragon's blood tree in low relief on a pale stone pilaster."""
    cv.put([
        " ...... ",
        ".::::::.",
        ":.:..:.:",
        " : :: : ",
        "  :::   ",
        "   :    ",
        "   :    ",
        "  ::.   ",
    ], {".": "h0", ":": "h2"}, x0, y0)


def ridge_conservatory():
    """Conservatory 8: a dark-red ashlar hall built into the cliff, a glass
    dome on amber ribs, an amber-lettered sign and dragon-tree carvings on
    the pilasters either side of the door."""
    cv = Canvas(96, 64)
    CX = 56                                   # the door tile (3,3) centre
    # The cliff the hall is built into: banded sandstone across the whole
    # back (it continues the red_rock face above), and rock shoulders that
    # run down to the ground either side of the hall.
    from tilesets import FACE
    for y in range(0, 60):
        for x in range(96):
            if y >= 28 and 6 <= x <= 89:
                continue
            ch = FACE[2 + (y % 11)] [x % 16]
            col = {"0": "r0", "1": "r1", "2": "r2", "3": "r3"}[ch]
            if x >= 60 and col == "r0":
                col = "r1"
            cv.px(x, y, col)
    for y in range(28, 60):
        cv.px(0, y, "r0"); cv.px(95, y, "r3")
    cv.hline(0, 5, 59, "r3"); cv.hline(90, 95, 59, "r3")
    # Glass dome on amber ribs, with a resin-drop finial.
    S.dome(cv, CX, 27, 19.5, 21, ribs=8, rings=(0.45,), panel=("Q0", "Q1", "Q2", "Q3"),
           rib=("e0", "e1"), rim="e2")
    cv.put([" # ", "#e#", "#E#", " # ", " # "], {"#": "e2", "e": "e0", "E": "e1"}, CX - 2, 2)
    # Hall facade: dark red ashlar, lit on the west, a heavy cornice.
    cv.rect(6, 26, 89, 56, "h1")
    for row, y in enumerate(range(29, 56, 5)):
        cv.hline(6, 89, y + 4, "h2")
        off = 6 * (row % 2)
        for x in range(6 + off, 90, 12):
            cv.vline(x, y, y + 3, "h2")
            cv.hline(x + 1, x + 3, y, "h0")
    cv.vline(6, 26, 56, "h0"); cv.vline(89, 26, 56, "h3")
    cv.rect(4, 24, 91, 26, "h0"); cv.hline(4, 91, 27, "h2"); cv.hline(4, 91, 28, "h3")
    for x in range(6, 90, 4):
        cv.px(x, 27, "h3")
    # Sign band.
    w = S.text_w("CONSERVATORY") + 8
    cv.rect(CX - w // 2 - 1, 30, CX + w // 2, 38, "h0")
    cv.rect(CX - w // 2, 31, CX + w // 2 - 1, 37, "h3")
    cv.text("CONSERVATORY", CX - S.text_w("CONSERVATORY") // 2, 32, "e0", "e2")
    # Arched windows in the wings.
    for x0 in (13, 25, 77):
        cv.rect(x0, 40, x0 + 7, 52, "h3")
        cv.rect(x0 + 1, 42, x0 + 6, 52, "Q1")
        cv.rect(x0 + 4, 42, x0 + 6, 52, "Q2")
        cv.px(x0 + 1, 42, "h3"); cv.px(x0 + 6, 42, "h3")
        cv.hline(x0 + 2, x0 + 5, 41, "Q1")
        cv.px(x0 + 2, 44, "Q0"); cv.px(x0 + 3, 43, "Q0")
        cv.hline(x0, x0 + 7, 47, "h3")
        cv.hline(x0 - 1, x0 + 8, 53, "h0")
    # The portal: pale stone pilasters carved with dragon trees, an arch.
    for px0 in (CX - 17, CX + 9):
        cv.rect(px0, 39, px0 + 7, 56, "h0")
        cv.vline(px0 + 7, 39, 56, "h2")
        cv.hline(px0, px0 + 7, 39, "r0")
        carving(cv, px0, 42)
        cv.put(["e", "E"], {"e": "e0", "E": "e1"}, px0 + 3, 51)     # resin lamp
    cv.rect(CX - 9, 40, CX + 8, 56, "h3")
    for x in range(CX - 9, CX + 9):
        dx = (x + 0.5 - CX) / 9
        top = 40 + int(round(4 * (1 - math.sqrt(max(0, 1 - dx * dx)))))
        cv.vline(x, 40, top, "h0")
    S.door(cv, 3, 3, "arch", top=47, ramp=("e0", "h0", "h1", "h3"))
    # Steps.
    cv.rect(4, 57, 91, 63, "h2")
    cv.hline(4, 91, 57, "h0")
    cv.hline(4, 91, 60, "h1")
    cv.hline(4, 91, 63, "h3")
    S.door(cv, 3, 3, "arch", top=47, ramp=("e0", "h0", "h1", "h3"))
    return cv


def build():
    IMAGES.clear()
    for key, fn in (("dragon_tree_big", dragon_tree_big), ("adobe_house", adobe_house),
                    ("ridge_conservatory", ridge_conservatory), ("windmill_pump", windmill_pump)):
        im = fn().image()
        assert im.size == tuple(v * 16 for v in SIZES[key]), key
        IMAGES[key] = im
