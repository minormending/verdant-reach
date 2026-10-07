"""Original Crystal-rule Rhizophora mangle, from pencil to prop-root grove.

mangrove_propagule: BOBBING, a long green pencil with a brown rooting tip,
two first leaves and a shallow mud bank, tilting left in the tidal wash.
mangrove_sapling: BRACED, a few broad glossy leaf paddles on a curved stem,
held above the water by widely arching red-brown stilt roots.
red_mangrove: LOOMING, a rounded dense crown leaning left over a tangle of
bowed prop roots. The gaps beneath those arches are as important as the wood.

The propagule bobs; tree roots compress, spread, rebound and settle while
the crown stays pixel-identical. White-only water glints ripple at contact.
Sport: natural yellow-green, interpreted as sun-bleached foliage, not a
named cultivar or genetically stable sport (docs/SPORTS.md).
All geometry is original; no other game's sprites are used.
"""

from __future__ import annotations

import numpy as np

from _d_kit import BLACK, WHITE, T, Spr, bez, tones, rim_white, moving_boxes, hop, icon_arr

TOOL = "tools/art/crystal/mangrove.py"
IDS = ["mangrove_propagule", "mangrove_sapling", "red_mangrove"]
PAL = [BLACK, "#884830", "#58a850", WHITE]
SPORT = [BLACK, "#906038", "#b8c868", WHITE]
SPAL = tuple(PAL[1:])
KEYS = [0.0, -1.0, 2.0, 1.0, -0.5]
ANIM = {"intro": [[0, 8], [1, 12], [2, 6], [3, 16], [4, 10], [0, 8]],
        "idle": [[0, 140], [1, 10], [0, 8]]}


def paddle(s, base, tip, width, bend=0.08, gloss=0.55):
    """An entire leathery leaf: broad flat oval face, short pointed apex.

    The light midrib is a long stroke; there are no enclosed dark marks.
    The black shade crescent is continuous with the outline, not a dot.
    """
    m, path = s.leaf(base, tip, width, fat=0.52, bend=bend, blunt=0.8)
    pid = s.part(m, base=2, k=1, sh_tone=0, line=0)
    rim_white(s, m, pid, gloss)
    # A broad elongated reflection on the lit face, following the midrib.
    highlight = s.stroke(path[22:59], 1.8, cap=False)
    s.decal(highlight, 3, on=[pid])
    return pid


def wood(s, ctrl, width=3.0, shine=True):
    """Round woody arch, with a narrow lengthwise glint on its lit side."""
    path = bez(ctrl, 80)
    m = s.stroke(path, width, cap=True)
    pid = s.part(m, base=1, k=0, line=0)
    if shine:
        lit = [(x - 0.5, y - 0.5) for x, y in path[8:58]]
        s.decal(s.line1(lit), 3, on=[pid])
    return pid


def wash(s, left, right, y, pulse=0.0):
    """Broken white specular crests; no water colour or filled water pad."""
    for a, b, dy in ((left, left + 9, 0), (left + 12, left + 18, 1),
                     (right - 13, right - 7, 0), (right - 4, right, 1)):
        path = [(a, y + dy), ((a + b) / 2, y + dy - abs(pulse) * 0.5),
                (b, y + dy)]
        m = s.stroke(bez(path, 30), 1.2, cap=False)
        s.part(m, base=3, k=0, line=0)


def mud(s):
    """Shallow counter-mass of wet tidal mud, not a wide green leaf pad."""
    m = s.poly([(12, 53), (15, 48), (22, 46), (32, 45), (42, 47),
                (49, 51), (48, 54), (15, 54)])
    pid = s.part(m, base=1, k=0, line=0)
    for pts in ([(16, 50), (21, 49), (27, 49)], [(36, 49), (42, 50)],
                [(21, 52), (26, 52)]):
        s.decal(s.line1(pts), 3, on=[pid])


def pencil(s, bob=0.0, close=False):
    """A gently curved cylindrical propagule with a tapered brown tip."""
    if close:
        ctrl, width = [(29, 58), (29, 39), (21, 25), (22, 12)], (23, 19)
        leaves = [((22, 16), (2, 9), 13), ((23, 15), (40, 3), 12)]
    else:
        ctrl = [(34, 49 + bob), (34, 39 + bob), (27, 28 + bob), (28, 20 + bob)]
        width = (11.5, 8.0)
        leaves = [((28, 22 + bob), (17, 17 + bob), 6.0),
                  ((29, 21 + bob), (37, 15 + bob), 5.5)]
    path = bez(ctrl, 100)
    m = s.stroke(path, width, cap=False)
    pid = s.part(m, base=2, k=1, sh_tone=1, line=0)
    tip = s.poly([(0, 43 + bob), (55, 43 + bob), (55, 60), (0, 60)])
    s.decal(tip, 1, on=[pid])
    # Parallel interrupted streaks describe a long cylinder, never rings.
    lit = [(x - (4 if close else 2), y)
           for x, y in path[int(len(path) * 0.20):int(len(path) * 0.85)]]
    s.decal(s.stroke(lit, 2.4 if close else 1.0, cap=False), 3, on=[pid])
    for base, end, w in leaves:
        paddle(s, base, end, w)


