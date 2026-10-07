"""Build every Chapter 5 cast bundle (characters, portraits, stills, the PIPE
MARK and item icons) into public/art/ and the review sheets in
tools/art/review/.

  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/cast5/build.py
  ... build.py --scratch     review sheets only, write nothing to public/art/

Run `npm run art:index` afterwards if a bundle or set entry was added.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common5  # noqa: E402,F401

import chars5  # noqa: E402
import icons5  # noqa: E402
import portraits5  # noqa: E402
import stills5  # noqa: E402

if __name__ == "__main__":
    write = "--scratch" not in sys.argv
    for mod in (chars5, portraits5, icons5, stills5):
        mod.build(write=write)
