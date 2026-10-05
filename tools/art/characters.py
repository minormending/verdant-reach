"""Overworld characters -> public/assets/characters/<key>.png (48x64).

Sheet: 4 rows (down, up, left, right) x 3 columns (stand, step A, step B),
16x16 frames, transparent background. The engine shows step A / step B
alternately for the first half of each tile step, then the stand frame.

How a frame is built
--------------------
A frame is a stack of LAYERS painted bottom to top. A layer is an ASCII
fill (no outlines) placed at (x, y). Each layer gets a 1px outline in the
darkest colour, drawn outside its fill and over anything below it, so
arms separate from torsos, chins from collars and held tools from coats
for free. 'K' inside a fill is a deliberate inner line.

Region letters (upper case = lit, lower case = shaded):
  S skin   H hair   C hat   T top   B bottoms   F shoes   A accent
  P bag    O object/tool   W white   E eye (always outline colour)
  plus any extra letters a character's palette defines.
Shading is authored for light from the TOP-LEFT. The right-facing row is
the left row mirrored, then re-lit: inside every horizontal run of one
region the lit/shade pattern is reversed back, so shade always sits on
the right / lower edge (STYLE.md 1).

The walk: step frames drop the head and torso 1px (weight on the
contact pose), one leg reaches while the other lifts, and the opposite
arm swings. Down/up step B is step A with the limbs mirrored (the head,
hair parting and accessories stay put); side views have two real steps.

Puzzle objects (rows): hedge_gate, valve - every row the same, so the NPC
turning to face the player changes nothing. lever - DOWN and LEFT rows
are OFF (handle thrown left), UP and RIGHT rows are ON (handle thrown
right, lamp lit). Give the off lever facing "down" and the on lever
facing "up".
"""

from __future__ import annotations

import numpy as np
from PIL import Image, ImageDraw

import gbc
from gbc import C

FACINGS = ("down", "up", "left", "right")
POSES = ("stand", "a", "b")


# =============================================================================
# Frame compositor
# =============================================================================
class Frame:
    def __init__(self):
        self.code = [["."] * 16 for _ in range(16)]

    def layer(self, rows, x=0, y=0, line=True, line_colour="K", sides="NESW"):
        """sides: which neighbours get the outline (N=above, E=right...)."""
        mine = set()
        for j, r in enumerate(rows):
            for i, ch in enumerate(r):
                if ch in ". ":
                    continue
                xx, yy = x + i, y + j
                if 0 <= xx < 16 and 0 <= yy < 16:
                    self.code[yy][xx] = ch
                    mine.add((xx, yy))
        if line:
            for (xx, yy) in list(mine):
                for side, dx, dy in (("E", 1, 0), ("W", -1, 0), ("S", 0, 1), ("N", 0, -1)):
                    if side not in sides:
                        continue
                    nx, ny = xx + dx, yy + dy
                    if 0 <= nx < 16 and 0 <= ny < 16 and (nx, ny) not in mine:
                        self.code[ny][nx] = line_colour
        return self

    def paint(self, pts, ch):
        for xx, yy in pts:
            if 0 <= xx < 16 and 0 <= yy < 16:
                self.code[yy][xx] = ch
        return self

    def mirrored(self) -> "Frame":
        f = Frame()
        f.code = [list(reversed(r)) for r in self.code]
        relight(f.code)
        return f

    def shifted(self, dy) -> "Frame":
        f = Frame()
        for y in range(16):
            sy = y - dy
            if 0 <= sy < 16:
                f.code[y] = list(self.code[sy])
        return f


def relight(code):
    """After a horizontal mirror: reverse the lit/shade pattern inside every
    run of one region so the shade is back on the right-hand side."""
    for row in code:
        x = 0
        while x < 16:
            ch = row[x]
            if ch in ".KE" or not ch.isalpha():
                x += 1
                continue
            base = ch.upper()
            x1 = x
            while x1 < 16 and row[x1].isalpha() and row[x1].upper() == base and row[x1] not in "KE":
                x1 += 1
            run = row[x:x1]
            cases = [c.islower() for c in run][::-1]
            for i in range(x, x1):
                row[i] = base.lower() if cases[i - x] else base
            x = x1


def render(frame: Frame, pal: dict) -> Image.Image:
    im = Image.new("RGBA", (16, 16), gbc.CLEAR)
    px = im.load()
    for y in range(16):
        for x in range(16):
            ch = frame.code[y][x]
            if ch == ".":
                continue
            col = pal.get(ch)
            if col is None:
                col = pal.get(ch.upper(), "k")
            if isinstance(col, str):
                col = gbc.hexc(col) if col.startswith("#") else C[col]
            px[x, y] = col
    return im


def mirror_rows(rows):
    return [r[::-1] for r in rows]


def relit_rows(rows):
    """Mirror an ASCII layer horizontally and re-light it."""
    code = [list(r[::-1]) for r in rows]
    w = max(len(r) for r in code)
    code = [r + ["."] * (w - len(r)) for r in code]
    for row in code:
        x = 0
        n = len(row)
        while x < n:
            ch = row[x]
            if not ch.isalpha() or ch in "KE":
                x += 1
                continue
            base = ch.upper()
            x1 = x
            while x1 < n and row[x1].isalpha() and row[x1].upper() == base and row[x1] not in "KE":
                x1 += 1
            cases = [c.islower() for c in row[x:x1]][::-1]
            for i in range(x, x1):
                row[i] = base.lower() if cases[i - x] else base
            x = x1
    return ["".join(r) for r in code]




# =============================================================================
# Bodies: BODIES[type][facing][pose] = [(kind, rows, x, y), ...]
#   kind: "farm" (far arm, under the body), "body", "arm".
# Coordinates are absolute; step poses are authored already bobbed 1px down.
# 'L' / 'R' mark the screen-left / screen-right hand (props anchor there).
# Down/up pose "b" defaults to pose "a" with its layers mirrored + relit.
# =============================================================================
BODIES: dict = {}

BODIES["casual"] = {
    "down": {
        "stand": [
            ("body", [
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....BBBBBBbb....",
                ".....BB..bb.....",
                ".....GG..gg.....",
                ".....FF..ff.....",
            ], 0, 9),
            ("arm", [
                "...T........t...",
                "...T........t...",
                "...L........R...",
            ], 0, 9),
        ],
        "a": [
            ("body", [
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....BBBBBBbb....",
                ".....GG..ff.....",
                ".....FF.........",
            ], 0, 10),
            ("arm", [
                "...T........t...",
                "...L........t...",
                "............R...",
            ], 0, 10),
        ],
    },
    "left": {
        "stand": [
            ("body", [
                ".....TTTTtt.....",
                ".....TTTTtt.....",
                ".....BBBBbb.....",
                "......BBbb......",
                "......GGgg......",
                ".....FFFff......",
            ], 0, 9),
            ("arm", [
                "........Tt......",
                "........Tt......",
                "........LL......",
            ], 0, 9, "WS"),
        ],
        "a": [
            ("body", [
                ".....TTTTtt.....",
                ".....TTTTtt.....",
                ".....BBBBbb.....",
                ".....GG...gg....",
                "....FFF....ff...",
            ], 0, 10),
            ("arm", [
                ".........Tt.....",
                ".........Tt.....",
                "..........L.....",
            ], 0, 10, "WS"),
        ],
        "b": [
            ("body", [
                ".....TTTTtt.....",
                ".....TTTTtt.....",
                ".....BBBBbb.....",
                ".....gg...GG....",
                "....fff....FF...",
            ], 0, 10),
            ("farm", [
                ".........t......",
                ".........t......",
                ".........s......",
            ], 0, 10, ""),
            ("arm", [
                ".......Tt.......",
                "......Tt........",
                "......L.........",
            ], 0, 10, "WS"),
        ],
    },
}
BODIES["casual"]["up"] = BODIES["casual"]["down"]

# Knee-length coat (lab coat, Rootstock work coat).
BODIES["coat"] = {
    "down": {
        "stand": [
            ("body", [
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                ".....GG..gg.....",
                ".....FF..ff.....",
            ], 0, 9),
            ("arm", [
                "...T........t...",
                "...T........t...",
                "...L........R...",
            ], 0, 9),
        ],
        "a": [
            ("body", [
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                ".....GG..ff.....",
                ".....FF.........",
            ], 0, 10),
            ("arm", [
                "...T........t...",
                "...L........t...",
                "............R...",
            ], 0, 10),
        ],
    },
    "left": {
        "stand": [
            ("body", [
                ".....TTTTtt.....",
                ".....TTTTtt.....",
                ".....TTTTtt.....",
                ".....TTTTTtt....",
                "......GGgg......",
                ".....FFFff......",
            ], 0, 9),
            ("arm", [
                "........Tt......",
                "........Tt......",
                "........LL......",
            ], 0, 9, "WS"),
        ],
        "a": [
            ("body", [
                ".....TTTTtt.....",
                ".....TTTTtt.....",
                "....TTTTTTttt...",
                ".....GG...gg....",
                "....FFF....ff...",
            ], 0, 10),
            ("arm", [
                ".........Tt.....",
                ".........Tt.....",
                "..........L.....",
            ], 0, 10, "WS"),
        ],
        "b": [
            ("body", [
                ".....TTTTtt.....",
                ".....TTTTtt.....",
                "....TTTTTTttt...",
                ".....gg...GG....",
                "....fff....FF...",
            ], 0, 10),
            ("farm", [
                ".........t......",
                ".........t......",
                ".........s......",
            ], 0, 10, ""),
            ("arm", [
                ".......Tt.......",
                "......Tt........",
                "......L.........",
            ], 0, 10, "WS"),
        ],
    },
}
BODIES["coat"]["up"] = BODIES["coat"]["down"]

