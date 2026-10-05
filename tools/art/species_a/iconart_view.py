import sys, importlib
from PIL import Image, ImageDraw
sys.path.insert(0, '.')
import icon_art, build, px
from px import icon_rows
pals = {}
for n in build.LINE_NAMES:
    m = importlib.import_module(n)
    src = open(n + '.py').read()
    for id_ in m.IDS:
        # palette used in make(): the 3rd field of the mapping tuple
        import re
        mm = re.search(r'"%s": \([^,]+, [^,]+, (\w+)' % id_, src)
        pals[id_] = getattr(m, mm.group(1))
Z = 10
ids = [i for i in (sys.argv[1:] or icon_art.ICONS)]
im = Image.new('RGBA', (len(ids) * (16 * Z + 30) , 16 * Z + 40), (236, 240, 228, 255))
d = ImageDraw.Draw(im)
for k, id_ in enumerate(ids):
    rows = icon_art.ICONS[id_]()
    for j, r in enumerate(rows):
        assert len(r) == 16, (id_, j, r)
    ic = icon_rows(rows, pals[id_])
    im.alpha_composite(ic.resize((16 * Z,) * 2, 0), (k * (16 * Z + 30), 0))
    im.alpha_composite(ic, (k * (16 * Z + 30), 16 * Z + 8))
    im.alpha_composite(ic.resize((32, 32), 0), (k * (16 * Z + 30) + 24, 16 * Z + 4))
im.save('iconart.png')
