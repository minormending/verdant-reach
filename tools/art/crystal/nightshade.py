"""Original Crystal-rule Atropa belladonna (deadly nightshade): nightshade_sprout -> nightshade.

nightshade_sprout (teen size class, stage 1 of 2), BRACED: a low, wide, dark
green sprout of soft oval leaves crouched over its own black shadow pool.
The big lead leaf is raised across the front like a shield, the head leaf
leans toward the foe, and one closed dull-purple bell bud hangs on a curved
stalk below the lead leaf.
nightshade (adult), LOOMING: a bushy plant on a short thick stem whose
arching branches and soft pointed leaves overhang the foe. Dull purple bell
flowers (tinged green toward the base, as the real corolla is) hang beneath
the leaves; shiny black berries, each set in a green star-shaped calyx, hang
in two clusters of three or more.

Intro: the sprout's bud swings on its stalk while the lead leaf lifts; the
adult's bells sway and the front berry cluster swings, hold, rebound and
settle. Stems, leaves and the shadow stay registered.
Two tones: a deep green dark slot (leaves, stems, calyces, the bells' green
base) under a dull violet mid tone (the bells and the bud). The berries are the outline black with white glints, as the brief
allows.
Faces: berries always hang in clusters of three or more, staggered at
different heights (never two side by side), separated by dark-green lines,
each glint a short off-centre arc one pixel inside the berry's upper-left
curve, and no curved line under them; leaf midribs are white veins that start at the
leaf's base (never a black slit); the bells' mouths are scalloped
silhouettes, not dark openings; no enclosed dark dots (no_dots).
Sport: Atropa belladonna var. lutea, the rare natural form with pale-yellow
flowers and pale-yellow fruit (the black berries cannot change in a sport,
so only the flowers turn pale yellow); see docs/SPORTS.md.
Self-score (docs/CREATURES.md section 9): sprout 8, nightshade 8.
No sprite from any other game is copied, traced or imported.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _d_kit import (BLACK, WHITE, T, Spr, bez, hop, icon_arr, moving_boxes, rim_white,  # noqa: E402
                    shift, tones)
from aspen import no_dots  # noqa: E402

TOOL = "tools/art/crystal/nightshade.py"
IDS = ["nightshade_sprout", "nightshade"]
PAL = [BLACK, "#386838", "#9878a8", WHITE]
# var. lutea: pale-yellow flowers and fruit; the leaf green stays.
SPORT = [BLACK, "#386838", "#d8d080", WHITE]
SPAL = tuple(PAL[1:])

ANIM = {
    IDS[0]: {"intro": [[0, 8], [1, 10], [2, 6], [3, 16], [4, 10], [0, 8]],
             "idle": [[0, 140], [4, 10], [0, 6]]},
    IDS[1]: {"intro": [[0, 8], [1, 10], [2, 6], [3, 16], [4, 10], [0, 8]],
             "idle": [[0, 150], [4, 10], [0, 6]]},
}


# ------------------------------------------------------------ helpers -----

def rot_pt(x, y, ang):
    """Local frame: u across, v down an axis swung `ang` radians (+ = the
    free end swings left, toward the foe)."""
    c, sn = math.cos(ang), math.sin(ang)
    return lambda u, v: (x + u * c - v * sn, y + u * sn + v * c)


def oval(base, tip, w, bend=0.0, point=0.7, n=40):
    """A soft oval leaf polygon from base to tip: round shoulders, a short
    point (point < 1 sharpens the tip). Returns (poly, midrib path)."""
    bx, by = base
    tx, ty = tip
    L = math.dist(base, tip)
    ux, uy = (tx - bx) / L, (ty - by) / L
    nx, ny = -uy, ux
    left, right, mid = [], [], []
    for i in range(n + 1):
        t = i / n
        off = bend * L * 4 * t * (1 - t)
        cx, cy = bx + ux * L * t + nx * off, by + uy * L * t + ny * off
        prof = math.sin(math.pi * min(1.0, t ** 0.85)) ** (0.55 if t < 0.5 else point)
        hw = w / 2 * prof
        left.append((cx + nx * hw, cy + ny * hw))
        right.append((cx - nx * hw, cy - ny * hw))
        mid.append((cx, cy))
    return left + right[::-1], mid


def leaf(s, base, tip, w, bend=0.0, point=0.7, rim=0.35, rib=0.55, line=0, k=1):
    """A deep-green leaf: a black shade crescent on its bottom-right, a 1px
    white glint line just inside its lit top-left edge (one green pixel in
    from the outline, so no silhouette top edge is a white line) and a white
    midrib vein running from its base (light, never a black slit)."""
    poly, mid = oval(base, tip, w, bend, point)
    m = s.poly(poly)
    pid = s.part(m, base=1, k=k, sh_tone=0, line=line)
    if rim:
        inner = erode1(m)
        rim_white(s, inner if inner.sum() > 12 else m, pid, rim)
    if rib:
        n = len(mid)
        s.decal(s.line1(mid[int(n * 0.12):int(n * rib)]) & erode1(m), 3, on=[pid])
    return pid, m


def erode1(m):
    return m & shift(m, 1, 0) & shift(m, -1, 0) & shift(m, 0, 1) & shift(m, 0, -1)


def stem(s, ctrl, w, rim=0.0, n=40, tone=1):
    path = bez(ctrl, n)
    m = s.stroke(path, w, cap=True)
    pid = s.part(m, base=tone, k=1, sh_tone=0, line=0)
    if rim:
        rim_white(s, m, pid, rim)
    return pid, m, path


def bell(s, x, y, ang, scale=1.0, closed=False, ped=2.0):
    """A hanging bell flower from (x, y): a short green pedicel, a green
    star calyx clasping the bell's top, then the dull-violet corolla, green
    toward its base, widening to a scalloped, flared rim (the mouth is the
    silhouette, never a dark opening). `closed` draws the bud: a slim
    spindle that tapers to a point."""
    k = scale
    tr = rot_pt(x, y, ang)

    def P(pts):
        return [tr(u * k, v * k) for u, v in pts]
    s.part(s.stroke(bez(P([(0, 0), (0.3, ped * 0.5), (0, ped)]), 8), 1.6 * k, cap=True), base=1, k=0, line=0)
    top = ped
    if closed:
        L = 8.0
        body = [(-1.2, top), (-2.4, top + 2), (-2.8, top + 4.5), (-2.2, top + 6.5), (-0.8, top + L),
                (0, top + L + 0.6), (0.8, top + L), (2.2, top + 6.5), (2.8, top + 4.5), (2.4, top + 2), (1.2, top)]
    else:
        L = 7.5
        body = [(-1.4, top), (-2.6, top + 2.0), (-3.0, top + 4.5), (-3.4, top + L - 1.2), (-4.6, top + L + 0.2),
                (-4.0, top + L + 1.2), (-2.8, top + L + 1.4), (-1.6, top + L), (-0.8, top + L + 1.5),
                (0.8, top + L + 1.5), (1.6, top + L), (2.8, top + L + 1.4), (4.0, top + L + 1.2),
                (4.6, top + L + 0.2), (3.4, top + L - 1.2), (3.0, top + 4.5), (2.6, top + 2.0), (1.4, top)]
    bm = s.poly(P(body))
    bpid = s.part(bm, base=2, k=1, sh_tone=0, line=0, shadow=(1, 0.3))
    # the green-tinged base of the corolla
    base_m = s.poly(P([(-4, top - 1), (4, top - 1), (4, top + 1.6), (-4, top + 1.6)]))
    s.decal(base_m & bm, 1, on=[bpid])
    rim_white(s, bm, bpid, 0.42)
    if not closed:
        # petal seams: short green lines up from the notches of the rim
        for u in (-1.6, 1.6):
            s.decal(s.line1(P([(u * 0.8, top + L - 2.6), (u, top + L + 0.8)])), 1, on=[bpid])
    # the calyx: three visible sepals clasping the top
    for du, dv, tu, tv in ((-0.8, top - 0.6, -2.8, top + 2.4), (0.8, top - 0.6, 2.8, top + 2.2),
                           (0.0, top - 0.6, 0.0, top + 1.8)):
        cm = s.poly(P([(du - 0.9, dv), (du + 0.9, dv), (tu, tv)]))
        s.part(cm, base=1, k=0, line=0)
    return bpid, bm


def berry_cluster(s, berries, stalk=None):
    """Shiny black berries, each in a green star-shaped calyx. `berries` is
    [(x, y, r, rot)] back to front; staggered, never a level pair. Each
    berry is black with a short white glint arc one pixel inside its
    upper-left curve; overlapping berries are parted by a dark-green line.
    Records the berries in s.berry so finishing keeps their black."""
    if stalk:
        for ctrl in stalk:
            s.part(s.stroke(bez(ctrl, 20), 1.5, cap=True), base=1, k=0, line=0)
    yy, xx = np.mgrid[0:s.h, 0:s.w]
    for bx, by, r, rot in berries:
        pts = []
        for j in range(10):
            a = rot + math.pi * j / 5
            rr = (r + 3.6) if j % 2 == 0 else r + 0.6
            pts.append((bx + rr * math.cos(a), by + rr * math.sin(a)))
        cm = s.poly(pts)
        cpid = s.part(cm, base=1, k=0, line=0)
        rim_white(s, cm, cpid, 0.18)
    if not hasattr(s, "berry"):
        s.berry = np.zeros((s.h, s.w), bool)
    for bx, by, r, rot in berries:
        m = s.ellipse(bx, by, r, r)
        s.part(m, base=0, k=0, line=1)
        # a short arc of glint hugging the upper-left curve, one pixel in
        # from the edge: a round shiny berry, not a pupil
        (tx, ty), = s.T([(bx, by)])
        inner = erode1(m)
        ring = inner & ~erode1(inner)
        ang = np.degrees(np.arctan2(yy + 0.5 - ty, xx + 0.5 - tx))
        s.berry |= m
        s.decal(ring & (ang > -170) & (ang < -100), 3, lock=True)


def declot(t, keep):
    h, w = t.shape
    p = np.pad(t, 1, constant_values=T)
    blk = np.zeros((h, w), int)
    clear = np.zeros((h, w), bool)
    for dy in (0, 1, 2):
        for dx in (0, 1, 2):
            if (dy, dx) != (1, 1):
                blk += p[dy:dy + h, dx:dx + w] == 0
                clear |= p[dy:dy + h, dx:dx + w] == T
    t = t.copy()
    t[(t == 0) & (blk >= 7) & ~clear & ~keep] = 1
    return t


def blunt_tips(t):
    t = t.copy()
    h, w = t.shape
    for _ in range(3):
        op = t != T
        p = np.pad(op, 1)
        n = p[:-2, 1:-1].astype(int) + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]
        ys, xs = np.nonzero(op & (n == 1))
        if not len(xs):
            break
        for y, x in zip(ys, xs):
            vertical = (y > 0 and op[y - 1, x]) or (y < h - 1 and op[y + 1, x])
            cands = [(y, x - 1), (y, x + 1)] if vertical else [(y - 1, x), (y + 1, x)]
            for yy, xx in cands:
                if 0 <= yy < h and 0 <= xx < w and t[yy, xx] == T:
                    t[yy, xx] = 0
                    break
    return t


def finish(s, **kw):
    """Full black outline, blunt 1px tips, unclot black seams (but keep the
    berries black), and no enclosed dark dots."""
    t = tones(s, **kw)
    keep = getattr(s, "berry", np.zeros(t.shape, bool))
    keep = keep | shift(keep, 1, 0) | shift(keep, -1, 0) | shift(keep, 0, 1) | shift(keep, 0, -1)
    return no_dots(declot(blunt_tips(t), keep))


def shadow_pool(s, x0, x1, y0, y1=55.5):
    """The plant's own shadow on the ground: a flat black lozenge."""
    m = s.poly([(x0, y1), (x0 + 3, y0 + 1), (x0 + 8, y0), (x1 - 8, y0), (x1 - 3, y0 + 1), (x1, y1)])
    return s.part(m, base=0, k=0, line=0), m


