"""16px Chapter 7 walk sheets and two objects, on the Round-3 character kit.

  signe           tall and composed: a long ice-blue felted coat with a white
                  fur hem and cuffs, a navy knitted scarf flecked with
                  snowflakes, a single long silver-blond braid and a white
                  snowdrop pinned at the collar
  skier           a bright red ski jacket, a white bobble hat with the
                  goggles pushed up onto it, yellow skis over one shoulder
  lodge_keeper    a nervous older man: a maroon wool cardigan, grey hair
                  thinning on top, half-moon glasses, a ring of brass keys at
                  the belt and a striped tea towel over one shoulder
  signal_emitter  a squat Rootstock cabinet: slatted vents, a stubby antenna
                  and a bulb. DOWN/LEFT rows broadcast (green bulb, signal
                  arcs); UP/RIGHT rows are switched off (dark bulb, no arcs).
                  The B1 emitters render the UP row once `emitter_<n>_off`
                  is set (their `stateFlag`), so UP has to be the off state.
  crimson_lily    the CRIMSON LILY on its islet: an upturned-rim Victoria pad
                  and a bloom in deep crimson, faint red ripples. Column 0 is
                  the resting bloom, columns 1-2 the pulse; every row is the
                  same so turning to face the player changes nothing.

Each costume shares its ramps and identifying prop with its portrait. Right
rows are mirrored and re-lit by characters.sheet.
"""
from __future__ import annotations

import common7 as common
import characters as ch
from characters import BODIES, DEFAULT_PAL, Frame, HEADS

# --- ramps shared with portraits7 -------------------------------------------
ICE, ICE_S, ICE_H = "#70a8d8", "#4068a8", "#b0d8f0"
FUR, FUR_S = "#f8f8f8", "#b0c0d0"
NAVY, NAVY_S = "#304070", "#202850"
BLOND, BLOND_S = "#e8e0b0", "#b0a070"
SKI_RED, SKI_RED_S = "#e84030", "#a02020"
SKI_YEL, SKI_YEL_S = "#f0c838", "#b08018"
HAT, HAT_S = "#f0f0f0", "#a8b0c8"
MAROON, MAROON_S = "#984858", "#602838"
GREY, GREY_S = "#c8c8c8", "#888890"

