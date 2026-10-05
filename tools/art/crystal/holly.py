"""Crystal rule, holly line: holly_seedling -> holly (Ilex aquifolium).

  index 0  #181818  outline, the leaves' shade side, the berries' shade (shared)
  index 1  BERRY RED: the berries
  index 2  holly green: the leaves and stems
  index 3  #f8f8f8  the pale midribs, the waxy gloss rims, the spine tips,
           berry glints, the snow on the helm

Two hues, the flytrap's way: the second hue lives in the dark slot. The
first draft also used the red as the shadow half of each folded leaf (the
flytrap's trick), but the leaves then read as red-and-green variegated, and
the berries vanished into the red shade. So the leaves shade to BLACK (holly
is glossy and near-black in shadow) and the red is kept for what is really
red: the berries. Black midribs are out (the face rule) and no midrib made
the leaves blob together, so the midrib is the white of the real holly's
pale midrib, which also carries the gloss.

Poses (docs/CREATURES.md, kept from the classic art):
  holly_seedling  BRACED: crouched behind a spined shield leaf held up
                  across the front and a crest leaf, three berries clutched
                  at the chest, on a forked root.
  holly           BRACED: a squat spiked knight; a helm of glossy spined
                  leaves capped with snow leans over the foe, the shield
                  leaf thrust forward, a cluster of five berries at the
                  chest, two woody legs.

Entrance animations (only the leaves and berries move; the stem and feet
are pixel-identical):
  holly_seedling  hunch (leaves draw in), then the spines BRISTLE out with
                  white tips, the berries glint, settle.
  holly           the helm dips (anticipation), then rears up with every
                  spine bristling white, holds, the berries glint, settle.

Sport: 'Bacciflava' yellow-berried holly (Ilex aquifolium 'Bacciflava'):
golden berries and twigs; the leaf green lifts to a fresh yellow-green so
the gold can sit in the dark slot.

Scores (docs/CREATURES.md §9): holly_seedling 9 (a clean holly sprig, berries
read at 1x; 3: the head tilt is mild). holly 8 (1: from far away the spiked
knight reads more as a bush than a knight; the legs are short).

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/holly.py --preview out.png   scratch sheet
  $PY tools/art/crystal/build.py holly                write the bundles
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _d_kit import (BLACK, WHITE, T, Spr, bez, dilate, frames, place, moving_boxes,  # noqa: E402
                    back_frame, icon_arr, hop, rim_white, mask_px, serrate, stalk, preview, stats)

TOOL = "tools/art/crystal/holly.py"
IDS = ["holly_seedling", "holly"]
RED = "#b82838"
GREEN = "#40a050"
PAL = [BLACK, RED, GREEN, WHITE]
SPORT = [BLACK, "#c08820", "#a0d060", WHITE]
SPAL = (RED, GREEN, WHITE)
MIDRIB = 3


def holly_leaf(s, base, tip, w, bend=0.0, teeth=4, spine=1.6, depth=0.6, scallop=0.9, gloss=0.4,
               line=0, bristle=0, k=2, streak=False):
    """A holly leaf: a scalloped margin ending in spines, a black midrib and
    shadow band, a white gloss rim on the lit edge and a gloss streak on the
    lit half. bristle: 0 rest, 1 spines out, 2 spines out with white tips."""
    sp = spine + (1.3 if bristle else 0.0)
    poly, path, tips = serrate(base, tip, w, bend=bend, fat=0.5, teeth=teeth, depth=depth,
                               spine=sp, scallop=scallop)
    m = s.poly(poly)
    pid = s.part(m, base=2, k=k, line=line, sh_tone=0)
    if MIDRIB is not None:
        s.decal(s.line1(path[10:-6]), MIDRIB, on=[pid])
    if gloss:
        rim_white(s, m, pid, gloss)
    if streak:
        # a gloss streak on the lit half, parallel to the midrib
        bx, by = base
        tx, ty = tip
        L = math.dist(base, tip)
        nx, ny = -(ty - by) / L, (tx - bx) / L
        sg = -1 if (nx + ny) > 0 else 1          # the up-left side
        off = w * 0.24
        n = len(path)
        seg = [(x + sg * nx * off, y + sg * ny * off) for x, y in path[int(n * 0.30):int(n * 0.62)]]
        s.decal(s.line1(seg) & m, 3, on=[pid])
    if bristle >= 2:
        # white spine tips just past the outline
        pts = []
        for x, y, side in tips:
            pts.append((x, y))
        return pid, m, pts
    return pid, m, []


def berry(s, cx, cy, r=3.1, glint=1):
    m = s.circle(cx, cy, r)
    pid = s.part(m, base=1, k=1, sh_tone=0, line=0)
    gx, gy = int(math.floor(cx - r * 0.45)), int(math.floor(cy - r * 0.45))
    if glint == 1:
        s.glint([(gx, gy)])
    elif glint == 2:
        s.glint([(gx, gy), (gx + 1, gy), (gx, gy + 1)])
    return pid


def spine_tips(s, pts):
    """White spine tips: only on the transparent ring just outside a leaf."""
    body = s.tone >= 0
    m = np.zeros_like(body)
    for x, y in s.T([(x + 0.5, y + 0.5) for x, y in pts]):
        x, y = int(math.floor(x)), int(math.floor(y))
        if 0 <= x < s.w and 0 <= y < s.h:
            m[y, x] = True
    ring = dilate(body, 2) & ~body
    m = dilate(m, 1) & ring & ~dilate(body, 1)
    s.post.append((m, 3))


# ---------------------------------------------------------------------------
# holly_seedling: BRACED
# ---------------------------------------------------------------------------

# (shield lift deg, crest lift deg, bristle, berry glint)
SEED_KEYS = [
    (0, 0, 0, 1),     # 0 rest
    (-7, -6, 0, 1),   # 1 hunch: leaves drawn in
    (6, 7, 2, 1),     # 2 BRISTLE: leaves flare, spines out, white tips
    (3, 3, 1, 2),     # 3 the berries glint
]


def rot_about(pts, deg, cx, cy):
    a = math.radians(deg)
    c, s_ = math.cos(a), math.sin(a)
    return [(cx + (x - cx) * c + (y - cy) * s_, cy - (x - cx) * s_ + (y - cy) * c) for x, y in pts]


def seed_front(f=0):
    sh, cr, br, gl = SEED_KEYS[f]
    s = Spr(64, 60, SPAL, sc=0.98)
    s.set_tilt(8, 32, 58)
    with s.untilted():
        stalk(s, [(31, 58), (26, 56), (19, 57.5)], 4.5, 3, k=1, base=2, sh_tone=0, vein=None)
        stalk(s, [(33, 58), (39, 56), (45, 57.5)], 4.5, 3, k=1, base=2, sh_tone=0, vein=None)
    stalk(s, [(32, 58), (34, 48), (32, 38), (29, 31)], 6, 4, k=2, base=2, sh_tone=0, vein=None)
    before = s.tone.copy()
    tips = []
    tips += holly_leaf(s, (34, 42), (51, 33), 11, bend=-0.08, teeth=3, bristle=br, gloss=0.3)[2]
    (b0, b1), = [((30, 31), None)]
    p = rot_about([(30, 31), (40, 9)], -cr, 30, 31)
    tips += holly_leaf(s, p[0], p[1], 13, bend=-0.1, teeth=3, bristle=br)[2]
    p = rot_about([(31, 39), (7, 25)], sh, 31, 39)
    tips += holly_leaf(s, p[0], p[1], 16, bend=0.12, teeth=4, bristle=br, gloss=0.45)[2]
    berry(s, 25, 41.5, glint=gl)
    berry(s, 31, 44, glint=gl)
    berry(s, 25.5, 48, glint=gl)
    if br >= 2:
        spine_tips(s, tips)
    s.headm = (s.tone != before)
    for m, _ in s.post:
        s.headm |= m
    s.contact += [(17, 25), (39, 47)]
    return s


def seed_frames():
    return place(frames(seed_front, len(SEED_KEYS)), 56, dx=1)


def seed_back():
    """From behind and above: the crest leaf leaning top-right at the foe, the
    shield leaf's back on the left, berries peeking past the stem."""
    s = Spr(48, 64, SPAL)
    stalk(s, [(24, 72), (25, 52), (26, 36)], 8, 6, base=2, k=2, sh_tone=0, vein=None, rim=0.3)
    holly_leaf(s, (24, 46), (1, 34), 17, bend=0.12, teeth=4, gloss=0.4)
    holly_leaf(s, (25, 38), (8, 12), 14, bend=0.1, teeth=3, gloss=0.4)
    berry(s, 33, 47, r=3.3)
    berry(s, 38.5, 50, r=3.3)
    holly_leaf(s, (27, 36), (46, 6), 19, bend=-0.1, teeth=4, gloss=0.45)
    return s


