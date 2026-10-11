"""The oldest bristlecone on Methuselah Ridge: the `methuselah_tree` structure
(3x3) and the `bristlecone` character, its living base, which the methuselah
NPC stands on at (7,3) just below the structure.

Both are cut from one 48x60 drawing. The structure is rows 0-47; an NPC is
drawn 4px above its tile, so the character's 16x16 frame is rows 44-59,
columns 16-31 (they overlap by four rows, drawn identically, so the seam
never shows). Native integer pixels on the named-colour canvas, light from
the top-left, dark hue-shifted edges instead of black outlines, transparent
outside the silhouette.

The tree: a massive gnarled trunk of bare silver deadwood, twisted so its
grain spirals, flaring into root buttresses that grip the dolomite. One
living strip of rust bark winds up the trunk from the roots and feeds the
only living limb, flagged east by the wind, carrying bottlebrush tufts of
dark needles; everything else is bare snags, the dead leader and a long dead
limb reaching west. The character repeats the base: column 0 at rest,
columns 1-2 with a faint frost glint on the deadwood, every row the same.
"""
from __future__ import annotations

import math

from PIL import Image

import kit
from kit import Canvas

W, H = 48, 60
FRAME = (16, 44)            # the character's frame inside the drawing

DEAD = ("bw0", "bw1", "bw2", "bw3", "bw4")
RUST = ("rb0", "rb1", "rb2")


def trunk_span(y):
    """Left and right edge of the trunk at row y (20..59): a twisted bole that
    swells and pinches as its grain turns, flaring into the roots."""
    cx = 23.5 + 2.0 * math.sin((57 - y) / 7.0)
    half = 6.2 + (y - 20) * 0.02 + 1.0 * math.sin((y - 20) / 4.6) + max(0, y - 49) ** 1.4 * 0.2
    return cx - min(half, 7.6), cx + min(half, 7.6)


def thick_line(cv, pts, w0, w1, col):
    """A limb tapering from w0 to w1 pixels, as stacked Bresenham lines."""
    n = len(pts) - 1
    for i, ((x0, y0), (x1, y1)) in enumerate(zip(pts, pts[1:])):
        wa = w0 + (w1 - w0) * i / n
        wb = w0 + (w1 - w0) * (i + 1) / n
        steps = max(abs(x1 - x0), abs(y1 - y0), 1)
        for k in range(steps + 1):
            t = k / steps
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            r = (wa + (wb - wa) * t) / 2
            for yy in range(int(math.floor(y - r)), int(math.ceil(y + r)) + 1):
                for xx in range(int(math.floor(x - r)), int(math.ceil(x + r)) + 1):
                    if (xx + 0.5 - x - 0.5) ** 2 + (yy + 0.5 - y - 0.5) ** 2 <= r * r + 0.3:
                        cv.px(xx, yy, col)


def shade_silhouette(cv, body, lit, mid, dark, edge, rim):
    """Re-light every pixel of colour `body` from the top-left: a dark rim
    round the whole silhouette (so the pale deadwood holds against the pale
    summit), a lit band inside its upper-left edge, shade inside the lower-right."""
    src = cv.copy()
    for y in range(cv.h):
        for x in range(cv.w):
            if src.get(x, y) != body:
                continue
            out = lambda dx, dy: src.get(x + dx, y + dy) != body
            if out(1, 0) or out(0, 1):
                cv.px(x, y, rim)
            elif out(-1, 0) or out(0, -1):
                cv.px(x, y, edge)
            elif out(-2, 0) or out(0, -2) or out(-1, -1):
                cv.px(x, y, lit)
            elif out(2, 0) or out(0, 2) or out(1, 1):
                cv.px(x, y, dark)
            else:
                cv.px(x, y, mid)


