"""Original Crystal-rule Carnegiea gigantea: pup -> column -> saguaro.

BRACED baby: a ribbed barrel sheltered beneath a twiggy nurse shrub.
BRACED teen: one unbranched column, its rounded growing tip leaning left.
LOOMING adult: a tall pleated column with two unequal, upturned arms and
small white tip flowers. Continuous deep-green pleats divide green ridges;
staggered white spine ticks never have enclosed dark areoles beneath them.
The pup swells, the teen's growing tip flexes, and the adult's arms lift
while the crown flowers open. Every basal contact stays fixed.
Sport: unnamed blue-grey waxy-bloom interpretation, not a cristate shape
or named cultivar. See SPORTS.md for botanical sources and limitations.
No sprites from other games are copied, traced or imported.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from _d_kit import (BLACK, WHITE, Spr, T, bez, erode, hop, moving_boxes,
                    tones, rim_white)

TOOL = "tools/art/crystal/saguaro.py"
IDS = ["saguaro_pup", "saguaro_column", "saguaro"]
PAL = [BLACK, "#285840", "#78a860", WHITE]
SPORT = [BLACK, "#405c68", "#98b0b8", WHITE]
SPAL = tuple(PAL[1:])
KEYS = [0, -1, 2, 1, -0.5]
ANIM = {"intro": [[0, 8], [1, 12], [2, 6], [3, 18], [4, 12], [0, 8]],
        "idle": [[0, 140], [4, 10], [0, 8]]}


def ribbed(s, path, width, step=5, ticks=5):
    """Rounded fleshy column; ribs follow its curved axis into the cap.

    Pleats run to the outline rather than ending in dark dots. Spine ticks
    are horizontal 1px strokes, paired pixels so the kit finds no orphans.
    """
    m = s.stroke(bez(path, 100), width, cap=True)
    pid = s.part(m, base=2, k=0, line=0)
    safe = erode(m, 1)
    yy, xx = np.mgrid[:s.h, :s.w]
    ys = np.nonzero(m.any(axis=1))[0]
    centres = np.zeros(s.h)
    for y in ys:
        xs = np.nonzero(m[y])[0]
        centres[y] = (xs.min() + xs.max()) / 2
    phase = xx - centres[yy]
    pleats = (np.floor(phase + width / 2).astype(int) % step) < 2
    s.decal(pleats, 1, on=[pid])
    for n, offset in enumerate(np.arange(-width / 2 + 3, width / 2 - 1, step)):
        for y in range(int(ys.min()) + 3 + n % 2 * 2, int(ys.max()) - 1, ticks):
            x = round(centres[y] + offset) - getattr(s, "ox", 0)
            tick = s.line1([(x, y), (x + 1, y)])
            s.decal(tick & safe, 3, on=[pid])
    rim_white(s, m, pid, 0.16)
    return pid


def ground(s, adult=False):
    """Small shallow soil contact, with two rounded root shoulders."""
    left, right = (18, 48) if adult else (18, 46)
    m = s.poly([(left, 55), (left + 3, 52), (left + 8, 51),
                (right - 6, 51), (right - 2, 53), (right, 55)])
    pid = s.part(m, base=1, k=0, line=0)
    s.decal(s.line1([(left + 4, 53), (left + 9, 53)]), 3, on=[pid])
    s.decal(s.line1([(right - 7, 53), (right - 4, 53)]), 2, on=[pid])


def nurse(s, sway=0, back=False):
    """Twig shrub arches over the seedling; small leaf sprays remain sparse."""
    if back:
        branches = [[(8, 54), (10, 31), (15, 17), (32, 8)],
                    [(12, 29), (4, 20), (2, 11)],
                    [(17, 18), (25, 18), (42, 12)]]
    else:
        branches = [[(42, 53), (42, 34), (35, 21), (21 + sway, 17)],
                    [(39, 29), (44, 21), (47 + sway, 19)],
                    [(36, 23), (38, 19), (43 + sway, 17)],
                    [(29, 19), (19, 24), (14 + sway, 22)]]
    for ctrl in branches:
        m = s.stroke(bez(ctrl, 45), (3.0, 1.5), cap=True)
        pid = s.part(m, base=1, k=0, line=0)
        s.decal(s.line1(bez(ctrl, 45)), 2, on=[pid])
    tips = [(21 + sway, 17), (43 + sway, 17), (47 + sway, 19), (14 + sway, 22)]
    if back:
        tips = [(32, 8), (2, 11), (42, 12)]
    for x, y in tips:
        m = s.poly([(x - 4, y), (x - 2, y - 2), (x + 2, y - 1),
                    (x + 3, y + 1), (x, y + 2)])
        pid = s.part(m, base=2, k=0, line=0)
        s.decal(s.line1([(x - 2, y), (x, y)]), 3, on=[pid])


def flower(s, x, y, opening=0, size=1):
    """White tip flower, its pale open tepals around a green throat.

    No dark centre or separate black petal seams; white only marks the
    narrow upper petal faces and their light rims, within the normal cap.
    """
    w = (3.0 + opening * 0.6) * size
    m = s.poly([(x - w, y + 2 * size), (x - w - size, y - 2 * size),
                (x - size, y - size), (x, y - 3 * size),
                (x + size, y - size), (x + w, y - 2 * size),
                (x + w - size, y + 2 * size)])
    pid = s.part(m, base=2, k=0, line=0)
    for dx in (-2, 0, 2):
        s.decal(s.line1([(x + dx * size, y - size),
                        (x + dx * size, y + size)]), 3, on=[pid])


def front(sid, frame=0):
    s = Spr(56, 56, SPAL)
    k = KEYS[frame]
    if sid == IDS[2]:
        s.ox = 1
    ground(s, sid == IDS[2])
    if sid == IDS[0]:
        nurse(s, sway=k * 0.6)
        ribbed(s, [(31, 45), (29, 40), (28 - k * 0.4, 35)], 21 + k * 0.5)
    elif sid == IDS[1]:
        ribbed(s, [(34, 52), (33, 36), (30, 24), (28 - k * 0.5, 19)], 23)
    else:
        # Smaller, higher rear arm; the larger foe-side arm reaches further.
        ribbed(s, [(35, 35), (46, 33), (48, 25), (47, 17 - k)], 8)
        ribbed(s, [(29, 40), (13, 37), (10, 29), (10, 19 - k)], 10)
        ribbed(s, [(34, 52), (33, 35), (30, 18), (28, 9)], 16)
        flower(s, 25, 4, k, 1)
        flower(s, 31, 4, k, 1)
        flower(s, 8, 12 - k, k, 1)
        flower(s, 13, 12 - k, k, 0.8)
        flower(s, 47, 11 - k, k, 1)
    return tones(s)


def front_frames(sid):
    fs = [front(sid, i) for i in range(len(KEYS))]
    for f in fs[1:]:
        f[48:] = fs[0][48:]
    return fs


def back(sid):
    """New close rear view, growing tip to the right, base cropped away."""
    s = Spr(48, 48, SPAL)
    if sid == IDS[0]:
        nurse(s, back=True)
        ribbed(s, [(25, 62), (25, 42), (28, 31)], 36)
    elif sid == IDS[1]:
        ribbed(s, [(22, 66), (23, 37), (27, 20)], 35)
    else:
        ribbed(s, [(24, 39), (10, 34), (6, 22), (7, 15)], 14)
        ribbed(s, [(27, 36), (39, 29), (42, 18), (41, 9)], 12)
        ribbed(s, [(23, 65), (24, 35), (28, 13)], 26)
        flower(s, 25, 2, 1, 0.7)
        flower(s, 31, 2, 1, 0.7)
        flower(s, 7, 6, 1, 0.7)
        flower(s, 41, 2, 1, 0.7)
    return tones(s, open_bottom=True)


def icon(sid):
    s = Spr(16, 16, SPAL)
    if sid == IDS[0]:
        pid = s.part(s.stroke([(12, 13), (12, 6), (9, 3), (4, 3)], 1.5),
                     base=1, k=0, line=0)
        s.decal(s.line1([(5, 3), (7, 3)]), 3, on=[pid])
        ribbed(s, [(7, 12), (6, 10), (6, 8)], 7, step=3, ticks=4)
    elif sid == IDS[1]:
        ribbed(s, [(9, 12), (8, 8), (7, 4)], 6, step=3, ticks=4)
    else:
        ribbed(s, [(8, 10), (3, 9), (3, 5)], 2, step=3, ticks=4)
        ribbed(s, [(9, 8), (13, 7), (13, 4)], 2, step=3, ticks=4)
        ribbed(s, [(9, 13), (8, 7), (7, 3)], 5, step=3, ticks=4)
        pid = s.part(s.stroke([(6, 2), (8, 2)], 1), base=3, k=0, line=0)
        s.decal(s.line1([(3, 5), (3, 6)]), 3)
        s.decal(s.line1([(13, 4), (13, 5)]), 3)
    return tones(s)


def render():
    return {sid: (front_frames(sid), back(sid), [icon(sid), hop(icon(sid))])
            for sid in IDS}


def review_layout(art):
    """Each species' front, back, icon in one unlabelled native/3x row."""
    from kit import to_rgba
    folder = Path(__file__).resolve().parent.parent / "review"
    folder.mkdir(exist_ok=True)
    for scale, name in ((1, "saguaro_1x.png"), (3, "saguaro_lead_layout.png")):
        sheet = Image.new("RGB", (384 * scale, 56 * scale), (200, 208, 200))
        for n, sid in enumerate(IDS):
            fs, b, icons = art[sid]
            for x, arr in ((0, fs[0]), (56, b), (104, icons[0])):
                im = Image.fromarray(to_rgba(arr, PAL))
                im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                sheet.paste(im, ((128 * n + x) * scale, 0), im)
        sheet.save(folder / name)


def build():
    from kit import write_species, intro_strip
    art = render()
    review_layout(art)
    poses = ["BRACED: a small ribbed barrel under a twiggy nurse shrub; the barrel swells and settles.",
             "BRACED: a tall unbranched ribbed column, its left-leaning growing tip flexing and settling.",
             "LOOMING: a towering ribbed stem with two unequal upturned arms; the arms lift and white tip flowers open."]
    for sid, pose in zip(IDS, poses):
        fs, b, icons = art[sid]
        write_species(sid, palette=PAL, sport=SPORT, front=fs, back=[b], icon=icons,
                      anim=ANIM, moving=moving_boxes(fs), tool=TOOL,
                      notes="Crystal rule. " + pose + " Saguaro green / deep pleat green. "
                      "Staggered white spine ticks, no dark areole dots. Rooted base fixed. "
                      "Sport: unnamed blue-grey waxy bloom of drought-stressed stems, an artistic "
                      "colour interpretation; not a named cultivar or cristate shape.")
        intro_strip(sid)


if __name__ == "__main__":
    build()
