"""Chapter 5 structures: Cedarhallow under the giant cedars, and the camp.

  cedar_house         plank house built into the foot of a living cedar
  hollow_trunk        the oldest cedar: a fluted trunk, carved doorway, ribbons
  night_conservatory  Conservatory 4: dark iron glasshouse, panes dimly lit
  giant_cedar         a landmark cedar (scenery)
  camp_tent           a drab Rootstock tent with the graft sigil (scenery)

Same rules as structures.py: light from the top-left, hue-shifted dark
edges, transparent outside the silhouette.
"""

from __future__ import annotations

import math

from PIL import Image

import kit
from kit import Canvas, S

window, door, text_w = S.window, S.door, S.text_w

STRUCTS = {  # mirrors src/contracts/ids.ts STRUCTURES (w, h, door)
    "cedar_house": (4, 4, (1, 3)),
    "hollow_trunk": (5, 5, (2, 4)),
    "night_conservatory": (6, 4, (3, 3)),
    "giant_cedar": (3, 4, None),
    "camp_tent": (3, 2, None),
}
IMAGES: dict[str, Image.Image] = {}


# ------------------------------------------------------------- components ---
def bark(cv, x0, x1, y0, y1, flute=4, seed=0, ramp=("CB0", "CB1", "CB2", "CB3")):
    """Fibrous red-cedar bark on a round trunk: lit west, shaded east,
    long vertical flutes that wander a little."""
    b0, b1, b2, b3 = ramp
    w = max(1, x1 - x0)
    for x in range(x0, x1 + 1):
        u = (x - x0) / w
        for y in range(y0, y1 + 1):
            col = b1
            if u < 0.12:
                col = b0
            elif u > 0.8:
                col = b3
            elif u > 0.62:
                col = b2
            wob = int(round(math.sin((y + seed * 7) / 5.0 + x) * 0.6))
            if (x - x0 + wob) % flute == 0 and 0.08 < u < 0.92:
                col = b2 if u < 0.62 else b3
            if (x - x0 + wob) % flute == 1 and u < 0.45 and (y + x) % 7 == 0:
                col = b0
            cv.px(x, y, col)


def buttress(cv, cx, top, base, half_top, half_base, ramp=("CB0", "CB1", "CB2", "CB3"), seed=0):
    """A trunk that flares into buttress roots: half-width grows quadratically
    toward the base; root lobes split the foot."""
    for y in range(top, base + 1):
        t = (y - top) / max(1, base - top)
        half = half_top + (half_base - half_top) * t ** 3
        bark(cv, int(round(cx - half)), int(round(cx + half)), y, y, seed=seed, ramp=ramp)
    # root lobes: dark wedges between buttresses at the foot
    for (dx, h) in ((-0.55, 5), (0.15, 4), (0.65, 6)):
        x = int(round(cx + dx * half_base))
        for j in range(h):
            cv.px(x, base - j, ramp[3])
            if j < h - 2:
                cv.px(x + 1, base - j, ramp[2])


def crown(cv, lobes, seed=0):
    """An irregular cedar crown: a union of lobes (cx, cy, rx, ry) filled with
    the same tiered-spray texture as the old-growth canopy tiles, lit on the
    upper-left rim, deep shade on the lower-right rim, with spray tips
    drooping from the underside."""
    import tilesets as TS
    tex = TS.TIERS
    inside = {}
    for (cx, cy, rx, ry) in lobes:
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0 and 0 <= x < cv.w and 0 <= y < cv.h:
                    inside[(x, y)] = True
    for (x, y) in inside:
        col = kit.NAMES[tex[y % 16, x % 16]]
        dn, rt = (x, y + 1) not in inside, (x + 1, y) not in inside
        up, lf = (x, y - 1) not in inside, (x - 1, y) not in inside
        if dn or rt:
            col = "FR3"
        elif up or lf:
            col = "FR1" if col == "FR3" else ("FR0" if (x + y + seed) % 3 else "FR1")
        cv.px(x, y, col)
    for (x, y) in inside:                      # drooping tips under the lowest sprays
        if (x, y + 1) not in inside and (x * 7 + seed) % 5 == 0 and cv.get(x, y + 1) is None:
            cv.px(x, y + 1, "FR3")
            if (x * 3 + seed) % 2 == 0:
                cv.px(x, y + 2, "FR2")


