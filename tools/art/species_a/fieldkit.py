"""Shared kit for the field lines (dandelion, bramble, sunflower, pumpkin).

Builds on px.py (shape parts, dome/crescent lighting, 1px #181818 outline)
and adds what the round-3 creature pass needs:

- selout(): the lit (top-left) outline softens to the dark tone where it
  runs along light body pixels, so the silhouette stays crisp on the shadow
  side and glows on the lit side;
- frames(): renders a front at idle phases and registers them on ONE shared
  bottom-centre offset (front, front__2[, front__3] ping-pong in battle);
- icon(): 16x16 ASCII icons (0 outline, 1 dark, 2 mid, 3 light) with a
  derived or hand-drawn second frame.
"""

from __future__ import annotations

import numpy as np
from PIL import Image

from px import Sprite, icon_rows, snap, K  # noqa: F401  (re-exported for the line modules)


def selout(s: Sprite, light=(2, 3), to=1, min_run=2, frac=0.25):
    """CREATURES.md §2: on the lit top-left of the silhouette, outline pixels
    facing the background (up or left) over a lit body tone take the dark
    tone. Capped at `frac` of the outline, most top-left first; only runs of
    >= min_run change (no lone dots)."""
    from scipy import ndimage
    t = s.t
    h, w = t.shape
    total = int((t == 0).sum())
    cand = []
    for y in range(h):
        for x in range(w):
            if t[y, x] != 0:
                continue
            up = y == 0 or t[y - 1, x] < 0
            lf = x == 0 or t[y, x - 1] < 0
            dn = y + 1 < h and t[y + 1, x] in light
            rt = x + 1 < w and t[y, x + 1] in light
            dnb = y + 1 >= h or t[y + 1, x] < 0
            rtb = x + 1 >= w or t[y, x + 1] < 0
            if ((up and dn) or (lf and rt)) and not dnb and not rtb:
                cand.append((x + y * 1.1, x, y))
    cand.sort()
    m = np.zeros((h, w), bool)
    for _, x, y in cand[: int(total * frac)]:
        m[y, x] = True
    lab, k = ndimage.label(m, np.ones((3, 3), bool))
    for j in range(1, k + 1):
        mm = lab == j
        if mm.sum() >= min_run:
            t[mm] = to
    return s


def finish(s: Sprite, sel=True, light=(2, 3), to=1) -> Image.Image:
    if sel and to is not None:
        selout(s, light=light, to=to)
    return image(s)


def image(s: Sprite) -> Image.Image:
    """Like Sprite.image(), but the final orphan sweep keeps protected
    (hand-placed) pixels: stamen flecks, glints, seeds."""
    s.clean(force=False)
    s.clean(force=True)     # no orphans at all (hand details are drawn as 2px+ clusters)
    a = np.zeros((s.h, s.w, 4), np.uint8)
    for k in range(4):
        a[s.t == k] = s.pal[k] + (255,)
    return Image.fromarray(a, "RGBA")


def register(frames, size=56, dx=0):
    """Bottom-centre a list of frames with one shared offset (union bbox)."""
    boxes = [f.getbbox() for f in frames]
    x0 = min(b[0] for b in boxes)
    x1 = max(b[2] for b in boxes)
    y1 = max(b[3] for b in boxes)
    ox = (size - (x1 - x0)) // 2 - x0 + dx
    oy = size - y1
    out = []
    for f in frames:
        im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        im.paste(f, (ox, oy), f)
        out.append(im)
    return out


