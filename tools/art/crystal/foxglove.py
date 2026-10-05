"""Crystal rule, foxglove line: foxglove_rosette -> foxglove (Digitalis purpurea).

A redraw of tools/art/species_c/foxglove.py under the Crystal rule
(docs/ROLLOUT.md, docs/CREATURES.md). The line's accent stays in the dark
slot: foxglove magenta in the rosette, dusky plum in the adult.

foxglove_rosette
  index 1  foxglove magenta: the young bells and buds, and the shadow side of
           every leaf (so the line's pink already shows in the rosette)
  index 2  woolly grey-sage: the rosette leaves and the spire
foxglove
  index 1  dusky plum: the leaf cloak and the spire (as in the base art), the
           bells' shadow side and their spots
  index 2  foxglove pink: the bells; also the lit band on the plum leaves
           and their midribs, so the dark cloak is broken into forms
both
  index 0  #181818  outline, the throats, crevices                (shared)
  index 3  #f8f8f8  the pale lower lip of each bell (where the spots sit),
           rims and glints                                        (shared)

No faces: every bell hangs in side view with its mouth turned down toward
the foe, so a throat is a black crescent above a white lip with 2-3
dark speckles along it, never a round dark disc with a glint.

Poses (docs/CREATURES.md, kept from the base art):
  foxglove_rosette  COILED   a woolly rosette crouched low; the young spire
                             rises in an S and curls over like a crook, two
                             bells dangling at the foe.
  foxglove          LOOMING  the spire hooks over the foe like a reaper's
                             crook, bells hung down its foe side, biggest at
                             the bottom, over a cloak of plum leaves.

Entrance animations (the bells are the signature):
  foxglove_rosette  the crook nods: it draws back, then swings the two
                    bells at the foe (held) and they ring back.
  foxglove          the bells SNAP OPEN down the spike bottom-first, as the
                    real flowers open: all shut, the lower bells pop, then
                    the upper, every bell flared (held), settle.

Sport: Digitalis purpurea f. albiflora, 'Alba' (docs/SPORTS.md): dusky
grey-green and cream for white bells.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/foxglove.py            # write the base bundles
  $PY tools/art/crystal/foxglove.py --preview  # scratch preview only
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from _artc_draw import icon_pair, outline_fix  # noqa: E402
from _artc_draw import (BLACK, WHITE, T, box, icon_arr, moving_boxes, place, preview, px_index,  # noqa: E402
                        px_kit, register, shift)

px, common = px_kit()
Sprite, bezier, pxshift = px.Sprite, px.bezier, px.shift

TOOL = "tools/art/crystal/foxglove.py"
IDS = ["foxglove_rosette", "foxglove"]

PAL = {
    "foxglove_rosette": [BLACK, "#904088", "#98b8a8", WHITE],   # foxglove magenta buds, woolly grey-sage
    "foxglove": [BLACK, "#582870", "#d870b0", WHITE],           # dusky plum, foxglove pink
}
SPORT = {   # 'Alba': white bells with dusky spots
    "foxglove_rosette": [BLACK, "#506048", "#b0c8a8", WHITE],
    "foxglove": [BLACK, "#585070", "#e0d8c8", WHITE],
}


# ---------------------------------------------------------------------------
# parts
# ---------------------------------------------------------------------------

def leaf(s, p0, p1, w, bend=0.0, cloak=False):
    """An ovate-lanceolate leaf. Rosette: sage, a magenta crescent, a white
    lit band. Cloak (adult): plum, a pink lit band 2px deep and a white rim
    on the lit edge (so the dark cloak reads as separate forms)."""
    c = s.c
    m = c.leaf(p0, p1, w, bend=bend, power=0.7, tip=1.25, base=0.8)
    if cloak:
        part = s.add(m, tones=(1, 1, 2), shade=(1, 1), close=2, band=(1, 3), line="black")
    else:
        part = s.add(m, tones=(1, 2, 3), shade=(2, 2), close=2, band=(1, 2), line="black")
    return part, (p0, p1, w, bend)


def cloak_rim(s, leaves, frac=0.55):
    """A 1px white rim on the lit (top-left) edge of each plum cloak leaf,
    over the pink band: the dark cloak then pops like the pilot's crowns."""
    for part, geo in leaves:
        m = part.mask
        edge = m & (~shift(m, 0, -1) | ~shift(m, -1, 0))
        ys, xs = np.nonzero(m)
        d = xs + ys
        lim = d.min() + (d.max() - d.min()) * frac
        yy, xx = np.mgrid[0:s.h, 0:s.w]
        sel = edge & ((xx + yy) <= lim) & np.isin(s.t, (1, 2))
        s.t[sel] = 3
        s.protect |= sel


