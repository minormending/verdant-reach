"""Crystal rule, flytrap line: flytrap_seedling -> young_flytrap -> venus_flytrap (base art).

Promoted from the pilot (docs/CRYSTAL_PILOT.md, row 3) into the base
species bundles (docs/ROLLOUT.md).  A redraw of tools/art/species_b/flytrap.py
under the Crystal rule:

  index 0  #181818  outline, the throat, the jaw seam, cast shadow   (shared)
  index 1  species dark: TRAP RED. The maw, the inner faces seen along the
           rims, the midribs, and the shadow side of every green form
  index 2  species light: spring green. Shells, petioles, claws
  index 3  #f8f8f8  cilia, wet glints in the maw, the shell's specular  (shared)

The two-hue problem (green body, red trap) is solved the Crystal way: the
red lives in the dark slot. The maw reads red because it is a big flat field
of index 1 framed by green rims; the same red as a 2px band on the
bottom-right of a green form reads as shadow. There is no dark green at all,
so green forms separate from each other by black seams, not by a second
green. White is the cilia (outlined, so they read as fangs), a wet glint on
the lower jaw, and one specular sliver on the upper shell.

Poses (docs/CREATURES.md) are kept from the base art: all three LUNGING,
the head thrust past the claws, the line motif the maw.

Entrance animations (only the head moves; claws, petiole and fists are
pixel-identical in every frame):
  flytrap_seedling  a yawn: the jaws open slowly to a wide stretch, hold,
                    then a little smack shut and back to rest.
  young_flytrap     a lunge: wind-up (head drawn back, jaws wide), a 4-tick
                    lunge, a SNAP that holds, a recoil.
  venus_flytrap     the jaws gape, gape wider, HOLD, then SNAP, and the
                    shut trap's cilia bristle twice before it reopens.

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/flytrap.py            # write the base bundles + review sheet
  $PY tools/art/crystal/flytrap.py --preview  # preview sheet only (scratch)
"""

from __future__ import annotations

import functools
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))                        # the crystal kit

from kit import BLACK, WHITE, T, write_species, review_sheet, intro_strip, legacy, to_rgba  # noqa: E402

pix = legacy("species_b/pix.py")                     # the base art's pixel helpers
bez, erode, qbez = pix.bez, pix.erode, pix.qbez
Spr = legacy("species_b/rig.py").Spr

TOOL = "tools/art/crystal/flytrap.py"
IDS = ["flytrap_seedling", "young_flytrap", "venus_flytrap"]

RED = "#a82838"      # index 1: trap red, also the shadow on green
GREEN = "#90d048"    # index 2: spring green
PAL = [BLACK, RED, GREEN, WHITE]
# 'Akai Ryu' (Red Dragon), docs/SPORTS.md: the whole plant blood-red. The
# body takes the red and the maw sinks to a deep wine.
SPORT = [BLACK, "#601830", "#d83840", WHITE]
SPAL = (RED, GREEN, WHITE)


# ---------------------------------------------------------------------------
# geometry helpers
# ---------------------------------------------------------------------------

def _tf(s, hx, hy, ang, flip):
    """local (x right = back of the trap, jaws open toward -x) -> world."""
    sx = -1 if flip else 1
    c, s_ = math.cos(ang), math.sin(ang)

    def tr(pts):
        return [(hx + sx * (x * c + y * s_), hy + (-x * s_ + y * c)) for x, y in pts]
    return tr


def _mask_px(m):
    return list(zip(*np.nonzero(m)[::-1]))