# ------------------------------------------------------------- sprout -----

# per front frame: (bud swing in radians, + = toward the foe; lead leaf lift px)
SPROUT_KEYS = [(0.0, 0.0), (-0.30, 0.6), (0.30, 1.6), (0.38, 2.0), (0.08, 0.6)]


def sprout(s, fr=0):
    swing, lift = SPROUT_KEYS[fr]
    s.ox = 3.0
    shadow_pool(s, 4, 52, 52.0)
    # low ground leaves, spread wide (the braced stance)
    leaf(s, (31, 50), (49, 44.5), 9.0, bend=0.06, rim=0.3)
    leaf(s, (28, 51), (14, 50), 7.0, bend=-0.05, rim=0.35)
    # the stem, a short C leaning to the foe
    stem(s, [(31, 52), (32.5, 45), (31, 38), (28, 33)], (4.6, 3.2))
    # rear leaf swept back and up
    leaf(s, (31, 37), (48, 22), 10.5, bend=0.08, rim=0.3)
    # head leaf, low and leaning hard toward the foe
    leaf(s, (28, 34), (14, 12), 12.5, bend=-0.12, rim=0.45)
    # the bud on its stalk, hung from under the lead leaf
    bx, by = 11.5, 35.5
    s.part(s.stroke(bez([(22, 37), (15, 35), (bx, by + 0.5)], 20), 1.8), base=1, k=0, line=0)
    bell(s, bx, by, swing, scale=1.55, closed=True, ped=1.2)
    # the lead leaf raised across the front like a shield
    leaf(s, (30, 43), (5, 28 - lift), 13.0, bend=0.14, rim=0.45)


