"""Build the post-game environment: the `vault` and `summit` tilesets, the
oldest bristlecone (`methuselah_tree`) and its living base (the `bristlecone`
character), and the lead's review sheets.

Run with the pinned art Python:
  /Users/kevinramdath/projects/research/creature-sprites/.venv/bin/python tools/art/envpg/build.py [--review]
Registered as `envpg` in build_all.py, after every other builder (the portal
flank copies the shipped cliff, and the map review composes shipped tiles:
the pits, the root gap, the stairs, the grating and the scree). --review
redraws the sheets without emitting bundles. Bundle writes go through
artkit.emit, which skips edited/imported bundles.
"""
from __future__ import annotations

import sys

from PIL import Image, ImageDraw

import kit
import tilesets
import buildings

TILE_LABELS = [
    ("vault_floor", ["vault_floor", "vault_floor~1", "vault_floor~2", "vault_floor~3"]),
    ("vault_rime", ["vault_rime", "vault_rime~1", "vault_rime~2"]),
    ("vault_wall", ["vault_wall@11", "vault_wall@10", "vault_wall@8", "vault_wall@0", "vault_wall@15", "vault_wall@4"]),
    ("root_wall", ["root_wall@10", "root_wall@11", "root_wall@15"]),
    ("reading_desk", ["reading_desk"]),
    ("vault_ice", ["vault_ice@10", "vault_ice@8", "vault_ice@2", "vault_ice@0", "vault_ice@15"]),
    ("seed_rack", ["seed_rack@10", "seed_rack@8", "seed_rack@2", "seed_rack@0", "seed_rack@4", "seed_rack@1"]),
    ("vault_portal (Route 9)", ["vault_portal@11", "vault_portal", "vault_portal@9", "vault_portal@7"]),
    ("dolomite_scree", ["dolomite_scree", "dolomite_scree~1", "dolomite_scree~2", "dolomite_scree~3"]),
    ("dolomite_rock", ["dolomite_rock", "dolomite_rock~1", "dolomite_rock~2"]),
    ("bristlecone_shrub", ["bristlecone_shrub"]),
    ("cloud_sea", ["cloud_sea", "cloud_sea~1", "cloud_sea~2"]),
]

# Joined patches, as the game draws them.
PATCHES = {
    "VESTIBULE: walls, racks, grating": (
        ["WWWWWW", "K..g..", "K..g.K", "...g.K", "...g..", "WWWgWW"],
        {"W": "vault_wall", ".": "vault_floor", "K": "seed_rack", "g": "hideout_floor"}),
    "B1: an ice crossing in the frozen corridor": (
        ["WWWWWW", ".{{{{.", "WWWWWW", "??????", "......", "WW.WWW"],
        {"W": "vault_wall", ".": "vault_floor", "{": "vault_ice", "?": "vault_rime"}),
    "B2: roots, a pit and the root gap": (
        ["WRW.WW", "..R...", "..o.<.", "..W...", "??WR??", "??WW??"],
        {"W": "vault_wall", "R": "root_wall", ".": "vault_floor", "o": "pit", "<": "root_gap", "?": "vault_rime"}),
    "B3: the archive's racks and the desk": (
        ["WWDWWW", "KK..KK", "??????", "......", "KK..KK", "??????"],
        {"W": "vault_wall", "D": "reading_desk", "K": "seed_rack", ".": "vault_floor", "?": "vault_rime"}),
    "THE RIDGE: crags, bristlecones, the cloud deck": (
        ["cccccc", "cATAAc", "cA?:?c", "c??:?T", "c??:?A", "cAA:Ac"],
        {"c": "cloud_sea", "A": "dolomite_rock", "T": "bristlecone_shrub", "?": "dolomite_scree", ":": "scree"}),
}


def patch(rows, legend, frame=1):
    from review_maps import groups, image
    grp = groups()
    tiles = {**tilesets.TILESETS["vault"], **tilesets.TILESETS["summit"]}
    h, w = len(rows), len(rows[0])

    def get(stem):
        return tiles[stem] if stem in tiles else image(f"assets/tiles/{stem}.png")

    im = Image.new("RGBA", (w * 16, h * 16))
    for y in range(h):
        for x in range(w):
            key = legend[rows[y][x]]
            anim = get(f"{key}__2") is not None
            sfx = "__2" if frame == 2 and anim else ""
            g = grp.get(key)
            stem = None
            if g:
                m = 0
                for bit, dx, dy in ((1, 0, -1), (2, 1, 0), (4, 0, 1), (8, -1, 0)):
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < w and 0 <= ny < h) or grp.get(legend[rows[ny][nx]]) == g:
                        m |= bit
                if get(f"{key}@{m}") is not None:
                    stem = f"{key}@{m}" + (sfx if get(f"{key}@{m}__2") is not None else "")
            if stem is None:
                alts = [n for n in (1, 2, 3) if get(f"{key}~{n}") is not None and (not sfx or get(f"{key}~{n}__2") is not None)]
                n = kit.pick_alt(x, y, alts)
                stem = (f"{key}~{n}" if n else key) + sfx
            im.alpha_composite(get(stem), (x * 16, y * 16))
    return im


