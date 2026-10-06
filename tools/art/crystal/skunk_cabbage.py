"""Crystal rule, skunk cabbage line: skunk_cabbage_shoot -> skunk_cabbage
(Symplocarpus foetidus).

  index 0  #181818  outline, the dark mouth of the hood, shade, the melt
           hollow in the snow (shared)
  index 1  SPATHE MAROON: the hood (spathe), the spadix, the leaf stalks
  index 2  leaf green: the mottling on the hood, the leaves, the spadix's
           florets
  index 3  #f8f8f8  the snow, the steam curling off the hood, the glossy rim
           of the hood's lip, light rims on the leaves

Two hues, the flytrap's way: the maroon of the spathe lives in the dark
slot, and the hood is maroon MOTTLED with the leaf green (the real spathe is
streaked maroon and yellow-green). The leaves shade to black, not maroon
(maroon shade on the leaves read as rot).

The hood's mouth faces the foe, and that is the one place a face could
creep in (a dark opening with a round knob in it). So the mouth is a tall,
narrow slit, the spadix sits low in it and is textured with florets, and it
gets no glint.

Poses (docs/CREATURES.md section 4.3):
  skunk_cabbage_shoot  REARING: the mottled hood pushing up through the
                       snow in its own melt hollow, its tip hooked toward the
                       foe, a tight rolled leaf spike behind it, a thread of
                       steam off the tip.
  skunk_cabbage        LOOMING: the hood low and forward among big, bright,
                       net-veined leaves that tower behind it (the tallest at
                       the back, the lead leaf flung out low toward the foe),
                       steam curling up off the hood into the open air.

Entrance animations (only the steam moves; the hood, snow and leaves are
pixel-identical): the plant heats itself (thermogenesis), so a curl of
steam rises off the hood, swirls, rises again and thins away.

Sport: a greenish-yellow spathe. Wild Symplocarpus foetidus spathes range
from solid maroon through mottled to almost plain yellow-green; no named
cultivar or botanical form exists, so the sport is that natural yellow-green
spathe, kept close to the source: an olive-gold spathe and a fresher leaf.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/skunk_cabbage.py --preview out.png   scratch sheet
  $PY tools/art/crystal/build.py skunk_cabbage --sheet        write the bundles
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _d_kit import (BLACK, WHITE, T, Spr, bez, dilate, erode, frames, place, moving_boxes,  # noqa: E402
                    back_frame, icon_arr, hop, rim_white, stalk, preview, stats)

TOOL = "tools/art/crystal/skunk_cabbage.py"
IDS = ["skunk_cabbage_shoot", "skunk_cabbage"]
MAROON = "#702838"
GREEN = "#78b838"
PAL = [BLACK, MAROON, GREEN, WHITE]
SPORT = [BLACK, "#686818", "#b0d050", WHITE]
SPAL = (MAROON, GREEN, WHITE)


# ---------------------------------------------------------------------------
# parts
# ---------------------------------------------------------------------------

def hood(s, x, y, h, w, lean, seed=3, mouth=True):
    """The spathe: a fat shell from a base at (x, y), rising h, its tip hooked
    `lean` px toward the foe (left). Maroon, mottled with green, black shade
    on the right, a white gloss rim on the lit lip, and on the foe side a
    tall slit mouth with the knobbly spadix low inside it."""
    left = [(x - w * 0.42, y), (x - w * 0.52, y - h * 0.35), (x - w * 0.38 - lean * 0.4, y - h * 0.72),
            (x - lean, y - h)]
    right = [(x - lean, y - h), (x - lean * 0.2 + w * 0.12, y - h * 0.86), (x + w * 0.46, y - h * 0.55),
             (x + w * 0.52, y - h * 0.2), (x + w * 0.4, y)]
    pts = bez(left, 16) + bez(right, 16)
    m = s.poly(pts)
    pid = s.part(m, base=1, k=2, sh_tone=0, line=0)
    # mottling: short green streaks that follow the shell's curve upward
    rng = np.random.RandomState(seed)
    spots = []
    for i in range(int(w * h / 26)):
        u = rng.uniform(0.08, 0.92)          # up the hood
        v = rng.uniform(-0.45, 0.45)         # across
        cx = x + v * w * (1 - 0.5 * u) - lean * u ** 1.6
        cy = y - u * h
        ln = rng.uniform(1.6, 3.2)
        spots.append(s.leaf((cx + lean * 0.05, cy + ln), (cx - lean * 0.05, cy - ln), rng.uniform(1.6, 2.4))[0])
    for sm in spots:
        s.decal(sm & erode(m, 1), 2, on=[pid])
    rim_white(s, m, pid, 0.5)
    if mouth:
        mb = (x - w * 0.22, y - h * 0.05)
        mt = (x - w * 0.16 - lean * 0.55, y - h * 0.74)
        mm, path = s.leaf(mb, mt, w * 0.30, bend=0.05, fat=0.36)
        mm &= erode(m, 1)
        s.part(mm, base=0, k=0, line=0)
        yy, xx = np.mgrid[0:s.h, 0:s.w]
        # the curled lip on the mouth's lit (right) side catches the light
        lip = dilate(mm, 1) & ~mm & m
        cxm = np.nonzero(mm)[1].mean() if mm.any() else 0
        s.decal(lip & (xx > cxm), 3, on=[pid])
        # the spadix: a knobbly club filling the lower mouth, no glint
        n = len(path)
        sx, sy = path[int(n * 0.3)]
        sp = s.ellipse(sx, sy, w * 0.2, h * 0.17) & erode(mm, 1)
        spid = s.part(sp, base=2, k=1, sh_tone=1, line=None)
        knobs = (yy % 2 == 0) & (((xx + yy // 2) // 2) % 2 == 0)
        s.decal(knobs & erode(sp, 1), 1, on=[spid])
    return pid, m


def snow_bank(s, x0, x1, y, hgt, bumps=3):
    pts = [(x0, y)]
    for t in np.linspace(0, 1, 24):
        b = 0.75 + 0.25 * math.cos(t * math.pi * 2 * bumps)
        pts.append((x0 + (x1 - x0) * t, y - hgt * math.sin(math.pi * t) ** 0.7 * b))
    pts.append((x1, y))
    m = s.poly(pts)
    pid = s.part(m, base=3, k=1, sh_tone=0, line=0)
    return pid, m


def big_leaf(s, base, tip, w, bend=0.0, rim=0.35, veins=4, rib=True):
    """A big net-veined skunk cabbage leaf: broad, blunt-tipped, a pale
    midrib, lateral veins curving out to the margin, black shade."""
    m, path = s.leaf(base, tip, w, bend=bend, fat=0.55, blunt=1.0)
    pid = s.part(m, base=2, k=2, sh_tone=0, line=0)
    n = len(path)
    if rib:
        s.decal(s.line1(path[8:-10]), 3 if rim else 2, on=[pid])
    bx, by = base
    tx, ty = tip
    L = math.dist(base, tip)
    nx, ny = -(ty - by) / L, (tx - bx) / L
    for i in range(veins):
        t = 0.28 + i * (0.55 / max(1, veins - 1))
        px, py = path[int(t * (n - 1))]
        for sg in (-1, 1):
            q = path[min(n - 1, int((t + 0.12) * (n - 1)))]
            end = (q[0] + sg * nx * w * 0.42, q[1] + sg * ny * w * 0.42)
            mid = ((px + end[0]) / 2 + (q[0] - px) * 0.3, (py + end[1]) / 2 + (q[1] - py) * 0.3)
            s.decal(s.line1(bez([(px, py), mid, end], 12)) & erode(m, 2), 0, on=[pid])
    if rim:
        rim_white(s, m, pid, rim)
    return pid, m


def steam(s, pts_list):
    """Steam: white wisps drawn after the outline, on the background only
    (close_outline gives them their black edge)."""
    m = np.zeros((s.h, s.w), bool)
    for pts in pts_list:
        m |= s.line1(bez(pts, 24))
        m |= dilate(s.line1(bez(pts[:2], 12)), 0)
    s.post.append((m, 3))
    return m


# ---------------------------------------------------------------------------
# skunk_cabbage_shoot: REARING through the snow
# ---------------------------------------------------------------------------

# steam curls (relative to the hood tip), per frame
SHOOT_STEAM = [
    [[(0, -1), (-1, -3), (1, -6)]],                                        # 0 a thread
    [[(0, -1), (-2, -3), (0, -7), (3, -8)]],                               # 1 it rises
    [[(0, -1), (-2, -4), (1, -7), (4, -8), (4, -11)], [(-3, -9), (-5, -12)]],  # 2 a curl, swirling
    [[(-1, -7), (1, -10), (4, -11)], [(-4, -11), (-6, -13)]],              # 3 it lifts and thins
]


def shoot_front(f=0):
    s = Spr(64, 64, SPAL, sc=1.0)
    x, y = 30, 58
    with s.untilted():
        # the melt hollow and the snow banks either side
        s.part(s.ellipse(x + 1, y - 0.5, 14, 3.2), base=0, k=0, line=0)
        snow_bank(s, 9, x - 8, y + 2.5, 8, bumps=1)
        snow_bank(s, x + 9, 54, y + 2.5, 7, bumps=1)
    # a rolled leaf spike behind (rear arm)
    lp, lm, _ = stalk(s, [(x + 6, y), (x + 10, y - 10), (x + 13, y - 19), (x + 17, y - 24)], 8, 1.5, base=2, k=2,
                     sh_tone=0, vein=None)
    rim_white(s, lm, lp, 0.4)
    hood(s, x, y + 0.5, 34, 23, 8)
    before = s.tone.copy()
    tx, ty = x - 8, y + 0.5 - 34
    steam(s, [[(tx + dx, ty + dy) for dx, dy in c] for c in SHOOT_STEAM[f]])
    s.headm = (s.tone != before)
    for m, _ in s.post:
        s.headm |= m
    s.contact += []
    return s


def shoot_frames():
    return place(frames(shoot_front, len(SHOOT_STEAM)), 56, dx=1)


def shoot_back():
    s = Spr(48, 64, SPAL)
    s.part(s.ellipse(24, 60, 22, 5), base=0, k=0, line=0)
    stalk(s, [(30, 62), (36, 44), (42, 30)], 9, 2, base=2, k=2, sh_tone=0, vein=None)
    hood(s, 22, 64, 54, 34, -10, seed=5, mouth=False)
    return s


# ---------------------------------------------------------------------------
# skunk_cabbage: LOOMING among big leaves
# ---------------------------------------------------------------------------

BIG_STEAM = [
    [[(0, -1), (-2, -4), (0, -7)]],
    [[(0, -1), (-3, -5), (-1, -9), (2, -10)]],
    [[(0, -1), (-3, -5), (-1, -10), (3, -12), (3, -16)], [(-5, -14), (-8, -17)]],
    [[(-2, -10), (0, -15), (3, -17)], [(-6, -17), (-9, -21)]],
]


def cabbage_front(f=0):
    s = Spr(64, 62, SPAL, sc=0.9)
    # leaves, back to front: the tall rear leaf, the middle leaf, the far lead leaf
    for st in ([(38, 58), (40, 46)], [(33, 58), (30, 46)]):
        stalk(s, st, 4, 3, base=1, k=1, sh_tone=0, vein=None)
    big_leaf(s, (41, 46), (52, 2), 24, bend=-0.05, rim=0.0, veins=4)
    big_leaf(s, (38, 47), (30, 4), 22, bend=0.08, rim=0.3, veins=4)
    big_leaf(s, (44, 52), (62, 26), 18, bend=-0.1, rim=0.0, veins=3)
    # the lead leaf, flung out low toward the foe
    big_leaf(s, (32, 54), (3, 40), 19, bend=0.12, rim=0.4, veins=3)
    x, y = 24, 61
    hood(s, x, y, 34, 23, 8, seed=7)
    before = s.tone.copy()
    tx, ty = x - 8, y - 34
    steam(s, [[(tx + dx, ty + dy) for dx, dy in c] for c in BIG_STEAM[f]])
    s.headm = (s.tone != before)
    for m, _ in s.post:
        s.headm |= m
    s.contact += [(14, 22), (34, 42)]
    return s


def cabbage_frames():
    return place(frames(cabbage_front, len(BIG_STEAM)), 56, dx=0)


def cabbage_back():
    s = Spr(52, 64, SPAL)
    big_leaf(s, (20, 60), (2, 10), 26, bend=0.08, rim=0.4, veins=4)
    big_leaf(s, (26, 60), (30, 0), 26, bend=-0.04, rim=0.4, veins=4)
    big_leaf(s, (30, 62), (52, 20), 22, bend=-0.1, rim=0.4, veins=3)
    hood(s, 34, 70, 36, 26, -8, seed=9, mouth=False)
    return s


# ---------------------------------------------------------------------------
# icons
# ---------------------------------------------------------------------------

ICONS = {
    "skunk_cabbage_shoot": [
        "....kk..........",
        "...k33k.........",
        "....kk..........",
        "...kkk..........",
        "..k11k...k......",
        "..k121k.k2k.....",
        ".k1kk21kk2k.....",
        ".k1k112kk22k....",
        ".k3k1211k22k....",
        ".k2k12111k2k....",
        ".k1kk1211k2k....",
        "k1k2k1121k2k....",
        "kk11121121kkkk..",
        "k33k00000k3333k.",
        "kkkkkkkkkkkkkkk.",
    ],
    "skunk_cabbage": [
        "........kk......",
        ".......k22k.kk..",
        "......k2322kk2k.",
        ".kk...k2322k22k.",
        "k33k.k22322k22k.",
        ".kk..k22322kk2k.",
        ".kkk..k2322k22k.",
        "k11k..k2322k2k..",
        "k121kk22322k2k..",
        "k1kk21kk22k2kkk.",
        "k1k112kkk2k2222k",
        "k3k1211k22k2222k",
        "k2k12111k2kk22k.",
        "k1kk12k1kk..kk..",
        "kkkkkkkkkk......",
    ],
}


def icon_frames(sid):
    a = icon_arr(ICONS[sid])
    return [a, hop(a)]


ANIM = {
    "skunk_cabbage_shoot": {"intro": [[0, 8], [1, 10], [2, 6], [2, 14], [3, 10], [0, 8]],
                            "idle": [[0, 120], [1, 10]]},
    "skunk_cabbage": {"intro": [[0, 8], [1, 10], [2, 6], [2, 16], [3, 10], [0, 8]],
                      "idle": [[0, 140], [1, 10]]},
}

NOTES = {
    "skunk_cabbage_shoot": "Crystal rule. REARING: the maroon hood (spathe), mottled with green, pushing up "
                           "through the snow in its own melt hollow, its tip hooked toward the foe, a tight "
                           "rolled leaf spike behind it. The mouth is a tall slit with the knobbly spadix low "
                           "inside (no glint, so it never reads as an eye). Gesture: the plant heats itself, so "
                           "a curl of steam rises off the hood, swirls and thins away. Two hues: spathe maroon "
                           "in the dark slot; the leaf shades to black. Sport: a yellow-green spathe (the "
                           "natural colour range of wild spathes; no named form exists).",
    "skunk_cabbage": "Crystal rule. LOOMING: the mottled maroon hood low and forward among big, bright, "
                     "net-veined leaves that tower behind it, the lead leaf flung out low toward the foe. "
                     "Gesture: steam curls up off the hood into the open air, swirls and thins away. Sport: "
                     "a yellow-green spathe (the natural colour range of wild spathes; no named form exists).",
}

SPECS = {"skunk_cabbage_shoot": (shoot_frames, shoot_back), "skunk_cabbage": (cabbage_frames, cabbage_back)}


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
