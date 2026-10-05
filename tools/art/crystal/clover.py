"""Crystal rule, clover line: clover_sprout -> white_clover (Trifolium repens).

A redraw of tools/art/species_c/clover.py under the Crystal rule
(docs/ROLLOUT.md, docs/CREATURES.md):

  index 0  #181818  outline, leaflet seams, floret seams         (shared)
  index 1  blue-green shade: the shadow side of every leaflet, the
           shaded side of the flower head
  index 2  clover green: the leaflets and stalks
  index 3  #f8f8f8  the chevrons, the lit rims, the florets (white clover
           is really white, so the flower head is the white)  (shared)

Clover is one hue, so it needs no second-hue trick: the dark slot is a
blue-shifted shade of the green. The white cap is kept on the white clover
by lighting the flower head as a ball of florets: each a white dome with a
green crescent and seam, green past the terminator. The Director listed
white_clover as a white part (kit.WHITE_PARTS: up to 35% white).

Poses (docs/CREATURES.md, kept from the base art):
  clover_sprout  BOBBING   a springy C stalk, the trefoil head tipped at the
                           foe, the spade leaf raised, a dew drop falling.
  white_clover   LUNGING   the pom-pom thrust out past the front foot on a
                           C peduncle, trefoil fists, stolon feet.

Entrance animations:
  clover_sprout  the trefoil WAKES: the head starts folded shut (clover
                 leaflets really fold up at night), pops open wider than
                 rest, and settles.
  white_clover   a duck and a PUFF: the pom-pom ducks back, lunges out
                 swelling, its florets shiver and one floret flies off.

Sport: Trifolium repens 'Purpurascens Quadrifolium' (docs/SPORTS.md):
burgundy-black shade and burgundy leaves; the heads stay white.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/clover.py            # write the base bundles
  $PY tools/art/crystal/clover.py --preview  # scratch preview only
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
from kit import legacy  # noqa: E402

px, common = px_kit()
old = legacy("species_c/clover.py")      # shape helpers: heart, pompom, floret_marks, paint_creases
Sprite = px.Sprite
chevron = common.chevron

TOOL = "tools/art/crystal/clover.py"
IDS = ["clover_sprout", "white_clover"]

SHADE = "#286838"
GREEN = "#70b840"
PAL = [BLACK, SHADE, GREEN, WHITE]
SPORT = [BLACK, "#401830", "#985068", WHITE]   # 'Purpurascens Quadrifolium'
SPAL = [SHADE, GREEN, WHITE]


def trefoil(s, cen, face, L, w, spread=82, sq=1.0, order=(2, 1, 0), lens=(1, 1, 1), widths=(1, 1, 1),
            line="black", rim=True):
    """Three obovate leaflets from `cen`, the middle one pointing `face`
    degrees: green, a crisp blue-green crescent bottom-right, and (rim) a
    1px white band inside the lit top-left edge."""
    c = s.c
    out = []
    for k in order:
        a = math.radians(face + (k - 1) * spread)
        Lk = L * lens[k]
        p1 = (cen[0] + math.cos(a) * Lk, cen[1] + math.sin(a) * Lk * sq)
        p0 = (cen[0] + math.cos(a) * 0.8, cen[1] + math.sin(a) * 0.8 * sq)
        m = old.heart(c, p0, p1, w * widths[k])
        if rim:
            part = s.add(m, tones=(1, 2, 3), shade=(2, 2), close=1, band=(1, 2), line=line)
        else:
            part = s.add(m, tones=(1, 2, 2), shade=(2, 2), close=1, line=line)
        out.append((part, p0, p1, w * widths[k]))
    return out


def chevrons(s, leaves, at=0.40, thick=1.5, span=0.55, depth=0.18):
    for part, p0, p1, w in leaves:
        m = chevron(s.c, p0, p1, w, at=at, depth=depth, thick=thick, span=span)
        s.paint(m & part.mask, 3, only=[1, 2])


def drop(s, x, y):
    s.rows(x, y, ["_0__", "030_", "0330", "0320", "_00_"])


# ---------------------------------------------------------------------------
# clover_sprout: BOBBING. The trefoil wakes.
# ---------------------------------------------------------------------------

# (spread, length scale, width scale, head tilt deg, drop fall px)
SPROUT_KEYS = [
    (120, 1.00, 1.00, 0, 0),    # 0 rest: open
    (34, 0.92, 0.55, 5, 0),     # 1 folded shut (asleep)
    (84, 0.97, 0.82, 2, 1),     # 2 opening
    (136, 1.07, 1.06, -3, 3),   # 3 popped wide (held), the drop falls
]


def sprout_front(f=0):
    spread, ls, ws, tilt, dy = SPROUT_KEYS[f]
    s = Sprite(60, 56, SPAL)
    c = s.c
    s.add(c.ellipse(30.0, 52.6, 6.8, 2.9, -8), tones=(1, 2, 2), shade=(1, 1))
    s.add(c.ellipse(42.5, 53.1, 5.2, 2.4, 10), tones=(1, 1, 2), shade=(1, 1))
    c.pose((37, 55), 17, shift=(4, 0))
    s.add(c.curve([(33, 47), (39, 43), (43, 38)], 2.4, 2.0), tones=(1, 2, 2), shade=(1, 0))
    rear = trefoil(s, (44, 37), -70, 9.0, 8.4, spread=118, sq=0.9, lens=(0.9, 1, 0.9), line="black")
    s.add(c.curve([(31.5, 55.8), (35.5, 46), (33, 34), (27, 27)], 4.0, 3.0), tones=(1, 2, 3),
          shade=(1, 0), band=(1, 2))
    s.add(c.curve([(34, 47), (28, 45), (22, 42.5)], 2.4, 2.0), tones=(1, 2, 2), shade=(1, 0))
    arm = c.leaf((22.5, 43), (8.5, 38.5), 9.6, power=0.8, tip=0.6, base=1.4, bend=-1.2)
    s.add(arm, tones=(1, 2, 3), shade=(2, 2), band=(1, 2))
    # the head: the trefoil, tipped at the foe; it folds and pops open
    cen = (26.5, 23)
    face = -114 + tilt
    L = 15.5 * ls
    s.add(c.ellipse(cen[0] + 0.5, cen[1] + 1.5, 2.6, 2.2), tones=(1, 2, 2), shade=(1, 1))   # the leaf's knot
    head = trefoil(s, cen, face, L, 16.0 * ws, spread=spread, sq=0.95, order=(2, 1, 0),
                   lens=(1.04, 1.0, 0.84), widths=(1.04, 1.0, 0.86), line="black")
    s.render()
    if ws > 0.7:
        chevrons(s, head, thick=1.5 if ws > 0.9 else 1.0)
    chevrons(s, rear, thick=1.0, span=0.5)
    # a dew bead on the arm's tip, falling off
    tx, ty = c.to_screen(8.5, 38.5)
    drop(s, int(tx) - 3, int(ty) + 2 + dy)
    s.contact(24, 34)
    return px_index(s)


def sprout_back():
    s = Sprite(48, 48, SPAL, crop_bottom=True)
    c = s.c
    s.add(c.curve([(16, 48.5), (11, 43), (5, 40)], 4.0, 3.2), tones=(1, 2, 2), shade=(1, 0))
    rear = trefoil(s, (5, 39), -160, 9.5, 9.5, spread=118, sq=0.8)
    s.add(c.curve([(21, 48.5), (21, 40), (23, 30)], 9.0, 7.0), tones=(1, 2, 3), shade=(2, 0), band=(1, 2))
    s.add(c.curve([(25, 42), (33, 39), (38, 35)], 4.0, 3.2), tones=(1, 2, 2), shade=(1, 0))
    s.add(c.leaf((36, 37), (47.5, 22), 14, power=0.8, tip=0.6, base=1.4, bend=1.0), tones=(1, 2, 3),
          shade=(2, 2), band=(1, 2))
    head = trefoil(s, (23, 22), -62, 21.5, 22.0, spread=120, sq=0.8, order=(1, 0, 2),
                   lens=(1.0, 1.05, 1.0), widths=(1.0, 1.04, 1.0))
    s.render()
    chevrons(s, head, thick=2.0)
    chevrons(s, rear, thick=1.3)
    return px_index(s)


# ---------------------------------------------------------------------------
# white_clover: LUNGING. Duck and PUFF.
# ---------------------------------------------------------------------------

# (head dx, head dy, radius, floret seed jitter, loose floret position or None)
CLOVER_KEYS = [
    (0.0, 0.0, 13.0, 0.0, None),          # 0 rest
    (3.0, 1.5, 12.2, 0.0, None),          # 1 duck back (anticipation)
    (-2.0, -0.5, 14.2, 0.35, (33, 7)),    # 2 lunge out, PUFF, a floret flies
    (-1.0, 0.0, 13.6, 0.70, (38, 3)),     # 3 the florets shiver, the floret drifts (held)
]


def clover_front(f=0):
    hdx, hdy, hr, jit, loose = CLOVER_KEYS[f]
    s = Sprite(60, 56, SPAL)
    c = s.c
    s.add(c.curve([(35, 53), (28, 47.5), (19, 49), (13, 54.5)], 3.4, 2.8), tones=(1, 2, 3), shade=(1, 1),
          band=(1, 2))
    s.add(c.curve([(37, 53), (43, 48.5), (49, 50), (52, 54.5)], 3.2, 2.6), tones=(1, 2, 2), shade=(1, 1))
    s.add(c.ellipse(13, 54, 3.6, 1.8) | c.ellipse(52.5, 54, 3.0, 1.6) | c.ellipse(36, 54, 4.0, 1.8),
          tones=(1, 1, 2), shade=(1, 1))
    c.pose((36, 53), 10, shift=(3, 0))
    s.add(c.curve([(40, 52), (44, 42), (47, 32), (47.5, 25)], 2.6, 2.2), tones=(1, 2, 2), shade=(1, 0))
    rear = trefoil(s, (47.5, 22), -60, 10.0, 9.6, spread=118, sq=0.9, lens=(0.95, 1.0, 0.85),
                   widths=(1, 1, 0.9))
    hx, hy = 22.5 + hdx, 17 + hdy
    ped = c.curve([(36, 53), (39, 42), (35, 31), (hx + 4, hy + 6)], 4.6, 3.4)
    s.add(ped, tones=(1, 2, 3), shade=(1, 0), band=(1, 2))
    ruff = c.empty()
    for k in range(8):
        a = math.radians(30 + k * 17)
        x0, y0 = hx + math.cos(a) * hr * 0.6, hy + math.sin(a) * hr * 0.6
        x1, y1 = hx + math.cos(a) * (hr + 3.2), hy + math.sin(a) * (hr + 2.8) + 2.0
        ruff |= c.leaf((x0, y0), (x1, y1), 3.8, power=0.6, tip=1.3)
    s.add(ruff, tones=(1, 1, 2), shade=(1, 1), line="black")
    pompom(s, hx, hy, hr, n=16, seed=2.2 + jit, rb=4.4, tilt=-22, sq=0.86, notches=(-60, 10, 75))
    s.add(c.curve([(33, 52), (26, 47), (19, 42)], 2.8, 2.4), tones=(1, 2, 2), shade=(1, 0))
    lead = trefoil(s, (16.5, 40.5), 170, 11.5, 11.5, spread=118, sq=0.85, order=(0, 2, 1),
                   lens=(1.0, 1.0, 0.95))
    s.render()
    old.paint_creases(s)
    chevrons(s, lead)
    chevrons(s, rear, thick=1.2, span=0.5)
    if loose:
        fx, fy = c.to_screen(*loose)
        s.rows(int(fx), int(fy), ["_00_", "0330", "_020", "__0_"])
    s.contact(10, 16)
    s.contact(33, 39)
    s.headm = c.circle(hx, hy, hr + 6.0)
    return s


def pompom(s, hx, hy, hr, n=19, seed=3.0, rb=3.9, tilt=0.0, sq=1.0, notches=(), lit_cut=-0.2):
    """The flower head as a ball of florets (after species_c/clover.py),
    lit Crystal-style: every floret is a little dome with a crisp 1px
    crescent on its bottom-right and a seam against the florets behind it.
    On the lit side a floret is white with green crescents and seams; past
    the terminator it is green with blue-green ones. So the head reads as a
    white ball of florets with green texture, not a white blob."""
    c = s.c
    t = math.radians(tilt)

    def P(x, y):
        return hx + (x * math.cos(t) - y * sq * math.sin(t)), hy + (x * math.sin(t) + y * sq * math.cos(t))

    cut = c.empty()
    creases = []
    for ang in notches:
        a = math.radians(ang)
        p1 = P(math.cos(a) * (hr + 1.5), math.sin(a) * (hr + 1.5))
        p0 = P(math.cos(a) * (hr - 4.5), math.sin(a) * (hr - 4.5))
        cut |= c.leaf(p1, p0, 3.2, power=0.9, tip=2.0)
        creases.append((P(math.cos(a) * (hr - 4), math.sin(a) * (hr - 4)),
                        P(math.cos(a) * (hr - 7.5), math.sin(a) * (hr - 7.5))))
    pts = []
    ga = math.pi * (3 - math.sqrt(5))
    for k in range(n):
        z = 1 - (k + 0.5) / n
        rr = math.sqrt(1 - z * z)
        a = k * ga + seed
        pts.append((math.cos(a) * rr, math.sin(a) * rr, z))
    pts.sort(key=lambda q: q[2])
    L = np.array([-0.55, -0.62, 0.56])
    L /= np.linalg.norm(L)
    base = c.ellipse(hx, hy, hr - 1.2, (hr - 1.2) * sq, tilt)
    for k in range(18):
        a = 2 * math.pi * k / 18 + seed
        base |= c.circle(*P(math.cos(a) * (hr - 0.2), math.sin(a) * (hr - 0.2)), 1.5)
    s.add(base & ~cut, tones=(1, 2, 2), shade=(3, 3), close=1, line="none")
    for x, y, z in pts:
        X, Y = P(x * (hr - rb * 0.55), y * (hr - rb * 0.55))
        lam = float(np.dot([(X - hx) / hr, (Y - hy) / hr, z], L))
        r = rb * (0.75 + 0.35 * z)
        m = c.circle(X, Y, r) & ~cut
        tones = (2, 3, 3) if lam > lit_cut else (1, 2, 2)
        s.add(m, prune=False, tones=tones, shade=(1, 1), line="dark")
    s._creases = getattr(s, "_creases", []) + creases


def clover_back():
    s = Sprite(48, 48, SPAL, crop_bottom=True)
    c = s.c
    s.add(c.curve([(16, 48.5), (10, 43), (5, 40)], 4.0, 3.2), tones=(1, 2, 2), shade=(1, 0))
    rear = trefoil(s, (5, 39), -170, 10.5, 10.5, spread=118, sq=0.8)
    s.add(c.curve([(21, 48.5), (22, 40), (24, 32)], 10.0, 8.0), tones=(1, 2, 3), shade=(2, 0), band=(1, 2))
    hx, hy, hr = 25, 19, 18.5
    ruff = c.empty()
    for k in range(11):
        a = math.radians(15 + k * 15)
        ruff |= c.leaf((hx + math.cos(a) * hr * 0.55, hy + math.sin(a) * hr * 0.55),
                       (hx + math.cos(a) * (hr + 3.6), hy + math.sin(a) * (hr + 3) + 2), 4.6, power=0.6, tip=1.3)
    s.add(ruff, tones=(1, 1, 2), shade=(1, 1), line="black")
    pompom(s, hx, hy, hr, n=22, seed=1.3, rb=5.2, tilt=20, sq=0.88, notches=(-150, -80, 5), lit_cut=0.3)
    s.add(c.curve([(25, 44), (34, 41), (39, 38)], 4.0, 3.2), tones=(1, 2, 2), shade=(1, 0))
    lead = trefoil(s, (41, 37), -25, 11.5, 11.5, spread=118, sq=0.8, order=(2, 0, 1))
    s.render()
    old.paint_creases(s)
    chevrons(s, lead, thick=1.5)
    chevrons(s, rear, thick=1.3)
    return px_index(s)


def sprout_frames():
    fr = [sprout_front(k) for k in range(len(SPROUT_KEYS))]
    return place(register(fr), 56, dx=1)     # only the head and the drop differ


def clover_frames():
    sp = [clover_front(k) for k in range(len(CLOVER_KEYS))]
    fr = [px_index(x) for x in sp]
    regs = [None] + [(sp[0].headm | sp[k].headm | box(56, 60, 30, 0, 60, 14)) for k in range(1, len(sp))]
    return place(register(fr, regs), 56, dx=0)


# ---------------------------------------------------------------------------
# icons (16x16): k outline, 1 shade, 2 green, 3 white
# ---------------------------------------------------------------------------

ICONS = {   # (frame-0 rows, squash row, frame-2 extra pixels)
    "clover_sprout": ([
        "................",
        "..kkkk...kkkk...",
        ".k3222k.k3222k..",
        "k232222k22222k..",
        "k223222k22232k..",
        "k222222k22221k..",
        ".k22221k22211k..",
        "..kkk22222kkk...",
        ".k3222kk22kk....",
        "k232222kk2k.....",
        "k223222kk2k.....",
        ".k22211kkk2k....",
        "..kkkkk.kk2k....",
        ".....kkkk2kkkkk.",
        "....k322222221k.",
        ".....kkkkkkkkk..",
    ], 7, None),
    "white_clover": ([
        "...kkkkkk.......",
        "..k333323k......",
        ".k33332333k.....",
        ".k333233332k.kk.",
        "k3323333322kk32k",
        "k3333233222k232k",
        "k3323332221k222k",
        ".k333222111k22k.",
        ".k11222111kkk2k.",
        "..k111111k2k2k..",
        "..kkkkkkk2kkkk..",
        "..k32kk.k2kk....",
        ".k23222kk2k.....",
        ".k22221kk2kk....",
        "..kkkkk222221k..",
        "......kkkkkkkk..",
    ], 9, None),
}


ANIM = {
    # asleep (folded), opening, POP wide (held), settle, a little second pop
    "clover_sprout": {"intro": [[1, 12], [2, 6], [3, 14], [0, 6], [3, 4], [0, 8]],
                      "idle": [[0, 120], [2, 6], [0, 10], [2, 6]]},
    # duck back (held), lunge-PUFF, shiver, shiver, settle
    "white_clover": {"intro": [[0, 4], [1, 12], [2, 6], [3, 6], [2, 6], [3, 8], [0, 8]],
                     "idle": [[0, 130], [3, 8]]},
}

NOTES = {
    "clover_sprout": "Crystal rule. BOBBING. Gesture: the trefoil wakes (the head starts folded shut, as "
                     "clover leaflets really fold at night, opens, pops wider than rest, held, and settles; "
                     "the dew drop falls off the spade leaf). One hue: a blue-green shade and clover green; "
                     "white is the chevrons, the lit rims and the dew. Sport: 'Purpurascens Quadrifolium' "
                     "(burgundy leaves).",
    "white_clover": "WHITE: the flower head is really white (a white part, up to 35%), lit as a ball of "
                    "florets with green crescents and seams, blue-green past the terminator. Crystal rule. LUNGING. Gesture: duck and PUFF (the pom-pom ducks back, held, lunges out "
                    "swelling, its florets shiver and a loose floret flies off and drifts). Only the head, "
                    "its ruff and the loose floret move. Sport: 'Purpurascens "
                    "Quadrifolium' (burgundy leaves, white heads).",
}


def build_all(write=True):
    out = {}
    specs = {"clover_sprout": (sprout_frames, sprout_back), "white_clover": (clover_frames, clover_back)}
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
        print(preview(rows, sys.argv[-1] if sys.argv[-1].endswith(".png") else "/tmp/clover.png"))
    else:
        build()
