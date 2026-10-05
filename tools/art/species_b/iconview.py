import sys, importlib
sys.path.insert(0, '.')
from PIL import Image, ImageDraw
import pix, icons_wild
importlib.reload(icons_wild)
pals = {}
for line in ["fern", "flytrap", "sundew", "maple", "nettle", "moonflower"]:
    mod = importlib.import_module(line)
    for sid, spec in mod.SPRITES.items():
        pals[sid] = spec["pal"]
ids = sys.argv[1:] or list(icons_wild.ICONS)
z = 7
W = 4 * (16 * z * 2 + 60)
H = ((len(ids) + 3) // 4) * (16 * z + 26)
im = Image.new("RGBA", (W, H), (230, 230, 222, 255))
d = ImageDraw.Draw(im)
for i, sid in enumerate(ids):
    rows = icons_wild.ICONS[sid]
    for j, r in enumerate(rows):
        if len(r) != 16:
            print(sid, "row", j, "len", len(r))
    if len(rows) != 16:
        print(sid, "rows", len(rows))
    a = pix.icon_from_rows([r[:16] for r in rows], pals[sid])
    b = pix.bob(a)
    x = (i % 4) * (16 * z * 2 + 60)
    y = (i // 4) * (16 * z + 26)
    d.text((x, y), sid, fill=(0, 0, 0, 255))
    for k, t in enumerate((a, b)):
        bg = Image.new("RGBA", (16 * z, 16 * z), (248, 248, 248, 255))
        bg.alpha_composite(t.resize((16 * z, 16 * z), Image.NEAREST))
        im.alpha_composite(bg, (x + k * (16 * z + 4), y + 12))
    g = Image.new("RGBA", (36, 18), (168, 208, 152, 255))
    g.alpha_composite(a, (1, 1)); g.alpha_composite(b, (19, 1))
    im.alpha_composite(g, (x + 2 * (16 * z + 4), y + 12))
im.save("review/icons_wild.png")
