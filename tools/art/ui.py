"""UI images -> public/art/sets/ui/ (assets/ui/*.png)

title.png        160x144 dusk scene: the Centuryheart's flower spike on a slope,
                 gold pollen drifting, Fallowfield's lights in the valley below.
title_logo.png   transparent "VERDANT REACH" logo (<=160 wide).
pod.png, pod_open.png   12x12 terrarium pod (closed / cap lifted).
mark_bramble.png, mark_sundew.png   16x16 pressed-specimen badges.
battle_ground.png   grass ellipse drawn under battling sprites.
"""

from __future__ import annotations

import math

import numpy as np
from PIL import Image

import gbc
from gbc import C, hexc, img_from_rows

BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def title() -> Image.Image:
    """Box art at dusk. Back to front: a banded sky with stars, the setting
    sun, two ranges of far hills, the Fallowfield valley (patchwork fields,
    hedgerows, a windmill, village lights, a river holding the sunset), then
    the dark foreground slope where the Centuryheart stands: a spiky
    rosette and a tall flower spike in bloom, shedding gold pollen."""
    W, H = 160, 144
    a = np.zeros((H, W, 4), np.uint8)
    P = {k: hexc(v) for k, v in {
        "s0": "#101838", "s1": "#202850", "s2": "#383868", "s3": "#684878", "s4": "#a85878",
        "s5": "#d87068", "s6": "#f09860", "s7": "#f8c880",
        "star": "#f8f8f8", "star2": "#a8b0e0", "sun": "#f8f0c8", "sunr": "#f8e0a0",
        "m1": "#7c5480", "m1l": "#b06c88", "m2": "#503c68", "m2l": "#78507c",
        "h1": "#34385c", "h2": "#2a2e4c",
        "v1": "#3c5254", "v2": "#334850", "v3": "#2c3c4c", "hedge": "#1a2830",
        "r1": "#f8c890", "r2": "#c87870", "r3": "#7c5068", "bank": "#182030",
        "lamp": "#f8e070", "roof": "#202840", "wall": "#3c4460",
        "f0": "#101c14", "f1": "#18301c", "rim": "#3c6440", "rim2": "#5c8850",
        "lf0": "#1c3424", "lf1": "#2c4c30", "lf2": "#5a8450", "lf3": "#90b070",
        "st": "#384828", "stl": "#58683a",
        "c0": "#f8f8c8", "c1": "#f8e070", "c2": "#d8a038", "c3": "#986020", "c4": "#583818",
        "pol": "#f8e070", "pol2": "#f8f8c8", "pold": "#c89030",
    }.items()}

    def put(x, y, c):
        if 0 <= x < W and 0 <= y < H:
            a[int(y), int(x)] = P[c] if isinstance(c, str) else c

    # --- sky: hard bands joined by one-row 2-colour checker seams ----------
    bands = [("s0", 0), ("s1", 16), ("s2", 30), ("s3", 42), ("s4", 52), ("s5", 61), ("s6", 69), ("s7", 75)]
    for y in range(H):
        cur = bands[0][0]
        for name, y0 in bands:
            if y >= y0:
                cur = name
        a[y, :] = P[cur]
        for i in range(1, len(bands)):
            if y == bands[i][1] - 1 or y == bands[i][1] - 2 and i < 4:
                nxt = bands[i][0]
                for x in range(W):
                    if (x + y) % 2 == 0:
                        a[y, x] = P[nxt]
    rng = np.random.default_rng(5)
    for _ in range(30):
        x, y = int(rng.integers(0, W)), int(rng.integers(1, 36))
        put(x, y, "star" if y < 20 and rng.random() < 0.6 else "star2")
    for (x, y) in [(22, 8), (98, 5), (61, 22)]:          # three bright stars with a cross
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            put(x + dx, y + dy, "star" if (dx, dy) == (0, 0) else "star2")
    # --- the setting sun, sitting on the far hills --------------------------
    sx, sy = 46, 71
    for y in range(sy - 11, sy + 4):
        for x in range(sx - 12, sx + 13):
            d = (x - sx) ** 2 + (y - sy) ** 2
            if d <= 42:
                put(x, y, "sun")
            elif d <= 72 and (x + y) % 2 == 0:
                put(x, y, "sunr")

    # --- far hills (two ranges, lit rims toward the sun) -------------------
    def ridge(base, amp, f1, ph, cbody, clit, seed):
        r = np.random.default_rng(seed)
        jag = np.convolve(r.normal(0, 1.2, W + 6), np.ones(4) / 4, "same")[3:W + 3]
        tops = []
        for x in range(W):
            t = base - amp * (0.65 * math.sin(x * f1 + ph) + 0.35 * math.sin(x * f1 * 2.7 + ph * 1.3)) + jag[x]
            tops.append(int(round(t)))
        for x in range(W):
            a[tops[x]:, x] = P[cbody]
            if abs(x - sx) < 70 and tops[x] <= tops[max(0, x - 1)]:
                put(x, tops[x], clit)
        return tops

    ridge(72, 7, 0.05, 0.8, "m1", "m1l", 3)
    ridge(80, 5, 0.075, 2.4, "m2", "m2l", 4)
    ridge(87, 3, 0.11, 1.1, "h1", "h1", 6)

    # --- valley floor: fields between hedgerows, nearer = taller -----------
    rows = [(89, "h2"), (91, "v3"), (94, "v2"), (98, "v1"), (103, "v2"), (109, "v1"), (116, "v2"), (124, "v1")]
    for i, (y0, c) in enumerate(rows):
        y1 = rows[i + 1][0] if i + 1 < len(rows) else H
        for y in range(y0, y1):
            for x in range(W):
                tilt = int(round((x - 80) * (0.03 if i % 2 else -0.025)))
                yy = y + tilt
                if 0 <= yy < H and yy >= 88:
                    a[yy, x] = P[c]
        # hedgerow along the top of each field: dotted bush line
        for x in range(W):
            tilt = int(round((x - 80) * (0.03 if i % 2 else -0.025)))
            yy = y0 + tilt
            if yy >= 88 and (x // (2 + i // 2)) % 3 != 2:
                put(x, yy, "hedge")
    # windmill on a far field
    wx, wy = 26, 90
    for y in range(wy - 6, wy + 1):
        for x in range(wx - 1 - (y - wy + 6) // 4, wx + 2 + (y - wy + 6) // 4):
            put(x, y, "roof")
    for i in range(-4, 5):
        put(wx + i, wy - 7 + i, "roof")
        put(wx + i, wy - 7 - i, "roof")
    put(wx, wy - 3, "lamp")
    # village: little roofs with lit windows
    for (hx, hy) in [(64, 95), (70, 93), (75, 96), (81, 94), (87, 97), (93, 95), (58, 98)]:
        for dx in range(-2, 3):
            put(hx + dx, hy, "wall")
            put(hx + dx, hy + 1, "wall")
        for dx in range(-3, 4):
            put(hx + dx, hy - 1, "roof")
        for dx in range(-2, 3):
            put(hx + dx, hy - 2, "roof")
        put(hx, hy - 3, "roof")
        put(hx - 1, hy + 1, "lamp")
        if hx % 2:
            put(hx + 1, hy, "lamp")
    # river: a lazy S across the valley, holding the sunset
    for y in range(88, 128):
        t = (y - 88) / 40
        xc = 40 + 30 * math.sin(t * 3.4) - t * 34
        half = 0.6 + t * 2.6
        for x in range(int(round(xc - half)), int(round(xc + half)) + 1):
            u = (x - (xc - half)) / max(1, 2 * half)
            c = "r1" if u < 0.3 else "r2" if u < 0.7 else "r3"
            if (x * 3 + y) % 9 == 0:
                c = "r1"
            put(x, y, c)
        put(int(round(xc + half)) + 1, y, "bank")

    # --- foreground slope ----------------------------------------------------
    def slope(x):
        return int(round(130 - 0.24 * x - 3 * math.sin(x * 0.07)))

    for x in range(W):
        top = slope(x)
        a[top:, x] = P["f0"]
        put(x, top, "rim")
        if x % 3 != 1:
            put(x, top + 1, "f1")
        if x < 90 and x % 4 == 0:
            put(x, top + 1, "rim2")
    # grass blades against the valley
    for x in range(1, W, 3):
        top = slope(x)
        h = 2 + (x * 7) % 4
        lean = 1 if (x // 3) % 2 else -1
        for k in range(1, h):
            put(x + (lean if k > h // 2 else 0), top - k, "f0")
        put(x + lean, top - h + 1, "rim")

    # --- the Centuryheart ----------------------------------------------------
    bx, by = 126, slope(126) - 1
    # rosette: long spiky leaves fanning out, lit on the upper-left edges
    leaves = []
    for i, ang in enumerate(np.linspace(math.pi * 0.97, math.pi * 0.03, 17)):
        L = 15 + 6 * math.sin(i * 1.7) ** 2
        leaves.append((ang, L))
    leaves.sort(key=lambda t: -abs(t[0] - math.pi / 2))   # back leaves first
    for ang, L in leaves:
        steps = int(L * 3)
        for s_ in range(steps):
            t = s_ / steps
            x = bx + math.cos(ang) * L * t
            y = by - math.sin(ang) * L * t * 0.62
            w = (1 - t) * 2.4 + 0.3
            for dx in np.arange(-w, w + 0.01, 0.5):
                xx = int(round(x + dx * math.sin(ang)))
                yy = int(round(y + dx * math.cos(ang) * 0.6))
                lit = dx < -w * 0.3 and ang > math.pi * 0.35
                put(xx, yy, "lf2" if lit and t > 0.25 else "lf1" if t > 0.12 else "lf0")
        tipx, tipy = bx + math.cos(ang) * L, by - math.sin(ang) * L * 0.62
        put(round(tipx), round(tipy), "lf3" if ang > math.pi / 2 else "lf2")
    # spike: a short bare stalk, then a tall column dense with florets,
    # thickest low down and tapering to a glowing bud.
    top_y, stalk_top = 32, by - 7

    def cxat(y):
        t = (by - y) / (by - top_y)
        return bx + 2.0 * math.sin(t * 2.4)

    def halfw(y):
        t = (stalk_top - y) / (stalk_top - top_y)
        return 1.0 + 5.2 * (1 - t) ** 0.75 * min(1.0, (t + 0.05) * 5)

    for y in range(stalk_top, by + 1):
        c = cxat(y)
        for x in range(int(round(c - 1)), int(round(c + 1)) + 1):
            put(x, y, "stl" if x < c else "st")
    spike = np.zeros((H, W), np.int8)
    for y in range(top_y, stalk_top + 1):
        c, w = cxat(y), halfw(y)
        w += 0.7 if (y // 2) % 2 else 0.0          # scalloped edge: one cluster per 2 rows
        for x in range(int(math.floor(c - w)), int(math.ceil(c + w)) + 1):
            if abs(x - c) > w:
                continue
            u = (x - (c - w)) / (2 * w)
            spike[y, x] = 2 if u < 0.3 else 3 if u < 0.68 else 4
    # florets: a staggered lattice; each lit top-left, shadowed bottom-right
    for y in range(top_y + 1, stalk_top, 2):
        c, w = cxat(y), halfw(y)
        off = 0 if (y // 2) % 2 else 1.5
        x = c - w + off
        while x <= c + w - 0.5:
            xi = int(round(x))
            if spike[y, xi]:
                base = spike[y, xi]
                spike[y, xi] = max(1, base - 1)
                if xi - 1 >= 0 and spike[y - 1, xi - 1] and base <= 3:
                    spike[y - 1, xi - 1] = 1
                if spike[y + 1, xi + 1]:
                    spike[y + 1, xi + 1] = min(5, base + 1)
            x += 3
    cols = ["c0", "c1", "c2", "c3", "c4"]
    for y in range(H):
        for x in range(W):
            if spike[y, x]:
                put(x, y, cols[spike[y, x] - 1])
    # dark umber rim on the shadow side
    for y in range(top_y, stalk_top + 1):
        xs = np.nonzero(spike[y])[0]
        if len(xs):
            put(xs[-1], y, "c4")
    # bud at the very tip, glowing
    tx = int(round(cxat(top_y)))
    for (dx, dy, c) in [(0, -1, "c0"), (0, -2, "c1"), (0, -3, "c0"), (-1, -1, "c1"), (1, -1, "c2")]:
        put(tx + dx, top_y + dy, c)
    for (dx, dy) in [(-2, -2), (2, -2), (0, -5), (-3, 0), (3, 0)]:
        put(tx + dx, top_y + dy, "pol2")

    # --- gold pollen drifting left on the evening air ------------------------
    for i in range(46):
        t = rng.random() ** 0.8
        x = int(tx - 6 - t * 120 + rng.normal(0, 4))
        y = int(top_y + 10 + t * 48 + 10 * math.sin(t * 7 + i) + rng.normal(0, 3))
        if not (0 <= x < W and 0 <= y < H) or spike[y, x]:
            continue
        if (15 <= x <= 145 and 8 <= y <= 49) and rng.random() < 0.6:
            continue                       # keep the logo area calm
        if rng.random() < 0.16:
            put(x, y, "pol2")
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                put(x + dx, y + dy, "pol")
        else:
            put(x, y, "pol" if rng.random() < 0.75 else "pold")
    return Image.fromarray(a, "RGBA")


# ------------------------------------------------------------------ logo ----
GLYPHS = {
    "V": ["##....##", "##....##", "##....##", "##....##", ".##..##.", ".##..##.", "..####..", "...##..."],
    "E": ["#######.", "##......", "##......", "######..", "##......", "##......", "##......", "#######."],
    "R": ["######..", "##...##.", "##...##.", "######..", "##.##...", "##..##..", "##...##.", "##...##."],
    "D": ["#####...", "##..##..", "##...##.", "##...##.", "##...##.", "##...##.", "##..##..", "#####..."],
    "A": ["..###...", ".##.##..", "##...##.", "##...##.", "#######.", "##...##.", "##...##.", "##...##."],
    "N": ["##...##.", "###..##.", "####.##.", "##.####.", "##..###.", "##...##.", "##...##.", "##...##."],
    "T": ["########", "...##...", "...##...", "...##...", "...##...", "...##...", "...##...", "...##..."],
    "C": [".######.", "##......", "##......", "##......", "##......", "##......", "##......", ".######."],
    "H": ["##...##.", "##...##.", "##...##.", "#######.", "##...##.", "##...##.", "##...##.", "##...##."],
}


def word_mask(word, scale_y=1):
    w = sum(len(GLYPHS[c][0]) for c in word) + (len(word) - 1)
    m = np.zeros((8 * scale_y, w), bool)
    x = 0
    for c in word:
        g = GLYPHS[c]
        for j, row in enumerate(g):
            for i, v in enumerate(row):
                if v == "#":
                    m[j * scale_y:(j + 1) * scale_y, x + i] = True
        x += len(g[0]) + 1
    return m


def title_logo() -> Image.Image:
    """VERDANT in bevelled leaf-green capitals with a seedling sprouting from
    the A, REACH in gold below, held between two curling vine tendrils."""
    big = np.kron(word_mask("VERDANT"), np.ones((2, 2), bool))     # 16px tall
    small = word_mask("REACH", 1)
    top = 6                                                          # room for the sprout
    Wd = big.shape[1] + 6
    H = top + big.shape[0] + small.shape[0] + 9
    m = np.zeros((H, Wd), np.int8)
    bx = (Wd - big.shape[1]) // 2
    m[top:top + big.shape[0], bx:bx + big.shape[1]][big] = 1
    sy = top + big.shape[0] + 4
    sx = (Wd - small.shape[1]) // 2
    m[sy:sy + small.shape[0], sx:sx + small.shape[1]][small] = 2
    a = np.zeros((H, Wd, 4), np.uint8)
    hi = hexc("#e8f8c8")
    for y in range(H):
        for x in range(Wd):
            v = m[y, x]
            if not v:
                continue
            up = y > 0 and m[y - 1, x] == v
            left = x > 0 and m[y, x - 1] == v
            down = y + 1 < H and m[y + 1, x] == v
            right = x + 1 < Wd and m[y, x + 1] == v
            if v == 1:
                t = (y - top) / big.shape[0]
                c = C["g0"] if t < 0.25 else C["g1"] if t < 0.6 else C["g2"]
                if not up or not left:
                    c = hi if t < 0.6 else C["g1"]
                elif not down or not right:
                    c = C["f2"] if t > 0.5 else C["g2"]
            else:
                t = (y - sy) / small.shape[0]
                c = C["y0"] if not up else C["y1"] if t < 0.5 else C["y2"]
                if not down or not right:
                    c = C["y2"] if t < 0.5 else hexc("#a87808")
            a[y, x] = c
    solid = m > 0
    # extra art: sprout from the A, vine tendrils beside REACH
    extra = {}
    ax = bx + 4 * 18 + 7                                             # top of the A (5th glyph)
    for (dx, dy, c) in [(0, -1, "f2"), (0, -2, "f2"), (0, -3, "f2"), (-1, -4, "g1"), (-2, -4, "g1"),
                        (-3, -5, "g0"), (-2, -5, "g1"), (1, -4, "g2"), (2, -4, "g1"), (3, -5, "g1"),
                        (2, -5, "g0"), (-1, -3, "g2"), (1, -3, "g2")]:
        extra[(ax + dx, top + dy)] = c
    for side in (-1, 1):
        x0 = sx - 3 if side < 0 else sx + small.shape[1] + 2
        cy = sy + 4
        for i in range(16):
            x = x0 + side * i
            y = cy + round(1.6 * math.sin(i * 0.55))
            extra[(x, y)] = "f1"
        tip = x0 + side * 16
        for (dx, dy) in [(0, -1), (side * 1, -2), (0, -3), (-side, -2)]:
            extra[(tip + dx, cy + round(1.6 * math.sin(16 * 0.55)) + dy)] = "f1"
        for i, up in ((4, -1), (9, 1), (13, -1)):
            x = x0 + side * i
            y = cy + round(1.6 * math.sin(i * 0.55)) + up
            extra[(x, y)] = "g1"
            extra[(x + side, y + up)] = "g1"
            extra[(x, y + up)] = "g0"
    for (x, y), c in extra.items():
        if 0 <= x < Wd and 0 <= y < H and not solid[y, x]:
            a[y, x] = C[c]
            solid[y, x] = True
    # drop shadow (down-right, deep green) then a black outline
    def shift(msk, dy, dx):
        r = np.zeros_like(msk)
        ys0, ys1 = max(0, dy), H + min(0, dy)
        xs0, xs1 = max(0, dx), Wd + min(0, dx)
        r[ys0:ys1, xs0:xs1] = msk[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
        return r
    ring = np.zeros_like(solid)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
        ring |= shift(solid, dy, dx)
    ring &= ~solid
    sh = (shift(solid, 2, 2) | shift(solid, 1, 1) | shift(ring, 1, 1)) & ~solid & ~ring
    a[sh] = C["f3"]
    a[ring] = C["k"]
    return Image.fromarray(a, "RGBA")


# ------------------------------------------------------------------ pods ----
def pod(open_=False) -> Image.Image:
    """12x12 terrarium pod, matching the overworld pickup: a scaled wooden
    acorn cap over an aqua glass body with a seedling inside."""
    closed = [
        "....KK......",
        "..KKoKKK....",
        ".KOoOoOoK...",
        "KOoOoOoODK..",
        "KDDDDDDDDK..",
        ".KqqqqqQK...",
        ".KwqgGqQK...",
        ".KqwqgQJK...",
        "..KqqQJK....",
        "...KQJK.....",
        "....KK......",
        "............",
    ]
    opened = [
        "KK..........",
        "KoKK........",
        "KOoOKK......",
        ".KOoODK.....",
        "..KDDDK.....",
        ".KqqqqqQK...",
        ".KwqgGqQK...",
        ".KqwqgQJK...",
        "..KqqQJK....",
        "...KQJK.....",
        "....KK......",
        "............",
    ]
    # centre the 10px-wide art in 12
    rows = [(".", r)[1] for r in (opened if open_ else closed)]
    rows = ["." + r[:-1] for r in rows]
    return img_from_rows(rows, {".": None, "K": "k", "o": "o1", "O": "o2", "D": "o3", "w": "white",
                                "q": "q1", "Q": "q2", "J": "q3", "g": "g1", "G": "g2"})


# ----------------------------------------------------------------- marks ----
def mark(kind) -> Image.Image:
    """A Pressed Mark: a tiny herbarium sheet. Cream mounting paper, the
    pressed specimen flattened in muted colours, a gummed-tape strip over
    the stem and the specimen label in the lower right."""
    sheet = (["..KKKKKKKKKKKKK."] + ["..KPPPPPPPPPPpKS"] * 10 +
             ["..KPPPPPPLLLLpKS", "..KPPPPPPLllLpKS", "..KPPPPPPLLLLpKS", "..KpppppppppppKS",
              "..KKKKKKKKKKKKKS"])
    sheet = sheet[:15] + ["...SSSSSSSSSSSSS"]
    if kind == "bramble":
        spec = {
            # arching cane with thorns, two trifoliate leaves, berries, a flower
            "s": [(4, 12), (5, 11), (5, 10), (6, 9), (6, 8), (7, 7), (8, 6), (9, 5), (10, 5), (11, 6)],
            "t": [(4, 10), (7, 8), (9, 4)],
            "g": [(4, 7), (5, 6), (4, 6), (5, 7), (3, 5), (8, 8), (9, 8), (9, 9), (10, 8)],
            "G": [(5, 5), (3, 6), (10, 9), (8, 9)],
            "b": [(11, 7), (12, 7), (11, 8), (12, 8), (10, 3), (11, 3)],
            "B": [(12, 9), (11, 2)],
            "w": [(7, 3), (6, 3), (8, 3), (7, 2), (7, 4)],
            "y": [(7, 3)],
            "T": [(5, 9), (6, 9)],
        }
    else:
        spec = {
            # sundew: a rosette of round sticky pads, a flower stalk curling up
            "s": [(6, 9), (6, 8), (6, 7), (6, 6), (7, 5), (7, 4), (8, 3), (8, 2)],
            "g": [(5, 10), (7, 10), (6, 10), (6, 11)],
            "b": [(4, 10), (3, 11), (8, 10), (5, 12), (7, 12), (4, 12)],
            "B": [(4, 11), (8, 11), (6, 12)],
            "d": [(3, 10), (8, 9), (5, 13), (7, 13), (3, 12)],
            "w": [(9, 2), (9, 1)],
            "n": [(8, 1), (10, 2), (9, 3)],
            "T": [(5, 7), (7, 7)],
        }
    rows = [list(r) for r in sheet]
    for ch, pts in spec.items():
        for x, y in pts:
            if rows[y][x] in "Pp":
                rows[y][x] = ch
    rows = ["".join(r) for r in rows]
    key = {".": None, "K": "k", "P": "#f0e8c8", "p": "#c8b890", "L": "#f8f8f0", "l": "#988868",
           "s": "#5a6a30", "t": "#a04848", "g": "#88a050", "G": "#5a7a38",
           "b": "#683878", "B": "#402050", "w": "#f8f8f0", "y": "#e0c050",
           "d": "#f8f0f0", "n": "#f0a0b8", "T": "#e0d8b8", "S": "#887850"}
    key["b" if kind == "bramble" else "b"] = "#683878" if kind == "bramble" else "#c04848"
    key["B"] = "#402050" if kind == "bramble" else "#782830"
    return img_from_rows(rows, {k: (gbc.hexc(v) if isinstance(v, str) and v.startswith("#") else v)
                                for k, v in key.items()})


def battle_ground() -> Image.Image:
    """An 80x20 grass mound under a battling plant: a lit crown toward the
    top-left, a darker lip on the lower right, a few deliberate tufts."""
    W, H = 80, 20
    a = np.zeros((H, W, 4), np.uint8)
    cx, cy, rx, ry = 39.5, 9.5, 39.5, 9.5
    for y in range(H):
        for x in range(W):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d > 1:
                continue
            lit = ((x - (cx - 8)) / (rx * 0.62)) ** 2 + ((y - (cy - 2.5)) / (ry * 0.55)) ** 2
            if lit < 1:
                c = C["g0"] if lit < 0.35 else C["g1"]
            else:
                c = C["g1"] if d < 0.78 else C["g2"]
            if d > 0.9 and y >= cy:
                c = C["g3"] if d > 0.96 or y > cy + 4 else C["g2"]
            a[y, x] = c
    tufts = [(14, 6), (22, 12), (31, 4), (47, 13), (56, 7), (64, 11), (37, 15), (8, 10), (71, 8)]
    for x, y in tufts:
        for dx, dy in ((-1, -1), (0, 0), (1, -1), (0, -1)):
            if a[y + dy, x + dx, 3]:
                a[y + dy, x + dx] = C["g2"] if (dx, dy) != (0, -1) else a[y + dy, x + dx]
    for x, y, c in [(26, 8, "y1"), (52, 10, "white"), (19, 9, "white"), (60, 5, "y1")]:
        a[y, x] = C[c]
    return Image.fromarray(a, "RGBA")


def build():
    out = {
        "title": title(), "title_logo": title_logo(), "pod": pod(False), "pod_open": pod(True),
        "mark_bramble": mark("bramble"), "mark_sundew": mark("sundew"), "battle_ground": battle_ground(),
    }
    for k, im in out.items():
        gbc.save(im, f"ui/{k}.png")
    # review: the title with the logo on top, plus the small pieces
    t = out["title"].copy()
    logo = out["title_logo"]
    t.alpha_composite(logo, ((160 - logo.width) // 2, 10))
    sheet = Image.new("RGBA", (160 * 3 + 20 + 200, 144 * 3), (232, 232, 224, 255))
    sheet.alpha_composite(gbc.zoom(t, 3), (0, 0))
    x, y = 160 * 3 + 20, 0
    for k in ("pod", "pod_open", "mark_bramble", "mark_sundew"):
        sheet.alpha_composite(gbc.zoom(out[k], 4), (x, y))
        x += 72
        if x > sheet.width - 60:
            x, y = 160 * 3 + 20, y + 72
    sheet.alpha_composite(gbc.zoom(out["battle_ground"], 2), (160 * 3 + 20, 160))
    sheet.alpha_composite(gbc.zoom(out["title_logo"], 1), (160 * 3 + 20, 220))
    sheet.save(gbc.REVIEW / "ui.png")
    gbc.zoom(out["title"], 3).save(gbc.REVIEW / "title_plain.png")


if __name__ == "__main__":
    build()
