"""Dev viewer: one species' frames + back + icons, big, with an 8px grid.
  python tools/art/species_f/view.py <id> [zoom]   -> review/_view_<id>.png"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build  # noqa: E402

sid = sys.argv[1]
z = int(sys.argv[2]) if len(sys.argv) > 2 else 8
line, spec = build.specs_all()[sid]
imgs = build.render(sid, spec)
ks = [k for k in ("front", "front__2", "front__3", "back") if k in imgs]
W = sum(imgs[k].width * z + 10 for k in ks) + 200
s = Image.new("RGBA", (W, 56 * z + 10), (248, 248, 240, 255))
d = ImageDraw.Draw(s)
x = 0
for k in ks:
    im = imgs[k].resize((imgs[k].width * z, imgs[k].height * z), Image.NEAREST)
    y0 = 56 * z - im.height
    s.alpha_composite(im, (x, y0))
    for g in range(0, imgs[k].width + 1, 8):
        d.line([(x + g * z, y0), (x + g * z, 56 * z)], fill=(200, 200, 230, 255))
        d.line([(x, y0 + g * z), (x + im.width, y0 + g * z)], fill=(200, 200, 230, 255))
    x += im.width + 10
for i, k in enumerate(("icon", "icon__2")):
    im = imgs[k].resize((16 * 6, 16 * 6), Image.NEAREST)
    s.alpha_composite(im, (x + 4, 4 + i * 104))
s.alpha_composite(imgs["front"], (x + 110, 4))
s.alpha_composite(build.sport_of(imgs["front"], spec), (x + 110, 64))
s.alpha_composite(imgs["icon"], (x + 110, 124))
s.alpha_composite(imgs["back"], (x + 130, 124))
s.save(HERE / "review" / f"_view_{sid}.png")
print(HERE / "review" / f"_view_{sid}.png")
