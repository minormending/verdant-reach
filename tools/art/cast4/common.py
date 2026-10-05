"""Shared plumbing for the Round 4 cast generators (tools/art/cast4/).

These generators author Chapter 4's characters, portraits, items, UI and
stills. They reuse the Round-3 building blocks (characters.Frame/compose,
portraits.Portrait, stills.Canvas) by importing the sibling modules.

Output goes straight into the swappable-art bundles (docs/ART.md):
  public/art/characters/<key>/{character.json, sheet.png}
  public/art/sets/<set>/<key>.png  (+ an entry in that set.json)

Generators never overwrite a bundle whose `source.kind` is "edited".
"""

from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ART_TOOLS = HERE.parent
if str(ART_TOOLS) not in sys.path:
    sys.path.insert(0, str(ART_TOOLS))

import gbc  # noqa: E402

ROOT = ART_TOOLS.parents[1]
ART = ROOT / "public" / "art"
REVIEW = ART_TOOLS / "review"

CREDITS = "Hand-authored pixel art for Verdant Reach (Round 4 cast generator)."


def _tool(name: str) -> str:
    return f"tools/art/cast4/{name}"


def write_character(key: str, sheet, tool: str = "chars.py") -> bool:
    """public/art/characters/<key>/ via artkit (skips edited bundles)."""
    from artkit import emit
    assert sheet.size == (48, 64), (key, sheet.size)
    return emit.character(key, sheet, tool=_tool(tool), credits=CREDITS)


def write_set_images(set_id: str, images: dict, tool: str) -> list:
    """public/art/sets/<set_id>/<key>.png + set.json entries via artkit,
    which re-reads set.json and only touches our keys."""
    from artkit import emit
    return emit.set_images(set_id, images, tool=_tool(tool))
