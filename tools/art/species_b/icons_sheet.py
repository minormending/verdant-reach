"""Review helper: every icon (both frames) at 6x, plus at 1x on the party-menu green."""
import importlib, sys
from PIL import Image, ImageDraw
sys.path.insert(0, '.')
import build, pix
z = 6
cells = []
for line in build.LINES:
    mod = importlib.import_module(line)
    for sid, spec in mod.SPRITES.items():
        i1 = pix.icon_from_rows(__import__("icons").ICONS.get(sid, spec.get("icon")), spec["pal"])
        i2s = spec.get("icon2", "squash")
        i2 = pix.squash(i1, spec.get("squash_row")) if i2s == "squash" else pix.bob(i1) if i2s == "bob" else pix.icon_from_rows(i2s, spec["pal"])
        cells.append((sid, i1, i2))
W = 5 * (16 * z * 2 + 60)
H = ((len(cells) + 4) // 5) * (16 * z + 30)
s = Image.new("RGBA", (W, H), (248, 248, 248, 255))
d = ImageDraw.Draw(s)
for i, (sid, a, b) in enumerate(cells):
    x = (i % 5) * (16 * z * 2 + 60)
    y = (i // 5) * (16 * z + 30)
    d.text((x + 4, y + 2), sid, fill=(0, 0, 0, 255))
    s.alpha_composite(a.resize((16 * z, 16 * z), Image.NEAREST), (x + 4, y + 14))
    s.alpha_composite(b.resize((16 * z, 16 * z), Image.NEAREST), (x + 8 + 16 * z, y + 14))
    bg = Image.new("RGBA", (40, 20), (168, 208, 152, 255))
    bg.alpha_composite(a, (2, 2)); bg.alpha_composite(b, (21, 2))
    s.alpha_composite(bg, (x + 12 + 32 * z, y + 14))
s.save(build.REVIEW / "icons.png")
