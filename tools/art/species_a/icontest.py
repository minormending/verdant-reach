"""Render ASCII icon drafts from a text file: blocks separated by blank lines,
first line of a block = 'name pal1 pal2 pal3'."""
import sys
from PIL import Image
sys.path.insert(0, '.')
from px import icon_rows
blocks = open(sys.argv[1]).read().strip().split('\n\n')
Z = 8
im = Image.new('RGBA', (len(blocks) * (16 * Z + 8), 16 * Z + 30 + 20), (236, 240, 228, 255))
for i, b in enumerate(blocks):
    lines = b.split('\n')
    name, *pal = lines[0].split()
    rows = [l[:16] for l in lines[1:17]]
    for j, r in enumerate(rows):
        assert len(r) == 16, (name, j, len(r), r)
    ic = icon_rows(rows, pal)
    im.alpha_composite(ic.resize((16 * Z,) * 2, 0), (i * (16 * Z + 8), 0))
    im.alpha_composite(ic, (i * (16 * Z + 8), 16 * Z + 10))
im.save('icontest.png')