# ---------------------------------------------------------------------------
# holly: BRACED (escalated: a spiked knight)
# ---------------------------------------------------------------------------

# (helm dy, helm deg, bristle, glint, shield deg)
HOLLY_KEYS = [
    (0, 0, 0, 1, 0),      # 0 rest
    (2, 4, 0, 1, -4),     # 1 dip: the helm ducks (anticipation)
    (-2, -3, 2, 1, 6),    # 2 REAR: spines bristle white, shield thrust
    (-1, -2, 1, 2, 3),    # 3 berries glint
]


def holly_front(f=0):
    dy, hd, br, gl, sd = HOLLY_KEYS[f]
    s = Spr(64, 62, SPAL, sc=0.88)
    s.set_tilt(6, 33, 60)
    with s.untilted():
        stalk(s, [(31, 47), (26, 54), (19, 59.5)], 6, 4, base=2, k=2, sh_tone=0, vein=None, rim=0.3)
        stalk(s, [(36, 47), (41, 54), (48, 59.5)], 6, 4, base=2, k=2, sh_tone=0, vein=None)
    stalk(s, [(34, 52), (35, 44), (32, 32)], 9, 7, base=2, k=2, sh_tone=0, vein=None)
    before = s.tone.copy()
    tips = []
    # rear leaf (far arm), swept up behind
    tips += holly_leaf(s, (37, 38), (58, 26), 14, bend=-0.1, teeth=3, bristle=br, gloss=0.25)[2]
    # the helm: three big leaves fanned over the foe
    cx, cy = 32, 30 + dy
    for base, tip, w, bend, gloss in (
        ((34, 31), (52, 9), 15, -0.12, 0.3),
        ((32, 30), (18, 4), 16, 0.1, 0.45),
        ((31, 32), (4, 18), 16, 0.12, 0.45),
    ):
        p = rot_about([(base[0], base[1] + dy), (tip[0], tip[1] + dy)], hd, cx, cy)
        tips += holly_leaf(s, p[0], p[1], w, bend=bend, teeth=4, bristle=br, gloss=gloss)[2]
    # snow on the helm's crown
    snow = s.poly(rot_about([(16, 9 + dy), (24, 4 + dy), (34, 5 + dy), (42, 9 + dy), (38, 12 + dy),
                             (30, 10 + dy), (22, 12 + dy)], hd, cx, cy))
    s.decal(snow, 3)
    # shield leaf, thrust forward low
    p = rot_about([(31, 41), (5, 40)], sd, 31, 41)
    tips += holly_leaf(s, p[0], p[1], 14, bend=-0.10, teeth=4, bristle=br, gloss=0.4)[2]
    for bx, by in ((29, 35), (35.5, 36), (32, 41), (38.5, 42), (34, 46.5)):
        berry(s, bx, by, glint=gl)
    if br >= 2:
        spine_tips(s, tips)
    s.headm = (s.tone != before)
    for m, _ in s.post:
        s.headm |= m
    s.contact += [(18, 27), (41, 50)]
    return s


