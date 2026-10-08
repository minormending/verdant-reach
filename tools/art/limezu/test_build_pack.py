"""Importer tests with synthetic pixels; licensed sheets are never fixtures."""
from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

import build_pack as pack
from geometry import measure, door_column, trim, measured_props
from terrain import pick_masks, classify
import numpy as np
from gen_props import contract_text, prop_specs, OUTPUT


class PropTests(unittest.TestCase):
    def test_geometry_and_unmapped_entries(self):
        class OpaqueSources:
            def crop(self, source, box):
                return Image.new("RGBA", (box[2] - box[0], box[3] - box[1]), (30, 80, 40, 255))
        _, specs = measured_props({
            "plant": {"source": "interiors:test.png", "box": [0, 0, 16, 32]},
            "bed": {"source": "interiors:test.png", "box": [0, 0, 32, 32]},
            "tiny": {"source": "interiors:test.png", "box": [4, 2, 19, 17]},
            "tall": {"source": "interiors:test.png", "box": [0, 0, 17, 33]},
            "window": {"source": "interiors:test.png", "box": [0, 0, 27, 22]},
            "missing": {"source": None},
        }, OpaqueSources())
        self.assertNotIn("prop_missing", specs)
        self.assertEqual(specs["prop_plant"]["footprint"], {"x": 0, "y": 1, "w": 1, "h": 1})
        self.assertEqual(specs["prop_bed"]["footprint"], {"x": 0, "y": 1, "w": 2, "h": 1})
        self.assertEqual(specs["prop_tiny"]["footprint"], {"x": 0, "y": 0, "w": 1, "h": 1})
        self.assertEqual(specs["prop_tall"]["footprint"], {"x": 0, "y": 2, "w": 2, "h": 1})
        self.assertEqual(prop_specs()["prop_window"]["layer"], "floor")
        self.assertEqual(OUTPUT.read_text(), contract_text())

    def test_padding_preserves_pixels_and_alpha(self):
        crop = Image.new("RGBA", (13, 21), (30, 80, 120, 127))
        out = pack.padded_prop(crop, 1, 2)
        self.assertEqual(out.size, (16, 32))
        self.assertEqual(out.crop((1, 11, 14, 32)).tobytes(), crop.tobytes())
        self.assertEqual(out.getpixel((0, 31)), (0, 0, 0, 0))
        self.assertEqual(out.getpixel((1, 10)), (0, 0, 0, 0))
        with self.assertRaises(ValueError):
            pack.padded_prop(crop, 1, 1)


class PixelGeometryTests(unittest.TestCase):
    def test_trim_center_and_sparse_floor_contact(self):
        source = Image.new("RGBA", (80, 70))
        # A wide canopy with two separate floor contacts and a transparent middle.
        for x in range(5, 54):
            source.putpixel((x, 7), (80, 150, 20, 255))
        for y in range(8, 45):
            source.putpixel((6, y), (80, 150, 20, 255))
            source.putpixel((53, y), (80, 150, 20, 255))
        image, spec = measure(source)
        self.assertEqual(image.size, (64, 48))
        self.assertEqual(spec, {"w": 4, "h": 3, "footprint": {"x": 0, "y": 2, "w": 4, "h": 1, "columns": [0, 3]}})
        self.assertEqual(image.getchannel("A").getbbox(), (7, 10, 56, 48))
        self.assertEqual(image.getpixel((8, 47)), source.getpixel((6, 44)))
        with self.assertRaises(ValueError):
            trim(Image.new("RGBA", (16, 16)))

    def test_lowest_six_pixels_not_all_of_bottom_tile(self):
        source = Image.new("RGBA", (48, 32))
        for x in range(48):
            source.putpixel((x, 23), (50, 80, 20, 255))
        source.putpixel((24, 31), (50, 80, 20, 255))
        _, spec = measure(source)
        self.assertEqual(spec["footprint"], {"x": 1, "y": 0, "w": 1, "h": 1})

    def test_dark_vertical_door_and_centre_fallback(self):
        source = Image.new("RGBA", (64, 32), (180, 190, 170, 255))
        for y in range(24, 32):
            for x in (19, 28):
                source.putpixel((x, y), (30, 30, 40, 255))
        self.assertEqual(door_column(source), 1)
        self.assertEqual(door_column(Image.new("RGBA", (80, 32), (200, 200, 200, 255))), 2)