# Dress / skirt that flares at the hem.
BODIES["dress"] = {
    "down": {
        "stand": [
            ("body", [
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....BBBBBBbb....",
                "...BBBBBBBBbb...",
                ".....GG..gg.....",
                ".....FF..ff.....",
            ], 0, 9),
            ("arm", [
                "...T........t...",
                "...T........t...",
                "...L........R...",
            ], 0, 9, "NEW"),
        ],
        "a": [
            ("body", [
                "....TTTTTTtt....",
                "....BBBBBBbb....",
                "...BBBBBBBBbb...",
                ".....GG..ff.....",
                ".....FF.........",
            ], 0, 10),
            ("arm", [
                "...T........t...",
                "...L........t...",
                "............R...",
            ], 0, 10, "NEW"),
        ],
    },
    "left": {
        "stand": [
            ("body", [
                ".....TTTTtt.....",
                ".....TTTTtt.....",
                ".....BBBBbb.....",
                "....BBBBBBbb....",
                "......GGgg......",
                ".....FFFff......",
            ], 0, 9),
            ("arm", [
                "........Tt......",
                "........Tt......",
                "........LL......",
            ], 0, 9, "W"),
        ],
        "a": [
            ("body", [
                ".....TTTTtt.....",
                ".....BBBBbb.....",
                "....BBBBBBbbb...",
                ".....GG...gg....",
                "....FFF....ff...",
            ], 0, 10),
            ("arm", [
                ".........Tt.....",
                ".........Tt.....",
                "..........L.....",
            ], 0, 10, "W"),
        ],
        "b": [
            ("body", [
                ".....TTTTtt.....",
                ".....BBBBbb.....",
                "...BBBBBBBbb....",
                ".....gg...GG....",
                "....fff....FF...",
            ], 0, 10),
            ("arm", [
                ".......Tt.......",
                "......Tt........",
                "......L.........",
            ], 0, 10, "W"),
        ],
    },
}
BODIES["dress"]["up"] = BODIES["dress"]["down"]

# Rival: cropped jacket with pointed hem tips, hands jammed in pockets.
BODIES["jacket"] = {
    "down": {
        "stand": [
            ("body", [
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....TBBBBbbt....",
                ".....GG..gg.....",
                ".....FF..ff.....",
            ], 0, 9),
            ("arm", [
                "...T........t...",
                "...T........t...",
                "...t........t...",
            ], 0, 9),
        ],
        "a": [
            ("body", [
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....TBBBBbbt....",
                ".....GG..ff.....",
                ".....FF.........",
            ], 0, 10),
            ("arm", [
                "...T........t...",
                "...T........t...",
                "...t........t...",
            ], 0, 10),
        ],
    },
    "left": {
        "stand": [
            ("body", [
                ".....TTTTtt.....",
                ".....TTTTtt.....",
                ".....TTTTtt.....",
                ".....BBBBbtt....",
                "......GGgg......",
                ".....FFFff......",
            ], 0, 9),
            ("arm", [
                ".......Ttt......",
                "........Tt......",
                "........tt......",
            ], 0, 9, "WS"),
        ],
        "a": [
            ("body", [
                ".....TTTTtt.....",
                ".....TTTTtt.....",
                ".....BBBBbtt....",
                ".....GG...gg....",
                "....FFF....ff...",
            ], 0, 10),
            ("arm", [
                ".......Ttt......",
                "........Tt......",
                "........tt......",
            ], 0, 10, "WS"),
        ],
        "b": [
            ("body", [
                ".....TTTTtt.....",
                ".....TTTTtt.....",
                ".....BBBBbtt....",
                ".....gg...GG....",
                "....fff....FF...",
            ], 0, 10),
            ("arm", [
                ".......Ttt......",
                "........Tt......",
                "........tt......",
            ], 0, 10, "WS"),
        ],
    },
}
BODIES["jacket"]["up"] = BODIES["jacket"]["down"]

# Old and stooped: head sunk 1px into the shoulders and pushed forward.
BODIES["stooped"] = {
    "head_dy": 1,
    "head_dx": {"left": -1},
    "down": {
        "stand": [
            ("body", [
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....BBBBBBbb....",
                ".....GG..gg.....",
                ".....FF..ff.....",
            ], 0, 10),
            ("arm", [
                "...T........t...",
                "...T........t...",
                "...L........R...",
            ], 0, 10),
        ],
        "a": [
            ("body", [
                "....TTTTTTtt....",
                "....BBBBBBbb....",
                ".....GG..gg.....",
                ".....FF...ff....",
            ], 0, 11),
            ("arm", [
                "...T........t...",
                "...L........t...",
                "............R...",
            ], 0, 11),
        ],
    },
    "left": {
        "stand": [
            ("body", [
                "......TTTTtt....",
                ".....TTTTTtt....",
                ".....BBBBbb.....",
                "......GGgg......",
                ".....FFFff......",
            ], 0, 10),
            ("arm", [
                ".......Tt.......",
                "......Tt........",
                ".....LL.........",
            ], 0, 10, "WS"),
        ],
        "a": [
            ("body", [
                ".....TTTTTtt....",
                ".....BBBBbb.....",
                ".....GG..gg.....",
                "....FFF..ff.....",
            ], 0, 11),
            ("arm", [
                "......Tt........",
                ".....LL.........",
            ], 0, 11, "WS"),
        ],
        "b": [
            ("body", [
                ".....TTTTTtt....",
                ".....BBBBbb.....",
                "......gg.GG.....",
                ".....fff.FF.....",
            ], 0, 11),
            ("arm", [
                "......Tt........",
                ".....LL.........",
            ], 0, 11, "WS"),
        ],
    },
}
BODIES["stooped"]["up"] = BODIES["stooped"]["down"]

# Children: a 6-row head two pixels lower and a short body.
BODIES["kid"] = {
    "head_dy": 2,
    "down": {
        "stand": [
            ("body", [
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....BBBBBBbb....",
                ".....GG..gg.....",
                ".....FF..ff.....",
            ], 0, 10),
            ("arm", [
                "...T........t...",
                "...L........R...",
            ], 0, 10),
        ],
        "a": [
            ("body", [
                "....TTTTTTtt....",
                "....BBBBBBbb....",
                ".....GG..ff.....",
                ".....FF.........",
            ], 0, 11),
            ("arm", [
                "...L........t...",
                "............R...",
            ], 0, 11),
        ],
    },
    "left": {
        "stand": [
            ("body", [
                ".....TTTTtt.....",
                ".....TTTTtt.....",
                ".....BBBBbb.....",
                "......GGgg......",
                ".....FFFff......",
            ], 0, 10),
            ("arm", [
                "........Tt......",
                "........LL......",
            ], 0, 10, "WS"),
        ],
        "a": [
            ("body", [
                ".....TTTTtt.....",
                ".....BBBBbb.....",
                ".....GG..gg.....",
                "....FFF...ff....",
            ], 0, 11),
            ("arm", [
                ".........Tt.....",
                "..........L.....",
            ], 0, 11, "WS"),
        ],
        "b": [
            ("body", [
                ".....TTTTtt.....",
                ".....BBBBbb.....",
                ".....gg..GG.....",
                "....fff...FF....",
            ], 0, 11),
            ("arm", [
                ".......Tt.......",
                "......L.........",
            ], 0, 11, "WS"),
        ],
    },
}
BODIES["kid"]["up"] = BODIES["kid"]["down"]


# =============================================================================
# Heads: HEADS[style][facing] = rows from y=0 (fills from row 1; the chin
# outline lands on row 8). Kid heads have 6 rows of fill.
# =============================================================================
HEADS: dict = {}

# --- player: field cap with a leaf badge, chestnut tufts --------------------
HEADS["cap"] = {
    "down": [
        "................",
        ".....CCCCCc.....",
        "....CCCAACcc....",
        "...DDDDDDDDdd...",
        "...HSSSSSSSSh...",
        "...SSESSSSESs...",
        "...SSESSSSESs...",
        "....SSSSSSSs....",
    ],
    "up": [
        "................",
        ".....CCCCCc.....",
        "....CCCCCCcc....",
        "...CCCCCCCCcc...",
        "...DDDDDDDDdd...",
        "...HHHHHHHHhh...",
        "...SHHHHHHHhs...",
        "....HHHHHHhh....",
    ],
    "left": [
        "................",
        ".....CCCCCc.....",
        "....CCCCCCcc....",
        ".DDDDDCCCCCcc...",
        "...SSSSHHHHhh...",
        "...SESSSHHHhh...",
        "..SSSSSSSHhh....",
        "...SSSSSSs......",
    ],
}

