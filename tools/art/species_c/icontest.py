"""Dev: render every icon (both frames) at 8x on one sheet -> review/icons.png."""
import sys
from pathlib import Path
from PIL import Image
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import importlib
mods = [importlib.import_module(m) for m in ("clover", "cattail", "foxglove", "holly")]
ims = []
for m in mods:
    for i in m.IDS:
        d = m.make(i)
        ims += [d["icon"], d["icon__2"]]
z = 8
out = Image.new("RGBA", (len(ims) * (16 * z + 8), 16 * z + 40), (248, 248, 240, 255))
for k, im in enumerate(ims):
    out.alpha_composite(im.resize((16 * z, 16 * z), Image.NEAREST), (k * (16 * z + 8), 0))
    out.alpha_composite(im, (k * (16 * z + 8) + 4, 16 * z + 12))
out.save(HERE / "review" / "icons.png")
