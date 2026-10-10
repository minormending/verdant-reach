"""Original Crystal-rule Populus tremuloides clone as the legendary: elder.

elder (adult, single-stage legendary), LOOMING, the biggest thing in the
game: a grove that is one creature. Four pale aspen trunks of different
heights, every one leaning toward the foe, fuse at the base into one thick
knot of glowing pale roots twisted like rope (the shared root system of an
aspen clone such as Pando, and the focal part); roots spread from it off
both bottom edges. The golden crowns merge into one canopy, heaped highest
over the great trunk and overhanging the foe side, joined by dark-slot hems
so it reads as one mass. It touches all four edges of the frame, so it reads
as ancient and huge inside 56 px.

Intro: the roots pulse (the veins of light in the knot and roots swell and
brighten), then the trunks and the canopy lean in toward the foe together,
hold, rebound and settle. The root knot's outline and the trunks' feet stay
registered.
Two tones: the aspen line's family, a deep gold-olive dark slot (leaf
shade, knots, root crevices) under a more luminous pale green-gold mid tone
(the crowns and the glow in the roots); the white bark is white plus the mid
tone. The front's white share stays under 20% (about 17%), so no WHITE_PARTS
entry is needed.
Faces: bark marks are short dashes and lenses joined to the trunk outline,
alternating sides; the knot's crevices are long diagonal seams in the dark
slot that run out to its outline; no enclosed dark dots (no_dots).
Sport: a pale silver-blue "winter" palette, an artistic interpretation (not
a cultivar); see docs/SPORTS.md.
Self-score (docs/CREATURES.md section 9): 8.
No sprite from any other game is copied, traced or imported.
"""

from __future__ import annotations

import numpy as np

from _d_kit import BLACK, WHITE, Spr, bez, hop, icon_arr, moving_boxes
from aspen import finish, lobe_crown, trunk

TOOL = "tools/art/crystal/elder.py"
SID = "elder"
PAL = [BLACK, "#787020", "#e0d868", WHITE]
SPORT = [BLACK, "#485880", "#b0c8e0", WHITE]
LEAN = [0.0, -0.6, 1.0, 2.0, 0.8]       # trunks and canopy lean per front frame (+ = toward the foe)
PULSE = [0, 1, 2, 1, 0]                 # the glow in the roots per front frame
ANIM = {"intro": [[0, 6], [1, 8], [2, 8], [3, 16], [4, 10], [0, 8]],
        "idle": [[0, 150], [1, 10], [0, 6]]}

KNOT_Y = 44.0                          # trunks lean about this height (the top of the root knot)

# The grove's trunks, back to front: (base, top, widths, knots), every one
# leaning toward the foe; the great trunk is drawn last.
GROVE = [
    ((44.0, 47.0), (42.0, 18.0), (3.8, 2.8), [(4, 1, 0.55), (9, -1, 0.5), (15, 1, 0.5), (21, -1, 0.5)]),
    ((20.0, 47.0), (9.0, 16.0), (4.0, 2.8), [(4, -1, 0.5), (9, 1, 0.5), (15, -1, 0.45), (21, 1, 0.5)]),
    ((35.0, 46.0), (30.0, 14.0), (4.6, 3.2), [(4, 1, 0.5), (10, -1, 0.5), (16, 1, 0.55), (22, -1, 0.45)]),
    ((27.5, 46.0), (19.0, 10.0), (6.6, 4.2), [(4, -1, 0.45), (9, 1, 0.45), (14, -1, 0.5), (19, 1, 0.5),
                                             (25, -1, 0.45)]),
]
# The crowns merged into one canopy: clumps (cx, cy, rx, ry, glint), heaped
# highest over the great trunk and overhanging the foe side, stepping down
# to the right; merged by dark-slot hems, so it reads as one mass.
CANOPY = [
    (15.0, 3.5, 6.0, 3.0, True), (26.0, 4.5, 5.5, 3.0, True), (36.0, 8.5, 5.0, 3.0, True),
    (7.5, 9.5, 5.0, 3.0, True), (19.0, 10.0, 6.0, 3.0, False), (30.0, 12.5, 5.0, 3.0, False),
    (42.0, 14.5, 4.0, 2.5, True),
    (12.5, 16.0, 4.5, 2.5, False), (24.0, 17.0, 5.0, 2.5, False), (35.0, 18.0, 4.0, 2.5, False),
]


def lean_pt(x, y, lean):
    """A point on a trunk leaning `lean` px further toward the foe at the
    canopy, nothing at the root knot."""
    f = max(0.0, (KNOT_Y - y) / (KNOT_Y - 6.0))
    return (x - lean * f, y)