# -------------------------------------------------------------- adult -----

# per front frame: (bell sway, cluster swing) in radians (+ = toward the foe)
ADULT_KEYS = [(0.0, 0.0), (-0.22, -0.18), (0.26, 0.26), (0.34, 0.34), (0.08, 0.08)]
BELLS = [  # attachment (x, y), rest angle, scale, sway gain
    ((8.5, 25.0), 0.08, 1.55, 0.7),
    ((42.5, 32.5), 0.0, 1.45, 0.8),
    ((50.5, 27.0), -0.06, 1.3, 1.1),
]


def adult(s, fr=0):
    sway, swing = ADULT_KEYS[fr]
    shadow_pool(s, 27, 48, 52.5)
    # rear branch to the right, carrying two bells
    stem(s, [(36, 44), (42, 34), (52, 25)], (3.4, 2.2))
    leaf(s, (49, 27), (55, 12), 8.0, bend=0.1, rim=0.3)
    # rear crown leaves
    leaf(s, (37, 21), (50, 8), 8.0, bend=0.08, rim=0.35)
    # the short thick stem, arching up and over toward the foe
    stem(s, [(37, 54), (38, 44), (35, 34), (26, 26), (10, 23)], (6.0, 2.6))
    stem(s, [(35, 33), (36, 26), (36, 18)], (3.0, 2.2))
    leaf(s, (35, 19), (31, 3), 9.0, bend=-0.06, rim=0.4)
    leaf(s, (24, 25), (18, 7), 8.5, bend=0.06, rim=0.45)
    # the bells hang beneath the arch and the rear branch
    for (x, y), a, k, g in BELLS:
        s.part(s.stroke(bez([(x + 1.0, y - 3.5), (x, y)], 6), 1.6), base=1, k=0, line=0)
        bell(s, x, y, a + sway * g, scale=k)
    # the front leaves over the arch: the lead arm reaching at the foe
    leaf(s, (12, 23), (1, 10), 8.5, bend=0.1, rim=0.45)
    # the swinging berry cluster hangs from the arch, in the open below it
    ax, ay = 21.0, 27.0
    tr = rot_pt(ax, ay, swing)
    pts = [tr(1.5, 7.0), tr(-2.6, 12.0), tr(2.4, 15.5)]
    stalks = [[(ax, ay), tr(0, 3.0), p] for p in pts]
    berry_cluster(s, [(p[0], p[1], 3.0, -1.57 + 0.4 * i) for i, p in enumerate(pts)], stalk=stalks)


