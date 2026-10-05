"""Bird of paradise line: paradise_shoot -> bird_of_paradise (bloom/fire).

Strelitzia reginae, the crane flower of the Palm House: a fan of stiff,
grey-green, paddle-shaped leaves on long petioles; the flower stalk ends in
a horizontal, boat-shaped green spathe edged red, from which the blooms rise
one after another: three upright orange sepals and two blue petals fused
into an arrow-shaped "tongue". It reads as a crested bird's head, so the
creature is that bird, with no face: the spathe is the beak, the sepals the
crest (and the fire), the blue tongue the lead feather.

Motif: the beak-shaped spathe and the orange crest (the light slot, the
line's accent). Shadows go blue (the dark slot doubles as the blue petals).

paradise_shoot    COILED   the closed spathe drawn back over its S-curved
                           stalk like a heron's head before the strike, a
                           lick of orange at the tip; a paddle leaf raised
                           in front as a guard, two swept up behind.
bird_of_paradise  LUNGING  the open crest thrust at the foe on an arched
                           neck, the blue tongue jutting forward, paddle
                           leaves fanned back like tail plumes, a long lead
                           leaf swept forward low; a spark drifts off the crest.

Scores (CREATURES.md section 9):
  paradise_shoot    8  (2: the drawn-back S reads more as an upright neck;
                        10: the icon is busy at 1x)
  bird_of_paradise  9  (7: the paddle leaves are pillow-ish, rim-light free)
"""

from __future__ import annotations

import math

import numpy as np

from kit import Sprite, at, dilate, erode, move, qbez, spline

PAL = ("#2840a0", "#409060", "#f8a838")        # petal blue (and every shadow) / grey-green / sepal orange
SPORT = ("#4830a0", "#589850", "#f8d850")      # 'Mandela's Gold': golden-yellow crest, violet-blue tongue


def paddle(s, base, mid, tip, w, petiole=2.2, line=0, rib=True, power=0.45):
    """A strelitzia leaf: a long petiole from `base` to `mid`, then a stiff
    oblong paddle blade from `mid` to `tip` with a dark midrib."""
    s.part(s.curve([base, ((base[0] + mid[0]) / 2, (base[1] + mid[1]) / 2 + 0.5), mid], (petiole + 0.6, petiole)),
           base=2, k=1, sh=1, line=line)
    m, path = s.leaf(mid, tip, w, fat=0.46, power=power, blunt=1.0)
    pid = s.part(m, base=2, k=2, sh=1, line=line)
    if rib and math.dist(mid, tip) > 8:
        s.decal(s.line1(path[6:-10]) & erode(m, 1), 1, on=pid)
    return pid


def spathe(s, root, tip, w, droop=0.06):
    """The beak: a boat-shaped bract, green with a blue keel and an
    orange-red lit rim along its top edge."""
    m, path = s.leaf(root, tip, w, bend=droop, fat=0.30, power=0.75)
    pid = s.part(m, base=2, k=2, sh=1, line=0)
    # the lit top rim (the real spathe's red-orange edge), 1px below the outline
    top = m & ~move(m, 0, 1)
    s.decal(top & erode(dilate(m, 0) | m, 0), 3, on=pid)
    return pid, path


def sepal(s, base, tip, w):
    m, _ = s.leaf(base, tip, w, fat=0.40, power=0.8)
    return s.part(m, base=3, k=1, sh=2, line=0)


def tongue(s, base, tip, w):
    """The blue arrow: two fused petals, a spear head on a slim shaft."""
    m, _ = s.leaf(base, tip, w, fat=0.70, power=0.9)
    return s.part(m, base=1, k=0, line=0)


# ---------------------------------------------------------------------------

