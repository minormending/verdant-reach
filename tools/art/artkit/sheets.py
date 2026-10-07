"""Tileset sheets: assemble per-tile images into a sheet + key map, and explode
a sheet back into per-tile images.

Per-tile images are named with the legacy stems, which are also the names
`art.py explode` writes and `art.py pack` reads:

    <key>            base, frame 1          <key>__2         base, frame 2
    <key>~<n>        alt n (1..5, static)
    <key>@<m>        mask m (0..15) frame 1 <key>@<m>__2     mask m, frame 2

Sheet layout written by `assemble` (16 columns):
  1. keys without masks, packed in order: base frame(s) then alts;
  2. then each masked key on fresh rows: [base frame(s), alts] on one row,
     then a row with mask m in column m (frame 1), then the same for frame 2
     if the tile is animated. So a mask always sits in the column of its number.
"""

from __future__ import annotations

import re
from typing import Iterable

import numpy as np

TILE = 16
COLUMNS = 16
STEM_RE = re.compile(r"^(?P<key>[a-z0-9_]+?)(?:~(?P<alt>[1-5])|@(?P<mask>\d{1,2}))?(?:__(?P<frame>2))?$")


def parse_stem(stem: str) -> tuple[str, str, int, int]:
    """'water@5__2' -> ('water', 'mask', 5, 2). Kinds: base, alt, mask."""
    m = STEM_RE.match(stem)
    if not m:
        raise ValueError(f"not a tile stem: {stem!r}")
    frame = 2 if m.group("frame") else 1
    if m.group("alt"):
        return m.group("key"), "alt", int(m.group("alt")), frame
    if m.group("mask") is not None:
        n = int(m.group("mask"))
        if not 0 <= n <= 15:
            raise ValueError(f"mask out of range: {stem!r}")
        return m.group("key"), "mask", n, frame
    return m.group("key"), "base", 0, frame


def stem_of(key: str, kind: str, n: int, frame: int) -> str:
    s = key if kind == "base" else f"{key}~{n}" if kind == "alt" else f"{key}@{n}"
    return s + ("__2" if frame == 2 else "")


def _ref(cells: list[int]):
    return cells[0] if len(cells) == 1 else list(cells)


def _cells(ref) -> list[int]:
    return [ref] if isinstance(ref, int) else list(ref)


def group_stems(stems: Iterable[str]) -> dict[str, dict]:
    """stems -> {key: {"base": {1: stem, 2: stem}, "alt": {n: {1: stem}}, "mask": {m: {f: stem}}}}"""
    out: dict[str, dict] = {}
    for s in stems:
        key, kind, n, frame = parse_stem(s)
        d = out.setdefault(key, {"base": {}, "alt": {}, "mask": {}})
        if kind == "base":
            d["base"][frame] = s
        else:
            d[kind].setdefault(n, {})[frame] = s
    return out


def assemble(images: dict[str, np.ndarray], order: Iterable[str] = ()) -> tuple[np.ndarray, dict, int]:
    """Per-tile images (by stem) -> (sheet RGBA, tiles map, columns)."""
    groups = group_stems(images)
    keys = [k for k in order if k in groups] + sorted(k for k in groups if k not in set(order))
    for k in keys:
        g = groups[k]
        if 1 not in g["base"]:
            raise ValueError(f"tile {k!r} has no base image")
        if 2 in g["base"] and len(g["base"]) != 2:
            raise ValueError(f"tile {k!r}: frame 2 without frame 1")
        for n, fr in g["alt"].items():
            if 2 in fr:
                raise ValueError(f"tile {k!r}: alts are static (found {k}~{n}__2)")
    placed: list[tuple[int, str]] = []   # (cell, stem)
    tiles: dict[str, dict] = {}
    cursor = 0

    def take(stem: str, cell: int) -> int:
        placed.append((cell, stem))
        return cell

    simple = [k for k in keys if not groups[k]["mask"]]
    masked = [k for k in keys if groups[k]["mask"]]
    for k in simple + masked:
        g = groups[k]
        if g["mask"] and cursor % COLUMNS:
            cursor += COLUMNS - cursor % COLUMNS
        entry: dict = {}
        base = []
        for f in sorted(g["base"]):
            base.append(take(g["base"][f], cursor))
            cursor += 1
        entry["base"] = _ref(base)
        if g["alt"]:
            alts = []
            for n in sorted(g["alt"]):
                alts.append(take(g["alt"][n][1], cursor))
                cursor += 1
            entry["alts"] = alts
        if g["mask"]:
            cursor += COLUMNS - cursor % COLUMNS if cursor % COLUMNS else 0
            nframes = max(max(fr) for fr in g["mask"].values())
            row0 = cursor
            masks: dict[str, list[int]] = {}
            for f in range(1, nframes + 1):
                for m in sorted(g["mask"]):
                    if f in g["mask"][m]:
                        masks.setdefault(str(m), []).append(take(g["mask"][m][f], row0 + (f - 1) * COLUMNS + m))
            entry["masks"] = {m: _ref(c) for m, c in sorted(masks.items(), key=lambda kv: int(kv[0]))}
            cursor = row0 + nframes * COLUMNS
        tiles[k] = entry
    ncells = max([c for c, _ in placed] + [-1]) + 1
    rows = max(1, -(-ncells // COLUMNS))
    sheet = np.zeros((rows * TILE, COLUMNS * TILE, 4), np.uint8)
    for cell, stem in placed:
        a = images[stem]
        if a.shape[:2] != (TILE, TILE):
            raise ValueError(f"{stem} is {a.shape[1]}x{a.shape[0]}, want 16x16")
        x, y = (cell % COLUMNS) * TILE, (cell // COLUMNS) * TILE
        sheet[y:y + TILE, x:x + TILE] = a
    return sheet, tiles, COLUMNS


def cell(sheet: np.ndarray, n: int, columns: int, size: int = TILE) -> np.ndarray:
    x, y = (n % columns) * size, (n // columns) * size
    return sheet[y:y + size, x:x + size].copy()


def refs_of(entry: dict) -> list[tuple[str, int, int, int]]:
    """A tile entry -> [(kind, n, frame, cell)]."""
    out = []
    for f, c in enumerate(_cells(entry["base"]), 1):
        out.append(("base", 0, f, c))
    for n, ref in enumerate(entry.get("alts", []), 1):
        out.append(("alt", n, 1, _cells(ref)[0]))
    for m, ref in entry.get("masks", {}).items():
        for f, c in enumerate(_cells(ref), 1):
            out.append(("mask", int(m), f, c))
    return out


def explode(sheet: np.ndarray, tiles: dict, columns: int, size: int = TILE) -> dict[str, np.ndarray]:
    """Sheet + key map -> {stem: 16x16 RGBA} (inverse of `assemble`)."""
    out = {}
    for key, entry in tiles.items():
        for kind, n, f, c in refs_of(entry):
            out[stem_of(key, kind, n, f)] = cell(sheet, c, columns, size)
    return out
