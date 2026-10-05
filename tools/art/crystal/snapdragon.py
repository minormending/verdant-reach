"""Crystal rule, snapdragon line: snapdragon_sprout -> snapdragon
(Antirrhinum majus; the Dragon rare).

  index 0  #181818  outline, the throat pit, the jaw seam      (shared)
  index 1  BRONZE PURPLE: the leaves and stem ('Bronze Dragon' foliage),
           the inside of the flower, and the shade side of the pink
  index 2  snapdragon pink: the flowers
  index 3  #f8f8f8  the palate (the pale bulge that closes the throat),
           the gloss on the hood, the pollen sparks

Two hues, the flytrap's way: the dark slot carries the second hue. The
bronze-purple foliage IS the plant's dark tone, so the leaves are flat
purple fields lit by pink rims, and the same purple is the open throat
and the shade under each pink lip. The real palate is yellow; with the
yellow gone it is the shared white, which reads as the pale palate of
the white-throated cultivars and keeps the jaw readable at 1x.

Poses (docs/CREATURES.md, kept from the classic art):
  snapdragon_sprout  LUNGING: one gaping flower-head thrust out on a hooked
                     stalk, two bud horns behind it, leaf claws.
  snapdragon         LUNGING: an S-necked spike, a big jawed head, a
                     second jaw lower on the neck, a bud crest, leaf wings.

Entrance animations (only the flowers move; leaves and stem are fixed):
  snapdragon_sprout  the jaw gapes, holds, SNAPS shut, and eases open.
  snapdragon         the head rears back gaping, holds, SNAPS; the lower
                     jaw echoes with its own snap; pollen sparks fly.

Sport: 'Rocket Lemon' (Antirrhinum majus Rocket Series): lemon-yellow
flowers over dark green foliage.

Scores (docs/CREATURES.md §9): snapdragon_sprout 8, snapdragon 9 (the jaw
reads at 1x with the purple maw and white palate; the back's head is a
simple pink egg, 10: weakest part of the set).

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/snapdragon.py --preview out.png   scratch sheet
  $PY tools/art/crystal/build.py snapdragon                write the bundles
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _d_kit import (BLACK, WHITE, T, Spr, bez, dilate, erode, frames, place, moving_boxes,  # noqa: E402
                    back_frame, icon_arr, hop, rim_white, mask_px, stalk, leaf, preview, stats, qbez, shift)

TOOL = "tools/art/crystal/snapdragon.py"
IDS = ["snapdragon_sprout", "snapdragon"]
PURPLE = "#783070"
PINK = "#f05888"
PAL = [BLACK, PURPLE, PINK, WHITE]
SPORT = [BLACK, "#386028", "#f0d038", WHITE]
SPAL = (PURPLE, PINK, WHITE)


def _tf(hx, hy, ang):
    """local (x toward the foe = -x, y down) rotated by ang (+ = tip up) about the hinge."""
    c, s_ = math.cos(ang), math.sin(ang)

    def tr(pts):
        return [(hx + x * c - y * s_, hy + x * s_ + y * c) for x, y in pts]
    return tr


def jaw_flower(s, hx, hy, L, ang=0.0, au=0.35, al=0.30, hl=True, palate=True, spark=False):
    """A snapdragon flower in profile, mouth toward the foe (left). The hinge
    (the back of the throat) at (hx, hy); the hood (upper lip: a helmet with
    a notch between its two lobes and a beak that hooks over the lower lip)
    opens by `au` rad, the lower lip (three hanging lobes, the white palate
    hump on its inner face) by `al`. Open, the maw is a purple cavity (the
    dark slot) deepening to a black throat, like the flytrap's red maw."""
    ids = []
    shut = au + al < 0.12
    tru = _tf(hx, hy, ang + au)
    trl = _tf(hx, hy, ang - al)
    tr0 = _tf(hx, hy, ang)
    # the tube behind the hinge (toward the stem)
    tc = tr0([(L * 0.18, L * 0.04)])[0]
    tube = s.ellipse(tc[0], tc[1], L * 0.26, L * 0.22, ang=-ang)
    tid0 = s.part(tube, base=2, k=2, line=0, sh_tone=1)
    rim_white(s, tube, tid0, 0.3)
    ids.append(tid0)
    # the maw: purple cavity, its far wall a concave curve, a black throat
    if not shut:
        rim_u = tru(bez([(L * 0.04, -0.5), (-L * 0.45, L * 0.06), (-L * 0.86, L * 0.10)], 12))
        rim_l = trl(bez([(-L * 0.80, -L * 0.02), (-L * 0.40, -L * 0.02), (L * 0.04, 0.5)], 12))
        mid = tr0([(-L * 0.58, L * 0.04)])[0]
        far = bez([rim_u[-1], mid, rim_l[0]], 10)
        th = s.poly(rim_u + far[1:-1] + rim_l)
        tid = s.part(th, base=1, k=0, line=None)
        pc = tr0([(-L * 0.14, L * 0.03)])[0]
        pit = s.ellipse(pc[0], pc[1], max(1.5, L * 0.20), max(1.5, L * 0.07 + (au + al) * L * 0.28), ang=-ang)
        s.ink(pit & th, 0, pid=tid, lock=False)
        ids.append(tid)
    # lower lip: the jaw, long and shallow, three lobes along its underside
    lo = [(L * 0.12, L * 0.02), (-L * 0.30, -L * 0.01), (-L * 0.70, -L * 0.03), (-L * 0.92, L * 0.02),
          (-L * 0.94, L * 0.14), (-L * 0.84, L * 0.27), (-L * 0.72, L * 0.22), (-L * 0.58, L * 0.32),
          (-L * 0.44, L * 0.24), (-L * 0.30, L * 0.31), (-L * 0.08, L * 0.25), (L * 0.13, L * 0.14)]
    lm = s.poly(trl(bez(lo + lo[:1], 8)))
    lid = s.part(lm, base=2, k=1, line=0, sh_tone=1)
    ids.append(lid)
    # the lobes' clefts on the underside
    for u in (-0.64, -0.37):
        a = trl([(L * u, L * 0.30), (L * u + 0.4, L * 0.16)])
        s.decal(s.line1(bez(a, 4)) & lm, 1, on=[lid])
    if palate and not shut:
        # the palate: a long white bulge along the jaw's top, pushed forward
        # like a tongue (the snapdragon's "bearded" lower lip)
        pal = s.stroke(trl(bez([(-L * 0.22, -L * 0.04), (-L * 0.55, -L * 0.06), (-L * 0.88, -L * 0.02)], 16)),
                       lambda t: max(1.6, L * 0.11 * math.sin(math.pi * (0.2 + 0.7 * t))), cap=True)
        pid = s.part(pal, base=3, k=0, line=0)
        ids.append(pid)
    # upper lip: the hood
    up = [(L * 0.18, L * 0.02), (L * 0.24, -L * 0.30), (L * 0.04, -L * 0.54), (-L * 0.24, -L * 0.56),
          (-L * 0.42, -L * 0.46), (-L * 0.62, -L * 0.44), (-L * 0.86, -L * 0.32), (-L * 1.00, -L * 0.12),
          (-L * 1.00, L * 0.04), (-L * 0.90, L * 0.10), (-L * 0.78, L * 0.05), (-L * 0.40, L * 0.04)]
    um = s.poly(tru(bez(up + up[:1], 8)))
    # the notch between the hood's two lobes cuts the silhouette
    notch = s.poly(tru([(-L * 0.47, -L * 0.62), (-L * 0.41, -L * 0.40), (-L * 0.36, -L * 0.62)]))
    um &= ~notch
    hm = None
    if hl:
        hp = tru([(-L * 0.66, -L * 0.30)])[0]
        hm = s.ellipse(hp[0], hp[1], max(1.4, L * 0.12), 0.8, ang=-(ang + au) + 0.45)
    uid = s.part(um, base=2, k=3 if L > 18 else 2, line=0, sh_tone=1, hl=hm, hl_tone=3)
    ids.append(uid)
    rim_white(s, um, uid, 0.42)
    if not shut:
        ub = s.stroke(tru(bez([(L * 0.08, L * 0.05), (-L * 0.45, L * 0.08), (-L * 0.80, L * 0.12)], 20)),
                      max(1.0, L * 0.07), cap=False)
        s.decal(ub & um & ~shift(um, 0, 2), 1, on=[uid])
    # the crease running back from the notch
    a = tru([(-L * 0.41, -L * 0.40), (-L * 0.30, -L * 0.22)])
    s.decal(s.line1(bez(a, 6)) & erode(um, 1), 1, on=[uid])
    if shut:
        seam = s.line1(tr0(bez([(L * 0.08, L * 0.03), (-L * 0.45, L * 0.06), (-L * 0.84, L * 0.10)], 20)))
        s.ink(seam & (um | lm) & ~dilate(~(um | lm), 1), 0, lock=True)
    if spark:
        for dx, dy, r in ((-L * 1.20, -L * 0.28, 0.8), (-L * 1.24, L * 0.30, 0.8), (-L * 1.40, 0.0, 1.1)):
            p = tr0([(dx, dy)])[0]
            s.post.append((s.ellipse(p[0], p[1], r, r) & (s.tone < 0), 3))
    return ids