def front_adult(ph=0):
    s = Sprite(56, 56, PAL)
    b = [0, 1, 2][ph]
    # tail plumes: paddle leaves fanned back and up (the far ones first)
    paddle(s, (37, 53), (45, 36), (54, 17 - b * 0.5), 10.5)
    paddle(s, (39, 53), (47, 44), (55, 31 - b * 0.3), 8.5)
    # feet: the leaf bases splayed
    s.part(s.curve([(33, 48), (29, 52), (22, 55)], (4.6, 2.8)), base=2, k=1, sh=1, line=0)
    s.part(s.curve([(37, 48), (41, 52), (47, 55)], (4.2, 2.6)), base=2, k=1, sh=1, line=0)
    # the neck: the flower stalk arched toward the foe
    neck = s.curve([(35, 55), (39, 44), (37, 33), (31, 26)], (5.0, 3.6))
    s.part(neck, base=2, k=2, sh=1, rim=1, rim_tone=2, line=0)
    # lead leaf: swept forward low, a long wing
    paddle(s, (34, 50), (26, 45), (3, 40 - b * 0.4), 10.5, power=0.62)
    # the crest: three orange sepals rising off the beak, back to front
    hx, hy = 28 - b * 0.5, 22 + b * 0.3
    sepal(s, (hx + 2, hy - 1), (hx + 10, hy - 18 - b * 0.4), 5.0)
    sepal(s, (hx, hy - 1), (hx + 1, hy - 21 - b * 0.5), 5.6)
    sepal(s, (hx - 2, hy - 1), (hx - 10, hy - 17 - b * 0.6), 5.2)
    # the blue tongue jutting forward-up from the crest's foot
    tongue(s, (hx - 2, hy - 2), (hx - 16, hy - 10 - b * 0.3), 4.6)
    # the beak itself
    spathe(s, (hx + 6, hy + 2), (hx - 24, hy + 5 - b * 0.4), 7.0)
    # a spark drifting off the crest (the fire)
    sy = 5 - b
    s.rows(43, sy, [".k.", "k3k", "k3k", ".k."])
    return s


def back_adult():
    """From behind: the beak's keel and the backs of the sepals, leaning
    top-right at the foe; paddle leaves both sides; the stalk runs off below."""
    s = Sprite(48, 48, PAL)
    s.open_bottom = True
    paddle(s, (16, 48), (10, 38), (1, 10), 14)
    paddle(s, (30, 48), (37, 42), (47, 26), 13)
    s.part(s.curve([(22, 48), (21, 38), (23, 28)], (8.0, 6.0)), base=2, k=2, sh=1, line=0)
    paddle(s, (20, 48), (14, 46), (2, 44), 9)
    hx, hy = 24, 23
    sepal(s, (hx - 2, hy - 2), (hx - 10, hy - 21), 7.5)
    sepal(s, (hx + 1, hy - 2), (hx + 5, hy - 23), 8.0)
    tongue(s, (hx + 4, hy - 3), (hx + 21, hy - 16), 6.0)
    sepal(s, (hx + 3, hy - 2), (hx + 17, hy - 18), 7.0)
    spathe(s, (hx - 12, hy + 7), (hx + 24, hy - 5), 12.5, droop=-0.05)
    return s


