"""Crystal rule, moth orchid line: orchid_keiki -> orchid_spike -> moth_orchid.

A redraw of tools/art/species_e/orchid.py under the Crystal rule
(docs/ROLLOUT.md, docs/CREATURES.md). Phalaenopsis: broad fleshy leaves,
silver aerial roots, an arching flower spike beaded with buds, and the moth
flower (two broad wing petals, a crest sepal, two talon sepals, a clawed
lip). The moth orchid is Flora Vance's ace, so it stays the biggest, most
menacing sprite of the line.

  index 0  #181818  outline, crevices                              (shared)
  index 1  plum: the line's accent. The keiki's bud, the spike's buds and
           lip, the moth orchid's glossy leaves; also the shadow side of
           every form (the second hue in the dark slot, as the pilot
           flytrap did with red)
  index 2  leaf green (keiki, spike) / orchid magenta (moth orchid)
  index 3  #f8f8f8  the silver aerial roots and the spike's white petals
           (genuinely white parts), rims and glints              (shared)

Poses (kept from the classic art):
  orchid_keiki  BOBBING  a plantlet with two fat leaves spread like a moth's
                         wings, the plum bud hooked over the foe, root legs.
  orchid_spike  COILED   the flower spike as an S beaded with plum buds, the
                         first white flower opening at the top, pulled back.
  moth_orchid   LOOMING  the great magenta moth flower thrust at the foe on a
                         swan-neck spike, wings spread in threat, a hooked lip
                         like a claw; glossy plum leaves on silver root claws.

Entrance animations (only the signature part moves):
  orchid_keiki  the leaf wings beat: up, down, up, and settle.
  orchid_spike  the top flower is a shut bud; it cracks, then BLOOMS wide
                past rest and settles.
  moth_orchid   the wings are folded; they SPREAD wide in threat, hold, and
                settle to rest.

Sports (docs/SPORTS.md): keiki = a variegated moth orchid (Phalaenopsis Sogo
Vivien 'Variegata'); spike and moth orchid = the harlequin moth orchid
(a mericlone sport of Phal. Golden Peoker 'Brother').

  PY=/Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python
  $PY tools/art/crystal/orchid.py <out.png>     # preview sheet only
  $PY tools/art/crystal/build.py orchid         # write the base bundles
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from kit import BLACK, WHITE, write_species  # noqa: E402
import _arte_draw as D  # noqa: E402

TOOL = "tools/art/crystal/orchid.py"
IDS = ["orchid_keiki", "orchid_spike", "moth_orchid"]

PALS = {
    "orchid_keiki": ("#583068", "#78b850"),    # plum / leaf green
    "orchid_spike": ("#582868", "#78b858"),    # plum / leaf green
    "moth_orchid": ("#4c2060", "#d058a0"),     # plum / orchid magenta
}
SPORTS = {
    "orchid_keiki": ("#605030", "#c0c058"),    # variegated: olive / yellow-green
    "orchid_spike": ("#481830", "#90a858"),    # harlequin: maroon / sage
    "moth_orchid": ("#481830", "#e0c070"),     # harlequin: maroon-black / cream-gold
}


def palette(id_):
    d, l = PALS[id_]
    return [BLACK, d, l, WHITE]


def sport(id_):
    d, l = SPORTS[id_]
    return [BLACK, d, l, WHITE]


def R(pts, deg, cx, cy):
    a = math.radians(deg)
    c, s_ = math.cos(a), math.sin(a)
    return [(cx + (x - cx) * c - (y - cy) * s_, cy + (x - cx) * s_ + (y - cy) * c) for x, y in pts]


def leaf(s, base, tip, w, bend=0.0, fat=0.45, power=0.62, tone=2, k=2, rimf=0.5, rib=1, line=0, mv=False):
    """A fleshy orchid leaf: body tone `tone`, a shadow band, a white rim on
    the lit edge and a midrib in `rib` (None: no rib)."""
    m, path = s.leaf(base, tip, w, bend=bend, fat=fat, power=power)
    put = s.mpart if mv else s.part
    pid = put(m, base=tone, k=k, sh=tone - 1 if tone > 1 else 0, line=line)
    if rimf:
        s.rim(m, pid, rimf)
    if rib is not None and math.dist(base, tip) > 9:
        s.decal(s.line1(path[12:-20]) & D.erode(m, 1), rib, on=pid)
    return pid


def roots(s, paths, w=(3.6, 2.2)):
    """Silver aerial roots: white with a plum shadow band, green growing tips."""
    m = s.empty()
    for p in paths:
        m |= s.curve(p, w)
    pid = s.part(m, base=3, k=1, sh=1, line=0)
    for p in paths:
        x, y = p[-1]
        tip = s.circle(x, y, 1.6) & m
        s.decal(tip, 2, on=pid)
    return pid


# --------------------------------------------------------------- flower ----

def moth_flower(s, cx, cy, k=1.0, tilt=-14, open_=1.0, flap=0.0, lip=True, petal=2, line=0, mv=True,
                rimw=True, veins=True):
    """A Phalaenopsis flower in 3/4 facing the foe: two broad wing petals (the
    near one bigger and lower), a pointed crest sepal, two talon sepals and the
    hooked plum lip. open_ 0 = a shut bud, 1 = rest, >1 = spread wide.
    flap lifts the wings (px)."""
    put = s.mpart if mv else s.part
    sh = 1
    if open_ <= 0.05:
        m, path = s.leaf((cx + 5 * k, cy + 4 * k), (cx - 6 * k, cy - 6 * k), 10 * k, fat=0.42, power=0.7)
        pid = put(m, base=petal, k=3, sh=sh, line=line)
        s.rim(m, pid, 0.5)
        s.decal(s.line1(path[20:-20]) & D.erode(m, 1), 1, on=pid)
        return
    o = open_
    L = 0.55 + 0.45 * min(o, 1.0) + 0.12 * max(0.0, o - 1.0)
    sp = 0.5 + 0.5 * o           # angular spread about the flower's axis

    def P(dx, dy):
        # spread rotates each petal tip away from the up-left axis
        return R([(cx + dx * k * L, cy + dy * k * L)], tilt, cx, cy)[0]

    def part(dx, dy, w, fat=0.45, power=0.55, ln=line, rim=False, extra=0.0):
        a0 = math.atan2(dy, dx)
        ax = math.atan2(-1, -1)
        a = ax + (a0 - ax) * sp
        r = math.hypot(dx, dy)
        p1 = P(math.cos(a) * r, math.sin(a) * r + extra)
        m, _ = s.leaf((cx, cy), p1, w * k * (0.7 + 0.3 * min(o, 1.0)), fat=fat, power=power)
        pid = put(m, base=petal, k=3 if petal == 3 else 2, sh=sh, line=ln)
        if rim and rimw:
            s.rim(m, pid, 0.45)
        return m, pid

    part(15, -7, 13, fat=0.52, power=0.62, extra=-flap * 0.5)            # rear wing petal: smaller, higher
    part(6, 13, 7.5, fat=0.35, power=0.7)                               # rear talon sepal
    part(1, -17, 9.5, fat=0.38, power=0.7, rim=True)                    # crest (dorsal sepal)
    part(-7, 14, 8.5, fat=0.35, power=0.7)                              # lead talon sepal
    m, pid = part(-18, -4, 17.5, fat=0.55, power=0.6, ln=0, rim=True, extra=-flap)   # lead wing petal: big, near
    # veins on the lead wing (plum, broken toward the light)
    a = R([(cx - 4 * k, cy - 1 * k), (cx - 10 * k * L, cy - (3 + flap * 0.5) * k * L),
           (cx - 15 * k * L, cy - (8 + flap) * k * L)], tilt, cx, cy)
    if veins:
        s.decal(s.line1(D.spline(a, 10)) & D.erode(m, 1), 1, on=pid)
    if lip:
        q = 0.8 * k
        pts = R([(cx + 2 * q, cy - 3 * q), (cx - 3 * q, cy - 2 * q), (cx - 6 * q, cy + 2 * q),
                 (cx - 9 * q, cy + 7 * q), (cx - 11 * q, cy + 12 * q), (cx - 7 * q, cy + 10.5 * q),
                 (cx - 3 * q, cy + 7 * q), (cx + 1 * q, cy + 5 * q), (cx + 4 * q, cy + 1 * q)], tilt, cx, cy)
        lm = s.blob(pts)
        lp = put(lm, base=1, k=1, sh=0, line=0)
        # the callus: a light streak at the lip's root in the petal tone (no white: no eye glint)
        c1 = R([(cx - 2 * q, cy + 0 * q), (cx - 6 * q, cy + 5 * q)], tilt, cx, cy)
        s.decal(s.line1(c1) & D.erode(lm, 1), petal if petal != 3 else 2, on=lp)


# ---------------------------------------------------------------- keiki ----

KEIKI_FLAP = [0.0, -7.0, 5.0, -3.5]


def front_keiki(k=0):
    s = D.S(56, 56)
    fp = KEIKI_FLAP[k]
    # legs: silver aerial roots; one curls up behind as the tail
    roots(s, [[(28, 40), (24, 46), (21, 51), (19.5, 54.6)], [(32, 41), (34, 48), (37, 54.6)],
              [(34, 42), (43, 45), (48, 42), (47, 37.5)]], w=(4.2, 3.0))
    # wings: two fat young leaves, the lead one bigger and lower
    rt = R([(49, 24)], fp * 1.6, 32, 37)[0]
    leaf(s, (32, 37), rt, 13, bend=-0.10, fat=0.45, power=0.55, rimf=0.4, mv=True)
    leaf(s, (30, 40), (34, 25), 10, bend=-0.06, fat=0.45, power=0.6, rimf=0.5, rib=None)
    lt = R([(8, 30)], -fp * 1.4, 31, 40)[0]
    leaf(s, (31, 40), lt, 17, bend=0.10, fat=0.45, power=0.5, rimf=0.55, mv=True)
    # head: a stub of the mother spike hooked over the foe, the plum bud
    st = s.curve([(30, 34), (28, 24), (24, 18.5), (20, 18.5)], (2.6, 2.2))
    s.part(st, base=2, k=1, sh=1, line=0)
    bx, by = 17.5, 21
    m, path = s.leaf((bx + 3.5, by - 3.5), (bx - 3, by + 5), 9, fat=0.6, power=0.6)
    pid = s.part(m, base=1, k=2, sh=0, line=0)
    s.rim(m, pid, 0.5)
    s.px([(16, 19), (16, 20), (15, 21)], 3)
    return s


def back_keiki():
    s = D.back_canvas()
    roots(s, [[(20, 38), (15, 43), (12, 49)], [(26, 39), (30, 44), (33, 49)]], w=(5.0, 4.2))
    leaf(s, (23, 42), (0.4, 15), 25, bend=0.12, power=0.6, rimf=0.5)
    st = s.curve([(24, 32), (27, 16), (32, 9), (37, 8)], (3.4, 3.0))
    s.part(st, base=2, k=1, sh=1, line=0)
    leaf(s, (24, 42), (47.6, 11), 27, bend=-0.12, power=0.6, rimf=0.4)
    m, _ = s.leaf((36, 5), (44, 14), 12, fat=0.6, power=0.6)
    pid = s.part(m, base=1, k=2, sh=0, line=0)
    s.rim(m, pid, 0.5)
    return s


ICON_KEIKI = [
    "................",
    "..kk............",
    ".k31k...........",
    "k111k......kk...",
    "k111kk....k22k..",
    ".k11k2k..k2221k.",
    "..kk.k2kk22221k.",
    ".kkkkk22k22211k.",
    "k3332222k2211k..",
    "k22222221111k...",
    ".k1111111kkk....",
    "..kkk3kk3k......",
    "....k3k.k3k.....",
    "....k3k.k3k.....",
    "...k22k.k22k....",
    "....kk...kk.....",
]


# ---------------------------------------------------------------- spike ----

SPIKE_OPEN = [1.0, 0.0, 0.5, 1.25]


def front_spike(k=0):
    s = D.S(56, 56)
    op = SPIKE_OPEN[k]
    # feet: broad leaves planted wide; a third leaf raised behind (rear arm)
    leaf(s, (34, 47), (51, 30), 12, bend=-0.12, rimf=0.3)
    path = [(32, 48), (23, 41), (26, 30), (37, 24.5), (39, 14), (31, 9), (22, 12)]
    sp = s.curve(path, (3.8, 3.0))
    pid = s.part(sp, base=1, k=1, sh=0, line=0)
    s.rim(sp, pid, 0.5, sides="l")
    pts = D.spline(path, 8)
    for i, r in ((14, 3.0), (22, 3.4), (30, 3.6)):
        bx, by = pts[i]
        m = s.ellipse(bx + 1, by, r * 1.2, r)
        bp = s.part(m, base=1, k=1, sh=0, line=0)
        s.px([(round(bx - r * 0.3), round(by - r * 0.45)), (round(bx - r * 0.3) + 1, round(by - r * 0.45))], 3)
    roots(s, [[(29, 50), (24, 53), (21, 54.6)], [(35, 50), (39, 53), (41, 54.6)]], w=(3.4, 2.4))
    leaf(s, (33, 49), (52, 50.5), 12, bend=-0.08, rimf=0.3)
    leaf(s, (30, 49), (5, 52.5), 13, bend=0.08, rimf=0.45)
    # head: the first flower, white, opening and pulled back over the body
    moth_flower(s, 16, 17, k=0.84, tilt=-18, open_=op, petal=3, rimw=False)
    return s


def back_spike():
    s = D.back_canvas()
    sp = s.curve([(20, 44), (14, 32), (17, 20), (26, 14), (33, 15)], (3.8, 3.2))
    s.part(sp, base=1, k=1, sh=0, line=0)
    for bx, by, r in ((14.5, 32, 3.0), (18, 21, 3.2)):
        s.part(s.ellipse(bx, by, r * 1.15, r), base=1, k=1, sh=0, line=0)
        s.px([(round(bx - 1), round(by - 1))], 3)
    leaf(s, (22, 52), (0, 26), 25, bend=0.1, rimf=0.5)
    leaf(s, (24, 52), (47.6, 28), 24, bend=-0.1, rimf=0.4)
    leaf(s, (23, 52), (31, 28), 15, bend=-0.06, rimf=0.5)
    # the flower from behind: white petal backs round a plum knob
    hx, hy = 32, 15
    for a, L, w in ((200, 13, 12), (100, 13, 10), (60, 13, 10), (-95, 14.5, 10), (-20, 16, 16)):
        r = math.radians(a)
        m, _ = s.leaf((hx, hy), (hx + math.cos(r) * L * 0.82, hy + math.sin(r) * L * 0.82), w * 0.85,
                      fat=0.45, power=0.55)
        s.part(m, base=3, k=2, sh=1, line=0)
    s.part(s.ellipse(hx - 2, hy + 2.5, 3.6, 1.4, math.radians(-50)), base=1, k=0, line=0)
    return s


ICON_SPIKE = [
    "................",
    "..kkk.kk........",
    ".k333k33k.kkk...",
    "k33333333k111k..",
    "k33333333k131k..",
    "k1333333kk11k...",
    ".k1k3331k..kk1k.",
    "..k11kkkk.k1k1k.",
    "...k1k...k11k...",
    "....k...k11k....",
    "..kkk...k1k.....",
    ".k322k.k11k..kk.",
    "k32222kk1kkkk22k",
    "k22222k11k222221",
    ".k1111111111111k",
    "..kkkkkkkkkkkkk.",
]


# ----------------------------------------------------------- moth orchid ---

# (open, flap) per frame
MOTH = [(1.0, 0.0), (0.25, -2.0), (0.7, 1.5), (1.3, 3.5), (1.12, 2.0)]


def front_moth(k=0):
    s = D.S(56, 56)
    op, fp = MOTH[k]
    # the glossy plum leaves (dark slot), white rims, black midribs
    leaf(s, (37, 48), (54.5, 33), 11, bend=-0.14, fat=0.5, power=0.6, tone=1, k=1, rimf=0.5, rib=2)
    neck = s.curve([(38, 46), (45, 33), (44, 17), (36, 10), (25, 15)], (3.0, 2.4))
    npid = s.part(neck, base=1, k=0, line=0)
    s.rim(neck, npid, 0.6, sides="t")
    # the second flower, smaller and higher, never moves
    moth_flower(s, 45.5, 22, k=0.55, tilt=-30, lip=False, line=0, mv=False, veins=False)
    roots(s, [[(28, 48), (21, 50), (15, 53), (11, 54.6)], [(31, 49), (29, 52.5), (27.5, 54.6)],
              [(37, 49), (40, 52), (42, 54.6)], [(39, 47), (46, 49), (50, 52.5), (52, 54.6)]], w=(3.6, 2.2))
    leaf(s, (35, 51), (27, 31), 13, bend=0.1, fat=0.55, power=0.7, tone=1, k=1, rimf=0.6, rib=2)
    sc = s.curve([(31, 44), (20, 47), (10, 44.5), (5, 37.5)], (8.5, 1.4))   # the scythe leaf
    pid = s.part(sc, base=1, k=1, sh=0, line=0)
    s.rim(sc, pid, 0.8, sides="t")
    s.decal(s.line1(D.spline([(29, 45), (20, 47), (12, 45)], 10)) & D.erode(sc, 1), 2, on=pid)
    # the great flower: the head, thrust at the foe
    moth_flower(s, 19, 22, k=1.08, tilt=-14, open_=op, flap=fp)
    return s


def flower_back(s, cx, cy, k=1.0, tilt=14):
    """The flower from behind: wing petal backs (the near one on the right,
    raised toward the foe), the crest's back, the talons, a plum knob."""
    def P(dx, dy):
        return R([(cx + dx * k, cy + dy * k)], tilt, cx, cy)[0]
    for (dx, dy), w, fat in (((-15, -7), 13, 0.45), ((-6, 13), 7.5, 0.35), ((7, 14), 8.5, 0.35),
                             ((-1, -17), 9.5, 0.38), ((18, -4), 17.5, 0.45)):
        m, _ = s.leaf((cx, cy), P(dx, dy), w * k, fat=fat, power=0.5)
        pid = s.part(m, base=2, k=2, sh=1, line=0)
    # the ovary: an elongated plum stub, never a round dark disc (no eye)
    q = P(-2.5, 3.0)
    s.part(s.ellipse(q[0], q[1], 3.4 * k, 1.3 * k, math.radians(tilt + 130)), base=1, k=0, line=0)


