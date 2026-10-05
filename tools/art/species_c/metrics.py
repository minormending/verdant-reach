"""Dev: write assets, then run the creature audit + back-sprite fill for our ids."""
import subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parents[2]
PY = sys.executable
IDS = ["clover_sprout", "white_clover", "cattail_shoot", "cattail", "foxglove_rosette", "foxglove", "holly_seedling", "holly"]
subprocess.run([PY, str(ROOT / "tools/art/species_c/build.py")], check=True, stdout=subprocess.DEVNULL)
subprocess.run([PY, str(ROOT / "tools/art/creature_audit.py")] + IDS, check=True)
for i in IDS:
    b = np.asarray(Image.open(ROOT / f"public/art/species/{i}/back.png"))[..., 3] > 0
    ys, xs = np.nonzero(b)
    print(f"  {i:18s} back fill {100*b.mean():4.1f}%  width {xs.max()-xs.min()+1}  bottom-row-opaque {b[-1].any()}")
