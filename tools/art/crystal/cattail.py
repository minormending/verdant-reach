"""Crystal rule, cattail line: cattail_shoot -> cattail (Typha latifolia).

A redraw of tools/art/species_c/cattail.py under the Crystal rule
(docs/ROLLOUT.md, docs/CREATURES.md):

  index 0  #181818  outline, the pool the plant rises from, the spike's
           shadow side, creases                                  (shared)
  index 1  cattail brown: the velvet spike (the line's accent) and the
           shadow side / turned-away face of every blade
  index 2  sedge green: the strap blades and the stem
  index 3  #f8f8f8  rims on the lit blades and spike, the seed fluff
           (shared)

The two-hue plant (brown spike, green blades) keeps both hues the
flytrap's way: the brown lives in the dark slot, a flat velvet field on
the spike, and doubles as the shadow band on every green blade.

Poses (docs/CREATURES.md, kept from the base art):
  cattail_shoot  REARING  the sheath bundle rises in an S out of the water,
                          the stubby young spike tipped at the foe under a
                          hooding spathe, a strap leaf drooping forward.
  cattail        REARING  the great velvet spike leaning at the foe, its
                          bare male spike a horn, a hood blade arched over,
                          a sword blade thrust out.

Entrance animations (the spike is the head):
  cattail_shoot  the spike sways back, BOBS forward past rest, rebounds
                 and settles.
  cattail        the spike rears back, BOBS forward and sheds a burst of
                 white seed fluff, which drifts off as it rebounds.

Sport: Typha latifolia 'Variegata' (docs/SPORTS.md): a rusty spike, cream
blades.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/cattail.py            # write the base bundles
  $PY tools/art/crystal/cattail.py --preview  # scratch preview only
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
                        px_kit, register)

px, common = px_kit()
Sprite, bezier = px.Sprite, px.bezier

TOOL = "tools/art/crystal/cattail.py"
IDS = ["cattail_shoot", "cattail"]

BROWN = "#804820"
SEDGE = "#a8c858"
PAL = [BLACK, BROWN, SEDGE, WHITE]
SPORT = [BLACK, "#985830", "#e0d898", WHITE]     # 'Variegata': rusty spike, cream blades
SPAL = [BROWN, SEDGE, WHITE]


# ---------------------------------------------------------------------------
# parts
# ---------------------------------------------------------------------------

def blade(s, ctrl, w0, w1, twist=(), rim=True, n=60):
    """A strap leaf along a bezier, tapering w0 -> w1: green, a brown
    crescent bottom-right, a white band inside the lit edge, and brown on
    the `twist` spans where the blade turns its underside to us."""
    c = s.c
    path = bezier(ctrl, n)
    m = c.stroke(path, w0, w1)
    part = s.add(m, tones=(1, 2, 3) if rim else (1, 2, 2), shade=(1, 1), band=(1, 3) if rim else None,
                 line="black")
    under = c.empty()
    L = len(path)
    for t0, t1 in twist:
        k0, k1 = int(t0 * (L - 1)), int(t1 * (L - 1))
        seg = path[k0:k1 + 1]
        if len(seg) >= 2:
            ww = [w0 + (w1 - w0) * (k / (L - 1)) for k in range(k0, k1 + 1)]
            under |= c.stroke(seg, max(ww) + 0.5)
    return part, under


def spike(s, cx, cy, h, w, ang):
    """The velvet sausage: a capsule (height h, width w) centred (cx, cy),
    tilted `ang` degrees (negative = top leans left). Flat brown."""
    c = s.c
    a = math.radians(ang)
    ux, uy = math.sin(a), -math.cos(a)
    top = (cx + ux * (h / 2 - w / 2), cy + uy * (h / 2 - w / 2))
    bot = (cx - ux * (h / 2 - w / 2), cy - uy * (h / 2 - w / 2))
    m = c.stroke([bot, top], w)
    q0 = (bot[0] - ux * w * 0.18, bot[1] - uy * w * 0.18)
    q1 = (top[0] + ux * w * 0.18, top[1] + uy * w * 0.18)
    m |= c.stroke([q0, q1], w * 0.82)
    part = s.add(m, tones=(1, 1, 1), flat=True, line="black")
    return part, top, bot, (ux, uy)


def light_spike(s, part, top, bot, ax, w):
    """Cylinder light, flat and bold: a black shadow band down the right
    side, a white rim down the lit left shoulder, and a few black velvet
    pocks along the terminator (texture, so the brown is not a blob)."""
    c = s.c
    ux, uy = ax
    nx, ny = -uy, ux
    m = part.mask & (s.t == 1)
    off = w * 0.40
    sh = c.stroke([(bot[0] + nx * off, bot[1] + ny * off), (top[0] + nx * off, top[1] + ny * off)], w * 0.30)
    s.paint(sh & m, 0)
    lit = c.stroke([(bot[0] - nx * w * 0.28 + ux * 1.5, bot[1] - ny * w * 0.28 + uy * 1.5),
                    (top[0] - nx * w * 0.28 - ux * 0.5, top[1] - ny * w * 0.28 - uy * 0.5)], 1.2 + w * 0.06)
    s.paint(lit & m, 3)
    L = math.dist(top, bot)
    for j in range(1, int(L / 4.0)):
        f = j / int(L / 4.0)
        px_ = bot[0] + (top[0] - bot[0]) * f + nx * w * (0.12 if j % 2 else 0.02)
        py_ = bot[1] + (top[1] - bot[1]) * f + ny * w * (0.12 if j % 2 else 0.02)
        X, Y = c.to_screen(px_, py_)
        X, Y = int(round(X)), int(round(Y))
        if 0 <= X < s.w and 0 <= Y < s.h and s.t[Y, X] == 1:
            s.px([(X, Y)], 0)


def horn(s, top, ax, a, b, w0, w1):
    ux, uy = ax
    m = s.c.stroke([(top[0] + ux * a, top[1] + uy * a), (top[0] + ux * b, top[1] + uy * b)], w0, w1)
    return s.add(m, tones=(1, 2, 2), shade=(1, 0), line="black")


def pool(s, cx, cy, rx, ry):
    """The water the plant rears out of: a black pool with a white lit arc
    on its near edge (and the outline, as everywhere)."""
    c = s.c
    s.add(c.ellipse(cx, cy, rx, ry), tones=(0, 0, 0), flat=True, line="black")


def pool_light(s, cx, cy, rx, ry):
    ys, xs = np.mgrid[0:s.h, 0:s.w]
    e = lambda yy, k: ((xs + 0.5 - cx) / (rx * k)) ** 2 + ((ys + 0.5 - yy) / ry) ** 2 <= 1  # noqa: E731
    arc = e(cy + 0.9, 0.78) & ~e(cy - 0.1, 0.78) & (s.t == 0) & (ys < cy + ry)
    s.t[arc & (xs < cx + rx * 0.3)] = 3
    s.protect |= arc


def fluff(s, x, y, size=2):
    """A tuft of seed fluff: white, outlined."""
    rows = {1: ["_00_", "0330", "_00_"],
            2: ["_00__", "03300", "_0330", "__00_"],
            3: ["_000__", "033300", "_03330", "__000_"]}[size]
    s.rows(int(x), int(y), rows)


# ---------------------------------------------------------------------------
# cattail_shoot: REARING. Sway back, BOB forward, rebound.
# ---------------------------------------------------------------------------

# (spike dx, dy, angle)
SHOOT_KEYS = [
    (0.0, 0.0, -20),     # 0 rest
    (2.0, -1.0, -8),     # 1 swayed back (anticipation)
    (-2.5, 1.5, -34),    # 2 BOB forward (held)
    (0.8, -0.5, -14),    # 3 rebound
]


def shoot_front(f=0):
    dx, dy, ang = SHOOT_KEYS[f]
    s = Sprite(60, 56, SPAL)
    c = s.c
    pool(s, 31, 52.2, 17, 3.6)
    c.pose((33, 52), 8, shift=(1, 2))
    rear = blade(s, [(34, 50), (41, 34), (49, 20), (55, 24)], 8.0, 2.6, twist=[(0.55, 0.8)])
    tor = c.curve([(31, 52), (36, 43), (34, 33), (28, 27)], 12.0, 8.0)
    s.add(tor, tones=(1, 2, 3), shade=(2, 1), band=(1, 2), line="black")
    wrap = blade(s, [(28, 52), (30.5, 44), (31.5, 36)], 6.0, 2.0)
    # the head: spathe + young spike + horn, all swaying together about the neck
    hx, hy = 25 + dx, 18 + dy
    a = math.radians(ang + 20)

    def R(p):
        x, y = p[0] - 28, p[1] - 27
        return (28 + dx + x * math.cos(a) - y * math.sin(a), 27 + dy + x * math.sin(a) + y * math.cos(a))
    spathe = blade(s, [R((32, 28)), R((37, 14)), R((33, 3)), R((23, 1.5)), R((15, 5))], 4.8, 1.8,
                   twist=[(0.45, 0.7)])
    sp, top, bot, ax = spike(s, hx, hy, 22, 10.6, ang)
    horn(s, top, ax, 3, 10, 3.4, 2.4)
    lead = blade(s, [(33, 40), (22, 33), (11, 33), (5, 41)], 8.6, 2.8, twist=[(0.55, 0.70)])
    s.render()
    light_spike(s, sp, top, bot, ax, 10.6)
    for part, under in (rear, lead, wrap, spathe):
        s.paint(under & part.mask, 1, only=[2, 3])
    pool_light(s, 30, 52.2, 17, 3.6)
    s.contact(15, 22)
    s.headm = c.circle(hx, hy - 4, 19)
    return s


def shoot_back():
    s = Sprite(48, 48, SPAL, crop_bottom=True)
    c = s.c
    c.pose((24, 48), 0, shift=(0, 3), zoom=1.1)
    rear = blade(s, [(16, 48.5), (8, 36), (2, 24), (1, 30)], 9.0, 3.0, twist=[(0.5, 0.75)])
    s.add(c.curve([(19, 48.5), (20, 38), (24, 30)], 17, 12), tones=(1, 2, 3), shade=(3, 1), band=(1, 2))
    spathe = blade(s, [(18, 34), (14, 18), (20, 4), (32, 1), (40, 6)], 6.0, 2.2, twist=[(0.0, 0.3)])
    sp, top, bot, ax = spike(s, 28, 19, 28, 15.0, 16)
    horn(s, top, ax, 5, 11, 3.8, 2.6)
    lead = blade(s, [(24, 42), (35, 35), (44, 34), (47.5, 42)], 10.0, 3.2, twist=[(0.45, 0.7)])
    s.render()
    light_spike(s, sp, top, bot, ax, 15.0)
    for part, under in (rear, lead, spathe):
        s.paint(under & part.mask, 1, only=[2, 3])
    return px_index(s)


# ---------------------------------------------------------------------------
# cattail: REARING. Rear back, BOB, shed fluff.
# ---------------------------------------------------------------------------

# (spike dx, dy, angle, fluff stage)
CAT_KEYS = [
    (0.0, 0.0, -14, 0),    # 0 rest
    (1.5, 1.0, -7, 0),     # 1 reared back (anticipation)
    (-2.0, 1.0, -26, 1),   # 2 BOB forward: the fluff bursts (held)
    (0.5, 0.0, -12, 2),    # 3 rebound: the fluff drifts off
]


def cattail_front(f=0):
    dx, dy, ang, fl = CAT_KEYS[f]
    s = Sprite(60, 62, SPAL)          # 6px of headroom for the reared frames
    c = s.c
    pool(s, 32, 58.6, 22, 3.4)
    c.pose((35, 58), 9, shift=(2, 6))
    a = math.radians(ang + 14)

    def R(p):
        x, y = p[0] - 30, p[1] - 29
        return (30 + dx + x * math.cos(a) - y * math.sin(a), 29 + dy + x * math.sin(a) + y * math.cos(a))
    rear = blade(s, [(39, 51), (47, 30), (46, 6), (32, 0.5), (21, 5)], 8.6, 2.6, twist=[(0.66, 0.86)])
    tail = blade(s, [(38, 51), (47, 45), (55, 43)], 6.4, 2.0)
    stem = c.curve([(33, 52), (39, 42), (36, 33), R((30, 29))], 7.4, 5.4)
    s.add(stem, tones=(1, 2, 3), shade=(1, 0), band=(1, 2), line="black")
    sheath = blade(s, [(30, 52), (33, 44), (34, 35)], 9.0, 2.8)
    hx, hy = R((26, 18))
    sp, top, bot, ax = spike(s, hx, hy, 32, 14.0, ang)
    horn(s, top, ax, 5, 11, 3.6, 2.4)
    low = blade(s, [(33, 50), (23, 46), (13, 49)], 6.0, 2.2)
    lead = blade(s, [(39, 45), (27, 39), (15, 35), (3, 32)], 10.5, 1.4, twist=[(0.55, 0.68)])
    s.render()
    light_spike(s, sp, top, bot, ax, 14.0)
    for part, under in (rear, lead, sheath, tail, low):
        s.paint(under & part.mask, 1, only=[2, 3])
    pool_light(s, 30, 58.6, 22, 3.4)
    tx, ty = c.to_screen(*top)
    if fl == 1:          # the burst, off the spike's back and crown
        fluff(s, tx + 9, ty - 2, 3)
        fluff(s, tx + 12, ty + 6, 2)
        fluff(s, tx + 3, ty - 8, 2)
    elif fl == 2:        # drifting up and back
        fluff(s, tx + 15, ty - 5, 2)
        fluff(s, tx + 20, ty + 1, 1)
        fluff(s, tx + 8, ty - 10, 1)
    s.contact(11, 17)
    s.headm = c.circle(hx, hy - 3, 22) | box(s.h, s.w, int(tx) - 4, 0, 60, int(ty) + 8)
    return s


def cattail_back():
    s = Sprite(48, 48, SPAL, crop_bottom=True)
    c = s.c
    c.pose((24, 48), 0, shift=(0, 3), zoom=1.04)
    hood = blade(s, [(14, 48.5), (5, 30), (8, 8), (22, 0.5), (40, 2)], 9.0, 3.0, twist=[(0.55, 0.85)])
    s.add(c.curve([(19, 48.5), (20, 38), (25, 30)], 16, 12), tones=(1, 2, 3), shade=(3, 1), band=(1, 2))
    sp, top, bot, ax = spike(s, 29, 20, 34, 18.5, 14)
    horn(s, top, ax, 6, 12, 4.0, 2.6)
    lead = blade(s, [(24, 43), (35, 37), (44, 37), (47.5, 46)], 10.5, 3.4, twist=[(0.45, 0.7)])
    s.render()
    light_spike(s, sp, top, bot, ax, 18.5)
    for part, under in (hood, lead):
        s.paint(under & part.mask, 1, only=[2, 3])
    return px_index(s)


def frames_of(fn, n):
    sp = [fn(k) for k in range(n)]
    fr = [px_index(x) for x in sp]
    return register(fr)      # only the spike, its neck and the fluff differ


# ---------------------------------------------------------------------------
# icons (16x16): k outline, 1 brown, 2 sedge, 3 white
# ---------------------------------------------------------------------------

ICONS = {   # (frame-0 rows, squash row, frame-2 extra pixels: a tuft of fluff)
    "cattail_shoot": ([
        "......k.........",
        ".....k2k........",
        "....kk2kk.......",
        "...k31111k......",
        "...k31110k......",
        "...k31110k..kk..",
        "...k31100k.k22k.",
        "....k110k.k221k.",
        "....kk22kk2221kk",
        ".kkkkk2222221kk.",
        "k322222222211kk.",
        "k211kkk22221k...",
        ".kk...k22221k...",
        "..kkkkkk222kkkk.",
        ".kk333kkkkk33kkk",
        "..kkkkkkkkkkkkk.",
    ], 8, None),
    "cattail": ([
        "......k.........",
        ".....k2kk.....k.",
        "....k1111k...k2k",
        "...k311110k..k2k",
        "...k311110k.k22k",
        "...k311110k.k21k",
        "...k311100k.k21k",
        "...k311100kk22k.",
        "....k3110kk22k..",
        "....kk222kk21k..",
        ".kkkkk2222k221k.",
        "k3222222222211kk",
        "k211kkkk222221k.",
        "k1kk...k22221kk.",
        "..kkkkkkk222kkk.",
        ".kk3333kkk333kk.",
    ], 9, {(11, 0): "k", (10, 1): "k", (11, 1): "3", (12, 1): "k", (11, 2): "k"}),
}


ANIM = {
    # sway back (anticipation), BOB forward (held), rebound, settle
    "cattail_shoot": {"intro": [[0, 4], [1, 12], [2, 16], [3, 6], [0, 4], [3, 4], [0, 6]],
                      "idle": [[0, 120], [3, 8]]},
    # rear back, BOB and burst (held), rebound with the fluff drifting, settle
    "cattail": {"intro": [[0, 4], [1, 12], [2, 16], [3, 10], [0, 4], [3, 4], [0, 6]],
                "idle": [[0, 140], [3, 10]]},
}

NOTES = {
    "cattail_shoot": "Crystal rule. REARING. Gesture: the young spike sways back (held), bobs forward past "
                     "rest (held), rebounds and settles; the spathe and horn ride with it. Two hues the "
                     "flytrap way: the brown spike lives in the dark slot and is also the shadow band and "
                     "turned-away face of every green blade; the pool is black with a white lit arc. "
                     "Sport: Typha latifolia 'Variegata' (rusty spike, cream blades).",
    "cattail": "Crystal rule. REARING. Gesture: the great spike rears back, BOBS forward and sheds a burst "
               "of white seed fluff (held), which drifts off as it rebounds. Only the spike, its horn, the "
               "top of the stem and the fluff move. The velvet brown is broken by a black shadow band, a "
               "white rim on the lit shoulder and black pocks. Sport: 'Variegata'.",
}


def build_all(write=True):
    out = {}
    specs = {
        "cattail_shoot": (lambda: place(frames_of(shoot_front, len(SHOOT_KEYS)), 56, dx=1), shoot_back),
        "cattail": (lambda: place(frames_of(cattail_front, len(CAT_KEYS)), 56, dx=0), cattail_back),
    }
    for sid, (ffn, bfn) in specs.items():
        front = ffn()
        back = bfn()
        icons = [outline_fix(x) for x in icon_pair(*ICONS[sid])]
        out[sid] = (front, back, icons)
        if write:
            from kit import write_species
            write_species(sid, palette=PAL, sport=SPORT, front=front, back=[back], icon=icons,
                          anim=ANIM[sid], moving=moving_boxes(front), notes=NOTES[sid], tool=TOOL)
    return out


def build():
    build_all(write=True)


if __name__ == "__main__":
    if "--preview" in sys.argv:
        out = build_all(write=False)
        rows = [(PAL, list(fr) + [bk] + ic, SPORT) for fr, bk, ic in out.values()]
        print(preview(rows, sys.argv[-1] if sys.argv[-1].endswith(".png") else "/tmp/cattail.png"))
    else:
        build()
