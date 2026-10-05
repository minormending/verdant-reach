"""Shared helpers for the Verdant Reach art tools.

Everything here is hard-edged pixel art: no anti-aliasing, no resampling
other than NEAREST, colours snapped to the Game Boy Color's 15-bit space.

Run any tool with a Python that has Pillow + numpy, e.g. the sprite
pipeline's venv:
  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/tiles.py
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "public" / "assets"
REVIEW = Path(__file__).resolve().parent / "review"

CLEAR = (0, 0, 0, 0)


def hexc(h: str) -> tuple[int, int, int, int]:
    """'#rrggbb' -> RGBA, snapped to GBC 5-bit channels."""
    h = h.lstrip("#")
    rgb = [int(h[i:i + 2], 16) for i in (0, 2, 4)]
    return tuple(min(248, round(v / 8) * 8) for v in rgb) + (255,)


# ---------------------------------------------------------------------------
# Master colour list. Every tile/structure/character picks from these so the
# whole game reads as one set. Names: family + 0 (lightest) .. 3 (darkest).
# ---------------------------------------------------------------------------
C = {k: hexc(v) for k, v in {
    "k": "#181818", "white": "#f8f8f8", "offwhite": "#f0f0e0",
    # grass / foliage
    "g0": "#d8f8a0", "g1": "#a0d868", "g2": "#58a040", "g3": "#205828",
    "f0": "#88c858", "f1": "#489838", "f2": "#286828", "f3": "#103818",  # deep foliage
    # path, dirt, sand
    "p0": "#f8f0c8", "p1": "#e8d098", "p2": "#c8a868", "p3": "#886838",
    "d0": "#e0b878", "d1": "#c09050", "d2": "#906830", "d3": "#583818",
    "s0": "#f8f8e0", "s1": "#f0e0a8", "s2": "#d8c078", "s3": "#a88850",
    # water
    "w0": "#f8f8f8", "w1": "#98d0f8", "w2": "#5090e8", "w3": "#2858b0",
    # wood
    "o0": "#f8d8a0", "o1": "#d8a060", "o2": "#a06830", "o3": "#583818",
    # stone / metal
    "r0": "#f8f8f0", "r1": "#c8c8c0", "r2": "#888890", "r3": "#484850",
    # maple autumn
    "m0": "#f8c850", "m1": "#f08028", "m2": "#b83810", "m3": "#501808",
    # brick / roof red
    "b0": "#f8a080", "b1": "#d86048", "b2": "#a03028", "b3": "#581810",
    # roof blue / slate
    "u0": "#a8c8f8", "u1": "#6888d8", "u2": "#3850a0", "u3": "#182858",
    # greenhouse glass (pale aqua)
    "q0": "#f0f8f8", "q1": "#b8e8e0", "q2": "#70b8b0", "q3": "#306860",
    # bog
    "v0": "#a0a868", "v1": "#687840", "v2": "#405028", "v3": "#202818",
    # purple / berry
    "x0": "#e0b8f0", "x1": "#a868c8", "x2": "#683888", "x3": "#301840",
    # yellow
    "y0": "#f8f8a8", "y1": "#f8d838", "y2": "#c8a010", "y3": "#685008",
    # pink / flower
    "n0": "#f8d0e0", "n1": "#f088a8", "n2": "#c04870", "n3": "#601830",
    # skin
    "sk0": "#f8d8b0", "sk1": "#e0a878", "sk2": "#a87048", "sk3": "#684028",
}.items()}


def img_from_rows(rows: list[str], key: dict[str, object]) -> Image.Image:
    """ASCII pixel map -> RGBA image. `key` maps a character to a colour name
    in C, an RGBA tuple, or None (transparent)."""
    h, w = len(rows), max(len(r) for r in rows)
    im = Image.new("RGBA", (w, h), CLEAR)
    px = im.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            v = key.get(ch, None) if ch in key else None
            if ch not in key:
                raise KeyError(f"no colour for {ch!r} (row {y}: {row})")
            if v is None:
                continue
            px[x, y] = C[v] if isinstance(v, str) else v
    return im


def to_array(im: Image.Image) -> np.ndarray:
    return np.asarray(im.convert("RGBA")).copy()


def from_array(a: np.ndarray) -> Image.Image:
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def outline(im: Image.Image, colour="k", diagonal=False) -> Image.Image:
    """1px outline around opaque pixels (into transparent ones)."""
    a = to_array(im)
    solid = a[..., 3] > 0
    ring = np.zeros_like(solid)
    shifts = [(0, 1), (0, -1), (1, 0), (-1, 0)]
    if diagonal:
        shifts += [(1, 1), (1, -1), (-1, 1), (-1, -1)]
    for dy, dx in shifts:
        ring |= np.roll(np.roll(solid, dy, 0), dx, 1) & ~_edge_wrap(solid.shape, dy, dx)
    ring &= ~solid
    c = C[colour] if isinstance(colour, str) else colour
    a[ring] = c
    return from_array(a)


def _edge_wrap(shape, dy, dx):
    """Mask of pixels that np.roll wrapped around (so they aren't real neighbours)."""
    m = np.zeros(shape, bool)
    if dy > 0:
        m[:dy] = True
    if dy < 0:
        m[dy:] = True
    if dx > 0:
        m[:, :dx] = True
    if dx < 0:
        m[:, dx:] = True
    return m


def colours(im: Image.Image) -> set:
    a = to_array(im)
    return {tuple(p) for p in a.reshape(-1, 4) if p[3] > 0}


def quad_colour_counts(im: Image.Image, cell=8) -> int:
    """Max opaque colours in any 8x8 cell (GBC: <=4 per background tile)."""
    a = to_array(im)
    worst = 0
    for y in range(0, a.shape[0], cell):
        for x in range(0, a.shape[1], cell):
            blk = a[y:y + cell, x:x + cell].reshape(-1, 4)
            worst = max(worst, len({tuple(p) for p in blk if p[3] > 0}))
    return worst


def save(im: Image.Image, rel: str) -> Path:
    """Save under public/assets/<rel>. RGBA PNG, no smoothing ever."""
    p = ASSETS / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    im.save(p)
    return p


def zoom(im: Image.Image, k: int) -> Image.Image:
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def on_bg(im: Image.Image, bg=(232, 232, 224, 255)) -> Image.Image:
    base = Image.new("RGBA", im.size, bg)
    base.alpha_composite(im.convert("RGBA"))
    return base


def grid_sheet(cells: list[tuple[str, Image.Image]], cols: int, scale: int,
               pad=6, label=True, bg=(232, 232, 224, 255)) -> Image.Image:
    """Review sheet: cells laid out in a grid, each scaled, with a label."""
    from PIL import ImageDraw
    cw = max(c.width for _, c in cells) * scale
    ch = max(c.height for _, c in cells) * scale
    lh = 12 if label else 0
    rows = (len(cells) + cols - 1) // cols
    sheet = Image.new("RGBA", (pad + cols * (cw + pad), pad + rows * (ch + lh + pad)), bg)
    d = ImageDraw.Draw(sheet)
    for i, (name, c) in enumerate(cells):
        x = pad + (i % cols) * (cw + pad)
        y = pad + (i // cols) * (ch + lh + pad)
        z = zoom(c.convert("RGBA"), scale)
        sheet.alpha_composite(z, (x, y + lh))
        if label:
            d.text((x, y), name[: max(4, cw // 6)], fill=(40, 40, 40, 255))
    return sheet
