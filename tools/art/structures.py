"""Multi-tile buildings and landmarks -> public/assets/structures/<key>.png.

Each image is exactly (w*16)x(h*16) per STRUCTURES in src/contracts/ids.ts.
Doors sit inside their door tile, touching its bottom edge; doorless
structures (barn, windmill, well, big trees) are scenery. Pixels outside the
silhouette are transparent and show the ground tiles underneath.

Same rules as the tiles (docs/STYLE.md): the shared ramps from tiles.HEX,
light from the top-left, dark hue-shifted edges instead of black outlines,
eaves shadows under every roof and lit glass in every window.
Review: tools/art/review/structures.png (each building on grass with a path
to its door, and a mini town).
"""

from __future__ import annotations

import math

import numpy as np
from PIL import Image

import gbc
import tiles
from tiles import IDX, RGBA

STRUCTURES = {          # mirrors src/contracts/ids.ts (w, h, door)
    "house_small": (4, 3, (1, 2)),
    "house_large": (5, 4, (2, 3)),
    "herbarium": (6, 4, (2, 3)),
    "greenhouse": (4, 3, (2, 2)),
    "market": (4, 3, (1, 2)),
    "conservatory": (6, 4, (3, 3)),
    "lodge": (5, 3, (2, 2)),
    "barn": (5, 4, None),
    "windmill": (3, 4, None),
    "well": (2, 2, None),
    "big_oak": (3, 3, None),
    "big_maple": (2, 2, None),
}

# 3x5 sign font (Crystal's MART sign style).
FONT = {
    "A": ["###", "#.#", "###", "#.#", "#.#"], "B": ["##.", "#.#", "##.", "#.#", "##."],
    "C": ["###", "#..", "#..", "#..", "###"], "D": ["##.", "#.#", "#.#", "#.#", "##."],
    "E": ["###", "#..", "##.", "#..", "###"], "F": ["###", "#..", "##.", "#..", "#.."],
    "G": ["###", "#..", "#.#", "#.#", "###"], "H": ["#.#", "#.#", "###", "#.#", "#.#"],
    "I": ["###", ".#.", ".#.", ".#.", "###"], "K": ["#.#", "#.#", "##.", "#.#", "#.#"],
    "L": ["#..", "#..", "#..", "#..", "###"], "M": ["#.#", "###", "###", "#.#", "#.#"],
    "N": ["##.", "#.#", "#.#", "#.#", "#.#"], "O": ["###", "#.#", "#.#", "#.#", "###"],
    "P": ["##.", "#.#", "##.", "#..", "#.."], "R": ["##.", "#.#", "##.", "#.#", "#.#"],
    "S": ["###", "#..", "###", "..#", "###"], "T": ["###", ".#.", ".#.", ".#.", ".#."],
    "U": ["#.#", "#.#", "#.#", "#.#", "###"], "V": ["#.#", "#.#", "#.#", "#.#", ".#."],
    "W": ["#.#", "#.#", "###", "###", "#.#"], "Y": ["#.#", "#.#", ".#.", ".#.", ".#."],
    " ": ["...", "...", "...", "...", "..."],
}

CLEAR = -1


class Canvas:
    def __init__(self, w: int, h: int):
        self.a = np.full((h, w), CLEAR, np.int16)
        self.w, self.h = w, h

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.a[y, x] = CLEAR if c is None else IDX[c]

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            v = self.a[y, x]
            return None if v == CLEAR else tiles.NAMES[v]
        return None

    def rect(self, x0, y0, x1, y1, c):
        x0, x1 = max(0, x0), min(self.w - 1, x1)
        y0, y1 = max(0, y0), min(self.h - 1, y1)
        if x0 <= x1 and y0 <= y1:
            self.a[y0:y1 + 1, x0:x1 + 1] = CLEAR if c is None else IDX[c]

    def hline(self, x0, x1, y, c):
        self.rect(x0, y, x1, y, c)

    def vline(self, x, y0, y1, c):
        self.rect(x, y0, x, y1, c)

    def put(self, rows, key, x, y):
        for j, r in enumerate(rows):
            for i, ch in enumerate(r):
                if ch == " " or ch not in key:
                    continue
                self.px(x + i, y + j, key[ch])

    def recolor(self, x0, y0, x1, y1, src, dst):
        sub = self.a[y0:y1 + 1, x0:x1 + 1]
        sub[sub == IDX[src]] = IDX[dst]

    def text(self, s, x, y, c, shadow=None):
        for ch in s:
            for j, row in enumerate(FONT[ch]):
                for i, v in enumerate(row):
                    if v == "#":
                        if shadow:
                            self.px(x + i + 1, y + j + 1, shadow)
                        self.px(x + i, y + j, c)
            x += 4

    def image(self) -> Image.Image:
        rgba = RGBA[np.clip(self.a, 0, None)].copy()
        rgba[self.a == CLEAR] = (0, 0, 0, 0)
        return Image.fromarray(rgba, "RGBA")


def text_w(s):
    return len(s) * 4 - 1