def veins(s, part, geo, tone, n=2, sides=True):
    c = s.c
    p0, p1, w, bend = geo
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    ax = p1 - p0
    L = np.linalg.norm(ax)
    ax /= L
    nx = np.array([-ax[1], ax[0]])
    mid = [p0 + ax * L * t + nx * bend * math.sin(math.pi * t) for t in np.linspace(0.08, 0.8, 12)]
    m = c.stroke(mid, 1.0)
    if sides:
        for k in range(1, n + 1):
            t = k / (n + 1.2)
            q = p0 + ax * L * t + nx * bend * math.sin(math.pi * t)
            for sd in (-1, 1):
                e = q + ax * L * 0.12 + nx * sd * w * 0.30
                m |= c.stroke([q, e], 1.0)
    from scipy import ndimage
    inner = ndimage.binary_erosion(part.mask)
    s.paint(m & inner, tone, only=[1, 2])


def bell(s, at, L, w, ang, open_=1.0, body=2, band=(1, 2)):
    """A pendent bell from `at`, its axis at `ang` degrees (90 = straight
    down, >90 = down toward the foe). The tube flares from the stalk to the
    mouth. open_ = 0: a shut bud-bell (no mouth); 1: open; >1 flared.
    Returns (tube part, mouth info or None)."""
    c = s.c
    a = math.radians(ang)
    ax = np.array([math.cos(a), math.sin(a)])
    nx = np.array([-ax[1], ax[0]])
    p0 = np.array(at, float)
    if open_ == 0:
        L, w = L * 0.72, w * 0.62    # a shut bell is a slim bud
    open_ = max(0.0, open_)          # open_ < 0: a full-size bell seen from behind (no mouth)
    p1 = p0 + ax * L
    wm = w * (0.75 + 0.25 * min(open_, 1.3))
    tube = c.stroke([p0, p0 + ax * L * 0.45], w * 0.42, w * 0.78)
    tube |= c.stroke([p0 + ax * L * 0.4, p1 - ax * 1.0], w * 0.78, wm)
    sh = 1 if body == 2 else 0
    part = s.add(tube, tones=(sh, body, 3), shade=(1, 1), band=band, line="black")
    if open_ <= 0:
        return part, None
    mc = p1 - ax * 0.6
    mouth = c.ellipse(mc[0] + ax[0] * 0.6, mc[1] + ax[1] * 0.6, wm * 0.56, max(1.3, wm * 0.22 * min(1.0, open_)),
                      math.degrees(a) + 90)
    mp = s.add(mouth, prune=False, tones=(3, 3, 3), flat=True, line="black")
    return part, (mp, mc, ax, nx, wm)


def throat(s, info, spot_tone=1, n_spots=3):
    """The mouth seen from the side and below: a black throat crescent on
    the upper (stalk) side, the pale lower lip with a short row of
    speckles. Never a round dark disc."""
    if info is None:
        return
    mp, mc, ax, nx, w = info
    c = s.c
    # the throat: the upper (stalk-side) half of the mouth, 1px of black
    q = mc - ax * w * 0.05
    deep = c.ellipse(q[0], q[1], w * 0.42, 0.9, math.degrees(math.atan2(ax[1], ax[0])) + 90)
    s.paint(deep & mp.mask & ~c.ellipse(mc[0] + ax[0] * 1.6, mc[1] + ax[1] * 1.6, w, 1.2,
                                        math.degrees(math.atan2(ax[1], ax[0])) + 90), 0, only=[3])
    ys, xs = np.nonzero(mp.mask & (s.t == 3))
    if not len(xs):
        return
    # speckles: along the lip's middle, spaced 2px, on white with white either side
    order = np.argsort(xs * nx[0] + ys * nx[1])
    cand = [(int(xs[i]), int(ys[i])) for i in order]
    picked = []
    for x, y in cand:
        if len(picked) >= n_spots:
            break
        if s.t[y, x] != 3 or any(abs(x - a) + abs(y - b) < 2 for a, b in picked):
            continue
        if 0 < y < s.h - 1 and s.t[y + 1, x] == 3 and s.t[y - 1, x] in (0, 3):
            picked.append((x, y))
    s.px(picked, spot_tone)


