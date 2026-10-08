"""Chapter 9 environment plumbing: hand-placed native pixels, deterministic output.

Run the generators with the pinned art Python
(/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python).
Tiles are authored as ASCII rows with a per-tile colour key, so every pixel is
a deliberate choice; structures reuse the house helpers in tools/art/structures.py
(windows, doors, chimneys, sign font) on a canvas with an extended palette.
No reference sprites are copied or traced.
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
import tiles as _tiles  # noqa: E402

REVIEW = HERE.parent / "review"
TOOL_TILES = "tools/art/env10/tilesets.py"
TOOL_BUILDINGS = "tools/art/env10/buildings.py"
CREDITS = "Original hand-pixelled Chapter 9 environment for Verdant Reach; no copied or traced game art."

# The shared ramps (docs/STYLE.md, tools/art/tiles.py) plus the Chapter 9
# desert, canyon and ridge ramps. Shadows lean purple, highlights lean yellow.
HEX = dict(_tiles.HEX)
HEX.update({
    # baked clay (cracked_earth): lit plate rims, clay, crack wall, crack floor
    "k0": "#f8dcb0", "k1": "#e8bc88", "k2": "#c48c60", "k3": "#8c5844",
    # red sandstone (red_rock, red_ledge): lit band, body, shade, deep shade
    "r0": "#f8b888", "r1": "#d87454", "r2": "#a84c40", "r3": "#6c3040",
    # desert scrub: dry straw, sage olive, dark olive
    "b0": "#d8c878", "b1": "#98a458", "b2": "#5c7038",
    # Conservatory 8 stone: dark red ashlar, resin amber grout
    "h0": "#b86450", "h1": "#8a3c38", "h2": "#642a30", "h3": "#3c1828",
    "e0": "#f8c860", "e1": "#e09438", "e2": "#a86028",
    # dragon's blood tree: stiff blue-green leaves, silver-grey bark
    "d0": "#a8c880", "d1": "#5c8a58", "d2": "#365e44", "d3": "#1c3430",
    "t0": "#e0d8c8", "t1": "#b0a8a0", "t2": "#7c7480", "t3": "#4c4458",
    # adobe plaster: sun-lit, wall, shade, deep shade
    "a0": "#f8e4c0", "a1": "#e8c498", "a2": "#c89470", "a3": "#8c5c50",
})
NAMES = list(HEX)
IDX = {n: i for i, n in enumerate(NAMES)}
RGBA = np.array([tuple(bytes.fromhex(HEX[n][1:])) + (255,) for n in NAMES], np.uint8)
CLEAR = -1


def rgba(hexcode: str) -> tuple[int, int, int, int]:
    return tuple(bytes.fromhex(hexcode[1:])) + (255,)


def ascii_tile(rows: list[str], key: dict[str, str]) -> Image.Image:
    """16 ASCII rows -> RGBA tile. key maps each character to a HEX name or '#rrggbb'."""
    assert len(rows) == 16 and all(len(r) == 16 for r in rows), [len(r) for r in rows]
    a = np.zeros((16, 16, 4), np.uint8)
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            c = key[ch]
            a[y, x] = rgba(c if c.startswith("#") else HEX[c])
    return Image.fromarray(a, "RGBA")


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
    """Named-colour canvas, duck-compatible with tools/art/structures.py helpers."""

    def __init__(self, w: int, h: int):
        self.a = np.full((h, w), CLEAR, np.int16)
        self.w, self.h = w, h

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
        """Bresenham polyline, no antialiasing."""
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

    def put(self, rows, key, x, y):
        for j, r in enumerate(rows):
            for i, ch in enumerate(r):
                if ch in key:
                    self.px(x + i, y + j, key[ch])

    def text(self, s, x, y, c, shadow=None):
        from structures import FONT
        for ch in s:
            for j, row in enumerate(FONT[ch]):
                for i, v in enumerate(row):
                    if v == "#":
                        if shadow:
                            self.px(x + i + 1, y + j + 1, shadow)
                        self.px(x + i, y + j, c)
            x += 4

    def image(self) -> Image.Image:
        out = RGBA[np.clip(self.a, 0, None)].copy()
        out[self.a == CLEAR] = (0, 0, 0, 0)
        return Image.fromarray(out, "RGBA")


def quadrant_colours(im: Image.Image) -> int:
    a = np.asarray(im.convert("RGBA"))
    return max(len(np.unique(a[y:y + 8, x:x + 8].reshape(-1, 4), axis=0))
               for y in (0, 8) for x in (0, 8))
