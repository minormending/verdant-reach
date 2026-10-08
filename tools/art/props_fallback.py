"""Original GBC furniture for supported no-pack play; never samples LimeZu art."""
from __future__ import annotations

from PIL import Image, ImageDraw

from artkit import emit
from artkit.core import contracts
from gbc import hexc

# Existing interior wood, wallpaper, glass and foliage ramps (tiles.HEX).
OUTLINE, WOOD, LIGHT, GLASS = map(hexc, ("#4a2818", "#c88850", "#f0c890", "#b8e8e0"))
GREEN, DARK_GREEN = map(hexc, ("#98d060", "#285828"))
CATEGORIES = {
    "bed_single": "bed",
    "bookcase": "shelf", "bookcase_narrow": "shelf", "cabinet_glass": "shelf",
    "dresser": "shelf", "wardrobe": "shelf", "shop_shelf": "shelf", "display_case": "shelf",
    "desk": "table", "table_large": "table", "table_small": "table",
    "chair": "chair", "stool": "chair",
    "plant_palm": "plant", "plant_small": "plant", "plant_tall": "plant",
    "plant_tree": "plant", "planter_box": "plant", "flower_bucket": "plant", "seed_tray": "plant",
    "fridge": "appliance", "stove": "appliance", "sink": "appliance",
    "fireplace": "appliance", "cash_register": "appliance", "fish_tank": "appliance",
    "rug_large": "rug", "rug_small": "rug",
    "window": "decor", "painting": "decor", "globe": "decor", "lamp_floor": "decor",
    "barrel": "storage", "crate": "storage", "sack": "storage", "watering_can": "storage",
}

CATEGORIES.update({
    **{key: "building" for key in "house_large city_house harbour_house house_small lodge barn windmill market market_large herbarium greenhouse cedar_house conservatory".split()},
    **{key: "tree" for key in "tree_autumn tree_dead tree_palm tree_pine tree_round".split()},
    **{key: "plant" for key in "bush hedge_block flower_bed".split()},
    **{key: "table" for key in "bench_park picnic_table dock".split()},
    **{key: "storage" for key in "barrel_out crate_out haybale log stump boat".split()},
    **{key: "monument" for key in "statue fountain well rock_large".split()},
    **{key: "decor" for key in "signpost mailbox lamp_street scarecrow camp_tent".split()},
})