def bud(s, at, r, tone=1):
    return s.add(s.c.ellipse(at[0], at[1], r, r * 0.8), tones=(0, tone, 3) if tone == 1 else (1, tone, 3),
                 shade=(1, 1), band=(1, 2), line="black")


# ---------------------------------------------------------------------------
# foxglove_rosette: COILED. The crook nods and the bells ring.
# ---------------------------------------------------------------------------

# (crook tip dx, dy, bell swing deg)
ROS_KEYS = [
    (0, 0, 0),       # 0 rest
    (3, -2, -14),    # 1 drawn back (anticipation)
    (-3, 2, 18),     # 2 swung at the foe (held)
    (1, -1, -6),     # 3 ring back
]


def rosette_front(f=0):
    dx, dy, sw = ROS_KEYS[f]
    s = Sprite(60, 56, PAL["foxglove_rosette"][1:])
    c = s.c
    leaves = []
    leaves.append(leaf(s, (35, 50), (49, 26), 11, bend=2.0))
    leaves.append(leaf(s, (32, 50), (38, 23), 10, bend=-1.5))
    leaves.append(leaf(s, (34, 52), (56, 48), 10.5, bend=-2.0))
    sp = bezier([(32, 50), (40, 34), (32 + dx * 0.4, 16 + dy * 0.5), (18 + dx, 13 + dy)], 40)
    spire = c.stroke(sp, 4.6, 2.8)
    s.add(spire, tones=(1, 2, 3), shade=(1, 0), band=(1, 2))
    bud(s, (15 + dx, 16 + dy), 2.6)
    bud(s, (22 + dx * 0.8, 11 + dy), 2.6)
    b2 = bell(s, (35.5 + dx * 0.3, 25 + dy * 0.3), 11, 8.0, 118 + sw * 0.7, body=1)
    b1 = bell(s, (27 + dx * 0.8, 14 + dy), 13, 9.4, 112 + sw, body=1)
    leaves.append(leaf(s, (32, 52), (6, 48), 13, bend=2.4))
    leaves.append(leaf(s, (33, 52), (22, 42), 9, bend=-1.5))
    s.render()
    for part, geo in leaves:
        veins(s, part, geo, 1)
    throat(s, b1[1])
    throat(s, b2[1], n_spots=2)
    s.contact(10, 18)
    s.contact(42, 50)
    s.headm = c.circle(25 + dx, 22, 17)
    return s


def rosette_back():
    s = Sprite(48, 48, PAL["foxglove_rosette"][1:], crop_bottom=True)
    c = s.c
    leaves = [leaf(s, (20, 46), (1, 30), 15, bend=-2), leaf(s, (22, 44), (10, 14), 13, bend=2),
              leaf(s, (27, 46), (47, 34), 15, bend=2)]
    sp = bezier([(24, 44), (20, 28), (27, 10), (38, 5)], 40)
    s.add(c.stroke(sp, 6.4, 4.0), tones=(1, 2, 3), shade=(1, 0), band=(1, 2))
    bud(s, (41, 6.5), 3.4)
    bell(s, (26, 16), 13, 10.5, 64, open_=-1, body=1)
    bell(s, (34, 7), 16, 12.5, 76, open_=-1, body=1)
    leaves += [leaf(s, (23, 48.5), (2, 46), 16, bend=-2), leaf(s, (25, 48.5), (47, 47), 16, bend=2)]
    s.render()
    for part, geo in leaves:
        veins(s, part, geo, 1)
    return px_index(s)


# ---------------------------------------------------------------------------
# foxglove: LOOMING. The bells snap open down the spike, bottom first.
# ---------------------------------------------------------------------------

