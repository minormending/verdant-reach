"""Original Crystal-rule Gloriosa superba (flame lily): flame_lily_tuber ->
flame_lily.

flame_lily_tuber (teen size class, stage 1 of 2), COILED: a forked, rust-brown
tuber lying on the ground like an upturned V, its two prongs the planted
feet. From the fork rises a climbing green shoot in an S, its leaves
alternate and lance-shaped, each tip running out into a coiling tendril;
the top of the shoot is pulled back over the body and curled into a big
tendril spiral (the coil, exaggerated). Intro: the tendril curls (the coil
loosens and reaches toward the foe, then whips tight, holds, and settles).
flame_lily (adult), LUNGING: the climbing vine arches from its forked tuber
toward the foe and thrusts out its flower: six long tepals swept back and up
like flickering flames, red with wavy yellow edges, and six long curved
stamens flung out toward the foe; a second, smaller flower climbs behind,
and tendril-tipped leaves grip the air. Intro: the petals flicker (the
tepals' tips lick up and back in a wave, hold, and settle); the vine, leaves
and tuber stay registered.
Two tones: a flame-red dark slot (the tepals, the tuber's rust, the leaf
shade) under a yellow-green mid (the tepals' wavy edges, the stamens, the
leaves and shoot), so the leaves read green-ish through the mid and the red
shading; no third hue is needed.
Faces: the anthers are light pills joined to their filaments, the flower's
centre is covered by the tepal bases, and no dark mark is enclosed.
Sport: the all-yellow form, Gloriosa superba 'Lutea' (see docs/SPORTS.md).
Self-score (docs/CREATURES.md section 9): flame_lily_tuber 8, flame_lily 8.
No sprite from any other game is copied, traced or imported.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _d_kit import (BLACK, WHITE, T, Spr, back_frame, bez, erode, hop, icon_arr, moving_boxes, qbez,  # noqa: E402,F401
                    rim_white, shift)
from aspen import across, blunt, finish  # noqa: E402
from titan import preview, review_layout  # noqa: E402

TOOL = "tools/art/crystal/flamelily.py"
IDS = ["flame_lily_tuber", "flame_lily"]
PALS = {
    "flame_lily_tuber": [BLACK, "#a84830", "#b8c840", WHITE],
    "flame_lily": [BLACK, "#d03020", "#c8d040", WHITE],
}
# Gloriosa superba 'Lutea': the all-yellow form
SPORTS = {
    "flame_lily_tuber": [BLACK, "#987020", "#d8d058", WHITE],
    "flame_lily": [BLACK, "#c88818", "#e8d048", WHITE],
}
ANIMS = {
    "flame_lily_tuber": {"intro": [[0, 6], [1, 12], [2, 6], [3, 16], [4, 10], [0, 8]],
                         "idle": [[0, 130], [4, 10], [0, 6]]},
    "flame_lily": {"intro": [[0, 4], [1, 8], [2, 6], [3, 6], [4, 14], [1, 8], [0, 8]],
                   "idle": [[0, 120], [1, 8], [2, 8], [0, 6]]},
}


# ------------------------------------------------------------- shared -----

def tendril(s, start, ang, length, turns=0.6, r0=2.4, w=1.0, cw=1, shrink=0.45):
    """A coiling tendril: runs `length` px from `start` at angle `ang`
    (degrees), then curls into a spiral of `turns` (cw +1 curls clockwise
    on screen). A thin mid-tone line, black-outlined."""
    a = math.radians(ang)
    pts = [start]
    x, y = start
    n = 30
    for i in range(1, n + 1):
        t = i / n
        x += math.cos(a) * length / n
        y += math.sin(a) * length / n
        pts.append((x, y))
    # the spiral, continuing the heading and tightening
    cxs = x - math.sin(a) * r0 * cw
    cys = y + math.cos(a) * r0 * cw
    th0 = math.atan2(y - cys, x - cxs)
    m = 60
    for i in range(1, m + 1):
        t = i / m
        r = r0 * (1 - shrink * t)
        th = th0 + cw * 2 * math.pi * turns * t
        pts.append((cxs + r * math.cos(th), cys + r * math.sin(th)))
    mk = s.stroke(pts, w, cap=True)
    return s.part(mk, base=2, k=0, line=0), mk


def lance(s, base, tip, w, bend=0.1, tone=2, glint=0.35, tendril_turns=0.6, tendril_len=2.5, cw=1,
          rib=True):
    """A lance-shaped leaf whose tip runs on into a coiling tendril."""
    m, path = s.leaf(base, tip, w, bend=bend, fat=0.36)
    pid = s.part(m, base=tone, k=1, line=0, shadow=(1, 1))
    if rib:
        s.decal(s.line1(path[10:-18]), 1, on=[pid])
    if glint:
        rim_white(s, m, pid, glint)
    if tendril_turns:
        (x0, y0), (x1, y1) = path[-6], path[-1]
        ang = math.degrees(math.atan2(y1 - y0, x1 - x0))
        tendril(s, (x1, y1), ang, tendril_len, turns=tendril_turns, r0=2.3, cw=cw)
    return pid, m


def vine(s, ctrl, w=(3.4, 2.0), n=60):
    """The climbing shoot: the mid tone with a dark crescent on its shaded
    side and a white light line on its lit side."""
    path = bez(ctrl, n)
    m = s.stroke(path, w, cap=True)
    pid = s.part(m, base=2, k=1, line=0)
    hws = [(w[0] + (w[1] - w[0]) * i / (len(path) - 1)) / 2 for i in range(len(path))]
    u, a = across(s, m, path, hws)
    s.decal(m & (u < -0.45) & (a > 3) & (a < a.max() - 3), 3, on=[pid])
    return pid, m, path


def tuber(s, joint, left, right, w=(9.0, 4.0)):
    """The forked tuber lying on the ground like an upturned V: two tapered
    prongs from the joint, rust-brown (the dark slot) with a broken white
    rim on their lit tops and a mid-tone sheen, and a black split at the
    fork (joined to the outline)."""
    out = []
    for end, bend in ((left, -1.0), (right, 1.0)):
        jx, jy = joint
        ex, ey = end
        mid = ((jx + ex) / 2 + bend * 0.5, (jy + ey) / 2 - 0.3)
        path = bez([joint, mid, end], 40)
        m = s.stroke(path, w, cap=True)
        out.append((m, path))
    m = out[0][0] | out[1][0] | s.ellipse(joint[0], joint[1] + 0.5, w[0] * 0.55, w[0] * 0.5)
    pid = s.part(m, base=1, k=0, line=0)
    for mm, path in out:
        top = mm & ~shift(mm, 0, -1)
        inner = shift(top, 0, -1) & mm & ~top
        s.decal(inner & ~shift(m, 0, -2), 2, on=[pid])
    rim_white(s, m, pid, 0.35)
    # the fork's split, run up from the ground
    jx, jy = joint
    s.decal(s.line1([(jx + 0.5, jy + w[0] * 0.5 + 2), (jx + 0.5, jy + 2.5)]), 0, on=[pid])
    return pid, m


def tepal(s, base, tip, w, bend=0.15, waves=3.0, amp=1.0, phase=0.0, glint=0.3, n=80):
    """One tepal: a long wavy flame, red (the dark slot) with a yellow (mid)
    edge all round inside the outline, and a white rim on its lit top-left."""
    bx, by = base
    tx, ty = tip
    L = math.dist(base, tip)
    nx, ny = -(ty - by) / L, (tx - bx) / L
    c = ((bx + tx) / 2 + nx * bend * L, (by + ty) / 2 + ny * bend * L)
    path = qbez(base, c, tip, n)
    left, right = [], []
    for i, (x, y) in enumerate(path):
        t = i / (n - 1)
        a = path[max(0, i - 1)]
        b = path[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        ll = math.hypot(dx, dy) or 1.0
        ux, uy = -dy / ll, dx / ll
        hw = w / 2 * math.sin(math.pi * min(1.0, t ** 0.75)) ** 0.8
        wob = amp * math.sin(2 * math.pi * waves * t + phase) * min(1.0, t * 3)
        left.append((x + ux * (hw + wob), y + uy * (hw + wob)))
        right.append((x - ux * (hw - wob), y - uy * (hw - wob)))
    m = s.poly(left + right[::-1])
    pid = s.part(m, base=1, k=0, line=0)
    edge = m & ~erode(m, 1)
    s.decal(edge, 2, on=[pid])
    if glint:
        rim_white(s, m, pid, glint)
    return pid, m


def stamen(s, base, ctrl_end, bend=1.5, anther=True):
    """A long curved stamen: a thin mid filament ending in a light anther
    pill laid across its tip."""
    bx, by = base
    ex, ey = ctrl_end
    L = math.dist(base, ctrl_end) or 1.0
    nx, ny = -(ey - by) / L, (ex - bx) / L
    path = qbez(base, ((bx + ex) / 2 + nx * bend, (by + ey) / 2 + ny * bend), ctrl_end, 30)
    m = s.stroke(path, 1.2, cap=True)
    pid = s.part(m, base=2, k=0, line=0)
    if anther:
        (x0, y0), (x1, y1) = path[-4], path[-1]
        a = math.atan2(y1 - y0, x1 - x0) + math.pi / 2
        am = s.stroke([(x1 - math.cos(a) * 1.6, y1 - math.sin(a) * 1.6), (x1 + math.cos(a) * 1.6, y1 + math.sin(a) * 1.6)],
                      1.9, cap=True)
        ap = s.part(am, base=2, k=0, line=0)
        s.decal(am & ~shift(am, 0, -1), 3, on=[ap])
    return pid, m


# ---------------------------------------------------- flame_lily_tuber ----

# per front frame: the coil (extra reach toward the foe, turns, rotation)
COIL = [(0.0, 0.66, 0.0), (2.0, 0.46, 14.0), (1.0, 0.72, -6.0), (0.0, 0.78, -12.0), (0.0, 0.7, -3.0)]


def coil(s, start, reach, turns, rot):
    """The big tendril coil at the top of the shoot: an open spiral whose
    rings stay at least a pixel apart (never a closed disc)."""
    with s.rotated(rot, start[0], start[1]):
        return tendril(s, start, -165.0, 2.5 + reach, turns=turns, r0=5.8, w=1.6, cw=1, shrink=0.4)


def tuber_plant(s, fr=0):
    reach, turns, rot = COIL[fr]
    s.ox = 3.6
    # the rear leaves first (behind the shoot)
    lance(s, (31.0, 38.0), (44.0, 30.5), 5.2, bend=-0.10, glint=0.35, cw=-1)
    lance(s, (29.5, 29.0), (39.0, 20.5), 4.6, bend=-0.10, glint=0.35, cw=-1)
    # the shoot: an S from the fork, the top pulled back over the body
    vine(s, [(28.0, 45.0), (31.0, 39.0), (29.5, 32.0), (26.0, 26.0), (26.5, 21.0), (30.0, 17.8)], (4.6, 2.8))
    coil(s, (30.5, 17.8), reach, turns, rot)
    # the lead leaves on the foe side, raised
    lance(s, (30.0, 41.0), (7.5, 35.5), 7.2, bend=0.16, glint=0.4, cw=1)
    lance(s, (27.0, 31.0), (8.5, 24.0), 6.6, bend=0.16, glint=0.4, cw=1)
    # the forked tuber: the feet, the front one reaching further
    tuber(s, (28.0, 45.5), (8.0, 54.0), (43.0, 54.0), w=(8.0, 3.6))


# ----------------------------------------------------------- flame_lily ----

# per front frame: the tepals' flicker (tip lift per tepal, wave phase)
FLICKER = [
    ([0.0, 0.0, 0.0, 0.0, 0.0], 0.0),
    ([1.5, 0.5, -0.5, 0.0, 1.0], 1.4),
    ([-0.5, 1.5, 1.0, -0.5, 0.5], 2.8),
    ([0.0, -0.5, 1.5, 1.5, -0.5], 4.2),
    ([2.0, 1.5, 1.2, 1.5, 2.0], 5.6),
]

# the main flower's tepals, swept back and up (away from the foe) like
# flames: (angle of the tip from the centre, length, width, bend)
TEPALS = [(-138.0, 15.0, 5.4, -0.22), (-112.0, 19.0, 5.8, -0.22), (-86.0, 20.0, 5.8, -0.20),
          (-60.0, 18.0, 5.6, -0.18), (-34.0, 14.0, 5.2, -0.14)]
# the stamens, flung forward toward the foe: (angle, length)
STAMENS = [(118.0, 11.0), (146.0, 14.0), (176.0, 15.0), (206.0, 12.0)]


def flower(s, c, scale=1.0, fr=0, tilt=0.0, stamens=True, glints=True):
    """The flame lily's nodding flower: five visible tepals swept back and up
    like flames (the sixth hidden behind), and long stamens flung forward."""
    cx, cy = c
    lift, ph = FLICKER[fr]
    order = [4, 0, 3, 1, 2]                 # far tepals first, the middle one on top
    for k in order:
        ang, ln, w, bend = TEPALS[k]
        a = math.radians(ang + tilt + lift[k] * 4.0)
        L = (ln + lift[k] * 0.9) * scale
        tip = (cx + math.cos(a) * L, cy + math.sin(a) * L)
        base = (cx + math.cos(a) * 1.5, cy + math.sin(a) * 1.0 + 1.0)
        tepal(s, base, tip, w * scale, bend=bend, waves=2.2, amp=0.85 * scale, phase=ph + k * 1.3,
              glint=0.32 if glints and k in (0, 1, 2) else 0.0)
    # the ovary at the heart, over the tepal bases
    om = s.ellipse(cx + 0.5, cy + 1.5, 2.8 * scale, 2.4 * scale)
    op = s.part(om, base=2, k=1, line=0)
    s.decal(om & ~shift(om, 0, -1) & ~shift(om, 1, 0), 3, on=[op])
    if stamens:
        for ang, ln in STAMENS:
            a = math.radians(ang + tilt)
            stamen(s, (cx - 0.5, cy + 2.5), (cx + math.cos(a) * ln * scale, cy + 2.5 + math.sin(a) * ln * scale),
                   bend=1.8 * scale)


def bud(s, base, ang, ln=10.0, w=4.6):
    """A closed flower bud hanging from a vine tip: two slim tepals pressed
    together, red with yellow edges."""
    a = math.radians(ang)
    tip = (base[0] + math.cos(a) * ln, base[1] + math.sin(a) * ln)
    tepal(s, base, (tip[0] + 1.5, tip[1] - 0.5), w, bend=0.12, waves=1.0, amp=0.3, glint=0.0)
    tepal(s, base, tip, w, bend=-0.10, waves=1.0, amp=0.3, glint=0.4)


def lily(s, fr=0):
    s.ox = 2.0
    # the rear arm flung back: a vine tip with a closed bud and a tendril
    vine(s, [(38.0, 46.0), (43.0, 38.0), (45.5, 29.0), (45.0, 20.0)], (3.0, 1.8))
    tendril(s, (45.0, 20.0), -100.0, 3.0, turns=0.7, r0=3.0, w=1.0, cw=-1)
    lance(s, (44.5, 35.0), (50.5, 29.5), 5.0, bend=-0.12, glint=0.35, cw=-1, tendril_turns=0.0)
    bud(s, (45.0, 27.0), 60.0)
    # the main vine arching toward the foe
    vine(s, [(36.0, 51.0), (37.0, 43.0), (34.0, 35.0), (27.0, 29.5), (20.0, 27.5)], (4.2, 2.6))
    lance(s, (36.5, 44.0), (48.0, 40.5), 6.0, bend=-0.14, glint=0.35, cw=-1)
    lance(s, (35.0, 40.0), (21.0, 48.5), 6.4, bend=-0.14, glint=0.4, cw=1)
    flower(s, (19.0, 25.0), scale=1.12, fr=fr, tilt=0.0)
    tuber(s, (36.0, 51.0), (24.0, 54.5), (48.5, 54.5), w=(6.0, 3.0))


# ------------------------------------------------------------- frames -----

def front(sid, fr=0):
    s = Spr(56, 56, tuple(PALS[sid][1:]))
    (tuber_plant if sid == IDS[0] else lily)(s, fr)
    return finish(s)


def back(sid):
    """Behind and above, leaning to the top-right (the foe), cut off by the
    screen's bottom edge; drawn big, then fitted inside the 48 px width."""
    t = back_frame(lambda: back_draw(sid), maxw=47)
    # back_frame leaves the whole bottom row unlined; only the cut needs
    # that, so outline what ends just short of the edge
    body = (t != T) & (t != 0)
    ring = np.zeros_like(body)
    ring[-1, 1:] |= body[-1, :-1]
    ring[-1, :-1] |= body[-1, 1:]
    ring[-1] |= body[-2]
    t[ring & (t == T)] = 0
    return blunt(t)


