"""Crystal rule, mint line: mint_sprig -> peppermint (Mentha x piperita; frost).

  index 0  #181818  outline, overlaps                         (shared)
  index 1  COLD TEAL: the shade face of the square stem, the sunken veins
           of the crinkled leaves, their shadow side
  index 2  mint green: the leaves and the lit face of the stem
  index 3  #f8f8f8  hoarfrost: the puckered bulges between the veins, the
           lit leaf rims, the frosted flower whorls, frost sparkles

Mint is one hue, so the dark slot is a cold, hue-shifted teal (menthol
feels icy: the frost type) rather than a grey-green. The signature is
the square stem (a lit face and a shade face meeting at a sharp corner) and
the crinkled pairs: each blade's veins are sunk in teal and the puckers
between them catch the frost.

Poses (docs/CREATURES.md, kept from the classic art):
  mint_sprig  BRACED: a stout square-stemmed sprig on two leaf feet, the lead
              leaf raised across the front like a shield, a cupped tuft of
              young leaves for a head, a runner creeping off behind (the tail).
  peppermint  LOOMING: three tiers of crinkled pairs on a thick square stem,
              the lead leaf thrust out over the foe, the rear swept up, a
              frosted flower spike crowning the head and leaning in.

Entrance animations (only the head moves):
  mint_sprig  the head tuft folds shut, then springs open like a fan with a
              puff of frost, holds, and settles.
  peppermint  the crown pair folds in over the spike (anticipation), then
              flares wide as the spike rears and a burst of frost sparkles
              rings it, holds, settles.

Sport: 'Chocolate' mint (Mentha x piperita f. citrata 'Chocolate'):
brown-purple stems and leaves, cocoa-dark veins.

Scores (docs/CREATURES.md §9): mint_sprig 8 (8: the centre of mass sits left
of x 28 because of the shield leaf). peppermint 8 (the striped frosted spike is
the escalation; 3: the crown is close to symmetric).

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/mint.py --preview out.png   scratch sheet
  $PY tools/art/crystal/build.py mint                write the bundles
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _d_kit import (BLACK, WHITE, T, Spr, bez, dilate, erode, frames, place, moving_boxes,  # noqa: E402
                    back_frame, icon_arr, hop, rim_white, mask_px, serrate, stalk, preview, stats, shift)

TOOL = "tools/art/crystal/mint.py"
IDS = ["mint_sprig", "peppermint"]
TEAL = "#287078"
MINT = "#58c890"
PAL = [BLACK, TEAL, MINT, WHITE]
SPORT = [BLACK, "#482838", "#906850", WHITE]
SPAL = (TEAL, MINT, WHITE)


def square_stem(s, ctrl, w0, w1):
    """A square stem: the lit left face mint, the shade right face teal, the
    sharp corner between them a 1px white line on the upper part."""
    path = bez(ctrl, 50)
    m = s.stroke(path, (w0, w1), cap=False)
    pid = s.part(m, base=2, k=0, line=0)
    shade = s.stroke([(x + (w0 + (w1 - w0) * i / len(path)) * 0.22, y) for i, (x, y) in enumerate(path)],
                     lambda t: (w0 + (w1 - w0) * t) * 0.55, cap=False)
    s.decal(shade & m & shift(m, 1, 0), 1, on=[pid])
    edge = m & ~shift(m, -1, 0)
    s.decal(edge & ~shift(edge, 0, 3), 0, on=[pid]) if False else None
    rim_white(s, m, pid, 0.35)
    return pid, m, path


def crinkle_leaf(s, base, tip, w, bend=0.0, veins=3, teeth=6, frost=True, rim=0.45, line=0, fat=0.42):
    """An ovate, serrated, crinkled mint leaf: teal midrib and paired lateral
    veins sunk into the blade; white puckers between the veins on the lit
    half; a teal shadow band on the bottom-right; a white lit rim."""
    poly, path, _ = serrate(base, tip, w, bend=bend, fat=fat, teeth=teeth, depth=0.7, spine=0.0, scallop=0.2)
    m = s.poly(poly)
    pid = s.part(m, base=2, k=2, sh_tone=1, line=line)
    n = len(path)
    s.decal(s.line1(path[int(n * 0.08):int(n * 0.88)]), 1, on=[pid])
    bx, by = base
    tx, ty = tip
    L = math.dist(base, tip)
    ux, uy = (tx - bx) / L, (ty - by) / L
    nx, ny = -uy, ux
    lit = 1 if (nx + ny) < 0 else -1          # the up-left side of the blade
    for j in range(veins):
        t = 0.25 + 0.55 * j / max(1, veins - 1)
        i = int(t * (n - 1))
        x, y = path[i]
        half = w * 0.5 * math.sin(math.pi * t ** 0.9) * 0.85
        for sd in (1, -1):
            end = (x + nx * sd * half + ux * half * 0.75, y + ny * sd * half + uy * half * 0.75)
            s.decal(s.line1(bez([(x, y), end], 8)) & erode(m, 1), 1, on=[pid])
            if frost and sd == lit:
                # the pucker between this vein and the next catches the frost
                c = (x + nx * sd * half * 0.45 + ux * half * 0.55, y + ny * sd * half * 0.45 + uy * half * 0.55)
                pm = s.ellipse(c[0], c[1], max(1.0, half * 0.38), 0.75, ang=-math.atan2(uy, ux))
                s.decal(pm & erode(m, 1), 3, on=[pid])
    if rim:
        rim_white(s, m, pid, rim)
    return pid, m


def spike(s, bx, by, tx, ty, w, whorls=4, rear=0.0):
    """The flower spike: a tapered cone of stacked whorls, frosted white
    bands between mint ones, the tip leaning back by `rear`."""
    ctrl = [(bx, by), ((bx + tx) / 2 + rear * 0.4, (by + ty) / 2), (tx + rear, ty)]
    path = bez(ctrl, 30)
    m = s.stroke(path, lambda t: max(2.2, w * (1 - 0.55 * t)), cap=True)
    pid = s.part(m, base=2, k=1, sh_tone=1, line=0)
    n = len(path)
    for j in range(whorls):
        t = (j + 0.5) / whorls
        x, y = path[min(n - 1, int(t * (n - 1)))]
        band = s.ellipse(x, y, w * 1.2, 0.9)
        s.decal(band & m, 3, on=[pid])
    rim_white(s, m, pid, 0.3)
    return [pid]


def sparkles(s, pts):
    """Frost sparkles: little plus-shaped stars on the background."""
    body = s.tone >= 0
    m = np.zeros_like(body)
    for x, y, big in pts:
        (x, y), = s.T([(x + 0.5, y + 0.5)])
        x, y = int(math.floor(x)), int(math.floor(y))
        for dx, dy in ([(0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)] if big else [(0, 0), (1, 0), (0, 1), (1, 1)]):
            if 0 <= x + dx < s.w and 0 <= y + dy < s.h:
                m[y + dy, x + dx] = True
    m &= ~dilate(body, 1)
    s.post.append((m, 3))
    return m


# ---------------------------------------------------------------------------
# mint_sprig: BRACED
# ---------------------------------------------------------------------------

SPRIG_KEYS = [  # (tuft open deg, frost)
    (0, False),
    (-12, False),   # folded shut
    (16, True),     # FAN OPEN + frost puff
    (8, False),
]


def sprig_front(f=0):
    op, fr = SPRIG_KEYS[f]
    s = Spr(64, 60, SPAL, sc=0.92)
    s.set_tilt(10, 32, 58)
    # the runner creeping off behind (tail)
    with s.untilted():
        stalk(s, [(36, 57), (46, 56), (54, 53), (58, 49)], 2.6, 2, base=2, k=1, sh_tone=1)
        crinkle_leaf(s, (55, 51), (60, 44), 4.5, veins=1, teeth=3, frost=False, rim=0.3)
        # leaf feet
        crinkle_leaf(s, (34, 56), (50, 54), 8, bend=-0.10, veins=2, teeth=5)
        crinkle_leaf(s, (31, 56), (12, 54), 9, bend=0.10, veins=2, teeth=5)
    # the rear leaf, up and back
    crinkle_leaf(s, (36, 36), (52, 24), 11, bend=-0.12, veins=3)
    square_stem(s, [(33, 57), (35, 46), (33, 36), (29, 28)], 7, 5.5)
    before = s.tone.copy()
    # the head: a cupped tuft of young leaves that opens like a fan
    cx, cy = 28, 28
    for a, ln, wd in ((-28, 14, 8.5), (46, 14, 8.5), (12, 17, 10)):
        aa = math.radians(a + (op if a > 0 else -op))
        tip = (cx - math.sin(aa) * ln, cy - math.cos(aa) * ln)
        crinkle_leaf(s, (cx, cy), tip, wd, bend=0.12 if a > 0 else -0.12, veins=2, teeth=4)
    if fr:
        sparkles(s, [(15, 12, True), (24, 6, False), (37, 9, True), (13, 23, False)])
    s.headm = s.tone != before
    for m, _ in s.post:
        s.headm |= m
    # the lead leaf, raised across the front like a shield
    crinkle_leaf(s, (32, 42), (10, 34), 13, bend=0.15, veins=3)
    s.contact += [(14, 26), (38, 48)]
    return s


def sprig_frames():
    return place(frames(sprig_front, len(SPRIG_KEYS)), 56, dx=1)


def sprig_back():
    """From behind: the tuft of young leaves leaning top-right at the foe on
    the square stem, the big leaf pair's backs spread at the shoulders."""
    s = Spr(48, 64, SPAL)
    crinkle_leaf(s, (22, 52), (0, 42), 15, bend=0.12, veins=3)
    crinkle_leaf(s, (26, 50), (47, 40), 14, bend=-0.12, veins=3)
    square_stem(s, [(23, 74), (24, 52), (26, 34)], 10, 8)
    for tip, wd in (((8, 18), 11), ((44, 22), 11), ((34, 4), 13)):
        crinkle_leaf(s, (26, 34), tip, wd, veins=2, teeth=4)
    return s