# --- Dr. Vale: a wild shock of red hair, round glasses -----------------------
HEADS["wild"] = {
    "down": [
        "................",
        "...H.HHHHHh.h...",
        "..HHHHHHHHHHhh..",
        ".HHHHHHHHHHHhhh.",
        "..HHSSSSSSSShh..",
        ".HHKWKSSKWKShhh.",
        "..HSSSSSSSSSsh..",
        "..hhSSSSSSSshh..",
    ],
    "up": [
        "................",
        "...H.HHHHHh.h...",
        "..HHHHHHHHHHhh..",
        ".HHHHHHHHHHHhhh.",
        "..HHHhHHHhHHhh..",
        ".HHHhHHHHhHHhhh.",
        "..HHhHHHHhHHhh..",
        "..hhhHHHHHhhhh..",
    ],
    "left": [
        "................",
        "....H.HHHHh.h...",
        "...HHHHHHHHHhh..",
        "..HHHHHHHHHHHhh.",
        "...HSSSHHHHHhh..",
        "..KWKSSSHHHHhhh.",
        "..SSSSSSHHHhh...",
        "...SSSSSShhhh...",
    ],
}

# --- Bram: sharp swept-back spikes, a scowl -----------------------------------
HEADS["spiky"] = {
    "down": [
        "................",
        "...H..H..H..h...",
        "...HHHHHHHHHh...",
        "..HHHHHHHHHHhh..",
        "...HSHSSSHShh...",
        "...SSKSSSSKSs...",
        "...SSSESSESSs...",
        "....SSSSSSSs....",
    ],
    "up": [
        "................",
        "...H..H..H..h...",
        "...HHHHHHHHHh...",
        "..HHHHHHHHHHhh..",
        "...HHHHHHHHhh...",
        "..HHHHHHHHHHhh..",
        "...SHHHHHHHhs...",
        "....HHHHHHhh....",
    ],
    "left": [
        "................",
        ".....H..H..H....",
        "....HHHHHHHHHh..",
        "...HHHHHHHHHHhhh",
        "...HSHHHHHHHhh..",
        "...KSSSHHHHhhh..",
        "..SESSSSHHh.....",
        "...SSSSSSs......",
    ],
}

# --- Hollis: tweed flat cap, grey sideburns and a short beard ---------------
HEADS["flatcap"] = {
    "down": [
        "................",
        "....CCCCCCCc....",
        "...CCCCCCCCCc...",
        "..DDDDDDDDDDdd..",
        "...HSSSSSSSSh...",
        "...HSESSSSESh...",
        "...HSESSSSESh...",
        "....HHHHHHHh....",
    ],
    "up": [
        "................",
        "....CCCCCCCc....",
        "...CCCCCCCCCc...",
        "...CCCCCCCCCc...",
        "...DDDDDDDDdd...",
        "...HHHHHHHHhh...",
        "...SHHHHHHHhs...",
        "....SSSSSSss....",
    ],
    "left": [
        "................",
        ".....CCCCCCc....",
        "....CCCCCCCCc...",
        ".DDDDDDCCCCCc...",
        "...SSSSSHHHh....",
        "...SESSSHHHh....",
        "..SSSSSSHHh.....",
        "...HHHHHHh......",
    ],
}

# --- Nell Pitcher: strawberry-blonde bunches ---------------------------------
HEADS["bunches"] = {
    "down": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "..AHSSSSSSSShA..",
        ".HHSSESSSSESshh.",
        ".HhSSESSSSESshh.",
        "..h.SSSSSSSs.h..",
    ],
    "up": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "..AHHHHHHHHhhA..",
        ".HHHHHHHHHHHhhh.",
        ".Hh.SHHHHHhs.hh.",
        "..h..HHHHhh..h..",
    ],
    "left": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "...HSSSHHHHhAh..",
        "...SESSSHHHhhhh.",
        "..SSSSSSSHh.hhh.",
        "...SSSSSSs...h..",
    ],
}

# --- Shears: slicked silver hair, flat cold brows ------------------------------
HEADS["slick"] = {
    "down": [
        "................",
        ".....HHHHHh.....",
        "....HWHHHHHh....",
        "...HWHHhHHHhh...",
        "...HHSSSSSShh...",
        "...SKKSSSSKKs...",
        "...SSESSSSESs...",
        "....SSSSSSSs....",
    ],
    "up": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "...HHHHHHHHhh...",
        "...HHHHHHHHhh...",
        "...SHHHHHHHhs...",
        "....SSSSSSss....",
    ],
    "left": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHHh...",
        "...HHHHHHHHHhh..",
        "...SSSSHHHHhhh..",
        "...KKSSSHHHhh...",
        "..SESSSSSHh.....",
        "...SSSSSSs......",
    ],
}

# --- Rootstock grunt: grey cap with the graft sigil, dust mask ---------------
HEADS["grunt"] = {
    "down": [
        "................",
        ".....CCCCCc.....",
        "....CCCAACcc....",
        "...DDDDDDDDdd...",
        "...HSSSSSSSSh...",
        "...SSESSSSESs...",
        "...WWWWWWWWWw...",
        "....WWWWWWWw....",
    ],
    "up": [
        "................",
        ".....CCCCCc.....",
        "....CCCCCCcc....",
        "...CCCCCCCCcc...",
        "...DDDDDDDDdd...",
        "...HHHHHHHHhh...",
        "...SKKHHHHKKs...",
        "....HHHHHHhh....",
    ],
    "left": [
        "................",
        ".....CCCCCc.....",
        "....CCCCCCcc....",
        ".DDDDDCCCCCcc...",
        "...SSSSHHHHhh...",
        "...SESSKHHHhh...",
        "..WWWWWWKHhh....",
        "...WWWWWw.......",
    ],
}

# --- Old Fennimore: bald dome, white tufts, glasses, white beard -------------
HEADS["bald"] = {
    "down": [
        "................",
        ".....SSSSSs.....",
        "....SWSSSSSs....",
        "...HSSSSSSSsh...",
        "...HSSSSSSSSh...",
        "...HKWKSSKWKh...",
        "...HSSSSSSSSh...",
        "....HHHHHHHh....",
    ],
    "up": [
        "................",
        ".....SSSSSs.....",
        "....SWSSSSSs....",
        "...SSSSSSSSss...",
        "...HSSSSSSSsh...",
        "...HHHHHHHHhh...",
        "...SHHHHHHHhs...",
        "....SSSSSSss....",
    ],
    "left": [
        "................",
        ".....SSSSSs.....",
        "....SWSSSSSs....",
        "...SSSSSSSSss...",
        "...SSSSSSSHHh...",
        "..KWKSSSSHHh....",
        "..SSSSSSHHh.....",
        "...HHHHHHh......",
    ],
}

# --- herb headscarf (greenhouse keepers) --------------------------------------
HEADS["scarf"] = {
    "down": [
        "................",
        ".....CCCCCc.....",
        "....CCCCCCcc....",
        "...CCCCAACCcc...",
        "...CHHSSSSHHc...",
        "...SSESSSSESs...",
        "...SSESSSSESs...",
        "....SSSSSSSs....",
    ],
    "up": [
        "................",
        ".....CCCCCc.....",
        "....CCCCCCcc....",
        "...CCCCCCCCcc...",
        "...CCCCCCCCcc...",
        "...HHHHCcHHhh...",
        "...SHHHCcHHhs...",
        "....HHCCccH.....",
    ],
    "left": [
        "................",
        ".....CCCCCc.....",
        "....CCCCCCcc....",
        "...CCCCCCCCcc...",
        "...HHSSCCCCcc...",
        "...SESSSHHcCc...",
        "..SSSSSSSHhcc...",
        "...SSSSSSs..c...",
    ],
}

# --- plain short hair ----------------------------------------------------------
HEADS["short"] = {
    "down": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "...HHSSSHSShh...",
        "...SSESSSSESs...",
        "...SSESSSSESs...",
        "....SSSSSSSs....",
    ],
    "up": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "...HHHHHHHHhh...",
        "...HHHHHHHHhh...",
        "...SHHHHHHHhs...",
        "....SSSSSSss....",
    ],
    "left": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "...HSSSHHHHhh...",
        "...SESSSHHHhh...",
        "..SSSSSSSHhh....",
        "...SSSSSSs......",
    ],
}

# --- long hair to the shoulders ------------------------------------------------
HEADS["long"] = {
    "down": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "..HHHSSSSSHhhh..",
        "..HSSESSSSEShh..",
        "..HSSESSSSEShh..",
        "..HhSSSSSSShhh..",
    ],
    "up": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "..HHHHHHHHHHhh..",
        "..HHHHHHHHHHhh..",
        "..HHHHHHHHHHhh..",
        "..HhHHHHHHHHhh..",
    ],
    "left": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "...HSSSHHHHHhh..",
        "...SESSSHHHHhh..",
        "..SSSSSSHHHHhh..",
        "...SSSSSShHhhh..",
    ],
}

