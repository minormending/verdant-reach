"""16x16 party icons, built small with the same kit, then hand-touched.

Frame 2 (icon__2) is a squash: the top drops 1px while the base stays put.
"""

import numpy as np
from PIL import Image
from px import Sprite, Canvas, star, blob, spline, bezier, lobed_leaf, saw_leaf, squash, bob


def finish(s, edits=None):
    s.render()
    if edits:
        for x0, y0, rows in edits:
            s.rows(x0, y0, rows)
    s.clean()
    return s.image()


def acorn(pal):
    s = Sprite(16, 16, pal)
    c = s.c
    s.add(c.ellipse(8, 10.5, 5.2, 5.6), tones=(1, 2, 3), shade=(2, 1))
    s.add(c.ellipse(8.2, 6.0, 6.8, 3.6), tones=(1, 1, 2), flat=True)
    s.add(c.stroke([(8.5, 3), (9, 1), (10.5, 0.8)], 1.8), tones=(1, 1, 1), flat=True, prune=False)
    return finish(s, [(5, 4, ["2.2.2"]), (4, 9, ["3"]), (4, 10, ["3"])])


def sapling(pal):
    s = Sprite(16, 16, pal)
    c = s.c
    s.add(c.stroke([(8, 15.6), (8, 6)], 3.2), tones=(1, 1, 1), flat=True)
    s.add(c.ellipse(3.5, 10.5, 3.2, 2.4, -15), tones=(1, 2, 3), shade=(1, 1))
    s.add(c.ellipse(12.5, 9.5, 3.0, 2.3, 15), tones=(1, 2, 2), shade=(1, 1))
    s.add(c.ellipse(3.0, 4.5, 3.0, 2.6, -25), tones=(1, 2, 3), shade=(1, 1))
    s.add(c.ellipse(13.0, 4.0, 3.0, 2.6, 25), tones=(1, 2, 2), shade=(1, 1))
    s.add(c.ellipse(8, 4.5, 4.4, 2.6), tones=(1, 1, 1), flat=True)
    return finish(s, [(6, 4, ["0.0.0"])])


def oak(pal):
    s = Sprite(16, 16, pal)
    c = s.c
    s.add(c.stroke([(8, 15.6), (8, 9)], 3.6), tones=(0, 1, 1), shade=(1, 0))
    s.add(c.ellipse(8, 6.5, 7.6, 5.8), tones=(1, 2, 3), shade=(2, 2), band=(1, 2))
    return finish(s, [(5, 14, ["0110110"])])


def blossom_c(pal):
    s = Sprite(16, 16, pal)
    c = s.c
    s.add(c.stroke(spline([(9, 7), (11, 3), (14, 2)]), 1.8), tones=(1, 1, 1), flat=True, prune=False)
    s.add(star(c, 7.5, 9.5, 5, 3.0, 7.2, sy=0.9, rot=-126), tones=(2, 3, 3), shade=(1, 1))
    return finish(s, [(7, 9, ["0"]), (6, 8, ["2"])])


def pod(pal, path, w0, cap_c, stem):
    s = Sprite(16, 16, pal)
    c = s.c
    s.add(c.stroke(spline(path), w0, 1.6), tones=(1, 2, 2), shade=(2, 1))
    s.add(c.ellipse(*cap_c), tones=pal_cap(pal), flat=True, line="black")
    s.add(c.stroke(spline(stem), 1.8), tones=pal_cap(pal), flat=True, prune=False)
    return s


def pal_cap(pal):
    return (3, 3, 3) if pal[1].lower() == "#e84020" else (1, 1, 1)


def green_c(pal):
    s = pod(pal, [(8, 4), (9, 9), (7, 13), (4, 15)], 6.4, (8, 4, 3.6, 1.8), [(8, 3), (9, 1), (11, 0.6)])
    return finish(s, [(6, 6, ["3"]), (6, 7, ["3"]), (6, 8, ["3"])])


def red_c(pal):
    s = pod(pal, [(10, 4), (12, 9), (8, 14), (3, 13), (2, 10)], 6.8, (10, 4, 3.8, 1.9), [(10, 3), (9, 1), (7, 0.6)])
    return finish(s, [(8, 6, ["3"]), (8, 7, ["3"])])


def seedpod(pal):
    s = Sprite(16, 16, pal)
    c = s.c
    s.add(blob(c, [(7, 2), (4, 6), (3, 11), (5, 15), (11, 15), (13, 11), (11, 5)]), tones=(1, 2, 3), shade=(2, 1))
    return finish(s, [(5, 6, ["3..."]), (4, 8, [".3.3"]), (6, 11, ["3.3"]), (9, 7, ["3"]), (7, 0, ["0"]), (2, 6, ["0"]),
                      (13, 7, ["0"]), (1, 10, ["0"]), (14, 11, ["0"])])