def bud(s, cx, cy, r, ang=0.0):
    m = s.ellipse(cx, cy, r * 0.7, r, ang=ang)
    pid = s.part(m, base=2, k=1, line=0, sh_tone=1)
    rim_white(s, m, pid, 0.3)
    return pid


def lance(s, base, tip, w, bend=0.0, rim=0.35, line=0):
    """A bronze lanceolate leaf: flat purple with a black shade edge, lit by
    a pink rim that turns white at the very top-left, a pink midrib."""
    m, path = s.leaf(base, tip, w, bend=bend, fat=0.4)
    pid = s.part(m, base=1, k=1, sh_tone=0, line=line)
    s.decal(s.line1(path[12:-14]), 2, on=[pid])
    if rim:
        rim_white(s, m, pid, rim, tone=2)
        rim_white(s, m, pid, rim * 0.7, tone=3)
    return pid, m


# ---------------------------------------------------------------------------
# snapdragon_sprout: LUNGING
# ---------------------------------------------------------------------------

# (upper, lower, head tilt, spark)
SPROUT_KEYS = [
    (0.52, 0.42, 0.06, False),   # 0 rest: jaw parted
    (0.80, 0.58, 0.16, False),   # 1 GAPE (rear back)
    (0.0, 0.0, -0.06, True),     # 2 SNAP, pollen sparks
    (0.14, 0.12, 0.04, False),   # 3 easing open
]