# --- grey bun (elder) -----------------------------------------------------------
HEADS["bun"] = {
    "down": [
        "................",
        "......HHhh......",
        "....HHHHHHhh....",
        "...HHHHHHHHhh...",
        "...HSSSSSSSSh...",
        "...SSESSSSESs...",
        "...SSESSSSESs...",
        "....SSSSSSSs....",
    ],
    "up": [
        "................",
        "......HHhh......",
        "....HHAHHAhh....",
        "...HHHHHHHHhh...",
        "...HHHHHHHHhh...",
        "...HHHHHHHHhh...",
        "...SHHHHHHHhs...",
        "....SSSSSSss....",
    ],
    "left": [
        "................",
        "..........HHh...",
        ".....HHHHHHhh...",
        "....HHHHHHHHh...",
        "...HSSSSHHHhh...",
        "...SESSSHHHhh...",
        "..SSSSSSSHhh....",
        "...SSSSSSs......",
    ],
}

# --- wide-brimmed hat: crown C, band A, brim D (gardener, birder, hiker) ----
HEADS["brim"] = {
    "down": [
        "................",
        ".....CCCCCc.....",
        ".....AAAAAa.....",
        ".DDDDDDDDDDDDdd.",
        "...HSSSSSSSSh...",
        "...SSESSSSESs...",
        "...SSESSSSESs...",
        "....SSSSSSSs....",
    ],
    "up": [
        "................",
        ".....CCCCCc.....",
        ".....AAAAAa.....",
        ".DDDDDDDDDDDDdd.",
        "...HHHHHHHHhh...",
        "...HHHHHHHHhh...",
        "...SHHHHHHHhs...",
        "....SSSSSSss....",
    ],
    "left": [
        "................",
        "......CCCCCc....",
        "......AAAAAa....",
        "DDDDDDDDDDDDDdd.",
        "...SSSSSHHHh....",
        "...SESSSHHHh....",
        "..SSSSSSSHh.....",
        "...SSSSSSs......",
    ],
}

# --- beekeeper: hat and mesh veil to the shoulders ---------------------------
HEADS["veil"] = {
    "down": [
        "................",
        ".....CCCCCc.....",
        "..DDDDDDDDDDdd..",
        "..MWMWMWMWMWMw..",
        "..WMWMWMWMWMWw..",
        "..MWMEWMWEWMMw..",
        "..WMWMWMWMWMWw..",
        "...MWMWMWMWMw...",
    ],
    "up": [
        "................",
        ".....CCCCCc.....",
        "..DDDDDDDDDDdd..",
        "..MWMWMWMWMWMw..",
        "..WMWMWMWMWMWw..",
        "..MWMWMWMWMWMw..",
        "..WMWMWMWMWMWw..",
        "...MWMWMWMWMw...",
    ],
    "left": [
        "................",
        "......CCCCCc....",
        "...DDDDDDDDDDd..",
        "...MWMWMWMWMWw..",
        "...WMWMWMWMWMw..",
        "...MEMWMWMWMWw..",
        "...WMWMWMWMWMw..",
        "....MWMWMWMWw...",
    ],
}

# --- chin-length bob with straight bangs ------------------------------------
HEADS["bob"] = {
    "down": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "..HHHHHHHHHHhh..",
        "..HSSESSSSESSh..",
        "..HSSESSSSESSh..",
        "..hhSSSSSSSShh..",
    ],
    "up": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "..HHHHHHHHHHhh..",
        "..HHHHHHHHHHhh..",
        "..HHHHHHHHHHhh..",
        "..hhHHHHHHHHhh..",
    ],
    "left": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "..HHHHHHHHHHhh..",
        "...SESSSHHHHhh..",
        "..SSSSSSHHHHhh..",
        "...SSSSShhhhh...",
    ],
}

# =============================================================================
# Kid heads: 6 rows of fill (rows 1..6), placed 2px lower by the kid body.
# =============================================================================
HEADS["mop"] = {          # Pip: a tousled mop
    "down": [
        "................",
        "....H.HHHH.H....",
        "...HHHHHHHHHh...",
        "..HHHHSHHSHHhh..",
        "...SSESSSSESs...",
        "...SSESSSSESs...",
        "....SSSSSSSs....",
    ],
    "up": [
        "................",
        "....H.HHHH.H....",
        "...HHHHHHHHHh...",
        "..HHHHHHHHHHhh..",
        "...HHHHHHHHhh...",
        "...SHHHHHHHhs...",
        "....SSSSSSss....",
    ],
    "left": [
        "................",
        "....H.HHHHH.....",
        "...HHHHHHHHHh...",
        "..HHSHHHHHHHhh..",
        "...SESSSHHHhh...",
        "..SSSSSSSHhh....",
        "...SSSSSSs......",
    ],
}

HEADS["kidspiky"] = {
    "down": [
        "................",
        "...H.H.HH.H.h...",
        "...HHHHHHHHHh...",
        "...HSHSSSHShh...",
        "...SSESSSSESs...",
        "...SSESSSSESs...",
        "....SSSSSSSs....",
    ],
    "up": [
        "................",
        "...H.H.HH.H.h...",
        "...HHHHHHHHHh...",
        "...HHHHHHHHhh...",
        "...HHHHHHHHhh...",
        "...SHHHHHHHhs...",
        "....SSSSSSss....",
    ],
    "left": [
        "................",
        "....H.H.H.H.h...",
        "...HHHHHHHHHh...",
        "...HSHHHHHHhh...",
        "...SESSSHHHhh...",
        "..SSSSSSSHhh....",
        "...SSSSSSs......",
    ],
}

HEADS["kidneat"] = {      # schoolkid: neat bowl cut
    "down": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "...HSESSSSESh...",
        "...SSESSSSESs...",
        "....SSSSSSSs....",
    ],
    "up": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "...HHHHHHHHhh...",
        "...SHHHHHHHhs...",
        "....SSSSSSss....",
    ],
    "left": [
        "................",
        ".....HHHHHh.....",
        "....HHHHHHHh....",
        "...HHHHHHHHhh...",
        "...SESSHHHHhh...",
        "..SSSSSSSHhh....",
        "...SSSSSSs......",
    ],
}


# =============================================================================
# Characters. acc: list of dicts {facing: [(rows, x, y)], "z": back|mid|head|
# front, "line": bool, "sides": "NESW"}; coordinates are for the stand pose
# and follow the 1px bob. held: {facing: (rows, hand, dx, dy, z)} anchored to
# the 'L'/'R' hand so props swing with the arm.
# =============================================================================
DEFAULT_PAL = {"K": "k", "E": "k", "S": "sk0", "s": "sk1", "L": "sk0", "R": "sk0",
               "W": "white", "w": "r1", "Z": "r0", "z": "r2", "O": "o1", "o": "o2"}

CHARS: dict = {}

# The junior botanist: green field cap with a leaf badge, chestnut hair,
# rust field jacket, jeans, and a tin vasculum (specimen case) on a strap.
CHARS["player"] = dict(
    head="cap", body="casual",
    pal={"C": "g2", "c": "f2", "D": "f2", "d": "f3", "A": "g0", "H": "d2", "h": "d3",
         "T": "m1", "t": "m2", "B": "u1", "b": "u2", "F": "o3", "f": "o3",
         "P": "o3", "p": "o3", "V": "q1", "v": "q2"},
    acc=[
        {"down": [(["P....", ".PP..", "...PP"], 5, 9)], "up": [(["....P", "..PP."], 6, 9)],
         "left": [], "z": "mid", "line": False},
        {"up": [(["VVVVVv", "vvvvvv"], 5, 11)], "z": "front"},
        {"left": [(["VVv", "vvv"], 10, 10)], "down": [(["Vv"], 12, 10)], "z": "back"},
    ],
)

# Dr. Vale: wild red hair, round glasses, lab coat over a green blouse,
# a fat leather satchel on her hip.
CHARS["vale"] = dict(
    head="wild", body="coat",
    pal={"H": "b1", "h": "b2", "T": "white", "t": "r1", "A": "g2", "a": "f2",
         "B": "f2", "b": "f3", "F": "o3", "f": "o3", "P": "o1", "p": "o2"},
    acc=[
        {"down": [(["Aa", "Aa"], 7, 9)], "z": "mid", "line": False},
        {"down": [(["K", "K"], 8, 11)], "z": "mid", "line": False},
        {"down": [(["PPPp", "pppp"], 11, 11)], "up": [(["PPPp", "pppp"], 1, 11)],
         "left": [(["PPp", "ppp"], 9, 11)], "z": "front"},
        {"up": [(["........P", ".......P.", "......P.."], 4, 8)], "z": "mid", "line": False},
    ],
)

# Bram: blue-black spikes, plum jacket with a red lining and pointed hem,
# hands jammed in his pockets.
CHARS["bram"] = dict(
    head="spiky", body="jacket",
    pal={"H": "u2", "h": "u3", "T": "x2", "t": "x3", "A": "b1",
         "B": "#383848", "b": "#202030", "F": "k", "f": "k"},
    acc=[
        {"down": [(["A", "A"], 4, 8)], "z": "head", "line": True, "sides": "NW"},
        {"down": [(["A", "A"], 11, 8)], "z": "head", "line": True, "sides": "NE"},
        {"left": [(["A", "A"], 8, 8)], "z": "head", "line": True, "sides": "NE"},
    ],
)