# Signe's coat: cast5's floor-length coat with a white fur hem (W) and cuffs.
BODIES["furcoat"] = {
    "down": {
        "stand": [
            ("body", [
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "....TTTTTTtt....",
                "...WWWWWWWWww...",
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
                "...WWWWWWWWww...",
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
                "....WWWWWWww....",
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
                "...WWWWWWWwww...",
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
                "....WWWWWWwww...",
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
BODIES["furcoat"]["up"] = BODIES["furcoat"]["down"]

# Signe: hair parted in the middle and drawn smoothly back into the braid.
HEADS["braid"] = {
    "down": ["................", ".....HHHHHh.....", "....HHHHhHHh....", "...HHHHhHHHhh...",
             "...HHSSSSSHhh...", "...HSESSSSESh...", "...SSESSSSESs...", "....SSSSSSSs...."],
    "up": ["................", ".....HHHHHh.....", "....HHHHHHHh....", "...HHHHHHHHhh...",
           "...HHHHhHHHhh...", "...HHHHhHHHhh...", "...SHHHhHHHhs...", "....SSShhSss...."],
    "left": ["................", ".....HHHHHh.....", "....HHHHHHHh....", "...HHHHHHHHhh...",
             "...HSSSHHHHhh...", "...SESSSHHHhh...", "..SSSSSSSHhh....", "...SSSSSSs......"],
}

# The skier: a white bobble hat with the goggles pushed up onto its crown.
HEADS["bobble"] = {
    "down": ["......AAa.......", ".....CCCCCc.....", "....CCCCCCcc....", "...XQQqXXQQqX...",
             "...DDDDDDDDdd...", "...SSESSSSESs...", "...NSESSSSESn...", "....SSSSSSSs...."],
    "up": ["......AAa.......", ".....CCCCCc.....", "....CCCCCCcc....", "...XXXXXXXXXX...",
           "...DDDDDDDDdd...", "...HHHHHHHHhh...", "...SHHHHHHHhs...", "....SSSSSSss...."],
    "left": [".......AAa......", ".....CCCCCc.....", "....CCCCCCcc....", "..XQQqXXXXXXX...",
             "...DDDDDDDDdd...", "...SESSSHHHh....", "..SNSSSSSHhh....", "...SSSSSSs......"],
}

# The lodge keeper: grey hair thinning on top, half-moon glasses worn low (rims under the eyes).
HEADS["thinning"] = {
    "down": ["................", ".....SSSSSs.....", "....HSWSSSHh....", "...HHSSSSSShh...",
             "...HSSSSSSSSh...", "...HSESSSSESh...", "...HKWKSSKWKh...", "....SSSSSSSs...."],
    "up": ["................", ".....SSSSSs.....", "....HSSSSSHh....", "...HHHHHHHHhh...",
           "...HHHHHHHHhh...", "...HHHHHHHHhh...", "...SHHHHHHHhs...", "....SSSSSSss...."],
    "left": ["................", ".....SSSSSs.....", "....SWSSSSHh....", "...SSSSSSHHhh...",
             "...SSSSSHHHhh...", "...SESSSHHHhh...", "..KWKSSSSHhh....", "...SSSSSSs......"],
}


def costume(head, body, top, shade, **pal):
    return dict(head=head, body=body, pal={"T": top, "t": shade, "B": "#505868", "b": "#383e50",
                "G": "#505868", "g": "#383e50", "F": "#403030", "f": "#281c20", **pal}, acc=[])


C7 = {}
C7["signe"] = costume("braid", "furcoat", ICE, ICE_S,
    H=BLOND, h=BLOND_S, W=FUR, w=FUR_S, A=NAVY, a=NAVY_S, Y="white", V="#58a050", F="#e8e8f0", f="#a0a8c0")
C7["signe"]["acc"] = [
    # The braid, woven light/dark, over her left shoulder (down her back when seen
    # from behind). No outline: blond on ice-blue reads, and it keeps the coat visible.
    {"down": [(["H", "h", "H", "h", "a"], 10, 8)], "up": [(["Hh", "hH", "Hh", "hH", "Hh", "aa"], 7, 8)],
     "left": [(["Hh", "hH", "Hh", "a."], 10, 8)], "z": "front", "line": False},
    # The scarf: a navy band flecked white, one knitted end hanging down the front.
    {"down": [(["AAYAAYAa", "...A....", "...Y...."], 4, 9)], "up": [(["AAYAAYAa"], 4, 9)],
     "left": [(["AYAAa", ".A...", ".Y..."], 5, 9)], "z": "front", "line": False},
    # The snowdrop pinned at the collar: a white bell under a green stalk.
    {"down": [(["V", "Y"], 5, 10)], "left": [(["V", "Y"], 8, 10)], "z": "front", "line": False},
]

C7["skier"] = costume("bobble", "jacket", SKI_RED, SKI_RED_S,
    C=HAT, c=HAT_S, A=HAT, a=HAT_S, D="#d0d8e8", d="#98a0b8", X="#383848", Q="#78c8f0", q="#3870b8",
    H="#784828", h="#503018", N="#f07868", n="#f07868", B="#303850", b="#202838", G="#303850", g="#202838",
    F="#404858", f="#282c38", O=SKI_YEL, o=SKI_YEL_S, W="white", w="#c0c8d8")
C7["skier"]["acc"] = [
    # Skis carried upright against the right shoulder; their tips rise over the hat.
    {"down": [(["OO", "Oo", "Oo", "Oo", "Oo", "Oo", "Oo", "Oo", "Oo", "Oo", "Oo", "oo"], 12, 0)],
     "up": [(["OO", "Oo", "Oo", "Oo", "Oo", "Oo", "Oo", "Oo", "Oo", "Oo", "Oo", "oo"], 2, 0)], "z": "front"},
    {"left": [(["..OO", "..Oo", ".Oo.", ".Oo.", ".Oo.", "Oo..", "Oo..", "Oo..", "oo.."], 11, 0)], "z": "back"},
    # The jacket's white zip stripe and chest band.
    {"down": [(["WW", "Ww", "Ww"], 7, 9)], "line": False},
]

C7["lodge_keeper"] = costume("thinning", "stooped", MAROON, MAROON_S,
    H=GREY, h=GREY_S, Q="#e0e8f0", B="#706858", b="#504838", G="#706858", g="#504838",
    F="#402818", f="#281810", Y="#e8c040", y="#a07820", W="#f0f0e8", w="#b8c0c8", U="#4878b8")
C7["lodge_keeper"]["acc"] = [
    # Cardigan buttons down the front.
    {"down": [(["W", ".", "W"], 7, 10)], "line": False},
    # A blue-striped tea towel folded over the right shoulder.
    {"down": [(["WW", "UU", "WW", "Uw"], 11, 9)], "left": [(["WW", "UU", "Ww", "Uw"], 9, 9)],
     "up": [(["WW", "UU", "WW", "Uw"], 3, 9)], "z": "front"},
    # The ring of brass keys at the belt.
    {"down": [(["Yy", "y."], 5, 12)], "left": [(["Yy", "y."], 6, 12)], "line": False},
]


# =============================================================================
# Objects
# =============================================================================
EMIT_PAL = {**DEFAULT_PAL, "M": "#a8b0b8", "m": "#687080", "N": "#484c5c", "D": "#303040",
            "Y": "#d8b848", "G": "#98f070", "g": "#40a040", "H": "#e8fff0", "X": "#405048",
            "A": "#90e8a0", "a": "#58b070"}


def emitter_frame(on: bool):
    f = Frame()
    # Stubby antenna with a ball tip, rising from the right of the lid.
    f.layer(["M", "m", "m"], 10, 2)
    f.layer(["MM"], 10, 1)
    # Bulb in a little cage on the lid's left.
    f.layer(["GG" if on else "XX", "Gg" if on else "XD"], 4, 4)
    # The cabinet: lid, three vent slats, a riveted base on the floor.
    f.layer([
        "MMMMMMMMMMm",
        "MNNNNNNNNNm",
        "MmmmmmmmmmN",
        "MNNNNNNNNNm",
        "MmmmmmmmmmN",
        "MNNNNNNNNNm",
        "MMMMMMMMMmN",
        "MMYMMMMMYmN",
        "NNNNNNNNNNN",
    ], 2, 6)
    if on:
        f.paint([(4, 4)], "H")
    out = ch.render(f, EMIT_PAL)
    if on:
        px = out.load()
        a, b = ch.gbc.hexc(EMIT_PAL["A"]), ch.gbc.hexc(EMIT_PAL["a"])
        # Two faint arcs either side of the antenna tip (no outline: broadcast, not an object).
        for x, y, c in [(13, 0, a), (14, 1, a), (14, 2, a), (13, 3, a), (8, 0, a), (7, 1, a), (7, 2, a),
                        (8, 3, a), (15, 1, b), (15, 2, b), (6, 0, b), (5, 1, b), (5, 2, b), (6, 3, b)]:
            if px[x, y][3] == 0:
                px[x, y] = c
    return out


def signal_emitter():
    on, off = emitter_frame(True), emitter_frame(False)
    return ch.static_sheet([[on] * 3, [off] * 3, [on] * 3, [off] * 3])


LILY_PAL = {**DEFAULT_PAL, "R": "#d04058", "r": "#902038", "Q": "#782030", "q": "#601828",
            "P": "#f07888", "p": "#c03850", "W": "#f8d8d8"}


def lily_frame(pulse: int):
    f = Frame()
    # The Victoria pad, seen from a little above: a lit far rim, the dark
    # inside of the tray, the near rim wall ribbed with short notches.
    f.layer([
        "...RRRRRRRR...",
        ".RRQQQQQQQQRr.",
        "RQQQQqQQqQQQQr",
        "rRQQQQQQQQQQrr",
        ".rRrRrRrRrRrr.",
    ], 1, 10)
    # The bloom: a crown of petals over darker crimson sepals; on the pulse
    # the crown opens a pixel wider and its glint brightens.
    f.layer([".rRRRRr.", "rrRRRrrr"], 4, 9)
    if pulse:
        f.layer(["..P..P..", ".PPWPPp.", "PPWPPPpp", "PPPpPPpp", ".PPpPpp."], 4, 4)
    else:
        f.layer(["..PWPp..", ".PPPPPp.", ".PPpPpp.", "..PpPp.."], 4, 5)
    out = ch.render(f, LILY_PAL)
    px = out.load()
    c = ch.gbc.hexc("#c84050")
    # Faint red ripples on the water either side (no outline; they spread on the pulse).
    rip = [(0, 13), (15, 13), (1, 15), (14, 15)] if not pulse else [(0, 12), (15, 12), (0, 15), (15, 15)]
    for x, y in rip:
        if px[x, y][3] == 0:
            px[x, y] = c
    return out


def crimson_lily():
    a, b = lily_frame(0), lily_frame(1)
    return ch.static_sheet([[a, b, b]] * 4)


def images():
    out = {key: ch.sheet(spec) for key, spec in C7.items()}
    out["signal_emitter"] = signal_emitter()
    out["crimson_lily"] = crimson_lily()
    return out


def build(write=True):
    out = images()
    if write:
        for key, image in out.items():
            common.write_character(key, image)
    return out
