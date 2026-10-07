"""Original Crystal-rule Opuntia: pear_pad -> padded_cactus -> prickly_pear.

BOBBING baby: one flat oval paddle inclined left on a shallow soil mound.
BRACED teen: four edge-joined paddles, the larger leading pad raised left.
LOOMING adult: a branching paddle stack bearing magenta egg-shaped tunas
and two rim flowers. The warm sage tone stands in for yellow-tinged petals
within the four-colour rule; white is restricted to petal rims and glochids.
Areoles are staggered white ticks, never enclosed dark dots or discs.
Pads rock about their rooted joint; white glochid tufts briefly fan wider.
The soil and basal joint remain fixed throughout the 64-tick intro.
Sport: Santa Rita purple prickly pear, violet pads and plum-magenta fruit.
No artwork from another game is copied, traced or imported.
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image

from _d_kit import BLACK, WHITE, Spr, bez, erode, hop, moving_boxes, rim_white, tones

TOOL = "tools/art/crystal/prickly_pear.py"
IDS = ["pear_pad", "padded_cactus", "prickly_pear"]
PAL = [BLACK, "#983058", "#98b088", WHITE]
SPORT = [BLACK, "#782850", "#b088c0", WHITE]
SPAL = tuple(PAL[1:])
ROCK = [0, -3, 4, 2, -1]

# Flat broad faces, with narrow edge-to-edge attachment points. Coordinates
# are authored at native resolution, back to front (cx, cy, rx, ry, tilt).
PADS = {
    "pear_pad": [(30, 33, 13, 18, 14)],
    "padded_cactus": [(34, 42, 9, 11, -8), (43, 27, 8, 11, -18),
                      (23, 25, 11, 13, 22), (30, 14, 7, 7, 12)],
    "prickly_pear": [(34, 44, 7.5, 9, -8), (45, 31, 6.5, 10, -22),
                     (43, 13, 6, 9, -8), (29, 27, 7, 11, 16),
                     (16, 34, 7, 10, 28), (20, 12, 7, 9, 16)],
}


def local(x, y, cx, cy, angle):
    """Pad-local coordinates rotate with its flat face, including the tufts."""
    a = math.radians(angle)
    return cx + x * math.cos(a) + y * math.sin(a), cy - x * math.sin(a) + y * math.cos(a)


def paddle(s, spec, flick=False, small=False):
    cx, cy, rx, ry, angle = spec
    m = s.ellipse(cx, cy, rx, ry, ang=-math.radians(angle))
    pid = s.part(m, base=2, k=1, sh_tone=0, line=0)
    rim_white(s, m, pid, 0.30)
    # Regular diagonal rows of pale glochids. Each tuft is a two-pixel tick
    # (three at the held extreme), with no dark areole underneath it.
    step = 4 if small else 5
    safe = erode(m, 2)
    for row, y in enumerate(range(-int(ry) + 3, int(ry) - 1, step)):
        for x in range(-int(rx) + 2 + (row % 2) * (step // 2), int(rx) - 1, step):
            p = local(x, y, cx, cy, angle)
            q = local(x + 1, y - 1, cx, cy, angle)
            tick = s.line1([p, q])
            if flick and not small:
                tick |= s.line1([p, local(x - 1, y - 1, cx, cy, angle)])
            s.decal(tick & safe, 3, on=[pid])
    return pid


def soil(s, adult=False):
    left, right = (17, 48) if adult else (16, 46)
    m = s.poly([(left, 53), (left + 5, 51), (right - 6, 51), (right, 55),
                (right - 3, 55), (left + 2, 55)])
    pid = s.part(m, base=1, k=0, line=0)
    s.decal(s.line1([(left + 6, 52), (left + 11, 52)]), 3, on=[pid])
    # Shallow root arches meet the mound, rather than dangling straight roots.
    for ctrl in ([(31, 49), (27, 48), (23, 52)], [(33, 49), (39, 48), (42, 52)]):
        pid = s.part(s.stroke(bez(ctrl, 24), 2, cap=True), base=2, k=0, line=0)
        s.decal(s.line1(bez(ctrl, 24)), 3, on=[pid])


def fruit(s, x, y, angle=0, size=1):
    m = s.ellipse(x, y, 3 * size, 4.5 * size, ang=-math.radians(angle))
    pid = s.part(m, base=1, k=0, line=0)
    # An elongated rim, not a round central glint or a dark seed pit.
    s.decal(s.line1([(x - size, y - 2 * size), (x - size, y + size)]), 3, on=[pid])


def flower(s, x, y, size=1):
    # A shallow open cup of pointed tepals, no central disc. Its green-gold
    # face is the palette's warm sage; white follows only the petal edges.
    pts = [(x - 5 * size, y), (x - 6 * size, y - 5 * size),
           (x - 2 * size, y - 3 * size), (x, y - 6 * size),
           (x + 2 * size, y - 3 * size), (x + 5 * size, y - 5 * size),
           (x + 4 * size, y), (x, y + 2 * size)]
    m = s.poly(pts)
    pid = s.part(m, base=2, k=0, line=0)
    for a, b in ((pts[1], (x - 2 * size, y)), (pts[3], (x, y)),
                 (pts[5], (x + 2 * size, y))):
        s.decal(s.line1([a, b]), 3, on=[pid])


def front(sid, frame=0):
    s = Spr(56, 56, SPAL)
    adult = sid == IDS[2]
    # Soil behind the lowest paddle; rock leaves its contact point anchored.
    soil(s, adult)
    with s.rotated(ROCK[frame] * (0.65 if adult else 1), 33, 50):
        for spec in PADS[sid]:
            paddle(s, spec, flick=frame in (2, 3))
        if adult:
            fruit(s, 8, 22, 20)
            fruit(s, 30, 5, -16)
            fruit(s, 51, 7, -12)
            flower(s, 17, 4, 0.65)
            flower(s, 43, 4, 0.65)
    return tones(s)


def front_frames(sid):
    fs = [front(sid, f) for f in range(len(ROCK))]
    for f in fs[1:]:
        f[49:] = fs[0][49:]
    return fs


def back(sid):
    """Broad rear paddle faces fill the close cropped player viewpoint."""
    s = Spr(48, 48, SPAL)
    if sid == IDS[0]:
        paddle(s, (25, 30, 20, 25, -12))
    else:
        paddle(s, (25, 43, 15, 21, -8))
        paddle(s, (38, 25, 8, 16, -16))
        paddle(s, (13, 24, 10, 17, 18))
        paddle(s, (28, 11, 11, 10, -10))
        if sid == IDS[2]:
            fruit(s, 8, 6, 18)
            fruit(s, 40, 6, -16)
            flower(s, 28, 3, 0.65)
    return tones(s, open_bottom=True)


def icon(sid):
    s = Spr(16, 16, SPAL)
    if sid == IDS[0]:
        paddle(s, (8, 8, 4, 6, 12), small=True)
    else:
        paddle(s, (9, 11, 3, 3, -6), small=True)
        paddle(s, (12, 6, 2, 4, -14), small=True)
        paddle(s, (5, 6, 3, 4, 16), small=True)
        if sid == IDS[2]:
            fruit(s, 4, 1.5, 0, 0.5)
            fruit(s, 11, 1.5, 0, 0.5)
    return tones(s)


ANIM = {"intro": [[0, 8], [1, 12], [2, 16], [3, 8], [4, 12], [0, 8]],
        "idle": [[0, 140], [4, 12], [0, 8]]}


def render():
    return {sid: (front_frames(sid), back(sid), [icon(sid), hop(icon(sid))]) for sid in IDS}


def review_layout(art):
    from kit import to_rgba
    folder = Path(__file__).resolve().parent.parent / "review"
    folder.mkdir(exist_ok=True)
    for scale, name in ((1, "prickly_pear_1x.png"), (3, "prickly_pear_lead_layout.png")):
        sheet = Image.new("RGB", (384 * scale, 56 * scale), (200, 208, 200))
        for n, sid in enumerate(IDS):
            fs, b, icons = art[sid]
            for x, arr in ((0, fs[0]), (56, b), (104, icons[0])):
                im = Image.fromarray(to_rgba(arr, PAL), "RGBA")
                im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                sheet.paste(im, ((128 * n + x) * scale, 0), im)
        sheet.save(folder / name)
    # Every frame at native size, including the rear and both icon frames.
    sheet = Image.new("RGB", (384, 168), (200, 208, 200))
    for n, sid in enumerate(IDS):
        fs, b, icons = art[sid]
        x = 0
        for arr in fs + [b] + icons:
            im = Image.fromarray(to_rgba(arr, PAL), "RGBA")
            sheet.paste(im, (x, 56 * n), im)
            x += im.width
    sheet.save(folder / "prickly_pear_all_frames_1x.png")


def build():
    from kit import intro_strip, write_species
    art = render()
    review_layout(art)
    for sid, (fs, b, icons) in art.items():
        pose = {IDS[0]: "BOBBING: one flat oval paddle tilted left on soil.",
                IDS[1]: "BRACED: four edge-joined paddles, the broad lead pad raised left.",
                IDS[2]: "LOOMING: branching flat paddles with magenta egg-shaped tunas and two rim flowers."}[sid]
        write_species(sid, palette=PAL, sport=SPORT, front=fs, back=[b], icon=icons,
                      anim=ANIM, moving=moving_boxes(fs), tool=TOOL,
                      notes="Crystal rule. " + pose + " Regular diagonal white glochid tufts, no dark areole dots. "
                      "Grey-green pad faces; magenta fruit in the dark slot. "
                      "Yellow-tinged flower cups use warm sage with white petal-edge highlights within four colours. "
                      "Gesture: pads rock and glochids fan, rebound and settle; soil and basal joint stay fixed. "
                      "Sport: Santa Rita purple prickly pear, purple-violet pads and plum-magenta fruit.")
        intro_strip(sid)


if __name__ == "__main__":
    build()
