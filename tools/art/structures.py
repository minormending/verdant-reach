"""Multi-tile buildings -> public/assets/structures/<key>.png, (w*16)x(h*16).

Drawn procedurally with a few pixel primitives plus hand-authored ASCII
details (doors, windows, emblems). The door is always drawn inside the
door tile from STRUCTURES (src/contracts/ids.ts), touching its bottom edge.
Pixels outside the building are transparent (the map's ground tiles show).
"""

from __future__ import annotations

import math

import numpy as np
from PIL import Image

import gbc
from gbc import C, img_from_rows

STRUCTURES = {
    "house_small": (4, 3, (1, 2)),
    "house_large": (5, 4, (2, 3)),
    "herbarium": (6, 4, (2, 3)),
    "greenhouse": (4, 3, (2, 2)),
    "market": (4, 3, (1, 2)),
    "conservatory": (6, 4, (3, 3)),
    "lodge": (5, 3, (2, 2)),
}

# 3x5 sign font (Crystal's MART sign style).
FONT = {
    "A": ["###", "#.#", "###", "#.#", "#.#"], "B": ["##.", "#.#", "##.", "#.#", "##."],
    "C": ["###", "#..", "#..", "#..", "###"], "E": ["###", "#..", "##.", "#..", "###"],
    "H": ["#.#", "#.#", "###", "#.#", "#.#"], "I": ["###", ".#.", ".#.", ".#.", "###"],
    "K": ["#.#", "#.#", "##.", "#.#", "#.#"], "M": ["#.#", "###", "###", "#.#", "#.#"],
    "R": ["##.", "#.#", "##.", "#.#", "#.#"], "T": ["###", ".#.", ".#.", ".#.", ".#."],
    "U": ["#.#", "#.#", "#.#", "#.#", "###"], "S": ["###", "#..", "###", "..#", "###"],
    "G": ["###", "#..", "#.#", "#.#", "###"], "O": ["###", "#.#", "#.#", "#.#", "###"],
    "P": ["##.", "#.#", "##.", "#..", "#.."], "L": ["#..", "#..", "#..", "#..", "###"],
    "N": ["#.#", "###", "###", "###", "#.#"], "D": ["##.", "#.#", "#.#", "#.#", "##."],
    " ": ["...", "...", "...", "...", "..."],
}


class Canvas:
    def __init__(self, w: int, h: int):
        self.a = np.zeros((h, w, 4), np.uint8)
        self.w, self.h = w, h

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.a[y, x] = C[c] if isinstance(c, str) else c

    def rect(self, x0, y0, x1, y1, c):
        """Filled, inclusive."""
        x0, x1 = max(0, x0), min(self.w - 1, x1)
        y0, y1 = max(0, y0), min(self.h - 1, y1)
        if x0 <= x1 and y0 <= y1:
            self.a[y0:y1 + 1, x0:x1 + 1] = C[c] if isinstance(c, str) else c

    def hline(self, x0, x1, y, c):
        self.rect(x0, y, x1, y, c)

    def vline(self, x, y0, y1, c):
        self.rect(x, y0, x, y1, c)

    def box(self, x0, y0, x1, y1, c):
        self.hline(x0, x1, y0, c); self.hline(x0, x1, y1, c)
        self.vline(x0, y0, y1, c); self.vline(x1, y0, y1, c)

    def paste(self, rows, key, x, y):
        im = img_from_rows(rows, key)
        a = gbc.to_array(im)
        h, w = a.shape[:2]
        sub = self.a[y:y + h, x:x + w]
        m = a[: sub.shape[0], : sub.shape[1], 3] > 0
        sub[m] = a[: sub.shape[0], : sub.shape[1]][m]

    def text(self, s, x, y, c):
        for ch in s:
            for j, row in enumerate(FONT[ch]):
                for i, v in enumerate(row):
                    if v == "#":
                        self.px(x + i, y + j, c)
            x += 4

    def image(self):
        return Image.fromarray(self.a, "RGBA")