BELLS = [(0.78, 9.5, 7.6, 100), (0.62, 11.5, 8.8, 106), (0.46, 13.0, 9.8, 112), (0.30, 14.0, 10.6, 118)]

# per-frame opening of each bell, top to bottom (0 shut, 1 open, >1 flared)
FOX_KEYS = [
    (1.0, 1.0, 1.0, 1.0),     # 0 rest
    (0.0, 0.0, 0.0, 0.0),     # 1 every bell shut
    (0.0, 0.0, 1.0, 1.2),     # 2 the lower bells pop open
    (1.25, 1.25, 1.25, 1.25), # 3 all flared (held)
]


def foxglove_front(f=0):
    opens = FOX_KEYS[f]
    s = Sprite(60, 56, PAL["foxglove"][1:])
    c = s.c
    leaves = []
    leaves.append(leaf(s, (40, 50), (57, 24), 13, bend=2.4, cloak=True))
    leaves.append(leaf(s, (39, 53), (57, 48), 11, bend=-1.5, cloak=True))
    sp = bezier([(38, 52), (49, 30), (40, 5), (21, 3), (14, 10)], 60)
    s.add(c.stroke(sp, 7.0, 3.2), tones=(0, 1, 2), shade=(1, 0), band=(1, 2), line="black")
    for at in ((14.5, 12), (19, 6.5), (25, 4.5)):
        bud(s, at, 2.5, tone=2)
    bells = []
    for (t, L, w, ang), op in reversed(list(zip(BELLS, opens))):
        x, y = sp[int(t * (len(sp) - 1))]
        bells.append(bell(s, (x - 1.5, y), L, w, ang + (6 if op > 1 else 0), open_=op))
    leaves.append(leaf(s, (37, 53), (5, 52), 15, bend=2.6, cloak=True))
    leaves.append(leaf(s, (34, 50), (7, 37), 11, bend=-3.0, cloak=True))
    s.render()
    for part, geo in leaves:
        veins(s, part, geo, 2, sides=False)
    cloak_rim(s, leaves)
    for part, info in bells:
        throat(s, info)
    s.contact(8, 15)
    s.contact(48, 55)
    s.headm = c.circle(0, 0, 1)
    for (t, L, w, ang) in BELLS:
        x, y = sp[int(t * (len(sp) - 1))]
        a = math.radians(ang)
        s.headm = s.headm | c.circle(x - 1.5 + math.cos(a) * L * 0.6, y + math.sin(a) * L * 0.6, L * 0.75)
    return s


def foxglove_back():
    s = Sprite(48, 48, PAL["foxglove"][1:], crop_bottom=True)
    c = s.c
    c.pose((24, 48), 0, zoom=1.12)
    leaves = [leaf(s, (20, 48.5), (0, 30), 15, bend=-2, cloak=True), leaf(s, (27, 48.5), (48, 36), 15, bend=2,
                                                                          cloak=True)]
    sp = bezier([(20, 48.5), (10, 26), (18, 5), (36, 2), (44, 9)], 60)
    s.add(c.stroke(sp, 8.0, 4.0), tones=(0, 1, 2), shade=(1, 0), band=(1, 2))
    for at, r in (((45, 12), 3.2), ((40, 5), 3.2)):
        bud(s, at, r, tone=2)
    spec = [((15, 32), 15.0, 13.0, 40), ((15, 21), 15.0, 12.0, 46), ((20, 11), 14.0, 11.0, 54),
            ((29, 5), 12.0, 9.5, 62)]
    for at, L, w, ang in spec:
        bell(s, at, L, w, ang, open_=-1, band=(1, 3))
    leaves.append(leaf(s, (24, 48.5), (4, 47), 16, bend=-2, cloak=True))
    s.render()
    for part, geo in leaves:
        veins(s, part, geo, 2, sides=False)
    cloak_rim(s, leaves)
    return px_index(s)


def frames_of(fn, n, dx):
    sp = [fn(k) for k in range(n)]
    fr = [px_index(x) for x in sp]
    regs = [None] + [sp[0].headm | sp[k].headm for k in range(1, n)]
    return place(register(fr, regs), 56, dx=dx)


# ---------------------------------------------------------------------------
# icons (16x16): k outline, 1 dark, 2 light, 3 white
# ---------------------------------------------------------------------------

