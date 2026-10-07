"""Crystal-rule Zostera marina: seagrass_shoot -> eelgrass.

Shoot: BOBBING, eight short, flat ribbons bending left from a creeping node.
Adult: LOOMING, a dense meadow of ribbons, folded over by the current.
Sea green faces / deep teal-green shade, black outlines, white lengthwise midrib highlights.
The small basal flowering spathe is a sheath, never a showy flower or face.
Only the ribbons move: a travelling wave grows from the rooted base to tip;
the rhizome, sand contact and spathe remain fixed through the 64-tick intro.
Sport: natural greener foliage; no named colour form identified (SPORTS.md).
All geometry is original; no other game's sprites are used.
"""

from __future__ import annotations

import math

import numpy as np

from _d_kit import (BLACK, WHITE, T, Spr, bez, tones, moving_boxes,
                    hop, preview, stats)

TOOL = "tools/art/crystal/seagrass.py"
IDS = ["seagrass_shoot", "eelgrass"]
PAL = [BLACK, "#185850", "#58b890", WHITE]
SPORT = [BLACK, "#286048", "#80b868", WHITE]
SPAL = tuple(PAL[1:])

# Back-to-front flat blades: control points, coloured width (2px plus the outline),
# visible face tone, and optional twist centre along the blade.
# Tips continue the blade's direction; none turn back into a closed curl.
SHOOT = [
    ([(25, 49), (24, 33), (22, 19), (15, 14)], 2.2, 1, None),
    ([(33, 49), (37, 32), (45, 25), (45, 17)], 2.2, 1, 0.58),
    ([(29, 49), (25, 35), (13, 30), (8, 27)], 2.2, 1, None),
    ([(37, 49), (44, 38), (47, 32), (50, 24)], 2.2, 1, None),
    ([(30, 49), (34, 30), (34, 16), (27, 9)], 2.2, 2, 0.62),
    ([(24, 49), (18, 39), (10, 36), (7, 32)], 2.2, 2, None),
    ([(35, 49), (36, 31), (20, 18), (12, 18)], 2.2, 2, None),
    ([(32, 49), (34, 40), (22, 31), (15, 30)], 2.2, 2, 0.55),
]
ADULT = [
    ([(19, 50), (21, 28), (17, 14), (11, 6)], 2.2, 1, None),
    ([(28, 50), (30, 27), (36, 12), (33, -1)], 2.2, 1, 0.56),
    ([(37, 50), (45, 31), (49, 15), (50, 5)], 2.2, 1, None),
    ([(42, 50), (48, 37), (50, 28), (54, 19)], 2.2, 1, 0.64),
    ([(22, 50), (22, 30), (11, 16), (3, 13)], 2.2, 2, None),
    ([(31, 50), (30, 23), (23, 9), (16, 4)], 2.2, 2, 0.63),
    ([(39, 50), (41, 31), (44, 19), (42, 10)], 2.2, 2, None),
    ([(29, 50), (26, 31), (13, 24), (6, 24)], 2.2, 2, None),
    ([(36, 50), (39, 30), (29, 18), (18, 13)], 2.2, 2, 0.53),
    ([(24, 50), (18, 43), (9, 38), (4, 32)], 2.2, 2, None),
    ([(34, 50), (33, 39), (19, 34), (12, 30)], 2.2, 2, None),
]

# Anticipation, wave at the lower blades, wave arriving at tips, rebound.
WAVES = [(0.0, 0.0), (-1.2, 0.4), (1.8, 1.6), (1.5, 2.8), (-0.8, 3.8)]


def ribbon(s, ctrl, width, face=2, twist=None, wave=(0.0, 0.0), lag=0.0):
    """Flat, uncapped strap with a fine point and a lengthwise midrib.

    A twist pinches the face to a one-pixel edge for several pixels before
    widening again. Flat colour, rather than a shaded cylindrical band,
    keeps the broad face distinct from that narrow edge. The current wave
    grows above the rooted basal twelve pixels and lags between blades.
    """
    amp, phase = wave
    path = bez(ctrl, 100)
    path = [(x + amp * min(1.0, max(0.0, (47 - y) / 32))
             * math.sin(phase - 3.0 * t + lag), y)
            for t, (x, y) in zip(np.linspace(0, 1, len(path)), path)]

    def blade_width(t):
        taper = min(1.0, max(0.0, (1.0 - t) / 0.20))
        edge = 1.0
        if twist is not None:
            edge = 1 - 0.73 * max(0.0, 1 - abs(t - twist) / 0.10)
        return width * taper * edge

    m = s.stroke(path, blade_width, cap=False)
    pid = s.part(m, base=face, k=0, line=0)
    # Short, straight midrib highlights run within the flat face. The rib
    # stops before both the twist and the fine tip: no ring or tube opening.
    for start, end in ((0.13, 0.49), (0.66, 0.85)):
        segment = [p for t, p in zip(np.linspace(0, 1, len(path)), path)
                   if start <= t <= end and
                   (twist is None or abs(t - twist) > 0.12)]
        if len(segment) > 1:
            s.decal(s.line1(segment), 3 if face == 2 else 2, on=[pid])
    return pid


