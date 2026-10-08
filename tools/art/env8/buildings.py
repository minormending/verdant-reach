"""Larchmere's architecture: timber lodge, chalets, a frosted glass hall, a boathouse.

Native integer pixels on the named-colour canvas (kit.Canvas), light from the
top-left, dark hue-shifted edges instead of black outlines, transparent
outside each silhouette. Doors are bottom-aligned inside the contract's door
tile. Windows, doors and the sign font come from tools/art/structures.py so
the town matches the earlier chapters.
"""
from __future__ import annotations

import kit
from kit import Canvas
import structures as S

SIZES = {"alpine_lodge": (5, 3), "chalet": (4, 3), "frost_conservatory": (6, 4), "boathouse": (4, 3)}
DOORS = {"alpine_lodge": (2, 2), "chalet": (1, 2), "frost_conservatory": (3, 3)}
IMAGES = {}


def logs(cv, x0, y0, x1, y1, shade_from=None):
    """Horizontal log courses: a lit upper edge, a dark joint, notched ends."""
    shade_from = x1 + 1 if shade_from is None else shade_from
    for y in range(y0, y1 + 1):
        k = (y - y0) % 4
        for x in range(x0, x1 + 1):
            dark = x >= shade_from
            col = ("J0", "J1", "J1", "J3")[k] if not dark else ("J1", "J2", "J2", "J3")[k]
            cv.px(x, y, col)
    for y in range(y0, y1 + 1, 4):
        # Log ends stick out past the corners (a notched corner joint).
        cv.px(x0 - 1, y + 1, "J1"); cv.px(x0 - 1, y + 2, "J2")
        cv.px(x1 + 1, y + 1, "J2"); cv.px(x1 + 1, y + 2, "J3")


def shingles(cv, x0, y0, x1, y1, ramp=("A0", "A1", "A2", "A3"), shade_from=None):
    """Slate shingles in staggered 4px courses with a lit lower lip."""
    r0, r1, r2, r3 = ramp
    shade_from = x1 + 1 if shade_from is None else shade_from
    for y in range(y0, y1 + 1):
        row, k = divmod(y - y0, 3)
        off = 2 * (row % 2)
        for x in range(x0, x1 + 1):
            dark = x >= shade_from
            col = r2 if dark else r1
            if k == 2:
                col = r3 if dark else r2
            elif (x - x0 + off) % 4 == 0:
                col = r3 if dark else r2
            elif k == 0 and not dark and (x - x0 + off) % 4 == 1:
                col = r0
            cv.px(x, y, col)


def snow_cap(cv, x0, x1, y, depth=2, seed=0):
    """A soft snow ridge with lumpy drips: lit top, blue-grey underside."""
    for x in range(x0, x1 + 1):
        d = depth + (1 if (x * 7 + seed) % 5 == 0 else 0) + (1 if (x * 3 + seed) % 11 == 0 else 0)
        cv.px(x, y - 1, "F0" if (x + seed) % 9 else None)
        for yy in range(y, y + d):
            cv.px(x, yy, "F0" if yy < y + d - 1 else "F2")
    cv.px(x0 - 1, y, "F1"); cv.px(x1 + 1, y, "F2")


def shutter_window(cv, x0, y0, w=9, h=9, shutter=("G2", "L3"), box=True, flower="K1"):
    """A window flanked by plank shutters, with a flower box below."""
    S.window(cv, x0, y0, w, h, frame="J3", sill=None, curtain=None)
    for sx in (x0 - 4, x0 + w):
        cv.rect(sx, y0, sx + 3, y0 + h - 1, shutter[0])
        cv.vline(sx + 3 if sx < x0 else sx, y0, y0 + h - 1, shutter[1])
        for yy in range(y0 + 1, y0 + h - 1, 3):
            cv.hline(sx, sx + 3, yy, shutter[1])
        cv.px(sx + 1, y0, "J0" if sx < x0 else shutter[0])
    if box:
        cv.rect(x0 - 1, y0 + h, x0 + w, y0 + h + 2, "J2")
        cv.hline(x0 - 1, x0 + w, y0 + h, "J1")
        cv.hline(x0 - 1, x0 + w, y0 + h + 2, "J3")
        for x in range(x0, x0 + w):
            cv.px(x, y0 + h - 1, "G2" if x % 2 else "L2")
        for x in range(x0, x0 + w, 2):
            cv.px(x, y0 + h - 2, flower)
            cv.px(x + 1, y0 + h - 1, flower if x % 4 == 0 else "G1")