def brush(cv, cx, cy, rx, ry):
    """A bottlebrush tuft of needles: a ragged oval, its rim dark, lit inside
    its upper-left, dark below."""
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            dx, dy = (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry
            d = dx * dx + dy * dy
            ragged = ((x * 5 + y * 3) % 4 == 0)
            if d <= 1.0 - (0.25 if ragged else 0):
                if d > 0.62:
                    col = "nd0" if (dx + dy < -0.9 and not ragged) else "nd2"
                else:
                    col = "nd0" if dx + dy < -0.5 else ("nd2" if dx + dy > 0.6 else "nd1")
                cv.px(x, y, col)


def drawing() -> Canvas:
    cv = Canvas(W, H)
    # --- dead wood: the leader, its snags and the long limb west -------------
    thick_line(cv, [(22, 24), (19, 15), (16, 8), (14, 0)], 9, 2.4, "bw1")        # the dead leader
    thick_line(cv, [(18, 12), (22, 7), (25, 2)], 3, 1.2, "bw1")                  # a snag off it
    thick_line(cv, [(16, 7), (11, 4), (9, 1)], 2.4, 1, "bw1")                    # a broken spur
    thick_line(cv, [(20, 34), (13, 30), (7, 30), (2, 25)], 7, 2.2, "bw1")        # the long dead limb west
    thick_line(cv, [(8, 30), (5, 35)], 2, 1, "bw1")                              # its hooked spur
    # --- the trunk -----------------------------------------------------------
    for y in range(20, 60):
        l, r = trunk_span(y)
        for x in range(int(round(l)), int(round(r)) + 1):
            cv.px(x, y, "bw1")
    shade_silhouette(cv, "bw1", "bw0", "bw1", "bw2", "bw3", "bw4")
    # Spiral grain: diagonal grooves climbing to the right, in long dashes.
    for y in range(20, 58):
        l, r = trunk_span(y)
        for x in range(int(round(l)) + 1, int(round(r))):
            if cv.get(x, y) not in DEAD:
                continue
            u = (x - l) / max(1, r - l)
            if (x - 0.7 * y) % 5 < 1 and (y // 4) % 4 != 2:
                cv.px(x, y, "bw3" if u > 0.5 else "bw2")
    # A knot hole on the shaded side, long and irregular (never round).
    cv.put(["vv", "zvv", " zz"], {"v": "bw3", "z": "bw4"}, 26, 37)
    # Root buttresses: dark clefts between the roots near the ground.
    for x0, slope in ((19, -1), (24, 0), (28, 1)):
        for y in range(50, 60):
            x = x0 + slope * ((y - 50) // 3)
            if cv.get(x, y) in DEAD:
                cv.px(x, y, "bw4" if y > 55 else "bw3")
    # --- the one living strip of rust bark, winding up to the living limb ----
    for y in range(24, 60):
        l, r = trunk_span(y)
        centre = l + (r - l) * (0.6 + 0.24 * math.sin(y / 5.5))
        half = 1.9 if y > 28 else 1.9 - (28 - y) * 0.15
        for x in range(int(math.floor(centre - half)), int(math.ceil(centre + half)) + 1):
            if cv.get(x, y) in DEAD and abs(x + 0.5 - centre) <= half:
                edge = x + 0.5 - centre
                col = "rb0" if edge < -0.7 else ("rb2" if edge > 0.8 else "rb1")
                if y % 3 == 0 and col == "rb1":
                    col = "rb2"                   # ridged bark
                cv.px(x, y, col)
    # --- the living limb, flagged east by the wind, and its needle brushes ---
    thick_line(cv, [(26, 27), (31, 21), (37, 15), (45, 10)], 4.2, 1.4, "rb1")
    thick_line(cv, [(31, 21), (36, 25), (43, 27)], 2.2, 1, "rb1")
    thick_line(cv, [(34, 17), (35, 9), (38, 4)], 1.8, 1, "rb1")
    for y in range(cv.h):
        for x in range(cv.w):
            if cv.get(x, y) == "rb1" and cv.get(x, y - 1) not in RUST and y < 28 and x > 25:
                cv.px(x, y, "rb0")
    # Bottlebrush tufts: dense needle cylinders along the twigs, each its own.
    for cx, cy, rx, ry in ((30, 18, 3.6, 3.0), (36, 12, 4.0, 3.2), (42, 8, 4.0, 3.0), (46, 13, 2.4, 2.6),
                           (37, 22, 3.6, 2.6), (43, 24, 3.4, 2.4), (36, 4, 2.8, 2.4), (41, 17, 3.0, 2.4)):
        brush(cv, cx, cy, rx, ry)
    for x, y in ((39, 15), (33, 19), (40, 21)):
        cv.px(x, y, "bw2")                        # twig ends through the brushes
    # --- the roots' contact with the ground -----------------------------------
    for x in range(16, 32):
        if cv.get(x, 59) in DEAD + RUST:
            cv.px(x, 59, "bw4")
    return cv


def frost_glint(cv: Canvas, which: int) -> Canvas:
    """A faint frost glint on the deadwood of the base (character columns 1-2)."""
    out = cv.copy()
    spots = [(19, 49), (27, 52)] if which == 1 else [(21, 54), (26, 46)]
    for x, y in spots:
        if out.get(x, y) in DEAD:
            out.px(x, y, "f0")
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if out.get(x + dx, y + dy) in DEAD:
                    out.px(x + dx, y + dy, "bw0")
    return out


def methuselah_tree() -> Image.Image:
    cv = drawing()
    return cv.image(opaque=False).crop((0, 0, 48, 48))


def bristlecone() -> Image.Image:
    base = drawing()
    fx, fy = FRAME
    frames = [c.image(opaque=False).crop((fx, fy, fx + 16, fy + 16))
              for c in (base, frost_glint(base, 1), frost_glint(base, 2))]
    sheet = Image.new("RGBA", (48, 64), (0, 0, 0, 0))
    for row in range(4):
        for col, im in enumerate(frames):
            sheet.alpha_composite(im, (col * 16, row * 16))
    return sheet


STRUCTURES = {"methuselah_tree": methuselah_tree}
CHARACTERS = {"bristlecone": bristlecone}