def sprout_front(f=0):
    au, al, ang, sp = SPROUT_KEYS[f]
    s = Spr(64, 60, SPAL)
    s.set_tilt(10, 33, 58)
    with s.untilted():
        lance(s, (33, 58), (50, 55), 6, bend=-0.15, rim=0.0)
        lance(s, (31, 58), (14, 56), 7, bend=0.15)
    lance(s, (35, 44), (52, 30), 8, bend=-0.18)
    stalk(s, [(33, 58), (37, 48), (36, 38), (31, 30)], 4.5, 3.5, base=1, k=1, sh_tone=0, rim=0.6)
    lance(s, (34, 46), (16, 40), 8, bend=0.2, rim=0.45)
    # the raceme tip: two bud horns behind the head
    stalk(s, [(31, 31), (34, 22), (38, 14)], 3, 2, base=1, k=0)
    bud(s, 38.5, 12.5, 3.2, ang=0.5)
    bud(s, 35, 21, 2.6, ang=0.9)
    before = s.tone.copy()
    jaw_flower(s, 32, 30, 21, ang=ang, au=au, al=al, spark=sp)
    s.headm = s.tone != before
    for m, _ in s.post:
        s.headm |= m
    s.contact += [(14, 24), (40, 48)]
    return s


def sprout_frames():
    return place(frames(sprout_front, len(SPROUT_KEYS)), 56, dx=0)