def icon(rows, pal, rows2=None, squash_row=None):
    from px import squash
    i1 = icon_rows(rows, pal)
    if rows2 == "bob":
        a = np.asarray(i1)
        b = np.zeros_like(a)
        b[1:] = a[:-1]
        return i1, Image.fromarray(b, "RGBA")
    if rows2 is not None:
        return i1, icon_rows(rows2, pal)
    if squash_row is None:
        ys = np.nonzero(np.asarray(i1)[..., 3].any(1))[0]
        squash_row = ys[0] + max(1, (ys[-1] - ys[0]) // 3)
    return i1, squash(i1, squash_row)


def silhouette(im: Image.Image) -> Image.Image:
    a = np.asarray(im).copy()
    a[a[..., 3] > 0, :3] = 24
    return Image.fromarray(a, "RGBA")


def contact(s: Sprite, x0, x1):
    """Weighted contact line: thicken the ground outline to 2px over x0..x1."""
    t = s.t
    for x in range(x0, x1 + 1):
        ys = np.nonzero(t[:, x] >= 0)[0]
        if not len(ys):
            continue
        y = ys.max()
        if t[y, x] == 0 and y > 0 and t[y - 1, x] > 0:
            s.px([(x, y - 1)], 0)


def rays(s: Sprite, cx, cy, n, r0, r1, sx=1.0, sy=1.0, rot=0.0, lit=3, dark=1, over=(2,), skip=0.25, n_pts=6):
    """Short radial dashes inside a head (florets / pappus): lit on the
    top-left half, dark on the bottom-right, none across the terminator."""
    for k in range(n):
        a = np.radians(rot) + 2 * np.pi * k / n
        u = np.cos(a - np.radians(225))
        if abs(u) < skip:
            continue
        tone = lit if u > 0 else dark
        for r in np.linspace(r0, r1, n_pts):
            x, y = int(round(cx + np.cos(a) * r * sx)), int(round(cy + np.sin(a) * r * sy))
            if 0 <= x < s.w and 0 <= y < s.h and s.t[y, x] in over:
                s.px([(x, y)], tone)


def icon_frames(fn, pal, mode="sway"):
    """Two 16x16 icon frames from a draw function fn(f) -> Sprite (f = 0/1):
    full black outline (no selout), deorphaned. mode 'squash' instead
    derives frame 2 by dropping one upper row."""
    if True:
        a = fn(0)
        a.clean()
        i1 = image(a)
        if mode == "squash":
            from px import squash
            ys = np.nonzero(np.asarray(i1)[..., 3].any(1))[0]
            return i1, squash(i1, ys[0] + max(1, (ys[-1] - ys[0]) // 3))
        if mode == "hop":
            arr = np.asarray(i1)
            out = np.zeros_like(arr)
            out[:-1] = arr[1:]
            return i1, Image.fromarray(out, "RGBA")
        b = fn(1)
        b.clean()
        return i1, image(b)


def auto_rows(rows):
    """Fill-only ASCII (1-3 fills, explicit 0 seams, '.' clear) -> rows with a
    1px 4-connected #181818 ring added round the silhouette."""
    h = len(rows)
    g = [list(r.ljust(16, ".")) for r in rows]
    out = [r[:] for r in g]
    for y in range(h):
        for x in range(16):
            if g[y][x] != ".":
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                xx, yy = x + dx, y + dy
                if 0 <= xx < 16 and 0 <= yy < h and g[yy][xx] in "123":
                    out[y][x] = "0"
                    break
    return ["".join(r) for r in out]


def hand_icon(rows, pal, mode="squash"):
    r = auto_rows(rows)
    i1 = icon_rows(r, pal)
    if mode == "hop":
        a = np.asarray(i1)
        b = np.zeros_like(a)
        b[:-1] = a[1:]
        return i1, Image.fromarray(b, "RGBA")
    from px import squash
    ys = np.nonzero(np.asarray(i1)[..., 3].any(1))[0]
    return i1, squash(i1, ys[0] + max(1, (ys[-1] - ys[0]) // 3))


def pose(s: Sprite, k=1.0, deg=0.0, px=24.0, py=48.0):
    """Set the design->pixel transform for everything drawn from now on:
    scale k and rotate `deg` (positive = counter-clockwise on screen, i.e.
    the top swings LEFT toward the foe) about the pivot (px, py), usually
    the feet. Call with defaults to reset. Hand edits map with m()/ms()."""
    c = s.c
    if not hasattr(s, "_X0"):
        s._X0, s._Y0 = c.X.copy(), c.Y.copy()
    a = np.radians(deg)
    ca, sa = np.cos(a), np.sin(a)
    # inverse: pixel -> design. forward rotates by -a in y-down coordinates.
    dx, dy = (s._X0 - px) / k, (s._Y0 - py) / k
    c.X = px + ca * dx - sa * dy
    c.Y = py + sa * dx + ca * dy
    s._zk = (k, px, py, deg)
    return s


def zoom(s: Sprite, k, px=24.0, py=48.0):
    return pose(s, k, 0.0, px, py)


def m(s: Sprite, x, y):
    k, px, py, deg = getattr(s, "_zk", (1.0, 0.0, 0.0, 0.0))
    a = np.radians(deg)
    ca, sa = np.cos(a), np.sin(a)
    dx, dy = (x - px) * k, (y - py) * k
    return px + ca * dx + sa * dy, py - sa * dx + ca * dy


def mi(s: Sprite, x, y):
    X, Y = m(s, x, y)
    return int(round(X)), int(round(Y))


def ms(s: Sprite, r):
    return r * getattr(s, "_zk", (1.0,))[0]