# ---------------------------------------------------------------------------
# peppermint: LOOMING
# ---------------------------------------------------------------------------

PEP_KEYS = [  # (crown open deg, spike rear, frost)
    (0, 0.0, False),
    (-12, 1.5, False),   # fold in over the spike
    (14, -1.5, True),    # FLARE + frost burst
    (7, -0.5, False),
]


def pep_front(f=0):
    op, rr, fr = PEP_KEYS[f]
    s = Spr(64, 60, SPAL, sc=0.88)
    s.set_tilt(13, 34, 58)
    with s.untilted():
        crinkle_leaf(s, (36, 57), (56, 55), 9, bend=-0.1, veins=2, teeth=5)
        crinkle_leaf(s, (31, 57), (8, 55), 10, bend=0.1, veins=2, teeth=5)
    # rear tier, swept up and back
    crinkle_leaf(s, (37, 30), (58, 14), 12, bend=-0.14, veins=3)
    crinkle_leaf(s, (38, 44), (60, 38), 11, bend=-0.10, veins=3)
    square_stem(s, [(34, 57), (37, 45), (35, 33), (30, 22)], 9, 6.5)
    # middle tier: the lead leaf thrust out over the foe
    crinkle_leaf(s, (34, 40), (3, 32), 16, bend=0.12, veins=4, teeth=7)
    before = s.tone.copy()
    cx, cy = 30, 23
    for a, ln, wd in ((-46, 15, 9.5), (58, 17, 10.5)):
        aa = math.radians(a + (op if a > 0 else -op))
        tip = (cx - math.sin(aa) * ln, cy - math.cos(aa) * ln + 4)
        crinkle_leaf(s, (cx, cy + 2), tip, wd, bend=0.14 if a > 0 else -0.14, veins=2, teeth=4)
    spike(s, cx, cy + 1, cx - 4, cy - 19, 8.0, whorls=4, rear=rr)
    if fr:
        sparkles(s, [(12, 7, True), (33, 5, False), (6, 18, False), (40, 11, True)])
    s.headm = s.tone != before
    for m, _ in s.post:
        s.headm |= m
    s.contact += [(10, 22), (40, 54)]
    return s