def head_back(s, cx, cy, R, ang=0.5):
    """A jaw-flower from behind and above, its mouth toward the foe (top-
    right): the tube's end, the hood's two humped lobes, the lower lip's
    lobes peeking past it, a purple crease between the lobes."""
    c, s_ = math.cos(ang), math.sin(ang)

    def T(pts):   # local: +x toward the foe (up-right after rotation)
        return [(cx + x * c + y * s_, cy - x * s_ + y * c) for x, y in pts]
    lo = s.ellipse(*T([(R * 0.55, R * 0.45)])[0], R * 0.55, R * 0.42, ang=ang)
    lid = s.part(lo, base=2, k=2, sh_tone=1, line=0)
    for j in (-1, 0, 1):
        p = T([(R * 0.95, R * 0.45 + j * R * 0.30)])[0]
        s.part(s.ellipse(p[0], p[1], R * 0.22, R * 0.18), base=2, k=1, sh_tone=1, line=0, merge={lid})
    hood = [(-R * 0.9, -R * 0.1), (-R * 0.6, -R * 0.75), (R * 0.1, -R * 0.95), (R * 0.55, -R * 0.75),
            (R * 0.75, -R * 0.38), (R * 1.0, -R * 0.15), (R * 0.85, R * 0.25), (R * 0.2, R * 0.45),
            (-R * 0.5, R * 0.55)]
    hm = s.poly(T(bez(hood + hood[:1], 8)))
    hm &= ~s.poly(T([(R * 0.98, -R * 0.30), (R * 0.70, -R * 0.20), (R * 0.98, -R * 0.05)]))
    hid = s.part(hm, base=2, k=3, sh_tone=1, line=0)
    rim_white(s, hm, hid, 0.40)
    s.decal(s.line1(T(bez([(R * 0.55, -R * 0.45), (R * 0.1, -R * 0.2), (-R * 0.5, R * 0.05)], 14))) & erode(hm, 1),
            1, on=[hid])
    return hid


def sprout_back():
    s = Spr(48, 64, SPAL)
    lance(s, (24, 54), (1, 40), 12, bend=0.15)
    lance(s, (25, 52), (47, 46), 11, bend=-0.15, rim=0.2)
    stalk(s, [(24, 72), (25, 52), (25, 36)], 7, 5, base=1, k=1, sh_tone=0, rim=0.4)
    stalk(s, [(26, 30), (34, 18), (40, 10)], 3.5, 2.5, base=1, k=0)
    bud(s, 41, 8, 4.2, ang=-0.6)
    bud(s, 34, 18, 3.4, ang=-0.4)
    head_back(s, 22, 32, 15, ang=0.55)
    return s


# ---------------------------------------------------------------------------
# snapdragon: LUNGING (escalated)
# ---------------------------------------------------------------------------

# (head upper, lower, tilt, spark, jaw2 upper, lower)
DRAGON_KEYS = [
    (0.52, 0.42, 0.04, False, 0.42, 0.34),   # 0 rest
    (0.80, 0.58, 0.16, False, 0.42, 0.34),   # 1 rear back, GAPE
    (0.0, 0.0, -0.08, True, 0.30, 0.26),     # 2 SNAP + sparks
    (0.10, 0.08, -0.02, False, 0.0, 0.0),    # 3 the lower jaw echoes: snap
    (0.18, 0.16, 0.04, False, 0.14, 0.12),   # 4 easing open
]


def dragon_front(f=0):
    au, al, ang, sp, a2, l2 = DRAGON_KEYS[f]
    s = Spr(64, 60, SPAL, sc=0.92)
    s.set_tilt(6, 36, 58)
    with s.untilted():
        lance(s, (37, 58), (55, 55.5), 7, bend=-0.15, rim=0.0)
        lance(s, (34, 58), (15, 56.5), 8, bend=0.15)
    # wing leaves, flung wide behind
    lance(s, (41, 38), (60, 16), 10, bend=-0.22)
    lance(s, (42, 45), (61, 38), 8, bend=-0.15, rim=0.2)
    # S-neck spike
    stalk(s, [(37, 58), (42, 49), (40, 38), (34, 29), (32, 22)], 6, 4, base=1, k=1, sh_tone=0, rim=0.6)
    # side branch carrying the second jaw
    stalk(s, [(41, 50), (35, 51), (30, 50)], 3.5, 3, base=1, k=1, sh_tone=0)
    # bud crest above the head
    stalk(s, [(33, 22), (37, 13), (42, 6)], 3, 2, base=1, k=0)
    bud(s, 43, 4.5, 3.2, ang=0.7)
    bud(s, 38, 12, 2.6, ang=0.9)
    before = s.tone.copy()
    jaw_flower(s, 31, 50, 12, ang=0.10, au=a2, al=l2, spark=(f == 3))
    jaw_flower(s, 33, 22, 21, ang=ang, au=au, al=al, spark=sp)
    s.headm = s.tone != before
    for m, _ in s.post:
        s.headm |= m
    s.contact += [(15, 24), (42, 52)]
    return s