TEEN_LEAVES = [
    ((32, 19), (40, 9), 10),
    ((32, 26), (48, 19), 10),
    ((30, 26), (17, 13), 12),
    ((31, 19), (22, 9), 10),
    ((30, 28), (10, 24), 12),
    ((32, 30), (44, 31), 10),
]
ADULT_LEAVES = [
    ((27, 17), (16, 3), 9), ((33, 18), (29, 1), 9),
    ((38, 18), (42, 4), 10), ((43, 23), (53, 12), 9),
    ((22, 20), (5, 13), 9), ((28, 23), (17, 10), 10),
    ((36, 25), (34, 11), 9), ((43, 27), (49, 17), 8),
    ((20, 28), (2, 24), 8), ((28, 30), (14, 23), 10),
    ((41, 28), (49, 25), 8),
]


def roots(s, adult, flex=0.0, close=False):
    """Roots descend from trunk/branches on broad bows with open air below.

    Ground contacts stay fixed. Only the control points above them flex,
    so the silhouette compresses then opens into a planted wider stance.
    """
    if close:
        paths = [([(24, 24), (4, 28), (7, 39), (2, 54)], 6),
                 ([(26, 25), (46, 29), (38, 44), (45, 55)], 6),
                 ([(26, 28), (10, 38), (17, 46), (13, 56)], 6),
                 ([(27, 28), (34, 36), (31, 46), (34, 57)], 7)]
    elif adult:
        paths = [([(29, 27), (7, 20), (12, 36), (5, 52)], 2.5),
                 ([(40, 26), (55, 21), (44, 41), (52, 53)], 2.5),
                 ([(34, 31), (13, 22), (26, 39), (16, 54)], 2.8),
                 ([(36, 32), (49, 25), (36, 43), (43, 54)], 2.8)]
    else:
        paths = [([(31, 30), (14, 23), (21, 39), (12, 53)], 2.6),
                 ([(33, 31), (49, 24), (40, 42), (49, 53)], 2.6),
                 ([(32, 34), (23, 28), (32, 43), (24, 54)], 2.8),
                 ([(33, 34), (42, 28), (33, 43), (39, 53)], 2.6)]
    for i, (ctrl, w) in enumerate(paths):
        direction = -1 if ctrl[-1][0] < ctrl[0][0] else 1
        moved = [ctrl[0]] + [(x + flex * direction, y + abs(flex) * 0.4)
                              for x, y in ctrl[1:3]] + [ctrl[-1]]
        wood(s, moved, w, shine=(i % 2 == 0))


def tree(s, adult, flex=0.0):
    roots(s, adult, flex)
    wood(s, [(34, 37), (38, 29), (31, 20), (29, 13)], (6.0, 3.0))
    for base, tip, w in ADULT_LEAVES if adult else TEEN_LEAVES:
        paddle(s, base, tip, w)
    wash(s, 1 if adult else 8, 54 if adult else 51, 49, flex)


def finish(s, **kwargs):
    """Close only enclosed one-pixel air holes at crossing root seams."""
    arr = tones(s, **kwargs)
    op = arr != T
    enclosed = np.ones((arr.shape[0] - 2, arr.shape[1] - 2), bool)
    for dy in range(3):
        for dx in range(3):
            if (dx, dy) != (1, 1):
                enclosed &= op[dy:dy + enclosed.shape[0], dx:dx + enclosed.shape[1]]
    mid = arr[1:-1, 1:-1]
    mid[(mid == T) & enclosed] = 0
    return arr


def front(sid, frame=0):
    s = Spr(56, 56, SPAL)
    if sid == IDS[0]:
        mud(s)
        pencil(s, -KEYS[frame] * 0.35)
        wash(s, 12, 48, 47, KEYS[frame])
    else:
        tree(s, sid == IDS[2], KEYS[frame])
    return finish(s)


def back(sid):
    """Close rear three-quarter views, with the base cropped by the screen."""
    s = Spr(48, 48, SPAL)
    if sid == IDS[0]:
        m = s.poly([(0, 48), (3, 40), (16, 38), (35, 39), (46, 44), (48, 49)])
        pid = s.part(m, base=1, k=0, line=0)
        s.decal(s.line1([(5, 43), (13, 41), (18, 41)]), 3, on=[pid])
        pencil(s, close=True)
    else:
        adult = sid == IDS[2]
        roots(s, adult, close=True)
        wood(s, [(26, 52), (29, 38), (23, 20), (25, 9)], (11, 6))
        leaves = [((22, 20), (5, 4), 17), ((28, 19), (32, 1), 17),
                  ((32, 24), (45, 12), 17), ((23, 28), (2, 21), 18),
                  ((31, 31), (43, 28), 18), ((26, 32), (12, 23), 18)]
        if adult:
            leaves += [((28, 26), (23, 12), 18), ((22, 35), (6, 31), 17)]
        for base, tip, width in leaves:
            paddle(s, base, tip, width, gloss=0.4)
    return finish(s, open_bottom=True)


