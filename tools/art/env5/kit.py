"""Shared plumbing for the Chapter 5 environment generator (tools/art/env5/).

Same approach as tools/art/env4/kit.py: the Round-3 tile and structure
generators (tools/art/tiles.py, structures.py) are imported as libraries for
their ramps and autotile shape maths (sides / blob / rims), and the palette
is tiles.NAMES with the Chapter 5 ramps APPENDED, so any index array tiles.py
builds stays valid here.

Output: swappable-art bundles (docs/ART.md), written through artkit so a
regen is byte-identical:
  public/art/tilesets/{oldgrowth,burnt,hollow}/{tileset.json, sheet.png}
  public/art/structures/<ch5 key>/{structure.json, structure.png}
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
REVIEW = HERE / "review"
CREDITS = "Generated pixel art for Verdant Reach (Chapter 5 environment)."

# ---------------------------------------------------------------------------
# Chapter 5 ramps (0 light .. 3 dark), hue-shifted per STYLE.md: shadows
# lean blue/purple, highlights lean yellow. Values sit on the GBC 5-bit grid.
# ---------------------------------------------------------------------------
EXTRA = {
    # old-growth moss floor: the shared grass ramp (so every Round 1-4 prop
    # standing on grass, a sign or a lamp post, sits on it seamlessly); the
    # moss reads through its texture, dense low cushions, not its hue
    "MS0": "#e0f0a0", "MS1": "#98d060", "MS2": "#58a040", "MS3": "#285828",
    # sword fern: glossy, a touch bluer than the moss
    "FN0": "#68b048", "FN1": "#286840",
    # conifer canopy (cedar / fir sprays): deep blue-green layers
    "FR0": "#88b860", "FR1": "#488850", "FR2": "#285840", "FR3": "#103030",
    # western red cedar bark: fibrous red-brown, purple shadow
    "CB0": "#e0a070", "CB1": "#b06040", "CB2": "#783830", "CB3": "#401828",
    # weathered canopy planks: silver-grey wood
    "WP0": "#e8d8b8", "WP1": "#b8a088", "WP2": "#806860", "WP3": "#483840",
    # the misty drop: the forest floor far below, through haze
    "MD0": "#a0c0b8", "MD1": "#608880", "MD2": "#385858", "MD3": "#183038",
    # hemp rope
    "RP0": "#f0d898", "RP1": "#b89060",
    # ash (cool pale grey, mauve shade) and the char soil under it
    "AS0": "#c8c0c0", "AS1": "#a09898", "AS2": "#787078", "AS3": "#585058",
    "CS0": "#887880", "CS1": "#685c64", "CS2": "#403840", "CS3": "#201820",
    # embers
    "EM0": "#f8b048", "EM1": "#e05028",
    # heartwood floor: golden cedar, worn smooth
    "HW0": "#d8a070", "HW1": "#b07450", "HW2": "#885038", "HW3": "#583030",
    # ghost pipe: waxy white with lilac-grey shading; the foxfire glow
    "GP1": "#d8d0e8", "GP2": "#a098c0", "GP3": "#585078",
    "GL0": "#e8f8d8", "GL1": "#98e0c0", "GL2": "#48a090",
    # night conservatory slate and dark iron
    "NS0": "#9098b0", "NS1": "#606888", "NS2": "#3c4060", "NS3": "#202438",
    "NI0": "#687088", "NI1": "#383c50", "NI2": "#202030",
    # pale moonlit panes (kept outside the engine's "lit window" blue test)
    "NP0": "#d0e0e8", "NP1": "#a0b8c8", "NP2": "#708898",
    # Rootstock canvas: drab olive-khaki, and the graft sigil's yellow
    "CV0": "#c8c098", "CV1": "#989070", "CV2": "#686048", "CV3": "#383828",
    # offering ribbons
    "RB0": "#f8f0e8", "RB1": "#d84040", "RB2": "#902838",
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
pad_same = T.pad_same
MASKS = range(16)


def hash2(x: int, y: int, salt: int = 0) -> int:
    """Small deterministic integer hash (for scattering details)."""
    h = (x * 374761393 + y * 668265263 + salt * 1013904223) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return h ^ (h >> 16)


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
    return _emit.tileset(tid, {stem: to_rgba(a) for stem, a in out.items()}, tool=tool, name=name,
                         order=order, credits=CREDITS)


def write_structure(key: str, im: Image.Image, tool: str) -> bool:
    return _emit.structure(key, im, tool, credits=CREDITS)
