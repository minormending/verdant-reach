"""Lily line (Victoria amazonica): lily_seedpod -> lily_pad -> giant_water_lily.

Signature feature: the spiny maroon bud and the upturned red rim. The
seedpod is the bud; the pad carries the bud at its heart inside the rim;
the giant lily is that bud opened, sitting on its rimmed pad.
"""

import numpy as np
from px import Sprite, icon_rows, squash, bob, bezier, spline, shift, blob

import icons
IDS = ["lily_seedpod", "lily_pad", "giant_water_lily"]

POD = ["#582040", "#b04860", "#f8d8a8"]            # maroon shade, rose, cream spines
PAD = ["#782848", "#70b040", "#d8f098"]            # maroon rim, pad green, pale vein
LILY = ["#285838", "#e88cb0", "#f8f8f8"]           # pad green shade, pink, white


def spikes(s: Sprite, cx, cy, every=3, length=2, ymax=None, phase=0):
    """Spines poking out of the silhouette: short black rays along the
    outward direction (from (cx, cy)) at every n-th outline pixel."""
    t = s.t
    sil = t >= 0
    ys, xs = np.nonzero(t == 0)
    pts = sorted(zip(ys, xs), key=lambda p: np.arctan2(p[0] - cy, p[1] - cx))
    out = []
    for k, (y, x) in enumerate(pts):
        if (k + phase) % every or (ymax is not None and y > ymax):
            continue
        d = np.array([x - cx, y - cy], float)
        d /= np.linalg.norm(d) + 1e-9
        ray = []
        ok = True
        for r in range(1, length + 1):
            xx, yy = int(round(x + d[0] * r)), int(round(y + d[1] * r))
            if not (0 <= xx < s.w and 0 <= yy < s.h) or sil[yy, xx]:
                ok = False
                break
            ray.append((xx, yy))
        if ok and ray:
            out += ray
    s.px(out, 0)


def pod_front():
    s = Sprite(56, 56, POD)
    c = s.c
    bud = blob(c, [(17, 8), (17, 14), (13, 24), (12, 36), (15, 47), (22, 52), (36, 52), (43, 46), (44, 33), (40, 21), (31, 14), (23, 12)])
    sepL = c.leaf((24, 48), (4, 50), 10, bend=3.0, tip=1.6)
    sepR = c.leaf((33, 48), (52, 50), 10, bend=-3.0, tip=1.6)
    s.add(sepR, tones=(1, 1, 2), shade=(2, 2))
    s.add(sepL, tones=(1, 2, 2), shade=(2, 2))
    s.add(bud, tones=(1, 2, 3), shade=(5, 3), band=(3, 5, (c.Y > 20) & (c.Y < 40)), cast=2)
    s.render()
    # meridian ribs from the tip give the dome its volume
    for ctrl in ([(19, 13), (15, 28), (17, 48)], [(21, 14), (24, 31), (27, 50)], [(24, 14), (34, 29), (38, 48)]):
        for x, y in bezier(ctrl, 50):
            x, y = int(x), int(y)
            if s.t[y, x] in (2, 3):
                s.px([(x, y)], 1, protect=False)
    spikes(s, 28, 36, every=3, length=2, ymax=47)
    s.clean()
    return s.image()


def pad_front():
    s = Sprite(56, 56, PAD)
    c = s.c
    wall = c.ellipse(28, 43.0, 27.5, 12.0)
    top = c.ellipse(28, 44.0, 25.0, 9.6)
    bud = blob(c, [(25, 17), (19, 25), (18, 35), (22, 42), (33, 42), (37, 35), (35, 25), (30, 19)])
    s.add(wall, tones=(1, 1, 1), flat=True)
    s.add(top, tones=(1, 2, 2), shade=(0, -2), line="black")
    s.add(bud, tones=(0, 1, 3), shade=(3, 2), band=(2, 3, (c.Y < 30) & (c.X < 26)))
    s.render()
    # pale lip along the rim's top edge; ribs on the near outer wall
    lip = c.ellipse(28, 43.0, 27.0, 11.5) & ~c.ellipse(28, 43.6, 27.0, 11.5)
    s.paint(lip & (c.Y < 40) & (s.owner == 0), 3, only=[1])
    for x in range(4, 54, 3):
        col = [y for y in range(46, 56) if s.t[y, x] == 1 and s.owner[y, x] == 0]
        if len(col) >= 2:
            s.px([(x, col[0])], 0)
    # pale veins radiating from the bud across the leaf
    for k in range(11):
        a = np.radians(195 - 21 * k)
        for r in np.arange(8, 26, 0.4):
            x, y = int(28 + np.cos(a) * r), int(44 - np.sin(a) * r * 0.39)
            if 0 <= x < 56 and s.t[y, x] == 2:
                s.px([(x, y)], 3, protect=False)
    for ctrl in ([(25, 19), (21, 30), (23, 41)], [(26, 19), (30, 30), (31, 41)]):
        for x, y in bezier(ctrl, 30):
            x, y = int(x), int(y)
            if s.owner[y, x] == 2 and s.t[y, x] == 1:
                s.px([(x, y)], 0, protect=False)
    spikes(s, 27, 32, every=3, length=2, ymax=36)
    s.clean()
    return s.image()