def draw_prop(key: str, w: int, h: int) -> Image.Image:
    im = Image.new("RGBA", (w * 16, h * 16))
    d = ImageDraw.Draw(im)
    W, H = im.size
    l, r, t, b = 2, W - 3, 2, H - 3
    cx = W // 2
    category = CATEGORIES[key]

    def box(bounds, fill=WOOD):
        d.rectangle(bounds, fill=fill, outline=OUTLINE)

    if category == "building":
        roof = max(12, H // 3)
        box((l + 3, roof, r - 3, b), GLASS if key in {"greenhouse", "conservatory"} else LIGHT)
        d.polygon(((l, roof), (cx, t), (r, roof)), fill=WOOD, outline=OUTLINE)
        d.line((l + 3, roof - 1, r - 3, roof - 1), fill=LIGHT)
        for x in range(l + 8, r - 8, 24):
            for y in range(roof + 7, H - 25, 24):
                box((x, y, x + 9, y + 12), GLASS)
                d.line((x + 4, y, x + 4, y + 12), fill=OUTLINE)
        # Door follows the public tile geometry, never the licensed colours.
        from limezu.gen_props import prop_specs
        door = prop_specs()["prop_" + key]["door"]
        x = door["x"] * 16
        box((x + 3, H - 18, x + 12, b), WOOD)
        d.point((x + 10, H - 9), fill=LIGHT)
        if key == "windmill":
            d.line((cx - 20, roof - 12, cx + 20, roof + 12), fill=OUTLINE, width=3)
            d.line((cx + 20, roof - 12, cx - 20, roof + 12), fill=OUTLINE, width=3)
    elif category == "tree":
        box((cx - 3, H // 2, cx + 3, b), WOOD)
        if key == "tree_dead":
            d.line((cx - 12, H // 3, cx, H // 2, cx + 12, H // 4), fill=OUTLINE, width=3)
        elif key == "tree_pine":
            d.polygon(((cx, t), (l, H * 3 // 4), (r, H * 3 // 4)), fill=GREEN, outline=DARK_GREEN)
        else:
            d.ellipse((l, t, r, H * 3 // 4), fill=WOOD if key == "tree_autumn" else GREEN, outline=DARK_GREEN)
            d.arc((l + 4, t + 4, r - 4, H * 2 // 3), 180, 280, fill=LIGHT)
    elif category == "monument":
        box((l, H - 9, r, b), OUTLINE)
        if key == "statue":
            box((cx - 4, H // 3, cx + 4, H - 10), LIGHT)
            d.ellipse((cx - 5, t, cx + 5, t + 10), fill=LIGHT, outline=OUTLINE)
        else:
            d.ellipse((l, t + 3, r, H - 8), fill=GLASS if key in {"well", "fountain"} else LIGHT, outline=OUTLINE)
    elif category == "bed":
        box((l, t, r, b))
        box((l + 2, t + 3, r - 2, t + 12), LIGHT)
        box((l + 2, t + 15, r - 2, b - 3), GLASS)
        d.line((l + 3, b - 7, r - 3, b - 7), fill=LIGHT)
    elif category == "shelf":
        box((l, t, r, b))
        for y in range(t + 4, b - 3, 12):
            box((l + 2, y, r - 2, min(y + 8, b - 2)), OUTLINE)
            if key in {"cabinet_glass", "display_case"}:
                box((l + 3, y + 1, r - 3, min(y + 7, b - 3)), GLASS)
            elif key in {"wardrobe", "dresser"}:
                box((l + 3, y + 1, r - 3, min(y + 7, b - 3)), LIGHT)
                d.point((cx, y + 4), fill=OUTLINE)
            else:
                for x in range(l + 4, r - 2, 5):
                    d.rectangle((x, y + 2, x + 2, min(y + 7, b - 3)), fill=LIGHT)
    elif category == "table":
        top = max(t + 4, H // 3)
        box((l + 2, top + 5, l + 5, b), OUTLINE)
        box((r - 5, top + 5, r - 2, b), OUTLINE)
        box((l, t + 2, r, top + 5))
        d.line((l + 2, t + 4, r - 2, t + 4), fill=LIGHT)
    elif category == "chair":
        if key == "chair":
            box((l + 1, t, r - 1, H // 2), LIGHT)
        box((l + 2, H // 2 + 3, l + 4, b), OUTLINE)
        box((r - 4, H // 2 + 3, r - 2, b), OUTLINE)
        box((l, H // 2, r, H // 2 + 5))
    elif category == "plant":
        pot_top = max(H - 12, H * 2 // 3)
        box((l + 2, pot_top, r - 2, b))
        if key in {"seed_tray", "planter_box"}:
            for x in range(l + 6, r - 3, 12):
                d.line((x, pot_top - 8, x, pot_top), fill=DARK_GREEN)
                d.ellipse((x - 4, pot_top - 10, x, pot_top - 6), fill=GREEN, outline=DARK_GREEN)
                d.ellipse((x, pot_top - 12, x + 4, pot_top - 8), fill=GREEN, outline=DARK_GREEN)
        else:
            d.line((cx, t + 3, cx, pot_top), fill=OUTLINE, width=2)
            for x, y in ((l, t + 3), (cx, t), (l + 2, max(t, pot_top - 14))):
                d.ellipse((x, y, min(x + max(7, W // 2 - 3), r), min(y + 10, pot_top)),
                          fill=GREEN, outline=DARK_GREEN)
    elif category == "appliance":
        box((l, t, r, b), LIGHT)
        if key == "fireplace":
            box((l + 4, H // 3, r - 4, b - 2), OUTLINE)
            d.polygon(((cx - 4, b - 3), (cx, b - 12), (cx + 4, b - 3)), fill=WOOD)
        elif key == "fish_tank":
            box((l + 2, t + 4, r - 2, b - 5), GLASS)
            d.line((l + 5, b - 7, r - 5, b - 7), fill=WOOD)
        else:
            box((l + 3, t + 4, r - 3, H // 2), GLASS if key == "sink" else WOOD)
            d.line((l + 1, H // 2 + 3, r - 1, H // 2 + 3), fill=OUTLINE)
            d.rectangle((r - 5, H // 2 + 6, r - 4, H // 2 + 9), fill=OUTLINE)
    elif category == "rug":
        box((l, t, r, b), GLASS)
        box((l + 3, t + 3, r - 3, b - 3), WOOD)
        d.line((l + 5, H // 2, r - 5, H // 2), fill=LIGHT)
    elif category == "decor":
        if key in {"window", "painting"}:
            box((l, t, r, b))
            box((l + 3, t + 3, r - 3, b - 3), GLASS)
            if key == "window":
                d.line((cx, t + 2, cx, b - 2), fill=OUTLINE)
                d.line((l + 2, H // 2, r - 2, H // 2), fill=OUTLINE)
            else:
                d.polygon(((l + 4, b - 4), (cx, t + 6), (r - 4, b - 4)), fill=WOOD)
        else:
            box((cx - 1, H // 2, cx + 1, b), OUTLINE)
            box((l + 1, b - 2, r - 1, b))
            if key == "globe":
                d.ellipse((l, t, r, H // 2 + 3), fill=GLASS, outline=OUTLINE)
                d.line((cx, t + 2, cx, H // 2), fill=WOOD)
            else:
                d.polygon(((l, H // 2), (l + 4, t), (r - 4, t), (r, H // 2)),
                          fill=LIGHT, outline=OUTLINE)
    else:
        if key == "crate":
            box((l, t + 2, r, b))
            d.line((l + 2, t + 4, r - 2, b - 2), fill=OUTLINE)
            d.line((r - 2, t + 4, l + 2, b - 2), fill=OUTLINE)
        elif key == "watering_can":
            d.ellipse((r - 10, t + 3, r, b - 2), outline=OUTLINE, width=2)
            d.polygon(((l, t + 1), (cx - 2, t + 5), (cx - 2, b - 2)), fill=WOOD, outline=OUTLINE)
            box((cx - 4, t + 4, r - 6, b), GLASS)
            d.line((cx - 2, t + 6, r - 8, t + 6), fill=LIGHT)
        elif key == "sack":
            d.ellipse((l, t + 7, r, b), fill=LIGHT, outline=OUTLINE)
            d.polygon(((cx - 3, t), (cx + 3, t), (cx + 1, t + 8), (cx - 1, t + 8)), fill=WOOD, outline=OUTLINE)
            d.line((cx - 3, t + 7, cx + 3, t + 7), fill=OUTLINE)
        else:
            d.rounded_rectangle((l, t + 2, r, b), radius=4, fill=WOOD, outline=OUTLINE)
            d.line((l + 1, t + 6, r - 1, t + 6), fill=LIGHT)
            d.line((l + 1, b - 4, r - 1, b - 4), fill=OUTLINE)
    return im


def build() -> None:
    for id_, (w, h) in contracts()["structures"].items():
        if id_.startswith("prop_"):
            key = id_[5:]
            emit.structure(id_, draw_prop(key, w, h), tool="tools/art/props_fallback.py",
                           notes=f"FALLBACK: Original GBC {CATEGORIES[key]} for supported no-pack play.")


if __name__ == "__main__":
    build()