def icon(sid):
    """Pencil or glossy crown over explicitly bowed tiny prop roots."""
    if sid == IDS[0]:
        rows = [
            "................", "...kkk....kkk...", "...k33k..k22k...",
            "....k22kk22k....", ".....kk22kk.....", "......k222k.....",
            "......k322k.....", "......k322k.....", "......k322k.....",
            ".......k22k.....", ".......k22k.....", ".......k11k.....",
            ".....kkk11kk....", "...kk3311111kk..", "...k111111111k..",
            "....kkkkkkkkk...",
        ]
    else:
        adult = sid == IDS[2]
        crown = ([
            ".....kkkkkk.....", "...kk332222kk...", "..k2332222222k..",
            ".k222222223322k.", ".k332222222322k.", "..k3322222222k..",
            "...kk2222k22k...", ".....kk22kkk....",
        ] if adult else [
            "................", ".....kkk........", "....k332k.kkk...",
            "...k2232kk222k..", "..k2222k22222k..", "..k3322k2222k...",
            "...k332222kk....", "....kkk22k......",
        ])
        rows = crown + [
            ".....k1111k.....", "....k11kk11k....", "...k31k..k11k...",
            "...k31k..k11k...", "...k11k..k11k...", "..k11k....k11k..",
            ".k11k......k11k.", ".kkk........kkk.",
        ]
    return icon_arr(rows)


def render():
    out = {}
    for sid in IDS:
        small = icon(sid)
        fs = [front(sid, f) for f in range(len(KEYS))]
        if sid != IDS[0]:
            # Root/leaf contacts may change an outline during rasterization;
            # keep every crown pixel registered, including those contacts.
            top = 32 if sid == IDS[1] else 29
            for f in fs[1:]:
                f[:top] = fs[0][:top]
        out[sid] = (fs, back(sid), [small, hop(small)])
    return out


def review_layout(art):
    """Exactly front, back and icon per species, one row, native and 3x."""
    from pathlib import Path
    from PIL import Image
    from kit import to_rgba

    folder = Path(__file__).resolve().parent.parent / "review"
    folder.mkdir(exist_ok=True)
    for scale, name in ((1, "mangrove_1x.png"), (3, "mangrove_lead_layout.png")):
        sheet = Image.new("RGB", (384 * scale, 56 * scale), (200, 208, 200))
        for n, sid in enumerate(IDS):
            fs, b, icons = art[sid]
            for x, arr in ((0, fs[0]), (56, b), (104, icons[0])):
                im = Image.fromarray(to_rgba(arr, PAL), "RGBA")
                im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                sheet.paste(im, ((128 * n + x) * scale, 0), im)
        sheet.save(folder / name)
    # Native-size review includes every intro frame, back and both icons.
    sheet = Image.new("RGB", (360, 168), (200, 208, 200))
    for n, sid in enumerate(IDS):
        fs, b, icons = art[sid]
        x = 0
        for arr in fs + [b] + icons:
            im = Image.fromarray(to_rgba(arr, PAL), "RGBA")
            sheet.paste(im, (x, n * 56), im)
            x += im.width
    sheet.save(folder / "mangrove_frames_1x.png")


def build():
    from kit import write_species, intro_strip

    art = render()
    review_layout(art)
    poses = ["BOBBING: long green pencil propagule with a brown tip, two tiny first leaves "
             "and a shallow wet mud bank.",
             "BRACED: glossy entire leaf paddles on a curved stem above arching stilt roots.",
             "LOOMING: a dense rounded glossy canopy over a tangle of bowed prop roots."]
    for sid, pose in zip(IDS, poses):
        fs, b, icons = art[sid]
        write_species(sid, palette=PAL, sport=SPORT, front=fs, back=[b], icon=icons,
                      anim=ANIM, moving=moving_boxes(fs), tool=TOOL,
                      notes="Crystal rule. Rhizophora mangle. " + pose +
                      " Glossy leaf green / red-brown bark and roots; water is white glints only. "
                      "Gesture: propagule bobs; tree prop roots flex, spread, rebound and settle "
                      "with ripples at the water line, while crowns remain fixed. "
                      "Sport: natural yellow-green sun-bleached foliage, an artistic interpretation; "
                      "no named cultivar or genetically stable sport claimed.",
                      credits="Original geometry drawn for Verdant Reach. Botanical reference: "
                      "University of Florida IFAS, Rhizophora mangle (FR460), "
                      "https://ask.ifas.ufl.edu/publication/FR460 . "
                      "No sprite from any other game was copied, traced or imported.")
        intro_strip(sid)


if __name__ == "__main__":
    build()
