"""Chili line: chili_blossom -> green_chili -> red_chili.  (CREATURES.md)

Motif: the lime star CALYX and the FLAME. The pods stand on their calyx
(the sepals spread like toes), point their tip up like a candle flame and
curl it toward the foe; the stem flicks out behind like a tail. Accent:
the calyx lime, carried in the light slot so it doubles as the glint.

chili_blossom LUNGING  the nodding white star flower hung out over the foe on a
                       hooked stem, lead leaf thrust forward, a bud trailing behind.
green_chili   LUNGING  a candle-flame pod leaning at the foe, tip curling, leaf
                       arms out from the calyx, stem tail flicked back.
red_chili     COILED   a fat-shouldered pod whipped into a flame curl over the
                       foe, calyx toes planted wide, an ember drifting off.
"""

from __future__ import annotations

import numpy as np
from PIL import Image

from px import Sprite, spline, star, lit_stripe
from kit import selout, icon, icon2

IDS = ["chili_blossom", "green_chili", "red_chili"]

BLOSSOM = ["#286830", "#a0d070", "#f8f8f0"]        # calyx green, petal shade, white (real: the flower is white)
GREEN = ["#205030", "#60b038", "#d8f080"]          # blue-green shade, pod green, lime
RED = ["#881830", "#e84020", "#d8f078"]            # wine shade, flame red, lime (calyx + glint)


def tapered(c, path, widths):
    """Stroke along a dense path with a per-point width profile (list of
    (t, w) keyframes), so a pod can be fat at the shoulder and fine at the tip."""
    P = np.asarray(path, float)
    n = len(P)
    ts = np.linspace(0, 1, n)
    kt, kw = zip(*widths)
    W = np.interp(ts, kt, kw)
    m = c.empty()
    for i in range(n - 1):
        d, t = c._seg_dist(P[i], P[i + 1])
        w = W[i] + (W[i + 1] - W[i]) * t
        m |= d <= w / 2
    return m


def calyx_feet(c, cx, cy, w, toes=5, spread=1.0, ang0=200, ang1=340):
    """A calyx seen from the side, its sepals splayed onto the ground like toes."""
    m = c.ellipse(cx, cy, w / 2, w * 0.22)
    for k in range(toes):
        a = np.radians(ang0 + (ang1 - ang0) * k / (toes - 1))
        x = cx + np.cos(a) * w * 0.55 * spread
        y = cy - np.sin(a) * w * 0.20 + 1.5
        m |= c.leaf((cx + np.cos(a) * w * 0.2, cy + 0.5), (x, y), w * 0.26, power=0.7, tip=1.5)
    return m


# --------------------------------------------------------------------------- blossom

