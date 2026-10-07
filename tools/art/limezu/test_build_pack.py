"""Importer tests with synthetic pixels; licensed sheets are never fixtures."""
from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

import build_pack as pack
from gen_props import contract_text, prop_specs, OUTPUT


class PropTests(unittest.TestCase):
    def test_geometry_and_unmapped_entries(self):
        specs = prop_specs({
            "plant": {"source": "interiors:test.png", "box": [0, 0, 16, 32]},
            "bed": {"source": "interiors:test.png", "box": [0, 0, 32, 32]},
            "tiny": {"source": "interiors:test.png", "box": [4, 2, 19, 17]},
            "tall": {"source": "interiors:test.png", "box": [0, 0, 17, 33]},
            "window": {"source": "interiors:test.png", "box": [0, 0, 27, 22]},
            "missing": {"source": None},
        })
        self.assertNotIn("prop_missing", specs)
        self.assertEqual(specs["prop_plant"]["footprint"], {"x": 0, "y": 1, "w": 1, "h": 1})
        self.assertEqual(specs["prop_bed"]["footprint"], {"x": 0, "y": 1, "w": 2, "h": 1})
        self.assertEqual(specs["prop_tiny"]["footprint"], {"x": 0, "y": 0, "w": 1, "h": 1})
        self.assertEqual(specs["prop_tall"]["footprint"], {"x": 0, "y": 1, "w": 2, "h": 2})
        self.assertEqual(specs["prop_window"]["layer"], "floor")
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


if __name__ == "__main__":
    unittest.main()
