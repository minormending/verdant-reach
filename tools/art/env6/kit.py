"""Chapter 6 environment plumbing: native pixels, deterministic artkit output.

The authoring approach matches env5; no reference sprites are copied or traced.
Tiles use four colours total, stronger than the four-per-quadrant requirement.
"""
from pathlib import Path
import sys

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE.parent))
from artkit import emit
from artkit.core import save_png

REVIEW = HERE.parent / "review"
WATER = ("#c8e8f8", "#68a8e8", "#58a040", "#285828")
POOL = ("#c8e8f8", "#68a8e8", "#787878", "#383840")
ROOTS = ("#d8c098", "#a08868", "#68a8e8", "#304848")
WOOD = ("#e8d8b0", "#b8a888", "#685850", "#304858")
SALT = ("#f0e8c8", "#d8d0b0", "#b8b098", "#888878")
SCRUB = ("#706860", "#789858", "#487048", "#384838")
BASALT = ("#988878", "#706860", "#504850", "#303038")
STEAM = ("#d8e0d0", "#a0b0a8", "#706860", "#303038")
DUNE = ("#f0e8c8", "#d8d0b0", "#a09860", "#707848")
DRIFTWOOD = ("#f0e8c8", "#d8d0b0", "#a08868", "#685850")
SHORE_ROCK = ("#f0e8c8", "#d8d0b0", "#a0a8a0", "#606870")
VENT_MOSS = ("#d8d080", "#789858", "#504850", "#303038")
CREDITS = "Original hand-pixelled Chapter 6 environment for Verdant Reach; no copied or traced game art."


def image(a, palette):
    rgba = np.array([tuple(bytes.fromhex(c[1:])) + (255,) for c in palette], np.uint8)
    return Image.fromarray(rgba[a], "RGBA")


def line(a, points, colour, width=1):
    # Pillow raster lines have no antialiasing and are stable at the pinned version.
    from PIL import ImageDraw
    im = Image.fromarray(a.astype(np.uint8), "L")
    ImageDraw.Draw(im).line(points, fill=colour, width=width)
    a[:] = np.asarray(im)


def hash2(x, y, salt=0):
    # The runtime's position hash (src/overworld/autotile.ts).
    h = ((x * 374761393 + y * 668265263 + salt * 1013904223) & 0xffffffff)
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return h ^ (h >> 16)