# ------------------------------------------------------------- frames -----

def front(sid, fr=0):
    s = Spr(56, 56, SPAL)
    (sprout if sid == IDS[0] else adult)(s, fr)
    return finish(s)


def back(sid):
    """Behind and above: the plant leans toward the foe (top-right), its
    base cut off by the screen's bottom edge; the bud (sprout) or the bells
    and a berry cluster (adult) hang in the open."""
    s = Spr(48, 48, SPAL)
    if sid == IDS[0]:
        leaf(s, (22, 34), (6, 11), 13.0, bend=-0.06, rim=0.35)
        leaf(s, (25, 31), (37, 3), 16.0, bend=0.08, rim=0.4)
        stem(s, [(20, 50), (21, 40), (25, 30)], (5.5, 3.5))
        leaf(s, (21, 42), (0, 35), 15.0, bend=-0.08, rim=0.4)
        leaf(s, (22, 45), (47, 45), 13.0, bend=0.06, rim=0.3)
        leaf(s, (25, 37), (47, 21), 13.0, bend=0.1, rim=0.35)
        s.part(s.stroke(bez([(29, 35), (36, 33), (39, 29.5)], 20), 2.0), base=1, k=0, line=0)
        bell(s, 39, 29, -0.12, scale=1.7, closed=True, ped=1.0)
    else:
        leaf(s, (22, 46), (12, 47), 8.0, bend=-0.06, rim=0.4)
        leaf(s, (24, 44), (47, 46), 11.0, bend=0.06, rim=0.3)
        stem(s, [(22, 50), (23, 40), (28, 30), (34, 22)], (7.0, 3.5))
        leaf(s, (28, 28), (14, 3), 12.0, bend=-0.06, rim=0.4)
        leaf(s, (32, 24), (36, 0), 11.0, bend=0.06, rim=0.4)
        leaf(s, (34, 22), (47, 8), 10.0, bend=0.08, rim=0.35)
        leaf(s, (24, 32), (3, 21), 11.0, bend=-0.08, rim=0.4)
        stem(s, [(30, 29), (38, 24), (44, 20)], (3.0, 2.2))
        for x, y, a, k in ((37.0, 25.0, -0.05, 1.45), (43.5, 21.0, -0.1, 1.3)):
            bell(s, x, y, a, scale=k)
        stem(s, [(24, 34), (16, 31), (10, 28)], (3.0, 2.2))
        tr = rot_pt(10.0, 28.5, 0.0)
        pts = [tr(1.5, 6.0), tr(-2.8, 11.5), tr(2.6, 15.5)]
        berry_cluster(s, [(p[0], p[1], 3.2, -1.57 + 0.4 * i) for i, p in enumerate(pts)],
                      stalk=[[(10, 28.5), tr(0, 3), p] for p in pts])
    return finish(s, open_bottom=True)


