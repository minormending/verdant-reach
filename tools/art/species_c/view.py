"""Dev viewer: python view.py module func [arg] -> review/view.png at 8x with a grid."""
import importlib, sys
from pathlib import Path
from PIL import Image, ImageDraw
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
mod = importlib.import_module(sys.argv[1])
ims = []
for spec in sys.argv[2:]:
    fn, *a = spec.split(":")
    r = getattr(mod, fn)(*[int(x) for x in a])
    ims.append(r if isinstance(r, Image.Image) else r.image())
z = 8
W = sum(i.width * z + 8 for i in ims)
out = Image.new("RGBA", (W, max(i.height for i in ims) * z), (232, 236, 224, 255))
x = 0
for im in ims:
    big = im.resize((im.width * z, im.height * z), Image.NEAREST)
    bg = Image.new("RGBA", big.size, (248, 248, 240, 255))
    d = ImageDraw.Draw(bg)
    for k in range(0, big.width, z * 4):
        d.line([(k, 0), (k, big.height)], fill=(225, 225, 215, 255))
    for k in range(0, big.height, z * 4):
        d.line([(0, k), (big.width, k)], fill=(225, 225, 215, 255))
    bg.alpha_composite(big)
    out.alpha_composite(bg, (x, 0))
    x += big.width + 8
(HERE / "review").mkdir(exist_ok=True)
out.save(HERE / "review" / "view.png")
