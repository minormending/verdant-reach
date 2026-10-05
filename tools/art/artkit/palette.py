"""Palettes: hex helpers, darkest-to-lightest ordering, index remaps and the
legacy sport hue shift (used once, to seed `sport` palettes on migration)."""

from __future__ import annotations

import math
from typing import Iterable, Sequence

import numpy as np

RGB = tuple[int, int, int]


def hex_of(c: Sequence[int]) -> str:
    return "#%02x%02x%02x" % tuple(int(v) for v in c[:3])


def rgb_of(h: str) -> RGB:
    h = h.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(ch * 2 for ch in h)
    if len(h) != 6:
        raise ValueError(f"bad colour {h!r}")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def luma(c: Sequence[int]) -> float:
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def order_dark_to_light(cols: Iterable[RGB]) -> list[RGB]:
    return sorted(set(tuple(c) for c in cols), key=lambda c: (luma(c), c))  # type: ignore[arg-type]


def opaque_colours(*frames: np.ndarray) -> set[RGB]:
    out: set[RGB] = set()
    for a in frames:
        px = a.reshape(-1, 4)
        px = px[px[:, 3] > 0]
        out |= {tuple(int(v) for v in p[:3]) for p in np.unique(px, axis=0)}  # type: ignore[misc]
    return out


def palette_of(*frames: np.ndarray) -> list[str]:
    return [hex_of(c) for c in order_dark_to_light(opaque_colours(*frames))]


def _js_round(x: float) -> int:
    return math.floor(x + 0.5)


def legacy_sport_colour(c: RGB) -> RGB:
    """Exactly `sportVersion` in src/screens/kit/draw.ts (Round 1-3): rotate
    hue green->gold, red->violet, blue->teal; near-greys (max-min < 24) kept."""
    r, g, b = c
    if max(r, g, b) - min(r, g, b) < 24:
        return c
    return (min(255, _js_round(g * 0.95 + r * 0.25)),
            min(255, _js_round(g * 0.85 + b * 0.25)),
            min(255, _js_round(r * 0.55 + b * 0.2)))


def legacy_sport(palette: Sequence[str]) -> list[str]:
    return [hex_of(legacy_sport_colour(rgb_of(h))) for h in palette]


def remap(a: np.ndarray, src: Sequence[str], dst: Sequence[str]) -> np.ndarray:
    """Recolour index by index: every opaque pixel equal to src[i] becomes
    dst[i]. Pixels matching no src colour are left alone."""
    if len(src) != len(dst):
        raise ValueError("palettes differ in length")
    out = a.copy()
    rgb = a[..., :3]
    opaque = a[..., 3] > 0
    for s, d in zip(src, dst):
        m = opaque & np.all(rgb == np.array(rgb_of(s), np.uint8), axis=-1)
        out[m, :3] = rgb_of(d)
    return out


def quantize(a: np.ndarray, palette: Sequence[str], alpha_cut: int = 128) -> np.ndarray:
    """Snap an RGBA image to a palette (nearest colour, weighted RGB) with
    binary alpha. Used when importing outside art."""
    pal = np.array([rgb_of(h) for h in palette], np.float32)
    out = np.zeros_like(a)
    opaque = a[..., 3] >= alpha_cut
    px = a[..., :3].astype(np.float32)
    w = np.array([0.30, 0.59, 0.11], np.float32)
    d = (((px[..., None, :] - pal[None, None, :, :]) ** 2) * w).sum(-1)
    idx = d.argmin(-1)
    out[..., :3] = pal[idx].astype(np.uint8)
    out[..., 3] = np.where(opaque, 255, 0)
    out[~opaque] = 0
    return out