# Hollis: tweed flat cap, grey whiskers, waxed olive jacket, a billhook
# carried over the shoulder.
CHARS["hollis"] = dict(
    head="flatcap", body="casual",
    pal={"C": "d1", "c": "d2", "D": "d2", "d": "d3", "H": "r1", "h": "r2",
         "T": "#688840", "t": "#405828", "B": "d2", "b": "d3", "G": "o3", "g": "o3",
         "F": "o3", "f": "o3", "O": "o1", "o": "o2"},
    acc=[],
    held={
        "down": (["ZZ.", "..Z", "..O", "..O", ".O.", ".O."], "R", 0, -6, "front"),
        "up": ([".ZZ", "Z..", "O..", "O..", ".O.", ".O."], "L", -2, -6, "front"),
        "left": (["..ZZ", "..Z.", "..O.", "...O", "...O"], "L", -1, -5, "back"),
    },
)

# Dr. Nell Pitcher: strawberry-blonde bunches, pink shirt, denim dungarees,
# yellow wellies.
CHARS["nell_pitcher"] = dict(
    head="bunches", body="casual",
    pal={"H": "m0", "h": "m1", "A": "g2", "T": "n1", "t": "n2", "B": "u1", "b": "u2",
         "G": "y1", "g": "y2", "F": "y2", "f": "y3"},
    acc=[
        {"down": [(["B....b", "BBBBbb"], 5, 9)], "up": [(["B....b", ".BBbb."], 5, 9)],
         "left": [(["BBb"], 5, 10)], "z": "mid", "line": False},
    ],
)

# Shears: silver slicked hair, charcoal Rootstock coat, yellow graft-tape
# armband, long hedge shears.
CHARS["shears"] = dict(
    head="slick", body="coat",
    pal={"H": "r1", "h": "r2", "T": "r2", "t": "r3", "A": "y1", "a": "y2",
         "B": "r3", "b": "k", "F": "k", "f": "k", "O": "m2", "o": "m3"},
    acc=[
        {"down": [(["k", "k"], 7, 11)], "z": "mid", "line": False},
        {"down": [(["A"], 12, 9)], "up": [(["A"], 3, 9)], "left": [(["Aa"], 8, 9)],
         "z": "front", "line": False},
    ],
    held={
        "down": (["O", "O", "Z", "Z", "z"], "L", 0, 1, "front"),
        "up": (["O", "O", "Z", "Z", "z"], "R", 0, 1, "back"),
        "left": (["OZZz"], "L", -4, 0, "front"),
    },
)

# Rootstock grunt: grey cap with the graft sigil, dust mask, grey work coat,
# graft-tape armband.
CHARS["grunt"] = dict(
    head="grunt", body="coat",
    pal={"C": "r2", "c": "r3", "D": "r3", "d": "r3", "A": "y1", "a": "y2", "H": "d3", "h": "d3",
         "T": "r1", "t": "r2", "B": "r3", "b": "r3", "F": "k", "f": "k", "W": "r0", "w": "r1"},
    acc=[
        {"down": [(["K", "K"], 8, 11)], "z": "mid", "line": False},
        {"down": [(["A"], 12, 9)], "up": [(["A"], 3, 9)], "left": [(["Aa"], 8, 9)],
         "z": "front", "line": False},
    ],
)

# Old Fennimore: bald, white whiskers, glasses, a camel cardigan, a stoop
# and a walking stick.
CHARS["fennimore"] = dict(
    head="bald", body="stooped",
    pal={"H": "white", "h": "r1", "T": "o1", "t": "o2", "B": "r2", "b": "r3",
         "F": "o3", "f": "o3", "O": "o2", "o": "o3"},
    acc=[
        {"down": [(["WW", "Kk"], 7, 10)], "z": "mid", "line": False},
    ],
    held={
        "down": (["O", "O", "O"], "L", -1, 0, "hand"),
        "up": (["O", "O", "O"], "R", 1, 0, "hand"),
        "left": (["OO", "O.", "O."], "L", -1, 0, "front"),
    },
)

# Pip: a small kid with a tousled mop and a huge botany satchel with a
# sprig poking out.
CHARS["pip"] = dict(
    head="mop", body="kid",
    pal={"H": "d1", "h": "d2", "T": "g1", "t": "g2", "B": "o2", "b": "o3", "G": "sk0", "g": "sk1",
         "F": "b1", "f": "b2", "P": "s2", "p": "s3", "A": "o2", "a": "o3", "V": "g2"},
    acc=[
        {"down": [(["P", ".P"], 5, 10)], "up": [(["....P", "...P."], 6, 10)],
         "z": "mid", "line": False},
        {"down": [(["..V..", "AAAAa", "PPPPp", "ppppp"], 9, 10)],
         "up": [(["..V..", "AAAAa", "PPPPp", "ppppp"], 2, 10)],
         "left": [([".V..", "AAAa", "PPPp", "pppp"], 9, 10)], "z": "front"},
    ],
)

CHARS["greenhouse_keeper"] = dict(
    head="scarf", body="dress",
    pal={"C": "n1", "c": "n2", "A": "white", "H": "d2", "h": "d3", "T": "f0", "t": "f1",
         "B": "f0", "b": "f1", "G": "sk0", "g": "sk1", "F": "o3", "f": "o3"},
    acc=[
        {"down": [(["W....w", "WWWWww", "WWWWww", ".WWWw."], 5, 9)],
         "left": [(["WW", "WW", "Ww"], 4, 10)], "z": "mid", "line": False},
    ],
)

CHARS["shopkeeper"] = dict(
    head="short", body="casual",
    pal={"H": "r3", "h": "k", "T": "u0", "t": "u1", "A": "g2", "a": "f2",
         "B": "r3", "b": "r3", "F": "k", "f": "k"},
    acc=[
        {"down": [(["HHHH"], 6, 7)], "left": [(["HH"], 3, 7)], "z": "head", "line": False},
        {"down": [(["A....a", "AAAAaa", "AAAAaa", ".AAaa."], 5, 9)],
         "left": [(["AA", "Aa", "Aa", "a."], 4, 10)], "z": "mid", "line": False},
    ],
)

CHARS["villager_a"] = dict(
    head="long", body="dress",
    pal={"H": "d2", "h": "d3", "T": "n0", "t": "n1", "B": "n1", "b": "n2",
         "G": "sk0", "g": "sk1", "F": "o2", "f": "o3"},
    acc=[],
)

CHARS["villager_b"] = dict(
    head="short", body="casual",
    pal={"H": "d1", "h": "d2", "T": "u1", "t": "u2", "A": "white", "a": "r1",
         "B": "o2", "b": "o3", "F": "o3", "f": "o3"},
    acc=[{"down": [(["AAAAaa"], 5, 10)], "up": [(["AAAAaa"], 5, 10)], "left": [(["AAAa"], 5, 10)],
          "z": "mid", "line": False}],
)

CHARS["elder"] = dict(
    head="bun", body="dress",
    pal={"H": "r1", "h": "r2", "A": "x1", "T": "x1", "t": "x2", "B": "x2", "b": "x3",
         "G": "x3", "g": "x3", "F": "k", "f": "k", "O": "o2", "o": "o3"},
    acc=[],
    held={
        "down": (["O", "O", "O"], "R", 1, 0, "hand"),
        "up": (["O", "O", "O"], "L", -1, 0, "hand"),
        "left": (["OO", "O.", "O."], "L", -1, 0, "front"),
    },
)

CHARS["kid"] = dict(
    head="kidspiky", body="kid",
    pal={"H": "d2", "h": "d3", "T": "b1", "t": "b2", "B": "u2", "b": "u3",
         "G": "sk0", "g": "sk1", "F": "white", "f": "r1"},
    acc=[],
)

CHARS["schoolkid"] = dict(
    head="kidneat", body="kid",
    pal={"H": "r3", "h": "k", "T": "u2", "t": "u3", "A": "b1", "a": "b2",
         "B": "u3", "b": "u3", "G": "white", "g": "r1", "F": "k", "f": "k",
         "P": "b2", "p": "b3"},
    acc=[
        {"down": [(["Aa"], 7, 10), (["P....P"], 5, 10)], "z": "mid", "line": False},
        {"up": [(["PPPPpp", "PPPPpp", "pppppp"], 5, 10)], "z": "front"},
        {"left": [(["PPp", "ppp", "ppp"], 10, 10)], "z": "back"},
    ],
)

CHARS["gardener"] = dict(
    head="brim", body="casual",
    pal={"C": "y0", "c": "s1", "A": "g2", "a": "f2", "D": "s1", "d": "s2", "H": "d3", "h": "d3",
         "T": "white", "t": "r1", "B": "u1", "b": "u2", "F": "o3", "f": "o3",
         "V": "f1", "v": "f2"},
    acc=[{"down": [(["A....a", "AAAAaa", "AAAAaa"], 5, 9)], "left": [(["AA", "Aa", "Aa"], 4, 10)],
          "z": "mid", "line": False}],
    held={
        "down": (["VVv.", "VVvv"], "R", -1, 1, "front"),
        "up": ([".VVv", "vVVv"], "L", -2, 1, "front"),
        "left": (["vVVv"], "L", -3, 1, "front"),
    },
)