ICONS = {   # (frame-0 rows, squash row, frame-2 extra pixels)
    "foxglove_rosette": ([
        "................",
        "....kkkk........",
        "...k2222k.......",
        "..k2kkk22k......",
        ".k3k....k2k.....",
        "k311k...k2k.....",
        "k311k..k22k.....",
        "k3k3kkk22k......",
        ".kk.k31kk.......",
        "...k3111k.......",
        "...kk3k3kkkk....",
        ".kkkkkkkkk222kkk",
        "k32222k32222222k",
        "k122222k2222211k",
        ".k111111111111k.",
        "..kkkkkkkkkkkk..",
    ], 10, None),
    "foxglove": ([
        "......kkkkk.....",
        ".....k11111k....",
        "....k1kkkk11k...",
        "...k32k...k11k..",
        "..k3222k..k11k..",
        "..k2222k..k11k..",
        ".k332222k.k11k..",
        ".k31332k..k11k..",
        "..kkkkk..k111k..",
        "......k32k11k...",
        ".....k3222k11k..",
        "....k22222k11k..",
        "...k3322222k11k.",
        "..k313332kk111k.",
        ".k222111111221k.",
        "..kkkkkkkkkkkk..",
    ], 8, None),
}


ANIM = {
    # draw back (anticipation), swing the bells at the foe (held), ring back, settle
    "foxglove_rosette": {"intro": [[0, 4], [1, 12], [2, 16], [3, 6], [0, 4], [3, 4], [0, 6]],
                         "idle": [[0, 120], [3, 8]]},
    # all shut, the lower bells pop, ALL FLARED (held), settle, a ring
    "foxglove": {"intro": [[1, 10], [2, 8], [3, 18], [0, 6], [3, 4], [0, 8]],
                 "idle": [[0, 140], [3, 8]]},
}

NOTES = {
    "foxglove_rosette": "Crystal rule. COILED. Gesture: the crook nods (draws back, held, swings its two "
                        "bells at the foe, held, rings back and settles); only the crook and its bells move. "
                        "Two tones: foxglove magenta (the young bells, and every leaf's shadow) and woolly "
                        "grey-sage; white is the pale lip of each bell, where the speckles sit, and the lit "
                        "rims. No faces: the bells hang side-on, mouths down. Sport: 'Alba' (white "
                        "foxglove: grey-green buds).",
    "foxglove": "Crystal rule. LOOMING. Gesture: the bells snap open down the spike bottom-first, as the "
                "real raceme opens (all shut, the lower bells pop, every bell flared, held, settle). Two "
                "tones: the dusky plum cloak and spire (as in the base art) and foxglove pink bells; the "
                "pink is also the lit band and the midrib of each plum leaf, so the dark cloak reads as "
                "forms. The spotted throat is a black crescent over a white lip with plum speckles, "
                "side-on, never a disc. Sport: 'Alba' (cream bells, dusky spots).",
}


def build_all(write=True):
    out = {}
    specs = {
        "foxglove_rosette": (lambda: frames_of(rosette_front, len(ROS_KEYS), 1), rosette_back),
        "foxglove": (lambda: frames_of(foxglove_front, len(FOX_KEYS), 0), foxglove_back),
    }
    for sid, (ffn, bfn) in specs.items():
        front = ffn()
        back = bfn()
        icons = [outline_fix(x) for x in icon_pair(*ICONS[sid])]
        out[sid] = (front, back, icons)
        if write:
            from kit import write_species
            write_species(sid, palette=PAL[sid], sport=SPORT[sid], front=front, back=[back], icon=icons,
                          anim=ANIM[sid], moving=moving_boxes(front), notes=NOTES[sid], tool=TOOL)
    return out


def build():
    build_all(write=True)


if __name__ == "__main__":
    if "--preview" in sys.argv:
        out = build_all(write=False)
        rows = [(PAL[sid], list(fr) + [bk] + ic, SPORT[sid]) for sid, (fr, bk, ic) in out.items()]
        print(preview(rows, sys.argv[-1] if sys.argv[-1].endswith(".png") else "/tmp/foxglove.png"))
    else:
        build()