def trap(s, hx, hy, L, ang=0.0, au=0.55, al=0.42, thick=0.44, teeth=5, tlen=3, flip=False,
         deep=-0.12, bristle=0, hl=True, wet=True, lip=True):
    """A trap with its hinge at (hx, hy), jaws toward -x (flip: +x).
    au / al: opening of the upper / lower lobe in radians from the axis
    (both small = shut). bristle: extra cilia length (the SNAP)."""
    tr = _tf(s, hx, hy, ang, flip)
    closed = au + al < 0.3
    U = (-L * math.cos(au), -L * math.sin(au))
    Lw = (-L * math.cos(al), L * math.sin(al))
    D = thick * L
    rim_u = qbez((0, 0), (U[0] * 0.5, U[1] * 0.5 - L * 0.07), U, 40)
    rim_l = qbez((0, 0), (Lw[0] * 0.5, Lw[1] * 0.5 + L * 0.07), Lw, 40)
    if closed:
        return shut(s, tr, U, Lw, L, D, bristle, hl)
    sh_u = qbez(U, (U[0] * 0.35 + 2, U[1] - D * 0.95), (L * 0.10, -D * 0.38), 40)
    sh_l = qbez(Lw, (Lw[0] * 0.35 + 2, Lw[1] + D * 0.95), (L * 0.10, D * 0.38), 40)
    ids = []
    maw = None
    if not closed:
        far = qbez(Lw, (L * deep, (U[1] + Lw[1]) * 0.5), U, 40)
        maw = s.poly(tr(list(rim_u) + list(far[::-1][1:]) + list(rim_l[::-1])))
        mid_id = s.part(maw, base=1, k=0, line=None)
        # the throat: a black pit at the hinge, deep and bold
        tp = tr([(-L * 0.17, (U[1] + Lw[1]) * 0.10)])[0]
        s.ink(s.ellipse(tp[0], tp[1], max(1.2, L * 0.13), max(1.4, L * 0.19), ang=-ang) & maw, 0,
              pid=mid_id, lock=False)
        ids.append(mid_id)
    for rim, shell, up in ((rim_l, sh_l, False), (rim_u, sh_u, True)):
        m = s.poly(tr(list(rim) + list(shell)))
        hm = None
        if hl and up:
            # the shell's one specular sliver, top-left of the upper lobe
            hp = tr([(U[0] * 0.40, U[1] * 0.50 - D * 0.50)])[0]
            hm = s.ellipse(hp[0], hp[1], max(1.4, L * 0.13), 1.0,
                           ang=(-ang if not flip else ang) + (0.30 if not closed else 0.12))
        jid = s.part(m, base=2, k=2 if up else 3, hl=hm, line=0, shadow=(1, 1))
        ids.append(jid)
        if hl and up and RIM:
            rim_white(s, m, jid, RIM)
        if lip and not closed:
            # the red inner face seen along the rim (3/4 view): thick on the
            # lower jaw (we look down into it), thin on the upper
            bw = (1.6 if up else 3.4) * max(1.0, L / 20)
            band = s.stroke(tr(rim), lambda t: bw * math.sin(math.pi * min(1.0, 0.1 + t)) ** 0.5, cap=False)
            s.decal(band & m, 1, on=[jid])
    if wet and maw is not None:
        # a wet glint on the lower jaw's inner face, near the lip
        g = [(Lw[0] * 0.62 + k * 0.9, Lw[1] * 0.50 + 0.6 - k * 0.35) for k in np.linspace(0, max(1.5, L / 12), 6)]
        gm = s.line1(tr(g))
        s.decal(gm, 3, lock=True)
    cilia(s, tr, rim_u, rim_l, teeth, tlen, L, closed, bristle)
    return ids


def shut(s, tr, U, Lw, L, D, bristle, hl):
    """The trap SNAPPED shut, turned so the seam runs along its top-front
    edge: we see the big lower lobe (gloss, red lip under the seam) and only
    a sliver of the upper lobe, and the interlocked cilia stand up out of
    the seam like bars, outlined against the sky. `bristle` makes them
    longer and rakes them forward."""
    th = math.atan2((U[1] + Lw[1]) / 2, (U[0] + Lw[0]) / 2)
    e = np.array([math.cos(th), math.sin(th)])     # toward the tip
    n = np.array([-e[1], e[0]])
    if n[1] < 0:
        n = -n                                     # toward the lower lobe
    a = L * 0.46
    b = max(D * 0.76, L * 0.34)
    c = e * a * 0.95
    off = -0.42                                    # the seam sits high
    big = L >= 18

    def seam_pt(u):
        return c + e * a * u + n * b * (off * math.sqrt(max(0.0, 1 - u * u)) * 0.35 + off * 0.65)

    ts = np.linspace(0, 2 * math.pi, 120, endpoint=False)
    ell = [tuple(c + e * a * math.cos(t) + n * b * math.sin(t)) for t in ts]
    us = np.linspace(-1.0, 1.0, 60)
    seam = [tuple(seam_pt(u)) for u in us]
    whole = s.poly(tr(ell))
    below = s.poly(tr(seam + [tuple(c + e * a * 1.3 + n * b * 1.5), tuple(c - e * a * 1.3 + n * b * 1.5)]))
    upm = whole & ~below
    lom = whole & below
    ids = []
    uid = s.part(upm, base=2, k=1, line=0)
    ids.append(uid)
    hm = None
    if hl:
        hp = c + n * b * (off + 0.42) - e * a * 0.05
        q = tr([tuple(hp)])[0]
        q2 = tr([tuple(hp + e)])[0]
        hm = s.ellipse(q[0], q[1], max(1.4, a * 0.30), 1.0, ang=-math.atan2(q2[1] - q[1], q2[0] - q[0]))
    lid = s.part(lom, base=2, k=3 if big else 2, hl=hm, line=None, merge={uid})
    ids.append(lid)
    if hl and big:
        rim_white(s, lom & ~shift_dn(upm), lid, 0.22)
    # the seam (black) and the red inner lip just under it
    sm = s.line1(tr([tuple(seam_pt(u)) for u in np.linspace(-0.88, 0.97, 50)])) & whole
    s.ink(sm, 0, lock=True)
    lipm = s.line1(tr([tuple(seam_pt(u) + n) for u in np.linspace(-0.55, 0.85, 40)])) & lom & ~sm
    s.decal(lipm, 1, lock=True)
    # cilia: bars standing out of the seam, every other pixel
    m = np.zeros((s.h, s.w), bool)
    for j, u in enumerate(np.arange(-0.15, 0.92, 2.4 / a) if big else []):
        p = seam_pt(u)
        rake = 0.20 + 0.18 * min(bristle, 3) * max(0.0, u)
        d = -n * math.cos(rake) + e * math.sin(rake)
        tl = 1.6 + 0.7 * min(bristle, 3) * (0.3 + 0.7 * max(0.0, u)) + (0.5 if j % 2 else 0)
        reach = b * (1 + off) * 1.1 * math.sqrt(max(0.0, 1 - u * u)) + 1.0 + tl
        m |= s.line1(tr([tuple(p + d * t) for t in np.linspace(0.6, reach, 16)]))
    # the tip pair, splayed forward
    tip = seam_pt(0.97)
    for ag in (-0.25, 0.45):
        dv = np.array([e[0] * math.cos(ag) - e[1] * math.sin(ag), e[0] * math.sin(ag) + e[1] * math.cos(ag)])
        ln = (1.8 if big else 1.0) + 0.8 * min(bristle, 3)
        m |= s.line1(tr([tuple(tip + dv * t) for t in np.linspace(0.6, 0.6 + ln, 10)]))
    s.px(_mask_px(m & ~whole), 3)
    return ids