def holly_frames():
    return place(frames(holly_front, len(HOLLY_KEYS)), 56, dx=1)


def holly_back():
    """From behind: the snow-capped helm of three leaves leaning top-right,
    the shield leaf's back on the left, the berries at the right shoulder."""
    s = Spr(52, 64, SPAL)
    stalk(s, [(26, 74), (26, 56), (26, 40)], 11, 9, base=2, k=2, sh_tone=0, vein=None, rim=0.3)
    holly_leaf(s, (24, 50), (0, 46), 16, bend=-0.1, teeth=4)
    for bx, by in ((38, 50), (43.5, 47.5), (41, 54)):
        berry(s, bx, by, r=3.3)
    holly_leaf(s, (26, 38), (4, 14), 19, bend=0.1, teeth=4, gloss=0.5)
    holly_leaf(s, (28, 38), (50, 12), 20, bend=-0.1, teeth=4, gloss=0.5)
    holly_leaf(s, (27, 38), (30, 2), 18, bend=-0.05, teeth=4, gloss=0.5)
    snow = s.poly([(14, 16), (22, 6), (32, 3), (42, 8), (46, 14), (38, 14), (30, 10), (22, 15)])
    s.decal(snow, 3)
    return s


# ---------------------------------------------------------------------------
# icons
# ---------------------------------------------------------------------------