def back_draw(sid):
    s = Spr(48, 48, tuple(PALS[sid][1:]), sc=1.06)
    if sid == IDS[0]:
        # close behind and above: the shoot rising to the top-right into its
        # crook, big leaves seen from above (the lead leaf raised on the
        # right), the tuber's fork cut off by the bottom edge
        lance(s, (22.0, 45.0), (3.0, 42.0), 11.0, bend=0.12, glint=0.35, tendril_turns=0.0)
        lance(s, (22.5, 36.0), (4.0, 27.0), 10.5, bend=0.14, glint=0.35, tendril_turns=0.0)
        lance(s, (23.5, 27.0), (11.0, 14.0), 9.0, bend=0.12, glint=0.35, cw=1)
        lance(s, (26.0, 29.0), (40.0, 17.0), 10.0, bend=-0.12, glint=0.4, cw=-1)
        vine(s, [(23.0, 53.0), (21.5, 43.0), (24.0, 32.0), (28.0, 22.0), (26.5, 15.0)], (7.6, 4.6))
        tendril(s, (26.5, 14.5), -30.0, 2.5, turns=0.66, r0=6.4, w=2.2, cw=-1, shrink=0.4)
        lance(s, (23.0, 47.0), (45.0, 43.0), 12.0, bend=-0.10, glint=0.4, tendril_turns=0.0)
        lance(s, (24.0, 38.0), (45.0, 30.0), 11.5, bend=-0.12, glint=0.4, tendril_turns=0.0)
        tuber(s, (23.0, 54.0), (8.0, 57.0), (38.0, 57.0), w=(13.0, 8.0))
    else:
        # the flower from behind and above, close: the tepals' backs fanned
        # up and back toward the foe, two stamens' tips showing past them,
        # the vine and leaves below
        vine(s, [(20.0, 52.0), (21.0, 42.0), (24.0, 33.0)], (8.0, 5.6))
        lance(s, (21.0, 44.0), (2.0, 40.0), 12.0, bend=0.12, glint=0.35, tendril_turns=0.0)
        lance(s, (22.0, 41.0), (45.0, 45.0), 12.0, bend=-0.10, glint=0.35, tendril_turns=0.0)
        cx, cy = 24.0, 29.0
        for ang, ln in ((-6.0, 19.0), (16.0, 17.0)):
            a = math.radians(ang)
            stamen(s, (cx, cy - 2.0), (cx + math.cos(a) * ln, cy - 2.0 + math.sin(a) * ln), bend=-1.8)
        for k, (ang, ln, w) in enumerate(((-156.0, 20, 10.5), (-24.0, 21, 10.5), (-128.0, 26, 11.4),
                                          (-52.0, 27, 11.4), (-90.0, 29, 11.8))):
            a = math.radians(ang)
            tepal(s, (cx + math.cos(a) * 2.0, cy + math.sin(a) * 1.5),
                  (cx + math.cos(a) * ln, cy + math.sin(a) * ln * 0.95), w, bend=-0.14, waves=2.2, amp=1.4,
                  phase=k * 1.3, glint=0.3 if k in (0, 2, 4) else 0.0)
    return s