def lily_front():
    s = Sprite(56, 56, LILY)
    c = s.c
    cx, cy = 28, 43
    wall = c.ellipse(28, 49.5, 27.5, 6.0)
    top = c.ellipse(28, 48.0, 25.5, 4.6)
    s.add(wall, tones=(2, 2, 2), flat=True)
    s.add(top, tones=(1, 1, 1), flat=True, line="black")

    def petal(a, L, w, sy=1.0, tones=(2, 3, 3), base=(cx, cy)):
        r = np.radians(a)
        p1 = (base[0] + np.cos(r) * L, base[1] + np.sin(r) * L * sy)
        s.add(c.leaf(base, p1, w, power=0.62, tip=1.7), tones=tones, dark=0.1, round=4)

    for a, L in ((-90, 30), (-62, 29), (-118, 29), (-36, 27), (-144, 27), (-12, 26), (-168, 26)):
        petal(a, L, 13)
    for a, L in ((-90, 20), (-70, 19), (-110, 19)):
        petal(a, L, 10, tones=(2, 2, 3), base=(cx, cy - 2))
    for a, L in ((12, 25), (168, 25), (40, 18), (140, 18)):
        petal(a, L, 12, sy=0.45)
    s.render()
    s.clean()
    return s.image()


def pod_back():
    """The bud from behind and a little above: the spiny dome fills the
    frame, the sepals spread at its foot, cropped at the waterline."""
    s = Sprite(48, 48, POD, crop_bottom=True)
    c = s.c
    bud = blob(c, [(25, 6), (16, 13), (9, 26), (9, 40), (12, 48), (38, 48), (41, 38), (39, 24), (33, 11)])
    sepL = c.leaf((14, 44), (0, 47), 10, bend=1.0, tip=1.6)
    sepR = c.leaf((34, 44), (48, 47), 10, bend=-1.0, tip=1.6)
    s.add(sepL, tones=(1, 2, 2), shade=(2, 2))
    s.add(sepR, tones=(1, 1, 2), shade=(2, 2))
    s.add(bud, tones=(1, 2, 3), shade=(6, 3), band=(3, 5, (c.Y > 12) & (c.Y < 30)), cast=2)
    s.render()
    for ctrl in ([(25, 8), (13, 26), (13, 47)], [(25, 8), (22, 28), (21, 47)], [(25, 8), (31, 28), (31, 47)]):
        for x, y in bezier(ctrl, 50):
            x, y = int(x), int(y)
            if s.t[y, x] in (2, 3):
                s.px([(x, y)], 1, protect=False)
    spikes(s, 25, 30, every=3, length=2, ymax=40)
    s.clean()
    return s.image()


def pad_back():
    """From behind and above: more of the pad's surface, the rim's inner face
    all round, the bud seen from behind in the middle."""
    s = Sprite(48, 48, PAD, crop_bottom=True)
    c = s.c
    wall = c.ellipse(24, 37, 25.5, 14.5)
    top = c.ellipse(24, 38, 23.5, 12.6)
    bud = blob(c, [(23, 12), (17, 19), (16, 30), (20, 37), (29, 37), (32, 30), (30, 19), (26, 14)])
    s.add(wall, tones=(1, 1, 1), flat=True)
    s.add(top, tones=(1, 2, 2), shade=(0, -2), line="black")
    s.add(bud, tones=(0, 1, 3), shade=(3, 2), band=(2, 3, (c.Y < 26) & (c.X < 22)))
    s.render()
    lip = c.ellipse(24, 37, 25.0, 14.0) & ~c.ellipse(24, 37.6, 25.0, 14.0)
    s.paint(lip & (c.Y < 34) & (s.owner == 0), 3, only=[1])
    for k in range(13):
        a = np.radians(200 - 18.5 * k)
        for r in np.arange(8, 25, 0.4):
            x, y = int(24 + np.cos(a) * r), int(38 - np.sin(a) * r * 0.53)
            if 0 <= x < 48 and 0 <= y < 48 and s.t[y, x] == 2:
                s.px([(x, y)], 3, protect=False)
    for ctrl in ([(23, 14), (19, 25), (21, 36)], [(24, 14), (28, 25), (28, 36)]):
        for x, y in bezier(ctrl, 30):
            x, y = int(x), int(y)
            if s.owner[y, x] == 2 and s.t[y, x] == 1:
                s.px([(x, y)], 0, protect=False)
    spikes(s, 24, 27, every=3, length=2, ymax=30)
    s.clean()
    return s.image()


def lily_back():
    """The flower from behind and above: the outer petals' backs splayed
    over the pad, the pink cone opening at the centre."""
    s = Sprite(48, 48, LILY, crop_bottom=True)
    c = s.c
    cx, cy = 24, 30
    wall = c.ellipse(24, 40, 26, 10)
    top = c.ellipse(24, 39, 24.5, 8.6)
    s.add(wall, tones=(2, 2, 2), flat=True)
    s.add(top, tones=(1, 1, 1), flat=True, line="black")

    def petal(a, L, w, sy=1.0, tones=(2, 3, 3), base=(cx, cy)):
        r = np.radians(a)
        p1 = (base[0] + np.cos(r) * L, base[1] + np.sin(r) * L * sy)
        s.add(c.leaf(base, p1, w, power=0.62, tip=1.7), tones=tones, shade=(2, 2))

    for a in (-90, -55, -125, -20, -160):
        petal(a, 23, 13, sy=0.8)
    for a in (-90, -50, -130, -10, -170):
        petal(a + 20, 13, 9, sy=0.7, tones=(2, 2, 3), base=(cx, cy - 1))
    for a in (15, 165, 50, 130, 90):
        petal(a, 24, 13, sy=0.6)
    s.render()
    s.clean()
    return s.image()




def make(id_):
    f, b, pal = {
        "lily_seedpod": (pod_front, pod_back, POD),
        "lily_pad": (pad_front, pad_back, PAD),
        "giant_water_lily": (lily_front, lily_back, LILY),
    }[id_]
    front = f()
    i1, i2 = icons.icon_for(id_, lambda: icons.plain(f), pal)
    return {"front": front, "back": b(), "icon": i1, "icon__2": i2}