def text_w(s):
    return len(s) * 4 - 1


# ------------------------------------------------------------ components ----
def door(cv: Canvas, cell_x, cell_y, style="wood", top=None):
    """Door inside the door tile, bottom-aligned. x0 = cell's left px."""
    x0, y1 = cell_x * 16, cell_y * 16 + 15
    yt = y1 - 15 if top is None else top
    if style == "wood":
        cv.rect(x0 + 2, yt, x0 + 13, y1, "o3")          # frame
        cv.rect(x0 + 3, yt + 1, x0 + 12, y1, "o1")
        cv.vline(x0 + 3, yt + 1, y1, "o0")
        cv.vline(x0 + 12, yt + 1, y1, "o2")
        for yy in range(yt + 4, y1, 4):
            cv.hline(x0 + 4, x0 + 11, yy, "o2")
        cv.px(x0 + 10, yt + (y1 - yt) // 2 + 1, "y1")
        cv.px(x0 + 10, yt + (y1 - yt) // 2 + 2, "o3")
    elif style == "glass":
        cv.rect(x0 + 1, yt, x0 + 14, y1, "k")
        cv.rect(x0 + 2, yt + 1, x0 + 13, y1, "q2")
        cv.rect(x0 + 2, yt + 1, x0 + 7, y1, "q1")
        cv.vline(x0 + 7, yt + 1, y1, "r0")
        cv.vline(x0 + 8, yt + 1, y1, "r2")
        for i in range(3):
            cv.px(x0 + 3 + i, yt + 2 + i, "q0")
            cv.px(x0 + 9 + i, yt + 2 + i, "q1")
    elif style == "double":
        cv.rect(x0, yt, x0 + 15, y1, "o3")
        cv.rect(x0 + 1, yt + 1, x0 + 14, y1, "o2")
        cv.rect(x0 + 2, yt + 2, x0 + 6, y1, "o1")
        cv.rect(x0 + 9, yt + 2, x0 + 13, y1, "o1")
        cv.vline(x0 + 7, yt + 1, y1, "o3")
        cv.vline(x0 + 8, yt + 1, y1, "o3")
        cv.rect(x0 + 3, yt + 4, x0 + 5, yt + 7, "o2")
        cv.rect(x0 + 10, yt + 4, x0 + 12, yt + 7, "o2")
        cv.px(x0 + 6, yt + 10, "y1"); cv.px(x0 + 9, yt + 10, "y1")
    # step / threshold
    cv.hline(x0 + 1, x0 + 14, y1, "r2")
    cv.hline(x0 + 2, x0 + 13, y1, "r1")


def window(cv, x0, y0, w, h, frame="o3", sill="o0", glass=("w1", "w2", "white")):
    g_light, g_dark, shine = glass
    cv.rect(x0, y0, x0 + w - 1, y0 + h - 1, frame)
    cv.rect(x0 + 1, y0 + 1, x0 + w - 2, y0 + h - 2, g_dark)
    # light upper-left half
    for yy in range(y0 + 1, y0 + h - 1):
        for xx in range(x0 + 1, x0 + w - 1):
            if (xx - x0) + (yy - y0) < (w + h) // 2:
                cv.px(xx, yy, g_light)
    cv.px(x0 + 2, y0 + 2, shine); cv.px(x0 + 3, y0 + 2, shine); cv.px(x0 + 2, y0 + 3, shine)
    midx = x0 + w // 2
    cv.vline(midx, y0 + 1, y0 + h - 2, frame)
    cv.hline(x0 + 1, x0 + w - 2, y0 + h // 2, frame)
    cv.hline(x0 - 1, x0 + w, y0 + h, sill)


def shingles(cv, x0, y0, x1, y1, pal, course=4, joint=6):
    """Roof: courses of tiles with staggered joints; light upper rows of each course."""
    p0, p1, p2, p3 = pal
    cv.rect(x0, y0, x1, y1, p1)
    for row, yy in enumerate(range(y0, y1 + 1, course)):
        cv.hline(x0, x1, yy + course - 1, p2)
        off = (row % 2) * (joint // 2)
        for xx in range(x0 + off, x1 + 1, joint):
            cv.vline(xx, yy, min(y1, yy + course - 2), p2)
        cv.hline(x0, x1, yy, p1)


def bricks(cv, x0, y0, x1, y1, face="b1", mortar="b2", hi="b0", course=3, length=6):
    cv.rect(x0, y0, x1, y1, face)
    for row, yy in enumerate(range(y0, y1 + 1, course)):
        cv.hline(x0, x1, yy + course - 1, mortar)
        off = (row % 2) * (length // 2)
        for xx in range(x0 + off, x1 + 1, length):
            cv.vline(xx, yy, min(y1, yy + course - 2), mortar)
            if xx + 1 <= x1 and (row + xx) % 3 == 0:
                cv.px(xx + 1, yy, hi)


def glass_panes(cv, x0, y0, x1, y1, pw=5, ph=6, frame="r0", plants=True, seed=1):
    """Glazed wall: pale aqua panes with white glazing bars, a few plants inside."""
    cv.rect(x0, y0, x1, y1, "q1")
    rng = np.random.default_rng(seed)
    # plants inside (dark green blobs in the lower half)
    if plants:
        for xx in range(x0 + 1, x1, 3):
            top = y0 + (y1 - y0) // 2 + int(rng.integers(-3, 3))
            for yy in range(top, y1 + 1):
                cv.px(xx, yy, "q3" if (xx + yy) % 3 else "q2")
                cv.px(xx + 1, yy, "q2")
    for yy in range(y0, y1 + 1):
        for xx in range(x0, x1 + 1):
            if (xx - x0) % pw == 0 or (yy - y0) % ph == 0:
                cv.px(xx, yy, frame)
    # diagonal shines
    for xx in range(x0 + 2, x1 - 2, pw * 2):
        for i in range(3):
            cv.px(xx + i, y0 + 3 - i + ph, "q0") if y0 + 3 - i + ph <= y1 else None


# ------------------------------------------------------------- buildings ----
def house_small():
    cv = Canvas(64, 48)
    roof = ("b0", "b1", "b2", "b3")
    # chimney
    cv.rect(44, 0, 51, 9, "r3"); cv.rect(45, 1, 50, 9, "r2"); cv.hline(45, 50, 1, "r1")
    cv.hline(44, 51, 0, "k")
    # roof
    cv.rect(1, 3, 62, 23, "b3")
    shingles(cv, 2, 4, 61, 21, roof)
    cv.hline(2, 61, 4, "b0")
    cv.hline(0, 63, 22, "b3"); cv.hline(0, 63, 23, "k")
    cv.px(0, 21, "b3"); cv.px(63, 21, "b3")
    # wall
    cv.rect(1, 24, 62, 47, "s0")
    cv.hline(1, 62, 24, "s2"); cv.hline(1, 62, 25, "s1")
    cv.vline(0, 24, 47, "k"); cv.vline(63, 24, 47, "k")
    cv.vline(1, 24, 47, "s1"); cv.vline(62, 24, 47, "s2")
    cv.rect(1, 44, 62, 47, "r2"); cv.hline(1, 62, 44, "r1"); cv.hline(1, 62, 47, "r3")
    for xx in range(4, 62, 7):
        cv.vline(xx, 45, 46, "r3")
    window(cv, 38, 29, 16, 11)
    # flower box under the window
    cv.rect(37, 41, 54, 43, "o2"); cv.hline(37, 54, 41, "o1")
    for xx in range(38, 54, 3):
        cv.px(xx, 40, "n1"); cv.px(xx + 1, 40, "g2")
    door(cv, 1, 2, "wood", top=30)
    return cv.image()


def house_large():
    cv = Canvas(80, 64)
    roof = ("u0", "u1", "u2", "u3")
    cv.rect(8, 0, 15, 10, "r3"); cv.rect(9, 1, 14, 10, "r2"); cv.hline(9, 14, 1, "r1"); cv.hline(8, 15, 0, "k")
    cv.rect(1, 3, 78, 33, "u3")
    shingles(cv, 2, 4, 77, 31, roof, course=4, joint=8)
    cv.hline(2, 77, 4, "u0")
    # dormers
    for dx in (16, 50):
        cv.rect(dx - 1, 9, dx + 14, 24, "u3")
        cv.rect(dx, 10, dx + 13, 24, "s0")
        cv.hline(dx - 2, dx + 15, 9, "u3"); cv.hline(dx - 1, dx + 14, 8, "u2")
        window(cv, dx + 2, 12, 10, 9, sill="s0")
    cv.hline(0, 79, 32, "u3"); cv.hline(0, 79, 33, "k")
    # wall: timber-framed plaster
    cv.rect(1, 34, 78, 63, "s0")
    cv.vline(0, 34, 63, "k"); cv.vline(79, 34, 63, "k")
    cv.hline(1, 78, 34, "s2"); cv.hline(1, 78, 35, "s1")
    for xx in (1, 27, 52, 78):
        cv.vline(xx, 36, 59, "o2")
    cv.rect(1, 60, 78, 63, "r2"); cv.hline(1, 78, 60, "r1"); cv.hline(1, 78, 63, "r3")
    for xx in range(4, 78, 7):
        cv.vline(xx, 61, 62, "r3")
    window(cv, 7, 41, 15, 11)
    window(cv, 58, 41, 15, 11)
    for wx in (6, 57):
        cv.rect(wx, 53, wx + 16, 55, "o2"); cv.hline(wx, wx + 16, 53, "o1")
        for xx in range(wx + 1, wx + 16, 3):
            cv.px(xx, 52, "y1"); cv.px(xx + 1, 52, "g2")
    # porch roof over the door
    cv.rect(29, 41, 50, 44, "u3"); cv.hline(30, 49, 42, "u1"); cv.hline(30, 49, 43, "u2")
    door(cv, 2, 3, "wood", top=46)
    return cv.image()


def herbarium():
    cv = Canvas(96, 64)
    # ---- glasshouse wing (right, x 64..95)
    cv.rect(64, 22, 95, 63, "k")
    # gabled glass roof
    for i in range(16):
        y = 22 + (15 - i) // 2
    for xx in range(64, 96):
        top = 16 + abs(xx - 80) // 2
        cv.vline(xx, top, 30, "q2")
        cv.px(xx, top - 1, "k")
        if (xx - 64) % 4 == 0:
            cv.vline(xx, top, 30, "r0")
    for yy in range(18, 31, 4):
        for xx in range(64, 96):
            if cv.a[yy, xx, 3] and tuple(cv.a[yy, xx]) != C["k"]:
                cv.px(xx, yy, "r0")
    cv.hline(65, 94, 30, "r1")
    glass_panes(cv, 65, 31, 94, 54, pw=5, ph=6, seed=3)
    cv.hline(64, 95, 31, "r0")
    bricks(cv, 65, 55, 94, 62)
    # ---- left annex (x 0..15)
    cv.rect(0, 16, 17, 63, "k")
    cv.rect(1, 17, 16, 30, "r3")
    shingles(cv, 1, 18, 16, 29, ("r1", "r2", "r3", "k"), course=3, joint=5)
    cv.hline(0, 17, 30, "k")
    bricks(cv, 1, 31, 16, 62)
    window(cv, 3, 37, 10, 12, frame="r0", sill="r1")
    # ---- main block (x 16..63)
    cv.rect(15, 2, 64, 63, "k")
    # slate roof with a pediment
    cv.rect(16, 3, 63, 25, "r3")
    shingles(cv, 16, 4, 63, 24, ("r1", "r2", "r3", "k"), course=3, joint=6)
    for xx in range(24, 57):
        top = 4 + abs(xx - 40) // 2
        cv.vline(xx, top, 24, "s0")
        cv.px(xx, top, "r0")
        cv.px(xx, top - 1, "k")
    cv.hline(24, 56, 24, "s2")
    # round window with a pressed-leaf emblem in the pediment
    cv.paste([
        "..####..",
        ".#wwww#.",
        "#wwgwww#",
        "#wggGww#",
        "#wwGgGw#",
        "#wwwGww#",
        ".#wwww#.",
        "..####..",
    ], {".": None, "#": "o3", "w": "q0", "g": "g1", "G": "f2"}, 36, 13)
    cv.hline(15, 64, 25, "k")
    # brick walls
    bricks(cv, 16, 26, 63, 62)
    # plaque
    cv.rect(18, 27, 61, 34, "o3")
    cv.rect(19, 28, 60, 33, "s1")
    cv.text("HERBARIUM", 40 - text_w("HERBARIUM") // 2, 28, "o3")
    # stone pilasters & windows
    for xx in (16, 31, 48, 62):
        cv.rect(xx, 35, xx + 1, 62, "r1"); cv.vline(xx + 1, 35, 62, "r2")
    window(cv, 19, 38, 10, 14, frame="o3", sill="r0")
    window(cv, 51, 38, 10, 14, frame="o3", sill="r0")
    cv.rect(31, 36, 48, 47, "r1"); cv.hline(31, 48, 36, "r0")
    door(cv, 2, 3, "double", top=47)
    cv.hline(30, 49, 63, "r2")
    cv.vline(0, 16, 63, "k")
    return cv.image()


def greenhouse():
    """Healing centre: a glass dome with a green copper cap and a green sign band."""
    cv = Canvas(64, 48)
    cx, base = 40, 31
    # left lean-to (x 0..17): sloped glass roof over potted plants
    cv.rect(0, 16, 17, 47, "k")
    for xx in range(1, 17):
        top = 17 + (16 - xx) // 3
        cv.vline(xx, top, 31, "q1" if xx < 9 else "q2")
        if xx % 5 == 0:
            cv.vline(xx, top, 31, "r0")
    for yy in (24, 31):
        cv.hline(1, 16, yy, "r0")
    cv.rect(1, 32, 16, 46, "q1")
    for xx in (1, 6, 11, 16):
        cv.vline(xx, 32, 46, "r0")
    cv.hline(1, 16, 39, "r0")
    for px_ in (2, 7, 12):   # pots with leaves behind the glass
        cv.paste([".g.g", "gGgG", ".bb.", ".bb."], {".": None, "g": "g2", "G": "f2", "b": "b1"}, px_, 35)
    cv.rect(1, 44, 16, 46, "white"); cv.hline(1, 16, 46, "r1")
    # dome x 16..63
    rx, ry = 23.5, 25
    for yy in range(0, base + 1):
        for xx in range(16, 64):
            dx, dy = (xx - cx + 0.5) / rx, (base - yy) / ry
            d = dx * dx + dy * dy
            if d <= 1.0:
                ang = math.degrees(math.atan2(base - yy, xx - cx + 0.5))
                shade = "q1" if xx < cx else "q2"
                if xx > cx + 9 and d > 0.5:
                    shade = "q3"
                cv.px(xx, yy, shade)
                if abs((ang % 22.5) - 11.25) > 9.6 or abs(math.sqrt(d) - 0.62) < 0.035:
                    cv.px(xx, yy, "r0")
                if dy > 0.70:   # green copper cap
                    cv.px(xx, yy, "g1" if xx < cx else "g2")
                    if abs(dy - 0.70) < 0.05:
                        cv.px(xx, yy, "f3")
            elif d <= 1.12:
                cv.px(xx, yy, "k")
    for i in range(6):
        cv.px(25 + i // 2, 16 + i, "white")
    # leaf-and-cross emblem on the cap
    cv.paste([
        "..###..",
        ".#www#.",
        "#wwgww#",
        "#wgggw#",
        "#wwgww#",
        ".#www#.",
        "..###..",
    ], {".": None, "#": "f3", "w": "white", "g": "g2"}, 37, 1)
    # front wall with the green sign band
    cv.rect(16, 30, 63, 47, "k")
    cv.rect(17, 31, 62, 46, "white")
    cv.rect(17, 31, 62, 37, "g2"); cv.hline(17, 62, 31, "g1"); cv.hline(17, 62, 37, "f3")
    cv.text("GREENHOUSE", 40 - text_w("GREENHOUSE") // 2, 32, "white")
    cv.hline(17, 62, 46, "r1")
    window(cv, 19, 39, 10, 6, frame="r2", sill="r1", glass=("q1", "q2", "white"))
    window(cv, 51, 39, 10, 6, frame="r2", sill="r1", glass=("q1", "q2", "white"))
    door(cv, 2, 2, "glass", top=38)
    cv.vline(63, 30, 47, "k")
    return cv.image()


def market():
    cv = Canvas(64, 48)
    # roof
    cv.rect(0, 2, 63, 15, "k")
    shingles(cv, 1, 3, 62, 14, ("o0", "o1", "o2", "o3"), course=3, joint=6)
    # sign board
    cv.rect(14, 4, 49, 12, "k"); cv.rect(15, 5, 48, 11, "g2"); cv.hline(15, 48, 5, "g1")
    cv.text("MARKET", 32 - text_w("MARKET") // 2, 6, "white")
    # walls
    cv.rect(0, 16, 63, 47, "k")
    cv.rect(1, 16, 62, 46, "o1")
    for yy in range(18, 46, 4):
        cv.hline(1, 62, yy, "o2")
    # awning: striped, scalloped
    for xx in range(0, 64):
        stripe = "white" if (xx // 4) % 2 == 0 else "g2"
        cv.vline(xx, 16, 24, stripe)
        if (xx % 4) in (1, 2):
            cv.px(xx, 25, stripe)
    cv.hline(0, 63, 16, "k")
    for xx in range(0, 64):
        if (xx % 4) in (0, 3):
            cv.px(xx, 25, "k")
        else:
            cv.px(xx, 26, "k")
    cv.vline(0, 16, 25, "k"); cv.vline(63, 16, 25, "k")
    # shop window with produce
    cv.rect(35, 29, 60, 40, "o3")
    cv.rect(36, 30, 59, 39, "w1")
    for xx in range(37, 59, 5):
        cv.vline(xx + 3, 30, 33, "white")
    cv.vline(47, 30, 39, "o3")
    # crates of produce under the window
    cv.rect(34, 41, 61, 46, "o3")
    cols = ["b1", "y1", "g2", "m1", "x1"]
    for i, xx in enumerate(range(35, 60, 5)):
        cv.rect(xx, 42, xx + 3, 46, "o2"); cv.hline(xx, xx + 3, 42, "o0")
        for j in range(4):
            cv.px(xx + j, 41, cols[i % len(cols)])
        cv.px(xx + 1, 40, cols[i % len(cols)]); cv.px(xx + 2, 40, cols[i % len(cols)])
    door(cv, 1, 2, "wood", top=29)
    cv.rect(3, 30, 13, 40, "o3"); cv.rect(4, 31, 12, 39, "s0")
    cv.text("O", 5, 32, "g2")
    cv.px(9, 33, "b1"); cv.px(10, 33, "b1"); cv.px(9, 34, "b1"); cv.px(10, 34, "b1")
    cv.hline(5, 11, 38, "o2")
    return cv.image()


def conservatory():
    cv = Canvas(96, 64)
    # wings (lower glass halls)
    for (x0, x1, seed) in ((0, 33, 11), (78, 95, 12)):
        cv.rect(x0, 18, x1, 63, "k")
        for xx in range(x0 + 1, x1):
            # curved (barrel-vault) roof
            t = (xx - x0) / max(1, (x1 - x0))
            top = 19 + int(6 * (1 - math.sin(t * math.pi)))
            cv.vline(xx, top, 30, "q2" if t > 0.5 else "q1")
            cv.px(xx, top - 1, "k")
            if (xx - x0) % 4 == 0:
                cv.vline(xx, top, 30, "r0")
        cv.hline(x0 + 1, x1 - 1, 26, "r0")
        cv.hline(x0 + 1, x1 - 1, 30, "r0")
        glass_panes(cv, x0 + 1, 31, x1 - 1, 55, pw=4, ph=6, seed=seed)
        cv.rect(x0 + 1, 56, x1 - 1, 62, "r1"); cv.hline(x0 + 1, x1 - 1, 56, "r0"); cv.hline(x0 + 1, x1 - 1, 62, "r2")
        for xx in range(x0 + 3, x1, 6):
            cv.vline(xx, 57, 61, "r2")
    # central pavilion x 33..79, dome centred on x=56
    cx, base = 56, 32
    rx, ry = 23.5, 26
    for yy in range(0, base + 1):
        for xx in range(32, 81):
            dx, dy = (xx - cx + 0.5) / rx, (base - yy) / ry
            d = dx * dx + dy * dy
            if d <= 1.0:
                ang = math.degrees(math.atan2(base - yy, xx - cx + 0.5))
                shade = "q1" if xx < cx else "q2"
                if xx > cx + 10 and d > 0.45:
                    shade = "q3"
                cv.px(xx, yy, shade)
                if abs((ang % 15) - 7.5) > 6.4 or abs(math.sqrt(d) - 0.5) < 0.03 \
                        or abs(math.sqrt(d) - 0.78) < 0.025:
                    cv.px(xx, yy, "r0")
            elif d <= 1.10:
                cv.px(xx, yy, "k")
    for i in range(7):
        cv.px(42 + i // 2, 14 + i, "white")
    # lantern + finial
    cv.paste([
        "...#...",
        "..#y#..",
        "...#...",
        "..###..",
        ".#gGg#.",
        "#######",
    ], {".": None, "#": "k", "y": "y1", "g": "g1", "G": "g2"}, 53, 0)
    # facade
    cv.rect(32, 32, 80, 63, "k")
    glass_panes(cv, 33, 33, 79, 55, pw=6, ph=7, seed=5)
    cv.rect(33, 33, 79, 36, "r0"); cv.hline(33, 79, 36, "r1")
    # crest above the door: a pressed leaf
    cv.paste([
        ".#######.",
        "#rrrrrrr#",
        "#rrrgrrr#",
        "#rrgGgrr#",
        "#rgGGGgr#",
        "#rrgGgrr#",
        "#rrrGrrr#",
        ".#rrrrr#.",
        "..#####..",
    ], {".": None, "#": "o3", "r": "s0", "g": "g1", "G": "f2"}, 52, 37)
    cv.rect(33, 56, 79, 62, "r1"); cv.hline(33, 79, 56, "r0"); cv.hline(33, 79, 62, "r2")
    for xx in range(35, 79, 6):
        cv.vline(xx, 57, 61, "r2")
    # arched glass door at x 48..63
    cv.rect(48, 47, 63, 63, "k")
    cv.rect(49, 48, 62, 63, "q2"); cv.rect(49, 48, 55, 63, "q1")
    cv.vline(55, 48, 63, "r0"); cv.vline(56, 48, 63, "r2")
    cv.px(48, 47, (0, 0, 0, 0)); cv.px(63, 47, (0, 0, 0, 0))
    cv.hline(49, 62, 47, "k")
    cv.hline(48, 63, 63, "r2")
    for i in range(3):
        cv.px(50 + i, 50 + i, "q0")
    # pillars flanking the door
    for xx in (45, 64):
        cv.rect(xx, 44, xx + 2, 62, "r0"); cv.vline(xx + 2, 44, 62, "r1"); cv.hline(xx - 1, xx + 3, 43, "r1")
    return cv.image()


def lodge():
    """Sugarbush sugar shack: log walls, tin roof, steam cupola, woodpile."""
    cv = Canvas(80, 48)
    # roof (rust tin with seams)
    cv.rect(0, 8, 79, 25, "k")
    cv.rect(1, 9, 78, 23, "m2")
    for xx in range(2, 78, 4):
        cv.vline(xx, 10, 23, "m3")
        cv.vline(xx + 1, 10, 23, "m1")
    cv.hline(1, 78, 9, "m1")
    cv.hline(0, 79, 24, "m3"); cv.hline(0, 79, 25, "k")
    # cupola with vents and steam
    cv.rect(32, 3, 47, 9, "k")
    cv.rect(33, 4, 46, 8, "o2")
    for xx in range(34, 46, 3):
        cv.vline(xx, 5, 8, "o3")
    cv.rect(30, 1, 49, 3, "k"); cv.hline(31, 48, 2, "m1")
    # log walls
    cv.rect(0, 26, 79, 47, "k")
    for i, yy in enumerate(range(26, 46, 4)):
        cv.rect(1, yy, 78, yy + 3, "o1")
        cv.hline(1, 78, yy, "o0")
        cv.hline(1, 78, yy + 3, "o3")
        cv.hline(1, 78, yy + 2, "o2")
        # log ends at the corners
        for ex in (0, 76):
            cv.rect(ex, yy, ex + 3, yy + 3, "o3")
            cv.rect(ex + 1, yy + 1, ex + 2, yy + 2, "o0")
    cv.rect(1, 46, 78, 47, "r2"); cv.hline(1, 78, 47, "r3")
    # window
    window(cv, 9, 30, 12, 9)
    # sign: syrup drop
    cv.paste([
        "#########",
        "#ooooooo#",
        "#ooo#ooo#",
        "#oo#m#oo#",
        "#o#mmm#o#",
        "#o#mMm#o#",
        "#oo###oo#",
        "#########",
    ], {"#": "o3", "o": "o0", "m": "m1", "M": "m0"}, 51, 30)
    door(cv, 2, 2, "wood", top=29)
    # woodpile at the right
    for j, yy in enumerate((44, 41, 38)):
        for xx in range(62 + j * 2, 76 - j * 2, 4):
            cv.rect(xx, yy - 3, xx + 3, yy, "o3")
            cv.rect(xx + 1, yy - 2, xx + 2, yy - 1, "o0")
    # steam puffs over the cupola (white with a soft outline)
    cv.paste([
        "..###.....",
        ".#www#.##.",
        "#wwwww#ww#",
        "#wwwwwwww#",
        ".########.",
    ], {".": None, "#": "r1", "w": "white"}, 50, 0)
    return cv.image()


BUILDERS = {
    "house_small": house_small, "house_large": house_large, "herbarium": herbarium,
    "greenhouse": greenhouse, "market": market, "conservatory": conservatory, "lodge": lodge,
}


def build():
    cells = []
    for key, fn in BUILDERS.items():
        w, h, (dx, dy) = STRUCTURES[key]
        im = fn()
        assert im.size == (w * 16, h * 16), (key, im.size)
        gbc.save(im, f"structures/{key}.png")
        # review: on a grass field with the door tile marked
        bg = Image.new("RGBA", (im.width + 32, im.height + 32))
        grass = Image.open(gbc.ASSETS / "tiles/grass.png")
        path = Image.open(gbc.ASSETS / "tiles/path.png")
        for y in range(0, bg.height, 16):
            for x in range(0, bg.width, 16):
                bg.paste(grass, (x, y))
        for y in range(16 + (dy + 1) * 16, bg.height, 16):
            bg.paste(path, (16 + dx * 16, y))
        bg.alpha_composite(im, (16, 16))
        cells.append((key, bg))
    gbc.grid_sheet(cells, 4, 3).save(gbc.REVIEW / "structures.png")


if __name__ == "__main__":
    build()