CHARS["birdwatcher"] = dict(
    head="brim", body="casual",
    pal={"C": "s2", "c": "s3", "A": "s3", "a": "s3", "D": "s2", "d": "s3", "H": "d3", "h": "d3",
         "T": "s2", "t": "s3", "B": "f1", "b": "f2", "F": "o3", "f": "o3",
         "V": "r3", "v": "k", "Q": "f1"},
    acc=[
        {"down": [(["Q....Q", ".QQQQ."], 5, 9)], "z": "mid", "line": False},
        {"down": [(["VWVW"], 6, 11)], "left": [(["VW"], 4, 11)], "z": "front"},
    ],
)

CHARS["hiker"] = dict(
    head="brim", body="casual",
    pal={"C": "o2", "c": "o3", "A": "b2", "a": "b2", "D": "o2", "d": "o3", "H": "d3", "h": "d3",
         "T": "b1", "t": "b2", "B": "u2", "b": "u3", "F": "o3", "f": "o3",
         "P": "f1", "p": "f2", "Q": "m1", "q": "m2"},
    acc=[
        {"down": [(["QQ......qq", "PP......pp", "PP......pp"], 3, 6)],
         "left": [(["QQq", "PPp", "PPp", "PPp", "ppp", "ppp"], 10, 6)], "z": "back"},
        {"up": [(["QQQQQQqq", "PPPPPPpp", "PPPPPPpp", "PPPPPPpp", "pppppppp"], 4, 7)], "z": "front"},
        {"down": [(["P....p", "P....p"], 5, 9)], "z": "mid", "line": False},
        {"down": [(["HHHHHHHh"], 4, 7)], "left": [(["HHHHHh"], 3, 7)], "z": "head", "line": False},
    ],
)

CHARS["beekeeper"] = dict(
    head="veil", body="casual",
    pal={"C": "white", "c": "r1", "D": "white", "d": "r1", "M": "r2", "W": "white", "w": "r1",
         "T": "white", "t": "r1", "B": "white", "b": "r1", "G": "white", "g": "r1",
         "F": "o2", "f": "o3", "L": "s1", "R": "s1", "V": "m1", "v": "m2", "Q": "r1"},
    acc=[],
    held={
        "down": ([".Q", "VV", "Vv"], "R", 0, 1, "front"),
        "up": (["Q.", "VV", "Vv"], "L", -1, 1, "front"),
        "left": (["Q.", "VV", "Vv"], "L", -1, 1, "front"),
    },
)

CHARS["florist"] = dict(
    head="bob", body="dress",
    pal={"H": "y1", "h": "y2", "T": "n1", "t": "n2", "B": "n1", "b": "n2", "A": "white",
         "Q": "g2", "q": "f2", "G": "sk0", "g": "sk1", "F": "o3", "f": "o3",
         "N": "b1", "Y": "y0", "X": "x1"},
    acc=[
        {"down": [(["A", "A"], 11, 1)], "up": [(["A"], 4, 2)], "left": [(["A"], 9, 1)],
         "z": "head", "line": True},
        {"down": [(["Q....q", "QQQQqq", "QQQQqq"], 5, 10)], "left": [(["QQ", "Qq"], 4, 11)],
         "z": "mid", "line": False},
    ],
    held={
        "down": (["NYX", ".Q."], "R", -1, -2, "front"),
        "left": (["NYX", ".Q."], "L", -2, -1, "front"),
    },
)


# =============================================================================
# Builder
# =============================================================================
def body_layers(body: dict, facing: str, pose: str):
    fac = body[facing]
    if pose in fac:
        return fac[pose]
    if pose == "b":
        out = []
        for kind, rows, x, y, *opt in fac["a"]:
            rows = relit_rows(rows)
            rows = [r.translate(str.maketrans("LR", "RL")) for r in rows]
            if opt:
                opt = [opt[0].translate(str.maketrans("EW", "WE"))]
            out.append((kind, rows, x, y, *opt))
        return out
    raise KeyError((facing, pose))


def hand_pos(layers, code):
    for kind, rows, x, y, *_ in layers:
        if kind not in ("arm", "farm"):
            continue
        for j, r in enumerate(rows):
            i = r.find(code)
            if i >= 0:
                return x + i, y + j
    return None


def compose(spec: dict, facing: str, pose: str) -> Frame:
    src = "left" if facing == "right" else facing
    body = BODIES[spec["body"]]
    layers = body_layers(body, src, pose)
    bob = 0 if pose == "stand" else 1
    head_dy = spec.get("head_dy", body.get("head_dy", 0))
    head_dx = spec.get("head_dx", body.get("head_dx", {})).get(src, 0)
    f = Frame()

    def accs(z):
        for a in spec.get("acc", []):
            parts = a.get(src, [])
            if a.get("z", "mid") != z:
                continue
            dx = head_dx if z == "head" else 0
            dy = head_dy if z == "head" else 0
            for rows, x, y in parts:
                f.layer(rows, x + dx, y + bob + dy, line=a.get("line", True), sides=a.get("sides", "NESW"))

    def held(z):
        h = spec.get("held")
        if not h or src not in h:
            return
        rows, hand, dx, dy, hz = h[src]
        if hz != z:
            return
        hp = hand_pos(layers, hand)
        if hp is None:
            return
        f.layer(rows, hp[0] + dx, hp[1] + dy, line=True)

    accs("back")
    held("back")
    for kind, rows, x, y, *opt in layers:
        if kind == "farm":
            f.layer(rows, x, y, sides=opt[0] if opt else "NESW")
    for kind, rows, x, y, *opt in layers:
        if kind == "body":
            f.layer(rows, x, y)
    accs("mid")
    held("mid")
    for kind, rows, x, y, *opt in layers:
        if kind == "arm":
            f.layer(rows, x, y, sides=opt[0] if opt else "NESW")
    held("hand")
    head = HEADS[spec["head"]][src]
    f.layer(head, head_dx, head_dy + bob)
    accs("head")
    accs("front")
    held("front")
    if facing == "right":
        f = f.mirrored()
    return f


def sheet(spec: dict) -> Image.Image:
    pal = {**DEFAULT_PAL, **spec["pal"]}
    pal.setdefault("G", pal.get("B", "k"))
    pal.setdefault("g", pal.get("b", pal["G"]))
    out = Image.new("RGBA", (48, 64), gbc.CLEAR)
    for row, d in enumerate(FACINGS):
        for col, pose in enumerate(POSES):
            out.alpha_composite(render(compose(spec, d, pose), pal), (col * 16, row * 16))
    return out


# =============================================================================
# Ambient animals. Single-layer fills, auto-outlined. ANIMALS[key][facing][pose]
# = list of (rows, x, y) layers; missing down/up "b" = mirrored "a".
# =============================================================================
def animal_sheet(spec: dict, pal: dict) -> Image.Image:
    out = Image.new("RGBA", (48, 64), gbc.CLEAR)
    for row, d in enumerate(FACINGS):
        src = "left" if d == "right" else d
        for col, pose in enumerate(POSES):
            f = Frame()
            fac = spec[src]
            if pose in fac:
                layers = fac[pose]
            else:
                layers = [(relit_rows(r), 16 - x - max(len(q) for q in r), y) for r, x, y in fac["a"]]
            for rows, x, y in layers:
                f.layer(rows, x, y)
            if d == "right":
                f = f.mirrored()
            out.alpha_composite(render(f, pal), (col * 16, row * 16))
    return out


CAT_PAL = {"C": "#f0a050", "c": "#c06828", "D": "#984018", "d": "#984018", "W": "white", "w": "r1",
           "N": "n1", "E": "k", "G": "g1"}