def env_sheet():
    """Each new tile (frames, alternates and sample masks) at 4x, then joined
    patches and the structure (with its living base) at 2x."""
    W = 1400
    tiles = {**tilesets.TILESETS["vault"], **tilesets.TILESETS["summit"]}
    sheet = Image.new("RGBA", (W, 1800), "#202830")
    d = ImageDraw.Draw(sheet)
    d.text((12, 8), "POST-GAME ENVIRONMENT: new tiles at 4x (frames, alternates, masks); joined patches and the "
                    "oldest bristlecone at 2x", fill="#f0e8c8")
    x, y = 12, 30
    for key, stems in TILE_LABELS:
        row_w = len(stems) * 70
        if x + row_w > W:
            x, y = 12, y + 104
        d.text((x, y), key, fill="#f0e8c8")
        for j, stem in enumerate(stems):
            sheet.alpha_composite(tiles[stem].resize((64, 64), Image.Resampling.NEAREST), (x + j * 70, y + 16))
            lab = stem.replace(key.split(" ")[0], "") or "base"
            d.text((x + j * 70, y + 84), lab, fill="#98a0a8")
        x += max(row_w + 30, 160)
    y += 112
    x, rowh = 12, 0
    for label, (rows, legend) in PATCHES.items():
        im = patch(rows, legend)
        w2, h2 = im.width * 2, im.height * 2
        if x + w2 > W:
            x, y, rowh = 12, y + rowh + 24, 0
        d.text((x, y), label, fill="#f0e8c8")
        sheet.alpha_composite(im.resize((w2, h2), Image.Resampling.NEAREST), (x, y + 16))
        x += w2 + 24
        rowh = max(rowh, h2 + 16)
    # The tree on its summit, with the NPC's living base below it (drawn 4px up,
    # as the game does), at 2x; the character sheet beside it.
    from review_maps import image
    ground = Image.new("RGBA", (5 * 16, 5 * 16))
    for gy in range(5):
        for gx in range(5):
            key = "scree" if gy >= 3 and 1 <= gx <= 3 else "dolomite_scree"
            stem = key
            if key == "dolomite_scree":
                n = kit.pick_alt(gx + 5, gy, [1, 2, 3])
                stem = f"{key}~{n}" if n else key
            ground.alpha_composite(tiles.get(stem) or image(f"assets/tiles/{stem}.png"), (gx * 16, gy * 16))
    ground.alpha_composite(buildings.methuselah_tree(), (16, 0))
    ground.alpha_composite(buildings.bristlecone().crop((0, 0, 16, 16)), (32, 3 * 16 - 4))
    if x + 160 + 24 + 96 > W:
        x, y, rowh = 12, y + rowh + 24, 0
    d.text((x, y), "methuselah_tree + bristlecone (7,3)", fill="#f0e8c8")
    sheet.alpha_composite(ground.resize((160, 160), Image.Resampling.NEAREST), (x, y + 16))
    x += 160 + 24
    d.text((x, y), "bristlecone sheet", fill="#f0e8c8")
    sheet.alpha_composite(buildings.bristlecone().resize((96, 128), Image.Resampling.NEAREST), (x, y + 16))
    rowh = max(rowh, 160 + 16)
    sheet = sheet.crop((0, 0, W, y + rowh + 16))
    kit.save_png(kit.REVIEW / "pg_env_lead.png", sheet)


def build(save=True):
    tilesets.build()
    tilesets.check()
    if save:
        for tid, tiles in tilesets.TILESETS.items():
            kit.emit.tileset(tid, tiles, tool=kit.TOOL_TILES, name=tilesets.NAMES[tid],
                             order=tilesets.ORDER[tid], credits=kit.CREDITS)
        for key, fn in buildings.STRUCTURES.items():
            kit.emit.structure(key, fn(), tool=kit.TOOL_BUILDINGS, credits=kit.CREDITS)
        for key, fn in buildings.CHARACTERS.items():
            kit.emit.character(key, fn(), tool=kit.TOOL_BUILDINGS, credits=kit.CREDITS)
    env_sheet()
    from review_maps import review_maps
    review_maps()
    n = sum(len(v) for v in tilesets.TILESETS.values())
    print(f"post-game: {n} tile images, {len(buildings.STRUCTURES)} structure, {len(buildings.CHARACTERS)} character")


if __name__ == "__main__":
    build(save="--review" not in sys.argv)
