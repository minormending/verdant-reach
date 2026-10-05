"""Run tools/art/creature_audit.py over the species_e bundles.

  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/species_e/audit.py

The shared audit reads one species folder; this points it at
public/art/species/ and supplies the size classes for the new lines (the
species data may not list them yet). Also checks the back fill (60–85%),
the centre of mass (x 28–34) and the icon bottom row (14–15).
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import creature_audit as ca  # noqa: E402

STAGE = {
    "orchid_keiki": "baby", "orchid_spike": "teen", "moth_orchid": "adult",
    "monstera_cutting": "teen", "monstera": "adult",
    "lotus_seed": "teen", "sacred_lotus": "adult",
}

if __name__ == "__main__":
    ca.SP = HERE.parents[2] / "public" / "art" / "species"
    ids = sys.argv[1:] or list(STAGE)
    for i in ids:
        line = ca.audit(i, STAGE.get(i))
        d = ca.SP / i
        f = np.asarray(Image.open(d / "front.png").convert("RGBA"))[..., 3] > 0
        b = np.asarray(Image.open(d / "back.png").convert("RGBA"))[..., 3] > 0
        ic = np.asarray(Image.open(d / "icon.png").convert("RGBA"))[..., 3] > 0
        ys, xs = np.nonzero(f)
        extra = f"com x{xs.mean():.1f} back {100 * b.mean():.0f}% icon-bottom {np.nonzero(ic)[0].max()}"
        flags = []
        if not 28 <= xs.mean() <= 34:
            flags.append("!com")
        if not 60 <= 100 * b.mean() <= 85:
            flags.append("!back fill")
        if b[-1].sum() == 0:
            flags.append("!back not cropped")
        print(f"{STAGE.get(i, '?'):5s} {line}  {extra} {' '.join(flags)}")
