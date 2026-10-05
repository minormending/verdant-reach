"""Which tileset owns each Round 1-3 tile key (ART.md §4: each TileKey is in
exactly one tileset). The order inside a group is the order on the sheet.

New keys belong in new tilesets written by their own generator (for example
tools/art/env4/ writes the Chapter 4 `city` and `orchard` sets); add them
here only if tools/art/tiles.py itself starts drawing them.
"""

from __future__ import annotations

TILESETS: dict[str, tuple[str, list[str]]] = {
    "terrain": ("Terrain", [
        "grass", "tall_grass", "flowers", "flowers_red", "flowers_yellow", "mushrooms",
        "rock", "ledge_down",
        "path", "stone_path", "dirt", "sand", "cliff",
    ]),
    "water": ("Water and wetland", [
        "water", "pond_lily", "water_channel", "reeds", "bridge", "bog", "boardwalk",
    ]),
    "nature": ("Trees and hedges", [
        "stump", "log", "bramble_bush",
        "tree", "maple_tree", "tapped_maple", "hedge",
    ]),
    "town": ("Town and farm", [
        "sign", "mailbox", "lamp_post", "barrel", "crate", "bench", "gate_open",
        "garden_plot", "crops", "scarecrow", "haybale",
        "fence", "stone_wall",
    ]),
    "interior": ("Interiors", [
        "floor_wood", "floor_tile", "floor_greenhouse", "rug", "mat_exit", "void",
        "window", "counter", "table", "chair", "bookshelf", "plant_pot", "planter_bed", "potted_tree",
        "bed", "specimen_cabinet", "stairs_up", "stairs_down", "fireplace", "stove", "workbench", "microscope",
        "wall", "glass_wall",
    ]),
}

TILESET_OF: dict[str, str] = {k: ts for ts, (_, keys) in TILESETS.items() for k in keys}