def pep_frames():
    return place(frames(pep_front, len(PEP_KEYS)), 56, dx=1)


def pep_back():
    s = Spr(52, 64, SPAL)
    crinkle_leaf(s, (24, 58), (0, 52), 15, bend=0.1, veins=3)
    crinkle_leaf(s, (28, 56), (52, 50), 14, bend=-0.1, veins=3)
    square_stem(s, [(26, 74), (27, 52), (28, 30)], 12, 9)
    crinkle_leaf(s, (27, 40), (2, 28), 15, bend=0.12, veins=3)
    crinkle_leaf(s, (28, 40), (52, 30), 15, bend=-0.12, veins=3)
    spike(s, 29, 30, 38, 4, 8, whorls=3)
    crinkle_leaf(s, (29, 32), (10, 14), 11, bend=0.12, veins=2, teeth=4)
    crinkle_leaf(s, (30, 32), (48, 16), 11, bend=-0.12, veins=2, teeth=4)
    return s


ICONS = {
    "mint_sprig": [
        "................",
        "..kk..kk........",
        ".k33kk32k.......",
        ".k221k221k......",
        "..k2212k1k......",
        "...kk22kk.kkk...",
        ".kkk.k21kk322k..",
        "k3322k21k22221k.",
        "k22221k21kk11k..",
        ".kk11kk21k.kk...",
        "...kkk.k21k.....",
        "......kk21k.....",
        "..kkkk.k21kkkk..",
        ".k3322kk21222kk.",
        "..kk1122k1111k..",
        "....kkkkkkkkk...",
    ],
    "peppermint": [
        "................",
        "..kk............",
        ".k33k...........",
        ".k22k...........",
        "..k33k..kk......",
        "..k22kkk32k.kk..",
        ".kk33k2k221k32k.",
        "k322kk22k21k221k",
        "k2221k22kkk11kk.",
        ".k11kk22k..kk...",
        "..kkkk21k.kkk...",
        ".kkk..k21k322k..",
        "k3322kk21k2211k.",
        "k22221k21kkkkk..",
        ".kk1112221k.....",
        "...kkkkkkkk.....",
    ],
}