class TerrainTests(unittest.TestCase):
    def test_every_cardinal_mask_with_inner_corners_ignored(self):
        fill = np.full((16, 16, 4), (200, 180, 100, 255), dtype=np.uint8)
        tiles = []
        # Shuffle order so a hard-coded blob-cell lookup cannot pass.
        masks = [7, 2, 10, 0, 15, 5, 1, 8, 3, 9, 14, 4, 11, 6, 12, 13]
        for mask in masks:
            a = fill.copy()
            for bit, index in ((1, (slice(0, 2), slice(None))), (2, (slice(None), slice(-2, None))),
                               (4, (slice(-2, None), slice(None))), (8, (slice(None), slice(0, 2)))):
                if not mask & bit:
                    a[index] = (50, 150, 50, 255)
            a[:3, :3] = (50, 150, 50, 255)
            tiles.append(a)
        picks = pick_masks(tiles, fill)
        self.assertEqual({m: masks[i] for m, i in picks.items()}, {m: m for m in range(16)})

    def test_classifies_all_26_blocks_without_source_fixtures(self):
        sheet = Image.new("RGBA", (192, 1664))
        for block in range(26):
            color = (40, 150, 50, 255) if block % 2 else (30, 50, 160, 255)
            sheet.paste(Image.new("RGBA", (16, 16), color), (16, block * 64))
        blocks = classify(sheet)
        self.assertEqual(len(blocks), 26)
        self.assertEqual([b["fill"] for b in blocks], [1] * 26)
        self.assertEqual(blocks[0]["name"], "blue")
        self.assertEqual(blocks[1]["name"], "green")


class WallTests(unittest.TestCase):
    def test_mask_to_cell_table(self):
        c = pack.BORDER_CELLS
        expected = [
            ("tl", "tr", "bl", "br"), ("left", "right", "bl", "br"),
            ("tl", "top", "bl", "bottom"), ("left", "fill", "bl", "bottom"),
            ("tl", "tr", "left", "right"), ("left", "right", "left", "right"),
            ("tl", "top", "left", "fill"), ("left", "fill", "left", "fill"),
            ("top", "tr", "bottom", "br"), ("fill", "right", "bottom", "br"),
            ("top", "top", "bottom", "bottom"), ("fill", "fill", "bottom", "bottom"),
            ("top", "tr", "fill", "right"), ("fill", "right", "fill", "right"),
            ("top", "top", "fill", "fill"), ("fill", "fill", "fill", "fill"),
        ]
        self.assertEqual(pack.WALL_MASK_CELLS,
                         {m: tuple(c[key] for key in keys) for m, keys in enumerate(expected)})
        self.assertEqual(pack.WALL_MASK_CELLS[15], ((40, 0),) * 4)
        with self.assertRaises(ValueError):
            pack.mask_cells(16)

    def test_six_floor_cells_and_wall_face_north_bit(self):
        class SyntheticSources:
            def tile(self, sheet, col, row):
                return Image.new("RGBA", (16, 16), (col, row, 10, 255))
        images = pack.interior_images(SyntheticSources())
        for key, (col, row) in pack.FLOOR_BLOCKS.items():
            self.assertEqual(tuple(images[key][0, 0]), (col + 1, row, 10, 255))
            cells = {tuple(images[f"{key}~{n}"][0, 0])[:2] for n in range(1, 6)}
            self.assertEqual(cells, {(col + x, row + y) for y in range(2) for x in range(3)} - {(col + 1, row)})
        for m in range(16):
            self.assertEqual(images[f"wall_face@{m}"][0, 0, 1], 7 if m & 1 else 6)
            self.assertEqual(images[f"wall_face@{m}"][0, 0, 0], 2 if m & 2 else 1)


class OutdoorBundleTests(unittest.TestCase):
    def test_overrides_existing_terrain_water_and_city_owners(self):
        tile = np.full((16, 16, 4), (50, 140, 90, 255), dtype=np.uint8)
        outdoor = {key: tile for key in ("grass", "path", "dirt", "sand", "stone_path", "water", "paving")}
        for key in list(outdoor):
            if key != "grass":
                outdoor.update({f"{key}@{mask}": tile for mask in range(16)})
        with patch.object(pack, "mappings", return_value={}), patch.object(pack, "prop_specs", return_value={}), patch.object(pack, "measured_props", return_value=({}, {})), patch.object(pack, "interior_images", return_value={"floor_wood": tile}), patch.object(pack, "outdoor_images", return_value=(outdoor, [], [])), patch.object(pack, "ui_outputs", return_value={}):
            outputs = pack.outputs(None)
        import json
        expected = {"terrain": {"grass", "path", "dirt", "sand", "stone_path"}, "water": {"water"}, "city": {"paving"}}
        for id_, keys in expected.items():
            bundle = json.loads(outputs[f"tilesets/{id_}/tileset.json"])
            self.assertEqual(bundle["id"], id_)
            self.assertEqual(set(bundle["tiles"]), keys)
            for key, value in bundle["tiles"].items():
                if key != "grass":
                    self.assertEqual(set(value["masks"]), {str(m) for m in range(16)})
        self.assertNotIn("tilesets/outdoor/tileset.json", outputs)