def node(s, adult=False):
    """A short horizontal rhizome with two collars resting on flat sand.

    The palette's dark tone carries sand; connected white grain highlights
    and an irregular shallow edge separate it from the mid-tone rhizome.
    Node collars meet its outline, never making enclosed dark spots.
    """
    left, right = (12, 49) if adult else (17, 46)
    bottom = 55 if adult else 54
    m = s.poly([(left, bottom), (left + 3, 52), (left + 9, 51),
                (right - 6, 51), (right - 2, 52), (right, bottom)])
    pid = s.part(m, base=1, k=0, line=0)
    s.decal(s.line1([(left + 4, 53), (left + 8, 53)]), 3, on=[pid])
    s.decal(s.line1([(right - 7, 53), (right - 4, 53)]), 2, on=[pid])
    m = s.poly([(left + 5, 49), (right - 5, 49),
                (right - 4, 51), (left + 4, 51)])
    pid = s.part(m, base=2, k=0, line=0)
    s.decal(s.line1([(left + 6, 49), (right - 6, 49)]), 3, on=[pid])
    for x in (25, 36) if adult else (26, 36):
        m = s.poly([(x, 47), (x + 2, 47), (x + 2, 52), (x, 52)])
        collar = s.part(m, base=2, k=0, line=1)
        s.decal(s.line1([(x, 48), (x, 51)]), 3, on=[collar])


def spathe(s):
    """A pointed pale sheath set apart on a short basal flowering stalk."""
    stem = s.stroke([(44, 50), (47, 47)], 1.5, cap=False)
    s.part(stem, base=2, k=0, line=0)
    m = s.poly([(46, 47), (45, 42), (46, 35), (48, 39),
                (49, 43), (48, 47)])
    pid = s.part(m, base=2, k=0, line=0)
    highlight = s.poly([(46, 39), (47, 40), (48, 44), (47, 46), (46, 43)])
    s.decal(highlight, 3, on=[pid])


def ribbon_tones(s, **kwargs):
    """Close single-pixel pinholes where outlined ribbons cross."""
    arr = tones(s, **kwargs)
    opaque = arr != T
    enclosed = np.ones((arr.shape[0] - 2, arr.shape[1] - 2), bool)
    for dy in range(3):
        for dx in range(3):
            if (dx, dy) != (1, 1):
                enclosed &= opaque[dy:dy + enclosed.shape[0], dx:dx + enclosed.shape[1]]
    middle = arr[1:-1, 1:-1]
    middle[(middle == T) & enclosed] = 0
    return arr


def front(sid, frame=0):
    s = Spr(56, 56, SPAL)
    adult = sid == "eelgrass"
    leaves = ADULT if adult else SHOOT
    for i, (ctrl, width, face, twist) in enumerate(leaves):
        ribbon(s, ctrl, width, face, twist, WAVES[frame], lag=i * 0.18)
    node(s, adult)
    if adult:
        spathe(s)
        # Two tiny oxygen bubbles, attached to different leaf edges; neither
        # has a dark centre or a paired eye-like placement.
        for x, y in ((49, 12), (9, 20)):
            m = s.ellipse(x, y, 1.2, 1.6)
            s.part(m, base=3, k=0, line=0)
    return ribbon_tones(s)


def front_frames(sid):
    fs = [front(sid, f) for f in range(len(WAVES))]
    # Anchor the rhizome and every basal pixel, including the flower sheath.
    for f in fs[1:]:
        f[47:] = fs[0][47:]
        if sid == "eelgrass":
            f[34:47, 44:51] = fs[0][34:47, 44:51]
    return fs


