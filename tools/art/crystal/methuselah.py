"""Original Crystal-rule Pinus longaeva (Great Basin bristlecone pine): methuselah.

methuselah (adult, single-stage mythical), LOOMING: a gnarled, wind-twisted
trunk of bare, polished silver deadwood, planted on spreading root feet,
rising in a reverse C and splitting into contorted limbs. The lead limb
reaches up and out over the foe; the leader ends in a bare, sharp dead snag
at the top; a rear limb climbs to the right. One living strip of bark (the
narrow strip of living tissue old bristlecones keep) spirals up the trunk
from the roots into the lead limb, scaly with black fissures. The living
limbs end in dense bottlebrush tufts of short, dark needles, upturned at
their tips, with a few small purple cones; frost glints on the deadwood.

Intro: frost glints travel up the deadwood (from the roots along the trunk
and out the limbs) while the needle tufts sway (back, out over the foe,
hold, rebound), then it settles. The trunk, roots and snag stay registered.
Two tones: a weathered silver-lilac mid (the deadwood, the bark strip, the
cones, the needles' lit tips) over a needle green-black dark slot (the
tufts, the wood's shade); the polish is white streaks along the grain. The
bark strip is drawn in outline and mid (scaly black fissures), so no third
hue is needed.
Faces: the grain is long lines that run with the limbs and out to their
outline, never a closed knot; bark fissures are short bars joined to the
strip's outline; no enclosed dark dots anywhere (no_dots).
Sport: Pinus aristata (Rocky Mountain bristlecone), a close relative's
palette, stated as such; see docs/SPORTS.md.
Self-score (docs/CREATURES.md section 9): 8.
No sprite from any other game is copied, traced or imported.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _d_kit import BLACK, WHITE, T, Spr, bez, hop, icon_arr, moving_boxes, shift, tones  # noqa: E402
from aspen import across, finish  # noqa: E402

TOOL = "tools/art/crystal/methuselah.py"
SID = "methuselah"
PAL = [BLACK, "#2c5040", "#b8b0c8", WHITE]
SPORT = [BLACK, "#306030", "#c8b8a0", WHITE]
SPAL = tuple(PAL[1:])
SWAY = [0.0, 1.0, -2.2, -1.2, 0.4]           # tufts' sway per front frame (- = out over the foe)
FROST = [0.0, 0.18, 0.4, 0.62, 0.84]         # the frost glints' travel along the deadwood per frame
ANIM = {"intro": [[0, 6], [1, 12], [2, 6], [3, 16], [4, 12], [0, 8]],
        "idle": [[0, 150], [1, 10], [0, 6]]}


# ------------------------------------------------------------- parts ------

def deadwood(s, ctrl, width, twist=0.16, phase=0.0, n=60, cap=True, shade=0.68, period=5.0):
    """A limb of bare, polished deadwood: the silver mid tone, a dark
    crescent down its shaded (right) side, and twisted grain: long streaks
    that run with the limb and drift slowly across it (so each enters and
    leaves through the outline, never a closed knot). Each streak is a
    black grain line with a white polish streak beside it on the lit side.
    Returns (part id, mask, path, half-widths)."""
    path = bez(ctrl, n)
    m = s.stroke(path, width, cap=cap)
    pid = s.part(m, base=2, k=0, line=0)
    if callable(width):
        hws = [width(i / (len(path) - 1)) / 2 for i in range(len(path))]
    else:
        w0, w1 = (width if isinstance(width, tuple) else (width, width))
        hws = [(w0 + (w1 - w0) * i / (len(path) - 1)) / 2 for i in range(len(path))]
    u, a = across(s, m, path, hws)
    hw = np.array(hws)
    x = u * np.interp(a, np.linspace(0, a.max() + 1e-6, len(hw)), hw)
    g = (x + twist * a + phase) % period
    s.decal(m & (u > shade), 1, on=[pid])
    # the lit side is polished: white streaks along the grain
    s.decal(m & (g >= period - 3.0) & (u < 0.2) & (u > -0.8) & (a > 1.0), 3, on=[pid])
    # black grain lines on the turning middle of the limb only
    s.decal(m & (g < 0.9) & (u > -0.2) & (u <= shade) & (a > 2.0) & (hw.max() > 3.5), 0, on=[pid])
    return pid, m, path, hws


def bark_strip(s, ctrl, width, on, n=60):
    """The one living strip of bark: a scaly band in the mid tone edged in
    black (no polish, so it reads darker and rougher than the deadwood),
    notched by short black fissure bars running in from its shaded edge.
    Drawn only over the part ids `on` (the trunk)."""
    path = bez(ctrl, n)
    m = s.stroke(path, width, cap=False)
    m &= np.isin(s.pid, list(on))
    pid = s.part(m, base=2, k=0, line=0)
    hws = [width / 2] * len(path)
    u, a = across(s, m, path, hws)
    # scaly plates: rows of short mid plates split by black fissures, the
    # plates of each row offset like laid bricks
    row = np.floor(a / 2.5).astype(int)
    bar = (a % 2.5) < 1.0
    split = np.abs(u - np.where(row % 2 == 0, -0.15, 0.35)) < 0.22
    s.decal(m & (bar | split) & (a > 0.5), 0, on=[pid])
    return pid


def needle_star(s, cx, cy, r, a0=0.0, frost=True):
    """One whorl of a bottlebrush: a starburst of short dark needles (a
    many-pointed star, so the silhouette bristles); on its lit upper-left
    half each needle is a mid-tone ray, on its shaded half black splits
    part the needles, and one lit needle carries a white frost fleck."""
    n = max(6, round(1.1 * r + 2))
    pts = []
    for i in range(2 * n):
        a = a0 + i * math.pi / n
        rr = r if i % 2 == 0 else r * 0.5
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    m = s.poly(pts)
    pid = s.part(m, base=1, k=0, line=0)
    for i in range(n):
        a = a0 + 2 * math.pi * i / n
        lit = math.cos(a) * 0.6 + math.sin(a) * 0.8
        ray = s.line1([(cx + 0.5 + r * 0.3 * math.cos(a), cy + 0.5 + r * 0.3 * math.sin(a)),
                       (cx + 0.5 + r * 0.8 * math.cos(a), cy + 0.5 + r * 0.8 * math.sin(a))])
        if lit < -0.45:
            s.decal(ray, 2, on=[pid])
        b = a + math.pi / n
        if math.cos(b) * 0.6 + math.sin(b) * 0.8 > 0.35:
            s.decal(s.line1([(cx + 0.5 + r * 0.45 * math.cos(b), cy + 0.5 + r * 0.45 * math.sin(b)),
                             (cx + 0.5 + r * 0.6 * math.cos(b), cy + 0.5 + r * 0.6 * math.sin(b))]), 0, on=[pid])
    if frost:
        i = min(range(n), key=lambda i: math.cos(a0 + 2 * math.pi * i / n) * 0.6
                + math.sin(a0 + 2 * math.pi * i / n) * 0.8)
        a = a0 + 2 * math.pi * i / n
        s.decal(s.line1([(cx + 0.5 + r * 0.55 * math.cos(a), cy + 0.5 + r * 0.55 * math.sin(a)),
                         (cx + 0.5 + r * 0.8 * math.cos(a), cy + 0.5 + r * 0.8 * math.sin(a))]), 3, on=[pid])
    return pid, m


def bottlebrush(s, ctrl, width=8.0, tooth=2.8, depth=2.6, frost=True, n=80):
    """A dense bottlebrush tuft of short needles clothing the end of a twig:
    one dark cylinder whose two flanks are saw-toothed with needle points
    swept toward its upturned tip, so the silhouette bristles at 1x. On the
    lit flank each needle point carries a short mid-tone needle stroke; on
    the shaded flank black splits part the needles; a few white frost flecks
    sit on lit needle tips. Returns (part id, mask)."""
    path = bez(ctrl, n)
    P = np.array(path)
    seg = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]
    L = seg[-1]
    tang = np.gradient(P, axis=0)
    tang /= np.linalg.norm(tang, axis=1, keepdims=True) + 1e-9
    nrm = np.stack([-tang[:, 1], tang[:, 0]], 1)
    k = max(3, int(round(L / tooth)))
    sides = {1: [], -1: []}
    tips = {1: [], -1: []}
    for sd in (1, -1):
        for j in range(2 * k + 1):
            d = L * j / (2 * k)
            i = int(np.searchsorted(seg, d).clip(0, len(path) - 1))
            t = d / L
            hw = width / 2 * (1.0 - 0.45 * t ** 1.5)
            on_tip = j % 2 == 1
            r = hw if on_tip else max(0.8, hw - depth)
            fwd = 1.2 if on_tip else 0.0
            x = P[i, 0] + nrm[i, 0] * r * sd + tang[i, 0] * fwd
            y = P[i, 1] + nrm[i, 1] * r * sd + tang[i, 1] * fwd
            sides[sd].append((x, y))
            if on_tip:
                tips[sd].append((i, x, y))
    tx, ty = tang[-1]
    ex, ey = P[-1, 0] + tx * 2.0, P[-1, 1] + ty * 2.0
    b0 = (P[0, 0] - tang[0, 0] * 1.0, P[0, 1] - tang[0, 1] * 1.0)
    poly = [b0] + sides[1] + [(ex, ey)] + sides[-1][::-1]
    m = s.poly(poly)
    pid = s.part(m, base=1, k=0, line=0)
    # the needle tips facing the light catch it: a mid-tone rim on the
    # tuft's top-left edges, inset from the black outline
    edge = m & (~shift(m, 0, -1) | ~shift(m, -1, 0))
    s.decal(edge & ~(~shift(m, 0, 1) | ~shift(m, 1, 0)), 2, on=[pid])
    # which flank faces the light (up-left)?
    mid = len(path) // 2
    lit_sd = 1 if (nrm[mid, 0] * 0.8 + nrm[mid, 1] * 0.55) < 0 else -1
    for sd in (1, -1):
        for q, (i, x, y) in enumerate(tips[sd]):
            ax, ay = P[i, 0] + nrm[i, 0] * 0.6 * sd, P[i, 1] + nrm[i, 1] * 0.6 * sd
            if sd == lit_sd:
                s.decal(s.line1([(ax + (x - ax) * 0.4 + 0.5, ay + (y - ay) * 0.4 + 0.5),
                                 (x - (x - ax) * 0.12 + 0.5, y - (y - ay) * 0.12 + 0.5)]), 2, on=[pid])
                if frost and q % 2 == 1:
                    s.decal(s.line1([(x - (x - ax) * 0.3 + 0.5, y - (y - ay) * 0.3 + 0.5)]), 3, on=[pid])
            elif q % 2 == 0:
                # a black split in the notch before this needle, running in from the outline
                j = max(0, i - int(len(path) * tooth / (2 * L)))
                nx_, ny_ = nrm[j]
                hw = width / 2 * (1.0 - 0.45 * (seg[j] / L) ** 1.5)
                s.decal(s.line1([(P[j, 0] + nx_ * (hw - depth) * sd + 0.5, P[j, 1] + ny_ * (hw - depth) * sd + 0.5),
                                 (P[j, 0] + nx_ * (hw - depth - 1.5) * sd + 0.5,
                                  P[j, 1] + ny_ * (hw - depth - 1.5) * sd + 0.5)]), 0, on=[pid])
    return pid, m


def cone(s, x, y, size=1.0):
    """A small purple bristlecone cone hanging under a tuft: an ovoid of
    scales in the mid tone, a dark crescent bottom-right, two black scale
    seams joined to its outline, a white glint on the lit shoulder."""
    m = s.ellipse(x, y, 1.9 * size, 2.7 * size, ang=0.3)
    pid = s.part(m, base=2, k=0, line=0)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    (cx, cy), = s.T([(x, y)])
    lit = (xx + 0.5 - cx) * 0.6 + (yy + 0.5 - cy) * 0.8
    s.decal(m & (lit > 0.9 * size), 1, on=[pid])
    s.decal(m & (lit < -0.9 * size) & (yy + 0.5 < cy), 3, on=[pid])
    return pid


def sparkle(s, x, y, big=False, on=None):
    """A frost glint: a small white four-point star, painted only on the
    deadwood parts `on` (it never lands on the bark strip, a tuft or the
    air, so it is never a white dot beside a dark spot)."""
    pts = [(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)]
    if big:
        pts += [(x - 2, y), (x + 2, y), (x, y - 2), (x, y + 2)]
    (ox, oy), = s.T([(0.0, 0.0)])
    m = np.zeros((s.h, s.w), bool)
    for px_, py_ in pts:
        xx, yy = int(math.floor(px_ + 0.5 + ox)), int(math.floor(py_ + 0.5 + oy))
        if 0 <= xx < s.w and 0 <= yy < s.h:
            m[yy, xx] = True
    s.decal(m, 3, on=on, lock=True)


def soil(s, left, right, top=52.5):
    m = s.poly([(left, 55.5), (left + 3, top + 1.5), (left + 8, top), (right - 8, top),
                (right - 3, top + 1.5), (right, 55.5)])
    pid = s.part(m, base=1, k=0, line=0)
    s.decal(s.line1([(left + 5, top + 2.5), (left + 9, top + 1.5)]), 2, on=[pid])
    return pid


def path_pt(ctrl, t, n=60):
    p = bez(ctrl, n)
    return p[min(len(p) - 1, int(t * (len(p) - 1)))]


def rot_ctrl(ctrl, deg, px, py):
    """Rotate control points about (px, py) by deg (+ = clockwise on screen)."""
    r = math.radians(deg)
    c, s_ = math.cos(r), math.sin(r)
    return [(px + (x - px) * c - (y - py) * s_, py + (x - px) * s_ + (y - py) * c) for x, y in ctrl]


# ------------------------------------------------------------- the tree ---

# windswept: the wind comes from the right, so the snag, the limbs and every
# bottlebrush stream up and to the left, over the foe
TRUNK = [(36.0, 56.0), (37.0, 45.0), (32.0, 34.0), (24.0, 27.0)]
LEAD = [(26.0, 29.0), (18.0, 25.5), (10.0, 24.5), (4.0, 21.0)]       # the lead limb, out over the foe
SNAG = [(26.0, 29.0), (25.0, 19.0), (21.0, 9.0), (15.0, 1.0)]        # the bare dead snag
REAR = [(35.0, 37.0), (42.0, 32.0), (46.0, 25.0), (47.0, 18.0)]
ROOTS = [
    ([(33.0, 50.0), (24.0, 52.5), (14.0, 55.5)], lambda t: 7.0 - 3.5 * t),
    ([(40.0, 50.0), (47.0, 52.5), (54.0, 55.5)], lambda t: 7.0 - 3.5 * t),
]
# the bottlebrush tufts: (ctrl, width), back first; each sways about its foot
TUFTS = [
    [(47.0, 19.0), (45.5, 11.0), (41.5, 4.5)],
    [(44.5, 28.0), (39.0, 22.0), (34.0, 18.5)],
    [(19.0, 25.0), (15.0, 16.5), (9.5, 10.0)],
    [(11.0, 24.0), (6.5, 17.5), (2.0, 13.0)],
    [(5.0, 21.5), (2.5, 27.5), (2.0, 33.0)],
]
TUFT_W = [9.5, 8.5, 10.0, 9.5, 8.0]
CONES = [(10.0, 30.5), (50.0, 29.5)]


def gnarled(w0, w1, bumps=2.5, amp=0.14, ph=0.0):
    """A width profile that tapers from w0 to w1 with knobbly swellings."""
    return lambda t: (w0 + (w1 - w0) * t) * (1.0 + amp * math.sin(2 * math.pi * (bumps * t + ph)))


def tree(s, sway=0.0, frost=0.0):
    s.ox = 1.0
    soil(s, 12, 56)
    for ctrl, w in ROOTS:
        deadwood(s, ctrl, w, phase=1.0)
    rear = deadwood(s, REAR, gnarled(6.0, 3.4, 2.0, 0.12, 0.2), phase=0.5)
    snag = deadwood(s, SNAG, gnarled(7.0, 1.4, 1.5, 0.1, 0.0), twist=0.25, phase=1.5)
    lead = deadwood(s, LEAD, gnarled(8.5, 4.0, 2.0, 0.14, 0.5), phase=0.0)
    trunk = deadwood(s, TRUNK, gnarled(17.0, 9.0, 1.5, 0.08, 0.25), twist=0.3, phase=0.0)
    # the living strip spirals up the trunk from the root into the lead limb
    bark_strip(s, [(29.0, 57.0), (31.5, 50.0), (38.0, 44.0), (42.0, 40.0)], 5.0, on=[trunk[0]])
    bark_strip(s, [(28.0, 34.0), (25.5, 29.5), (17.0, 26.0), (10.0, 24.0)], 4.0,
               on=[trunk[0], lead[0]])
    for ctrl, w in zip(TUFTS, TUFT_W):
        px, py = ctrl[0]
        bottlebrush(s, rot_ctrl(ctrl, sway * 3.0, px, py), w)
    for x, y in CONES:
        cone(s, x, y, 1.25)
    # frost glints travel up the deadwood: the trunk, the snag, the lead limb
    wood = [p[0] for p in (rear, snag, lead, trunk)]
    for ctrl, t0, big in ((TRUNK, 0.1, True), (SNAG, 0.2, False), (LEAD, 0.35, False), (TRUNK, 0.6, False)):
        t = (t0 + frost) % 1.0
        x, y = path_pt(ctrl, t)
        sparkle(s, int(round(x - 1.5)), int(round(y)), big, on=wood)


def front(fr=0):
    s = Spr(56, 56, SPAL)
    tree(s, SWAY[fr], FROST[fr])
    return finish(s)


# ----------------------------------------------------------------- back ---

def back():
    """Behind and above: the twisted trunk rising toward the top-right (the
    foe), the snag and the limbs and their bottlebrush tufts streaming that
    way, the bark strip spiralling up the trunk's near side; the bottom
    edge cuts the trunk off."""
    s = Spr(48, 48, SPAL)
    left = deadwood(s, [(21.0, 34.0), (11.0, 29.0), (5.0, 22.0)], gnarled(8.5, 5.0, 1.5, 0.12), phase=1.0)
    snag = deadwood(s, [(28.0, 26.0), (30.0, 15.0), (34.0, 7.0), (39.0, 1.0)], gnarled(7.0, 1.6, 1.2, 0.1),
                    twist=0.25, phase=0.5)
    lead = deadwood(s, [(29.0, 27.0), (37.0, 25.0), (43.0, 20.0)], gnarled(8.0, 4.4, 1.5, 0.12, 0.3))
    trunk = deadwood(s, [(20.0, 50.0), (18.5, 40.0), (23.0, 31.0), (30.0, 24.0)], gnarled(24.0, 12.0, 1.2, 0.08),
                     twist=0.3)
    bark_strip(s, [(11.0, 49.0), (15.0, 43.0), (24.0, 38.0), (29.0, 33.0)], 5.5, on=[trunk[0]])
    for ctrl, w in (([(7.0, 22.0), (8.0, 12.0), (12.5, 4.0)], 12.0),
                    ([(4.0, 28.0), (2.5, 36.0), (3.0, 42.0)], 9.0),
                    ([(14.0, 29.0), (18.0, 20.0), (23.5, 14.0)], 11.0),
                    ([(42.0, 21.0), (44.0, 12.0), (44.5, 3.5)], 12.0),
                    ([(36.0, 25.0), (39.0, 16.0), (39.5, 9.0)], 10.0)):
        bottlebrush(s, ctrl, w)
    cone(s, 45.5, 26.0, 1.4)
    wood = [p[0] for p in (left, snag, lead, trunk)]
    sparkle(s, 19, 44, True, on=wood)
    sparkle(s, 31, 13, on=wood)
    return finish(s, open_bottom=True)


# ---------------------------------------------------------------- icon ----

# the silver trunk twisting up on root feet, a bare snag on top, the dark
# windswept crown of bottlebrush tufts streaming out left over the foe
ICON = [
    "..22.....3......",
    ".2211...32......",
    ".21111..32...22.",
    ".21111.322..2211",
    "..1111k322..2111",
    ".211111322k.111.",
    ".21111k3232k1k..",
    "..11kk.k3232k...",
    "........k3232...",
    ".......k32322...",
    "......k3233221..",
    ".....k32322221..",
    "...k3232k32221..",
    "..k32...k32221k.",
]


def icon():
    rows = [r[:16].ljust(16, ".") for r in ICON]
    return icon_arr(rows + ["." * 16])


def render():
    fs = [front(f) for f in range(len(SWAY))]
    ic = icon()
    return fs, back(), [ic, hop(ic)]


def lead_layout():
    """The lead's layout for the post-game ancients: each species' front,
    back and icon at 3x in one row (plus 1x):
    tools/art/review/ancients_lead_layout.png and ancients_1x.png."""
    from kit import to_rgba
    import centuryheart
    items = [(centuryheart.SID, centuryheart.render(), centuryheart.PAL), (SID, render(), PAL)]
    folder = Path(__file__).resolve().parent.parent / "review"
    folder.mkdir(exist_ok=True)
    for scale, fname in ((1, "ancients_1x.png"), (3, "ancients_lead_layout.png")):
        sheet = Image.new("RGB", (128 * len(items) * scale, 56 * scale), (200, 208, 200))
        for n, (sid, (fs, b, icons), pal) in enumerate(items):
            for x, arr in ((0, fs[0]), (56, b), (104, icons[0])):
                im = Image.fromarray(to_rgba(arr, pal), "RGBA")
                im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                sheet.paste(im, ((128 * n + x) * scale, 56 * scale - im.height), im)
        sheet.save(folder / fname)


def build():
    from kit import intro_strip, write_species
    art = render()
    fs, b, icons = art
    write_species(SID, palette=PAL, sport=SPORT, front=fs, back=[b], icon=icons,
                  anim=ANIM, moving=moving_boxes(fs), tool=TOOL,
                  notes="Crystal rule. Pinus longaeva (Great Basin bristlecone pine). LOOMING: a gnarled, "
                  "wind-twisted trunk of bare, polished silver deadwood on spreading root feet, splitting "
                  "into contorted limbs: the lead limb reaches out over the foe, the leader ends in a bare "
                  "dead snag at the top, a rear limb climbs to the right. One living strip of bark spirals "
                  "up the trunk into the lead limb (outline and mid: scaly black fissures). The living limbs "
                  "end in dense bottlebrush tufts of short dark needles with small purple cones; frost "
                  "glints on the deadwood. Gesture: frost glints travel up the deadwood while the needle "
                  "tufts sway out over the foe, hold, rebound and settle; trunk, roots and snag stay fixed. "
                  "Weathered silver-lilac mid over a needle green-black dark slot; the polish is white "
                  "streaks along the grain. Sport: Pinus aristata (Rocky Mountain bristlecone), a close "
                  "relative's palette.",
                  credits="Original geometry drawn for Verdant Reach under the Crystal rule "
                  "(docs/CREATURES.md). Botanical reference: Pinus longaeva, "
                  "https://en.wikipedia.org/wiki/Pinus_longaeva . "
                  "No sprite from any other game was copied, traced or imported.")
    intro_strip(SID)
    lead_layout()


if __name__ == "__main__":
    build()