def icon_frames(sid):
    a = icon_arr(ICONS[sid])
    return [a, hop(a)]


ANIM = {
    "mint_sprig": {"intro": [[0, 6], [1, 14], [2, 4], [2, 16], [3, 8], [0, 8]],
                   "idle": [[0, 120], [3, 10]]},
    "peppermint": {"intro": [[0, 6], [1, 14], [2, 4], [2, 18], [3, 8], [0, 8]],
                   "idle": [[0, 140], [3, 10]]},
}

NOTES = {
    "mint_sprig": "Crystal rule. BRACED: a stout square-stemmed sprig on two crinkled leaf feet, the lead leaf "
                  "raised as a shield, a cupped tuft of young leaves for a head, a runner creeping off behind. "
                  "Gesture: the tuft folds shut, then springs open like a fan with a puff of frost, holds, "
                  "settles. One hue, so the dark slot is a cold hue-shifted teal (sunk veins, the stem's shade "
                  "face); white is hoarfrost on the puckers and rims. Sport: 'Chocolate' mint.",
    "peppermint": "Crystal rule. LOOMING: three tiers of crinkled pairs on a thick square stem, the lead leaf "
                  "thrust over the foe, a frosted flower spike crowning the head. Gesture: the crown pair folds "
                  "in over the spike, then flares wide as the spike rears inside a burst of frost sparkles, "
                  "holds, settles. Sport: 'Chocolate' mint.",
}

SPECS = {"mint_sprig": (sprig_frames, sprig_back), "peppermint": (pep_frames, pep_back)}


def render():
    out = {}
    for sid, (ffn, bfn) in SPECS.items():
        out[sid] = (ffn(), back_frame(bfn), icon_frames(sid))
    return out


def build():
    from kit import write_species, intro_strip
    for sid, (front, back, icons) in render().items():
        write_species(sid, palette=PAL, sport=SPORT, front=front, back=[back], icon=icons,
                      anim=ANIM[sid], moving=moving_boxes(front), notes=NOTES[sid], tool=TOOL)
        intro_strip(sid)


if __name__ == "__main__":
    if "--preview" in sys.argv:
        out = render()
        rows = []
        for sid, (front, back, icons) in out.items():
            for i, f in enumerate(front):
                stats(f"{sid}[{i}]", f)
            stats(f"{sid} back", back)
            rows.append((PAL, front + [back] + icons))
            rows.append((SPORT, front[:1]))
        print(preview(rows, sys.argv[-1]))
    else:
        build()