ICONS = {
    "holly_seedling": [
        "................",
        "..k.........k...",
        ".k2k.k.....k3k..",
        ".k23k2k...k23k..",
        "k22232k..k232k..",
        ".k22232k.k232k..",
        "k2222223kk22kk..",
        ".kk22222k22k....",
        "...kk222k2k.....",
        "..kk1kkk2k......",
        ".k131k1kk.......",
        ".k11k111k.......",
        "..kkk111k.......",
        "....kk2kk.......",
        "...k22k22k......",
        "...kkkkkkk......",
    ],
    "holly": [
        "................",
        "...k.kkkk.k.....",
        "..k3k3333k3k....",
        ".k2333333332k...",
        "k22223333222k...",
        ".k222222222k2k..",
        "k22k222k2222kk..",
        ".kk1k22k22k2k...",
        "..k131kk1kkk....",
        ".k2k11k111k.....",
        "k222kk1k11k.....",
        ".kkkk.kkkk......",
        ".....k2kk2k.....",
        "....k2k..k2k....",
        "....kkk..kkk....",
        "................",
    ],
}


def icon_frames(sid):
    a = icon_arr(ICONS[sid])
    return [a, hop(a)]


ANIM = {
    "holly_seedling": {"intro": [[0, 6], [1, 12], [2, 4], [2, 14], [3, 12], [0, 6]],
                       "idle": [[0, 120], [3, 10]]},
    "holly": {"intro": [[0, 6], [1, 14], [2, 4], [2, 16], [3, 12], [0, 6]],
              "idle": [[0, 140], [3, 10]]},
}

NOTES = {
    "holly_seedling": "Crystal rule. BRACED: crouched behind a spined shield leaf and a crest leaf, three "
                      "berries at the chest. Gesture: the leaves hunch in, then flare with every spine "
                      "bristling white-tipped, the berries glint, settle. Two hues: berry red in the dark "
                      "slot (the berries); the leaves shade to black, not red (red shading read as "
                      "variegation), with white midribs. Sport: 'Bacciflava' yellow-berried holly.",
    "holly": "Crystal rule. BRACED: a squat spiked knight, a snow-capped helm of three glossy spined leaves "
             "leaning over the foe, the shield leaf thrust low, five berries at the chest, two woody legs. "
             "Gesture: the helm ducks, then rears with the spines bristling white and the shield thrust, "
             "the berries glint, settle. Sport: 'Bacciflava' yellow-berried holly.",
}

SPECS = {"holly_seedling": (seed_frames, seed_back), "holly": (holly_frames, holly_back)}


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
