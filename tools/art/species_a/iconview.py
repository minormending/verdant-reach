import sys, importlib
from PIL import Image, ImageDraw
sys.path.insert(0, '.')
import build
Z = 7
cells = []
for n in build.LINE_NAMES:
    m = importlib.import_module(n)
    for id_ in m.IDS:
        d = m.make(id_); cells.append((id_, d['icon'], d['icon__2']))
im = Image.new('RGBA', (6 * (16 * Z * 2 + 24), 3 * (16 * Z + 16)), (236, 240, 228, 255))
dr = ImageDraw.Draw(im)
for i, (id_, a, b) in enumerate(cells):
    r, c = i % 3, i // 3
    x, y = c * (16 * Z * 2 + 24), r * (16 * Z + 16)
    im.alpha_composite(a.resize((16 * Z,) * 2, 0), (x, y + 12)); im.alpha_composite(b.resize((16 * Z,) * 2, 0), (x + 16 * Z + 4, y + 12))
    dr.text((x, y), id_, fill=(0, 0, 0, 255))
im.save('icons.png')
