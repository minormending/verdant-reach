"""Draft viewer: render one species at 6x (frames, back, icons, silhouette)
to review/_draft_<id>.png without writing bundles.

  .../python tools/art/species_e/view.py moth_orchid
"""
import importlib
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from build import LINES, zoom  # noqa: E402

for sid in sys.argv[1:]:
    for line in LINES:
        try:
            mod = importlib.import_module(line)
        except ModuleNotFoundError:
            continue
        if sid in mod.IDS:
            imgs = mod.make(sid)
            break
    z = 6
    ks = [k for k in ("front", "front__2", "front__3", "back") if k in imgs]
    W = sum(imgs[k].width * z + 10 for k in ks) + 16 * z + 70 + 130
    s = Image.new("RGBA", (W, 56 * z + 20), (236, 240, 224, 255))
    x = 5
    for k in ks:
        s.alpha_composite(zoom(imgs[k], z), (x, 10 + (56 - imgs[k].height) * z))
        x += imgs[k].width * z + 10
    s.alpha_composite(zoom(imgs["icon"], z), (x, 10))
    s.alpha_composite(zoom(imgs["icon__2"], z), (x, 20 + 16 * z))
    x += 16 * z + 10
    s.alpha_composite(imgs["front"], (x, 10))
    a = np.asarray(imgs["front"]).copy(); a[a[..., 3] > 0, :3] = 24
    s.alpha_composite(Image.fromarray(a, "RGBA"), (x, 80))
    s.alpha_composite(imgs["icon"], (x + 60, 10))
    s.alpha_composite(imgs["back"], (x, 150))
    (HERE / "review").mkdir(exist_ok=True)
    s.save(HERE / "review" / f"_draft_{sid}.png")
