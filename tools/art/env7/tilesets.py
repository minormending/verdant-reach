"""Original frontier terrain, following env5's clustered, top-left-lit style.

Each family has exactly four tones; black is reserved for gorge/pit depth.
No stochastic draws, antialiasing or borrowed tile art. Ice's joined edges
are constant, so every reciprocal mask pair meets pixel-for-pixel.
"""

from __future__ import annotations

import numpy as np
from PIL import Image, ImageDraw

# Light -> dark. Cool shadows and warm root/stone highlights, on the GBC grid.
PALETTES = {
    "ice": ("#f8f8f0", "#d0e8f0", "#a0c8e0", "#7098b8"),
    "snow": ("#f8f8f0", "#e8f0f8", "#c8d8e8", "#a0b8d0"),
    "roots": ("#d8b878", "#a88050", "#584850", "#181818"),
    "stone": ("#f0f0e8", "#b8b8b0", "#687080", "#181818"),
}
ORDER = ["ice", "snow", "root_gap", "root_bridge", "pit", "filled_pit"]


def canvas(tone=1):
    return Image.new("L", (16, 16), tone)


def rgba(im, family):
    ramp = np.array([tuple(bytes.fromhex(h[1:])) + (255,) for h in PALETTES[family]], np.uint8)
    return Image.fromarray(ramp[np.asarray(im)], "RGBA")


def ice(mask=15):
    """Inset frost on exposed sides; the constant outer row joins all masks.

The inset lip avoids baking a particular ground colour into ice: the same
sheet can meet conservatory flagstones, mountain rock or snow.
"""
    im = canvas(1)
    d = ImageDraw.Draw(im)
    # Two diagonal glint clusters, away from the seam and the frost band.
    d.line([(4, 7), (7, 4)], fill=0)
    d.line([(4, 8), (8, 4)], fill=2)
    d.line([(9, 12), (12, 9)], fill=0)
    d.line([(10, 12), (12, 10)], fill=2)
    for bit, transform in (
        (1, lambda p, q: (p, q)), (2, lambda p, q: (15-q, p)),
        (4, lambda p, q: (p, 15-q)), (8, lambda p, q: (q, p)),
    ):
        if mask & bit:
            continue
        for p in range(1, 15):
            depth = 2 + (p in (3, 4, 10, 11))
            for q in range(1, depth + 1):
                im.putpixel(transform(p, q), 0 if q < depth else 2)
            if bit in (2, 4) and 4 <= p <= 11:
                im.putpixel(transform(p, depth + 1), 3)
    return rgba(im, "ice")


def snow(alt=0, frame=1):
    im = canvas(1)
    d = ImageDraw.Draw(im)
    # Broad soft drifts; dimples carry a short blue shadow on the lower rim.
    dimples = (((3, 4), (10, 11)), ((9, 3), (3, 11)),
               ((3, 8), (10, 4)), ((8, 10), (3, 3)))[alt]
    for x, y in dimples:
        d.line((x, y, x + 2, y), fill=0)
        d.line((x + 1, y + 1, x + 3, y + 1), fill=2)
    # Only loose powder moves; the ground dimples remain registered.
    x, y = (9, 5) if frame == 1 else (10, 4)
    d.line((x, y, x + 2, y), fill=0)
    d.line((x + 1, y + 1, x + 2, y + 1), fill=3)
    return rgba(im, "snow")


