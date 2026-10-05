"""Moth orchid line (Phalaenopsis): orchid_keiki -> orchid_spike -> moth_orchid.

Motif: the MOTH FLOWER (two broad wing petals, a pointed crest sepal, a
clawed lip) carried on an ARCHING SPIKE. Accent: the plum dark (slot 1),
which shades the keiki's bud, beads the spike's buds and finally becomes
the moth orchid's glossy black-plum leaves.

orchid_keiki  BOBBING  a baby plantlet: two fat leaves spread like a moth's wings (the lead
                       one bigger and lower), the plum bud hooked over the foe as its head,
                       silver aerial roots as legs, one curling up behind as the tail.
                       Idle: the wings flutter 1px, the bud dips.
                       score: 8 (fill 26% is light for a baby; the icon is a simplification)
orchid_spike  COILED   the flower spike as an S: plump plum buds beaded up it like
                       vertebrae, the first blush flower opening at the top and pulled
                       back over the body, broad leaves planted as feet, one raised behind.
                       Idle: the coil tightens 1px, the flower dips toward the foe.
                       score: 8 (the spike reads thin at 1x; the leaves are plain)
moth_orchid   LOOMING  Flora's ace: the great magenta moth flower thrust at the foe on a
                       swan-neck spike, wings spread in threat, crest sepal up, talon
                       sepals and a hooked plum lip like a claw; a second flower behind;
                       glossy black-plum leaves (a scythe leaf raised forward) on
                       silver root claws. Idle: the wings beat 1-2px.
                       score: 8 (strongest of the line; the leaf mass is flat-shaded)

Sports: keiki = variegated Phalaenopsis Sogo Vivien; spike and moth orchid =
the harlequin moth orchid (a mericlone sport of Phal. Golden Peoker).
See docs/SPORTS.md.
"""

from __future__ import annotations

import numpy as np

from px import Sprite, bezier, blob
from kit import rot, selout, icon, icon2, nudge

IDS = ["orchid_keiki", "orchid_spike", "moth_orchid"]

KEIKI = ["#4a2c58", "#68a850", "#e0f0a8"]         # plum (shade, bud), leaf green, lime-silver (roots, light)
SPIKE = ["#502860", "#70b058", "#f8d8d0"]         # plum (shade, buds, lip), leaf green, blush (petals, light)
MOTH = ["#482058", "#c84898", "#f8d0c8"]          # plum (leaves, shade), magenta petals, blush light

CREDIT = ("Hand-built for Verdant Reach (tools/art/species_e). Botany reference: Phalaenopsis "
          "hybrids and P. amabilis, Wikimedia Commons.")

SPECIES = {
    "orchid_keiki": dict(
        pal=KEIKI,
        sport=["#181818", "#5a4830", "#c0c060", "#f8f8d8"],
        credits=CREDIT,
        notes="BOBBING. Sport: a variegated-leaf moth orchid, Phalaenopsis Sogo Vivien 'Variegata' "
              "(cream-edged, yellow-green leaves).",
    ),
    "orchid_spike": dict(
        pal=SPIKE,
        sport=["#181818", "#401830", "#88a858", "#f8f0c8"],
        credits=CREDIT,
        notes="COILED. Sport: the harlequin moth orchid, a mericlone sport of Phalaenopsis Golden "
              "Peoker 'Brother' (cream bloom splashed maroon-black: the plum slot turns maroon).",
    ),
    "moth_orchid": dict(
        pal=MOTH,
        sport=["#181818", "#401830", "#e8d088", "#f8f8e0"],
        credits=CREDIT,
        notes="LOOMING. Sport: the harlequin moth orchid, a mericlone sport of Phalaenopsis Golden "
              "Peoker 'Brother' (cream-gold petals, maroon-black lip, veins and leaves).",
    ),
}


def veins(s, ctrls, tone=1, over=(2,)):
    for ctrl in ctrls:
        for x, y in bezier(ctrl, 60):
            x, y = int(x), int(y)
            if 0 <= x < s.w and 0 <= y < s.h and s.t[y, x] in over:
                s.px([(x, y)], tone, protect=False)


# --------------------------------------------------------------------------- keiki