ICONS = {
    # the shoot rising from the forked tuber, its top a tight tendril coil,
    # a big lead leaf on the foe side and a small rear leaf
    "flame_lily_tuber": [
        "......332.......",
        ".....32222......",
        ".....22212......",
        "......2211......",
        ".......21.......",
        ".33222.21.222...",
        "..32222211221...",
        "....222.21......",
        ".......21.......",
        "......21........",
        "......21........",
        "....1111111.....",
        "..1111...1111...",
    ],
    # the red flame flower, tepals swept up and back with yellow edges,
    # stamens hanging toward the foe, on its vine over the tuber
    "flame_lily": [
        ".....2..2.2.....",
        "....212.212.2...",
        "...2112121121...",
        "...21112111112..",
        "...3111111112...",
        "...33111111122..",
        "....2222222.....",
        "..2.2.2.22......",
        "..2..2..2.......",
        ".......2........",
        "..332..22.......",
        "..3222222.......",
        "........2.......",
        "......111111....",
    ],
}


def icon(sid):
    return icon_arr(ICONS[sid] + ["." * 16])


def render():
    out = {}
    nf = {IDS[0]: len(COIL), IDS[1]: len(FLICKER)}
    for sid in IDS:
        fs = [front(sid, f) for f in range(nf[sid])]
        ic = icon(sid)
        out[sid] = (fs, back(sid), [ic, hop(ic)])
    return out