def back_moth():
    s = D.back_canvas()
    neck = s.curve([(16, 46), (9, 32), (12, 16), (20, 9), (28, 13)], (3.6, 3.0))
    s.part(neck, base=1, k=0, line=0)
    flower_back(s, 10, 27, k=0.62, tilt=20)
    leaf(s, (22, 47), (0, 33), 15, bend=0.12, tone=1, k=1, rimf=0.5, rib=2)
    leaf(s, (24, 47), (47, 38), 14, bend=-0.1, tone=1, k=1, rimf=0.4, rib=2)
    leaf(s, (22, 50), (14, 28), 13, bend=0.08, tone=1, k=1, rimf=0.6, rib=2)
    flower_back(s, 29, 19, k=1.15, tilt=12)
    return s


ICON_MOTH = [
    "................",
    "....kk..........",
    "..kk22k..kkk....",
    ".k3322kkk222k...",
    "k3222222k22221k.",
    "k22222k2222221k.",
    "k2222k11k2221k..",
    ".k221k11kk11k...",
    "..kkk111k.kk....",
    ".....k11k.......",
    "....k1k1k..kk...",
    "..kk111k1kk11k..",
    ".k3311111k1111k.",
    ".k1111111111kk..",
    "..k33k33k33k....",
    "..kkkkkkkkkk....",
]


