"""UI images -> public/assets/ui/*.png

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
    W, H = 160, 144
    a = np.zeros((H, W, 4), np.uint8)
    rng = np.random.default_rng(7)
    # dusk sky: banded with ordered dither between bands
    sky = [hexc(c) for c in ("#182040", "#302858", "#583870", "#985078", "#e07860", "#f8a858", "#f8d088")]
    stops = [0, 18, 34, 50, 64, 74, 84]
    for y in range(H):
        # band index (float)
        t = np.interp(y, stops, range(len(stops)))
        i = int(t)
        f = t - i
        for x in range(W):
            j = min(i + (1 if f > BAYER[y % 4, x % 4] else 0), len(sky) - 1)
            a[y, x] = sky[j]
    # stars
    for _ in range(26):
        x, y = rng.integers(0, W), rng.integers(0, 40)
        a[y, x] = hexc("#f8f8f8") if rng.random() < 0.5 else hexc("#a8b0e0")
    # moon sliver
    for y in range(8, 17):
        for x in range(128, 140):
            if (x - 134) ** 2 + (y - 12) ** 2 <= 20 and (x - 136) ** 2 + (y - 11) ** 2 > 16:
                a[y, x] = hexc("#f8f0c0")
    # far mountains (two layers)
    def ridge(base, amp, freq, phase, col, seed):
        r = np.random.default_rng(seed)
        jag = r.integers(-1, 2, W).cumsum()
        jag = (jag - jag.mean()) * 0.6
        for x in range(W):
            top = int(base - amp * (0.6 * math.sin(x * freq + phase) + 0.4 * math.sin(x * freq * 2.3 + phase * 1.7)) + jag[x])
            a[max(0, top):, x] = col
    ridge(70, 10, 0.045, 0.5, hexc("#684878"), 3)
    ridge(80, 7, 0.07, 2.0, hexc("#483860"), 4)
    # valley floor with a river and village lights
    for y in range(86, H):
        for x in range(W):
            a[y, x] = hexc("#304058") if (x + y) % 2 or y > 90 else hexc("#483860")
    # a river winding out of the far hills toward the viewer, catching the sunset
    for x in range(0, 64):
        yc = 86 + (63 - x) * 0.24 + 2.2 * math.sin(x * 0.16)
        th = 1 + (63 - x) // 18
        for y in range(int(yc), int(yc) + th):
            if y < H:
                a[y, x] = hexc("#e09868") if (x + 2 * y) % 5 else hexc("#f8c888")
        if int(yc) + th < H:
            a[int(yc) + th, x] = hexc("#202838")
    for (x, y) in [(22, 92), (26, 94), (31, 91), (35, 95), (40, 93), (88, 96), (92, 94), (18, 97), (96, 98)]:
        a[y, x] = hexc("#f8e070")
        a[y + 1, x] = hexc("#283048")
    # hedgerows: dark dotted lines across the valley
    for y0, slope in ((99, 0.05), (106, -0.04)):
        for x in range(0, 120):
            y = int(y0 + x * slope + math.sin(x * 0.3))
            if (x // 3) % 3:
                a[y, x] = hexc("#202838")
    # foreground slope (rises to the right)
    for x in range(W):
        top = int(122 - 0.38 * x + 3 * math.sin(x * 0.12))
        top = max(top, 58)
        for y in range(top, H):
            a[y, x] = hexc("#182818")
        a[top, x] = hexc("#406038")
        if x % 5 in (1, 3):
            a[max(0, top - 1), x] = hexc("#284828")
    # grass tufts silhouetted against the sky along the slope
    for x in range(2, W, 7):
        top = int(122 - 0.38 * x + 3 * math.sin(x * 0.12))
        for k in range(rng.integers(2, 5)):
            yy = top - k
            a[yy, x + (k % 2)] = hexc("#182818")
    # --- the Centuryheart (Puya raimondii): spiky rosette + tall flower spike
    bx, by = 124, 84   # base of the spike
    # rosette: radiating spiky leaves
    for ang in np.linspace(math.pi * 0.95, math.pi * 0.05, 15):
        L = 14 + 5 * math.sin(ang * 3)
        for t in np.linspace(0, 1, 40):
            x = bx + math.cos(ang) * L * t
            y = by + 4 - math.sin(ang) * L * t * 0.75
            wdt = (1 - t) * 2.2
            for dx in np.arange(-wdt, wdt + 0.1, 0.5):
                xx, yy = int(round(x + dx * math.sin(ang))), int(round(y + dx * math.cos(ang) * 0.4))
                if 0 <= xx < W and 0 <= yy < H:
                    a[yy, xx] = hexc("#406840") if t > 0.15 else hexc("#203820")
            if t > 0.4:
                xx, yy = int(round(x)), int(round(y))
                if 0 <= yy < H and 0 <= xx < W and ang > math.pi / 2:
                    a[yy, xx] = hexc("#88a868")
    # stalk + spike: a column covered in flower clusters, bumpy silhouette
    top_y = 20
    stalk = by - 10
    rngs = np.random.default_rng(11)
    for y in range(top_y, by + 2):
        t = (by - y) / (by - top_y)
        sway = 2.0 * math.sin(t * 2.2)
        cxs = bx + sway
        if y > stalk:
            half = 2.0
        else:
            ts = (stalk - y) / (stalk - top_y)
            half = 6.8 * (1 - ts) ** 0.55 + 1.0
            half += 1.0 if (y // 2) % 2 else 0.0          # bumpy clusters
        for x in range(int(round(cxs - half)), int(round(cxs + half)) + 1):
            u = (x - (cxs - half)) / max(1, 2 * half)      # 0 left .. 1 right
            if abs(x - cxs) > half - 0.6:
                col = hexc("#302010")
            elif y > stalk:
                col = hexc("#587038") if u < 0.5 else hexc("#304820")
            else:
                n = rngs.random()
                if u < 0.45:
                    col = hexc("#f8e070") if n < 0.55 else hexc("#f8f8c0") if n < 0.75 else hexc("#c09030")
                else:
                    col = hexc("#c09030") if n < 0.55 else hexc("#806018") if n < 0.85 else hexc("#f8e070")
            a[y, x] = col
    # glow tip
    for (dx, dy, c) in [(0, -1, "#f8f8c8"), (0, -2, "#f8e898"), (-1, 0, "#f8f8c8"), (1, 0, "#f8e898")]:
        a[top_y + dy, int(round(bx + 2.0 * math.sin(2.2))) + dx] = hexc(c)
    # drifting gold pollen: diagonal trail down-left from the spike
    for i in range(70):
        t = rng.random()
        x = int(bx - 10 - t * 130 + rng.normal(0, 6))
        y = int(30 + t * 60 + rng.normal(0, 9) - 8 * math.sin(t * 6))
        if 0 <= x < W and 0 <= y < H:
            big = rng.random() < 0.18
            a[y, x] = hexc("#f8e070") if rng.random() < 0.7 else hexc("#f8f8c8")
            if big:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if 0 <= x + dx < W and 0 <= y + dy < H:
                        a[y + dy, x + dx] = hexc("#d0a030")
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
    big = np.kron(word_mask("VERDANT"), np.ones((2, 2), bool))     # 16px tall
    small = word_mask("REACH", 1)
    small = np.kron(small, np.ones((1, 1), bool))
    Wd = max(big.shape[1], small.shape[1]) + 6
    H = big.shape[0] + small.shape[0] + 14
    m = np.zeros((H, Wd), np.int8)    # 0 empty, 1 big letters, 2 small letters
    bx = (Wd - big.shape[1]) // 2
    m[2:2 + big.shape[0], bx:bx + big.shape[1]][big] = 1
    sy = 2 + big.shape[0] + 5
    sx = (Wd - small.shape[1]) // 2
    m[sy:sy + small.shape[0], sx:sx + small.shape[1]][small] = 2
    a = np.zeros((H, Wd, 4), np.uint8)
    # fill: big letters with a vertical green gradient + highlight row
    for y in range(H):
        for x in range(Wd):
            if m[y, x] == 1:
                t = (y - 2) / big.shape[0]
                a[y, x] = C["g0"] if t < 0.2 else C["g1"] if t < 0.55 else C["g2"]
            elif m[y, x] == 2:
                a[y, x] = C["y1"] if (y - sy) < 4 else C["y2"]
    solid = m > 0
    # drop shadow (down-right) then outline
    sh = np.zeros_like(solid)
    sh[1:, 1:] = solid[:-1, :-1]
    sh2 = np.zeros_like(solid)
    sh2[2:, 2:] = solid[:-2, :-2]
    ring = np.zeros_like(solid)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
        r = np.zeros_like(solid)
        ys0, ys1 = max(0, dy), H + min(0, dy)
        xs0, xs1 = max(0, dx), Wd + min(0, dx)
        r[ys0:ys1, xs0:xs1] = solid[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
        ring |= r
    ring &= ~solid
    a[(sh2 | sh) & ~solid & ~ring] = C["f3"]
    a[ring] = C["k"]
    img = Image.fromarray(a, "RGBA")
    # a small leaf sprig flourish either side of REACH
    leaf_l = img_from_rows([
        "....KK",
        "..KKgK",
        ".KgggK",
        "KgGgK.",
        "KGGK..",
        ".KK...",
    ], {".": None, "K": "k", "g": "g1", "G": "g2"})
    img.alpha_composite(leaf_l, (sx - 10, sy))
    img.alpha_composite(leaf_l.transpose(Image.FLIP_LEFT_RIGHT), (sx + small.shape[1] + 4, sy))
    return img


# ------------------------------------------------------------------ pods ----
def pod(open_=False) -> Image.Image:
    closed = [
        "............",
        ".....KK.....",
        "..KKKKKKKK..",
        ".KoOoOoOoOK.",
        ".KKKKKKKKKK.",
        "..KwqqqqqK..",
        "..KqwqgqQK..",
        "..KqqqgQQK..",
        "...KqqqQK...",
        "....KqQK....",
        ".....KK.....",
        "............",
    ]
    opened = [
        "..KKK.......",
        ".KoOKK......",
        "KoOoOKK.....",
        "KKoOoOK.....",
        ".KKKKKK.....",
        "..KwqqqqqK..",
        "..KqwqgqQK..",
        "..KqqqgQQK..",
        "...KqqqQK...",
        "....KqQK....",
        ".....KK.....",
        "............",
    ]
    rows = opened if open_ else closed
    return img_from_rows(rows, {".": None, "K": "k", "o": "o1", "O": "o2", "w": "white",
                                "q": "q1", "Q": "q2", "g": "g2"})


# ----------------------------------------------------------------- marks ----
def mark(kind) -> Image.Image:
    """Pressed specimen mounted on a little herbarium card with a label strip."""
    card = [
        "................",
        ".KKKKKKKKKKKKKK.",
        ".KccccccccccccK.",
        ".KcCCCCCCCCCCcK.",
        ".KcC........CcK.",
        ".KcC........CcK.",
        ".KcC........CcK.",
        ".KcC........CcK.",
        ".KcC........CcK.",
        ".KcC........CcK.",
        ".KcC........CcK.",
        ".KcCCCCCCCCCCcK.",
        ".KcclllllllcccK.",
        ".KccccccccccccK.",
        ".KKKKKKKKKKKKKK.",
        "................",
    ]
    if kind == "bramble":
        spec = [
            "....gg..",
            "...gGGg.",
            "..gGGgg.",
            "...gg.b.",
            "....tbBb",
            "...t.bb.",
            "..t.....",
            ".t......",
        ]
        key = {"g": "g1", "G": "g2", "b": "x2", "B": "x3", "t": "f3"}
        frame = "o2"
    else:
        spec = [
            "..w.w...",
            ".rRrRr..",
            "w.rrr.w.",
            ".rRrRr..",
            "..rrr...",
            "...t....",
            "...t....",
            "..tt....",
        ]
        key = {"r": "b1", "R": "b2", "w": "white", "t": "g2"}
        frame = "n2"
    rows = [list(r) for r in card]
    for j, r in enumerate(spec):
        for i, ch in enumerate(r):
            if ch != ".":
                rows[3 + j][4 + i] = ch
    rows = ["".join(r) for r in rows]
    return img_from_rows(rows, {".": None, "K": "k", "c": frame, "C": "s0", "l": "r2", **key, "*": None})


def battle_ground() -> Image.Image:
    W, H = 80, 20
    a = np.zeros((H, W, 4), np.uint8)
    cx, cy, rx, ry = W / 2 - 0.5, H / 2 - 0.5, W / 2 - 0.5, H / 2 - 0.5
    for y in range(H):
        for x in range(W):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d <= 1:
                col = C["g1"]
                if d > 0.72:
                    col = C["g2"]
                if y > cy and d > 0.55:
                    col = C["g2"]
                if d > 0.9 and y > cy:
                    col = C["g3"]
                if d < 0.25 and y < cy:
                    col = C["g0"] if (x + y) % 2 else C["g1"]
                a[y, x] = col
    # grass flecks
    rng = np.random.default_rng(2)
    for _ in range(26):
        x, y = rng.integers(8, W - 8), rng.integers(4, H - 4)
        if a[y, x, 3] and ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 0.6:
            a[y, x] = C["g2"]
            if y + 1 < H:
                a[y - 1, x - 1] = C["g2"] if a[y - 1, x - 1, 3] else a[y - 1, x - 1]
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
