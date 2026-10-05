"""All 18 fronts at 3x + 1x, one line per row (comparison sheet)."""
import sys, importlib
from PIL import Image
sys.path.insert(0, '.')
import build
Z = 3
rows = [importlib.import_module(n) for n in build.LINE_NAMES]
im = Image.new('RGBA', (3 * (56 * Z + 70) + 10, len(rows) * (56 * Z + 8)), (236, 240, 228, 255))
for r, mod in enumerate(rows):
    for k, id_ in enumerate(mod.IDS):
        f = mod.make(id_)['front']
        x, y = 5 + k * (56 * Z + 70), r * (56 * Z + 8) + 4
        im.alpha_composite(f.resize((56 * Z,) * 2, Image.NEAREST), (x, y))
        im.alpha_composite(f, (x + 56 * Z + 6, y + 56 * Z - 56))
im.save('fronts.png')
