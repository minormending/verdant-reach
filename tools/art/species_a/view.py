"""Zoomed look at a few species: front + back at 5x, icons at 5x. view.py id [id...]"""
import sys, importlib
from PIL import Image
sys.path.insert(0, '.')
import build
Z = int(sys.argv[1]) if sys.argv[1].isdigit() else 5
ids = [a for a in sys.argv[1:] if not a.isdigit()]
cells = []
for name in build.LINE_NAMES:
    try:
        mod = importlib.import_module(name)
    except ModuleNotFoundError:
        continue
    for id_ in mod.IDS:
        if id_ in ids:
            cells.append(mod.make(id_))
W = (56 + 48 + 16 + 6) * Z + 40
im = Image.new('RGBA', (W, len(cells) * (56 * Z + 10)), (236, 240, 228, 255))
for r, imgs in enumerate(cells):
    x, y = 4, r * (56 * Z + 10)
    for k in ('front', 'back'):
        z = imgs[k].resize((imgs[k].width * Z,) * 2, Image.NEAREST)
        im.alpha_composite(z, (x, y + 56 * Z - z.height)); x += z.width + 10
    for j, k in enumerate(('icon', 'icon__2')):
        z = imgs[k].resize((16 * Z,) * 2, Image.NEAREST)
        im.alpha_composite(z, (x, y + j * (16 * Z + 6)))
im.save('view.png')