def dragon_frames():
    return place(frames(dragon_front, len(DRAGON_KEYS)), 56, dx=0)


def dragon_back():
    s = Spr(52, 64, SPAL)
    lance(s, (26, 50), (1, 26), 14, bend=0.2)
    lance(s, (28, 54), (51, 40), 13, bend=-0.15, rim=0.2)
    stalk(s, [(26, 74), (27, 54), (26, 38)], 9, 7, base=1, k=1, sh_tone=0, rim=0.4)
    stalk(s, [(28, 30), (36, 16), (42, 7)], 4, 3, base=1, k=0)
    bud(s, 43, 5, 4.5, ang=-0.6)
    bud(s, 36, 15, 3.6, ang=-0.4)
    head_back(s, 10, 52, 9, ang=0.3)
    head_back(s, 24, 32, 17, ang=0.55)
    return s


ICONS = {
    "snapdragon_sprout": [
        "................",
        "..kkkkkk...k....",
        ".k333222k.k2k...",
        "k32222222kk1k...",
        "k22222222k1k....",
        ".kkkk111kk1k....",
        ".....k11kk1k....",
        ".kkk3311kk1k....",
        "k22222222k1k.kk.",
        ".k22222kk1k.k22k",
        "..kk2k2kk1kk121k",
        "....k.k.k1k1kkk.",
        "..kkk...k1kk....",
        ".k221k..k1k.....",
        "..kk11kkk1k.....",
        "....kkkk11k.....",
    ],
    "snapdragon": [
        "..........k.....",
        "..kkkkkk.k2k.kk.",
        ".k333222kk1kk12k",
        "k32222222k1k12k.",
        "k22222222k1kk2k.",
        ".kkkk111kk1k.kk.",
        ".....k11kk1k....",
        ".kkk3311kk1k.kk.",
        "k22222222k1kk12k",
        ".k22222kk1k.k22k",
        "..kk2k2kk1kk1kk.",
        ".kkk..k.k1k1k...",
        "k322k...k1kk....",
        "k1k31k.k1k......",
        ".kk22kkk1k......",
        "...kkkkk11k.....",
    ],
}


def icon_frames(sid):
    a = icon_arr(ICONS[sid])
    return [a, hop(a)]


ANIM = {
    "snapdragon_sprout": {"intro": [[0, 6], [1, 18], [2, 6], [2, 10], [3, 8], [0, 6]],
                          "idle": [[0, 110], [3, 8]]},
    "snapdragon": {"intro": [[0, 6], [1, 16], [2, 10], [3, 10], [4, 8], [0, 8]],
                   "idle": [[0, 120], [4, 8]]},
}

NOTES = {
    "snapdragon_sprout": "Crystal rule. LUNGING: one gaping jaw-flower thrust out on a hooked stalk, two bud "
                         "horns, bronze leaf claws. Gesture: the jaw gapes (rearing back), holds, SNAPS shut "
                         "with a puff of pollen, eases open. Two hues: the bronze-purple foliage is the dark "
                         "slot, which also fills the open throat and shades the pink; the palate is the shared "
                         "white. Sport: 'Rocket Lemon'.",
    "snapdragon": "Crystal rule. LUNGING: an S-necked spike, a big jaw head, a second jaw lower on the neck, a "
                  "bud crest, bronze leaf wings flung back. Gesture: the head rears back gaping, holds, SNAPS "
                  "(pollen sparks), then the lower jaw echoes with its own snap. Sport: 'Rocket Lemon'.",
}

SPECS = {"snapdragon_sprout": (sprout_frames, sprout_back), "snapdragon": (dragon_frames, dragon_back)}


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