# -------------------------------------------------------------- build ------

SPECS = {
    "orchid_keiki": dict(
        fn=front_keiki, n=4, back=back_keiki, icon=ICON_KEIKI, dx=1,
        anim={"intro": [[1, 8], [2, 6], [1, 6], [2, 6], [3, 6], [0, 4]], "idle": [[0, 140], [3, 8]]},
        notes="BOBBING: a plantlet with two fat leaves spread like a moth's wings, the plum bud "
              "hooked over the foe, silver aerial roots as legs. Intro: the leaf wings beat up, down, "
              "up and settle. Crystal rule: plum is the dark slot (bud and leaf shade), leaf green "
              "the light; the aerial roots are the shared white. Sport: a variegated moth orchid, "
              "Phalaenopsis Sogo Vivien 'Variegata' (yellow-green leaves)."),
    "orchid_spike": dict(
        fn=front_spike, n=4, back=back_spike, icon=ICON_SPIKE, dx=3,
        anim={"intro": [[1, 14], [2, 5], [3, 12], [2, 4], [0, 4]], "idle": [[0, 150], [2, 6]]},
        notes="COILED: the flower spike as an S beaded with plum buds, the first white flower "
              "opening at the top, pulled back over the body. Intro: the top flower is a shut bud; "
              "it cracks, BLOOMS wide past rest and settles. Crystal rule: plum is the dark slot "
              "(spike, buds, lip, shade), leaf green the light; the petals are the shared white "
              "(a white Phalaenopsis). Sport: the harlequin moth orchid, a mericlone sport of "
              "Phal. Golden Peoker 'Brother' (maroon splashes)."),
    "moth_orchid": dict(
        fn=front_moth, n=5, back=back_moth, icon=ICON_MOTH, dx=0,
        anim={"intro": [[1, 12], [2, 4], [3, 18], [4, 5], [3, 5], [0, 4]], "idle": [[0, 160], [4, 8]]},
        notes="LOOMING: Flora Vance's ace. The great magenta moth flower thrust at the foe on a "
              "swan-neck spike, wings spread in threat, a hooked plum lip like a claw; glossy plum "
              "leaves on silver root claws. Intro: the wings are folded; they SPREAD wide, hold, and "
              "settle. Crystal rule: plum is the dark slot (leaves, spike, lip, shade), magenta the "
              "light; the roots are the shared white. Sport: the harlequin moth orchid "
              "(cream-gold petals, maroon-black lip and leaves)."),
}


def render(id_):
    sp = SPECS[id_]
    fr = D.frames(sp["fn"], sp["n"], dx=sp["dx"])
    back = D.tones(sp["back"](), open_bottom=True)
    i0 = D.icon(sp["icon"])
    return fr, back, [i0, D.hop(i0)]


def build():
    for id_ in IDS:
        fr, back, ics = render(id_)
        write_species(id_, palette=palette(id_), sport=sport(id_), front=fr, back=[back], icon=ics,
                      anim=SPECS[id_]["anim"], moving=D.moving_boxes(fr), notes=SPECS[id_]["notes"], tool=TOOL)


if __name__ == "__main__":
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/arte_orchid.png")
    items = []
    for id_ in IDS:
        fr, back, ics = render(id_)
        for i, f in enumerate(fr):
            st = D.stats(f)
            if i == 0 or st["white"] > 0.2:
                print(id_, i, {k: (round(v, 3) if isinstance(v, float) else v) for k, v in st.items()})
        items.append((id_, palette(id_), sport(id_), fr, back, ics))
    print(D.preview(items, out))