def keiki_front(f=0):
    s = Sprite(56, 56, KEIKI)
    c = s.c
    sw = (0, 0.7, 1.4)[f]
    # legs: the aerial roots, silver with green growing tips; one curls up behind (tail)
    roots = (c.curve([(28, 40), (24, 46), (21, 51), (19.5, 55.4)], 4.4, 3.2)
             | c.curve([(32, 41), (34, 48), (37, 55.4)], 4.4, 3.2))
    tail = c.curve([(34, 42), (43, 45), (48, 42 - sw * 0.5), (47, 37.5 - sw * 0.5)], 3.6, 2.6)
    # wings: two fat young leaves spread like a moth's, the lead one bigger and lower
    rear = c.leaf((32, 37), (49, 24 - sw), 13, bend=2.0, power=0.6, tip=1.2)
    mid = c.leaf((30, 40), (34, 25), 10, bend=1.0, power=0.65, tip=1.3)
    lead = c.leaf((31, 40), (8, 30 - sw), 17, bend=-2.5, power=0.55, tip=1.2)
    # head: a stub of the mother spike, hooked over the foe, with the plum bud
    stalk = c.curve([(30, 34), (28, 24), (24, 18.5), (20 - sw * 0.5, 18.5 + sw * 0.3)], 2.4, 2.2)
    bx, by = 17.5 - sw * 0.6, 21 + sw * 0.4
    bud = c.leaf((bx + 3.5, by - 3.5), (bx - 3, by + 4.5), 8.5, power=0.6, tip=1.6, base=0.5)
    s.add(tail, tones=(2, 3, 3), shade=(1, 1))
    s.add(rear, tones=(1, 2, 3), shade=(2, 2), band=(1, 2))
    s.add(roots, tones=(2, 3, 3), shade=(1, 1))
    s.add(mid, tones=(1, 2, 2), shade=(2, 2))
    s.add(stalk, tones=(1, 1, 2), shade=(1, 0))
    s.add(lead, tones=(1, 2, 3), shade=(2, 3), band=(1, 2), line="black")
    s.add(bud, tones=(1, 1, 3), shade=(2, 2), line="black")
    s.render()
    # green growing tips on the roots
    for x, y in ((19, 54), (20, 54), (21, 54), (36, 54), (37, 54), (38, 54), (47, 38), (48, 38), (47, 37)):
        if s.t[y, x] == 3:
            s.px([(x, y)], 2)
    veins(s, [[(30, 38), (22, 35), (14, 31)]], tone=1, over=(2,))
    gx, gy = int(bx - 1), int(by - 1)
    s.px([(gx, gy), (gx, gy + 1)], 3)
    selout(s, region=(c.Y < 32) & (c.X < 30))
    s.clean()
    return s.image()


def keiki_back():
    """From behind and above: the two leaves' glossy backs spread like wings,
    the roots dangling out of frame, the bud stalk hooked toward the top-right."""
    s = Sprite(48, 48, KEIKI, crop_bottom=True)
    c = s.c
    roots = (c.curve([(20, 38), (15, 43), (12, 49)], 5.0, 4.2) | c.curve([(26, 39), (30, 44), (33, 49)], 5.0, 4.2))
    left = c.leaf((23, 42), (0.4, 15), 25, bend=-3.5, power=0.7, tip=1.2)
    right = c.leaf((24, 42), (47.6, 11), 27, bend=3.5, power=0.7, tip=1.2)
    stalk = c.curve([(24, 32), (27, 16), (32, 9), (37, 8)], 3.4, 3.0)
    bud = c.leaf((36, 5), (44, 14), 12, power=0.6, tip=1.6, base=0.5)
    s.add(roots, tones=(2, 3, 3), shade=(2, 1))
    s.add(left, tones=(1, 2, 3), shade=(2, 3), band=(1, 2))
    s.add(stalk, tones=(1, 1, 2), shade=(1, 0))
    s.add(right, tones=(1, 2, 3), shade=(2, 3), band=(1, 2), line="black")
    s.add(bud, tones=(1, 1, 3), shade=(2, 2), line="black")
    s.render()
    veins(s, [[(23, 37), (13, 29), (3, 19)], [(25, 37), (36, 29), (45, 18)]], tone=1)
    selout(s, region=(c.Y < 26) & (c.X < 24))
    s.clean()
    return s.image()


KEIKI_ICON = [
    "...00...........",
    "..0110..........",
    ".013110.....00..",
    ".011110....0220.",
    "..01100...02220.",
    "..000.0..022210.",
    ".0330000022210..",
    ".0322220022110..",
    "..02222221110...",
    "...011111000....",
    "....003030......",
    "....030.030.....",
    "....030.030.....",
    "...0330.0330....",
    "....00...00.....",
    "................",
]


# --------------------------------------------------------------------------- spike

