"""Build every Chapter 4 cast bundle (characters, portraits, items, UI,
stills) into public/art/ and the review sheets in tools/art/review/.

  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/cast4/build.py
  ... build.py --scratch     review sheets only, write nothing to public/art/

Run `npm run art:index` afterwards if a bundle or set entry was added.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402,F401

import chars  # noqa: E402
import items4  # noqa: E402
import portraits4  # noqa: E402
import stills4  # noqa: E402
import ui4  # noqa: E402

if __name__ == "__main__":
    write = "--scratch" not in sys.argv
    for mod in (chars, portraits4, items4, ui4, stills4):
        mod.build(write=write)