def glow_root(s, ctrl, width, pulse=0, n=60):
    """A spreading root: the luminous mid tone, a dark crescent along its
    shaded underside, and a vein of white light running along it (the
    glow), which swells with the pulse."""
    path = bez(ctrl, n)
    m = s.stroke(path, width, cap=True)
    pid = s.part(m, base=2, k=1, shadow=(1, 1), sh_tone=1, line=0)
    vein = [(x - 0.4, y - 0.6) for x, y in path[int(n * 0.08):int(n * 0.82)]]
    s.decal(s.stroke(vein, (1.4, 2.0, 2.5)[pulse], cap=False), 3, on=[pid])
    return pid, m


# the root knot: the trunks' feet fuse into one thick, twisted knot of
# roots (knobs where each trunk enters), from which roots spread wide to
# the ground with sky under them
KNOBS = [(19.5, 46.5, 3.6), (24.0, 45.0, 4.0), (29.5, 45.2, 4.0), (34.5, 46.5, 3.6), (26.5, 49.5, 4.8),
         (21.0, 51.0, 3.3), (32.5, 51.0, 3.3)]
# the twist: (crevice in the dark slot, vein of light on the lit side of the
# strand to its right), diagonals running down to the right like rope
TWIST = [
    ([(17.0, 45.0), (20.5, 49.5), (23.0, 54.5)], [(16.5, 47.5), (18.5, 51.0)]),
    ([(22.5, 42.5), (26.5, 48.0), (29.0, 54.5)], [(21.5, 45.0), (24.5, 49.5), (26.0, 53.5)]),
    ([(29.0, 42.5), (32.5, 47.5), (34.5, 53.0)], [(27.5, 44.5), (30.5, 49.0), (32.0, 53.0)]),
    (None, [(34.0, 45.5), (36.5, 49.0)]),
]
SPREAD = [
    ([(36.0, 48.5), (45.0, 50.5), (56.5, 53.5)], (3.6, 2.4)),         # off the right edge
    ([(18.0, 48.5), (8.0, 50.5), (-4.0, 54.0)], (3.6, 2.4)),          # off the left edge
]


def knot(s, pulse=0):
    """The knot of glowing roots, the focal part: the trunks' feet fuse into
    one thick knob of roots twisted like rope; dark-slot crevices part the
    strands (each runs out to the outline, never a closed dark shape) and
    every strand carries a vein of white light on its lit side. The veins
    swell with the pulse; roots spread from the knot to both bottom corners."""
    for ctrl, w in SPREAD:
        glow_root(s, ctrl, w, pulse)
    m = np.zeros((s.h, s.w), bool)
    for x, y, r in KNOBS:
        m |= s.ellipse(x, y, r, r * 0.9)
    pid = s.part(m, base=2, k=1, shadow=(1, 1), sh_tone=1, line=0)
    for crev, vein in TWIST:
        if crev:
            s.decal(s.stroke(bez(crev, 30), 1.3, cap=False), 1, on=[pid])
        s.decal(s.stroke(bez(vein, 30), (1.3, 1.9, 2.4)[pulse], cap=False), 3, on=[pid])
    return pid


def elder(s, fr=0):
    lean, pulse = LEAN[fr], PULSE[fr]
    s.ox = 3.4
    for (bx, by), (tx, ty), w, knots in GROVE:
        mid = ((bx * 0.55 + tx * 0.45) + 0.8, (by + ty) / 2)
        trunk(s, [(bx, by + 2), lean_pt(*mid, lean), lean_pt(tx, ty, lean)], w, knots=knots)
    # the canopy leans in with the trunks
    lobe_crown(s, [(lean_pt(cx, cy, lean)[0], cy, rx, ry, gl) for cx, cy, rx, ry, gl in CANOPY],
               leaf_r=1.7, hem=1)
    # the knot of glowing roots, the focal part, over the trunks' feet
    knot(s, pulse)


# ------------------------------------------------------------- frames -----

def front(fr=0):
    s = Spr(56, 56, tuple(PAL[1:]))
    elder(s, fr)
    return finish(s)


