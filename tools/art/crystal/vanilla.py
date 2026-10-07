"""Original Crystal-rule Vanilla planifolia: vanilla_vine -> vanilla_orchid.

Teen COILED: fleshy oval paddles alternating along an S-shaped climbing vine,
a short wooden stake, and pale aerial roots arched out from its nodes.
Adult LOOMING: the same vine loops over its taller stake; left-facing orchid
flowers show five narrow segments and a flared trumpet lip, with long green
capsules hanging from a common raceme below. No enclosed dark dots or throats.
The teen's growing tip unfurls; the adult flower opens and its beans swing,
while the stake, roots and established leaves stay registered.
Sport: Vanilla planifolia 'Variegata', cream-striped fleshy leaves represented
by a pale cream-green mid tone (palette swap only, no extra sport geometry).
No sprites from another game are used.
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image

from _d_kit import BLACK, WHITE, T, Spr, bez, tones, moving_boxes, hop, rim_white

TOOL = "tools/art/crystal/vanilla.py"
IDS = ["vanilla_vine", "vanilla_orchid"]
PAL = [BLACK, "#485838", "#90b860", WHITE]
SPORT = [BLACK, "#586040", "#d0d8a0", WHITE]
SPAL = tuple(PAL[1:])
KEYS = [(0, 0), (-1.4, -0.8), (2.6, 1.8), (1.3, -1.0), (0.5, 0.6)]
ANIM = {"intro": [[0, 8], [1, 12], [2, 6], [3, 16], [4, 12], [0, 8]],
        "idle": [[0, 140], [1, 10], [0, 8]]}


def stem(s, ctrl, width=3.5, tone=2, shine=False):
    path = bez(ctrl, 50)
    m = s.stroke(path, width, cap=True)
    pid = s.part(m, base=tone, k=0, line=0)
    if shine:
        s.decal(s.line1(path[7:-7]), 3, on=[pid])
    return pid


def paddle(s, base, tip, width, rim=0.6, rib=True):
    """Thick, smooth oval leaf: rounded shoulders, short pointed apex.

    A broad flat face with a connected shade margin, never a cylinder.
    The long pale midrib is a surface stripe, not a glint on a dark dot.
    """
    bx, by = base
    tx, ty = tip
    dx, dy = tx - bx, ty - by
    length = math.hypot(dx, dy)
    nx, ny = -dy / length, dx / length
    left, right = [], []
    for t in np.linspace(0, 1, 40):
        # Oval shoulders maintain their width until the short pointed tip.
        hw = width / 2 * math.sin(math.pi * t) ** 0.62
        x, y = bx + dx * t, by + dy * t
        left.append((x + nx * hw, y + ny * hw))
        right.append((x - nx * hw, y - ny * hw))
    m = s.poly(left + right[::-1])
    pid = s.part(m, base=2, k=1, sh_tone=1, line=0)
    rim_white(s, m, pid, rim)
    if rib:
        stripe = [(bx + dx * t, by + dy * t) for t in np.linspace(0.20, 0.76, 30)]
        s.decal(s.line1(stripe), 3, on=[pid])
    return pid


def stake(s, adult=False, back=False):
    if back:
        m = s.poly([(22, 49), (25, 2), (30, 4), (30, 49)])
    else:
        top = 5 if adult else 13
        m = s.poly([(30, 54), (33, top), (37, top + 1), (36, 54)])
    pid = s.part(m, base=1, k=0, line=0)
    rim_white(s, m, pid, 0.45)
    # Lengthwise grain joins the outside contour rather than making spots.
    x, y = (27, 7) if back else (35, 17 if not adult else 9)
    s.decal(s.line1([(x, y), (x - 1, y + 14)]), 2, on=[pid])


def roots(s, adult=False):
    """Open arches, attached at nodes; bright crests over green root flesh."""
    curves = [([(31, 45), (24, 44), (21, 51), (18, 54)], 2.3),
              ([(34, 44), (42, 46), (43, 53), (48, 54)], 2.3),
              ([(31, 32), (24, 30), (22, 35), (21, 40)], 2.2)]
    if adult:
        curves.append(([(34, 18), (43, 17), (44, 22), (43, 27)], 2.3))
    for ctrl, width in curves:
        stem(s, ctrl, width, shine=True)


TEEN_LEAVES = [((34, 38), (48, 29), 10.5),
               ((30, 43), (12, 46), 10.5),
               ((33, 28), (48, 21), 10.5),
               ((30, 32), (9, 25), 12.5),
               ((30, 23), (16, 14), 10.5)]
ADULT_LEAVES = [((34, 36), (51, 42), 9.5),
                ((32, 48), (13, 49), 9.5),
                ((35, 22), (53, 15), 10),
                ((30, 35), (8, 31), 10),
                ((30, 21), (10, 11), 9.5),
                ((34, 10), (46, 1), 10)]


def blossom(s, x, y, opening=0.0, scale=1.0, reverse=False):
    """Five narrow orchid segments behind an open-sided flared trumpet lip.

    The lip's fold is a long shade wedge reaching its rim, never an enclosed
    black throat. Shared leaf green plus white rim highlight reads pale
    yellow-green within the binding two-tone palette.
    """
    def p(px, py):
        return (x + px * scale * (-1 if reverse else 1), y + py * scale)
    spread = 1 + opening * 0.08
    for tip, w in [((-7, -10 * spread), 4), ((3, -9 * spread), 4),
                   ((7, -2), 4), ((4, 7 * spread), 4), ((-5, 8 * spread), 4)]:
        paddle(s, p(0, 0), p(*tip), w * scale, rim=0.85)
    lip = s.poly([p(2, -2), p(-3, -4), p(-8 - opening, -4 - opening * 0.3),
                  p(-11 - opening, -1), p(-9 - opening, 5 + opening * 0.3),
                  p(-4, 5), p(1, 2)])
    pid = s.part(lip, base=2, k=0, line=0)
    rim_white(s, lip, pid, 0.75)
    s.decal(s.poly([p(1, 0), p(-13 - opening, 1),
                   p(-13 - opening, 5), p(-3, 3)]), 1, on=[pid])
    s.decal(s.line1([p(-8 - opening, -2), p(-5, -1), p(-2, -1)]), 3, on=[pid])


def beans(s, sway):
    stem(s, [(35, 24), (40, 28), (44, 29)], 2.6)
    for i, (x, bottom) in enumerate(((38, 52), (43, 50), (48, 47))):
        path = bez([(40 + i * 2, 28 + i), (x + 1, 37),
                    (x + sway * 0.55, bottom - 6), (x + sway, bottom)], 60)
        m = s.stroke(path, (3.5, 2.0), cap=True)
        pid = s.part(m, base=1, k=0, line=0)
        s.decal(s.line1([(px - 0.5, py) for px, py in path[8:-8]]), 2, on=[pid])
        s.decal(s.line1([(px - 0.5, py) for px, py in path[12:29]]), 3, on=[pid])


def front(sid, frame=0):
    adult = sid == IDS[1]
    opening, sway = KEYS[frame]
    s = Spr(56, 56, SPAL)
    stake(s, adult)
    roots(s, adult)
    # One creeping vine forms the lower S; its leader loops over the stake.
    for ctrl in ([[(31, 52), (39, 39), (24, 28), (33, 17)],
                  [(33, 17), (40, 8), (31, 0), (23, 5)]] if adult else
                 [[(31, 52), (38, 40), (25, 29), (31, 19)],
                  [(31, 19), (30, 16), (26, 14), (23, 13)]]):
        stem(s, ctrl, 4.0)
    for base, tip, width in ADULT_LEAVES if adult else TEEN_LEAVES:
        paddle(s, base, tip, width)
    if adult:
        beans(s, sway)
        blossom(s, 21, 16, opening)
        paddle(s, (34, 10), (28, 3), 5, rim=0.75, rib=False)
    else:
        # The tender terminal leaf unfolds; established paddles remain fixed.
        paddle(s, (28, 20), (21 - opening, 11 - opening * 0.3), 8 + opening * 0.5)
    return tones(s)


def back(sid):
    """Close rear view: enlarged overlapping leaf undersides, stem cropped.

    Adult flower sepals face away and the capsules are partly hidden behind
    the near foliage, rather than reusing the front's open trumpet.
    """
    s = Spr(48, 48, SPAL)
    stake(s, back=True)
    stem(s, [(24, 53), (15, 34), (31, 21), (25, 6)], 6)
    leaves = [((24, 43), (3, 47), 23), ((29, 40), (45, 47), 22),
              ((25, 28), (2, 26), 20), ((28, 25), (45, 20), 21),
              ((25, 13), (8, 4), 18), ((29, 14), (44, 2), 17)]
    for base, tip, width in leaves:
        paddle(s, base, tip, width, rim=0.45)
    if sid == IDS[1]:
        stem(s, [(34, 23), (40, 32), (38, 46)], 3, tone=1, shine=True)
        for tip in ((15, 4), (26, 0), (34, 5), (31, 16), (17, 16)):
            paddle(s, (24, 9), tip, 5, rim=0.75)
    return tones(s, open_bottom=True)


def icon(sid):
    s = Spr(16, 16, SPAL)
    stem(s, [(9, 14), (10, 2)], 2.4, tone=1)
    stem(s, [(7, 14), (11, 9), (7, 5)], 1.5)
    paddle(s, (8, 10), (2, 9), 3.8, rim=0.3, rib=False)
    paddle(s, (9, 6), (13, 4), 3.8, rim=0.3, rib=False)
    paddle(s, (8, 5), (4, 2), 3.4, rim=0.3, rib=False)
    if sid == IDS[1]:
        for x, end in ((12, 14), (14, 12)):
            stem(s, [(11, 7), (x, 9), (x, end)], 1.4, tone=1)
        blossom(s, 7, 4, scale=0.28)
    else:
        stem(s, [(7, 12), (4, 12), (3, 14)], 1.5, shine=True)
    return tones(s)


def render():
    return {sid: ([front(sid, f) for f in range(len(KEYS))], back(sid),
                  [icon(sid), hop(icon(sid))]) for sid in IDS}


def review_layout(art):
    from kit import to_rgba
    folder = Path(__file__).resolve().parent.parent / "review"
    folder.mkdir(exist_ok=True)
    for scale, name in ((1, "vanilla_1x.png"), (3, "vanilla_lead_layout.png")):
        sheet = Image.new("RGB", (256 * scale, 56 * scale), (200, 208, 200))
        for n, sid in enumerate(IDS):
            fs, b, icons = art[sid]
            for x, arr in ((0, fs[0]), (56, b), (104, icons[0])):
                im = Image.fromarray(to_rgba(arr, PAL), "RGBA")
                im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                sheet.paste(im, ((128 * n + x) * scale, 0), im)
        sheet.save(folder / name)


def build():
    from kit import write_species, intro_strip
    art = render()
    review_layout(art)
    for sid, (fs, b, icons) in art.items():
        pose = ("COILED: a fleshy S-shaped vine climbing a short wooden stake, thick "
                "oval leaves and pale arching aerial roots. The tender tip unfurls." if sid == IDS[0] else
                "LOOMING: the vine loops over its tall stake, pale green orchid flowers "
                "with side-facing trumpet lips, and a hanging cluster of long green beans. "
                "The flower opens and the capsules sway.")
        write_species(sid, palette=PAL, sport=SPORT, front=fs, back=[b], icon=icons,
                      anim=ANIM, moving=moving_boxes(fs), tool=TOOL,
                      notes="Crystal rule. " + pose + " Stake, roots and established leaves stay fixed. "
                      "Leaf green / dark green-brown stake and capsules; white is rim and gloss only. "
                      "Sport: Vanilla planifolia 'Variegata', cream-striped leaves interpreted "
                      "as pale cream-green in the mid slot; geometry stays identical.")
        intro_strip(sid)


if __name__ == "__main__":
    build()
