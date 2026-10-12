"""Post-game environment plumbing: hand-placed native pixels, deterministic output.

Run the generators with the pinned art Python
(/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python).
Tiles are authored on a named-colour canvas (ASCII stamps plus a few computed
shapes), so every pixel is a deliberate choice. The Route 9 portal
flank starts from the shipped cliff's own pixels, read through artkit's
resolver, so before the clear it is exactly the rock around it. No reference sprites are copied or traced.
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
TOOL_TILES = "tools/art/envpg/tilesets.py"
TOOL_BUILDINGS = "tools/art/envpg/buildings.py"
CREDITS = "Original hand-pixelled post-game environment for Verdant Reach; no copied or traced game art."

# Shadows lean purple or blue, highlights lean yellow (docs/STYLE.md).
HEX = {
    # the stone ramp: the shipped pit, stairs and filled pit share it, so the
    # vault's concrete meets them without a seam
    "k0": "#f0f0e8", "k1": "#b8b8b0", "kj": "#9a9aa0", "k2": "#787878", "k3": "#383840", "kp": "#687080", "bk": "#181818",
    # frost: the shipped snow's ramp
    "f0": "#f8f8f0", "f1": "#e8f0f8", "f2": "#c8d8e8", "f3": "#a0b8d0",
    # wall concrete: cold, a step darker than the floor, violet in the shade
    "c1": "#9c9ca8", "c2": "#70707e", "c3": "#4a4a5c", "c4": "#2c2c3c",
    # steel
    "s0": "#e0e8f0", "s1": "#a0acc0", "s2": "#687490", "s3": "#3c4460",
    # ice
    "i0": "#e8f8f8", "i1": "#b8e0f0", "i2": "#80b8d8", "i3": "#5088b0",
    # the portal's strip of pale glass
    "g0": "#f0fff8", "g1": "#a8ece0", "g2": "#60b4b8",
    # Route 9's shipped cliff
    "cA": "#e0c898", "cB": "#b09068", "cC": "#786048", "cD": "#403040", "cG": "#98d060",
    # sealed seed boxes and their labels
    "bx1": "#94785a", "bx2": "#5c4434", "ol1": "#7c8c5c", "ol2": "#4c5840", "ru1": "#b0604c", "ru2": "#74382c",
    "lb": "#f0e8c8",
    # the reading desk: dark oak, brass lamp, a green shade, the ledger
    "w0": "#c88850", "w1": "#8a5030", "w2": "#4a2818", "lm0": "#f8e8a0", "lm1": "#d8a840", "gn1": "#5c9c70", "gn2": "#2c5c48",
    # roots: the shipped root gap's ramp
    "rt0": "#d8b878", "rt1": "#a88050", "rt2": "#584850",
    # dolomite: pale, violet in the shade
    "d0": "#f8f4e8", "d1": "#e0d8c8", "d2": "#bcb2a4", "d3": "#8c8494", "d4": "#5c5468",
    # moss campion cushions
    "m0": "#a0bc6c", "m1": "#6c8c50", "m2": "#40603c", "mp": "#e888b0",
    # bristlecone: silver deadwood, the living strip of rust bark, dark needles
    "bw0": "#f4f0e4", "bw1": "#ccc4bc", "bw2": "#948c94", "bw3": "#5c5466", "bw4": "#3a3444",
    "rb0": "#d8885c", "rb1": "#a4502e", "rb2": "#68302a",
    "nd0": "#76966a", "nd1": "#40624e", "nd2": "#22383a",
    # the sea of cloud below the summit
    "cl0": "#f8f8f8", "cl1": "#e0e8f0", "cl2": "#b8c4dc", "cl3": "#8c98c0",
    # the shipped scree
    "sc0": "#d8d0c0", "sc1": "#a89c8c", "sc2": "#786c64", "sc3": "#4c4450",
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

    def line(self, pts, c):
        """Bresenham polyline, no antialiasing (the env11 house helper)."""
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            dx, dy = abs(x1 - x0), -abs(y1 - y0)
            sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
            err = dx + dy
            while True:
                self.px(x0, y0, c)
                if x0 == x1 and y0 == y1:
                    break
                e2 = 2 * err
                if e2 >= dy:
                    err += dy; x0 += sx
                if e2 <= dx:
                    err += dx; y0 += sy

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

    def image(self, opaque: bool = True) -> Image.Image:
        if opaque:
            assert (self.a != CLEAR).all(), "tiles are opaque"
        out = RGBA[np.where(self.a == CLEAR, 0, self.a)].copy()
        out[self.a == CLEAR] = 0
        return Image.fromarray(out, "RGBA")


def ascii_canvas(rows, key):
    cv = Canvas(16, 16)
    cv.put(rows, key)
    assert (cv.a != CLEAR).all(), rows
    return cv


_R = None


def shipped_image(stem: str) -> Image.Image:
    """A shipped tile (base bundles only) as an RGBA image, for tiles whose
    colours are not on the named-colour canvas (e.g. 'snow')."""
    global _R
    if _R is None:
        from artkit.resolve import Resolver
        _R = Resolver()
    im = _R.image(f"assets/tiles/{stem}.png")
    if im is None:
        raise ValueError(f"missing shipped tile {stem}")
    return im.convert("RGBA") if isinstance(im, Image.Image) else Image.fromarray(np.asarray(im))


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