def spike_front(f=0):
    s = Sprite(56, 56, SPIKE)
    c = s.c
    sw = (0, 0.7, 1.4)[f]
    # feet: broad leaves planted wide, roots between them; a third leaf raised behind
    leafL = c.leaf((30, 49), (5, 52.5), 13, bend=-2.0, power=0.7, tip=1.3)
    leafR = c.leaf((33, 49), (52, 50.5), 12, bend=2.0, power=0.7, tip=1.3)
    leafB = c.leaf((34, 47), (51, 30 - sw * 0.5), 12, bend=2.5, power=0.65, tip=1.3)    # rear arm
    roots = c.curve([(29, 50), (24, 53), (21, 55.4)], 3.4, 2.4) | c.curve([(35, 50), (39, 53), (41, 55.4)], 3.4, 2.4)
    # the coiled spike: an S, plump buds beaded along it like vertebrae, the
    # opening flower pulled back over the body, ready to whip forward
    path = [(32, 48), (23, 41), (26, 30), (37, 24.5), (39, 14), (31, 9), (22 - sw * 0.5, 12 + sw * 0.3)]
    spike = c.curve(path, 3.8, 3.0)
    s.add(leafB, tones=(1, 2, 3), shade=(2, 2), band=(1, 2))
    s.add(spike, tones=(1, 1, 1), flat=True)
    pts = bezier(path, 40)
    for i, r in ((10, 3.0), (17, 3.3), (24, 3.5)):
        bx, by = pts[i]
        s.add(c.ellipse(bx + 1, by, r * 1.2, r), tones=(1, 1, 3), shade=(1, 1), line="black")
    s.add(roots, tones=(2, 3, 3), shade=(1, 1))
    s.add(leafR, tones=(1, 2, 3), shade=(2, 2), band=(1, 2))
    s.add(leafL, tones=(1, 2, 3), shade=(2, 2), band=(1, 2), line="black")
    # head: the first flower opening, wings half spread, the plum lip hooked
    hx, hy = 16 - sw, 18 + sw * 0.4

    def P(dx, dy):
        (x, y), = rot([(hx + dx * 1.15, hy + dy * 1.15)], -18, (hx, hy))
        return (x, y)

    for p1, w, ln in ((P(10, -6), 11, "dark"), (P(4, 10), 7, "dark"), (P(1, -12), 8.5, "dark"),
                      (P(-5, 10), 8, "dark"), (P(-12, -3), 14, "black")):
        s.add(c.leaf((hx, hy), p1, w, power=0.5, tip=1.5), tones=(1, 3, 3), shade=(2, 2), line=ln)
    lip = blob(c, [P(1, -2), P(-3, 0), P(-5, 4), P(-7, 8.5), P(-3, 6.5), P(1, 3)])
    s.add(lip, tones=(1, 1, 2), shade=(1, 1), line="black")
    s.render()
    veins(s, [[P(-2, -1), P(-6, -3), P(-11, -3)], [P(2, -2), P(5, -4), P(9, -6)]], tone=1, over=(3,))
    (gx, gy) = P(-9, -6)
    s.px([(int(gx), int(gy)), (int(gx) + 1, int(gy))], 3)
    selout(s, region=(c.Y < 24) & (c.X < 30), lit=(2, 3))
    s.clean()
    return s.image()


def spike_back():
    s = Sprite(48, 48, SPIKE, crop_bottom=True)
    c = s.c
    leafL = c.leaf((22, 52), (0, 26), 25, bend=-2.5, power=0.7, tip=1.3)
    leafR = c.leaf((24, 52), (47.6, 28), 24, bend=2.5, power=0.7, tip=1.3)
    leafM = c.leaf((23, 52), (31, 28), 15, bend=1.5, power=0.7, tip=1.3)
    spike = c.curve([(20, 44), (14, 32), (17, 20), (26, 14), (33, 15)], 3.8, 3.2)
    s.add(spike, tones=(1, 1, 1), flat=True)
    for bx, by, r in ((14.5, 32, 3.0), (18, 21, 3.2)):
        s.add(c.ellipse(bx, by, r * 1.15, r), tones=(1, 1, 3), shade=(1, 1))
    s.add(leafL, tones=(1, 2, 3), shade=(2, 2), band=(1, 2))
    s.add(leafR, tones=(1, 2, 3), shade=(2, 2), band=(1, 2))
    s.add(leafM, tones=(1, 2, 3), shade=(3, 3), band=(1, 2), line="black")
    hx, hy = 32, 15
    for a, L, w in ((200, 13, 12), (100, 13, 10), (60, 13, 10), (-95, 14.5, 10), (-20, 16, 16)):
        r = np.radians(a)
        s.add(c.leaf((hx, hy), (hx + np.cos(r) * L, hy + np.sin(r) * L), w, power=0.5, tip=1.5),
              tones=(1, 3, 3), shade=(2, 2), line="dark")
    s.add(c.ellipse(hx, hy, 2.8, 2.4), tones=(2, 2, 2), flat=True, line="black")
    s.render()
    selout(s, region=(c.Y < 22) & (c.X < 26), lit=(2, 3))
    s.clean()
    return s.image()