class GuardTests(unittest.TestCase):
    def test_refuses_non_pack_destinations_and_unignored_files(self):
        with self.assertRaises(RuntimeError):
            pack.guarded(pack.ROOT / "public" / "art" / "index.json")
        with patch.object(pack.subprocess, "run") as run:
            run.return_value.returncode = 1
            with self.assertRaisesRegex(RuntimeError, "does not ignore"):
                pack.guarded(pack.PACK / "tracked.png")
            self.assertEqual(run.call_args.args[0][:4], ["git", "check-ignore", "-q", "--"])

    def test_check_is_read_only_and_detects_stale_bytes(self):
        # Synthetic bytes only, confined to the ignored private folder too.
        pack.PACK.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix=".test-", dir=pack.PACK) as tmp:
            with patch.object(pack, "PACK", Path(tmp)), patch.object(pack, "outputs", return_value={"pack.json": b"synthetic"}), patch.object(pack, "local_index_bytes", return_value=b"index"):
                self.assertEqual(pack.build(check=True), 1)
                self.assertEqual(list(Path(tmp).iterdir()), [])
                self.assertEqual(pack.build(), 0)
                before = {p.name: (p.read_bytes(), p.stat().st_mtime_ns) for p in Path(tmp).iterdir()}
                self.assertEqual(pack.build(), 0)
                self.assertEqual(pack.build(check=True), 0)
                self.assertEqual(before, {p.name: (p.read_bytes(), p.stat().st_mtime_ns) for p in Path(tmp).iterdir()})
                (Path(tmp) / "pack.json").write_bytes(b"stale")
                self.assertEqual(pack.build(check=True), 1)
                self.assertEqual((Path(tmp) / "pack.json").read_bytes(), b"stale")

    def test_environment_takes_precedence(self):
        with patch.dict(os.environ, {"LIMEZU_INTERIORS": "/tmp/example-interiors"}):
            self.assertEqual(pack.roots()["interiors"], Path("/tmp/example-interiors").resolve())


class UiSliceTests(unittest.TestCase):
    def test_asymmetric_nine_slice(self):
        from limezu.ui import slice_insets
        image = Image.new("RGBA", (17, 15), (40, 30, 20, 255))
        image.paste((210, 190, 160, 255), (2, 3, 13, 10))
        self.assertEqual(slice_insets(image), [2, 3, 4, 5])

    def test_border_matches_fill_but_is_not_inner_region(self):
        from limezu.ui import slice_insets
        image = Image.new("RGBA", (15, 15), (40, 30, 20, 255))
        image.paste((100, 80, 60, 255), (2, 2, 13, 13))
        image.paste((40, 30, 20, 255), (4, 4, 11, 11))
        self.assertEqual(slice_insets(image), [4, 4, 4, 4])

    def test_horizontal_keeps_shaded_full_height(self):
        from limezu.ui import slice_insets
        image = Image.new("RGBA", (23, 10), (20, 20, 20, 255))
        image.paste((80, 180, 80, 255), (4, 2, 18, 8))
        self.assertEqual(slice_insets(image, True), [4, 0, 5, 0])

    def test_ui_crops_and_metadata_are_deterministic(self):
        from limezu.ui import ui_outputs
        import json
        class SyntheticSources:
            def crop(self, source, box):
                image = Image.new("RGBA", (box[2]-box[0], box[3]-box[1]), (40,30,20,255))
                image.paste((210,190,160,255), (2,2,image.width-2,image.height-2))
                return image
        def build():
            return ui_outputs(SyntheticSources(), pack.json_bytes, pack.png_bytes, pack.to_rgba, 'Synthetic', 'test')
        result = build()
        self.assertEqual(result, build())
        bundle = json.loads(result['sets/ui_limezu/set.json'])
        self.assertEqual(bundle['logicalDir'], 'assets/ui')
        self.assertNotIn('more_text', bundle['images'])
        self.assertEqual(bundle['images']['panel_window']['insets'], [2,2,2,2])
        self.assertEqual(bundle['images']['bar_green']['insets'], [2,0,2,0])
        for key, entry in bundle['images'].items():
            image = Image.open(__import__('io').BytesIO(result[f'sets/ui_limezu/{key}.png']))
            self.assertEqual(list(image.size), entry['size'])

    def test_transparent_centre_rejected_and_contrast_fallback(self):
        from limezu.ui import slice_insets, panel_colors
        with self.assertRaises(ValueError):
            slice_insets(Image.new("RGBA", (10, 10)))
        image = Image.new("RGBA", (10, 10), (180, 160, 140, 255))
        image.paste((210, 190, 160, 255), (2, 2, 8, 8))
        self.assertEqual(panel_colors(image, [2, 2, 2, 2])['ink'], '#3a2a1e')


if __name__ == "__main__":
    unittest.main()
