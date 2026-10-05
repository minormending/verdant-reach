# Regenerates the favicon, app icons and OG image in public/ from the pixel leaf
# below and the current title art. Run after the title art changes:
#   /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python e2e/make_icons.py
from PIL import Image
import sys
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..") + "/"
LEAF = [
"................",
 "...........ooo..",
 ".........oohllo.",
 ".......oohlldmo.",
 "......ohllldmmo.",
 ".....ohllldmmdo.",
 "....ohllldmmdo..",
 "....ohlldmmmdo..",
 "...ohlldmmmdo...",
 "...olldmmmmdo...",
 "...oldmmmmdo....",
 "...odmmmmdo.....",
 "...ommdddo......",
 "..osooooo.......",
 ".os.............",
 "os..............",
]
C = {"o": (24, 48, 24, 255), "d": (40, 88, 40, 255), "m": (88, 160, 64, 255),
     "l": (152, 208, 96, 255), "h": (224, 240, 160, 255), "s": (88, 112, 40, 255)}
def leaf():
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(LEAF):
        for x, ch in enumerate(row):
            if ch in C: im.putpixel((x, y), C[ch])
    return im
L = leaf()
if len(sys.argv) > 1 and sys.argv[1] == "preview":
    L.resize((256, 256), Image.NEAREST).save(sys.argv[2]); sys.exit()
BG = (12, 26, 18, 255)
L.save(ROOT + "public/favicon-16.png")
L.resize((32, 32), Image.NEAREST).save(ROOT + "public/favicon-32.png")
def tile(size, pad_frac=0.18, bg=BG):
    im = Image.new("RGBA", (size, size), bg)
    inner = int(size * (1 - 2 * pad_frac))
    k = max(1, inner // 16)
    lf = L.resize((16 * k, 16 * k), Image.NEAREST)
    o = (size - 16 * k) // 2
    im.alpha_composite(lf, (o, o))
    return im
tile(180, 0.14).save(ROOT + "public/apple-touch-icon.png")
tile(192, 0.14).save(ROOT + "public/icon-192.png")
tile(512, 0.14).save(ROOT + "public/icon-512.png")
tile(512, 0.24).save(ROOT + "public/icon-maskable-512.png")
# SVG favicon: one rect per pixel run, crisp at any size.
parts = []
for y, row in enumerate(LEAF):
    x = 0
    while x < 16:
        ch = row[x]
        if ch in C:
            x2 = x
            while x2 + 1 < 16 and row[x2 + 1] == ch: x2 += 1
            r, g, b, _ = C[ch]
            parts.append(f'<rect x="{x}" y="{y}" width="{x2 - x + 1}" height="1" fill="#{r:02x}{g:02x}{b:02x}"/>')
            x = x2 + 1
        else:
            x += 1
open(ROOT + "public/favicon.svg", "w").write(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">' + "".join(parts) + "</svg>\n")
# OG image: the title art at 4x, centred on the page background.
title = Image.open(ROOT + "public/assets/ui/title.png").convert("RGBA")
logo = Image.open(ROOT + "public/assets/ui/title_logo.png").convert("RGBA")
art = title.copy()
art.alpha_composite(logo, ((160 - logo.width) // 2, 8))
og = Image.new("RGBA", (1200, 630), BG)
big = art.resize((640, 576), Image.NEAREST)
# a dark 8px bezel
bez = Image.new("RGBA", (640 + 16, 576 + 16), (27, 42, 33, 255))
og.alpha_composite(bez, ((1200 - 656) // 2, (630 - 592) // 2))
og.alpha_composite(big, ((1200 - 640) // 2, (630 - 576) // 2))
og.convert("RGB").save(ROOT + "public/og-image.png", optimize=True)
print("ok")