def blossom_front(f=0):
    s = Sprite(56, 56, BLOSSOM)
    c = s.c
    sw = (0, 0.6, 1.2)[f]
    hx, hy = 18.5 - sw, 28.0 + sw * 0.5                   # flower centre, thrust out at the foe
    tilt = -28                                            # the face tips down-left (3/4, nodding)
    stem = c.curve([(34, 55.6), (37.5, 46), (36, 34), (31, 24.5), (24 - sw * 0.6, 20.5 + sw * 0.4)], 4.2, 3.0)
    feet = (c.leaf((33, 53.2), (22, 55.2), 5.4, power=0.7, bend=0.6) | c.leaf((35.5, 53.2), (46, 55.2), 5.0, power=0.7, bend=-0.6))
    lead = c.leaf((35.5, 41), (16, 41 - sw * 0.8), 9.0, bend=-2.6, tip=1.4)      # lead arm: up in guard
    rear = c.leaf((36.5, 36), (48, 26 - sw * 0.5), 7.0, bend=1.5, tip=1.3)
    budst = c.curve([(36, 31), (40.5, 20), (44, 14.5 - sw * 0.4)], 2.4, 2.0)
    bud = c.leaf((44.5, 14 - sw * 0.4), (47.5, 21 - sw * 0.4), 5.4, power=0.7, tip=1.6, base=0.8)
    budcal = c.ellipse(44.5, 14.8 - sw * 0.4, 2.8, 2.1)
    cal = star(c, hx + 6.5, hy - 6.5, 5, 2.6, 7.0, sy=0.8, rot=-40)          # the line's lime calyx
    s.add(rear, tones=(1, 2, 2), shade=(2, 2), close=2)
    s.add(budst, tones=(1, 1, 1), flat=True)
    s.add(bud, tones=(1, 2, 3), shade=(2, 1))
    s.add(budcal, tones=(2, 2, 2), flat=True)
    s.add(feet, tones=(1, 2, 2), shade=(1, 1))
    s.add(stem, tones=(1, 1, 2), shade=(2, 0))
    s.add(cal, tones=(1, 2, 2), shade=(2, 2))
    # five pointed star petals on a tilted ellipse: the near (lower-left) ones long
    tr = np.radians(tilt)
    pet = []
    for k in range(5):
        a = np.radians(-90 + 72 * k + 18 + sw * 2)
        ex, ey = np.cos(a) * 18.0, np.sin(a) * 18.0 * 0.68           # flattened (3/4)
        x, y = ex * np.cos(tr) - ey * np.sin(tr), ex * np.sin(tr) + ey * np.cos(tr)
        near = y > -2
        pet.append((not near, k, (hx + x * (1.0 if near else 0.82), hy + y * (1.0 if near else 0.82))))
    for far, k, p1 in sorted(pet, reverse=True):
        s.add(c.leaf((hx, hy), p1, 11.5, bend=1.6, power=0.55, tip=3.2, base=0.7),
              tones=(2, 3, 3), shade=(2, 2), line="dark")
    s.add(lead, tones=(1, 2, 2), shade=(2, 2), close=2, line="black")
    s.render()
    # the flower's eye: green throat, black anther ring, a pale pistil
    s.paint(c.ellipse(hx - 0.3, hy - 0.2, 4.2, 3.2, tilt), 2, only=[2, 3, 0])
    s.paint(c.ellipse(hx - 0.3, hy - 0.2, 2.8, 2.0, tilt), 1)
    for k in range(5):
        a = np.radians(-90 + 36 + 72 * k)
        ex, ey = np.cos(a) * 3.8, np.sin(a) * 2.8
        x, y = ex * np.cos(tr) - ey * np.sin(tr), ex * np.sin(tr) + ey * np.cos(tr)
        s.px([(int(round(hx - 0.3 + x)), int(round(hy - 0.2 + y)))], 0)
    s.px([(int(hx) - 1, int(hy) - 1), (int(hx), int(hy) - 1)], 3)
    # lead-leaf midrib
    for t in np.linspace(0.15, 0.75, 14):
        x, y = int(35.5 + (16 - 35.5) * t), int(41 + (41 - sw * 0.8 - 41) * t - 2.6 * np.sin(np.pi * t) * 0.7)
        if s.t[y, x] == 2:
            s.px([(x, y)], 1)
    selout(s, region=(c.Y < 30) & (c.X > 26), lit=(2,))
    s.clean()
    return s.image()


def blossom_back():
    """From behind and above: the calyx star and the white petal backs,
    the flower nodding toward the top-right, the stem dropping out of frame."""
    s = Sprite(48, 48, BLOSSOM, crop_bottom=True)
    c = s.c
    cx, cy = 26, 24
    stem = c.curve([(14, 48), (11, 36), (14, 24), (20, 18)], 4.4, 3.4)
    lead = c.leaf((13, 34), (34, 44), 10, bend=2.0, tip=1.3)
    rear = c.leaf((12, 30), (2, 18), 8, bend=-1.5, tip=1.3)
    s.add(rear, tones=(1, 2, 2), shade=(2, 2), close=2)
    s.add(stem, tones=(1, 1, 2), shade=(2, 0))
    for k in (0, 4, 1, 3, 2):
        a = np.radians(-60 + 72 * k)
        p1 = (cx + np.cos(a) * 20, cy + np.sin(a) * 16)
        s.add(c.leaf((cx + np.cos(a) * 1.5, cy + np.sin(a) * 1.2), p1, 13.5, power=0.62, tip=2.4, base=0.6),
              tones=(2, 3, 3), shade=(2, 2), line="black")
    cal = star(c, cx - 1, cy - 1, 5, 3.5, 10.0, sx=1, sy=0.85, rot=-90 + 18)
    s.add(cal, tones=(1, 1, 2), shade=(2, 2), band=(1, 2))
    s.add(lead, tones=(1, 2, 2), shade=(2, 2), close=2)
    s.render()
    s.clean()
    return s.image()


BLOSSOM_ICON = [
    "................",
    "...00..00.......",
    "..0330033000....",
    "..0333333110....",
    ".003331333100...",
    "0333112333010.0.",
    "0333122330.0.020",
    ".033333330.00220",
    "..0333333001220.",
    "...0330330.0110.",
    "....00.00.0110..",
    "...000000.010...",
    "..0222220010....",
    "...00022201100..",
    "......0000110...",
    "..........00....",
]


