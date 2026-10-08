"""Chapter 8 environment plumbing: hand-placed native pixels, deterministic output.

Run the generators with the pinned art Python
(/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python).
Tiles are authored as ASCII rows with a per-tile colour key, so every pixel is
a deliberate choice. Props that stand on an existing surface (a wall panel,
relay floor plates, roof paving) are drawn over the shipped tile image, read
through artkit's resolver, so they always match whatever that tile looks like.
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

REVIEW = HERE.parent / "review"
TOOL_TILES = "tools/art/env9/tilesets.py"
CREDITS = "Original hand-pixelled Chapter 8 environment for Verdant Reach; no copied or traced game art."

HEX = {
    # Root Relay steel and phosphor (tools/art/env4: cable_floor, console, server_rack)
    "ST0": "#d8e0f0", "ST1": "#98a8c0", "ST2": "#607088", "ST3": "#283048",
    "PH0": "#c8f8b0", "PH1": "#58e070",
    # root cable: a root-brown ramp, a little greyer than the wood ramp (docs/STYLE.md)
    "RT0": "#b88c58", "RT1": "#7c5434", "RT2": "#44281c",
    # Rootstock banner: dark green cloth, the graft sigil's yellow
    "BN0": "#3c7840", "BN1": "#285828", "BN2": "#183820", "SG": "#f8d838",
    # the Glasshouse dome seen from above: white glazing bars, deep glass, the city's glow
    "GF": "#d8ece4", "GS": "#90b8b0", "GD": "#24504c", "GH": "#3c8060", "GL": "#a8f088",
    # roof vent steam
    "SM0": "#f8f8f8", "SM1": "#d8e0f0",
}


def rgba(name_or_hex: str) -> tuple[int, int, int, int]:
    h = name_or_hex if name_or_hex.startswith("#") else HEX[name_or_hex]
    return tuple(bytes.fromhex(h[1:])) + (255,)


def paint(a: np.ndarray, rows: list[str], key: dict[str, str | None], x: int = 0, y: int = 0) -> np.ndarray:
    """Stamp ASCII rows onto an RGBA array; characters missing from key (or
    mapped to None) leave the pixel underneath."""
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            c = key.get(ch)
            if c is not None and 0 <= y + j < a.shape[0] and 0 <= x + i < a.shape[1]:
                a[y + j, x + i] = rgba(c)
    return a


def blank(colour: str) -> np.ndarray:
    a = np.zeros((16, 16, 4), np.uint8)
    a[:, :] = rgba(colour)
    return a


def quadrant_colours(a: np.ndarray) -> int:
    return max(len(np.unique(a[y:y + 8, x:x + 8].reshape(-1, 4), axis=0))
               for y in (0, 8) for x in (0, 8))


def reduce_quads(a: np.ndarray, order: list[tuple[str, str]]) -> np.ndarray:
    """Fold colours (src -> dst, in priority order) inside any 8x8 quadrant
    holding more than four; the same rule as tools/art/env4/kit.reduce_quads."""
    a = a.copy()
    for y in (0, 8):
        for x in (0, 8):
            q = a[y:y + 8, x:x + 8]
            for src, dst in order:
                if len(np.unique(q.reshape(-1, 4), axis=0)) <= 4:
                    break
                q[(q == rgba(src)).all(axis=2)] = rgba(dst)
    return a


def to_image(a: np.ndarray) -> Image.Image:
    return Image.fromarray(a, "RGBA")


_R = None


def shipped(stem: str) -> np.ndarray:
    """A shipped tile image (base bundles only), e.g. 'wall', 'cable_floor~1'."""
    global _R
    if _R is None:
        from artkit.resolve import Resolver
        _R = Resolver()
    im = _R.image(f"assets/tiles/{stem}.png")
    if im is None:
        raise ValueError(f"missing shipped tile {stem}")
    a = np.asarray(im if not isinstance(im, Image.Image) else im.convert("RGBA"))
    return a.copy()


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
