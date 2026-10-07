"""Chapter 5 story stills -> public/art/sets/stills/<key>.png (160x144).

Same rules as tools/art/stills.py (and its Canvas): each still is painted
from primitives with its own small named palette, light from one stated
source, dithering only as a deliberate 2-colour checker, and the bottom
48px (under the text box) kept calm, with every focal point in the upper
two-thirds.

  fire_cone_vision  what the opened cone shows: a grove of pale aspen
                    trunks, every one leaning in over the viewer, an ember
                    haze low behind them; the ground cut away below, the
                    roots all running down into one vast dim shape - the
                    Elder, glimpsed - its edges already dissolving. No face:
                    only a slow inner glow along its folds, like rings in
                    wood.
  morrow_listening  the Burnt Stand at night: black snags with cracked
                    silver bark under a thin moon, grey ash, a few green
                    shoots. MORROW kneels in his long coat, bent low, one
                    hand flat in the ash, his ear to a clump of ghost pipes
                    that glow pale lilac and light his hair and cheek.

Deterministic: every random draw comes from a fixed-seed generator.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common5 as common  # noqa: E402

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import gbc  # noqa: E402
import stills as st  # noqa: E402
from stills import H, W, Canvas, rng  # noqa: E402


# =============================================================================
# fire_cone_vision
# =============================================================================
def fire_cone_vision() -> Image.Image:
    cv = Canvas({
        # haze behind the grove: dark plum above, an ember glow at the root line
        "k0": "#181020", "k1": "#281828", "k2": "#402030", "k3": "#683038", "k4": "#a05040", "k5": "#d88858",
        # aspen trunks: pale bone, lilac shade, the far ones lost in the haze
        "t0": "#f8f0e0", "t1": "#d8d0c8", "t2": "#a098a8", "t3": "#686078",
        "f0": "#a08088", "f1": "#785868",
        "mk": "#383040", "lf": "#f0d080",
        # the cut-away ground and the roots
        "g0": "#4a3434", "g1": "#3a2a2c", "g2": "#2a1e22",
        "r0": "#f0e0c8", "r1": "#b09888", "r2": "#786068",
        # the Elder: a vast dark mass, a slow glow in its folds
        "e0": "#0c0810", "e1": "#140e18", "e2": "#3c2c3c", "e3": "#906848", "e4": "#e8c078",
        "mo": "#f8e0a0",
    }, "k1")
    R = rng(505)
    HZ = 50                                          # the root line (where the trunks stand)
    CX = 80

    # --- haze: dark at the top, an ember band low behind the trunks ---------
    cv.bands([0, 12, 26, 38, 44], ["k0", "k1", "k2", "k3", "k4"])
    cv.checker(cv.m_rect(0, 40, W - 1, HZ) & cv.m_ellipse(CX, HZ, 74, 10), "k5")
    cv.fill(cv.m_ellipse(CX, HZ, 40, 4) & (cv.yy <= HZ), "k5")

    # --- trunks: feet along the root line, crowns flung out and widening and
    # bowed toward us, so every one seems to lean in over the viewer --------
    def trunk(base_x, wb, lean, wt, bow, far):
        top_x = CX + (base_x - CX) * lean
        mid_y = HZ * 0.45
        mid_x = base_x + (top_x - base_x) * 0.55 + bow
        wm = wb + (wt - wb) * 0.45
        pts = [(base_x - wb / 2, HZ + 1), (mid_x - wm / 2, mid_y), (top_x - wt / 2, -1),
               (top_x + wt / 2, -1), (mid_x + wm / 2, mid_y), (base_x + wb / 2, HZ + 1)]
        m = cv.m_poly(pts)
        if far:
            cv.fill(m, "f0")
            cv.fill(m & ~np.roll(m, -2, 1), "f1")
            return m
        cv.fill(m, "t1")
        cv.fill(m & ~np.roll(m, 3, 1), "t0")              # lit on the left
        cv.fill(m & ~np.roll(m, -3, 1), "t2")             # lilac shade on the right
        cv.edge(m, "t3", "E")
        # aspen bark: short dark lenticel dashes, staggered, never in pairs
        rows = np.where(m.any(1))[0]
        for y in range(int(R.integers(1, 5)), HZ - 3, int(R.integers(5, 8))):
            xs = np.where(m[y])[0]
            if len(xs) < 5:
                continue
            x0 = int(xs[0] + 2 + R.integers(0, max(1, len(xs) - 5)))
            L = 2 if len(xs) < 9 else 3
            for k in range(L):
                if x0 + k < xs[-1] - 1:
                    cv.px(x0 + k, y, "mk")
        del rows
        # branch-scar chevrons and a broken stub on the outer side
        side = -1 if base_x < CX else 1
        for y in (int(HZ * 0.3) + int(R.integers(-3, 4)), int(HZ * 0.62) + int(R.integers(-3, 4))):
            xs = np.where(m[y])[0]
            if len(xs) < 4:
                continue
            cx_ = int(xs[len(xs) // 2])
            cv.px(cx_ - 1, y, "mk")
            cv.px(cx_, y + 1, "mk")
            cv.px(cx_ + 1, y, "mk")
        y = int(HZ * 0.45) + int(R.integers(-4, 5))
        xs = np.where(m[y])[0]
        if len(xs):
            x0 = int(xs[-1] if side > 0 else xs[0])
            cv.line([(x0, y), (x0 + side * 3, y - 2), (x0 + side * 5, y - 3)], "t3")
            cv.px(x0 + side * 1, y - 1, "t2")
        return m

    for bx in (14, 30, 46, 58, 70, 90, 103, 116, 131, 147):            # far row: thin and hazy
        trunk(bx, 2, 1.5, 4, 0, True)
    near = [(6, 5, 2.3, 22, -4), (24, 4, 2.7, 16, -3), (40, 4, 2.9, 13, -2), (55, 3, 3.1, 10, -1),
            (69, 3, 2.6, 8, 0), (80, 3, 1.0, 7, 0), (92, 3, 2.6, 8, 0), (106, 3, 3.1, 10, 1),
            (121, 4, 2.9, 13, 2), (137, 4, 2.7, 16, 3), (154, 5, 2.3, 22, 4)]
    for bx, wb, lean, wt, bow in near:
        trunk(bx, wb, lean, wt, bow, False)
    # the ember haze creeps back over the trunk feet
    cv.checker(cv.m_rect(0, HZ - 3, W - 1, HZ) & cv.m_of("t0", "t1", "t2", "t3", "f0", "f1", "mk"), "k4")
    # a few gold aspen leaves, falling
    for x, y in [(33, 30), (118, 22), (64, 40), (146, 38), (12, 18)]:
        cv.px(x, y, "lf")
        cv.px(x + 1, y + 1, "k5")

    # --- the ground, cut away -----------------------------------------------------
    cv.bands([HZ + 1, HZ + 9, HZ + 22], ["g0", "g1", "g2"])
    cv.rect(0, HZ + 1, W - 1, HZ + 1, "k3")

    # --- the Elder: one vast shape under everything, already going ---------
    lobes = (cv.m_ellipse(CX, 104, 62, 32) | cv.m_ellipse(32, 108, 40, 26) | cv.m_ellipse(128, 107, 38, 24)
             | cv.m_ellipse(56, 90, 15, 13) | cv.m_ellipse(106, 91, 13, 11))
    lobes &= cv.yy > HZ + 12
    cv.fill(lobes, "e1")
    top = lobes & ~np.roll(lobes, 1, 0)
    cv.fill(top & (abs(cv.xx - CX) < 46), "e3")
    cv.fill(top & (abs(cv.xx - CX) >= 46), "e2")
    cv.checker(lobes & ~np.roll(lobes, 3, 0) & ~top, "e2")
    # a slow inner glow along its folds: broken rings, like growth rings in wood
    for k, (ry, c) in enumerate([(24, "e2"), (19, "e3"), (14, "e2"), (9, "e3")]):
        rx = ry * 2.3
        for a in np.linspace(math.pi * 1.02, math.pi * 1.98, 180):
            if math.sin(a * (7 + 2 * k) + k * 1.7) < -0.2:
                continue
            x = CX + rx * math.cos(a)
            y = 100 + ry * math.sin(a)
            if 0 <= x < W and HZ < y < 96 and lobes[int(round(y)), int(round(x))]:
                cv.px(x, y, c)
    # the light is diffuse, deep inside: no single spot, nothing like a face
    cv.checker(cv.m_ellipse(CX, 90, 30, 5) & lobes & cv.m_of("e1"), "e2")
    # vanishing: the far lobes dissolve into the soil
    fade = lobes & (abs(cv.xx - CX) > 50)
    cv.checker(fade, "g2")
    cv.sparse(lobes & (abs(cv.xx - CX) > 64), "g1")
    cv.checker(lobes & (cv.yy > 92) & (abs(cv.xx - CX) > 30), "e0")

    # --- roots: from every trunk foot down into the shape ---------------------
    def top_y(x):
        col = np.where(lobes[:, int(min(W - 1, max(0, x)))])[0]
        return int(col[0]) if len(col) else 95
    feet = [n[0] for n in near] + [14, 30, 46, 58, 70, 90, 103, 116, 131, 147]
    for bx in feet:
        far = bx not in [n[0] for n in near]
        tx = CX + (bx - CX) * 0.6
        ty = top_y(tx)
        pts = [(float(bx), float(HZ + 2))]
        steps = 12
        for i in range(1, steps + 1):
            t = i / steps
            pts.append((bx + (tx - bx) * t + R.uniform(-1.0, 1.0), HZ + 2 + (ty - HZ - 2) * (t ** 0.85)))
        cv.line(pts, "r2" if far else "r1")
        if not far:
            cv.line(pts[:4], "r0")
            j = int(R.integers(3, 8))
            sx, sy = pts[j]
            d = -1 if bx < CX else 1
            cv.line([(sx, sy), (sx + d * 4, sy + 3), (sx + d * 6, sy + 7)], "r2")
    # where the roots meet it, it glows faintly
    for bx in [n[0] for n in near]:
        tx = CX + (bx - CX) * 0.6
        cv.px(tx, top_y(tx), "e4" if abs(tx - CX) < 30 else "e3")

    # --- motes rising out of it, the last of the vision -----------------------
    for x, y in [(28, 72), (50, 68), (118, 70), (138, 78), (98, 64), (70, 76), (14, 82), (150, 84)]:
        cv.px(x, y, "mo")
        cv.px(x, y + 1, "e3")

    # --- the calm bottom: everything under the text box sinks into dark -------
    cv.checker(cv.m_rect(0, 94, W - 1, 99) & ~lobes, "e0")
    cv.rect(0, 100, W - 1, H - 1, "e0")
    return cv.image()


# =============================================================================
# morrow_listening
# =============================================================================
def morrow_listening() -> Image.Image:
    cv = Canvas({
        # night sky, stars, a thin moon
        "s0": "#101828", "s1": "#182238", "s2": "#202c48", "st": "#b8c0d8", "mn": "#e8e8d0",
        # burnt snags: black, cracked silver bark on the moonlit side
        "b0": "#08080c", "b1": "#181820", "b2": "#585868", "b3": "#9898a8",
        # ash ground, ember flecks, fireweed shoots
        "a0": "#686878", "a1": "#484858", "a2": "#303040", "a3": "#202030", "em": "#c86038",
        "sh": "#58a040", "sh2": "#286828",
        # MORROW: charcoal coat, silver hair, pale skin in the glow
        "c0": "#525264", "c1": "#363646", "c2": "#20202c", "hr0": "#e8e8f0", "hr1": "#b0b0c8", "hr2": "#787890",
        "sk": "#d8b8b0", "sk2": "#a08088",
        # ghost pipes and their light
        "p0": "#f8f8f8", "p1": "#e0d8f0", "p2": "#a898c8", "p3": "#685880",
        "l0": "#c8b8e8", "l1": "#7868a0", "l2": "#403860",
        "k": "#181818",
    }, "s1")
    R = rng(55)
    GY = 88                                           # the ash line under the figure
    PX, PY = 119, 74                                  # the heart of the pipes' light

    # --- sky -----------------------------------------------------------------
    cv.bands([0, 26, 54], ["s0", "s1", "s2"])
    for _ in range(24):
        x, y = int(R.integers(0, W)), int(R.integers(0, 50))
        cv.px(x, y, "st")
    cv.ellipse(138, 14, 6, 6, "mn")
    cv.ellipse(141, 12, 6, 6, "s0")                   # a thin crescent

    # --- burnt snags: tapered, a little off true, the tops snapped ---------
    def snag(x, wb, wt, top, base, lean=0.0, broken=True):
        tx = x + lean
        m = cv.m_poly([(x - wb / 2, base), (x + wb / 2, base), (tx + wt / 2, top), (tx - wt / 2, top)])
        if broken:
            m |= cv.m_poly([(tx - wt / 2, top), (tx - wt * 0.1, top - 7), (tx + wt * 0.15, top - 2),
                            (tx + wt * 0.4, top - 4), (tx + wt / 2, top)])
        cv.fill(m, "b1")
        cv.fill(m & ~np.roll(m, 2, 1), "b0")                       # the dark side away from the moon
        for y in range(top + 1, base, 3):                          # cracked silver bark, moonlit side
            xs = np.where(m[y])[0]
            if len(xs) < 3 or R.uniform() > 0.75:
                continue
            xx = int(xs[-1] - 1 - R.integers(0, max(1, len(xs) // 2)))
            cv.px(xx, y, "b2")
            if xx + 1 < xs[-1]:
                cv.px(xx + 1, y, "b3" if R.uniform() < 0.4 else "b2")
        cv.edge(m, "b2", "E")
        return m

    snag(8, 12, 7, 0, GY + 4, lean=2)
    snag(44, 4, 2, 30, GY - 4, lean=-1)
    snag(150, 14, 10, -8, GY + 6, lean=1, broken=False)
    snag(131, 5, 3, 22, GY - 6, lean=-1)
    # a fallen, charred log behind the pipes
    cv.fill(cv.m_poly([(112, GY - 4), (146, GY - 9), (147, GY - 4), (113, GY)]), "b1")
    cv.line([(114, GY - 4), (145, GY - 9)], "b2")

    # --- ash ground ---------------------------------------------------------------
    ground = cv.yy >= GY - 2 + np.round(1.5 * np.sin(cv.xx * 0.05))
    cv.fill(ground, "a1")
    cv.fill(ground & (cv.yy < GY + 1), "a0")
    cv.checker(ground & (cv.yy >= 96) & (cv.yy < 100), "a2")
    cv.fill(ground & (cv.yy >= 100), "a2")
    cv.checker(ground & (cv.yy >= 114) & (cv.yy < 118), "a3")
    cv.fill(ground & (cv.yy >= 118), "a3")
    for x, y in [(30, 92), (78, 94), (150, 92), (6, 95)]:
        cv.px(x, y, "em")
    for x, y in [(36, 90), (148, 88), (156, 91)]:          # fireweed shoots
        cv.px(x, y, "sh")
        cv.px(x - 1, y - 1, "sh")
        cv.px(x + 1, y - 2, "sh")
        cv.px(x, y + 1, "sh2")

    # --- the pipes' light on the ash and the snags ----------------------------
    light = cv.m_ellipse(PX, PY + 6, 36, 22)
    cv.checker(light & cv.m_of("a0", "a1", "s2", "s1"), "l2")
    cv.fill(cv.m_ellipse(PX, GY, 26, 4) & ground, "l2")
    cv.checker(cv.m_ellipse(PX, GY, 18, 3) & ground, "l1")
    cv.fill(light & cv.m_of("b2"), "l1")
    cv.glow(PX, PY, [(16, "l1", "dith"), (10, "l0", "dith")], 0.9,
            only=cv.m_of("s1", "s2", "a0", "a1", "l2", "b1", "b0", "b2"))

    # The figure is drawn on a 1.3x grid about the planted boot.
    K, OX = 1.3, 66

    def T(pts):
        return [(OX + (x - OX) * K, GY + (y - GY) * K) for x, y in pts]

    # --- MORROW: one knee down, one up, bent low over the pipes --------------
    # About 47px from the ash to the top of his back, the head about 9px: a
    # man kneeling, not a tent. The long coat drapes off his back and pools
    # behind the grounded knee; the near leg's knee is up, its boot planted.
    coat = cv.m_poly(T([(28, GY + 1), (34, 84), (40, 76), (44, 66), (50, 58), (58, 52), (67, 48), (76, 46),
                      (82, 47), (85, 51), (83, 56), (76, 60), (70, 63), (66, 70), (64, 78), (66, GY + 1)]))
    cv.fill(coat, "c1")
    cv.fill(coat & ~np.roll(coat, 3, 0), "c0")                                     # moonlight on the back
    cv.fill(coat & (cv.yy > GY - 3), "c2")                                         # pooled in the ash
    for (x0, y0), (x1, y1) in (((40, GY - 1), (50, 62)), ((50, GY - 1), (56, 64)), ((58, GY - 1), (62, 66)),
                               ((60, 55), (70, 52))):
        cv.line(T([(x0, y0), (x1, y1)]), "c2")                                         # folds falling from the hip
    cv.edge(coat, "k", "W")
    cv.edge(coat, "k", "N")
    cv.fill(cv.m_poly(T([(22, GY + 1), (25, GY - 4), (31, GY - 3), (30, GY + 1)])), "k")   # the grounded foot's sole
    # the raised knee: thigh forward from under the coat, shin straight down
    knee = cv.m_poly(T([(64, 62), (73, 61), (77, 64), (77, 69), (74, 71), (66, 70)])) & ~coat
    cv.fill(knee, "c1")
    cv.fill(knee & (cv.yy < 64), "c0")
    shin = cv.m_poly(T([(71, 68), (77, 68), (77, GY - 4), (71, GY - 4)]))
    cv.fill(shin, "c2")
    cv.edge(shin | knee, "k", "W")
    cv.fill(cv.m_poly(T([(69, GY - 4), (79, GY - 4), (81, GY + 1), (68, GY + 1)])), "k")   # the boot
    cv.px(*T([(78, GY - 3)])[0], "b2")
    knee |= shin
    # the near arm: a straight sleeve from the shoulder to a hand braced in the ash
    arm = cv.m_poly(T([(77, 48), (84, 48), (87, 60), (90, 81), (86, 82), (81, 62)]))
    cv.fill(arm, "c1")
    cv.fill(arm & ~np.roll(arm, 2, 1), "c0")
    cv.edge(arm, "k", "W")
    hand = cv.m_poly(T([(85, 82), (90, 81), (93, 84), (93, 86), (85, 86)]))
    cv.fill(hand, "sk")
    cv.line(T([(88, 86), (92, 86)]), "sk2")                                          # fingers spread in the ash
    cv.line(T([(86, 81), (90, 80)]), "c2")                                           # the cuff
    # the high collar, and the neck bent forward
    collar = cv.m_poly(T([(80, 45), (85, 45), (88, 50), (88, 55), (84, 53)]))
    cv.fill(collar, "c0")
    cv.edge(collar, "c2", "S")
    cv.edge(collar, "k", "N")
    # the head, bowed low: crown toward us, one ear turned down to the pipes
    HX, HY = T([(90, 57)])[0]
    head = cv.m_ellipse(HX, HY, 4 * K, 4.2 * K)
    cheek = head & ~cv.m_ellipse(HX - 2.5, HY - 2.5, 4.2 * K, 4.2 * K)                       # the lower-right crescent
    hair = head & ~cheek
    cv.fill(hair, "hr1")
    cv.fill(hair & ~cv.m_ellipse(HX, HY, 3.2 * K, 3.4 * K), "hr0")                        # sheen on the crown
    cv.line([(HX + 1, HY - 4), (HX - 4, HY - 1)], "hr2")                          # combed straight back
    cv.fill(cheek, "sk")
    cv.px(HX + 2, HY + 1, "sk2")                                                  # the ear
    cv.px(HX + 2, HY + 2, "sk2")
    # the short tail of tied hair, lying back along the collar
    cv.line([(HX - 4, HY - 4)] + T([(84, 50), (81, 47)]), "hr1", 2)
    cv.px(HX - 4, HY - 4, "c2")                                                   # the tie
    cv.edge(head, "k", "W")
    cv.edge(head, "k", "N")

    # --- the ghost pipes: waxy stems with nodding bells ---------------------
    def pipe(x, h, nod):
        """A waxy stem rising from the litter, hooked over like a crook, one
        bell hanging from the hook with its mouth turned to the ground."""
        top = GY - h
        hx = x + nod * 4                                  # where the bell hangs
        stem = cv.m_line([(x, GY), (x, top + 6), (x + nod, top + 2), (x + nod * 3, top), (hx, top + 2)], 2)
        cv.fill(stem, "p1")
        cv.fill(stem & ~np.roll(stem, -1, 1), "p2")       # shade on the right of the stem
        for y in (top + 9, top + 14):                     # scale leaves pressed to the stem
            if y < GY - 2:
                cv.px(x - 1, y, "p0")
                cv.px(x + 2, y + 2, "p2")
        bell = cv.m_ellipse(hx + 0.5, top + 6, 2.6, 4.2)
        cv.fill(bell, "p1")
        cv.fill(bell & (cv.xx <= hx), "p0")
        cv.fill(bell & ~np.roll(bell, -1, 0), "p2")       # the rim, underneath
        cv.px(hx, top + 10, "p3")
        cv.px(hx + 1, top + 10, "p3")                     # the mouth, turned down
    cv.glow(PX, PY + 2, [(22, "l2", "dith"), (16, "l1", "dith"), (9, "l0", "dith")], 0.85,
            only=~(coat | arm | head | collar | knee | hand))
    for x, h, nod in [(121, 22, 1), (113, 25, -1), (126, 17, 1), (108, 17, -1), (117, 29, 1), (131, 12, 1),
                      (116, 11, -1)]:
        pipe(x, h, nod)
    for x in range(105, 135):                                                      # leaf litter at their feet
        cv.px(x, GY, "p3" if x % 3 else "p2")
        if x % 4 == 1:
            cv.px(x, GY - 1, "l1")

    # --- the glow on him: rim light on the edges that face the pipes ---------
    fig = coat | arm | head | collar | knee
    rim = fig & ~np.roll(fig, -1, 1) & (cv.xx > 74) & (cv.yy < GY - 4)
    cv.fill(rim & ~head, "l0")
    cv.fill(rim & head, "p1")
    cv.fill(cheek & cv.m_ellipse(HX + 5, HY + 5, 4, 4), "p1")                       # cheek in the glow
    return cv.image()


STILLS5 = {"fire_cone_vision": fire_cone_vision, "morrow_listening": morrow_listening}


def images():
    out = {}
    for k, fn in STILLS5.items():
        im = fn()
        assert im.size == (W, H), k
        out[k] = im
    return out


def build(write=True):
    out = images()
    if write:
        common.write_set_images("stills", out, "stills5.py")
    cells = []
    for k, im in out.items():
        cells.append((k, im))
        cells.append((k + " +box", st.with_textbox(im)))
    gbc.grid_sheet(cells, 2, 3).save(common.REVIEW / "stills_ch5.png")
    return out


if __name__ == "__main__":
    for k, im in build(write="--scratch" not in sys.argv).items():
        worst, share = st.tile_report(im)
        print(f"{k}: {len(gbc.colours(im))} colours, worst 8x8 {worst}, {share:.0%} tiles <=4")
