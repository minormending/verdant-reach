"""Shared helpers for species art C: leaf shapes, glints and icon frames."""

from __future__ import annotations

import math

import numpy as np
from PIL import Image

from px import Canvas, K, snap


def rotp(p, c, deg):
    a = math.radians(deg)
    x, y = p[0] - c[0], p[1] - c[1]
    return (c[0] + x * math.cos(a) - y * math.sin(a), c[1] + x * math.sin(a) + y * math.cos(a))


def leaflet(c: Canvas, p0, p1, w, notch=0.0, tip=0.45, base=1.6, power=0.75, bend=0.0):
    """Obovate leaflet (widest toward the tip), optionally notched at the tip."""
    m = c.leaf(p0, p1, w, power=power, tip=tip, base=base, bend=bend)
    if notch:
        p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
        ax = (p1 - p0) / np.linalg.norm(p1 - p0)
        q = p1 + ax * notch * 0.35
        m &= ~c.circle(q[0], q[1], notch)
    return m


def chevron(c: Canvas, p0, p1, w, at=0.45, depth=0.2, thick=1.6, span=0.62):
    """The pale V across a clover leaflet: apex toward the leaflet base."""
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    L = np.linalg.norm(p1 - p0)
    ax = (p1 - p0) / L
    nx = np.array([-ax[1], ax[0]])
    apex = p0 + ax * L * at
    arm = w * span / 2
    a = apex + ax * L * depth + nx * arm
    b = apex + ax * L * depth - nx * arm
    return c.stroke([a, apex, b], thick)


def ring_px(cx, cy, r, n=None):
    """Integer points on a circle (for floret dots, speckles)."""
    n = n or max(6, int(2 * math.pi * r))
    out = []
    for k in range(n):
        a = 2 * math.pi * k / n
        out.append((int(round(cx + math.cos(a) * r)), int(round(cy + math.sin(a) * r))))
    return out


# --------------------------------------------------------------------------- icons

def icon(rows, pal):
    """16x16 from ASCII: '.' or ' ' transparent, 0 = #181818, 1-3 tones."""
    assert len(rows) == 16 and all(len(r) == 16 for r in rows), [len(r) for r in rows]
    P = [snap(K)] + [snap(p) for p in pal]
    a = np.zeros((16, 16, 4), np.uint8)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in "0123":
                a[y, x] = P[int(ch)] + (255,)
    return Image.fromarray(a, "RGBA")


def squash(img: Image.Image, row: int) -> Image.Image:
    """Frame 2: the rows above `row` drop 1px (row is swallowed); the base
    stays planted. Reads as a little crouch-and-hop in the party menu."""
    a = np.asarray(img).copy()
    out = np.zeros_like(a)
    out[row + 1:] = a[row + 1:]
    out[1:row + 1] = a[0:row]
    return Image.fromarray(out, "RGBA")


def miniature(front: Image.Image, size=14, cov=0.45, black_keep=0.6, crop=None):
    """Block-sampled miniature of a front sprite (mode of the body colours
    per block, black only where it dominates), re-outlined 1px. A starting
    point for the hand-edited icons, never the final word."""
    a = np.asarray(front)
    if crop:
        a = a[crop[1]:crop[3], crop[0]:crop[2]]
    ys, xs = np.nonzero(a[..., 3])
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = a.shape[:2]
    k = max(h, w) / size
    th, tw = max(1, round(h / k)), max(1, round(w / k))
    blk = (24, 24, 24)
    out = np.zeros((16, 16, 4), np.uint8)
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
            nb = 0
            for p in op:
                t = tuple(int(v) for v in p[:3])
                if t == blk:
                    nb += 1
                    continue
                cols[t] = cols.get(t, 0) + 1
            if not cols or nb > black_keep * len(b):
                small[j, i] = blk + (255,)
            else:
                small[j, i] = max(cols, key=cols.get) + (255,)
    oy = 16 - th - 1
    ox = (16 - tw) // 2
    out[oy:oy + th, ox:ox + tw] = small
    sil = out[..., 3] > 0
    ring = np.zeros_like(sil)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ring |= np.roll(np.roll(sil, dy, 0), dx, 1)
    ring &= ~sil
    out[ring] = blk + (255,)
    return Image.fromarray(out, "RGBA")


def to_rows(img: Image.Image, pal):
    """Image -> 16 ASCII rows in tones (for pasting into a module and editing)."""
    P = {snap(K): "0"}
    for i, p in enumerate(pal):
        P[snap(p)] = str(i + 1)
    a = np.asarray(img)
    rows = []
    for y in range(16):
        r = ""
        for x in range(16):
            r += P.get(tuple(int(v) for v in a[y, x, :3]), "?") if a[y, x, 3] else "."
        rows.append(r)
    return rows


def recentre(frames, target=28.5):
    """Slide every idle frame right by the same whole number of pixels so the
    front's horizontal centre of mass sits at >= `target` (CREATURES §3: the
    head leans at the foe, the body counterbalances; the sprite must not
    drift left out of its box). Never clips: limited by the right margin."""
    a = np.asarray(frames[0])[..., 3] > 0
    ys, xs = np.nonzero(a)
    com = xs.mean() + 0.5
    if com >= target:
        return frames
    room = min(55 - int(np.nonzero(np.asarray(f)[..., 3] > 0)[1].max()) for f in frames)
    dx = max(0, min(room, int(round(target - com))))
    out = []
    for f in frames:
        b = np.zeros_like(np.asarray(f))
        b[:, dx:] = np.asarray(f)[:, :56 - dx] if dx else np.asarray(f)
        out.append(Image.fromarray(b, "RGBA"))
    return out