def ground_shadow(cv, cx, cy, rx, ry, col="MS3"):
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 and cv.get(x, y) is None:
                cv.px(x, y, col)


# ------------------------------------------------------------- buildings ----
def giant_cedar():
    """A landmark western red cedar: a fluted, buttressed red trunk under a
    tiered crown of drooping sprays."""
    cv = Canvas(48, 64)
    ground_shadow(cv, 26, 60, 21, 3.5)
    buttress(cv, 24, 14, 61, 6, 15, seed=1)
    crown(cv, [(24, 5, 7, 5), (24, 13, 12, 7), (15, 22, 10, 6), (33, 22, 11, 6), (24, 30, 15, 7),
               (10, 34, 8, 4), (39, 35, 8, 4)], seed=3)
    # the leader: a drooping tip at the very top
    cv.put(["   f", "  ff", " fFF", "fF  "], {"f": "FR1", "F": "FR2"}, 23, 0)
    return cv


def cedar_house():
    """Cedarhallow house: cedar planks and a mossy shed roof, built into the
    foot of a living cedar that rises through the eaves."""
    cv = Canvas(64, 64)
    ground_shadow(cv, 32, 61, 31, 3)
    # the living cedar on the east, rising the full height
    buttress(cv, 50, 0, 62, 8, 13, seed=4)
    # walls: horizontal cedar boards on a stone footing
    x0, x1, yw = 2, 42, 34
    for y in range(yw, 59):
        for x in range(x0, x1 + 1):
            k = (y - yw) % 4
            col = ("O1", "O1", "O2", "O3")[k] if x < x1 - 2 else ("O2", "O2", "O3", "O3")[k]
            if x == x0:
                col = "O0" if k < 2 else "O2"
            cv.px(x, y, col)
    for x in range(x0, x1 + 1):
        cv.px(x, 59, "R1"); cv.px(x, 60, "R2"); cv.px(x, 61, "R3")
    # a mossy shed roof sloping down to the west, tucked under the trunk
    for y in range(18, 35):
        t = (y - 18) / 16
        xl = int(round(12 - 12 * t)) - 1
        for x in range(xl, 46):
            col = "MS1"
            if y == 18 + int((x - xl) % 5 == 0) or (x + y) % 9 == 0:
                col = "MS0"
            if (x * 3 + y) % 11 == 0:
                col = "MS2"
            if y >= 32:
                col = "O3" if y == 34 else "O2"          # the eaves board
            cv.px(x, y, col)
        cv.px(xl, y, "MS2")
    for x in range(10, 44, 7):                            # moss cushions on the shingles
        cv.put([" ,, ", ",..:", " :: "], {",": "MS0", ".": "MS1", ":": "MS2"}, x, 22 + (x // 7) % 3 * 3)
    cv.put([" f ", "ff ", "f f"], {"f": "FN1"}, 30, 16)   # a fern rooted in the roof moss
    cv.hline(2, 42, 35, "O3")                             # eaves shadow
    cv.hline(2, 42, 36, "O3")
    # window (lit at night) and the door
    window(cv, 26, 40, 10, 9, frame="O3", sill="O0")
    door(cv, 1, 3, "wood", top=41)
    cv.put(["##", "#y"], {"#": "O3", "y": "Y1"}, 9, 42)  # a little lantern by the door
    # the cedar's lowest limbs reach out over the roof
    crown(cv, [(52, 3, 13, 6), (36, 6, 10, 5), (60, 9, 6, 5), (26, 11, 7, 3.5), (46, 11, 9, 4)], seed=5)
    return cv


def hollow_trunk():
    """The Hollow: the oldest cedar, its fluted trunk filling the clearing,
    a carved doorway at its foot and offering ribbons tied round it."""
    cv = Canvas(80, 80)
    ground_shadow(cv, 41, 76, 39, 4)
    buttress(cv, 40, 8, 77, 19, 37, seed=7)
    # a dense, ragged crown over the top of the frame
    crown(cv, [(40, 3, 26, 8), (16, 6, 15, 7), (64, 6, 15, 7), (8, 13, 8, 5), (72, 14, 8, 5),
               (28, 14, 12, 5), (52, 15, 12, 5)], seed=9)
    # a limb scar and a burl on the trunk
    cv.put([" dd ", "dCCd", " dd "], {"d": "CB3", "C": "CB2"}, 27, 26)
    # rope band with ribbons
    for x in range(8, 73):
        y = 40 + int(round(abs(x - 40) ** 2 / 400.0))
        if cv.get(x, y) is not None:
            cv.px(x, y, "RP0")
            cv.px(x, y + 1, "RP1")
    for i, x in enumerate(range(12, 70, 7)):
        y = 42 + int(round(abs(x - 40) ** 2 / 400.0))
        col = ("RB0", "RB1")[i % 2]
        for j in range(5 + (i % 3)):
            cv.px(x + (j // 3), y + j, col)
        cv.px(x + 1, y + 1, "RB2" if col == "RB1" else "GP1")
    # the carved doorway (door tile 2,4 = x 32..47): an arched opening
    for y in range(56, 80):
        for x in range(33, 47):
            r = (x - 39.5) ** 2 / 49.0 + (max(0, 63 - y)) ** 2 / 49.0
            if r <= 1.0:
                cv.px(x, y, "CB3")
                if x > 41 and y > 62:
                    cv.px(x, y, "HW3")
                if r > 0.72:
                    cv.px(x, y, "CB0" if x < 40 else "CB2")    # the carved rim
    for (x, y) in ((35, 60), (36, 58), (44, 60), (43, 58), (34, 66), (45, 66), (34, 72), (45, 72)):
        cv.px(x, y, "HW0")                                   # carved notches on the rim
    # a warm glimmer inside (the keeper's lamps)
    cv.put(["y", "Y"], {"y": "GL0", "Y": "GL1"}, 41, 70)
    cv.hline(34, 45, 79, "R1")                               # worn threshold
    return cv


def night_conservatory():
    """Conservatory 4: Morrow's night glasshouse. A dark iron frame and a
    steep gable; the panes glow faintly pale blue from within."""
    cv = Canvas(96, 64)
    ground_shadow(cv, 48, 61, 47, 3, col="MS3")

    def panes(x0, x1, top_of, ybot, pw=5, ph=6, seed=0):
        for x in range(x0, x1 + 1):
            t = (x - x0) / max(1, x1 - x0)
            top = top_of(x)
            for y in range(top, ybot + 1):
                col = "NP2" if t < 0.45 else "NS1"
                if (x - x0) % pw == 0 or (y - top) % ph == 0 or y == top:
                    col = "NI1" if t < 0.6 else "NI2"
                cv.px(x, y, col)
            # a few panes lit from inside, brighter
        for (px, py) in ((x0 + 2, ybot - 8), (x0 + 12, ybot - 14), (x1 - 8, ybot - 8)):
            for yy in range(py, py + 4):
                for xx in range(px, px + 3):
                    if cv.get(xx, yy) in ("NP1", "NP2"):
                        cv.px(xx, yy, "NP0")
    # low wings with lean-to roofs
    panes(0, 29, lambda x: 26 + (29 - x) // 4, 54, seed=1)
    panes(66, 95, lambda x: 26 + (x - 66) // 4, 54, seed=2)
    # tall central nave with a steep gable
    panes(28, 67, lambda x: 6 + int(abs(x - 47.5) * 0.8), 54, pw=5, ph=7, seed=3)
    # iron ridge cresting and finial
    for x in range(30, 66):
        top = 6 + int(abs(x - 47.5) * 0.8)
        cv.px(x, top - 1, "NI2")
    cv.put([" # ", "#o#", " # ", " # "], {"#": "NI2", "o": "GL0"}, 46, 0)
    # ghost pipes pressed against the glass inside
    for (x, y) in ((6, 50), (9, 48), (14, 51), (78, 49), (82, 51), (88, 48), (36, 50), (58, 49)):
        cv.vline(x, y, 53, "GP1")
        cv.px(x + 1, y, "T0")
    # plinth of dark slate
    for x in range(0, 96):
        cv.px(x, 55, "NS1"); cv.px(x, 56, "NS2")
        for y in range(57, 62):
            cv.px(x, y, "NS2" if (x // 8 + (y > 59)) % 2 else "NS3")
        cv.px(x, 62, "NS3")
    # the sign
    w = text_w("CONSERVATORY")
    cv.rect(48 - w // 2 - 3, 32, 48 + w // 2 + 3, 40, "NI2")
    cv.rect(48 - w // 2 - 2, 33, 48 + w // 2 + 2, 39, "NS3")
    cv.text("CONSERVATORY", 48 - w // 2, 34, "NP0")
    # door (cell 3,3 = x 48..63): dark iron and glass
    door(cv, 3, 3, "glass", top=46)
    cv.recolor(48, 46, 63, 63, "Q1", "NP1")
    cv.recolor(48, 46, 63, 63, "Q2", "NP2")
    cv.recolor(48, 46, 63, 63, "Q0", "NP0")
    cv.recolor(48, 46, 63, 63, "R2", "NI2")
    cv.recolor(48, 46, 63, 63, "R0", "NI0")
    return cv


def camp_tent():
    """A Rootstock camp tent: drab canvas ridge tent, guy ropes, the graft
    sigil stencilled on the flap."""
    cv = Canvas(48, 32)
    ground_shadow(cv, 25, 29, 23, 3, col="CS2")
    # ridge tent seen from the front-left: a long roof slope and the front gable
    for y in range(4, 29):
        t = (y - 4) / 24
        xl = int(round(18 - 16 * t))
        xr = int(round(30 + 16 * t))
        for x in range(xl, xr + 1):
            col = "CV1"
            if x < 24 - (y - 4) * 0 and x < (xl + xr) // 2:
                col = "CV0" if (x - xl) < 3 else "CV1"
            else:
                col = "CV2"
            if (x - xl) % 6 == 0 and x < (xl + xr) // 2:
                col = "CV2"                                # seams on the lit slope
            cv.px(x, y, col)
        cv.px(xl, y, "CV2"); cv.px(xr, y, "CV3")
    # the open flap: a dark triangle in the middle
    for y in range(14, 29):
        half = (y - 14) * 0.45
        for x in range(int(24 - half), int(24 + half) + 1):
            cv.px(x, y, "CV3")
    cv.vline(24, 3, 28, "CV3")                             # ridge pole
    cv.px(24, 2, "O2")
    # guy ropes and pegs
    for (x0, y0, x1, y1) in ((10, 14, 1, 27), (38, 14, 46, 27)):
        for i in range(0, 21):
            t = i / 20
            cv.px(int(round(x0 + (x1 - x0) * t)), int(round(y0 + (y1 - y0) * t)), "RP1")
        cv.put(["#", "#"], {"#": "O3"}, x1, y1)
    # the Rootstock graft sigil: a scion wedged into a split stock
    cv.put([
        "y     y",
        "yy   yy",
        " yy yy ",
        "  yYy  ",
        "   Y   ",
        "   Y   ",
        "   Y   ",
    ], {"y": "Y1", "Y": "Y2"}, 9, 14)
    cv.hline(0, 47, 29, None)
    return cv


BUILDERS = {
    "cedar_house": cedar_house, "hollow_trunk": hollow_trunk, "night_conservatory": night_conservatory,
    "giant_cedar": giant_cedar, "camp_tent": camp_tent,
}


def build_all():
    for key, fn in BUILDERS.items():
        w, h, _ = STRUCTS[key]
        im = fn().image()
        assert im.size == (w * 16, h * 16), (key, im.size)
        IMAGES[key] = im


def review():
    import tilesets as TS
    moss = kit.to_img(TS.TILESETS["oldgrowth"]["moss"])
    cells = []
    for key, im in IMAGES.items():
        bg = Image.new("RGBA", (im.width + 32, im.height + 32))
        for y in range(0, bg.height, 16):
            for x in range(0, bg.width, 16):
                bg.paste(moss, (x, y))
        bg.alpha_composite(im, (16, 16))
        cells.append((key, bg))
    if cells:
        kit.gbc.grid_sheet(cells, 3, 3).save(kit.REVIEW / "structures.png")
