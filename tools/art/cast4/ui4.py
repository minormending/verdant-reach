"""Chapter 4 UI art -> public/art/sets/ui/.

  mark_rose      16x16 Pressed Mark for FLORA VANCE: the same tiny herbarium
                 sheet as mark_bramble / mark_sundew (cream mounting paper,
                 gummed tape over the stem, the label in the lower right),
                 with a pressed rose: a flattened crimson bloom, a bud, a
                 thorny stem and two leaves.
  seed, seed__2  16x16 party icon for an unsprouted Nursery seed: a plump,
                 warm-brown seed with a pale seam and the first green tip
                 showing. Frame 2 squashes and rocks it, as if something
                 inside just turned over.
  seed_big       56x56 summary / sprouting art: the same seed up close,
                 glossy and warm, the green tip just breaking the seam, gold
                 motes around it.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402,F401

import gbc  # noqa: E402
from gbc import img_from_rows  # noqa: E402
from portraits import Portrait  # noqa: E402


def _key(d):
    return {k: (gbc.hexc(v) if isinstance(v, str) and v.startswith("#") else v) for k, v in d.items()}


# ----------------------------------------------------------------- mark ----
def mark_rose():
    sheet = (["..KKKKKKKKKKKKK."] + ["..KPPPPPPPPPPpKS"] * 10 +
             ["..KPPPPPPLLLLpKS", "..KPPPPPPLllLpKS", "..KPPPPPPLLLLpKS", "..KpppppppppppKS",
              "..KKKKKKKKKKKKKS"])
    sheet = sheet[:15] + ["...SSSSSSSSSSSSS"]
    spec = {
        # thorny stem curving up from the lower left
        "s": [(4, 13), (5, 12), (5, 11), (6, 10), (6, 9), (7, 8), (7, 7), (8, 6), (9, 7), (10, 6)],
        "t": [(4, 11), (7, 10), (6, 7)],
        # two pinnate leaves
        "g": [(3, 9), (4, 9), (4, 8), (8, 9), (9, 9), (9, 10)],
        "G": [(3, 10), (5, 8), (10, 9), (8, 10)],
        # the pressed bloom: a flattened rosette of petals
        "r": [(6, 3), (7, 2), (8, 2), (9, 3)],
        "b": [(5, 4), (6, 4), (8, 4), (9, 4), (10, 4), (6, 5), (7, 5), (9, 5), (7, 3), (8, 3), (10, 3)],
        "B": [(7, 4), (8, 5), (10, 5), (5, 5)],
        # sepals under the bloom, and a closed bud on a side shoot
        "q": [(7, 6), (9, 6)],
        "u": [(11, 5), (11, 4)],
        "U": [(12, 4)],
        "T": [(5, 10), (7, 10)],
    }
    rows = [list(r) for r in sheet]
    for ch, pts in spec.items():
        for x, y in pts:
            if rows[y][x] in "Pp":
                rows[y][x] = ch
    rows = ["".join(r) for r in rows]
    key = {".": None, "K": "k", "P": "#f0e8c8", "p": "#c8b890", "L": "#f8f8f0", "l": "#988868",
           "s": "#5a6a30", "t": "#a04848", "g": "#88a050", "G": "#5a7a38", "q": "#5a7a38",
           "r": "#e07888", "b": "#b03850", "B": "#702038", "u": "#b03850", "U": "#702038",
           "T": "#e0d8b8", "S": "#887850"}
    return img_from_rows(rows, _key(key))


# ----------------------------------------------------------------- seed ----
SEED_KEY = {".": None, "K": "k", "H": "#f8e0b0", "O": "#e0a060", "o": "#b06830", "D": "#703818",
            "W": "#f8f0d0", "g": "#98d060", "G": "#489838", "y": "#f8e070"}

SEED_A = [
    "................",
    "................",
    "..........KK....",
    ".........KgGK...",
    "......KKKKGK....",
    ".....KHHWKK.....",
    "....KHOOWOoK....",
    "....KHOOWOoK....",
    "...KHOOOWOooK...",
    "...KHOOOWOooK...",
    "...KOOOOWOooK...",
    "...KOOOOWOoDK...",
    "....KOOOWoDK....",
    "....KoooWDDK....",
    ".....KKKKKK.....",
    "................",
]
SEED_B = [
    "................",
    "................",
    "..y.............",
    "...........KK...",
    ".......KKKKgGK..",
    ".....KKHHWKKK...",
    "....KHHOOWOoK...",
    "...KHOOOOWOooK..",
    "...KHOOOOWOooK..",
    "...KOOOOOWOooK..",
    "...KOOOOOWOooK..",
    "...KOOOOOWOoDK..",
    "....KOOOOWoDK...",
    "....KooooWDDK...",
    ".....KKKKKKK....",
    "................",
]


def seed_icon(frame):
    return img_from_rows(SEED_A if frame == 0 else SEED_B, _key(SEED_KEY))


def seed_big():
    """56x56. A plump teardrop seed filling ~42px, bottom-centred like a
    baby-size front sprite, lit from the top-left: a warm brown coat with
    a few speckles, a pale seam curving down its belly, a gloss stroke,
    and the first green tip just splitting the seam at the top. Gold
    motes around it say something inside is awake."""
    import math
    p = Portrait()
    cx, cy = 28, 36
    # an almond-egg: convex everywhere, a little narrower toward the top
    import numpy as np
    body = np.zeros((56, 56), bool)
    top, bot, rx = 13, 53, 15.5
    for y in range(top, bot + 1):
        t = (y - (top + bot) / 2) / ((bot - top) / 2)          # -1 top .. 1 bottom
        hw = rx * max(0.0, 1 - t * t) ** 0.55 * (0.86 + 0.14 * (t + 1) / 2)
        for x in range(56):
            if hw >= 1.5 and abs(x + 0.5 - (cx + 0.5)) <= hw:
                body[y, x] = True
    p.add(body, "#e0a060", "#b06830", hi="#f8d8a0", shade_off=(4, 3), hi_off=(3, 3))
    # deep shadow core on the lower right
    for y in range(cy - 4, 54):
        for x in range(cx + 3, 45):
            if body[y, x] and not body[min(55, y + 3), min(55, x + 3)]:
                p.px(x, y, "#703818")
    # seam: a pale ridge curving from the tip down the belly
    for y in range(13, 52):
        t = (y - 12) / 40
        sx = int(round(cx + 1 + 3.5 * math.sin(t * math.pi * 0.9)))
        if body[y, sx] and body[y, sx + 1]:
            p.px(sx, y, "#f8f0d0")
            p.px(sx + 1, y, "#a05828")
    # speckles, sparse, more on the shaded side
    for x, y in [(20, 37), (23, 44), (35, 27), (37, 38), (34, 47), (19, 45), (24, 27), (38, 32), (33, 21)]:
        p.px(x, y, "#c07838" if x < 30 else "#a05828")
    # gloss: a deliberate curved stroke on the upper left
    for x, y in [(17, 36), (17, 35), (17, 34), (18, 32), (19, 30), (20, 28), (21, 26), (22, 25)]:
        p.px(x, y, "#f8f8e8")
    p.px(19, 39, "#f8d8a0")
    # the green tip, a curled shoot nosing out of the split near the top
    p.add(p.line([(30, 17), (32, 13), (35, 10), (38, 10)], 3), "#98d060", "#489838",
          hi="#d8f8a0", shade_off=(1, 1), hi_off=(1, 1))
    p.add(p.poly([(37, 8), (43, 5), (44, 9), (39, 12)]), "#98d060", "#489838", hi="#d8f8a0",
          shade_off=(1, 1), hi_off=(1, 1))
    p.pxs([(33, 11), (34, 10)], "#d8f8a0")
    # gold motes
    for x, y, big in [(10, 18, True), (46, 12, False), (44, 30, True), (8, 40, False)]:
        p.px(x, y, "#f8f0a0")
        if big:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                p.px(x + dx, y + dy, "#f8d040")
    return p.render()


def images():
    return {"mark_rose": mark_rose(), "seed": seed_icon(0), "seed__2": seed_icon(1), "seed_big": seed_big()}


def build(write=True):
    out = images()
    if write:
        common.write_set_images("ui", out, "ui4.py")
    cells = [(k, gbc.on_bg(v)) for k, v in out.items()]
    gbc.grid_sheet(cells, 4, 6).save(common.REVIEW / "ui_ch4.png")
    return out


if __name__ == "__main__":
    build(write="--scratch" not in sys.argv)