NOTES = {
    "flame_lily_tuber": "COILED: a forked, rust-brown tuber lying on the ground like an upturned V (the "
                        "two planted feet); from the fork a climbing green shoot rises in an S, with "
                        "alternate lance-shaped leaves whose tips run out into coiling tendrils, and its top "
                        "pulled back over the body and curled into a big tendril spiral. Gesture: the "
                        "tendril curls (the coil loosens and reaches for the foe, then whips tight, holds "
                        "and settles); the tuber, shoot and leaves stay fixed.",
    "flame_lily": "LUNGING: the climbing vine arches from its forked tuber toward the foe and thrusts out "
                  "its flower: six long tepals swept back and up like flames, red with wavy yellow edges, "
                  "and six long curved stamens flung toward the foe; a second, smaller flower climbs "
                  "behind and tendril-tipped leaves grip the air. Gesture: the petals flicker (the tepals' "
                  "tips lick up and back in a wave, hold and settle); vine, leaves and tuber stay fixed.",
}


def build():
    from kit import intro_strip, write_species
    art = render()
    review_layout(art, PALS, "flamelily")
    for sid in IDS:
        fs, b, icons = art[sid]
        write_species(sid, palette=PALS[sid], sport=SPORTS[sid], front=fs, back=[b], icon=icons,
                      anim=ANIMS[sid], moving=moving_boxes(fs), tool=TOOL,
                      notes="Crystal rule. Gloriosa superba. " + NOTES[sid] +
                      " A flame-red dark slot (the tepals, the tuber's rust, the leaf shade) under a "
                      "yellow-green mid (the tepals' wavy edges, the stamens, the leaves and shoot). "
                      "Sport: the all-yellow form, Gloriosa superba 'Lutea'.",
                      credits="Original geometry drawn for Verdant Reach under the Crystal rule "
                      "(docs/CREATURES.md). Botanical reference: Gloriosa superba, "
                      "https://en.wikipedia.org/wiki/Gloriosa_superba . "
                      "No sprite from any other game was copied, traced or imported.")
        intro_strip(sid)


if __name__ == "__main__":
    import os
    preview(render(), PALS, SPORTS, os.environ.get("PREVIEW", "/tmp/flamelily_preview.png"))