def back(sid):
    """Overlapping thin ribbon faces viewed from behind, cropped at the base."""
    s = Spr(48, 48, SPAL)
    paths = [
        ([(27, 55), (20, 34), (29, 16), (34, 9)], 2.2, 1, None),
        ([(3, 55), (3, 42), (6, 34), (7, 29)], 2.2, 1, None),
        ([(7, 55), (9, 28), (12, 12), (17, 6)], 2.2, 1, None),
        ([(36, 55), (39, 30), (36, 14), (31, 4)], 2.2, 1, None),
        ([(18, 55), (14, 32), (18, 13), (23, 1)], 2.2, 1, 0.64),
        ([(28, 55), (31, 30), (37, 21), (43, 18)], 2.2, 1, None),
        ([(13, 55), (9, 34), (5, 25), (2, 18)], 2.2, 1, None),
        ([(40, 55), (43, 36), (44, 19), (46, 10)], 2.2, 2, 0.57),
        ([(24, 55), (26, 27), (24, 11), (28, 3)], 2.2, 2, None),
        ([(10, 55), (16, 34), (13, 20), (8, 11)], 2.2, 2, 0.64),
        ([(34, 55), (31, 30), (22, 20), (16, 15)], 2.2, 2, None),
        ([(20, 55), (17, 39), (8, 30), (3, 25)], 2.2, 2, None),
    ]
    if sid == "eelgrass":
        paths.insert(3, ([(33, 55), (25, 35), (30, 17), (37, 9)], 2.2, 1, None))
        paths.append(([(29, 55), (33, 41), (40, 34), (43, 27)], 2.2, 2, 0.56))
    for ctrl, width, face, twist in paths:
        ribbon(s, ctrl, width, face, twist)
    return ribbon_tones(s, open_bottom=True)


def icon(sid):
    """Miniature pointed ribbons with a basal rhizome and pale adult sheath."""
    s = Spr(16, 16, SPAL)
    adult = sid == "eelgrass"
    paths = [
        ([(6, 13), (5, 8), (5, 4), (3, 2)], 1.4, 1, None),
        ([(10, 13), (12, 8), (12, 5), (13, 3)], 1.3, 1, None),
        ([(8, 13), (9, 7), (9, 3), (7, 0 if adult else 2)], 1.7, 2, None),
        ([(7, 13), (5, 9), (3, 8), (1, 6)], 1.7, 2, None),
        ([(9, 13), (10, 9), (7, 6), (5, 5)], 1.6, 2, None),
    ]
    if adult:
        paths.insert(1, ([(7, 13), (6, 8), (3, 6), (1, 4)], 1.5, 1, None))
    for ctrl, width, face, twist in paths:
        ribbon(s, ctrl, width, face, twist)
    sand = s.poly([(2, 14), (4, 13), (12, 13), (14, 14)])
    s.part(sand, base=1, k=0, line=0)
    root = s.stroke([(4, 13), (12, 13)], 1.5, cap=False)
    pid = s.part(root, base=2, k=0, line=0)
    s.decal(s.line1([(5, 13), (7, 13)]), 3, on=[pid])
    if adult:
        sheath = s.stroke([(12, 12), (12, 10), (11, 8)], (1.6, 0.0), cap=False)
        pid = s.part(sheath, base=2, k=0, line=0)
        s.decal(s.line1([(12, 10), (12, 11)]), 3, on=[pid])
    return tones(s)


ANIM = {"intro": [[0, 8], [1, 12], [2, 8], [3, 16], [4, 12], [0, 8]],
        "idle": [[0, 140], [1, 12], [0, 8]]}


def render():
    out = {}
    for sid in IDS:
        small = icon(sid)
        out[sid] = (front_frames(sid), back(sid), [small, hop(small)])
    return out


def review_layout(art):
    """The lead's compact front/back/icon arrangement at native size and 3x."""
    from pathlib import Path
    from PIL import Image
    from kit import to_rgba

    folder = Path(__file__).resolve().parent.parent / "review"
    folder.mkdir(exist_ok=True)
    for scale, filename in ((1, "seagrass_1x.png"), (3, "seagrass_lead_layout.png")):
        sheet = Image.new("RGB", (256 * scale, 56 * scale), (200, 208, 200))
        for n, sid in enumerate(IDS):
            fs, b, icons = art[sid]
            for x, arr in ((0, fs[0]), (56, b), (104, icons[0])):
                im = Image.fromarray(to_rgba(arr, PAL), "RGBA")
                im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                sheet.paste(im, ((128 * n + x) * scale, 0), im)
        sheet.save(folder / filename)


def build():
    from kit import write_species, intro_strip
    art = render()
    review_layout(art)
    for sid, (fs, b, icons) in art.items():
        pose = ("BOBBING: eight thin tapered ribbons, their tips bent toward the foe, "
                "rising from a creeping rhizome node on sand." if sid == IDS[0] else
                "LOOMING: a dense meadow clump of thin twisting flat ribbons arching left, "
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