def shift_dn(m):
    shift = pix.shift
    return m | shift(m, 0, -1)


def cilia(s, tr, rim_u, rim_l, n, tlen, L, closed, bristle):
    """1px white fangs off each rim. Open: across the gap toward the tips.
    Shut: a zipper of interlocked teeth across the black seam, and a fan of
    cilia past the tip (longer and wider with `bristle`)."""
    m = np.zeros((s.h, s.w), bool)
    if not closed:
        for rim, up in ((rim_u, True), (rim_l, False)):
            pts = rim[int(len(rim) * 0.30):int(len(rim) * 0.95)]
            picks = [pts[int(i * (len(pts) - 1) / max(1, n - 1))] for i in range(n)]
            for j, (x, y) in enumerate(picks):
                d = (-0.45, 1.0) if up else (-0.45, -1.0)
                ln = tlen + (1 if 0 < j < n - 1 else 0) + bristle
                m |= s.line1(tr([(x + d[0] * k * 0.9, y + d[1] * k * 0.9) for k in np.linspace(0.6, ln, 12)]))
        s.px(_mask_px(m), 3)
        return
    rim = np.array(rim_u)
    tip = rim[-1]
    e = tip / max(1e-6, np.hypot(*tip))          # seam direction (toward the tip)
    nrm = np.array([e[1], -e[0]])                # points down (toward the lower lobe)
    if nrm[1] < 0:
        nrm = -nrm
    seam_len = float(np.hypot(*tip))
    step = 2.4
    k = 0
    for d in np.arange(seam_len * 0.34, seam_len - 1.6, step):
        p = e * d
        up = k % 2 == 0
        sg = 1 if up else -1
        tl = 1.6 + 0.9 * bristle
        m |= s.line1(tr([tuple(p + nrm * sg * t) for t in np.linspace(1.0, 1.0 + tl, 8)]))
        k += 1
    s.px(_mask_px(m), 3)
    # the fan at the tip, past the silhouette
    fan = 2 + (1 if bristle else 0) + (1 if bristle > 1 else 0)
    spread = 0.45 + 0.18 * min(bristle, 3)
    for i in range(fan):
        a = -spread + 2 * spread * i / max(1, fan - 1)
        dv = np.array([e[0] * math.cos(a) - e[1] * math.sin(a), e[0] * math.sin(a) + e[1] * math.cos(a)])
        ln = 2.2 + 0.9 * bristle
        seg = [tuple(tip + dv * t) for t in np.linspace(0.8, 0.8 + ln, 10)]
        s.px(_mask_px(s.line1(tr(seg))), 3)


def wing(s, base, tip, w, bend=0.0, k=2, line=0, vein=True, fat=0.6, rim=0.30):
    """Winged petiole / rosette leaf (a claw on the ground)."""
    m, path = s.leaf(base, tip, w, bend=bend, fat=fat, blunt=1.2)
    pid = s.part(m, base=2, k=k, line=line)
    if vein:
        s.decal(s.line1(path[8:-10]), 1, on=[pid])
    if rim:
        rim_white(s, m, pid, rim)
    return pid


RIM = 0.38   # how far round the top-left the shells' white rim runs