SPIKE_ICON = [
    "....0...........",
    "..0030..........",
    ".030330.000.....",
    ".03333303330....",
    ".03331033320....",
    ".0333110330.....",
    "..03110.0110....",
    "...000..01110...",
    "........0110....",
    ".......0100.....",
    "...000.010.00...",
    "..022200100220..",
    ".0322222112220..",
    ".01111111111110.",
    "..000000000000..",
    "................",
]


# --------------------------------------------------------------------------- moth orchid

def moth_flower(s, cx, cy, k=1.0, tilt=-14, flap=0.0, lip=True, line="black"):
    """A Phalaenopsis flower in 3/4, facing the foe: two broad wing petals
    (the near one bigger and lower), a pointed crest sepal, two talon sepals
    and the hooked plum lip. k scales it, tilt rotates it (- = top to the left)."""
    c = s.c

    def P(dx, dy):
        (x, y), = rot([(cx + dx * k, cy + dy * k)], tilt, (cx, cy))
        return (x, y)

    def part(p1, w, power=0.55, tip=1.0, ln="dark", tones=(1, 2, 3)):
        s.add(c.leaf((cx, cy), p1, w * k, power=power, tip=tip), tones=tones, shade=(2, 2), band=(1, 2), line=ln)

    part(P(15, -7 - flap * 0.5), 13, power=0.5)                         # rear wing petal: smaller, higher
    part(P(6, 13), 7.5, tip=2.4, power=0.6)                             # rear talon sepal
    part(P(1, -17), 9.5, tip=2.0, power=0.6)                            # crest (dorsal sepal)
    part(P(-7, 14), 8.5, tip=2.4, power=0.6)                            # lead talon sepal
    part(P(-18, -4 - flap), 17.5, power=0.45, ln=line)                  # lead wing petal: big, near
    if lip:
        # the lip: side lobes cupped round the column, the mid lobe hooked down
        # at the foe like a claw (the callus is the light fleck at its root)
        pts = [P(2, -3), P(-3, -2), P(-6, 2), P(-9, 7), P(-11, 12), P(-7, 10.5), P(-3, 7), P(1, 5), P(4, 1)]
        s.add(blob(c, pts), tones=(1, 1, 3), shade=(1, 1), line="black")


def moth_front(f=0):
    s = Sprite(56, 56, MOTH)
    c = s.c
    sw = (0, 0.7, 1.4)[f]
    # legs: silver aerial roots splayed like claws, two forward, two back
    roots = (c.curve([(28, 48), (21, 50), (15, 53), (11, 55.4)], 3.6, 2.2)
             | c.curve([(31, 49), (29, 52.5), (27.5, 55.4)], 3.4, 2.2)
             | c.curve([(37, 49), (40, 52), (42, 55.4)], 3.4, 2.2)
             | c.curve([(39, 47), (46, 49), (50, 52.5), (52, 55.4)], 3.6, 2.2))
    # the swan-neck spike: up from the leaves, arching over into the head
    neck = c.curve([(38, 46), (45, 33), (44, 17), (36, 10), (25 - sw * 0.6, 15 + sw * 0.3)], 3.0, 2.4)
    rearleaf = c.leaf((37, 48), (54.5, 33 - sw * 0.5), 11, bend=2.5, power=0.7, tip=1.4)
    chest = c.leaf((35, 51), (27, 31), 13, bend=-2.0, power=0.75, tip=1.4, base=0.6)
    lead = c.curve([(31, 44), (20, 47), (10, 44.5 - sw * 0.4), (5, 37.5 - sw)], 8.5, 1.4)   # scythe leaf
    s.add(rearleaf, tones=(1, 1, 2), shade=(2, 2), band=(1, 2))
    s.add(neck, tones=(1, 1, 1), flat=True)
    moth_flower(s, 45.5, 22, k=0.55, tilt=-30, flap=sw * 0.5, lip=False, line="dark")   # the second flower
    s.add(roots, tones=(2, 3, 3), shade=(1, 1))
    s.add(chest, tones=(1, 1, 2), shade=(3, 3), band=(1, 2), line="black")
    s.add(lead, tones=(1, 1, 2), shade=(2, 2), band=(1, 2), line="black")
    hx, hy = 19 - sw, 22 + sw * 0.4
    moth_flower(s, hx, hy, k=1.08, tilt=-14, flap=sw)
    s.render()
    # wing veins (dark, broken toward the light) and the head's glint
    veins(s, [[(hx - 4, hy - 1), (hx - 10, hy - 3), (hx - 16, hy - 9)],
              [(hx - 4, hy + 1), (hx - 11, hy + 1), (hx - 17, hy - 2)]])
    veins(s, [[(hx + 3, hy - 2), (hx + 8, hy - 6), (hx + 12, hy - 11)]])
    gx, gy = int(hx - 13), int(hy - 9 - sw)
    s.px([(gx, gy), (gx + 1, gy), (gx + 1, gy - 1)], 3)
    selout(s, region=(c.Y < 22) & (c.X < 30))
    s.clean()
    return s.image()


