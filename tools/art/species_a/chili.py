"""Chili line: chili_blossom -> green_chili -> red_chili.

Signature feature: the green star calyx. The blossom's calyx becomes the
pod's cap; the pod itself grows from a candle-flame into a curling flame.
"""

import numpy as np
from px import Sprite, icon_rows, squash, bob, bezier, lit_stripe, spline, star

import icons
IDS = ["chili_blossom", "green_chili", "red_chili"]

BLOSSOM = ["#286830", "#a0d070", "#f8f8f0"]        # calyx green, petal shade, white
GREEN = ["#205828", "#60b038", "#d0f080"]          # deep green, pod green, pale lime
RED = ["#901828", "#e84020", "#d8f078"]            # wine shade, flame red, lime (calyx + glint)


def calyx(c, cx, cy, w, h, n=4):
    """Chili calyx from the side: a dome gripping the shoulder with rounded
    sepal lobes hanging over the pod."""
    m = c.ellipse(cx, cy, w / 2, h / 2)
    for k in range(n):
        a = np.radians(20 + 140 * k / (n - 1))
        m |= c.circle(cx + np.cos(a) * w * 0.4, cy + np.sin(a) * h * 0.5 + 0.8, w * 0.12)
    return m


def calyx_seams(s, c, cx, cy, w, h, tone, over):
    for a in (-50, -90, -130):
        r = np.radians(a)
        for k in np.arange(2.0, 6.0, 0.5):
            x, y = int(cx + np.cos(r) * k * w / 14), int(cy - 1 + np.sin(r) * -k * h / 9)
            if s.t[y, x] in over:
                s.px([(x, y)], tone)


def blossom_front():
    s = Sprite(56, 56, BLOSSOM)
    c = s.c
    cx, cy = 23, 37
    stem = c.curve([(32, 28), (37, 18), (44, 12), (50, 13), (52, 18)], 4.0, 2.8)
    leaf = c.leaf((41, 15), (55, 29), 11, bend=-2.2, tip=1.4)
    sep = star(c, 31, 29, 5, 2.5, 8.0, sy=0.9, rot=-60)
    s.add(leaf, tones=(1, 2, 2), shade=(2, 2), close=2)
    s.add(stem, tones=(1, 1, 1), flat=True)
    s.add(sep, tones=(1, 1, 2), shade=(2, 2))
    order = [3, 2, 4, 1, 0]  # far petals first
    for k in order:
        a = np.radians(-126 + 72 * k)
        p1 = (cx + np.cos(a) * 20, cy + np.sin(a) * 16.5)
        p0 = (cx + np.cos(a) * 1.5, cy + np.sin(a) * 1.2)
        m = c.leaf(p0, p1, 13.0, bend=1.6, power=0.62, tip=2.2, base=0.6)
        s.add(m, tones=(2, 3, 3), shade=(2, 2), line="black")
    s.render()
    # flower eye: a dark-green throat ringed with black anthers, pale pistil
    s.paint(c.circle(cx - 0.5, cy - 0.5, 4.0), 2, only=[2, 3, 0])
    s.paint(c.circle(cx - 0.5, cy - 0.5, 2.6), 1)
    for k in range(5):
        a = np.radians(-126 + 36 + 72 * k)
        x, y = int(round(cx - 0.5 + np.cos(a) * 3.5)), int(round(cy - 0.5 + np.sin(a) * 3.2))
        s.px([(x, y)], 0)
    s.px([(int(cx) - 1, int(cy) - 1)], 3)
    for x, y in [(43, 17), (44, 19), (45, 20), (46, 22), (47, 23), (48, 25), (49, 26)]:
        if s.t[y, x] > 0:
            s.px([(x, y)], 1)
    s.clean()
    return s.image()


GREEN_PATH = spline([(29, 15), (32, 26), (31, 38), (27, 47), (21, 53), (17, 52)])
RED_PATH = spline([(38, 14), (44, 25), (42, 38), (33, 48), (21, 51), (11, 46), (7, 38), (8, 32)])


def green_front():
    s = Sprite(56, 56, GREEN)
    c = s.c
    body = c.stroke(GREEN_PATH, 18, 2.4) | c.ellipse(29, 17, 9, 5)
    cap = calyx(c, 29, 13, 19, 8)
    stem = c.curve([(30, 10), (31, 4), (27, 1.5), (22, 3)], 3.6, 2.6)
    s.add(body, tones=(1, 2, 2), dark=0.14, round=7)
    s.add(stem, tones=(1, 1, 2), dark=0.0)
    s.add(cap, tones=(1, 1, 2), dark=0.3, round=3, line="black")
    s.render()
    s.paint(lit_stripe(c, None, 18, 2.4, 0.08, 0.45, inset=3.4, width=2.2, path=GREEN_PATH), 3, only=[2])
    s.clean()
    return s.image()


