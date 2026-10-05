"""Reference sheets for docs/CREATURES.md (docs/creatures/*.png).

  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/species_a/refsheets.py

palette.png, outline.png, poses.png, anatomy.png and idle.png are diagrams
built here; starters.png is a contact sheet of the redesigned starter lines.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
ROOT = HERE.parents[2]
DOCS = ROOT / "docs" / "creatures"
SP = ROOT / "public" / "assets" / "species"

from px import Canvas, Sprite, bezier, snap  # noqa: E402

BG = (244, 244, 230, 255)
INK = (40, 40, 40, 255)
RED = (220, 40, 40, 255)
GOOD = (40, 140, 60, 255)
BAD = (200, 50, 50, 255)


def up(im, z):
    return im.resize((im.width * z, im.height * z), Image.NEAREST)


def label(d, xy, s, fill=INK):
    d.text(xy, s, fill=fill)


# ------------------------------------------------------------------ palette

def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lum(c):
    r, g, b = c
    return 0.299 * r + 0.587 * g + 0.114 * b


def palette():
    ramps = [
        ("GOOD green: shadow to blue, light to lime", ["#181818", "#285828", "#60b038", "#d0f080"], True),
        ("BAD green: grey-shifted (same hue)", ["#181818", "#305030", "#60a060", "#a0e0a0"], False),
        ("GOOD red: shadow to wine, light to gold", ["#181818", "#901828", "#e84020", "#f8d878"], True),
        ("BAD red: light to pink, dark to brown", ["#181818", "#802020", "#e04040", "#f8a0a0"], False),
        ("GOOD brown (acorn): double-duty cap/shadow", ["#181818", "#683818", "#d88830", "#f8e098"], True),
        ("GOOD white flower: white only when real", ["#181818", "#286830", "#a0d070", "#f8f8f0"], True),
        ("BAD: dark and mid merge in greyscale", ["#181818", "#3858a0", "#58a040", "#e0f0a0"], False),
    ]
    W, row = 760, 70
    im = Image.new("RGBA", (W, row * len(ramps) + 40), BG)
    d = ImageDraw.Draw(im)
    label(d, (10, 8), "4-colour ramps.  Left: colour.  Right: greyscale test (four separate greys needed).")
    for i, (name, cols, ok) in enumerate(ramps):
        y = 34 + i * row
        label(d, (10, y), name, GOOD if ok else BAD)
        for k, h in enumerate(cols):
            c = snap(h)
            d.rectangle([10 + k * 60, y + 14, 10 + k * 60 + 54, y + 60], fill=c + (255,))
            label(d, (12 + k * 60, y + 62 - 12), h, (255, 255, 255, 255) if lum(c) < 110 else INK)
            g = int(lum(c))
            d.rectangle([300 + k * 60, y + 14, 300 + k * 60 + 54, y + 60], fill=(g, g, g, 255))
        # mini sphere rendered with the ramp
        s = Sprite(20, 20, cols[1:])
        s.add(s.c.circle(10, 10.5, 8.6), tones=(1, 2, 3), hl="spot")
        s.render()
        im.alpha_composite(up(s.image(), 2), (560, y + 14 - 2))
        sg = s.image().convert("LA").convert("RGBA")
        im.alpha_composite(up(sg, 2), (620, y + 14 - 2))
    return im


# ------------------------------------------------------------------ outline

TONE = {"0": (24, 24, 24), "1": (40, 88, 40), "2": (96, 176, 56), "3": (208, 240, 128), ".": None}


def grid(rows, z=14, gl=True):
    h, w = len(rows), len(rows[0])
    im = Image.new("RGBA", (w * z + 1, h * z + 1), (255, 255, 255, 255))
    d = ImageDraw.Draw(im)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            c = TONE.get(ch)
            if c:
                d.rectangle([x * z, y * z, x * z + z - 1, y * z + z - 1], fill=c + (255,))
    if gl:
        for x in range(w + 1):
            d.line([x * z, 0, x * z, h * z], fill=(220, 220, 220, 255))
        for y in range(h + 1):
            d.line([0, y * z, w * z, y * z], fill=(220, 220, 220, 255))
    return im


def outline():
    panels = [
        ("NO  doubled elbows", BAD, [
            "....000000..",
            "..0003322200",
            ".003322222220",
            "0033222222210",
            "0322222222110",
            "0222222221110",
            ".00222221100.",
            "...0000000...",
        ]),
        ("OK  pixel-perfect 1px", GOOD, [
            ".....00000...",
            "...00332220..",
            "..0332222220.",
            ".033222222210",
            ".032222222110",
            ".022222221110",
            "..0222211110.",
            "...00000000..",
        ]),
        ("OK  selout on the lit top-left", GOOD, [
            ".....11110..",
            "...11332220.",
            "..1332222220",
            ".13322222210",
            ".13222222110",
            ".02222222110",
            "..002221100.",
            "....00000...",
        ]),
        ("OK  weighted contact line (2px, short)", GOOD, [
            "...00000....",
            "..0333220...",
            ".033222210..",
            ".022222110..",
            ".021111110..",
            "..00111100..",
            ".0000000000.",
            "..00000000..",
        ]),
    ]
    # fix row widths
    panels = [(t, c, [r.ljust(13, ".")[:13] for r in rows]) for t, c, rows in panels]
    tiles = [grid(rows) for _, _, rows in panels]
    W = sum(t.width for t in tiles) + 30 * len(tiles) + 20
    H = max(t.height for t in tiles) + 50
    im = Image.new("RGBA", (W, H + 170), BG)
    d = ImageDraw.Draw(im)
    x = 20
    for (t, c, _), tile in zip(panels, tiles):
        label(d, (x, 10), t, c)
        im.alpha_composite(tile, (x, 30))
        x += tile.width + 30
    # internal-line comparison: same leaf-over-body with black vs dark internal line
    y0 = H + 10
    label(d, (20, y0 - 4), "Internal lines: black between different materials (pod over leaf); dark tone for same-material folds.")
    for k, (line, title) in enumerate((("black", "black internal line"), ("dark", "dark-tone internal line"))):
        s = Sprite(40, 30, ["#285828", "#60b038", "#d0f080"])
        c = s.c
        s.add(c.ellipse(24, 16, 13, 10), tones=(1, 2, 3), shade=(3, 3), band=(1, 2))
        s.add(c.leaf((8, 22), (26, 10), 10, bend=-2), tones=(1, 2, 3), shade=(2, 2), band=(1, 2), line=line)
        s.render()
        im.alpha_composite(up(s.image(), 4), (20 + k * 200, y0 + 12))
        label(d, (20 + k * 200, y0 + 140), title)
    return im


# ------------------------------------------------------------------ poses

def pose_masks():
    c = Canvas(56, 56)
    P = {}
    # BRACED: wide low body, cap head forward, raised lead arm
    m = c.ellipse(29, 40, 15, 12) | c.ellipse(22, 24, 15, 9, -18)
    m |= c.leaf((20, 40), (4, 28), 11, bend=-2)            # lead arm up
    m |= c.leaf((40, 38), (53, 30), 8, bend=2)             # rear arm
    m |= c.curve([(20, 48), (13, 53), (8, 55.6)], 5, 3) | c.curve([(36, 48), (43, 53), (49, 55.6)], 5, 3)
    P["BRACED"] = (m, [(14, 22), (24, 34), (30, 46), (34, 55)])
    # LUNGING: diagonal, head far left, tail back
    m = c.curve([(36, 55.6), (34, 44), (26, 32), (14, 20)], 9, 6)
    m |= c.ellipse(13, 17, 10, 7, -35)
    m |= c.leaf((26, 32), (6, 38), 9, bend=2)              # lead arm thrust
    m |= c.curve([(33, 40), (44, 34), (54, 22)], 6, 2)     # tail flung back
    m |= c.curve([(34, 52), (26, 55.6)], 4, 3)
    P["LUNGING"] = (m, [(8, 13), (20, 26), (32, 40), (37, 55)])
    # COILED: S stem with a spiral head pulled back
    m = c.curve([(30, 55.6), (36, 46), (24, 36), (28, 24), (36, 18)], 7, 5)
    ring = c.circle(30, 14, 11) & ~c.circle(31, 15, 5)
    m |= ring | c.circle(31.5, 15.5, 2.5)
    m |= c.leaf((32, 46), (14, 50), 8, bend=1) | c.leaf((34, 46), (50, 44), 7, bend=-1)
    P["COILED"] = (m, [(22, 10), (28, 24), (24, 36), (36, 46), (30, 55)])
    # LOOMING: crown overhanging left, short thick trunk, root feet
    m = c.ellipse(24, 16, 23, 14, -8) | c.ellipse(40, 24, 14, 10) | c.ellipse(10, 26, 9, 7)
    m |= c.stroke([(32, 55.6), (31, 30)], 10, 8)
    m |= c.curve([(29, 50), (20, 54), (12, 55.6)], 5, 2.5) | c.curve([(35, 50), (42, 54), (50, 55.6)], 5, 2.5)
    P["LOOMING"] = (m, [(6, 18), (20, 8), (34, 22), (32, 40), (33, 55)])
    # REARING: horizontal base, body rising and leaning forward
    m = c.ellipse(30, 49, 24, 6, -4)
    m |= c.curve([(36, 47), (38, 34), (30, 22), (22, 16)], 8, 6)
    m |= c.ellipse(20, 13, 9, 8, -25)
    m |= c.leaf((34, 34), (18, 36), 8, bend=2)
    P["REARING"] = (m, [(16, 9), (30, 22), (38, 36), (34, 50)])
    # BOBBING: tilted floating body, seed drifting off, ring below
    m = c.ellipse(26, 26, 15, 12, -15)
    m |= c.stroke([(28, 37), (30, 46)], 3)
    m |= c.ellipse(29, 52, 16, 2.5)
    m |= c.ellipse(48, 10, 2.5, 2.5) | c.curve([(46, 12), (43, 16)], 1.6)
    m |= c.ellipse(52, 18, 2, 2)
    P["BOBBING"] = (m, [(14, 20), (26, 26), (40, 30)])
    return P


def poses():
    P = pose_masks()
    z = 4
    cw = 56 * z + 30
    im = Image.new("RGBA", (cw * 3 + 20, (56 * z + 50) * 2 + 20), BG)
    d = ImageDraw.Draw(im)
    for i, (name, (m, loa)) in enumerate(P.items()):
        x = 20 + (i % 3) * cw
        y = 10 + (i // 3) * (56 * z + 50)
        label(d, (x, y), f"{name}   (foe is to the LEFT)")
        a = np.zeros((56, 56, 4), np.uint8)
        a[m] = (24, 24, 24, 255)
        tile = Image.new("RGBA", (56 * z, 56 * z), (255, 255, 255, 255))
        tile.alpha_composite(up(Image.fromarray(a, "RGBA"), z))
        dd = ImageDraw.Draw(tile)
        pts = [(px * z, py * z) for px, py in bezier(loa, 30)] if len(loa) > 2 else [(p[0] * z, p[1] * z) for p in loa]
        dd.line(pts, fill=RED, width=5)
        im.alpha_composite(tile, (x, y + 16))
    label(d, (20, im.height - 14), "Red = line of action (head end at the top-left).  C or S, never a vertical I.")
    return im


# ------------------------------------------------------------------ anatomy (specimen vs creature)

def leafy(mask_parts, pal):
    s = Sprite(56, 56, pal)
    for m, kw in mask_parts:
        s.add(m, **kw)
    s.render()
    s.clean()
    return s.image()


def anatomy():
    pal = ["#285828", "#60b038", "#d8f080"]
    c = Canvas(56, 56)
    L = dict(tones=(1, 2, 3), close=2, shade=(3, 3), band=(1, 2))
    # specimen: vertical stem, paired leaves, round head facing camera
    spec = leafy([
        (c.leaf((27, 40), (8, 38), 10), L), (c.leaf((29, 40), (48, 38), 10), L),
        (c.stroke([(28, 55.6), (28, 20)], 4), dict(tones=(1, 1, 2), flat=True)),
        (c.circle(28, 16, 10), dict(tones=(1, 2, 3), hl="spot")),
    ], pal)
    # creature: C line, head tilted left and forward, lead arm raised, rear arm small+high, two feet
    crea = leafy([
        (c.leaf((33, 30), (50, 20), 8, bend=-1.5), L),                                 # rear arm (small, high)
        (c.curve([(32, 55.6), (36, 44), (32, 32), (24, 22)], 5.5, 4.0), dict(tones=(1, 1, 2), shade=(2, 0))),
        (c.curve([(30, 52), (24, 55.6)], 3.5, 3), dict(tones=(1, 1, 1), flat=True)),  # front foot
        (c.curve([(34, 52), (40, 55.6)], 3.5, 3), dict(tones=(1, 1, 1), flat=True)),  # back foot
        (c.ellipse(19, 17, 11.5, 9.5, -25), dict(tones=(1, 2, 3), shade=(3, 3), band=(1, 2))),  # head tilted
        (c.leaf((31, 38), (6, 30), 13, bend=-3), L),                                   # lead arm (big, raised)
    ], pal)
    z = 4
    im = Image.new("RGBA", (2 * (56 * z + 40) + 280, 56 * z + 60), BG)
    d = ImageDraw.Draw(im)
    for k, (img, t, col) in enumerate(((spec, "NO  specimen: I-line, paired leaves, centred head", BAD),
                                       (crea, "OK  creature: C-line, head tilted at foe, lead arm up", GOOD))):
        x = 20 + k * (56 * z + 40)
        label(d, (x, 8), t, col)
        tile = Image.new("RGBA", (56 * z, 56 * z), (255, 255, 255, 255))
        tile.alpha_composite(up(img, z))
        im.alpha_composite(tile, (x, 26))
    x = 20 + 2 * (56 * z + 40)
    notes = ["HEAD   = signature organ, tilted 10-25 deg to foe",
             "LEAD ARM = near leaf, BIG, raised / thrust",
             "REAR ARM = far leaf, 70-85% size, higher",
             "TORSO  = stem, curved on the line of action",
             "FEET   = 2 contact points, front foot ahead",
             "TAIL   = trailing tendril / back leaf / seed",
             "",
             "3/4 view: far member ~80% size, 1-3px higher",
             "Mirror IoU <= 0.70"]
    for i, n in enumerate(notes):
        label(d, (x, 40 + i * 16), n)
    return im


# ------------------------------------------------------------------ idle

def idle_frames():
    pal = ["#285828", "#60b038", "#d8f080"]
    out = []
    for k, (hx, hy, arm) in enumerate(((19, 17, 30), (18, 17.5, 29), (17, 18, 28))):
        c = Canvas(56, 56)
        L = dict(tones=(1, 2, 3), close=2, shade=(3, 3), band=(1, 2))
        out.append(leafy([
            (c.leaf((33, 30), (50, 20 - k * 0.5), 8, bend=-1.5), L),
            (c.curve([(32, 55.6), (36, 44), (32.5 - k * 0.3, 32), (hx + 5, hy + 5)], 5.5, 4.0), dict(tones=(1, 1, 2), shade=(2, 0))),
            (c.curve([(30, 52), (24, 55.6)], 3.5, 3), dict(tones=(1, 1, 1), flat=True)),
            (c.curve([(34, 52), (40, 55.6)], 3.5, 3), dict(tones=(1, 1, 1), flat=True)),
            (c.ellipse(hx, hy, 11.5, 9.5, -25 - k * 2), dict(tones=(1, 2, 3), shade=(3, 3), band=(1, 2))),
            (c.leaf((31, 38), (6, arm), 13, bend=-3), L),
        ], pal))
    return out


def idle():
    fr = idle_frames()
    z = 4
    im = Image.new("RGBA", (4 * (56 * z + 20) + 20, 56 * z + 70), BG)
    d = ImageDraw.Draw(im)
    names = ["front", "front__2 (in-between)", "front__3 (extreme)", "diff: red = changed px"]
    for i in range(4):
        x = 20 + i * (56 * z + 20)
        label(d, (x, 8), names[i])
        tile = Image.new("RGBA", (56 * z, 56 * z), (255, 255, 255, 255))
        if i < 3:
            tile.alpha_composite(up(fr[i], z))
        else:
            a0, a2 = np.asarray(fr[0]), np.asarray(fr[2])
            base = a0.copy()
            base[..., 3] = (base[..., 3] > 0) * 70
            diff = (np.abs(a0.astype(int) - a2.astype(int)).sum(-1) > 0)
            base[diff] = (220, 40, 40, 255)
            tile.alpha_composite(up(Image.fromarray(base, "RGBA"), z))
        im.alpha_composite(tile, (x, 26))
    label(d, (20, 56 * z + 36), "Feet and bottom row never move. Head/arm tips 1-2px, torso 0-1px. "
                                "Same 4 colours. Ping-pong: front > 2 > 3 > 2 > front.")
    return im


# ------------------------------------------------------------------ starters contact sheet

def starters(ids_rows=None, out_name="starters.png"):
    rows = ids_rows or [["oak_acorn", "oak_sapling", "great_oak"],
                        ["chili_blossom", "green_chili", "red_chili"],
                        ["lily_seedpod", "lily_pad", "giant_water_lily"]]
    z = 3
    cell = 56 * z + 48 * z + 16 * 2 * 2 + 40
    im = Image.new("RGBA", (cell * 3 + 20, (56 * z + 40) * len(rows) + 10), BG)
    d = ImageDraw.Draw(im)
    for r, row in enumerate(rows):
        for k, id_ in enumerate(row):
            x = 10 + k * cell
            y = 10 + r * (56 * z + 40)
            label(d, (x, y), id_)
            for kind, sz in (("front", 56), ("back", 48)):
                p = SP / id_ / f"{kind}.png"
                if p.exists():
                    im.alpha_composite(up(Image.open(p).convert("RGBA"), z), (x, y + 14 + (56 - sz) * z))
                x += sz * z + 8
            for j, kind in enumerate(("icon", "icon__2")):
                p = SP / id_ / f"{kind}.png"
                if p.exists():
                    im.alpha_composite(up(Image.open(p).convert("RGBA"), 2), (x, y + 14 + j * 36))
                    im.alpha_composite(Image.open(p).convert("RGBA"), (x + 36, y + 14 + j * 36 + 8))
    return im


if __name__ == "__main__":
    DOCS.mkdir(parents=True, exist_ok=True)
    which = sys.argv[1:] or ["palette", "outline", "poses", "anatomy", "idle", "starters"]
    fns = {"palette": palette, "outline": outline, "poses": poses, "anatomy": anatomy, "idle": idle,
           "starters": starters}
    for w in which:
        fns[w]().save(DOCS / f"{w}.png")
        print("wrote", DOCS / f"{w}.png")
