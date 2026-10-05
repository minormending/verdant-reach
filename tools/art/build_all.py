"""Rebuild every game asset, the review contact sheets and the manifest.

  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/build_all.py

Outputs: public/assets/**, tools/art/review/*.png, src/assets/manifest.ts.
Exits non-zero if any contract asset is missing or the wrong size.

Species sprites are hand-built by tools/art/species_a/ and tools/art/species_b/.
The old photo auto-trace (species.py) is kept only as a reference tool and is
NOT run here, since it would overwrite the hand-made art. CREDITS.md is now
maintained by hand (credits.py would regenerate it and drop those edits).
"""

import subprocess
import sys
from pathlib import Path

import build_manifest
import characters
import items
import portraits
import stills
import structures
import tiles
import ui

HERE = Path(__file__).resolve().parent

if __name__ == "__main__":
    tiles.build()
    structures.build()
    characters.build()  # after tiles: the hedge gate samples tiles/hedge.png
    portraits.build()
    items.build()
    ui.build()
    stills.build()
    for builder in ("species_a/build.py", "species_b/build.py", "species_c/build.py", "species_d/build.py"):
        subprocess.run([sys.executable, str(HERE / builder)], check=True, cwd=HERE.parent.parent)
    sys.exit(build_manifest.main())