def pad(pal):
    s = Sprite(16, 16, pal)
    c = s.c
    s.add(c.ellipse(8, 11.5, 7.8, 4.0), tones=(1, 1, 1), flat=True)
    s.add(c.ellipse(8, 11.8, 6.6, 2.8), tones=(1, 2, 2), flat=True, line="black")
    s.add(blob(c, [(8, 3), (6, 6), (6, 10), (10, 10), (10, 6)]), tones=(0, 1, 1), shade=(1, 1))
    return finish(s, [(7, 6, ["3"]), (8, 8, ["3"])])


def waterlily(pal):
    s = Sprite(16, 16, pal)
    c = s.c
    s.add(c.ellipse(8, 13.5, 7.8, 2.4), tones=(2, 2, 2), flat=True)
    for a, L in ((-90, 8), (-50, 7.5), (-130, 7.5), (-15, 7), (-165, 7)):
        r = np.radians(a)
        s.add(c.leaf((8, 11), (8 + np.cos(r) * L, 11 + np.sin(r) * L), 4.2, power=0.6, tip=1.6), tones=(2, 3, 3), shade=(1, 1))
    s.add(c.leaf((8, 11), (8, 5), 4.0, power=0.6, tip=1.6), tones=(2, 2, 3), shade=(1, 1))
    for a in (15, 165, 60, 120):
        r = np.radians(a)
        s.add(c.leaf((8, 10.5), (8 + np.cos(r) * 7, 10.5 + np.sin(r) * 3.5), 4.0, power=0.6, tip=1.6), tones=(2, 3, 3), shade=(1, 1))
    return finish(s)


def dbud(pal):
    s = Sprite(16, 16, pal)
    c = s.c
    s.add(saw_leaf(c, (8, 15), (1, 11), 5, lobes=2), tones=(1, 2, 2), flat=True)
    s.add(saw_leaf(c, (8, 15), (15, 12), 5, lobes=2), tones=(1, 2, 2), flat=True)
    s.add(c.stroke([(8, 15), (7.5, 8)], 1.8), tones=(1, 1, 1), flat=True, prune=False)
    s.add(c.ellipse(7, 5, 2.6, 3.8, -15), tones=(1, 2, 2), shade=(1, 1))
    return finish(s, [(6, 1, ["33"])])


def lion(pal):
    s = Sprite(16, 16, pal)
    c = s.c
    s.add(c.stroke([(8, 15.6), (8, 9)], 2.0), tones=(1, 1, 1), flat=True, prune=False)
    s.add(saw_leaf(c, (8, 15), (1, 12), 5, lobes=2), tones=(1, 1, 1), flat=True)
    s.add(saw_leaf(c, (8, 15), (15, 12), 5, lobes=2), tones=(1, 1, 1), flat=True)
    s.add(star(c, 7.5, 6, 9, 5.4, 7.4, sy=0.78, rot=-10), tones=(1, 2, 2), shade=(0, 1))
    return finish(s, [(5, 4, ["33", "3"])])


def clock(pal):
    s = Sprite(16, 16, pal)
    c = s.c
    s.add(c.stroke([(8.5, 15.6), (8.5, 11)], 2.0), tones=(1, 1, 1), flat=True, prune=False)
    s.add(star(c, 8.5, 6.5, 10, 5.6, 6.9), tones=(2, 3, 3), shade=(2, 2))
    return finish(s, [(8, 6, ["1"])])


def bblossom(pal):
    s = Sprite(16, 16, pal)
    c = s.c
    for k in (2, 3, 1, 4, 0):
        a = np.radians(-54 + 72 * k)
        s.add(c.leaf((7.5, 8.5), (7.5 + np.cos(a) * 7.2, 8.5 + np.sin(a) * 6.6), 6.2, power=0.55, tip=0.45, base=1.4),
              tones=(2, 3, 3), shade=(1, 1))
    return finish(s, [(6, 7, ["11", "11"])])


