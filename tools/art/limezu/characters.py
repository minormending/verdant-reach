"""Compose private Character Generator layers; no source pixels are fixtures."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

GENERATOR = "interiors:2_Characters/Character_Generator/"
LAYERS = {"body": "Bodies", "eyes": "Eyes", "outfit": "Outfits",
          "hair": "Hairstyles", "accessory": "Accessories"}
SOURCE_DIRECTIONS = ("right", "up", "left", "down")
ROWS = ("down", "up", "left", "right")
OBJECTS = {"item_pickup", "harvest_bush", "boulder", "lever", "valve",
           "potted_plant", "hedge_gate", "rose_gate", "cone_sack", "bird", "cat", "dog"}


def mappings() -> dict:
    return json.loads((Path(__file__).parent / "mapping/characters.json").read_text())["characters"]


def frame(sheet: Image.Image, row: int, direction: int, column: int = 0) -> Image.Image:
    x = (direction if row == 0 else direction * 6 + column) * 16
    return sheet.crop((x, row * 32, x + 16, (row + 1) * 32))


def verify_layout(body: Image.Image, eyes: Image.Image) -> None:
    """Validate direction groups against the preview, independently of repacking.

    Body alpha silhouettes match preview frames exactly at idle frame 0.
    Eye counts and horizontal bounds identify walk directions despite the
    one-pixel vertical bob. The down preview has two eyes; up has none.
    """
    for direction in range(4):
        preview = np.asarray(frame(body, 0, direction))[:, :, 3]
        idle = np.asarray(frame(body, 1, direction))[:, :, 3]
        if not preview.any() or not np.array_equal(preview, idle):
            raise ValueError(f"Character Generator idle silhouette differs from {SOURCE_DIRECTIONS[direction]} preview")
        reference = np.asarray(frame(eyes, 0, direction))[:, :, 3]
        # Summing each column ignores vertical bob, while retaining direction.
        signature = reference.sum(axis=0)
        for row, columns in ((1, (0,)), (2, range(6))):
            for column in columns:
                actual = np.asarray(frame(eyes, row, direction, column))[:, :, 3]
                if not np.array_equal(signature, actual.sum(axis=0)):
                    raise ValueError(f"Character Generator eye direction differs at row {row}, direction {direction}, frame {column}")
    counts = [np.count_nonzero(np.asarray(frame(eyes, 0, d))[:, :, 3]) for d in range(4)]
    if not (counts[1] == 0 and counts[3] > counts[0] == counts[2] > 0):
        raise ValueError("Character Generator preview does not have right/up/left/down eyes")


def compose(sources, layers: dict) -> tuple[Image.Image, list[str]]:
    if set(layers) != set(LAYERS) or not layers["body"] or not layers["eyes"]:
        raise ValueError("character requires body, eyes, outfit, hair and accessory layer keys")
    canvas = Image.new("RGBA", (896, 96))
    paths, sheets = [], {}
    for key, folder in LAYERS.items():
        filename = layers[key]
        if filename is None:
            continue
        if Path(filename).name != filename or not filename.endswith(".png"):
            raise ValueError(f"invalid {key} layer filename: {filename}")
        path = GENERATOR + folder + "/16x16/" + filename
        sheet = sources.crop(path, (0, 0, 896, 96))
        sheets[key] = sheet
        paths.append(path)
        canvas.alpha_composite(sheet)
    verify_layout(sheets["body"], sheets["eyes"])
    result = Image.new("RGBA", (48, 128))
    for y, direction in enumerate(ROWS):
        source_direction = SOURCE_DIRECTIONS.index(direction)
        for x, (source_row, column) in enumerate(((1, 0), (2, 1), (2, 4))):
            result.paste(frame(canvas, source_row, source_direction, column), (x * 16, y * 32))
    return result, paths


def character_images(sources) -> dict:
    mapping = mappings()
    if OBJECTS & mapping.keys():
        raise ValueError("objects and animals must retain GBC art in R4")
    return {key: compose(sources, layers) for key, layers in sorted(mapping.items())}
