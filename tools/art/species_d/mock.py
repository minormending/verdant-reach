"""Dev check: mock battle screens (160x144, 3x) with each species' back on the
player side (8,40) facing a roster foe front at (96,0), and our front as the
foe. Writes review/battle_mock.png. Reads the built assets."""
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
SP = HERE.parents[2] / "public" / "assets" / "species"
OURS = ["mint_sprig", "peppermint", "rose_bud", "wild_rose", "pitcher_sprout", "pitcher_plant",
        "snapdragon_sprout", "snapdragon"]
FOES = ["venus_flytrap", "sunflower", "oak_acorn", "red_chili", "foxglove", "cattail", "holly", "sugar_maple"]
Z = 3


def screen(back_id, foe_id):
    s = Image.new("RGBA", (160, 144), (232, 236, 240, 255))
    d = ImageDraw.Draw(s)
    d.ellipse([86, 44, 156, 60], fill=(184, 196, 200, 255))
    d.ellipse([0, 80, 72, 96], fill=(184, 196, 200, 255))
    f = Image.open(SP / foe_id / "front.png").convert("RGBA")
    s.alpha_composite(f, (96, 0))
    b = Image.open(SP / back_id / "back.png").convert("RGBA")
    s.alpha_composite(b, (8, 40))
    d.rectangle([0, 96, 159, 143], fill=(248, 248, 248, 255), outline=(24, 24, 24, 255))
    return s.resize((160 * Z, 144 * Z), Image.NEAREST)


W = 4
sheet = Image.new("RGBA", (W * (160 * Z + 8), 4 * (144 * Z + 8)), (40, 40, 40, 255))
for i, sid in enumerate(OURS):
    a = screen(sid, FOES[i])
    b = screen(FOES[i], sid)
    for j, im in enumerate((a, b)):
        k = i * 2 + j
        sheet.alpha_composite(im, ((k % W) * (160 * Z + 8), (k // W) * (144 * Z + 8)))
sheet.save(HERE / "review" / "battle_mock.png")