def berry(pal, crook, bx, by, rx, ry, glint):
    s = Sprite(16, 16, pal)
    c = s.c
    s.add(c.stroke(spline(crook), 2.2), tones=(1, 1, 1), flat=True, prune=False)
    s.add(c.ellipse(bx, by, rx, ry), tones=(1, 1, 1), flat=True)
    s.render()
    for y in range(int(by - ry) + 1, int(by + ry), 2):
        for x in range(int(bx - rx) + 1 + (y // 2) % 2, int(bx + rx), 2):
            if s.t[y, x] == 1:
                s.t[y, x] = 2
                s.protect[y, x] = True
    if glint:
        s.px([glint], 3)
    s.clean()
    return s.image()


def seedling(pal):
    s = Sprite(16, 16, pal)
    c = s.c
    s.add(c.stroke([(8, 15.6), (8, 9)], 2.4), tones=(1, 2, 2), flat=True)
    s.add(c.leaf((7.5, 9), (0.5, 5.5), 5.5, power=0.6, tip=0.7, base=1.3), tones=(1, 2, 3), shade=(1, 1))
    s.add(c.leaf((8.5, 9), (15.5, 6), 5.5, power=0.6, tip=0.7, base=1.3), tones=(1, 2, 2), shade=(1, 1))
    return finish(s, [(0, 4, ["00", "00"])])


def sbud(pal):
    s = Sprite(16, 16, pal)
    c = s.c
    s.add(c.stroke([(8.5, 15.6), (8, 7)], 2.4), tones=(1, 2, 2), flat=True)
    s.add(c.leaf((8, 12), (1, 11), 5, power=0.6, tip=1.3), tones=(1, 2, 2), shade=(1, 1))
    s.add(c.leaf((9, 10), (15, 8), 4.6, power=0.6, tip=1.3), tones=(1, 2, 2), shade=(1, 1))
    s.add(star(c, 7.5, 5, 7, 3.4, 5.4, rot=-90), tones=(1, 1, 1), flat=True)
    s.add(c.ellipse(7.5, 5, 3.2, 2.8), tones=(1, 2, 2), shade=(1, 1))
    return finish(s, [(6, 1, ["3.3"])])


def sun(pal):
    s = Sprite(16, 16, pal)
    c = s.c
    s.add(c.stroke([(9, 15.6), (9, 10)], 2.4), tones=(3, 3, 3), flat=True)
    s.add(c.leaf((9, 13), (15, 11), 4.4, power=0.6, tip=1.3), tones=(3, 3, 3), flat=True)
    s.add(star(c, 7.5, 6.5, 10, 4.6, 7.4, sx=0.85, rot=-8), tones=(1, 2, 2), shade=(1, 1))
    s.add(c.ellipse(7.2, 6.5, 2.8, 3.2), tones=(0, 1, 1), shade=(1, 1), line="black")
    return finish(s)


def make(kind, pal):
    i1 = kind(pal)
    return i1, squash(i1, row=8)


def from_front(front, size=14, black_keep=0.55, cov=0.45, anchor="bottom"):
    """Miniature of the front sprite: crop, block-sample to `size` px on the
    long side (mode of the body colours, black only where it dominates the
    block), then a fresh 1px outline. Hand edits go on top."""
    a = np.asarray(front)
    ys, xs = np.nonzero(a[..., 3])
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = a.shape[:2]
    k = max(h, w) / size
    th, tw = max(1, round(h / k)), max(1, round(w / k))
    out = np.zeros((16, 16, 4), np.uint8)
    blk = (24, 24, 24)
    body = np.zeros((th, tw), bool)
    small = np.zeros((th, tw, 4), np.uint8)
    for j in range(th):
        for i in range(tw):
            y0, y1 = int(j * h / th), max(int(j * h / th) + 1, int((j + 1) * h / th))
            x0, x1 = int(i * w / tw), max(int(i * w / tw) + 1, int((i + 1) * w / tw))
            b = a[y0:y1, x0:x1].reshape(-1, 4)
            op = b[b[:, 3] > 0]
            if len(op) < cov * len(b):
                continue
            cols = {}
            nblack = 0
            for p in op:
                t = tuple(p[:3])
                if t == blk:
                    nblack += 1
                    continue
                cols[t] = cols.get(t, 0) + 1
            if not cols or nblack > black_keep * len(b):
                small[j, i] = blk + (255,)
            else:
                small[j, i] = max(cols, key=cols.get) + (255,)
            body[j, i] = True
    oy = 16 - th - 1 if anchor == "bottom" else (16 - th) // 2
    ox = (16 - tw) // 2
    oy = max(0, oy)
    out[oy:oy + th, ox:ox + tw] = small
    sil = out[..., 3] > 0
    ring = np.zeros_like(sil)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ring |= np.roll(np.roll(sil, dy, 0), dx, 1)
    ring &= ~sil
    out[ring] = blk + (255,)
    return Image.fromarray(out, "RGBA")


# per-species icon settings: miniature size, hand edits (x, y, rows), squash row
CFG = {}


def icon_for(id_, front):
    cfg = CFG.get(id_, {})
    im = from_front(front, size=cfg.get("size", 14), cov=cfg.get("cov", 0.45))
    a = np.asarray(im).copy()
    pal = {}
    for p in a.reshape(-1, 4):
        if p[3]:
            pal[tuple(p[:3])] = True
    cols = sorted(pal, key=lambda c: sum(int(v) for v in c))   # 0 darkest .. 3 lightest
    for x0, y0, rows in cfg.get("edits", []):
        for j, r in enumerate(rows):
            for i, ch in enumerate(r):
                if ch in ". ":
                    continue
                x, y = x0 + i, y0 + j
                if ch == "_":
                    a[y, x] = 0
                else:
                    a[y, x] = cols[int(ch)] + (255,)
    i1 = Image.fromarray(a, "RGBA")
    return i1, squash(i1, cfg.get("squash", 8))