def balcony(cv, x0, x1, y, posts=4):
    """Carved balcony rail: a handrail, cut-out balusters and a deck edge."""
    cv.hline(x0, x1, y, "J0")
    cv.hline(x0, x1, y + 1, "J2")
    for x in range(x0, x1 + 1):
        k = (x - x0) % 4
        for yy in range(y + 2, y + 6):
            cv.px(x, yy, ("J1", "J1", "J3", "J2")[k] if not (k == 2 and yy in (y + 3, y + 4)) else "J3")
        # The tulip cut-out: a dark lozenge in every second baluster pair.
        if k == 1 and yy:
            cv.px(x, y + 3, "J0")
    cv.hline(x0, x1, y + 6, "J0")
    cv.hline(x0, x1, y + 7, "J3")
    for x in range(x0, x1 + 1, (x1 - x0) // posts):
        cv.vline(x, y - 1, y + 7, "J3")
        cv.px(x, y - 2, "J2")


def stone_chimney(cv, x0, y0, h):
    cv.rect(x0, y0, x0 + 7, y0 + h, "R1")
    for yy in range(y0 + 1, y0 + h, 3):
        off = 2 * ((yy - y0) // 3 % 2)
        for xx in range(x0 + off, x0 + 8, 4):
            cv.px(xx, yy, "R2")
        cv.hline(x0, x0 + 7, yy + 2, "R2")
    cv.vline(x0, y0, y0 + h, "R0")
    cv.vline(x0 + 7, y0, y0 + h, "R3")
    cv.rect(x0 - 1, y0 - 2, x0 + 8, y0 - 1, "R2")
    cv.hline(x0 - 1, x0 + 8, y0 - 2, "R0")
    cv.hline(x0, x0 + 7, y0 - 3, "F0")
    cv.hline(x0 + 1, x0 + 6, y0 - 4, "F1")


def smoke(cv, x, y):
    cv.put([
        "    ..,,.",
        "  .,,,,,,.",
        " .,,.  .,.",
        ".,,.",
        " .,.",
        "  .",
    ], {",": "R0", ".": "R1"}, x, y)


def stone_base(cv, x0, x1, y0, y1):
    cv.rect(x0, y0, x1, y1, "R1")
    for yy in range(y0, y1 + 1, 2):
        off = 3 * ((yy - y0) // 2 % 2)
        for xx in range(x0 + off, x1 + 1, 6):
            cv.px(xx, yy, "R2")
    cv.hline(x0, x1, y0, "R0")
    cv.hline(x0, x1, y1, "R3")


# ------------------------------------------------------------------ lodge ---
def alpine_lodge():
    """The Lakeside Lodge: a steep slate roof under snow, a timber cross gable
    with a carved balcony, a stone chimney and warm windows."""
    cv = Canvas(80, 48)
    # Main roof: a steep hipped slate mass under snow, shaded on the east.
    shingles(cv, 0, 3, 79, 23, shade_from=58)
    for y in range(3, 24):
        cut = 18 - (y - 3) * 18 // 20
        for x in range(cut):
            cv.px(x, y, None)
            cv.px(79 - x, y, None)
        cv.px(cut, y, "F0")
        cv.px(cut + 1, y, "F1" if y % 3 else "F0")
        cv.px(79 - cut, y, "F2")
    snow_cap(cv, 18, 61, 3, depth=2, seed=1)
    stone_chimney(cv, 62, 2, 12)
    smoke(cv, 66, -2)
    # Snow on the eaves with short icicles.
    cv.hline(0, 79, 23, "A3")
    for x in range(0, 80):
        cv.px(x, 22, "F0" if (x // 3) % 3 else "F1")
        if x % 7 == 3:
            cv.px(x, 24, "I2")
    # Cross gable over the entrance (x 22..57), carved bargeboards.
    cx = 40
    for y in range(1, 24):
        half = (y - 1) * 19 // 22
        for x in range(cx - half, cx + half):
            cv.px(x, y, "J1" if x < cx + half - 4 else "J2")
        if y > 3:
            for x in range(cx - half, cx + half):
                if (y - 3) % 4 == 3:
                    cv.px(x, y, "J2")
    for y in range(0, 24):
        half = y * 19 // 22 + 1
        for d in (0, 1):
            cv.px(cx - half - d, y + d, "J3" if d else "J0")
            cv.px(cx + half - 1 + d, y + d, "J3")
        cv.px(cx - half - 1, y - 1 if y else 0, "F0")
        cv.px(cx + half, y - 1 if y else 0, "F1")
    # Round gable window and the LODGE board.
    cv.put([
        " #### ",
        "#oOOw#",
        "#OoWw#",
        "#OWww#",
        " #### ",
    ], {"#": "J3", "o": "Y0", "O": "Y1", "W": "C1", "w": "C2"}, 37, 5)
    w = S.text_w("LODGE") + 6
    cv.rect(cx - w // 2, 12, cx - w // 2 + w - 1, 20, "J3")
    cv.rect(cx - w // 2 + 1, 13, cx - w // 2 + w - 2, 19, "J0")
    cv.text("LODGE", cx - w // 2 + 3, 14, "J3")
    # Walls: logs, then the balcony across the gable.
    logs(cv, 2, 25, 77, 44, shade_from=66)
    cv.hline(1, 78, 25, "J3")
    S.window(cv, 7, 29, 12, 10, frame="J3", sill=None, warm=True)
    S.window(cv, 61, 29, 12, 10, frame="J3", sill=None, warm=True)
    for x0 in (6, 60):
        cv.rect(x0, 39, x0 + 13, 41, "J2"); cv.hline(x0, x0 + 13, 39, "J1"); cv.hline(x0, x0 + 13, 41, "J3")
        for x in range(x0 + 1, x0 + 13, 2):
            cv.px(x, 38, "K1" if x % 4 == 1 else "G2")
    balcony(cv, 22, 57, 24)
    # Porch roof posts either side of the door.
    for x in (29, 50):
        cv.rect(x, 32, x + 1, 46, "J2")
        cv.vline(x, 32, 46, "J0")
    S.door(cv, 2, 2, "double", top=33, ramp=("J0", "J1", "J2", "J3"))
    stone_base(cv, 0, 79, 45, 47)
    S.door(cv, 2, 2, "double", top=33, ramp=("J0", "J1", "J2", "J3"))
    # Stacked firewood under the west window.
    for j, yy in enumerate((44, 41)):
        for xx in range(3 + j * 2, 19 - j * 2, 3):
            cv.rect(xx, yy - 2, xx + 2, yy, "J3")
            cv.px(xx + 1, yy - 1, "J0")
    return cv


# ----------------------------------------------------------------- chalet ---
def chalet():
    """A Larchmere chalet: a broad front gable under snow, a carved balcony,
    green shutters and red geranium window boxes on honey timber."""
    cv = Canvas(64, 48)
    cx = 32
    def outer(y):
        return 2 + y * 30 // 24
    # Gable face (timber, vertical boards in the peak).
    for y in range(3, 27):
        half = outer(y) - 5
        for x in range(cx - half, cx + half):
            col = "J1" if x < cx + half - 6 else "J2"
            if (x - cx) % 3 == 0:
                col = "J2" if col == "J1" else "J3"
            cv.px(x, y, col)
    # Broad roof planes seen edge-on: snow over thick slate bargeboards.
    for y in range(0, 25):
        o = outer(y)
        for t, (lc, rc) in enumerate(zip(("F0", "F0", "F1", "A1", "A2", "A3"), ("F1", "F1", "F2", "A2", "A3", "A3"))):
            if y < 2 and t > 2:
                continue
            cv.px(cx - o + t, y, lc)
            cv.px(cx + o - 1 - t, y, rc)
    for x in range(cx - 2, cx + 2):
        cv.px(x, 0, "F0"); cv.px(x, 1, "F1")
    # A tiny vent heart in the gable peak.
    cv.put([" # # ", "#####", " ### ", "  #  "], {"#": "J3"}, cx - 3, 9)
    balcony(cv, 12, 51, 18, posts=3)
    # Lower storey: logs with shuttered windows.
    logs(cv, 3, 26, 60, 44, shade_from=52)
    cv.hline(2, 61, 26, "J3")
    shutter_window(cv, 42, 29, w=10, h=9)
    S.door(cv, 1, 2, "wood", top=31, ramp=("J0", "J1", "J2", "J3"))
    cv.put([" ## ", "#yy#", "#yy#"], {"#": "J3", "y": "Y1"}, 7, 29)  # a lantern by the door
    stone_base(cv, 1, 62, 45, 47)
    S.door(cv, 1, 2, "wood", top=31, ramp=("J0", "J1", "J2", "J3"))
    return cv


# ----------------------------------------------------------- conservatory ---
def snowflake(cv, x, y, c="I0"):
    cv.put([
        "#.#.#",
        ".###.",
        "##.##",
        ".###.",
        "#.#.#",
    ], {"#": c}, x, y)


def frost_conservatory():
    """Conservatory 7: a frosted-glass hall under a pale-blue barrel roof,
    snowflake panes, a white entrance gable and the CONSERVATORY band."""
    cv = Canvas(96, 64)
    # Pale-blue vaulted roof with ribs; snow along its crown.
    for x in range(0, 96):
        t = abs(x - 47.5) / 48
        top = 10 + int(round(10 * t * t))
        for y in range(top, 30):
            col = "U0" if x < 40 else ("I2" if x < 72 else "U1")
            if (x % 8) == 3:
                col = "I0" if x < 40 else ("I1" if x < 72 else "I2")
            cv.px(x, y, col)
        cv.px(x, top, "I0")
        cv.px(x, top - 1, "F0" if t < 0.75 else None)
        cv.px(x, 29, "I3")
    for x in range(8, 88, 6):
        cv.px(x, 13 + int(10 * ((x - 47.5) / 48) ** 2), "F1")
    # Frosted glass walls: a grid of panes, every other one etched with a flake.
    cv.rect(0, 30, 95, 56, "I1")
    for x in range(0, 96):
        for y in range(30, 57):
            if (x + (y - 30)) > 120:
                cv.px(x, y, "I2")
    for y in range(30, 57):
        for x in range(0, 96):
            if x % 8 == 0 or (y - 30) % 9 == 0:
                cv.px(x, y, "R0" if x < 76 else "R1")
    for row in range(3):
        for col in range(12):
            px0, py0 = col * 8 + 2, 30 + row * 9 + 2
            if (row + col) % 2 == 0:
                snowflake(cv, px0, py0, "I0" if col < 9 else "I1")
            else:
                cv.px(px0 + 1, py0 + 3, "I0"); cv.px(px0 + 2, py0 + 2, "I0"); cv.px(px0 + 3, py0 + 1, "I0")
    cv.vline(0, 30, 56, "R0"); cv.vline(95, 30, 56, "R2")
    # Entrance gable: white frame with a crest, glass door in tile (3,3).
    for y in range(4, 31):
        half = min(17, (y - 4) * 17 // 12)
        for x in range(48 - half, 48 + half):
            cv.px(x, y, "R0" if x < 48 + half - 3 else "R1")
    for y in range(4, 17):
        half = (y - 4) * 17 // 12
        cv.px(48 - half - 1, y, "I3"); cv.px(48 + half, y, "I3")
        cv.px(48 - half - 1, y - 1, "F0"); cv.px(48 + half, y - 1, "F1")
    cv.hline(46, 49, 3, "F0")
    snowflake(cv, 46, 7, "I2")
    cv.rect(30, 17, 65, 41, "R0"); cv.vline(64, 17, 41, "R1"); cv.vline(65, 17, 41, "R2")
    # The sign band.
    cv.rect(21, 20, 75, 28, "I3")
    cv.rect(22, 21, 74, 27, "U2"); cv.hline(22, 74, 21, "U1"); cv.hline(22, 74, 27, "U3")
    cv.text("CONSERVATORY", 48 - S.text_w("CONSERVATORY") // 2, 22, "T0", "U3")
    # Tall frosted entrance panes either side of the door.
    for x0 in (33, 57):
        cv.rect(x0, 31, x0 + 5, 47, "I1")
        cv.rect(x0 + 3, 31, x0 + 5, 47, "I2")
        cv.vline(x0, 31, 47, "R1")
        snowflake(cv, x0 + 1, 37, "I0")
    S.door(cv, 3, 3, "glass", top=48)
    cv.hline(50, 61, 47, "R1")
    S.foundation(cv, 0, 95, 57, 63)
    S.door(cv, 3, 3, "glass", top=48)
    # Snow banked against the footing.
    for x in range(0, 96):
        if 47 <= x <= 64:
            continue
        h = 1 + ((x * 5) % 7 == 0) + ((x * 3) % 13 == 0)
        for y in range(57 - h + 1, 58):
            cv.px(x, y + 1, "F0" if y < 57 else "F2")
    return cv


# -------------------------------------------------------------- boathouse ---
def boathouse():
    """A boathouse on stilts at the lake edge: a low gabled shed with a dark
    boat bay, a slipway and a log raft pulled up and tied to a post."""
    cv = Canvas(64, 48)
    cx = 30
    # Stilts and cross-braces under the deck.
    for x in (6, 20, 36, 50):
        cv.rect(x, 30, x + 2, 44, "J3")
        cv.vline(x, 30, 44, "J2")
    cv.line([(8, 33), (20, 41)], "J3"); cv.line([(38, 33), (50, 41)], "J3")
    # Deck and shed walls (vertical boards).
    cv.rect(1, 26, 57, 29, "J1"); cv.hline(1, 57, 26, "J0"); cv.hline(1, 57, 29, "J3")
    cv.rect(4, 12, 54, 25, "J1")
    for x in range(4, 55, 3):
        cv.vline(x, 12, 25, "J2")
    cv.rect(46, 12, 54, 25, "J2")
    # Boat bay: a dark opening with hanging oars.
    cv.rect(20, 14, 40, 25, "J3")
    cv.rect(21, 15, 39, 25, "A3")
    cv.line([(24, 16), (27, 24)], "J1"); cv.line([(33, 16), (31, 24)], "J1")
    cv.hline(20, 40, 14, "J0")
    # Roof: a shallow gable with snow.
    for y in range(2, 13):
        half = 14 + (y - 2) * 18 // 10
        for x in range(cx - half, cx + half):
            col = "A1" if x < cx + half - 8 else "A2"
            if (y - 2) % 3 == 2:
                col = "A2" if col == "A1" else "A3"
            cv.px(x, y, col)
    snow_cap(cv, cx - 14, cx + 13, 2, depth=2, seed=4)
    cv.hline(cx - 32, cx + 31, 12, "A3")
    # Small window on the west wall.
    S.window(cv, 8, 16, 8, 6, frame="J3", sill=None)
    # Slipway planks run down to the shore, east of the shed.
    for i, x in enumerate(range(44, 62)):
        y = 30 + i // 2
        cv.hline(x, x + 1, y, "J1"); cv.px(x, y + 1, "J3")
    # The log raft: four lashed logs, tied to a mooring post.
    for j, y in enumerate((38, 40, 42, 44)):
        cv.rect(30 + j, y, 47 + j, y + 1, "J1")
        cv.hline(30 + j, 47 + j, y, "J0")
        cv.px(30 + j, y + 1, "J2"); cv.px(47 + j, y + 1, "J3")
    for x in (34, 44):
        cv.vline(x + 1, 38, 45, "E2")
    cv.rect(57, 34, 59, 46, "J3"); cv.vline(57, 34, 46, "J2"); cv.hline(57, 34, 59, "J0")
    cv.line([(50, 41), (54, 39), (57, 38)], "E2")
    return cv


def build():
    IMAGES.clear()
    for key, fn in (("alpine_lodge", alpine_lodge), ("chalet", chalet),
                    ("frost_conservatory", frost_conservatory), ("boathouse", boathouse)):
        im = fn().image()
        assert im.size == tuple(v * 16 for v in SIZES[key]), key
        IMAGES[key] = im
