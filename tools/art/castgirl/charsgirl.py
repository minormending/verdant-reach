"""16px walk sheet for the girl player, the junior botanist's counterpart.

  player_girl  the same field kit as the boy (characters.CHARS["player"]): the
               green field cap with its pale leaf badge, the rust field
               jacket, the tin vasculum on its leather strap and the dark
               boots, all in his exact colours (read from his spec, never
               copied by hand). What makes her someone else at 16px:
               - a long dark-brown ponytail pulled through the back of the
                 cap, tied with a leaf-green band. It flicks out past the
                 cap on the right (front), hangs down her back (behind) and
                 streams out behind her head (sides), and it swings a pixel
                 on every step;
               - a side-swept fringe and locks framing her face where the
                 boy shows cheek and ear;
               - a short denim skirt over bare legs instead of his jeans.

Built on the Round-3 character kit (characters.compose and render), so the
outline, the lighting, the 1px walk bob and the mirrored, re-lit right row
are his exactly. The only addition is the per-pose ponytail layer.
"""
from __future__ import annotations

import copy

import commongirl as common
import characters as ch
from characters import BODIES, CHARS, HEADS
from PIL import Image

BOY = CHARS["player"]

# Her hair: a darker, cooler brown than his chestnut d2/d3, so the ponytail's
# outline reads against the orange jacket and the green grass. HAIR_H is the
# portrait's highlight.
HAIR, HAIR_S, HAIR_H = "#704020", "#482810", "#a06838"

# --- the head: his cap, her fringe and face-framing locks ---------------------
# Rows from y=0 as in HEADS["cap"]; the cap rows (1-3) are his, untouched.
_cap = HEADS["cap"]
HEADS["cap_girl"] = {
    "down": _cap["down"][:4] + [
        "...HHHHSSSSSh...",
        "...HSESSSSESh...",
        "...HSESSSSESh...",
        "...hHSSSSSShh...",
    ],
    "up": _cap["up"][:5] + [
        "...hhhhhhhhhh...",
        "...Hhhhhhhhhh...",
        "....hhhhhhhh....",
    ],
    "left": _cap["left"][:4] + [
        "...HHSSSHHHhh...",
        "...SESSSHHHhh...",
        "..SSSSSSHHhh....",
        "...SSSSSShh.....",
    ],
}

# --- the body: his casual body with a short skirt and bare legs --------------
# Only the bottoms change: in the stand pose the second bottoms row closes
# into a skirt hem, and the legs below it are skin ('G' maps to skin).
_skirt = copy.deepcopy(BODIES["casual"])
for _facing, _row in (("down", "....BBBBBBbb...."), ("left", ".....BBBBbb.....")):
    _kind, _rows, _x, _y = _skirt[_facing]["stand"][0]
    _rows[3] = _row
_skirt["up"] = _skirt["down"]
BODIES["casual_skirt"] = _skirt

# --- the ponytail, per facing and pose ---------------------------------------
# Each pose is a list of layers (rows, x, y, outline sides) in stand-pose
# coordinates relative to the head; the walk bob is added by compose.
# down: the tail swings out past the right of the cap (z head, no outline on
#       its left so it joins her hair lock); it lifts a pixel on step A.
# up:   it falls from under the cap's band down her back (z front). Her hair
#       under the cap sits in shadow, so the lit tail reads on it without an
#       outline (an outline there reads as a mask); over the jacket it is
#       outlined, and its tip swings left on step A and right on step B.
# left: it streams out behind her head, its tip lifting on step A and
#       dropping on step B (the right row mirrors it).
TAIL = {
    "down": {
        "stand": [(["HH", "Hh", ".h"], 13, 4, "NES")],
        "a": [(["HH", "Hh", "hh"], 13, 3, "NES")],
        "b": [(["HH", "Hh", "h."], 13, 4, "NES")],
    },
    "up": {
        "stand": [(["HH", "HH", "HHh"], 7, 5, ""), (["HHh", "Hh", ".h"], 7, 8, "ESW")],
        "a": [(["HH", "HH", "HHh"], 7, 5, ""), (["HHh", "Hh", "h."], 6, 8, "ESW")],
        "b": [(["HH", "HH", "HHh"], 7, 5, ""), (["HHh", ".Hh", "..h"], 7, 8, "ESW")],
    },
    "left": {
        "stand": [(["HH.", "Hhh", ".hh", ".hh", "..h"], 12, 3, "NES")],
        "a": [(["HHh", "Hhh", ".h.", "..."], 12, 3, "NES")],
        "b": [(["HH.", "Hh.", "hh.", "h.."], 12, 4, "NES")],
    },
}
TAIL_Z = {"down": "head", "up": "front", "left": "head"}

PAL = {**BOY["pal"], "H": HAIR, "h": HAIR_S, "G": "sk0", "g": "sk1", "A": BOY["pal"]["A"]}
SPEC = dict(BOY, head="cap_girl", body="casual_skirt", pal=PAL)


def tail_acc(pose):
    out = []
    for facing, poses in TAIL.items():
        for rows, x, y, sides in poses[pose]:
            out.append({facing: [(rows, x, y)], "z": TAIL_Z[facing], "line": bool(sides), "sides": sides})
    return out


def girl_sheet() -> Image.Image:
    pal = {**ch.DEFAULT_PAL, **SPEC["pal"]}
    out = Image.new("RGBA", (48, 64), ch.gbc.CLEAR)
    for row, facing in enumerate(ch.FACINGS):
        for col, pose in enumerate(ch.POSES):
            spec = dict(SPEC, acc=list(BOY["acc"]) + tail_acc(pose))
            out.alpha_composite(ch.render(ch.compose(spec, facing, pose), pal), (col * 16, row * 16))
    return out


def images():
    return {"player_girl": girl_sheet()}


def build(write=True):
    out = images()
    if write:
        for key, image in out.items():
            common.write_character(key, image)
    return out
