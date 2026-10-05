"""Crystal rule, sundew line: sundew_rosette -> sundew.

A redraw of tools/art/species_b/sundew.py under the Crystal rule
(docs/CREATURES.md "Crystal rule", docs/ROLLOUT.md):

  index 0  #181818  the full outline, round every tentacle too
  index 1  species dark: CRIMSON. The glandular tentacles, the leaf rims,
           the buds, and the shadow side of every green form (the second
           hue in the dark slot, the flytrap's trick)
  index 2  species light: leaf green
  index 3  #f8f8f8  the DEW: a bead on every tentacle tip, plus 1px rims

Signature: the dew-tipped tentacles, exaggerated. In the base art they were
loose 1px hairs drawn past the outline; under the Crystal rule every hair
is a body part, so the full black outline rings it and each white bead.

Poses kept from the base art: sundew_rosette COILED (spoon-leaf feet, a
raised spoon hand reaching at the foe, the circinate scape as the head),
sundew REARING (strap leaves rising, the lead strap hooking over at the foe).

Entrance animations (only the lead leaf and its tentacles move):
  sundew_rosette  the hand reaches (the dew glints), then GRABS: the pad
                  cups and its tentacles curl in, the dew flashing, then
                  it relaxes.
  sundew          the lead strap rears up straight, WRAPS down into a tight
                  curl, the tentacles close in and the dew flashes.

Sport: 'Alba' (Drosera capensis 'Alba'), the anthocyanin-free form: green
tentacles shading a pale green leaf, the dew still white.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/sundew.py         # write the base bundles + review sheet
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from kit import BLACK, WHITE, T, write_species, review_sheet, intro_strip  # noqa: E402
from _artb_draw import (BSpr, Spr, bez, qbez, erode, dilate, shift, rim_white, render_frames,  # noqa: E402
                        place, back_frame, moving_boxes, icons)

TOOL = "tools/art/crystal/sundew.py"
IDS = ["sundew_rosette", "sundew"]

PAL = [BLACK, "#a02048", "#90c840", WHITE]
# 'Alba' (docs/SPORTS.md): green tentacles and shade, pale green leaves
SPORT = [BLACK, "#386830", "#b8e078", WHITE]
SPAL = (PAL[1], PAL[2], WHITE)


D8 = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)]


def tentacles(s, mask, center, spacing=3, length=3, region=None, bend=0, grip=None, sparkle=0):
    """Crimson glandular hairs out of a leaf edge, each tipped with a white
    dew bead. bend (0..2): each hair turns by 45 deg per step after its first
    pixel, toward `grip` (the point it is closing on; default the pad centre).
    sparkle: the first n beads (top-left first) flash a white cross."""
    ys, xs = np.nonzero(mask & ~erode(mask, 1))
    if region is not None:
        keep = region[ys, xs]
        ys, xs = ys[keep], xs[keep]
    if not len(xs):
        return []
    f = mask.astype(float)
    for _ in range(3):
        f = (f + shift(f, 1, 0) + shift(f, -1, 0) + shift(f, 0, 1) + shift(f, 0, -1)) / 5
    gy, gx = np.gradient(f)
    cy, cx = center
    gx_, gy_ = grip if grip is not None else (cx, cy)
    order = np.argsort(np.arctan2(ys - cy, xs - cx))
    hair = np.zeros(mask.shape, bool)
    dew = np.zeros(mask.shape, bool)
    picked, beads = [], []
    for i in order:
        x, y = int(xs[i]), int(ys[i])
        if any(max(abs(x - a), abs(y - b)) < spacing for a, b in picked):
            continue
        nx, ny = -gx[y, x], -gy[y, x]
        if math.hypot(nx, ny) < 1e-6:
            continue
        d = round(math.atan2(ny, nx) / (math.pi / 4)) % 8
        X, Y = x, y
        dx, dy = D8[d]
        while 0 <= X < s.w and 0 <= Y < s.h and mask[Y, X]:
            X, Y = X + dx, Y + dy
        # which way to turn: toward the grip point
        cross = dx * (gy_ - Y) - dy * (gx_ - X)
        turn = 1 if cross > 0 else -1
        cells = []
        for k in range(length):
            if k >= 1 and bend:
                dd = (d + turn * min(bend, k)) % 8
            else:
                dd = d
            ddx, ddy = D8[dd]
            if k == 0:
                cells.append((X, Y))
            else:
                px_, py_ = cells[-1]
                cells.append((px_ + ddx, py_ + ddy))
        ex, ey = cells[-1]
        ddx, ddy = D8[(d + turn * min(bend, length)) % 8] if bend else (dx, dy)
        bx, by = ex + ddx, ey + ddy
        pair = [(bx, by), (bx + 1, by)] if abs(ddy) >= abs(ddx) else [(bx, by), (bx, by + 1)]
        ring = {(u + 1, v) for u, v in pair} | {(u, v + 1) for u, v in pair}
        ring = [q for q in ring if q not in pair]
        allc = cells + pair + ring
        if any(not (0 <= u < s.w and 0 <= v < s.h) or mask[v, u] for u, v in allc):
            continue
        picked.append((x, y))
        for u, v in cells + ([] if OUTLINED else ring):
            hair[v, u] = True
        for u, v in pair:
            dew[v, u] = True
        beads.append(pair[0])
    if sparkle:
        for bx, by in sorted(beads, key=lambda q: q[0] + q[1])[:sparkle]:
            for u, v in ((bx - 1, by), (bx, by - 1)):
                if 0 <= u < s.w and 0 <= v < s.h and not mask[v, u]:
                    dew[v, u] = True
                    hair[v, u] = False
    if OUTLINED:
        # Crystal: every hair is a body part, so the outline rings it in black
        s.part(hair & ~dew, base=1, k=0, line=None)
        s.part(dew, base=3, k=0, line=None)
        s.lock |= hair | dew
    else:
        s.post.append((hair, 1))
        s.post.append((dew, 3))
    return beads


OUTLINED = True


def spoon(s, base, tip, R, sq=0.75, ang=None, pet=1.8, k=2, rim=True, white=0.0):
    bx, by = base
    tx, ty = tip
    if ang is None:
        ang = math.atan2(ty - by, tx - bx)
    path = qbez(base, ((bx + tx) / 2, (by + ty) / 2 - 1.5), (tx - math.cos(ang) * R * 0.7, ty - math.sin(ang) * R * 0.7), 30)
    pm = s.stroke(path, (pet + 0.6, pet))
    pid = s.part(pm, base=2, k=1, line=0)
    m = s.ellipse(tx, ty, R, R * sq, ang=ang)
    lid = s.part(m, base=2, k=2, line=0, merge=[pid])
    if rim:
        s.decal(m & ~erode(m, 1), 1, on=[lid])
    if white:
        rim_white(s, erode(m, 1), lid, white)
    return lid, m


def strap(s, ctrl, w, curl=None, k=2, white=0.0):
    path = bez(ctrl, 40)
    if curl:
        R, sg, turn = curl
        (x1, y1), (x0, y0) = path[-1], path[-6]
        tx, ty = x1 - x0, y1 - y0
        tl = math.hypot(tx, ty)
        tx, ty = tx / tl, ty / tl
        nx, ny = (-ty * sg, tx * sg)
        cx, cy = x1 + nx * R, y1 + ny * R
        a0 = math.atan2(y1 - cy, x1 - cx)
        sd = 1 if (-(y1 - cy) * tx + (x1 - cx) * ty) > 0 else -1
        path = path + [(cx + R * (1 - 0.35 * u) * math.cos(a0 + sd * u * turn * math.pi),
                        cy + R * (1 - 0.35 * u) * math.sin(a0 + sd * u * turn * math.pi)) for u in np.linspace(0.02, 1, 30)]
    m = s.stroke(path, lambda t: w * (0.55 + 0.45 * math.sin(math.pi * min(1, 0.15 + t))) if t < 0.9 else w * 0.7)
    pid = s.part(m, base=2, k=k, line=0)
    s.decal(m & ~erode(m, 1) & ~shift(m, 0, 1), 1, on=[pid])
    if white:
        rim_white(s, m & erode(m, 1) | (m & shift(m, 0, 1) & ~shift(m, 0, -1)), pid, white)
    return pid, m, path


def scape(s, ctrl, R, w=2.4, turns=1.0, sg=-1, buds=2, white=True):
    path = bez(ctrl, 30)
    (x1, y1), (x0, y0) = path[-1], path[-5]
    tx, ty = x1 - x0, y1 - y0
    tl = math.hypot(tx, ty)
    tx, ty = tx / tl, ty / tl
    nx, ny = (-ty * sg, tx * sg)
    cx, cy = x1 + nx * R, y1 + ny * R
    a0 = math.atan2(y1 - cy, x1 - cx)
    sd = 1 if (-(y1 - cy) * tx + (x1 - cx) * ty) > 0 else -1
    sp = [(cx + R * (1 - 0.6 * u) * math.cos(a0 + sd * u * turns * 2 * math.pi),
           cy + R * (1 - 0.6 * u) * math.sin(a0 + sd * u * turns * 2 * math.pi)) for u in np.linspace(0.02, 1, 50)]
    full = path + sp
    m = s.stroke(full, lambda t: w * (1 - 0.35 * t))
    pid = s.part(m, base=2, k=1, line=0)
    for j in range(buds):
        a = a0 + sd * (0.15 + j * 0.85 / max(1, buds)) * 2 * math.pi * turns
        rr = R * (1 - 0.6 * (0.15 + j * 0.85 / max(1, buds))) + w * 0.5 + 1.2
        bm = s.circle(cx + rr * math.cos(a), cy + rr * math.sin(a), 2.0 - 0.25 * j)
        bid = s.part(bm, base=1, k=0, line=0)
        if white and j == 0:
            # the bud's sheen: its top-left pixel
            ys, xs = np.nonzero(bm)
            if len(xs):
                i = int(np.argmin(xs + ys))
                s.px([(int(xs[i]), int(ys[i]))], 3)
    return pid, full, (cx, cy)


# ---------------------------------------------------------------- rosette
# (lead tip dx, dy, pad squash, hair bend, sparkle): rest, reach, GRAB, curl in + glint, relax
ROSETTE = [(0, 0, 0.85, 0, 0), (-2, -2, 0.85, 0, 2), (-1, 1, 0.70, 1, 0), (0, 1, 0.66, 2, 4), (0, 0, 0.80, 1, 1)]


def front_rosette(f=0):
    dx, dy, sq, bend, spark = ROSETTE[f]
    s = BSpr(56, 56, SPAL, sc=0.92)
    s.set_tilt(12, 31, 51)
    cx, cy = 31, 51
    rear, rm = spoon(s, (cx + 1, cy), (37, 25), 5.6, sq=0.8, ang=-1.3, pet=2.2, white=0.4)
    with s.untilted():
        spoon(s, (cx, cy), (45, 52), 4.4, sq=0.55, ang=0.1)
    with s.untilted():
        spoon(s, (cx, cy), (15, 52), 4.8, sq=0.55, ang=3.1, white=0.4)
    scape(s, [(cx, cy), (cx + 2, 40), (cx - 2, 27), (cx - 8, 18)], 3.6, w=2.6, turns=0.6, sg=-1, buds=3)
    before = s.tone.copy()
    lead, lm = spoon(s, (cx - 1, cy), (12 + dx, 35 + dy), 9.0, sq=sq, ang=-2.6, pet=2.8, white=0.45)
    tentacles(s, lm, (cx, cy), spacing=6, length=4, bend=bend, grip=(14 + dx, 33 + dy), sparkle=spark)
    s.movem = dilate(s.tone != before, 1)
    tentacles(s, rm, (cx, cy), spacing=8, length=3)
    s.contact += [(11, 19), (41, 48)]
    return s


def rosette():
    return place(render_frames(front_rosette, len(ROSETTE)), 56)


def back_rosette():
    s = Spr(48, 60, SPAL)
    cx, cy = 18, 60
    spoon(s, (cx, cy), (5, 46), 7, sq=0.7, ang=3.6, pet=3, rim=False, white=0.4)
    scape(s, [(cx, cy), (cx - 1, 40), (cx + 4, 26), (cx + 10, 16)], 4.0, w=3.2, turns=0.6, sg=1, buds=3)
    _, m2 = spoon(s, (cx + 2, cy), (34, 26), 11, sq=0.85, ang=-0.7, pet=3.6, rim=False, white=0.5)
    s.decal(s.line1(bez([(27, 33), (35, 26), (40, 20)], 12)), 1)
    spoon(s, (cx + 1, cy), (40, 48), 7, sq=0.7, ang=-0.2, pet=3, rim=False)
    s.part(s.ellipse(cx + 1, cy + 1, 11, 6), base=2, k=2, line=0)
    far = np.zeros((s.h, s.w), bool)
    far[:24, 30 + s.ox:] = True
    tentacles(s, m2, (cy, cx), spacing=5, length=3, region=far)
    return s


# ---------------------------------------------------------------- sundew
# (lead strap tip dx, dy, curl R, curl turn, hair bend, sparkle): rest, REAR, WRAP, curl tight + glint, relax
SUNDEW = [(0, 0, 4.6, 1.1, 0, 0), (-2, -6, 3.0, 0.6, 0, 2), (-1, 2, 5.2, 1.35, 1, 0), (0, 3, 4.6, 1.5, 2, 4),
          (0, 1, 4.6, 1.2, 1, 1)]


def front_sundew(f=0):
    dx, dy, R, turn, bend, spark = SUNDEW[f]
    s = BSpr(60, 60, SPAL, sc=0.98)
    s.set_tilt(10, 33, 57)
    bx, by = 33, 57
    _, m1, _ = strap(s, [(bx + 1, by), (bx + 7, 44), (bx + 12, 30), (bx + 14, 20)], 6.0, curl=(3.2, -1, 1.1), white=0.35)
    scape(s, [(bx, by), (bx + 3, 40), (bx, 22), (bx - 6, 12)], 4.0, w=2.6, turns=0.6, sg=-1, buds=3)
    with s.untilted():
        strap(s, [(bx, by), (bx - 8, 55), (bx - 16, 55)], 4.6, white=0.3)
    with s.untilted():
        strap(s, [(bx, by), (bx + 8, 55), (bx + 14, 53)], 4.4)
    before = s.tone.copy()
    _, m3, path = strap(s, [(bx - 1, by), (bx - 9, 46), (bx - 17 + dx * 0.5, 36 + dy * 0.4), (bx - 22 + dx, 28 + dy * 0.8),
                            (bx - 21 + dx, 21 + dy)], 7.6, curl=(R, 1, turn), white=0.4)
    tentacles(s, m3, (bx, by - 20), spacing=7, length=4, bend=bend, grip=path[-1], sparkle=spark)
    s.movem = dilate(s.tone != before, 1)
    tentacles(s, m1, (bx, by - 20), spacing=10, length=3)
    s.contact += [(bx - 18, bx - 10), (bx + 9, bx + 16)]
    return s


def sundew():
    return place(render_frames(front_sundew, len(SUNDEW)), 56)


def back_sundew():
    s = Spr(48, 64, SPAL)
    bx, by = 16, 70
    strap(s, [(bx, by), (bx - 6, 50), (bx - 9, 34), (bx - 8, 24)], 6.5, curl=(3.4, 1, 1.1), white=0.4)
    scape(s, [(bx + 2, by), (bx + 4, 44), (bx + 9, 26), (bx + 14, 12)], 4.2, w=3.0, turns=0.6, sg=1, buds=3)
    _, m3, _ = strap(s, [(bx + 2, by), (bx + 12, 52), (bx + 22, 36), (bx + 27, 22), (bx + 25, 14)], 8.0,
                     curl=(4.6, -1, 1.1), white=0.4)
    s.part(s.ellipse(bx + 4, 60, 14, 6), base=2, k=2, line=0)
    far = np.zeros((s.h, s.w), bool)
    far[:24, 26 + s.ox:] = True
    tentacles(s, m3, (30, bx + 20), spacing=5, length=3, region=far)
    return s


# ---------------------------------------------------------------- icons
# k outline, 1 crimson, 2 green, 3 white dew; None = frame 2 hops 1px
ICONS = {
    "sundew_rosette": ([
        "................",
        "...k...kkkk.....",
        "...k..k1111k....",
        ".kkkkkk1kk1k....",
        "k311122kkk3kk...",
        "k13322221kkk3k..",
        "k1322222k1k.kk..",
        "k122222kk2kk3k..",
        ".k1222k.k2kkk...",
        "k3kk1k..k2k.....",
        ".kkkkk..k2k.....",
        "..k3k..k22k.....",
        ".kkkk.kk22k.kkk.",
        "k3221kk1221k122k",
        ".kk11k111k1111k.",
        "...kkkkkkkkkkk..",
    ], None),
    "sundew": ([
        "................",
        "..k.......k.....",
        "..kkkk...kk..k..",
        ".k1332k.k1k.k3k.",
        "k3kkkk2kk2kkkk..",
        ".kk..k2k2kk2k...",
        ".k3k.k32k2k2k...",
        "..k..k2k22k2k...",
        "....k32k2k22k...",
        "....k212k22k....",
        "...k2212k2k.....",
        "...k2112kk......",
        ".kkkk212kkkkkk..",
        "k33221k21k1222k.",
        ".kk111k111k111k.",
        "...kkkkkkkkkkk..",
    ], None),
}

ANIM = {
    # reach (glint), GRAB, curl in with the dew flashing, relax
    "sundew_rosette": {"intro": [[0, 6], [1, 14], [2, 5], [3, 18], [4, 8], [0, 1]], "idle": [[0, 120], [4, 10]]},
    # rear up, WRAP, curl tight and flash, relax
    "sundew": {"intro": [[0, 6], [1, 14], [2, 5], [3, 18], [4, 8], [0, 1]], "idle": [[0, 130], [4, 10]]},
}

NOTES = {
    "sundew_rosette": "Crystal rule. COILED. Gesture: the spoon hand reaches with its dew glinting, then GRABS: the "
                      "pad cups, the tentacles curl in and the dew flashes, then it relaxes. Every tentacle is a "
                      "body part ringed by the black outline, crimson in the dark slot, tipped with a white dew "
                      "bead. Sport: 'Alba', the anthocyanin-free form.",
    "sundew": "Crystal rule. REARING. Gesture: the lead strap rears up straight, WRAPS down into a tight curl, its "
              "tentacles close in and the dew flashes. Crimson shades the green, the flytrap's two-hue trick. "
              "Sport: 'Alba'.",
}

FRONTS = {"sundew_rosette": rosette, "sundew": sundew}
BACKS = {"sundew_rosette": back_rosette, "sundew": back_sundew}


def build():
    """Write the two base bundles."""
    for sid in IDS:
        front = FRONTS[sid]()
        write_species(sid, palette=PAL, sport=SPORT, front=front, back=[back_frame(BACKS[sid])],
                      icon=icons(ICONS[sid]), anim=ANIM[sid], moving=moving_boxes(front),
                      notes=NOTES[sid], tool=TOOL)


if __name__ == "__main__":
    build()
    for sid in IDS:
        intro_strip(sid)
    print("review sheet:", review_sheet(IDS, HERE.parent / "review" / "crystal_sundew.png"))
