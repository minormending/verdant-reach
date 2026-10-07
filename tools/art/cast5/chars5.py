"""Chapter 5 overworld characters -> public/art/characters/<key>/.

Built on the Round-3 compositor in tools/art/characters.py (layers with
auto-outlines, lit/shade region letters, the 1px walk bob, the right row
mirrored and re-lit). New here: a floor-length coat for MORROW, and heads
for the Cedarhallow cast: silver hair tied back, a ranger's peaked campaign
hat, a knit beanie over a full beard, a knotted kerchief and a knit cap.

  morrow          tall and quiet: a long charcoal coat to the boots, a high
                  turned-up collar, silver hair tied back in a short tail, a
                  sprig of white ghost pipe pinned at the collar
  shrine_keeper   an old woman, stooped: white hair in a bun, a cedar-red
                  shawl with a fringed point, a tall cedar walking staff
  ranger          olive uniform, a tan flat-brimmed campaign hat with a
                  pinched crown, gold badge, shoulder patch
  lumberjack      a bold red-and-black check shirt, charcoal beanie, a big
                  brown beard, work trousers, an axe over the shoulder
  forager         a rust kerchief with white dots, cream blouse, green
                  apron, a wicker basket of mushrooms
  night_gardener  a junior in dark blue overalls over a pale shirt, a knit
                  cap, a small jar of glowing fungus held out
  cone_sack       a Rootstock burlap sack of sealed cones, tied at the neck
                  with twine, the stencilled mark, a cone spilled beside it
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common5 as common  # noqa: E402  (sets sys.path for the Round-3 modules)

from PIL import Image  # noqa: E402

import characters as ch  # noqa: E402
import gbc  # noqa: E402
from characters import BODIES, HEADS, DEFAULT_PAL, Frame  # noqa: E402

# =============================================================================
# Bodies
# =============================================================================
# A floor-length coat, open at the front, flaring a little at the hem; the
# step shows only the leading boot under the hem.
BODIES["longcoat"] = {
    "down": {
        "stand": [
            ("body", [
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "...TTTTTTTTtt...",
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
                "...TTTTTTTTtt...",
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
                "....TTTTTTtt....",
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
                "....TTTTTTtt....",
                "...TTTTTTTttt...",
                "...FFF.....ff...",
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
                "....TTTTTTtt....",
                "....TTTTTTttt...",
                "....fff..FF.....",
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
BODIES["longcoat"]["up"] = BODIES["longcoat"]["down"]


# =============================================================================
# Heads (8 rows; row 0 stays clear for the outline)
# =============================================================================
# MORROW: silver hair combed straight back and tied in a short tail.
HEADS["tied"] = {
    "down": [
        "................",
        ".....HHHHHh.....",
        "....HHHhHHHh....",
        "...HHHhHHhHhh...",
        "...HSSSSSSSSh...",
        "...SSESSSSESs...",
        "...SSESSSSESs...",
        "....SSSSSSSs....",
    ],
    "up": [
        "................",
        ".....HHHHHh.....",
        "....HHHhHHHh....",
        "...HHHhHHhHhh...",
        "...HHHhHHhHhh...",
        "...HHHHAAHHhh...",
        "...SHHHHhHHhs...",
        "....SSSHhSss....",
    ],
    "left": [
        "................",
        ".....HHHHHh.....",
        "....HHHHhHHh....",
        "...HHHHhHHhhh...",
        "...SSSSHHhhhAH..",
        "...SESSSHHhh.Hh.",
        "..SSSSSSSHh...h.",
        "...SSSSSSs......",
    ],
}

# Ranger: a campaign hat, the crown pinched to a peak, a dead-flat brim.
HEADS["campaign"] = {
    "down": [
        "................",
        "......CcCc......",
        ".....CCcCCc.....",
        ".....AAAAAa.....",
        ".DDDDDDDDDDDDdd.",
        "...HSESSSSESh...",
        "...SSESSSSESs...",
        "....SSSSSSSs....",
    ],
    "up": [
        "................",
        "......CcCc......",
        ".....CCcCCc.....",
        ".....AAAAAa.....",
        ".DDDDDDDDDDDDdd.",
        "...HHHHHHHHhh...",
        "...SHHHHHHHhs...",
        "....SSSSSSss....",
    ],
    "left": [
        "................",
        ".......CcCc.....",
        "......CCcCCc....",
        "......AAAAAa....",
        "DDDDDDDDDDDDDdd.",
        "...SESSSHHHh....",
        "..SSSSSSSHh.....",
        "...SSSSSSs......",
    ],
}

# Lumberjack: a ribbed beanie pulled low and a full beard (M) to the chest.
HEADS["beard_beanie"] = {
    "down": [
        "................",
        ".....CCCCCc.....",
        "....CCcCcCcc....",
        "...CcCcCcCccc...",
        "...DDDDDDDDdd...",
        "...SSESSSSESs...",
        "...MSESSSSESm...",
        "....MMMMMMMm....",
    ],
    "up": [
        "................",
        ".....CCCCCc.....",
        "....CCcCcCcc....",
        "...CcCcCcCccc...",
        "...DDDDDDDDdd...",
        "...HHHHHHHHhh...",
        "...MHHHHHHHhm...",
        "....SSSSSSss....",
    ],
    "left": [
        "................",
        ".....CCCCCc.....",
        "....CCcCcCcc....",
        "...CcCcCcCccc...",
        "...DDDDDDDDdd...",
        "...SESSSHHHh....",
        "..SSSSSSMHhh....",
        "...MMMMMMm......",
    ],
}

# Forager: a kerchief knotted at the nape, the tails sticking out behind.
HEADS["kerchief"] = {
    "down": [
        "................",
        ".....CCCCCc.....",
        "....CCACCACc....",
        "...CCACCACCcc...",
        "...HHSSSSSSHh...",
        "...SSESSSSESs...",
        "...SSESSSSESs...",
        "....SSSSSSSs....",
    ],
    "up": [
        "................",
        ".....CCCCCc.....",
        "....CACCACCc....",
        "...CCCACCACcc...",
        "...HHHCcCHHhh...",
        "...HHCCcCcHhh...",
        "...SHHHHHHHhs...",
        "....SSSSSSss....",
    ],
    "left": [
        "................",
        ".....CCCCCc.....",
        "....CACCACCc....",
        "...CCCACCACccC..",
        "...HSSSSHHCcCc..",
        "...SESSSHHHh.c..",
        "..SSSSSSSHhh....",
        "...SSSSSSs......",
    ],
}

# Night gardener: a snug knit cap with a turned-up band, fair hair below.
HEADS["knitcap"] = {
    "down": [
        "................",
        ".....CCCCCc.....",
        "....CCCCCCcc....",
        "...CCCCCCCCcc...",
        "...DDDDDDDDdd...",
        "...HSESSSSESh...",
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
        "....SSSSSSss....",
    ],
    "left": [
        "................",
        ".....CCCCCc.....",
        "....CCCCCCcc....",
        "...CCCCCCCCcc...",
        "...DDDDDDDDdd...",
        "...SESSSHHHh....",
        "..SSSSSSSHhh....",
        "...SSSSSSs......",
    ],
}


# =============================================================================
# The cast
# =============================================================================
C5: dict = {}

CHARCOAL, CHARCOAL_S = "#505060", "#303040"
SILVER, SILVER_S = "#d0d0d8", "#9090a0"

C5["morrow"] = dict(
    head="tied", body="longcoat",
    pal={"H": SILVER, "h": SILVER_S, "A": "#303040", "S": "sk0", "s": "sk1", "L": "sk0", "R": "sk0",
         "T": CHARCOAL, "t": CHARCOAL_S, "C": CHARCOAL, "c": CHARCOAL_S,
         "F": "k", "f": "k", "G": "k", "g": "k", "W": "white", "w": "#b8b0c8", "V": "#7868a0"},
    acc=[
        # the high collar turned up round the jaw
        {"down": [(["C", "C", "C"], 3, 6), (["c", "c", "c"], 12, 6)],
         "left": [(["Cc", "Cc"], 9, 6)],
         "up": [(["CCCCCCcc"], 4, 7)], "z": "head", "line": True, "sides": "NEW"},
        # the coat hangs open: a dark seam down the front, a back vent behind
        {"down": [(["K", "K", "K"], 8, 11)], "up": [(["K", "K"], 8, 12)], "z": "mid", "line": False},
        # a sprig of ghost pipe pinned at the collar: a white nodding head
        {"down": [(["W", "w"], 4, 9)], "left": [(["W", "w"], 7, 9)], "z": "front", "line": False},
    ],
)

CEDAR, CEDAR_S = "#b04828", "#702818"

C5["shrine_keeper"] = dict(
    head="bun", body="stooped",
    pal={"H": "white", "h": "r1", "A": CEDAR, "a": CEDAR_S, "T": "#706058", "t": "#483838",
         "B": "#585048", "b": "#383028", "G": "#383028", "g": "#383028", "F": "k", "f": "k",
         "O": "o2", "o": "o3", "D": "o1", "Q": "#c86040", "q": "#903820"},
    acc=[
        # the cedar-red shawl round the shoulders, a fringed point behind
        {"down": [(["QQQQQQQQqq", ".AAAAAAaa.", "....Aa...."], 3, 10)],
         "up": [(["AAAAAAAAaa", "AAAAAAAAaa", ".AAAAAAaa.", "...Aaa...."], 3, 10)],
         "left": [(["QQQQqq", ".AAAa.", "..a..."], 5, 10)], "z": "front", "line": True, "sides": "ESW"},
        {"up": [(["q.q.q"], 5, 14)], "z": "front", "line": False},
    ],
    held={
        "down": (["D", "O", "O", "O", "O", "O", "o"], "R", 1, -4, "front"),
        "up": (["D", "O", "O", "O", "O", "O", "o"], "L", -1, -4, "front"),
        "left": (["D", "O", "O", "O", "O", "o"], "L", -1, -3, "front"),
    },
)

OLIVE, OLIVE_S = "#788848", "#4a5828"

C5["ranger"] = dict(
    head="campaign", body="casual",
    pal={"C": "#c8a060", "c": "#906838", "A": "#583818", "D": "#b08850", "d": "#785028",
         "H": "d2", "h": "d3", "T": OLIVE, "t": OLIVE_S, "B": "#586038", "b": "#383e20",
         "G": "#586038", "g": "#383e20", "F": "o3", "f": "o3", "Y": "y1", "P": "#c8a060"},
    acc=[
        # gold badge on the chest, a tan patch on the far shoulder
        {"down": [(["Y"], 5, 10)], "left": [(["Y"], 6, 10)], "z": "mid", "line": False},
        {"down": [(["P"], 12, 9)], "up": [(["P"], 3, 9)], "z": "front", "line": False},
        # belt
        {"down": [(["dddddddd"], 4, 11)], "up": [(["dddddddd"], 4, 11)], "left": [(["dddddd"], 5, 11)],
         "z": "mid", "line": False},
    ],
)

C5["lumberjack"] = dict(
    head="beard_beanie", body="casual",
    pal={"C": "#484850", "c": "#282830", "D": "#383840", "d": "#202028", "M": "#704020", "m": "#482810",
         "H": "#704020", "h": "#482810",
         "T": "#d03828", "t": "#902018", "X": "#301818", "B": "#605848", "b": "#403830",
         "G": "#605848", "g": "#403830", "F": "o3", "f": "o3", "O": "o1", "o": "o2", "Z": "r0", "z": "r2"},
    acc=[
        # the beard spills onto the chest
        {"down": [(["MMMMm", ".MMm."], 5, 8)], "left": [(["MMm", ".m."], 3, 8)], "z": "head", "line": True,
         "sides": "ESW"},
        # bold check: black bars across the red
        {"down": [(["..XX..", "XX..XX"], 5, 10)], "up": [(["XX..XX..", "..XX..XX", "XX..XX.."], 4, 9)],
         "left": [(["XX..", "..XX"], 5, 10)], "z": "mid", "line": False},
    ],
    held={
        # an axe: carried head-down at his side facing us, over the shoulder in profile
        "down": (["O.", "O.", "ZZ", "Zz"], "R", 0, -1, "front"),
        "up": (["O.", "O.", "ZZ", "zZ"], "L", 0, -1, "front"),
        "left": (["..ZZ", "..zZ", "..O.", "..O.", "...O", "...O"], "L", -1, -5, "back"),
    },
)

C5["forager"] = dict(
    head="kerchief", body="dress",
    pal={"C": "#c85838", "c": "#883020", "A": "#f0e0c8", "H": "d2", "h": "d3",
         "T": "s1", "t": "s2", "B": "d2", "b": "d3", "G": "sk0", "g": "sk1", "F": "o3", "f": "o3",
         "Q": "g2", "q": "f2", "O": "o1", "o": "o2", "N": "#d06830", "n": "#984018", "W": "s0"},
    acc=[
        {"down": [(["Q....q", "QQQQqq", "QQQQqq", ".QQQq."], 5, 9)],
         "left": [(["QQ", "Qq", "Qq"], 4, 10)], "z": "mid", "line": False},
    ],
    held={
        "down": (["NWn.", "OoOo", ".oo."], "R", -2, -1, "front"),
        "left": ([".NnW", "OoOo", ".oo."], "L", -2, -1, "front"),
        "up": (["NnW", "OoO"], "L", -1, 0, "back"),
    },
)

NAVY, NAVY_S = "#303868", "#1c2048"

C5["night_gardener"] = dict(
    head="knitcap", body="casual",
    pal={"C": "#5868a8", "c": "#384078", "D": "#7888c0", "d": "#5868a8", "H": "#e0c060", "h": "#a88830",
         "T": "#b8c8e0", "t": "#8090b8", "B": NAVY, "b": NAVY_S, "G": NAVY, "g": NAVY_S,
         "F": "o3", "f": "o3", "Y": "#c8f0b0", "y": "#78c890", "V": "r2", "W": "white"},
    acc=[
        # overall bib and straps
        {"down": [(["B....b", "BBBBbb"], 5, 9)], "up": [(["B....b", ".BBbb."], 5, 9)],
         "left": [(["BBb"], 5, 10)], "z": "mid", "line": False},
    ],
    held={
        # a small jar of glowing fungus, the lid on top
        "down": (["VV", "WY", "Yy"], "R", -1, -2, "front"),
        "left": (["VV", "WY", "Yy"], "L", -1, -2, "front"),
        "up": (["VV", "Yy"], "L", -1, -1, "back"),
    },
)


# =============================================================================
# cone_sack: a static object (every row the same)
# =============================================================================
SACK_PAL = {**DEFAULT_PAL, "P": "#d0b070", "p": "#987840", "Q": "#b89858", "Y": "#e8d8a8", "y": "#a89060",
            "C": "#a06838", "c": "#603818", "O": "#d8a060", "A": "y1"}


def cone_sack() -> Image.Image:
    f = Frame()
    # a sealed cone spilled on the ground beside the sack
    f.layer(["OcO", "cCc", ".c."], 12, 12)
    # the sack: cone tips poking out of the gathered neck, the twine tie,
    # a fat body slumping a little to the right, the yellow Rootstock sigil
    f.layer([
        "...OcOc...",
        "...cCcC...",
        "....PPp...",
        "...YyYYy..",
        "....PPp...",
        "...PPPPp..",
        "..PPPPPPp.",
        ".PPPPPPPPp",
        "PPPPPAPPPp",
        "PQPPAAAPpp",
        "PPPPPAPPpp",
        "PPQPPPPPpp",
        ".ppppppppp",
    ], 2, 2)
    im = ch.render(f, SACK_PAL)
    return ch.static_sheet([[im] * 3] * 4)


OBJECTS5 = {"cone_sack": cone_sack}


# =============================================================================
# Build
# =============================================================================
def sheets() -> dict[str, Image.Image]:
    out = {k: ch.sheet(v) for k, v in C5.items()}
    out.update({k: fn() for k, fn in OBJECTS5.items()})
    return out


def build(write=True):
    out = sheets()
    if write:
        for k, im in out.items():
            common.write_character(k, im, "chars5.py")
    ch.review(out, name="characters_ch5", cols=4)
    return out


if __name__ == "__main__":
    build(write="--scratch" not in sys.argv)