def rim_white(s, m, pid, frac):
    """A 1px white light rim on the top-left edge of a form (the Crystal
    gloss): edge pixels facing up or left, on the top-left `frac` of the
    form's diagonal extent, only where the part is still visible."""
    shift = pix.shift
    edge = m & (~shift(m, 0, -1) | ~shift(m, -1, 0))
    ys, xs = np.nonzero(m)
    if not len(xs):
        return
    d = xs + ys
    lim = d.min() + (d.max() - d.min()) * frac
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    band = edge & ((xx + yy) <= lim)
    # not on the very first diagonal pixel run's ends: trim 1px stubs
    s.decal(band, 3, on=[pid])


def stalk(s, ctrl, w0, w1, merge=(), k=2, vein=True):
    """A tapered petiole stroke through ctrl (w0 at the start, w1 at the end)."""
    path = bez(ctrl, 40)
    m = s.stroke(path, (w0, w1), cap=True)
    pid = s.part(m, base=2, k=k, line=0 if not merge else None, merge=merge)
    if vein:
        s.decal(s.line1(path[6:-8]), 1, on=[pid])
    return pid, m


def fist(s, hx, hy, L, ang, flip=True, bristle=0):
    """A side trap clenched shut."""
    return trap(s, hx, hy, L, ang=ang, au=0.10, al=0.06, thick=0.55, teeth=3, tlen=2, flip=flip,
                hl=True, bristle=bristle)


def cast_shadow(s, n0, on, depth=2, xr=None):
    """The head's black cast shadow on the neck: body pixels of parts `on`
    lying 1..depth px below any part drawn after part id n0 (the head)."""
    shift = pix.shift
    head = (s.pid > n0) & (s.tone >= 0)
    below = np.zeros_like(head)
    for d in range(1, depth + 1):
        below |= shift(head, 0, -d)
    m = below & ~head & np.isin(s.pid, list(on))
    if xr is not None:
        xx = np.arange(s.w)[None, :]
        m &= (xx >= xr[0]) & (xx < xr[1])
    s.decal(m, 0)


def shell_back(s, hx, hy, L, ang, W=None, cilia_n=5, hl=True):
    """A trap seen from behind and above: the two OUTER lobes side by side,
    the hinge between them, a red vein down each lobe, white cilia peeking
    past the far rims, and a specular on the lit lobe."""
    W = W or L * 0.9
    dx, dy = math.cos(ang), math.sin(ang)
    nx, ny = -dy, dx
    ids = []
    for side in (1, -1):
        cx = hx + dx * L * 0.52 + nx * side * W * 0.24
        cy = hy + dy * L * 0.52 + ny * side * W * 0.24
        m = s.ellipse(cx, cy, L * 0.52, W * 0.30, ang=ang + side * 0.12)
        hm = None
        if hl and side == -1:
            hm = s.ellipse(cx - dx * L * 0.10 + nx * side * W * 0.10, cy - dy * L * 0.10 + ny * side * W * 0.10,
                           max(1.4, L * 0.16), 1.0, ang=ang)
        pid = s.part(m, base=2, k=3 if side == 1 else 2, line=0, hl=hm)
        ids.append(pid)
        if hl and side == -1:
            rim_white(s, m, pid, 0.30)
        s.decal(s.line1(bez([(hx + dx * 2, hy + dy * 2), (cx + dx * L * 0.3, cy + dy * L * 0.3)], 12)) & erode(m, 1),
                1, on=[pid])
        for j in range(cilia_n):
            a = ang + side * (0.15 + 0.55 * j / max(1, cilia_n - 1))
            ex = cx + (math.cos(a - ang) * L * 0.52) * dx - (math.sin(a - ang) * W * 0.30) * dy
            ey = cy + (math.cos(a - ang) * L * 0.52) * dy + (math.sin(a - ang) * W * 0.30) * dx
            seg = [(ex + math.cos(a) * k, ey + math.sin(a) * k) for k in np.linspace(0.5, 3.4, 8)]
            mm = s.line1(seg) & ~m
            s.px(_mask_px(mm), 3)
    return ids


# ---------------------------------------------------------------------------
# rendering: frames share a canvas; outside the moving region every frame
# takes frame 0's pixels, so only the head can change
# ---------------------------------------------------------------------------

def render_frames(fn, n):
    """Render n front frames; frame k keeps its own pixels only near its
    head (and frame 0's head), everything else is frame 0's."""
    dilate = pix.dilate
    sp = [fn(k) for k in range(n)]
    fr = [tones(x) for x in sp]
    out = [fr[0]]
    for k in range(1, n):
        reg = dilate(sp[0].headm | sp[k].headm, 2, diag=True)
        out.append(np.where(reg, fr[k], fr[0]))
    return out


SELOUT = 0.0   # Crystal keeps a black outline all round; no selout


def tones(s, **kw):
    s.sel = SELOUT
    t = s.finish(**kw)
    out = np.where(t >= 0, t, T).astype(np.uint8)
    return out