BACK_GROVE = [   # behind and above: the trunks lean to the top-right, toward the foe
    ((15.0, 44.0), (11.0, 20.0), (5.0, 3.6), [(4, 1, 0.5), (10, -1, 0.5), (16, 1, 0.5)]),
    ((33.0, 44.0), (38.0, 20.0), (5.6, 4.0), [(4, -1, 0.5), (10, 1, 0.5), (16, -1, 0.45)]),
    ((24.0, 44.0), (28.0, 14.0), (8.5, 5.4), [(4, -1, 0.45), (10, 1, 0.5), (16, -1, 0.5), (22, 1, 0.45)]),
]
BACK_CANOPY = [  # the canopy's top seen from above, heaped toward the top-right
    (33.0, 3.5, 7.0, 3.0, True), (21.0, 5.0, 6.5, 3.0, True), (42.0, 8.5, 4.5, 3.0, True),
    (11.0, 9.5, 5.5, 3.0, True), (27.0, 11.0, 7.0, 3.0, False), (39.0, 15.0, 5.0, 3.0, False),
    (16.0, 16.0, 6.0, 3.0, False), (6.0, 17.0, 3.5, 2.5, False), (28.0, 19.0, 5.5, 2.5, False),
]
BACK_KNOBS = [(14.0, 45.0, 5.0), (21.0, 43.0, 5.5), (28.5, 43.5, 5.5), (35.0, 45.5, 5.0), (24.0, 48.5, 7.0)]
BACK_TWIST = [
    ([(13.0, 41.5), (17.5, 47.5)], [(11.0, 44.0), (13.5, 48.0)]),
    ([(20.5, 39.0), (25.5, 46.5), (28.0, 48.5)], [(18.5, 42.0), (22.0, 47.5)]),
    ([(28.5, 39.5), (33.0, 46.0), (35.0, 48.5)], [(26.5, 42.0), (29.5, 47.5)]),
    (None, [(34.5, 42.5), (37.0, 46.5)]),
]


def back():
    """Behind and above: the crowns heaped toward the top-right (the foe),
    the trunks going down into the twisted knot of glowing roots, which the
    screen's bottom edge cuts off."""
    s = Spr(48, 48, tuple(PAL[1:]))
    for (bx, by), (tx, ty), w, kn in BACK_GROVE:
        trunk(s, [(bx, by + 2), ((bx + tx) / 2 - 0.8, (by + ty) / 2), (tx, ty)], w, knots=kn)
    lobe_crown(s, BACK_CANOPY, leaf_r=1.8, hem=1)
    for ctrl, w in (([(36, 46), (44, 47), (50, 48)], (5.0, 4.0)), ([(12, 46), (4, 47), (-2, 48)], (5.0, 4.0))):
        glow_root(s, ctrl, w, 0)
    m = np.zeros((s.h, s.w), bool)
    for x, y, r in BACK_KNOBS:
        m |= s.ellipse(x, y, r, r * 0.9)
    pid = s.part(m, base=2, k=1, shadow=(1, 1), sh_tone=1, line=0)
    for crev, vein in BACK_TWIST:
        if crev:
            s.decal(s.stroke(bez(crev, 30), 1.3, cap=False), 1, on=[pid])
        s.decal(s.stroke(bez(vein, 30), 1.4, cap=False), 3, on=[pid])
    return finish(s, open_bottom=True)


# the canopy across the top, three white trunks leaning left, and the knot
# of glowing roots spreading wide at the bottom
ICON = [
    "..222.2222......",
    ".23322232222....",
    ".2322222222222..",
    ".22221222212222.",
    "..2111122111111.",
    "...32.32.32.....",
    "...32.32.32.....",
    "....32.32.32....",
    "....32.32.32....",
    ".....32323232...",
    ".....232323232..",
    "..2223232323222.",
    ".222..23232..22.",
    "................",
]


def icon():
    rows = [r[:16].ljust(16, ".") for r in ICON]
    return icon_arr(rows)


def render():
    fs = [front(f) for f in range(len(LEAN))]
    ic = icon()
    return fs, back(), [ic, hop(ic)]


def build():
    from kit import intro_strip, write_species
    import aspen
    art = render()
    asp = aspen.render()
    aspen.review_layout(asp, extra=[(SID, art, PAL)], name="aspen_elder")
    fs, b, icons = art
    write_species(SID, palette=PAL, sport=SPORT, front=fs, back=[b], icon=icons,
                  anim=ANIM, moving=moving_boxes(fs), tool=TOOL,
                  notes="Crystal rule. Populus tremuloides (an aspen clone such as Pando). LOOMING: a grove "
                  "that is one creature, four pale trunks of different heights leaning toward the foe, "
                  "fused at the base into a thick knot of glowing pale roots twisted like rope (the focal "
                  "part), roots spreading off both bottom edges; their golden crowns merge into one canopy "
                  "that overhangs the foe. Gesture: the roots pulse, then the trunks and canopy lean in "
                  "together, hold, rebound and settle; the root knot's outline and the trunks' feet stay "
                  "fixed. The aspen family's deep gold-olive dark slot under a more luminous pale "
                  "green-gold mid tone (the crowns and the glow in the roots); the white bark is white "
                  "plus the mid tone. Sport: a pale silver-blue winter palette, an artistic "
                  "interpretation, not a cultivar.",
                  credits="Original geometry drawn for Verdant Reach under the Crystal rule "
                  "(docs/CREATURES.md). Botanical reference: Populus tremuloides and the Pando clone, "
                  "https://en.wikipedia.org/wiki/Pando_(tree) . "
                  "No sprite from any other game was copied, traced or imported.")
    intro_strip(SID)


if __name__ == "__main__":
    build()