ICONS = {
    # a low dark-green sprout leaning left, the closed violet bud hanging
    # under its raised lead leaf
    "nightshade_sprout": [
        "......11........",
        ".....1311.......",
        ".....13111......",
        "..111.1111..11..",
        ".13111k111.1311.",
        ".1311111k1k1111.",
        "..1111111111....",
        "...1k..111......",
        "..222...11......",
        "..232...11......",
        "..222.k1111111..",
        "...2.k111111111.",
        "....kkkkkkkkkk..",
    ],
    # the leafy crown overhanging the foe, two violet bells hanging under
    # it and a short thick stem
    "nightshade": [
        "....11..11......",
        "...1311.1311....",
        "..131111k1111...",
        ".1311111111111..",
        ".11111k111111111",
        "..k11.k111k1111.",
        "...1...11...1...",
        "..222..11..222..",
        "..232..11..232..",
        ".22222.11.22222.",
        "......1111......",
        "....kkkkkkk.....",
    ],
}


def icon(sid):
    return icon_arr(ICONS[sid] + ["." * 16])


def render():
    out = {}
    for sid in IDS:
        fs = [front(sid, f) for f in range(5)]
        ic = icon(sid)
        out[sid] = (fs, back(sid), [ic, hop(ic)])
    return out


def review_layout(items, name):
    """Each species' front, back and icon at 3x in one row (plus 1x).
    items: [(sid, (fronts, back, icons), palette)]."""
    from kit import to_rgba
    folder = Path(__file__).resolve().parent.parent / "review"
    folder.mkdir(exist_ok=True)
    for scale, fname in ((1, f"{name}_1x.png"), (3, f"{name}_lead_layout.png")):
        sheet = Image.new("RGB", (128 * len(items) * scale, 56 * scale), (200, 208, 200))
        for n, (sid, (fs, b, icons), pal) in enumerate(items):
            for x, arr in ((0, fs[0]), (56, b), (104, icons[0])):
                im = Image.fromarray(to_rgba(arr, pal), "RGBA")
                im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                sheet.paste(im, ((128 * n + x) * scale, 56 * scale - im.height), im)
        sheet.save(folder / fname)


