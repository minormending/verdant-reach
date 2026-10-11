"""16x16 post-game item icon -> public/art/sets/items/ (replaces the placeholder).

  old_diary  FENNIMORE's grandfather's diary from the Seed Vault archive: a
             worn brown leather book, its spine darker and its corners
             rubbed pale, tied shut with a cream cord knotted on the front
             (two loose ends hang down), and a pressed green leaf peeking
             out of the pages at the top. Same kit as tools/art/items.py:
             ASCII rows, a 1px black outline, a few colours from gbc.C.
"""
from __future__ import annotations

import commonpg as common
from gbc import img_from_rows

ITEMS = {}


def item(name, rows, key):
    assert len(rows) == 16 and all(len(r) == 16 for r in rows), (name, [len(r) for r in rows])
    ITEMS[name] = img_from_rows(rows, {".": None, "K": "k", **key})


item("old_diary", [
    "...........KK...",
    "..........KgGK..",
    ".........KgGGK..",
    "...KKKKKKKgKKK..",
    "..KDoooOOOOOOwK.",
    "..KDoOOOOOOOOwK.",
    "..KDOOOOOOOOOwK.",
    "..KDOOOOOOOOOwK.",
    ".KccccccCCccccK.",
    "..KDOOOOcCOOOwK.",
    "..KDOOOcOOcOOwK.",
    "..KDOOOcOOOOoWK.",
    "..KDDDDDDDDDDWK.",
    "...KwwwwwwwwwWK.",
    "....KKKKKKKKKK..",
    "................",
], {"o": "o1", "O": "o2", "D": "o3", "c": "s1", "C": "s3", "w": "s0", "W": "s2", "g": "g1", "G": "g2"})


def build(write=True):
    if write:
        common.write_set("items", ITEMS, "itemspg")
    return dict(ITEMS)