# --------------------------------------------------------------------------- green chili

def calyx_cap(c, cx, cy, w, h, ang=-20, n=5):
    """A calyx seen from the side, tilted: a dome gripping the pod's
    shoulder with rounded sepal lobes hanging over it."""
    m = c.ellipse(cx, cy, w / 2, h / 2, ang)
    a0 = np.radians(ang)
    for k in range(n):
        a = np.radians(15 + 150 * k / (n - 1)) + a0
        m |= c.circle(cx + np.cos(a) * w * 0.42, cy + np.sin(a) * h * 0.55 + 0.6, w * 0.12)
    return m


def pod_path(pts, n=14):
    return spline(pts, n)


def green_front(f=0):
    s = Sprite(56, 56, GREEN)
    c = s.c
    sw = (0, 0.6, 1.2)[f]
    path = pod_path([(20 - sw * 0.5, 17 + sw * 0.4), (22, 29), (28, 41), (36.5, 48.5), (45, 49),
                     (50, 43.5 - sw * 0.3), (51 - sw * 0.2, 36 - sw * 0.6)])
    body = tapered(c, path, [(0, 14), (0.15, 15), (0.45, 12), (0.7, 8.5), (0.9, 4.5), (1, 2.6)])
    cap = calyx_cap(c, 19 - sw * 0.5, 15.5 + sw * 0.4, 16, 8, ang=-22)
    stem = c.curve([(20 - sw * 0.5, 11 + sw * 0.4), (21, 6), (26, 3.5), (30 + sw * 0.3, 5)], 3.6, 2.6)
    lead = c.leaf((16, 21), (4, 40 - sw * 0.5), 9.5, bend=2.0, tip=1.3)          # forearm braced forward
    rear = c.leaf((25, 15), (42, 9.5 - sw * 0.6), 8, bend=-1.4, tip=1.3)        # rear arm up behind
    s.add(rear, tones=(1, 2, 2), shade=(2, 2), close=2)
    s.add(body, tones=(1, 2, 3), shade=(4, 3), close=3)
    s.add(stem, tones=(1, 1, 3), shade=(2, 0))
    s.add(cap, tones=(1, 3, 3), shade=(2, 2))
    s.add(lead, tones=(1, 2, 2), shade=(2, 2), close=2, line="black")
    s.render()
    s.paint(lit_stripe(c, None, 15, 2.6, 0.08, 0.3, inset=3.4, width=2.0, path=path), 3, only=[2])
    selout(s, region=(c.Y < 36) & (c.X < 34))
    s.clean()
    return s.image()


def green_back():
    """From behind and above: the calyx star seen from the top at the
    upper right (toward the foe), the pod's back sweeping down out of frame
    and its tip curling up on the left."""
    s = Sprite(48, 48, GREEN, crop_bottom=True)
    c = s.c
    path = pod_path([(31, 17), (27, 31), (23, 49)])
    body = tapered(c, path, [(0, 22), (0.5, 26), (1, 27)])
    tpath = pod_path([(13, 49), (7.5, 42), (5, 33), (5.5, 26), (8.5, 22)])
    tail = tapered(c, tpath, [(0, 9), (0.5, 6.5), (0.85, 3.5), (1, 2.2)])
    cal = c.ellipse(31, 17, 7, 4.5) | star(c, 31, 17.5, 5, 6.0, 14.0, sy=0.62, rot=-90 + 12)
    stem = c.curve([(31.5, 15), (33, 8), (38, 4), (43, 5)], 4.4, 3.2)
    lead = c.leaf((36, 22), (47, 36), 9, bend=1.6, tip=1.3)
    s.add(body, tones=(1, 2, 3), shade=(5, 3), close=3)
    s.add(lead, tones=(1, 2, 2), shade=(2, 2), close=2)
    s.add(tail, tones=(1, 2, 3), shade=(2, 2))
    s.add(cal, tones=(1, 3, 3), shade=(2, 2))
    s.add(stem, tones=(1, 1, 3), shade=(2, 0))
    s.render()
    selout(s, region=(c.Y < 30) & (c.X < 30))
    s.clean()
    return s.image()


GREEN_ICON = [
    "......00........",
    "....00010000....",
    "...0333022110...",
    "..0333330110....",
    ".0333330100.....",
    "..0000220.......",
    ".02102320.......",
    "021102320....00.",
    "021022320...0220",
    "0110222220..0210",
    ".00.022222000210",
    "....022222222210",
    ".....0122222110.",
    "......00111110..",
    "........00000...",
    "................",
]


