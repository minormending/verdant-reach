"""Chapter 4 item icons -> public/art/sets/items/<id>.png (16x16).

Same craft as tools/art/items.py: hand-authored ASCII, 1px black outline,
a few colours each, light from the top-left, transparent background.

  pruning_shears  GARDEN SHEARS (key item, unlocks PRUNE): bypass secateurs,
                  steel blades open, red grips, a brass pivot and a spring
  fan_letter      a pink envelope sealed with a red rose-stamped wax seal
  signed_photo    a glossy photo of FLORA (her plum waves, a red rose) with a
                  looping signature across the white border
  aloe_gel        ALOE GEL (cures scorch): a squat jar of green gel, an
                  aloe leaf on the label
  cloche          GLASS CLOCHE (cures frostbite): a bell jar over a seedling
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402,F401

import gbc  # noqa: E402
from gbc import img_from_rows  # noqa: E402

ITEMS4 = {}


def item(name, rows, key):
    assert len(rows) == 16 and all(len(r) == 16 for r in rows), (name, [len(r) for r in rows])
    key = {k: (gbc.hexc(v) if isinstance(v, str) and v.startswith("#") else v) for k, v in key.items()}
    ITEMS4[name] = img_from_rows(rows, {".": None, "K": "k", **key})


# secateurs: two steel blades open like a beak, a brass pivot, red grips
item("pruning_shears", [
    "..KK............",
    ".KwsK...........",
    ".KswsK....KK....",
    "..KswsK..KwsK...",
    "...KswsKKwssK...",
    "....KssKwssK....",
    ".....KKyYKK.....",
    ".....KyYYyK.....",
    "....KrKyYKrK....",
    "...KrrKKKKrRK...",
    "...KrRK...KrRK..",
    "..KrrK.....KrRK.",
    "..KrRK......KrRK",
    ".KrrK........KrK",
    ".KrRK.........KK",
    "..KK............",
], {"w": "white", "s": "r1", "y": "y1", "Y": "y2", "r": "b1", "R": "b2"})

# fan letter: pink envelope, flap folded down, red wax seal with a rose
item("fan_letter", [
    "................",
    "................",
    "................",
    ".KKKKKKKKKKKKKK.",
    ".KpKppppppppKPK.",
    ".KppKppppppKpPK.",
    ".KpppKppppKppPK.",
    ".KppppKKKKpppPK.",
    ".KpppKrrrrKppPK.",
    ".KppKrhRrRrKpPK.",
    ".KpKprRRrrRpKPK.",
    ".KKppKrrRRKppKK.",
    ".KpppppKKpppPPK.",
    ".KPPPPPPPPPPPPK.",
    ".KKKKKKKKKKKKKK.",
    "................",
], {"p": "n0", "P": "n1", "r": "#d02848", "R": "#901830", "h": "#f86078"})

# signed photo: white border, Flora's portrait in miniature, a signature
item("signed_photo", [
    "................",
    ".KKKKKKKKKKKKK..",
    ".KwwwwwwwwwwwKK.",
    ".KwKKKKKKKKKwKs.",
    ".KwKbbHHHHbKwKs.",
    ".KwKbHHSSHHKwKs.",
    ".KwKrRHSSHHKwKs.",
    ".KwKRrHSZSHKwKs.",
    ".KwKbHHSSHHKwKs.",
    ".KwKbHWWWWHKwKs.",
    ".KwKbWrrrrWKwKs.",
    ".KwKKKKKKKKKwKs.",
    ".KwwiwwwwwwiwKs.",
    ".KwiwiiwiiwwiKs.",
    ".KKKKKKKKKKKKKs.",
    "..ssssssssssss..",
], {"w": "offwhite", "s": "r2", "b": "#68a8c8", "H": "#504068", "S": "sk0", "Z": "#d02848",
    "r": "#d02848", "R": "#901830", "W": "white", "i": "x2"})

# aloe gel: a squat glass jar of green gel, white lid, aloe leaf label
item("aloe_gel", [
    "................",
    "................",
    "....KKKKKKKK....",
    "...KwwwwwwwWK...",
    "...KWWWWWWWWK...",
    "...KKKKKKKKKK...",
    "..KqgggggggGGK..",
    "..KgKKKKKKKKGK..",
    "..KgKlllLllKGK..",
    "..KgKlLlLlLKGK..",
    "..KgKllLLllKGK..",
    "..KgKlllLllKGK..",
    "..KgKKKKKKKKGK..",
    "..KggggggggGGK..",
    "...KGGGGGGGGK...",
    "....KKKKKKKK....",
], {"w": "white", "W": "r1", "q": "g0", "g": "g1", "G": "g2", "l": "s0", "L": "f1"})

# glass cloche: a bell jar with a knob, glass glints, a sprout under it
item("cloche", [
    "................",
    ".......KK.......",
    "......KwqK......",
    ".....KKKKKK.....",
    "....KwqqqqqQK...",
    "...KwqqqqqqqQK..",
    "...KwqqqqqqqQK..",
    "..KwqqqqqqqqqQK.",
    "..KwqqqgGqqqqQK.",
    "..KqqqqqgqgGqQK.",
    "..KqqqqGgggqqQK.",
    "..KqqqqqgqqqQQK.",
    ".KKKKddddddKKKKK",
    ".KQQQQQQQQQQQQJK",
    "..KKKKKKKKKKKKK.",
    "................",
], {"w": "white", "q": "q0", "Q": "q1", "J": "q2", "g": "g1", "G": "g2", "d": "d2"})


def build(write=True):
    if write:
        common.write_set_images("items", ITEMS4, "items4.py")
    gbc.grid_sheet([(k, gbc.on_bg(v)) for k, v in ITEMS4.items()], 6, 6).save(common.REVIEW / "items_ch4.png")
    return ITEMS4


if __name__ == "__main__":
    build(write="--scratch" not in sys.argv)
