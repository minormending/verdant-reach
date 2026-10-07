"""Build Chapter 6 tilesets and structures; write the lead's review sheets.

Run with the art venv. --review writes sheets only. Pixel and metadata output
uses artkit.emit, which respects edited/imported bundles. No runtime dependency.
"""
import sys
import math
from PIL import Image, ImageDraw
import kit
import tilesets
import buildings


def review():
    kit.REVIEW.mkdir(parents=True, exist_ok=True)
    # Every unmasked tile image, including animation frames and ground alts.
    count = sum("@" not in stem for tiles in tilesets.TILESETS.values() for stem in tiles)
    sheet = Image.new("RGBA", (1100, math.ceil(count/6)*92+440), "#202830")
    d = ImageDraw.Draw(sheet)
    x, y = 12, 12
    for tid, tiles in tilesets.TILESETS.items():
        for stem, im in tiles.items():
            if "@" in stem: continue
            if x+170 > sheet.width: x, y = 12, y+92
            d.text((x, y), stem, fill="#f0e8c8")
            sheet.alpha_composite(im.resize((64, 64), Image.Resampling.NEAREST), (x, y+18))
            x += 180
    y += 96; x = 12
    for key, im in buildings.IMAGES.items():
        w, h = im.width*2, im.height*2
        if x+w+16 > sheet.width: x, y = 12, y+150
        d.text((x, y), key, fill="#f0e8c8")
        sheet.alpha_composite(im.resize((w, h), Image.Resampling.NEAREST), (x, y+18))
        x += w+24
    kit.save_png(kit.REVIEW / "ch6_env_lead.png", sheet.crop((0, 0, sheet.width, y+150)))
    # Focused 4x sheet includes every new ground alternate and moss frame.
    keys = {"driftwood", "beach_rock", "fishing_net", "dry_grass", "shell_scatter", "vent_moss"}
    tiles = [(stem, im) for images in tilesets.TILESETS.values() for stem, im in images.items()
             if stem.split("~")[0].split("__")[0] in keys]
    dressing = Image.new("RGBA", (900, math.ceil(len(tiles)/5)*96+16), "#202830")
    d = ImageDraw.Draw(dressing)
    for i, (stem, im) in enumerate(tiles):
        x, y = 12+(i%5)*180, 8+(i//5)*96
        d.text((x, y), stem, fill="#f0e8c8")
        dressing.alpha_composite(im.resize((64,64), Image.Resampling.NEAREST), (x,y+18))
    kit.save_png(kit.REVIEW / "ch6_dressing_tiles.png", dressing)
    from review_maps import review_maps
    review_maps()


def build(save=True):
    tilesets.build()
    buildings.build()
    if save:
        for tid, tiles in tilesets.TILESETS.items():
            kit.emit.tileset(tid, tiles, tool="tools/art/env6/tilesets.py",
                             name="Tidal Coast" if tid == "coast" else "Volcanic Island",
                             credits=kit.CREDITS)
        for key, im in buildings.IMAGES.items():
            kit.emit.structure(key, im, tool="tools/art/env6/buildings.py", credits=kit.CREDITS)
    review()
    print(f"Chapter 6: {sum(len(v) for v in tilesets.TILESETS.values())} tile images; {len(buildings.IMAGES)} structures")


if __name__ == "__main__":
    build(save="--review" not in sys.argv)
