"""Crystal rule, fern line: fern_fiddlehead -> unfurling_fern -> ostrich_fern.

A redraw of tools/art/species_b/fern.py under the Crystal rule
(docs/CREATURES.md "Crystal rule", docs/ROLLOUT.md):

  index 0  #181818  the full outline, the grooves between coil windings
  index 1  species dark: blue-green. Shadow crescents, rachis, root feet
  index 2  species light: fern green. Every frond and the crozier
  index 3  #f8f8f8  1px light rims on the lit edges of coils and fronds

Signature: the crozier coil. Each coil is ONE stroke whose curvature profile
is an Archimedean spiral (spiral_kappa); `unroll` integrates that profile
with every curvature scaled by `curl`, so curl < 1 really unfurls the coil
(its length is kept) instead of shrinking it. The coil's centre is the
stroke's blunt tip, never a black disc, so it can't read as an eye.

Poses (docs/CREATURES.md section 4) kept from the base art:
  fern_fiddlehead  COILED   a fat crozier "9" on an S stalk, a pinna fist low
                            in front, a frond swept back as the tail.
  unfurling_fern   COILED   the coil head; the lead frond a whip with a rolled
                            fist, the rear frond swept up and back.
  ostrich_fern     LOOMING  a shuttlecock of plumes, the great overhang
                            drooping at the foe, the crozier at its heart.

Entrance animations (only the named part moves):
  fern_fiddlehead  the coil tucks back (wind-up), UNROLLS and flicks its tip
                   at the foe, holds, then rolls back up.
  unfurling_fern   the lead frond cocks back with its fist clenched, LASHES
                   out straight at the foe, snaps its tip half shut, recoils.
  ostrich_fern     the heart crozier winds back and unrolls at the foe while
                   the overhang plume bows over it, then both settle.

Sport: the Japanese painted fern (Athyrium niponicum var. pictum): silver
fronds shaded burgundy, the two hues the real plant has.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/fern.py           # write the base bundles + review sheet
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from kit import BLACK, WHITE, T, write_species, review_sheet, intro_strip  # noqa: E402
from _artb_draw import (BSpr, Spr, bez, qbez, erode, arclen_param, rim_white, render_frames,  # noqa: E402
                        place, back_frame, moving_boxes, icons)

TOOL = "tools/art/crystal/fern.py"
IDS = ["fern_fiddlehead", "unfurling_fern", "ostrich_fern"]

PAL = [BLACK, "#206840", "#90c838", WHITE]
# painted fern (docs/SPORTS.md): silver-sage fronds, burgundy stems and shade
SPORT = [BLACK, "#682848", "#a8b8a8", WHITE]
SPAL = (PAL[1], PAL[2], WHITE)


def curl_path(p0, h0, L, k0, k1, curl=1.0, p=2.0, n=220, sign=-1):
    """Path from p0 with heading h0 (rad, screen coords), length L; curvature
    grows from k0 to k1 (1/px) as (s/L)^p, scaled by curl. sign -1 turns
    toward screen-left when heading up (ccw on screen)."""
    pts = [p0]
    x, y = p0
    th = h0
    ds = L / (n - 1)
    for i in range(1, n):
        s = i * ds
        k = (k0 + (k1 - k0) * (s / L) ** p) * curl
        th += sign * k * ds
        x += math.cos(th) * ds
        y += math.sin(th) * ds
        pts.append((x, y))
    return pts


def spiral_kappa(R, r_end, turns, lead=0.0, n=240):
    """Curvature profile (per unit length) of an Archimedean spiral of
    `turns` from radius R in to r_end, preceded by `lead` px of straight."""
    pts = []
    for i in range(n):
        t = i / (n - 1)
        r = R * (1 - t) + r_end * t
        a = turns * 2 * math.pi * t
        pts.append((r * math.cos(a), r * math.sin(a)))
    ds, ks = [], []
    for i in range(1, n - 1):
        (ax, ay), (bx, by), (cx, cy) = pts[i - 1], pts[i], pts[i + 1]
        h1 = math.atan2(by - ay, bx - ax)
        h2 = math.atan2(cy - by, cx - bx)
        dh = (h2 - h1 + math.pi) % (2 * math.pi) - math.pi
        d = (math.dist(pts[i - 1], pts[i]) + math.dist(pts[i], pts[i + 1])) / 2
        ds.append(d); ks.append(dh / d)
    if lead:
        ds = [lead / 20] * 20 + ds
        ks = [ks[0] * 0.3] * 20 + ks
    return ds, ks


def unroll(p0, h0, prof, curl=1.0, sign=-1, extra=None):
    """Integrate a curvature profile from p0/h0 with every curvature scaled
    by curl (1 = the rest coil, <1 unrolled). extra(t) adds curvature."""
    ds, ks = prof
    L = sum(ds)
    x, y = p0
    th = h0
    pts = [p0]
    s_ = 0.0
    for d, k in zip(ds, ks):
        s_ += d
        kk = abs(k) * curl + (extra(s_ / L) if extra else 0.0)
        th += sign * kk * d
        x += math.cos(th) * d
        y += math.sin(th) * d
        pts.append((x, y))
    return pts


def frond(s, ctrl, width, step=4.0, depth=0.7, base=2, k=1, line=0, rachis=1, start=0.06, rim=0.0, tipcurl=None,
          path=None, fist=None):
    """fist=(frac, w0, w1): the last `frac` of the path is a rolled fist
    (plain tapered stroke, no pinnae)."""
    if path is None:
        path = bez(ctrl, 50)
    fpath = None
    if fist:
        n = int(len(path) * (1 - fist[0]))
        path, fpath = path[:n + 1], path[n:]
    if tipcurl:
        (x1, y1), (x0, y0) = path[-1], path[-3]
        h = math.atan2(y1 - y0, x1 - x0)
        R, kk, sg = tipcurl
        path = path + curl_path(path[-1], h, R, 1 / (R * 0.6), kk, 1.0, 1.5, n=40, sign=sg)[1:]
    ts, L = arclen_param(path)
    left, right = [], []
    d = 0.0
    for i, (x, y) in enumerate(path):
        if i:
            d += math.dist(path[i - 1], path[i])
        t = d / L
        a, b = path[max(0, i - 1)], path[min(len(path) - 1, i + 1)]
        tx, ty = b[0] - a[0], b[1] - a[1]
        tl = math.hypot(tx, ty) or 1
        nx, ny = -ty / tl, tx / tl
        w = width(t) / 2
        phase = (d % step) / step
        tooth = depth * w * (1 - phase) ** 1.3 if w > 1.4 else 0
        left.append((x + nx * (w - tooth), y + ny * (w - tooth)))
        right.append((x - nx * (w - tooth), y - ny * (w - tooth)))
    m = s.poly(left + right[::-1])
    m |= s.stroke(path, (1.8, 1.2))
    pid = s.part(m, base=base, k=k, line=line)
    if rachis is not None:
        s.decal(s.line1(path[int(len(path) * start):int(len(path) * 0.9)]), rachis, on=[pid])
    if fpath:
        fm = s.stroke(fpath, (fist[1], fist[2]), cap=True)
        s.part(fm, base=base, k=1, line=0, merge=[pid])
        m = m | fm
    if rim:
        rim_white(s, m, pid, rim)
    return pid, m, path


def whip_path(p0, h0, L, bend, tip, tipfrac=0.35, sign=-1, n=120):
    """A frond centreline: heading h0, a gentle bend (total radians over the
    blade) then a tight tip roll (`tip` radians over the last tipfrac)."""
    pts = [p0]
    x, y = p0
    th = h0
    ds = L / (n - 1)
    for i in range(1, n):
        u = i / (n - 1)
        k = bend / L
        if u > 1 - tipfrac:
            v = (u - (1 - tipfrac)) / tipfrac
            k += tip / (L * tipfrac) * (2 * v)   # ramps up: a rolled tip
        th += sign * k * ds
        x += math.cos(th) * ds
        y += math.sin(th) * ds
        pts.append((x, y))
    return pts


def blade_fn(mx, start=0.1, p=0.7):
    return lambda t: mx * math.sin(math.pi * min(1, start + t * (1 - start) * 1.02)) ** p


def roots(s, base, feet, w=2.4):
    for (fx, fy) in feet:
        bx, by = base
        c = ((bx + fx) / 2, max(by, fy) - 1.0)
        s.part(s.stroke(qbez((bx, by), c, (fx, fy), 30), (w, 1.4)), base=1, k=0, line=0)


# ------------------------------------------------------------- fiddlehead
# (curl, heading offset): rest, wind-up (coil tucked back), unroll, flick (open at the foe), recoil
FIDDLE = [(1.0, 0.0), (1.0, 0.35), (0.72, -0.05), (0.52, -0.12), (0.86, 0.06)]


def crozier(s, stalk_ctrl, prof, curl, dh, w_stalk, w_tip, sign=-1, rimf=0.5):
    """Static stalk + a coil that unrolls (curl < 1); one part, so no seam.
    Returns (pid, coil mask)."""
    stalk = bez(stalk_ctrl, 30)
    (x1, y1), (x0, y0) = stalk[-1], stalk[-3]
    path = unroll((x1, y1), math.atan2(y1 - y0, x1 - x0) + dh * sign * -1, prof, curl, sign)
    full = stalk + path[1:]
    ts, L = arclen_param(full)
    f0 = arclen_param(stalk)[1] / L
    w = lambda t: w_stalk if t <= f0 else w_stalk + (w_tip - w_stalk) * ((t - f0) / (1 - f0)) ** 0.8
    m = s.stroke(full, w, cap=True)
    cm = s.stroke(path, w_stalk + 1, cap=True) & m
    pid = s.part(m, base=2, k=2, line=0)
    outer = s.stroke(full[: int(len(stalk) + len(path) * rimf)], w_stalk + 2, cap=False) & m
    rim_white(s, outer, pid, 0.55)
    return pid, cm


def front_fiddle(f=0):
    c, dh = FIDDLE[f]
    s = BSpr(56, 56, SPAL)
    s.set_tilt(10, 31, 55)
    # tail: a sibling fiddlehead behind, low right (static)
    frond(s, [(33, 52), (39, 47), (44, 40), (46, 34)], blade_fn(6.5, 0.2), step=2.6, depth=0.5, rachis=None, tipcurl=(6, 0.8, 1), rim=0.35)
    # lead arm: the first pinna, a little fist
    frond(s, [(32, 48), (25, 47), (17, 44)], blade_fn(6.5, 0.2), step=2.6, depth=0.5, rachis=None,
          tipcurl=(6, 0.8, 1), rim=0.35)
    before = s.tone.copy()
    pid, cm = crozier(s, [(31, 55), (35.5, 46), (34.5, 36), (30, 27)], spiral_kappa(10.0, 1.4, 1.5, lead=3), c, dh, 6.6, 3.2)
    s.movem = cm
    with s.untilted():
        roots(s, (31, 54), [(24, 55), (38, 55)], w=2.6)
    s.contact += [(24, 28), (34, 38)]
    return s


def fiddle():
    fr = place(render_frames(front_fiddle, len(FIDDLE)), 56)
    return fr


# ------------------------------------------------------------- unfurling fern
# lead frond (heading deg, bend, tip roll, length): rest, wind-up, LASH, snap, recoil
UNFURL = [(198, 0.45, 4.4, 26), (214, 0.7, 6.4, 23), (178, 0.0, 0.6, 27.5), (182, -0.1, 2.4, 27), (192, 0.35, 4.8, 26)]


def front_unfurl(f=0):
    hd, bend, tip, L = UNFURL[f]
    s = BSpr(60, 60, SPAL, sc=1.1)
    s.set_tilt(12, 32, 58)
    # rear arm: swept up and back, tip rolled (static)
    frond(s, None, blade_fn(9), step=4.4, depth=0.6, path=whip_path((34, 57), math.radians(-62), 32, 0.5, 4.0, sign=1),
          fist=(0.22, 3.4, 2.0), rim=0.5)
    # body + head: the stalk and its coil (static)
    crozier(s, [(31, 58), (36.5, 46), (34, 33), (30, 25)], spiral_kappa(8.6, 1.4, 1.45, lead=2), 1.0, 0, 5.4, 2.8)
    before = s.tone.copy()
    # lead arm: thrust forward and up, a rolled fist that lashes open at the foe
    _, m, _ = frond(s, None, blade_fn(10, 0.15), step=4.4, depth=0.6,
                    path=whip_path((32, 51), math.radians(hd), L, bend, tip, sign=1), fist=(0.24, 3.8, 2.2), rim=0.6)
    s.movem = m
    with s.untilted():
        roots(s, (32, 57), [(23, 58), (42, 58)], w=2.8)
    s.contact += [(22, 28), (37, 42)]
    return s


def unfurl():
    return place(render_frames(front_unfurl, len(UNFURL)), 56)


# ------------------------------------------------------------- ostrich fern
# (crozier curl, heading offset, overhang dip px): rest, wind-up, unroll, LASH, recoil
OSTRICH = [(1.0, 0.0, 0), (1.0, 0.3, -2), (0.76, -0.04, 2), (0.60, -0.08, 4), (0.88, 0.04, 1)]


def front_ostrich(f=0):
    c, dh, dip = OSTRICH[f]
    s = BSpr(64, 64, SPAL, sc=0.83)
    s.set_tilt(8, 38, 62)
    bx, by = 38, 62
    frond(s, [(bx + 1, by), (bx + 10, 44), (bx + 16, 26), (bx + 20, 16), (bx + 23, 16)], blade_fn(10), step=3.5, depth=0.6, k=1, rim=0.3)
    frond(s, [(bx, by), (bx + 2, 42), (bx + 1, 20), (bx - 2, 0)], blade_fn(11), step=3.5, depth=0.6, k=1, rim=0.5)
    before = s.tone.copy()
    _, om, _ = frond(s, [(bx - 1, by), (bx - 4, 40), (bx - 12, 18 - dip * 0.3), (bx - 24, 8 + dip * 0.5),
                         (bx - 31, 10 + dip), (bx - 34, 17 + dip * 1.4)], blade_fn(12), step=3.5, depth=0.6, k=2, rim=0.55)
    frond(s, [(bx + 1, by - 1), (bx + 10, 55), (bx + 18, 50), (bx + 23, 45)], blade_fn(9), step=3.5, depth=0.6, k=2, rim=0.3)
    _, cm = crozier(s, [(bx - 1, by), (bx + 1, 50), (bx - 4, 40), (bx - 9, 34)], spiral_kappa(11.2, 1.5, 1.5, lead=3),
                    c, dh, 7.0, 3.2)
    frond(s, [(bx - 1, by - 1), (bx - 10, 55), (bx - 20, 53), (bx - 29, 51)], blade_fn(10), step=3.5, depth=0.6, k=2, rim=0.5)
    s.movem = cm | (om & (s.tone != before))
    with s.untilted():
        roots(s, (bx, by - 1), [(bx - 8, by + 1), (bx + 8, by + 1)], w=3.2)
    s.contact += [(bx - 9, bx - 4), (bx + 4, bx + 9)]
    return s


def ostrich():
    return place(render_frames(front_ostrich, len(OSTRICH)), 56)


# ------------------------------------------------------------- backs
def back_fiddle():
    s = Spr(48, 66, SPAL)
    crozier(s, [(20, 70), (20, 58), (23, 48)], spiral_kappa(15, 2.4, 1.4, lead=3), 1.0, 0, 10.0, 4.0, sign=1, rimf=0.6)
    return s


def back_unfurl():
    s = Spr(48, 66, SPAL)
    frond(s, None, blade_fn(13), step=4.4, depth=0.6, path=whip_path((19, 72), math.radians(-118), 44, 0.6, 4.2, sign=1),
          fist=(0.22, 4.4, 2.6), rim=0.5)
    frond(s, None, blade_fn(13), step=4.4, depth=0.6, path=whip_path((27, 72), math.radians(-60), 40, 0.5, 4.2, sign=-1),
          fist=(0.22, 4.4, 2.6), rim=0.4)
    crozier(s, [(22, 72), (22, 58), (25, 44)], spiral_kappa(12, 2.0, 1.4, lead=2), 1.0, 0, 8.0, 3.6, sign=1, rimf=0.6)
    return s


def back_ostrich():
    s = Spr(48, 64, SPAL)
    bx, by = 22, 52
    for (ex, ey), mx in (((2, 18), 10), ((12, 4), 10), ((30, 2), 10), ((47, 10), 10)):
        frond(s, [(bx, by), ((bx + ex) / 2 + 2, (by + ey) / 2), (ex, ey)], blade_fn(mx), step=4, k=2, rim=0.45)
    for (ex, ey) in ((-1, 44), (48, 40)):
        frond(s, [(bx, by + 4), ((bx + ex) / 2, by - 2), (ex, ey)], blade_fn(12), step=4, k=2, rim=0.45)
    s.part(s.ellipse(bx + 1, by + 3, 7, 4), base=1, k=0, line=0)
    s.part(s.stroke(bez([(bx, by + 2), (bx + 1, 70)], 10), (12, 14)), base=2, k=2, line=0)
    crozier(s, [(bx, by + 12), (bx + 2, by - 2), (bx + 5, by - 12)], spiral_kappa(10, 1.6, 1.4, lead=2), 1.0, 0, 6.4, 3.2, sign=1)
    return s


# ---------------------------------------------------------------- icons
# k outline, 1 blue-green, 2 fern green, 3 white; None = frame 2 hops 1px
ICONS = {
    "fern_fiddlehead": ([
        "................",
        "....kkkkk.......",
        "..kk33332kk.....",
        ".k32kkkkk22k....",
        "k32k.....k21k...",
        "k3k..kkk..k1k...",
        "k2k.k222k.k21k..",
        "k2k.k2kk..k21k..",
        "k21kk22k.k221k..",
        ".k1112kk.k21k...",
        "..kkkk..k221k...",
        ".......k221k....",
        "......kk21k.....",
        ".....k1k21kk....",
        "....k11kkk11k...",
        ".....kk...kk....",
    ], None),
    "unfurling_fern": ([
        "................",
        "...kkkk.....kk..",
        "..k3332k...k32k.",
        ".k3kkk22k.k2k1k.",
        ".k2k..k2k.k21k..",
        ".k21kk22k.k21k..",
        "..k1222k.k21k...",
        "...kkk2k.k21k...",
        ".kk..k2kk21k....",
        "k33kkk22221k....",
        "k2222222kkk.....",
        ".kk11k22k.......",
        "...kk.k21k......",
        ".....kk21kk.....",
        "....k11kk11k....",
        ".....kk..kk.....",
    ], None),
    "ostrich_fern": ([
        "................",
        ".kkkk.....kk....",
        "k3332kk..k32k.kk",
        ".kk2222kk2k2kk3k",
        "...kk222k2k2k22k",
        "..kkkk22k22k22k.",
        ".k3332k2k2k22k..",
        "k32kk22k2k22k...",
        "k2k..k2k2222k...",
        "k21kk22k1222k...",
        ".k1222k11222k...",
        "..kkkk1k1222k...",
        ".....k11k21k....",
        "....kk11k221kk..",
        "...k111kkkk111k.",
        "....kkk....kkk..",
    ], None),
}

ANIM = {
    # tuck back, UNROLL, the flick held, roll back up
    "fern_fiddlehead": {"intro": [[0, 6], [1, 14], [2, 4], [3, 18], [4, 8], [0, 1]], "idle": [[0, 120], [1, 10]]},
    # cock the fist, LASH, snap the tip, hold, recoil
    "unfurling_fern": {"intro": [[0, 6], [1, 14], [2, 4], [3, 16], [2, 4], [4, 8], [0, 1]], "idle": [[0, 110], [4, 10]]},
    # the heart crozier winds back, unrolls at the foe under the bowing plume
    "ostrich_fern": {"intro": [[0, 8], [1, 14], [2, 5], [3, 18], [4, 8], [0, 1]], "idle": [[0, 140], [4, 10]]},
}

NOTES = {
    "fern_fiddlehead": "Crystal rule. COILED. Gesture: the coil tucks back, then UNROLLS and flicks its tip at the "
                       "foe, holds, and rolls back up; the coil is one stroke whose spiral curvature is scaled "
                       "down, so it truly unfurls. Blue-green dark, fern-green light, white rims on the lit edges. "
                       "Sport: painted fern (Athyrium niponicum var. pictum), silver fronds shaded burgundy.",
    "unfurling_fern": "Crystal rule. COILED. Gesture: the lead frond cocks back with its fist clenched, LASHES out "
                      "straight at the foe, snaps its tip half shut and recoils; the coil head, rear frond and "
                      "roots never move. Sport: painted fern, silver fronds shaded burgundy.",
    "ostrich_fern": "Crystal rule. LOOMING. Gesture: the crozier at the heart winds back and unrolls at the foe "
                    "while the great overhang plume bows over it, then both settle. Plumes are separated by black "
                    "seams and white top-left rims rather than a second green. Sport: painted fern.",
}

FRONTS = {"fern_fiddlehead": fiddle, "unfurling_fern": unfurl, "ostrich_fern": ostrich}
BACKS = {"fern_fiddlehead": back_fiddle, "unfurling_fern": back_unfurl, "ostrich_fern": back_ostrich}


def build():
    """Write the three base bundles."""
    for sid in IDS:
        front = FRONTS[sid]()
        write_species(sid, palette=PAL, sport=SPORT, front=front, back=[back_frame(BACKS[sid])],
                      icon=icons(ICONS[sid]), anim=ANIM[sid], moving=moving_boxes(front),
                      notes=NOTES[sid], tool=TOOL)


if __name__ == "__main__":
    build()
    for sid in IDS:
        intro_strip(sid)
    print("review sheet:", review_sheet(IDS, HERE.parent / "review" / "crystal_fern.png"))