def root_gap(bridged=False):
    im = canvas(1)
    d = ImageDraw.Draw(im)
    # A north/south fissure with earth banks on both sides. The two ends of
    # the east/west crossing therefore retain exactly the same bank pixels.
    d.rectangle((5, 0, 10, 15), fill=3)
    for y in range(16):
        bank = 3 + (y in (3, 4, 10, 11))
        d.line((bank, y, 4, y), fill=2)
        d.line((11, y, 12 + (y in (6, 7)), y), fill=2)
    d.line((1, 3, 2, 3), fill=0)
    d.line((13, 11, 14, 11), fill=0)
    # Visible far wall; never a white glint in the deep void.
    d.line((5, 1, 5, 4), fill=2)
    d.line((10, 10, 10, 13), fill=2)
    if bridged:
        # Three broad strands weave over/under one another. Roots thicken
        # into the banks rather than ending like cut planks or a ladder.
        strands = (
            [(1, 6), (4, 5), (7, 6), (10, 8), (14, 7)],
            [(1, 9), (4, 8), (7, 8), (10, 6), (14, 6)],
            [(2, 10), (5, 10), (8, 9), (11, 10), (14, 9)],
        )
        for points in strands:
            d.line([(x, y + 1) for x, y in points], fill=2, width=3)
            d.line(points, fill=1, width=2)
            d.line([(x, y - 1) for x, y in points], fill=0)
        # Short collars at each crossing distinguish braided living roots.
        d.line((6, 6, 7, 7), fill=2)
        d.line((9, 8, 10, 9), fill=2)
        d.line((3, 5, 3, 7), fill=1)
        d.line((12, 6, 12, 8), fill=1)
    return rgba(im, "roots")


def pit(filled=False):
    # A small flush stone socket is intentional: the hole keeps its identity
    # on grass/dirt as well as on conservatory floors, without transparency.
    im = canvas(1)
    d = ImageDraw.Draw(im)
    d.line((1, 2, 3, 2), fill=0)
    d.line((12, 13, 14, 13), fill=2)
    d.ellipse((1, 2, 14, 14), fill=2)
    d.arc((1, 2, 14, 14), 195, 285, fill=0)
    d.ellipse((2, 3, 13, 13), fill=3)
    if filled:
        # Flat boulder crown, sunk to the socket rim: no upright side wall.
        d.ellipse((2, 3, 13, 13), fill=1)
        d.polygon([(4, 4), (8, 3), (11, 5), (9, 7), (4, 8), (3, 6)], fill=0)
        d.line([(10, 6), (11, 9), (9, 11), (5, 12)], fill=2)
        d.line([(6, 8), (8, 9), (9, 9)], fill=2)
        d.line((6, 7, 8, 7), fill=1)
    else:
        # The cool near wall drops sharply to black, unlike a surface rock.
        d.arc((3, 4, 12, 12), 190, 300, fill=2, width=2)
    return rgba(im, "stone")


def images():
    out = {"ice": ice(), "snow": snow(), "snow__2": snow(frame=2),
           "root_gap": root_gap(), "root_bridge": root_gap(True),
           "pit": pit(), "filled_pit": pit(True)}
    out.update({f"ice@{mask}": ice(mask) for mask in range(16)})
    out.update({f"snow~{alt}": snow(alt) for alt in range(1, 4)})
    return out


def check(out):
    """Check the actual output, including repeats absent from generic tile QA."""
    for stem, im in out.items():
        a = np.asarray(im)
        assert a.shape == (16, 16, 4), stem
        assert (a[:, :, 3] == 255).all(), stem
        assert len(np.unique(a.reshape(-1, 4), axis=0)) <= 4, stem
        for y in (0, 8):
            for x in (0, 8):
                assert len(np.unique(a[y:y+8, x:x+8].reshape(-1, 4), axis=0)) <= 4, stem
        if stem.startswith(("snow", "ice")):
            assert np.array_equal(a[0], a[-1]) and np.array_equal(a[:, 0], a[:, -1]), stem
    for a in range(16):
        for b in range(16):
            aa, bb = np.asarray(out[f"ice@{a}"]), np.asarray(out[f"ice@{b}"])
            if a & 2 and b & 8:
                assert np.array_equal(aa[:, -1], bb[:, 0]), (a, b, "E/W")
            if a & 4 and b & 1:
                assert np.array_equal(aa[-1], bb[0]), (a, b, "S/N")
    # The bridge preserves both banks and the two ends of the gorge.
    gap, bridge = np.asarray(out["root_gap"]), np.asarray(out["root_bridge"])
    assert np.array_equal(gap[:3], bridge[:3])
    assert np.array_equal(gap[13:], bridge[13:])
    snow0, snow1 = np.asarray(out["snow"]), np.asarray(out["snow__2"])
    moved = np.any(snow0 != snow1, axis=2)
    assert 0 < int(moved.sum()) <= 12, "snow: move only loose powder"