# --------------------------------------------------------------------------- red chili

def red_front(f=0):
    s = Sprite(56, 56, RED)
    c = s.c
    sw = (0, 0.6, 1.2)[f]
    path = pod_path([(17.5 - sw * 0.5, 16 + sw * 0.4), (19.5, 30), (27, 43), (37.5, 50), (47, 48.5),
                     (52.5, 41), (52, 31.5 - sw * 0.4), (47.5 - sw * 0.3, 26.5 - sw * 0.6), (43.5, 29.5 - sw * 0.5)])
    body = tapered(c, path, [(0, 19), (0.12, 21), (0.4, 16), (0.62, 11), (0.8, 7), (0.92, 4), (1, 2.4)])
    cap = calyx_cap(c, 16 - sw * 0.5, 13 + sw * 0.4, 21, 9.5, ang=-20)
    arm = c.leaf((12, 17), (3.5, 31 - sw * 0.6), 6.5, bend=1.5, tip=1.4)       # a long sepal claw
    stem = c.curve([(17 - sw * 0.5, 7.5 + sw * 0.4), (18.5, 3), (24, 1.2), (29 + sw * 0.4, 3.0)], 4.0, 2.8)
    s.add(body, tones=(1, 2, 3), shade=(5, 3), close=3)
    s.add(stem, tones=(1, 3, 3), shade=(2, 0))
    s.add(cap, tones=(1, 3, 3), shade=(2, 2))
    s.add(arm, tones=(1, 3, 3), shade=(2, 2))
    s.render()
    s.paint(lit_stripe(c, None, 21, 2.4, 0.05, 0.22, inset=4.4, width=2.2, path=path), 3, only=[2])
    # a crease where the shoulder dimples (real chili pods wrinkle there)
    for x, y in [(27, 22), (28, 23), (28, 24), (29, 25)]:
        if s.t[y, x] in (1, 2):
            s.px([(x, y)], 1)
    # ember drifting off the curled flame tip (motion cue)
    ex, ey = int(39 - sw), int(21 - sw * 1.5)
    s.rows(ex - 1, ey - 1, [".0.", "030", ".0."])
    selout(s, region=(c.Y < 34) & (c.X < 30))
    s.clean()
    return s.image()


def red_back():
    s = Sprite(48, 48, RED, crop_bottom=True)
    c = s.c
    path = pod_path([(31, 17), (27, 31), (24, 49)])
    body = tapered(c, path, [(0, 25), (0.5, 30), (1, 31)])
    tpath = pod_path([(12, 49), (6, 41), (3.5, 31), (4.5, 22), (8.5, 17)])
    tail = tapered(c, tpath, [(0, 10), (0.5, 7), (0.85, 3.8), (1, 2.2)])
    cal = c.ellipse(31, 17, 8, 5) | star(c, 31, 17.5, 5, 7.0, 16.0, sy=0.62, rot=-90 + 12)
    stem = c.curve([(31.5, 15), (33, 8), (38, 3.5), (44, 4.5)], 4.8, 3.4)
    s.add(body, tones=(1, 2, 3), shade=(5, 3), close=3)
    s.add(tail, tones=(1, 2, 3), shade=(2, 2))
    s.add(cal, tones=(1, 3, 3), shade=(2, 2))
    s.add(stem, tones=(1, 3, 3), shade=(2, 0))
    s.render()
    s.paint(lit_stripe(c, None, 25, 30, 0.12, 0.6, inset=5.0, width=2.4, path=path), 3, only=[2])
    selout(s, region=(c.Y < 30) & (c.X < 26))
    s.clean()
    return s.image()


RED_ICON = [
    "......00........",
    "...0003300......",
    "..03333330......",
    ".033333330......",
    ".0333333300.....",
    ".0000000...000..",
    ".02322210.02220.",
    ".02322210.00120.",
    "..0232220...0220",
    "..02222220..0220",
    "...02222220.0220",
    "....022222200220",
    ".....02222222210",
    "......0122221110",
    ".......0000000..",
    "................",
]


def make(id_):
    f, b, pal, ic = {
        "chili_blossom": (blossom_front, blossom_back, BLOSSOM, BLOSSOM_ICON),
        "green_chili": (green_front, green_back, GREEN, GREEN_ICON),
        "red_chili": (red_front, red_back, RED, RED_ICON),
    }[id_]
    i1 = icon(ic, pal)
    return {"front": f(0), "front__2": f(1), "front__3": f(2), "back": b(), "icon": i1, "icon__2": icon2(i1)}