def front_shoot(ph=0):
    s = Sprite(56, 56, PAL)
    b = [0, 1][ph]
    # tail: a new leaf still rolled into a spear, and a paddle swept up behind
    s.part(s.curve([(37, 53), (45, 46), (53, 37 - b * 0.4)], (3.6, 1.6)), base=2, k=1, sh=1, line=0)
    paddle(s, (35, 53), (42, 40), (51, 21 - b * 0.5), 9.0)
    # feet
    s.part(s.curve([(31, 49), (27, 52.5), (20, 55)], (4.2, 2.4)), base=2, k=1, sh=1, line=0)
    s.part(s.curve([(35, 49), (39, 52.5), (45, 55)], (3.8, 2.2)), base=2, k=1, sh=1, line=0)
    # the neck: an S, the head drawn back over the body before the strike
    neck = s.curve([(33, 55), (37, 45), (33, 36), (29, 29), (32, 21), (37 + b * 0.5, 17 + b * 0.5)], (4.6, 3.2))
    s.part(neck, base=2, k=2, sh=1, line=0)
    # the closed beak, tipped down at the foe; a lick of orange splitting its top
    hx, hy = 38 + b * 0.5, 16 + b * 0.5
    s.part(s.leaf((hx - 6, hy - 1), (hx - 15, hy - 8 - b * 0.4), 3.8, fat=0.4)[0], base=3, k=1, sh=2, line=0)
    spathe(s, (hx + 4, hy), (hx - 25, hy + 8 + b * 0.3), 8.0, droop=-0.05)
    # lead leaf raised in front as a guard
    paddle(s, (32, 50), (25, 43), (6, 34 - b * 0.4), 10.0, power=0.6)
    return s


def back_shoot():
    s = Sprite(48, 48, PAL)
    s.open_bottom = True
    paddle(s, (18, 48), (10, 38), (1, 12), 13)
    paddle(s, (28, 48), (36, 42), (47, 30), 12)
    s.part(s.curve([(22, 48), (22, 38), (24, 28)], (7.5, 5.6)), base=2, k=2, sh=1, line=0)
    paddle(s, (20, 48), (13, 46), (1, 45), 9)
    s.part(s.leaf((27, 17), (38, 4), 5.0, fat=0.4)[0], base=3, k=1, sh=2, line=0)
    spathe(s, (9, 31), (47, 11), 14, droop=-0.04)
    return s


ICON_ADULT = [
    "......k.........",
    ".....k3k..k.....",
    "..k..k3k.k3k....",
    ".k3k.k3kk3k.....",
    "..k3kk3k33k.....",
    "kk.k33333k......",
    "k1kkk3331k......",
    ".k11kk11kkkk....",
    "..kk2222223kk...",
    "....kkkk22211k..",
    ".........k21k.k.",
    "........k21k.k2k",
    "..kkk..k21kk22k.",
    ".k222kkk22k221k.",
    "k22222kk21k2k...",
    ".kkkkk.kkkkk....",
]
ICON_SHOOT = [
    "................",
    "................",
    ".......kk.......",
    "......k33k......",
    "...kkkk3kkkkk...",
    ".kk333332222221k",
    "..kk1111222221k.",
    "....kkkkk2221k..",
    "...kk...k221k...",
    "..k22k..k21k.kk.",
    ".k2221k.k21kk22k",
    ".k22221kk21k221k",
    "..k2221kk21k21k.",
    "...kk11kk21k1k..",
    ".....kkk211kk...",
    "......kkkkk.....",
]


def _up(rows):
    return rows[1:] + ["                "]


NOTES = ("Strelitzia reginae. Beak = spathe, crest = the orange sepals (light slot, the line's accent), "
         "the blue petal 'tongue' and every shadow share the dark slot.")
SPRITES = {
    "paradise_shoot": dict(pal=PAL, sport=SPORT, sport_name="'Mandela's Gold' (yellow sepals; Kirstenbosch, 1996)",
                           front=front_shoot, frames=2, back=back_shoot, icon=ICON_SHOOT, icon2=_up(ICON_SHOOT),
                           notes="COILED: the closed beak drawn back on an S stalk. " + NOTES,
                           ref="Strelitzia reginae (bird of paradise)"),
    "bird_of_paradise": dict(pal=PAL, sport=SPORT, sport_name="'Mandela's Gold' (yellow sepals; Kirstenbosch, 1996)",
                             front=front_adult, frames=3, back=back_adult, icon=ICON_ADULT, icon2=_up(ICON_ADULT),
                             notes="LUNGING: the open crest thrust at the foe, paddle leaves fanned back. " + NOTES,
                             ref="Strelitzia reginae (bird of paradise)"),
}