# ------------------------------------------------------------ components ----
def roof_tiles(cv, x0, y0, x1, y1, ramp, course=3, joint=4, shade_from=0.72):
    """Clay/slate roof seen from the eaves side: staggered courses, lit
    upper row per course, right end in shade, ridge cap and dark eaves."""
    r0, r1, r2, r3 = ramp
    W = max(1, x1 - x0)
    for row, yy in enumerate(range(y0 + 1, y1, course)):
        off = (row % 2) * (joint // 2)
        for x in range(x0, x1 + 1):
            t = (x - x0) / W
            dark = t > shade_from
            body, line = (r2, r3) if dark else (r1, r2)
            for k in range(course):
                y = yy + k
                if y >= y1:
                    break
                col = body
                if k == course - 1:
                    col = line
                elif (x - x0 - off) % joint == 0:
                    col = line
                elif k == 0 and not dark and ((x - x0 - off) % joint == 1):
                    col = r0
                cv.px(x, y, col)
    cv.hline(x0, x1, y0, r3)                 # ridge edge
    cv.hline(x0 + 1, x1 - 1, y0 + 1, r0)     # ridge cap catches the light
    cv.hline(x0, x1, y1, r3)                 # eaves
    cv.vline(x0, y0, y1, r3)
    cv.vline(x1, y0, y1, r3)


def roof_hip(cv, x0, y0, x1, y1, ramp, hip=10, course=3, joint=4, ridge=True):
    """Hipped roof in 3/4 view: a front plane between two hip faces. The
    west hip catches the light, the east hip falls into shade, every face
    keeps the same staggered courses so the roof reads as one surface."""
    r0, r1, r2, r3 = ramp
    H = max(1, y1 - y0)
    for y in range(y0, y1 + 1):
        t = (y - y0) / H
        xl = x0 + hip * (1 - t)
        xr = x1 - hip * (1 - t)
        row = (y - y0 - 1) // course
        k = (y - y0 - 1) % course
        off = (row % 2) * (joint // 2)
        for x in range(x0, x1 + 1):
            if x < xl:
                body, line, top = r0, r1, r0
            elif x > xr:
                body, line, top = r2, r3, r2
            else:
                body, line, top = r1, r2, r0
                if x > x0 + (x1 - x0) * 0.85:
                    top = r1
            col = body
            if k == course - 1:
                col = line
            elif (x - x0 - off) % joint == 0:
                col = line
            elif k == 0 and (x - x0 - off) % joint == 1:
                col = top
            cv.px(x, y, col)
        cv.px(int(round(xl)), y, r2)
        cv.px(int(round(xr)), y, r3)
    if ridge:
        cv.hline(x0 + hip, x1 - hip, y0, r3)
        cv.hline(x0 + hip + 1, x1 - hip - 1, y0 + 1, r0)
    cv.hline(x0, x1, y1, r3)
    cv.hline(x0, x1, y1 - 1, r2)


def plaster(cv, x0, y0, x1, y1, ramp=("E0", "E1", "E2", "E3")):
    l0, l1, l2, l3 = ramp
    cv.rect(x0, y0, x1, y1, l0)
    cv.vline(x1, y0, y1, l2)
    cv.vline(x1 - 1, y0, y1, l1)
    cv.vline(x0, y0, y1, l1)


def eaves_shadow(cv, x0, x1, y, col="E2", col2=None, depth=2):
    cv.hline(x0, x1, y, col)
    if depth > 1:
        cv.hline(x0, x1, y + 1, col2 or col)


def bricks(cv, x0, y0, x1, y1, face="B1", mortar="B2", hi="B0", course=3, length=6):
    cv.rect(x0, y0, x1, y1, face)
    for row, yy in enumerate(range(y0, y1 + 1, course)):
        cv.hline(x0, x1, min(y1, yy + course - 1), mortar)
        off = (row % 2) * (length // 2)
        for xx in range(x0 + off, x1 + 1, length):
            cv.vline(xx, yy, min(y1, yy + course - 2), mortar)
            if xx + 1 <= x1 and yy <= y1:
                cv.px(xx + 1, yy, hi)


def foundation(cv, x0, x1, y0, y1, ramp=("R0", "R1", "R2", "R3")):
    cv.rect(x0, y0, x1, y1, ramp[1])
    cv.hline(x0, x1, y0, ramp[0])
    cv.hline(x0, x1, y1, ramp[3])
    for xx in range(x0 + 3, x1, 6):
        cv.vline(xx, y0 + 1, y1 - 1, ramp[2])


def window(cv, x0, y0, w, h, frame="O3", sill="R1", glass=("W0", "W1", "W2"), curtain=None,
           cross=True, warm=False):
    """Lit pane: pale upper-left reflection, deeper lower-right, a frame in
    the darkest wood and a stone sill that catches the light."""
    g0, g1, g2 = glass
    cv.rect(x0, y0, x0 + w - 1, y0 + h - 1, frame)
    for yy in range(y0 + 1, y0 + h - 1):
        for xx in range(x0 + 1, x0 + w - 1):
            d = (xx - x0) + (yy - y0)
            col = g1
            if d > (w + h) * 0.62:
                col = g2
            cv.px(xx, yy, col)
    # diagonal glint
    for i in range(3):
        cv.px(x0 + 2 + i, y0 + h - 3 - i - (h // 3), g0)
    cv.px(x0 + 2, y0 + 2, g0)
    if warm:
        cv.rect(x0 + 1, y0 + h - 3, x0 + w - 2, y0 + h - 2, "Y1")
    if curtain:
        for yy in range(y0 + 1, y0 + h - 1):
            cv.px(x0 + 1, yy, curtain)
            cv.px(x0 + w - 2, yy, curtain)
        cv.px(x0 + 2, y0 + 1, curtain)
        cv.px(x0 + w - 3, y0 + 1, curtain)
    if cross:
        mx = x0 + w // 2
        cv.vline(mx, y0 + 1, y0 + h - 2, frame)
        cv.hline(x0 + 1, x0 + w - 2, y0 + h // 2, frame)
    if sill:
        cv.hline(x0 - 1, x0 + w, y0 + h, sill)
        cv.hline(x0 - 1, x0 + w, y0 + h + 1, "R2") if sill == "R1" else None


def door(cv, cx, cy, style="wood", top=None, ramp=("O0", "O1", "O2", "O3")):
    """Door inside door tile (cx, cy), bottom-aligned, with a stone step."""
    x0, y1 = cx * 16, cy * 16 + 15
    yt = y1 - 15 if top is None else top
    o0, o1, o2, o3 = ramp
    if style in ("wood", "arch"):
        cv.rect(x0 + 2, yt, x0 + 13, y1, o3)
        cv.rect(x0 + 3, yt + 1, x0 + 12, y1 - 1, o1)
        for xx in range(x0 + 5, x0 + 12, 3):
            cv.vline(xx, yt + 2, y1 - 1, o2)
        cv.vline(x0 + 3, yt + 1, y1 - 1, o0)
        cv.vline(x0 + 12, yt + 1, y1 - 1, o2)
        cv.hline(x0 + 3, x0 + 12, yt + 1, o2)
        cv.px(x0 + 10, yt + (y1 - yt) // 2 + 1, "Y1")
        if style == "arch":
            cv.px(x0 + 2, yt, None); cv.px(x0 + 13, yt, None)
            cv.px(x0 + 3, yt, None); cv.px(x0 + 12, yt, None)
            cv.hline(x0 + 4, x0 + 11, yt, o3)
            cv.px(x0 + 3, yt + 1, o3); cv.px(x0 + 12, yt + 1, o3)
    elif style == "glass":
        cv.rect(x0 + 2, yt, x0 + 13, y1, "R2")
        cv.rect(x0 + 3, yt + 1, x0 + 12, y1 - 1, "Q1")
        cv.rect(x0 + 8, yt + 1, x0 + 12, y1 - 1, "Q2")
        cv.vline(x0 + 7, yt + 1, y1 - 1, "R0")
        cv.vline(x0 + 8, yt + 1, y1 - 1, "R2")
        for i in range(3):
            cv.px(x0 + 4 + i, yt + 5 - i, "Q0")
            cv.px(x0 + 9 + i, yt + 7 - i, "Q1")
        cv.px(x0 + 6, yt + (y1 - yt) // 2, "Y1"); cv.px(x0 + 9, yt + (y1 - yt) // 2, "Y1")
    elif style == "double":
        cv.rect(x0 + 1, yt, x0 + 14, y1, o3)
        cv.rect(x0 + 2, yt + 1, x0 + 13, y1 - 1, o2)
        cv.rect(x0 + 3, yt + 2, x0 + 6, y1 - 2, o1)
        cv.rect(x0 + 9, yt + 2, x0 + 12, y1 - 2, o1)
        cv.vline(x0 + 3, yt + 2, y1 - 2, o0)
        cv.vline(x0 + 9, yt + 2, y1 - 2, o0)
        cv.vline(x0 + 7, yt + 1, y1 - 1, o3)
        cv.vline(x0 + 8, yt + 1, y1 - 1, o3)
        cv.rect(x0 + 4, yt + 4, x0 + 5, yt + 6, "W1")
        cv.rect(x0 + 10, yt + 4, x0 + 11, yt + 6, "W1")
        cv.px(x0 + 6, yt + 9, "Y1"); cv.px(x0 + 9, yt + 9, "Y1")
    # threshold step
    cv.hline(x0 + 1, x0 + 14, y1, "R1")
    cv.px(x0 + 1, y1, "R2"); cv.px(x0 + 14, y1, "R2")


def plaque(cv, x0, y0, s, bg="E0", ink="O3", frame="O3", pad=2, shadow=None):
    w = text_w(s) + pad * 2 + 2
    cv.rect(x0, y0, x0 + w - 1, y0 + 8, frame)
    cv.rect(x0 + 1, y0 + 1, x0 + w - 2, y0 + 7, bg)
    cv.text(s, x0 + 1 + pad, y0 + 2, ink, shadow)
    return w


def flowerbox(cv, x0, x1, y, flower="N1"):
    cv.rect(x0, y, x1, y + 2, "O2")
    cv.hline(x0, x1, y, "O1")
    cv.hline(x0, x1, y + 2, "O3")
    for xx in range(x0, x1 + 1):
        cv.px(xx, y - 1, "G2" if xx % 2 else "L2")
    for xx in range(x0 + 1, x1, 3):
        cv.px(xx, y - 2, flower)
        cv.px(xx, y - 1, flower)


def chimney(cv, x0, y0, h, ramp=("B0", "B1", "B2", "B3")):
    cv.rect(x0, y0, x0 + 6, y0 + h, ramp[1])
    cv.vline(x0, y0, y0 + h, ramp[0])
    cv.vline(x0 + 5, y0, y0 + h, ramp[2])
    cv.vline(x0 + 6, y0, y0 + h, ramp[3])
    cv.hline(x0 - 1, x0 + 7, y0, "R2")
    cv.hline(x0 - 1, x0 + 7, y0 - 1, "R1")
    for yy in range(y0 + 2, y0 + h, 3):
        cv.hline(x0 + 1, x0 + 4, yy, ramp[2])


def glazing(cv, x0, y0, x1, y1, pw=5, ph=6, frame="R0", frame_dark="R1", plants=True, seed=1):
    """Glass wall: aqua panes with white glazing bars, foliage pressed
    against the glass in the lower half, a diagonal sheen per bay."""
    rng = np.random.default_rng(seed)
    cv.rect(x0, y0, x1, y1, "Q1")
    for xx in range(x0, x1 + 1):
        for yy in range(y0, y1 + 1):
            if (xx - x0) + (yy - y0) * 0.5 > (x1 - x0) * 0.75:
                cv.px(xx, yy, "Q2")
    if plants:
        tops = {}
        for xx in range(x0 + 1, x1):
            tops[xx] = y0 + (y1 - y0) * 4 // 10 + int(rng.integers(-2, 3))
        for xx in range(x0 + 1, x1):
            t = min(tops[xx], tops.get(xx - 1, 99) + 1, tops.get(xx + 1, 99) + 1)
            for yy in range(t, y1 + 1):
                cv.px(xx, yy, "L2" if (yy - t) > 1 or (xx + yy) % 3 == 0 else "G2")
            cv.px(xx, t, "G1")
    for xx in range(x0, x1 + 1):
        for yy in range(y0, y1 + 1):
            if (xx - x0) % pw == 0:
                cv.px(xx, yy, frame)
            elif (yy - y0) % ph == 0:
                cv.px(xx, yy, frame)
    for bx in range(x0 + 1, x1 - 2, pw):
        for i in range(min(3, ph - 1)):
            yy = y0 + 1 + i
            if yy < y1:
                cv.px(bx + 2 - i, yy + 1, "Q0")


def shadow_under(cv, x0, x1, y, col="G2"):
    """Contact shadow on the ground strip just inside the footprint."""
    for xx in range(x0, x1 + 1):
        if cv.get(xx, y) is None:
            cv.px(xx, y, col)


# ------------------------------------------------------------- buildings ----
def dome(cv, cx, base, rx, ry, ribs=8, rings=(0.5,), panel=("Q0", "Q1", "Q2", "Q3"),
         rib=("R0", "R1"), rim="R2", lit_rings=True):
    """Ribbed dome in 3/4 view: true meridians (x = cx + r*cos(lat)*sin(lon))
    and latitude rings; panels lit on the west, shaded east, rim darkened."""
    p0, p1, p2, p3 = panel
    for y in range(int(base - ry) - 1, base + 1):
        dy = (base - y) / ry
        if dy > 1:
            continue
        half = rx * math.sqrt(max(0.0, 1 - dy * dy))
        for x in range(int(cx - half - 1), int(cx + half + 2)):
            dx = (x + 0.5 - cx) / rx
            if dx * dx + dy * dy > 1:
                continue
            u = dx / max(1e-6, math.sqrt(1 - dy * dy))
            col = p1 if u < -0.15 else (p2 if u < 0.55 else p3)
            if u < -0.55 and dy > 0.25:
                col = p0 if (x + y) % 5 == 0 else p1
            cv.px(x, y, col)
        # meridians
        for k in range(1, ribs):
            lon = -math.pi / 2 + k * math.pi / ribs
            xk = cx + half * math.sin(lon) - 0.5
            xr = int(round(xk))
            cv.px(xr, y, rib[0] if math.sin(lon) < 0.35 else rib[1])
        for ring in rings:
            if y == int(round(base - ry * ring)):
                for x in range(int(cx - half), int(cx + half) + 1):
                    if cv.get(x, y):
                        cv.px(x, y, rib[0] if x < cx + half * 0.35 else rib[1])
    # rim: outline the silhouette in a dark hue
    for y in range(int(base - ry) - 1, base + 1):
        dy = (base - y) / ry
        if dy > 1:
            continue
        half = rx * math.sqrt(max(0.0, 1 - dy * dy))
        xl, xr = int(round(cx - half)), int(round(cx + half - 1))
        cv.px(xl, y, rim)
        cv.px(xr, y, p3 if rim != p3 else rib[1])
    top = int(round(base - ry))
    for x in range(cx - 3, cx + 3):
        if cv.get(x, top):
            cv.px(x, top, rim)


def house_small():
    """Player's cottage: hipped terracotta roof, cream plaster with
    timber corners, a porch hood over the door and a flower box."""
    cv = Canvas(64, 48)
    chimney(cv, 46, 1, 8, ("R0", "R1", "R2", "R3"))
    roof_hip(cv, 0, 6, 63, 26, ("B0", "B1", "B2", "B3"), hip=11, course=4, joint=4)
    plaster(cv, 1, 27, 62, 45)
    eaves_shadow(cv, 1, 62, 27, "E2", "E1")
    cv.vline(0, 27, 45, "O2"); cv.vline(63, 27, 45, "O3")
    cv.vline(1, 29, 45, "O1"); cv.vline(62, 29, 45, "O2")
    foundation(cv, 0, 63, 45, 47)
    window(cv, 38, 30, 14, 10, curtain="N1")
    flowerbox(cv, 37, 52, 41)
    window(cv, 5, 30, 9, 9, cross=True)
    # porch hood on brackets
    cv.hline(16, 31, 28, "B3"); cv.hline(17, 30, 29, "B1"); cv.hline(17, 30, 30, "B2")
    cv.px(17, 31, "O3"); cv.px(30, 31, "O3")
    door(cv, 1, 2, "wood", top=32)
    return cv


def house_large():
    """Two-storey family house: hipped blue slate, two dormers, timber
    frame, a porch on posts and window boxes."""
    cv = Canvas(80, 64)
    chimney(cv, 10, 1, 10, ("B0", "B1", "B2", "B3"))
    chimney(cv, 63, 2, 9, ("B0", "B1", "B2", "B3"))
    roof_hip(cv, 0, 8, 79, 33, ("U0", "U1", "U2", "U3"), hip=13, course=3, joint=5)
    for dx in (15, 51):
        cv.rect(dx, 17, dx + 13, 29, "E0")
        cv.vline(dx, 17, 29, "E1"); cv.vline(dx + 13, 17, 29, "E2")
        for i in range(8):
            cv.hline(dx + 6 - i, dx + 7 + i, 10 + i, "U1" if i < 7 else "U3")
            cv.px(dx + 6 - i, 10 + i, "U0"); cv.px(dx + 7 + i, 10 + i, "U3")
        cv.hline(dx - 1, dx + 14, 17, "U3")
        window(cv, dx + 3, 19, 8, 8, sill="U3")
        cv.hline(dx, dx + 13, 29, "U3")
    plaster(cv, 1, 34, 78, 59)
    eaves_shadow(cv, 1, 78, 34, "E2", "E1")
    cv.vline(0, 34, 59, "O2"); cv.vline(79, 34, 59, "O3")
    for xx in (1, 25, 54, 78):
        cv.vline(xx, 36, 59, "O2")
    cv.hline(1, 78, 36, "O2")
    foundation(cv, 0, 79, 60, 63)
    window(cv, 6, 40, 14, 11, curtain="B1")
    window(cv, 60, 40, 14, 11, curtain="B1")
    flowerbox(cv, 5, 20, 53, "Y1")
    flowerbox(cv, 59, 74, 53, "Y1")
    # porch roof on posts
    for i, col in enumerate(("U3", "U0", "U1", "U2", "U3")):
        cv.hline(27 - i // 2, 52 + i // 2, 39 + i, col)
    for px_ in (29, 50):
        cv.vline(px_, 44, 59, "O1"); cv.vline(px_ + 1, 44, 59, "O3")
    eaves_shadow(cv, 31, 49, 44, "E2", None, 1)
    door(cv, 2, 3, "wood", top=46, ramp=("U0", "U1", "U2", "U3"))
    return cv


def herbarium():
    """Stately brick institute: hipped slate roof with a white clock cupola,
    a pedimented stone portico, pilasters, and a glasshouse wing east."""
    cv = Canvas(96, 64)
    SL = ("R0", "R1", "R2", "R3")
    # ---- glasshouse wing x 64..95: ridge roof of glass
    for xx in range(64, 96):
        top = int(19 + abs(xx - 79.5) / 2.2)
        for yy in range(top, 31):
            cv.px(xx, yy, "Q1" if xx < 80 else "Q2")
        cv.px(xx, top, "R0" if xx < 80 else "R1")
        if (xx - 64) % 4 == 0:
            cv.vline(xx, top, 30, "R0" if xx < 80 else "R1")
    cv.vline(79, 19, 30, "R0"); cv.vline(80, 19, 30, "R1")
    for yy in (24, 27):
        for xx in range(64, 96):
            if cv.get(xx, yy) in ("Q1", "Q2"):
                cv.px(xx, yy, "R0" if xx < 80 else "R1")
    for i in range(3):
        cv.px(68 + i, 27 - i, "Q0")
    cv.hline(64, 95, 31, "R1")
    glazing(cv, 64, 32, 95, 56, pw=5, ph=6, seed=3)
    cv.recolor(64, 32, 95, 56, "L2", "G2")
    cv.vline(64, 32, 56, "R0"); cv.vline(95, 32, 56, "R2")
    bricks(cv, 64, 57, 95, 63)
    cv.hline(64, 95, 57, "R1")
    # ---- west annex x 0..15
    roof_hip(cv, 0, 18, 16, 31, SL, hip=5, course=3, joint=4)
    bricks(cv, 0, 32, 16, 63)
    eaves_shadow(cv, 0, 16, 32, "B3", "B2")
    window(cv, 3, 37, 10, 13, frame="O3", sill="R0")
    cv.vline(0, 32, 63, "B2")
    # ---- main block x 16..63
    roof_hip(cv, 16, 7, 63, 27, SL, hip=9, course=3, joint=5)
    # white lantern cupola with a verdigris cap and gilt finial
    cv.put([
        "     y     ",
        "    qQq    ",
        "   qQQQq   ",
        "  qQQQQQq  ",
        "  #######  ",
        "  wwwwwwe  ",
        "  w#ww#we  ",
        "  w#ww#we  ",
        "  wwwwwwe  ",
        " #########",
    ], {"y": "Y1", "q": "Q2", "Q": "Q3", "#": "R2", "w": "T0", "e": "E2"}, 35, -1)
    cv.px(39, 1, "Q1"); cv.px(38, 2, "Q1")
    bricks(cv, 16, 28, 63, 63)
    eaves_shadow(cv, 16, 63, 28, "B3", "B2")
    # stone sign band
    cv.rect(18, 30, 61, 38, "R1"); cv.hline(18, 61, 30, "R0"); cv.hline(18, 61, 38, "R2")
    cv.vline(18, 30, 38, "R0"); cv.vline(61, 30, 38, "R2")
    cv.text("HERBARIUM", 40 - text_w("HERBARIUM") // 2, 32, "B3")
    # pilasters
    for xx in (17, 62):
        cv.rect(xx, 39, xx + 1, 62, "R0"); cv.vline(xx + 1, 39, 62, "R1")
    window(cv, 20, 42, 9, 13, frame="O3", sill="R0")
    window(cv, 51, 42, 9, 13, frame="O3", sill="R0")
    # portico: two columns and a little pediment over the double door
    for i in range(6):
        cv.hline(40 - 1 - i * 2, 40 + i * 2, 40 + i, "E0")
        cv.px(40 - 1 - i * 2, 40 + i, "R1"); cv.px(40 + i * 2, 40 + i, "R2")
    cv.hline(28, 51, 45, "R2"); cv.hline(29, 50, 46, "R1")
    cv.put(["g"], {"g": "G2"}, 39, 43); cv.put(["g"], {"g": "G1"}, 40, 42)
    for xx in (29, 49):
        cv.rect(xx, 47, xx + 2, 62, "E0"); cv.vline(xx + 2, 47, 62, "E2"); cv.vline(xx, 47, 62, "T0")
    door(cv, 2, 3, "double", top=48)
    foundation(cv, 0, 95, 62, 63)
    cv.rect(28, 62, 51, 63, "R1"); cv.hline(28, 51, 63, "R2")
    return cv


def greenhouse():
    """Healing centre: an iconic verdigris copper dome with copper ribs and
    lantern, on a white glazed drum with a green GREENHOUSE band."""
    cv = Canvas(64, 48)
    dome(cv, 32, 27, 28.5, 24, ribs=8, rings=(0.42, 0.75),
         panel=("Q0", "Q1", "Q2", "Q3"), rib=("C1", "C2"), rim="Q3")
    # lantern + finial
    cv.put([
        "  #  ",
        " #y# ",
        "#ccc#",
        "#qQq#",
        "#####",
    ], {"#": "C2", "y": "Y1", "c": "C1", "q": "Q0", "Q": "Q1"}, 30, 0)
    # emblem: leaf on a white roundel
    cv.put([
        " #### ",
        "#wwww#",
        "#wgGw#",
        "#wGgw#",
        "#wwww#",
        " #### ",
    ], {"#": "C2", "w": "T0", "g": "G1", "G": "L2"}, 29, 12)
    cv.rect(1, 26, 62, 28, "C2"); cv.hline(1, 62, 26, "C1"); cv.hline(1, 62, 28, "B3")
    cv.rect(1, 29, 62, 36, "L2"); cv.hline(1, 62, 29, "G2"); cv.hline(1, 62, 36, "L3")
    cv.text("GREENHOUSE", 32 - text_w("GREENHOUSE") // 2, 31, "T0", "L3")
    cv.rect(1, 37, 62, 45, "R0")
    cv.vline(62, 37, 45, "R2")
    glazing(cv, 3, 38, 26, 45, pw=6, ph=8, plants=True, seed=7)
    glazing(cv, 49, 38, 60, 45, pw=6, ph=8, plants=True, seed=8)
    foundation(cv, 0, 63, 46, 47)
    door(cv, 2, 2, "glass", top=37)
    cv.rect(29, 37, 30, 46, "R0"); cv.rect(46, 37, 47, 46, "R1")
    return cv


def market():
    """Bramblegate market: hipped shingle roof with a green sign, timber
    shopfront under a striped awning, produce crates and a chalkboard."""
    cv = Canvas(64, 48)
    roof_hip(cv, 0, 2, 63, 17, ("O0", "O1", "O2", "O3"), hip=8, course=3, joint=4)
    cv.rect(12, 4, 51, 14, "L3")
    cv.rect(13, 5, 50, 13, "G2"); cv.hline(13, 50, 5, "G1"); cv.hline(13, 50, 13, "L2")
    cv.text("MARKET", 32 - text_w("MARKET") // 2, 7, "T0", "L3")
    cv.rect(0, 18, 63, 45, "O1")
    for xx in range(0, 64, 4):
        cv.vline(xx, 18, 45, "O2")
    cv.vline(0, 18, 45, "O3"); cv.vline(63, 18, 45, "O3")
    for xx in range(0, 64):
        stripe = "T0" if (xx // 4) % 2 == 0 else "G2"
        shade = "R1" if stripe == "T0" else "L2"
        for yy in range(18, 26):
            cv.px(xx, yy, stripe if yy < 24 else shade)
        if xx % 4 in (1, 2):
            cv.px(xx, 26, shade)
    cv.hline(0, 63, 18, "L3")
    cv.hline(0, 63, 27, "O3")
    cv.rect(34, 29, 61, 40, "O3")
    cv.rect(35, 30, 60, 39, "W1")
    cv.rect(48, 30, 60, 39, "W2")
    for i in range(3):
        cv.px(37 + i, 34 - i, "W0")
    cv.vline(47, 30, 39, "O3")
    cv.hline(35, 60, 36, "O2")
    for xx in range(36, 60, 3):
        cv.px(xx, 35, ("B1", "Y1", "G2", "M1")[xx % 4])
    cols = [("B1", "B0"), ("Y1", "Y0"), ("G2", "G1"), ("M1", "M0"), ("X1", "X0")]
    for i, xx in enumerate(range(34, 61, 6)):
        a, b = cols[i % len(cols)]
        cv.rect(xx, 41, xx + 5, 45, "O2"); cv.hline(xx, xx + 5, 41, "O0")
        cv.vline(xx + 5, 41, 45, "O3")
        for j in range(1, 5):
            cv.px(xx + j, 40, a)
        cv.px(xx + 2, 39, a); cv.px(xx + 3, 39, a); cv.px(xx + 2, 40, b)
    cv.rect(3, 30, 13, 41, "O3"); cv.rect(4, 31, 12, 40, "L3")
    cv.hline(5, 10, 33, "R1"); cv.hline(5, 11, 35, "R1"); cv.hline(5, 8, 37, "R1")
    cv.px(10, 38, "B1"); cv.px(11, 38, "Y1")
    door(cv, 1, 2, "wood", top=30)
    foundation(cv, 0, 63, 46, 47)
    return cv


def conservatory():
    """Bramblegate Conservatory, a glass palace: a tall ribbed central dome
    with lantern and pennant, barrel-vaulted glass wings with end turrets,
    white ironwork and a crest over the arched door."""
    cv = Canvas(96, 64)
    for (x0, x1, seed) in ((0, 31, 11), (64, 95, 12)):
        for xx in range(x0, x1 + 1):
            t = (xx - x0) / max(1, (x1 - x0))
            top = 21 + int(round(8 * (1 - math.sin(t * math.pi))))
            for yy in range(top, 34):
                col = "Q1" if t < 0.4 else ("Q2" if t < 0.8 else "Q3")
                cv.px(xx, yy, col)
            cv.px(xx, top, "R0" if t < 0.6 else "R1")
            if (xx - x0) % 4 == 0:
                cv.vline(xx, top, 33, "R0" if t < 0.6 else "R1")
        cv.hline(x0, x1, 28, "R0")
        for i in range(3):
            cv.px(x0 + 6 + i, 27 - i, "Q0")
        cv.hline(x0, x1, 34, "R0"); cv.hline(x0, x1, 35, "R1")
        glazing(cv, x0, 36, x1, 56, pw=4, ph=7, seed=seed)
        cv.recolor(x0, 36, x1, 56, "L2", "G2")
        cv.vline(x0, 34, 56, "R0"); cv.vline(x1, 34, 56, "R2")
        foundation(cv, x0, x1, 57, 63)
        # end turrets with pennants
        tx = x0 + 1 if x0 == 0 else x1 - 4
        cv.rect(tx, 18, tx + 3, 34, "R0"); cv.vline(tx + 3, 18, 34, "R1")
        cv.put(["  p ", "  pP", "  # ", " ## "], {"p": "B1", "P": "B2", "#": "R2"}, tx, 14)
    dome(cv, 48, 34, 19.5, 33, ribs=10, rings=(0.38, 0.7),
         panel=("Q0", "Q1", "Q2", "Q3"), rib=("R0", "R1"), rim="R2")
    cv.put([
        "  p   ",
        "  pPP ",
        "  #   ",
        " #y#  ",
        "#qQq# ",
    ], {"#": "R2", "y": "Y1", "q": "Q0", "Q": "Q2", "p": "B1", "P": "B2"}, 46, -3)
    cv.rect(30, 34, 66, 63, "R0")
    glazing(cv, 31, 42, 65, 56, pw=6, ph=7, seed=5)
    cv.recolor(31, 42, 65, 56, "L2", "G2")
    cv.rect(21, 34, 75, 41, "L3")
    cv.rect(22, 35, 74, 40, "G2"); cv.hline(22, 74, 35, "G1"); cv.hline(22, 74, 40, "L2")
    cv.text("CONSERVATORY", 48 - text_w("CONSERVATORY") // 2, 36, "T0", "L3")
    foundation(cv, 30, 66, 57, 63)
    for xx in (44, 65):
        cv.rect(xx, 44, xx + 1, 62, "R0"); cv.vline(xx + 1, 44, 62, "R1")
    # arched glass door (cell 3,3 = x 48..63) with a crest above
    door(cv, 3, 3, "glass", top=50)
    cv.hline(51, 60, 49, "R0"); cv.px(50, 50, "R0"); cv.px(61, 50, "R0")
    cv.put([
        " ### ",
        "#yGy#",
        "#GGG#",
        " #y# ",
        "  #  ",
    ], {"#": "Y2", "y": "Y1", "G": "L2"}, 53, 43)
    return cv


def lodge():
    """Sugarbush sugar shack: board-and-batten walls, a rusty tin roof, a
    louvred cupola pouring steam, sap buckets and a SUGAR SHACK sign."""
    cv = Canvas(80, 48)
    for yy in range(10, 26):
        for xx in range(0, 80):
            col = "M2"
            if xx % 4 == 0:
                col = "M3"
            elif xx % 4 == 1:
                col = "M1" if xx < 58 else "M2"
            cv.px(xx, yy, col)
    cv.hline(0, 79, 10, "M3"); cv.hline(1, 78, 11, "M0")
    cv.hline(0, 79, 25, "M3")
    # cupola
    cv.rect(31, 2, 48, 4, "M3"); cv.hline(32, 47, 3, "M1")
    cv.rect(33, 5, 46, 10, "O2")
    for xx in range(34, 46, 2):
        cv.vline(xx, 6, 9, "O3")
    cv.vline(33, 5, 10, "O1")
    # steam plume drifting east
    cv.put([
        "         ..,,,,..   ",
        "      ..,,,,,,,,,,. ",
        "   ..,,,,,,..,,,,,,.",
        " .,,,,,,,.    ..,,..",
        ".,,,,,..          ",
        " ..,,.            ",
    ], {",": "T0", ".": "R1"}, 44, 0)
    # walls
    cv.rect(0, 26, 79, 44, "O1")
    for xx in range(0, 80, 5):
        cv.vline(xx, 26, 44, "O2")
        cv.vline(xx + 1, 26, 44, "O0")
    cv.vline(0, 26, 44, "O3"); cv.vline(79, 26, 44, "O3")
    eaves_shadow(cv, 0, 79, 26, "O3", "O2")
    window(cv, 6, 31, 13, 9, frame="O3", sill="O2", warm=True)
    window(cv, 54, 31, 13, 9, frame="O3", sill="O2", warm=True)
    # sign board across the gable
    w = text_w("SUGAR SHACK") + 6
    sx = 40 - w // 2
    cv.rect(sx, 13, sx + w - 1, 21, "O3")
    cv.rect(sx + 1, 14, sx + w - 2, 20, "O0")
    cv.text("SUGAR SHACK", sx + 3, 15, "M3")
    # sap buckets hung on taps along the wall, lids catching the light
    for bx in (23, 49, 69):
        cv.put([
            " r  ",
            "RRRR",
            "#ss#",
            "#sS#",
            "####",
        ], {"r": "R2", "R": "R0", "#": "R2", "s": "R1", "S": "R0"}, bx, 33)
    door(cv, 2, 2, "wood", top=31)
    foundation(cv, 0, 79, 45, 47)
    # woodpile under the east window
    for j, yy in enumerate((47, 44)):
        for xx in range(56 + j * 2, 76 - j * 2, 4):
            cv.rect(xx, yy - 3, xx + 3, yy, "O3")
            cv.rect(xx + 1, yy - 2, xx + 2, yy - 1, "O0")
    return cv


def barn():
    """Fallowfield barn: red board walls, white trim, grey gambrel roof, a
    hay loft and painted-shut cross-braced doors (doorless scenery)."""
    cv = Canvas(80, 64)
    cx = 40
    for yy in range(2, 40):
        half = 12 + (yy - 2) * 2 if yy < 14 else 36 + (yy - 14) // 6
        half = min(half, 40)
        for xx in range(cx - half, cx + half):
            lit = xx < cx
            col = "R1" if lit else "R2"
            if yy % 3 == 0:
                col = "R0" if lit else "R1"
            if xx % 5 == 0 and yy % 3 != 0:
                col = "R2" if lit else "R3"
            cv.px(xx, yy, col)
        cv.px(cx - half, yy, "R2"); cv.px(cx + half - 1, yy, "R3")
    cv.hline(cx - 12, cx + 11, 2, "R3")
    for yy in range(7, 40):
        half = 9 + (yy - 7) * 2 if yy < 18 else 30
        half = min(half, 31)
        for xx in range(cx - half, cx + half):
            cv.px(xx, yy, "B1" if xx % 4 else "B2")
        cv.px(cx - half, yy, "T0"); cv.px(cx + half - 1, yy, "R1")
    cv.hline(cx - 9, cx + 8, 6, "T0")
    # hay loft
    cv.rect(33, 11, 46, 22, "T0")
    cv.rect(34, 12, 45, 21, "B3")
    cv.rect(35, 15, 44, 21, "Y1")
    for xx in range(35, 45, 2):
        cv.px(xx, 14, "Y1"); cv.px(xx + 1, 15, "Y2")
    cv.hline(35, 44, 21, "Y2")
    cv.vline(39, 7, 10, "O3"); cv.px(40, 8, "O3")
    # weathervane
    cv.put([" y  ", "yyyy", " y  ", " #  "], {"y": "R3", "#": "R3"}, 38, -2)
    cv.rect(9, 40, 70, 61, "B1")
    for xx in range(9, 71, 4):
        cv.vline(xx, 40, 61, "B2")
    eaves_shadow(cv, 9, 70, 40, "B3", "B2")
    cv.vline(9, 40, 61, "T0"); cv.vline(70, 40, 61, "R1")
    cv.rect(26, 42, 53, 61, "T0")
    cv.rect(27, 43, 39, 61, "B2"); cv.rect(40, 43, 52, 61, "B2")
    for i in range(13):
        yy = 43 + i * 18 // 12
        cv.px(27 + i, yy, "T0"); cv.px(39 - i, yy, "T0")
        cv.px(40 + i, yy, "T0"); cv.px(52 - i, yy, "T0")
    cv.vline(39, 43, 61, "T0"); cv.vline(40, 43, 61, "R1")
    for wx in (13, 59):
        cv.rect(wx, 46, wx + 7, 53, "T0")
        cv.rect(wx + 1, 47, wx + 6, 52, "B3")
        cv.vline(wx + 7, 46, 53, "R1")
        cv.px(wx + 2, 48, "W1"); cv.px(wx + 3, 48, "W1"); cv.px(wx + 2, 49, "W1")
    foundation(cv, 9, 70, 62, 63)
    return cv


def windmill():
    """Fallowfield windmill: tapered whitewashed stone tower, red cap and
    four canvas sails on a + (crisp at 1x), painted-shut door."""
    cv = Canvas(48, 64)
    for yy in range(22, 62):
        t = (yy - 22) / 40
        half = int(8 + t * 6)
        for xx in range(24 - half, 24 + half):
            u = (xx - (24 - half)) / (2 * half)
            col = "E0" if u < 0.35 else ("E1" if u < 0.72 else "E2")
            if yy % 6 == 0 or ((xx + (yy // 6) * 3) % 7 == 0 and yy % 6 != 0):
                col = {"E0": "E1", "E1": "E2", "E2": "E3"}[col]
            cv.px(xx, yy, col)
        cv.px(24 - half, yy, "E1"); cv.px(24 + half - 1, yy, "E3")
    cv.rect(20, 52, 27, 61, "O3"); cv.rect(21, 53, 26, 61, "O2"); cv.vline(21, 53, 61, "O1")
    cv.vline(23, 53, 61, "O3")
    window(cv, 21, 38, 6, 7, cross=False, sill="E2")
    foundation(cv, 9, 38, 62, 63)
    for yy in range(12, 23):
        half = min(5 + (yy - 12), 12)
        for xx in range(24 - half, 24 + half):
            col = "B1" if xx < 24 else "B2"
            if yy % 3 == 0:
                col = "B0" if xx < 24 else "B1"
            cv.px(xx, yy, col)
        cv.px(24 - half, yy, "B2"); cv.px(24 + half - 1, yy, "B3")
    cv.hline(12, 35, 22, "B3")
    eaves_shadow(cv, 14, 33, 23, "E3", "E2")
    cv.put(["##", "##"], {"#": "B3"}, 23, 10)
    hx, hy = 24, 17
    sail = {"#": "O3", "c": "T0", "s": "R1", "f": "O2"}
    # up / down arms (stock + canvas on the west side, lattice lines)
    for i in range(2, 17):
        for (yy, flip) in ((hy - i, 1), (hy + i, -1)):
            cv.px(hx, yy, "O3")
            for k in range(1, 5):
                xx = hx - k if flip > 0 else hx + k
                col = "c" if (i % 3 and k < 4) else "f"
                if i < 4:
                    col = "f" if k == 4 else None
                if col:
                    cv.px(xx, yy, sail[col] if col != "c" or flip > 0 else "R1")
    for i in range(2, 17):
        for (xx, flip) in ((hx - i, 1), (hx + i, -1)):
            cv.px(xx, hy, "O3")
            for k in range(1, 5):
                yy = hy + k if flip > 0 else hy - k
                col = "c" if (i % 3 and k < 4) else "f"
                if i < 4:
                    col = "f" if k == 4 else None
                if col:
                    cv.px(xx, yy, sail[col] if col != "c" or flip < 0 else "R1")
    cv.put([" ## ", "#yy#", "#yY#", " ## "], {"#": "O3", "y": "O1", "Y": "O2"}, hx - 2, hy - 2)
    return cv


def well():
    """Village well: round stone curb, shingled hood on posts, bucket."""
    cv = Canvas(32, 32)
    # posts
    for x in (5, 25):
        cv.rect(x, 8, x + 1, 24, "O1"); cv.vline(x + 1, 8, 24, "O3")
    # roof
    for yy in range(1, 10):
        half = 6 + yy * 1.2
        for xx in range(int(16 - half), int(16 + half)):
            col = "B1" if xx < 16 else "B2"
            if yy % 3 == 1:
                col = "B0" if xx < 16 else "B1"
            cv.px(xx, yy, col)
    cv.hline(5, 26, 10, "B3")
    cv.hline(13, 18, 0, "B3")
    # crank + rope + bucket
    cv.hline(7, 24, 12, "O2"); cv.px(25, 13, "O3"); cv.px(26, 13, "O3")
    cv.vline(15, 13, 16, "R2")
    cv.put(["####", "#rr#", "#RR#", " ## "], {"#": "O3", "r": "O1", "R": "O2"}, 14, 16)
    # stone curb (ellipse)
    for yy in range(18, 32):
        for xx in range(2, 30):
            dx, dy = (xx - 15.5) / 13.5, (yy - 24) / 7.5
            if dx * dx + dy * dy <= 1:
                cv.px(xx, yy, "R1" if dx < 0.3 else "R2")
    for yy in range(19, 25):
        for xx in range(6, 26):
            dx, dy = (xx - 15.5) / 9.5, (yy - 21.5) / 3.2
            if dx * dx + dy * dy <= 1:
                cv.px(xx, yy, "W3" if dy > -0.4 else "R3")
    for xx in range(3, 29, 4):
        cv.vline(xx, 25, 30, "R3") if 4 < xx < 28 else None
    for xx in range(2, 30):
        for yy in range(26, 32):
            dx, dy = (xx - 15.5) / 13.5, (yy - 24) / 7.5
            if dx * dx + dy * dy <= 1 and yy == 27:
                cv.px(xx, yy, "R3")
    cv.px(10, 20, "R0"); cv.px(11, 19, "R0"); cv.px(12, 19, "R0")
    return cv


def big_tree(w, h, pal, lobes, trunk, seed=0):
    """Landmark tree: overlapping crown lobes (lit top-left, shaded rims),
    a flared trunk with roots and a shadow pool."""
    cv = Canvas(w, h)
    hi, body, mid, dark = pal
    tx0, tx1, ty = trunk
    # ground shadow
    for yy in range(h - 6, h):
        for xx in range(0, w):
            dx, dy = (xx - w / 2) / (w / 2 - 1), (yy - (h - 3)) / 3
            if dx * dx + dy * dy <= 1:
                cv.px(xx, yy, "G2")
    # trunk + roots
    for yy in range(ty, h - 1):
        flare = max(0, yy - (h - 6))
        for xx in range(tx0 - flare, tx1 + flare + 1):
            col = "O2" if xx < (tx0 + tx1) // 2 else "O3"
            if xx == tx0 - flare:
                col = "O1"
            cv.px(xx, yy, col)
    for yy in range(ty, h - 4, 3):
        cv.px((tx0 + tx1) // 2, yy, "O3")
    own = -np.ones((h, w), int)
    for k, (cx, cy, r) in enumerate(lobes):
        for yy in range(h):
            for xx in range(w):
                if (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r:
                    own[yy, xx] = k
    for yy in range(h):
        for xx in range(w):
            k = own[yy, xx]
            if k < 0:
                continue
            cx, cy, r = lobes[k]
            nx, ny = (xx - cx) / r, (yy - cy) / r
            light = -(nx * 0.75 + ny)
            col = body
            if light > 0.55:
                col = hi
            elif light < -0.35:
                col = mid
            out_dn = yy + 1 >= h or own[yy + 1, xx] < 0
            out_rt = xx + 1 >= w or own[yy, xx + 1] < 0
            out_up = yy == 0 or own[yy - 1, xx] < 0
            out_lf = xx == 0 or own[yy, xx - 1] < 0
            in_dn = not out_dn and own[yy + 1, xx] != k
            in_rt = not out_rt and own[yy, xx + 1] != k
            if out_dn or out_rt:
                col = dark
            elif out_up or out_lf:
                col = mid if (nx + ny) < -0.2 else dark
            elif in_dn or (in_rt and nx > 0.3):
                col = mid if col != mid else dark
            cv.px(xx, yy, col)
    # sparkle leaves
    rng = np.random.default_rng(seed)
    for _ in range(w // 3):
        xx, yy = int(rng.integers(2, w - 2)), int(rng.integers(2, h - 10))
        if cv.get(xx, yy) == body and cv.get(xx - 1, yy) == body:
            cv.px(xx, yy, hi)
    return cv


def big_oak():
    return big_tree(48, 48, ("G1", "G2", "L2", "L3"),
                    [(14, 15, 11), (33, 13, 11.5), (24, 8, 9), (11, 26, 9), (37, 25, 9.5),
                     (24, 24, 12)], (21, 26, 30), seed=4)


def big_maple():
    return big_tree(32, 32, ("M0", "M1", "M2", "M3"),
                    [(10, 10, 8), (22, 9, 8), (16, 6, 6), (16, 15, 9)], (14, 17, 20), seed=6)


BUILDERS = {
    "house_small": house_small, "house_large": house_large, "herbarium": herbarium,
    "greenhouse": greenhouse, "market": market, "conservatory": conservatory, "lodge": lodge,
    "barn": barn, "windmill": windmill, "well": well, "big_oak": big_oak, "big_maple": big_maple,
}


def build(save=True):
    cells = []
    grass = tiles.to_img(tiles.OUT["grass"])
    path = tiles.to_img(tiles.OUT["path@5"])
    for key, fn in BUILDERS.items():
        w, h, dr = STRUCTURES[key]
        im = fn().image()
        assert im.size == (w * 16, h * 16), (key, im.size)
        if save:
            gbc.save(im, f"structures/{key}.png")
        bg = Image.new("RGBA", (im.width + 32, im.height + 32))
        for y in range(0, bg.height, 16):
            for x in range(0, bg.width, 16):
                bg.paste(grass, (x, y))
        if dr:
            for y in range(16 + (dr[1] + 1) * 16, bg.height, 16):
                bg.paste(path, (16 + dr[0] * 16, y))
        bg.alpha_composite(im, (16, 16))
        cells.append((key, bg))
    gbc.grid_sheet(cells, 4, 3).save(gbc.REVIEW / "structures.png")


if __name__ == "__main__":
    import sys
    build(save="-n" not in sys.argv)
