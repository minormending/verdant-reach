"""Girl-player plumbing; the same bundle writers and pixel kit as the chapter casts."""
from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ART_TOOLS = HERE.parent
if str(ART_TOOLS) not in sys.path:
    sys.path.insert(0, str(ART_TOOLS))

from artkit import emit  # noqa: E402

REVIEW = ART_TOOLS / "review"
CREDITS = "Hand-authored original pixel art for Verdant Reach (girl player generator, tools/art/castgirl)."


def write_character(key, image):
    assert image.size == (48, 64), key
    return emit.character(key, image, tool="tools/art/castgirl/charsgirl.py", credits=CREDITS)


def write_set(set_id, images, module):
    return emit.set_images(set_id, images, tool=f"tools/art/castgirl/{module}.py")