CAT = {
    "down": {
        "stand": [
            (["..C", "..C", ".cC", "cc."], 11, 9),
            ([
                "C......c",
                "CC....cc",
                "CCDDDDcc",
                "CECCCCEc",
                "CCWNNWcc",
                ".CWWWWc.",
                "CCWWWWcc",
                "CCWWWWcc",
                "WW....ww",
            ], 4, 6),
        ],
        "a": [
            ([".C", ".C", "cC", "c."], 12, 9),
            ([
                "C......c",
                "CC....cc",
                "CCDDDDcc",
                "CECCCCEc",
                "CCWNNWcc",
                ".CWWWWc.",
                "CCWWWWcc",
                "CCWWWWww",
                "WW......",
            ], 4, 6),
        ],
    },
    "up": {
        "stand": [
            ([
                "C......c",
                "CC....cc",
                "CCCCCCcc",
                "CDCDDcDc",
                "CCCCCCcc",
                ".CCCCcc.",
                "CCDCCDcc",
                "CCCCCCcc",
                "cc....cc",
            ], 4, 6),
            (["C.", "C.", "Cc", ".c"], 8, 10),
        ],
        "a": [
            ([
                "C......c",
                "CC....cc",
                "CCCCCCcc",
                "CDCDDcDc",
                "CCCCCCcc",
                ".CCCCcc.",
                "CCDCCDcc",
                "CCCCCCcc",
                "cc......",
            ], 4, 6),
            (["C.", "C.", "Cc", ".c"], 9, 10),
        ],
    },
    "left": {
        "stand": [
            (["...cc", "..cC.", "..C..", ".cC..", "cC..."], 10, 6),
            ([
                "..C.C.........",
                ".CCCCc........",
                "CECCCc........",
                "NWCCCcCCCCCC..",
                ".WWCDCDCDCDcc.",
                "..WCCCCCCCCcc.",
                "..W.W.....C.c.",
                "..W.W.....W.w.",
            ], 1, 7),
        ],
        "a": [
            (["....c", "...cC", "..cC.", ".cC..", "cC..."], 10, 6),
            ([
                "..C.C.........",
                ".CCCCc........",
                "CECCCc........",
                "NWCCCcCCCCCC..",
                ".WWCDCDCDCDcc.",
                "..WCCCCCCCCcc.",
                ".W...W...C...c",
                ".W...W...W...w",
            ], 1, 7),
        ],
        "b": [
            (["...cc", "..cC.", "..C..", ".cC..", "cC..."], 10, 6),
            ([
                "..C.C.........",
                ".CCCCc........",
                "CECCCc........",
                "NWCCCcCCCCCC..",
                ".WWCDCDCDCDcc.",
                "..WCCCCCCCCcc.",
                "...WW.....Cc..",
                "...WW.....Ww..",
            ], 1, 7),
        ],
    },
}

DOG_PAL = {"C": "o1", "c": "o2", "D": "#704020", "d": "#502810", "W": "s0", "w": "s2",
           "N": "k", "E": "k", "A": "b1", "a": "b2", "T": "n1"}
DOG = {
    "down": {
        "stand": [
            (["C", "C", "c"], 12, 8),
            ([
                ".CCCCCCc.",
                "DCCCCCCcd",
                "DCECCCEcd",
                "DCCWNWCcd",
                ".cWWTWWc.",
                ".AAAAAAa.",
                ".CWWWWWc.",
                ".CWWWWWc.",
                ".WW...WW.",
            ], 3, 6),
        ],
        "a": [
            (["C", "C", "c"], 13, 8),
            ([
                ".CCCCCCc.",
                "DCCCCCCcd",
                "DCECCCEcd",
                "DCCWNWCcd",
                ".cWWTWWc.",
                ".AAAAAAa.",
                ".CWWWWWc.",
                ".CWWWWWww",
                ".WW......",
            ], 3, 6),
        ],
    },
    "up": {
        "stand": [
            ([
                ".CCCCCCc.",
                "DCCCCCCcd",
                "DCCCCCCcd",
                "DCCCCCCcd",
                ".CCCCCCc.",
                ".AAAAAAa.",
                ".CCCCCCc.",
                ".CCCCCCc.",
                ".cc...cc.",
            ], 3, 6),
            (["C", "C", "c"], 7, 11),
        ],
        "a": [
            ([
                ".CCCCCCc.",
                "DCCCCCCcd",
                "DCCCCCCcd",
                "DCCCCCCcd",
                ".CCCCCCc.",
                ".AAAAAAa.",
                ".CCCCCCc.",
                ".CCCCCCc.",
                ".cc......",
            ], 3, 6),
            (["C", "C", "c"], 8, 11),
        ],
    },
    "left": {
        "stand": [
            (["..C", ".C.", "C.."], 12, 7),
            ([
                "..CCCc........",
                ".CECCCD.......",
                "NCCCCCDd......",
                ".WWCCcDCCCCCc.",
                "..TAAACCCCCCcc",
                "...CWWWWWWCCc.",
                "...C.W....C.c.",
                "...W.W....W.w.",
            ], 0, 7),
        ],
        "a": [
            (["...C", "..C.", "CC.."], 11, 7),
            ([
                "..CCCc........",
                ".CECCCD.......",
                "NCCCCCDd......",
                ".WWCCcDCCCCCc.",
                "..TAAACCCCCCcc",
                "...CWWWWWWCCc.",
                "..C...W..C...c",
                "..W...W..W...w",
            ], 0, 7),
        ],
        "b": [
            (["C...", ".C..", "..CC"], 12, 7),
            ([
                "..CCCc........",
                ".CECCCD.......",
                "NCCCCCDd......",
                ".WWCCcDCCCCCc.",
                "..TAAACCCCCCcc",
                "...CWWWWWWCCc.",
                "....CW....Cc..",
                "....WW....Ww..",
            ], 0, 7),
        ],
    },
}

BIRD_PAL = {"B": "#a87048", "b": "#704028", "R": "m1", "r": "m2", "W": "s0", "w": "s2",
            "Y": "y2", "E": "k", "K": "k"}
_BIRD_SIDE = [
    "..BBb....",
    ".BEBBb...",
    "YRRBBBb..",
    ".RRRBBBb.",
    ".RWWBbbbb",
    "..WWbb..b",
]
_BIRD_FRONT = [
    ".BBBb.",
    "BBBBBb",
    "BEBBEb",
    "BRYYRb",
    "RRRRRr",
    "RWWWWr",
    ".WWWw.",
]
_BIRD_BACK = [".BBBb.", "BBBBBb", "BBBBBb", "BbBBbb", "BBbbBb", "bBBBBb", ".bbbb.", "..bb.."]
# Column 0 perched; columns 1-2 airborne: wings UP, then wings DOWN (the
# engine plays them as the flap when the bird flies off; a wandering bird
# reads them as a flutter-hop).
BIRD = {
    "down": {
        "stand": [(_BIRD_FRONT, 5, 7), (["K..K"], 6, 14)],
        "a": [(["B...", "BB..", ".BB.", "..B."], 1, 3), (["...b", "..bb", ".bb.", ".b.."], 11, 3),
              (_BIRD_FRONT, 5, 4)],
        "b": [(_BIRD_FRONT, 5, 5), (["..B.", ".BB.", "BB..", "B..."], 2, 8), ([".b..", ".bb.", "..bb", "...b"], 10, 8)],
    },
    "up": {
        "stand": [(_BIRD_BACK, 5, 6), (["K..K"], 6, 14)],
        "a": [(["B...", "BB..", ".BB.", "..B."], 1, 2), (["...b", "..bb", ".bb.", ".b.."], 11, 2),
              (_BIRD_BACK, 5, 3)],
        "b": [(_BIRD_BACK, 5, 4), (["..B.", ".BB.", "BB..", "B..."], 2, 7), ([".b..", ".bb.", "..bb", "...b"], 10, 7)],
    },
    "left": {
        "stand": [(_BIRD_SIDE, 3, 8), (["K.K"], 5, 14)],
        "a": [(_BIRD_SIDE, 3, 6), (["....b", "...Bb", "..BBb", ".BBb."], 6, 2)],
        "b": [(_BIRD_SIDE, 3, 5), (["BBBb.", ".BBbb", "..Bbb", "...b."], 5, 9)],
    },
}


