"""Shared plumbing for the Chapter 4 environment generator (tools/art/env4/).

The Round-3 tile and structure generators (tools/art/tiles.py and
structures.py) are imported as libraries, so Chapter 4 art shares their
ramps, autotile shape maths (blob / rims / pad_same), the water texture and
the building components (window, door, dome, glazing, roof_hip...).

The palette here is tiles.NAMES with the Chapter 4 ramps APPENDED, so every
index array that tiles.py builds (WATER, GRASS, floor tiles...) is valid
here unchanged, and `Canvas` is a drop-in for structures.Canvas that knows
the extra names.

Output: swappable-art bundles (docs/ART.md), written through artkit so a
regen is byte-identical:
  public/art/tilesets/<id>/{tileset.json, sheet.png}
  public/art/structures/<key>/{structure.json, structure.png}
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ART_TOOLS = HERE.parent
if str(ART_TOOLS) not in sys.path:
    sys.path.insert(0, str(ART_TOOLS))

import gbc  # noqa: E402
import structures as S  # noqa: E402
import tiles as T  # noqa: E402

ROOT = ART_TOOLS.parents[1]
ART = ROOT / "public" / "art"
REVIEW = HERE / "review"
CREDITS = "Generated pixel art for Verdant Reach (Round 4, Chapter 4 environment)."

# ---------------------------------------------------------------------------
# Chapter 4 ramps (0 light .. 3 dark), hue-shifted like STYLE.md: shadows
# toward blue/purple, highlights toward yellow.
# ---------------------------------------------------------------------------
EXTRA = {
    # Glasshouse City warm stone (paving, copings, plinths): honey light,
    # mauve shadow so it never reads as the yellow country path.
    "H0": "#f8ecd0", "H1": "#e0c8a0", "H2": "#b09080", "H3": "#705868",
    # Victorian cast iron, painted deep green (railings, glasshouse ribs)
    "I0": "#a0c8b0", "I1": "#508070", "I2": "#285048", "I3": "#102828",
    # roses
    "RO0": "#f8b8c0", "RO1": "#e85070", "RO2": "#a82048", "RO3": "#581030",
    # tropical foliage (Palm House): bluer, wetter greens than the meadow
    "TP0": "#c8f090", "TP1": "#58c058", "TP2": "#188850", "TP3": "#084030",
    # orchard leaf: a yellower apple green
    "OR0": "#e0f088", "OR1": "#a0c848", "OR2": "#609030", "OR3": "#2c5820",
    # polished marble (cream, pink-grey veins)
    "MB0": "#f8f8f0", "MB1": "#e0d8d8", "MB2": "#b8a8b0", "MB3": "#605068",
    # stage boards: polished cherry
    "CH0": "#f0a868", "CH1": "#c06038", "CH2": "#883028", "CH3": "#481820",
    # relay steel (cool blue-grey) and phosphor
    "ST0": "#d8e0f0", "ST1": "#98a8c0", "ST2": "#607088", "ST3": "#283048",
    "PH0": "#c8f8b0", "PH1": "#58e070",
}
NAMES = list(T.NAMES) + [k for k in EXTRA if k not in T.HEX]
HEX = {**T.HEX, **EXTRA}
IDX = {n: i for i, n in enumerate(NAMES)}
RGBA = np.array([gbc.hexc(HEX[n]) for n in NAMES], np.uint8)
assert all(IDX[n] == T.IDX[n] for n in T.NAMES)


def c(n: str) -> int:
    return IDX[n]


def A(rows: list[str], key: dict[str, str], w=16, h=16) -> np.ndarray:
    assert len(rows) == h and all(len(r) == w for r in rows), (len(rows), [len(r) for r in rows])
    a = np.zeros((h, w), np.int16)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            a[y, x] = IDX[key[ch]]
    return a


def put(dst: np.ndarray, rows: list[str], key: dict, x0: int, y0: int):
    """Overlay ASCII; ' ' and chars mapped to None are transparent."""
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch == " " or key.get(ch) is None:
                continue
            yy, xx = y0 + j, x0 + i
            if 0 <= yy < dst.shape[0] and 0 <= xx < dst.shape[1]:
                dst[yy, xx] = IDX[key[ch]]


def fill(n: str, w=16, h=16) -> np.ndarray:
    return np.full((h, w), IDX[n], np.int16)


def quad_counts(a: np.ndarray) -> int:
    return max(len(np.unique(a[y:y + 8, x:x + 8])) for y in range(0, a.shape[0], 8)
               for x in range(0, a.shape[1], 8))


def reduce_quads(a: np.ndarray, order) -> np.ndarray:
    """Fold colours (src -> dst, in priority order) inside any 8x8 quadrant
    holding more than four. Same rule as tiles.reduce_quads."""
    a = a.copy()
    for y in (0, 8):
        for x in (0, 8):
            q = a[y:y + 8, x:x + 8]
            for src, dst in order:
                if len(np.unique(q)) <= 4:
                    break
                q[q == c(src)] = c(dst)
    return a


def to_img(a: np.ndarray) -> Image.Image:
    return Image.fromarray(RGBA[a], "RGBA")


def to_rgba(a: np.ndarray) -> np.ndarray:
    return RGBA[a].copy()


sides = T.sides
blob = T.blob
rims = T.rims
MASKS = range(16)


# ------------------------------------------------------------- structures ---
class Canvas(S.Canvas):
    """structures.Canvas over the extended palette (CLEAR = -1)."""

    def px(self, x, y, col):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.a[y, x] = S.CLEAR if col is None else IDX[col]

    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h:
            v = self.a[y, x]
            return None if v == S.CLEAR else NAMES[v]
        return None

    def rect(self, x0, y0, x1, y1, col):
        x0, x1 = max(0, x0), min(self.w - 1, x1)
        y0, y1 = max(0, y0), min(self.h - 1, y1)
        if x0 <= x1 and y0 <= y1:
            self.a[y0:y1 + 1, x0:x1 + 1] = S.CLEAR if col is None else IDX[col]

    def recolor(self, x0, y0, x1, y1, src, dst):
        sub = self.a[y0:y1 + 1, x0:x1 + 1]
        sub[sub == IDX[src]] = IDX[dst]

    def image(self) -> Image.Image:
        rgba = RGBA[np.clip(self.a, 0, None)].copy()
        rgba[self.a == S.CLEAR] = (0, 0, 0, 0)
        return Image.fromarray(rgba, "RGBA")


# ----------------------------------------------------------------- output ---
from artkit import emit as _emit  # noqa: E402


def write_tileset(tid: str, name: str, out: dict[str, np.ndarray], order: list[str], tool: str) -> bool:
    from tile_edges import join_edges
    out = join_edges(out, repeat=("paving", "tropical_grass"), palette=RGBA, texture=("rose_trellis",))
    return _emit.tileset(tid, {stem: to_rgba(a) for stem, a in out.items()}, tool=tool, name=name,
                         order=order, credits=CREDITS)


def write_structure(key: str, im: Image.Image, tool: str) -> bool:
    return _emit.structure(key, im, tool, credits=CREDITS)
