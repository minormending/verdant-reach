"""16x16 party icons.

Hand-pixelled ones live in icon_art.py; the rest are miniatures of the
front (re-rendered without internal lines, block-sampled, re-outlined,
de-orphaned). Frame 2 (icon__2) is a squash: the top drops 1px while the
base stays put.
"""

import numpy as np
from PIL import Image
from px import squash


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


def plain(f):
    """Re-render a front without internal lines, as the icon's source."""
    import px
    px.NO_INNER = True
    try:
        return f()
    finally:
        px.NO_INNER = False


# per-species icon settings: miniature size, hand edits (x, y, rows), squash row
CFG = {}


def icon_for(id_, front_fn, pal):
    import icon_art
    from px import icon_rows
    cfg = CFG.get(id_, {})
    if id_ in icon_art.ICONS:
        i1 = icon_rows(icon_art.ICONS[id_](), pal)
        if id_ not in icon_art.PATTERNED:      # drupelet dots are a deliberate 2-colour pattern
            i1 = Image.fromarray(deorphan(np.asarray(i1)), "RGBA")
            return i1, Image.fromarray(deorphan(np.asarray(squash(i1, cfg.get("squash", 8)))), "RGBA")
        return i1, squash(i1, cfg.get("squash", 8))
    im = from_front(front_fn(), size=cfg.get("size", 14), cov=cfg.get("cov", 0.45))
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
    a = deorphan(a)
    i1 = Image.fromarray(a, "RGBA")
    return i1, Image.fromarray(deorphan(np.asarray(squash(i1, cfg.get("squash", 8)))), "RGBA")


def deorphan(a):
    """Body pixels with no same-colour 8-neighbour take the commonest body
    colour of their 4-neighbours (or become outline if they have none)."""
    a = a.copy()
    h, w = a.shape[:2]
    blk = np.array([24, 24, 24])
    N8 = ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1))
    for _ in range(3):
        changed = False
        for y in range(h):
            for x in range(w):
                if not a[y, x, 3] or (a[y, x, :3] == blk).all():
                    continue
                me = tuple(a[y, x, :3])
                nbs = [(y + dy, x + dx) for dy, dx in N8 if 0 <= y + dy < h and 0 <= x + dx < w]
                if any(a[yy, xx, 3] and tuple(a[yy, xx, :3]) == me for yy, xx in nbs):
                    continue
                body = [tuple(a[yy, xx, :3]) for yy, xx in nbs[:4] if a[yy, xx, 3] and not (a[yy, xx, :3] == blk).all()]
                if body:
                    a[y, x, :3] = max(set(body), key=body.count)
                else:
                    a[y, x, :3] = blk
                changed = True
        if not changed:
            break
    return a
