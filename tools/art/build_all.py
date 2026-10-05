"""Rebuild every game asset, the review contact sheets, CREDITS.md and the manifest.

  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/build_all.py

Outputs: public/assets/**, tools/art/review/*.png, src/assets/manifest.ts.
Exits non-zero if any contract asset is missing or the wrong size.
"""

import sys

import build_manifest
import characters
import credits
import items
import portraits
import species
import structures
import tiles
import ui

if __name__ == "__main__":
    tiles.build()
    structures.build()
    characters.build()
    portraits.build()
    items.build()
    ui.build()
    species.build()
    species.review()
    credits.main()
    sys.exit(build_manifest.main())