def red_front():
    s = Sprite(56, 56, RED)
    c = s.c
    body = c.stroke(RED_PATH, 22, 2.2) | c.ellipse(38, 16, 11, 6)
    cap = calyx(c, 38, 12, 22, 9)
    stem = c.curve([(39, 9), (38, 3), (33, 1.5), (29, 3.5)], 4.0, 2.8)
    s.add(body, tones=(1, 2, 2), dark=0.12, round=8)
    s.add(stem, tones=(1, 3, 3), dark=0.12)
    s.add(cap, tones=(1, 3, 3), dark=0.2, round=3, line="black")
    s.render()
    s.paint(lit_stripe(c, None, 22, 2.2, 0.06, 0.3, inset=3.8, width=2.4, path=RED_PATH), 3, only=[2])
    s.clean()
    return s.image()


def blossom_back():
    """The flower from behind: white petal backs around the green star of
    the calyx, the stem rising out of it and curling away."""
    s = Sprite(48, 48, BLOSSOM, crop_bottom=True)
    c = s.c
    cx, cy = 22, 33
    stem = c.curve([(cx + 1, cy - 2), (27, 20), (34, 11), (41, 10), (43, 15)], 4.0, 3.0)
    leaf = c.leaf((33, 13), (46, 26), 11, bend=2.0, tip=1.4)
    for k in (0, 4, 1, 3, 2):
        a = np.radians(-100 + 72 * k)
        p1 = (cx + np.cos(a) * 21, cy + np.sin(a) * 15)
        s.add(c.leaf((cx + np.cos(a) * 1.5, cy + np.sin(a) * 1.2), p1, 13.5, power=0.65, tip=2.4, base=0.6),
              tones=(2, 3, 3), shade=(2, 2), line="black")
    cal = star(c, cx, cy, 5, 3.5, 10.5, sx=1, sy=0.8, rot=-90 + 36)
    s.add(cal, tones=(1, 1, 2), shade=(2, 2), band=(1, 2))
    s.add(leaf, tones=(1, 2, 2), shade=(2, 2))
    s.add(stem, tones=(1, 1, 2), shade=(2, 0), band=(1, 2))
    s.render()
    s.clean()
    return s.image()


def pod_back(pal, path, w0, w1, cap_w, cap_h, cap_tones, body_tones, stem_ctrl):
    """A chili from behind and above: the calyx star seen from the top, the
    stem rising from its middle, the pod running down out of frame."""
    s = Sprite(48, 48, pal, crop_bottom=True)
    c = s.c
    cx, cy = path[0]
    body = c.stroke(path, w0, w1) & (c.Y > cy - 2)
    body |= c.ellipse(cx, cy + 3, w0 / 2, w0 / 2 * 0.6)
    cal = c.ellipse(cx, cy, cap_w / 2, cap_w / 2 * cap_h)
    for k in range(5):
        a = np.radians(15 + 150 * k / 4)
        cal |= c.circle(cx + np.cos(a) * cap_w * 0.42, cy + np.sin(a) * cap_w * 0.42 * cap_h + 1.5, cap_w * 0.13)
    stem = c.curve(stem_ctrl, 4.4, 3.2)
    s.add(body, tones=body_tones, shade=(4, 2), band=(2, 4, c.Y > cy + 4))
    s.add(cal, tones=cap_tones, shade=(2, 2), band=(1, 2, c.X < cx), line="black")
    s.add(stem, tones=cap_tones, shade=(2, 0))
    s.render()
    s.clean()
    return s


def green_back():
    path = spline([(24, 17), (25, 28), (23, 39), (20, 50)])
    s = pod_back(GREEN, path, 24, 17, 25, 0.5, (1, 1, 2), (1, 2, 3),
                 [(24, 17), (25, 8), (29, 3), (33, 4.5)])
    return s.image()


def red_back():
    path = spline([(22, 17), (26, 28), (30, 39), (35, 52)])
    s = pod_back(RED, path, 28, 21, 29, 0.5, (1, 3, 3), (1, 2, 3),
                 [(22, 17), (21, 8), (17, 3), (13, 4.5)])
    return s.image()


EMPTY_ICON = ["................"] * 16


def make(id_):
    import icons
    f, b, pal, ic = {
        "chili_blossom": (blossom_front, blossom_back, BLOSSOM, icons.blossom_c),
        "green_chili": (green_front, green_back, GREEN, icons.green_c),
        "red_chili": (red_front, red_back, RED, icons.red_c),
    }[id_]
    front = f()
    i1, i2 = icons.icon_for(id_, front)
    return {"front": front, "back": b(), "icon": i1, "icon__2": i2}
