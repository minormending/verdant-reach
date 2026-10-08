"""Original Crystal-rule Leontopodium nivale: edelweiss_bud -> edelweiss.

BRACED teen: a low rosette of narrow, woolly grey-green leaves hugging a
pale limestone block; the raised lead leaf guards one tight woolly white
button bud, its rim a ring of soft woolly scallops, on a short felted stem.
REARING adult: the woolly white star held up toward the foe on a felted
stem that rises from the rosette on its limestone: eight lance-shaped,
thick, blunt bracts radiate unevenly around a cluster of six small domed
yellow-olive flower heads, each with a darker centre point. The heads touch
one another (one connected cluster, never two dots side by side).
Felt is soft clustered texture: short white marks on the grey-green leaves,
short grey-green marks on the white bracts. No enclosed dark dots.
Intro: the bud dips, swells and lifts, letting a wisp of wool go; the
star's bracts spread open wider while a puff of wool fibres drifts up, then
they settle. The rosette, rock and stem stay registered.
Sport: a creamy-yellow felt, a natural colour variation seen on plants that
grow in shade and at lower altitude (not a named cultivar).
No sprites from another game are copied, traced or imported.
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image

from _d_kit import BLACK, WHITE, T, Spr, bez, erode, hop, moving_boxes, rim_white, tones

TOOL = "tools/art/crystal/edelweiss.py"
IDS = ["edelweiss_bud", "edelweiss"]
PAL = [BLACK, "#908830", "#b0c0a0", WHITE]
SPORT = [BLACK, "#987838", "#d8c890", WHITE]
SPAL = tuple(PAL[1:])

# Bud keys: (swell, lift, wisp height); adult keys: (spread, fibre drift).
BUD_KEYS = [(0, 0, None), (-0.5, 1, None), (1.0, -1, 0), (1.2, -2, 1), (0.4, -1, 2)]
STAR_KEYS = [(0.0, None), (-0.5, None), (1.0, 0), (1.15, 1), (0.35, 2)]
ANIM = {"intro": [[0, 8], [1, 12], [2, 6], [3, 18], [4, 12], [0, 8]],
        "idle": [[0, 140], [1, 10], [0, 8]]}


# ---------------------------------------------------------------- parts ---

def felt(s, m, pid, tone, step=4, seed=0, frac=1.0):
    """Short clustered felt marks: 2px ticks in loose groups of two or three,
    kept inside the form (never touching the outline), on part `pid`."""
    safe = erode(m, 2)
    ys, xs = np.nonzero(safe)
    if not len(xs):
        return
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    lim = (xs + ys).min() + ((xs + ys).max() - (xs + ys).min()) * frac
    marks = np.zeros(m.shape, bool)
    rng = np.random.default_rng(seed)
    for gy in range(y0, y1 + 1, step):
        for gx in range(x0 + (gy // step % 2) * (step // 2), x1 + 1, step):
            jx, jy = rng.integers(0, 2, 2)
            x, y = gx + int(jx), gy + int(jy)
            if not (0 <= x < s.w - 1 and 0 <= y < s.h) or x + y > lim:
                continue
            if safe[y, x] and safe[y, x + 1]:
                # a tiny 2px tuft, alternately flat and diagonal
                if (gx + gy) % 3 == 0 and y + 1 < s.h and safe[y + 1, x + 1]:
                    marks[y, x] = marks[y + 1, x + 1] = True
                else:
                    marks[y, x] = marks[y, x + 1] = True
    s.decal(marks, tone, on=[pid])


def lance(s, base, tip, width, bend=0.0, tip_w=0.45, base_w=0.6):
    """Thick lance with a soft blunt tip: broad a third of the way out, then
    narrowing to a rounded end (a stroke capped by a small disc)."""
    bx, by = base
    tx, ty = tip
    L = math.dist(base, tip)
    nx, ny = -(ty - by) / L, (tx - bx) / L
    c = ((bx + tx) / 2 + nx * bend * L, (by + ty) / 2 + ny * bend * L)
    path = bez([base, c, tip], 40)

    def w(t):
        rise = min(1.0, t / 0.32) ** 0.7
        fall = 1 - (1 - tip_w) * max(0.0, (t - 0.32) / 0.68) ** 1.3
        return max(1.2, width * (base_w + (1 - base_w) * rise) * fall)
    return s.stroke(path, w, cap=True), path


def leaf(s, base, tip, width, bend=0.0, seed=0, rim=0.35):
    """Narrow woolly grey-green leaf: dark shade margin, white felt marks."""
    m, path = lance(s, base, tip, width, bend, tip_w=0.35)
    pid = s.part(m, base=2, k=1, sh_tone=1, line=0)
    rim_white(s, m, pid, rim)
    felt(s, m, pid, 3, step=4, seed=seed)
    return pid


def bract(s, base, tip, width, bend=0.0, seed=0, k=2, back=False, inner=0.42):
    """Felted white bract: grey-green shade band, an olive deepest edge, and
    grey-green felt ticks across its white face."""
    m, path = lance(s, base, tip, width, bend, tip_w=0.5)
    pid = s.part(m, base=3, k=k, sh_tone=2, deep=1 if not back else 0, line=0)
    # the felt greys toward the bract's base, round the flower heads
    n = max(2, int(len(path) * inner))
    s.decal(s.stroke(path[:n], width * 1.2, cap=False) & m, 2, on=[pid])
    felt(s, m, pid, 2, step=4, seed=seed)
    return pid, m


def stem(s, ctrl, width, seed=0):
    path = bez(ctrl, 40)
    m = s.stroke(path, width, cap=True)
    pid = s.part(m, base=2, k=1, sh_tone=1, line=0)
    s.decal(s.line1(path[5:-5]) & erode(m, 1), 3, on=[pid])
    return pid


def rock(s, pts, top, seams=()):
    """Faceted limestone: a lit white top plane, a grey-green front face and a
    dark olive flank, with bedding seams that run into the shade."""
    m = s.poly(pts)
    pid = s.part(m, base=2, k=2, sh_tone=1, line=0)
    s.decal(s.poly(top), 3, on=[pid])
    for a, b in seams:
        s.decal(s.line1([a, b]), 1, on=[pid])
    return pid


HEADS = [(-3.4, -2.6, 2.7), (1.6, -3.6, 2.6), (4.4, 0.4, 2.5),
         (-4.2, 2.2, 2.5), (0.0, 0.2, 2.9), (1.2, 4.2, 2.4)]


def heads(s, cx, cy, scale=1.0, only=None):
    """Six small domed flower heads in one touching cluster (an irregular
    knot, never a pair): olive domes, a grey-green lit cap at the top-left of
    each, a darker centre point. Back domes first; black seams between."""
    for n, (dx, dy, r) in enumerate(HEADS):
        if only is not None and n not in only:
            continue
        x, y, r = cx + dx * scale, cy + dy * scale, r * scale
        m = s.circle(x, y, r)
        pid = s.part(m, base=1, k=0, line=0)
        lit = s.circle(x - r * 0.5, y - r * 0.5, r * 0.62) & m
        s.decal(lit, 2, on=[pid])
        if r >= 2.2:
            s.px([(int(math.floor(x + 0.4)), int(math.floor(y + 0.4)))], 0)


def puff(s, x, y, r):
    """A drifting wisp of wool: a soft white tuft with a grey-green underside."""
    m = s.ellipse(x, y, r * 1.3, r)
    m |= s.ellipse(x + r * 1.1, y - r * 0.6, r * 0.8, r * 0.7)
    pid = s.part(m, base=3, k=1, sh_tone=2, line=0)
    return pid


# ---------------------------------------------------------------- fronts --

def star(s, cx, cy, spread=0.0, scale=1.0, sy=0.88, back=False, seed=0, spec=None, k=2):
    """Eight uneven, thick lance bracts radiating from (cx, cy); the far side
    (right, up-right) is shorter in 3/4. `spread` fans them wider and longer
    (tips stay inside the canvas, so the held pose never clips)."""
    # (angle deg, length, width): far side first, the lead bract (left) last
    spec = spec or STAR
    for n, (a, L, w) in enumerate(spec):
        a2 = a
        if spread:
            a2 = a + spread * (7 if 30 < a < 150 else -6 if 210 < a < 330 else 0)
            L = L * (1 + 0.09 * spread)
            w = w * (1 + 0.05 * spread)
        L *= scale
        w *= scale
        rad = math.radians(a2)
        tx, ty = cx + L * math.cos(rad), cy - L * math.sin(rad) * sy
        # the blunt tip's cap (radius ~w/4) and its outline stay on the
        # canvas, and 2px clear at the top, so the gesture never clips
        lo = 1.0 + w * 0.25
        tx = min(max(tx, lo), s.w - 1 - lo)
        ty = min(max(ty, lo + 2), s.h - 1 - lo)
        bx, by = cx + 3 * math.cos(rad), cy - 3 * math.sin(rad) * sy
        bract(s, (bx, by), (tx, ty), w, bend=0.05 * (1 if n % 2 else -1), seed=seed + n, back=back, k=k)


STAR = [(42, 14.5, 8.0), (6, 16.0, 8.4), (94, 17.5, 8.6), (316, 16.5, 8.6),
        (140, 19.0, 9.0), (272, 15.0, 8.4), (226, 19.0, 9.0), (183, 23.0, 9.4)]


def button(s, cx, cy, r, k=2, lean=135):
    """The tight woolly button bud: a felted ball whose rim is a ring of
    small soft scallops (the clasped bract tips and their wool), shaded
    grey-green to the lower right. Its felt tufts run out of the shade, so
    nothing floats on the lit face that could read as a feature."""
    m = s.circle(cx, cy, r * 0.82)
    n = 9
    for i in range(n):
        a = math.radians(lean + i * 360 / n + (7 if i % 2 else -5))
        d = r * (0.70 if i % 3 else 0.62)
        m |= s.circle(cx + d * math.cos(a), cy - d * math.sin(a), r * (0.36 if i % 2 else 0.32))
    pid = s.part(m, base=3, k=k, sh_tone=2, deep=1, line=0)
    # felt: short grey-green tufts that grow out of the shaded side only,
    # so no free-floating mark sits on the lit face
    tufts = np.zeros(m.shape, bool)
    for i in range(3):
        a = math.radians(lean + 160 + i * 40)
        x, y = cx + r * 0.45 * math.cos(a), cy - r * 0.45 * math.sin(a)
        tufts |= s.line1([(x, y), (x + r * 0.35 * math.cos(a), y - r * 0.35 * math.sin(a))])
    s.decal(tufts & m, 2, on=[pid])
    return pid


def bud_front(frame=0):
    swell, lift, wisp = BUD_KEYS[frame]
    s = Spr(56, 56, SPAL)
    rock(s, [(26, 55), (26, 47), (30, 40), (38, 35), (46, 36), (50, 41), (51, 55)],
         [(27, 45), (30, 40), (38, 35), (46, 36), (48, 39), (40, 40), (32, 43), (28, 47)],
         seams=[((51, 47), (42, 48)), ((51, 51), (45, 52))])
    # rear leaves lie up on the rock, then the side feet, then the lead shield
    leaf(s, (27, 49), (47, 47), 4.6, bend=0.06, seed=2)
    leaf(s, (26, 46), (31, 33), 4.6, bend=-0.12, seed=3)
    leaf(s, (27, 47), (40, 39), 4.4, bend=0.12, seed=1)
    leaf(s, (27, 51), (45, 55), 4.6, bend=-0.05, seed=4)
    leaf(s, (24, 51), (7, 54), 4.8, bend=0.06, seed=5)
    stem(s, [(25, 48), (23, 42 + lift * 0.5), (18, 37 + lift)], 3.8)
    button(s, 15, 31 + lift, 7.0 + swell * 0.7)
    leaf(s, (24, 50), (8, 38), 5.6, bend=-0.12, seed=6, rim=0.5)
    if wisp is not None:
        puff(s, 25 + wisp * 2, 21 - wisp * 3, 1.7 - wisp * 0.2)
    return shifted(tones(s), 2)


SHIFT = 2
# wool fibres drift up and away from the star's far side (frame by frame)
PUFFS = [[(40, 12, 2.0)],
         [(42, 9, 2.0), (47, 13, 1.6)],
         [(44, 6, 1.9), (49, 10, 1.5), (38, 8, 1.3)]]


def star_front(frame=0):
    spread, drift = STAR_KEYS[frame]
    s = Spr(56, 56, SPAL)
    rock(s, [(30, 55), (31, 46), (36, 40), (45, 37), (51, 40), (53, 46), (53, 55)],
         [(31, 47), (36, 40), (45, 37), (51, 40), (52, 43), (45, 42), (36, 46)],
         seams=[((53, 50), (46, 51))])
    leaf(s, (35, 50), (50, 42), 4.8, bend=0.08, seed=11)
    leaf(s, (34, 49), (41, 36), 4.6, bend=-0.10, seed=12)
    leaf(s, (35, 52), (52, 55), 4.6, bend=-0.04, seed=13)
    stem(s, [(33, 51), (38, 42), (36, 32), (26, 24)], 4.4)
    leaf(s, (32, 51), (14, 55), 4.8, bend=0.05, seed=14)
    leaf(s, (32, 50), (17, 43), 5.0, bend=-0.10, seed=15, rim=0.5)
    star(s, 25, 22, spread=spread, seed=20)
    heads(s, 25, 22)
    if drift is not None:
        for x, y, r in PUFFS[drift]:
            puff(s, x, y, r)
    # register on the right edge: the star keeps 2px clear on the left
    return shifted(tones(s), SHIFT)


def shifted(t, dx):
    """The whole drawing dx px to the right (nothing may fall off)."""
    assert (t[:, -dx:] == T).all()
    out = np.full_like(t, T)
    out[:, dx:] = t[:, :-dx]
    return out


def front(sid, frame=0):
    return bud_front(frame) if sid == IDS[0] else star_front(frame)


def front_frames(sid):
    n = len(BUD_KEYS if sid == IDS[0] else STAR_KEYS)
    return [front(sid, f) for f in range(n)]


# ----------------------------------------------------------------- backs --

def back(sid):
    """Close rear view from above, cropped by the bottom edge."""
    s = Spr(48, 48, SPAL)
    if sid == IDS[0]:
        rock(s, [(1, 48), (1, 33), (5, 27), (13, 26), (18, 31), (18, 48)],
             [(1, 34), (5, 27), (13, 26), (16, 29), (7, 31), (2, 36)])
        for n, (b, t, w) in enumerate((((24, 46), (3, 37), 10), ((26, 46), (46, 33), 10),
                                       ((25, 46), (46, 47), 10), ((24, 46), (3, 47), 10),
                                       ((25, 44), (42, 20), 9), ((24, 44), (8, 23), 9))):
            leaf(s, b, t, w, bend=0.06 * (1 if n % 2 else -1), seed=30 + n, rim=0.4)
        stem(s, [(25, 44), (26, 36), (28, 30)], 5.5)
        button(s, 29, 19, 12, k=3, lean=60)
    else:
        for n, (b, t, w) in enumerate((((22, 48), (1, 38), 9), ((26, 48), (47, 38), 9))):
            leaf(s, b, t, w, seed=40 + n, rim=0.4)
        # the flower heads just show over the far rim (seen from above)
        heads(s, 27, 12, scale=0.9)
        star(s, 24, 22, scale=1.12, sy=0.84, back=True, seed=50, spec=BACK_STAR, k=3)
        stem(s, [(22, 48), (21, 38), (24, 25)], 5.0)
    return tones(s, open_bottom=True)


BACK_STAR = [(150, 17.0, 9.0), (100, 15.0, 9.0), (54, 18.0, 9.4), (12, 21.0, 9.6),
             (200, 18.0, 9.4), (320, 18.5, 9.6), (250, 17.0, 9.6), (285, 17.0, 9.6)]


# ----------------------------------------------------------------- icons --

def icon(sid):
    s = Spr(16, 16, SPAL)
    if sid == IDS[0]:
        rock(s, [(8, 15), (9, 10), (12, 9), (15, 11), (15, 15)], [(9, 10), (12, 9), (14, 10), (10, 11)])
        leaf(s, (8, 13), (1, 14), 2.6, seed=60, rim=0)
        leaf(s, (8, 13), (14, 14), 2.4, seed=61, rim=0)
        stem(s, [(8, 13), (6, 9)], 2.0)
        m = s.circle(5.5, 6.5, 3.4)
        pid = s.part(m, base=3, k=1, sh_tone=2, line=0)
        s.decal(s.line1([(5.5, 6.5), (3.5, 4.5)]) & erode(m, 1), 2, on=[pid])
    else:
        leaf(s, (9, 14), (2, 14), 2.6, seed=62, rim=0)
        leaf(s, (9, 14), (14, 13), 2.6, seed=63, rim=0)
        stem(s, [(9, 14), (9, 10), (7, 8)], 2.0)
        for a, L in ((90, 5.6), (20, 5.0), (320, 5.0), (250, 5.4), (180, 6.4), (135, 5.6)):
            ra = math.radians(a)
            m, _ = lance(s, (7, 7), (7 + L * math.cos(ra), 7 - L * math.sin(ra) * 0.9), 3.0, tip_w=0.6)
            s.part(m, base=3, k=1, sh_tone=2, line=0)
        m = s.circle(7, 7, 1.6)
        s.part(m, base=1, k=0, line=0)
    return tones(s)


# ---------------------------------------------------------------- review --

def render():
    return {sid: (front_frames(sid), back(sid), [icon(sid), hop(icon(sid))]) for sid in IDS}


def review_layout(art, folder=None):
    from kit import to_rgba
    folder = Path(folder) if folder else Path(__file__).resolve().parent.parent / "review"
    folder.mkdir(exist_ok=True)
    for scale, name in ((1, "edelweiss_1x.png"), (3, "edelweiss_lead_layout.png")):
        sheet = Image.new("RGB", (256 * scale, 56 * scale), (200, 208, 200))
        for n, sid in enumerate(IDS):
            fs, b, icons = art[sid]
            for x, arr in ((0, fs[0]), (56, b), (104, icons[0])):
                im = Image.fromarray(to_rgba(arr, PAL), "RGBA")
                im = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
                sheet.paste(im, ((128 * n + x) * scale, (56 - arr.shape[0]) * scale), im)
        sheet.save(folder / name)


def build():
    from kit import intro_strip, write_species
    art = render()
    review_layout(art)
    for sid, (fs, b, icons) in art.items():
        pose = ("BRACED: a low rosette of narrow woolly grey-green leaves hugging a limestone block, "
                "the raised lead leaf guarding one tight woolly white button bud on a short felted stem. "
                "The bud dips, then swells and lifts while a wisp of wool drifts off." if sid == IDS[0] else
                "REARING: the woolly white star held up toward the foe on a felted stem: eight lance-shaped "
                "blunt bracts around a touching cluster of domed yellow-olive flower heads, narrow woolly "
                "leaves and limestone below. The bracts spread open and a puff of wool fibres drifts up.")
        write_species(sid, palette=PAL, sport=SPORT, front=fs, back=[b], icon=icons,
                      anim=ANIM, moving=moving_boxes(fs), tool=TOOL,
                      notes="Crystal rule. " + pose + " Rosette, rock and stem stay fixed. "
                      "WHITE: edelweiss is covered in white woolly hairs; the bracts and bud are genuinely white "
                      "felt (shaded grey-green inside), and the limestone's lit top plane is pale stone. "
                      "Woolly grey-green mid; dull yellow-olive dark for the flower heads and shading. "
                      "Felt is clustered short marks; no enclosed dark dots. "
                      "Sport: creamy-yellow felt, a natural colour variation of plants grown in shade "
                      "and at lower altitude (not a named cultivar); geometry stays identical.")
        intro_strip(sid)


if __name__ == "__main__":
    import sys
    if "--preview" in sys.argv:
        from _d_kit import preview, stats
        art = render()
        out = sys.argv[sys.argv.index("--preview") + 1]
        rows = []
        for sid in IDS:
            fs, b, icons = art[sid]
            for k, f in enumerate(fs):
                stats(f"{sid}[{k}]", f)
            stats(f"{sid} back", b)
            rows.append((PAL, fs + [b] + icons))
            rows.append((SPORT, [fs[0], b] + icons))
        preview(rows, out + "_4x.png", k=4)
        preview(rows, out + "_1x.png", k=1)
        review_layout(art, Path(out).parent)
    else:
        build()
