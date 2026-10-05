"""Crystal rule, pumpkin line: pumpkin_blossom -> green_pumpkin -> pumpkin.

A redraw of tools/art/species_b/pumpkin.py under the Crystal rule
(docs/CREATURES.md "Crystal rule", docs/ROLLOUT.md):

  index 0  #181818  the full outline, the throat seams
  index 1  species dark: vine green (blossom) / blue-green (green gourd) /
           rust (pumpkin). The rib grooves, the stem horn, the leaves and
           the shadow side of every lobe; on the blossom it is the second
           hue (green leaves and ovary under an orange flower)
  index 2  species light: flower orange / gourd green / pumpkin orange
  index 3  #f8f8f8  the blossom's glowing throat, 1px rims, lobe glints

Signature: the ribbed gourd under a stem that curls forward like a horn,
with a coiled tendril tail. Every lobe is shaded on its own: on the shadow
half a groove gets a second dark pixel, on the lit half a white sliver.

Poses kept from the base art: all three BRACED (the gourd hunkered on stub
feet, a lobed leaf raised as a shield, the horn hooked at the foe).

Entrance animations (only the named part moves):
  pumpkin_blossom  the bell puckers, then BLARES open like a war horn,
                   tipped up at the foe, and settles.
  green_pumpkin    the stem horn rears back, BUTTS forward, rebounds; the
                   tendril tail springs with it.
  pumpkin          the great gourd rocks back, LURCHES at the foe, lands
                   with a THUD (a squash) and settles.

Sport: 'Jarrahdale' blue pumpkin (Cucurbita maxima, Western Australia):
slate blue-grey skin over blue-green vines.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/pumpkin.py        # write the base bundles + review sheet
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from kit import BLACK, WHITE, T, write_species, review_sheet, intro_strip  # noqa: E402
from _artb_draw import (BSpr, Spr, bez, erode, shift, rot, rim_white, render_frames,  # noqa: E402
                        place, back_frame, moving_boxes, icons)

TOOL = "tools/art/crystal/pumpkin.py"
IDS = ["pumpkin_blossom", "green_pumpkin", "pumpkin"]

PAL = {
    "pumpkin_blossom": [BLACK, "#386828", "#f89820", WHITE],
    "green_pumpkin": [BLACK, "#285038", "#78b040", WHITE],
    "pumpkin": [BLACK, "#903018", "#f08020", WHITE],
}
# 'Jarrahdale' blue pumpkin (docs/SPORTS.md)
SPORT = {
    "pumpkin_blossom": [BLACK, "#306058", "#f0c030", WHITE],
    "green_pumpkin": [BLACK, "#284850", "#78a098", WHITE],
    "pumpkin": [BLACK, "#384858", "#90a0b0", WHITE],
}


def spal(i):
    return (PAL[i][1], PAL[i][2], WHITE)


def R(pts, ang, c):
    return rot(pts, ang, c[0], c[1])


def gourd(s, cx, cy, w, h, n=5, tilt=0.0, base=2, k=3, groove=1, spec=True, stripes=None, rimf=0.35, sq=1.0, lobe_shade=True):
    """A ribbed gourd: an oblate body with scalloped flanks, grooves running
    pole to pole (tone `groove`), the bottom-right shadow crescent, a white
    rim on the lit edge and a specular dash on the top-left lobe.
    tilt (rad, + = top toward the foe)."""
    rx, ry = w / 2, h / 2 * sq
    a = -tilt
    m = s.ellipse(cx, cy, rx, ry, a)
    for i in range(n):
        th = -math.pi / 2 + math.pi * (i + 0.5) / n
        (x, y), = R([(cx + rx * math.sin(th) * 0.96, cy)], a, (cx, cy))
        m |= s.ellipse(x, y, rx / n * 1.05, ry * (0.97 - 0.10 * abs(math.sin(th))), a)
    (dx, dy), = R([(cx - rx * 0.12, cy - ry - 0.2)], a, (cx, cy))
    m &= ~s.ellipse(dx, dy, rx * 0.22, 1.4, a)
    pid = s.part(m, base=base, k=k, line=0)
    inner = erode(m, 1)
    for i in range(1, n):
        th = -math.pi / 2 + math.pi * i / n
        pts = []
        for yy in np.linspace(-ry + 1.2, ry - 0.8, 40):
            f = math.sqrt(max(0.0, 1 - (yy / ry) ** 2))
            pts.append((cx + rx * math.sin(th) * f, cy + yy))
        line = s.line1(R(pts, a, (cx, cy))) & inner
        tone = groove if stripes is None else stripes
        if stripes is None and lobe_shade:
            # each lobe rounds away from the light: on the shadow half the
            # groove's left neighbour darkens; on the lit half its right
            # neighbour catches a white sliver (upper part only)
            if th > 0.25:
                s.decal(shift(line, 1, 0) & inner & ~s.lock, groove, on=[pid])
            elif th < -0.75:
                ys_ = np.nonzero(line)[0]
                if len(ys_):
                    top = ys_.min() + (ys_.max() - ys_.min()) * 0.15
                    bot = ys_.min() + (ys_.max() - ys_.min()) * 0.55
                    yy = np.arange(s.h)[:, None]
                    s.decal(shift(line, -1, 0) & inner & (yy >= top) & (yy <= bot), 3, on=[pid], lock=True)
        s.decal(line, tone, on=[pid], lock=True)
    if rimf:
        rim_white(s, m, pid, rimf)
    if spec:
        # the gloss: a white crescent hugging the top-left of the second lobe
        # (a 2px band inside its lit edge, upper half only), like the acorn's
        th = -math.pi / 2 + math.pi * 1.5 / n
        (lx, ly), = R([(cx + rx * math.sin(th) * 0.80, cy)], a, (cx, cy))
        lobe = s.ellipse(lx, ly, rx / n * 1.25, ry * 0.86, a) & erode(m, 1)
        inner = erode(lobe, 1)
        band = inner & ~shift(inner, 2, 2)
        (_, ty), = R([(lx, ly - ry * 0.05)], a, (cx, cy))
        s.decal(band & (np.arange(s.h)[:, None] < s.T([(0, ty)])[0][1]), 3, on=[pid], lock=True)
    return pid, m


def lobed(s, p0, ang, L, w, lobes=3, spread=46):
    m = None
    kk = (lobes - 1) / 2
    for j in range(lobes):
        da = math.radians(ang + (j - kk) * spread)
        l = L * (1 - 0.18 * abs(j - kk))
        p1 = (p0[0] + math.cos(da) * l, p0[1] + math.sin(da) * l)
        lm, _ = s.leaf(p0, p1, w * 0.68 * (1 - 0.1 * abs(j - kk)), fat=0.6)
        m = lm if m is None else m | lm
    return m


def leaf_part(s, p0, ang, L, w, base=1, k=1, rimf=0.4, vein=None, lobes=3):
    m = lobed(s, p0, ang, L, w, lobes)
    pid = s.part(m, base=base, k=k, line=0)
    if vein is not None:
        for j in range(lobes):
            da = math.radians(ang + (j - (lobes - 1) / 2) * 46)
            l = L * 0.7
            s.decal(s.line1([p0, (p0[0] + math.cos(da) * l, p0[1] + math.sin(da) * l)]) & erode(m, 1), vein, on=[pid])
    if rimf:
        rim_white(s, m, pid, rimf)
    return pid, m


def coil_pts(cx, cy, r0, turns, a0, r1=0.8, cw=True, n=60):
    return [(cx + (r0 + (r1 - r0) * i / (n - 1)) * math.cos(a0 + (1 if cw else -1) * turns * 2 * math.pi * i / (n - 1)),
             cy + (r0 + (r1 - r0) * i / (n - 1)) * math.sin(a0 + (1 if cw else -1) * turns * 2 * math.pi * i / (n - 1)))
            for i in range(n)]


def tendril(s, lead, cx, cy, r0, turns, a0, w=2.0, cw=True, base=1):
    path = bez(lead, 12) + coil_pts(cx, cy, r0, turns, a0, cw=cw)
    return s.part(s.stroke(path, (w, w * 0.8)), base=base, k=0, line=0)


def stub_feet(s, xs, y=55.6, w=5.0, base=1):
    for x0, x1 in xs:
        m, _ = s.leaf((x0, y - 2.5), (x1, y), w, fat=0.6)
        s.part(m, base=base, k=0, line=0)


def star_pts(cx, cy, rx, ry, ang, n=5, tip=1.45, rot0=0.0):
    pts = []
    for i in range(2 * n):
        t = rot0 + math.pi * i / n
        r = tip if i % 2 == 0 else 1.0
        u, v = math.cos(t) * rx * r, math.sin(t) * ry * r
        pts.append((cx + u * math.cos(ang) - v * math.sin(ang), cy + u * math.sin(ang) + v * math.cos(ang)))
    return pts


# ---------------------------------------------------------------- blossom
# (flare scale, bell lift deg): rest, pucker (anticipation), BLARE, overshoot, settle
BLOSSOM = [(1.0, 0), (0.74, 6), (1.22, -8), (1.10, -4), (1.04, -1)]


def front_blossom(f=0):
    fl, lift = BLOSSOM[f]
    s = BSpr(56, 56, spal("pumpkin_blossom"), sc=0.93)
    s.set_tilt(4, 31, 55)
    with s.untilted():
        stub_feet(s, [(28, 20), (34, 43)])
    tendril(s, [(38, 45), (43, 41)], 46, 36, 4.0, 1.25, math.radians(110), w=2.2)
    leaf_part(s, (37, 43), -55, 10, 8, rimf=0.3)
    gourd(s, 31, 48, 19, 13, n=5, tilt=0.14, base=1, k=0, stripes=2, spec=False, rimf=0.3)
    # the sepal star where the bell meets the gourd
    s.part(s.poly(star_pts(28, 41, 4.6, 1.6, 0.0, tip=1.4, rot0=-1.9)), base=1, k=0, line=0)
    before = s.tone.copy()
    hinge = (28, 41)
    with s.rotated(lift, *hinge):
        mx, my, ang = 15, 22, math.radians(22)
        tube = s.curve([(28, 41), (24, 35), (19, 28)], (4.0, 10.0 * min(1.15, fl)))
        tid = s.part(tube, base=2, k=2, line=0)
        rim_white(s, tube, tid, 0.5)
        bell = s.poly(star_pts(mx, my, 8.0 * fl, 12.5 * fl, ang, tip=1.55, rot0=-math.pi / 2))
        bid = s.part(bell, base=2, k=2, line=0)
        rim_white(s, bell, bid, 0.45)
        # the throat: a white inner star, the stigma in orange at its heart
        th = s.poly(star_pts(mx - 0.5, my, 3.4 * fl, 5.4 * fl, ang, tip=1.45, rot0=-math.pi / 2))
        s.part(th & erode(bell, 1), base=3, k=0, line=1)
        s.part(s.ellipse(mx + 0.5, my + 1.0, 1.3 * fl, 1.9 * fl, -0.7) & th, base=2, k=0, line=None)
        # petal veins: dark creases from the throat to each point
        for i in range(5):
            t = -math.pi / 2 + 2 * math.pi * i / 5
            u, v = math.cos(t) * 8.0 * fl * 1.3, math.sin(t) * 12.5 * fl * 1.3
            tip = (mx + u * math.cos(ang) - v * math.sin(ang), my + u * math.sin(ang) + v * math.cos(ang))
            s.decal(s.line1(bez([(mx, my), tip], 10)) & erode(bell, 1) & ~th, 1, on=[bid])
    s.movem = s.tone != before
    leaf_part(s, (25, 47), 215, 10, 8, rimf=0.5)
    s.contact += [(22, 40)]
    return s


def blossom():
    return place(render_frames(front_blossom, len(BLOSSOM)), 56)


# ---------------------------------------------------------------- green pumpkin
# (horn swing deg, tendril spring): rest, rear back, BUTT, rebound, settle
GREEN = [(0, 0), (-14, -2), (12, 2), (5, 1), (2, 0)]


def front_green(f=0):
    sw, sp = GREEN[f]
    s = BSpr(56, 56, spal("green_pumpkin"), sc=0.93)
    s.set_tilt(3, 30, 55)
    with s.untilted():
        stub_feet(s, [(22, 14), (36, 45)], w=6)
    before = s.tone.copy()
    tendril(s, [(43, 38), (46, 33 - sp)], 48, 27 - sp * 2, 4.0, 1.25, math.radians(120), w=2.4)
    tmask = s.tone != before
    s.part(s.curve([(39, 30), (43, 24)], (3.0, 2.6)), base=1, k=0, line=0)
    leaf_part(s, (43, 24), -60, 11, 9, base=2, k=1, rimf=0.4, vein=1)
    gourd(s, 30, 41, 34, 25, n=5, tilt=0.14, rimf=0.5)
    before = s.tone.copy()
    with s.rotated(sw, 26, 30):
        stem = s.curve([(27, 31), (24, 23), (20, 18), (15, 16)], (5.5, 3.2))
        sid = s.part(stem, base=1, k=1, line=0, sh_tone=0)
        s.decal(s.line1(bez([(26, 29), (23, 22), (19, 18)], 10)) & erode(stem, 1), 2, on=[sid])
    s.movem = (s.tone != before) | tmask
    s.part(s.curve([(16, 39), (10, 34), (8, 28)], (3.2, 2.8)), base=1, k=0, line=0)
    leaf_part(s, (8, 29), 255, 15, 12, base=2, k=2, rimf=0.5, vein=1)
    s.contact += [(16, 44)]
    return s


def green():
    return place(render_frames(front_green, len(GREEN)), 56)


# ---------------------------------------------------------------- pumpkin
# (rock deg, squash): rest, rock back, LURCH at the foe, THUD (squash), settle
PUMPKIN = [(0, 1.0), (-4, 1.02), (5, 1.0), (4, 0.92), (1, 0.97)]


def front_pumpkin(f=0):
    rk, sq = PUMPKIN[f]
    s = BSpr(56, 56, spal("pumpkin"), sc=0.9)
    s.set_tilt(2, 31, 55)
    with s.untilted():
        stub_feet(s, [(20, 11), (40, 50)], w=7)
    tendril(s, [(49, 36), (51, 31)], 49, 25, 4.0, 1.25, math.radians(120), w=2.6)
    s.part(s.curve([(43, 26), (47, 19)], (3.4, 3.0)), base=1, k=0, line=0)
    leaf_part(s, (47, 19), -70, 11, 9, base=1, k=0, rimf=0.4, vein=2)
    s.part(s.curve([(14, 36), (9, 31), (8, 24)], (3.6, 3.0)), base=1, k=0, line=0)
    leaf_part(s, (8, 25), 262, 14, 12, base=1, k=0, rimf=0.5, vein=2)
    before = s.tone.copy()
    gy = 37 + (1 - sq) * 16
    with s.rotated(rk, 31, 53):
        gourd(s, 31, gy, 44 * (2 - sq) ** 0.5, 32 * sq, n=7, tilt=0.12, rimf=0.55)
        stem = s.curve([(27, gy - 14 * sq), (25, gy - 22 * sq), (20, gy - 28 * sq), (13, gy - 30 * sq)], (8.0, 4.0))
        sid = s.part(stem, base=1, k=2, line=0, sh_tone=0)
        s.decal(s.line1(bez([(25, gy - 15), (23, gy - 22), (19, gy - 27)], 10)) & erode(stem, 1), 2, on=[sid])
        rim_white(s, stem, sid, 0.25)
    s.movem = s.tone != before
    s.contact += [(14, 46)]
    return s


def pumpkin():
    return place(render_frames(front_pumpkin, len(PUMPKIN)), 56)


# ---------------------------------------------------------------- backs
def crown_ribs(s, pid, cx, top, bottom, rx, n, groove=1, lit=3):
    """Ribs seen from above: curves from the stem crown out over the shoulder
    and down to the cropped bottom edge."""
    m = s.tone >= 0
    for i in range(1, n):
        th = -math.pi / 2 + math.pi * i / n
        ctrl = [(cx + 3 * math.sin(th), top), (cx + rx * math.sin(th) * 1.12, (top + bottom) / 2 - 2),
                (cx + rx * math.sin(th), bottom)]
        line = s.line1(bez(ctrl, 30)) & erode(m, 1)
        if th < -0.6:
            yy = np.arange(s.h)[:, None]
            s.decal(shift(line, -1, 0) & (yy > top + 4) & (yy < (top + bottom) / 2 + 4), lit, on=[pid], lock=True)
        elif th > 0.3:
            s.decal(shift(line, 1, 0), groove, on=[pid])
        s.decal(line, groove, on=[pid], lock=True)


def back_blossom():
    s = Spr(48, 48, spal("pumpkin_blossom"), sc=1.3)
    leaf_part(s, (14, 38), 210, 14, 11, rimf=0.4)
    gourd(s, 22, 44, 26, 18, n=5, tilt=-0.1, base=1, k=0, stripes=2, spec=False, rimf=0.3)
    tube = s.curve([(23, 36), (27, 28), (31, 21)], (6.0, 11.0))
    tid = s.part(tube, base=2, k=2, line=0)
    rim_white(s, tube, tid, 0.4)
    mouth = s.poly(star_pts(33, 15, 8.0, 12.0, -0.3, tip=1.45, rot0=-1.05))
    mid = s.part(mouth, base=2, k=3, line=0)
    rim_white(s, mouth, mid, 0.45)
    for kk in range(5):
        a = -1.05 + 2 * math.pi * kk / 5
        s.decal(s.line1(bez([(33, 15), (33 + math.cos(a) * 12, 15 + math.sin(a) * 10)], 10)) & erode(mouth, 1), 1, on=[mid])
    s.part(s.poly(star_pts(23, 36, 5.0, 1.8, 0.0, tip=1.4, rot0=-1.4)), base=1, k=0, line=0)
    leaf_part(s, (32, 38), -20, 14, 11, rimf=0.45)
    return s


def back_green():
    s = Spr(48, 60, spal("green_pumpkin"), sc=1.05)
    leaf_part(s, (12, 26), 215, 14, 11, base=2, k=2, rimf=0.4, vein=1)
    body = s.ellipse(23, 36, 23, 18) | s.ellipse(23, 44, 24, 14)
    pid = s.part(body, base=2, k=4, line=0)
    rim_white(s, body, pid, 0.35)
    crown_ribs(s, pid, 24, 20, 50, 23, 5)
    s.part(s.ellipse(24, 20, 5.5, 3.0), base=1, k=0, line=0)
    stem = s.curve([(25, 21), (29, 13), (35, 9), (38, 12)], (5.0, 3.0))
    sid = s.part(stem, base=1, k=1, line=0, sh_tone=0)
    s.decal(s.line1(bez([(26, 19), (29, 13), (34, 10)], 10)) & erode(stem, 1), 2, on=[sid])
    leaf_part(s, (36, 26), -30, 14, 12, base=2, k=2, rimf=0.4, vein=1)
    return s


def back_pumpkin():
    s = Spr(48, 60, spal("pumpkin"))
    s.part(s.curve([(10, 30), (5, 22), (6, 15)], (3.4, 3.0)), base=1, k=0, line=0)
    leaf_part(s, (6, 16), 250, 12, 11, base=1, k=0, rimf=0.45, vein=2)
    s.part(s.curve([(38, 26), (43, 19), (44, 13)], (3.4, 3.0)), base=1, k=0, line=0)
    leaf_part(s, (44, 14), -75, 11, 10, base=1, k=0, rimf=0.4, vein=2)
    body = s.ellipse(24, 38, 23.5, 22) | s.ellipse(24, 46, 24.5, 18)
    pid = s.part(body, base=2, k=4, line=0)
    rim_white(s, body, pid, 0.35)
    crown_ribs(s, pid, 25, 21, 50, 24, 7)
    s.part(s.ellipse(25, 20, 5.0, 2.6), base=1, k=0, line=0)
    stem = s.curve([(25, 21), (28, 13), (33, 8), (38, 6)], (7.5, 3.8))
    sid = s.part(stem, base=1, k=2, line=0, sh_tone=0)
    s.decal(s.line1(bez([(26, 18), (28, 13), (33, 9)], 10)) & erode(stem, 1), 2, on=[sid])
    return s


# ---------------------------------------------------------------- icons
# k outline, 1 dark, 2 light, 3 white; the blossom's frame 2 blares open,
# None = frame 2 hops 1px
ICONS = {
    "pumpkin_blossom": ([
        "................",
        ".k3k..k.........",
        "k323kk2kk.......",
        ".k3223222k......",
        "k3223322kk......",
        "k223332222k.....",
        ".k2233222k......",
        ".k22k2222k..kk..",
        "k2kkk2221k.k11k.",
        ".k...k2211k131k.",
        "....k1121kk11k..",
        "...k1212121kk...",
        "..k312121211k...",
        "..k121212111k...",
        "...k1111111k....",
        "....kkkkkkk.....",
    ], [
        "k3k...kk........",
        "k32kkk23k.......",
        ".k32232222k.....",
        "k32233322kk.....",
        "k223333222k.....",
        "k2233322222k....",
        ".k22322222k.....",
        ".k2kk2222k..kk..",
        "kk..k2221k.k11k.",
        ".....k2211k131k.",
        "....k1121kk11k..",
        "...k1212121kk...",
        "..k312121211k...",
        "..k121212111k...",
        "...k1111111k....",
        "....kkkkkkk.....",
    ]),
    "green_pumpkin": ([
        "................",
        ".kk......k......",
        "k32k....k1k.....",
        "2222k..k11k.....",
        "23222kk11k......",
        "k2222k11k.......",
        ".k21k11kkk......",
        "..k1222222kk....",
        ".k3322212221k...",
        "k332212221221k..",
        "k322212221211k..",
        "k222212221211k..",
        "k222212221111k..",
        ".k22222211111k..",
        "..k11kkkk11kk...",
        "...kk....kk.....",
    ], None),
    "pumpkin": ([
        "................",
        "....kkk.........",
        "...k111k........",
        "..k1kk11k.......",
        "..kk.kk11kkkkk..",
        "..kkk2k1122222kk",
        ".k23221222122221",
        "k33212221222121k",
        "k33212221222111k",
        "k32212221222111k",
        "k22212221222111k",
        "k22212221221111k",
        ".k2212221211111k",
        "..k22222111111k.",
        "...kk11111111k..",
        ".....kkkkkkkk...",
    ], None),
}

ANIM = {
    # pucker, BLARE, overshoot, settle
    "pumpkin_blossom": {"intro": [[0, 6], [1, 14], [2, 18], [3, 6], [4, 8], [0, 1]], "idle": [[0, 120], [4, 10]]},
    # rear back, BUTT, hold, rebound
    "green_pumpkin": {"intro": [[0, 6], [1, 14], [2, 4], [3, 16], [4, 8], [0, 1]], "idle": [[0, 130], [4, 10]]},
    # rock back, LURCH, THUD held, settle
    "pumpkin": {"intro": [[0, 6], [1, 14], [2, 5], [3, 18], [4, 8], [0, 1]], "idle": [[0, 150], [4, 10]]},
}

NOTES = {
    "pumpkin_blossom": "Crystal rule. BRACED. Gesture: the bell puckers, then BLARES open like a war horn tipped "
                       "up at the foe, and settles. Vine green in the dark slot (leaves, sepals, the striped "
                       "ovary), flower orange in the light slot, the glowing throat in white with an orange "
                       "stigma (no dark centre, so no eye). Sport: 'Jarrahdale'.",
    "green_pumpkin": "Crystal rule. BRACED. Gesture: the stem horn rears back, BUTTS forward and rebounds while the "
                     "tendril tail springs. Each lobe is shaded on its own (a second dark pixel on the shadow "
                     "half, a white sliver on the lit half). Sport: 'Jarrahdale', slate blue-green.",
    "pumpkin": "Crystal rule. BRACED (heavy). Gesture: the great gourd rocks back, LURCHES at the foe and lands "
               "with a THUD (squashed), then settles; the gourd is most of the body, so it moves whole while the "
               "feet, vines and leaves stay put. Sport: 'Jarrahdale' blue-grey.",
}

FRONTS = {"pumpkin_blossom": blossom, "green_pumpkin": green, "pumpkin": pumpkin}
BACKS = {"pumpkin_blossom": back_blossom, "green_pumpkin": back_green, "pumpkin": back_pumpkin}


def build():
    """Write the three base bundles."""
    for sid in IDS:
        front = FRONTS[sid]()
        write_species(sid, palette=PAL[sid], sport=SPORT[sid], front=front, back=[back_frame(BACKS[sid])],
                      icon=icons(ICONS[sid]), anim=ANIM[sid], moving=moving_boxes(front),
                      notes=NOTES[sid], tool=TOOL)


if __name__ == "__main__":
    build()
    for sid in IDS:
        intro_strip(sid)
    print("review sheet:", review_sheet(IDS, HERE.parent / "review" / "crystal_pumpkin.png"))