# =============================================================================
# Puzzle objects (no faces, environment-style shading).
# =============================================================================
def hedge_ramp() -> list:
    """The hedge tile's 4 colours, lightest first, so the gate always matches."""
    try:
        im = Image.open(gbc.ASSETS / "tiles" / "hedge.png").convert("RGBA")
        cols = {tuple(p[:3]) for p in np.asarray(im).reshape(-1, 4).tolist() if p[3] > 0}
        cols = sorted(cols, key=lambda c: -(c[0] * 3 + c[1] * 6 + c[2]))
        if len(cols) >= 4:
            pick = [cols[0], cols[len(cols) // 3], cols[2 * len(cols) // 3], cols[-1]]
            return [tuple(c) + (255,) for c in pick]
    except FileNotFoundError:
        pass
    return [C["f0"], C["f1"], C["f2"], C["f3"]]


def static_sheet(frames_by_row: list) -> Image.Image:
    """frames_by_row: 4 lists of 3 images (down, up, left, right)."""
    out = Image.new("RGBA", (48, 64), gbc.CLEAR)
    for row, frames in enumerate(frames_by_row):
        for col, im in enumerate(frames):
            out.alpha_composite(im, (col * 16, row * 16))
    return out


def hedge_gate() -> Image.Image:
    """A closed five-bar field gate set into the hedge under a leafy arch.
    Environment-style: no black outline, dark hue-shifted edges. Drawn 4px
    above its tile like every NPC, so the arch rises over the hedge line."""
    h0, h1, h2, h3 = hedge_ramp()
    o0, o1, o2, o3 = C["o0"], C["o1"], C["o2"], C["o3"]
    im = Image.new("RGBA", (16, 16), gbc.CLEAR)
    px = im.load()
    arch = [
        "....,g..,g......",
        "..,ggg.,ggg,g...",
        ".,gg:gg,g:ggg:,.",
        ",gg:#:ggg:#:gg:g",
        "g:##:##:###:##:#",
        "##############:#",
    ]
    key = {",": h0, "g": h1, ":": h2, "#": h3}
    for y, r in enumerate(arch):
        for x, ch in enumerate(r):
            if ch in key:
                px[x, y] = key[ch]
    # rails: lit top edge, shaded underside
    for y0 in (6, 9, 12):
        for x in range(2, 14):
            px[x, y0] = o0 if y0 == 6 else o1
            px[x, y0 + 1] = o2
    # diagonal brace, bottom-left to top-right
    for x in range(3, 13):
        y = round(13 - (x - 3) * 6 / 9)
        px[x, y] = o1
        if y + 1 < 16:
            px[x, y + 1] = o3 if px[x, y + 1][3] == 0 else o2
    # stiles + posts (posts lit on the left face, dark on the right)
    for y in range(5, 16):
        px[0, y], px[1, y] = o1, o3
        px[14, y], px[15, y] = o1, o3
        if y >= 6:
            px[2, y] = o2
            px[13, y] = o2
    px[0, 5], px[1, 5], px[14, 5], px[15, 5] = o0, o1, o0, o1
    # iron latch
    px[12, 9], px[12, 10] = C["r1"], C["r3"]
    # ground shadow under the bottom rail
    for x in range(2, 14):
        px[x, 15] = h3
    return static_sheet([[im] * 3] * 4)


def img_rows(rows, key):
    im = Image.new("RGBA", (16, 16), gbc.CLEAR)
    px = im.load()
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            v = key[ch]
            if v is not None:
                px[x, y] = v
    return im


LEVER_PAL = {"Z": "r1", "z": "r2", "Y": "r3", "O": "o1", "o": "o2", "R": "b1", "r": "b2",
             "G": "#306830", "g": "g0", "W": "white"}


def lever_frame(on: bool) -> Image.Image:
    f = Frame()
    if on:
        f.layer(["Oo", ".Oo", "..Oo", "...Oo"], 8, 5)
        f.layer(["RW", "Rr"], 12, 3)
    else:
        f.layer(["oO", "oO.", "oO..", "oO..."], 3, 5)
        f.layer(["WR", "rr"], 2, 3)
    f.layer(["ZZZz"], 6, 9)
    f.layer([
        "ZZZZZZzz",
        "ZzzzzzzY",
        "zYYYYYYY",
    ], 4, 10)
    f.paint([(10, 11)], "g" if on else "G")
    f.paint([(5, 11)], "G" if on else "R")
    return render(f, {**DEFAULT_PAL, **LEVER_PAL})


def lever() -> Image.Image:
    off, on = lever_frame(False), lever_frame(True)
    return static_sheet([[off] * 3, [on] * 3, [off] * 3, [on] * 3])


VALVE_PAL = {"Z": "r1", "z": "r2", "Y": "r3", "R": "b1", "r": "b2", "Q": "b3", "W": "white",
             "Q": "#401818", "V": "#687838", "v": "#384820", "A": "w1", "a": "w2", "M": "y1", "m": "y2"}


def valve_frame(open_: bool, turn: int) -> Image.Image:
    """A sluice valve: a red hand-wheel on a brass stem over a boxed pipe in
    the bog. Shut: the DOWN row. Open: the UP row, with water gushing."""
    f = Frame()
    f.layer(["vVVVVVVVVVv", ".vvvvvvvvv."], 2, 14, line=False)  # boggy footing
    f.layer(["ZZZZZzz", "ZzzzzzY", "zYYYYYY"], 5, 11)          # valve box
    f.layer(["Mm", "Mm"], 7, 9)                                  # brass stem
    f.layer([
        "..RRRRr..",
        ".RQQQQQr.",
        "RQQQQQQQr",
        "RQQQQQQQr",
        "RQQQQQQQr",
        ".rQQQQQr.",
        "..rrrrr..",
    ], 4, 2)
    if turn % 2 == 0:
        spokes = [(8, 3), (8, 4), (8, 6), (8, 7), (5, 5), (6, 5), (7, 5), (9, 5), (10, 5), (11, 5)]
    else:
        spokes = [(6, 3), (7, 4), (10, 3), (9, 4), (6, 7), (7, 6), (10, 7), (9, 6)]
    f.paint(spokes, "R")
    f.paint([(8, 5)], "M")
    f.paint([(6, 2), (5, 3)], "W")
    if open_:
        f.layer(["A", "Aa", ".aA"], 12, 11, line=False)
        f.layer(["a", "aA"], 3, 12, line=False)
        f.paint([(5, 12)], "Y")
    return render(f, {**DEFAULT_PAL, **VALVE_PAL})


def valve() -> Image.Image:
    shut = valve_frame(False, 0)
    opened = [valve_frame(True, 1), valve_frame(True, 0), valve_frame(True, 1)]
    return static_sheet([[shut] * 3, opened, [shut] * 3, opened])


POT_PAL = {"P": "b1", "p": "b2", "Q": "b0", "q": "b3", "G": "g1", "g": "g2", "H": "g0", "D": "o3"}


def potted_frame(sway: int) -> Image.Image:
    """A terracotta pot with a three-leaf seedling (the starter pots)."""
    f = Frame()
    f.layer([".gG.", "gGGg", ".gg."], 2 + sway, 3)          # left leaf
    f.layer([".GH.", "GGGg", ".gg."], 9 + sway, 2)          # right leaf
    f.layer([".H.", "GGg", "Ggg", ".g."], 6 + sway, 1)       # top leaf
    f.layer(["g", "g", "g"], 7, 6, line=False)               # stem
    f.paint([(5 + sway, 5), (6 + sway, 6), (10 + sway, 5), (9 + sway, 6)], "g")
    f.layer(["QDDDDDDDDp", "QQQQQQQQPp"], 3, 8)              # rim + soil
    f.layer([
        "QPPPPPpp",
        "QPPPPPpp",
        ".PPPPpp.",
        ".PPPPpq.",
        "..ppqq..",
    ], 4, 10)
    return render(f, {**DEFAULT_PAL, **POT_PAL})


def potted_plant() -> Image.Image:
    a, b = potted_frame(0), potted_frame(1)
    return static_sheet([[a, a, b]] * 4)


PICKUP_PAL = {"O": "o1", "o": "o2", "D": "o3", "Q": "q1", "q": "q2", "J": "q3", "G": "g1", "g": "g2",
              "W": "white", "X": (0, 0, 0, 72)}


def pickup_frame(glint: int) -> Image.Image:
    """A glass acorn-shaped pod lying in the grass: a scaled wooden cap,
    clear glass body, a seedling curled inside. Never a red/white ball."""
    f = Frame()
    f.layer(["XXXXXXXX"], 4, 15, line=False)                 # soft shadow
    f.layer([
        "QQQQQQqq",
        "QQQGgQqq",
        ".QQqGqJ.",
        "..QqqJ..",
        "...qJ...",
    ], 4, 9)
    f.layer([
        "..OoOo..",
        ".OoOoOoD",
        "OoOoOoOD",
        "DDDDDDDD",
    ], 4, 4)
    f.layer(["o"], 7, 3)                                     # stalk
    shine = [[(5, 9), (5, 10)], [(6, 9), (5, 11)]][glint]
    f.paint(shine, "W")
    return render(f, {**DEFAULT_PAL, **PICKUP_PAL})


def item_pickup() -> Image.Image:
    a, b = pickup_frame(0), pickup_frame(1)
    return static_sheet([[a, a, b]] * 4)


OBJECTS = {
    "cat": lambda: animal_sheet(CAT, {**DEFAULT_PAL, **CAT_PAL}),
    "dog": lambda: animal_sheet(DOG, {**DEFAULT_PAL, **DOG_PAL}),
    "bird": lambda: animal_sheet(BIRD, {**DEFAULT_PAL, **BIRD_PAL}),
    "hedge_gate": hedge_gate,
    "lever": lever,
    "valve": valve,
    "potted_plant": potted_plant,
    "item_pickup": item_pickup,
}


# =============================================================================
# Review sheets
# =============================================================================
GRASS_BG = (160, 216, 104, 255)


def walk_strip(im: Image.Image) -> Image.Image:
    """Each facing as the in-game cycle: stand, A, stand, B."""
    out = Image.new("RGBA", (16 * 4, 64), gbc.CLEAR)
    for row in range(4):
        for i, col in enumerate((0, 1, 0, 2)):
            out.alpha_composite(im.crop((col * 16, row * 16, col * 16 + 16, row * 16 + 16)), (i * 16, row * 16))
    return out


def review(sheets: dict[str, Image.Image], name="characters", scale=4, cols=6):
    cells = [(k, gbc.on_bg(walk_strip(im), GRASS_BG)) for k, im in sheets.items()]
    gbc.grid_sheet(cells, cols, scale).save(gbc.REVIEW / f"{name}.png")
    cells1 = [(k, gbc.on_bg(im, GRASS_BG)) for k, im in sheets.items()]
    gbc.grid_sheet(cells1, 12, 1, label=False).save(gbc.REVIEW / f"{name}_1x.png")


def build() -> dict[str, Image.Image]:
    sheets = {k: sheet(v) for k, v in CHARS.items()}
    sheets.update({k: fn() for k, fn in OBJECTS.items()})
    for k, im in sheets.items():
        gbc.save(im, f"characters/{k}.png")
    review(sheets)
    return sheets


if __name__ == "__main__":
    build()
