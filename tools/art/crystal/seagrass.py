"""Crystal-rule Zostera marina: seagrass_shoot -> eelgrass.

Shoot: BOBBING, five short, flat ribbons bending left from a creeping node.
Adult: LOOMING, a dense meadow of ribbons, folded over by the current.
Sea green faces / deep teal-green shade, black outlines, white wet-leaf rims.
The small basal flowering spathe is a sheath, never a showy flower or face.
Only the ribbons move: a travelling wave grows from the rooted base to tip;
the rhizome, sand contact and spathe remain fixed through the 64-tick intro.
Sport: natural greener foliage; no named colour form identified (SPORTS.md).
All geometry is original; no other game's sprites are used.
"""

from __future__ import annotations

import math

import numpy as np

from _d_kit import (BLACK, WHITE, T, Spr, bez, tones, rim_white, moving_boxes,
                    icon_arr, hop, preview, stats)

TOOL = "tools/art/crystal/seagrass.py"
IDS = ["seagrass_shoot", "eelgrass"]
PAL = [BLACK, "#185850", "#58b890", WHITE]
SPORT = [BLACK, "#286048", "#80b868", WHITE]
SPAL = tuple(PAL[1:])

# Back-to-front ribbons: base, curved body, and rounded, current-bent tip.
SHOOT = [
    ([(35, 49), (44, 40), (50, 27), (44, 23)], 6.5),
    ([(31, 48), (35, 32), (42, 18), (37, 12)], 7.0),
    ([(27, 49), (18, 41), (11, 32), (8, 33)], 7.5),
    ([(32, 49), (30, 31), (30, 12), (20, 11)], 8.0),
    ([(34, 49), (39, 35), (21, 22), (11, 23)], 8.0),
]
ADULT = [
    ([(40, 50), (47, 32), (51, 12), (47, 8)], 7.0),
    ([(35, 50), (33, 27), (39, 6), (34, 2.8)], 6.0),
    ([(24, 50), (18, 33), (8, 19), (6, 23)], 7.0),
    ([(31, 50), (25, 26), (28, 4), (19, 5)], 8.0),
    ([(29, 50), (29, 24), (8, 9), (7, 15)], 8.0),
    ([(37, 50), (42, 29), (26, 9), (15, 12)], 8.0),
    ([(34, 50), (31, 37), (10, 31), (6, 37)], 8.5),
]

# Anticipation, wave at the lower blades, wave arriving at tips, rebound.
WAVES = [(0.0, 0.0), (-1.2, 0.4), (1.8, 1.6), (1.5, 2.8), (-0.8, 3.8)]


def ribbon(s, ctrl, width, wave=(0.0, 0.0), lag=0.0, rim=0.72):
    """Parallel-edged strap leaf, tapering only at its rounded last fifth.

    A smooth phase-shifted lateral displacement avoids translating rigid
    blocks. The bottom twelve pixels stay rooted; successive leaves lag.
    """
    amp, phase = wave
    path = bez(ctrl, 90)
    path = [(x + amp * min(1.0, max(0.0, (47 - y) / 32))
             * math.sin(phase - 3.0 * t + lag), y)
            for t, (x, y) in zip(np.linspace(0, 1, len(path)), path)]
    m = s.stroke(path, lambda t: width * (1 - 0.48 * max(0, (t - 0.78) / 0.22)))
    pid = s.part(m, base=2, k=2, sh_tone=1, line=0)
    rim_white(s, m, pid, rim)
    return pid


def node(s, adult=False):
    """A creeping rhizome lying on a shallow mound of green-lit sand.

    No separate sand hue is available: the dark tone carries the substrate,
    with a few connected white grain rims rather than scattered dot noise.
    """
    left, right = (12, 49) if adult else (17, 46)
    bottom = 55 if adult else 54
    m = s.poly([(left, bottom), (left + 4, 51), (24, 50), (32, 49),
                (right - 3, 51), (right, bottom)])
    pid = s.part(m, base=1, k=1, sh_tone=0, line=0)
    s.decal(s.line1([(left + 4, 52), (left + 8, 52)]), 3, on=[pid])
    m = s.stroke(bez([(left + 5, 51), (29, 48), (right - 4, 51)], 40), 4)
    pid = s.part(m, base=2, k=1, sh_tone=1, line=0)
    rim_white(s, m, pid, 0.6)
    # Vertical node collars follow the rhizome; no horizontal mouth seam.
    for x in (26, 36) if adult else (29,):
        s.decal(s.line1([(x, 49), (x + 1, 51)]), 1, on=[pid])


def spathe(s):
    m = s.stroke(bez([(40, 49), (42, 44), (40, 39)], 30), (4.0, 2.6))
    pid = s.part(m, base=2, k=1, sh_tone=1, line=0)
    rim_white(s, m, pid, 0.55)
    # Pale lengthwise rim of the enclosed flowering sheath.
    s.decal(s.line1([(40, 40), (41, 43)]), 3, on=[pid])