def place(frames, size=56, dx=0, region=None):
    """Composite (frame k inside region, frame 0 outside), crop all frames to
    their union bbox and drop it bottom-centred into size x size."""
    f0 = frames[0]
    if region is not None:
        frames = [f0] + [np.where(region, f, f0) for f in frames[1:]]
    on = np.zeros(f0.shape, bool)
    for f in frames:
        on |= f != T
    ys, xs = np.nonzero(on)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    w, h = x1 - x0, y1 - y0
    if w > size or h > size:
        print(f"  !! too big {w}x{h}")
    out = []
    ox = max(0, (size - w) // 2 + dx)
    oy = max(0, size - h)
    for f in frames:
        c = np.full((size, size), T, np.uint8)
        crop = f[y0:y1, x0:x1][-size:, :size - ox]
        c[oy:oy + crop.shape[0], ox:ox + crop.shape[1]] = crop
        out.append(c)
    return out


def moving_boxes(frames):
    f0 = frames[0]
    diff = np.zeros(f0.shape, bool)
    for f in frames[1:]:
        diff |= f != f0
    boxes = []
    for y0 in range(0, f0.shape[0], 2):
        ys, xs = np.nonzero(diff[y0:y0 + 2])
        if len(xs):
            boxes.append((int(xs.min()), y0 + int(ys.min()), int(xs.max()) + 1, y0 + int(ys.max()) + 1))
    return boxes


def rect(h, w, x0, y0, x1, y1):
    m = np.zeros((h, w), bool)
    m[max(0, y0):y1, max(0, x0):x1] = True
    return m


# ---------------------------------------------------------------------------
# flytrap_seedling: LUNGING. One little head thrust past its claws. Yawns.
# ---------------------------------------------------------------------------

# jaw keys per front frame: (upper opening, lower opening, head tilt)
SEED_KEYS = [
    (0.62, 0.40, -0.20),   # 0 rest: jaws parted
    (0.80, 0.50, -0.28),   # 1 opening, the head tipping back
    (1.00, 0.62, -0.38),   # 2 the big stretch (held)
    (-0.06, 0.30, 0.0),    # 3 smack shut
]


def front_seedling(f=0):
    au, al, ang = SEED_KEYS[f]
    s = Spr(56, 56, SPAL)
    s.set_tilt(10, 29, 54)
    with s.untilted():
        wing(s, (31, 53), (46, 51), 6.5, bend=-0.14)
    with s.untilted():
        wing(s, (27, 53), (9, 52), 7.5, bend=0.14, rim=0.40)
    path = bez([(29, 54), (34, 46), (32, 37), (27, 30)], 40)
    m = s.stroke(path, lambda t: max(2.5, 10 * math.sin(math.pi * (0.18 + 0.72 * t)) ** 0.8), cap=True)
    pid = s.part(m, base=2, k=2, line=0)
    s.decal(s.line1(path[10:-14]), 1, on=[pid])
    rim_white(s, m, pid, 0.30)
    before = s.tone.copy()
    n0 = s.n
    trap(s, 29, 28, 20, ang=ang, au=au, al=al, thick=0.48, teeth=4, tlen=3)
    cast_shadow(s, n0, [pid])
    s.headm = s.tone != before
    s.contact += [(12, 22), (36, 42)]
    return s


def seedling_frames():
    return place(render_frames(front_seedling, len(SEED_KEYS)), 56, dx=1)


def back_seedling():
    s = Spr(48, 64, SPAL)
    wing(s, (22, 64), (2, 52), 11, bend=0.12, rim=0.40)
    m, path = s.leaf((24, 72), (22, 34), 14, bend=0.16, fat=0.45, blunt=2.5)
    bid = s.part(m, base=2, k=2, line=0)
    s.decal(s.line1(path[6:-12]), 1, on=[bid])
    shell_back(s, 16, 40, 30, -0.75, W=24, cilia_n=4)
    return s


# ---------------------------------------------------------------------------
# young_flytrap: LUNGING. A bigger head on a neck, plus a fist raised behind.
# The lunge bends only the neck above its fixed base.
# ---------------------------------------------------------------------------

# (hinge dx, hinge dy, upper, lower, tilt, bristle)
YOUNG_KEYS = [
    (0, 0, 0.64, 0.42, -0.16, 0),     # 0 rest
    (4, -3, 0.84, 0.56, -0.32, 0),    # 1 wind-up: reared back, jaws wide
    (-5, 2, 0.92, 0.62, 0.02, 1),     # 2 the lunge: thrust, jaws widest
    (-5, 2, -0.06, 0.30, 0.0, 1),     # 3 SNAP (biting down)
    (-2, 1, 0.40, 0.26, -0.22, 0),    # 4 recoil, jaws easing open
]


def front_young(f=0):
    dx, dy, au, al, ang, br = YOUNG_KEYS[f]
    s = Spr(64, 60, SPAL, sc=0.92)
    s.set_tilt(8, 33, 58)
    # the fist: raised high behind, clenched (still in every frame)
    wing(s, (37, 57), (52, 24), 7.5, bend=-0.22, k=2)
    fist(s, 52, 23, 14, ang=-1.05)
    # claws on the ground
    with s.untilted():
        wing(s, (35, 57), (54, 55), 7, bend=-0.12)
    with s.untilted():
        wing(s, (31, 57), (9, 56), 8, bend=0.12, rim=0.40)
    # torso: fixed lower body, then a neck to the hinge
    hx, hy = 31 + dx, 29 + dy
    body_path = bez([(33, 58), (39, 48), (37, 40)], 30)
    bm = s.stroke(body_path, (13, 10), cap=True)
    bid = s.part(bm, base=2, k=2, line=0)
    rim_white(s, bm, bid, 0.30)
    s.decal(s.line1(body_path[6:]), 1, on=[bid])
    before = s.tone.copy()
    neck = bez([(37, 41), (36.5 + dx * 0.3, 35 + dy * 0.4), (hx + 2, hy + 2)], 20)
    nm = s.stroke(neck, (9.5, 7), cap=True)
    nid = s.part(nm, base=2, k=2, line=None, merge={bid})
    s.decal(s.line1(neck[2:-6]), 1, on=[nid])
    n0 = s.n
    trap(s, hx, hy, 26, ang=ang, au=au, al=al, thick=0.46, teeth=5, tlen=3, bristle=br)
    cast_shadow(s, n0, [nid, bid])
    s.headm = s.tone != before
    s.contact += [(12, 24), (40, 50)]
    return s


def young_frames():
    return place(render_frames(front_young, len(YOUNG_KEYS)), 56, dx=0)


def back_young():
    s = Spr(48, 64, SPAL)
    wing(s, (24, 66), (1, 54), 12, bend=0.1, rim=0.40)
    wing(s, (28, 66), (40, 40), 8, bend=-0.15)
    shell_back(s, 38, 40, 13, -1.15, W=11, cilia_n=3, hl=False)
    m, path = s.leaf((22, 74), (19, 36), 16, bend=0.14, fat=0.45, blunt=3)
    bid = s.part(m, base=2, k=2, line=0)
    s.decal(s.line1(path[6:-12]), 1, on=[bid])
    shell_back(s, 14, 40, 31, -0.72, W=26, cilia_n=5)
    return s


# ---------------------------------------------------------------------------
# venus_flytrap: LUNGING (escalated). A huge head, two fists flanking it.
# ---------------------------------------------------------------------------

# (upper, lower, tilt, bristle)
VENUS_KEYS = [
    (0.62, 0.44, -0.12, 0),   # 0 rest: jaws gaping
    (0.78, 0.54, -0.18, 0),   # 1 gape wider, rearing
    (0.94, 0.64, -0.24, 1),   # 2 gape max, cilia flared (held)
    (-0.06, 0.30, 0.10, 1),   # 3 SNAP (biting down)
    (-0.06, 0.30, 0.10, 3),   # 4 shut, cilia bristling
    (0.34, 0.22, -0.16, 0),   # 5 easing open
]


def front_adult(f=0):
    au, al, ang, br = VENUS_KEYS[f]
    s = Spr(72, 64, SPAL, sc=0.79)
    s.set_tilt(6, 34, 63)
    wing(s, (40, 62), (52, 23), 8, bend=-0.22)
    fist(s, 52, 22, 16, ang=-1.15)
    wing(s, (40, 62), (53, 46), 7, bend=-0.1)
    fist(s, 53, 45, 12, ang=0.45)
    with s.untilted():
        wing(s, (37, 62), (56, 60), 8, bend=-0.12)
    with s.untilted():
        wing(s, (31, 62), (8, 60), 9, bend=0.12, rim=0.40)
    path = bez([(34, 63), (40, 52), (38, 41), (34, 33)], 40)
    m = s.stroke(path, lambda t: max(2.5, 16 * math.sin(math.pi * (0.18 + 0.72 * t)) ** 0.8), cap=True)
    pid = s.part(m, base=2, k=2, line=0)
    s.decal(s.line1(path[10:-14]), 1, on=[pid])
    rim_white(s, m, pid, 0.30)
    before = s.tone.copy()
    n0 = s.n
    trap(s, 36, 31, 34, ang=ang, au=au, al=al, thick=0.42, teeth=7, tlen=4, bristle=br)
    cast_shadow(s, n0, [pid])
    s.headm = s.tone != before
    s.contact += [(8, 22), (40, 54)]
    return s


def adult_frames():
    return place(render_frames(front_adult, len(VENUS_KEYS)), 56, dx=0)


def back_adult():
    s = Spr(52, 64, SPAL)
    wing(s, (20, 66), (7, 40), 9, bend=0.15, rim=0.40)
    shell_back(s, 7, 40, 13, -1.9, W=11, cilia_n=3, hl=False)
    wing(s, (30, 66), (44, 48), 9, bend=-0.1)
    shell_back(s, 43, 48, 12, -0.3, W=10, cilia_n=3, hl=False)
    m, path = s.leaf((26, 76), (22, 38), 18, bend=0.12, fat=0.45, blunt=3.0)
    bid = s.part(m, base=2, k=2, line=0)
    s.decal(s.line1(path[6:-12]), 1, on=[bid])
    shell_back(s, 17, 40, 33, -0.7, W=28, cilia_n=6)
    return s


def back_frame(fn, maxw=45):
    """Render a back on a padded canvas (scaled down until it fits 48 wide),
    centred and cut by the bottom edge."""
    old = (Spr.pad, Spr.extra_sc)
    try:
        Spr.pad, Spr.extra_sc = 12, 1.0
        for _ in range(4):
            s = fn()
            s.sel = SELOUT
            t = s.finish(open_bottom=True)
            xs = np.nonzero((t >= 0).any(0))[0]
            if xs.max() - xs.min() + 3 <= maxw:
                break
            Spr.extra_sc *= (maxw - 0.5) / (xs.max() - xs.min() + 3)
    finally:
        Spr.pad, Spr.extra_sc = old
    t = np.where(t >= 0, t, T).astype(np.uint8)
    ys, xs = np.nonzero(t != T)
    c = t[ys.min():ys.min() + 48, xs.min():xs.max() + 1]
    out = np.full((48, 48), T, np.uint8)
    ox = (48 - c.shape[1]) // 2
    out[48 - c.shape[0]:, ox:ox + c.shape[1]] = c
    return out


# ---------------------------------------------------------------------------
# icons (16x16, '.' = clear): k outline, 1 red, 2 green, 3 white. Frame 2
# is a chomp: the jaws shut on a row of white teeth (the follower snaps as
# it walks); the body below the head is the same in both frames.
# ---------------------------------------------------------------------------

ICONS = {
    "flytrap_seedling": ([
        "................",
        "................",
        "....kkkkk.......",
        "...k22232k......",
        "..k2222222k.....",
        ".k3kkkkk22k.....",
        "..k3k3k1k2k.....",
        "..k11111k2k.....",
        ".k3k3k3k22k.....",
        "..kkkkk222k.....",
        "......k22k......",
        "......k21k......",
        "..kkk.k21k.kk...",
        ".k2322k221k22k..",
        "..kk22k2211k1k..",
        "....kkkkkkkkk...",
    ], [
        "................",
        "................",
        "................",
        "....kkkkk.......",
        "...k22232k......",
        "..k2222222k.....",
        ".k3kkkkkk2k.....",
        "..k3k3k1222k....",
        "..k22222222k....",
        "...kkkkk22k.....",
        "......k22k......",
        "......k21k......",
        "..kkk.k21k.kk...",
        ".k2322k221k22k..",
        "..kk22k2211k1k..",
        "....kkkkkkkkk...",
    ]),
    "young_flytrap": ([
        "..........k.k...",
        "....kkkkkk3k3k..",
        "..kk222322k22k..",
        ".k22222222k12k..",
        "k3kkkkkk222k2k..",
        ".k3k3k3k122kk2k.",
        ".k1111111k22k2k.",
        ".k111111k122k2k.",
        "k3k3k3kk2222k2k.",
        ".kkkkk22222kk2k.",
        "......k2221k2k..",
        "......k2211kk...",
        ".kkk..k2211k.kk.",
        "k2322kk22111k22k",
        ".kk22k2221111k1k",
        "...kkkkkkkkkkkk.",
    ], [
        "..........k.k...",
        "..........k3k3k.",
        ".....kkkkkkk22k.",
        "...kk222322kk2k.",
        "..k222222222k2k.",
        ".k3kkkkkkkk2k2k.",
        "..k3k3k3k1222k2k",
        "..k222222222kk2k",
        "...kkk22222kk2k.",
        "......k2221k2k..",
        "......k2221kk...",
        "......k2211k....",
        ".kkk..k2211k.kk.",
        "k2322kk22111k22k",
        ".kk22k2221111k1k",
        "...kkkkkkkkkkkk.",
    ]),
    "venus_flytrap": ([
        "...kkkkkk..k.k..",
        ".kk2223222kk3k3k",
        "k2222222222kk22k",
        "3kkkkkk22222k12k",
        "k3k3k3k1k222kk2k",
        "k111111kk222kk2k",
        "k1111111k122k2k.",
        "k11111111k22k2k.",
        "3k3k3k3k1122kk..",
        "kkkkkkk222222kkk",
        "....k22222221k3k",
        "....k2222211kkk.",
        "kkk..k222111k...",
        "2322kk2221111kk.",
        "k22k22k2111111k.",
        ".kkkkkkkkkkkkk..",
    ], [
        "...........k.k..",
        "..........kk3k3k",
        "...kkkkkkk.kk22k",
        ".kk22232222kk12k",
        "k22222222222k2k.",
        "k22222222222k2k.",
        "3kkkkkkkkk22k2k.",
        "k3k3k3k3k1222kk.",
        ".k22222222222k..",
        "..kkkk2222222kkk",
        "....k22222221k3k",
        "....k2222211kkk.",
        "kkk..k222111k...",
        "2322kk2221111kk.",
        "k22k22k2111111k.",
        ".kkkkkkkkkkkkk..",
    ]),
}


def icon_arr(rows):
    mp = {"k": 0, "1": 1, "2": 2, "3": 3}
    a = np.full((16, 16), T, np.uint8)
    for y, r in enumerate(rows):
        if len(r) > 16: print("  !! icon row", repr(r))
        for x, ch in enumerate(r[:16]):
            if ch in mp:
                a[y, x] = mp[ch]
    return a


# ---------------------------------------------------------------------------

ANIM = {
    # a yawn: open slowly, the long stretch, a little smack, rest
    "flytrap_seedling": {"intro": [[0, 8], [1, 8], [2, 24], [1, 4], [3, 8], [0, 8]],
                         "idle": [[0, 96], [1, 10]]},
    # a lunge: wind-up (anticipation), 4-tick strike, SNAP hold, recoil
    "young_flytrap": {"intro": [[0, 6], [1, 16], [2, 4], [3, 18], [4, 8], [0, 6]],
                      "idle": [[0, 110], [4, 8]]},
    # gape, gape, HOLD, SNAP, the cilia bristle twice, ease open
    "venus_flytrap": {"intro": [[0, 6], [1, 6], [2, 20], [3, 4], [4, 5], [3, 4], [4, 5], [3, 8], [5, 6], [0, 2]],
                      "idle": [[0, 120], [1, 10]]},
}

NOTES = {
    "flytrap_seedling": "Gesture: a yawn (the jaws open slowly to a wide stretch, hold, "
                        "a little smack shut, rest). Two-hue case: the trap red lives in the dark slot, so the "
                        "maw is a flat field of index 1 framed by green rims, and the same red is the shadow "
                        "band on every green form; there is no dark green. White = cilia, a wet glint, one "
                        "specular. Sport: 'Akai Ryu' (Red Dragon), the whole plant blood-red.",
    "young_flytrap": "Gesture: a lunge then a snap (wind-up held 16 ticks, a 4-tick "
                     "strike, SNAP held, recoil). Only the head and the neck above its base move; the claws, "
                     "body and the raised fist stay pixel-identical. Learned: anticipation is what sells the "
                     "strike; without the wind-up the snap reads as a flicker. Sport: 'Akai Ryu'.",
    "venus_flytrap": "Gesture: the jaws gape, gape wider, HOLD (20 ticks), SNAP shut and "
                     "the cilia bristle twice, then ease open. Learned: the shut trap needs a black seam and "
                     "interlocked white cilia to read as a mouth and not a pod; the bristle frame is the same "
                     "shut head with the cilia 2-3px longer and splayed. Sport: 'Akai Ryu'.",
}


def build():
    """Write the three base bundles."""
    build_all(write=True)


def build_all(write=True):
    out = {}
    specs = {
        "flytrap_seedling": (seedling_frames, back_seedling),
        "young_flytrap": (young_frames, back_young),
        "venus_flytrap": (adult_frames, back_adult),
    }
    for sid, (ffn, bfn) in specs.items():
        front = ffn()
        back = back_frame(bfn)
        icons = [icon_arr(r) for r in ICONS[sid]]
        out[sid] = (front, back, icons)
        if write:
            write_species(sid, palette=PAL, sport=SPORT, front=front, back=[back], icon=icons,
                          anim=ANIM[sid], moving=moving_boxes(front), notes=NOTES[sid], tool=TOOL)
    return out


def preview(out, path):
    k = 4
    rows = []
    for sid, (front, back, icons) in out.items():
        ims = [to_rgba(f, PAL) for f in front] + [to_rgba(back, PAL)] + [to_rgba(i, PAL) for i in icons]
        rows.append(ims)
    W = max(sum(im.shape[1] * k + 8 for im in r) for r in rows) + 8
    H = len(rows) * (56 * k + 8) + 8
    sheet = Image.new("RGB", (W, H), (200, 208, 192))
    for r, ims in enumerate(rows):
        x = 8
        for a in ims:
            im = Image.fromarray(a, "RGBA")
            im = im.resize((im.width * k, im.height * k), Image.NEAREST)
            sheet.paste(im, (x, 8 + r * (56 * k + 8) + 56 * k - im.height), im)
            x += im.width + 8
    sheet.save(path)
    return path


if __name__ == "__main__":
    if "--preview" in sys.argv:
        out = build_all(write=False)
        print(preview(out, sys.argv[-1] if sys.argv[-1].endswith(".png") else "/tmp/flytrap_preview.png"))
    else:
        build_all(write=True)
        for sid in IDS:
            intro_strip(sid)
        print("review sheet:", review_sheet(IDS, HERE.parent / "review" / "crystal_flytrap.png"))
