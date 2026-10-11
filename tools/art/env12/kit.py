"""Chapter 11 environment plumbing: hand-placed native pixels, deterministic output.

Run the generators with the pinned art Python
(/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python).
Tiles are authored on a named-colour canvas (ASCII stamps plus a few computed
shapes), so every pixel is a deliberate choice. A prop that stands on a
shipped floor (basalt, resin flags, marble) starts from that floor's own
pixels, read through artkit's resolver, so it always sits on whatever the
floor looks like. No reference sprites are copied or traced.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE.parent))
from artkit import emit  # noqa: E402,F401
from artkit.core import save_png  # noqa: E402,F401

REVIEW = HERE.parent / "review"
TOOL_TILES = "tools/art/env12/tilesets.py"
CREDITS = "Original hand-pixelled Chapter 11 environment for Verdant Reach; no copied or traced game art."

# Shadows lean purple or blue, highlights lean yellow (docs/STYLE.md).
HEX = {
    # shipped floors, named so props can be drawn over them
    "bs0": "#988878", "bs1": "#706860", "bs2": "#504850", "bs3": "#303038",   # basalt_floor
    "rf0": "#e09438", "rf1": "#b86450", "rf2": "#a86028", "rf3": "#8a3c38",   # resin_floor
    "mb0": "#f8f8f0", "mb1": "#e0d8d8", "mb2": "#b8a8b0", "mb3": "#607088",   # floor_marble
    # the house window's wall, frame and sill (tools/art/tiles.py)
    "wa": "#f8f0d8", "wb": "#482818", "we": "#885030", "wc": "#68a8e8", "wd": "#3060c0",
    # APOTHECARY: dark shelf wood, dried herbs, green and violet glass, labels
    "w1": "#7a4232", "w2": "#5c3030", "w3": "#2c1820",
    "h1": "#a8a860", "h2": "#646c3c",
    "j1": "#78c098", "j2": "#3c7c68", "p1": "#b080d0", "p2": "#6c4498", "am": "#d89838",
    "lb": "#f0e8c8",
    # poison beds: foxglove bells, nightshade leaves and berries
    "n1": "#5c8c50", "n2": "#2c5038", "fx0": "#f8c0e0", "fx1": "#c058a8", "be": "#40204c",
    # SLEEPER: deep night floor, silver stars, moss, a crescent moon
    "s1": "#34468c", "s2": "#1e2c64", "s3": "#16205a", "st": "#a8b8e8", "sw": "#f8f8f0",
    "ms1": "#5c9c84", "ms2": "#2c5c5c",
    "mo0": "#f8f0b8", "mo1": "#d8b860", "ha": "#4c5cac",
    # ROTTER: maroon loam, pale fungi, the bog pool, steam
    "l0": "#9c5c54", "l1": "#6c343c", "l2": "#4c2030", "l3": "#2c1424",
    "c0": "#f0dcb4", "c1": "#c0906c",
    "b1": "#6c9c8c", "b2": "#2c5054", "b3": "#182630",
    "sm": "#d8ccc8",
    # KINDLER: flame and iron
    "fl0": "#f8e878", "ir": "#401c20",
    # KEEPER: aspen bark and gold (tools/art/env11 ramps)
    "k0": "#f8f8f0", "k1": "#c0bccc", "k2": "#302830",
    "a0": "#f8f0c8", "a1": "#f0c040", "a2": "#c47c24", "a3": "#5c3430",
}
NAMES = list(HEX)
IDX = {n: i for i, n in enumerate(NAMES)}
RGBA = np.array([tuple(bytes.fromhex(HEX[n][1:])) + (255,) for n in NAMES], np.uint8)
BY_RGB = {}
for _n in NAMES:
    BY_RGB.setdefault(HEX[_n], _n)
CLEAR = -1


def hash2(x, y, salt=0):
    """The runtime's position hash (src/overworld/autotile.ts posHash)."""
    h = (x * 374761393 + y * 668265263 + salt * 1013904223) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return h ^ (h >> 16)


def pick_alt(x, y, alts, salt=0):
    """Mirror of pickAlt in src/overworld/autotile.ts."""
    if not alts:
        return 0
    def choose(cx, cy, s):
        r = hash2(cx, cy, s) % (len(alts) + 2)
        return 0 if r < 2 else alts[r - 2]
    v = choose(x, y, salt)
    if v and v == choose(x - 1, y, salt):
        return choose(x, y, salt + 7)
    return v


class Canvas:
    """Named-colour canvas (the env11 house canvas)."""

    def __init__(self, w: int = 16, h: int = 16):
        self.a = np.full((h, w), CLEAR, np.int16)
        self.w, self.h = w, h

    def copy(self):
        c = Canvas(self.w, self.h)
        c.a = self.a.copy()
        return c

    def px(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.a[y, x] = CLEAR if c is None else IDX[c]

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            v = self.a[y, x]
            return None if v == CLEAR else NAMES[v]
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

    def put(self, rows, key, x=0, y=0):
        """Stamp ASCII rows; characters not in key leave the pixel underneath."""
        for j, r in enumerate(rows):
            for i, ch in enumerate(r):
                if ch in key:
                    self.px(x + i, y + j, key[ch])

    def replace(self, src, dst, box=(0, 0, 15, 15)):
        x0, y0, x1, y1 = box
        sub = self.a[y0:y1 + 1, x0:x1 + 1]
        sub[sub == IDX[src]] = IDX[dst]

    def fold(self, order):
        """Inside any 8x8 quadrant holding more than four colours, fold
        colours (src -> dst, in priority order) until it holds four."""
        for qy in (0, 8):
            for qx in (0, 8):
                q = self.a[qy:qy + 8, qx:qx + 8]
                for src, dst in order:
                    if len(np.unique(q)) <= 4:
                        break
                    q[q == IDX[src]] = IDX[dst]

    def image(self) -> Image.Image:
        assert (self.a != CLEAR).all(), "tiles are opaque"
        return Image.fromarray(RGBA[self.a].copy(), "RGBA")


def ascii_canvas(rows, key):
    cv = Canvas(16, 16)
    cv.put(rows, key)
    assert (cv.a != CLEAR).all(), rows
    return cv


_R = None


def shipped(stem: str) -> Canvas:
    """A shipped tile (base bundles only) as a named-colour canvas, e.g. 'basalt_floor'."""
    global _R
    if _R is None:
        from artkit.resolve import Resolver
        _R = Resolver()
    im = _R.image(f"assets/tiles/{stem}.png")
    if im is None:
        raise ValueError(f"missing shipped tile {stem}")
    a = np.asarray(im.convert("RGBA") if isinstance(im, Image.Image) else im)
    cv = Canvas(a.shape[1], a.shape[0])
    for y in range(cv.h):
        for x in range(cv.w):
            cv.px(x, y, BY_RGB["#%02x%02x%02x" % tuple(a[y, x, :3])])
    return cv


def quadrant_colours(im: Image.Image) -> int:
    a = np.asarray(im.convert("RGBA"))
    return max(len(np.unique(a[y:y + 8, x:x + 8].reshape(-1, 4), axis=0))
               for y in (0, 8) for x in (0, 8))