NOTES = {
    "nightshade_sprout": "BRACED: a low, wide, dark green sprout of soft oval leaves crouched over its own "
                         "black shadow pool; the big lead leaf raised across the front like a shield, the "
                         "head leaf leaning at the foe, and one closed dull-purple bell bud hanging on a "
                         "curved stalk below the lead leaf. Gesture: the bud swings on its stalk while the "
                         "lead leaf lifts, then settles; the stem, the other leaves and the shadow stay fixed.",
    "nightshade": "LOOMING: a bushy plant on a short thick stem whose arching branches and soft pointed "
                  "leaves overhang the foe; dull purple bells, tinged green at the base, hang beneath the "
                  "leaves, and shiny black berries, each set in a green star-shaped calyx, hang in two "
                  "clusters of three or more (never a level pair). Gesture: the bells sway and the front "
                  "berry cluster swings, hold, rebound and settle; stems and leaves stay fixed.",
}


def build():
    from kit import intro_strip, write_species
    art = render()
    review_layout([(sid, art[sid], PAL) for sid in IDS], "nightshade")
    for sid in IDS:
        fs, b, icons = art[sid]
        write_species(sid, palette=PAL, sport=SPORT, front=fs, back=[b], icon=icons,
                      anim=ANIM[sid], moving=moving_boxes(fs), tool=TOOL,
                      notes="Crystal rule. Atropa belladonna. " + NOTES[sid] +
                      " A deep green dark slot (leaves, stems, calyces, the bells' green base) under a "
                      "dull violet mid tone (the bells and the bud); the berries are the outline black with "
                      "white glints. Sport: Atropa belladonna var. lutea, the rare natural form with "
                      "pale-yellow flowers and fruit (the black berries cannot change in a sport, so only "
                      "the flowers turn pale yellow).",
                      credits="Original geometry drawn for Verdant Reach under the Crystal rule "
                      "(docs/CREATURES.md). Botanical reference: Atropa belladonna, "
                      "https://en.wikipedia.org/wiki/Atropa_belladonna . "
                      "No sprite from any other game was copied, traced or imported.")
        intro_strip(sid)


def preview(path):
    """Scratch sheet: every front frame, sport, back and icons at 4x."""
    from _d_kit import preview as pv, stats
    art = render()
    rows = []
    for sid in IDS:
        fs, b, icons = art[sid]
        for k, f in enumerate(fs):
            stats(f"{sid} f{k}", f)
        stats(f"{sid} back", b)
        rows.append((PAL, fs + [b] + icons))
        rows.append((SPORT, [fs[0]]))
    pv(rows, path)
    one = Image.new("RGB", (60 * 6, 60 * 2), (224, 232, 208))
    for r, sid in enumerate(IDS):
        from kit import to_rgba
        fs = art[sid][0]
        for k, f in enumerate(fs):
            im = Image.fromarray(to_rgba(f, PAL), "RGBA")
            one.paste(im, (2 + 60 * k, 2 + 60 * r), im)
    one.save(str(path).replace(".png", "_1x.png"))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "preview":
        preview(sys.argv[2])
    else:
        build()
