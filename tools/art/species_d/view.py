"""Dev viewer: big zoom of one species' frames + back, written to review/_view.png.
  python tools/art/species_d/view.py <id> [zoom]"""
import importlib, sys
from pathlib import Path
from PIL import Image, ImageDraw
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build  # noqa: E402

sid = sys.argv[1]
z = int(sys.argv[2]) if len(sys.argv) > 2 else 8
for line in build.LINES:
    try:
        mod = importlib.import_module(line)
    except ModuleNotFoundError:
        continue
    if sid in mod.SPRITES:
        imgs = build.render(sid, mod.SPRITES[sid])
        break
ks = [k for k in ("front", "front__2", "front__3", "back") if k in imgs]
W = sum(imgs[k].width * z + 10 for k in ks) + 120
s = Image.new("RGBA", (W, 56 * z + 10), (248, 248, 240, 255))
x = 0
for k in ks:
    im = imgs[k].resize((imgs[k].width * z, imgs[k].height * z), Image.NEAREST)
    s.alpha_composite(im, (x, 56 * z - im.height))
    d = ImageDraw.Draw(s)
    for gx in range(0, imgs[k].width + 1, 8):
        d.line([(x + gx * z, 56 * z - im.height), (x + gx * z, 56 * z)], fill=(200, 200, 230, 255))
    x += im.width + 10
for i, k in enumerate(("icon", "icon__2", "front")):
    zz = 4 if k != "front" else 1
    im = imgs[k].resize((imgs[k].width * zz, imgs[k].height * zz), Image.NEAREST)
    s.alpha_composite(im, (x + 4, 4 + i * 70))
s.save(HERE / "review" / "_view.png")
