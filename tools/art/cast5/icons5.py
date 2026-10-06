"""Chapter 5 icons -> public/art/sets/items/ and public/art/sets/ui/ (16x16).

Same craft as tools/art/items.py and cast4/items4.py: hand-authored ASCII,
1px black outline, a few colours each, light from the top-left,
transparent background. The Mark follows cast4/ui4.py's tiny herbarium
sheet exactly (cream mounting paper, gummed tape, the label lower right).

  mark_pipe        PIPE MARK (MORROW): a pressed ghost pipe on the sheet, a
                   waxy stem hooked over into one nodding bell, a smaller
                   stem beside it, both taped down; pale lilac on cream
  foxfire_lantern  FOXFIRE JAR (key item, GLOW): a stoppered glass jar on a
                   wire bail, clumps of fungus inside glowing green-white,
                   the light spilling out round it
  ember_ash        EMBER ASH (opens a sealed cone): a small heap of grey ash
                   with ember flecks still glowing in it and a curl of smoke
  glider_seed      GLIDER SEED (SEED GLIDE): the winged seed of Alsomitra, a
                   wide papery wing swept back either side of the seed, with
                   fine veins
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common5 as common  # noqa: E402

import gbc  # noqa: E402
from gbc import img_from_rows  # noqa: E402


def _key(d):
    return {k: (gbc.hexc(v) if isinstance(v, str) and v.startswith("#") else v) for k, v in d.items()}


def icon(rows, key):
    assert len(rows) == 16 and all(len(r) == 16 for r in rows), [len(r) for r in rows]
    return img_from_rows(rows, _key({".": None, "K": "k", **key}))


# ----------------------------------------------------------------- mark ----
SHEET = (["..KKKKKKKKKKKKK."] + ["..KPPPPPPPPPPpKS"] * 10 +
         ["..KPPPPPPLLLLpKS", "..KPPPPPPLllLpKS", "..KPPPPPPLLLLpKS", "..KpppppppppppKS"] +
         ["...SSSSSSSSSSSSS"])

MARK_SPEC = [
    # (letter, points); painted only onto paper, later entries win
    # the tall stem rising from the lower left, hooked over at the top
    ("s", [(5, 13), (5, 12), (5, 11), (5, 9), (5, 8), (6, 7), (6, 6), (6, 5), (6, 4), (7, 3), (7, 2), (8, 2)]),
    # a shorter stem beside it
    ("s", [(8, 13), (8, 12), (8, 11), (8, 9), (9, 8), (10, 8)]),
    # the nodding bells, mouths to the ground: waxy white, lilac underneath
    ("w", [(8, 3), (9, 3), (8, 4)]),
    ("b", [(10, 3), (9, 4), (10, 4), (8, 5), (9, 5), (10, 9), (11, 9)]),
    ("v", [(10, 5), (11, 4), (11, 10)]),
    ("m", [(9, 6), (10, 6), (10, 10)]),
    # scale leaves pressed flat, and gummed tape across both stems
    ("e", [(4, 8), (7, 6), (9, 11)]),
    ("T", [(4, 10), (5, 10), (6, 10), (7, 10), (8, 10), (9, 10)]),
]
MARK_KEY = {"P": "#f0e8c8", "p": "#c8b890", "L": "#f8f8f0", "l": "#988868", "S": "#887850",
            "s": "#9080a8", "w": "#f8f8f8", "b": "#e0d8e8", "v": "#9080a8", "m": "#584870",
            "e": "#c8c0d0", "T": "#e0d8b8"}


def mark_pipe():
    rows = [list(r) for r in SHEET]
    for ch, pts in MARK_SPEC:
        for x, y in pts:
            if rows[y][x] in "Pp" or (rows[y][x] in "swbvme" and ch != "s"):
                rows[y][x] = ch
    return icon(["".join(r) for r in rows], MARK_KEY)


# ---------------------------------------------------------------- items ----
FOXFIRE = [
    ".....KKKKKK.....",
    "....Kr....rK....",
    "....K.KKKK.K....",
    "....KKcccCKK....",
    "....KKKKKKKK....",
    "...KqqqqqqqQK...",
    ".g.KqWqqqqqQK.g.",
    "...KqWqGGqqQK...",
    "...KqqGWWGqQK.g.",
    ".g.KqGWWGGgQK...",
    "...KGWGgGWGgK...",
    "...KgGgddgGgK.g.",
    "...KdddddddDK...",
    "....KQQQQQQK....",
    ".....KKKKKK.....",
    "................",
]


def foxfire_lantern():
    return icon(FOXFIRE, {"r": "#888890", "c": "#c89058", "C": "#885830", "q": "#d8f0e0", "Q": "#80b0a0",
                          "g": "#88d078", "G": "#c8f0a0", "W": "#f8f8e8", "d": "#6a4828", "D": "#4a3018"})


EMBER_ASH = [
    "................",
    "........s.......",
    ".......s........",
    "........s.......",
    ".......s.s......",
    "......s.........",
    "................",
    "......KKKK......",
    "....KKaaAaKK....",
    "...KaaAeaAaaK...",
    "..KaAaaaAaEaAK..",
    "..KaaeaAaaaaaK..",
    ".KAaaaaaeaAaaaK.",
    ".KaaAaEaaaaAddK.",
    "..KKddddddddKK..",
    "....KKKKKKKK....",
]


def ember_ash():
    return icon(EMBER_ASH, {"a": "#a0a0a8", "A": "#d0d0d8", "d": "#686870", "e": "#f08030", "E": "#f8d060",
                            "s": "#b8b8c0"})


GLIDER = [
    "................",
    "................",
    "................",
    "......KKKK......",
    "....KKOooOKK....",
    "..KKwwvOOvwwKK..",
    ".KWWwvwwwwvwwwK.",
    "KWWwvwwvvwwvwwwK",
    "KWwvwKKKKKKwvwwK",
    "KWwwK......KwwwK",
    "KWwK........KwwK",
    ".KK..........KK.",
    "................",
    "................",
    "................",
    "................",
]


def glider_seed():
    return icon(GLIDER, {"w": "#f0e8c8", "W": "#f8f8f0", "v": "#c8b890", "o": "#a06830", "O": "#c88850"})


def images():
    return {"items": {"foxfire_lantern": foxfire_lantern(), "ember_ash": ember_ash(),
                      "glider_seed": glider_seed()},
            "ui": {"mark_pipe": mark_pipe()}}


def build(write=True):
    out = images()
    if write:
        common.write_set_images("items", out["items"], "icons5.py")
        common.write_set_images("ui", out["ui"], "icons5.py")
    cells = [(k, gbc.on_bg(v)) for group in out.values() for k, v in group.items()]
    gbc.grid_sheet(cells, 4, 6).save(common.REVIEW / "icons_ch5.png")
    return out


if __name__ == "__main__":
    build(write="--scratch" not in sys.argv)