def flower_back(s, cx, cy, k=1.0, tilt=14, stalk=None):
    """The same flower seen from behind: wing petal backs (the near one, on
    the right now, bigger and raised toward the foe), the crest's back, the
    talons, and the plum ovary knob where the stalk joins."""
    c = s.c

    def P(dx, dy):
        (x, y), = rot([(cx + dx * k, cy + dy * k)], tilt, (cx, cy))
        return (x, y)

    def part(p1, w, power=0.55, tip=1.0, ln="dark"):
        s.add(c.leaf((cx, cy), p1, w * k, power=power, tip=tip), tones=(1, 2, 3), shade=(2, 2), band=(1, 2), line=ln)

    part(P(-15, -7), 13, power=0.5)
    part(P(-6, 13), 7.5, tip=2.4, power=0.6)
    part(P(7, 14), 8.5, tip=2.4, power=0.6)
    part(P(-1, -17), 9.5, tip=2.0, power=0.6)
    part(P(18, -4), 17.5, power=0.45, ln="black")
    s.add(c.ellipse(*P(0.5, 0.5), 2.6 * k, 2.2 * k), tones=(1, 1, 1), flat=True, line="black")


def moth_back():
    """From behind and above: the glossy leaf fan cropped at the bottom, the
    swan-neck spike rising from it and the big flower's back leaning to the
    top-right, a second flower lower on the spike."""
    s = Sprite(48, 48, MOTH, crop_bottom=True)
    c = s.c
    leafL = c.leaf((22, 47), (0, 33), 15, bend=-2.5, power=0.7, tip=1.4)
    leafR = c.leaf((24, 47), (47, 38), 14, bend=2.0, power=0.7, tip=1.4)
    leafM = c.leaf((22, 50), (14, 28), 13, bend=-1.5, power=0.7, tip=1.4)
    neck = c.curve([(16, 46), (9, 32), (12, 16), (20, 9), (28, 13)], 3.6, 3.0)
    s.add(neck, tones=(1, 1, 1), flat=True)
    flower_back(s, 10, 27, k=0.62, tilt=20)
    s.add(leafL, tones=(1, 1, 2), shade=(2, 2), band=(1, 2))
    s.add(leafR, tones=(1, 1, 2), shade=(2, 2), band=(1, 2))
    s.add(leafM, tones=(1, 1, 2), shade=(3, 3), band=(1, 2), line="black")
    flower_back(s, 29, 19, k=1.15, tilt=12)
    s.render()
    veins(s, [[(31, 18), (38, 15), (46, 11)], [(31, 20), (39, 19), (46, 16)]])
    selout(s, region=(c.Y < 22) & (c.X < 26))
    s.clean()
    return s.image()


MOTH_ICON = [
    "................",
    ".....0..........",
    "...0030...00....",
    "..03032000220...",
    ".0333220222210..",
    ".03322212222210.",
    ".02222112222210.",
    "..022111122110..",
    "...0111100100...",
    "....01110010....",
    "...0.01100100...",
    "..020010010220..",
    ".0211110011120..",
    ".01111111111110.",
    "..000000000000..",
    "................",
]


def make(id_):
    f, b, pal, ic = {
        "orchid_keiki": (keiki_front, keiki_back, KEIKI, KEIKI_ICON),
        "orchid_spike": (spike_front, spike_back, SPIKE, SPIKE_ICON),
        "moth_orchid": (moth_front, moth_back, MOTH, MOTH_ICON),
    }[id_]
    dx = {"orchid_keiki": 1, "orchid_spike": 3, "moth_orchid": 2}[id_]
    i1 = icon(ic, pal)
    return {"front": nudge(f(0), dx), "front__2": nudge(f(1), dx), "front__3": nudge(f(2), dx),
            "back": b(), "icon": i1, "icon__2": icon2(i1)}
