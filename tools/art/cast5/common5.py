"""Shared plumbing for the Chapter 5 cast generators (tools/art/cast5/).

These generators author Chapter 5's characters, portraits, stills, the
PIPE MARK and item icons. Like tools/art/cast4/, they reuse the Round-3
building blocks (characters.Frame/compose, portraits.Portrait,
stills.Canvas) by importing the sibling modules from tools/art/.

Output goes straight into the swappable-art bundles (docs/ART.md):
  public/art/characters/<key>/{character.json, sheet.png}
  public/art/sets/<set>/<key>.png  (+ an entry in that set.json)

Generators never overwrite a bundle whose `source.kind` is "edited" or
"imported" (artkit.emit enforces this).
"""

from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ART_TOOLS = HERE.parent
if str(ART_TOOLS) not in sys.path:
    sys.path.insert(0, str(ART_TOOLS))

import gbc  # noqa: E402,F401

ROOT = ART_TOOLS.parents[1]
ART = ROOT / "public" / "art"
REVIEW = ART_TOOLS / "review"

CREDITS = "Hand-authored pixel art for Verdant Reach (Chapter 5 cast generator)."


def tool(name: str) -> str:
    return f"tools/art/cast5/{name}"


def write_character(key: str, sheet, name: str = "chars5.py") -> bool:
    """public/art/characters/<key>/ via artkit (skips edited bundles)."""
    from artkit import emit
    assert sheet.size == (48, 64), (key, sheet.size)
    return emit.character(key, sheet, tool=tool(name), credits=CREDITS)


def write_set_images(set_id: str, images: dict, name: str) -> list:
    """public/art/sets/<set_id>/<key>.png + set.json entries via artkit,
    which re-reads set.json and only touches our keys."""
    from artkit import emit
    return emit.set_images(set_id, images, tool=tool(name))