def front(sid, frame=0):
    s = Spr(56, 56, SPAL)
    adult = sid == "eelgrass"
    leaves = ADULT if adult else SHOOT
    for i, (ctrl, width) in enumerate(leaves):
        ribbon(s, ctrl, width * (0.54 if adult else 0.76), WAVES[frame], lag=i * 0.18)
    node(s, adult)
    if adult:
        spathe(s)
        # Two tiny oxygen bubbles, attached to different leaf edges; neither
        # has a dark centre or a paired eye-like placement.
        for x, y in ((47, 20), (19, 29)):
            m = s.ellipse(x, y, 1.2, 1.6)
            s.part(m, base=3, k=0, line=0)
    return tones(s)


def front_frames(sid):
    fs = [front(sid, f) for f in range(len(WAVES))]
    # Anchor the rhizome and every basal pixel, including the flower sheath.
    for f in fs[1:]:
        f[47:] = fs[0][47:]
        if sid == "eelgrass":
            f[38:47, 38:45] = fs[0][38:47, 38:45]
    return fs


def back(sid):
    """Close view into the meadow: wide straps cropped through their bases."""
    s = Spr(48, 48, SPAL)
    paths = [
        ([(8, 56), (5, 29), (9, 6), (3, 8)], 9),
        ([(35, 56), (42, 32), (40, 8), (45, 11)], 10),
        ([(23, 56), (20, 28), (27, 3), (19, 4)], 11),
        ([(18, 56), (21, 31), (4, 17), (3, 22)], 11),
        ([(31, 56), (36, 28), (25, 11), (13, 13)], 12),
    ]
    if sid == "eelgrass":
        paths.insert(1, ([(39, 56), (35, 38), (46, 27), (43, 22)], 10))
    for ctrl, w in paths:
        ribbon(s, ctrl, w * (0.76 if sid == "eelgrass" else 0.68), rim=0.64)
    return tones(s, open_bottom=True)


ICONS = {
    "seagrass_shoot": [
        "......kkk.......", ".....k232k.kk...", ".....k22k.k22k..",
        "..kk.k22kk22k...", ".k23kk22k22k....", ".k22k.k2222k....",
        "..k22kk2232k....", "...k22k232k.....", "....k22222k.....",
        ".....k2222k.....", "...kkk2112kkk...", "..k1122222111k..",
        "...kkkkkkkkkk...",
    ],
    "eelgrass": [
        ".....kkk........", "....k232k.kkk...", "..kkk22k.k232k..",
        ".k23k22kk22k2k..", ".k22k222k22k2k..", "..k22223k22k2k..",
        ".kkk2223k22k2k..", "k232k222k2222k..", "k22k2222k2222k..",
        ".k22k222k2232k..", "..k22222k232k...", "...k2222222k....",
        "..kkk211122kkk..", ".k111222222111k.", "..kkkkkkkkkkkk..",
    ],
}

ANIM = {"intro": [[0, 8], [1, 12], [2, 8], [3, 16], [4, 12], [0, 8]],
        "idle": [[0, 140], [1, 12], [0, 8]]}


def render():
    out = {}
    for sid in IDS:
        icon = icon_arr(ICONS[sid])
        out[sid] = (front_frames(sid), back(sid), [icon, hop(icon)])
    return out


def build():
    from kit import write_species, intro_strip
    for sid, (fs, b, icons) in render().items():
        pose = ("BOBBING: five short ribbons, their tips bent toward the foe, "
                "rising from a creeping rhizome node on sand." if sid == IDS[0] else
                "LOOMING: a dense meadow clump of long flat ribbons arching left, "
                "a small basal flowering spathe and two tiny oxygen bubbles.")
        write_species(sid, palette=PAL, sport=SPORT, front=fs, back=[b], icon=icons,
                      anim=ANIM, moving=moving_boxes(fs), tool=TOOL,
                      notes="Crystal rule. " + pose + " Sea green / deep teal-green. "
                      "Gesture: a current wave travels from rooted base to ribbon tips, "
                      "then rebounds and settles; the rhizome and spathe stay fixed. "
                      "Sport: natural greener foliage; no named colour form identified.")
        intro_strip(sid)


if __name__ == "__main__":
    import sys
    if "--preview" in sys.argv:
        rows = []
        for sid, (fs, b, icons) in render().items():
            for i, f in enumerate(fs):
                stats(f"{sid}[{i}]", f)
            stats(sid + " back", b)
            rows.append((PAL, fs + [b] + icons))
            rows.append((SPORT, fs[:1]))
        print(preview(rows, sys.argv[-1]))
    else:
        build()
